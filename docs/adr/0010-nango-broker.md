# ADR 0010 — Nango replaces Composio as the integration broker (2026-05-27)

> **Status**: accepted. **Supersedes**: [`0001-composio-broker.md`](./0001-composio-broker.md) (the broker choice only — the "no workflow builder / kill chatv2" half of 0001 still holds).
> **Builds on**: [`0009-engineering-stack-2026-05.md`](./0009-engineering-stack-2026-05.md) (which rated the Tools layer 70% / lowest-aligned and flagged broker resilience as the top risk one day before the breach forced this).
> **Source of truth in code**: `src/lib/nango.ts`. **Backing research**: [`../research/2026-05-27-nango-broker-best-practices.md`](../research/2026-05-27-nango-broker-best-practices.md).

---

## The decision

**Remove Composio entirely; broker all SaaS OAuth + tool calls through [Nango](https://nango.dev).** Done wholesale on 2026-05-26.

## Why this question came up

On **2026-05-21** Composio disclosed a material security breach: unauthorized internal access via arbitrary code execution, with ~5,001 GitHub connections and ~5,241 API keys at risk; pre-22-May API keys were deleted and ~100 toolkits' access tokens revoked. This followed repeated auth/CLI/MCP outages through late May. ADR 0009 (compiled 2026-05-26, one day before this) had already rated the tools layer the weakest and flagged "Composio is fine *if* you own the OAuth apps + have a fallback." The breach turned that conditional into a forcing function.

The choice was not "harden Composio" (ADR 0009's changes #7–9) but **switch brokers** — because the core problem was the trust model, not the wiring.

## What changed

| | Before (Composio) | After (Nango) |
|---|---|---|
| Broker | Composio | Nango (`@nangohq/node`) |
| Token custody | Composio cache (the breached surface) | Nango infra, behind **short-lived Connect Session tokens** — contained blast radius |
| Our token exposure | We never saw keys, but a broker breach exposed long-lived tokens | We never see keys; the broker switch model means a future vendor incident can't leak our customers' long-lived creds |
| Identity model | Composio entity per user | Nango auto-generates an opaque `connectionId` at Connect-Session completion; we tag the session `tags.end_user_id = <userId>` and resolve later via `listConnections({ tags })` |
| Escape hatch | none (SaaS-only) | Nango can be self-hosted if a regulated buyer ever demands it |

## How it works now (see `src/lib/nango.ts`)

- **`getNango()`** — lazy singleton. Key resolution order: `NANGO_SECRET_KEY` (explicit override, always wins) → `NANGO_SECRET_KEY_<NANGO_ENV>` → `NANGO_SECRET_KEY_DEV` (non-prod only; prod fails fast rather than silently using dev creds). On the Nango free tier there is ONE secret key — use `NANGO_SECRET_KEY` (no suffix) in Vercel.
- **`resolveConnectionId(userId, tool)`** — `userId` + tool → opaque Nango `connectionId`. Two-tier cache: **L1** in-process Map (~5s TTL, absorbs the burst of parallel tool calls in one agent loop) + **L2** Upstash Redis (~60s TTL, cross-instance freshness) + in-flight de-dup so concurrent callers share one `listConnections` round-trip. Degrades gracefully to L1+Nango if Redis is down. **Never caches nulls** (a miss = "just connected or transient error"). Skips connections in auth-broken state (`errors.length > 0`) — treats them as "not connected" so the agent prompts a reconnect instead of proxying through a dead connection.
- **`nangoProxy({ userId, tool, ... })`** — make an API call *as the customer*. Quota-checked + recorded via `src/lib/usage/track.ts` (CP-23 multi-tenant quota carries over unchanged).
- **`hasNangoConnection(userId, tool)`** — connection check for UI/gating.

### Where tokens vs mappings live

- **OAuth tokens** → Nango's infrastructure (short-lived Connect Session tokens on top). Never on OpsRadar servers, never in Supabase.
- **The `userId → connectionId` mapping** → resolved live from Nango via `tags.end_user_id`. Supabase's `integrations` table tracks connection metadata/state (`oauth_state`), **not** the tokens.
- This preserves the hard rule from [`0004-three-tier-memory.md`](./0004-three-tier-memory.md): we hold computed metadata, never customer credentials or raw business data.

## Tool coverage (NANGO_TOOLS map)

~20 tools wired, matching the agency/services stack: Stripe, QuickBooks, Xero · HubSpot, Pipedrive, Apollo · ClickUp, Asana, Monday · Harvest, Toggl · Gmail (`google-mail`), Slack, Google Calendar, Calendly · Google Analytics, Google Ads, LinkedIn · BambooHR, Gusto · Typeform · Intercom, Zendesk · Notion. Growing toward broader catalog parity.

## Why Nango is a net upgrade (not just a sideways swap)

Per the backing research: white-label OAuth consent (the customer sees their own brand, not the broker's), AES-256-GCM token storage with auto-cleanup, short-lived session tokens that contain blast radius, and a self-host escape hatch Composio never offered. The competitive research ([`../research/2026-05-27-competitive-refresh.md`](../research/2026-05-27-competitive-refresh.md)) found that **integration-token custody flipped from a compliance footnote to a front-of-pitch buying criterion in under 30 days** after the breach — so this migration converts a liability into a trust moat.

## Consequences

- **Public copy stays vendor-agnostic.** We describe the *capability* ("OAuth-secured connections; tokens never touch our servers; short-lived session tokens"), not the vendor name. Decided 2026-05-27 — future-proofs copy against the next broker swap.
- **One dead reference remains in code**: a legacy `composio_connections` column in `database.types.ts`. Cleanup TODO (drop in a future migration; no consumers).
- **Agent stack is mid-rebuild on Nango.** The pre-pivot 28-agent stack (10 domain + 17 tool + 1 evaluator) was torn down with Composio; `src/lib/agents/registry.ts` currently holds one agent (Gmail), rebuilding one at a time. See [`0011-hire-surface-collapse.md`](./0011-hire-surface-collapse.md).
- ADR 0009's Tools-layer resilience recommendations (#7–9) are **closed by this migration**, not by hardening.

## Highest-leverage follow-ups (from the research)

1. **Register OpsRadar-owned OAuth apps** with each provider now, so the *next* broker switch never forces customer re-consent.
2. **Self-host Nango** if/when regulated buyers appear (the escape hatch Composio lacked).
3. **Route strict-`json_schema` work away from open models** — orthogonal to the broker, but the same "own your trust boundary" instinct; see [`0012-model-fallback-stack.md`](./0012-model-fallback-stack.md).

## When we'd revisit

- Nango has a material security incident → re-evaluate broker + Pica/Arcade/Paragon head-to-head, and accelerate the self-host path.
- A regulated buyer mandates on-prem token custody → self-host Nango.
- Broker breadth becomes a ceiling → evaluate multi-broker or direct OAuth for the top integrations.
