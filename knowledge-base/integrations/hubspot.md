---
title: HubSpot — Operational patterns for digital agencies
category: integrations
tags: [hubspot, crm, pipeline, sales, deals, marketing]
authority: playbook
publication_date: 2026-05-21
last_verified: 2026-05-21
coo_relevance: 5
audit_relevance: 4
summary: How agencies use HubSpot for pipeline tracking, deal management, and client lifecycle — workflows, pitfalls, power-user patterns, and what data matters for the AI COO.
---

# HubSpot — Operational patterns for digital agencies

HubSpot is the most common CRM stack we see at agencies between 5 and 50 employees. It usually arrives in one of two ways: a founder picks it up free during the first year, or a head of growth migrates off a Google Sheet / Pipedrive when the agency hits about ten retainer clients and three concurrent new-business conversations. From that moment on, HubSpot becomes the single source of truth for revenue — and the single biggest source of "the dashboard says one thing, reality says another" pain.

This guide is for operators who already use HubSpot and want to make it actually drive decisions, not just store contacts. It covers the workflows that matter, the dirty-data problems that quietly destroy reporting, the pricing traps that bite at the 10–25 seat mark, and the signals an AI COO should pull out of HubSpot to answer real questions.

## 1. What agencies actually use HubSpot for

In our experience, every agency uses HubSpot for some subset of the same five jobs. Most use it badly for two or three of them and not at all for the rest.

1. **Pipeline tracking.** Every open deal, the stage it's in, the dollar amount attached, and the expected close date. This is the table-stakes use case and the one the leadership team looks at every Monday.
2. **Lead nurturing.** Sequences that warm up cold leads, drip campaigns from a content offer, and re-engagement flows for closed-lost deals. This is almost always under-used; most agencies have one welcome email and call it a day.
3. **Deal closing.** Quote / proposal generation, e-signature, and (sometimes) commerce / invoicing. HubSpot's quotes tool plus its native Stripe integration is now mature enough to replace PandaDoc and DocuSign for most retainer-sized deals.
4. **Post-sale handoff to delivery.** Triggering a project in ClickUp / Asana / Monday when a deal goes Closed Won, copying line items and contract terms into the project brief. Usually held together with duct tape (a Zap or a Make scenario) instead of native plumbing.
5. **Retention and renewal sequences.** Reminders 60 days before a retainer ends, NPS surveys, upsell prompts when a client crosses a usage threshold. This is the single biggest miss at most agencies — they treat HubSpot as a new-business tool and abandon it the second the deal closes.

The agencies that get real leverage out of HubSpot are the ones that use it for jobs 4 and 5, not just jobs 1–3. The COO question to start with is: *"Does our HubSpot have any field, property, or workflow that fires after a deal is Closed Won?"* If the honest answer is "no", the CRM is doing half its job.

## 2. Common workflows that should be running

Below are the workflows we expect to see in any HubSpot account driving more than ~$50k/month of new business. If they're missing, the agency is leaving leverage on the table.

### Inbound lead → MQL → SQL → Closed-Won → Delivery handoff

HubSpot ships with default lifecycle stages — Subscriber, Lead, MQL, SQL, Opportunity, Customer, Evangelist, Other — and these are the spine of any well-run agency funnel. The standard agency variant looks like this [Source: HubSpot Lifecycle Stages, weareforbidden.com, 2026]:

- **Subscriber** — opted into a blog or newsletter, no buying intent yet.
- **Lead** — filled a form, downloaded a guide, or hit a high-intent page (pricing, case study).
- **MQL** — passed a marketing-defined threshold: behavioural signal (e.g. visited pricing twice in 14 days) plus firmographic fit (agency size, vertical, geography).
- **SQL** — a salesperson has confirmed BANT (or your team's variant) on a call. Until a human says "yes, this is real," it's not an SQL.
- **Opportunity** — an active deal exists in the pipeline with a stage, amount, and close date.
- **Customer** — Closed Won. Move them out of the new-business funnel and into delivery.

> "The MQL-to-SQL handoff is where more revenue disappears than at any other point in a B2B company's funnel. The reason is almost always the same: nobody has formally agreed on what those labels mean." [Source: NAV43, HubSpot Lifecycle Stages, 2026]

Fix this by writing a one-paragraph internal SLA: *"An MQL becomes an SQL when a sales rep has had a live conversation, confirmed budget and a decision-maker, and the contact meets ICP fit on size + vertical. Sales commits to first contact within 1 business day."* Put it in a Notion doc, link it from the HubSpot pipeline description, and audit it monthly.

### Retainer renewal reminders

A retainer renewal workflow at minimum should:

- Fire a task to the AM 60 days before the contract end date (custom date property on the deal or company).
- Fire a follow-up task at 30 days.
- Notify the founder / head of delivery in Slack if no renewal deal is created within 14 days of contract end.

Most agencies don't have this and the result is silent churn — the client just stops paying after month 12 because nobody booked the renewal call.

### Quote-to-close automation

When a deal hits "Quote Sent," automate:

- A reminder task 3 days later if the contact hasn't viewed the quote.
- A second reminder at 7 days.
- Auto-move the deal to "Closed Lost" if no movement at 30 days, with a closed-lost reason of "No response."

This last step matters more than people think — un-pruned pipelines lie. A deal sitting in "Proposal Sent" for 90 days inflates pipeline coverage and ruins forecasting.

## 3. Common pitfalls — where agencies get it wrong

### Over-customising the deal pipeline

The single most common failure mode. An agency adds stages every time someone has a new idea — "Proposal Sent," "Proposal Followed Up," "Proposal Verbal Yes," "Proposal Awaiting Signature," "Contract Sent," "Contract Signed." A pipeline with 12 stages is unusable. Reps skip stages, forecasts become noise, and reports drift from reality.

The rule: **5 to 8 stages, max.** [Source: CRM News Today, HubSpot Deal Stages, 2026]. Each stage needs an objective, externally verifiable exit criterion — not "interested," but "demo scheduled on calendar with calendar invite accepted." If two reps can't agree on what it takes to move a deal from one stage to the next, the definition isn't tight enough.

### Dirty data — duplicate contacts and companies

> "Duplicates are almost inevitable without active prevention, happening when the same person is entered through multiple channels like different email addresses or forms." [Source: IntegrateIQ, HubSpot Deduplication, 2026]

> "According to Gartner, poor data quality costs organisations an average of $12.9 million per year." [Source: Vantage Point, HubSpot CRM Cleanup 2026]

For a 20-person agency, the cost shows up as: emails sent twice to the same person, two reps unknowingly working the same lead, attribution reports that are nonsense, and renewal flows that miss the right contact because the active record is the *other* duplicate.

Fixes:

- HubSpot's built-in merge tool: **Contacts → Actions → Manage Duplicates** (matches by email and name).
- Operations Hub Professional+ adds programmatic deduplication via custom rules.
- Schedule a monthly 30-minute dedup pass and assign it to one named owner. Without an owner, entropy wins.

### Unused custom properties

A typical 5-year-old HubSpot account has 80+ custom properties on the Contact object and another 50 on Deals. Maybe 12 of them are actually used. The rest are decorative — created for a workflow that never shipped, or for a one-off report from 2023. Audit and archive them annually. Every unused field is a place where bad data hides.

### No service-level reporting beyond pipeline

Most agencies use HubSpot for new business and walk away from it post-Closed Won. They have great visibility into deals-in-flight and zero visibility into:

- Time-to-onboard (Closed Won → kickoff call).
- Retention rate by deal source.
- Lifetime value by service line.
- Renewal pipeline 90 days out.

The fix is to keep using HubSpot after Closed Won. Add a Customer pipeline (or use the Service Hub ticket pipeline) for onboarding, QBRs, and renewal stages.

### Aspirational deal amounts

Sales reps put the high end of the proposal in the Amount field, not the realistic / committed number. Pipeline value balloons, leadership thinks they're 4x covered, and the forecast misses by 40%. The discipline is brutal but simple: **Amount = the number on the signed proposal, not the wish.** When a verbal yes comes in, update the Amount to the negotiated figure within 24 hours.

## 4. Best practices — what good looks like

### Stage definitions with explicit entry and exit criteria

For every stage in your pipeline, write down:

- **Entry criteria** — what has to be true to enter this stage (e.g. "Discovery call has happened and notes are in the deal record").
- **Exit criteria** — what triggers moving to the next stage (e.g. "Proposal sent and the contact has opened the quote at least once").
- **Default time-in-stage** — how long a deal is allowed to sit here before it's stale (e.g. "14 days max; auto-flag if longer").

A pipeline without these is just a row of pretty columns.

### Close-date discipline

The Close Date field should always be the realistic close date, updated when reality changes. The most common bad pattern: a deal's close date is the last day of the current month, then the last day of next month, then the last day of the month after, "rolled" indefinitely. Each roll should be logged with a note. If a deal has been rolled 3+ times, it's probably dead and should be closed-lost.

### Deal-source tracking

Make `Deal Source` (or `Original Source` on the contact) a required field at deal creation. The options should be short and exclusive — not 17 options like "Referral," "Word of Mouth," "Existing Client Referral," "Network Referral." Use: Inbound (organic), Inbound (paid), Outbound, Referral, Partner, Repeat. Six options. No "Other."

This is the one field that unlocks the most valuable agency question: *"Which channels actually produce revenue?"* HubSpot's stock attribution reports use Original Source on the contact, but you should also track Deal Source on the deal itself — they answer different questions. [Source: Coefficient, Win rate reports by lead source in HubSpot]. Note that HubSpot's native attribution can't directly compute *win rate by source weighted by deal value* — you need to either build it in a custom report (Pro+) or pull the data into a BI tool. [Source: Coefficient].

### Commit vs. aspiration on Deal Amount

The convention we recommend: Deal Amount = annual contract value (for retainers) or total project value (for projects). For retainers specifically, use a custom property for MRR so you can sum across the book.

## 5. Pricing and gotchas — what HubSpot actually costs in 2026

HubSpot's pricing has shifted significantly. As of 2026 [Source: Cargas, 2026 HubSpot Pricing Guide; Mo.agency, HubSpot Pricing 2026]:

### Sales Hub — the agency starting point

- **Starter** — from $20/month per core seat. Basic pipeline, simple automation, single pipeline per object. Fine for agencies with ≤3 salespeople.
- **Professional** — from $100/month per sales seat, plus extra core seats at $50. Adds custom reports, forecasting, multiple pipelines, deal-stage automation. **One-time onboarding fee of $1,500.** This is the tier most agencies belong on once they have a dedicated salesperson.
- **Enterprise** — from $150/month per sales seat. Adds custom objects, advanced permissions, predictive lead scoring, AI features, multi-currency. **One-time onboarding fee of $3,500.**

[Source: Cargas, 2026 HubSpot Pricing Guide]

### Per-seat creep

The trap is the "Professional and Enterprise plans allow you to mix seat types" — every full sales rep costs $100–150/month and every operations person who needs a view costs $50–75/month. For a 25-person agency with 4 sales seats and 10 view-only seats, Sales Hub Pro lands at roughly $900/month before any other Hubs. Add Marketing Hub Pro (starts ~$890/month for the contact tier most agencies need) and you're at ~$1,800/month just on HubSpot.

### Hub-by-hub gotchas

- **Sales Hub Starter** has *one pipeline limit per object*. Agencies with both a new-business pipeline and a renewal pipeline need Pro.
- **Marketing Hub Starter** strips HubSpot branding from emails but caps marketing contacts at 1,000 (above that, you pay per 1,000 marketing contacts). The "marketing contacts" vs "non-marketing contacts" distinction is HubSpot's most confusing pricing concept and a frequent surprise on the renewal invoice.
- **Custom reports**, **multi-currency**, and **custom objects** are all Professional or Enterprise gates. If your agency bills in multiple currencies or wants to attach custom objects (e.g., a "Retainer" object distinct from Deals), you're on Pro+.
- **Annual commitment required** — there's no month-to-month at the Pro tier. [Source: Spendbase, How Much Does HubSpot Cost?, 2026]

### Sales Hub vs Marketing Hub vs Service Hub

- **Sales Hub** = deals, pipelines, quotes, sequences, meeting scheduler.
- **Marketing Hub** = email marketing, forms, landing pages, automation workflows, ad tracking, attribution reporting.
- **Service Hub** = tickets, knowledge base, customer feedback (NPS / CSAT), customer portal.

Most agencies buy Sales Hub first, Marketing Hub second (often a year later when content marketing kicks in), and Service Hub rarely — they use ClickUp or Intercom for service. The bundle ("CRM Suite") is cheaper than buying hubs separately if you need three or more.

## 6. Integration patterns that matter for agencies

### HubSpot + Stripe — deal closed to invoice

When a deal hits Closed Won, the next operational action is "send the invoice." Three options [Source: LedgerUp, HubSpot Stripe Integration 2026]:

- **Native HubSpot ↔ Stripe** integration — handles basic one-time invoices and simple subscriptions. Free, ships with HubSpot Commerce.
- **Third-party connectors (LedgerUp, etc.)** — handle complex billing (annual contracts with custom terms, milestone billing, usage-based, ramp schedules) that native can't do.
- **Custom plumbing via Zapier / Make / n8n** — fine for very simple cases, but breaks the moment you need conditional logic (e.g., "if deal has annual prepay, create a one-time invoice; if monthly, create a subscription").

The COO signal here: *latency between Closed Won and Invoice Sent.* If it's >48 hours, either the automation is broken or someone's doing it by hand.

### HubSpot + ClickUp / Asana — deal to project

When a deal goes Closed Won, a project should be created in delivery tooling within minutes. Native integrations exist for both [Source: IntegrateIQ, HubSpot Asana Integration; Aptitude8, HubSpot + ClickUp]:

- **HubSpot + Asana** — closing a deal can automatically create a project from a template, with assignees and due dates calculated from the close date.
- **HubSpot + ClickUp** — a two-way integration creates a folder + tasks in ClickUp with deal properties carried over, and task progress can update the deal back in HubSpot.

The pattern that works: a "Project Template" custom property on the Deal that selects which template fires (e.g., "SEO Retainer," "Paid Media Setup," "Website Build"), and a workflow that creates the appropriate project on Closed Won.

### HubSpot + Apollo — outbound to CRM

Most agencies running outbound use Apollo for prospecting. The Apollo ↔ HubSpot integration syncs contacts, accounts, and deals bidirectionally. The key benefit: Apollo can check existing HubSpot records before adding a contact to a sequence, preventing the embarrassing "prospecting an existing client" mistake. [Source: Apollo Knowledge Base, HubSpot Integration Overview; IntegrateIQ, HubSpot Apollo Integration].

Apollo was selected as a data provider for HubSpot's Breeze Prospecting Agent in 2025, so the integration is increasingly first-class. [Source: Apollo.io Magazine, Apollo Selected as Data Provider for HubSpot Breeze].

### HubSpot + Calendly / HubSpot Meetings

Most agencies use HubSpot's built-in Meetings tool for sales calls because it writes directly to the deal. If your team is already on Calendly, the native HubSpot-Calendly integration syncs bookings to the deal record. Don't run both — pick one.

## 7. Agency data signals for the AI COO

These are the metrics the COO should pull live from HubSpot to answer real questions:

| Signal | What it tells you | How to compute |
|---|---|---|
| **Open pipeline value** | Sum of `Amount` across all open deals | Sum of Deal.Amount where stage is not Closed Won/Lost |
| **Weighted pipeline** | Pipeline value × stage probability | Sum of (Deal.Amount × Deal.Stage.Probability) |
| **Deals won MTD** | Revenue closed this month | Count + sum where Close Date in current month and stage = Closed Won |
| **Average deal cycle** | Days from deal created to Closed Won | Avg(Close Date - Create Date) for Closed Won in last 90 days |
| **Win rate (count)** | % of closed deals that won | Won / (Won + Lost) over a trailing window |
| **Win rate by source** | Which channels actually convert | Group by Deal Source, then Won / (Won + Lost) |
| **Pipeline coverage** | Open pipeline ÷ remaining quota | Sum(open Amount) / (Quota - Won MTD) |
| **Average deal size by source** | Channel quality, not just quantity | Avg(Won Amount) grouped by Deal Source |
| **Stale deals** | Deals sitting in stage > expected | Count of deals where time-in-stage > stage SLA |
| **Days to first response on new MQL** | Sales SLA compliance | Avg(First Activity timestamp - MQL conversion timestamp) |

### Pipeline coverage — read this carefully

The "3x pipeline coverage" benchmark is widely cited but misleading. The actually-correct rule is:

> Required coverage ratio = 1 ÷ historical win rate.

[Source: Outreach.ai, Pipeline Coverage Guide; Landbase, Pipeline Coverage Ratio 2026]

So an agency with a 25% win rate needs 4x pipeline coverage; an agency with a 40% win rate needs 2.5x. Telling a 50%-win-rate retainer agency they need 3x pipeline is making them sandbag. The COO should compute coverage *against the actual rolling-90-day win rate*, not a hard-coded constant.

## 8. Diagnostic questions the COO can answer from HubSpot

These are the questions a founder actually asks, and how an AI COO grounded in HubSpot can answer them:

**"What's my win rate by source?"**
Group Deals (Closed Won + Closed Lost in the last 90 days) by Deal Source. Compute Won / (Won + Lost) per source. Flag any source below 15% as "expensive to chase" and any above 40% as "double down."

**"Where do deals stall?"**
Compute average time-in-stage per pipeline stage across all deals (won and open). The stage with the longest average dwell time is your bottleneck. Cross-reference with closed-lost reasons — if "Proposal Sent" has a 21-day average dwell and 60% of losses cite "No response," you have a proposal follow-up problem, not a top-of-funnel problem.

**"Is my pipeline coverage healthy?"**
Compute (open pipeline value) ÷ (quota remaining for the period). Compare to (1 ÷ trailing 90-day win rate). If actual coverage < required, the team is short. If actual >> required, the pipeline is probably inflated with stale deals — go prune.

**"Which sources convert best to high-LTV clients?"**
This requires joining HubSpot deal data with retention data (which deal source → which clients are still here at month 12). If you're using HubSpot for the full lifecycle (job 5 above), the data is all there. If you're not, the answer is "we don't know," and the action is to start tracking it.

**"What's at risk of churn this quarter?"**
Pull all customers (or open retainer deals) with a contract end date in the next 90 days. Flag the ones without a renewal task or open renewal deal. That's the at-risk list.

**"Is my sales team falling behind on follow-up?"**
Pull all open deals, compute days since last activity, sort descending. Anything > 14 days without activity in a stage that's not "Closed Pending" is a follow-up failure.

## 9. Real-world agency examples — how different types use HubSpot

### Paid media agency (e.g. ~20 people, $3M/year revenue)

- **Deal source mix:** Heavy on outbound (Apollo → HubSpot sync), partner referrals (Meta Business Partner, Google Premier), and inbound from case study pages.
- **Pipeline stages:** Discovery → Audit Delivered → Proposal → Verbal → Closed Won. Five stages. Audits are billable, so "Audit Delivered" is itself a milestone with revenue.
- **Custom properties:** Monthly ad spend (the client's, not the agency fee), platforms, current agency (if any), attribution problems (free-text).
- **Workflow:** On Closed Won, fire ClickUp project from "Paid Media Onboarding" template; create monthly recurring task for AM to review performance; 60-day renewal reminder.
- **What they get wrong:** Tracking only the agency fee as Deal Amount but not the client's media budget. That second number is the leverage signal — a client spending $50k/month with you is a different beast than one spending $5k.

### SEO agency (e.g. ~12 people, $1.8M/year revenue)

- **Deal source mix:** Mostly inbound (organic, ironically) and referral. Less outbound.
- **Pipeline stages:** Lead → Site Audit → Proposal → Closed. Four stages. Long cycle (often 30-60 days from first touch).
- **Custom properties:** Target keywords, current domain rating, content output / month (for retainer sizing), technical SEO findings.
- **Workflow:** Marketing Hub Pro tier almost always — they're publishing 4-8 blog posts a month and need attribution. Heavy use of nurture sequences for the 12-month decision cycle.
- **What they get wrong:** Treating Marketing Hub like Sales Hub. A blog subscriber is not a deal. Keep the lifecycle stage discipline.

### Creative studio (e.g. ~8 people, $1.2M/year revenue)

- **Deal source mix:** Almost entirely referral and repeat business. Almost no outbound. Long-term relationships, fewer but bigger deals.
- **Pipeline stages:** Brief → Quote → Approved → Closed. Sometimes just three. Highly project-based, not retainer.
- **Custom properties:** Project type (brand identity, campaign, packaging, web), deliverables count, timeline (weeks).
- **Workflow:** Lighter HubSpot usage. Starter or low-end Pro. Often Sales Hub only — Marketing Hub is overkill when 80% of revenue is repeat-and-referral.
- **What they get wrong:** Under-investing in retention workflows. With a referral-heavy book, NPS surveys and "anniversary" check-ins on Closed Won deals would compound — but they almost never have them set up.

## Closing — the COO's HubSpot rubric

When auditing an agency's HubSpot, the AI COO should check, in order:

1. **Stages are objective and ≤8.** If not, pipeline data is noise.
2. **Deal Source is required and has ≤8 enum values.** If not, attribution is impossible.
3. **Close Date is actively maintained.** If half the open deals have close dates in the past, the team has abandoned discipline.
4. **At least one workflow fires after Closed Won.** If not, HubSpot is doing half its job.
5. **Duplicate contacts < 2% of total.** If not, every report is lying.
6. **Renewal date tracked on every retainer deal.** If not, churn is silent.

Score the agency 0–6. Anything below 4 and the first month of "AI COO" should mostly be data cleanup, not insight generation. You can't out-analyse dirty data.

---

## Sources

- [Cargas, 2026 HubSpot Pricing Guide](https://cargas.com/software/hubspot/pricing/)
- [Mo.agency, HubSpot Pricing 2026](https://www.mo.agency/blog/hubspot-pricing)
- [Spendbase, How Much Does HubSpot Cost? 2026](https://www.spendbase.co/blog/saas-management/hubspot-pricing-costs-savings-discounts-guides/)
- [Sidekick Strategies, HubSpot Pricing 2026: Every Hub, Every Tier](https://www.sidekickstrategies.com/blog/how-much-do-hubspot-hubs-cost)
- [HubSpot Knowledge Base, Set up and manage object pipelines](https://knowledge.hubspot.com/object-settings/set-up-and-customize-pipelines)
- [HubSpot Blog, Sales Pipelines: A Comprehensive Walkthrough](https://blog.hubspot.com/sales/sales-pipeline)
- [CRM News Today, HubSpot Deal Stages: How to Set Up a Pipeline That Reflects Reality](https://crmnewstoday.com/hubspot-deal-stages-pipeline-setup-guide/)
- [SmartBug Media, Best Practices for Mastering HubSpot Deal Stages](https://www.smartbugmedia.com/blog/mastering-hubspot-deal-stages-best-practices-for-an-effective-sales-pipeline)
- [Sage Marketing, HubSpot Deal Stages Best Practices](https://www.sagemarketing.io/blog/hubspot-deal-stages-best-practices/)
- [We Are Forbidden, HubSpot Lifecycle Stages Explained 2026](https://weareforbidden.com/blog/hubspot-lifecycle-stages)
- [NAV43, HubSpot Lifecycle Stages: Build an MQL-to-SQL System That Actually Works](https://nav43.com/blog/hubspot-lifecycle-stages-build-an-mql-to-sql-system-that-actually-works/)
- [HubSpot Glossary, Sales Pipeline Coverage](https://www.hubspot.com/glossary/sales-pipeline-coverage)
- [Outreach.ai, Pipeline Coverage: Complete Guide](https://www.outreach.ai/resources/blog/sales-pipeline-coverage-ratio)
- [Landbase, Pipeline Coverage Ratio 2026](https://www.landbase.com/blog/pipeline-coverage-ratio-calculate-2026)
- [Vantage Point, HubSpot CRM Cleanup Complete Data Hygiene Guide 2026](https://vantagepoint.io/blog/hs/hubspot-crm-cleanup-complete-data-hygiene-guide-for-2026)
- [IntegrateIQ, HubSpot Deduplication: Fix Duplicate Contacts in Minutes](https://integrateiq.com/blogs/hubspot-data-deduplication-best-practices/)
- [REVIO, CRM Data Hygiene: How to Clean Up Your HubSpot](https://revio.agency/hubspot-crm-data-hygiene-cleanup/)
- [LedgerUp, Billing Automation for HubSpot + Stripe](https://www.ledgerup.ai/integrations/hubspot-stripe)
- [LedgerUp, How to Automate HubSpot Deals to Stripe Invoices](https://www.ledgerup.ai/resources/how-to-automate-hubspot-deals-to-stripe-invoices)
- [IntegrateIQ, HubSpot Asana Integration](https://integrateiq.com/integrations/hubspot-asana/)
- [Aptitude8, HubSpot + ClickUp Integration for Seamless Handoffs](https://aptitude8.com/blog/how-the-hubspot-clickup-integration-streamlines-sales-to-service-handoffs)
- [Growth Method, In-depth analysis of HubSpot & ClickUp integration](https://growthmethod.com/hubspot-clickup-integration/)
- [IntegrateIQ, HubSpot Apollo.io Integration for Smarter CRM Prospecting](https://integrateiq.com/integrations/hubspot-apollo/)
- [Apollo Knowledge Base, HubSpot Integration Overview](https://knowledge.apollo.io/hc/en-us/articles/19745130546573-HubSpot-Integration-Overview)
- [Aptitude8, Apollo.io + HubSpot Integration Guide for Data Enrichment](https://aptitude8.com/apollo.io-hubspot-a-guide-to-integrating-and-actioning-enrichment-data)
- [Apollo.io Magazine, Apollo Selected as Data Provider for HubSpot Breeze](https://www.apollo.io/magazine/apollo-selected-as-a-data-provider-for-hubspots-breeze)
- [Coefficient, Building win rate reports by lead source using deal values in HubSpot](https://coefficient.io/use-cases/win-rate-reports-lead-source-hubspot)
- [HubSpot Knowledge Base, Understand Attribution Report Definitions](https://knowledge.hubspot.com/reports/understand-attribution-reporting)
- [HubSpot Case Studies, Huify Marketing Agency](https://www.hubspot.com/case-studies/huify)
- [SmartBug Media Case Studies](https://www.smartbugmedia.com/client-success)
- [Huble Case Studies](https://huble.com/case-studies)
