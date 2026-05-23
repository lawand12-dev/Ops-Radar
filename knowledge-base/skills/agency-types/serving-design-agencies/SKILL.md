---
name: serving-design-agencies
description: ICP calibration for when the customer is a design or creative agency (brand, identity, UX/UI, product design, motion, illustration). Tells the COO agent which KPIs to surface first, which alerts to elevate, and which conversations to defer. Use when the customer profile is "design agency" or "creative studio", when the user mentions fixed-fee proposals / revision rounds / concept presentations / Figma / Midjourney, or when you need to pick between competing dashboards/alerts for a project-based agency. Triggers: "design agency context", "creative studio priorities", "project-based agency", "fixed-fee proposal margin", "revision round scope creep", "agency type calibration".
---

# Serving Design & Creative Agencies

*Am I about to surface retainer-shaped metrics to an owner whose revenue is actually 80% one-off fixed-fee projects, where margin is decided the moment the proposal is signed?*

Design and creative agencies do not operate like marketing agencies. The revenue model is project-based, not retainer-based. Margin is locked at proposal-signing time, not earned monthly. Scope creep does not show up as "extra ad creatives" — it shows up as round 4 of revisions on a logo that was supposed to be done at round 2. And the client's expectations were shaped the moment they saw your first concept board, before any "scope" was formally agreed.

The 2025-2026 design agency is also being repositioned by AI: clients arrive with Midjourney prototypes and expect agencies to be **strategic partners for optimization and scale**, not pure creators (research-23, fact 6). Agencies that lean into that get 40% budget hikes; pure-creative shops that don't are the disappearing type. Echo this back to the owner.

## When this triggers

Use this calibration when ANY of these are true for the customer:

- Self-described as design, creative, brand, identity, UX, UI, product-design, motion, illustration, or creative studio
- Connected tools skew to Figma / Adobe / Midjourney / Notion / monday.com / Miro / ClickUp (the design-stack pattern from research-23, facts 3 + 9)
- The owner talks in terms of **projects**, **proposals**, **concepts**, **revision rounds**, **brand deliverables**, or **studio hours** — not campaigns, MRR, or pipelines
- Revenue mix is mostly fixed-fee project work or milestone billing (vs monthly recurring retainers)
- Team composition is designer-heavy with a small PM / studio manager layer

Do NOT use this calibration for: marketing agencies (defer to `serving-marketing-agencies`), recruiting agencies (defer to `serving-recruiting-agencies`), dev shops, or full-service consultancies. Project-based revenue and revision-round scope creep are the load-bearing signals — if those don't hold, this is the wrong skill.

## What to do

### KPIs to surface first (on `/dashboard`, in briefings, in COO answers)

In priority order:

1. **Project-level realized margin vs proposal margin** — the single most-actionable design-studio number. The proposal said this brand identity was a $40k / 120-hour job at 45% margin. Where are we actually landing? This is the design-agency equivalent of the marketing-agency margin trend, but it resets per project, not per month. See `flagging-margin-erosion`.
2. **Effective hourly rate per project** (logged hours vs fixed fee) — names whether a proposal was structurally underpriced, or whether the team is just burning concepts to please a difficult client. Critical because admin and rework eat **57% of creative team time** (research-23, fact 8) and that leak is invisible without this number.
3. **Revision rounds vs proposal allowance** — the design-agency form of scope creep. If the proposal said "2 rounds of revisions included" and the team is on round 4, that's the alert. Hours alone don't catch this — concept rework is high-cost-per-hour and the client thinks they're still inside scope.
4. **Active project portfolio: count, stage, total committed hours vs team capacity** — designers and creative directors are a hard bottleneck. Capacity-driven, not pipeline-driven.
5. **Proposal pipeline + close rate by project size** — design studios live or die on the next proposal landing. Surface this from CRM (HubSpot / Pipedrive / Notion) and split by project size, because a 3-month brand engagement and a $5k logo are different businesses inside the same studio.

### KPIs to deprioritize (don't lead with these)

- **MRR / churn / LTV** as primary metrics — relevant for the 10-20% of design studios with productized subscription offerings (Design-as-a-Service), but for the rest these are mostly noise. Surface them only if retainer revenue is > 30% of mix.
- **Ad campaign metrics or marketing funnel data** — even if the studio connected HubSpot, they likely use it for proposal tracking and client comms, not as a marketing-funnel system. Don't pull marketing-funnel widgets for them.
- **Hours-per-week utilization in absolute** — design work has natural concept-then-execution rhythm. A senior designer at 60% billable is not necessarily a problem; a 90% billable designer might be drowning in rework. Use realized margin per project as the truth, not raw utilization.

### Alerts to elevate

- `proposal_margin_erosion` — logged project hours have crossed 70% of proposal-allocated hours while project status is < 70% complete. Top of the briefing.
- `revision_round_overrun` — revision count has exceeded what the proposal allowed. This is the design-agency `scope_creep` alert. Next.
- `concept_phase_stall` — a project has been in "concept" or "discovery" stage for > 2x the average for that project type. Concept phase is where margin dies silently. Next.
- `client_ai_prototype_arrived` (when detectable from comms / Notion / briefs) — flag it as an opportunity, not a threat. Research-23 (fact 6) says this is the **40% budget hike** moment if the studio repositions as strategic partner. Surface the talking points from `__playbooks` if the customer has them.
- `proposal_pipeline_thin` — dollarized open proposals < 1.5x the trailing 90-day revenue. Studios feel the gap 60 days before the cash gap, so warn early.

### Alerts to defer

- Generic team utilization spikes — design teams crunch around concept presentations and major deliveries. Don't cry wolf during a known launch week.
- Tool-cost alerts unless the stack growth is unusual. Design studios legitimately stack tools (Figma + Adobe CC + Midjourney + Notion + Miro + monday.com — research-23, facts 3 + 9 list at least six core ones).
- Late invoice alerts during the **active project window** unless they're > 45 days overdue. Project clients pay on milestones, not net-30; the cadence is bumpier and slower than retainer collections.

## Conversation script

When you first detect the customer is a design / creative studio, calibrate with the founder:

> "I see you're running a design studio — connected Figma + Stripe + [their PM tool]. Before I start surfacing things, three calibration questions:
>
> 1. Is most of your revenue **project-based** (fixed-fee proposals, milestone billing) or **retainer-based** (monthly recurring)? This decides whether I report per-project realized margin or per-client monthly margin trend.
> 2. How many **revision rounds** do your proposals typically include? I'll use that as the line for the scope-creep alert. If your proposals are vague on revisions, I'll flag that as a structural risk separately.
> 3. Are you seeing clients **arrive with AI-generated prototypes** (Midjourney boards, ChatGPT brand briefs)? If yes, I'll set up the briefing to track those as repositioning opportunities, not threats — the studios that lean into being the strategic optimizer are seeing 40% budget hikes (research-23). I'll surface that talking point in your briefings."

Then, in the first briefing:

> "Calibrated for a design studio. I'm leading with realized project margin, revision-round status, and proposal pipeline — not MRR or campaign metrics. If you want me to also track team utilization or per-designer billable %, tell me in `__how_we_work` and I'll add it."

This is the same `__how_we_work` deferral pattern the brain schema uses (`notion-brain-schema`). The owner overrides; we comply.

## What NOT to do

- **Don't apply marketing-agency margin logic to project work.** A marketing retainer at 25% margin month-over-month is a clear alert. A design project at 25% realized margin is not necessarily a problem if the proposal was priced at 25% (e.g. an intentional loss-leader for a flagship brand). Compare to **proposal margin**, not to an absolute threshold.
- **Don't recommend pure-creative service expansion as the answer to slow growth.** Research-23 (fact 6 + fact 10 inferred from the strategic shift) makes the disappearing-studio risk explicit: clients now arrive with AI prototypes and want optimization partners. Push the customer toward **strategic / governance / scale** positioning, not "more concepts faster".
- **Don't surface raw AI-tool adoption stats as recommendations** ("you should be using Figma AI"). Research-23 says 33% use it for assets and 42% use Midjourney for concepts — those are benchmarks for context, not prescriptions. Only surface if the studio specifically asks how peers operate.
- **Don't conflate concept-phase rework with execution-phase scope creep.** They have different fixes. Concept rework = brief / discovery quality issue. Execution rework = client-expectation management issue. Tag them differently in `Risks` (notion-brain-schema).
- **Don't quote the case-study numbers (35%, 78%, 9x, 4 hours/designer/week, 40% budget hike, 57% admin time) as predictions for this customer.** They are benchmarks for context, not promises. The owner will hear the framing if you do this twice.
- **Don't push AI-governance or AI-Ops role recommendations to a < 10-person studio.** Research-23 fact 5 (39% experimenting with agentic AI, 23% scaling) and fact 10 (9x ROI from governance) are real, but governance overhead only pays off at scale. Below ~10 people, the same effect comes from the studio principal making AI-use calls personally.
- **Don't ignore the brain.** When you flag a design-studio-specific risk (revision overrun, concept stall, missed proposal margin), write it to the Notion `Risks` database with the type tagged, so the customer can see the pattern across projects and across quarters (see `notion-brain-schema`). For a studio, the cross-project pattern is the moat — one revision overrun is a fluke, three in a quarter on the same project type is a pricing problem.
