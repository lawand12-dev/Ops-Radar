# OpsRadar Product Strategy: A–F Phase Roadmap

**Date:** 2026-05-17
**Status:** Approved for implementation planning

---

## Vision

OpsRadar evolves from an operations dashboard into an **AI-native Chief Operating Officer for agencies** — proactively monitoring, advising, and acting on behalf of agency founders. The platform layer (F) turns every agency customer into a distribution channel, multiplying reach without multiplying sales effort.

---

## The Core Problem

Agency founders use 6–10 disconnected tools and have no unified view of their business. More importantly, even when they can see the data, they don't know:

- Which clients are actually profitable
- What to do about the ones that aren't
- What's about to go wrong before it does
- When to hire, raise prices, or fire a client

OpsRadar solves this. Not as a dashboard they have to remember to check — but as an AI that monitors everything and tells them what matters.

---

## Product Arc

| Phase | Code | What | Core Value |
|-------|------|------|------------|
| 1 | **C** | Client Profitability Dashboard | First aha moment in under 2 minutes |
| 2 | **B** | AI COO Briefings | Daily habit — they can't live without it |
| 3 | **A** | Viral Free Audit | Discovery channel — customers come by themselves |
| 4 | **D** | Agentic Actions | Moat — AI that handles things for them |
| 5 | **E** | Benchmark Network | Network effect — better with every new agency |
| 6 | **F** | White-Label Platform | Distribution multiplier — agencies become sales team |

---

## Phase 1: Client Profitability (C)

### Goal

An agency connects Stripe + Harvest and immediately sees which clients are making them money, which are quietly draining them, and by exactly how much. The reveal moment — discovering you're losing money on your biggest client — is the aha that gets shared on LinkedIn.

### Why this first

- Requires only 2 tool connections (lowest friction to value)
- OpsRadar already has both Stripe and Harvest integrations
- Data is already flowing — this is a new VIEW on existing data
- Solves an acute, felt pain with a specific dollar answer
- Shareable: people post "I found out I was losing $800/month on my best client"

### New route

`/dashboard/profitability`

### New API route

`/api/dashboard/profitability`

### Data model

```typescript
type ClientProfitability = {
  id: string
  name: string
  revenue_mtd: number           // Stripe: paid invoices this month
  revenue_currency: string
  hours_mtd: number             // Harvest: total hours this month
  blended_rate_usd: number      // from user settings (default $85/hr)
  cost_mtd: number              // hours_mtd × blended_rate_usd
  margin_pct: number            // (revenue - cost) / revenue × 100
  margin_prior_month: number | null
  trend: 'up' | 'down' | 'flat'  // up: margin improved >5pp vs prior month; down: dropped >5pp; flat: within ±5pp
  payment_status: 'on_time' | 'late' | 'overdue' | 'unknown'
  days_overdue: number | null
  stripe_customer_id: string | null
  harvest_client_id: string | null
  matched: boolean              // false = only in one tool
}
```

### API logic

1. Fetch Stripe invoices (current + prior month) grouped by customer
2. Fetch Harvest time entries (current + prior month) grouped by client
3. Match Stripe customers ↔ Harvest clients by normalized name (lowercase, strip punctuation and legal suffixes: Ltd, Inc, LLC, Co)
4. Flag unmatched clients (exist in one tool but not the other) — shown separately
5. Calculate margin, trend (vs prior month), payment status
6. Sort: red (losing money) → yellow (thin margin <20%) → green (healthy ≥40%)

### Client matching

Normalized string comparison as the primary match. Store manual overrides in a `client_mappings` Supabase table (`stripe_customer_id`, `harvest_client_id`, `workspace_id`). First-time view prompts user to confirm or manually map any unmatched clients.

### Blended rate setting

Add `blended_hourly_rate_usd` to profile settings (`/dashboard/settings`). Default: $85/hr. Shown prominently on first visit to profitability page with a prompt: "What does one hour of your team's work cost you?" This number drives all margin calculations.

### UI components

| Component | Purpose |
|-----------|---------|
| `ProfitabilityTable` | Main sortable table — sorts by margin, revenue, trend |
| `ClientRow` | Name, revenue, hours, cost, margin badge, payment badge, trend arrow |
| `MarginBadge` | 🔴 <20% · 🟡 20–40% · 🟢 ≥40% |
| `PaymentBadge` | On time · Late Nd · Overdue |
| `TrendArrow` | ↑ improving · ↓ declining · → flat (vs prior month) |
| `UnmatchedClients` | Clients in one tool but not the other — prompt to map |
| `BlendedRatePrompt` | First-visit modal to set hourly rate |
| `EmptyState` | Shown when Stripe or Harvest not connected — direct connect CTA |

### Sidebar nav

Add "Profitability" to the OBSERVE section in the dashboard sidebar, between existing entries.

### Error handling

- Stripe not connected → `EmptyState` with connect CTA
- Harvest not connected → `EmptyState` with connect CTA
- One connected, one not → show partial data (e.g. revenue only) with "Connect Harvest to see margin"
- No invoices this month → show prior month with label "Showing last month (no invoices yet this month)"

---

## Phase 2: AI COO Briefings (B)

### Goal

Agencies receive a proactive briefing — email or in-app — that tells them what to pay attention to without having to log in. This creates a daily/weekly habit and transforms OpsRadar from a tool they visit into a service that comes to them.

### Delivery

- **Weekly digest** (default: Monday 8am in user's timezone) via email (Resend — already integrated)
- **Immediate alerts** for critical events: workflow failure spike, large overdue invoice, client margin collapses
- **In-app notification center** (new): shows last 4 briefings, dismissible

### Briefing content structure

```
1. Health score — 0–100 composite across all connected tools
2. Top 3 things that need attention this week
3. Top win from last week (positive signal to anchor attention)
4. One specific recommendation ("Do this one thing today")
```

### New infrastructure

| Piece | What |
|-------|------|
| `/api/cron/weekly-briefing` | Cron job — Monday 8am UTC (adjustable per user timezone) |
| `/api/dashboard/briefing` | On-demand briefing generation (for in-app view) |
| `/api/dashboard/alerts-rules` | Evaluates alert rules against live data |

Briefing generation uses GPT-4o with structured output. Extends the existing `/api/dashboard/narrative` pattern — same prompt architecture, wider data context.

### New dashboard component

`BriefingInbox` — replaces or augments current `NarrativeCard`. Shows:
- Latest briefing (full)
- Previous 3 briefings (collapsed, expandable)
- "Unread" indicator on sidebar nav

### Alert rules (initial set)

- Workflow failure rate > 20% in last 24h → immediate alert
- Invoice overdue > 14 days AND amount > $2,000 → immediate alert
- Client margin drops > 15pp month-over-month → weekly briefing callout
- Pipeline value drops > 30% week-over-week → weekly briefing callout

---

## Phase 3: Viral Free Audit (A)

### Goal

Make the existing audit output so specific, dollar-quantified, and visually compelling that agency founders share it on LinkedIn/X without being asked. Every share brings new agencies to OpsRadar without any sales effort.

### What changes on the existing audit

1. **Shareable public URL** — audit results get a unique public link (`/results/[shareId]`), no auth required to view
2. **Report redesign** — bigger numbers, clear dollar savings, agency-specific language ("your team", not generic copy)
3. **"How you compare" section** — rough benchmarks initially (hardcoded industry averages), replaced with real benchmark data in Phase 5
4. **"Your top 3 quick wins"** — specific actions with estimated ROI per item (e.g. "Automate client onboarding emails → saves ~4h/week = $340/month")
5. **OpsRadar branding on shared reports** — "Get your free audit at opsradar.io" at the bottom of every shared page (viral loop)

### Public report page

`/results/[shareId]` — read-only, no auth, full report with CTA: "Get your own audit — takes 5 minutes."

### Sharing mechanism

- "Share this report" button on existing `/results` page
- Generates a short-lived (30-day) public token stored in Supabase
- Open Graph meta tags for rich link previews on LinkedIn/X
- Optional: "Download PDF" button on shared page

---

## Phase 4: Agentic Actions (D)

### Goal

OpsRadar handles routine operational responses automatically. The AI COO doesn't just tell you about problems — it handles them, with your approval for anything significant.

### Action catalog (initial)

| Trigger | Action | Risk level |
|---------|--------|-----------|
| Invoice overdue > 7 days | Send payment reminder email via Resend | Auto |
| Workflow fails 3× in 1h | Restart workflow via n8n API + notify founder | Auto |
| Hours budget exceeded 100% | Create task in Monday/Asana + draft scope email | Approval required |
| Client margin drops below 15% | Alert founder + draft repricing conversation email | Approval required |
| New client added in HubSpot | Create Harvest client + onboarding task | Auto |

### Approval flow

- **Auto** — executes immediately, logged in activity feed with undo window (30 min)
- **Approval required** — appears in new "Actions" queue on dashboard. One click to approve or dismiss. Shows exactly what will be sent/done before execution.
- **Never auto** — price changes, contract modifications, anything billing-related above a threshold

### Infrastructure

- New Supabase table: `agent_actions` — `(id, workspace_id, action_type, status, payload, approved_at, executed_at, undone_at)`
- New dashboard section: `/dashboard/actions` — pending approvals queue
- Action engine connects through existing n8n integration
- Extend `/api/dashboard/alerts` → `/api/dashboard/actions` to evaluate and queue actions

---

## Phase 5: Benchmark Network (E)

### Goal

Anonymized aggregate data from all connected agencies powers industry benchmarks. This makes every agency's data more meaningful ("you're in the bottom 25% for collection time") and generates shareable content that drives organic discovery.

### What gets aggregated (opt-in, anonymized)

- Margin distribution (by agency size bucket)
- Average invoice collection time
- Workflow success rates
- Hours per $10k revenue
- Client churn rate proxies

### Dashboard integration

Each KPI in the profitability table gains a benchmark tooltip:

> "Your 28-day average collection time is in the bottom 25%. The median agency collects in 12 days. [See how to improve →]"

### Public artifact

**Quarterly "Agency Ops Benchmark Report"** — free PDF + dedicated landing page. Promoted on LinkedIn/X. Drives SEO. Brings agencies to the site without paid ads. This is the upgraded version of the free audit (Idea A) backed by real data.

### Opt-in UX

On account creation and in settings: "Help us build industry benchmarks — your data is anonymized and never shared individually." Default: on (opt-out available).

---

## Phase 6: White-Label Platform (F)

### Goal

Agencies resell OpsRadar to their own clients as a branded "Managed Ops" service. One agency customer brings 10–20 client workspaces. Agencies become OpsRadar's distribution network.

### How it works (concrete example)

1. Ahmed (agency owner) signs up for OpsRadar Agency Plan
2. OpsRadar gives him a white-labeled portal (`ops.velocityagency.com`) branded with his logo and colors
3. Ahmed invites each of his 15 clients — each gets their own workspace and connects their tools
4. Ahmed sees all 15 clients in a **master dashboard** (one row per client: health, margin, alerts)
5. Every 1st of the month, each of Ahmed's clients automatically receives a branded "Ops Health Report" by email
6. Ahmed charges each client $500–$1,500/month for "Managed Operations" — OpsRadar powers the service invisibly
7. Ahmed's clients share their reports → their peers ask their own agencies for the same → viral loop

### New concepts

| Concept | Definition |
|---------|-----------|
| `Agency` | The OpsRadar customer (current user type) |
| `Workspace` | One isolated environment per client the agency manages |
| `Master View` | Agency sees all workspaces in one dashboard |

### Architecture

Multi-tenant: add `workspace_id` to all relevant Supabase tables. Current single-user customers are `workspace_type: 'solo'`. Agency Plan customers get `workspace_type: 'agency'` with child workspaces.

### White-label features

- Custom logo + brand colors per workspace
- Custom domain via CNAME (`ops.yourname.com`)
- Monthly report delivery to workspace owner (agency's client) with agency branding
- "Powered by Velocity Agency" footer instead of OpsRadar branding

### Pricing model

| Plan | Who | Price |
|------|-----|-------|
| Professional | Single agency, own dashboard | Base fee/mo |
| Agency | Agency + up to 20 client workspaces | Base + per-workspace fee |
| Agency Pro | Unlimited workspaces + white-label domain | Flat fee/mo |

### Build order within F

1. `workspaces` table + multi-tenant data scoping
2. Agency master view (all clients, one row each)
3. Client invite + workspace creation flow
4. White-label logo + colors
5. Custom domain (CNAME)
6. Automated monthly report generation and email delivery

---

## Marketing / Website

The current homepage talks about "connecting tools" and "operations." That's abstract. Each phase unlock a more specific, compelling headline:

| After phase | Homepage headline |
|-------------|------------------|
| C live | "Find out which clients are actually making you money. Connect Stripe and Harvest — know in 2 minutes." |
| B live | "Your AI COO monitors your agency and tells you what to do every week. No logging in required." |
| A viral | "Free agency ops audit — see where you're losing money before it shows up on your P&L." |
| F live | "Give your clients an ops dashboard. White-label it. Make it your product." |

---

## Success Metrics Per Phase

| Phase | Primary metric | Signal of success |
|-------|---------------|-------------------|
| C | Time to first profitability insight | < 5 minutes after connecting tools |
| B | Weekly briefing open rate | > 60% |
| A | Audit share rate | > 15% of completions get shared |
| D | Action approval rate | > 70% of suggested actions approved |
| E | Benchmark citation rate | Benchmarks referenced in ≥ 30% of briefings |
| F | Client workspaces per agency | ≥ 5 within 30 days of Agency Plan signup |

---

## What NOT to build (scope guard)

- **General project management** — not competing with Monday or Asana
- **Accounting software** — not replacing QuickBooks or Xero
- **CRM** — not replacing HubSpot
- **Time tracking** — not replacing Harvest
- **Custom reporting builder** — premature; auto-generated reports are enough for all phases

OpsRadar's job is to sit on top of those tools and make sense of them together. Not to replace any of them.
