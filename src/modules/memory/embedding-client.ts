import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { fetchWithTimeout } from "../../lib/fetch-with-timeout";

/**
 * Embedding API client.
 *
 * Speaks the OpenAI-compatible /v1/embeddings shape:
 *   POST {AI_BASE_URL}/embeddings
 *   { model, input: string[] }                  -> { data: [{ embedding: number[] }] }
 *
 * DigitalOcean's inference endpoint serves this shape; OpenAI's native API
 * serves it too. Switching providers is a base URL + API key change, not a
 * code change. (We deliberately do NOT add a per-provider adapter for
 * embeddings — the contract is stable across providers in 2026.)
 *
 * Auth
 * ----
 * Uses AI_API_KEY (the same key the AI_BASE_URL provider uses). Embeddings
 * are a platform-shared cost: there is no per-user embedding key today.
 *
 * Dimensions
 * ----------
 * The returned vector dim MUST match the embeddings.embedding column
 * (vector(1024)). We validate on response and throw EMBED_DIM_MISMATCH
 * rather than silently storing the wrong shape — pgvector would reject it
 * but the error would surface as a confusing SQL failure.
 *
 * Batching
 * --------
 * The OpenAI-compat schema accepts an `input` array. We pass batches as-is
 * and rely on the worker to size them (default 32, max 64).
 */

const EMBED_KEY_VAR = "AI_API_KEY";

function requireEmbedKey(): string {
  const key = env.AI_API_KEY?.trim();
  if (!key) {
    throw new AppError(
      500,
      "EMBED_CONFIG_MISSING",
      `${EMBED_KEY_VAR} is required for the embedding worker.`
    );
  }
  return key;
}

export interface EmbedRequest {
  /** 1..N input strings; one embedding returned per input, in order. */
  inputs: string[];
}

export interface EmbedResult {
  /** Embeddings in the SAME order as the inputs. */
  embeddings: number[][];
  /** Optional token usage when the provider returns it. */
  tokens_used: number | null;
  /** Provider model id echoed back. */
  model: string;
}

interface OpenAiEmbeddingsResponse {
  data?: Array<{ embedding?: unknown; index?: number }>;
  model?: string;
  usage?: { total_tokens?: number; prompt_tokens?: number };
}

function isFiniteNumberArray(value: unknown): value is number[] {
  if (!Array.isArray(value)) return false;
  for (const v of value) {
    if (typeof v !== "number" || !Number.isFinite(v)) return false;
  }
  return true;
}

export async function embedBatch(input: EmbedRequest): Promise<EmbedResult> {
  if (!Array.isArray(input.inputs) || input.inputs.length === 0) {
    throw new AppError(400, "EMBED_EMPTY_INPUT", "inputs must be a non-empty array.");
  }

  // Defensive: refuse oversized batches at the boundary so worker bugs
  // don't generate API errors that look like our fault.
  if (input.inputs.length > 64) {
    throw new AppError(
      400,
      "EMBED_BATCH_TOO_LARGE",
      `inputs length ${input.inputs.length} exceeds 64.`
    );
  }

  const apiKey = requireEmbedKey();
  const endpoint = `${env.AI_BASE_URL.replace(/\/+$/, "")}/embeddings`;

  const response = await fetchWithTimeout({
    url: endpoint,
    timeoutMs: env.AI_MODEL_EMBED_TIMEOUT_MS,
    requestName: `embed:${env.AI_MODEL_EMBED}`,
    errorCode: "EMBED_REQUEST_TIMEOUT",
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: env.AI_MODEL_EMBED,
        input: input.inputs
      })
    }
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new AppError(502, "EMBED_REQUEST_FAILED", "Embedding request failed.", {
      provider_status: response.status,
      response_body_excerpt: detail.slice(0, 2000)
    });
  }

  const payload = (await response.json()) as OpenAiEmbeddingsResponse;
  const data = payload?.data;
  if (!Array.isArray(data) || data.length !== input.inputs.length) {
    throw new AppError(502, "EMBED_BAD_RESPONSE", "Embedding response shape unexpected.", {
      expected_count: input.inputs.length,
      received_count: Array.isArray(data) ? data.length : null
    });
  }

  // Embeddings may not arrive in input order if the provider reorders by
  // `index`. Sort defensively before extracting.
  const ordered = [...data].sort((a, b) => (a?.index ?? 0) - (b?.index ?? 0));

  const embeddings: number[][] = [];
  for (let i = 0; i < ordered.length; i += 1) {
    const item = ordered[i];
    const vec = item?.embedding;
    if (!isFiniteNumberArray(vec)) {
      throw new AppError(502, "EMBED_BAD_VECTOR", "Embedding vector is malformed.", {
        index: i
      });
    }
    if (vec.length !== env.AI_MODEL_EMBED_DIM) {
      throw new AppError(502, "EMBED_DIM_MISMATCH", "Embedding dimension mismatch.", {
        index: i,
        expected_dim: env.AI_MODEL_EMBED_DIM,
        received_dim: vec.length
      });
    }
    embeddings.push(vec);
  }

  const tokens = payload?.usage?.total_tokens ?? payload?.usage?.prompt_tokens ?? null;

  return {
    embeddings,
    tokens_used: typeof tokens === "number" && Number.isFinite(tokens) ? tokens : null,
    model: typeof payload?.model === "string" ? payload.model : env.AI_MODEL_EMBED
  };
}

/**
 * pgvector accepts a JS array directly when using the `pg` driver with a
 * registered type cast, but the safer cross-driver path is to encode as
 * the literal text format `[v1,v2,...]`. We use the literal everywhere
 * for predictability.
 */
export function vectorToSqlLiteral(vec: number[]): string {
  // Quick sanity: every value finite (we already check in embedBatch but
  // upstream callers may construct vectors elsewhere).
  for (const v of vec) {
    if (!Number.isFinite(v)) {
      throw new AppError(500, "EMBED_BAD_VECTOR", "Non-finite value in vector.");
    }
  }
  // toFixed not needed; default JS number serialization is lossless for
  // round-trip in pgvector's text reader.
  return `[${vec.join(",")}]`;
}
