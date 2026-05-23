---
name: analyzing-retainer-vs-project-mix
description: The diagnostic for whether an agency's revenue mix between retainers (predictable, harder to grow) and projects (lumpy, room to expand) is right for its stage — plus the client-tier patterns (whales, steady, strays) that hide inside that mix. Use when the user asks "is my mix healthy", "should I take more projects", "should I push for retainers", "is my agency too lumpy", or when you're drafting a quarterly briefing on revenue concentration. Returns the stage-appropriate target + the named imbalance + the next-conversation recommendation.
---

# Analyzing Retainer vs Project Mix

Owners look at total revenue. Top-1% fractional COOs look at the *shape* of revenue — what share is recurring, who depends on which client, and whether the mix matches the stage. Your job is to make "your mix is wrong for your stage" impossible to ignore.

## Why mix matters

Retainers reward recurring automation. Projects need milestone controls and clean closure. Agency operations fail when the workflow assumes one operating model while the business sells another. Different contract models need different approval paths, revenue recognition, reporting cadence, and client communication rules — so a mix that's wrong for the stage doesn't just affect the P&L, it breaks how the team operates.

## The stage-appropriate mix targets

Compute as: `retainer_MRR / (retainer_MRR + project_MRR_equivalent)` where project_MRR_equivalent = trailing 3-month project revenue ÷ 3.

| Stage | Total ARR | Healthy retainer share | What to surface if off |
|---|---|---|---|
| Solo / sub-$250k | < $250k | 30–50% | Below 30% → too lumpy; cash gaps coming. Above 50% → growth ceiling; push project work. |
| Small (2–5 people) | $250k–$1M | 50–70% | Below 50% → predictability gap; bias next 2 deals retainer. Above 70% → you've stopped selling expansion; push add-on projects. |
| Mid ($1M–$3M) | $1M–$3M | 60–75% | Below 60% → ops chaos from project ramp; convert top 3 projects to retainer. Above 75% → margin trap (retainers compress over time); take strategic project work. |
| Senior ($3M+) | > $3M | 50–65% | Mix matters less than concentration here. See whale rule below. |

## The client-tier patterns hiding inside the mix

Mix at the agency level can look healthy while one client tier dominates everything. Surface the tier breakdown alongside the mix.

| Tier | Definition | Healthy share of total revenue | What to surface |
|---|---|---|---|
| **Whales** | Single client > 15% of MRR | Max 1 whale; whale share ≤ 25% | If one client > 25% of MRR → concentration risk; recommend diversification plan |
| **Steady** | Retainer + add-on projects, 5–15% of MRR each | 60–80% of total revenue | This is the goal. Most clients should be steady. |
| **Strays** | One-off projects, < 5% of MRR, low repeat probability | < 15% of total revenue | If > 25% → the agency is project-shop, not retainer-shop. Flag if owner wanted retainers. |

Client tiers also define SLA, automation level, approval depth, reporting cadence, and escalation path — so misclassifying a whale as steady (or treating a stray like a retainer client) leaks ops time and creates reconciliation work between AM, finance, and delivery.

## Signals the mix is wrong for the stage

- Cash collected swings > 30% MoM (project-heavy, no retainer floor).
- Owner says "we're not signing retainers fast enough" but the team is at 95% utilization (capacity-blocked, not demand-blocked).
- Finance reconciliation uses contract terms not visible in the PM tool.
- One client's churn would put the agency below breakeven within 60 days (whale concentration).
- AMs ask for "exceptions" that are really tier rules in disguise (the tier model isn't documented).
- Retainer automation keeps running after a project contract has ended (no commercial config record).

## How to present the alert

**Bad:**
> "Your retainer mix is 38%."

**Good:**
> "You're at 38% retainer share for a small-stage agency ($600k ARR) — the healthy band for your stage is 50–70%. The driver is two new project clients in Q1 (Acme rebrand, Beta launch) that pushed lumpy revenue up faster than recurring. Cash collected swung 41% MoM. If the next two deals close as retainers, you'd land at 54% by Q3 — back in band. Recommend: bias the next 2 sales conversations to retainer pricing; I've drafted the framing for the Acme renewal in the action card."

## The drivers — name them every time

When mix is off, ALWAYS name the driver:

1. **Stage transition lag** — agency grew past a stage threshold but mix didn't catch up.
2. **Whale concentration** — one client distorts the whole picture; recompute mix ex-whale.
3. **Stray accumulation** — too many one-off projects from referrals; pricing isn't gating quality.
4. **Retainer compression** — same retainer price for 18+ months while scope grew (see `flagging-margin-erosion`).
5. **Commercial config drift** — clients on the wrong tier; team treating retainer-tier clients like projects or vice versa.
6. **Sales pipeline mismatch** — pipeline is 80% projects but owner is selling "we do retainers" — the lead source is wrong.

Without the driver, the recommendation is useless. The owner can't act on "your mix is off." They can act on "two new project clients pulled you out of band — convert one to retainer at renewal."

## When to recommend a tier reclassification

Reclassify when:
- A "steady" client has had no project add-on in 12 months AND retainer < $5k/mo → drop to stray-equivalent for capacity planning.
- A "stray" client has billed in 3 of last 4 quarters AND total > $30k → promote to steady; offer a retainer.
- A "steady" client crosses 15% of MRR → reclassify as whale and trigger the concentration playbook.

## When to recommend pushing retainers vs projects

**Push retainer conversion when:**
- Retainer share is below the stage's healthy band.
- Top 3 project clients each have 12+ months of repeat work.
- Cash swings MoM > 25%.
- Owner has bandwidth (utilization < 85%) to do retainer-style strategic work.

**Push project expansion when:**
- Retainer share is above the stage's healthy band (growth ceiling).
- Steady clients haven't bought an add-on in 9+ months.
- Blended margin compressing (see `flagging-margin-erosion`).
- Owner is at growth-stage transition (e.g. small → mid) and needs lumpy expansion to fund hires.

## The write contract — what this skill owes the brain

When the agent produces a mix analysis, it MUST:

1. **Append a row to "Agent Action Log"** with: agent name (`profitability` or `revenue`), timestamp, summary, status, value_at_risk (if whale concentration).
2. **Update Clients DB** with the current tier classification (whale / steady / stray) and the operating model (retainer / project / hybrid).
3. **Update Risks (Register)** if whale share > 25% OR retainer share is outside the stage's healthy band for 2+ consecutive quarters.
4. **Add a Pattern card** if the same mix imbalance has been flagged 3+ months running — that's a structural pattern, not a fluctuation.
5. **Never modify customer-owned pages.** If the recommendation touches OKRs or `__how_we_work`, queue an action for approval.

See `notion-brain-schema` for the full schema.

## How the cron agents use this

- **Weekly** (Monday 9am, profitability agent): compute retainer share, tier breakdown, whale concentration. Compare to last quarter. If outside band, queue a `mix_alert` action.
- **Monthly** (1st of month, revenue agent): write Stage + Mix snapshot to KPIs DB. If stage changed (e.g. small → mid), trigger the stage-transition playbook.
- **Quarterly** (briefing agent): include a "Mix vs Stage" section in the quarterly readout with the named driver.

## Cross-references

- `flagging-margin-erosion` — if the mix problem is hiding a margin problem
- `detecting-scope-creep` — if retainer share looks healthy but hours overrun is killing margin
- `firing-a-client` — if a stray client is structurally unprofitable and won't convert
- `raising-retainer-prices` — if retainer compression is the driver
- `notion-brain-schema` — where to write the mix snapshot, tier reclassifications, and risk entries

## What NOT to do

- Don't surface a mix alert without naming the stage AND the driver. "Your mix is off" without context is noise.
- Don't recommend pushing retainers when the team is capacity-blocked — the constraint is hiring, not pipeline.
- Don't reclassify a client tier without checking `__how_we_work` for the customer's own tier definitions first.
- Don't compute mix from open pipeline — only from booked/recognized revenue. Pipeline mix is a separate forward-looking metric.
- Don't surface a whale alert to the client team — the agent only talks to the owner.
- Don't recommend taking on more strays to "diversify" — strays add ops load without predictability. Diversify into steady, not stray.
