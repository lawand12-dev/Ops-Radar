import { env } from "../../config/env";
import { dbPgQuery, getPgPool } from "../../lib/db-pg";
import { vectorToSqlLiteral } from "./embedding-client";
import type { EmbeddingSourceKind } from "./embedding-jobs";

/**
 * Embedding store — the SQL surface for vector + hybrid retrieval.
 *
 * Tenant isolation invariant
 * --------------------------
 * `ownerUserIds` is REQUIRED and non-empty on every public function. The
 * predicate `owner_user_id = ANY($N)` is bolted onto every retrieval SQL
 * at the database layer, NOT applied as a post-filter. There is no
 * "admin mode" overload — callers that genuinely need cross-tenant reads
 * (none today) must add a dedicated function with auth gating.
 *
 * Cross-tenant kinds (e.g. failure_cluster embeddings keyed to a global
 * cluster, not a tenant) are searched via `searchGlobalEmbeddings` which
 * is explicitly named to signal the bypass.
 */

export interface EmbeddingHit {
  id: string;
  owner_user_id: string | null;
  source_kind: EmbeddingSourceKind;
  source_id: string;
  source_version: number;
  chunk_idx: number;
  content: string;
  metadata: Record<string, unknown>;
  /** Cosine similarity in [0, 1] (1 = identical). */
  vector_similarity: number;
  /** Trigram-derived keyword score in [0, 1]. */
  keyword_score: number;
  /** Age in days at query time. */
  age_days: number;
  /** Hybrid score (see hybrid-retrieval.ts for the formula). */
  score: number;
  created_at: Date;
}

export interface SearchEmbeddingsInput {
  /** REQUIRED: tenant ids to scope to. Cannot be empty. */
  ownerUserIds: string[];
  /** Query text (for the keyword half of hybrid). */
  queryText: string;
  /** Query embedding (must match AI_MODEL_EMBED_DIM). */
  queryEmbedding: number[];
  /** Source kinds to consider. Defaults to all. */
  sourceKinds?: EmbeddingSourceKind[];
  /** Candidate pool size before final ranking. */
  vectorPool?: number;
  /** Final result count. */
  topK?: number;
  /** Optional metadata filter — applied as `metadata @> $jsonb`. */
  metadataContains?: Record<string, unknown>;
  /** Optional age cap (rows older than this are excluded). */
  maxAgeDays?: number;
}

const ALL_KINDS: EmbeddingSourceKind[] = [
  "pattern_card",
  "breadcrumb",
  "ai_interaction",
  "failure_cluster",
  "weekly_summary",
  "workflow_topology"
];

export async function searchEmbeddings(
  input: SearchEmbeddingsInput
): Promise<EmbeddingHit[]> {
  if (!Array.isArray(input.ownerUserIds) || input.ownerUserIds.length === 0) {
    throw new Error(
      "searchEmbeddings: ownerUserIds is required and must be non-empty (tenant isolation)"
    );
  }
  if (!Array.isArray(input.queryEmbedding) || input.queryEmbedding.length === 0) {
    throw new Error("searchEmbeddings: queryEmbedding is required");
  }
  if (input.queryEmbedding.length !== env.AI_MODEL_EMBED_DIM) {
    throw new Error(
      `searchEmbeddings: queryEmbedding has ${input.queryEmbedding.length} dims, expected ${env.AI_MODEL_EMBED_DIM}`
    );
  }

  const pool = getPgPool();
  const kinds = input.sourceKinds && input.sourceKinds.length > 0
    ? input.sourceKinds
    : ALL_KINDS;
  const vectorPool = Math.max(1, input.vectorPool ?? env.HYBRID_RETRIEVAL_VECTOR_POOL);
  const topK = Math.max(1, input.topK ?? env.HYBRID_RETRIEVAL_TOPK);
  const queryVec = vectorToSqlLiteral(input.queryEmbedding);

  // Per-transaction ef_search tunes HNSW recall. SET LOCAL is the right
  // tool here; it auto-resets at COMMIT/ROLLBACK and doesn't leak to other
  // connections in the pool.
  //
  // The CTE structure:
  //   1) `semantic` — vector top-N from HNSW. Hard tenant gate + kind +
  //      active filter pushed inside the LIMIT to keep the ANN candidate
  //      set focused on what the caller can see.
  //   2) `hybrid` — adds keyword score (trigram similarity), age, and
  //      the final weighted score per the ranking formula.
  //   3) outer select returns topK by score.
  //
  // The trigram similarity function (`similarity()` from pg_trgm) yields
  // a value in [0,1]; tanh(2x) shape would compress further but at our
  // scale the raw value is fine and faster.

  const sql = `
    SET LOCAL hnsw.ef_search = ${env.HYBRID_RETRIEVAL_EF_SEARCH};
    WITH semantic AS (
      SELECT id, owner_user_id, source_kind, source_id, source_version,
             chunk_idx, content, metadata, created_at,
             (1 - (embedding <=> $1::vector)) AS vsim
        FROM embeddings
       WHERE active
         AND owner_user_id = ANY($2::uuid[])
         AND source_kind = ANY($3::text[])
         ${input.metadataContains ? "AND metadata @> $7::jsonb" : ""}
         ${input.maxAgeDays !== undefined ? `AND created_at >= now() - interval '${Number(input.maxAgeDays)} days'` : ""}
       ORDER BY embedding <=> $1::vector
       LIMIT $4
    ),
    hybrid AS (
      SELECT s.*,
             COALESCE(similarity(s.content, $5), 0)::float8 AS ksim,
             GREATEST(EXTRACT(EPOCH FROM (now() - s.created_at)) / 86400.0, 0)::float8 AS age_days
        FROM semantic s
    )
    SELECT id, owner_user_id, source_kind, source_id, source_version,
           chunk_idx, content, metadata, created_at,
           vsim::float8         AS vector_similarity,
           ksim::float8         AS keyword_score,
           age_days::float8     AS age_days,
           (0.45 * vsim
          + 0.25 * ksim
          + 0.15 * exp(-age_days / 14.0)
           )::float8            AS score
      FROM hybrid
     ORDER BY score DESC
     LIMIT $6
  `;

  const params: unknown[] = [
    queryVec,
    input.ownerUserIds,
    kinds,
    vectorPool,
    input.queryText,
    topK
  ];
  if (input.metadataContains) {
    params.push(JSON.stringify(input.metadataContains));
  }

  // SET LOCAL only takes effect inside a transaction, so we wrap the
  // query in a single BEGIN/COMMIT explicitly. The pool's auto-commit
  // mode would otherwise discard the SET.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{
      id: string;
      owner_user_id: string | null;
      source_kind: EmbeddingSourceKind;
      source_id: string;
      source_version: number;
      chunk_idx: number;
      content: string;
      metadata: Record<string, unknown> | null;
      created_at: Date;
      vector_similarity: number;
      keyword_score: number;
      age_days: number;
      score: number;
    }>(sql, params);
    await client.query("COMMIT");

    return rows.map((r) => ({
      id: r.id,
      owner_user_id: r.owner_user_id,
      source_kind: r.source_kind,
      source_id: r.source_id,
      source_version: r.source_version,
      chunk_idx: r.chunk_idx,
      content: r.content,
      metadata: r.metadata ?? {},
      vector_similarity: r.vector_similarity,
      keyword_score: r.keyword_score,
      age_days: r.age_days,
      score: r.score,
      created_at: r.created_at
    }));
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Cross-tenant search for genuinely-global kinds (today: failure_cluster).
 * Explicitly named to flag the bypass during code review.
 *
 * Tenant boundary is preserved at the application layer: callers must
 * confirm the user is allowed to read cross-tenant data (e.g. the user
 * has `share_failure_intelligence = true` and the result is for their
 * own workflow's failure).
 */
export async function searchGlobalEmbeddings(input: {
  queryText: string;
  queryEmbedding: number[];
  sourceKinds: EmbeddingSourceKind[];
  vectorPool?: number;
  topK?: number;
}): Promise<EmbeddingHit[]> {
  if (input.queryEmbedding.length !== env.AI_MODEL_EMBED_DIM) {
    throw new Error("searchGlobalEmbeddings: dim mismatch");
  }
  const pool = getPgPool();
  const queryVec = vectorToSqlLiteral(input.queryEmbedding);
  const vectorPool = Math.max(1, input.vectorPool ?? env.HYBRID_RETRIEVAL_VECTOR_POOL);
  const topK = Math.max(1, input.topK ?? env.HYBRID_RETRIEVAL_TOPK);

  const sql = `
    SET LOCAL hnsw.ef_search = ${env.HYBRID_RETRIEVAL_EF_SEARCH};
    WITH semantic AS (
      SELECT id, owner_user_id, source_kind, source_id, source_version,
             chunk_idx, content, metadata, created_at,
             (1 - (embedding <=> $1::vector)) AS vsim
        FROM embeddings
       WHERE active
         AND source_kind = ANY($2::text[])
       ORDER BY embedding <=> $1::vector
       LIMIT $3
    )
    SELECT id, owner_user_id, source_kind, source_id, source_version,
           chunk_idx, content, metadata, created_at,
           vsim::float8 AS vector_similarity,
           COALESCE(similarity(content, $4), 0)::float8 AS keyword_score,
           GREATEST(EXTRACT(EPOCH FROM (now() - created_at)) / 86400.0, 0)::float8 AS age_days,
           (0.6 * vsim + 0.4 * COALESCE(similarity(content, $4), 0))::float8 AS score
      FROM semantic
     ORDER BY score DESC
     LIMIT $5
  `;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{
      id: string;
      owner_user_id: string | null;
      source_kind: EmbeddingSourceKind;
      source_id: string;
      source_version: number;
      chunk_idx: number;
      content: string;
      metadata: Record<string, unknown> | null;
      created_at: Date;
      vector_similarity: number;
      keyword_score: number;
      age_days: number;
      score: number;
    }>(sql, [queryVec, input.sourceKinds, vectorPool, input.queryText, topK]);
    await client.query("COMMIT");
    return rows.map((r) => ({
      id: r.id,
      owner_user_id: r.owner_user_id,
      source_kind: r.source_kind,
      source_id: r.source_id,
      source_version: r.source_version,
      chunk_idx: r.chunk_idx,
      content: r.content,
      metadata: r.metadata ?? {},
      vector_similarity: r.vector_similarity,
      keyword_score: r.keyword_score,
      age_days: r.age_days,
      score: r.score,
      created_at: r.created_at
    }));
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Embed a query string on demand and run the search in one call. The
 * orchestrator (hybrid-retrieval.ts) uses this to avoid plumbing the
 * embedding step through every caller.
 */
import { embedBatch } from "./embedding-client";

export async function embedAndSearch(
  input: Omit<SearchEmbeddingsInput, "queryEmbedding">
): Promise<EmbeddingHit[]> {
  const { embeddings } = await embedBatch({ inputs: [input.queryText] });
  const vec = embeddings[0];
  if (!vec) return [];
  return searchEmbeddings({ ...input, queryEmbedding: vec });
}
