import { dbPgQuery, getPgPool } from "../../lib/db-pg";
import { env } from "../../config/env";
import { logWarn } from "../../lib/logger";
import { getOutcomeReconcilerState } from "../ai/outcome-reconciler";
import { getEmbeddingWorkerSnapshot } from "./embedding-worker";
import type { MemoryHealthResponse } from "../../types/memory-api";

/**
 * Admin /admin/memory/health aggregator.
 *
 * Reads:
 *   - worker snapshot (in-process)
 *   - reconciler snapshot (in-process)
 *   - embedding_jobs queue counts (pg)
 *   - embeddings_by_kind summary (pg)
 *   - pg reachability (the queries themselves)
 *
 * Gracefully degrades: if Postgres is down or unreachable, returns the
 * worker snapshot with empty queue/embedding fields and pg_reachable=false.
 * The admin UI uses pg_reachable to color the card red.
 */
export async function getMemoryHealthSnapshot(): Promise<MemoryHealthResponse> {
  const worker = getEmbeddingWorkerSnapshot();
  const reconciler = getOutcomeReconcilerState();

  // Defaults if Postgres unreachable.
  let queue: MemoryHealthResponse["queue"] = {
    queued: 0,
    running: 0,
    failed: 0,
    skipped: 0,
    oldest_queued_age_seconds: null
  };
  let embeddingsByKind: MemoryHealthResponse["embeddings_by_kind"] = [];
  let pgReachable = false;

  if (env.POSTGRES_URL) {
    try {
      const pool = getPgPool();

      // Queue status histogram + oldest queued age in one round-trip.
      const queueResult = await dbPgQuery<{
        status: string;
        n: string;
        oldest_queued: Date | null;
      }>(
        pool,
        `SELECT status,
                COUNT(*)::text AS n,
                CASE WHEN status = 'queued' THEN MIN(created_at) ELSE NULL END AS oldest_queued
           FROM embedding_jobs
          GROUP BY status`
      );

      let oldestQueued: Date | null = null;
      for (const row of queueResult.rows) {
        const n = Number(row.n);
        switch (row.status) {
          case "queued":
            queue.queued = n;
            oldestQueued = row.oldest_queued ?? null;
            break;
          case "running":
            queue.running = n;
            break;
          case "failed":
            queue.failed = n;
            break;
          case "skipped":
            queue.skipped = n;
            break;
          // 'done' intentionally not surfaced — would grow unbounded
          default:
            break;
        }
      }
      queue.oldest_queued_age_seconds = oldestQueued
        ? Math.max(0, Math.floor((Date.now() - oldestQueued.getTime()) / 1000))
        : null;

      // Embeddings histogram. Hits idx_embeddings_kind_created (migration 002).
      const kindResult = await dbPgQuery<{
        source_kind: string;
        n: string;
        latest_at: Date | null;
      }>(
        pool,
        `SELECT source_kind, COUNT(*)::text AS n, MAX(created_at) AS latest_at
           FROM embeddings
          WHERE active
          GROUP BY source_kind
          ORDER BY source_kind`
      );
      embeddingsByKind = kindResult.rows.map((r) => ({
        source_kind: r.source_kind,
        count: Number(r.n),
        latest_at: r.latest_at ? r.latest_at.toISOString() : null
      }));

      pgReachable = true;
    } catch (err) {
      logWarn("memory-health", "Postgres aggregations failed", {
        error: err instanceof Error ? err.message : String(err)
      });
      pgReachable = false;
    }
  }

  return {
    worker: {
      enabled: worker.enabled,
      scheduled: worker.scheduled,
      running: worker.running,
      last_cycle: worker.last_cycle
        ? {
            finished_at: worker.last_cycle.finished_at.toISOString(),
            claimed: worker.last_cycle.claimed,
            succeeded: worker.last_cycle.succeeded,
            failed: worker.last_cycle.failed,
            dead_lettered: worker.last_cycle.dead_lettered,
            duration_ms: worker.last_cycle.duration_ms
          }
        : null
    },
    reconciler: {
      enabled: env.OUTCOME_RECONCILER_ENABLED,
      scheduled: reconciler.scheduled,
      running: reconciler.running
    },
    queue,
    embeddings_by_kind: embeddingsByKind,
    pg_reachable: pgReachable
  };
}
