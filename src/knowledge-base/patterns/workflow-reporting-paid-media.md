# Workflow: Reporting OS for Paid Media Agencies

**Category:** Patterns  
**Type:** Workflow Template  
**Complexity:** Medium — 6–10 hours  
**Source:** Agency operations research, n8n community, Google Ads API docs, Meta Marketing API docs  
**Updated:** 2026-04-30

## Overview
This workflow automates the end-to-end reporting cycle for paid media agencies. It pulls spend, performance, and conversion data from Google Ads, Meta Ads, and optionally LinkedIn or TikTok, calculates key KPIs (CPA, ROAS, CTR, budget pacing), formats the data into a Google Sheets report or Looker Studio data source, generates a PDF summary, and emails it to the client on a weekly or monthly schedule. It supports multi-client operation with per-client configuration and includes MoM/YoY comparisons, budget pacing alerts, and a mandatory approval gate before any client-facing send.

Primary users: paid media account managers, agency ops leads.  
Business value: eliminates 3–8 hours/week of manual reporting per client, reduces human error in KPI calculation, and ensures consistent client communication cadence.

## Related Notes
[[n8n-workflow-patterns]] · [[n8n-best-practices]] · [[approval-client-facing-actions]] · [[approval-human-decision-framework]]

---

## Tools Required
- **Google Ads API** (OAuth2, Google Ads Manager Account access)
- **Meta Marketing API** (Facebook app, system user token or OAuth2)
- **LinkedIn Marketing API** (optional, OAuth2)
- **TikTok Marketing API** (optional)
- **Google Sheets API** (for report output)
- **Looker Studio** (data connector, optional — driven from Sheets)
- **PDF generation** (HTML-to-PDF via Browserless, Gotenberg, or n8n Code node with PDFKit)
- **Email service** (Gmail, SendGrid, or Resend)
- **n8n** (workflow engine)
- **Supabase or Airtable** (client config store — account IDs, budget targets, contacts)

## Architecture
```
Schedule Trigger (weekly/monthly)
        |
        v
Fetch Client Config (Supabase/Airtable — all active clients)
        |
        v
Split In Batches (1 client at a time)
        |
        +---> HTTP Request: Google Ads API (campaign performance)
        |
        +---> HTTP Request: Meta Ads API (campaign performance)
        |
        +---> HTTP Request: LinkedIn/TikTok API [optional]
        |
        v
Code Node: Merge + Calculate KPIs (CPA, ROAS, CTR, budget pacing %)
        |
        v
Code Node: MoM / YoY Comparison (fetch prior period, compute delta)
        |
        v
IF Node: Budget pacing alert? (spend > 90% of budget with > 7 days left → alert)
        |
        +--[YES]--> Slack notification to account manager
        |
        v
Google Sheets Node: Write report data (per-client tab or dedicated sheet)
        |
        v
HTTP Request: Generate PDF (Browserless or Gotenberg)
        |
        v
Wait Node: Send approval request to account manager (Slack message with approve/reject buttons)
        |
        v
[Approval webhook received]
        |
        +--[REJECTED]--> Notify drafter, stop send
        |
        +--[APPROVED]-->
                |
                v
        Email Node: Send PDF report to client
                |
                v
        Update Client Record: Mark report as sent, timestamp
```

## Trigger
Cron schedule — configurable per client: weekly (Monday 7 AM client timezone) or monthly (1st of month). For multi-client workflows, a single cron fires and loops through all active client configs stored in the config table. A manual trigger variant is also wired for ad-hoc report generation.

## Node Chain

**1. Schedule Trigger**  
Standard n8n Cron or Schedule trigger. Set to the earliest client timezone to avoid missed windows. Downstream logic handles per-client scheduling logic if clients span timezones.

**2. Fetch Client Config**  
Supabase or Airtable node: fetch all rows where `reporting_active = true` and `next_report_date <= today`. Returns array: `client_id`, `google_ads_customer_id`, `meta_ad_account_id`, `linkedin_account_id` (nullable), `monthly_budget_usd`, `report_recipients`, `account_manager_slack_id`, `report_frequency`.

**3. Split In Batches (batch size = 1)**  
Iterates per client. Ensures API rate limits are respected and one client failure does not abort others.

**4. HTTP Request — Google Ads API**  
POST to `https://googleads.googleapis.com/v17/customers/{customer_id}/googleAds:searchStream`  
Query: campaign-level metrics for current period (impressions, clicks, cost_micros, conversions, conversion_value).  
Auth: OAuth2 with developer token in header.  
On error: set `google_ads_error = true`, continue with null data (partial report).

**5. HTTP Request — Meta Ads API**  
GET `https://graph.facebook.com/v19.0/act_{ad_account_id}/insights`  
Fields: `campaign_name, spend, impressions, clicks, cpc, ctr, actions, action_values`  
Date preset: `last_week` or `last_month`.  
On error: set `meta_error = true`, continue.

**6. HTTP Request — LinkedIn / TikTok (optional)**  
LinkedIn: GET `https://api.linkedin.com/v2/adAnalytics` with campaign filter.  
TikTok: GET `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/`  
Both are optional. If account ID is null in config, skip via IF node.

**7. Code Node — Merge and Calculate KPIs**  
Merges platform data into unified structure. Calculates:
- **CTR** = clicks / impressions
- **CPC** = spend / clicks
- **CPA** = spend / conversions
- **ROAS** = conversion_value / spend
- **Budget pacing %** = (spend_to_date / (monthly_budget * days_elapsed / days_in_month)) × 100
- Flags missing platform data with `data_missing` array for partial report notice.

**8. Code Node — MoM / YoY Comparison**  
Fetches prior period data (either from previous Sheets row or API call with prior date range). Computes delta % for each KPI. Annotates each metric with `+12%` / `-5%` directional string for report display.

**9. IF Node — Budget Pacing Alert**  
Condition: `pacing_pct > 110` (overpacing) OR `pacing_pct < 70 AND days_remaining < 7` (underpacing risk).  
On true: Slack message to account manager: "⚠️ [Client] budget pacing at {pacing_pct}% — review before report send."

**10. Google Sheets Node — Write Report Data**  
Writes structured rows to client-specific tab (or a master sheet with client_id column). Columns: date, platform, campaign, impressions, clicks, spend, conversions, CPA, ROAS, CTR, budget_pct, mom_delta. Enables Looker Studio to use the sheet as a live data source.

**11. HTTP Request — Generate PDF**  
Sends HTML report template (populated via Code node string interpolation) to Browserless or Gotenberg.  
Returns PDF binary.  
Store in `/tmp` or pass directly to email node as attachment.

**12. Wait Node — Approval Request**  
Sends Slack message to `account_manager_slack_id` with report summary, PDF link, and Approve / Reject buttons (using Slack Block Kit interactive components). Sets a unique approval token. Pauses workflow execution (n8n Wait node with resume webhook).  
Timeout: 4 hours. If no response → auto-escalate to team lead via Slack.

**13. Approval Webhook**  
Separate n8n webhook workflow receives Slack interactive callback, validates token, resumes parent workflow execution with `approved = true/false`.

**14. Email Node — Send to Client**  
Sends from agency-branded email address. Subject: `[Client Name] — [Month] Paid Media Report`.  
Attaches PDF. Body includes headline KPIs inline (spend, ROAS, CPA) for email preview.  
CC: account manager.

**15. Update Client Record**  
Supabase: update `last_report_sent_at = now()` and `next_report_date = now() + interval`.

## Error Handling

| Failure Point | Behavior |
|---|---|
| Google Ads API 401 | Slack alert to account manager — token refresh needed. Report continues as partial. |
| Meta API rate limit (HTTP 429) | Exponential backoff: wait 30s, 60s, 120s. After 3 retries, mark platform as unavailable and proceed. |
| LinkedIn/TikTok API error | Skip platform, include `Data unavailable for LinkedIn this period` in report. |
| PDF generation timeout | Retry once. If fails, send CSV attachment instead; note in email body. |
| Email delivery failure | Retry 3x with 5-minute intervals. Log failure to Supabase. Slack alert to account manager. |
| Approval timeout (>4h) | Auto-escalate: send Slack message to team lead with context. Do not auto-send report. |
| Batch item failure | Use n8n `continueOnFail: true` on Split In Batches. Log failed client_id to error table. Continue remaining clients. |

## Approval Points

**1. Pre-send approval (mandatory):**  
Account manager must approve report via Slack before client email is sent. Approval message includes: total spend, top-line ROAS, budget pacing %, and PDF preview link. This gate exists because reports are client-facing and represent the agency professionally.

**2. Budget pacing alert acknowledgment:**  
If pacing is abnormal (>110% or <70% with <7 days remaining), account manager must acknowledge the Slack alert. This is advisory, not a workflow gate, but creates an audit trail.

## Common Failure Modes

1. **Google Ads OAuth token expiry** — Long-running automations often have stale tokens. Implement token refresh logic with Supabase storage for refresh tokens. Alert if refresh fails.
2. **Meta API data delay** — Meta data for the current day is unreliable. Always query with `date_preset: last_week` ending yesterday, or specify explicit date ranges ending 1 day before run date.
3. **Multi-currency clients** — If clients spend in non-USD currencies, normalize to USD using an FX API (e.g., ExchangeRate-API) in the Code node before KPI calculations.
4. **Zero-conversion tracking** — A client with broken conversion tracking returns 0 CPA and infinite ROAS. Add a sanity check: if conversions = 0 and spend > $500, flag as "conversion tracking may be broken."
5. **Google Sheets row limit** — At 10M+ rows the Sheets API slows significantly. Implement quarterly archive: move rows older than 90 days to archive tab.
6. **Approval Slack message not seen** — Account managers ignore or miss Slack messages. Add email fallback approval if Slack response not received within 2 hours.

## n8n Implementation Notes

- **OAuth2 credentials:** Store Google Ads and Meta OAuth tokens as n8n credential objects. Use HTTP Request nodes with pre-configured credentials rather than raw Authorization headers where possible.
- **Google Ads developer token:** Must be in the `developer-token` HTTP header on every Ads API request. Store as an n8n credential field.
- **Pagination:** Google Ads searchStream returns up to 10,000 rows per stream. For large accounts, paginate using `pageToken`. Meta Insights API uses cursor-based pagination — check for `data.paging.next` and loop.
- **Split In Batches resume:** When using Wait node inside Split In Batches, ensure the resume webhook passes back the correct `executionId` so n8n can route the resume to the right paused execution.
- **Timezone handling:** All date calculations should use client timezone stored in config. Use JavaScript `Intl.DateTimeFormat` in Code nodes.
- **Per-client vs. per-workflow architecture:** For agencies with fewer than 20 clients, a single workflow with Split In Batches is sufficient. For 20+ clients, consider one workflow per client with parameterized configs to avoid single-workflow execution time limits.

## Variants

**Variant A — Looker Studio Push Only**  
Skip PDF generation and email. Just push data to Sheets and notify AM that Looker Studio dashboard is updated. Lower complexity; client views the live dashboard themselves.

**Variant B — Slack Digest Instead of Email**  
Send a Slack message to a shared client/agency Slack channel with headline KPIs and a Sheets link. Suitable for tech-forward clients who prefer Slack over email.

**Variant C — Daily Pacing Check**  
Run a lightweight version daily (no PDF, no email) that only checks budget pacing and sends Slack alerts to the team. Full report still runs weekly/monthly.

**Variant D — White-label Report**  
Inject client branding (logo, colors) into the HTML template before PDF generation. Requires per-client branding config stored in the config table.
