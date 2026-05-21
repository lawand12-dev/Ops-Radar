# OpsRadar Dashboard — Live-Data Design Spec

**Date:** 2026-05-09
**Owner:** Lawand
**Status:** Approved — ready for implementation planning

---

## Goal

Convert `/dashboard` from a static mock into a customer-facing single-pane-of-glass cockpit that pulls live data from the agency's connected tools via n8n, with no client business data persisted in OpsRadar's database.

## Audience & roles

Two roles, both consume the same dashboard with role-based scoping:

| Role | Sees |
|---|---|
| `agency` (your direct customer — agency owner / operator) | All their clients aggregated, with optional context switcher to focus on one client |
| `end_client` (the agency's own client) | Auto-scoped to their own `client_id`; cannot switch context |

**v1 ships agency role only.** End-client portal is v2.

## Hero positioning

**The dashboard answers one question first:** "Are my automations working, and what are they worth?"

Hero metric: **`$X saved this month`** (cost savings = sum of n8n executions × user-configured minutes-saved per workflow × user-configured hourly rate). Owners see ROI in the first 5 seconds.

This positions OpsRadar as an **automation ROI tracker**, not a generic agency BI tool. The other widgets exist as supporting context that proves the hero number is real.

## Architecture (locked)

Live pass-through via n8n with short Redis cache. **No client business data persisted in Supabase.**

```
Browser
  ↓ fetch('/api/dashboard/<widget>')
Next.js API route
  ├─ Resolve client_id from Supabase session
  ├─ Check Upstash Redis cache (key: `dash:<widget>:<client_id>`, TTL 180s)
  ├─ On miss: read encrypted token from Supabase, POST to n8n webhook
  └─ Cache response, return JSON
n8n workflow (one per widget)
  ├─ Webhook trigger
  ├─ HTTP node → 3rd-party API (Stripe, HubSpot, ClickUp, etc.)
  ├─ Function node → shape to widget contract
  └─ Respond
```

**Supabase stores:** auth users, encrypted OAuth tokens / API keys, integration metadata (`client_id`, `tool`, `connected_at`). It never stores deals, invoices, time entries, ad spend, or any other 3rd-party-tool business data.

**Cache rule:** every widget response is cached 180s by default. A `?fresh=1` query param bypasses cache for explicit user refresh; the bypass result is written back over the normal key.

## Page anatomy of `/dashboard`

Single scrollable cockpit page, top to bottom:

1. **Hero block** — `$X saved this month` headline + 3 sub-stats (hours saved, workflows running, errors caught) + delta vs last month
2. **Workflow Health strip** — counts of healthy / degraded / failing workflows + "Open monitor →" link out to the CTO's tool at `opstest.atta.codes` (do not replicate his UI inside `/dashboard`)
3. **Four supporting cards in a 2×2 grid:**
   - Marketing & Ads
   - Sales / CRM
   - Delivery / Projects
   - Finance

Each supporting card is condensed (2–3 KPIs + mini sparkline + "Deep dive →" link to the existing route, e.g. `/dashboard/financials`).

**Not in the main scroll:** Team, Clients, Settings, Reports — they remain accessible via sidebar as their own routes.

## Widget contracts

### Hero — Automation ROI
| Field | Source | Compute |
|---|---|---|
| `$ saved this month` | n8n executions × per-workflow `minutes_saved` × per-workflow `hourly_rate` | sum across all active workflows |
| Delta % | Same calc, prior period | `(current - prev) / prev` |
| Hours saved | n8n executions × `minutes_saved` | sum / 60 |
| Active workflows | n8n API: count active | direct |
| Errors caught | n8n API: failed-but-retried executions | direct |

**One-time config required:** for each workflow, the user must set `minutes_saved` per execution and `hourly_rate` for the work that automation replaces. Without this, hero falls back to raw counts only ("127 hours of automated work").

### Workflow Health strip
| Field | Source |
|---|---|
| Healthy / degraded / failing counts | n8n API: workflow status across last 24h |
| "Open monitor →" | Static link to `opstest.atta.codes/#/projects` |

### Marketing & Ads card
| Field | Source | Drill-in |
|---|---|---|
| Spend | Google Ads + Meta Ads APIs | `/dashboard/reports?tab=marketing` |
| ROAS | Stripe revenue ÷ ad spend (no per-deal attribution in v1) | same |
| Meetings booked | Calendly API | same |
| Sparkline | 7-day spend trend | same |

### Sales / CRM card
| Field | Source | Drill-in |
|---|---|---|
| Pipeline value | HubSpot/Pipedrive: sum of open deals | `/dashboard/clients` |
| New leads | HubSpot/Pipedrive: contacts created this period | same |
| Auto-created leads | Subset where `source = automation` (n8n tags it) | same |
| Sparkline | 14-day lead count | same |

### Delivery / Projects card
| Field | Source | Drill-in |
|---|---|---|
| Active projects | ClickUp/Asana | `/dashboard/projects` |
| On track / At risk | ClickUp/Asana: project status field | same |
| Overdue tasks | ClickUp/Asana: tasks past due_date | `/dashboard/tasks` |
| Hours tracked | Toggl/Harvest | `/dashboard/time-tracking` |

### Finance card
| Field | Source | Drill-in |
|---|---|---|
| Invoiced | Stripe + QuickBooks | `/dashboard/financials` |
| Paid | Stripe: succeeded invoices this period | same |
| Overdue | Stripe past_due + QuickBooks unpaid | same |
| Sparkline | 30-day collected revenue | same |

## Widget UI states

Every card handles all four states. **Never show a misleading zero** — disconnected, errored, and genuinely-empty must look distinct.

| State | Trigger | UI |
|---|---|---|
| Loading | First mount, no cache | Skeleton with shimmer |
| Connected + data | Cache hit or fresh fetch | Real values |
| Connected + empty | Tool returned 0 records | "No data yet for this period" |
| Not connected | No token in `integrations` table | "Connect [Tool] to see this" + connect button |
| Error | n8n call failed / 3rd-party API down | Red banner: "Stripe is temporarily unreachable. Last good fetch: 14m ago" + show stale data if available |

## File map

### New files
```
src/app/api/dashboard/
├── automation-roi/route.ts     ← hero block
├── workflow-health/route.ts
├── marketing/route.ts
├── sales/route.ts
├── delivery/route.ts
└── finance/route.ts

src/lib/
├── dashboard-fetch.ts          ← shared helper: cache + n8n call + error handling
└── integrations.ts             ← read encrypted tokens from Supabase
```

### New Supabase migration
```
integrations table
├── client_id (uuid, fk → auth.users)
├── tool (text: 'stripe' | 'hubspot' | 'clickup' | ...)
├── encrypted_token (text)
├── connected_at (timestamptz)
└── unique(client_id, tool)
```

### Files to rebuild
```
src/app/dashboard/page.tsx       ← becomes the new overview composition
                                   (hero + workflow health strip + 2×2 grid of cards)
```

### Files kept as-is (drill-in destinations)
```
src/app/dashboard/{projects,tasks,time-tracking,financials,clients,team,reports,settings}/
```
Their hardcoded sample data gets gradually replaced with live-fetch as each `/api/dashboard/*` route comes online.

## Reference widget — build first

**Finance card** is the reference implementation. Stripe has a clean, well-documented API; the widget is high-value; and Stripe is most agencies' default biller. Build end-to-end:

1. n8n workflow: webhook → Stripe API → shape → respond
2. `src/app/api/dashboard/finance/route.ts` with full lifecycle (auth → cache check → token read → n8n call → cache write → return)
3. UI states (loading, connected, empty, not-connected, error)
4. Connect-Stripe flow (OAuth or API key entry, store encrypted token in `integrations`)
5. Replace Finance card on `/dashboard` overview with live data

Once Finance works end-to-end, the other 5 widgets (and 8 drill-in routes) are mechanical copies of the same pattern.

## v1 / v2 / v3 scope cut

### v1 (this spec)
- Agency role only
- All 6 widgets on `/dashboard` overview
- Live data from all 4 tool categories (CRM, Payments, PM/time, Marketing/Ads)
- Drill-in routes use existing scaffolding, gradually getting live data
- Per-tool connect flow + token storage
- Per-workflow ROI config (minutes saved + $/hour) — required for hero

### v2
- End-client role + portal (role-based filtering, hidden sidebar entries, scoped data)
- Refresh button on each card (cache bypass)
- Per-client context switcher in the topbar (agency power-user feature)

### v3 (deferred until customer asks)
- Custom widget builder
- Email/Slack digest of dashboard
- Historical snapshots for tools whose APIs don't return ranges

## Non-goals

- Storing client business data (deals, invoices, etc.) in Supabase — explicitly rejected
- Replicating the CTO's workflow monitor inside `/dashboard` — links out only
- ROAS with per-deal revenue attribution in v1 — uses simpler period-level ratio
- Real-time push (websockets) — v1 is fetch-on-load + 180s cache
- Mobile-optimized layout — desktop-first; mobile is best-effort

## Open questions for implementation plan

- OAuth vs API-key per tool (each integration has different auth requirements; resolve per-widget during planning)
- Encryption-at-rest scheme for tokens in Supabase (likely `pgcrypto` + a server-side env key)
- n8n webhook authentication (shared secret? per-client signed URLs? resolve in plan)
- Where the per-workflow `minutes_saved` / `hourly_rate` config lives (Supabase table or n8n workflow tags)
