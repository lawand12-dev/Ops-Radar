---
title: Stripe — Operational patterns for digital agencies
category: integrations
tags: [stripe, billing, invoicing, payments, revenue, finance]
authority: playbook
publication_date: 2026-05-21
last_verified: 2026-05-21
coo_relevance: 5
audit_relevance: 3
summary: How agencies use Stripe for retainers, project billing, and revenue tracking — workflows, pitfalls, power-user patterns, and what data matters for the AI COO.
---

# Stripe for Digital Agencies

Stripe is the de facto payments rail for any digital agency that bills more than a handful of clients. Most agencies don't need anywhere near Stripe's full surface area — they're really using a thin slice: hosted invoices, recurring subscriptions for retainers, the customer portal, and Smart Retries when cards fail. This guide is about that slice, the mistakes agencies make inside it, and what the data inside Stripe tells you about the health of the business.

## What agencies use Stripe for

The typical agency Stripe account contains five distinct money flows, and they should not be mixed together.

**Monthly retainers.** This is recurring revenue — a Stripe Subscription with a Price object, billed on the 1st (or the anniversary of signup) every month. Retainers are the agency's MRR. They show up in Stripe's Billing analytics as MRR, churn, and active subscribers. Stripe's MRR calculation can be configured to include or exclude discounts; subtracting discounts is the more conservative view and more closely reflects cash actually arriving [Source: Stripe Billing analytics docs].

**Project invoicing.** A one-off engagement: a logo refresh, a website build, a paid ads audit. This is a finalized Invoice object — not a subscription. Best practice is to send it the moment the SOW is countersigned, especially if there's an upfront deposit involved, since invoices sent at the start of an engagement get paid materially faster than ones sent at the end [Source: Stripe — Contract invoices guide].

**Deposits and milestone payments.** Larger builds get split across milestones — e.g., 30% at signature, 40% at midpoint delivery, 30% at go-live. Each is its own invoice, all linked to the same HubSpot deal or internal project ID via metadata. A common pattern: a single $50K implementation generates three separate Stripe invoices tied to the same deal, each fired by a HubSpot workflow when the deal property advances [Source: LedgerUp HubSpot–Stripe integration].

**Scope-overage invoicing.** Out-of-scope work gets billed against the retainer either as a one-off invoice or as an add-on Subscription Item with a metered usage record. The choice matters: one-off invoices preserve clean MRR numbers, while metered usage inflates MRR with non-recurring revenue and corrupts the trend line. For COO reporting, keep overage out of MRR.

**Payment Links for one-offs.** For asynchronous "send me $500 for that thing" moments — small change orders, paid discovery calls, training sessions — a hosted Payment Link is faster than a full invoice. They're URLs you can drop in an email, no customer record required upfront.

## Common workflows

### Monthly retainer billing

The clean version: every retainer client is a Stripe Customer with one active Subscription on the Price that represents their tier. The Subscription has `collection_method: 'charge_automatically'` if you've stored a card or bank account, or `'send_invoice'` if you let them pay each invoice manually.

`charge_automatically` is operationally superior. Manual invoices add 14–28 days to your DSO and require a human to chase them. Auto-charging shifts the work to Stripe — if the card fails, Smart Retries handles it; if it succeeds, the cash hits your balance on T+2.

The dirty version, which most agencies start with, is a Stripe Invoice manually duplicated every month and emailed via "Send invoice". This works for 3–5 clients. Past that, retainers without auto-charge are how agencies end the year with five clients 60+ days past due and nobody knowing why.

### Scope-overage invoicing

When a project exceeds its scope, the workflow looks like:
1. Project manager flags the overage in the time tracker or PM tool.
2. Account manager confirms with the client in writing.
3. Issue a separate Stripe Invoice (not a modification to the retainer) tagged with `metadata: { type: 'overage', client_id: '...', period: '2026-05' }`.
4. Set due date to align with the retainer cycle so clients see one consolidated cash hit.

Tagging matters: without it, an agency cannot answer "how much of last quarter's revenue was overage vs base retainer?" without manually re-reading every invoice.

### Late payment chasing

Stripe's built-in dunning lets you configure up to three reminder emails per overdue invoice — starting up to 10 days before the due date and continuing up to 60 days past due. You can also configure the subscription to take an action (pause, mark unpaid, cancel) at 30, 60, or 90 days past due [Source: Stripe — Billing collection methods].

The mistake is leaving dunning at defaults forever. Past 30 days, automated email stops working — a human needs to call. Most agencies set Stripe to handle the first 30 days, then route 30+ day overdue invoices to a Slack channel for AM follow-up. Add a final "service pause" trigger at 60 days so accounts don't drift into 90+ without consequences.

## Common pitfalls

**Currency mismatch with international clients.** If you're a US business invoicing a UK client in GBP, and your Stripe settlement currency is USD, Stripe charges a 1% currency conversion fee on top of the standard rate. Combined with international card surcharges, a European card paid in EUR to a US Stripe account can cost 2.9% + 30¢ + 1.5% (international) + 1% (conversion) = **5.4% + 30¢** in fees, almost double a domestic transaction [Source: Checkout Page Stripe international fees]. Either invoice in your settlement currency and let the client handle conversion, or accept the haircut and price it in.

**Failed-card retries left on default.** Stripe Smart Retries claims a ~55% recovery rate on failed payments using ML to time retries, but third-party data from 200+ B2C Stripe Billing accounts puts the real-world recovery rate closer to 25–35% [Source: Redux Payments analysis]. Adding email dunning on top moves recovery into the 70–85% range [Source: Dev.to dunning best practices]. Agencies that ignore failed-card alerts often discover months later that a $4K/mo retainer has been silently failing since February.

**Draft invoices left unsent.** Stripe's Invoice object has a `draft` status that exists indefinitely. It's common for a junior staffer to "prep next month's invoices" as drafts, get pulled into other work, and never finalize them. Build a weekly check: count invoices in `draft` status older than 7 days and surface the dollar amount.

**Mishandling partial payments.** Stripe Invoices can be partially paid via the API but the UI nudges customers toward full payment. When a client pays $3K of a $5K invoice via wire, you have to log the partial via `invoice.payments` adjustment and decide whether the remaining $2K becomes a new invoice or stays on the same one. Inconsistency here is what destroys revenue reporting accuracy.

**Letting one Stripe Customer represent multiple billing entities.** When a holding company pays for three sub-brands, agencies often create one Stripe Customer for the parent. This collapses revenue attribution. Better: one Customer per billing entity, linked in metadata to a `parent_account_id`.

**Skipping tax until it becomes a problem.** Cross-border agencies that don't enable Stripe Tax accumulate VAT and sales-tax exposure they can't reconstruct later. Stripe Tax covers 100+ countries and automatically tracks proximity to local registration thresholds [Source: Stripe Tax docs]. If you have any non-US clients or sell across US states, turn it on early — backfilling tax is brutal.

## Best practices

### Invoice metadata for client tagging

Stripe allows 50 key/value pairs per object, keys up to 40 chars and values up to 500 chars [Source: Stripe metadata docs]. The minimum useful metadata schema for an agency:

```
client_id        — your internal customer ID
deal_id          — HubSpot/Pipedrive deal that originated the invoice
service_line     — paid_ads | seo | creative | dev | strategy
billing_type     — retainer | project | overage | deposit
period_start     — YYYY-MM, only for retainers
project_code     — internal project reference
```

This metadata is what makes everything downstream possible: profitability calculations (Stripe revenue × service_line ÷ Harvest hours by project), AR aging by client segment, churn analysis by service line. Stripe also redacts metadata on publishable-key responses, so it's safe to put internal IDs there — just never put PII or card details, which is a Stripe policy [Source: Stripe metadata docs].

### Dunning settings

A defensible default:
- Reminders: 3 days before due, 1 day overdue, 7 days overdue.
- Smart Retries: enabled.
- Action at 30 days past due: send the invoice owner to your Slack #ar-overdue channel.
- Action at 60 days past due: pause the subscription with `pause_collection`.
- Action at 90 days past due: cancel the subscription, flag the client as churned.

The pause-vs-cancel distinction matters — pausing preserves the customer record and history so they can come back; cancelling closes the subscription and forces a re-onboarding if they return.

### Stripe Tax for cross-border agencies

Stripe Tax is priced per transaction in jurisdictions where you're registered to collect. It calculates and collects tax at point of sale and tracks where you're nearing a local VAT or state nexus threshold. For B2B agencies invoicing across EU borders, Stripe Tax also handles VAT ID validation and reverse-charge logic automatically [Source: Stripe Tax — EU docs]. The cost is small compared to the audit risk of getting it wrong.

### Customer portal for self-serve

The Stripe-hosted Customer Portal lets clients update their card, download past invoices, change billing email, and (if you allow it) cancel or upgrade their subscription without an email back-and-forth [Source: Stripe Customer Portal docs]. Every agency should turn this on for retainer clients and ship the magic-link URL into their welcome sequence. It removes 70%+ of "can you resend April's invoice" tickets.

Lock down what the portal allows: most agencies enable card updates and invoice downloads but disable plan changes and self-cancel, since those should route through the account manager.

## Pricing & gotchas

### Standard US rates

- **Online card payments:** 2.9% + 30¢ per successful charge. No setup or monthly fees [Source: Stripe pricing page].
- **International cards:** +1.5% surcharge on the base rate.
- **Currency conversion:** +1% if the settlement currency differs from the payment currency.
- **ACH Direct Debit:** 0.8%, capped at $5 per transaction. For any invoice above ~$670, ACH is cheaper than card processing [Source: Stripe pricing breakdown 2026].
- **Disputes:** $15 per dispute, refunded if you win.
- **Instant Payouts:** 1% (min 50¢) for same-day payouts, instead of free 2-day standard.

### Settlement timing

ACH Direct Debit standard settlement is 4 business days from payment creation. Eligible US businesses can opt into Faster ACH at 2 business days [Source: Stripe ACH settlement docs]. ACH batches run at 7pm ET; anything after that bumps to the next business day.

For card payments, US merchants typically see funds available T+2 on a standard rolling payout schedule.

### Stripe Tax cost

Stripe Tax has a Basic tier (calculations only, pay-per-use, no monthly fee) and a Comprehensive tier (full filings and registrations) [Source: Stripe Tax pricing page]. Per-transaction pricing applies in registered jurisdictions. For an agency doing <$1M/yr cross-border, Basic is usually enough — you handle the filings yourself or hand off to your accountant.

### Hidden cost: chargebacks on $5K+ invoices

A single chargeback on a large project invoice can cost the agency the full invoice amount plus the $15 dispute fee, with reversal happening before the dispute resolves. For invoices above ~$2K, push clients toward ACH or wire — both are pull-only and effectively non-disputable, and the fee math is dramatically better at scale.

## Integration patterns

### Stripe + Harvest = client margin

This is the single most valuable integration for an agency. Stripe gives you per-client revenue (sum of paid invoices, tagged via `client_id` metadata). Harvest gives you per-client hours × loaded hourly cost. Subtract one from the other and you have **client gross margin**.

The pattern: at the end of each month, for each client, compute `(stripe_revenue - harvest_hours × cost_per_hour) / stripe_revenue` = client margin %. Anything under 30% is a margin alert. Anything negative means the agency is paying the client to work with them, and the account manager needs to know yesterday.

OpsRadar's `profitability/` route does exactly this — Stripe Charges joined to Harvest time entries by client name or external ID.

### Stripe + HubSpot = closed-won → invoice

When a HubSpot deal moves to Closed Won, a workflow creates the corresponding Stripe invoice or subscription, reading deal line items and any attached contract [Source: LedgerUp]. For agencies with milestone-billed projects, the workflow can split the deal value across multiple scheduled invoices.

Pair this with reverse-direction sync: when Stripe records payment on an invoice, write back to the HubSpot deal — payment date, amount paid, days from invoice to payment. Sales reps now see DSO per deal and can spot which prospect profile pays slowest.

### Stripe + QuickBooks/Xero

Most agencies sync Stripe payouts (not individual transactions) into their accounting system as deposits, then categorize them on the books. The catch is the Stripe Fees line: every payout has a gross amount, fees, and net deposit, and getting these reconciled correctly requires either a paid connector (QuickBooks Online Stripe Sync, A2X, Synder) or a custom mapping. Without it, your P&L will be off by 2.9% of revenue indefinitely.

For larger agencies, sync at the invoice level instead of payout level — every Stripe Invoice becomes an Invoice in QuickBooks with matching customer and line items. Higher accounting fidelity, more sync surface area.

## Agency data signals for the COO

These are the Stripe-derived metrics that belong on a single COO dashboard:

- **MRR** — sum of active recurring Subscription amounts, normalized to monthly. Break it into New MRR, Expansion MRR, Contraction MRR, Churned MRR each month [Source: StripeReport SaaS metrics]. For an agency, "Expansion" usually means upsell to a higher retainer tier.
- **Paid MTD** — total `amount_paid` across all invoices with status `paid` and a paid date in the current month. The cash number leadership actually cares about.
- **Invoiced MTD** — total `amount_due` of invoices issued this month. Difference between this and Paid MTD is your AR build.
- **Overdue invoices** — count and total dollar value of invoices in `open` status past their due date. Bucket by 0–30, 31–60, 61–90, 90+ days.
- **Days-to-pay** — for each paid invoice in the period, days between `created` and the latest payment timestamp. Average across the period = your effective DSO. B2B professional services typically run 35–60 days [Source: Stuut DSO benchmarks 2026; Beancount DSO guide].
- **Churn from canceled subscriptions** — count and MRR value of Subscriptions that moved to `canceled` in the period.
- **Failed payment volume** — total dollars currently in failed-retry state. Combined with Smart Retries' historical recovery rate, you can forecast eventual losses.
- **Collection rate** — total paid / total invoiced over a trailing window. Anything under 90% is a process problem.

## Diagnostic questions the COO can answer using Stripe data

**Which client pays slowest?** Group paid invoices by `customer.id`, compute median days between invoice creation and payment. Sort descending. The top of that list is your AR-risk list — either renegotiate Net terms, require auto-charge, or shift them to deposit-up-front.

**How much MRR is at risk?** Sum the MRR value of subscriptions in any of: failed payment retry queue, paused, or with `cancel_at_period_end: true`. This is the next 30 days of forecastable churn. Pair with a "save" outreach playbook before each one drops off.

**What's my collection rate?** Total `amount_paid` ÷ total `amount_due` for invoices created in a trailing 90-day window. Under 90% means you have a dunning gap; under 80% means you have a sales-qualification or contract-enforcement problem upstream.

**Which retainers are profitable after Stripe fees?** For each retainer client, `(sum of paid invoices − sum of Stripe fees − loaded hours cost from Harvest) ÷ sum of paid invoices`. International clients on cards look much worse here than domestic ACH clients — that's not always a reason to fire them, but it should change how you price the next renewal.

**Is my new MRR keeping up with my churned MRR?** Net New MRR = New MRR + Expansion MRR − Contraction MRR − Churned MRR. Negative for two months in a row is the leading indicator of an agency contraction; sales and account management need to know.

**Which service line has the worst DSO?** Group by the `service_line` metadata tag on invoices. Paid media engagements typically pay faster (they're tied to active ad spend the client can't pause). Creative and SEO projects with milestone billing tend to pay slowest because of internal approval cycles [Source: Beancount DSO milestone delays].

## Real-world agency examples

### Paid media agency

A paid-media shop running $500K/mo of ad spend on behalf of 12 clients typically bills two ways through Stripe: a flat monthly management fee (retainer Subscription) and a percentage-of-spend performance fee (one-off invoices issued at month-end after spend reconciles). Card payments dominate because clients want the money to move fast — they're paying you to keep their ad accounts funded. DSO is usually under 20 days because clients depend on you continuing to spend; an unpaid agency turns off the ads. The Stripe data tells you fee revenue exactly, but you need to join to ad-platform APIs (Meta, Google Ads) to compute the percentage-of-spend invoices correctly.

### SEO agency

An SEO retainer agency operates almost entirely on recurring Subscriptions — every client is a $2K–$10K/mo retainer billed on the 1st, paid by card or ACH. Engagement length is long (12–24 months typical), so churn is the headline metric and the COO dashboard should show monthly churn rate, average customer lifetime, and net revenue retention. Project-based one-offs are rare (occasional one-time audit invoice). Days-to-pay tends to be 25–35 days for autopay clients, much higher for invoice-pay clients — most SEO shops should aggressively migrate clients to auto-charge.

### Creative agency

A creative shop (branding, design, video) lives mostly on project invoicing with retainer being a secondary motion. Stripe usage is heavily milestone-based: 50% deposit on signature, 25% on midpoint, 25% on delivery. DSO is typically the worst of the three agency types — 45–60 days — because final invoices wait on client review cycles, and creative directors are notoriously slow signoff bottlenecks. The COO data signal that matters most: aging of unpaid final-milestone invoices, since those are where creative agencies lose the most cash. Pair Stripe with the project tool (ClickUp, Asana) to detect when a project is marked "complete" but the final invoice is still `open` 30+ days later — that's the moment to escalate.

---

## Sources

- [Stripe pricing breakdown 2026 — Flexprice](https://flexprice.io/blog/stripe-pricing-breakdown-2026)
- [Stripe international fees by country — Checkout Page](https://checkoutpage.com/blog/stripe-international-fees)
- [Stripe Pricing & Fees](https://stripe.com/pricing)
- [How invoicing works — Stripe Documentation](https://docs.stripe.com/invoicing/overview)
- [Contract invoices: A guide — Stripe](https://stripe.com/resources/more/contract-invoices-101-what-to-include-and-how-to-handle-invoices)
- [How we built it: Smart Retries — Stripe Blog](https://stripe.com/blog/how-we-built-it-smart-retries)
- [Stripe Smart Retries explained — Redux Payments](https://www.reduxpayments.com/blog/stripe-smart-retries-explained)
- [5 Stripe Dunning Best Practices — Dev.to](https://dev.to/diven_rastdus_c5af27d68f3/5-stripe-dunning-best-practices-that-recover-40-of-failed-payments-ibp)
- [Stripe Tax pricing](https://stripe.com/tax/pricing)
- [Tax in the European Union — Stripe Documentation](https://docs.stripe.com/tax/supported-countries/european-union)
- [Stripe metadata documentation](https://docs.stripe.com/metadata)
- [Customer portal — Stripe Documentation](https://docs.stripe.com/customer-management)
- [Billing collection methods — Stripe Documentation](https://docs.stripe.com/billing/collection-method)
- [ACH Direct Debit settlement — Stripe Support](https://support.stripe.com/questions/ach-direct-debit-payment-settlement-time)
- [Two-Day Settlement for ACH — Stripe Support](https://support.stripe.com/questions/two-day-settlement-for-ach-direct-debit)
- [Billing subscription analytics — Stripe Documentation](https://docs.stripe.com/billing/subscriptions/analytics)
- [SaaS metrics explained — StripeReport](https://www.stripereport.com/blog/stripe-saas-metrics-explained)
- [HubSpot–Stripe billing automation — LedgerUp](https://www.ledgerup.ai/integrations/hubspot-stripe)
- [DSO benchmarks by industry 2026 — Stuut](https://www.stuut.ai/blog/dso-benchmarks-by-industry)
- [DSO benchmarks 2025 — CreditPulse](https://www.creditpulse.com/blog/days-sales-outstanding-dso-by-industry-2025-benchmarks-data-analysis)
- [DSO formula and milestone delays — Beancount](https://beancount.io/blog/2026/04/23/dso-formula-cash-flow-complete-guide)
