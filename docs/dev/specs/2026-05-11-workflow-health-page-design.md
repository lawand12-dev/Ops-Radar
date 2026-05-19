# Workflow Health Page — Connecting OpsRadar to chatv2

**Date:** 2026-05-11
**Owner:** Lawand
**Status:** Approved — ready for implementation planning
**Supersedes:** v2 / v3 sections of [2026-05-09-dashboard-hero-workflow-health-design.md](2026-05-09-dashboard-hero-workflow-health-design.md)
**Related:** [2026-05-09-dashboard-live-data-design.md](2026-05-09-dashboard-live-data-design.md) (different data path — external tools via n8n)

---

## Goal

Add a dedicated customer-facing page `/dashboard/workflow-health` that surfaces per-tenant n8n workflow status. Customer sees a compact status table with per-workflow drill-in. Data flows **live** from the customer's n8n through chatv2 (thin auth + proxy + normalize) to opsradar. The chatv2 origin is invisible to customers — no URLs, links, brand mentions, or breadcrumbs to it.

This is the v3 "in-dashboard drill-in" feature the 2026-05-09 hero spec deferred, now unblocked because chatv2 ships multi-tenant auth (commit `35fb221` on the `chatv2` branch).

## Integration model (the why)

This surface uses **team-managed credentials**, not customer-self-connect. The team adds each customer's n8n credentials into chatv2's admin; the customer does no technical setup for Workflow Health.

This is intentional and asymmetric to how other dashboard surfaces will work:

| Surface | Whose data | Integration model |
|---|---|---|
| **Workflow Health** (this spec) | Customer's n8n executions of **our** automations | **Team-managed** — we operate the automations, so we operate the connection |
| **Revenue / Leads / Tasks / Financials** (future spec) | Customer's own business data in their tools (Stripe, HubSpot, ClickUp, Toggl) | **Customer-self-connect** — they own those accounts, they choose to grant access via OAuth / API key, they can revoke any time |

The split mirrors ownership. We don't ask the customer for their Stripe key; they wouldn't (and shouldn't) trust us with it. They didn't build the n8n workflows we're monitoring, so it's natural that the connection to those workflows is on our side. Different surfaces, different trust boundaries.

The customer-self-connect model for business widgets is its own future spec; do not conflate the two.

## Storage model (the rule)

**The customer's tools own the data. We pass it through. We do not store it.**

| Layer | Stores |
|---|---|
| Customer's n8n | All workflow executions, status, history — owned by the customer, retained per their n8n settings |
| chatv2 (on the opsradar path) | **Nothing customer-derived.** Just credentials + tenant routing. Optional ≤60s transient Redis cache. |
| chatv2 (internal admin) | Continues running its scheduler + MySQL snapshots **for the team's own admin view at opstest.atta.codes only.** Not on the customer-facing path. Independent concern. |
| opsradar Supabase | Auth users + `chatv2_project_id` mapping. **No execution data. No business data. Ever.** |

If a customer wants their workflow data, they look at n8n. We display it live in the dashboard. We don't warehouse it.

## Non-goals (explicitly)

- SSO between opsradar and chatv2. opsradar talks to chatv2 server-to-server only.
- Any customer-facing write action (pause, retry, edit, acknowledge). Read-only v1.
- Self-service onboarding. Team adds clients manually.
- Replacing the existing OpenAI-based `/api/chat`. That stays.
- Touching the `/api/dashboard/automation-roi` route from the 2026-05-09 hero spec. It continues to use `/analytics` (global aggregate) for the main `/dashboard` hero block.
- Importing chatv2's UI. No iframes, no shared components.
- **Backfilling or storing customer execution data anywhere on the opsradar data path.** n8n is the source of truth; we live-fetch every request.
- Touching chatv2's existing internal scheduler / MySQL snapshots used for the team admin at opstest.atta.codes. Those stay running, untouched, on a separate path.

## The three planes

```
┌─ ADMIN PLANE (team only) ──────────────────────────────────────────────────┐
│  chatv2 admin @ opstest.atta.codes                                         │
│  • Add a client's n8n credentials                                          │
│  • Team's internal monitoring view (uses chatv2's own scheduler / MySQL    │
│    — independent of the opsradar path)                                     │
│  → Never linked from opsradar. Never named to customers.                   │
└────────────────────────────────────────────────────────────────────────────┘
                                  │ team-owned config
                                  ▼
┌─ DATA PLANE (machines) ────────────────────────────────────────────────────┐
│                                                                            │
│  [Customer's n8n]  ◄── LIVE FETCH each request ──  [chatv2 (thin proxy)]  │
│                                                          │                 │
│                                                          │  no storage of  │
│                                                          │  customer data  │
│                                                          │  on this path   │
│                                                          │  (optional 30s  │
│                                                          │   Redis cache)  │
│                                                          ▲                 │
│                                            GET /service/projects/:id       │
│                                            /workflows/health               │
│                                            Authorization: Bearer ${KEY}    │
│                                            (server-to-server only)         │
│                                                          │                 │
│                                            [opsradar Route Handler]        │
│                                            reads user.id → mapping table   │
│                                            → chatv2_project_id             │
└────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─ CUSTOMER PLANE (only thing customers see) ───────────────────────────────┐
│  opsradar.com /dashboard/workflow-health                                   │
│  • Compact status table, row expand for last 20 executions                 │
│  • 30s auto-refresh + manual Refresh                                       │
│  • Read-only, no chatv2 mentions                                           │
└────────────────────────────────────────────────────────────────────────────┘
```

## Onboarding flow (manual, team-driven)

| # | Actor | Action | Surface |
|---|---|---|---|
| 1 | Customer | Sign up / log in | opsradar.com (Supabase auth) |
| 2 | Team | Add the customer's n8n credentials to chatv2 (already supported in chatv2's admin) | opstest.atta.codes admin |
| 3 | Team | Insert one row in opsradar Supabase: `(customer_user_id → chatv2_project_id)` | SQL / Supabase Studio |
| 4 | Customer | Open `/dashboard/workflow-health` — data live-fetches from n8n via chatv2 | opsradar.com |

No backfill step. No customer self-service. The team controls who sees what by populating the mapping. n8n already has the customer's full history retained per its own settings.

## chatv2 changes

### New service endpoint — live-fetch from n8n, no storage

`GET /service/projects/:projectId/workflows/health`

- Auth: header `Authorization: Bearer ${CHATV2_SERVICE_API_KEY}` — checked by a new service-auth middleware. No user session involved.
- **Implementation: live pass-through.** The handler calls n8n's API (reusing chatv2's existing `n8n-client.ts`) for the project's workflows + recent executions, computes status on the fly, returns. **No reads from `workflow-health-repository`. No writes anywhere.**
- Optional Redis cache (30s TTL) keyed by `(projectId)` to absorb the 30s page-poll cadence. Transient memory only; not "storage" of customer data.
- Returns:

```ts
type WorkflowHealthListResponse = {
  project_id: string;
  workflows: Array<{
    workflow_id: string;
    name: string;
    status: 'healthy' | 'degraded' | 'failing' | 'unknown';
    last_run_at: string | null;        // ISO
    last_error_summary: string | null; // truncated, customer-safe
    open_alerts_count: number;         // derived live: workflows with a failed run in last hour
    recent_executions: Array<{
      execution_id: string;
      status: 'success' | 'failure' | 'running' | 'canceled';
      started_at: string;
      duration_ms: number | null;
      error_category: string | null;   // computed via existing error-classifier
      error_summary: string | null;
    }>; // capped at 20 — n8n's listExecutions with limit=20
  }>;
};
```

- 401 on missing/invalid bearer
- 404 on unknown projectId (must not differentiate from 403; never leak whether a project exists for a different tenant)
- 502 if n8n is unreachable; opsradar handles fallback
- 5xx on other internal failures

### Status computation (on the fly)

`status` is derived from the most recent ~10 executions returned by n8n:
- `healthy` — last 5+ runs all `success`
- `degraded` — some failures in last 10 but most recent is `success`
- `failing` — most recent run is `failure`
- `unknown` — no executions in n8n yet, or n8n unreachable

This logic moves into a small pure helper that can be unit-tested independently.

### What does NOT change in chatv2

- Existing scheduler (`startMonitoringScheduler`) keeps running for the team's admin view.
- Existing `workflow-health-repository` / MySQL snapshots stay in place — they power opstest.atta.codes, not opsradar.
- Existing auth, project model, n8n credential storage, alert classification — all reused.

### New env vars

```
CHATV2_SERVICE_API_KEY=<shared secret>
```

### Files (new)

```
src/modules/monitoring/service-routes.ts          — Hono route group, live-fetch handler
src/modules/monitoring/service-auth-middleware.ts — bearer check
src/modules/monitoring/health-derive.ts           — pure status-computation helper + tests
```

### Files (modified)

```
src/server.ts                                     — mount /service routes
src/config/env.ts                                 — add CHATV2_SERVICE_API_KEY
```

## opsradar changes

### Supabase migration

New table `client_chatv2_mapping`:

```sql
create table public.client_chatv2_mapping (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chatv2_project_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.client_chatv2_mapping enable row level security;

create policy "owner reads own mapping"
  on public.client_chatv2_mapping
  for select
  using (auth.uid() = user_id);

-- writes restricted to service role (Supabase Studio / SQL only)
```

Then regenerate `src/lib/database.types.ts` via `npm run types:supabase`.

### New Route Handler

`src/app/api/dashboard/workflow-health/route.ts`

- GET only
- `revalidate = 30` (matches the 30s auto-refresh cadence; protects chatv2 from extra calls when multiple tabs are open)
- Reads session via `supabase-server.ts`
- Looks up `chatv2_project_id` from mapping table (server-side, service role NOT required — RLS allows owner read)
- Calls `${CHATV2_API_URL}/service/projects/${projectId}/workflows/health` with `Authorization: Bearer ${CHATV2_SERVICE_KEY}`
- Maps chatv2 response → page contract (same shape; pass-through). Pass-through is intentional — no derived logic in v1
- Error handling:
  - No mapping row → 200 with `{ status: 'not_enrolled' }` so the UI shows the friendly "Workflow monitoring not enabled for your account" state
  - chatv2 unreachable / 5xx → 200 with `{ status: 'unavailable' }` plus server-side error log. Never propagate chatv2 hostnames in client-visible error text
  - chatv2 401 → 500 in opsradar (config issue on our end). Logged loudly
- Browser **never** sees the chatv2 URL, service key, or project id

### New page

`src/app/dashboard/workflow-health/page.tsx`

UI:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Workflow Health                                          [↻ Refresh]    │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Status   Workflow                Last run    Errors  Alerts       │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │  ●        Lead Intake Bot         2m ago      —       0          ▾ │  │
│  │  ●        Invoice Reminder        1h ago      Rate    3          ▾ │  │
│  │  ●        Client Reporting        12m ago     —       0          ▾ │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

- Compact row per workflow: status dot, name, last run (relative time), last-error summary (truncated), open alerts count, expand caret
- Row click → expand: last 20 executions in a sub-table (timestamp, duration, status, error category, error summary)
- Top-right Refresh button forces a fresh fetch
- Auto-refresh every 30s via SWR or `setInterval` (page-level, pauses when tab hidden)
- Phase 0 design tokens (Indigo `#4F46E5`, Instrument Serif heading, Inter Tight body, JetBrains Mono for monospace cells)
- Status dot colors: healthy = success token, degraded = warning, failing = danger, unknown = muted

States:
- **Loading** — skeleton matching the table
- **Not enrolled** — friendly card: "Workflow monitoring isn't enabled for your account yet. Contact your account manager to get set up." No chatv2 mention
- **Empty** (enrolled but zero workflows) — "No workflows are being monitored yet. Once your automations are connected, they'll show here."
- **Unavailable** — banner: "Workflow data is temporarily unavailable. We're already on it." Retry button. Stale data still rendered below if any cached
- **Error in a single row** — row still renders; error chip explains the issue

### Sidebar change

Add a fifth section to `src/app/dashboard/_components/sidebar.tsx`:

```ts
{
  tag: 'GUARD',
  items: [
    { label: 'Workflow Health', href: '/dashboard/workflow-health', icon: ShieldCheck },
  ],
},
```

Position: between `OBSERVE` and `WORKSPACE` (matches AIOS pillar order).

### New env vars (opsradar)

```
CHATV2_API_URL=https://opstest.atta.codes
CHATV2_SERVICE_KEY=<shared secret — same value as chatv2's CHATV2_SERVICE_API_KEY>
```

Both server-only. Never `NEXT_PUBLIC_*`.

### Files (new)

```
supabase migration                                                  — client_chatv2_mapping
src/app/dashboard/workflow-health/page.tsx                          — page
src/app/dashboard/workflow-health/_components/health-table.tsx      — table + row expand
src/app/dashboard/workflow-health/_components/states.tsx            — loading/empty/error states
src/app/api/dashboard/workflow-health/route.ts                      — proxy route
```

### Files (modified)

```
src/app/dashboard/_components/sidebar.tsx                           — add GUARD section
src/lib/database.types.ts                                           — regenerated
.env.local (gitignored)                                              — add 2 vars
```

## Page-level data flow

```
1. Customer navigates to /dashboard/workflow-health
2. Page mounts → SWR hook calls /api/dashboard/workflow-health
3. Route Handler:
     a. createServerSupabaseClient() → getUser()
     b. select chatv2_project_id from client_chatv2_mapping where user_id = uid
     c. if missing → return { status: 'not_enrolled' }
     d. fetch CHATV2_API_URL + /service/projects/{id}/workflows/health
        with Authorization: Bearer CHATV2_SERVICE_KEY
     e. parse, validate shape (zod), return { status: 'ok', data }
4. Page renders the table
5. setInterval / SWR refresh every 30s. Tab hidden → pause
6. Refresh button → fetch with cache-busting query param
```

## Why the separation matters (constraint summary)

1. **Customer never knows chatv2 exists.** All they see is the OpsRadar table.
2. **opstest.atta.codes is internal-only.** Not linked, not named, not referenced in error messages.
3. **Service key is the only auth between opsradar and chatv2.** No user tokens, no shared sessions, no shared cookies, no shared DB.
4. **Team is the gatekeeper.** Mapping rows are inserted by team only.
5. **No customer data persists on the opsradar path — anywhere.** n8n holds the truth. chatv2 is a thin live-fetch proxy on this path (no storage, optional 30s transient cache). opsradar is presentation only. This is the same rule the 2026-05-09 live-data spec applies to all other dashboard widgets.

## Failure modes

| Scenario | Behavior |
|---|---|
| No mapping row for user | Page renders "Not enrolled" state |
| chatv2 5xx / timeout / unreachable | Page renders "Unavailable" banner; logs error server-side |
| chatv2 401 (bad service key) | 500 in opsradar route, loud server-side log; never surfaced to customer |
| chatv2 404 (project_id stale) | Same as "Not enrolled" — never differentiate (avoid tenant probing) |
| n8n unreachable from chatv2 | chatv2 returns 502; opsradar renders "Workflow data temporarily unavailable" banner. No fallback data — we don't store. |
| n8n returns 0 workflows for the tenant | Page renders empty state ("No workflows are being monitored yet") |
| Customer's n8n rate-limits chatv2 | chatv2 caches successful responses 30s (transient Redis); during throttle window, serves last successful response if still in cache, otherwise the "Unavailable" banner |
| Network error during 30s poll | Silent retry on next tick; banner only on 3 consecutive failures |
| Browser tab backgrounded | Stop polling (`visibilitychange`) |

## Live-fetch implications

| Concern | Mitigation |
|---|---|
| Every page load / poll hits n8n | 30s Redis cache in chatv2 absorbs the poll cadence — n8n sees ~1 request per tenant per 30s regardless of how many tabs are open |
| n8n rate limits | Self-hosted n8n: none. n8n Cloud Starter: 100 req/min — at 1 req/30s we use 2 req/min. Safe. |
| Slower than reading a local DB | n8n's `listExecutions` typically returns in 100-500ms. With Redis cache, only 1 in N requests pays that cost. |
| n8n availability is now a hard dependency | Acceptable — n8n is the customer's source of truth anyway. If their n8n is down, their automations are also down, and "Unavailable" is the truthful status |
| Can't compute long-term trends without storage | True. Trends are explicitly deferred to v2; when needed, they're either live-fetched at larger scale or use n8n's own analytics if it exposes them |

## v1 / v2 scope

### v1 (this spec)
- Per-tenant `GET /service/projects/:id/workflows/health` on chatv2 — live-fetch from n8n, no storage
- Supabase mapping table + RLS
- `/api/dashboard/workflow-health` Route Handler in opsradar
- `/dashboard/workflow-health` page with compact table + row expand + 30s refresh
- GUARD section in sidebar
- 30s transient Redis cache in chatv2 (TTL only, no persistence)

### v2 (deferred)
- "View full history" link per workflow → live-fetched paginated timeline from n8n (no storage; just deeper queries)
- Per-workflow trend computation — still live-fetched, larger n8n query
- Customer-side "Acknowledge alert" write endpoint
- Self-service onboarding (customer connects their own n8n through OpsRadar UI)

### v3 (deferred)
- Real-time push via SSE from chatv2 (chatv2 subscribes to n8n webhooks if available, fans out to opsradar)
- Multi-workflow correlation views

## Open questions for plan time

- Exact n8n API endpoints + pagination shape to fetch "workflows + recent executions" in the fewest calls
- Whether `recent_executions` cap of 20 happens in n8n query (`limit=20`) or chatv2 trim — prefer the former
- Status icon set: confirm Phase 0 token names for success/warning/danger dots
- Whether SWR or a `setInterval` + `fetch` hook is the right primitive (SWR is in the stack already; confirm at plan time)
- Whether the GUARD sidebar item needs an icon other than `ShieldCheck`
- Whether the 30s Redis cache TTL is the right setting or should be tunable per-tenant
