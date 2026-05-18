import { randomUUID } from "node:crypto";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { dbQuery, getDb } from "../../lib/db";
import type { NodeTelemetry } from "./telemetry-extractor";

export interface ExecutionNodeStatRecord {
  id: string;
  workflow_id: string;
  execution_id: string;
  node_name: string;
  node_type: string | null;
  items_in: number | null;
  items_out: number | null;
  branch_index: number | null;
  duration_ms: number | null;
  had_error: boolean;
  continued_on_fail: boolean;
  created_at: Date;
}

type ExecutionNodeStatRow = RowDataPacket & {
  id: string;
  workflow_id: string;
  execution_id: string;
  node_name: string;
  node_type: string | null;
  items_in: number | null;
  items_out: number | null;
  branch_index: number | null;
  duration_ms: number | null;
  had_error: number | boolean;
  continued_on_fail: number | boolean;
  created_at: string | Date;
};

function mapRow(row: ExecutionNodeStatRow): ExecutionNodeStatRecord {
  return {
    id: row.id,
    workflow_id: row.workflow_id,
    execution_id: row.execution_id,
    node_name: row.node_name,
    node_type: row.node_type,
    items_in: row.items_in,
    items_out: row.items_out,
    branch_index: row.branch_index,
    duration_ms: row.duration_ms,
    had_error: Boolean(row.had_error),
    continued_on_fail: Boolean(row.continued_on_fail),
    created_at: new Date(row.created_at)
  };
}

/**
 * Persist one telemetry row per node in a single multi-VALUES INSERT.
 *
 * UNIQUE(workflow_id, execution_id, node_name) is enforced by the schema, so
 * a re-poll of the same execution would normally trip a duplicate-key error.
 * We use ON DUPLICATE KEY UPDATE to make the write idempotent — subsequent
 * fetches with richer data simply refresh the row instead of failing the cycle.
 */
export async function persistNodeTelemetry(
  input: {
    workflowId: string;
    executionId: string;
    telemetry: NodeTelemetry[];
  },
  connection?: PoolConnection
): Promise<number> {
  if (input.telemetry.length === 0) return 0;
  const runner = connection ?? getDb();

  const placeholders: string[] = [];
  const values: unknown[] = [];
  for (const node of input.telemetry) {
    placeholders.push("(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    values.push(
      randomUUID(),
      input.workflowId,
      input.executionId,
      node.node_name,
      node.node_type,
      node.items_in,
      node.items_out,
      node.branch_index,
      node.duration_ms,
      node.had_error ? 1 : 0,
      node.continued_on_fail ? 1 : 0
    );
  }

  const sql = `
    INSERT INTO execution_node_stats (
      id, workflow_id, execution_id, node_name, node_type,
      items_in, items_out, branch_index, duration_ms, had_error, continued_on_fail
    ) VALUES ${placeholders.join(", ")}
    ON DUPLICATE KEY UPDATE
      node_type = VALUES(node_type),
      items_in = VALUES(items_in),
      items_out = VALUES(items_out),
      branch_index = VALUES(branch_index),
      duration_ms = VALUES(duration_ms),
      had_error = VALUES(had_error),
      continued_on_fail = VALUES(continued_on_fail)
  `;

  const [result] = await dbQuery<ResultSetHeader>(runner, sql, values);
  return Number(result.affectedRows ?? 0);
}

/**
 * Per-node mean `items_out` over the most recent successful executions for a
 * workflow. Used by the zero-output anomaly detector. We compute MEAN over a
 * bounded window rather than all time so a workflow that legitimately changes
 * shape over months doesn't get stuck on stale baselines.
 *
 * "Recent successful execution" here means "any node_stat row from the last
 * `sampleLimit` distinct execution_ids where had_error was false somewhere
 * in the batch" — implemented simply by ordering on created_at DESC and
 * capping by sample count. Good-enough heuristic for a v1 detector.
 */
export async function getRecentItemsOutBaselineByNode(
  workflowId: string,
  options?: { sampleLimit?: number }
): Promise<Map<string, number>> {
  const cap = Math.max(5, Math.min(options?.sampleLimit ?? 50, 500));
  const db = getDb();
  const [rows] = await dbQuery<
    Array<RowDataPacket & { node_name: string; mean_items_out: number }>
  >(
    db,
    `SELECT node_name, AVG(items_out) AS mean_items_out
     FROM (
       SELECT node_name, items_out
       FROM execution_node_stats
       WHERE workflow_id = ?
         AND items_out IS NOT NULL
         AND had_error = 0
       ORDER BY created_at DESC
       LIMIT ?
     ) recent
     GROUP BY node_name`,
    [workflowId, cap]
  );

  const out = new Map<string, number>();
  for (const row of rows) {
    const v = Number(row.mean_items_out);
    if (Number.isFinite(v)) out.set(row.node_name, v);
  }
  return out;
}

/**
 * Duration baseline for `detectDurationAnomaly`. We compute population
 * stddev (STDDEV_POP) because the baseline is the actual past behavior of
 * this workflow, not a sample from a larger imaginary population.
 */
export async function getExecutionDurationBaseline(
  workflowId: string,
  options?: { sampleLimit?: number }
): Promise<{ sampleSize: number; meanMs: number; stddevMs: number }> {
  const cap = Math.max(5, Math.min(options?.sampleLimit ?? 50, 500));
  const db = getDb();
  const [rows] = await dbQuery<
    Array<RowDataPacket & { sample_size: number; mean_ms: number | null; stddev_ms: number | null }>
  >(
    db,
    `SELECT
        COUNT(*) AS sample_size,
        AVG(execution_duration) AS mean_ms,
        STDDEV_POP(execution_duration) AS stddev_ms
     FROM (
       SELECT execution_id, SUM(duration_ms) AS execution_duration
       FROM execution_node_stats
       WHERE workflow_id = ?
         AND duration_ms IS NOT NULL
         AND had_error = 0
       GROUP BY execution_id
       ORDER BY MAX(created_at) DESC
       LIMIT ?
     ) per_exec`,
    [workflowId, cap]
  );

  const row = rows[0];
  return {
    sampleSize: Number(row?.sample_size ?? 0),
    meanMs: Number(row?.mean_ms ?? 0),
    stddevMs: Number(row?.stddev_ms ?? 0)
  };
}

export async function listNodeStatsForExecution(
  workflowId: string,
  executionId: string
): Promise<ExecutionNodeStatRecord[]> {
  const db = getDb();
  const [rows] = await dbQuery<ExecutionNodeStatRow[]>(
    db,
    `SELECT id, workflow_id, execution_id, node_name, node_type,
            items_in, items_out, branch_index, duration_ms,
            had_error, continued_on_fail, created_at
     FROM execution_node_stats
     WHERE workflow_id = ? AND execution_id = ?
     ORDER BY node_name`,
    [workflowId, executionId]
  );
  return rows.map(mapRow);
}
