import { env } from "../../config/env";
import { dbPgQuery, getPgPool } from "../../lib/db-pg";
import { logInfo, logWarn } from "../../lib/logger";
import {
  embedAndSearch,
  searchEmbeddings,
  type EmbeddingHit,
  type SearchEmbeddingsInput
} from "./embedding-store";
import { embedBatch } from "./embedding-client";
import {
  buildPatternCardsPromptBlock,
  selectPatternCards,
  type PatternCard,
  type PatternCardScore,
  type PatternOutputKind
} from "./pattern-cards";

/**
 * Hybrid retrieval orchestrator.
 *
 * Combines:
 *   - pgvector ANN similarity (semantic recall)
 *   - pg_trgm keyword score (precision anchor)
 *   - recency (episodic freshness)
 *   - success-rate (procedural confidence — pattern_cards.success_rate)
 *   - tenant continuity (boost for this-tenant hits, redundant with
 *     SQL gating but reserved for cross-tenant kinds in Phase 3)
 *
 * Ranking formula (Architecture v2 §6, slightly refined):
 *   score = 0.45 * vector_similarity
 *         + 0.25 * keyword_score
 *         + 0.15 * exp(-age_days / 14)
 *         + 0.10 * source_quality
 *         + 0.05 * tenant_continuity
 *
 * The SQL in embedding-store.ts computes the first three terms inline.
 * This orchestrator joins the procedural `source_quality` (success_rate
 * from pattern_cards) and applies the tenant_continuity boost.
 *
 * Graceful degradation
 * --------------------
 * Any error from Postgres / embedding API falls back to the deterministic
 * Phase 1 selector (`selectPatternCards`) — workflow generation NEVER
 * fails because retrieval is down.
 */

export interface HybridRetrievalInput {
  /** REQUIRED tenant id. */
  ownerUserId: string;
  /** Query text — used for embedding + keyword scoring. */
  queryText: string;
  /** Pattern-card output kind being authored (drives source-quality join). */
  outputKind: PatternOutputKind;
  /** Top-K to return. */
  topK?: number;
  /** Source kinds to include. Defaults to pattern_card + breadcrumb. */
  sourceKinds?: SearchEmbeddingsInput["sourceKinds"];
  /** Optional metadata containment filter. */
  metadataContains?: Record<string, unknown>;
}

export interface HybridRetrievalResult {
  /** Hits with the combined score applied. */
  hits: Array<EmbeddingHit & { source_quality: number; final_score: number }>;
  /** Pattern cards picked from the hits, keyed back to the PatternCard. */
  pattern_card_scores: PatternCardScore[];
  /** True when we fell back to keyword-only path. */
  used_fallback: boolean;
}

/**
 * Run hybrid retrieval. The orchestrator is the SINGLE entry point for
 * memory queries used during prompt assembly. Workflow generator, failure
 * analyzer, and future COO loop all call this.
 */
export async function runHybridRetrieval(
  input: HybridRetrievalInput
): Promise<HybridRetrievalResult> {
  if (!input.ownerUserId) {
    throw new Error("runHybridRetrieval: ownerUserId required");
  }

  // Fast-fail to keyword path when feature is off or Postgres isn't
  // configured. Same signature as the success path so the caller doesn't
  // branch.
  if (!env.HYBRID_RETRIEVAL_ENABLED || !env.POSTGRES_URL) {
    return fallbackToKeyword(input, "feature_disabled");
  }

  const sourceKinds = input.sourceKinds ?? ["pattern_card", "breadcrumb"];
  const topK = input.topK ?? env.HYBRID_RETRIEVAL_TOPK;

  let hits: EmbeddingHit[];
  try {
    hits = await embedAndSearch({
      ownerUserIds: [input.ownerUserId],
      queryText: input.queryText,
      sourceKinds,
      topK: topK * 2, // overpull; we apply source_quality reranking next
      metadataContains: input.metadataContains
    });
  } catch (err) {
    logWarn("hybrid-retrieval", "embedAndSearch failed; falling back to keyword", {
      error: err instanceof Error ? err.message : String(err)
    });
    return fallbackToKeyword(input, "embed_or_search_error");
  }

  if (hits.length === 0) {
    logInfo("hybrid-retrieval", "Zero hits; falling back to keyword for cards", {
      query_chars: input.queryText.length
    });
    return fallbackToKeyword(input, "zero_hits");
  }

  // Look up source_quality for any pattern_card hits in one query.
  const cardIds = hits
    .filter((h) => h.source_kind === "pattern_card")
    .map((h) => ({ id: h.source_id, version: h.source_version }));
  const qualityMap = await fetchPatternCardQuality(cardIds);

  // Apply the source_quality + tenant_continuity terms.
  const enriched = hits.map((h) => {
    const sourceQuality = computeSourceQuality(h, qualityMap);
    const tenantContinuity = h.owner_user_id === input.ownerUserId ? 1.0 : 0.0;
    const finalScore =
      h.score + // already includes vector + keyword + recency from SQL
      0.10 * sourceQuality +
      0.05 * tenantContinuity;
    return {
      ...h,
      source_quality: sourceQuality,
      final_score: finalScore
    };
  });

  enriched.sort((a, b) => b.final_score - a.final_score);
  const top = enriched.slice(0, topK);

  // Reconstruct PatternCardScore objects for the caller's prompt builder.
  const cardScores: PatternCardScore[] = top
    .filter((h) => h.source_kind === "pattern_card")
    .map((h) => ({
      card: hitToPatternCard(h),
      score: h.final_score,
      matched_triggers: []
    }));

  return {
    hits: top,
    pattern_card_scores: cardScores,
    used_fallback: false
  };
}

/**
 * Convenience: assemble the system-prompt block from a retrieval result.
 * Mirrors `buildPatternCardsPromptBlock` so the workflow-gen prompt
 * builder can use either source interchangeably.
 */
export function buildHybridPromptBlock(result: HybridRetrievalResult): string {
  if (result.pattern_card_scores.length === 0) return "";
  return buildPatternCardsPromptBlock(result.pattern_card_scores);
}

// ---------------------------------------------------------------------------
// internals
// ---------------------------------------------------------------------------

interface CardQuality {
  success_rate: number | null;
  archived: boolean;
}

async function fetchPatternCardQuality(
  cards: Array<{ id: string; version: number }>
): Promise<Map<string, CardQuality>> {
  const map = new Map<string, CardQuality>();
  if (cards.length === 0) return map;

  try {
    const pool = getPgPool();
    // SQL pair-array join: pass two parallel arrays for id and version.
    const ids = cards.map((c) => c.id);
    const versions = cards.map((c) => c.version);
    const { rows } = await dbPgQuery<{
      id: string;
      version: number;
      success_rate: string | null; // numeric -> string in pg by default
      archived_at: Date | null;
    }>(
      pool,
      `SELECT pc.id, pc.version, pc.success_rate, pc.archived_at
         FROM pattern_cards pc
         JOIN unnest($1::text[], $2::int[]) AS req(id, version)
           ON pc.id = req.id AND pc.version = req.version`,
      [ids, versions]
    );
    for (const r of rows) {
      const sr =
        r.success_rate === null || r.success_rate === undefined
          ? null
          : Number(r.success_rate);
      map.set(`${r.id}@${r.version}`, {
        success_rate: Number.isFinite(sr as number) ? (sr as number) : null,
        archived: r.archived_at !== null
      });
    }
  } catch (err) {
    logWarn("hybrid-retrieval", "Quality lookup failed; using neutral defaults", {
      error: err instanceof Error ? err.message : String(err)
    });
  }
  return map;
}

function computeSourceQuality(
  hit: EmbeddingHit,
  qualityMap: Map<string, CardQuality>
): number {
  switch (hit.source_kind) {
    case "pattern_card": {
      const q = qualityMap.get(`${hit.source_id}@${hit.source_version}`);
      if (!q) return 0.5; // unknown -> neutral
      if (q.archived) return 0.0; // archived cards rank to the floor
      return q.success_rate ?? 0.5;
    }
    case "breadcrumb":
    case "ai_interaction": {
      // metadata.outcome is set by the producer when known.
      const outcome = (hit.metadata?.outcome ?? "") as string;
      if (outcome === "deployed" || outcome === "validated") return 1.0;
      return 0.3;
    }
    case "failure_cluster": {
      // metadata.hit_count is stamped by the failure pipeline (later phase);
      // until then, neutral default.
      const hitCount = Number(hit.metadata?.hit_count ?? 0);
      return Math.min(hitCount / 50.0, 1.0);
    }
    default:
      return 0.5;
  }
}

function hitToPatternCard(hit: EmbeddingHit): PatternCard {
  const m = hit.metadata ?? {};
  return {
    id: hit.source_id,
    version: hit.source_version,
    intent: (m.intent as string) ?? null,
    triggers: Array.isArray(m.triggers) ? (m.triggers as string[]) : [],
    tools: Array.isArray(m.tools) ? (m.tools as string[]) : [],
    output_kind: ((m.output_kind as string) ?? "workflow_json") as PatternOutputKind,
    body: hit.content,
    source_path: (m.source_path as string) ?? ""
  };
}

function fallbackToKeyword(
  input: HybridRetrievalInput,
  reason: string
): HybridRetrievalResult {
  // The Phase 1 deterministic selector is the safety net. It reads
  // markdown frontmatter and ranks by intent/trigger overlap — no DB.
  const cards = selectPatternCards({
    prompt: input.queryText,
    outputKind: input.outputKind,
    topN: input.topK ?? env.HYBRID_RETRIEVAL_TOPK
  });
  logInfo("hybrid-retrieval", "Keyword fallback used", {
    reason,
    cards_returned: cards.length
  });
  return {
    hits: [],
    pattern_card_scores: cards,
    used_fallback: true
  };
}

/**
 * Embed-only utility — for callers (failure clusters, weekly summarizer)
 * that need a query vector without running search. Wraps embedBatch for
 * the single-input case and returns the vector.
 */
export async function embedQuery(text: string): Promise<number[] | null> {
  try {
    const { embeddings } = await embedBatch({ inputs: [text] });
    return embeddings[0] ?? null;
  } catch (err) {
    logWarn("hybrid-retrieval", "embedQuery failed", {
      error: err instanceof Error ? err.message : String(err)
    });
    return null;
  }
}
