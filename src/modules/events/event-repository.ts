import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { dbQuery, getDb } from "../../lib/db";
import { AppError } from "../../lib/errors";
import type { EventType, WorkflowEventRecord } from "../../types/workflow";

// Two parallel event-type families coexist in `workflow_events`:
//   • `run_succeeded` / `run_failed`            — emitted by external runners via /event ingest
//   • `workflow_execution_success` / `_failed`  — emitted by the monitoring scheduler
//
// Run-stat queries used to look at the first family only, which made dashboards
// show 0 runs for projects whose only signals come from the monitoring scheduler.
// All terminal-run aggregations should consider both families.
const TERMINAL_RUN_TYPES_SQL =
  "'run_succeeded','run_failed','workflow_execution_success','workflow_execution_failed'";
const TERMINAL_RUN_FAILURE_TYPES_SQL = "'run_failed','workflow_execution_failed'";
const TERMINAL_RUN_SUCCESS_TYPES_SQL = "'run_succeeded','workflow_execution_success'";

type WorkflowEventRow = RowDataPacket & {
  id: string;
  workflow_id: string;
  run_id: string | null;
  node_name: string | null;
  event_type: EventType;
  status: "success" | "failure" | "info";
  duration_ms: number | null;
  error_message: string | null;
  metadata: unknown;
  created_at: string | Date;
};

function parseJsonField<T>(value: unknown): T {
  if (value === null || value === undefined) {
    return null as T;
  }

  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }

  return value as T;
}

function mapEventRow(row: WorkflowEventRow): WorkflowEventRecord {
  return {
    id: row.id,
    workflow_id: row.workflow_id,
    run_id: row.run_id,
    node_name: row.node_name,
    event_type: row.event_type,
    status: row.status,
    duration_ms: row.duration_ms,
    error_message: row.error_message,
    metadata: parseJsonField<Record<string, unknown> | null>(row.metadata),
    created_at: new Date(row.created_at)
  };
}

export async function createWorkflowEvent(
  input: {
    workflowId: string;
    runId: string | null;
    nodeName: string | null;
    eventType: EventType;
    status: "success" | "failure" | "info";
    durationMs: number | null;
    errorMessage: string | null;
    metadata?: Record<string, unknown> | null;
  },
  connection?: PoolConnection
): Promise<WorkflowEventRecord> {
  const id = randomUUID();
  const runner = connection ?? getDb();

  await dbQuery(
    runner,
    `INSERT INTO workflow_events (
      id, workflow_id, run_id, node_name, event_type, status, duration_ms, error_message, metadata
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.workflowId,
      input.runId,
      input.nodeName,
      input.eventType,
      input.status,
      input.durationMs,
      input.errorMessage,
      JSON.stringify(input.metadata ?? null)
    ]
  );

  const [rows] = await dbQuery<WorkflowEventRow[]>(
    runner,
    `SELECT id, workflow_id, run_id, node_name, event_type, status, duration_ms, error_message, metadata, created_at
     FROM workflow_events
     WHERE id = ?`,
    [id]
  );

  const row = rows[0];
  if (!row) {
    throw new AppError(500, "WORKFLOW_EVENT_INSERT_FAILED", "Workflow event insert failed.");
  }

  return mapEventRow(row);
}

export async function listRecentEventsByWorkflowId(
  workflowId: string,
  limit = 20
): Promise<WorkflowEventRecord[]> {
  const db = getDb();
  const capped = Math.min(Math.max(limit, 1), 200);
  const [rows] = await dbQuery<WorkflowEventRow[]>(
    db,
    `SELECT id, workflow_id, run_id, node_name, event_type, status, duration_ms, error_message, metadata, created_at
     FROM workflow_events
     WHERE workflow_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [workflowId, capped]
  );

  return rows.map((row) => mapEventRow(row));
}

export async function listRecentFailureEventsByWorkflowId(
  workflowId: string,
  limit = 10
): Promise<WorkflowEventRecord[]> {
  const db = getDb();
  const capped = Math.min(Math.max(limit, 1), 100);
  const [rows] = await dbQuery<WorkflowEventRow[]>(
    db,
    `SELECT id, workflow_id, run_id, node_name, event_type, status, duration_ms, error_message, metadata, created_at
     FROM workflow_events
     WHERE workflow_id = ?
       AND status = 'failure'
     ORDER BY created_at DESC
     LIMIT ?`,
    [workflowId, capped]
  );

  return rows.map((row) => mapEventRow(row));
}

export async function countWorkflowFailures(workflowId: string): Promise<number> {
  const db = getDb();
  const [rows] = await dbQuery<Array<RowDataPacket & { failures: number }>>(
    db,
    `SELECT COUNT(*) AS failures
     FROM workflow_events
     WHERE workflow_id = ?
       AND event_type IN (${TERMINAL_RUN_FAILURE_TYPES_SQL})`,
    [workflowId]
  );

  return Number(rows[0]?.failures ?? 0);
}

export async function countConsecutiveWorkflowFailures(workflowId: string, take = 10): Promise<number> {
  const db = getDb();
  const [rows] = await dbQuery<Array<RowDataPacket & { event_type: EventType }>>(
    db,
    `SELECT event_type
     FROM workflow_events
     WHERE workflow_id = ?
       AND event_type IN (${TERMINAL_RUN_TYPES_SQL})
     ORDER BY created_at DESC
     LIMIT ?`,
    [workflowId, Math.max(take, 1)]
  );

  let consecutive = 0;
  for (const row of rows) {
    if (row.event_type === "run_failed" || row.event_type === "workflow_execution_failed") {
      consecutive += 1;
      continue;
    }
    break;
  }

  return consecutive;
}

export async function getWorkflowRunStats(workflowId: string): Promise<{
  totalRuns: number;
  failedRuns: number;
  successRuns: number;
  successRate: number;
  averageDurationMs: number;
}> {
  const db = getDb();
  const [rows] = await dbQuery<
    Array<
      RowDataPacket & {
        total_runs: number;
        failed_runs: number;
        success_runs: number;
        avg_duration: number | null;
      }
    >
  >(
    db,
    `SELECT
      COUNT(*) AS total_runs,
      SUM(CASE WHEN event_type IN (${TERMINAL_RUN_FAILURE_TYPES_SQL}) THEN 1 ELSE 0 END) AS failed_runs,
      SUM(CASE WHEN event_type IN (${TERMINAL_RUN_SUCCESS_TYPES_SQL}) THEN 1 ELSE 0 END) AS success_runs,
      AVG(duration_ms) AS avg_duration
    FROM workflow_events
    WHERE workflow_id = ?
      AND event_type IN (${TERMINAL_RUN_TYPES_SQL})`,
    [workflowId]
  );

  const row = rows[0];
  const totalRuns = Number(row?.total_runs ?? 0);
  const failedRuns = Number(row?.failed_runs ?? 0);
  const successRuns = Number(row?.success_runs ?? 0);
  const averageDurationMs = Number(row?.avg_duration ?? 0);
  const successRate = totalRuns > 0 ? (successRuns / totalRuns) * 100 : 0;

  return {
    totalRuns,
    failedRuns,
    successRuns,
    successRate,
    averageDurationMs
  };
}

export async function getWorkflowLastTerminalRun(workflowId: string): Promise<{
  eventType: EventType | null;
  createdAt: Date | null;
  errorMessage: string | null;
  runId: string | null;
}> {
  const db = getDb();
  const [rows] = await dbQuery<WorkflowEventRow[]>(
    db,
    `SELECT id, workflow_id, run_id, node_name, event_type, status, duration_ms, error_message, metadata, created_at
     FROM workflow_events
     WHERE workflow_id = ?
       AND event_type IN (${TERMINAL_RUN_TYPES_SQL})
     ORDER BY created_at DESC
     LIMIT 1`,
    [workflowId]
  );

  const row = rows[0];
  if (!row) {
    return {
      eventType: null,
      createdAt: null,
      errorMessage: null,
      runId: null
    };
  }

  return {
    eventType: row.event_type,
    createdAt: new Date(row.created_at),
    errorMessage: row.error_message,
    runId: row.run_id
  };
}

export async function getGlobalRunStats(): Promise<{
  totalRuns: number;
  failedRuns: number;
  successRuns: number;
  successRate: number;
  averageDurationMs: number;
}> {
  const db = getDb();
  const [rows] = await dbQuery<
    Array<
      RowDataPacket & {
        total_runs: number;
        failed_runs: number;
        success_runs: number;
        avg_duration: number | null;
      }
    >
  >(
    db,
    `SELECT
      COUNT(*) AS total_runs,
      SUM(CASE WHEN event_type IN (${TERMINAL_RUN_FAILURE_TYPES_SQL}) THEN 1 ELSE 0 END) AS failed_runs,
      SUM(CASE WHEN event_type IN (${TERMINAL_RUN_SUCCESS_TYPES_SQL}) THEN 1 ELSE 0 END) AS success_runs,
      AVG(duration_ms) AS avg_duration
    FROM workflow_events
    WHERE event_type IN (${TERMINAL_RUN_TYPES_SQL})`
  );

  const row = rows[0];
  const totalRuns = Number(row?.total_runs ?? 0);
  const failedRuns = Number(row?.failed_runs ?? 0);
  const successRuns = Number(row?.success_runs ?? 0);
  const averageDurationMs = Number(row?.avg_duration ?? 0);
  const successRate = totalRuns > 0 ? (successRuns / totalRuns) * 100 : 0;

  return {
    totalRuns,
    failedRuns,
    successRuns,
    successRate,
    averageDurationMs
  };
}

/**
 * Per-user run stats. Same shape as getGlobalRunStats but joined on workflows
 * → projects so we only count events on workflows owned by `userId`.
 */
export async function getUserRunStats(userId: string): Promise<{
  totalRuns: number;
  failedRuns: number;
  successRuns: number;
  successRate: number;
  averageDurationMs: number;
}> {
  const db = getDb();
  const [rows] = await dbQuery<
    Array<
      RowDataPacket & {
        total_runs: number;
        failed_runs: number;
        success_runs: number;
        avg_duration: number | null;
      }
    >
  >(
    db,
    `SELECT
      COUNT(*) AS total_runs,
      SUM(CASE WHEN we.event_type IN (${TERMINAL_RUN_FAILURE_TYPES_SQL}) THEN 1 ELSE 0 END) AS failed_runs,
      SUM(CASE WHEN we.event_type IN (${TERMINAL_RUN_SUCCESS_TYPES_SQL}) THEN 1 ELSE 0 END) AS success_runs,
      AVG(we.duration_ms) AS avg_duration
    FROM workflow_events we
    INNER JOIN workflows w ON w.id = we.workflow_id
    INNER JOIN projects p ON p.id = w.project_id
    WHERE p.user_id = ?
      AND we.event_type IN (${TERMINAL_RUN_TYPES_SQL})`,
    [userId]
  );

  const row = rows[0];
  const totalRuns = Number(row?.total_runs ?? 0);
  const failedRuns = Number(row?.failed_runs ?? 0);
  const successRuns = Number(row?.success_runs ?? 0);
  const averageDurationMs = Number(row?.avg_duration ?? 0);
  const successRate = totalRuns > 0 ? (successRuns / totalRuns) * 100 : 0;

  return { totalRuns, failedRuns, successRuns, successRate, averageDurationMs };
}

/** Per-user health breakdown — same logic as getGlobalHealthBreakdown but
 *  scoped to workflows whose project is owned by `userId`. */
export async function getUserHealthBreakdown(userId: string): Promise<{
  healthyWorkflows: number;
  unhealthyWorkflows: number;
}> {
  const db = getDb();
  const [rows] = await dbQuery<
    Array<
      RowDataPacket & {
        healthy_workflows: number;
        unhealthy_workflows: number;
      }
    >
  >(
    db,
    `SELECT
      SUM(
        CASE
          WHEN w.status IN ('validated', 'deployed_inactive', 'deployed_active')
            AND COALESCE(open_alerts.cnt, 0) = 0
          THEN 1 ELSE 0
        END
      ) AS healthy_workflows,
      SUM(
        CASE
          WHEN w.status IN ('failed', 'rejected') OR COALESCE(open_alerts.cnt, 0) > 0
          THEN 1 ELSE 0
        END
      ) AS unhealthy_workflows
    FROM workflows w
    INNER JOIN projects p ON p.id = w.project_id
    LEFT JOIN (
      SELECT workflow_id, COUNT(*) AS cnt
      FROM workflow_alerts
      WHERE status = 'open'
      GROUP BY workflow_id
    ) open_alerts ON open_alerts.workflow_id = w.id
    WHERE p.user_id = ?`,
    [userId]
  );

  return {
    healthyWorkflows: Number(rows[0]?.healthy_workflows ?? 0),
    unhealthyWorkflows: Number(rows[0]?.unhealthy_workflows ?? 0)
  };
}

export async function getGlobalHealthBreakdown(): Promise<{
  healthyWorkflows: number;
  unhealthyWorkflows: number;
}> {
  const db = getDb();
  const [rows] = await dbQuery<
    Array<
      RowDataPacket & {
        healthy_workflows: number;
        unhealthy_workflows: number;
      }
    >
  >(
    db,
    // "Healthy" means: lifecycle status not failed/rejected AND no open alerts.
    // Lifecycle status alone over-reports healthy because a `deployed_inactive` workflow
    // with 20 failed executions and 2 open alerts would otherwise count as healthy.
    `SELECT
      SUM(
        CASE
          WHEN w.status IN ('validated', 'deployed_inactive', 'deployed_active')
            AND COALESCE(open_alerts.cnt, 0) = 0
          THEN 1 ELSE 0
        END
      ) AS healthy_workflows,
      SUM(
        CASE
          WHEN w.status IN ('failed', 'rejected') OR COALESCE(open_alerts.cnt, 0) > 0
          THEN 1 ELSE 0
        END
      ) AS unhealthy_workflows
    FROM workflows w
    LEFT JOIN (
      SELECT workflow_id, COUNT(*) AS cnt
      FROM workflow_alerts
      WHERE status = 'open'
      GROUP BY workflow_id
    ) open_alerts ON open_alerts.workflow_id = w.id`
  );

  return {
    healthyWorkflows: Number(rows[0]?.healthy_workflows ?? 0),
    unhealthyWorkflows: Number(rows[0]?.unhealthy_workflows ?? 0)
  };
}
