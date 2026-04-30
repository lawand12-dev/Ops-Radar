import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getDb } from "../../lib/db";
import type { EventType, WorkflowEventRecord } from "../../types/workflow";

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

  await runner.query(
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

  const [rows] = await runner.query<WorkflowEventRow[]>(
    `SELECT id, workflow_id, run_id, node_name, event_type, status, duration_ms, error_message, metadata, created_at
     FROM workflow_events
     WHERE id = ?`,
    [id]
  );

  const row = rows[0];
  if (!row) {
    throw new Error("workflow event insert failed");
  }

  return mapEventRow(row);
}

export async function listRecentEventsByWorkflowId(
  workflowId: string,
  limit = 20
): Promise<WorkflowEventRecord[]> {
  const db = getDb();
  const capped = Math.min(Math.max(limit, 1), 200);
  const [rows] = await db.query<WorkflowEventRow[]>(
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
  const [rows] = await db.query<WorkflowEventRow[]>(
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
  const [rows] = await db.query<Array<RowDataPacket & { failures: number }>>(
    `SELECT COUNT(*) AS failures
     FROM workflow_events
     WHERE workflow_id = ?
       AND event_type = 'run_failed'`,
    [workflowId]
  );

  return Number(rows[0]?.failures ?? 0);
}

export async function countConsecutiveWorkflowFailures(workflowId: string, take = 10): Promise<number> {
  const db = getDb();
  const [rows] = await db.query<Array<RowDataPacket & { event_type: EventType }>>(
    `SELECT event_type
     FROM workflow_events
     WHERE workflow_id = ?
       AND event_type IN ('run_failed', 'run_succeeded')
     ORDER BY created_at DESC
     LIMIT ?`,
    [workflowId, Math.max(take, 1)]
  );

  let consecutive = 0;
  for (const row of rows) {
    if (row.event_type === "run_failed") {
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
  const [rows] = await db.query<
    Array<
      RowDataPacket & {
        total_runs: number;
        failed_runs: number;
        success_runs: number;
        avg_duration: number | null;
      }
    >
  >(
    `SELECT
      COUNT(*) AS total_runs,
      SUM(CASE WHEN event_type = 'run_failed' THEN 1 ELSE 0 END) AS failed_runs,
      SUM(CASE WHEN event_type = 'run_succeeded' THEN 1 ELSE 0 END) AS success_runs,
      AVG(duration_ms) AS avg_duration
    FROM workflow_events
    WHERE workflow_id = ?
      AND event_type IN ('run_succeeded', 'run_failed')`,
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
  const [rows] = await db.query<WorkflowEventRow[]>(
    `SELECT id, workflow_id, run_id, node_name, event_type, status, duration_ms, error_message, metadata, created_at
     FROM workflow_events
     WHERE workflow_id = ?
       AND event_type IN ('run_succeeded', 'run_failed')
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
  const [rows] = await db.query<
    Array<
      RowDataPacket & {
        total_runs: number;
        failed_runs: number;
        success_runs: number;
        avg_duration: number | null;
      }
    >
  >(
    `SELECT
      COUNT(*) AS total_runs,
      SUM(CASE WHEN event_type = 'run_failed' THEN 1 ELSE 0 END) AS failed_runs,
      SUM(CASE WHEN event_type = 'run_succeeded' THEN 1 ELSE 0 END) AS success_runs,
      AVG(duration_ms) AS avg_duration
    FROM workflow_events
    WHERE event_type IN ('run_succeeded', 'run_failed')`
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

export async function getGlobalHealthBreakdown(): Promise<{
  healthyWorkflows: number;
  unhealthyWorkflows: number;
}> {
  const db = getDb();
  const [rows] = await db.query<
    Array<
      RowDataPacket & {
        healthy_workflows: number;
        unhealthy_workflows: number;
      }
    >
  >(
    `SELECT
      SUM(CASE WHEN w.status IN ('deployed', 'approved', 'validated') THEN 1 ELSE 0 END) AS healthy_workflows,
      SUM(CASE WHEN w.status IN ('failed', 'rejected') THEN 1 ELSE 0 END) AS unhealthy_workflows
    FROM workflows w`
  );

  return {
    healthyWorkflows: Number(rows[0]?.healthy_workflows ?? 0),
    unhealthyWorkflows: Number(rows[0]?.unhealthy_workflows ?? 0)
  };
}
