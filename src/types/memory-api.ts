/**
 * Shared DTOs for the memory-layer API surface (Phase A).
 *
 * Contract discipline
 * -------------------
 *   - snake_case throughout (matches existing route conventions and the
 *     vanilla JS frontend in public/).
 *   - All timestamps are ISO 8601 strings. The backend converts from Date
 *     before serializing; the frontend never sees a Date object.
 *   - No optional fields go undefined — they're explicitly null. Easier
 *     for the frontend to render with a single null-check.
 *   - Excerpts are pre-truncated by the backend. The frontend never trims.
 *   - Cursors are opaque base64 strings. Frontend MUST NOT decode them;
 *     the backend reserves the right to change the cursor shape.
 *
 * Tenant isolation guarantees
 * ---------------------------
 *   - Every user-facing endpoint resolves ownerUserId from the auth
 *     context. There is no userId field in any request DTO below — the
 *     backend ignores client-supplied tenant ids by construction.
 *   - Admin endpoints aggregate cross-tenant but never surface raw
 *     tenant identifiers. Where per-tenant attribution is needed (e.g.
 *     future failure-cluster drill-in), it ships as a stable salted hash,
 *     never as the raw uuid.
 */

export type OutputKind = "workflow_json" | "coo_playbook" | "failure_playbook";

export type AIOutcome =
  | "pending"
  | "validated"
  | "rejected"
  | "deployed"
  | "failed_in_n8n"
  | "superseded"
  | "unknown";

// ============================================================
// USER-FACING
// ============================================================

/** POST /memory/context — body */
export interface MemoryContextRequest {
  prompt: string;
  /** Defaults to "workflow_json" when omitted. */
  output_kind?: OutputKind;
}

export interface PatternCardPreview {
  id: string;                 // e.g. "workflow-slack-digest"
  version: number;
  citation: string;           // "workflow-slack-digest@v1" — matches matched_pattern_ids
  intent: string | null;
  triggers: string[];
  tools: string[];
  /** Final hybrid score (vector + keyword + recency + source_quality). [0, ~1.5]. */
  score: number;
  /** Trigger tokens that matched the prompt — drives "why selected" tooltips. */
  matched_triggers: string[];
  /** First ~400 chars of the card body for side-panel display. */
  body_excerpt: string;
}

export interface BreadcrumbPreview {
  at: string;                 // ISO 8601
  kind: string;               // "ai_interaction" | "event:run_failed" | "anomaly:..."
  summary: string | null;
  outcome: string | null;
}

export interface MemoryContextResponse {
  pattern_cards: PatternCardPreview[];
  breadcrumbs: BreadcrumbPreview[];
  /** True if the retrieval engine fell back to keyword/Phase-1 path. */
  used_fallback: boolean;
  /** Milliseconds the assembly took (excluding network). Surfaced for tooltips. */
  latency_ms: number;
}

/** GET /memory/breadcrumbs */
export interface BreadcrumbPageResponse {
  items: BreadcrumbItem[];
  /** Opaque base64 cursor; pass back as ?cursor=. null when no more pages. */
  next_cursor: string | null;
  totals: {
    window_hours: number;
    by_kind: Record<string, number>;
  };
}

export interface BreadcrumbItem {
  at: string;
  kind: string;
  ref_id: string;
  project_id: string | null;
  workflow_id: string | null;
  summary: string | null;
  outcome: string | null;
  data: Record<string, unknown> | null;
}

/** GET /memory/ai-interactions */
export interface InteractionPageResponse {
  items: InteractionItem[];
  next_cursor: string | null;
}

export interface InteractionItem {
  /** Stringified BIGINT — the underlying column is BIGINT UNSIGNED. */
  id: string;
  created_at: string;
  project_id: string | null;
  workflow_id: string | null;
  provider: string;
  model: string;
  outcome: AIOutcome;
  outcome_settled_at: string | null;
  tokens_used: number | null;
  latency_ms: number | null;
  matched_pattern_ids: string[];
  /** First 240 chars only. Full prompt available via admin endpoint. */
  prompt_excerpt: string;
}

/** GET /memory/workflows/:id/grounding */
export interface WorkflowGroundingResponse {
  workflow_id: string;
  /** null when no ai_interaction was linked (manual workflow, legacy row). */
  interaction_id: string | null;
  matched_pattern_ids: string[];
  /** Cards resolved from matched_pattern_ids — may be a subset if a card
   *  was archived after the workflow was generated. */
  matched_cards: PatternCardPreview[];
  breadcrumbs_at_generation: BreadcrumbPreview[];
  outcome: AIOutcome;
  outcome_settled_at: string | null;
}

// ============================================================
// ADMIN-FACING
// ============================================================

/** GET /admin/memory/health */
export interface MemoryHealthResponse {
  worker: {
    enabled: boolean;
    scheduled: boolean;
    running: boolean;
    last_cycle: {
      finished_at: string;
      claimed: number;
      succeeded: number;
      failed: number;
      dead_lettered: number;
      duration_ms: number;
    } | null;
  };
  reconciler: {
    enabled: boolean;
    scheduled: boolean;
    running: boolean;
  };
  queue: {
    queued: number;
    running: number;
    failed: number;
    skipped: number;            // dead-lettered
    oldest_queued_age_seconds: number | null;
  };
  embeddings_by_kind: Array<{
    source_kind: string;
    count: number;
    latest_at: string | null;
  }>;
  /** True when the Postgres sidecar responded on this request. */
  pg_reachable: boolean;
}

/** GET /admin/memory/pattern-cards */
export interface PatternCardTelemetryResponse {
  items: PatternCardTelemetryItem[];
  /** False until the outcome-telemetry-sync job (Phase 2 Week 2+) has
   *  run at least once. UI should show "Awaiting first sync" instead
   *  of confusing zero-success-rate rows. */
  telemetry_populated: boolean;
}

export interface PatternCardTelemetryItem {
  id: string;
  version: number;
  output_kind: OutputKind;
  intent: string | null;
  triggers: string[];
  archived: boolean;
  archived_at: string | null;
  matches_30d: number;
  deployed_30d: number;
  rejected_30d: number;
  /** null when matches_30d = 0. Range [0, 1]. */
  success_rate: number | null;
  last_synced_at: string;
  /** True when an active embeddings row exists for this card+version. */
  embedded: boolean;
}

/** GET /admin/memory/failure-clusters */
export interface FailureClustersResponse {
  items: FailureClusterRow[];
  /** False until the failure-cluster producer (Phase 2 Week 2) ships.
   *  When false, items=[] and the UI should show "Cluster ingestion
   *  not enabled". The endpoint still 200s — no special status. */
  producer_live: boolean;
}

export interface FailureClusterRow {
  id: string;                          // uuid
  /** Already normalized — UUIDs/URLs/numerics stripped by fingerprintErrorMessage. */
  fingerprint: string;
  exemplar_text: string;
  first_seen: string;
  last_seen: string;
  hit_count: number;
  /** Distinct owner_user_ids affected. Raw ids are NEVER returned by this endpoint. */
  tenant_count: number;
  /** Remedies ranked by attempts; redacted of any tenant identifier. */
  known_remedies: Array<{
    remedy: string;
    attempted: number;
    succeeded: number;
    last_used: string | null;
  }>;
}
