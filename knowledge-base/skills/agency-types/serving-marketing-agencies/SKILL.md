---
name: serving-marketing-agencies
description: ICP calibration for when the customer is a marketing agency (paid media, SEO, social, content). Tells the COO agent which KPIs to surface first, which alerts to elevate, and which conversations to defer. Use when the customer profile is "marketing agency", when the user mentions paid media / SEO / SaaS marketing / content velocity, or when you need to pick between competing dashboards/alerts for an agency-type customer. Triggers: "marketing agency context", "paid media agency", "SEO agency priorities", "agency type calibration", "what KPIs matter for this customer".
---

# Serving Marketing Agencies

*Am I about to surface campaign vanity metrics to an owner whose actual problem is that one retainer is silently subsidizing the other six?*

Marketing agencies sit in two operating worlds at once: a creative/execution world (campaigns, posts, ads, content) and an operating-business world (retainers, margin, utilization, churn). The owner usually obsesses over the first and bleeds out from the second. Your job is to invert that.

The 2025-2026 marketing agency has reframed itself as a "growth partner" judged on outcome KPIs — revenue, CAC, LTV — not vanity metrics (research-21, fact 2). That reframing is what you echo back to the owner. You do not report impressions.

## When this triggers

Use this calibration when ANY of these are true for the customer:

- Self-described as marketing, paid media, SEO, social, content, or SaaS-marketing agency
- Connected tools skew to HubSpot / Marketo / Apollo / Lemlist / Hotjar / Clearbit / Calendly (the SaaS-agency stack from research-24, fact 2)
- The owner asks about CAC, LTV, MRR for their clients, content velocity, ad ROAS, or Share of Voice in AI
- The retainer mix is mostly recurring monthly fees (vs project fees) — characteristic of the SaaS-marketing operating model

Do NOT use this calibration for: dev shops, design studios, full-service consultancies, or product agencies. They have different KPI priorities — defer to their own type skill.

## What to do

### KPIs to surface first (on `/dashboard`, in briefings, in COO answers)

In priority order:

1. **Per-client gross margin trend** — the single most-actionable agency-owner number. Marketing agencies are uniquely exposed to scope creep because campaign work expands invisibly (extra ad creatives, "one more landing page"). See `flagging-margin-erosion`.
2. **Effective hourly rate per client** — names whether a retainer is structurally underpriced or just temporarily over-serviced.
3. **MRR + churn + LTV across the agency's own book** — the SaaS-style retention metrics are what the operating model demands (research-24, facts 1 + 7).
4. **Hours overrun vs retainer budget** — the scope-creep early warning.
5. **Pipeline + funnel velocity** — pulled from HubSpot/Apollo when connected (research-24, fact 2).

### KPIs to deprioritize (don't lead with these)

- Raw impressions, reach, follower counts — the vanity metrics research-21 calls out as the "old model".
- Campaign-level ROI reports without revenue tie-in. If the connected stack can attribute to revenue, do so; if not, say so and stop.
- Keyword rankings without Share-of-Voice-in-AI context (research-21, fact 7).

### Alerts to elevate

- `margin_alert` on a client below 25% gross margin → top of the briefing.
- `scope_creep` when logged hours exceed retainer budget by > 20% → next.
- `churn_risk` on the agency's own client (NPS drop, support escalation, late payment) → next. The Bain math says a 5% retention lift translates to a 25-95% profit increase (research-24, fact 6) — frame it that way.
- `content_velocity_drop` if the agency is content-led and weekly post count drops below their established cadence — research-24, fact 4 notes the 3.5x traffic growth pattern at 16+ posts/month.

### Alerts to defer

- Cron alerts on team utilization spikes during a known campaign launch window. Marketing agencies absorb predictable utilization surges; don't cry wolf.
- Tool-cost alerts unless the stack growth is unusual. Marketing agencies legitimately stack tools (research-24, fact 2 lists 8+ core ones).

## Conversation script

When you first detect the customer is a marketing agency, calibrate with the founder:

> "I see you're running a marketing agency — connected HubSpot + Stripe + [their time tracker]. Before I start surfacing things, two calibration questions:
>
> 1. Is most of your revenue **retainer-based** (monthly recurring) or **project-based** (campaigns billed per engagement)? This changes whether I lead with margin trend or with project-level ROI.
> 2. Do you want me to track **your clients' SaaS metrics** (their MRR/CAC/LTV) or only **your agency's own** P&L? Some marketing agencies operate as fractional growth teams (research-21, fact 13) and want me reporting on both layers."

Then, in the first briefing:

> "Calibrated for a marketing agency. I'm leading with per-client margin, scope creep, and your own retention — not campaign impressions. If you want vanity metrics back in the briefing, tell me in `__how_we_work` and I'll defer."

This is the same `__how_we_work` deferral pattern the brain schema uses (`notion-brain-schema`). The owner overrides; we comply.

## What NOT to do

- Don't surface raw social/ad metrics in the briefing — the owner already sees those in their client-facing dashboards. You exist to surface what they're NOT seeing.
- Don't recommend pure-creative service expansion. Research-21 (fact 10) explicitly flags pure creative shops as the disappearing agency type. If the customer is one, the calibration is to push them toward outcome KPIs, not to optimize their old model.
- Don't compare a SaaS-marketing agency's retention to a traditional campaign agency's. Different operating models, different baselines (research-24, fact 14). Stay within type.
- Don't quote case-study numbers (the 25%, 3.5x, 20-40%, 9x figures in research-24) as predictions for this customer. They're benchmarks for context, not promises.
- Don't ignore the brain. When you flag a marketing-agency-specific risk, write it to the Notion `Risks` database with the type tagged so the customer can see the pattern across months (see `notion-brain-schema`).
- Don't push AI-Ops / Prompt-Ops role recommendations unless the customer has > ~10 people. Research-21 (fact 5) flags this as the emerging role, but it's only relevant at a certain scale.
