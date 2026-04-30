import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getDb } from "../../lib/db";
import type { AlertRecord, AlertType } from "../../types/workflow";

type AlertRow = RowDataPacket & {
  id: string;
  workflow_id: string;
  type: AlertType;
  message: string;
  is_resolved: number | boolean;
  created_at: string | Date;
  resolved_at: string | Date | null;
};

function mapAlertRow(row: AlertRow): AlertRecord {
  return {
    id: row.id,
    workflow_id: row.workflow_id,
    type: row.type,
    message: row.message,
    is_resolved: Boolean(row.is_resolved),
    created_at: new Date(row.created_at),
    resolved_at: row.resolved_at ? new Date(row.resolved_at) : null
  };
}

export async function createAlert(
  input: {
    workflowId: string;
    type: AlertType;
    message: string;
  },
  connection?: PoolConnection
): Promise<AlertRecord> {
  const id = randomUUID();
  const runner = connection ?? getDb();
  await runner.query(
    `INSERT INTO alerts (id, workflow_id, type, message, is_resolved)
     VALUES (?, ?, ?, ?, 0)`,
    [id, input.workflowId, input.type, input.message]
  );

  const [rows] = await runner.query<AlertRow[]>(
    `SELECT id, workflow_id, type, message, is_resolved, created_at, resolved_at
     FROM alerts
     WHERE id = ?`,
    [id]
  );

  const row = rows[0];
  if (!row) {
    throw new Error("alert insert failed");
  }

  return mapAlertRow(row);
}

export async function findUnresolvedAlertByType(
  workflowId: string,
  type: AlertType
): Promise<AlertRecord | null> {
  const db = getDb();
  const [rows] = await db.query<AlertRow[]>(
    `SELECT id, workflow_id, type, message, is_resolved, created_at, resolved_at
     FROM alerts
     WHERE workflow_id = ?
       AND type = ?
       AND is_resolved = 0
     ORDER BY created_at DESC
     LIMIT 1`,
    [workflowId, type]
  );

  const row = rows[0];
  return row ? mapAlertRow(row) : null;
}

export async function resolveAlertsForWorkflow(workflowId: string): Promise<void> {
  const db = getDb();
  await db.query(
    `UPDATE alerts
     SET is_resolved = 1, resolved_at = CURRENT_TIMESTAMP
     WHERE workflow_id = ?
       AND is_resolved = 0`,
    [workflowId]
  );
}

export async function countUnresolvedAlerts(workflowId: string): Promise<number> {
  const db = getDb();
  const [rows] = await db.query<Array<RowDataPacket & { total: number }>>(
    `SELECT COUNT(*) AS total
     FROM alerts
     WHERE workflow_id = ?
       AND is_resolved = 0`,
    [workflowId]
  );

  return Number(rows[0]?.total ?? 0);
}

export async function listAlertsByWorkflowId(workflowId: string, limit = 20): Promise<AlertRecord[]> {
  const db = getDb();
  const capped = Math.min(Math.max(limit, 1), 200);
  const [rows] = await db.query<AlertRow[]>(
    `SELECT id, workflow_id, type, message, is_resolved, created_at, resolved_at
     FROM alerts
     WHERE workflow_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [workflowId, capped]
  );

  return rows.map((row) => mapAlertRow(row));
}

export async function countAllUnresolvedAlerts(): Promise<number> {
  const db = getDb();
  const [rows] = await db.query<Array<RowDataPacket & { total: number }>>(
    `SELECT COUNT(*) AS total FROM alerts WHERE is_resolved = 0`
  );
  return Number(rows[0]?.total ?? 0);
}

