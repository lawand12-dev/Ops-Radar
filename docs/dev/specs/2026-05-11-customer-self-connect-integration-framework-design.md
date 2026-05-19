# Customer Self-Connect Integration Framework — v1: Stripe

**Date:** 2026-05-11
**Owner:** Lawand
**Status:** Approved — ready for implementation planning
**Related:**
- [2026-05-11-workflow-health-page-design.md](2026-05-11-workflow-health-page-design.md) — sibling spec for the team-managed Workflow Health surface (Model A). This spec is Model B.
- [2026-05-09-dashboard-live-data-design.md](2026-05-09-dashboard-live-data-design.md) — defines the widget contracts; this spec replaces its "data flows through n8n" assumption with direct opsradar↔tool calls.

---

## Goal

Build the **reusable pattern** for customers to self-connect their own SaaS tools (Stripe, HubSpot, ClickUp, Toggl, etc.) to OpsRadar so their dashboard widgets light up with their own business data — without OpsRadar ever storing that data and without the team manually managing credentials.

**v1 of this spec instantiates the pattern with Stripe.** Subsequent specs drop later tools into the same framework.

## The rule (storage)

Same as Workflow Health, repeated for clarity:

| Layer | Stores |
|---|---|
| The customer's tool (Stripe, HubSpot, …) | All business data. Source of truth. Owned by the customer. |
| OpsRadar Supabase | **Encrypted OAuth tokens** + integration metadata (`client_id`, `tool`, `connected_at`, `scope`). **Never** the business data itself. |
| Upstash Redis | Transient cache (TTL ≤ 1 hour) of widget JSON. Expires automatically. Not durable storage. |
| OpsRadar app memory | Whatever's in the response for the duration of the HTTP request. |

## Why customer-self-connect (not team-managed)

| Workflow Health (Model A) | Business widgets (this spec, Model B) |
|---|---|
| Monitoring **our** automations | Reading **their** business |
| We built the n8n workflows | They own the Stripe/HubSpot accounts |
| Team-managed credentials | Customer-self-connect via OAuth |
| One credential per customer | Many credentials per customer (one per tool) |

The customer's tool, the customer's data, the customer's call. They click "Connect Stripe", they authorize, they can revoke any time.

## The reusable pattern

Every supported tool follows the same five-step shape. v1 builds it once and parameterizes by tool.

### Pattern step 1 — Settings page row → "Connect" button

`/dashboard/settings/integrations` already exists with a tool catalog and reads from the `integrations` table. v1 evolves it:

- Each tool row gets a **"Connect"** action button (when not connected) or **"Disconnect"** (when connected)
- Page copy changes from "Your OpsRadar account team manages credentials" to "Connect the tools you use to populate your dashboard"
- Row also shows: `Connected since`, `Last synced` (read from cache metadata)

### Pattern step 2 — OAuth initiation (`/api/integrations/:tool/connect`)

Generic Route Handler parameterized by tool name. For each tool:
1. Generate a cryptographically random `state` value (UUID v4)
2. Store `state` keyed to `(user_id, tool, expires_at = now+10min)` in a `oauth_state` Supabase table
3. Build the tool's OAuth authorize URL with our `client_id` (from env), `redirect_uri`, requested `scope`, and `state`
4. Return a 302 redirect to that URL

### Pattern step 3 — OAuth callback (`/api/integrations/:tool/callback`)

Generic Route Handler:
1. Validate `state` against `oauth_state` table (must exist, must match user, must not be expired). Delete the row after read.
2. Exchange the `code` query param for an access token via the tool's token endpoint (per-tool: different URL, same shape)
3. Encrypt `access_token`, `refresh_token` (if any), and tool-specific metadata using AES-256-GCM
4. Upsert into `integrations` (one row per `(client_id, tool)`)
5. Redirect to `/dashboard/settings/integrations?connected=<tool>` (UI shows a success toast)

### Pattern step 4 — Widget data fetch (`/api/dashboard/:widget`)

Per-widget Route Handler:
1. `getCurrentUserId()` from Supabase session
2. Read `integrations` row for `(client_id, tool)`. If missing → return `{ status: 'not_connected' }`
3. Check Upstash Redis: `dash:<widget>:<client_id>` (TTL 1h)
4. On miss: decrypt access_token, call the tool's adapter, map response to widget contract
5. Cache and return

On any 401 from the tool's API: try refresh (if refresh_token present), retry once, otherwise mark integration as `requires_reconnect` and return `{ status: 'requires_reconnect' }`.

### Pattern step 5 — Disconnect (`/api/integrations/:tool/disconnect`)

1. Read the integration row
2. Decrypt access_token, call the tool's revoke endpoint (best-effort — don't fail if the tool's revoke endpoint errors)
3. Delete the row
4. Invalidate any widgets that depend on this tool's cache key
5. Redirect to settings page with a confirmation

## Schema changes

### Extend `integrations` table

Add columns (Supabase migration):

```sql
alter table public.integrations
  add column encrypted_access_token text,         -- AES-256-GCM ciphertext
  add column encrypted_refresh_token text,        -- nullable; some tools don't have refresh
  add column scope text,                          -- what we asked for
  add column external_account_id text,            -- tool's user/account id (e.g. Stripe `stripe_user_id`)
  add column expires_at timestamptz,              -- access token expiry
  add column status text not null default 'connected' check (status in ('connected','requires_reconnect','revoked')),
  add column last_synced_at timestamptz,          -- updated on each successful fetch
  add column last_error text;                     -- redacted error message if last fetch failed
```

The `client_id, tool` pair stays the primary lookup key (existing unique constraint).

### New `oauth_state` table

```sql
create table public.oauth_state (
  state uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index oauth_state_expires_at_idx on public.oauth_state (expires_at);
-- background cleanup: any row older than 1h is fair game to delete
```

RLS: opsradar server-only. Customers never read this directly.

### Encryption

- Algorithm: AES-256-GCM
- Key source: `INTEGRATIONS_ENCRYPTION_KEY` env var, 32 bytes (base64-encoded)
- IV: random 12 bytes per encrypt, prepended to ciphertext
- Auth tag: 16 bytes, appended to ciphertext
- Stored as base64 in the text column
- Helper module: `src/lib/integrations/crypto.ts` with `encrypt(plaintext)` / `decrypt(ciphertext)`

Key rotation strategy (v2): support two keys (`KEY_PRIMARY`, `KEY_PREVIOUS`) so we can rotate without re-encrypting everything at once. v1 ships single-key.

## Stripe-specific v1

### Stripe Connect app registration (one-time team task)

1. Create a Stripe Connect application at `dashboard.stripe.com/settings/connect`
2. Set redirect URI: `https://opsradar.com/api/integrations/stripe/callback`
3. Note the `client_id` (looks like `ca_...`) — goes into env as `STRIPE_CONNECT_CLIENT_ID`
4. The platform's secret key goes into env as `STRIPE_SECRET_KEY` (used for the OAuth token exchange API call)

### Stripe OAuth flow specifics

- Authorize URL: `https://connect.stripe.com/oauth/authorize`
- Params: `response_type=code`, `client_id={STRIPE_CONNECT_CLIENT_ID}`, `scope=read_only`, `state={state}`
- Token exchange: `POST https://connect.stripe.com/oauth/token` with `client_secret`, `code`, `grant_type=authorization_code`
- Response includes `stripe_user_id` (connected account ID), `access_token`, `refresh_token`, `scope`
- Access tokens for Stripe Connect don't expire — but we store `expires_at = NULL` and treat 401 as "reconnect required"

### Stripe API calls for the Finance widget

Use the connected account's access token (`access_token` for Stripe Connect Standard).

```ts
// Adapter shape — src/lib/integrations/stripe/client.ts
function stripeClient(accessToken: string) {
  return new Stripe(accessToken, { apiVersion: '2024-06-20' });
}

// Widget query — src/lib/integrations/stripe/finance.ts
async function fetchFinanceData(accessToken: string): Promise<FinanceWidget> {
  const stripe = stripeClient(accessToken);
  const now = new Date();
  const monthStart = startOfMonth(now);
  const thirtyDaysAgo = subDays(now, 30);

  const [charges, invoices] = await Promise.all([
    stripe.charges.list({ created: { gte: unix(monthStart) }, limit: 100 }),
    stripe.invoices.list({ created: { gte: unix(thirtyDaysAgo) }, limit: 100 }),
  ]);

  return {
    invoiced: sum(invoices.data.map(i => i.amount_due)) / 100,
    paid:     sum(invoices.data.filter(i => i.paid).map(i => i.amount_paid)) / 100,
    overdue:  sum(invoices.data.filter(i => i.status === 'open' && i.due_date && i.due_date < unix(now)).map(i => i.amount_remaining)) / 100,
    sparkline: aggregateDailyByDate(charges.data, 30),
  };
}
```

(Pagination > 100 deferred to v2 — most agencies' monthly volume fits in one page.)

### Finance widget contract

Per the 2026-05-09 spec, with one minor simplification (no QuickBooks in v1):

```ts
type FinanceWidget = {
  status: 'ok' | 'not_connected' | 'requires_reconnect' | 'unavailable';
  invoiced: number;         // USD this month
  paid: number;             // USD this month
  overdue: number;          // USD outstanding past due
  sparkline: Array<{ date: string; amount: number }>;  // last 30 days
  last_synced_at: string;   // ISO
  currency: 'USD';          // v1 USD only; multi-currency = v2
};
```

## opsradar files

### New

```
src/app/api/integrations/[tool]/connect/route.ts        — generic OAuth init
src/app/api/integrations/[tool]/callback/route.ts       — generic OAuth callback
src/app/api/integrations/[tool]/disconnect/route.ts     — disconnect

src/app/api/dashboard/finance/route.ts                  — Finance widget data

src/lib/integrations/crypto.ts                          — AES-256-GCM encrypt/decrypt
src/lib/integrations/oauth-state.ts                     — state CSRF helpers
src/lib/integrations/registry.ts                        — per-tool config (authorize URL, token URL, scopes, revoke URL)

src/lib/integrations/stripe/client.ts                   — Stripe SDK adapter
src/lib/integrations/stripe/finance.ts                  — finance widget shaper
src/lib/integrations/stripe/oauth.ts                    — Stripe-specific OAuth glue (token exchange, revoke)

src/components/dashboard/finance-card.tsx               — Finance card UI
src/components/dashboard/integration-card.tsx           — reusable settings-page row (Connect / Disconnect / status)
```

### Modified

```
src/app/dashboard/settings/integrations/page.tsx        — add Connect/Disconnect buttons; rewrite copy
src/app/dashboard/page.tsx                              — insert Finance card
src/lib/database.types.ts                               — regenerated after migrations
.env.local (gitignored)                                  — STRIPE_CONNECT_CLIENT_ID, STRIPE_SECRET_KEY, INTEGRATIONS_ENCRYPTION_KEY
```

### Supabase migrations

```
N_extend_integrations_with_tokens.sql       — add columns to integrations
N_create_oauth_state.sql                    — oauth_state table
```

## UI: settings page changes

Current row:
```
HubSpot          [Sales card]                    Tracking | Not yet tracking
CRM — pipeline value, leads, auto-created deals
```

New row:
```
Stripe           [Finance card]                  ● Connected since Mar 14
Invoiced, paid, overdue                          Last synced 12m ago     [Disconnect]
```

Empty state row:
```
Stripe           [Finance card]                                          [Connect Stripe]
Invoiced, paid, overdue
```

Error state row (requires reconnect):
```
Stripe           [Finance card]                  ⚠ Disconnected by Stripe
Invoiced, paid, overdue                                                  [Reconnect]
```

Page copy at top changes from:
> "Your OpsRadar account team manages credentials and connections"

to:
> "Connect the tools you use. We never store the data — we read it live from each tool when your dashboard opens."

## Failure modes

| Scenario | Behavior |
|---|---|
| Customer cancels on Stripe's authorize screen | Redirect back to settings page with `?error=user_canceled`; no row created |
| OAuth state expired / missing | Redirect to settings with `?error=expired`; show "Please try connecting again" |
| OAuth state mismatch (CSRF) | 403, no redirect, server-side log |
| Token exchange fails | Redirect to settings with `?error=connection_failed`; no row created |
| Stripe returns 401 on widget fetch | Try refresh once; on failure mark `status='requires_reconnect'`; widget renders the reconnect state |
| Stripe rate-limited | 1h Redis cache absorbs; if cache miss, return `{ status: 'unavailable' }` with retry-after hint |
| Stripe API down | Same as rate-limited — show "Unavailable" |
| Customer manually revokes our app on Stripe | We detect via 401 → mark `requires_reconnect`. v2: Stripe webhook `account.application.deauthorized` could detect proactively |
| Encryption key rotation | v1: no in-flight rotation. v2 supports dual-key |
| Customer deletes their OpsRadar account | `on delete cascade` removes integrations row; we should also revoke at Stripe — add a worker for cleanup (v1.5) |

## Non-goals (v1)

- Write actions to Stripe (creating invoices, refunds, etc.). Read-only.
- Multi-currency. USD only.
- Pagination beyond 100 results. Most agencies fit.
- Webhooks for real-time updates. Polling-with-cache only.
- HubSpot, ClickUp, Toggl, or any other tool integration. Pattern is there; instantiation is a future spec each.
- An admin UI for the team to look at all customers' connections. Direct Supabase access for now.
- Encryption key rotation flow.
- Self-service signup / onboarding wizard. Connect button on settings page only.
- Stripe Connect Express/Custom (full payment facilitation). Standard read-only.

## v1 / v2 scope

### v1 (this spec)
- Reusable pattern: schema, OAuth flow, encryption, state CSRF, settings page
- Stripe instantiation: Connect OAuth read-only, Finance widget on `/dashboard`
- 1-hour Redis cache + manual Refresh button
- Settings page rewrite

### v2
- HubSpot, ClickUp, Toggl following the same pattern (one spec each, leveraging this framework)
- Stripe webhooks for instant cache invalidation
- Multi-currency
- Pagination for high-volume customers
- Encryption key rotation

### v3
- In-card empty-state "Connect Stripe" CTA (currently in non-goals)
- Onboarding wizard at signup
- Admin UI for team to see all customer connections
- Per-widget refresh cadence configurable

## Open questions for plan time

- Exact env var names — confirm against existing opsradar convention
- Whether to use `revealing-text` or `<Toast>` for the connection success banner
- Source of `currency`: hardcode USD or read from Stripe account's default_currency
- Whether `last_synced_at` updates on cache miss only or also on cache hit
- Where the connection state for `?connected=stripe` query param surfaces in the URL handling (page.tsx vs middleware)
- Stripe SDK version pinning (`stripe` npm package — currently which version is installed?)
- Confirm Phase 0 token names for the status pill colors
- Whether the Finance card on `/dashboard` shows a placeholder before connection or hides entirely

## Architecture diagram (one-page summary)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  CUSTOMER PLANE                                                           │
│                                                                           │
│  /dashboard/settings/integrations         /dashboard (Finance card)       │
│        │                                            │                     │
│        │ [Connect Stripe]                           │ Renders widget      │
│        ▼                                            ▼                     │
└──────────────────────────────────────────────────────────────────────────┘
         │                                            │
         │ 302 redirect                               │ fetch
         ▼                                            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  OPSRADAR SERVER                                                          │
│                                                                           │
│  /api/integrations/stripe/connect    /api/dashboard/finance               │
│        │                                            │                     │
│        │ create oauth_state row                     │ 1. session→user_id  │
│        │ build authorize URL                        │ 2. read integrations│
│        ▼                                            │ 3. Redis cache?     │
│  redirect → connect.stripe.com                      │ 4. decrypt token    │
│                                                     │ 5. stripe.api.call  │
│                                                     │ 6. map → contract   │
│                                                     │ 7. cache + return   │
│  /api/integrations/stripe/callback                  ▼                     │
│        │                                                                  │
│        │ validate state                                                   │
│        │ exchange code for token                                          │
│        │ encrypt + upsert integrations row                                │
│        ▼                                                                  │
│  redirect → /dashboard/settings/integrations?connected=stripe            │
└──────────────────────────────────────────────────────────────────────────┘
         │                                            │
         ▼                                            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  STRIPE                                                                   │
│                                                                           │
│  connect.stripe.com/oauth/*    api.stripe.com/v1/charges, /v1/invoices    │
│                                                                           │
│  Stores: ALL the customer's invoices, charges, customers, etc.            │
│  We: never copy this data. We just display it live.                       │
└──────────────────────────────────────────────────────────────────────────┘
```
