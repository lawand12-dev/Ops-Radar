---
name: serving-recruiting-agencies
description: ICP calibration for when the customer is a recruiting / staffing / executive-search agency. Tells the COO agent which KPIs to lead with (time-to-fill, placement fee structure, pipeline velocity, repeat-client rate), which alerts to elevate, and which marketing-agency defaults to suppress. Use when the customer profile is "recruiting agency", when the user mentions sourcing / candidates / placements / contingent vs retained / ATS, or when you need to pick between competing dashboards for a recruiting-type customer. Triggers: "recruiting agency context", "staffing firm priorities", "executive search KPIs", "agency type calibration", "what matters for a recruiter".
---

# Serving Recruiting Agencies

*Am I about to brief a recruiting-firm owner on retainer margin trends when the actual fire is that their average time-to-fill has crept three weeks past the cohort norm and two contingent clients have gone silent?*

Recruiting agencies do not operate like marketing agencies. The revenue model is event-driven (placements, not monthly retainers), the pipeline is two-sided (candidates AND clients), and the dominant operational risk is throughput — how fast a req moves from open to filled and how predictably that motion repeats. The default OpsRadar surfaces are calibrated for marketing retainers. For this customer type, you re-rank everything.

## When this triggers

Use this calibration when ANY of these are true for the customer:

- Self-described as recruiting, staffing, executive search, RPO, or talent agency
- Connected tools skew to an ATS (Eploy, Bullhorn, Greenhouse, Lever, Workable, JobAdder) plus LinkedIn / Apollo for sourcing — research-22 names Eploy as the market leader
- The owner asks about time-to-fill, placement fees, candidate pipeline, contingent vs retained, or "client drought"
- Revenue mix is dominated by per-placement fees (contingent) or upfront-then-milestone fees (retained search), not monthly recurring retainers

Do NOT use this calibration for: marketing agencies, dev shops, full-service consultancies. Defer to their own type skills.

## What to do

### KPIs to surface first (on `/dashboard`, in briefings, in COO answers)

In priority order:

1. **Time-to-fill per open req** — the throughput metric the owner is actually measured on. Research-22 notes AI screening cuts this materially in high-volume sectors. Surface days-open and trend vs the agency's own baseline; do not import the research benchmark as a prediction.
2. **Placement fee structure mix** — contingent vs retained vs hourly-markup (staff aug). The mix dictates cash-flow risk: contingent firms eat the cost of unfilled reqs; retained firms collect upfront. Lead with the mix shift, not the absolute number.
3. **Candidate pipeline velocity** — stage conversion from sourced → screened → submitted → interviewed → offer → placed. A clog at any stage is the leading indicator the owner cannot see by feel.
4. **Repeat-client rate / share of revenue from existing clients** — the closest analogue to "retention" in this model. Research-22 (fact 10) frames referrals + AI as the growth drivers; repeat business is the cheapest form.
5. **Open reqs vs active sourcers (capacity ratio)** — the recruiting equivalent of utilization. Surface when reqs-per-recruiter drifts outside the agency's own historical band.

### KPIs to deprioritize (don't lead with these)

- **MRR / churn / LTV** — the marketing-agency defaults. Most recruiting firms do not run on recurring revenue and these will read as noise. Show them only if the customer has a retainer or RPO line.
- **Per-client gross margin trend** — still useful, but secondary. In recruiting, margin per *placement* matters more than margin per *client*, because clients are intermittent buyers, not subscribers.
- **Vanity sourcing volume** — total candidates sourced or InMails sent without a submission-rate denominator. The volume crisis (research-22, fact 3) means raw counts are misleading.

### Alerts to elevate

- `time_to_fill_drift` — when avg days-to-fill exceeds the agency's own 90-day baseline by a meaningful margin (let the agency configure the threshold; do not hardcode the 40-50% number from research-22).
- `silent_client` — when a previously-active contingent client has not opened a new req in their typical interval. Research-22 (fact 14) flags the "client drought" — supply-demand inversion makes client retention the new scarce resource.
- `req_pipeline_clog` — when one stage in the candidate funnel is holding submissions disproportionately long vs the agency's baseline.
- `placement_at_risk` — when a candidate in late-stage (offer / start) has signals of drop-off (no recent communication, counter-offer indicators in the CRM).
- `repeat_client_decline` — when share of revenue from repeat clients drops below the trailing baseline.

### Alerts to defer

- Scope creep alerts as defined for marketing agencies (logged hours vs retainer budget). Not a meaningful concept for contingent recruiting — there is no retainer to creep against. For retained search firms, you can repurpose this against the milestone schedule.
- Content velocity alerts. Not the operating model.
- Tool-cost alerts on the ATS itself — research-22 (fact 4) notes Eploy and peers are core infrastructure, not optional stack bloat.

## Conversation script

When you first detect the customer is a recruiting agency, calibrate with the founder:

> "I see you're running a recruiting agency — connected [their ATS] + Stripe + LinkedIn. Before I start surfacing things, three calibration questions:
>
> 1. What's your **fee structure mix** — mostly contingent (paid on placement), retained (paid upfront + milestones), hourly markup (staff aug), or a blend? This decides whether I lead with time-to-fill or with milestone billing health.
> 2. Are you a **generalist** or specialized in one vertical / function? Specialists have very different repeat-client patterns and I'll set the baselines accordingly.
> 3. Do you want me to also track **your clients' hiring metrics** (their open-req aging, offer-accept rate) or only **your agency's own** pipeline? Some recruiters operate as embedded TA partners (research-22, fact 5 — TA Ops layer) and want both views."

Then, in the first briefing:

> "Calibrated for a recruiting agency. I'm leading with time-to-fill, pipeline-stage velocity, and repeat-client share — not retainer margins or campaign metrics. If you want different defaults, tell me in `__how_we_work` and I'll defer."

This is the same `__how_we_work` deferral pattern the brain schema uses (`notion-brain-schema`). The owner overrides; we comply.

## What NOT to do

- Don't import marketing-agency benchmarks into recruiting briefings. Cohorts must be type-matched (cf. `notion-brain-schema` Risks register — tag by type so cross-month patterns stay clean).
- Don't quote research-22 percentages (84%, 69%, 40-50%, 65%, 3.5-4.5x, 96%, 50%+, 44%, 22%) as predictions or promises for this customer. They are context for *why* a calibration exists, not numbers to anchor the owner on.
- Don't recommend "scale without adding headcount" as if it's a universally desired outcome (research-22, fact 11). Some recruiting owners want to grow the team; ask before pushing the AI-replacement framing.
- Don't over-automate candidate communication without an explicit owner rule. Research-22 (fact 12) flags candidate-experience erosion and bias risk as the #1 operational risk in over-automated recruiting. Any candidate-facing send should route through the approval gate unless the owner has explicitly set the relevant tool policy to Auto.
- Don't surface ATS-vendor comparisons or upsell suggestions. The owner has already chosen their stack; your job is to read it, not to recompose it.
- Don't conflate "open req" with "active engagement". A req can be open and unworked. Look at the last candidate-activity timestamp per req before reporting health.
- Don't ignore the brain. When you flag a recruiting-specific risk, write it to the Notion `Risks` database with `type=recruiting` so the cross-month pattern stays legible (see `notion-brain-schema`).
