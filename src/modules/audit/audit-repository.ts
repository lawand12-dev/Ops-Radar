import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getDb } from "../../lib/db";
import type { AuditLogRecord, FailureAnalysis } from "../../types/workflow";

type AuditRow = RowDataPacket & {
  id: string;
  workflow_id: string;
  run_id: string | null;
  issue: string;
  reason: string;
  solution: string;
  raw_input: unknown;
  created_at: string | Date;
};

function parseJsonField<T>(value: unknown): T {
  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }
  return value as T;
}

function mapAuditRow(row: AuditRow): AuditLogRecord {
  return {
    id: row.id,
    workflow_id: row.workflow_id,
    run_id: row.run_id,
    issue: row.issue,
    reason: row.reason,
    solution: row.solution,
    raw_input: parseJsonField<Record<string, unknown>>(row.raw_input),
    created_at: new Date(row.created_at)
  };
}

export async function createAuditLog(
  input: {
    workflowId: string;
    runId: string | null;
    analysis: FailureAnalysis;
    rawInput: Record<string, unknown>;
  },
  connection?: PoolConnection
): Promise<AuditLogRecord> {
  const id = randomUUID();
  const runner = connection ?? getDb();
  await runner.query(
    `INSERT INTO audit_logs (id, workflow_id, run_id, issue, reason, solution, raw_input)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.workflowId,
      input.runId,
      input.analysis.issue,
      input.analysis.reason,
      input.analysis.solution,
      JSON.stringify(input.rawInput)
    ]
  );

  const [rows] = await runner.query<AuditRow[]>(
    `SELECT id, workflow_id, run_id, issue, reason, solution, raw_input, created_at
     FROM audit_logs
     WHERE id = ?`,
    [id]
  );

  const row = rows[0];
  if (!row) {
    throw new Error("audit log insert failed");
  }

  return mapAuditRow(row);
}

export async function listAuditLogsByWorkflowId(workflowId: string, limit = 10): Promise<AuditLogRecord[]> {
  const db = getDb();
  const capped = Math.min(Math.max(limit, 1), 100);
  const [rows] = await db.query<AuditRow[]>(
    `SELECT id, workflow_id, run_id, issue, reason, solution, raw_input, created_at
     FROM audit_logs
     WHERE workflow_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [workflowId, capped]
  );

  return rows.map((row) => mapAuditRow(row));
}

export async function getLatestAuditLog(workflowId: string): Promise<AuditLogRecord | null> {
  const db = getDb();
  const [rows] = await db.query<AuditRow[]>(
    `SELECT id, workflow_id, run_id, issue, reason, solution, raw_input, created_at
     FROM audit_logs
     WHERE workflow_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [workflowId]
  );

  const row = rows[0];
  return row ? mapAuditRow(row) : null;
}
