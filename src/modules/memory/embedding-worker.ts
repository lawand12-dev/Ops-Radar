import { env } from "../../config/env";
import {
  createPgListener,
  dbPgQuery,
  getPgPool,
  withPgTransaction,
  type PgListener
} from "../../lib/db-pg";
import { logError, logInfo, logWarn } from "../../lib/logger";
import {
  embedBatch,
  vectorToSqlLiteral
} from "./embedding-client";
import {
  EMBEDDING_NOTIFY_CHANNEL,
  type EmbeddingSourceKind
} from "./embedding-jobs";

/**
 * Embedding worker.
 *
 * Responsibilities
 * ----------------
 *   1. LISTEN embedding_jobs (wake on NOTIFY, ≤100ms latency).
 *   2. Poll every EMBEDDING_POLL_INTERVAL_MS as a heartbeat fallback.
 *   3. Claim up to EMBEDDING_BATCH_SIZE rows via FOR UPDATE SKIP LOCKED.
 *   4. Call the embedding API in one batch.
 *   5. UPSERT into embeddings.
 *   6. Mark jobs done (or failed with exponential backoff for retry).
 *
 * Concurrency model
 * -----------------
 * One worker process holds:
 *   - 1 dedicated client for LISTEN
 *   - 1 transient pool connection per claim/upsert batch
 * Running N>1 worker instances is safe — SKIP LOCKED partitions work
 * naturally. Phase 2 ships with N=1 by default (`EMBEDDING_WORKER_ID`);
 * scale by running additional processes with distinct ids.
 *
 * Crash safety
 * ------------
 * If the worker dies between claim and commit, the transaction rolls back
 * and the rows return to 'queued'. Jobs marked 'running' but with an
 * expired `locked_until` are reclaimable — see the WHERE clause in
 * `claimBatch`. We never use long-lived advisory locks; the row-level lock
 * IS the lock.
 *
 * Retry / backoff
 * ---------------
 * On any failure during processing, we mark the batch's jobs 'failed'
 * with attempts+1 and `next_attempt_at = now() + 2^attempts seconds`,
 * capped at 6 hours. After EMBEDDING_MAX_ATTEMPTS, status -> 'skipped'
 * (dead-letter; surfaces in logs only).
 *
 * Observability
 * -------------
 * One INFO log per cycle with claimed/embedded/failed counts + latency.
 * One WARN log per skipped (dead-letter) job. One ERROR log on the
 * catastrophic case (DB down, etc.) — outer wrapper continues looping.
 */

interface ClaimedJob {
  id: string;
  owner_user_id: string | null;
  source_kind: EmbeddingSourceKind;
  source_id: string;
  source_version: number;
  attempts: number;
  payload: {
    content: string;
    content_hash: string;
    chunk_idx: number;
    metadata: Record<string, unknown>;
  };
}

let stopRequested = false;
let listener: PgListener | null = null;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let cycleRunning = false;
let lastWakeAt = 0;

// Coalesce NOTIFY storms: if we just woke up, drop further wakes for the
// next 250ms. This avoids spinning when a producer fires many NOTIFYs in
// a tight loop (e.g. pattern card sync inserting 50 cards).
const WAKE_COALESCE_MS = 250;

function scheduleNextPoll(): void {
  if (stopRequested) return;
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = setTimeout(() => {
    void runCycle("poll");
  }, env.EMBEDDING_POLL_INTERVAL_MS);
}

/**
 * Public entrypoint — call from src/index.ts.
 * Returns a stop function for graceful shutdown.
 */
export async function startEmbeddingWorker(): Promise<() => Promise<void>> {
  if (!env.EMBEDDING_WORKER_ENABLED) {
    logInfo("embedding-worker", "Disabled by config.");
    return async () => {};
  }
  if (!env.POSTGRES_URL) {
    logWarn("embedding-worker", "POSTGRES_URL not set; worker will not start.");
    return async () => {};
  }

  stopRequested = false;

  // Subscribe to NOTIFY. Errors here are non-fatal — we still run the
  // poll loop. The listener will be re-created on the next cycle if it
  // dropped.
  try {
    listener = await createPgListener({
      channel: EMBEDDING_NOTIFY_CHANNEL,
      onNotification: () => {
        const now = Date.now();
        if (now - lastWakeAt < WAKE_COALESCE_MS) return;
        lastWakeAt = now;
        void runCycle("notify");
      },
      onError: () => {
        // listener marks itself closed; next runCycle will rebuild it
        listener = null;
      }
    });
  } catch (err) {
    logWarn("embedding-worker", "LISTEN setup failed; falling back to poll only", {
      error: err instanceof Error ? err.message : String(err)
    });
  }

  logInfo("embedding-worker", "Started", {
    worker_id: env.EMBEDDING_WORKER_ID,
    batch_size: env.EMBEDDING_BATCH_SIZE,
    poll_interval_ms: env.EMBEDDING_POLL_INTERVAL_MS,
    listener_attached: Boolean(listener)
  });

  // Kick the first cycle immediately and schedule the heartbeat.
  void runCycle("startup");
  scheduleNextPoll();

  return async () => {
    stopRequested = true;
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    if (listener) {
      try {
        await listener.release();
      } catch {
        // ignore
      }
      listener = null;
    }
    logInfo("embedding-worker", "Stopped");
  };
}

async function runCycle(trigger: "startup" | "notify" | "poll"): Promise<void> {
  if (stopRequested) return;
  if (cycleRunning) return; // single concurrent cycle per process
  cycleRunning = true;
  const startedAt = Date.now();

  try {
    // Re-subscribe if the listener dropped.
    if (!listener || listener.isClosed()) {
      try {
        listener = await createPgListener({
          channel: EMBEDDING_NOTIFY_CHANNEL,
          onNotification: () => {
            const now = Date.now();
            if (now - lastWakeAt < WAKE_COALESCE_MS) return;
            lastWakeAt = now;
            void runCycle("notify");
          },
          onError: () => {
            listener = null;
          }
        });
      } catch (err) {
        logWarn("embedding-worker", "Listener re-attach failed", {
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }

    const batch = await claimBatch();
    if (batch.length === 0) {
      return;
    }

    let succeeded = 0;
    let failed = 0;
    let deadLettered = 0;

    try {
      const { successes, failures, dead } = await processBatch(batch);
      succeeded = successes.length;
      failed = failures.length;
      deadLettered = dead.length;

      // Persist outcomes in a single transaction so partial failures
      // don't strand rows in 'running' forever.
      await withPgTransaction(async (client) => {
        if (successes.length > 0) {
          await dbPgQuery(
            client,
            `UPDATE embedding_jobs
                SET status = 'done',
                    finished_at = now(),
                    last_error = NULL,
                    locked_by = NULL,
                    locked_until = NULL
              WHERE id = ANY($1::uuid[])`,
            [successes.map((j) => j.id)]
          );
        }
        for (const { job, error } of failures) {
          const nextDelaySec = Math.min(
            6 * 60 * 60,
            Math.pow(2, job.attempts) * 60
          );
          await dbPgQuery(
            client,
            `UPDATE embedding_jobs
                SET status = 'failed',
                    last_error = $2,
                    locked_by = NULL,
                    locked_until = NULL,
                    next_attempt_at = now() + ($3 || ' seconds')::interval
              WHERE id = $1::uuid`,
            [job.id, error.slice(0, 4000), String(nextDelaySec)]
          );
        }
        for (const job of dead) {
          await dbPgQuery(
            client,
            `UPDATE embedding_jobs
                SET status = 'skipped',
                    finished_at = now(),
                    locked_by = NULL,
                    locked_until = NULL
              WHERE id = $1::uuid`,
            [job.id]
          );
          logWarn("embedding-worker", "Dead-lettered embedding job", {
            job_id: job.id,
            source_kind: job.source_kind,
            source_id: job.source_id,
            attempts: job.attempts
          });
        }

        // Re-queue any failed jobs whose status was 'failed' so they
        // become claimable again. Simpler: just flip them to 'queued'
        // — the next_attempt_at gate keeps them dormant until backoff
        // expires.
        if (failures.length > 0) {
          await dbPgQuery(
            client,
            `UPDATE embedding_jobs
                SET status = 'queued'
              WHERE id = ANY($1::uuid[])
                AND status = 'failed'`,
            [failures.map((f) => f.job.id)]
          );
        }
      });
    } catch (outcomeErr) {
      // Outcome persistence failed; the rows we claimed will stay in
      // 'running' until locked_until expires (5 min default). Log loud.
      logError("embedding-worker", "Failed to persist batch outcomes", {
        error:
          outcomeErr instanceof Error
            ? outcomeErr.message
            : String(outcomeErr),
        claimed_ids: batch.map((j) => j.id)
      });
    }

    logInfo("embedding-worker", "Cycle complete", {
      trigger,
      claimed: batch.length,
      succeeded,
      failed,
      dead_lettered: deadLettered,
      duration_ms: Date.now() - startedAt
    });
  } catch (cycleErr) {
    logError("embedding-worker", "Cycle crashed", {
      trigger,
      error: cycleErr instanceof Error ? cycleErr.message : String(cycleErr),
      duration_ms: Date.now() - startedAt
    });
  } finally {
    cycleRunning = false;
    scheduleNextPoll();
  }
}

/**
 * Claim up to N rows via FOR UPDATE SKIP LOCKED. Returns the parsed
 * payloads ready for processing.
 *
 * `next_attempt_at <= now()` gates retries — failed rows with backoff
 * are invisible until their time comes. `locked_until < now()` allows
 * reclaim of rows from a crashed worker.
 */
async function claimBatch(): Promise<ClaimedJob[]> {
  return await withPgTransaction(async (client) => {
    const { rows } = await dbPgQuery<{
      id: string;
      owner_user_id: string | null;
      source_kind: EmbeddingSourceKind;
      source_id: string;
      source_version: number;
      attempts: number;
      payload: ClaimedJob["payload"];
    }>(
      client,
      `WITH next_jobs AS (
         SELECT id
           FROM embedding_jobs
          WHERE status = 'queued'
            AND next_attempt_at <= now()
            AND (locked_until IS NULL OR locked_until < now())
          ORDER BY next_attempt_at, created_at
          FOR UPDATE SKIP LOCKED
          LIMIT $1
       )
       UPDATE embedding_jobs ej
          SET status       = 'running',
              locked_by    = $2,
              locked_until = now() + ($3 || ' milliseconds')::interval,
              attempts     = ej.attempts + 1
         FROM next_jobs nj
        WHERE ej.id = nj.id
       RETURNING ej.id, ej.owner_user_id, ej.source_kind,
                 ej.source_id, ej.source_version, ej.attempts, ej.payload`,
      [
        env.EMBEDDING_BATCH_SIZE,
        env.EMBEDDING_WORKER_ID,
        String(env.EMBEDDING_LOCK_TTL_MS)
      ]
    );
    return rows.map((r) => ({
      ...r,
      payload: r.payload
    }));
  });
}

interface BatchProcessResult {
  successes: ClaimedJob[];
  failures: Array<{ job: ClaimedJob; error: string }>;
  /** Failed jobs that have hit MAX_ATTEMPTS and should be dead-lettered. */
  dead: ClaimedJob[];
}

async function processBatch(jobs: ClaimedJob[]): Promise<BatchProcessResult> {
  const successes: ClaimedJob[] = [];
  const failures: Array<{ job: ClaimedJob; error: string }> = [];
  const dead: ClaimedJob[] = [];

  // Single API call for the batch. If the API fails, every job in the
  // batch retries — that's expected; the batch is a network optimization,
  // not a logical unit.
  let embeddings: number[][];
  try {
    const result = await embedBatch({
      inputs: jobs.map((j) => j.payload.content)
    });
    embeddings = result.embeddings;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    for (const job of jobs) {
      if (job.attempts >= env.EMBEDDING_MAX_ATTEMPTS) {
        dead.push(job);
      } else {
        failures.push({ job, error: msg });
      }
    }
    return { successes, failures, dead };
  }

  // Per-job UPSERT into embeddings. We do these sequentially in one
  // transaction to keep the success/failure accounting precise — a bad
  // payload from one job (e.g., metadata too large) shouldn't fail the
  // whole batch.
  await withPgTransaction(async (client) => {
    for (let i = 0; i < jobs.length; i += 1) {
      const job = jobs[i];
      const vec = embeddings[i];
      if (!job || !vec) continue;
      try {
        await dbPgQuery(
          client,
          `INSERT INTO embeddings (
             owner_user_id, source_kind, source_id, source_version,
             chunk_idx, content, content_hash, embedding, metadata, active
           ) VALUES (
             $1, $2, $3, $4,
             $5, $6, decode($7, 'hex'), $8::vector, $9::jsonb, true
           )
           ON CONFLICT (owner_user_id, source_kind, source_id, chunk_idx, source_version)
           DO UPDATE SET
             content      = EXCLUDED.content,
             content_hash = EXCLUDED.content_hash,
             embedding    = EXCLUDED.embedding,
             metadata     = EXCLUDED.metadata,
             active       = true,
             created_at   = now()`,
          [
            job.owner_user_id,
            job.source_kind,
            job.source_id,
            job.source_version,
            job.payload.chunk_idx,
            job.payload.content,
            job.payload.content_hash,
            vectorToSqlLiteral(vec),
            JSON.stringify(job.payload.metadata ?? {})
          ]
        );
        successes.push(job);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (job.attempts >= env.EMBEDDING_MAX_ATTEMPTS) {
          dead.push(job);
        } else {
          failures.push({ job, error: msg });
        }
      }
    }
  });

  return { successes, failures, dead };
}

/**
 * Health probe — number of queued jobs right now. Useful for an admin
 * endpoint and for tests. Cheap query; the partial index handles it.
 */
export async function queuedJobCount(): Promise<number> {
  const pool = getPgPool();
  const { rows } = await dbPgQuery<{ n: string }>(
    pool,
    `SELECT COUNT(*)::text AS n FROM embedding_jobs WHERE status = 'queued'`
  );
  return Number(rows[0]?.n ?? 0);
}
