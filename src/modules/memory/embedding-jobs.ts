import { createHash } from "node:crypto";
import { dbPgQuery, getPgPool, pgNotify, type PgRunner } from "../../lib/db-pg";
import { logWarn } from "../../lib/logger";

/**
 * Embedding-jobs producer.
 *
 * Producers (chat post-commit, pattern-card-sync, breadcrumb-compactor,
 * failure-cluster handler) call `enqueueEmbeddingJob` and forget. The
 * worker picks the row up via FOR UPDATE SKIP LOCKED.
 *
 * Idempotency
 * -----------
 * The producer-side unique index is:
 *   (source_kind, source_id, source_version) WHERE status IN ('queued','running')
 * If a job for the same triple is already pending, we UPDATE its payload
 * instead of inserting. If a previous attempt completed, a new INSERT is
 * allowed — the worker will UPSERT the embedding row keyed by
 * (owner_user_id, source_kind, source_id, chunk_idx, source_version).
 *
 * NOTIFY
 * ------
 * After commit we fire `NOTIFY embedding_jobs`. Workers listen on this
 * channel and react in <100ms; a 5s heartbeat poll covers the case where
 * the LISTEN connection was lost.
 */

export type EmbeddingSourceKind =
  | "pattern_card"
  | "breadcrumb"
  | "ai_interaction"
  | "failure_cluster"
  | "weekly_summary"
  | "workflow_topology";

export const EMBEDDING_NOTIFY_CHANNEL = "embedding_jobs";

export interface EnqueueEmbeddingJobInput {
  /**
   * Owning tenant. NULL is only valid for genuinely cross-tenant kinds
   * (pattern_card today; failure_cluster's embedding is keyed to the
   * cluster id, not a tenant). All breadcrumb/ai_interaction/weekly
   * jobs MUST carry an owner.
   */
  ownerUserId: string | null;
  sourceKind: EmbeddingSourceKind;
  sourceId: string;
  sourceVersion?: number;
  /**
   * The raw text the worker will send to the embedding API. Worker stores
   * this on the embeddings row too (content column) so retrieval can
   * cite the original snippet without a separate join.
   */
  content: string;
  /**
   * Optional metadata to land on `embeddings.metadata`. Worker copies it
   * through; ranking layers may filter on it (e.g. `metadata->>'intent'`).
   */
  metadata?: Record<string, unknown>;
  /**
   * Number of chunks the source produced. Worker reads payload.chunk_idx
   * and writes the embedding row at that chunk. Default 0 = single chunk.
   */
  chunkIdx?: number;
}

function assertTenantInvariant(input: EnqueueEmbeddingJobInput): void {
  const tenantRequired: EmbeddingSourceKind[] = [
    "breadcrumb",
    "ai_interaction",
    "weekly_summary",
    "workflow_topology"
  ];
  if (tenantRequired.includes(input.sourceKind) && !input.ownerUserId) {
    throw new Error(
      `enqueueEmbeddingJob: ownerUserId required for source_kind=${input.sourceKind} ` +
        "(tenant isolation invariant)"
    );
  }
}

/**
 * Computes a stable hash over the payload's semantic content. Worker uses
 * this to short-circuit re-embedding when the underlying text didn't
 * change (the producer bumped source_version for some other reason).
 */
export function hashContent(content: string): Buffer {
  return createHash("sha256").update(content, "utf8").digest();
}

export async function enqueueEmbeddingJob(
  input: EnqueueEmbeddingJobInput,
  runner?: PgRunner
): Promise<{ id: string; status: "queued" | "merged" }> {
  assertTenantInvariant(input);

  const version = input.sourceVersion ?? 1;
  const chunkIdx = input.chunkIdx ?? 0;
  const effective = runner ?? getPgPool();

  // The payload column carries everything the worker needs to do its
  // work without re-reading the source store. content_hash goes on the
  // payload so the worker can detect "same text at higher version" and
  // skip the API call.
  const payload = {
    content: input.content,
    content_hash: hashContent(input.content).toString("hex"),
    chunk_idx: chunkIdx,
    metadata: input.metadata ?? {}
  };

  // Two-step: try INSERT, on partial-unique-conflict do UPDATE the payload
  // of the pending row. Postgres allows ON CONFLICT (cols) WHERE predicate
  // matching a partial unique index — but the syntax is "ON CONFLICT
  // (source_kind, source_id, source_version) WHERE status IN (...)".
  const { rows } = await dbPgQuery<{ id: string; status: string }>(
    effective,
    `INSERT INTO embedding_jobs
       (owner_user_id, source_kind, source_id, source_version, payload, status, next_attempt_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, 'queued', now())
     ON CONFLICT (source_kind, source_id, source_version)
       WHERE status IN ('queued','running')
     DO UPDATE SET
       payload         = EXCLUDED.payload,
       owner_user_id   = EXCLUDED.owner_user_id,
       next_attempt_at = LEAST(embedding_jobs.next_attempt_at, now())
     RETURNING id, status`,
    [
      input.ownerUserId,
      input.sourceKind,
      input.sourceId,
      version,
      JSON.stringify(payload)
    ]
  );

  const row = rows[0];
  if (!row) {
    // Should not happen — RETURNING always yields a row for ON CONFLICT
    // DO UPDATE. Defensive log if the contract changes upstream.
    logWarn("embedding-jobs", "Enqueue produced no row (unexpected)", {
      source_kind: input.sourceKind,
      source_id: input.sourceId
    });
    return { id: "", status: "merged" };
  }

  // Fire-and-forget NOTIFY. We do it AFTER the INSERT/UPDATE commit
  // boundary by default: if the caller passed a runner that's inside a
  // transaction, the NOTIFY is held by Postgres until COMMIT — which is
  // exactly the right behavior. If the caller passed the pool, the
  // INSERT auto-committed and NOTIFY fires immediately.
  try {
    await pgNotify(EMBEDDING_NOTIFY_CHANNEL, undefined, effective);
  } catch (err) {
    // Don't fail the producer because notification failed. The worker's
    // poll-loop heartbeat picks the job up on its next tick.
    logWarn("embedding-jobs", "NOTIFY failed (worker will poll)", {
      error: err instanceof Error ? err.message : String(err)
    });
  }

  return {
    id: row.id,
    status: row.status === "queued" ? "queued" : "merged"
  };
}
