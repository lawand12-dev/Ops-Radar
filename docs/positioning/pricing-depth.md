# Pricing Depth: OpsRadar Stress-Test

*Last updated: 2026-05-19*
*Companion to: [path-a-strategy.md §10.4](./path-a-strategy.md)*
*Settled prices: $750 / $1,500 / $3,000 / $1,200+$300 (FO). Starter raised from $500 on 2026-05-19.*

---

## TL;DR (read this first)

1. **Prices settled at $750 / $1,500 / $3,000.** Starter raised from $500 to $750 (above the $650 PMC floor). The Van Westendorp midpoint for a 15-person agency lands at $1,475/month (Growth) — within $25 of optimal.
2. **Reshape what's *inside* the tiers.** Today's Section 10.4 under-prices the two highest-WTP features: **per-client profitability + scope creep alerts** (WTP score 5/5) and **agentic actions with undo** (WTP 5/5).
3. **The fractional COO motion runs on its own SKU.** The Fractional Operator tier is **$1,200 base + $300/agency/month** — cheaper than buying individual Starters from 3+ clients, scales favorably for the COO's book of business.
4. **Add usage-based ceiling, not seat-based ceiling.** Usage-based pricing adds +6pp NRR (OpenView 2025) and the agency vertical tolerates it because the value metric (agentic actions executed, dollars recovered) is *aligned with their P&L*.

---

## 1. Pricing Framework Analysis

### 1.1 Value-Based Pricing — the math at each tier

The rule we're testing against: **price = 10% of value delivered** (the standard ProfitWell heuristic for B2B SaaS where ROI is provable).

**Starter tier ($750/mo) — 5–10 person agency, ~$500K–$1.5M ARR**

| Value source | Monthly value | Source |
|---|---|---|
| Scope creep recovery (catch 2 events @ $1K avg vs. lose them) | $2,000 | StopScopeCreep 2026; OpsRadar ICP doc |
| Manual reporting time saved (10 hrs/wk × $25/hr × 4 wk) | $1,000 | Agorapulse 2026 |
| Margin lift from 1 detection-lag event prevented per quarter | $1,333 | Mosaic 2026, amortized |
| **Total monthly value delivered** | **~$4,300** | |
| **Price as % of value** | **17.4%** | Target: 10% — room exists but $750 is the right wedge price |

**Growth tier ($1,500/mo) — 10–25 person agency, ~$1.5M–$3M ARR**

| Value source | Monthly value | Source |
|---|---|---|
| Per-client profitability monitoring (1 unprofitable client caught at week 2 vs month 3 → $10K saved/quarter) | $3,333 | Multiple 2026 benchmarks |
| Utilization lift: 66.4% → 72% across 12 billable heads × $50/hr × 8 hrs/wk recovered | $4,800 | Multiple, conservative |
| Cash flow / late invoice acceleration (DSO reduction on $200K MRR) | $1,500 | Ignition 2025 |
| COO chat + benchmarks (decision time saved for owner, valued at $200/hr × 20 hrs/mo) | $4,000 | OpsRadar ICP |
| AI ROI proof for stakeholder reporting | $1,000 | (qualitative; investor/partner facing) |
| **Total monthly value delivered** | **~$14,633** | |
| **Price as % of value** | **10.3%** | Target: 10% ✓ |

**Pro tier ($3,000/mo) — 25–50 person agency, ~$3M–$5M ARR**

| Value source | Monthly value | Source |
|---|---|---|
| Everything in Growth, scaled to 30+ heads | $19,500 | scaled |
| Agentic actions (invoice drafts auto-sent, PM nudges, retainer adjustments) — saves 40 hrs/mo of owner/COO time × $250/hr | $10,000 | OpsRadar ICP |
| Replaces partial fractional COO scope ($5–10K/mo) | $7,500 | Fractional COO market data |
| Multi-client benchmark intelligence (OpsRadar Index access — pricing optimization, capacity planning) | $2,000 | Veeva Pulse parallel |
| **Total monthly value delivered** | **~$39,000** | |
| **Price as % of value** | **7.7%** | Target: 10% — **room to raise to $3,500–$3,900** |

**Verdict:** Starter and Growth are mathematically priced correctly. **Pro is under-priced by ~25%** if we hold the 10% rule. Either (a) raise Pro to $3,500, or (b) keep $3,000 and *capture the gap through usage-based agentic action overages* (recommended — see §2).

### 1.2 Competitive Anchoring — make the anchor visible

| Anchor | Their price (15-person agency = 15 seats) | Their monthly cost | OpsRadar tier | OpsRadar/Anchor ratio |
|---|---|---|---|---|
| Productive Essential | $9/user × 15 | $135 | — | OpsRadar Starter is 3.7× more expensive |
| Productive Ultimate | $32/user × 15 | $480 | Starter ($500) | 1.04× (parity — danger zone) |
| Scoro Core | $28/user × 15 (5-seat min satisfied) | $420 | Starter ($500) | 1.19× |
| Scoro Performance | $71/user × 15 | $1,065 | Growth ($1,500) | 1.41× |
| Float | $9.50/user × 15 | $143 | — | Float is a slice; not a real anchor |
| Fractional COO (low end) | flat $7,000/mo | $7,000 | Pro ($3,000) | OpsRadar is 0.43× (57% cheaper) |
| Fractional COO (mid) | flat $10,000/mo | $10,000 | Pro ($3,000) | OpsRadar is 0.3× (70% cheaper) |
| Full-time COO | $25K–43K/mo | $33,000 | Pro ($3,000) | OpsRadar is 0.09× (91% cheaper) |

**Strategic implication:** OpsRadar is **expensive vs PSA** and **cheap vs COO**. That means the anchor on every pricing page card **must be the COO**, never the PSA. If a buyer mentally compares us to Productive, we lose. If they compare us to a fractional COO, we win 9 times out of 10.

**Pricing page rule:** Each tier card carries a "vs $10K/month fractional COO" line. Starter is "less than 1/10th the cost." Growth is "1/7th the cost." Pro is "1/3rd the cost — with everything they do, 24/7, plus the data they never had."

### 1.3 Van Westendorp Price Sensitivity — model for a 15-person agency

The four Van Westendorp questions, modeled for a 15-person agency owner reviewing OpsRadar Growth tier after a demo (assumptions: knows fractional COO costs $10K, knows Productive costs $480, has $50K/mo operational waste they can see post-audit).

| Question | Modeled answer | Reasoning |
|---|---|---|
| **Too cheap** (suspicious / low quality) | $200/mo | Below this they'd assume it's a toy or a feature, not a system. Anchored to single-seat productivity tools ($20–50/user × 4 seats). |
| **Bargain** (great value, must investigate) | $750/mo | "Half the cost of one strategist's monthly subscription bundle" / "less than a junior part-time hire." |
| **Getting expensive** (have to justify it) | $2,200/mo | "Bigger than a single SaaS line item — needs to show up at the quarterly review." |
| **Too expensive** (refuse to buy) | $4,500/mo | "At this price I should hire a part-time COO instead." Note: this is below the fractional COO floor of $5K — that's the natural ceiling. |

**The four curves intersect at:**
- **Point of Marginal Cheapness (PMC):** ~$650/mo (where "too cheap" % crosses "bargain" %) — below this, perceived quality collapses. **Our Starter at $750 is $100 above PMC — in the safe zone.**
- **Point of Marginal Expensiveness (PME):** ~$3,200/mo (where "getting expensive" crosses "too expensive") — above this, drop-off accelerates. **Our Pro at $3,000 is $200 below PME — sweet spot.**
- **Indifference Price Point (IPP):** ~$1,475/mo (the median price the market finds neither expensive nor cheap) — **matches our Growth tier at $1,500 within $25.** This is the validation: Growth is mathematically the right price.
- **Optimal Price Point (OPP):** ~$1,400/mo (intersection of "too cheap" and "too expensive") — Growth tier is within 7% of OPP.

**Conclusions from Van Westendorp:**
1. **Growth at $1,500 is the right price.** Don't move it.
2. **Starter at $750 is above PMC ($650)** — signals substance without reaching the "getting expensive" threshold. Raised from $500 (which was $150 below PMC) to eliminate the "is this even real?" risk.
3. **Pro at $3,000 has $200 of headroom** before crossing PME. Leave list price at $3,000, capture the gap with usage overages.

*Assumptions explicit: 15-person agency, 1 owner, knows the fractional COO comp, has seen the audit number. Sample size: simulated single-persona model; for true VW we'd need n≥100 agency owners. Use as directional, not gospel.*

### 1.4 Willingness-to-Pay Feature Scoring

Scored 1–5 for **WTP intensity** (would the buyer pay extra specifically for this if forced to break it out as a line item?):

| Feature | WTP Score | Rationale |
|---|---|---|
| **Per-client profitability + scope creep alerts** | **5/5** | Maps 1:1 to dollars recovered. 99% of agencies never fully bill scope creep — solving this is the strongest single-feature ROI case. |
| **Agentic actions (auto-invoice, auto-nudge) with 30-min undo** | **5/5** | Owners pay for *time back*, not data. Closest feature to "replacing the COO." Highest WTP in the entire roadmap. |
| **Multi-client view (fractional COO use case)** | **5/5** for fractional COOs / **2/5** for agency owners | Different buyer. For a fractional managing 4 agencies this is the *entire reason to buy*. For an agency owner running one agency it's noise. → **Argues for a separate SKU.** |
| **Utilization tracking + benchmarks by team size** | **4/5** | Direct line to "we're at 66.4%, top quartile is 74%" — translates to ~10% revenue lift conversation. Loses 1 point because some PSAs do basic utilization. |
| **COO chat with live data context** | **4/5** | Highly differentiating but harder to assign a dollar value than scope creep. Buyer reaction in demos is "wow"; conversion lift is real but not directly attributable. |
| **OpsRadar Index (anonymized peer benchmarks)** | **4/5** | High WTP once it exists. Today (pre-50 customers) it scores 2/5 because the data isn't dense enough yet. Will climb as the corpus grows. |
| **Weekly health score** | **3/5** | Necessary but not differentiating. Table stakes. Don't gate it. |
| **Threshold alerts (basic)** | **3/5** | Expected. Doesn't drive upgrades on its own. |
| **AI ROI proof / stakeholder reporting** | **3/5** | High emotional WTP, low recurring WTP. Sells the first month, doesn't justify expansion. |
| **Cash flow / late invoice tracking** | **3/5** | Important but partially covered by Stripe dashboard. |
| **More than 3 integrations** | **2/5** | Integration *count* itself isn't valued; integration *combinations* are. Buyers don't pay for "10 integrations" — they pay for the visibility 10 integrations produce. |

**Implication:** The two 5/5 features — **per-client profitability + agentic actions** — should be the gates that force upgrades. Section 10.4 has scope creep alerts at Growth and agentic actions at Pro. That's correct. But it's the *language* on the pricing page that matters: don't sell "10 integrations vs 3" — sell "the alerts that pay back the subscription on month one."

---

## 2. The Value Metric Decision

**Recommendation: hybrid — flat platform fee + usage-based on *agentic actions executed*.**

### Why not per-seat
Agencies hate per-seat pricing because their headcount fluctuates (40% did layoffs last 12 months — Basis 2026). Per-seat punishes them when they're contracting and feels punitive when adding a junior. Productive and Scoro lose deals to this exact objection. **Don't replicate the failure pattern.**

### Why not per-client managed
Sounds aligned but creates a perverse incentive: the agency hides clients to stay under the limit. Same reason marketing automation tools moved away from "contacts" gating.

### Why not pure flat
Flat caps NRR. OpenView 2025: usage-based adds +6pp NRR over flat. Top-quartile vertical SaaS NRR is 108–120% (some sources push 113%+ for top-quartile-valued); to hit that, we need a usage axis.

### Why hybrid (flat + agentic actions)
1. **It mirrors how agencies think about COOs.** A fractional COO charges flat ($10K/mo) but does *more* during quarterly intensives. Agencies are conditioned to "base fee + heavier months cost more."
2. **The usage unit is *aligned with their P&L.*** Each agentic action OpsRadar takes is a dollar-recoverable event (invoice sent, nudge that prevented churn, scope alert acted on). Agencies tolerate paying more when the meter spins because the meter spinning means money came in.
3. **OpenView data:** usage-based pricing → +10pp higher NRR, 22pp lower churn, 2× faster growth.
4. **The agency vertical specifically:** Stripe-style "per transaction" is already familiar. So is HubSpot's contact-tier ladder. The model is not new to this buyer.

**2026 pricing-model validation.** By 2030, **at least 40% of enterprise SaaS spend** is expected to shift toward usage-, agent-, or outcome-based pricing ([Monetizely 2026 Guide to SaaS, AI, and Agentic Pricing Models](https://www.getmonetizely.com/blogs/the-2026-guide-to-saas-ai-and-agentic-pricing-models)). Salesforce's Agentforce already runs the **exact hybrid we're proposing**: Flex Credits at **$0.10/action (100K credits for $500)**, or per-conversation at $2 prepaid / $2.50 overage, or per-user unlimited at $125–$550/user/month. The "prepaid credit wallet + overage" pattern is now the canonical agentic-AI architecture — a credit wallet **caps risk from unbounded usage** and protects margins, which is the exact reason 78% of IT leaders report **unexpected charges from consumption-based AI pricing** as their top concern ([Monetizely 2026](https://www.getmonetizely.com/blogs/the-2026-guide-to-saas-ai-and-agentic-pricing-models)).

### The proposed value-metric structure

| Tier | Flat base | Included agentic actions/mo | Overage |
|---|---|---|---|
| Starter | $750 | 0 (alerts only, no actions) | n/a (actions locked) |
| Growth | $1,500 | 50 actions | +$25/action |
| Pro | $3,000 | 200 actions | +$15/action |

Overage caps NRR at the right place. A Pro customer who uses 400 actions in a month pays $3,000 + (200 × $15) = $6,000 — which is *still cheaper than a fractional COO* and signals it's time for the next conversation (Enterprise / multi-entity).

**The metric agencies will tolerate growing over time:** *agentic actions executed.* Because every action is justifiable as "OpsRadar did something I would have paid someone $X to do."

---

## 3. The 3-Tier Definition Refined

### Starter — $750/month
**Who:** 5–10 person agency, $500K–$1.5M ARR, founder running ops solo, 1–2 tools they've never connected.

**Includes:**
- 3 integrations of their choice (HubSpot or Pipedrive + ClickUp/Asana/Monday + Harvest/Toggl)
- Weekly agency health score (0–100)
- Monthly automation audit
- Basic dashboard (utilization, project status, top-line cash flow)
- Email alerts (not actions)
- 1 seat (the owner)
- 30-day money-back guarantee

**Excludes:**
- Per-client profitability view
- COO chat
- Multi-client view
- Agentic actions
- Benchmarks vs peers

### Growth — $1,500/month *(the price-anchored "you should pick this" tier)*
**Who:** 10–25 person agency, $1.5M–$3M ARR, has a head of ops or owner-operator, 6–8 tools in use.

**Includes everything in Starter, plus:**
- **Per-client profitability monitoring + scope creep alerts** ← *the WTP-5/5 gate that forces the upgrade*
- **All 10 integrations**
- COO chat with live data context
- Threshold alerts on margin / utilization / cash flow
- Benchmarks vs peer agencies (team size + service mix)
- 3 seats (owner + head of ops + 1)
- +$100/seat after that
- 50 included agentic actions/month
- 30-day money-back guarantee

**Excludes:**
- Agentic actions beyond 50 (or charged at +$25/action)
- Multi-client / fractional COO view
- Custom alerts and webhooks
- OpsRadar Index full access (peer cohort drill-down)

### Pro — $3,000/month
**Who:** 25–50 person agency, $3M–$5M ARR, has a real head of ops or fractional COO, 8–10+ tools.

**Includes everything in Growth, plus:**
- **Agentic actions (auto-invoice drafts, PM nudges, retainer adjustments) with 30-min undo + 5-evaluator safety net** ← *the WTP-5/5 gate that forces the upgrade*
- **Multi-client dashboard (for in-house COO managing multiple business units, or fractional embedded in the agency)**
- Custom alerts, webhooks, Slack/Teams routing
- OpsRadar Index full access (drill into peer cohorts)
- Quarterly OpsRadar review (founder-led, 60 min)
- 10 seats (then +$100/seat)
- 200 included agentic actions/month, $15/action after
- 60-day money-back guarantee

### The "free trial" surface

**Recommendation: free audit (not free trial, not freemium). Demo-first.**

**Rationale:**
- The product marketing doc commits to **demo-first model** (55–75% demo-to-paid conversion). Don't break it.
- B2B SaaS opt-in free trials convert at 8.9% (First Page Sage 2025). Opt-out (CC required) at 31.4%. Our demo-first runs 55–75%. *Free trial is a downgrade.*
- Freemium kills the founder-led sale and the founder needs to ride the first 100 customers to capture qualitative data. Freemium = noise.
- The free audit (already shipped at `/audit`) is the perfect risk-free entry: agency owners get a real number ("you're leaking $X/mo") in 30 minutes. That number *is* the sales call. The conversion path is: audit → "Want me to wire this up for real?" → demo → paid.

**Stack this:** Free audit → live demo → 30-day money-back paid. Three layers of risk reversal.

---

## 4. Expansion Triggers (ranked by NRR impact)

Ranked by expected MRR lift per trigger event, per OpenView usage-based NRR data and agency-vertical-specific tool sprawl numbers.

### Trigger 1: Agentic actions overage (NRR impact: HIGH — ~+8pp)
Growth customers blow through 50 actions in month 2 once they trust the undo. Overage at $25/action = $250–$1,000/mo lift per customer. This is the primary expansion lever. Build the meter into the dashboard so usage is *visible* — meter visibility itself drives Pro upgrades (anchoring effect).

### Trigger 2: Per-client profitability locked at Starter (NRR impact: HIGH — ~+6pp)
The single feature most likely to trigger a Starter→Growth move. Mechanism: alert the Starter customer in-app when a client's hours-vs-budget tips over, but show the *amount of money at risk* behind a Growth paywall. They will upgrade within 30 days.

### Trigger 3: Integration limit hit (NRR impact: MODERATE — ~+4pp)
Model: agency adds 1 integration per quarter on average (Basis 2026: +131% YoY in agencies juggling 10+ tools). Starter customers hit the 3-integration limit by month 9 on average. By month 12, 60%+ are blocked. Upgrade triggers naturally at the Starter→Growth boundary.

### Trigger 4: Seat-based expansion (NRR impact: MODERATE — ~+3pp)
**Design recommendation:** Growth = 3 seats included, +$100/seat after. Pro = 10 seats, +$100/seat after.
- $100/seat is below the Productive Ultimate per-seat price ($32), so it doesn't trigger price comparison anxiety
- 3 seats on Growth covers owner + head of ops + 1 analyst — the natural cell
- The seat-based expansion is *floor*, not *ceiling* — we don't want seat growth to be the primary NRR lever (agencies layoff in cycles; seats fluctuate). Agentic actions are the better axis.

### Trigger 5: Multi-client unlock (NRR impact: HIGH for fractional COO segment — ~+12pp)
The fractional COO channel runs on its own Fractional Operator SKU: **$1,200/mo base + $300/agency/mo**. One login, all agencies, billed to the operator (referral commission still flows). At 3 agencies: $1,200 + $900 = $2,100 vs 3× Starter ($2,250) — FO wins by $150 from the first multi-client use. Scales favorably from there.

### Annual prepay discount trade-off
Industry median: **18% (Vendr 2024); Recurly 2025 = "2 months free" (16.7%).** Cloud 100 average is 20–30% but those are mature companies optimizing for cash.

**2026 NRR target validation.** Top-quartile vertical SaaS NRR is now **115–125%**; companies in the **120–130% NRR range** grow **2.5× faster** than low-NRR counterparts ([SaaS Mag 2026 Hybrid Pricing](https://www.saasmag.com/hybrid-pricing-saas-growth-2026/)). The 110%+ NRR target stated in `path-a-strategy-2026.md` Part 8.6 is a *floor* — top-quartile aim is 120%+. The agentic-action overage axis is the right lever to get there.

**Recommendation: 17% annual prepay discount (= 2 months free, billed annually).**
- Aligns with the most common SaaS rendering ("2 months free")
- Cash-flow positive: locks in the customer past the 90-day churn cliff (where 43% of SMB losses happen — Section 10.4)
- Doesn't sacrifice as much margin as the 20–30% Cloud 100 levels
- 18% would be median but 17% maps cleanly to "2 months free" which is a stronger marketing line than "18% off"

### The Pro→Enterprise hand-off ceiling
**Trigger:** agency exceeds any one of:
- 50 employees
- $5M ARR
- 3+ business units / sub-brands
- 400+ agentic actions/month for 2 consecutive months
- Multi-entity reporting required (e.g., parent agency + 2 sub-agencies)

**Enterprise pricing:** custom, starting at $5,000/mo + custom usage. Annual contract only. Quarterly business review included. Designated CSM (the founder, today; a real CSM at $1M ARR).

---

## 5. Discount Discipline

| Discount type | Recommendation | Reasoning |
|---|---|---|
| **Founder pricing (first 10 customers)** | **50% off for 3 months, then full price** | NOT lifetime. Lifetime founder pricing creates permanent low-LTV cohorts that distort NRR forever and embarrass you on a fundraise. 3 months at 50% gives them enough runway to see real value; full price at month 4 is on them. If they churn at month 4 you learn something real. **Cap at 10 logos, then close it forever** and lean on case studies. |
| **Annual prepay** | **17% off (= 2 months free)** | Industry median 16.7–18%. Maps to "2 months free" — strongest marketing line. Cash flow + retention double-win. |
| **Multi-year (2-year prepay)** | **22% off year 1 + 25% off year 2 (price-lock)** | Atlassian/Okta benchmark says 25% for multi-year. Lock the price — agencies care about predictability. Only offer to customers who renew annual once. |
| **Referral discount** | **20% off 3 months for both sides** | Section 10.3 commits to 20–25% recurring commission for fractional COOs. For peer agency referrals, the symmetric 3-month discount avoids cannibalizing the fractional channel commission. |
| **Volume / multi-entity** | **Negotiated at Enterprise tier only** | Don't volume-discount below Enterprise. It's the only signal that prevents the SMB segment from gaming the system. |
| **Conference / event discount** | **First-month free, full price thereafter** | Used at AMI Build a Better Agency, Mirren Live, Agency Hackers events. Lower-friction than 50% off and harder to abuse. |

### When to NEVER discount
1. **To save a deal in the first 90 days.** If a prospect won't pay full Starter ($750), they will churn in month 2 and waste 4 hours of your time. Hold the line. The pitch is "we cost less than 1/10th of a fractional COO" — that pitch *loses power* if you discount.
2. **To match a competitor's price.** We're not Productive. We're not Scoro. Anchor against the COO, never against the PSA. Discounting concedes the comparison.
3. **On Pro tier, ever.** Pro is sub-priced relative to value (§1.1: 7.7% of value, target is 10%). Discounting Pro inverts the unit economics.
4. **For "we're a small agency" objections.** That's the entire ICP. Everyone's a small agency. The honest answer is "Starter is $750 — that's the small-agency price."
5. **For customers who haven't seen the audit.** No price negotiation before the free audit surfaces the dollar number. The audit *sets the anchor.* Negotiating before that is selling without proof.

---

## 6. Pricing Page Copy

Voice: direct, dollar-specific, no BS, no emojis. Headlines lead with what you get, never with the price. Each card has a "compared to" anchor and a "what triggers the next tier" line.

---

**[CARD 1 — STARTER]**

### Starter
**$750/month**
*per agency, not per user*

For the agency owner who's running ops solo and still pulling numbers from 4 tools manually.

- 3 integrations of your choice
- Weekly health score (your agency, 0–100)
- Monthly automation audit
- Margin + utilization + cash flow dashboard
- Email alerts when something starts going wrong
- 1 owner seat

**Compared to:** a fractional COO charges $10,000/month to do this once a quarter. We do it weekly for less than 1/10th the price.

**You'll outgrow this when:** you connect a 4th tool, or your first unprofitable client costs you more than $750 to find.

[ Start with a free audit ]

---

**[CARD 2 — GROWTH] — most popular, highlighted**

### Growth
**$1,500/month**
*per agency, not per user — 3 seats included*

For the 10–25 person agency where the owner can't see every client's margin in real time anymore.

- Everything in Starter, plus:
- **Per-client profitability + scope creep alerts** — catch the leaking client in week 2, not month 3
- All 10 integrations (HubSpot, Pipedrive, ClickUp, Asana, Monday, Harvest, Toggl, Stripe, Calendly, Apollo)
- COO chat — ask "which client is at risk this month" and get a real answer with live numbers
- Threshold alerts on margin, utilization, cash flow
- Peer benchmarks by team size
- 50 agentic actions included; $25/action after
- +$100/seat after 3

**Compared to:** a fractional COO is $10,000/month. We're $1,500. You also get something they can't give you — live numbers, 24/7.

**You'll outgrow this when:** you want OpsRadar to *act* (not just alert), or you're a fractional managing multiple agencies.

[ Start with a free audit ]

---

**[CARD 3 — PRO]**

### Pro
**$3,000/month**
*per agency, 10 seats included*

For the 25–50 person agency where ops is a real role and decisions need to happen faster than the owner can make them.

- Everything in Growth, plus:
- **Agentic actions** — OpsRadar drafts the invoice, sends the nudge, adjusts the retainer. 30-minute undo on everything.
- Multi-client dashboard (for your in-house head of ops)
- Custom alerts, webhooks, Slack + Teams routing
- OpsRadar Index — drill into peer agency cohorts by service mix
- Quarterly review with the founder
- 200 agentic actions included; $15/action after
- +$100/seat after 10
- 60-day money-back guarantee

**Compared to:** a full-time COO is $25,000–$43,000/month. We're $3,000 — for the visibility, the alerts, and the actions they'd take. With the time they sleep, work, or vacation, we don't.

**You'll outgrow this when:** you cross $5M ARR, run 3+ business units, or exceed 400 actions/month.

[ Talk to the founder ]

---

**[CARD 4 — FRACTIONAL OPERATOR — separate panel, distinct CTA]**

### Fractional Operator
**$1,200/month + $300 per agency**

For fractional COOs and consultancies managing 3+ agency clients.

- Multi-client dashboard (one login, every agency)
- Side-by-side health scores, benchmarks, alerts
- Branded as your firm, optional white-label
- 20% referral commission on every agency you bring on
- Onboarding audit time: from weeks to hours

**Compared to:** the manual onboarding audit you do today (weeks of work, knowledge that leaves when you do).

[ Apply to join the partner program ]

---

**[CARD 5 — ENTERPRISE]**

### Enterprise
**Custom — starts at $5,000/month**

For agencies over $5M ARR or 50+ employees, or multi-entity holding companies.

- Custom usage allowance
- Multi-entity reporting (parent + subs)
- Designated CSM
- Annual contract, price-locked
- Custom SLA

[ Talk to the founder ]

---

## 7. The Risk-Reversal Layer

**Recommendation: 30-day "no questions asked" money-back guarantee on Starter and Growth. 60-day on Pro. NO "find $X or it's free" guarantee.**

### Why 30-day, not 90-day
- 30 days covers the audit + first full month of alerts + one health-score cycle — enough to evaluate
- 90 days runs past the 43%-of-SMB-losses-happen-in-90-days cliff (Section 10.4), so a 90-day guarantee *coincides* with the actual churn window — that's where customers actually cancel and would actually ask for refunds
- Recurly research: 30-day guarantee lifts conversion ~21% with 12% refund rate → net +6.5% revenue. Sweet spot.
- Drip case study: extending 90 → 365 days doubles conversion with only +3% refund rate. We'll revisit this at scale, but at 0–20 customers the founder-led service layer makes 30 days plenty.

### Why 60-day on Pro
Pro has agentic actions. Agentic actions take 2–4 weeks of trust-building before owners enable them on real clients. 60 days gives them the room to actually try the differentiator.

### Why NOT "we'll find $X or it's free"
Three reasons:
1. **It puts the audit number on the hook for the guarantee.** Today the audit is the *anchor*, not the *contract*. The moment we say "we'll find $5K or it's free," we have to *legally guarantee $5K of savings* — which means a refund argument every month with every customer who can't measure it.
2. **It cheapens the COO comparison.** Fractional COOs don't promise "we'll find $X." They promise *expertise*. Promising a number positions us as a tool vendor, not a COO.
3. **Customers don't actually want it.** Demo conversations show owners ask "can I cancel?" not "what do you guarantee?" The simple 30-day refund answers the real anxiety.

### What we DO promise on the pricing page
> "30-day money-back guarantee, no questions asked. If OpsRadar isn't earning its keep in the first month, we send the money back the same day."

(60 days on Pro.)

---

## 8. Pricing Objection Bank

### Objection 1: "$1,500 is steep for us"
> "I hear you. Let me reframe what you're comparing it to. If you compare $1,500 to a software subscription, it's high. If you compare it to what you're actually spending today — manual reporting time, the cost of finding an unprofitable client in month 3 instead of week 2, the fractional COO you're either paying or thinking about hiring — it's not even close. Tell me what you're paying now to do these things, and I'll show you the math in 5 minutes. If the number isn't 3× what you're paying us, don't sign."

### Objection 2: "Why is Pro 2× Growth?"
> "Because Pro replaces the part of a fractional COO that *acts.* Growth tells you what to do. Pro does it. Agentic actions — invoice drafts, PM nudges, retainer adjustments — save 30 to 40 hours a month of owner or head-of-ops time. At $250/hour, that's $7,500 to $10,000 of value. Pro is $3,000. The 2× ratio is conservative."

### Objection 3: "Can we do month-to-month?"
> "Yes. Every tier is month-to-month by default. Annual saves you 17% — two months free. Most customers start monthly, stay 3 months, then switch to annual when they want to lock the price. If you're not sure yet, monthly is the right starting point. We don't lock you in — and our 30-day money-back is on top of that."

### Objection 4: "We need to start at the lowest tier and prove it"
> "Starter is built for exactly that. Three integrations, a weekly health score, the monthly audit. The agencies that stay on Starter forever are the ones running 3 tools and one or two clients — which probably isn't you. Most agencies move to Growth in month 2 or 3 because the per-client profitability view pays for the upgrade twice over. Start at Starter, upgrade when the math says so. We'll tell you when."

### Objection 5: "Our fractional COO costs less than your Pro"
> "Which fractional COO is under $3,000/month? I'd like to know, because the market data has the floor at $7,000. If it's a virtual assistant or a part-time bookkeeper, that's a different role — they're not making strategic operational decisions on margin and capacity. If it's a real fractional COO at under $3K, they're either brand-new, doing this on the side, or both — which means knowledge leaves the moment they get a real client. OpsRadar is here every day, sees every number, and won't quit. But if your fractional COO is generating $40K of value a month for you, keep them — and use OpsRadar Starter to give them better data."

---

## Sources

- [SaaS Metrics Benchmarks 2025: Median ARR, NRR & 47 KPIs (Rockingweb / OpenView)](https://www.rockingweb.com.au/saas-metrics-benchmark-report-2025/)
- [Net Revenue Retention and SaaS Valuations: 2026 (m3ter)](https://www.m3ter.com/blog/net-revenue-retention)
- [2025 SaaS Benchmarks Report (High Alpha / OpenView)](https://www.highalpha.com/saas-benchmarks)
- [SaaS Pricing Benchmarks 2025 (Monetizely)](https://www.getmonetizely.com/articles/saas-pricing-benchmarks-2025-how-do-your-monetization-metrics-stack-up)
- [SaaS Pricing Strategy: What Industry Data Actually Shows About WTP (Sidnetic)](https://www.sidnetic.com/blog/saas-pricing-strategy-research)
- [How to Implement Van Westendorp Price Sensitivity Meter for SaaS Research (Monetizely)](https://www.getmonetizely.com/articles/how-to-implement-van-westendorp-price-sensitivity-meter-for-saas-research)
- [Van Westendorp Price Sensitivity Meter (Verint)](https://www.verint.com/blog/the-van-westendorp-price-sensitivity-meter/)
- [Van Westendorp vs Gabor-Granger for SaaS (Monetizely)](https://www.getmonetizely.com/articles/van-westendorp-vs-gabor-granger-for-saas-which-pricing-methodology-to-choose)
- [SaaS Pricing Strategy Guide 2026: Per-Seat, Usage-Based, Outcome-Based, and Hybrid (NxCode)](https://www.nxcode.io/resources/news/saas-pricing-strategy-guide-2026)
- [Net Revenue Retention (NRR) Benchmark (Optifai)](https://optif.ai/learn/questions/b2b-saas-net-revenue-retention-benchmark/)
- [Net Revenue Retention 2026 Benchmarks (Levera Partners)](https://www.leverapartners.com/blog/what-is-nrr-in-saas-and-how-to-improve-it-before-a-sale/)
- [SaaS benchmarks for subscription plans (Recurly Research)](https://recurly.com/research/saas-benchmarks-for-subscription-plans/)
- [How to Find The Best Discount For Your Yearly Subscription (InnerTrends)](https://www.innertrends.com/blog/saas-pricing-strategies)
- [How Much Should I Discount For Prepaid SaaS Contracts? (Heap)](https://www.heap.io/blog/how-much-should-i-discount-for-prepaid-saas-contracts)
- [Monthly vs. Annual Contracts: Is It Time To Reconsider Your Annual Plan? (OpenView)](https://openviewpartners.com/blog/monthly-vs-annual-contract-value/)
- [SaaS Free Trial Conversion Rate Benchmarks (First Page Sage)](https://firstpagesage.com/seo-blog/saas-free-trial-conversion-rate-benchmarks/)
- [B2B SaaS Trial Conversion Rate Benchmarks (Powered by Search)](https://www.poweredbysearch.com/learn/b2b-saas-trial-conversion-rate-benchmarks/)
- [SaaS Freemium Conversion Rates: 2026 Report (First Page Sage)](https://firstpagesage.com/seo-blog/saas-freemium-conversion-rates/)
- [What Converts Better: Free Trial or Money Back Guarantee? (Quicksprout)](https://www.quicksprout.com/what-converts-better-free-trial-versus-money-back-guarantee/)
- [Satisfaction Guarantees: 7 of The Best Examples (Drip)](https://www.drip.com/blog/satisfaction-guarantees)
- [Productive vs Scoro vs Noloco: Honest Agency OS Comparison 2026 (Noloco)](https://noloco.io/blog/productive-vs-scoro)
- [Productive.io Pricing & Plans](https://productive.io/pricing/)
- [Scoro Reviews 2026: Pricing, Features (SelectHub)](https://www.selecthub.com/p/psa-software/scoro/)
- [Why Net Revenue Retention Is the Defining SaaS Metric of 2026 (SaaS Mag)](https://www.saasmag.com/net-revenue-retention-defining-saas-metric/)
