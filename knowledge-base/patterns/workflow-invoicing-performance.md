# Workflow: Performance-Based Invoicing

**Category:** Patterns  
**Type:** Workflow Template  
**Complexity:** High — 10–16 hours  
**Source:** Google Ads API, Meta Marketing API, QuickBooks API, Xero API, n8n community workflows, agency billing frameworks  
**Updated:** 2026-04-30

## Overview
Automates invoicing for performance-based agency engagements where the billable amount is calculated from actual ad spend, conversions, or KPI achievement. Common in paid media and performance marketing agencies that charge a base management fee plus a bonus tied to results. The workflow collects platform data, calculates the performance delta against targets, computes the bonus/variable fee, generates an evidence package, routes through two-stage approval, creates the invoice, and maintains a full audit trail. Prevents disputes by attaching timestamped screenshots and metric summaries to every invoice.

## Related Notes
[[n8n-workflow-patterns]] · [[n8n-best-practices]] · [[workflow-invoicing-retainer]] · [[workflow-client-health-score]]

---

## Tools Required
- **n8n** — workflow orchestration
- **Ad platforms** — Google Ads API, Meta Marketing API (Facebook/Instagram), TikTok Ads API, LinkedIn Ads API (as applicable)
- **Accounting** — QuickBooks Online API or Xero API
- **CRM** — HubSpot or Airtable (client performance contracts, KPI targets)
- **Email** — Resend or SendGrid
- **Slack** — approval notifications
- **Cloud storage** — Google Drive or AWS S3 (evidence package storage)
- **Screenshot service** — Puppeteer microservice or Browserless.io (platform screenshot capture)
- **Supabase/Postgres** — audit trail storage

## Architecture

```
[Schedule Trigger: Monthly/Quarterly]
        |
        v
[Get Performance Contracts] (CRM)
        |
        v
[For Each Client Contract]
        |
        v
[Collect Platform Data]
  |--[Google Ads API: spend, conversions, ROAS]
  |--[Meta Ads API: spend, conversions, CPL]
  |--[Other platforms: as configured]
        |
        v
[Aggregate Metrics] (Code node)
        |
        v
[Compare vs Targets] (Code node)
        |
        v
[Calculate Invoice Amount]
  |--[Base fee: always billed]
  |--[Performance bonus: if targets met/exceeded]
  |--[Cap check: if over-performance cap]
  |--[Underperformance: base fee only, $0 bonus]
        |
        v
[Generate Evidence Package]
  |--[Capture platform screenshots]
  |--[Generate metrics PDF summary]
  |--[Upload to Google Drive]
        |
        v
[Stage 1 Approval: Account Manager]
(Slack message with metrics + evidence link)
        |
    [Approved?]
    /          \
  YES           NO → [Flag for revision → notify AM]
   |
   v
[Stage 2 Approval: Finance]
(Slack message with invoice amount + AM sign-off)
        |
    [Approved?]
    /          \
  YES           NO → [Escalate to Director]
   |
   v
[Create Invoice] (QuickBooks/Xero)
        |
        v
[Send Invoice + Evidence Package to Client]
        |
        v
[Record Audit Trail] (Supabase)
        |
        v
[Monitor for Dispute] (webhook listener)
        |
    [Dispute raised?]
    /              \
  YES               NO → workflow complete
   |
   v
[Dispute Handling Sub-workflow]
```

## Trigger
**Schedule node** — runs on the 2nd business day of each month (allows previous month data to finalize in ad platforms). Use `0 9 2 * *` as base cron, then add a weekday check: if 2nd is a weekend, shift to Monday. For quarterly reconciliation, trigger on the 3rd business day of the quarter's first month.

## Node Chain

### 1. Schedule Trigger
- Monthly: 2nd of month at 09:00 agency timezone
- Quarterly: Add IF node checking `{{ [0,3,6,9].includes(new Date().getMonth()) }}`

### 2. Get Performance Contracts
- Fetch from CRM all active performance-based engagements
- Required fields per contract: `client_id`, `client_name`, `billing_period`, `base_fee`, `bonus_type` (percentage of spend/conversions/ROAS delta), `bonus_rate`, `performance_cap`, `kpi_targets` (JSON object), `ad_platform_accounts` (array of platform + account ID pairs)
- Store targets as structured JSON: `{ "google_ads": { "roas_target": 3.5, "spend_cap": 50000 }, "meta": { "cpl_target": 45 } }`

### 3. Collect Platform Data (per client)
Run in parallel using **Merge** node with `Wait for All` mode:

**Google Ads (HTTP Request):**
- Endpoint: `https://googleads.googleapis.com/v17/customers/{customer_id}/googleAds:search`
- Query: GAQL selecting `metrics.cost_micros`, `metrics.conversions`, `metrics.conversions_value` for date range previous calendar month
- Auth: OAuth2 with `https://www.googleapis.com/auth/adwords` scope

**Meta Ads (HTTP Request):**
- Endpoint: `https://graph.facebook.com/v20.0/{account_id}/insights`
- Params: `fields=spend,actions,action_values`, `date_preset=last_month`, `level=account`
- Auth: Bearer token (Meta App access token)

**Normalize data** (Code node): Convert all platform responses to a standard schema: `{ platform, spend, conversions, conversion_value, impressions, clicks, period_start, period_end }`

### 4. Aggregate Metrics
Code node calculating totals across all platforms per client:
```javascript
const totals = {
  total_spend: items.reduce((sum, i) => sum + i.spend, 0),
  total_conversions: items.reduce((sum, i) => sum + i.conversions, 0),
  total_conversion_value: items.reduce((sum, i) => sum + i.conversion_value, 0),
  blended_roas: total_conversion_value / total_spend,
  platforms: items
};
```

### 5. Compare vs Targets
Code node implementing comparison logic:
- For each KPI in contract targets, compute `actual vs target` ratio
- `performance_ratio = actual / target` (e.g., 1.2 = 120% of target)
- Flag: `targets_met = performance_ratio >= 1.0`
- Flag: `overperformance = performance_ratio > cap_ratio` (e.g., > 1.5 if cap is 150%)

### 6. Calculate Invoice Amount
Code node with the billing formula:
```
base_fee = contract.base_fee

if performance_ratio < 1.0:
  bonus = 0
  invoice_amount = base_fee
  invoice_note = "Targets not met — base fee only"

elif performance_ratio >= 1.0 and performance_ratio < cap_ratio:
  bonus = base_fee * bonus_rate * (performance_ratio - 1.0)
  invoice_amount = base_fee + bonus

elif performance_ratio >= cap_ratio:
  bonus = base_fee * bonus_rate * (cap_ratio - 1.0)  # capped
  invoice_amount = base_fee + bonus
  invoice_note = "Performance bonus capped at contract maximum"
```
Produces: `base_fee`, `bonus_amount`, `total_invoice_amount`, `invoice_note`, `performance_ratio`

### 7. Generate Evidence Package
Three parallel steps merged before approval:

**a) Platform Screenshots:**
- HTTP Request to Puppeteer/Browserless service with screenshot instructions
- Capture: Google Ads dashboard for date range, Meta Ads Manager overview
- Save as PNG, upload to Google Drive folder per client per month

**b) Metrics PDF:**
- Build HTML report in Code node with performance table (target vs actual per KPI, delta, color coding)
- Convert to PDF via HTTP Request to PDFShift or similar
- Upload to Google Drive, store shareable link

**c) Raw Data Export:**
- Serialize aggregated metrics JSON to a Google Sheet tab named `{{ client_name }}-{{ YYYY-MM }}`

### 8. Stage 1 Approval: Account Manager
- Slack message to account manager (DM or channel): client name, billing period, base fee, bonus amount, total, performance summary, link to evidence package in Google Drive
- Wait node: up to 24 hours
- Buttons: Approve / Request Revision
- On revision request: create a Notion/ClickUp task with the account manager's notes; halt invoice flow

### 9. Stage 2 Approval: Finance
- Slack message to `#finance-approvals`: includes account manager's sign-off timestamp, same invoice details
- Wait node: up to 8 business hours
- On no response: escalate to Finance Director via DM

### 10. Create Invoice
- **QuickBooks**: POST `/v3/company/{realmId}/invoice`
  - Line items: base fee (service item), performance bonus (separate line item for audit clarity)
  - AttachableRef: link to evidence PDF in Google Drive
- **Xero**: POST to `/api.xro/2.0/Invoices`
  - Two LineItems: base and bonus
  - Add CIS/tax codes as applicable per client's tax jurisdiction

### 11. Send to Client
- Email via Resend/SendGrid:
  - Subject: `{{ client_name }} — Performance Invoice {{ period }} — Invoice {{ invoice_number }}`
  - Body: executive summary of performance vs targets, bonus earned, total due
  - Attachments: invoice PDF + evidence package PDF
  - Include DocuSign/PandaDoc link for acknowledgment (optional)

### 12. Audit Trail
- Insert to Supabase `performance_invoices` table:
  - `invoice_id`, `client_id`, `period`, `base_fee`, `bonus_amount`, `total`, `performance_ratio`, `targets_json`, `actuals_json`, `evidence_drive_url`, `am_approver`, `finance_approver`, `created_at`
- This table is the source of truth for dispute resolution

### 13. Dispute Handling Sub-workflow
Triggered by webhook (client replies to invoice email with dispute flag, or manual trigger from account manager):
- Retrieve audit trail record for the invoice
- Generate dispute packet: audit trail + evidence links + calculation breakdown
- Create escalation task in ClickUp/Asana assigned to account manager + finance
- Send acknowledgment to client within 2 hours
- Track resolution status

## Error Handling
- **Platform API unavailable**: If Google Ads or Meta API returns 5xx, retry after 15 min × 3 attempts. If still failing, send Slack alert to technical team; do not generate invoice with partial data — create a `pending_data` record and re-trigger after 4 hours
- **Missing contract data**: If CRM record is missing KPI targets or base fee, skip client, log to `data_issues` table, notify account manager
- **Screenshot service failure**: Fall back to a templated metrics table (HTML/CSS) in the PDF instead of actual screenshots; flag the evidence package as "screenshot unavailable" so client knows
- **Approval timeout Stage 1**: Auto-escalate to account manager's manager after 24h with urgency flag
- **Approval timeout Stage 2**: Auto-escalate to finance director after 8h

## Approval Points
1. **Account Manager Review** (Stage 1): Validates performance metrics match their understanding before finance sees it
2. **Finance Approval** (Stage 2): Confirms invoice amount and billing terms before client dispatch
3. **Dispute resolution**: Any disputed invoice requires both AM and Finance sign-off before credit or adjustment is issued

## Common Failure Modes
- **Data finalization lag**: Ad platforms take 24–72h to finalize conversion data; always pull data with a 2-business-day delay
- **Attribution window mismatch**: Client expects 7-day click attribution; API returns 1-day; document attribution window in contract and match API parameters exactly
- **Currency inconsistency**: Platform reports in advertiser's local currency; base fee may be in different currency; normalize to contract currency early in the flow
- **Bonus calculation dispute**: Client contests the formula; mitigate by including the formula and each input value in the evidence package
- **API quota exhaustion**: Google Ads API has per-developer-token quotas; for agencies managing many accounts, stagger requests across the day
- **Overperformance edge case**: If performance_ratio = exactly cap_ratio (e.g., 1.5000000001 due to floating point), apply strict `>=` comparison with a small epsilon

## n8n Implementation Notes
- Store the bonus calculation formula in a credential or environment variable, not hardcoded in the Code node, so it can be updated without editing the workflow
- Use n8n's `Merge (Wait for All)` mode when collecting multi-platform data to ensure all APIs respond before aggregation
- The `Wait` nodes require n8n webhook URLs to be publicly accessible; test approval flow end-to-end in staging before activating
- Use **sub-workflows** for: evidence generation, dispute handling, and the follow-up sequence — keeps the main flow under 25 nodes
- Log every intermediate calculation step to the audit trail table during development; remove verbose logging from production but keep the key values
- Consider n8n's **Error Workflow** setting to route all uncaught errors to a centralized error-handling workflow

## Variants
- **Monthly vs quarterly reconciliation**: Monthly invoices use `last_calendar_month` date range; quarterly reconciliation adds a true-up calculation comparing the sum of monthly base fees paid against the quarterly performance target — issue a credit or additional invoice for the delta
- **Spend-based bonus**: If the bonus is a percentage of managed spend above a threshold (common for paid media agencies), replace the conversion comparison with a spend threshold check
- **Tiered bonus structure**: Multiple bonus rates at different performance levels (e.g., 5% bonus at 100–120% of target, 10% at 120–150%); implement as a sorted lookup table in the Code node
- **No-bonus underperformance penalty**: Some contracts include a service credit if performance falls below 80% of target; add a negative line item when `performance_ratio < 0.8`
- **Third-party verification**: For high-value contracts, integrate a third-party analytics tool (Supermetrics, Databox) as the authoritative data source instead of direct platform APIs
