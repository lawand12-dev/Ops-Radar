import { randomUUID } from "node:crypto";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { dbQuery, getDb } from "../../lib/db";
import { AppError } from "../../lib/errors";
import type {
  HealthStatus,
  WorkflowAlertRecord,
  WorkflowHealthSnapshotRecord
} from "../../types/workflow";

type WorkflowHealthSnapshotRow = RowDataPacket & {
  id: string;
  project_id: string;
  workflow_id: string;
  n8n_workflow_id: string | null;
  status: string;
  active: number | boolean;
  health_status: HealthStatus;
  last_success_at: string | Date | null;
  last_failure_at: string | Date | null;
  recent_success_count: number;
  recent_failure_count: number;
  last_error_message: string | null;
  last_error_node: string | null;
  last_error_type: string | null;
  recommended_action: string | null;
  raw_summary_json: unknown;
  created_at: string | Date;
};

type WorkflowAlertRow = RowDataPacket & {
  id: string;
  project_id: string;
  workflow_id: string;
  n8n_workflow_id: string | null;
  alert_type: string;
  severity: "low" | "medium" | "high";
  message: string;
  recommended_action: string | null;
  fingerprint: string;
  failed_node: string | null;
  first_seen_at: string | Date;
  last_seen_at: string | Date;
  resolved_at: string | Date | null;
  status: "open" | "resolved";
  occurrence_count: number;
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

function mapSnapshotRow(row: WorkflowHealthSnapshotRow): WorkflowHealthSnapshotRecord {
  return {
    id: row.id,
    project_id: row.project_id,
    workflow_id: row.workflow_id,
    n8n_workflow_id: row.n8n_workflow_id,
    status: row.status,
    active: Boolean(row.active),
    health_status: row.health_status,
    last_success_at: row.last_success_at ? new Date(row.last_success_at) : null,
    last_failure_at: row.last_failure_at ? new Date(row.last_failure_at) : null,
    recent_success_count: Number(row.recent_success_count ?? 0),
    recent_failure_count: Number(row.recent_failure_count ?? 0),
    last_error_message: row.last_error_message,
    last_error_node: row.last_error_node,
    last_error_type: row.last_error_type,
    recommended_action: row.recommended_action,
    raw_summary_json: row.raw_summary_json
      ? parseJsonField<Record<string, unknown> | null>(row.raw_summary_json)
      : null,
    created_at: new Date(row.created_at)
  };
}

function mapAlertRow(row: WorkflowAlertRow): WorkflowAlertRecord {
  return {
    id: row.id,
    project_id: row.project_id,
    workflow_id: row.workflow_id,
    n8n_workflow_id: row.n8n_workflow_id,
    alert_type: row.alert_type,
    severity: row.severity,
    message: row.message,
    recommended_action: row.recommended_action,
    fingerprint: row.fingerprint,
    failed_node: row.failed_node,
    first_seen_at: new Date(row.first_seen_at),
    last_seen_at: new Date(row.last_seen_at),
    resolved_at: row.resolved_at ? new Date(row.resolved_at) : null,
    status: row.status,
    occurrence_count: Number(row.occurrence_count ?? 1)
  };
}

export async function createWorkflowHealthSnapshot(
  input: {
    projectId: string;
    workflowId: string;
    n8nWorkflowId: string | null;
    status: string;
    active: boolean;
    healthStatus: HealthStatus;
    lastSuccessAt: Date | null;
    lastFailureAt: Date | null;
    recentSuccessCount: number;
    recentFailureCount: number;
    lastErrorMessage: string | null;
    lastErrorNode: string | null;
    lastErrorType: string | null;
    recommendedAction: string | null;
    rawSummaryJson: Record<string, unknown> | null;
  },
  connection?: PoolConnection
): Promise<WorkflowHealthSnapshotRecord> {
  const id = randomUUID();
  const runner = connection ?? getDb();

  await dbQuery(
    runner,
    `INSERT INTO workflow_health_snapshots (
      id, project_id, workflow_id, n8n_workflow_id, status, active, health_status,
      last_success_at, last_failure_at, recent_success_count, recent_failure_count,
      last_error_message, last_error_node, last_error_type, recommended_action, raw_summary_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.projectId,
      input.workflowId,
      input.n8nWorkflowId,
      input.status,
      input.active ? 1 : 0,
      input.healthStatus,
      input.lastSuccessAt,
      input.lastFailureAt,
      input.recentSuccessCount,
      input.recentFailureCount,
      input.lastErrorMessage,
      input.lastErrorNode,
      input.lastErrorType,
      input.recommendedAction,
      JSON.stringify(input.rawSummaryJson)
    ]
  );

  const [rows] = await dbQuery<WorkflowHealthSnapshotRow[]>(
    runner,
    `SELECT id, project_id, workflow_id, n8n_workflow_id, status, active, health_status,
            last_success_at, last_failure_at, recent_success_count, recent_failure_count,
            last_error_message, last_error_node, last_error_type, recommended_action, raw_summary_json,
            created_at
     FROM workflow_health_snapshots
     WHERE id = ?`,
    [id]
  );

  const row = rows[0];
  if (!row) {
    throw new AppError(
      500,
      "WORKFLOW_HEALTH_SNAPSHOT_INSERT_FAILED",
      "Workflow health snapshot insert failed."
    );
  }

  return mapSnapshotRow(row);
}

export async function getLatestWorkflowHealthSnapshot(
  workflowId: string
): Promise<WorkflowHealthSnapshotRecord | null> {
  const db = getDb();
  const [rows] = await dbQuery<WorkflowHealthSnapshotRow[]>(
    db,
    `SELECT id, project_id, workflow_id, n8n_workflow_id, status, active, health_status,
            last_success_at, last_failure_at, recent_success_count, recent_failure_count,
            last_error_message, last_error_node, last_error_type, recommended_action, raw_summary_json,
            created_at
     FROM workflow_health_snapshots
     WHERE workflow_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [workflowId]
  );
  const row = rows[0];
  return row ? mapSnapshotRow(row) : null;
}

export async function cleanupOldWorkflowHealthSnapshots(retentionDays: number): Promise<number> {
  const db = getDb();
  const safeRetentionDays = Math.max(1, Math.floor(retentionDays));
  const [result] = await dbQuery<ResultSetHeader>(
    db,
    `DELETE FROM workflow_health_snapshots
     WHERE created_at < (CURRENT_TIMESTAMP - INTERVAL ? DAY)`,
    [safeRetentionDays]
  );
  return Number(result.affectedRows ?? 0);
}

export async function findOpenWorkflowAlertByFingerprint(
  fingerprint: string
): Promise<WorkflowAlertRecord | null> {
  const db = getDb();
  const [rows] = await dbQuery<WorkflowAlertRow[]>(
    db,
    `SELECT id, project_id, workflow_id, n8n_workflow_id, alert_type, severity, message,
            recommended_action, fingerprint, failed_node, first_seen_at, last_seen_at, resolved_at, status, occurrence_count
     FROM workflow_alerts
     WHERE fingerprint = ?
       AND status = 'open'
     ORDER BY first_seen_at DESC
     LIMIT 1`,
    [fingerprint]
  );
  const row = rows[0];
  return row ? mapAlertRow(row) : null;
}

export async function upsertWorkflowAlert(input: {
  projectId: string;
  workflowId: string;
  n8nWorkflowId: string | null;
  alertType: string;
  severity: "low" | "medium" | "high";
  message: string;
  recommendedAction: string | null;
  fingerprint: string;
  failedNode: string | null;
}): Promise<{ alert: WorkflowAlertRecord; created: boolean }> {
  const db = getDb();
  const existing = await findOpenWorkflowAlertByFingerprint(input.fingerprint);
  if (existing) {
    // Increment occurrence_count on every fingerprint hit. Before this,
    // operators saw one row with first_seen_at/last_seen_at but no way to
    // tell whether the alert recurred twice or two-hundred times.
    await dbQuery(
      db,
      `UPDATE workflow_alerts
       SET last_seen_at = CURRENT_TIMESTAMP,
           occurrence_count = occurrence_count + 1,
           severity = ?,
           message = ?,
           recommended_action = ?,
           n8n_workflow_id = ?,
           failed_node = ?
       WHERE id = ?`,
      [
        input.severity,
        input.message,
        input.recommendedAction,
        input.n8nWorkflowId,
        input.failedNode,
        existing.id
      ]
    );
    const refreshed = await findOpenWorkflowAlertByFingerprint(input.fingerprint);
    if (!refreshed) {
      throw new AppError(500, "WORKFLOW_ALERT_UPDATE_FAILED", "Workflow alert update failed.");
    }
    return { alert: refreshed, created: false };
  }

  const id = randomUUID();
  await dbQuery(
    db,
    `INSERT INTO workflow_alerts (
      id, project_id, workflow_id, n8n_workflow_id, alert_type, severity, message,
      recommended_action, fingerprint, failed_node, first_seen_at, last_seen_at, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'open')`,
    [
      id,
      input.projectId,
      input.workflowId,
      input.n8nWorkflowId,
      input.alertType,
      input.severity,
      input.message,
      input.recommendedAction,
      input.fingerprint,
      input.failedNode
    ]
  );

  const [rows] = await dbQuery<WorkflowAlertRow[]>(
    db,
    `SELECT id, project_id, workflow_id, n8n_workflow_id, alert_type, severity, message,
            recommended_action, fingerprint, failed_node, first_seen_at, last_seen_at, resolved_at, status, occurrence_count
     FROM workflow_alerts
     WHERE id = ?`,
    [id]
  );

  const row = rows[0];
  if (!row) {
    throw new AppError(500, "WORKFLOW_ALERT_INSERT_FAILED", "Workflow alert insert failed.");
  }

  return { alert: mapAlertRow(row), created: true };
}

export async function resolveOpenWorkflowAlerts(workflowId: string): Promise<number> {
  const db = getDb();
  const [result] = await dbQuery<ResultSetHeader>(
    db,
    `UPDATE workflow_alerts
     SET status = 'resolved',
         resolved_at = CURRENT_TIMESTAMP,
         last_seen_at = CURRENT_TIMESTAMP
     WHERE workflow_id = ?
       AND status = 'open'`,
    [workflowId]
  );

  return Number(result.affectedRows ?? 0);
}

export async function countOpenWorkflowAlertsByWorkflowId(workflowId: string): Promise<number> {
  const db = getDb();
  const [rows] = await dbQuery<Array<RowDataPacket & { total: number }>>(
    db,
    `SELECT COUNT(*) AS total
     FROM workflow_alerts
     WHERE workflow_id = ?
       AND status = 'open'`,
    [workflowId]
  );
  return Number(rows[0]?.total ?? 0);
}

export async function listOpenWorkflowAlertsByWorkflowId(
  workflowId: string,
  limit = 20
): Promise<WorkflowAlertRecord[]> {
  const db = getDb();
  const capped = Math.min(Math.max(limit, 1), 200);
  const [rows] = await dbQuery<WorkflowAlertRow[]>(
    db,
    `SELECT id, project_id, workflow_id, n8n_workflow_id, alert_type, severity, message,
            recommended_action, fingerprint, failed_node, first_seen_at, last_seen_at, resolved_at, status, occurrence_count
     FROM workflow_alerts
     WHERE workflow_id = ?
       AND status = 'open'
     ORDER BY last_seen_at DESC
     LIMIT ?`,
    [workflowId, capped]
  );
  return rows.map((row) => mapAlertRow(row));
}
