# Notion Brain Provisioning + Historical Backfill — Design

**Date:** 2026-05-24
**Status:** Approved — implementation pending
**Owners:** OpsRadar core
**Related:**
- [`docs/adr/0003-skills-over-rag.md`](../../strategy/agent-skills-architecture-2026.md) (Brain as Agent Skills consumer)
- [`docs/dev/notion-brain-schema-2026.md`](../../dev/notion-brain-schema-2026.md) (20-database schema)
- [`src/lib/backfill/orchestrator.ts`](../../../src/lib/backfill/orchestrator.ts) (existing scaffold to replace)

---

## 1. Problem

Today, when a customer connects Notion via the `/dashboard/integrations` page (Composio path), **nothing happens** beyond flipping `composio_connections.is_active = true`. The 20-database Brain is never provisioned. There is a separate `/api/notion/callback` route that DOES provision the Brain using direct Notion OAuth, but no UI currently routes customers through it. Even when a customer hits that path, the post-provisioning historical backfill scaffold at `src/lib/backfill/orchestrator.ts` is entirely commented out — every function throws `'not implemented'`.

Net effect: the headline OpsRadar promise ("customer-owned Notion Brain as the persistent knowledge layer") doesn't work for any customer who follows the only UI path that exists.

## 2. Goal

Within ~30 seconds of a customer connecting Notion through the standard Composio integration flow, the customer's Notion workspace has the 20-database Brain provisioned and populated with current operational data. Within 30 minutes – 2 hours, the Brain contains 12 months of historical data and pattern-detection cards across every connected toolkit. The customer receives an email at the end with top insights.

Subsequent connection of any other toolkit (Stripe, HubSpot, etc.) triggers a smaller per-integration backfill for just that toolkit's 12 months.

## 3. Non-goals

- Replacing Composio with the direct Notion SDK for any agent-facing operation. The agents continue to call Composio.
- Backfilling Slack/Gmail raw content. Phase 3 derives pattern signals (response times, communication-health metrics) without dumping message bodies into Notion.
- Per-customer custom database schemas. The 20 databases are fixed.
- Real-time sync. Cron agents handle ongoing freshness post-backfill.

## 4. Architecture

### 4.1 Single auth model — Composio only

Drop the direct Notion OAuth path entirely. Both brain provisioning AND historical backfill use the Composio-brokered token via `NOTION_*` actions. One auth flow, one token, one source of truth.

### 4.2 Trigger flow

```
Customer clicks "Connect Notion" in /dashboard/integrations
   ↓
POST /api/composio/connect  → Composio OAuth URL
   ↓
Customer authorizes in Composio's hosted flow
   ↓
Composio fires connection.created webhook
   ↓
POST /api/composio/webhook  (HMAC verified)
   ↓
If toolkit === 'notion':
  1. Synchronously call provisionBrain(userId) via Composio  (~5-10s)
  2. Synchronously call backfillPhase1(userId)               (~10-20s)
  3. Fire Vercel Workflow: backfillNotionConnected(userId)
  4. Return 200 to Composio

If toolkit !== 'notion' AND notion is already connected:
  1. Fire Vercel Workflow: backfillNewIntegration(userId, toolkit)
  2. Return 200
```

Webhook stays under 300s (Vercel function timeout) by deferring Phases 2-4 to the durable runtime.

### 4.3 Background runner — fire-and-forget

No durable runtime is needed. Benchmarking shows: Stripe 12-month pull ≈ 30–60s, HubSpot ≈ 30s. With all 22 pullers running in parallel via `Promise.all`, total wall time is 60–120 seconds — well inside Vercel's 300s function timeout.

Architecture: webhook handler runs Phase 1 synchronously (≈30s), returns 200 to Composio, then fires a `fetch` to `/api/backfill/run` WITHOUT awaiting it (fire-and-forget). That second function runs Phases 2–3–4 in its own 300s window.

```
Webhook handler (≤30s):
  → provisionBrain(userId)
  → backfillPhase1(userId)           // current snapshot
  → fire-and-forget POST /api/backfill/run?userId=...
  → return 200 to Composio

/api/backfill/run (≤300s):
  → Promise.all([...all 22 puller.pull12Months()])   // parallel
  → writeBrainBatch(userId, allWrites)
  → detectPatterns(userId) → writeBrainBatch(patternCards)
  → generateBrainHomeNarrative(userId)               // gpt-5.4
  → repaintBrainHomePage(userId, narrative)
  → sendPhase4Email(userId)
  → set backfill_status = 'complete'
```

The background route is authenticated via a shared secret header (`X-Backfill-Secret`). Phase 1 runs in the webhook so the customer's first dashboard load already shows live data.

### 4.4 Phase definitions

| Phase | Budget | Source data | Brain writes |
|---|---|---|---|
| **1 — Current snapshot** | <30s | Open invoices, open deals, active projects, this-week hours, connected tools list | `invoices` (open only), `sales_pipeline` (open only), `projects` (active only), `tool_stack`, partial `clients` |
| **2 — 90 days** | 5–10 min | Last 90 days from every structured toolkit | `kpi_snapshots` (weekly), `real_pnl` (per client × month), full `clients`, `marketing_performance`, `meeting_load`, `support_tickets`, `recruiting`, `team` |
| **3 — 12 months + patterns** | 30 min – 2 hr | 12 months from same toolkits + Slack/Gmail pattern signals | Backfill of all above + `pattern_cards` (3 detectors), seed `risk_register` |
| **4 — Notify** | <5s | Read top 3 pattern cards | Resend email |

### 4.5 Per-toolkit pullers — aggregate, don't dump

Each Composio toolkit has a corresponding file in `src/lib/backfill/sources/<toolkit>.ts` exporting three functions:

```ts
export async function pullCurrent(userId: string): Promise<PullerResult>     // raw records (live state)
export async function pull90Days(userId: string): Promise<PullerResult>      // weekly aggregates
export async function pull12Months(userId: string): Promise<PullerResult>    // monthly aggregates + 30d raw window
```

**Aggregation strategy** (critical — adopted after spec review):

- **`pullCurrent`** writes raw records for *open / active / live* entities only: open invoices, active deals, in-progress projects, this-week hours. Bounded by definition.
- **`pull90Days`** writes WEEKLY aggregate rows (one per week per dimension). Example: Stripe → 13 rows in `kpi_snapshots` (MRR + cash + overdue per week) instead of every individual charge.
- **`pull12Months`** writes MONTHLY aggregate rows (one per month per dimension) PLUS raw rows for the last 30 days for drill-down. Example: Stripe → 12 monthly rows in `real_pnl` (revenue + margin + DSO per month) + last-30-day raw invoices in `invoices`.

Why: a customer paying $750-3K/month for OpsRadar has tens of thousands of historical records per tool. Dumping every record into Notion makes the Brain unusable (50k+ rows per database, slow queries) and turns Phase 3 into a 4-6 hour ordeal. Aggregating into monthly summaries gives the customer the **trend insight** that matters for COO-level decisions, keeps Notion performant, and keeps Phase 3 under 2 hours even on heavy accounts.

The cron agents (CP-19 orchestrator pattern) handle ongoing record-level visibility. Backfill seeds the trend history.

If a toolkit isn't connected for a user (checked via `getConnectedToolSlugs(userId)`), its puller is silently skipped. No errors, no warnings — just no data from that source.

### 4.6 Toolkit → database mapping (full)

| Toolkit | Brain databases |
|---|---|
| Stripe | `invoices`, `real_pnl`, `clients` |
| QuickBooks | `invoices`, `real_pnl` |
| HubSpot | `sales_pipeline`, `clients`, `marketing_performance` |
| Pipedrive | `sales_pipeline` |
| Apollo | `sales_pipeline`, `growth_referrals` |
| ClickUp | `projects` |
| Asana | `projects` |
| Monday | `projects` |
| Harvest | `real_pnl`, `team`, `meeting_load` |
| Toggl | `real_pnl`, `team`, `meeting_load` |
| BambooHR | `team`, `recruiting` |
| Gusto | `team`, `real_pnl` |
| Google Calendar | `meeting_load` |
| Calendly | `meeting_load`, `growth_referrals` |
| Google Analytics | `marketing_performance` |
| Google Ads | `marketing_performance` |
| LinkedIn | `marketing_performance`, `growth_referrals` |
| Intercom | `support_tickets`, `client_communication` |
| Zendesk | `support_tickets` |
| Typeform | `growth_referrals` |
| Slack | `team_communication` (Phase 3 patterns only) |
| Gmail | `client_communication` (Phase 3 patterns only) |
| Notion | (the Brain itself — no puller) |

### 4.7 Pattern detectors (Phase 3)

Three detectors in `src/lib/backfill/patterns.ts`. Each consumes the 12-month dataset already written to the Brain and produces `pattern_cards` rows with a short narrative + supporting numbers.

1. **Margin trend per client** — classify each client as `improving` / `stable` / `declining` / `volatile` based on 12 months of `real_pnl` rows. Card narrates the direction with the actual margin delta.
2. **Scope creep trend** — for each client, compare `hours_billed` vs `hours_budgeted` over rolling 90-day windows. Detect sustained overrun (3+ consecutive windows over budget).
3. **Payment delay (DSO) trend** — per client, compute days-sales-outstanding over each month. Detect sustained increases.

Detectors are intentionally simple. Cron agents handle nuanced ongoing analysis; backfill just seeds the high-signal patterns the customer should see on Day 1.

### 4.8 Idempotency

Every Notion page write uses an `External ID` property = `<toolkit>:<source_id>` (e.g. `stripe:in_1abc...`, `hubspot:deal_12345`). The batch writer:

1. Queries the target database for an existing page with that External ID.
2. If exists → update properties via `pages.update`.
3. If not → create via `pages.create`.

Backfill is safe to re-run at any time, in any order. A failed Phase 3 can restart without producing duplicates. A second Composio-event for the same connection (which does happen with Composio) is a no-op.

### 4.9 Cron agents write to Notion

Independently valuable change: every cron agent gains one additional step at the end of its run — `writeFindingsToNotion()`. This keeps the Brain fresh after backfill completes. Without this, the Brain would have 12 months of data on Day 1 but go stale by Day 8.

The writes use the same idempotent batch writer (`src/lib/notion/batch-writer.ts`) so cron writes overlap cleanly with backfill writes. The cron's job is to write the LATEST snapshot per entity; backfill's job is to seed history.

### 4.10 Phase status persistence

`notion_workspaces.backfill_status` (already exists, enum-shaped) progresses:

```
pending → provisioning → phase1 → phase2 → phase3 → complete
                                                  ↘ failed
```

`/dashboard/integrations` reads this column and shows a per-phase progress UI when status ≠ `complete`. Each phase update is the final step of that phase's `step.run()` so progress is durable across Workflow retries.

### 4.11 New-integration mini-backfill

When `connection.created` fires for any toolkit OTHER than Notion AND the user already has `notion_workspaces.backfill_status = 'complete'`:

```
Fire Vercel Workflow: backfillNewIntegration(userId, toolkit)
   ↓
Run the toolkit's pull12Months() puller
   ↓
Apply writes via batch writer
   ↓
Email customer: "<Toolkit> is now connected to your Brain. Here's what we found."
```

Smaller scope, same machinery.

## 5. Files

### New

- `src/lib/backfill/orchestrator.ts` (rewrite — currently scaffold)
- `src/lib/backfill/sources/stripe.ts`
- `src/lib/backfill/sources/quickbooks.ts`
- `src/lib/backfill/sources/hubspot.ts`
- `src/lib/backfill/sources/pipedrive.ts`
- `src/lib/backfill/sources/apollo.ts`
- `src/lib/backfill/sources/clickup.ts`
- `src/lib/backfill/sources/asana.ts`
- `src/lib/backfill/sources/monday.ts`
- `src/lib/backfill/sources/harvest.ts`
- `src/lib/backfill/sources/toggl.ts`
- `src/lib/backfill/sources/bamboo-hr.ts`
- `src/lib/backfill/sources/gusto.ts`
- `src/lib/backfill/sources/google-calendar.ts`
- `src/lib/backfill/sources/calendly.ts`
- `src/lib/backfill/sources/google-analytics.ts`
- `src/lib/backfill/sources/google-ads.ts`
- `src/lib/backfill/sources/linkedin.ts`
- `src/lib/backfill/sources/intercom.ts`
- `src/lib/backfill/sources/zendesk.ts`
- `src/lib/backfill/sources/typeform.ts`
- `src/lib/backfill/sources/slack.ts` (Phase 3 only)
- `src/lib/backfill/sources/gmail.ts` (Phase 3 only)
- `src/lib/backfill/sources/index.ts` — registry of all pullers
- `src/lib/backfill/patterns.ts` — 3 pattern detectors
- `src/lib/backfill/email.ts` — Phase 4 Resend email
- `src/lib/backfill/workflows.ts` — Vercel Workflow definitions
- `src/lib/notion/batch-writer.ts` — idempotent upsert helper
- `src/lib/notion/composio-brain.ts` — Composio-based brain provisioning (replaces direct-SDK provisionBrain)
- `src/app/dashboard/integrations/_components/backfill-progress.tsx` — UI for phase status

### Modified

- `src/app/api/composio/webhook/route.ts` — branch on `appName === 'notion'`; fire provisioning + Phase 1 + workflow; otherwise fire mini-backfill if applicable
- `src/lib/notion/create-brain.ts` — keep the data definitions; redirect implementation to `composio-brain.ts`
- All 10 cron agents in `src/lib/agents/<slug>/index.ts` — append `writeFindingsToNotion()` step at end of each loop
- `src/app/dashboard/integrations/page.tsx` — render `<BackfillProgress />` when backfill is in progress
- `src/lib/notion/client.ts` — drop direct-SDK code paths now unused

### Deleted

- `src/app/api/notion/callback/route.ts` — direct Notion OAuth route, replaced
- Supabase migration to drop `notion_workspaces.access_token_encrypted` column
- `NOTION_OAUTH_CLIENT_ID` / `NOTION_OAUTH_CLIENT_SECRET` / `NOTION_OAUTH_REDIRECT_URI` env vars (deprecated)

## 6. Failure modes + handling

| Failure | Behavior |
|---|---|
| Phase 1 fails inside webhook | Webhook returns 200 (don't block Composio retry storm). `backfill_status` set to `failed_phase1`. UI shows retry button that re-fires the workflow. |
| Phase 2 or 3 fails inside Workflow | Vercel retries the failed step up to 3x. After 3 failures, `backfill_status = failed_phase2` (or 3). Phase 4 email goes out with a "partial backfill" note. |
| Individual puller throws | Catch + log, continue with other pullers. One bad toolkit doesn't kill the whole phase. |
| Notion rate limit hit during batch write | Backoff and retry per Notion's `Retry-After` header. Batch writer chunks writes to stay under Notion's 3 req/sec limit per integration token. |
| Customer revokes Notion mid-backfill | Workflow catches `Unauthorized` from Composio, sets `backfill_status = revoked`, sends apology email. |
| Duplicate `connection.created` event | Idempotent — second invocation finds `backfill_status != pending`, no-ops. |

## 7. Testing strategy

No test runner currently exists in the repo (per CLAUDE.md). This work adds the first test suite. Minimum coverage:

- **Unit tests** for each puller against mock Composio responses (fixture-driven).
- **Unit tests** for batch writer idempotency (same External ID → update not create).
- **Unit tests** for the 3 pattern detectors against synthetic 12-month datasets.
- **Integration test** for the full webhook → Phase 1 path against a Composio test workspace.

Pattern detectors are pure functions over Notion data — easy to test against fixture inputs without touching live integrations.

## 8. Open questions

**Q1: Does Composio's NOTION_* action surface cover database creation with custom properties?** Composio tools typically wrap common app operations (create page, query database, update properties), but creating a fresh database with 20+ typed properties (select fields with options, formulas, rollups) may fall outside their action set. If Composio's `NOTION_CREATE_DATABASE` action is too limited, fallback options:

- **(a) Pass Composio the token + use direct Notion REST calls** for provisioning only — agents still use Composio actions for everything else.
- **(b) Use Composio's generic `NOTION_*` actions for what they cover; raw API for the rest.**
- **(c) Provision a simpler initial schema** (fewer property types) and add complex properties via cron-agent migrations over time.

Resolution: prototype provisioning of ONE complex database (e.g. `kpi_snapshots`) via Composio actions in Phase 0 of implementation. Pick fallback (a) if blocked.

## 9. Rollout

1. Build behind a feature flag (`OPSRADAR_BACKFILL_V2`) for the first week.
2. Run end-to-end against the founder's own Composio workspace as the design partner.
3. Document any bugs found, fix, then flip the flag for new customers.
4. Existing customers (if any) get a one-time migration script that fires `onNotionConnected` for them.

## 10. Effort estimate

~1–2 weeks of focused work. Implementation plan to follow.
