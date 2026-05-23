---
name: tracking-team-capacity
description: Reads producer utilization against the Parakeeto 65–80% healthy band and decides when to redistribute workload, stage-gate new clients, or escalate to a hire conversation. Sits between burnout detection (Team Agent) and hiring triggers — catches the "team is maxed but nobody's said it out loud" zone before it turns into burnout or churn. Use when the user asks "are we maxed out", "team utilization", "capacity for a new client", "burnout risk", or when a producer trends >75% billable for 8+ weeks. Returns the reallocation move or the no-script, not a vague "watch capacity".
---

# Tracking Team Capacity

*"We feel slammed but the numbers say we have room — or do we?"*

Capacity isn't a feeling, it's a band. Owners either run the team at 90% and lose a producer to burnout, or run it at 55% and bleed cash. Your job: read the gauge honestly, name who's over the line, and decide what moves *before* the next client closes.

## When this triggers

Fire this skill when 2+ of these are true:

1. **Producer utilization >75% for 8+ consecutive weeks** (Parakeeto's warning band — single-point-of-failure risk)
2. **Producer utilization >85% for 4+ consecutive weeks** (danger band — burnout / quality collapse within 60–90 days)
3. **Any single person >90% for 6+ weeks** (individual burnout territory — workload swap before anything else)
4. **Sold pipeline (signed SOWs not yet started) exceeds 4 weeks of available producer hours**
5. **A new-client deal is about to close and the owner asks "can we take this on"**
6. **PTO denials or rescheduled PTO trending up** (qualitative — usually shows before utilization tips)
7. **Senior producers being pulled onto junior work** because the junior is buried (capacity is masking as seniority drift)

Single signal = noise. Two together = run the skill. Three = the conversation is overdue.

## What to do

Step 1: **Separate the two utilization numbers.** Never blend them.

| Number | Healthy band | Source |
|---|---|---|
| Producer utilization (designers / devs / strategists only) | 65–80% weekly, 65–80% annual | Parakeeto |
| Whole-agency net utilization (includes AMs/PMs/ops) | 50–60% annual | Parakeeto, tmetric 2025 |

If the owner is reporting whole-agency utilization (50–60%) and feeling fine, but producers are at 82%, the team is in the warning band — they just haven't seen it yet.

Step 2: **Locate the team on the band gauge.**

| Band | Reading | Move |
|---|---|---|
| Under 60% | Revenue problem | Don't hire. Sales push. Possibly let attrition rebalance. |
| 60–75% | Healthy | Hold. Use slack for training, retros, internal tooling. |
| 75–85% | Warning | Start recruiting now. Tighten estimates. Decline misfit work. |
| 85%+ | Danger | Stop selling capacity-heavy work. Pull contractors this week. Reset client dates honestly. |

Step 3: **Reallocate before you hire.** Three moves in order — exhaust each before going to the next:

1. **Swap workload off the 90%+ person.** Move their lowest-margin or lowest-priority work to a producer running <70%. Buys 4–6 weeks.
2. **Pause the bottom-quartile client by margin.** If you have a client running at sub-floor effective hourly rate (see `calculating-effective-hourly-rate`), their work is the first to scope-narrow or sunset. Buys 8–12 weeks.
3. **Stage-gate the next new client.** If a deal is closing and the team is in the warning band already, push start date 6–8 weeks out (script below). Buys the contractor or hire window.

Step 4: **Run the 90-day coupling math** before recommending a hire.

```
Required new producer hours (next 90 days) =
  (weighted pipeline $ × historical win rate) ÷ blended billing rate

Available producer hours (next 90 days) =
  (producers × 40 hrs × 12 weeks × 75% target) − already-booked hours
```

If required > available, the gap is real. Hand off to `calculating-hiring-triggers` for the role spec and cost math. Don't hire on optimistic win rate — use trailing-12-month actual.

Step 5: **Surface the underused.** If 1–2 producers are sitting at <55% while others are at 88%, the capacity problem is a *distribution* problem, not a headcount problem. Name the underused person privately to the owner, then propose work to shift their way.

## Conversation script

**Talking to a producer trending toward burnout** (when one person is >90% for 6+ weeks):

> "I want to flag something I'm seeing before it becomes a problem. You've been running at [X]% billable for [N] weeks — that's well above the band we try to keep you in. I'm not asking how you feel about it because that's not the right question. I'm telling you we're going to move [specific project / specific client] off your plate this week, and I'd rather you push back on which one to move than carry it. What's the work you'd hand off first if you could?"

Why this works: it doesn't ask permission to be considerate. It names the number, takes the decision off their shoulders, and gives them one narrow choice. Karl Sakas frames the principle as *"can we accomplish this work well without requiring heroic efforts?"* — if the answer is no, the owner moves work, not the producer.

**Pausing new-client onboarding when the team is already maxed:**

> "Thanks for confirming you want to move forward. I want to be straight with you about timing. Looking honestly at our delivery calendar, we don't have the right team available to start this work properly before [date 6–8 weeks out]. If a [Month] kickoff works, I'd love to scope it properly now and hold the slot. If you need sooner, I'd rather tell you up front than over-promise and miss — happy to suggest someone strong if that's the case."

Why this works: it's specific ("our delivery calendar", a named date), it offers a path (later start OR referral), and it doesn't invent a story. Parakeeto and Sakas both converge on the same rule: *never decline without offering a path.* A bare no damages the brand; a no with a path strengthens it.

## What NOT to do

- **Don't blend producer utilization and whole-agency utilization** in the same report. They're different numbers measuring different things — confusing them is how owners end up thinking they're underutilized while producers are already in the red. (Parakeeto)
- **Don't recommend a hire on a single warning-band week.** Wait for 8+ consecutive weeks at >75% before triggering the hire conversation. One bad week is noise.
- **Don't recommend hiring before checking redistribution.** Most "we need to hire" moments are actually "we need to move work off Sarah." Exhaust reallocation first — it's free and fast.
- **Don't hire on optimistic pipeline.** Use trailing-12-month actual win rate, not the hopeful rate. Karl Sakas: hiring against a $400K weighted pipeline assuming 50% win rate when you actually win 30% leaves you with a $125K/yr commitment and 6 months of cash pain.
- **Don't surface burnout risk to the producer in a group setting.** This is a private 1:1 conversation, not a stand-up agenda item.
- **Don't take on the new client to "stretch the team."** Karl Sakas: *"If it would take late nights or cut corners elsewhere, we'll pause or refer it out."* Stretching past 85% is how you lose two producers to a competitor in Q+1.
- **Don't generalize.** Never say "the team is busy." Always name the producer, the percentage, the weeks, and the specific work that needs to move.

## Cross-references

- `calculating-hiring-triggers` — when redistribution isn't enough and the hire spec is needed
- `calculating-effective-hourly-rate` — the supporting number for "which client to pause first"
- `flagging-margin-erosion` — sometimes the right answer is repricing the bottom-quartile client, not hiring
- `detecting-scope-creep` — scope creep is a hidden capacity tax; surface it before recommending headcount
- Source data: Harvest / Toggl via Composio, HubSpot / Pipedrive for weighted pipeline
