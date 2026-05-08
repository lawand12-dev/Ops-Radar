import type { PoolConnection } from "mysql2/promise";
import { dbQuery, getDb } from "../../lib/db";
import { logError } from "../../lib/logger";
import { redactSecrets } from "../../lib/redact";

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

  await dbQuery(
    runner,
    `INSERT INTO ai_interactions (
      user_id, provider, model,
      system_prompt, user_prompt, response,
      raw_response, status, error_message,
      tokens_used, latency_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      record.latencyMs
    ]
  );
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
