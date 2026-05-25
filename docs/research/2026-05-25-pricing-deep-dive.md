# Research — Pricing deep dive (BOND, Lindy, Sierra, Decagon, Cresta, Devin, Glean, Intercom Fin, HubSpot Breeze)

> **Research run date**: 2026-05-25
> **Question**: What pricing model wins for an SMB-mid AI workforce product in 2026?
> **Status**: raw research output — informs the positioning brief in `docs/positioning/`.
> **Subagent run id**: `a37026b1ef93e2286` (preserved for audit; transcript at `~/.claude/projects/.../subagents/agent-a37026b1ef93e2286.jsonl`).

---

I have enough data. Let me synthesize the 900-word report.

# OpsRadar Pricing Research — May 2026

## Phase 1 — Concrete pricing (verified)

| Product | Model | Price | Source |
|---|---|---|---|
| BOND (Donna) | Custom enterprise, no public tier | "Book a demo" | [YC](https://www.ycombinator.com/companies/bond) |
| Lindy 3.0 | Credit packs + seats | Free 400cr; Pro $49.99 (5K cr); Business $299.99 (30K cr); overage $10/1K | [lindy.ai/pricing](https://www.lindy.ai/pricing) |
| Notion AI | Bundled in Business $20/seat | Standalone $10 add-on **retired May 2025** | [notion.com/pricing](https://www.notion.com/pricing) |
| Notion Custom Agents | Credit add-on | $10 per 1,000 credits, no rollover (launched May 4, 2026) | [almcorp.com](https://almcorp.com/blog/notion-custom-agents/) |
| Glean | Per-seat + AI add-on | ~$45-50/seat + $15 AI; 100-seat min ($60K floor) | [vendr.com/glean](https://www.vendr.com/marketplace/glean) |
| Sierra | Outcome (per resolution) | ~$1.50/resolution; $150K-$250K platform floor; $50K-$200K implementation | [sierra.ai/outcome-blog](https://sierra.ai/blog/outcome-based-pricing-for-ai-agents) |
| Decagon | Per-conv OR per-resolution | ~$0.99/conv or ~$1.50/resolution; $50K-$95K platform min | [decagon.ai/glossary](https://decagon.ai/glossary/what-is-resolution-based-pricing) |
| Cresta | Custom; ~$150K starting | Bundled per-product (chat OR voice) | [eesel.ai/cresta](https://www.eesel.ai/blog/cresta) |
| Devin (Cognition) | Hybrid seat + ACU | Core $20; Team $500 (250 ACU); $2-$2.25/extra ACU (~15min) | [devin.ai/pricing](https://devin.ai/pricing/) |
| Harvey | Custom; ~$1,000-$1,200/seat; 25-seat min (~$360K floor) | not public | [aivortex.io](https://www.aivortex.io/legal/ai-tools/harvey-ai-pricing-2026/) |
| Intercom Fin | $0.99 per resolution **confirmed current** | 50/mo minimum | [fin.ai/pricing](https://fin.ai/pricing) |
| HubSpot Breeze | **Just switched to outcome (Apr 14, 2026)**: $0.50/resolved conv, $1.00/qualified lead | [hubspot.com/company-news](https://www.hubspot.com/company-news/hubspots-customer-agent-and-prospecting-agent-now-you-pay-when-the-task-is-complete) |
| MS Copilot 365 | Per-seat | $30/seat enterprise; $18-21 SMB | [microsoft.com](https://www.microsoft.com/en-us/microsoft-365-copilot/pricing) |
| Agentforce | **Now 3 models in 18mo**: $2/conv, $0.10/action Flex, or flat add-on | [salesforce.com/agentforce](https://www.salesforce.com/agentforce/pricing/) |
| Claude Code Team | Per-seat + API overage | Standard $20/seat; Premium $100/seat (Claude Code); 5-seat min; **tokens billed extra** | [claude.com/pricing](https://claude.com/pricing) |

## Phase 2 — Win/loss attribution

**"Per-seat is broken"** — Confirmed but nuanced. Pure per-seat fell 21%→15% of SaaS 2025-26 ([outrunly.com](https://outrunly.com/seat-based-pricing-is-dead-how-to-price-your-ai-saas-in-2026/)). HighRadius dropped per-seat entirely Feb 2026; HubSpot moved Breeze off credits to outcome Apr 2026; Monday.com replaced 100-person SDR team with agents. **But** the dominant replacement is *hybrid* (base + usage/outcome) at ~41-43% adoption, not pure outcome ([bvp.com/atlas](https://www.bvp.com/atlas/the-ai-pricing-and-monetization-playbook)).

**"Credit anxiety"** — Real and documented. Credit-to-dollar ratios silently inflated >20x at some vendors in early 2026 ([softwarepricing.com](https://softwarepricing.com/blog/credit-based-pricing-ai/)). Leena AI explicitly switched OFF consumption because "customers became wary of using the product" ([chargebee playbook](https://www.chargebee.com/blog/pricing-ai-agents-playbook/)). The "six fatal flaws of credit pricing" article documents downgrade-on-renewal as the top churn signal.

**"Outcome pricing works"** — Sierra: $0 → $150M ARR in 7 quarters on outcome pricing ([sierra.ai/100m-arr](https://sierra.ai/blog/100m-arr)). Decagon: $10M → $35M ARR in 10 months ([sacra.com/decagon](https://sacra.com/c/decagon/)). Intercom Fin: "tens of millions" in year one, 40% higher adoption than prior credit model.

**"Flat SaaS dying"** — Not dying, *unbundling*. Hybrid SaaS firms show 38% higher NRR than pure subscription ([korixinc.com](https://korixinc.com/learning-center/ai-pricing-models-2026)).

**11x.ai collapse** — Confirmed: $14M claimed ARR vs ~$3M real after 90-day break clauses hit. 70-80% of early customers exited. Cause was **not** outcome pricing — it was opaque annual contracts + lead-volume billing where underperformance was hidden until break-clause windows. ZoomInfo publicly stated 11x "performed significantly worse than human SDRs" ([aisdr.com/11x-techcrunch](https://aisdr.com/blog/11x-techcrunch/)). Lesson: outcome pricing protects vendors from this; lead-volume billing is the actual villain.

## Phase 3 — Outcome metric for AI Chief of Staff

**"Per approved-and-fired action" is structurally broken.** Siena AI's published critique ([siena.cx blog](https://www.siena.cx/blog/conversation-vs-outcome-based-pricing-ai-agent)) and Sierra/Decagon contract reports both flag the same trap: **the vendor defines the outcome**, customers learn to game it. For an approval-gated COO, customers will refuse to approve borderline actions to avoid the bill — directly suppressing the product's value.

Sierra/Decagon outcome = "resolved customer conversation" where the *customer* (end user) confirms. That's countable because the end-user behavior closes the loop. OpsRadar has no such external closer — the owner approves their own bill, which is the gaming loop.

**Better metrics for an AI COO:**
- **Recovered AR dollars** (% of recovered overdue, e.g., 3-5%) — Riskified-style, externally verifiable via Stripe
- **Qualified meeting booked** — externally verifiable in HubSpot/Calendly
- **Resolved alert/issue** with auto-close after N days — defeats refuse-to-approve gaming

11x's failure used **lead-volume** (uncoupled from value); avoid that.

## Phase 4 — SMB-mid services band

- **ConvertKit/Kit**: stayed on per-subscriber, raised prices Oct 2025 ($29→$39 entry); 63K customers. Per-subscriber survived because the value metric scales with the customer's revenue.
- **HubSpot**: moved to seat-based Mar 2024 for core CRM but **just moved AI agents to outcome Apr 2026**. Starter $20/mo, Pro ~$890/mo + $3K onboarding. ([encharge.io](https://encharge.io/hubspot-pricing/))
- **Calendly**: $12/seat Standard, classic per-seat — works because seat = active scheduler.
- **n8n Cloud**: Starter €24 (2.5K execs), Pro €60 (10K), Business €800 (40K) — execution-based.
- **Make.com**: $10.59 (10K ops), Pro $18.82, Teams $34.12 — operation-based.
- **Gumloop**: Free 2K cr, Solo $37 (10K cr), Team $244 (60K cr).
- **Lindy**: $49.99 → $299.99 spread.

The SMB-mid sweet spot has a clear floor at $20-$50 and a Team tier at $200-$500.

## Synthesis & recommendations

### 1. The 2026 pricing model with strongest evidence
**Hybrid: base platform fee + outcome overage on verifiable business outcomes.** Bessemer, HubSpot, Sierra, and HighRadius all converged here. Pure outcome only works when the outcome closer is the end-customer (Sierra). Pure credits drive churn (Leena, Notion's retired add-on). Pure seat is the slowest-growing model in AI.

### 2. The outcome metric for OpsRadar
**Tier on retainer-equivalent (Composio integrations × Notion brain) + meter ONE externally-verifiable outcome: recovered overdue invoice dollars (e.g., 2.5% of recovered AR above $5K/mo threshold).** Stripe verifies it. Customer can't refuse-to-approve their way out (the dollars are real). Do NOT meter "approved actions" — gameable. Optionally add per-qualified-meeting as a Growth-tier add-on.

### 3. Exact tier structure for `/pricing`

| Tier | Monthly | Includes | Outcome meter |
|---|---|---|---|
| **Starter** | $299 | 3 integrations, 1 user, COO chat, Notion brain, 5 cron agents | none |
| **Growth** | $899 | 10 integrations, 5 users, 28 agents, automations, 50K AI tokens/mo | 2% of recovered AR above $5K threshold |
| **Pro** | $2,499 | unlimited integrations, 15 users, FO surfaces, priority support, 250K tokens | 2% recovered AR + $50/qualified meeting (opt-in) |
| **Fractional Operator** | $4,999 | multi-client, branding, 50 users | same + agency-margin reporting |

This anchors against BOND (custom enterprise), beats Glean's $60K floor, undercuts Sierra's $150K floor, and **matches the SMB-mid budget band** ($200-$2,000/mo confirmed by [reinventing.ai](https://insights.reinventing.ai/articles/ai-agents-cost-performance-smb-2026-04-08)).

### 4. Steelman against this model
**The strongest argument against outcome-metered AR recovery:** *"Most agencies don't have a chronic overdue-AR problem big enough to meter. If recovered AR is $0/mo for a healthy customer, the outcome line item is $0 — meaning you've added pricing complexity for no monetization, and confused the buyer about what they're paying for. Worse, if AR collection is the meter, you've branded yourself as a collections agency, not a Chief of Staff."* The fallback: drop the outcome meter to "opt-in upside" on Pro+, keep the three flat tiers as the headline, position outcome as "we win when you win" not as core pricing. This matches what HubSpot did — outcome on specific agents only, not platform-wide.

### Sources

Primary pricing pages: [Lindy](https://www.lindy.ai/pricing), [Notion](https://www.notion.com/pricing), [Sierra blog](https://sierra.ai/blog/outcome-based-pricing-for-ai-agents), [Decagon glossary](https://decagon.ai/glossary/what-is-resolution-based-pricing), [Devin](https://devin.ai/pricing/), [Fin](https://fin.ai/pricing), [HubSpot Breeze announcement](https://www.hubspot.com/company-news/hubspots-customer-agent-and-prospecting-agent-now-you-pay-when-the-task-is-complete), [MS Copilot](https://www.microsoft.com/en-us/microsoft-365-copilot/pricing), [Agentforce](https://www.salesforce.com/agentforce/pricing/), [Claude](https://claude.com/pricing), [n8n](https://n8n.io/pricing/), [Gumloop](https://www.gumloop.com/pricing). Analyses: [Bessemer playbook](https://www.bvp.com/atlas/the-ai-pricing-and-monetization-playbook), [Chargebee 2026 playbook](https://www.chargebee.com/blog/pricing-ai-agents-playbook/), [Sacra/Sierra](https://sacra.com/c/sierra/), [Sacra/Decagon](https://sacra.com/c/decagon/), [11x post-mortem](https://aisdr.com/blog/11x-techcrunch/), [Siena critique](https://www.siena.cx/blog/conversation-vs-outcome-based-pricing-ai-agent), [SaaStr on Agentforce](https://www.saastr.com/salesforce-now-has-3-pricing-models-for-agentforce-and-maybe-right-now-thats-the-way-to-do-it/), [Credit pricing flaws](https://softwarepricing.com/blog/credit-based-pricing-ai/).
