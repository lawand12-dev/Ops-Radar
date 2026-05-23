---
name: using-hubspot
description: How to read the customer's HubSpot like a Chief of Staff would — deal lifecycle discipline, contact and company hygiene, sequence performance, and the renewal flow that almost no agency has wired up. Use when the user says "pull pipeline", "why is this deal stuck", "what's my win rate by source", "is my HubSpot sequence working", "stale contact data", "deal stage logic", "renewal at risk", or when an agent needs to interpret HubSpot data before writing an action.
---

# Using HubSpot

*Your customer's CRM says they have $400k of open pipeline. Half of those deals haven't moved in 30 days. The renewal on their biggest retainer is in 47 days and there's no task, no deal, no sequence — and nobody has noticed. What do you tell the owner?*

## When this triggers

- Pipeline summary requests ("pull pipeline", "what's my win rate", "where do deals stall")
- Deal-level questions ("why is this deal stuck", "should I close this lost")
- Contact / company hygiene flags (duplicates, stale records, missing renewal date)
- Sequence performance ("is this sequence working", "open rate is dropping")
- Renewal watch (any retainer deal with contract end inside 90 days)
- Closed Won → delivery handoff latency
- Cron `growth` agent (Mon 10am) and `renewal` agent (Mon 12pm) reading HubSpot

## What to do

### 1. Read the pipeline before you read the dashboard

The owner's Monday view of HubSpot is almost always wrong. Run these checks in order — every one of them maps to a specific field the agent can pull.

**Stage discipline.** Pull all open deals. If the pipeline has more than 8 stages, flag it. [Source: hubspot.md §3, CRM News Today 2026 — "5 to 8 stages, max."] More stages means reps skip them and forecasts become noise.

**Stale deals (the single most useful signal).** For each open deal, compute `now - last_activity_date`. Anything > 14 days without activity in a stage that isn't "Closed Pending" is a follow-up failure. [Source: hubspot.md §8 — "Is my sales team falling behind on follow-up?"]

**Close-date rolls.** Pull deals where the Close Date has been edited 3+ times. These are almost always dead — close them lost with reason "No response" rather than letting them inflate coverage. [Source: hubspot.md §4 — close-date discipline]

**Aspirational amounts.** If Deal Amount > the number in the most recent signed proposal note, flag it. The Amount field is supposed to be commit, not wish. [Source: hubspot.md §3 — "Amount = the number on the signed proposal, not the wish."]

### 2. Win rate by source, not by gut

Group Closed Won + Closed Lost in the trailing 90 days by `Deal Source` (or `Original Source` on the contact — they answer different questions, surface both if available). Compute `Won / (Won + Lost)` per source.

Action thresholds [Source: hubspot.md §8]:
- Source win rate < 15% → flag as "expensive to chase"
- Source win rate > 40% → flag as "double down"

If `Deal Source` is missing or has more than 8 enum values, attribution is impossible. Tell the owner. [Source: hubspot.md §4 — "Use: Inbound (organic), Inbound (paid), Outbound, Referral, Partner, Repeat. Six options. No 'Other.'"]

### 3. Pipeline coverage — use the right formula

Do not use the "3x pipeline coverage" benchmark. The correct rule is:

> **Required coverage ratio = 1 ÷ historical win rate.**

[Source: hubspot.md §7, Outreach.ai + Landbase 2026]

So a 25% win-rate agency needs 4x coverage; a 40% win-rate agency needs 2.5x. Compute coverage against the actual rolling-90-day win rate, never a hard-coded constant.

### 4. Where deals stall — name the stage

Compute average time-in-stage per pipeline stage across all deals (open + won). The stage with the longest dwell time is the bottleneck. Cross-reference with Closed Lost reasons. [Source: hubspot.md §8]

The classic agency pattern: "Proposal Sent" has a 21-day average dwell, and 60% of losses cite "No response." That's a proposal follow-up problem, not a top-of-funnel problem — and the fix is the quote-to-close automation (reminder at 3 days, second at 7, auto-close-lost at 30). [Source: hubspot.md §2]

### 5. Renewal watch — the single biggest miss

For every retainer deal, check the contract-end-date custom property. Surface anything inside 90 days. For each, check:

- Is there a renewal task on the AM? (Should fire 60 days out.) [Source: hubspot.md §2]
- Is there an open renewal deal in the pipeline?
- Is there a Slack alert if no renewal deal exists within 14 days of contract end?

If any of those are missing, queue a `renewal_alert` action. Silent churn — the client just stops paying after month 12 — is the most common HubSpot failure mode. [Source: hubspot.md §2]

### 6. Contact + company hygiene

Pull duplicate count via the built-in **Contacts → Actions → Manage Duplicates** view. [Source: hubspot.md §3, IntegrateIQ 2026]

Threshold: **duplicate contacts < 2% of total**. [Source: hubspot.md §9 — "If not, every report is lying."] Above that, every email, sequence, and renewal flow has a coin-flip chance of hitting the wrong record. Recommend a monthly 30-minute dedup pass assigned to one named owner.

### 7. Sequence performance

If the owner asks about a sequence, pull the open rate and reply rate per step. The pattern that matters: open rate decaying step-over-step is normal; reply rate decaying disproportionately is a copy problem. Most agencies have one welcome email and call it a day — re-engagement and 60-day-renewal sequences are almost always missing entirely. [Source: hubspot.md §1]

### 8. Closed Won → invoice + project latency

When a deal hits Closed Won, two things should happen within hours: invoice sent (HubSpot ↔ Stripe), project created (HubSpot ↔ ClickUp / Asana). [Source: hubspot.md §6]

The COO signal: **latency between Closed Won and Invoice Sent > 48 hours** = either the automation is broken or someone's doing it by hand. Flag it.

## Conversation script — talking to the owner about pipeline health

**Bad:**
> "You have $400k of open pipeline."

**Good:**
> "$400k of open pipeline, but $180k of it hasn't moved in 14+ days — that's the real number. Your win rate by source over the last 90 days: Referral 52%, Outbound 18%, Inbound (organic) 38%. Outbound is below the 'expensive to chase' line. Required coverage at your 35% blended win rate is 2.9x — you're at 2.1x against this quarter's remaining quota. Three deals worth $95k have rolled their close date 3+ times — recommend closing them lost this week so the forecast stops lying. And: Acme's retainer ends in 53 days with no renewal task and no open renewal deal. That's the at-risk one."

The pattern: **named number → named driver → named action.** Never surface a metric without the next move.

## Conversation script — re-engaging a stalled prospect

When proposing an outreach sequence for a deal stuck in "Proposal Sent" > 14 days, draft for the owner to approve:

> "Sent the proposal on [date], no movement since. Three options I can queue:
> 1. **Soft check-in** — short Loom + one-line note, no ask. Best if relationship is warm.
> 2. **Constraint frame** — 'closing the calendar for [month], wanted to flag before I book the slot elsewhere.' Best if the deal had real urgency.
> 3. **Closed-lost-and-revisit** — move to Closed Lost with reason 'No response', queue a 60-day re-engagement sequence. Best if you've already nudged twice.
>
> My recommendation for [Client Name]: option 2 — last activity shows they opened the quote 4 times in the first week, then went silent. That's a budget or stakeholder issue, not disinterest. The constraint frame draws out which one."

## What NOT to do

- **Don't surface pipeline value without surfacing stale-deal value.** A $400k pipeline where $180k is stale is a $220k pipeline. Always state both.
- **Don't recommend "3x pipeline coverage."** Use `1 ÷ win rate`. [Source: hubspot.md §7]
- **Don't propose a new pipeline stage.** The default agency failure mode is 12-stage pipelines. If the owner wants a new stage, ask what objective exit criterion it has — if they can't answer, the stage shouldn't exist. [Source: hubspot.md §3]
- **Don't email a contact without checking for duplicates.** If duplicate rate > 2%, the active record may not be the one you're writing to. [Source: hubspot.md §3]
- **Don't write to HubSpot from a workflow without fetching the property schema first.** `INVALID_PROPERTY` and `VALIDATION_ERROR` failures are silent until the next reporting run. [Source: api-hubspot.md — Common Error Codes]
- **Don't trust contact email as a durable ID.** People change jobs, change emails, get merged. Use the HubSpot record ID for joins. [Source: api-hubspot.md — Integration Anti-Patterns]
- **Don't surface a renewal alert without checking `__how_we_work` first** — the customer may have a rule like "never auto-renew at the same rate." Read the rule, then propose.
- **Don't recommend Marketing Hub Pro to a creative studio.** Referral-heavy books don't need attribution reporting; they need retention workflows. [Source: hubspot.md §9 — creative studio]
- **Don't poll HubSpot for all contacts hourly.** Use updated-at windows. The Search API caps at 5 req/s/token and 200 records/page. [Source: api-hubspot.md — Rate Limits]
