# Dashboard Marketing Card — Design Spec

**Date:** 2026-05-09
**Owner:** Lawand
**Status:** Approved — ready for implementation planning

---

## Goal

Add the Marketing card to `/dashboard`, showing the agency's cold-outreach funnel: emails sent → opens → replies → meetings booked. Sourced from Apollo (outreach platform) + Calendly (meetings). Gracefully degrades when only one tool is connected.

## Why this shape

The agency's primary acquisition channel is **cold outreach**, not paid ads — so the original Marketing card design (Google/Meta Ads spend + ROAS) doesn't fit. Stripe + paid-ad APIs are also restricted in the agency's region. Apollo + Calendly are globally available and reflect what the agency actually does.

Hero metric is **meetings booked** (bottom of funnel — the metric that matters for revenue). Sub-stats show the funnel shape so the agency can see where leakage happens.

## Audience

Agency role only (v1). Same as parent spec.

## Position on the page

The Marketing card sits in the middle row alongside Sales, replacing one of the static demo cards in time. For now, place it as its own row above the static stat-cards, BELOW the Hero ROI block and Workflow Health strip but ABOVE the Sales card.

```
[Page Header]
[Hero ROI block]
[Workflow Health strip]
[Marketing card]                ← NEW
[5 static stat cards] (mock)
[Revenue chart] [Tasks chart] (mock)
[Sales card] (live)
[Projects table] [Activity feed] (mock)
```

## Architecture

External tools (Apollo + Calendly), so this widget routes through n8n per the established rule.

```
Browser
  ↓ fetch('/api/dashboard/marketing')
Next.js API route
  ├─ Resolve client_id from session (uses sign-in flow once Codex's branch lands)
  ├─ Read encrypted Apollo + Calendly tokens from `integrations` table (may be null)
  ├─ Cache key: dash:marketing:<client_id>, TTL 180s
  ├─ On cache miss: POST n8n webhook with both tokens (or null for missing ones)
  └─ Cache + return
n8n workflow `dashboard-marketing-apollo-calendly`
  ├─ Webhook trigger
  ├─ Branch A: if apollo_token present → call Apollo APIs → aggregate funnel
  ├─ Branch B: if calendly_token present → call Calendly /scheduled_events → count
  ├─ Code node: merge into widget contract (nulls for missing-tool fields)
  └─ Respond
```

**Cache shape:** standard `dash:marketing:<client_id>` + `:stale` 24h backup.

## Data flow

The API route returns this widget contract:

```ts
type MarketingWidgetData = {
  // Apollo-sourced (null if Apollo not connected)
  emails_sent:       number | null;
  open_rate_pct:     number | null;
  reply_rate_pct:    number | null;
  reply_sparkline:   number[] | null;  // 14 days of daily reply counts

  // Calendly-sourced (null if Calendly not connected)
  meetings_booked:   number | null;

  // Derived (only when both connected)
  meeting_conversion_pct: number | null;  // meetings / emails_sent

  // Connection state (for partial-connected UI)
  apollo_connected:   boolean;
  calendly_connected: boolean;

  period_label: string;   // "Last 14 days"
};
```

### Apollo field mapping

| Field | Apollo API call | Logic |
|---|---|---|
| `emails_sent` | `GET /api/v1/emailer_campaigns/stats` (or sum per-campaign) | Total `num_sent` across campaigns this period |
| `open_rate_pct` | same | `num_opens / num_sent × 100` |
| `reply_rate_pct` | same | `num_replies / num_sent × 100` |
| `reply_sparkline` | Aggregate from per-day stats | 14 daily reply counts |

**Plan-tier caveat:** Apollo's `/emailer_campaigns/stats` requires a paid plan. If the user is on free tier, the n8n workflow returns nulls for Apollo fields and the card gracefully shows "Apollo plan doesn't expose stats API — upgrade required" in the funnel rows. The user should verify their plan tier before connecting.

### Calendly field mapping

| Field | Calendly API call | Logic |
|---|---|---|
| Step 1: get user URI | `GET /users/me` | `Authorization: Bearer <token>` → response.resource.uri |
| Step 2: list events | `GET /scheduled_events?user=<uri>&min_start_time=<14d_ago_iso>` | Count events |
| `meetings_booked` | from step 2 | total count |

### Derived field

`meeting_conversion_pct = meetings_booked / emails_sent × 100`. Only computed when both fields are non-null.

## UI states

```
┌─────────────────────────────────────┐
│  Marketing / Outreach               │
├─────────────────────────────────────┤
│  18 meetings booked      Last 14 d  │  ← hero number
│                                     │
│  ▸ Emails sent      4,200           │
│  ▸ Open rate        38%             │
│  ▸ Reply rate       6.4%            │
│  ▸ Meetings booked  18 (0.43%)      │
│                                     │
│  [sparkline: replies/day, 14 days]  │
└─────────────────────────────────────┘
```

### State matrix

| State | When | Render |
|---|---|---|
| **Loading** | First mount, no cache | Skeleton |
| **Both connected** | Both tokens present, both calls succeed | Full card as drawn above |
| **Apollo only** | Only Apollo connected | Hero shows "—" for meetings, the meetings row says "Connect Calendly to see meetings" with a "Connect →" button |
| **Calendly only** | Only Calendly connected | Hero shows meetings number, funnel rows say "Connect Apollo to see outreach funnel" with a button |
| **Neither connected** | Both tokens null | "Connect Apollo + Calendly to see outreach performance" with two buttons |
| **Empty data** | Connected but tools returned 0 across the board | "No outreach activity in the last 14 days" |
| **Error** | n8n call failed / 5xx | Red banner + stale data fallback if available + Retry button |

**Never show misleading zero.** If Apollo isn't connected, the funnel rows are not "0%" — they're "Connect Apollo →".

## File map

### New files

```
src/app/api/dashboard/marketing/route.ts       — widget API endpoint
src/app/api/integrations/apollo/route.ts       — POST/DELETE Apollo API key
src/app/api/integrations/calendly/route.ts     — POST/DELETE Calendly PAT
src/components/dashboard/marketing-card.tsx    — UI with all 7 states
src/components/dashboard/connect-apollo-modal.tsx
src/components/dashboard/connect-calendly-modal.tsx
docs/integrations/n8n-dashboard-marketing-apollo-calendly.md     — workflow docs
docs/integrations/n8n-dashboard-marketing-apollo-calendly.workflow.json   — n8n JSON
```

### Modified files

```
src/app/dashboard/page.tsx                     — insert <MarketingCard /> in the new row
```

### External

```
n8n cloud workflow `dashboard-marketing-apollo-calendly` (created via n8n REST API)
```

## Tokens we'll store

Reuse existing `integrations` table. Two new `tool` enum values are already in the constraint: `calendly` is already there; `apollo` is NOT — needs a small migration to add it.

```sql
-- Existing CHECK constraint uses these values:
-- 'stripe','hubspot','clickup','asana','toggl','harvest','google_ads',
-- 'meta_ads','calendly','quickbooks','pipedrive','salesforce','monday'
-- We need to add 'apollo'.

alter table public.integrations drop constraint integrations_tool_check;
alter table public.integrations add constraint integrations_tool_check
  check (tool in ('stripe','hubspot','clickup','asana','toggl','harvest',
                  'google_ads','meta_ads','calendly','quickbooks','pipedrive',
                  'salesforce','monday','apollo'));
```

## Auth conventions per tool

| Tool | Auth | How user gets it |
|---|---|---|
| Apollo | API key as `X-Api-Key` header | Apollo settings → Integrations → API → Generate key |
| Calendly | Personal Access Token (PAT) as `Authorization: Bearer <token>` | Calendly Integrations → API & Webhooks → Personal Access Tokens |

Both validated by a probe call before storing (same pattern as HubSpot connect API).

## Error handling

Same as the Sales card: connection check first (distinguish "not connected" from "errored"), n8n call with timeout, stale cache fallback for errors. The widget contract uses `null` (not 0) for missing fields so the UI can distinguish "not connected" from "zero activity."

## Non-goals

- Per-campaign drill-in (clicking a row → details for that Apollo campaign). Keep it as a high-level summary in v1.
- Multi-channel outreach (LinkedIn, Twitter DMs, etc.) — Apollo email-only for v1.
- Manual gmail integration as a fallback when Apollo isn't paid — note the plan-tier issue and require paid Apollo for full data.
- Customer sign-in (Codex is doing that on a parallel branch — this card just consumes whatever auth is in place when it lands).

## v1 / v2 / v3 scope cut

### v1 (this spec)
- Marketing card pulling from Apollo + Calendly
- Both widget UIs (graceful partial-connected)
- Connect modals for both tools
- 14-day window, no per-campaign breakdown

### v2
- Per-campaign drill-in
- Custom time window (last 7d / 30d / 90d toggle)
- LinkedIn/Twitter outreach if Apollo expands

### v3
- Outreach quality scoring (reply sentiment, meeting-show rate)
- Predictive metrics

## Open questions for plan-time

- The exact field path for Apollo's stats endpoint (verify against current Apollo docs at plan-time — Apollo has changed their API shape before)
- Whether the n8n workflow should hit Apollo for ALL campaigns or only "active" ones (defaults to all for v1; user can change in n8n if needed)
- How to handle Calendly users with multiple event types (sum them all, since the metric is "meetings booked" regardless of type)
