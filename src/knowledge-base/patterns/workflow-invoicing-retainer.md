# Workflow: Recurring Retainer Invoicing

**Category:** Patterns  
**Type:** Workflow Template  
**Complexity:** Medium — 6–10 hours  
**Source:** QuickBooks API docs, Xero API docs, Stripe Billing API, HubSpot CRM API, Airtable API, Resend/SendGrid docs, n8n community workflows  
**Updated:** 2026-04-30

## Overview
Automates the end-to-end monthly or quarterly invoicing cycle for agency retainer clients. Finance teams typically run this manually, consuming 2–4 hours per billing cycle across client list retrieval, invoice creation, email dispatch, and follow-up. This workflow eliminates that overhead, ensures consistent invoice numbering, handles currency conversion for international clients, and triggers escalating follow-up sequences for late payers. Particularly valuable for agencies with 10+ retainer clients billed at regular intervals.

## Related Notes
[[n8n-workflow-patterns]] · [[n8n-best-practices]] · [[workflow-invoicing-performance]] · [[workflow-time-tracking]]

---

## Tools Required
- **n8n** (self-hosted or cloud) — workflow orchestration
- **CRM** — HubSpot or Airtable (client list, retainer amounts, billing contacts)
- **Accounting/invoicing** — QuickBooks Online API, Xero API, or Stripe Billing
- **Email** — Resend or SendGrid (invoice dispatch)
- **Slack** — finance team notifications
- **Redis or Postgres** — invoice number sequence counter (thread-safe increment)
- **Google Sheets** (optional) — simple ledger record if not using full accounting system

## Architecture

```
[Schedule Trigger]
        |
        v
[Get Active Retainer Clients] (HubSpot/Airtable)
        |
        v
[Filter: Billing Due This Cycle] (IF node)
        |
        v
[Generate Invoice Number] (Code node — atomic counter)
        |
        v
[Currency Conversion] (HTTP Request → FX API, IF non-USD)
        |
        v
[Create Invoice] (QuickBooks / Xero / Stripe API)
        |
        v
[Approval Gate] (Wait node → Slack approval message)
        |
    [Approved?]
    /          \
  YES           NO
   |             |
   v             v
[Generate     [Abort + Notify
 PDF Invoice]  Finance Slack]
   |
   v
[Send Invoice Email] (Resend/SendGrid)
   |
   v
[Mark Sent in CRM/Airtable]
   |
   v
[Notify Finance Slack: Invoice Sent]
   |
   v
[Schedule Follow-up Sequence]
   |
   +--[7-day check: paid?] --> YES: done | NO: send reminder 1
   |
   +--[14-day check: paid?] --> YES: done | NO: send reminder 2
   |
   +--[30-day check: paid?] --> YES: done | NO: escalate to account manager
```

## Trigger
**Schedule node** — runs on the 1st of each month (monthly retainers) or 1st of January/April/July/October (quarterly). Use a cron expression: `0 8 1 * *` for monthly at 08:00. For quarterly, use a second Schedule node with month filtering via an IF node checking `{{ new Date().getMonth() % 3 === 0 }}`.

## Node Chain

### 1. Schedule Trigger
- Cron: `0 8 1 * *` (monthly) or filtered quarterly
- Timezone: Set to agency's local timezone

### 2. Get Active Retainer Clients
- **HubSpot**: HTTP Request to `/crm/v3/objects/deals` filtered by `deal_stage=retainer_active` and `next_billing_date <= today`
- **Airtable**: List Records from `Clients` table, filter formula: `AND({Status}="Active", {BillingCycle}="Monthly", IS_BEFORE({NextBillingDate}, TODAY()))`
- Output fields needed: `client_id`, `client_name`, `billing_contact_email`, `retainer_amount`, `currency`, `billing_start_date`, `tax_rate`, `payment_terms`

### 3. Split Into Items
- Use a **SplitInBatches** node (batch size 1) or **Loop Over Items** to process each client independently

### 4. Check for New vs Existing Client
- IF node: `{{ $json.first_invoice === true }}`
  - New client path: calculate prorated amount for mid-month starts
  - Existing client path: use full retainer amount
- **Proration formula** (Code node): `amount = (retainer_amount / days_in_month) * remaining_days_in_month`

### 5. Generate Invoice Number (Thread-Safe)
- Use a **Postgres** or **Redis** node to atomically increment an invoice counter
- Postgres: `UPDATE invoice_counter SET seq = seq + 1 RETURNING seq` in a transaction
- Format: `INV-{{ year }}-{{ seq.toString().padStart(5, '0') }}` e.g. `INV-2026-00142`
- Fallback: store counter in Airtable with a locked update pattern (less reliable under concurrency)

### 6. Currency Conversion
- IF node: `{{ $json.currency !== 'USD' }}`
- Yes path: HTTP Request to `https://api.exchangerate.host/latest?base=USD&symbols={{ $json.currency }}`
- Multiply retainer_amount by rate
- Store both `amount_local` and `amount_usd` on the item

### 7. Create Invoice in Accounting System
- **QuickBooks**: POST `/v3/company/{realmId}/invoice` with customer ref, line items, due date
- **Xero**: POST `/api.xro/2.0/Invoices` with Contact, LineItems, DueDate, CurrencyCode
- **Stripe**: Create Invoice via `/v1/invoices` + InvoiceItem, then finalize with `/v1/invoices/{id}/finalize`
- Set `due_date = today + payment_terms_days` (e.g., Net 30 = today + 30)
- Store returned `invoice_id` and `invoice_url` on item

### 8. Approval Gate
- **Slack node**: Post to `#finance-approvals` with client name, amount, invoice number, and Approve/Reject buttons
- **Wait node**: Pause execution until webhook callback received (set timeout: 4 hours)
- On timeout: send reminder to finance Slack, wait another 2 hours, then auto-approve or auto-abort based on config flag `AUTO_APPROVE_BELOW_THRESHOLD`

### 9. Generate PDF (if not using accounting system PDF)
- HTTP Request to PDF generation service (PDFShift, Puppeteer microservice, or n8n's HTML node + wkhtmltopdf)
- Use a Handlebars/Mustache HTML template stored in n8n credentials or a Google Doc template
- Attach PDF as binary data for email

### 10. Send Invoice Email
- **Resend node** or **SendGrid node**
- To: `{{ $json.billing_contact_email }}`
- CC: account manager email from CRM
- Subject: `Invoice {{ $json.invoice_number }} — {{ $json.client_name }} — {{ month }} Retainer`
- Body: professional HTML email with invoice summary, PDF attachment, payment link
- On send failure: catch with Error Trigger → retry after 30 min × 3 attempts → Slack alert if all fail

### 11. Record in CRM
- HubSpot: Create Note on deal with invoice details
- Airtable: Update record with `InvoiceSent=true`, `InvoiceSentDate=today`, `InvoiceNumber`

### 12. Finance Slack Notification
- Post summary to `#finance-team`: client name, amount, invoice number, sent timestamp

### 13. Schedule Follow-up Sequence
- Create three follow-up items with `Wait` nodes or trigger a sub-workflow:
  - **7-day**: Check payment status → if unpaid, send polite reminder email
  - **14-day**: Check payment status → if unpaid, send firmer reminder with late fee warning
  - **30-day**: Check payment status → if unpaid, create CRM task for account manager, send final notice

## Error Handling
- Wrap the entire client-processing section in a **Try/Catch** equivalent using n8n's error output pins
- On accounting API failure: store failed invoice in a `failed_invoices` Airtable table with error details; notify Slack
- On email send failure: retry 3× with exponential backoff (5 min, 15 min, 45 min); after all retries fail, send Slack alert with manual send instructions
- On approval timeout: escalate to finance manager via direct Slack DM
- Log all errors to a central `workflow_errors` Supabase/Postgres table with `workflow_id`, `client_id`, `error_message`, `timestamp`

## Approval Points
1. **Pre-send approval** (Step 8): Finance team reviews invoice details in Slack before dispatch to client
2. **Late fee approval** (optional): Before applying late fees at 30-day mark, require manager approval via same Slack button pattern

## Common Failure Modes
- **Duplicate invoices**: Protect by checking invoice_number uniqueness before creation; use idempotency keys on Stripe/QB API calls
- **Stale FX rates**: Cache exchange rates for no more than 1 hour; log the rate used on each invoice
- **CRM data gaps**: Client missing email or retainer amount → skip with Slack alert listing incomplete client records
- **Accounting system rate limits**: QuickBooks allows 500 req/min; batch with delays; Xero allows 60 req/min per connection
- **Wait node timeout on approval**: Finance team does not respond → implement auto-escalation, not silent failure
- **Mid-month pro-ration off by one**: Use UTC date arithmetic consistently; do not mix local and UTC dates

## n8n Implementation Notes
- Use **n8n environment variables** for API credentials, not hardcoded values
- The `Wait` node for approval requires n8n to be accessible via webhook URL; ensure production n8n instance has a public URL
- Use **Sub-workflows** for the follow-up sequence to keep the main workflow clean and allow independent testing
- `SplitInBatches` with batch size 1 prevents one client's failure from blocking others
- For the invoice counter, avoid using n8n's internal state; use an external atomic store (Postgres, Redis, or Supabase)
- Test with a `Manual Trigger` and a single test client record before activating the Schedule node
- Pin test data on the CRM fetch node during development to avoid hitting live client records

## Variants
- **Quarterly billing**: Change Schedule node to quarterly cron; add quarter label to invoice number (`INV-2026-Q2-00142`)
- **Usage-based component**: Before invoice creation, query time-tracking system (Harvest/Toggl) for overage hours; add line item if hours exceed retainer cap
- **Multi-entity agencies**: Add a lookup for which legal entity is billing; use separate QuickBooks company/Xero org per entity
- **Stripe-only**: Use Stripe's native recurring invoice feature and trigger this workflow only for the follow-up sequence; simplifies invoice creation significantly
- **International clients with VAT/GST**: Add a tax rules lookup node; apply appropriate tax codes per country code on the invoice line items
