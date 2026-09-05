# Spec — Nango broker mechanics (2026-05-27)

> The "how it works" companion to [`../adr/0010-nango-broker.md`](../adr/0010-nango-broker.md) (the *why*). For the Trigger.dev durable-execution patterns that pair with this, see [`./trigger-composio-integration.md`](./trigger-composio-integration.md) (broker half superseded by this doc, Trigger.dev half still valid).
> **Code**: `src/lib/nango.ts`.

---

## Public API (`src/lib/nango.ts`)

| Function | Purpose |
|---|---|
| `getNango()` | Lazy singleton Nango client |
| `nangoProxy({ userId, tool, ... })` | Make an API call *as the customer* (quota-checked + usage-recorded) |
| `hasNangoConnection(userId, tool)` | Is this tool connected for this user? |
| `resolveConnectionId(userId, tool)` | `userId` + tool → opaque Nango `connectionId` |

## Identity model

- Customers live in Supabase `auth.users`, identified by `userId`.
- Nango assigns an **auto-generated, opaque `connectionId`** when OAuth completes via a Connect Session. There is no way to set it from our side at session-create time.
- We tag every Connect Session with `tags.end_user_id = <userId>`, then find the connection later via `listConnections({ tags: { end_user_id: userId } })`.
- **Tokens live in Nango's infra** behind short-lived Connect Session tokens. Supabase's `integrations` table tracks connection metadata/state — **never the tokens**.

## Connection resolution (`resolveConnectionId`)

Three-layer lookup, calibrated so a burst of parallel tool calls in one agent loop doesn't hammer Redis or Nango:

```
1. L1 — in-process Map, ~5s TTL (L1_TTL_MS = 5_000)
        sub-ms; dedupes parallel calls within one warm lambda
2. L2 — Upstash Redis, ~60s TTL (L2_TTL_S = 60)
        cross-instance freshness; "connect in lambda A, see it in lambda B"
        degrades gracefully to L1 + Nango if Redis is unavailable
   ── in-flight de-dup: concurrent callers share ONE listConnections round-trip
3. N  — Nango listConnections (source of truth)
```

Rules:
- **Never cache nulls.** A miss means "just connected, or transient error" — caching it would block the agent right after the customer connects a tool.
- **Skip auth-broken connections.** A connection with `errors.length > 0` is treated as "not connected" so the agent prompts a reconnect instead of proxying through a dead connection.
- Positive results are written back to L1 + L2 (L2 write is fire-and-forget so a Redis blip doesn't slow the call).

## Secret-key resolution (`getNango`)

Order (first non-empty wins):
1. `NANGO_SECRET_KEY` — explicit override, always wins.
2. `NANGO_SECRET_KEY_<NANGO_ENV>` — e.g. `_DEV` / `_PROD` (`NANGO_ENV` defaults to `dev`).
3. `NANGO_SECRET_KEY_DEV` — **non-prod only**. In production we fail fast rather than silently use dev creds.

> **Free-tier note**: Nango's free tier exposes ONE secret key. Use `NANGO_SECRET_KEY` (no suffix) in Vercel — it overrides the env-suffix chain. Rotating the key requires a redeploy (the client is cached in `_nango`).

## Tool map (`NANGO_TOOLS`)

Maps OpsRadar slugs → Nango provider config keys (the IDs set up in the Nango dashboard). Note the slug↔providerkey differences: `gmail → google-mail`, `toggl → toggl-track`, `bamboo_hr → bamboohr`.

~20 tools: Stripe, QuickBooks, Xero · HubSpot, Pipedrive, Apollo · ClickUp, Asana, Monday · Harvest, Toggl · Gmail, Slack, Google Calendar, Calendly · Google Analytics, Google Ads, LinkedIn · BambooHR, Gusto · Typeform · Intercom, Zendesk · Notion.

## Quota integration (CP-23 carries over)

`nangoProxy` runs every call through `checkQuota` / `recordUsage` (`src/lib/usage/track.ts`) — the multi-tenant quota layer is broker-agnostic and was preserved across the migration. Fail-open: a quota-check failure logs and allows the call.

## Cleanup TODO

A legacy `composio_connections` column survives in `database.types.ts` with no consumers. Drop it in a future migration.
