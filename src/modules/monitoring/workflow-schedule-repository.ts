import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { dbQuery, getDb } from "../../lib/db";

export type SchedulerStatus = "healthy" | "drifting" | "stopped" | "unknown";

export interface WorkflowScheduleRecord {
  workflow_id: string;
  trigger_type: string | null;
  cron_expression: string | null;
  expected_interval_seconds: number | null;
  expected_next_run_at: Date | null;
  last_seen_run_at: Date | null;
  scheduler_status: SchedulerStatus;
  created_at: Date;
  updated_at: Date;
}

type WorkflowScheduleRow = RowDataPacket & {
  workflow_id: string;
  trigger_type: string | null;
  cron_expression: string | null;
  expected_interval_seconds: number | null;
  expected_next_run_at: string | Date | null;
  last_seen_run_at: string | Date | null;
  scheduler_status: SchedulerStatus;
  created_at: string | Date;
  updated_at: string | Date;
};

function mapRow(row: WorkflowScheduleRow): WorkflowScheduleRecord {
  return {
    workflow_id: row.workflow_id,
    trigger_type: row.trigger_type,
    cron_expression: row.cron_expression,
    expected_interval_seconds: row.expected_interval_seconds,
    expected_next_run_at: row.expected_next_run_at ? new Date(row.expected_next_run_at) : null,
    last_seen_run_at: row.last_seen_run_at ? new Date(row.last_seen_run_at) : null,
    scheduler_status: row.scheduler_status,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at)
  };
}

/**
 * Idempotent UPSERT of the schedule baseline. Called on every deploy:
 *   - new workflow → insert with scheduler_status = 'unknown'
 *   - redeploy that kept the same trigger → no observable change
 *   - redeploy that switched trigger → row replaced
 *
 * Workflows without a trigger or with a non-trackable trigger (manual,
 * webhook, cronExpression we can't parse to seconds) should NOT call this —
 * caller invokes deleteScheduleTracking instead. Keeping the table sparse
 * means the drift-sweep query touches only workflows that genuinely need it.
 */
export async function upsertScheduleTracking(
  input: {
    workflowId: string;
    triggerType: string | null;
    cronExpression: string | null;
    expectedIntervalSeconds: number | null;
    /** When seeding, optionally backdate so the first drift check has a
     *  reasonable deadline rather than firing "drifting" before the workflow
     *  has had a chance to run. We default to NOW so a fresh deploy waits one
     *  full interval before alerting. */
    seedNextRunAt?: Date | null;
  },
  connection?: PoolConnection
): Promise<void> {
  const runner = connection ?? getDb();

  await dbQuery(
    runner,
    `INSERT INTO workflow_schedule_tracking (
       workflow_id, trigger_type, cron_expression,
       expected_interval_seconds, expected_next_run_at,
       last_seen_run_at, scheduler_status
     ) VALUES (?, ?, ?, ?, ?, NULL, 'unknown')
     ON DUPLICATE KEY UPDATE
       trigger_type = VALUES(trigger_type),
       cron_expression = VALUES(cron_expression),
       expected_interval_seconds = VALUES(expected_interval_seconds),
       -- Only reseed expected_next_run_at when the interval actually changed
       -- and we have not yet observed any runs. Preserves drift detection
       -- continuity across cosmetic redeploys.
       expected_next_run_at = CASE
         WHEN last_seen_run_at IS NULL THEN VALUES(expected_next_run_at)
         WHEN expected_interval_seconds <> VALUES(expected_interval_seconds) THEN VALUES(expected_next_run_at)
         ELSE expected_next_run_at
       END`,
    [
      input.workflowId,
      input.triggerType,
      input.cronExpression,
      input.expectedIntervalSeconds,
      input.seedNextRunAt ?? null
    ]
  );
}

export async function deleteScheduleTracking(
  workflowId: string,
  connection?: PoolConnection
): Promise<boolean> {
  const runner = connection ?? getDb();
  const [result] = await dbQuery<ResultSetHeader>(
    runner,
    `DELETE FROM workflow_schedule_tracking WHERE workflow_id = ?`,
    [workflowId]
  );
  return Number(result.affectedRows ?? 0) > 0;
}

export async function getScheduleTracking(
  workflowId: string
): Promise<WorkflowScheduleRecord | null> {
  const db = getDb();
  const [rows] = await dbQuery<WorkflowScheduleRow[]>(
    db,
    `SELECT workflow_id, trigger_type, cron_expression,
            expected_interval_seconds, expected_next_run_at,
            last_seen_run_at, scheduler_status, created_at, updated_at
     FROM workflow_schedule_tracking
     WHERE workflow_id = ?`,
    [workflowId]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

/**
 * Called after every observed execution by the monitoring cycle. Advances
 * `last_seen_run_at` (idempotent — refuses to go backwards in time) and
 * recomputes the next-run deadline. We also reset scheduler_status to
 * 'healthy' since observing a run is the strongest possible signal that the
 * cron is alive again, even if a previous cycle marked it stopped.
 */
export async function recordObservedRun(
  workflowId: string,
  observedAt: Date,
  connection?: PoolConnection
): Promise<void> {
  const runner = connection ?? getDb();
  await dbQuery(
    runner,
    `UPDATE workflow_schedule_tracking
     SET last_seen_run_at = GREATEST(COALESCE(last_seen_run_at, ?), ?),
         expected_next_run_at = CASE
           WHEN expected_interval_seconds IS NULL THEN expected_next_run_at
           ELSE DATE_ADD(GREATEST(COALESCE(last_seen_run_at, ?), ?), INTERVAL expected_interval_seconds SECOND)
         END,
         scheduler_status = 'healthy'
     WHERE workflow_id = ?`,
    [observedAt, observedAt, observedAt, observedAt, workflowId]
  );
}

/**
 * Returns schedules whose `expected_next_run_at` is in the past so the drift
 * sweep can evaluate each one through the anomaly detector. We exclude rows
 * whose status is already 'stopped' AND whose deadline hasn't advanced — once
 * we've alerted on a stopped cron we don't need to re-alert every cycle.
 */
export async function listOverdueSchedules(options?: {
  limit?: number;
}): Promise<WorkflowScheduleRecord[]> {
  const cap = Math.min(Math.max(options?.limit ?? 200, 1), 1000);
  const db = getDb();
  const [rows] = await dbQuery<WorkflowScheduleRow[]>(
    db,
    `SELECT workflow_id, trigger_type, cron_expression,
            expected_interval_seconds, expected_next_run_at,
            last_seen_run_at, scheduler_status, created_at, updated_at
     FROM workflow_schedule_tracking
     WHERE expected_interval_seconds IS NOT NULL
       AND expected_next_run_at IS NOT NULL
       AND expected_next_run_at < CURRENT_TIMESTAMP
     ORDER BY expected_next_run_at ASC
     LIMIT ?`,
    [cap]
  );
  return rows.map(mapRow);
}

export async function updateSchedulerStatus(
  workflowId: string,
  status: SchedulerStatus
): Promise<void> {
  const db = getDb();
  await dbQuery(
    db,
    `UPDATE workflow_schedule_tracking
     SET scheduler_status = ?
     WHERE workflow_id = ?`,
    [status, workflowId]
  );
}
