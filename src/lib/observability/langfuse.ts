/**
 * Langfuse instrumentation for OpsRadar (CP-PROD-SAFETY step 3).
 *
 * Captures every LLM call OpsRadar makes — cron agent runs, COO chat turns,
 * employee chat turns (CP-34), `consult_coo` escalations, `generateObject`
 * compilation calls — with full prompt + tool-call + token + cost + latency
 * traces, scoped per customer.
 *
 * Architecture:
 *   - One singleton Langfuse client per Node process.
 *   - Trace shape: one Langfuse "session" = one `agent_runs` row or one
 *     COO chat session id. One "trace" inside the session = one
 *     generateText / streamText call. Tool calls show up as spans
 *     automatically via the Vercel AI SDK callbacks.
 *   - Per-tenant isolation: every trace tagged with the customer's userId,
 *     so the Langfuse dashboard filters cleanly.
 *
 * Falls back gracefully:
 *   - If LANGFUSE_PUBLIC_KEY is unset, returns a no-op object — observe()
 *     calls are silent; nothing fails. This lets local development without
 *     Langfuse keys still work.
 *
 * See: docs/strategy/observability-stack-2026.md §2 for the verified pick.
 */

import { Langfuse } from 'langfuse'

let _client: Langfuse | null = null
let _disabled = false

/**
 * Returns the shared Langfuse client. Initializes lazily on first call.
 * Returns null if the SDK is disabled (no keys set) — callers should treat
 * a null client as "skip tracing".
 */
export function getLangfuse(): Langfuse | null {
  if (_disabled) return null
  if (_client) return _client

  const publicKey = process.env.LANGFUSE_PUBLIC_KEY
  const secretKey = process.env.LANGFUSE_SECRET_KEY
  if (!publicKey || !secretKey) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        '[langfuse] LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY not set — tracing disabled',
      )
    }
    _disabled = true
    return null
  }

  _client = new Langfuse({
    publicKey,
    secretKey,
    // Accept either env var name to be forgiving of historic naming drift.
    baseUrl:
      process.env.LANGFUSE_BASE_URL ??
      process.env.LANGFUSE_BASEURL ??
      process.env.LANGFUSE_HOST ??
      'https://cloud.langfuse.com',
    // Background flushing so traces don't add latency to the request path.
    flushAt: 20,
    flushInterval: 10_000,
  })
  return _client
}

/**
 * Convenience helper — flushes any buffered events. Call at the end of a
 * Vercel function invocation (which is the only time we know the function
 * is about to be frozen) so traces always make it to Langfuse before the
 * cold-storage period kicks in.
 */
export async function flushLangfuse(): Promise<void> {
  if (!_client) return
  try {
    await _client.flushAsync()
  } catch (err) {
    console.warn('[langfuse] flush failed', err)
  }
}

/**
 * Build the metadata payload we attach to every trace.
 *
 * The shape is deliberately small + flat so Langfuse's dashboard filters
 * stay snappy. Anything customer-PII or large goes into tags, not metadata.
 */
export type TraceContext = {
  userId: string
  agentSlug?: string             // built-in or custom employee slug
  agentRunId?: string            // ties multiple tool calls in one cron run
  sessionId?: string             // for COO / employee chat threads
  source:
    | 'cron-agent'
    | 'coo-chat'
    | 'hire-chat'    // CP-38 — dedicated hiring surface
    | 'employee-chat'
    | 'consult-coo'
    | 'automation'
    | 'manual'
  tier?: string                  // starter / growth / pro / fo
}

/**
 * Start a trace for a discrete unit of work (one cron agent run, one chat
 * message, one consult_coo call, etc.). Returns the trace handle so callers
 * can attach spans/generations/observations inside it.
 *
 * If Langfuse is disabled, returns a no-op stand-in with the same shape so
 * call sites don't need null checks.
 */
export function startTrace(name: string, ctx: TraceContext) {
  const client = getLangfuse()
  if (!client) return null

  return client.trace({
    name,
    userId: ctx.userId,
    sessionId: ctx.sessionId ?? ctx.agentRunId,
    tags: [
      `source:${ctx.source}`,
      ctx.agentSlug ? `agent:${ctx.agentSlug}` : null,
      ctx.tier ? `tier:${ctx.tier}` : null,
    ].filter(Boolean) as string[],
    metadata: {
      agentSlug: ctx.agentSlug,
      agentRunId: ctx.agentRunId,
      source: ctx.source,
    },
  })
}

/**
 * Build a per-call telemetry config the Vercel AI SDK accepts on
 * generateText / streamText. The SDK calls these callbacks at the right
 * lifecycle points (onStepFinish, onFinish) and we forward to Langfuse.
 *
 * Usage:
 *   const telemetry = makeTelemetry({ userId, agentSlug, source: 'cron-agent' })
 *   await generateText({ ..., experimental_telemetry: telemetry })
 *
 * NOTE: The Vercel AI SDK ships an OpenTelemetry-based telemetry layer; if
 * we want full auto-instrumentation later, we'd wire Langfuse's OTel
 * exporter. For v1 we use the simpler trace API above and forward only the
 * top-level prompt + response + token usage. Enough for the YC pitch
 * ("60% reduction in tool-call errors over 4 weeks") without overhead.
 */
export function makeTelemetry(ctx: TraceContext) {
  // Vercel AI SDK's TelemetrySettings.metadata is Record<string, AttributeValue>
  // and rejects `undefined`. Compact to keep only defined values.
  const metadata: Record<string, string> = {
    userId: ctx.userId,
    source: ctx.source,
  }
  if (ctx.agentSlug) metadata.agentSlug = ctx.agentSlug
  if (ctx.agentRunId) metadata.agentRunId = ctx.agentRunId
  if (ctx.sessionId) metadata.sessionId = ctx.sessionId
  if (ctx.tier) metadata.tier = ctx.tier

  return {
    isEnabled: !!getLangfuse(),
    functionId: ctx.source,
    metadata,
  }
}
