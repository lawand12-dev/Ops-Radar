---
title: Pipedrive — Operational patterns for digital agencies
category: integrations
tags: [pipedrive, crm, pipeline, sales, deals]
authority: playbook
publication_date: 2026-05-21
last_verified: 2026-05-21
coo_relevance: 4
audit_relevance: 3
summary: How agencies use Pipedrive for visual sales pipeline tracking, deal momentum, and forecasting — workflows, pitfalls, power-user patterns, and what data matters for the AI COO.
---

# Pipedrive for Digital Agencies

Pipedrive is the second-most common CRM we see in agency tech stacks after HubSpot, and the most common one we see at agencies of 2–15 people who have outgrown a spreadsheet but cannot stomach HubSpot's price and complexity. It was built by salespeople for salespeople in Estonia in 2010, and its product philosophy is unusually narrow: it is a sales-execution tool, not a marketing platform, not a service desk, not a CMS. For an agency owner who is also the head of sales, that narrowness is a feature.

This note covers how agencies actually use Pipedrive, where it breaks, what to wire into the AI COO, and how to choose between Pipedrive and HubSpot.

## What agencies use Pipedrive for

Pipedrive's central artifact is the **kanban deal board**: columns are pipeline stages, cards are deals, color and badges signal urgency. Most agency owners run their entire new-business motion from this one view ([Pipedrive — Pipeline view](https://support.pipedrive.com/en/article/pipeline-view)).

Concretely, agencies use Pipedrive for:

- **Visual sales pipeline tracking** across one or more pipelines (new business, upsell, partner-sourced, etc.).
- **Activity-based selling** — Pipedrive's signature methodology where the next action on every deal (call, email, meeting, demo) is the unit of work, not the deal itself. The premise is that if reps do the right activities consistently, deals close ([Pipedrive — Activity-Based Selling guide](https://www.pipedrive.com/en/blog/activity-based-selling)).
- **Probability-weighted forecasting** — assign close probability per stage, get a weighted pipeline value, project revenue against goal ([Pipedrive — Forecast view](https://support.pipedrive.com/en/article/the-forecast-view-revenue-projection)).
- **Lightweight contact management** — people, organizations, deals, activities. Pipedrive intentionally does not try to be a marketing automation suite.
- **Retainer and recurring revenue tracking** — since the 2025 Products update, a single deal can carry unlimited recurring subscriptions and one-time items with their own billing cycles, surfacing MRR/ARR/ACV at the deal level ([Pipedrive — Recurring products](https://support.pipedrive.com/en/article/recurring-products), [Metawork — Products on Steroids 2025](https://metawork.studio/post/pipedrive-products-update-2025)).

The case study Pipedrive itself promotes most for agencies is Spark Interactive, a full-service digital agency reporting ~12% annual revenue growth attributed in part to Pipedrive standardising the new-business motion ([Pipedrive blog — Sales Pipeline Management Guide](https://www.pipedrive.com/en/blog/sales-pipeline-management)).

## Common workflows

### 1. Lead → Qualified → Proposal → Won/Lost

Most agencies run a 5–7 stage pipeline. A reasonable default:

1. **Inbound / Lead** — form fill, referral, cold reply.
2. **Qualified** — discovery call booked or held, fit confirmed.
3. **Proposal Sent** — scope and price delivered.
4. **Negotiation** — back-and-forth on scope, terms, or pricing.
5. **Verbal Yes** — committed but contract not signed.
6. **Won** (with reason) / **Lost** (with reason).

The implementation guidance Pipedrive itself promotes is: document your existing workflow before configuring stages, mark where prospects stall today, and only then build the pipeline around that reality ([Pipedrive — Sales Pipeline Management Guide](https://www.pipedrive.com/en/blog/sales-pipeline-management); [Altois — Pipedrive Implementation](https://altois.com/blog/pipedrive-implementation-how-to-build-a-high-performing-sales-pipeline/)).

### 2. Activity-based pipeline progression

The mechanical rule that separates well-run Pipedrive instances from rotting ones: **every open deal has a scheduled next activity**. When an activity is marked done, the rep is immediately prompted to schedule the next one. This is enforced at the UI level — Pipedrive will visually flag deals with no scheduled activity ([Motii — Activity-Based Selling](https://www.motii.co/post/activities-based-selling)).

For an agency, the canonical activity types are: discovery call, follow-up email, proposal review, contract sent, kickoff scheduled. Keep the type list under 8; resist the urge to add one per micro-step.

### 3. Weekly forecast review

A Friday or Monday ritual where the owner walks the pipeline in **Forecast view**, deal by deal:

- Is this deal still real? If not, mark Lost with a reason.
- Is the expected close date still accurate? If not, move it.
- Is the value still accurate? If proposal was revised, update it.
- Is the next activity scheduled? If not, schedule it.

The weighted pipeline number that comes out of this review is the only forecast number an agency owner should quote to investors, partners, or their own delivery team for capacity planning ([Pipedrive — Forecast view](https://support.pipedrive.com/en/article/the-forecast-view-revenue-projection); [Smartflow — Sales Forecasting In Pipedrive](https://www.smartflow.ie/post/sales-forecasting-in-pipedrive-best-practices)).

## Common pitfalls

### Generic CRM pitfalls (apply equally to HubSpot)

- **Dirty data** — free-text fields where dropdowns belong. Source captured as `linkedin`, `LinkedIn`, `LI`, `Linked In` makes pipeline-source analysis impossible ([AeroLeads — Pipedrive API Custom Fields](https://aeroleads.com/blog/pipedrive-api-custom-fields-create-update-keep-data-clean/)).
- **No stage discipline** — deals drifting between stages without the gating criteria being met. "Proposal Sent" with no proposal attached. "Negotiation" with no objection on file.
- **No lost-reason hygiene** — Lost deals without a reason field are useless for diagnosis. The COO cannot tell you why you're losing if 60% of lost deals say "Other."

### Pipedrive-specific pitfalls

- **Deal aging not visible by default.** Pipedrive ships with the Rotting feature **off**. Until you enable it per pipeline and per stage, there is no visual signal that a deal has been idle for 14, 30, or 60 days. This is the single most common diagnostic gap in agency Pipedrive instances ([Pipedrive — Rotting feature](https://support.pipedrive.com/en/article/the-rotting-feature); [Solvaa — Using the Rotting Feature](https://solvaa.co.uk/how-to-use-the-pipedrive-rotting-feature-to-track-deal-inactivity-and-boost-conversions/)).
- **Rotting alerts are not automatic.** Even with rotting configured, Pipedrive does not push notifications. You need a Workflow Automation or a Zapier flow to surface rotten deals to email, Slack, or your COO ([Pipedrive — Automations FAQ](https://support.pipedrive.com/en/article/workflow-automations-faq)).
- **Custom-field proliferation.** Pipedrive's add-a-field-on-the-fly UX is genuinely too easy. The documented failure mode is 150+ custom fields within 6–12 months, 40% of them redundant or unused. One reported case: API response times for a single deal climbed from 400 ms to 3+ seconds, and CRM adoption dropped 40% ([AeroLeads — Pipedrive API Field Mapping](https://aeroleads.com/blog/pipedrive-api-field-mapping-from-custom-fields-clean-exports/)).
- **Fields on the wrong object.** A "Lead Source" field on Person instead of Deal looks fine until you try to report pipeline value by source — and discover the field isn't on the object you're aggregating. Fixing this after the fact requires a migration. Decide object placement before creating the field ([Pipedrive — Custom fields](https://support.pipedrive.com/en/article/custom-fields)).
- **Too many required fields.** When required-field gates block deal progression, reps type `.` or `test` to get past them. Garbage data is worse than no data ([Smartflow — Common Pipedrive Mistakes](https://www.smartflow.ie/post/how-to-avoid-common-pipedrive-mistakes-for-better-sales-management)).
- **Multi-tenant misuse.** Agencies that manage CRM *on behalf of* clients sometimes try to use one Pipedrive account with separate pipelines per client. This breaks: permissioning is account-level, reporting cross-contaminates, and licensing gets expensive. Pipedrive is built for one organisation managing its own pipeline; per-client CRM operations need separate accounts or a different tool like GoHighLevel ([Like2Byte — Pipedrive Review for Small Agencies 2026](https://like2byte.com/pipedrive-review-small-agencies/)).

## Best practices

- **Define activity types narrowly and consistently.** Pick 5–8 types (Call, Email, Meeting, Proposal, Demo, Follow-up). Forbid free-text "Other." This makes activity-volume reporting meaningful.
- **Turn on Rotting and set realistic thresholds per stage.** A typical agency rotting matrix: Lead 7 days, Qualified 14 days, Proposal Sent 10 days, Negotiation 14 days. Tune from there once you have 3 months of data ([Flowbird — Rotting in Pipedrive Stages](https://flowbird.co.uk/knowledge/the-rotting-feature-in-pipedrive)).
- **Pair Rotting with a Workflow Automation.** Trigger: deal is rotten. Action: post to Slack #sales or email the deal owner. This is what converts a passive color flag into an actual nudge.
- **Use the Products feature for retainer types**, not free-text deal values. Define `Retainer — Standard`, `Retainer — Premium`, `One-time Project`, `Audit` etc. as Products with recurring billing where appropriate. This unlocks deal-level MRR/ARR/ACV and aligns Pipedrive's forecast with finance reality ([Pipedrive — Recurring revenue feature](https://www.pipedrive.com/en/features/recurring-revenue)).
- **Pipeline per service line, not per stage variation.** If your retainer sales cycle and your one-off project sales cycle have meaningfully different stages, run two pipelines. If they only differ in one stage label, run one pipeline with a `Service Type` custom field. Pipedrive's own community guidance: "The only reason to have multiple pipelines is for two very different sales processes" ([Pipedrive Community — Multiple Pipelines](https://community.pipedrive.com/discussion/4571/details-for-multiple-pipelines)).
- **Lost-reason as a required dropdown.** 6–8 options max: Price, Timing, Lost to competitor, Internal capacity, No decision, Ghosted, Not a fit, Other. Review the distribution monthly.
- **Quarterly field audit.** Delete any custom field with <20% fill rate or zero references in reports/automations. Treat this as ops hygiene, not a project.

## Pricing & gotchas

Pipedrive restructured plan names in July 2025. The historical five-tier system (Essential / Advanced / Professional / Power / Enterprise) was renamed to **Lite / Growth / Premium / Ultimate** (Power was folded into Premium). Many third-party comparison sites still reference the old names ([Axis Consulting — Pipedrive Pricing 2026](https://axisconsulting.io/pipedrive-pricing-plans/); [Pipedrive — What's new in plans](https://support.pipedrive.com/en/article/new-pipedrive-plans); [Costbench — Pipedrive Pricing 2026](https://costbench.com/software/crm/pipedrive/)).

Approximate annual-billed per-user pricing as of mid-2026 (USD):

| Plan (new name) | Old name | ~Per user / mo | What it unlocks |
|---|---|---|---|
| **Lite** | Essential | $14 | Pipeline, deals, contacts, mobile, basic activities |
| **Growth** | Advanced | $34–$39 | Email sync, two-way calendar, workflow automation, open/click tracking |
| **Premium** | Professional + Power | $49–$64 | Forecasting, custom reports, e-signatures, products with recurring revenue, team performance reports, expanded automations |
| **Ultimate** | Enterprise | $79–$99 | Unlimited automations and reports, advanced security, custom permissions, dedicated support, higher API rate limits |

Gotchas:

- **AI features are concentrated in higher tiers.** Pipedrive's AI Sales Assistant, AI email writer, and AI summarisation are available across plans but the more useful features (forecast scoring, advanced suggestions) come into their own on Premium+.
- **Automation limits are per-tier.** Lite has no workflow automations at all; Growth has a small monthly cap; Premium and Ultimate expand it. If you plan to wire Pipedrive into Slack, Stripe, or n8n, do not budget Lite.
- **LeadBooster, Web Visitors, Smart Docs, Projects, and Campaigns are paid add-ons** on top of any plan. Budget realistically — the all-in cost for a 5-person agency on Premium with one add-on usually lands at $400–$600/month, not the headline $245.
- **Per-seat pricing applies to every active user**, including read-only sales managers. If the agency owner wants the CFO and head of delivery to see the forecast, that's two more seats.

## Integration patterns

Pipedrive is intentionally narrow — it expects to be wired to other tools rather than absorb them. The common integrations for agencies:

- **Pipedrive + Stripe (deal won → invoice).** The canonical agency automation. When a deal moves to Won, Zapier (or Make, or n8n) creates a Stripe customer if missing, creates an invoice based on the deal's Products, and posts confirmation back to the deal. Pipedrive does not have a native Stripe connector; this is glue-code territory ([Zapier — Pipedrive Stripe integration](https://zapier.com/apps/pipedrive/integrations/stripe); [CRMSquirrel — Pipedrive Stripe Integration Tutorial](https://crmsquirrel.com/pipedrive-stripe-integration-tutorial/)).
- **Pipedrive + Slack.** Deal-stage changes, rotting alerts, Won-deal celebrations, and lost-deal post-mortems posted to a #sales channel.
- **Pipedrive + Calendar (Google/O365) + Calendly.** Two-way calendar sync is included from Growth up; Calendly meetings auto-create activities and link to deals.
- **Pipedrive + Mailchimp / Outfunnel / Campaigns.** Email marketing layered on top; Pipedrive holds the deal context, the email tool drives nurture.
- **Pipedrive + ClickUp / Asana / Linear.** Deal Won triggers a project-creation task in the delivery system, with deal data passed in.
- **Pipedrive Marketplace** has ~400 apps; for anything not native, Zapier and Make are the default substrate. Native HubSpot and Salesforce are competitors rather than integration partners.

## Agency data signals for the COO

When OpsRadar's COO pulls Pipedrive (live, via the Pipedrive adapter — no persistence), these are the high-signal fields:

| Signal | Why it matters |
|---|---|
| **Open pipeline value (absolute)** | Total dollar value of all open deals. Coarse but baseline. |
| **Weighted pipeline value** | Sum of (deal value × stage probability). The forecast number that should drive capacity decisions. |
| **Deals won MTD / QTD** | Closed-won deal count and value this month/quarter. |
| **Average deal velocity (days to close)** | Median time from Created to Won. Useful for cash-flow forecasting and for spotting cycle elongation. |
| **Stage conversion rates** | What % of deals at Stage N reach Stage N+1. The diagnostic that finds where the funnel actually leaks. |
| **Average days-in-stage** | Per-stage aging. Combined with rotting thresholds, this is the strongest "where do deals stall" signal. |
| **Activities completed per deal / per rep / per week** | The activity-based-selling KPI. Low activity volume predicts low future closed revenue better than current pipeline value does. |
| **Lost reason distribution** | What % of losses are price vs. timing vs. competitor. Drives messaging and pricing decisions. |
| **Source mix of won deals** | Which channels actually convert, not just which generate leads. |
| **Deals with no scheduled next activity** | Pipedrive's own "warning" metric — these deals are functionally dead until someone touches them. |
| **MRR / ARR from Products** | For agencies running retainers through Pipedrive Products, recurring revenue projection from the CRM itself. |

The COO should also derive **forecast vs. quota delta** and **forecast vs. last-period delta** — Pipedrive doesn't surface trend-over-time on the weighted pipeline natively without an analytics add-on like Dear Lucy, so OpsRadar adding this is a real upgrade ([Dear Lucy — Pipedrive Reporting Dashboards](https://www.dearlucy.co/pipedrive)).

## Diagnostic questions the COO can answer

Given live Pipedrive data, the COO should be able to answer:

- **"Where do deals stall?"** — Stage with the highest average days-in-stage and the lowest conversion rate to the next stage. Often Proposal Sent → Negotiation.
- **"What's the average days-in-stage right now?"** — Per stage, this week vs. trailing 90-day baseline.
- **"How many deals are rotten?"** — Count of deals exceeding their stage's rotting threshold.
- **"What's our weighted forecast for this month / quarter?"** — Sum of (value × probability) for deals with expected close date in window.
- **"Are we doing enough activities to hit the forecast?"** — Activities/week vs. activities needed based on historic activity-to-close ratio.
- **"Why are we losing?"** — Top 3 lost reasons by count and by value.
- **"Which source is profitable?"** — Won-deal value by source, divided by acquisition spend if marketing data is connected.
- **"Should we be on Pipedrive or HubSpot at our current size?"** — See the comparison below; the COO can answer by inspecting actual usage (seat count, custom field count, automation count, marketing-ops needs).

## HubSpot vs Pipedrive for agencies

Both are legitimate choices. The decision usually comes down to (a) how much of the marketing-funnel layer the agency wants in-CRM, (b) budget, and (c) whether the team will actually use complex software.

| Dimension | Pipedrive | HubSpot |
|---|---|---|
| **Core strength** | Sales execution and pipeline visibility | All-in-one marketing + sales + service platform |
| **Learning curve** | Low — sales reps are productive in days | Higher — full platform takes weeks to configure |
| **Pricing model** | Per-user, transparent, low entry point ($14–$79/user/mo) | Tiered "Hub" model; meaningful features start at Sales Hub Professional ($90+/user/mo). Common total cost ~3× Pipedrive ([Zapier — Pipedrive vs HubSpot](https://zapier.com/blog/pipedrive-vs-hubspot/); [Metawork — Pipedrive vs HubSpot 2025](https://metawork.studio/post/pipedrive-vs-hubspot-2025-review)) |
| **Marketing automation** | Weak natively; requires Mailchimp/Outfunnel/Campaigns add-on | Strong native marketing hub, forms, landing pages, email nurture |
| **Reporting depth** | Solid for pipeline and activity reports; weaker for cross-object analytics | Deeper, more customisable, particularly when Marketing + Sales Hubs are combined |
| **Pipeline UX** | Kanban-first, fast, dense — built around the board | Pipeline view exists but UI is more form-driven |
| **AI features** | AI Sales Assistant, email writer, deal scoring; expanding but not the focus | Heavy 2025 AI push across Breeze copilot, content, prospecting |
| **Customisation ceiling** | Lower — by design | Very high; can fit complex orgs |
| **Best for agencies that…** | Sell services through a clear, repeatable, sales-led motion; <15 people; want one tool that one person can own | Run content/inbound marketing in-house; need landing pages, forms, nurture, and sales in one place; >15 people; have a dedicated marketing ops person |

**Rule of thumb we use in audits:**

- Agency under ~$1M ARR, sales-led, no full-time marketer → **Pipedrive**.
- Agency over ~$2M ARR, marketing-led, content/SEO is a real channel → **HubSpot**.
- In between, the right answer is usually whichever the team will actually maintain. A well-maintained Pipedrive beats a neglected HubSpot every time.

The decision is rarely reversible cheaply — CRM migrations are painful — so the COO's job is to flag the cost mismatch early ("you're on HubSpot Starter and using 4% of it; you'd be better served by Pipedrive Premium at half the cost") rather than after a 24-month renewal locks in.

---

## Sources

- [Pipedrive — Pricing](https://www.pipedrive.com/en/pricing)
- [Pipedrive — Pipeline view: manage deals lifecycle](https://support.pipedrive.com/en/article/pipeline-view)
- [Pipedrive — The Rotting feature](https://support.pipedrive.com/en/article/the-rotting-feature)
- [Pipedrive — Workflow Automations FAQ](https://support.pipedrive.com/en/article/workflow-automations-faq)
- [Pipedrive — The deal forecast view](https://support.pipedrive.com/en/article/the-forecast-view-revenue-projection)
- [Pipedrive — Recurring products and installments](https://support.pipedrive.com/en/article/recurring-products)
- [Pipedrive — Custom fields](https://support.pipedrive.com/en/article/custom-fields)
- [Pipedrive — How can I have multiple pipelines?](https://support.pipedrive.com/en/article/how-can-i-have-multiple-pipelines)
- [Pipedrive — What's new in Pipedrive plans?](https://support.pipedrive.com/en/article/new-pipedrive-plans)
- [Pipedrive blog — Sales Pipeline Management Guide](https://www.pipedrive.com/en/blog/sales-pipeline-management)
- [Pipedrive blog — Activity-Based Selling](https://www.pipedrive.com/en/blog/activity-based-selling)
- [Pipedrive features — Recurring revenue](https://www.pipedrive.com/en/features/recurring-revenue)
- [Axis Consulting — Pipedrive Pricing Plans 2026](https://axisconsulting.io/pipedrive-pricing-plans/)
- [Costbench — Pipedrive Pricing 2026](https://costbench.com/software/crm/pipedrive/)
- [Metawork Studio — Pipedrive vs HubSpot 2025 Review](https://metawork.studio/post/pipedrive-vs-hubspot-2025-review)
- [Metawork Studio — Pipedrive Products on Steroids 2025](https://metawork.studio/post/pipedrive-products-update-2025)
- [Zapier — Pipedrive vs HubSpot](https://zapier.com/blog/pipedrive-vs-hubspot/)
- [Zapier — Pipedrive Stripe integration](https://zapier.com/apps/pipedrive/integrations/stripe)
- [Altois — Pipedrive Implementation Guide](https://altois.com/blog/pipedrive-implementation-how-to-build-a-high-performing-sales-pipeline/)
- [Motii — Activities-Based Selling](https://www.motii.co/post/activities-based-selling)
- [Solvaa — Using the Pipedrive Rotting Feature](https://solvaa.co.uk/how-to-use-the-pipedrive-rotting-feature-to-track-deal-inactivity-and-boost-conversions/)
- [Flowbird — The Rotting Feature in Your Pipedrive Stages](https://flowbird.co.uk/knowledge/the-rotting-feature-in-pipedrive)
- [Smartflow — Sales Forecasting In Pipedrive Best Practices](https://www.smartflow.ie/post/sales-forecasting-in-pipedrive-best-practices)
- [Smartflow — How to Avoid Common Pipedrive Mistakes](https://www.smartflow.ie/post/how-to-avoid-common-pipedrive-mistakes-for-better-sales-management)
- [AeroLeads — Pipedrive API Custom Fields](https://aeroleads.com/blog/pipedrive-api-custom-fields-create-update-keep-data-clean/)
- [AeroLeads — Pipedrive API Field Mapping](https://aeroleads.com/blog/pipedrive-api-field-mapping-from-custom-fields-clean-exports/)
- [Like2Byte — Pipedrive Review for Small Agencies 2026](https://like2byte.com/pipedrive-review-small-agencies/)
- [Dear Lucy — Pipedrive Reporting Dashboards](https://www.dearlucy.co/pipedrive)
- [CRMSquirrel — Pipedrive Stripe Integration Tutorial](https://crmsquirrel.com/pipedrive-stripe-integration-tutorial/)
- [Pipedrive Community — Multiple Pipelines](https://community.pipedrive.com/discussion/4571/details-for-multiple-pipelines)
