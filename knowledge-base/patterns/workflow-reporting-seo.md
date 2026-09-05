# Workflow: Reporting OS for SEO Agencies

**Category:** Patterns  
**Type:** Workflow Template  
**Complexity:** Medium — 5–8 hours  
**Source:** Google Search Console API docs, GA4 Data API docs, n8n community, SEO agency ops research  
**Updated:** 2026-04-30

## Overview
This workflow automates the weekly or monthly SEO reporting cycle for SEO agencies. It pulls organic search data from Google Search Console (GSC), traffic and engagement data from GA4, and optionally rank tracking and backlink metrics from SEMrush or Ahrefs. It calculates rankings, organic traffic, CTR, impressions, keyword changes, and page-level performance. Output is a Notion page or Google Sheets report plus a client email. Handles the GSC 3-day data delay and GA4 sampling limitations gracefully. Sends a "no data" notice when data sources are unavailable rather than failing silently.

Primary users: SEO account managers, content strategists, agency ops leads.  
Business value: eliminates 4–6 hours/week per client of manual data pulling, ensures consistent reporting cadence, and surfaces ranking changes automatically.

## Related Notes
[[n8n-workflow-patterns]] · [[n8n-best-practices]] · [[approval-client-facing-actions]] · [[approval-human-decision-framework]]

---

## Tools Required
- **Google Search Console API** (OAuth2, site owner or delegated access)
- **GA4 Data API** (Google Analytics Data API v1, OAuth2 or service account)
- **SEMrush API** (optional — keyword rankings, domain analytics)
- **Ahrefs API** (optional — backlinks, domain rating)
- **Rank tracking tool API** (optional — STAT, AccuRanker, or Serpstat)
- **Google Sheets API** (report output)
- **Notion API** (optional — report page creation)
- **Email service** (Gmail, SendGrid, or Resend)
- **n8n** (workflow engine)
- **Supabase or Airtable** (client config store)

## Architecture
```
Schedule Trigger (weekly Monday / monthly 1st)
        |
        v
Fetch Client Config (Supabase — site URL, GA4 property ID, GSC site, recipients)
        |
        v
Split In Batches (1 client at a time)
        |
        +---> HTTP Request: GSC API — search analytics (keywords, pages, countries)
        |              [apply 3-day offset to date range]
        |
        +---> HTTP Request: GA4 Data API — organic sessions, engaged sessions, conversions
        |
        +---> HTTP Request: SEMrush / Ahrefs API [optional]
        |
        +---> HTTP Request: Rank Tracker API [optional]
        |
        v
Code Node: Merge + Calculate KPIs
        (organic CTR, impressions, avg position, traffic delta, keyword movements)
        |
        v
IF Node: Any data source returned zero rows?
        |
        +--[YES]--> Set partial_report flag, build "no data" notice string
        |
        v
Code Node: WoW / MoM comparison (prior period from Sheets or second API call)
        |
        v
Google Sheets Node: Write report rows (per-client tab)
        |
        v
[IF Notion enabled]
        |
        +---> Notion API: Create or update report page with structured blocks
        |
        v
Wait Node: Approval request → Slack to account manager
        |
        v
[Approval webhook]
        |
        +--[APPROVED]--> Email Node: Send weekly digest to client
        |
        +--[REJECTED]--> Notify drafter, stop send
        |
        v
Update Client Record: last_report_sent_at, next_report_date
```

## Trigger
Weekly: Monday at 6 AM UTC (GSC data is available for the week ending last Friday, minus 3-day delay). Monthly: 4th of the month (to ensure full prior-month GSC data is available — GSC data through end of prior month is accessible by the 3rd). Manual trigger for ad-hoc runs.

## Node Chain

**1. Schedule Trigger**  
Cron schedule. For weekly: `0 6 * * 1`. For monthly: `0 6 4 * *`. A single trigger drives all clients via Split In Batches.

**2. Fetch Client Config**  
Supabase/Airtable: fetch all rows where `seo_reporting_active = true`. Fields: `client_id`, `gsc_site_url` (format: `sc-domain:example.com` or `https://example.com/`), `ga4_property_id`, `semrush_project_id` (nullable), `ahrefs_target` (nullable), `rank_tracker_campaign_id` (nullable), `report_type` (weekly/monthly), `recipients`, `account_manager_slack_id`.

**3. HTTP Request — GSC API (Search Analytics)**  
POST `https://searchconsole.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query`  
Body: dimensions `[query, page, country]`, dateRange with 3-day offset (endDate = today - 3 days, startDate = endDate - 6 days for weekly / endDate - 29 days for monthly), rowLimit 25000.  
Auth: OAuth2.  
On error or empty rows: set `gsc_data_available = false`.

**4. HTTP Request — GA4 Data API**  
POST `https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport`  
Dimensions: `date`, `sessionDefaultChannelGroup`, `landingPage`  
Metrics: `sessions`, `engagedSessions`, `conversions`, `bounceRate`, `averageSessionDuration`  
Filter: `sessionDefaultChannelGroup == "Organic Search"`  
Date range: same as GSC (minus 3 days to align).  
Note: GA4 applies sampling on large sites (>10M sessions). If `metadata.samplingMetadatas` is present, log a warning and add a disclaimer to the report.

**5. HTTP Request — SEMrush API (optional)**  
GET `https://api.semrush.com/?type=domain_organic&key={api_key}&domain={domain}&database=us`  
Returns keyword rankings. If `semrush_project_id` is null in config, skip this node entirely (use IF node before).

**6. HTTP Request — Ahrefs API (optional)**  
GET `https://api.ahrefs.com/v2/domain-overview` with `target={domain}` and `output=json`.  
Returns domain rating, referring domains, backlinks count. Skip if `ahrefs_target` is null.

**7. HTTP Request — Rank Tracker API (optional)**  
Varies by tool. AccuRanker: GET `https://app.accuranker.com/api/v4/keywords/?campaign_id={id}`. Returns current rank, prior rank, search volume per tracked keyword.

**8. Code Node — Merge and Calculate KPIs**  
Merges all data sources. Calculates:
- **Organic CTR** = GSC clicks / GSC impressions
- **Average position** = weighted mean of position × impressions per keyword
- **Top 3 / Top 10 keywords** = count of queries with avg_position ≤ 3 / ≤ 10
- **Organic traffic delta** = (current sessions - prior sessions) / prior sessions × 100
- **New keywords** = queries appearing in current period not present in prior period
- **Lost keywords** = queries present in prior period, absent in current (position > 20 or no data)
- If any data source returned no rows, appends to `missing_data_sources` array.

**9. IF Node — No Data Check**  
Condition: `missing_data_sources.length > 0`.  
On true: set `partial_report = true`, build human-readable notice: "Note: GSC data unavailable for this period — organic search metrics may be incomplete."

**10. Code Node — WoW/MoM Comparison**  
Fetches prior period rows from Google Sheets (append-only history). Computes delta for: sessions, impressions, clicks, CTR, avg position, conversions. Tags each metric with directional arrow string (`▲ 12%` / `▼ 3%`).

**11. Google Sheets Node — Write Report**  
Appends rows to client-specific tab. Columns: `report_date`, `period_start`, `period_end`, `organic_sessions`, `impressions`, `clicks`, `ctr`, `avg_position`, `conversions`, `top3_keywords`, `top10_keywords`, `partial_report`.

**12. Notion API — Create Report Page (optional)**  
Creates a new page in the client's Notion reporting database. Populates blocks: headline metrics (callout blocks), top 10 keywords table, traffic chart link (Sheets), top landing pages table, keyword movers table, and partial report notice if applicable.

**13. Wait Node — Approval**  
Slack message to account manager: headline KPIs inline, link to Sheets/Notion, Approve / Reject buttons. Timeout: 4 hours. On timeout: escalate to team lead.

**14. Email Node — Client Digest**  
Subject: `[Client] SEO Weekly Digest — w/c [date]` or `[Client] SEO Monthly Report — [Month] [Year]`.  
Inline: organic sessions, clicks, impressions, CTR, avg position, notable keyword movements (max 5 bullets). Attach PDF if PDF generation is enabled (optional variant). Include partial data notice if applicable.

**15. Update Client Record**  
Supabase: update `last_seo_report_sent_at`, `next_seo_report_date`.

## Error Handling

| Failure Point | Behavior |
|---|---|
| GSC OAuth token expired | Slack alert to account manager: "GSC token for [domain] needs re-authorization." Skip GSC block; report proceeds as partial. |
| GSC API returns 403 (access revoked) | Flag in error table, alert AM with re-access instructions. |
| GA4 property not found (404) | Mark `ga4_data_available = false`, continue with partial report. |
| GA4 sampling detected | Log warning, add disclaimer to report. Do not fail. |
| SEMrush/Ahrefs 429 rate limit | Exponential backoff 30s, 60s, 120s. If still failing after 3 retries, skip and mark data unavailable. |
| Empty GSC result set | Normal for new sites or sites with very low traffic. Return "no data" notice rather than error. |
| Notion API rate limit | Retry with 1-second delay between retries (Notion allows 3 req/s). |
| Approval timeout | Escalate to team lead Slack. Halt report send. |

## Approval Points

**1. Pre-send approval (mandatory):**  
Account manager reviews headline KPIs and Sheets/Notion link before client email is sent. Required because client-facing SEO reports directly reflect agency performance perceptions.

**2. Partial report acknowledgment:**  
If `partial_report = true`, Slack approval message explicitly states which data sources are missing. Account manager must acknowledge this before approving send, ensuring they can address client questions about missing data.

## Common Failure Modes

1. **GSC 3-day data lag ignored** — Queries that use `endDate = today` will return incomplete or empty data for the most recent 3 days. Always offset end date by 3 days. Bake this offset into a config constant.
2. **GSC site URL format mismatch** — GSC supports both domain property format (`sc-domain:example.com`) and URL-prefix format (`https://www.example.com/`). Store the exact GSC-registered format in client config; the API is case-sensitive and format-sensitive.
3. **GA4 property ID confusion** — GA4 uses a numeric property ID (e.g., `123456789`), not the tracking ID (G-XXXXXXXX). Store the numeric ID in config.
4. **GA4 channel grouping drift** — GA4's default channel grouping for "Organic Search" can misclassify traffic if UTM parameters are inconsistently applied. Note this in reports and recommend UTM discipline to clients.
5. **Keyword count over 25,000** — GSC rowLimit is 25,000. Large sites exceed this. Implement pagination by date (split report date range into weekly chunks and merge) or by page/query dimension to capture the full dataset.
6. **No-data new client** — A client site with fewer than 16 weeks of GSC history will have no MoM comparison data. Add a conditional: if prior period is empty, omit comparison section rather than showing division-by-zero errors.

## n8n Implementation Notes

- **GSC OAuth2:** Configure in n8n OAuth2 credential with scopes `https://www.googleapis.com/auth/webmasters.readonly`. Store refresh token in Supabase for long-lived access.
- **GA4 service account:** Prefer a Google service account (JSON key) over OAuth2 for unattended server-to-server GA4 calls. Store JSON key in n8n credential as Generic Credential type.
- **HTTP Request node pagination:** GSC does not support pagination directly — use `rowLimit: 25000` and split by date range if the site is large. GA4 supports `offset` and `limit` in the report request for pagination.
- **Date range calculation in Code node:** Use `luxon` (available in n8n Code nodes via `require`) for reliable timezone-aware date arithmetic. Example: `DateTime.now().setZone('UTC').minus({days: 3}).toISODate()`.
- **Notion database vs. page:** Creating a database entry (row) is simpler than creating a full page for structured reporting. Use `POST /v1/pages` with `parent: {database_id: ...}` and populate properties rather than blocks for tabular data. Use blocks for narrative summaries.

## Variants

**Variant A — Sheets Only, No Notion**  
Skip Notion entirely. All reporting lives in Google Sheets. Simpler setup, easier client access via shared link.

**Variant B — Keyword Alert Digest**  
Run daily (not weekly) just to detect significant ranking changes (position drop >10 for a top keyword) and send an immediate Slack alert to the AM. Full report still runs weekly.

**Variant C — Automated Insight Generation (AI)**  
After KPI calculation, pass the metrics JSON to OpenAI (GPT-4o) with a prompt: "Summarize these SEO metrics in 3 bullets for a client email. Highlight the most important change." Prepend the AI summary to the email body. Add `ai_generated: true` flag to the report record.

**Variant D — Competitor Share of Voice Tracking**  
Add a SEMrush competitor comparison call. Track share of voice (SOV) trends for 3–5 target competitors defined in client config.
