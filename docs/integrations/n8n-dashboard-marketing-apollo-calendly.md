# n8n Workflow: `dashboard-marketing-apollo-calendly`

**Purpose:** Backs the `<MarketingCard />` widget on `/dashboard`. Receives Apollo + Calendly access tokens (either may be empty), calls each tool's API, aggregates the cold-outreach funnel, returns JSON.

## Live coordinates

- **Instance:** `https://opsradar.app.n8n.cloud`
- **Workflow ID:** `meZGavzS8s0pbTfl`
- **Webhook URL:** `POST https://opsradar.app.n8n.cloud/webhook/dashboard-marketing-apollo-calendly`
- **Status:** Active

## Definition

The full workflow JSON is checked in at [n8n-dashboard-marketing-apollo-calendly.workflow.json](./n8n-dashboard-marketing-apollo-calendly.workflow.json). To rebuild from scratch on a new n8n instance, see the rebuild steps in [n8n-dashboard-sales-hubspot.md](./n8n-dashboard-sales-hubspot.md) — same shape.

## Request shape

The Next.js API route at `/api/dashboard/marketing` POSTs:

```json
{
  "apollo_token":   "<API key or empty string>",
  "calendly_token": "<PAT or empty string>",
  "client_id":      "<supabase user id>"
}
```

Header: `x-opsradar-secret: <N8N_WEBHOOK_SECRET>` (currently informational).

Tokens may be empty if the user hasn't connected that tool — the workflow gracefully returns nulls.

## Response shape

```json
{
  "emails_sent":            number | null,
  "open_rate_pct":          number | null,
  "reply_rate_pct":         number | null,
  "reply_sparkline":        number[] | null,
  "meetings_booked":        number | null,
  "meeting_conversion_pct": number | null,
  "apollo_connected":       boolean,
  "calendly_connected":     boolean,
  "period_label":           "Last 14 days"
}
```

## Node graph

```
Webhook → ApolloStats → CalendlyMe → CalendlyEvents → Aggregate → Respond
```

All HTTP nodes use `neverError: true` — non-2xx responses become regular JSON the Aggregate node can inspect.

- **ApolloStats** — `GET https://api.apollo.io/api/v1/emailer_campaigns/stats`. Header `X-Api-Key: {apollo_token}`. Returns campaign-level outreach stats. **Apollo plan-tier note:** this endpoint requires a paid Apollo plan; on free tier it returns an error and the Aggregate node nulls out Apollo fields.
- **CalendlyMe** — `GET https://api.calendly.com/users/me`. Header `Authorization: Bearer {calendly_token}`. Returns the user URI used by the next node.
- **CalendlyEvents** — `GET /scheduled_events?user={uri}&min_start_time={14d_ago}&count=100`. Lists events in the last 14 days; the count is the meetings_booked metric.
- **Aggregate** — Code node merges all upstream responses, computes derived rates (open / reply / meeting-conversion), nulls out missing fields cleanly.
- **Respond** — returns the Aggregate JSON.

## Known issues / v2 follow-ups

1. **No webhook auth enforcement.** Same as the other workflows — webhook accepts any POST. v2 adds a Code node up front that checks `x-opsradar-secret`.
2. **Apollo stats endpoint shape.** Apollo has changed their API shape across plan tiers; the Aggregate node tries multiple field names (`num_sent`/`emails_sent`, `num_opens`/`opens`, etc.) but if Apollo changes again the fallback path will null out the fields. Check Apollo's current API docs and update the Aggregate node when you connect.
3. **No Apollo stats parameters.** The `/emailer_campaigns/stats` call doesn't pass campaign IDs — Apollo may require this depending on plan tier. If stats come back empty even with a valid key, you may need to first list campaigns and aggregate their per-campaign stats. Defer until a real Apollo account confirms the right call shape.
4. **Calendly events count cap.** `count=100` should be enough for typical 14-day windows. Heavy users may need pagination.
