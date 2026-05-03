import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { dbQuery, getDb } from "../../lib/db";
import type { WorkflowCredentialBindingRecord } from "../../types/workflow";

type WorkflowCredentialBindingRow = RowDataPacket & {
  id: string;
  project_id: string;
  workflow_id: string;
  node_id: string | null;
  node_name: string | null;
  credential_type: string;
  credential_id: string | null;
  credential_name: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

export interface WorkflowCredentialBindingWrite {
  node_id?: string | null;
  node_name?: string | null;
  credential_type: string;
  credential_id?: string | null;
  credential_name?: string | null;
}

function mapWorkflowCredentialBindingRow(
  row: WorkflowCredentialBindingRow
): WorkflowCredentialBindingRecord {
  return {
    id: row.id,
    project_id: row.project_id,
    workflow_id: row.workflow_id,
    node_id: row.node_id,
    node_name: row.node_name,
    credential_type: row.credential_type,
    credential_id: row.credential_id,
    credential_name: row.credential_name,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at)
  };
}

export async function listWorkflowCredentialBindings(
  workflowId: string,
  connection?: PoolConnection
): Promise<WorkflowCredentialBindingRecord[]> {
  const runner = connection ?? getDb();
  const [rows] = await dbQuery<WorkflowCredentialBindingRow[]>(
    runner,
    `SELECT id, project_id, workflow_id, node_id, node_name, credential_type, credential_id, credential_name, created_at, updated_at
     FROM workflow_credential_bindings
     WHERE workflow_id = ?
     ORDER BY COALESCE(node_name, ''), credential_type ASC`,
    [workflowId]
  );

  return rows.map((row) => mapWorkflowCredentialBindingRow(row));
}

export async function replaceWorkflowCredentialBindings(
  projectId: string,
  workflowId: string,
  bindings: WorkflowCredentialBindingWrite[],
  connection?: PoolConnection
): Promise<void> {
  const runner = connection ?? getDb();
  await dbQuery(runner, `DELETE FROM workflow_credential_bindings WHERE workflow_id = ?`, [workflowId]);

  for (const binding of bindings) {
    if (!binding || typeof binding !== "object") {
      continue;
    }

    const credentialType = String(binding.credential_type || "").trim();
    if (!credentialType) {
      continue;
    }

    const credentialId =
      typeof binding.credential_id === "string" && binding.credential_id.trim().length > 0
        ? binding.credential_id.trim()
        : null;
    const credentialName =
      typeof binding.credential_name === "string" && binding.credential_name.trim().length > 0
        ? binding.credential_name.trim()
        : null;
    const nodeId =
      typeof binding.node_id === "string" && binding.node_id.trim().length > 0
        ? binding.node_id.trim()
        : null;
    const nodeName =
      typeof binding.node_name === "string" && binding.node_name.trim().length > 0
        ? binding.node_name.trim()
        : null;

    if (!credentialId && !credentialName) {
      continue;
    }

    await dbQuery(
      runner,
      `INSERT INTO workflow_credential_bindings (
        id,
        project_id,
        workflow_id,
        node_id,
        node_name,
        credential_type,
        credential_id,
        credential_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        projectId,
        workflowId,
        nodeId,
        nodeName,
        credentialType,
        credentialId,
        credentialName
      ]
    );
  }
}
