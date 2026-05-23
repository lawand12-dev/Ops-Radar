import type { RowDataPacket } from "mysql2/promise";
import { env } from "../../config/env";
import { dbQuery, getDb } from "../../lib/db";
import { dbPgQuery, getPgPool } from "../../lib/db-pg";
import { logWarn } from "../../lib/logger";
import { AppError } from "../../lib/errors";
import { getProjectByIdForUser } from "../projects/project-repository";
import type { AIInteractionOutcome } from "../ai/ai-interaction-repository";
import type {
  AIOutcome,
  BreadcrumbPreview,
  PatternCardPreview,
  WorkflowGroundingResponse
} from "../../types/memory-api";
import { recentBreadcrumbs } from "./breadcrumbs";
import { patternCardCitation } from "./pattern-cards";

/**
 * Workflow grounding lookup — "what memory did the AI use when it
 * generated *this* workflow?"
 *
 * Tenant isolation
 * ----------------
 * 1. Resolve workflow → project_id via the workflows table.
 * 2. Verify the project is owned by the caller via getProjectByIdForUser.
 *    If the project doesn't belong to the caller, return 404 (NOT 403)
 *    so an attacker can't enumerate workflow ids across tenants.
 * 3. From there, every downstream query uses the validated user_id.
 *
 * Card resolution
 * ---------------
 * matched_pattern_ids are stored as "<id>@v<n>" strings. Some cards may
 * have been archived since generation — those are still resolved (joined
 * against pattern_cards regardless of archived_at) so the user can see
 * what the AI grounded on even when the card has been retired.
 *
 * Breadcrumbs at generation
 * -------------------------
 * Approximation: the most recent N breadcrumbs for the tenant that
 * predate the interaction's created_at. We do not persist a snapshot of
 * the actual breadcrumb set at generation time (that would require
 * versioning v_breadcrumbs); this is the best-effort reconstruction.
 */

const BODY_EXCERPT_CHARS = 400;
const BREADCRUMBS_AT_GENERATION_LIMIT = 10;

export async function findGroundingForWorkflow(input: {
  ownerUserId: string;
  workflowId: string;
}): Promise<WorkflowGroundingResponse> {
  if (!input.ownerUserId) {
    throw new Error("findGroundingForWorkflow: ownerUserId is required");
  }

  // Step 1: resolve workflow.project_id without tenant check (cheap).
  const [wfRows] = await dbQuery<
    Array<RowDataPacket & { project_id: string }>
  >(
    getDb(),
    `SELECT project_id FROM workflows WHERE id = ? LIMIT 1`,
    [input.workflowId]
  );

  const projectId = wfRows[0]?.project_id;
  if (!projectId) {
    // Workflow doesn't exist → 404. Same code as cross-tenant case below
    // to avoid id enumeration.
    throw new AppError(404, "WORKFLOW_NOT_FOUND", "Workflow not found.");
  }

  // Step 2: verify ownership. getProjectByIdForUser returns null for
  // both "not found" and "wrong tenant" — same 404 either way.
  const project = await getProjectByIdForUser(projectId, input.ownerUserId);
  if (!project) {
    throw new AppError(404, "WORKFLOW_NOT_FOUND", "Workflow not found.");
  }

  // Step 3: find the linked ai_interaction. Most recent first — workflow
  // can have multiple linked interactions if it was regenerated.
  type InteractionRow = RowDataPacket & {
    id: number | string;
    created_at: Date | string;
    outcome: AIInteractionOutcome;
    outcome_settled_at: Date | string | null;
    matched_pattern_ids: unknown;
  };
  const [intRows] = await dbQuery<InteractionRow[]>(
    getDb(),
    `SELECT id, created_at, outcome, outcome_settled_at, matched_pattern_ids
       FROM ai_interactions
      WHERE workflow_id = ?
        AND user_id = ?
      ORDER BY created_at DESC
      LIMIT 1`,
    [input.workflowId, input.ownerUserId]
  );

  const interaction = intRows[0] ?? null;

  // Step 4: parse matched_pattern_ids.
  const matchedPatternIds: string[] = parsePatternIds(
    interaction?.matched_pattern_ids ?? null
  );

  // Step 5: resolve cards from Postgres (best-effort — degrades to []).
  const matchedCards = await resolveCards(matchedPatternIds);

  // Step 6: breadcrumbs that predate the interaction (or just the most
  // recent N if no interaction was found).
  const breadcrumbs = await loadBreadcrumbsAtGeneration({
    ownerUserId: input.ownerUserId,
    before: interaction
      ? interaction.created_at instanceof Date
        ? interaction.created_at
        : new Date(interaction.created_at)
      : null
  });

  return {
    workflow_id: input.workflowId,
    interaction_id: interaction ? String(interaction.id) : null,
    matched_pattern_ids: matchedPatternIds,
    matched_cards: matchedCards,
    breadcrumbs_at_generation: breadcrumbs,
    outcome: (interaction?.outcome as AIOutcome) ?? "unknown",
    outcome_settled_at: interaction?.outcome_settled_at
      ? interaction.outcome_settled_at instanceof Date
        ? interaction.outcome_settled_at.toISOString()
        : new Date(interaction.outcome_settled_at).toISOString()
      : null
  };
}

function parsePatternIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === "string");
  }
  if (typeof raw === "string" && raw.length > 0) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === "string");
      }
    } catch {
      return [];
    }
  }
  return [];
}

function parseCitation(citation: string): { id: string; version: number } | null {
  // "workflow-slack-digest@v1" → { id: "workflow-slack-digest", version: 1 }
  const m = /^(.+)@v?(\d+)$/.exec(citation);
  if (!m || m[1] === undefined || m[2] === undefined) return null;
  const version = Number(m[2]);
  if (!Number.isFinite(version)) return null;
  return { id: m[1], version };
}

async function resolveCards(citations: string[]): Promise<PatternCardPreview[]> {
  if (citations.length === 0 || !env.POSTGRES_URL) return [];

  const parsed = citations
    .map(parseCitation)
    .filter((p): p is { id: string; version: number } => p !== null);
  if (parsed.length === 0) return [];

  try {
    const pool = getPgPool();
    // Two parallel arrays — id[N] and version[N] — joined to pattern_cards.
    // Includes archived cards (no archived_at IS NULL filter) so historical
    // groundings remain visible.
    const ids = parsed.map((p) => p.id);
    const versions = parsed.map((p) => p.version);
    const { rows } = await dbPgQuery<{
      id: string;
      version: number;
      intent: string | null;
      triggers: string[];
      tools: string[];
      body: string;
    }>(
      pool,
      `SELECT pc.id, pc.version, pc.intent, pc.triggers, pc.tools, pc.body
         FROM pattern_cards pc
         JOIN UNNEST($1::text[], $2::int[]) AS req(id, version)
           ON req.id = pc.id AND req.version = pc.version`,
      [ids, versions]
    );

    // Preserve citation order; cards that didn't resolve are silently dropped.
    const byKey = new Map<string, typeof rows[number]>();
    for (const r of rows) byKey.set(`${r.id}@v${r.version}`, r);

    return parsed
      .map((p) => byKey.get(`${p.id}@v${p.version}`))
      .filter((r): r is NonNullable<typeof r> => r !== undefined)
      .map((r) => ({
        id: r.id,
        version: r.version,
        citation: `${r.id}@v${r.version}`,
        intent: r.intent,
        triggers: r.triggers ?? [],
        tools: r.tools ?? [],
        // Score is N/A in the grounding context — these are the cards the
        // model already used. We surface 0 (not null) so the UI doesn't
        // try to render a confidence bar.
        score: 0,
        matched_triggers: [],
        body_excerpt:
          r.body.length > BODY_EXCERPT_CHARS
            ? `${r.body.slice(0, BODY_EXCERPT_CHARS)}...`
            : r.body
      }));
  } catch (err) {
    logWarn("grounding", "card resolution failed", {
      error: err instanceof Error ? err.message : String(err)
    });
    return [];
  }
}

async function loadBreadcrumbsAtGeneration(input: {
  ownerUserId: string;
  before: Date | null;
}): Promise<BreadcrumbPreview[]> {
  try {
    const rows = await recentBreadcrumbs({
      ownerUserId: input.ownerUserId,
      sinceHours: env.AI_BREADCRUMBS_HOURS * 2, // give the lookback a bit more headroom
      limit: BREADCRUMBS_AT_GENERATION_LIMIT * 2
    });
    const filtered = input.before
      ? rows.filter((b) => b.at.getTime() <= input.before!.getTime())
      : rows;
    return filtered.slice(0, BREADCRUMBS_AT_GENERATION_LIMIT).map((b) => ({
      at: b.at.toISOString(),
      kind: b.kind,
      summary: b.summary,
      outcome: b.outcome
    }));
  } catch (err) {
    logWarn("grounding", "breadcrumb reconstruction failed", {
      error: err instanceof Error ? err.message : String(err)
    });
    return [];
  }
}
