# n8n Workflow: `dashboard-sales-hubspot`

**Purpose:** Backs the `<SalesCard />` widget on `/dashboard`. Receives a HubSpot Private App token, calls HubSpot's Deals + Contacts APIs, aggregates into the widget contract, returns JSON.

## Live coordinates

- **Instance:** `https://opsradar.app.n8n.cloud`
- **Workflow ID:** `qLAK7PFz1qy9emFz`
- **Webhook URL:** `POST https://opsradar.app.n8n.cloud/webhook/dashboard-sales-hubspot`
- **Status:** Active

## Definition

The full workflow JSON is checked in at [n8n-dashboard-sales-hubspot.workflow.json](./n8n-dashboard-sales-hubspot.workflow.json). To rebuild from scratch on a new n8n instance:

```bash
N8N_API_KEY="<your n8n API key>"
curl -X POST "https://<n8n-host>/api/v1/workflows" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "content-type: application/json" \
  --data-binary @docs/integrations/n8n-dashboard-sales-hubspot.workflow.json

# Then activate (replace WORKFLOW_ID with the response id)
curl -X POST "https://<n8n-host>/api/v1/workflows/WORKFLOW_ID/activate" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

## Request shape

The Next.js API route at `/api/dashboard/sales` POSTs:

```json
{
  "hubspot_token": "pat-na1-...",
  "client_id": "<supabase user id>"
}
```

Header: `x-opsradar-secret: <N8N_WEBHOOK_SECRET>` (currently informational; the workflow does not enforce it — see Known issues below).

## Response shape

```json
{
  "pipeline_value": 187000,
  "new_leads": 47,
  "auto_leads": 31,
  "sparkline": [3, 5, 2, 0, 4, 8, 1, 6, 3, 2, 5, 4, 1, 3],
  "period_label": "Last 14 days"
}
```

`auto_leads` counts contacts where `hs_analytics_source` is `INTEGRATION` or `API` (interpreted as automation-created).

## Node graph

```
Webhook → OpenDeals → RecentContacts → Aggregate → Respond
```

- **Webhook** — POST `dashboard-sales-hubspot`, response mode `responseNode`.
- **OpenDeals** — `GET https://api.hubapi.com/crm/v3/objects/deals?properties=amount,dealstage,createdate&limit=100&archived=false`. Bearer token from webhook payload.
- **RecentContacts** — `POST https://api.hubapi.com/crm/v3/objects/contacts/search` filtering `createdate >= now() - 14 days`.
- **Aggregate** — JS node that sums open-deal amounts (excluding `closedwon`/`closedlost`), counts contacts, builds 14-day sparkline.
- **Respond** — returns the Aggregate output as JSON.

## Known issues / v2 follow-ups

1. **No webhook auth enforcement.** The Webhook node accepts any POST. The dashboard sends `x-opsradar-secret` but n8n doesn't validate it. v2: add a Code node at the top that checks `$json.headers["x-opsradar-secret"]` and `$throw`s if it doesn't match `$env.OPSRADAR_WEBHOOK_SECRET`.
2. **HubSpot errors halt the workflow.** If the token is invalid or HubSpot returns 5xx, the OpenDeals node throws and the Respond node never fires — the dashboard receives an empty 200 response. Set `options.response.response.neverError: true` on the HTTP Request nodes so error responses bubble through to a graceful Aggregate path.
3. **No tenant routing.** Currently a single workflow on the agency's own n8n. When customers run their own n8n, this same definition gets deployed per-tenant via the customer's API key. See spec for the multi-tenant follow-up plan.
