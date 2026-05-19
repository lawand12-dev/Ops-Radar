# Dashboard Redesign — Design

**Date:** 2026-05-15
**Status:** Approved, ready for implementation plan
**Supersedes:** `2026-05-15-dashboard-auth-gate-design.md` (auth gate folded into §8 of this spec)
**Scope:** Replace the partially-live 11-page dashboard with a 4-route auth-gated cockpit that shows only real per-customer data, surfaces automation outcomes alongside business outcomes, and ships with AI-generated narrative cards as a first-class primitive.

---

## 1. Problem

The dashboard audit (2026-05-15) found:

1. **Public access.** `/dashboard` has no middleware, no layout guard. Anyone with the URL sees the UI. Only `/api/dashboard/*` routes self-gate via `getCurrentUserId()`.
2. **Static fakes everywhere.** 8 of 11 dashboard pages render hardcoded JSX arrays — `clients/`, `financials/`, `projects/`, `reports/`, `tasks/`, `team/`, `time-tracking/`, `settings/` — that show the same fake data to every viewer.
3. **Fake fallback on live pages.** `src/app/dashboard/page.tsx` falls back to a `FALLBACK_METRICS` hardcoded object when its API errors, so logged-in customers with no integrations connected see made-up numbers.
4. **No empty states.** When an integration isn't connected, nothing tells the customer; widgets just render fakes.
5. **No unique-to-us proof.** Time Saved, automation ROI, workflow leaderboards — the moat — aren't surfaced as first-class units. The dashboard reads like a generic BI scaffold.

For a product priced as a managed-ops service for marketing/AI agencies, this is incompatible with what customers pay for. Onboarding a real customer today via `/admin/onboard-customer` would result in their first login showing fake clients, fake invoices, fake team members — destroying trust on contact.

## 2. Goal

A 4-route auth-gated dashboard whose hero is a unified executive cockpit. Every number is real per-customer data fetched live. Two pillar pages deep-dive operations (COO) and business (CEO) data. AI narrative cards in every section. Integration-not-connected becomes an explicit empty state. Stale-cache and soft errors keep the cockpit alive when an upstream fails. **No fake data ever shown to a logged-in customer.**

## 3. Non-goals

- No customer-side dashboard customization. No "edit dashboard" mode. No drag-and-drop widgets. Every layout is fixed and opinionated.
- No new chart-building primitives. We are not Tableau and are not trying to be.
- No customer-extensible integration list. New tools (QuickBooks, Linear, Mailchimp, etc.) are added by OpsRadar engineering on roadmap, not by customers via a settings checkbox.
- No multi-tenant team/role concepts beyond what Supabase auth exposes today.
- No mobile-first optimizations. Desktop cockpit ships first; mobile is a follow-up spec.
- No persistence of customer business data in OpsRadar's DB. Live-fetch via Redis-cached APIs only.
- No self-signup or customer-side account creation. Onboarding remains admin-driven via `/admin/onboard-customer`.

## 4. Strategic frame (informs every design decision below)

OpsRadar is a service-delivered, vertical-tuned operations control center for marketing and AI agencies. Its competitive moat is the **three-layer bundle**:

- **L1 Observation** — the cockpit you're reading. Every BI tool (Tableau, Power BI, Domo, Databox, Looker, Grafana) does this.
- **L2B Execution** — n8n workflows running on the CTO's chatv2 server. Every automation tool (Zapier, Make, n8n itself, Workato) does this.
- **L3 Reasoning** — AI-generated English briefings and entity-named alerts. Emerging AI-agent products (Lindy, Relevance, Stack) do this.

No single competitor in the 35+ companies surveyed ships all three. The dashboard's job is to make the bundle visible. Every section in this spec exists because it expresses one of those three layers; sections that only express what a generic BI tool can show are deprioritized in favor of sections that prove the bundle.

## 5. Architecture

```
                  CUSTOMER · CEO/COO of marketing or AI agency
                  Magic-link login → cockpit. No SQL, no charts.
                                       │
                                       │  HTTPS + Supabase session cookie
                                       ▼
   LAYER 1 — OBSERVATION (the OpsRadar Next.js 16 app on Vercel)
     Routes: /login · /dashboard · /dashboard/automations
             /dashboard/business · /dashboard/integrations
     Gate:   src/middleware.ts (NEW) — matches /dashboard/:path* · fail-closed
                                       │
                                       │  per-customer live fetch
                                       │  Redis-cached (TTL 60s–1h)
                                       ▼
   LAYER 2A — INTEGRATION DATA              LAYER 2B — EXECUTION DATA
   Model C, AES-256-GCM in Supabase         n8n on CTO's chatv2 server
   Stripe · HubSpot · Apollo · Calendly      chatv2 service API · CTO /analytics
                                       │
                                       ▼
   LAYER 3 — REASONING
     OpenAI (GPT-4o) via /api/dashboard/narrative (NEW)
     Persona-tuned (CEO vs COO) English briefings + entity-named alerts
                                       │
                                       ▼
   LAYER 4 — PERSISTENCE (minimal — never customer business data)
     Supabase: auth.users · integrations (encrypted) · automation_config · agency_submissions
     Upstash Redis: per-customer TTL cache
```

Admin sidecar (Lawand only): `/admin/onboard-customer` (Supabase user + automation_config + magic-link via Resend); `/admin/data` + `/admin/auth` (existing, unchanged).

## 6. Design principles (locked, non-negotiable)

These constrain every implementation decision downstream. If a future change violates one of these, it is wrong:

1. **Pre-built, opinionated, no customization.** No "edit dashboard" mode. Ever. Customers don't pick which widgets show up.
2. **AI narrative card is a non-optional primitive.** Every major section ships with one. It is the unit, not the chart.
3. **Time Saved is the hero metric.** It is the only metric only OpsRadar can show. Lead the cockpit with it forever.
4. **Alerts name real entities and link to action.** "Deal Acme stuck 21 days" → deep-link to `/dashboard/business`. "Stripe re-auth needed" → deep-link to `/dashboard/integrations`. No threshold-only alerts.
5. **Integration list is curated by OpsRadar, not extensible by customers.** Adding new tools is roadmap, not a settings checkbox.
6. **Empty states are connect-CTAs, never errors.** "Connect Stripe to see revenue" is the worst case the customer ever sees on a not-yet-connected integration.
7. **No fake data ever rendered to a logged-in customer.** `FALLBACK_METRICS` is deleted in this PR. No future fallback constants may be added.

## 7. Routes — IA after the redesign

After this spec ships, the dashboard tree is:

```
/login                              — existing, no change
/dashboard                          — REWRITTEN: full cockpit (replaces partial-live hub)
/dashboard/automations              — NEW: COO deep-dive (folds in old /workflow-health)
/dashboard/business                 — NEW: CEO deep-dive
/dashboard/integrations             — RENAMED from /dashboard/settings/integrations
/admin/*                            — unchanged
```

**Deleted** (8 routes, all hardcoded JSX with no real data source today):
- [src/app/dashboard/clients/](src/app/dashboard/clients/)
- [src/app/dashboard/financials/](src/app/dashboard/financials/) — real revenue lives in `/business`
- [src/app/dashboard/projects/](src/app/dashboard/projects/)
- [src/app/dashboard/reports/](src/app/dashboard/reports/)
- [src/app/dashboard/tasks/](src/app/dashboard/tasks/)
- [src/app/dashboard/team/](src/app/dashboard/team/)
- [src/app/dashboard/time-tracking/](src/app/dashboard/time-tracking/)
- `src/app/dashboard/settings/page.tsx` (the profile/notifications page)
- `src/app/dashboard/workflow-health/` (content folded into `/automations`)

**Moved:** `src/app/dashboard/settings/integrations/` → `src/app/dashboard/integrations/` (URL changes from `/dashboard/settings/integrations` to `/dashboard/integrations`; sidebar link and any in-app references updated; consider 301 redirect for old URL).

## 8. Auth gate (folded in from the parked auth-gate spec)

NEW file: `src/middleware.ts` at the project root.

- **Matcher:** `['/dashboard/:path*']`. Excludes `/login`, marketing pages, `/admin/*`, all `/api/*`.
- **Auth check:** `@supabase/ssr` `createServerClient` with `NextRequest`/`NextResponse` cookie adapter → `supabase.auth.getUser()` (NOT `getSession()` — `getUser()` revalidates with the auth server and is safe against forged cookies).
- **Logged-out OR error:** 302 redirect to `/login?redirectTo=<encoded pathname + search>`. Fail-closed on any exception.
- **Logged-in:** `NextResponse.next({ request })` with refreshed cookies (helps downstream API routes that call `getCurrentUserId()`).
- **Env vars:** reuses existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. No new env vars.
- **DEV_CLIENT_ID fallback:** middleware does **not** honor it. Always requires a real session, in every environment. `DEV_CLIENT_ID` remains a server-side dev convenience for API routes only.
- **`/login` bounce-when-logged-in:** out of scope.
- **No changes** to [src/app/login/page.tsx](src/app/login/page.tsx) — `?redirectTo=` is already read at line 29.
- **Existing `/api/dashboard/*` `getCurrentUserId()` 401 checks stay** as defense-in-depth.

## 9. `/dashboard` — the cockpit (the daily home)

Sections, top to bottom:

### 9.1 Header (sidebar + topbar)
- **Sidebar:** four nav items in order — Overview · Automations · Business · Integrations. Footer: user avatar + name + role (CEO/COO label from admin onboarding form).
- **Topbar:** breadcrumb ("Overview"), live-sync indicator (green dot + "synced Nm ago").

### 9.2 Greeting
"Good morning, {first_name}." + today's date + ISO week number. (Time-of-day word picked from local time.)

### 9.3 KPI strip — six cards in a single row
Each card: small label, big number, delta vs prior period, mini sparkline (last 8 data points).

| KPI | Source | Empty state |
|---|---|---|
| Time saved · 7d | `/api/dashboard/automation-roi` | dim "Connect n8n" card |
| MRR · current | `/api/dashboard/finance` | dim "Connect Stripe" card |
| Active pipeline · current | `/api/dashboard/sales-live` (fallback to `/sales`) | dim "Connect HubSpot" card |
| New prospects · 7d | `/api/dashboard/marketing` | dim "Connect Apollo" card |
| Booked calls · 7d | `/api/dashboard/marketing` | dim "Connect Calendly" card |
| Workflow success rate · 7d | `/api/dashboard/workflow-health` | dim "Automations not enrolled" |

### 9.4 Alerts ribbon — up to three alerts side-by-side
Each: severity color (yellow `Watch` / red `Needs you` / neutral `Heads-up`), one-sentence entity-named message, deep-link button.

Alert generation: **deterministic rule-based** server-side helper (NOT AI) scanning live Layer-2 data. Rules:

- Stripe API responded with auth/permission error → `Needs you · Stripe re-auth required` → `/dashboard/integrations`
- Any integration `errors_24h > 5` → `Watch · {Tool} elevated error rate` → `/dashboard/automations`
- HubSpot deal in same stage > 14 days AND deal value > $5,000 (configurable constant in `dashboard-alert-rules.ts`) → `Heads-up · Deal {name} stuck N days` → `/dashboard/business`
- Failed n8n workflow with no auto-recovery within 30min → `Needs you · Workflow {name} failing` → `/dashboard/automations`
- Calendly bookings in 7d = 0 while pipeline > 0 → `Heads-up · No calls booked this week` → `/dashboard/business`

Top-3 by severity (Needs you > Watch > Heads-up) surfaced. Cached 5min per user.

### 9.5 Hero card + narrative panel (side-by-side, ~60/40 split)

**Hero card (left):**
- Label: "Estimated savings · 7d"
- Value: `${automation_roi.hours_saved × $50/hr}` (operator rate constant)
- Subtitle: "{N} hours · automations carrying their weight"
- 8-week sparkline along the bottom

**AI narrative panel (right):**
- Title: "This week's briefing" + small "AI · refreshed hourly" badge
- 2–3 short paragraphs of plain English summarizing business state, automation impact, watch-outs
- Generated by `/api/dashboard/narrative` (NEW — §13.1)
- Cached 1h per (user_id, persona) in Redis

### 9.6 Integration health strip — single horizontal row
Six cells across, each: small dot (green = healthy, yellow = errors elevated, grey = not connected), tool name, last-sync time (or "connect →" if grey).

Slots: Stripe · HubSpot · Apollo · Calendly · n8n · 1 placeholder (e.g. QuickBooks) to hint the list grows.

### 9.7 Cross-pillar activity feed (left, ~60%) + pillar CTA cards (right, ~40%)

**Recent activity feed (left):**
- Up to 10 events in time-descending order, max 24h old
- Event types: Stripe charge (`$` icon) · HubSpot deal win/loss/stage-change · n8n workflow run (`▶`) · Calendly booking · Integration incident (recovered or alert)
- Each row: icon · entity-named message · relative timestamp ("8m", "1h")
- Data: NEW `/api/dashboard/activity` endpoint (§13.2)

**Two pillar CTAs (right, stacked):**
- Card 1: **Automations** with persona tag "COO view" — 3 mini-KPIs (Runs / Success / Caught) + CTA "View leaderboard, incidents, ROI →" linking to `/dashboard/automations`
- Card 2: **Business** with persona tag "CEO view" — 3 mini-KPIs (MRR / Pipeline / Calls) + CTA "View revenue, sales, marketing detail →" linking to `/dashboard/business`

## 10. `/dashboard/automations` — COO deep-dive

### 10.1 KPI row (4 cards)
- Time saved · 7d
- Executions · 7d
- Success rate · 7d
- Incidents caught · 7d

Same card component as cockpit KPI strip.

### 10.2 Narrative + Incidents (grid 60/40)

**Left — "This week, at a glance":** AI narrative card, COO-tuned prompt ("operations briefing for marketing-agency COO; focus on what ran, what broke, what to do"). 2–3 paragraphs from `/api/dashboard/narrative?persona=coo`.

**Right — Recent incidents:** Up to 5 most recent incidents.
- Each row: relative timestamp, entity message ("Apollo enrich · timeout · retried 3×"), status pill (`recovered` green / `needs you` red).
- Source: derived from `/api/dashboard/workflow-health` execution data (failures) and `/api/dashboard/backfill-complete` history if available.

### 10.3 Workflow leaderboard (single panel, full width)
Table sorted by hours-saved descending:

| Workflow | Runs (7d) | Success rate | Hours saved | $ saved | Status |

Sources: `/api/dashboard/workflow-health` + `/api/dashboard/automation-roi`. If neither is enrolled (no chatv2 mapping for this customer) → full-page empty state: "Your automations aren't enrolled in OpsRadar yet. Contact your account manager to get connected." (matches existing `not_enrolled` response from `/api/dashboard/workflow-health`).

## 11. `/dashboard/business` — CEO deep-dive

### 11.1 KPI row (4 cards)
- MRR (Stripe)
- Active pipeline value (HubSpot)
- New prospects · 7d (Apollo)
- Booked calls · 7d (Calendly)

### 11.2 Narrative + Alerts (grid 60/40)

**Left — "This week's business pulse":** AI narrative card, CEO-tuned prompt ("revenue + pipeline + growth briefing for marketing-agency CEO; lead with money, name risks"). From `/api/dashboard/narrative?persona=ceo`.

**Right — Current alerts:** Up to 5 active business-side alerts (stuck deals, week-over-week conversion drops, integration disconnected, etc.). Same deterministic rule engine as cockpit alerts ribbon, filtered to business-side rules only.

### 11.3 Per-tool sections (stacked, full width each)

Each section is a card with: tool name + logo + last-sync time, 3–4 KPIs in a row, sparkline of headline metric (8 weeks), drill-down table (last 10–20 rows).

| Section | KPIs | Sparkline | Drill-down table | Source |
|---|---|---|---|---|
| Revenue (Stripe) | MRR, last-30d gross, top-customer-by-spend, churn-this-month | MRR over 8 weeks | Recent charges: customer · amount · date | `/api/dashboard/finance` |
| Sales pipeline (HubSpot) | Open deals, pipeline $, win rate, stuck deals (>14d) | Pipeline $ over 8 weeks | Open deals: stage · value · last-activity · days-stuck | `/api/dashboard/sales-live` |
| Prospects (Apollo) | Added 7d, enriched 7d, replied 7d | Adds over 8 weeks | Recent prospects: name · company · status | `/api/dashboard/marketing` |
| Bookings (Calendly) | Booked 7d, no-shows 7d, upcoming 7d, conversion-from-prospect | Bookings over 8 weeks | Upcoming: name · time · source | `/api/dashboard/marketing` |

When a tool is not connected → that single section renders the not-connected empty state (§12) inline, in place of the full card. Page continues to render other connected sections normally.

## 12. Empty / connect states (three-state pattern, locked)

Every widget has exactly **three states**. There is no fourth.

1. **Connected + has data** → render real numbers.
2. **Connected + no data yet** → "No activity yet this week" (single line, subtle muted text, not an error). Widget keeps its shape.
3. **Not connected** → dim card with:
   - Tool logo (small, monochrome)
   - One sentence: "Connect Stripe to see your revenue."
   - Primary button: "Connect Stripe" → `/dashboard/integrations?tool=stripe`

`FALLBACK_METRICS` in [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx) is **deleted** in this PR. No new fallback constants may be introduced anywhere in `src/app/dashboard/`.

## 13. Fallback behavior when an upstream fails

For every `/api/dashboard/*` endpoint, the consuming widget renders one of three things on error:

1. **Cached value < 24h old in Redis** → render the cached value with a `Last synced Nh ago · retrying` badge below the card.
2. **No cache OR cache > 24h** → render widget in **soft error state**: ⚠ icon, single line ("Couldn't reach Stripe. We'll retry shortly."), small retry-now button.
3. **Never blank the whole page.** Errors are widget-scoped.
4. **Never show fake numbers.** Stale-but-real is OK; fabricated is not.

For the AI narrative card specifically: if `/api/dashboard/narrative` fails, the narrative panel renders "Briefing temporarily unavailable" and the rest of the page renders normally. Hero card and KPI strip continue to show their own real numbers.

## 14. New API routes

### 14.1 `/api/dashboard/narrative` (NEW)

- **Inputs:** `?persona={ceo|coo|both}` query param. Defaults to `both`.
- **Behavior:** Reads outputs of `/api/dashboard/metrics`, `/automation-roi`, `/workflow-health`, `/finance`, `/sales-live`, `/marketing` in parallel (server-side fetch). Sends the aggregate to OpenAI GPT-4o with a persona-tuned prompt template.
- **Returns:** `{hero: string, sections: {automations: string, business: string}, generated_at: ISO8601}`
- **Caching:** Redis cached 1h per `(user_id, persona)`.
- **Auth:** `getCurrentUserId()`; 401 if no session.
- **Cost target:** ~$0.01/cockpit-load.
- **Failure mode:** Returns `{status: 'unavailable', message}` with HTTP 200. Caller renders fallback string.

### 14.2 `/api/dashboard/activity` (NEW)

- **Inputs:** none.
- **Behavior:** Aggregates events from Layers 2A + 2B in parallel: latest 5 Stripe charges, 5 HubSpot deal transitions, 5 n8n executions (from workflow-health), 5 Calendly bookings, recent integration incidents. Merges, sorts descending by timestamp, returns top 10.
- **Returns:** `{events: [{type, icon, entity_label, message, source, timestamp}], generated_at}`
- **Caching:** Redis cached 60s per `user_id`.
- **Auth:** `getCurrentUserId()`; 401 if no session.

## 15. Files touched (high-level inventory)

**NEW:**
- `src/middleware.ts`
- `src/app/api/dashboard/narrative/route.ts`
- `src/app/api/dashboard/activity/route.ts`
- `src/app/dashboard/automations/page.tsx`
- `src/app/dashboard/business/page.tsx`
- `src/app/dashboard/_components/cockpit-kpi-strip.tsx`
- `src/app/dashboard/_components/cockpit-alerts-ribbon.tsx`
- `src/app/dashboard/_components/cockpit-hero-narrative.tsx`
- `src/app/dashboard/_components/cockpit-integration-health.tsx`
- `src/app/dashboard/_components/cockpit-activity-feed.tsx`
- `src/app/dashboard/_components/pillar-cta-card.tsx`
- `src/app/dashboard/_components/empty-state-connect.tsx`
- `src/app/dashboard/_components/narrative-card.tsx`
- `src/app/dashboard/_components/widget-fallback.tsx`
- `src/lib/dashboard-alert-rules.ts`

**REWRITTEN:**
- `src/app/dashboard/page.tsx` — completely replaced with cockpit composition; `FALLBACK_METRICS` removed
- `src/app/dashboard/layout.tsx` — sidebar nav reduced to 4 items
- `src/app/dashboard/_components/sidebar.tsx` — drop 7 nav items

**DELETED:**
- `src/app/dashboard/clients/`
- `src/app/dashboard/financials/`
- `src/app/dashboard/projects/`
- `src/app/dashboard/reports/`
- `src/app/dashboard/tasks/`
- `src/app/dashboard/team/`
- `src/app/dashboard/time-tracking/`
- `src/app/dashboard/settings/page.tsx`
- `src/app/dashboard/workflow-health/page.tsx`

**MOVED:**
- `src/app/dashboard/settings/integrations/` → `src/app/dashboard/integrations/`

## 16. Test plan (manual — no test runner configured)

Against `npm run dev` with a test customer that has Stripe + HubSpot connected (Apollo + Calendly not yet, to exercise empty states):

1. **Logged-out access:** Visit `/dashboard`, `/dashboard/automations`, `/dashboard/business`. Expect: 302 to `/login?redirectTo=…`.
2. **Login flow:** From `/login?redirectTo=/dashboard/business`, complete magic-link login. Expect: bounce to `/dashboard/business`.
3. **Cockpit renders:** Visit `/dashboard`. Expect: KPI strip shows 6 cards — 4 real numbers (Time Saved, MRR, Pipeline, Success Rate) + 2 dim "Connect" cards (Prospects, Calls). Alerts ribbon shows real alerts if any. Hero shows real $ savings. Narrative card returns a real GPT briefing (not "temporarily unavailable").
4. **Per-pillar pages:** `/automations` shows leaderboard + narrative + KPIs. `/business` shows Revenue + Pipeline as connected sections; Prospects + Bookings as inline empty-state cards.
5. **Activity feed:** Cockpit feed shows real events from Stripe + HubSpot in last 24h, or "No recent activity" if none.
6. **Stale-cache fallback:** Manually break Stripe API key in `integrations` table. Refresh `/business`. Expect: Revenue section shows last cached MRR with "Last synced Nh ago · retrying" badge. Other sections unaffected.
7. **Soft error fallback:** Clear Redis. Break Stripe API key. Refresh. Expect: Revenue section shows soft error ("Couldn't reach Stripe"). Other sections unaffected.
8. **AI narrative cache:** Refresh cockpit twice within 1h. Expect: second load is instant (cache hit); narrative content identical.
9. **Narrative failure mode:** Unset OPENAI_API_KEY locally. Refresh cockpit. Expect: narrative panel shows "Briefing temporarily unavailable"; rest of page renders normally.
10. **Deletions verified:** Visit `/dashboard/clients`, `/dashboard/financials`, `/dashboard/projects`, `/dashboard/tasks`, `/dashboard/team`, `/dashboard/time-tracking`, `/dashboard/reports`, `/dashboard/settings`. Expect: 404. Sidebar shows only 4 items.
11. **Old workflow-health URL:** Visit `/dashboard/workflow-health`. Expect: 404 (or 301 to `/dashboard/automations` if the redirect is included).
12. **Old integrations URL:** Visit `/dashboard/settings/integrations`. Expect: 404 (or 301 to `/dashboard/integrations`).
13. **Public routes unaffected:** `/`, `/audit`, `/results`, `/admin`, `/pricing`, `/about` all load when logged out.
14. **Auth middleware does not block APIs:** `/api/dashboard/metrics` while logged out returns 401 from the route's own `getCurrentUserId()` check (middleware doesn't gate `/api/*`).

## 17. Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Customer logs in with zero integrations connected → cockpit feels empty | High initially | Three-state empty-state pattern turns this into guided onboarding; all KPIs become "Connect X" CTAs deep-linking to `/dashboard/integrations` |
| GPT-4o costs scale with active users | Medium | 1h Redis cache per `(user_id, persona)`; reroll only on cockpit load after expiry; estimated $0.01/load |
| Live fetches across 6+ APIs slow the cockpit | High if naive | Server-side parallel fetch in a single page-level route handler; each Layer-2 endpoint is already Redis-cached; cockpit may stream widget data via React Server Components / Suspense as a follow-up |
| Stripe rate-limits during peak | Low | 1h Redis cache on `/api/dashboard/finance` already exists |
| Customer reads stale data and doesn't realize | Low | Visible "Last synced Nh ago" badge whenever staleness > 5min |
| Middleware breaks an unrelated route | Very low | Matcher is strict (`/dashboard/:path*`); `/audit`, `/admin`, marketing pages, all `/api/*` unaffected |
| Existing customers' bookmarks to deleted URLs | Medium | Optional follow-up: add 301 redirects from killed routes to `/dashboard`. Not strictly in scope for this spec |
| Old `/dashboard/settings/integrations` URL referenced elsewhere | Low | grep the repo for the old path during implementation; add a 301 redirect if found |

## 18. Background context (not load-bearing for design)

- Customer onboarding is admin-driven via `/admin/onboard-customer`. No self-signup exists or is planned. Customers must be provisioned in the CTO's chatv2 dashboard first (project_id, webhook secret, automation base URL, API key) before the admin form can complete.
- Customers pay for OpsRadar as a managed service. The cockpit is the proof artifact of that service — every minute they look at it, they are seeing the value being delivered.
- Memory rule: "no client business data storage in OpsRadar's DB — live-fetch only." This spec respects that.
- Memory rule: "`/dashboard` is the moat — design LAST, with full focus, no parallel agents; finish all surrounding surfaces first." This spec is that focus pass.
- `getCurrentUserId()` in [src/lib/supabase-ssr.ts](src/lib/supabase-ssr.ts) has a non-prod `DEV_CLIENT_ID` fallback. Middleware deliberately does NOT honor it — see §8.
