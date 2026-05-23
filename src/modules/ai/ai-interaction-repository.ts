import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { env } from "../../config/env";
import { dbQuery, getDb } from "../../lib/db";
import { logError, logWarn } from "../../lib/logger";
import { redactSecrets } from "../../lib/redact";
import { enqueueEmbeddingJob } from "../memory/embedding-jobs";

// Cap per-field text size before storage. LONGTEXT can hold up to 4GB but
// that's a footgun under bursty traffic — a single oversized prompt would
// dominate the binlog and replication. 64KB is more than enough for our
// system prompts (~2KB) plus a generous safety margin for user input.
const MAX_TEXT_BYTES = 64 * 1024;

// Cap raw_response JSON size — n8n / OpenAI / Anthropic responses can be
// large when verbose. We keep the structure but cap the serialized size.
const MAX_RAW_RESPONSE_BYTES = 64 * 1024;

const MAX_ERROR_MESSAGE_LENGTH = 4000;

export type AIInteractionStatus = "success" | "error";

/**
 * Lifecycle of the artifact produced by an AI interaction. Set by the chat
 * flow on insert (`pending` / `rejected`) and advanced out-of-band by the
 * outcome reconciler — see `src/modules/ai/outcome-reconciler.ts`.
 */
export type AIInteractionOutcome =
  | "pending"
  | "validated"
  | "rejected"
  | "deployed"
  | "failed_in_n8n"
  | "superseded"
  | "unknown";

export interface AIInteractionRecord {
  userId: string | null;
  provider: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  /** Final extracted text from the provider; "" on error is acceptable. */
  response: string;
  /** Original parsed JSON payload from the provider, if any. */
  rawResponse: unknown;
  status: AIInteractionStatus;
  errorMessage: string | null;
  tokensUsed: number | null;
  latencyMs: number | null;
  /**
   * Pattern Card ids (with @version) the prompt assembler grounded this call
   * on. JSON-encoded array of strings, e.g. ["workflow-slack-digest@v1"].
   * Optional — failure analysis and background calls may omit it.
   */
  matchedPatternIds?: string[] | null;
}

function truncateForStorage(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  if (value.length <= MAX_TEXT_BYTES) {
    return value;
  }
  return `${value.slice(0, MAX_TEXT_BYTES)}...[truncated]`;
}

function safeStringifyRaw(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length <= MAX_RAW_RESPONSE_BYTES) {
      return serialized;
    }
    // Preserve JSON shape — store a wrapper object explaining truncation
    // so analytics queries don't choke on malformed JSON.
    return JSON.stringify({
      __truncated: true,
      original_size: serialized.length,
      excerpt: serialized.slice(0, MAX_RAW_RESPONSE_BYTES)
    });
  } catch {
    return null;
  }
}

function redactString(value: string): string {
  // redactSecrets walks objects but also handles strings.
  return String(redactSecrets(value));
}

/**
 * Persists an AI interaction row. Always parameterized; never throws on
 * sanitization. The caller decides whether to await this directly (rare,
 * for tests) or to fire-and-forget through `persistAIInteraction`.
 */
export async function saveAIInteraction(
  record: AIInteractionRecord,
  connection?: PoolConnection
): Promise<void> {
  const runner = connection ?? getDb();

  const safeSystemPrompt = truncateForStorage(redactString(record.systemPrompt));
  const safeUserPrompt = truncateForStorage(redactString(record.userPrompt));
  const safeResponse = truncateForStorage(redactString(record.response));
  const safeRaw = safeStringifyRaw(redactSecrets(record.rawResponse));
  const safeError = record.errorMessage
    ? redactString(record.errorMessage).slice(0, MAX_ERROR_MESSAGE_LENGTH)
    : null;

  // `outcome` is set by the column default ('pending') for success rows; we
  // override here to mark error rows as 'rejected' immediately so the
  // reconciler doesn't sweep them.
  const initialOutcome: AIInteractionOutcome =
    record.status === "error" ? "rejected" : "pending";
  const safePatternIds =
    record.matchedPatternIds && record.matchedPatternIds.length > 0
      ? JSON.stringify(record.matchedPatternIds.slice(0, 32))
      : null;

  await dbQuery(
    runner,
    `INSERT INTO ai_interactions (
      user_id, provider, model,
      system_prompt, user_prompt, response,
      raw_response, status, error_message,
      tokens_used, latency_ms,
      matched_pattern_ids, outcome,
      outcome_settled_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.userId,
      record.provider,
      record.model,
      safeSystemPrompt,
      safeUserPrompt,
      safeResponse,
      safeRaw,
      record.status,
      safeError,
      record.tokensUsed,
      record.latencyMs,
      safePatternIds,
      initialOutcome,
      initialOutcome === "rejected" ? new Date() : null
    ]
  );

  const [idRows] = await dbQuery<Array<RowDataPacket & { id: number }>>(
    runner,
    `SELECT LAST_INSERT_ID() AS id`
  );
  const insertedId = idRows[0]?.id ?? null;

  // Enqueue embedding only for success rows with a known owner and Postgres configured.
  // Use the already-redacted safe* locals so no secrets leak into the vector store.
  if (
    insertedId !== null &&
    insertedId !== 0 &&
    record.userId &&
    record.status === "success" &&
    env.POSTGRES_URL
  ) {
    const userPromptChunk = safeUserPrompt.slice(0, 1500);
    const responseChunk = safeResponse.slice(0, 1500);
    const content = `${userPromptChunk}\n\n${responseChunk}`.trim();
    if (content.length > 0) {
      setImmediate(() => {
        enqueueEmbeddingJob({
          ownerUserId: record.userId as string,
          sourceKind: "ai_interaction",
          sourceId: String(insertedId),
          sourceVersion: 1,
          content,
          metadata: {
            provider: record.provider,
            model: record.model,
            user_id: record.userId
          }
        }).catch((err) => {
          logWarn("ai-db", "Failed to enqueue ai_interaction embedding (non-fatal)", {
            id: String(insertedId),
            user_id: record.userId,
            error: err instanceof Error ? err.message : String(err)
          });
        });
      });
    }
  }
}

/**
 * Best-effort post-hoc linkage of the most recent AI interaction to the
 * workflow it produced. Called from the chat flow after the workflow is
 * persisted, so the reconciler can advance `outcome` based on workflow
 * status / events.
 *
 *  - Strictly tenant-scoped: WHERE user_id = ? gates the UPDATE; refusing
 *    cross-tenant links by construction.
 *  - Matches the latest 'pending' success row for this user without a
 *    workflow binding yet — narrow enough to avoid clobbering a parallel
 *    AI call (concurrent chats per user are rare).
 *  - Best-effort: failure logs a warning and returns false. The reconciler
 *    will eventually mark unlinked rows as 'superseded' after the stale
 *    window passes.
 */
export async function bindLatestAIInteractionToWorkflow(input: {
  userId: string;
  projectId: string;
  workflowId: string;
  matchedPatternIds?: string[] | null;
  /**
   * Lower bound on created_at — pass the timestamp captured BEFORE the AI
   * call started, so we never bind to an older orphan row.
   */
  createdAfter: Date;
  /**
   * Initial outcome after binding. Chat flow passes 'validated' or 'rejected'
   * synchronously from its security check result so the reconciler doesn't
   * need to re-derive it.
   */
  initialOutcome: AIInteractionOutcome;
}): Promise<boolean> {
  if (!input.userId) {
    // Refuse silently — cross-tenant binding is the highest-priority invariant
    // and surfacing it as a thrown error would crash the chat path on legacy
    // unauthenticated callers we may still have in tests.
    logWarn("ai-db", "bindLatestAIInteractionToWorkflow called without userId — refusing", {
      project_id: input.projectId,
      workflow_id: input.workflowId
    });
    return false;
  }

  const settledAt = input.initialOutcome === "pending" ? null : new Date();
  const patternIdsJson =
    input.matchedPatternIds && input.matchedPatternIds.length > 0
      ? JSON.stringify(input.matchedPatternIds.slice(0, 32))
      : null;

  // Find the id first so we can emit a clear log line and avoid touching
  // multiple rows on a malformed clock. LIMIT 1 ensures atomicity per call.
  const [rows] = await dbQuery<Array<RowDataPacket & { id: number }>>(
    getDb(),
    `SELECT id FROM ai_interactions
      WHERE user_id = ?
        AND status = 'success'
        AND outcome = 'pending'
        AND project_id IS NULL
        AND workflow_id IS NULL
        AND created_at >= ?
      ORDER BY created_at DESC
      LIMIT 1`,
    [input.userId, input.createdAfter]
  );

  const firstRow = Array.isArray(rows) ? rows[0] : undefined;
  if (!firstRow) {
    logWarn("ai-db", "No pending AI interaction found to bind to workflow", {
      user_id: input.userId,
      project_id: input.projectId,
      workflow_id: input.workflowId,
      created_after: input.createdAfter.toISOString()
    });
    return false;
  }

  const interactionId = firstRow.id;

  await dbQuery(
    getDb(),
    `UPDATE ai_interactions
        SET project_id = ?,
            workflow_id = ?,
            matched_pattern_ids = COALESCE(?, matched_pattern_ids),
            outcome = ?,
            outcome_settled_at = ?
      WHERE id = ?
        AND user_id = ?`,
    [
      input.projectId,
      input.workflowId,
      patternIdsJson,
      input.initialOutcome,
      settledAt,
      interactionId,
      input.userId
    ]
  );

  return true;
}

/**
 * Fire-and-forget persistence designed for hot-path instrumentation:
 *  - Defers the DB write to the next event-loop tick via setImmediate so the
 *    AI response returns to the caller without waiting on DB I/O.
 *  - Catches any error from `saveAIInteraction` (DB down, schema drift,
 *    serialization failure) and logs it via `logError` — it must never
 *    propagate back into the AI request flow.
 */
export function persistAIInteraction(record: AIInteractionRecord): void {
  setImmediate(() => {
    saveAIInteraction(record).catch((error) => {
      logError("ai-db", "Failed to save AI interaction", {
        provider: record.provider,
        model: record.model,
        status: record.status,
        error: error instanceof Error ? error.message : String(error)
      });
    });
  });
}

// ============================================================
// PR-A2: User-facing interaction listing
// ============================================================

export interface InteractionListRow {
  id: string;                  // stringified BIGINT
  created_at: Date;
  project_id: string | null;
  workflow_id: string | null;
  provider: string;
  model: string;
  outcome: AIInteractionOutcome;
  outcome_settled_at: Date | null;
  tokens_used: number | null;
  latency_ms: number | null;
  matched_pattern_ids: string[];
  prompt_excerpt: string;
}

export interface SelectInteractionsOptions {
  /** Tenant scope — required; no overload. */
  userId: string;
  /** Page size; capped at 200. */
  limit: number;
  /** Optional outcome filter; omit for all. */
  outcomes?: AIInteractionOutcome[];
  /** Optional project narrowing. */
  projectId?: string;
  /**
   * Opaque cursor from the previous page (the LAST row's created_at + id).
   * When set, returns rows strictly older than the cursor.
   */
  cursor?: { created_at: Date; id: string } | null;
}

/**
 * Tenant-scoped recent AI interactions with outcome lineage. Drives the
 * `GET /memory/ai-interactions` endpoint. Strictly per-user — the WHERE
 * predicate `user_id = ?` is the first clause and not optional.
 *
 * Pagination is keyset (created_at DESC, id DESC) — cheaper and more
 * stable than OFFSET as the table grows. The cursor opaqueness is
 * enforced at the route layer (base64 encode/decode).
 */
export async function selectInteractionsForUser(
  options: SelectInteractionsOptions
): Promise<InteractionListRow[]> {
  if (!options.userId) {
    throw new Error("selectInteractionsForUser: userId is required (tenant isolation)");
  }

  const limit = Math.min(Math.max(1, Math.floor(options.limit)), 200);

  const wheres: string[] = ["user_id = ?"];
  const params: unknown[] = [options.userId];

  if (options.outcomes && options.outcomes.length > 0) {
    // Dedup + clamp to the known enum surface to keep the planner happy.
    const distinct = Array.from(new Set(options.outcomes));
    wheres.push(`outcome IN (${distinct.map(() => "?").join(",")})`);
    params.push(...distinct);
  }

  if (options.projectId) {
    wheres.push("project_id = ?");
    params.push(options.projectId);
  }

  if (options.cursor) {
    // Keyset pagination: strictly older than cursor (created_at, id) pair.
    // The composite index (user_id, created_at) covers this efficiently;
    // id is the tie-breaker for rows sharing the same second.
    wheres.push("(created_at < ? OR (created_at = ? AND CAST(id AS UNSIGNED) < ?))");
    params.push(options.cursor.created_at, options.cursor.created_at, options.cursor.id);
  }

  params.push(limit);

  type Row = RowDataPacket & {
    id: number | string;
    created_at: Date | string;
    project_id: string | null;
    workflow_id: string | null;
    provider: string;
    model: string;
    outcome: AIInteractionOutcome;
    outcome_settled_at: Date | string | null;
    tokens_used: number | null;
    latency_ms: number | null;
    matched_pattern_ids: unknown;
    user_prompt: string;
  };

  const [rows] = await dbQuery<Row[]>(
    getDb(),
    `SELECT id, created_at, project_id, workflow_id, provider, model,
            outcome, outcome_settled_at, tokens_used, latency_ms,
            matched_pattern_ids, user_prompt
       FROM ai_interactions
      WHERE ${wheres.join(" AND ")}
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    params
  );

  return rows.map((r) => ({
    id: String(r.id),
    created_at: r.created_at instanceof Date ? r.created_at : new Date(r.created_at),
    project_id: r.project_id,
    workflow_id: r.workflow_id,
    provider: r.provider,
    model: r.model,
    outcome: r.outcome,
    outcome_settled_at: r.outcome_settled_at
      ? r.outcome_settled_at instanceof Date
        ? r.outcome_settled_at
        : new Date(r.outcome_settled_at)
      : null,
    tokens_used: r.tokens_used,
    latency_ms: r.latency_ms,
    matched_pattern_ids: parsePatternIds(r.matched_pattern_ids),
    prompt_excerpt: String(r.user_prompt ?? "").slice(0, 240)
  }));
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
