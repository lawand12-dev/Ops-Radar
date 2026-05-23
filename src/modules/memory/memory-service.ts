import { env } from "../../config/env";
import { logWarn } from "../../lib/logger";
import {
  selectInteractionsForUser,
  type InteractionListRow
} from "../ai/ai-interaction-repository";
import type {
  BreadcrumbItem,
  BreadcrumbPageResponse,
  BreadcrumbPreview,
  InteractionItem,
  InteractionPageResponse,
  MemoryContextResponse,
  OutputKind,
  PatternCardPreview,
  AIOutcome
} from "../../types/memory-api";
import { recentBreadcrumbs, type Breadcrumb } from "./breadcrumbs";
import { runHybridRetrieval } from "./hybrid-retrieval";
import { patternCardCitation } from "./pattern-cards";

/**
 * Memory service — the thin orchestrator between the user-facing memory
 * routes and the underlying retrieval modules.
 *
 * Discipline
 * ----------
 *  - Every public function takes `userId` as its first argument.
 *  - Tenant isolation is enforced at the call site by passing userId
 *    through to the underlying retrieval functions (recentBreadcrumbs,
 *    runHybridRetrieval, selectInteractionsForUser — all of which
 *    THROW if userId is missing).
 *  - Errors here never propagate raw — they convert to graceful empty
 *    responses with `used_fallback: true` so the frontend can render a
 *    degraded but functional state instead of an error toast.
 */

const PROMPT_MAX_CHARS = 4000;
const BREADCRUMB_BODY_EXCERPT_CHARS = 400;

/**
 * Build a grounding preview for a prompt. Mirrors what the workflow
 * generator will assemble at chat time — pattern cards + recent
 * breadcrumbs — so the UI can show "here's what the AI will know"
 * before the user hits Send.
 *
 * Never throws on a memory-layer outage. Returns `used_fallback: true`
 * with empty arrays so the widget can degrade gracefully.
 */
export async function previewMemoryContext(
  userId: string,
  input: { prompt: string; outputKind?: OutputKind }
): Promise<MemoryContextResponse> {
  if (!userId) {
    throw new Error("previewMemoryContext: userId is required");
  }

  const prompt = input.prompt.trim();
  if (prompt.length === 0 || prompt.length > PROMPT_MAX_CHARS) {
    return {
      pattern_cards: [],
      breadcrumbs: [],
      used_fallback: false,
      latency_ms: 0
    };
  }

  const startedAt = Date.now();

  // Pattern cards (via the hybrid retrieval orchestrator, which itself
  // falls back to keyword on Postgres outage). The orchestrator returns
  // used_fallback=true when degraded; we surface that to the UI.
  const outputKind: OutputKind = input.outputKind ?? "workflow_json";
  let patternCards: PatternCardPreview[] = [];
  let usedFallback = false;
  try {
    const hybrid = await runHybridRetrieval({
      ownerUserId: userId,
      queryText: prompt,
      outputKind
    });
    usedFallback = hybrid.used_fallback;
    patternCards = hybrid.pattern_card_scores.map((s) => ({
      id: s.card.id,
      version: s.card.version,
      citation: patternCardCitation(s.card),
      intent: s.card.intent,
      triggers: s.card.triggers,
      tools: s.card.tools,
      score: roundTo(s.score, 4),
      matched_triggers: s.matched_triggers,
      body_excerpt:
        s.card.body.length > BREADCRUMB_BODY_EXCERPT_CHARS
          ? `${s.card.body.slice(0, BREADCRUMB_BODY_EXCERPT_CHARS)}...`
          : s.card.body
    }));
  } catch (err) {
    logWarn("memory-service", "pattern card retrieval failed", {
      error: err instanceof Error ? err.message : String(err)
    });
    usedFallback = true;
  }

  // Breadcrumbs — show the same top-N the workflow generator would
  // attach to its prompt (env-driven), so the preview matches reality.
  let breadcrumbPreviews: BreadcrumbPreview[] = [];
  try {
    const rows = await recentBreadcrumbs({
      ownerUserId: userId,
      sinceHours: env.AI_BREADCRUMBS_HOURS,
      limit: env.AI_BREADCRUMBS_LIMIT
    });
    breadcrumbPreviews = rows.map((b) => ({
      at: b.at.toISOString(),
      kind: b.kind,
      summary: b.summary,
      outcome: b.outcome
    }));
  } catch (err) {
    logWarn("memory-service", "breadcrumb retrieval failed", {
      error: err instanceof Error ? err.message : String(err)
    });
    // Soft-degrade: we still return whatever pattern cards came back.
  }

  return {
    pattern_cards: patternCards,
    breadcrumbs: breadcrumbPreviews,
    used_fallback: usedFallback,
    latency_ms: Date.now() - startedAt
  };
}

// ============================================================
// Breadcrumb page (timeline endpoint)
// ============================================================

const BREADCRUMB_PAGE_DEFAULT_LIMIT = 50;
const BREADCRUMB_PAGE_MAX_LIMIT = 200;

export interface BreadcrumbPageOptions {
  sinceHours?: number;
  limit?: number;
  projectId?: string;
  kindPrefixes?: string[];
  /** Opaque base64 cursor (decoded by the route layer). */
  cursor?: { at: Date; ref_id: string } | null;
}

export async function selectBreadcrumbsPage(
  userId: string,
  options: BreadcrumbPageOptions
): Promise<BreadcrumbPageResponse> {
  if (!userId) {
    throw new Error("selectBreadcrumbsPage: userId is required");
  }

  const sinceHours = Math.max(1, Math.floor(options.sinceHours ?? env.AI_BREADCRUMBS_HOURS));
  const limit = Math.min(
    Math.max(1, Math.floor(options.limit ?? BREADCRUMB_PAGE_DEFAULT_LIMIT)),
    BREADCRUMB_PAGE_MAX_LIMIT
  );

  // Overfetch by 1 so we know whether there's a next page without a
  // separate count query.
  const overfetch = limit + 1;

  // recentBreadcrumbs handles the SQL + tenant isolation. We can't push
  // the cursor predicate into it without changing its signature, so we
  // fetch the natural window then post-filter the cursor. Acceptable
  // because window is bounded by sinceHours + limit.
  const rows = await recentBreadcrumbs({
    ownerUserId: userId,
    sinceHours,
    limit: overfetch,
    projectId: options.projectId,
    kindPrefixes: options.kindPrefixes
  });

  const filtered = options.cursor
    ? rows.filter((r) =>
        r.at.getTime() < options.cursor!.at.getTime() ||
        (r.at.getTime() === options.cursor!.at.getTime() &&
          r.ref_id < options.cursor!.ref_id)
      )
    : rows;

  const page = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeBreadcrumbCursor({ at: last.at, ref_id: last.ref_id })
      : null;

  const totals = aggregateByKind(rows.slice(0, limit + 1));

  const items: BreadcrumbItem[] = page.map(toBreadcrumbItem);

  return {
    items,
    next_cursor: nextCursor,
    totals: {
      window_hours: sinceHours,
      by_kind: totals
    }
  };
}

function toBreadcrumbItem(b: Breadcrumb): BreadcrumbItem {
  return {
    at: b.at.toISOString(),
    kind: b.kind,
    ref_id: b.ref_id,
    project_id: b.project_id,
    workflow_id: b.workflow_id,
    summary: b.summary,
    outcome: b.outcome,
    data: b.data
  };
}

function aggregateByKind(rows: Breadcrumb[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    out[r.kind] = (out[r.kind] ?? 0) + 1;
  }
  return out;
}

export function encodeBreadcrumbCursor(c: { at: Date; ref_id: string }): string {
  const json = JSON.stringify({ at: c.at.toISOString(), ref_id: c.ref_id });
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeBreadcrumbCursor(raw: string): { at: Date; ref_id: string } | null {
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as { at?: unknown; ref_id?: unknown };
    if (typeof parsed.at !== "string" || typeof parsed.ref_id !== "string") return null;
    const at = new Date(parsed.at);
    if (Number.isNaN(at.getTime())) return null;
    return { at, ref_id: parsed.ref_id };
  } catch {
    return null;
  }
}

// ============================================================
// Interaction page
// ============================================================

const INTERACTION_PAGE_DEFAULT_LIMIT = 50;
const INTERACTION_PAGE_MAX_LIMIT = 200;

export interface InteractionPageOptions {
  limit?: number;
  outcomes?: AIOutcome[];
  projectId?: string;
  /** Opaque base64 cursor (decoded by the route layer). */
  cursor?: { created_at: Date; id: string } | null;
}

export async function selectInteractionsPage(
  userId: string,
  options: InteractionPageOptions
): Promise<InteractionPageResponse> {
  if (!userId) {
    throw new Error("selectInteractionsPage: userId is required");
  }

  const limit = Math.min(
    Math.max(1, Math.floor(options.limit ?? INTERACTION_PAGE_DEFAULT_LIMIT)),
    INTERACTION_PAGE_MAX_LIMIT
  );
  const overfetch = limit + 1;

  const rows = await selectInteractionsForUser({
    userId,
    limit: overfetch,
    outcomes: options.outcomes,
    projectId: options.projectId,
    cursor: options.cursor ?? null
  });

  const page = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeInteractionCursor({ created_at: last.created_at, id: last.id })
      : null;

  return {
    items: page.map(toInteractionItem),
    next_cursor: nextCursor
  };
}

function toInteractionItem(r: InteractionListRow): InteractionItem {
  return {
    id: r.id,
    created_at: r.created_at.toISOString(),
    project_id: r.project_id,
    workflow_id: r.workflow_id,
    provider: r.provider,
    model: r.model,
    outcome: r.outcome,
    outcome_settled_at: r.outcome_settled_at ? r.outcome_settled_at.toISOString() : null,
    tokens_used: r.tokens_used,
    latency_ms: r.latency_ms,
    matched_pattern_ids: r.matched_pattern_ids,
    prompt_excerpt: r.prompt_excerpt
  };
}

export function encodeInteractionCursor(c: { created_at: Date; id: string }): string {
  const json = JSON.stringify({ created_at: c.created_at.toISOString(), id: c.id });
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeInteractionCursor(raw: string): { created_at: Date; id: string } | null {
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as { created_at?: unknown; id?: unknown };
    if (typeof parsed.created_at !== "string" || typeof parsed.id !== "string") return null;
    const at = new Date(parsed.created_at);
    if (Number.isNaN(at.getTime())) return null;
    return { created_at: at, id: parsed.id };
  } catch {
    return null;
  }
}

// ============================================================
// helpers
// ============================================================

function roundTo(value: number, places: number): number {
  const mult = Math.pow(10, places);
  return Math.round(value * mult) / mult;
}
