import type { RowDataPacket } from "mysql2/promise";
import { env } from "../../config/env";
import { dbQuery, getDb } from "../../lib/db";
import { logError, logInfo, logWarn } from "../../lib/logger";

/**
 * Outcome reconciler.
 *
 * Closes the lineage edge on `ai_interactions`: after migration 019 every
 * AI call records `outcome='pending'` until we can confirm what the artifact
 * (a workflow, today) actually did downstream. This job sweeps pending rows
 * and advances them based on the joined workflow's status + recent events.
 *
 * Invariants
 * ----------
 *  - Strictly per-row by `ai_interactions.id`; never accepts tenant input.
 *  - Idempotent: a transition from 'pending' is final; reruns are no-ops.
 *  - Stale guard: rows older than OUTCOME_RECONCILER_STALE_DAYS that still
 *    have no workflow_id are moved to 'superseded'.
 *  - Coexists with the monitoring scheduler — they share no locks but
 *    operate on disjoint columns.
 *
 * Mapping (workflow.status -> outcome):
 *   rejected            -> rejected
 *   validated           -> validated
 *   deployed_inactive   -> validated   (built but not yet activated)
 *   deployed_active     -> deployed
 *   failed              -> failed_in_n8n
 *   draft               -> pending     (unchanged; stays in queue)
 *
 * Rows whose workflow was deleted but we still have a workflow_id reference
 * stay pending until the stale window closes — we don't fabricate an outcome
 * from a missing row.
 */

type AIWorkflowStatus =
  | "draft"
  | "validated"
  | "rejected"
  | "deployed_inactive"
  | "deployed_active"
  | "failed";

type AIOutcome =
  | "pending"
  | "validated"
  | "rejected"
  | "deployed"
  | "failed_in_n8n"
  | "superseded";

interface PendingRow extends RowDataPacket {
  id: number;
  workflow_id: string | null;
  workflow_status: AIWorkflowStatus | null;
  created_at: Date;
}

function mapStatusToOutcome(status: AIWorkflowStatus | null): AIOutcome | null {
  switch (status) {
    case "rejected":
      return "rejected";
    case "validated":
    case "deployed_inactive":
      return "validated";
    case "deployed_active":
      return "deployed";
    case "failed":
      return "failed_in_n8n";
    case "draft":
    case null:
      return null;
    default:
      return null;
  }
}

export interface ReconcilerCycleResult {
  scanned: number;
  transitioned: number;
  superseded: number;
  unchanged: number;
}

export async function runReconcilerCycle(): Promise<ReconcilerCycleResult> {
  const db = getDb();
  const batchSize = env.OUTCOME_RECONCILER_BATCH_SIZE;
  const staleMs = env.OUTCOME_RECONCILER_STALE_DAYS * 24 * 60 * 60 * 1000;
  const staleCutoff = new Date(Date.now() - staleMs);

  // Single SQL that gets us everything we need in one round trip. The LEFT
  // JOIN handles the case where workflow_id has been deleted out from under
  // us — workflow_status comes back NULL, and we use created_at to decide
  // whether to retire or wait.
  const [rows] = await dbQuery<PendingRow[]>(
    db,
    `SELECT ai.id            AS id,
            ai.workflow_id   AS workflow_id,
            w.status         AS workflow_status,
            ai.created_at    AS created_at
       FROM ai_interactions ai
       LEFT JOIN workflows w ON w.id = ai.workflow_id
      WHERE ai.outcome = 'pending'
      ORDER BY ai.created_at ASC
      LIMIT ?`,
    [batchSize]
  );

  let transitioned = 0;
  let superseded = 0;
  let unchanged = 0;

  for (const row of rows) {
    const targetOutcome = mapStatusToOutcome(row.workflow_status);

    if (targetOutcome) {
      await dbQuery(
        db,
        `UPDATE ai_interactions
            SET outcome = ?,
                outcome_settled_at = NOW()
          WHERE id = ?
            AND outcome = 'pending'`,
        [targetOutcome, row.id]
      );
      transitioned += 1;
      continue;
    }

    // No mappable workflow status. Retire if the row is stale; otherwise
    // leave it in the queue to be retried next cycle.
    const isStale = new Date(row.created_at).getTime() < staleCutoff.getTime();
    if (isStale) {
      await dbQuery(
        db,
        `UPDATE ai_interactions
            SET outcome = 'superseded',
                outcome_settled_at = NOW()
          WHERE id = ?
            AND outcome = 'pending'`,
        [row.id]
      );
      superseded += 1;
      continue;
    }

    unchanged += 1;
  }

  return {
    scanned: rows.length,
    transitioned,
    superseded,
    unchanged
  };
}

let reconcilerIntervalRef: ReturnType<typeof setInterval> | null = null;
let reconcilerCycleRunning = false;

export function getOutcomeReconcilerState(): { running: boolean; scheduled: boolean } {
  return {
    running: reconcilerCycleRunning,
    scheduled: Boolean(reconcilerIntervalRef)
  };
}

export function startOutcomeReconciler(): void {
  if (!env.OUTCOME_RECONCILER_ENABLED) {
    logInfo("ai-reconciler", "Outcome reconciler disabled by config.");
    return;
  }

  const intervalMs = env.OUTCOME_RECONCILER_INTERVAL_SECONDS * 1000;
  if (reconcilerIntervalRef) {
    clearInterval(reconcilerIntervalRef);
    reconcilerIntervalRef = null;
  }

  logInfo("ai-reconciler", "Outcome reconciler started", {
    interval_seconds: env.OUTCOME_RECONCILER_INTERVAL_SECONDS,
    batch_size: env.OUTCOME_RECONCILER_BATCH_SIZE,
    stale_days: env.OUTCOME_RECONCILER_STALE_DAYS
  });

  const runCycle = async () => {
    if (reconcilerCycleRunning) {
      logWarn("ai-reconciler", "Reconciler cycle skipped — previous cycle still running");
      return;
    }
    reconcilerCycleRunning = true;
    const startedAt = Date.now();
    try {
      const result = await runReconcilerCycle();
      logInfo("ai-reconciler", "Reconciler cycle completed", {
        ...result,
        duration_ms: Date.now() - startedAt
      });
    } catch (error) {
      logError("ai-reconciler", "Reconciler cycle crashed", {
        error: error instanceof Error ? error.message : String(error),
        duration_ms: Date.now() - startedAt
      });
    } finally {
      reconcilerCycleRunning = false;
    }
  };

  void runCycle();
  reconcilerIntervalRef = setInterval(() => {
    void runCycle();
  }, intervalMs);
}
