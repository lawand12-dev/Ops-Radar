import type { RowDataPacket } from "mysql2/promise";
import { env } from "../../config/env";
import { dbQuery, getDb } from "../../lib/db";

/**
 * Breadcrumb retrieval — tenant-stamped operational timeline.
 *
 * Reads the `v_breadcrumbs` view (migration 020) which unifies
 *   - ai_interactions
 *   - workflow_events (lifecycle + run signals)
 *   - execution_anomalies (silent-failure observations)
 * into one row shape carrying `user_id`.
 *
 * Tenant isolation invariants
 * ---------------------------
 *  - Every public function REQUIRES `ownerUserId` as a non-optional first
 *    field. The wrappers throw before touching the DB if it's missing.
 *  - Every SELECT has `WHERE user_id = ?` as its first predicate.
 *  - No overload, no "admin mode" — callers that need cross-tenant access
 *    must use a dedicated admin repo (not this module).
 *
 * Footprint discipline
 * --------------------
 * The breadcrumb retrieval is the load-bearing context bridge from "raw
 * timeline" into AI prompts. We keep:
 *   - row count strictly capped (default 30, hard cap 200)
 *   - summary truncated at 500 chars on the view side
 *   - prompt-formatting helper enforces a separate char budget so a
 *     pathological tenant can't blow out the prompt
 */

export type BreadcrumbKind = string;

export interface Breadcrumb {
  user_id: string;
  at: Date;
  kind: BreadcrumbKind;
  ref_id: string;
  project_id: string | null;
  workflow_id: string | null;
  summary: string | null;
  outcome: string | null;
  data: Record<string, unknown> | null;
}

interface BreadcrumbRow extends RowDataPacket {
  user_id: string;
  at: Date | string;
  kind: string;
  ref_id: string;
  project_id: string | null;
  workflow_id: string | null;
  summary: string | null;
  outcome: string | null;
  data: unknown;
}

const HARD_LIMIT_CAP = 200;

function parseJsonField(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

function mapRow(row: BreadcrumbRow): Breadcrumb {
  return {
    user_id: row.user_id,
    at: row.at instanceof Date ? row.at : new Date(row.at),
    kind: row.kind,
    ref_id: row.ref_id,
    project_id: row.project_id,
    workflow_id: row.workflow_id,
    summary: row.summary,
    outcome: row.outcome,
    data: parseJsonField(row.data)
  };
}

export interface RecentBreadcrumbsOptions {
  /** Required tenant id; never optional. */
  ownerUserId: string;
  /** Optional narrowing to a single project. */
  projectId?: string;
  /** Look back window in hours. Default from env.AI_BREADCRUMBS_HOURS (24). */
  sinceHours?: number;
  /** Max rows to return. Hard-capped at 200. */
  limit?: number;
  /**
   * Optional kind filter — exact match or prefix (kind LIKE 'event:%').
   * Pass ['event:'] to get only workflow events. Pass ['ai_interaction']
   * to get just AI history.
   */
  kindPrefixes?: string[];
}

/**
 * Most recent breadcrumbs for a tenant. Default: 24h, 10 rows, all kinds.
 *
 * Use this for prompt grounding — it answers "what's happened recently in
 * this account?". For long-term semantic lookups, use the vector retrieval
 * layer (Phase 2).
 */
export async function recentBreadcrumbs(
  options: RecentBreadcrumbsOptions
): Promise<Breadcrumb[]> {
  if (!options.ownerUserId) {
    throw new Error("recentBreadcrumbs: ownerUserId is required (tenant isolation)");
  }

  const sinceHours = Math.max(
    1,
    Math.floor(options.sinceHours ?? env.AI_BREADCRUMBS_HOURS)
  );
  const limit = Math.min(
    Math.max(1, Math.floor(options.limit ?? env.AI_BREADCRUMBS_LIMIT)),
    HARD_LIMIT_CAP
  );

  const sinceDate = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

  // Build predicate list. We bake project_id into the WHERE rather than
  // post-filtering in JS so MySQL can short-circuit on the index.
  const wheres: string[] = ["user_id = ?", "at >= ?"];
  const params: unknown[] = [options.ownerUserId, sinceDate];

  if (options.projectId) {
    wheres.push("project_id = ?");
    params.push(options.projectId);
  }

  if (options.kindPrefixes && options.kindPrefixes.length > 0) {
    const conds: string[] = [];
    for (const prefix of options.kindPrefixes) {
      // Exact match if no wildcard; prefix match otherwise.
      if (prefix.endsWith(":")) {
        conds.push("kind LIKE ?");
        params.push(`${prefix}%`);
      } else {
        conds.push("kind = ?");
        params.push(prefix);
      }
    }
    wheres.push(`(${conds.join(" OR ")})`);
  }

  params.push(limit);

  const [rows] = await dbQuery<BreadcrumbRow[]>(
    getDb(),
    `SELECT user_id, at, kind, ref_id, project_id, workflow_id, summary, outcome, data
       FROM v_breadcrumbs
      WHERE ${wheres.join(" AND ")}
      ORDER BY at DESC
      LIMIT ?`,
    params
  );

  return Array.isArray(rows) ? rows.map(mapRow) : [];
}

/**
 * Failure-cluster lookup for a specific workflow + error fingerprint.
 *
 * Today: deterministic, count + first/last-seen for the same workflow + a
 * normalized error message. No embedding required.
 *
 * Phase 2 will overlay vector search across breadcrumbs for cross-workflow
 * patterns; this function keeps its signature so callers don't change.
 */
export interface FailureCluster {
  workflow_id: string;
  fingerprint: string;
  count: number;
  first_seen: Date;
  last_seen: Date;
}

function fingerprintErrorMessage(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g, "<uuid>")
    .replace(/https?:\/\/\S+/g, "<url>")
    .replace(/\b\d{3,}\b/g, "<num>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

export async function failureClusterFor(input: {
  ownerUserId: string;
  workflowId: string;
  errorMessage: string;
}): Promise<FailureCluster | null> {
  if (!input.ownerUserId) {
    throw new Error("failureClusterFor: ownerUserId is required (tenant isolation)");
  }

  const fp = fingerprintErrorMessage(input.errorMessage);
  if (!fp) return null;

  // Look across the last 30 days of breadcrumbs for the same workflow with a
  // matching fingerprint. The view's outcome column carries failure/severity;
  // we only care about events that look like a failure.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [rows] = await dbQuery<
    Array<RowDataPacket & { count: number; first_seen: Date; last_seen: Date }>
  >(
    getDb(),
    `SELECT COUNT(*) AS count,
            MIN(at)  AS first_seen,
            MAX(at)  AS last_seen
       FROM v_breadcrumbs
      WHERE user_id = ?
        AND workflow_id = ?
        AND at >= ?
        AND (kind LIKE 'event:%failed%'
             OR kind LIKE 'event:%failing%'
             OR kind LIKE 'event:%failure%'
             OR kind LIKE 'anomaly:%')
        AND LOWER(REPLACE(REPLACE(summary, '\n', ' '), '\r', ' ')) LIKE ?`,
    [input.ownerUserId, input.workflowId, since, `%${fp.slice(0, 60)}%`]
  );

  const row = Array.isArray(rows) ? rows[0] : undefined;
  if (!row) return null;
  const count = Number(row.count ?? 0);
  if (count === 0) return null;

  return {
    workflow_id: input.workflowId,
    fingerprint: fp,
    count,
    first_seen: row.first_seen instanceof Date ? row.first_seen : new Date(row.first_seen),
    last_seen: row.last_seen instanceof Date ? row.last_seen : new Date(row.last_seen)
  };
}

/**
 * Render breadcrumbs into a compact prompt block. Caps total chars by
 * env.AI_BREADCRUMBS_MAX_CHARS — if exceeded, trims oldest entries first
 * (we keep the freshest signal closest to "now").
 *
 * Format is JSON Lines-ish so the model parses each line consistently:
 *   [<iso>] <kind> [<outcome>] <summary>
 */
export function buildBreadcrumbsPromptBlock(
  breadcrumbs: Breadcrumb[],
  options?: { maxChars?: number; header?: string }
): string {
  if (breadcrumbs.length === 0) return "";

  const maxChars = Math.max(200, options?.maxChars ?? env.AI_BREADCRUMBS_MAX_CHARS);
  const header = options?.header ?? "RECENT_TENANT_ACTIVITY";

  // Newest first in display so the model anchors on most-recent events.
  const ordered = [...breadcrumbs].sort((a, b) => b.at.getTime() - a.at.getTime());
  const headerLine = `<${header}>`;
  const lines: string[] = [headerLine];

  let totalLen = headerLine.length + 1;
  let truncated = false;

  for (const b of ordered) {
    const summary = (b.summary ?? "").replace(/\s+/g, " ").trim().slice(0, 240);
    const outcome = b.outcome ? `[${b.outcome}] ` : "";
    const line = `[${b.at.toISOString()}] ${b.kind} ${outcome}${summary}`;

    // +1 for newline
    if (totalLen + line.length + 1 > maxChars) {
      truncated = true;
      break;
    }
    lines.push(line);
    totalLen += line.length + 1;
  }

  if (truncated) lines.push("[...older entries truncated]");
  lines.push(`</${header}>`);
  return lines.join("\n");
}
