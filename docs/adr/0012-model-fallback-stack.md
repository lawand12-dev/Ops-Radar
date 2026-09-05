# ADR 0012 — Model fallback: OpenAI primary → Groq → DigitalOcean Gradient (2026-05-27)

> **Status**: accepted. **Source of truth in code**: `src/lib/ai/model-provider.ts`.
> **Backing research**: [`../research/2026-05-27-nango-broker-best-practices.md`](../research/2026-05-27-nango-broker-best-practices.md) (§ model-fallback patterns).

---

## The decision

**Keep OpenAI as the primary model provider, with an automatic, lazy fallback chain: Groq first (free, no credit card), then DigitalOcean Gradient.** Both backups are OpenAI-compatible HTTP APIs, so each is a `createOpenAI({ apiKey, baseURL })` call. If no backup env vars are set, the app behaves exactly as OpenAI-only — fallback turns on with zero code change the moment a backup key exists.

## Why a fallback at all

If OpenAI billing lapses (`insufficient_quota`) or rate-limits, the entire agent / Hire chat / employee-compiler surface goes dark. The backup keeps it alive. This is a resilience layer, not a cost-optimization or routing layer.

## The two-model Groq wrinkle (the non-obvious part)

Groq has **no single model** that does both jobs the Hire flow needs. Verified live against the Groq API + Vercel AI SDK (May 2026):

| Job | Model | Why |
|---|---|---|
| **Chat / tool-calling** (`streamText`, `generateText`) | `meta-llama/llama-4-scout-17b-16e-instruct` | Calls the tool exactly once, then stops and summarizes — the orchestration Hire needs |
| **Structured output** (`generateObject`) | `openai/gpt-oss-120b` | The only Groq family with `json_schema` STRICT mode — required by the employee compiler. Can't do tool-calling. |

**Rejected (tested, broken):**
- `llama-3.3-70b-versatile` for chat → loops, re-calling the tool forever, never producing the draft card (this was the live prod "Drafting the spec ×N + unsupported-fields" failure).
- `gpt-oss-120b` for chat → throws the Harmony `"Tools should have a name!"` error the moment tools are passed (broken gpt-oss tool-calling path).

Override either via `GROQ_CHAT_MODEL` / `GROQ_OBJECT_MODEL`. The provider uses `.chat()` to force the classic `/chat/completions` endpoint — the default `provider(model)` targets OpenAI's newer `/responses` API, which Groq does not fully support (it rejects multi-message tool conversations).

## The streaming probe (the other non-obvious part)

You can't retry a stream once it has emitted bytes. So `streamTextWithFallback` decides which provider to stream from **before** returning the stream:

1. No backup configured → stream from OpenAI directly (unchanged behavior).
2. Backup exists → **probe** OpenAI with a tiny non-streaming `generateText` ("reply with: ok", 16-token budget), raced against a 3s timeout. A quota/billing error surfaces on the probe exactly as it would on the stream, so we catch it before committing.
3. Switch to backup **only** on a *thrown, fallback-worthy* error. A slow probe (timeout) or transient/network error is NOT treated as "down" — we stream from OpenAI anyway, to avoid punishing a slow-but-alive primary by forcing the weaker backup.

Non-streaming helpers (`generateTextWithFallback`, `generateObjectWithFallback`) just catch-and-retry. The object helper, if the backup also fails, logs the raw error (Sentry) but throws a clean customer-facing message — a backup schema rejection is developer noise.

## What counts as "fallback-worthy"

`isFallbackWorthy(err)` returns true only for failures meaning "the primary can't serve this request" — `insufficient_quota`, `exceeded your current quota`, `billing`, `invalid_api_key`, `401`, `429`, `rate limit`, `econnrefused`, `etimedout`, `fetch failed`. **Not** our own bugs (bad schema, etc.) — the backup would fail those identically, so we throw instead of wasting a fallback.

## Why hand-rolled, not a gateway

The backing research found the documented 2026 failure mode for generic gateways (OpenRouter, blind Vercel AI Gateway fallback): open models like `gpt-oss-120b` silently **fail open** on `json_schema`, so a gateway that blindly fails over reintroduces exactly the bug we tested around. Our chain is **capability-aware** — it routes strict-`json_schema` work to the one Groq model that honors it and tool-calling to the one that doesn't loop. That capability awareness is the reason for the hand-rolled wrapper over a drop-in gateway.

## Consequences

- Primary models: OpenAI `gpt-5.4` / `gpt-5.5` (the models the app was built for).
- DigitalOcean Gradient is the CTO-provisioned third tier (`DIGITALOCEAN_API_KEY` + `AI_DIGITALOCEAN_URL`, default model `llama3.3-70b-instruct`), also via `.chat()`.
- The fallback is invisible when OpenAI is healthy — no latency tax beyond the ≤3s probe on streaming calls, and only when a backup is configured.

## When we'd revisit

- OpenAI ships a single Groq-equivalent that does both tool-calling and strict json_schema → collapse to one backup model.
- A gateway adds verified capability-aware routing (strict-schema vs tool-calling) → reconsider the hand-rolled wrapper.
- Backup reliability matters enough to warrant a third independent provider → extend the chain (the structure already supports it).
