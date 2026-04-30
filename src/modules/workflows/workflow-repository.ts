import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getDb } from "../../lib/db";
import type { N8nWorkflow, WorkflowRecord, WorkflowStatus } from "../../types/workflow";

type WorkflowRow = RowDataPacket & {
  id: string;
  project_id: string;
  json: unknown;
  status: WorkflowStatus;
  validation_errors: unknown;
  n8n_workflow_id: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

function parseJsonField<T>(value: unknown): T {
  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }

  return value as T;
}

function mapWorkflowRow(row: WorkflowRow): WorkflowRecord {
  return {
    id: row.id,
    project_id: row.project_id,
    json: parseJsonField<N8nWorkflow>(row.json),
    status: row.status,
    validation_errors: row.validation_errors
      ? parseJsonField<string[]>(row.validation_errors)
      : null,
    n8n_workflow_id: row.n8n_workflow_id,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at)
  };
}

export async function createWorkflow(
  input: {
    projectId: string;
    json: N8nWorkflow;
    status: WorkflowStatus;
    validationErrors?: string[] | null;
  },
  connection?: PoolConnection
): Promise<WorkflowRecord> {
  const id = randomUUID();
  const runner = connection ?? getDb();

  await runner.query(
    `INSERT INTO workflows (id, project_id, json, status, validation_errors)
     VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      input.projectId,
      JSON.stringify(input.json),
      input.status,
      JSON.stringify(input.validationErrors ?? null)
    ]
  );

  const record = await getWorkflowById(id, connection);
  if (!record) {
    throw new Error("Workflow insert failed");
  }

  return record;
}

export async function getWorkflowById(
  id: string,
  connection?: PoolConnection
): Promise<WorkflowRecord | null> {
  const runner = connection ?? getDb();
  const [rows] = await runner.query<WorkflowRow[]>(
    `SELECT id, project_id, json, status, validation_errors, n8n_workflow_id, created_at, updated_at
     FROM workflows
     WHERE id = ?`,
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  if (!row) {
    return null;
  }

  return mapWorkflowRow(row);
}

export async function getWorkflowByN8nWorkflowId(
  n8nWorkflowId: string,
  connection?: PoolConnection
): Promise<WorkflowRecord | null> {
  const runner = connection ?? getDb();
  const [rows] = await runner.query<WorkflowRow[]>(
    `SELECT id, project_id, json, status, validation_errors, n8n_workflow_id, created_at, updated_at
     FROM workflows
     WHERE n8n_workflow_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [n8nWorkflowId]
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return mapWorkflowRow(row);
}

export async function getLatestWorkflowByProjectId(
  projectId: string,
  connection?: PoolConnection
): Promise<WorkflowRecord | null> {
  const runner = connection ?? getDb();
  const [rows] = await runner.query<WorkflowRow[]>(
    `SELECT id, project_id, json, status, validation_errors, n8n_workflow_id, created_at, updated_at
     FROM workflows
     WHERE project_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [projectId]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  if (!row) {
    return null;
  }

  return mapWorkflowRow(row);
}

export async function updateWorkflowStatus(
  id: string,
  status: WorkflowStatus,
  connection?: PoolConnection
): Promise<void> {
  const runner = connection ?? getDb();
  await runner.query(`UPDATE workflows SET status = ? WHERE id = ?`, [status, id]);
}

export async function markWorkflowDeployed(
  id: string,
  n8nWorkflowId: string,
  connection?: PoolConnection
): Promise<void> {
  const runner = connection ?? getDb();
  await runner.query(
    `UPDATE workflows
     SET status = 'deployed', n8n_workflow_id = ?
     WHERE id = ?`,
    [n8nWorkflowId, id]
  );
}

export async function attachWorkflowToN8n(
  id: string,
  n8nWorkflowId: string,
  connection?: PoolConnection
): Promise<void> {
  const runner = connection ?? getDb();
  await runner.query(
    `UPDATE workflows
     SET n8n_workflow_id = ?, status = 'approved'
     WHERE id = ?`,
    [n8nWorkflowId, id]
  );
}
