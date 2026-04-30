import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getDb } from "../../lib/db";
import type { WorkflowCredentialBindingRecord } from "../../types/workflow";

type WorkflowCredentialBindingRow = RowDataPacket & {
  id: string;
  workflow_id: string;
  credential_type: string;
  credential_id: string | null;
  credential_name: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

function mapWorkflowCredentialBindingRow(
  row: WorkflowCredentialBindingRow
): WorkflowCredentialBindingRecord {
  return {
    id: row.id,
    workflow_id: row.workflow_id,
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
  const [rows] = await runner.query<WorkflowCredentialBindingRow[]>(
    `SELECT id, workflow_id, credential_type, credential_id, credential_name, created_at, updated_at
     FROM workflow_credential_bindings
     WHERE workflow_id = ?
     ORDER BY credential_type ASC`,
    [workflowId]
  );

  return rows.map((row) => mapWorkflowCredentialBindingRow(row));
}

export async function replaceWorkflowCredentialBindings(
  workflowId: string,
  bindings: Record<string, { id?: string; name?: string }>,
  connection?: PoolConnection
): Promise<void> {
  const runner = connection ?? getDb();
  await runner.query(`DELETE FROM workflow_credential_bindings WHERE workflow_id = ?`, [workflowId]);

  const entries = Object.entries(bindings).filter(([credentialType, binding]) => {
    if (!credentialType || !binding) {
      return false;
    }
    const hasId = typeof binding.id === "string" && binding.id.trim().length > 0;
    const hasName = typeof binding.name === "string" && binding.name.trim().length > 0;
    return hasId || hasName;
  });

  for (const [credentialType, binding] of entries) {
    const credentialId =
      typeof binding.id === "string" && binding.id.trim().length > 0 ? binding.id.trim() : null;
    const credentialName =
      typeof binding.name === "string" && binding.name.trim().length > 0
        ? binding.name.trim()
        : null;

    await runner.query(
      `INSERT INTO workflow_credential_bindings (
        id,
        workflow_id,
        credential_type,
        credential_id,
        credential_name
      ) VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), workflowId, credentialType, credentialId, credentialName]
    );
  }
}
