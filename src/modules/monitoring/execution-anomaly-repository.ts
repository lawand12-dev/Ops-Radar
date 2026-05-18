import { randomUUID } from "node:crypto";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { dbQuery, getDb } from "../../lib/db";
import type { AnomalyRecord } from "./anomaly-detectors";

export interface ExecutionAnomalyRow extends RowDataPacket {
  id: string;
  workflow_id: string;
  execution_id: string | null;
  anomaly_type: string;
  severity: "low" | "medium" | "high" | "critical";
  node_name: string | null;
  anomaly_score: number | null;
  metadata: unknown;
  detected_at: string | Date;
}

function parseMetadata(raw: unknown): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as Record<string, unknown>; } catch { return null; }
  }
  return null;
}

export interface ExecutionAnomalyRecord {
  id: string;
  workflow_id: string;
  execution_id: string | null;
  anomaly_type: string;
  severity: "low" | "medium" | "high" | "critical";
  node_name: string | null;
  anomaly_score: number | null;
  metadata: Record<string, unknown> | null;
  detected_at: Date;
}

function mapRow(row: ExecutionAnomalyRow): ExecutionAnomalyRecord {
  return {
    id: row.id,
    workflow_id: row.workflow_id,
    execution_id: row.execution_id,
    anomaly_type: row.anomaly_type,
    severity: row.severity,
    node_name: row.node_name,
    anomaly_score: row.anomaly_score === null ? null : Number(row.anomaly_score),
    metadata: parseMetadata(row.metadata),
    detected_at: new Date(row.detected_at)
  };
}

/**
 * Batched multi-VALUES insert for anomalies emitted by the detector layer.
 * Returns the number of rows actually persisted (zero for an empty input is
 * the common case for healthy workflows).
 */
export async function persistAnomalies(
  anomalies: AnomalyRecord[],
  connection?: PoolConnection
): Promise<number> {
  if (anomalies.length === 0) return 0;
  const runner = connection ?? getDb();

  const placeholders: string[] = [];
  const values: unknown[] = [];
  for (const a of anomalies) {
    placeholders.push("(?, ?, ?, ?, ?, ?, ?, ?)");
    values.push(
      randomUUID(),
      a.workflow_id,
      a.execution_id,
      a.anomaly_type,
      a.severity,
      a.node_name,
      a.anomaly_score,
      a.metadata === null ? null : JSON.stringify(a.metadata)
    );
  }

  const sql = `
    INSERT INTO execution_anomalies (
      id, workflow_id, execution_id, anomaly_type, severity, node_name, anomaly_score, metadata
    ) VALUES ${placeholders.join(", ")}
  `;
  const [result] = await dbQuery<ResultSetHeader>(runner, sql, values);
  return Number(result.affectedRows ?? 0);
}

export async function listAnomaliesByWorkflowId(
  workflowId: string,
  options?: { limit?: number; severity?: string; anomalyType?: string }
): Promise<ExecutionAnomalyRecord[]> {
  const cap = Math.min(Math.max(options?.limit ?? 50, 1), 500);
  const filters: string[] = ["workflow_id = ?"];
  const params: unknown[] = [workflowId];

  if (options?.severity) {
    filters.push("severity = ?");
    params.push(options.severity);
  }
  if (options?.anomalyType) {
    filters.push("anomaly_type = ?");
    params.push(options.anomalyType);
  }
  params.push(cap);

  const db = getDb();
  const [rows] = await dbQuery<ExecutionAnomalyRow[]>(
    db,
    `SELECT id, workflow_id, execution_id, anomaly_type, severity, node_name,
            anomaly_score, metadata, detected_at
     FROM execution_anomalies
     WHERE ${filters.join(" AND ")}
     ORDER BY detected_at DESC
     LIMIT ?`,
    params
  );
  return rows.map(mapRow);
}

export async function countOpenAnomaliesByWorkflowId(workflowId: string): Promise<number> {
  // We do not have a resolved/open flag on anomalies (they are observations,
  // not actionables — the alert layer handles "open"). This count returns the
  // 24h window so the UI can show recency without a moving baseline question.
  const db = getDb();
  const [rows] = await dbQuery<Array<RowDataPacket & { total: number }>>(
    db,
    `SELECT COUNT(*) AS total
     FROM execution_anomalies
     WHERE workflow_id = ?
       AND detected_at >= (CURRENT_TIMESTAMP - INTERVAL 24 HOUR)`,
    [workflowId]
  );
  return Number(rows[0]?.total ?? 0);
}
