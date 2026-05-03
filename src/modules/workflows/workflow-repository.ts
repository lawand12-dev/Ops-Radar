import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { dbQuery, getDb } from "../../lib/db";
import { AppError } from "../../lib/errors";
import type { N8nWorkflow, WorkflowRecord, WorkflowStatus } from "../../types/workflow";

type WorkflowRow = RowDataPacket & {
  id: string;
  project_id: string;
  json: unknown;
  status: WorkflowStatus;
  validation_errors: unknown;
  n8n_workflow_id: string | null;
  last_deployed_at: string | Date | null;
  last_activated_at: string | Date | null;
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
    last_deployed_at: row.last_deployed_at ? new Date(row.last_deployed_at) : null,
    last_activated_at: row.last_activated_at ? new Date(row.last_activated_at) : null,
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

  await dbQuery(
    runner,
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
    throw new AppError(500, "WORKFLOW_INSERT_FAILED", "Workflow insert failed.");
  }

  return record;
}

export async function getWorkflowById(
  id: string,
  connection?: PoolConnection
): Promise<WorkflowRecord | null> {
  const runner = connection ?? getDb();
  const [rows] = await dbQuery<WorkflowRow[]>(
    runner,
    `SELECT id, project_id, json, status, validation_errors, n8n_workflow_id, last_deployed_at, last_activated_at, created_at, updated_at
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
  const [rows] = await dbQuery<WorkflowRow[]>(
    runner,
    `SELECT id, project_id, json, status, validation_errors, n8n_workflow_id, last_deployed_at, last_activated_at, created_at, updated_at
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
  const [rows] = await dbQuery<WorkflowRow[]>(
    runner,
    `SELECT id, project_id, json, status, validation_errors, n8n_workflow_id, last_deployed_at, last_activated_at, created_at, updated_at
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

export async function listWorkflowsByProjectId(
  projectId: string,
  connection?: PoolConnection
): Promise<WorkflowRecord[]> {
  const runner = connection ?? getDb();
  const [rows] = await dbQuery<WorkflowRow[]>(
    runner,
    `SELECT id, project_id, json, status, validation_errors, n8n_workflow_id, last_deployed_at, last_activated_at, created_at, updated_at
     FROM workflows
     WHERE project_id = ?
     ORDER BY created_at DESC`,
    [projectId]
  );

  return rows.map((row) => mapWorkflowRow(row));
}

export async function updateWorkflowStatus(
  id: string,
  status: WorkflowStatus,
  connection?: PoolConnection
): Promise<void> {
  const runner = connection ?? getDb();
  await dbQuery(runner, `UPDATE workflows SET status = ? WHERE id = ?`, [status, id]);
}

export async function updateWorkflowById(
  id: string,
  input: {
    json: N8nWorkflow;
    status: WorkflowStatus;
    validationErrors: string[] | null;
  },
  connection?: PoolConnection
): Promise<void> {
  const runner = connection ?? getDb();
  // Preserve n8n_workflow_id so re-deploy updates the same n8n workflow
  // instead of creating a new one (leaving the old one orphaned and stale).
  await dbQuery(
    runner,
    `UPDATE workflows
     SET json = ?, status = ?, validation_errors = ?
     WHERE id = ?`,
    [JSON.stringify(input.json), input.status, JSON.stringify(input.validationErrors), id]
  );
}

export async function markWorkflowDeployed(
  id: string,
  n8nWorkflowId: string,
  active: boolean,
  connection?: PoolConnection
): Promise<void> {
  const runner = connection ?? getDb();
  await dbQuery(
    runner,
    `UPDATE workflows
     SET status = ?,
         n8n_workflow_id = ?,
         last_deployed_at = CURRENT_TIMESTAMP,
         last_activated_at = CASE
           WHEN ? = 1 THEN CURRENT_TIMESTAMP
           ELSE last_activated_at
         END
     WHERE id = ?`,
    [active ? "deployed_active" : "deployed_inactive", n8nWorkflowId, active ? 1 : 0, id]
  );
}

export async function updateWorkflowJsonOnDeploy(
  id: string,
  json: N8nWorkflow,
  connection?: PoolConnection
): Promise<void> {
  const runner = connection ?? getDb();
  await dbQuery(
    runner,
    `UPDATE workflows
     SET json = ?
     WHERE id = ?`,
    [JSON.stringify(json), id]
  );
}

export async function attachWorkflowToN8n(
  id: string,
  n8nWorkflowId: string,
  connection?: PoolConnection
): Promise<void> {
  const runner = connection ?? getDb();
  await dbQuery(
    runner,
    `UPDATE workflows
     SET n8n_workflow_id = ?, last_deployed_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [n8nWorkflowId, id]
  );
}

export async function listWorkflowsWithN8nWorkflowId(limit = 200): Promise<WorkflowRecord[]> {
  const db = getDb();
  const capped = Math.min(Math.max(limit, 1), 1000);
  const [rows] = await dbQuery<WorkflowRow[]>(
    db,
    `SELECT id, project_id, json, status, validation_errors, n8n_workflow_id, last_deployed_at, last_activated_at, created_at, updated_at
     FROM workflows
     WHERE n8n_workflow_id IS NOT NULL
     ORDER BY updated_at DESC
     LIMIT ?`,
    [capped]
  );

  return rows.map((row) => mapWorkflowRow(row));
}
