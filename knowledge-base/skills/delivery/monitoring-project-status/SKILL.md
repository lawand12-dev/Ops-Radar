---
name: monitoring-project-status
description: Monitors project delivery health — milestones met vs slipped, due-date drift, blocker pile-up, and owner responsiveness. Produces the "this project is slipping" alert with a named threshold and a recovery script the owner can run on a status call or escalation. Use when answering "is this project on track", "project status", "what's slipping", or "milestone health", and when drafting the delivery agent's weekly readout.
---

# Monitoring Project Status

*Is this project actually on track, or are we three weeks from a fire drill the client hasn't noticed yet?*

Owners hear "we're good" in every standup and then watch a project miss its launch window. Your job is to read the signals the team is too close to see, name the slip while it's still recoverable, and hand the owner the words for the call.

## When this triggers

A project earns a `delivery_slip` alert when **2 or more** of these are true for the same project in the same week:

1. **Milestone slip** — a milestone with a committed date has moved out, or its due date is now in the past with status not "Done".
2. **Date drift** — the project's current end date has moved later than the originally-committed end date by more than one week, in any direction other than a formal client-approved scope change.
3. **Blocker pile-up** — 2 or more open tasks tagged "blocked" / "waiting on client" / "waiting on input" with no movement for 5+ business days.
4. **Owner silence** — the named project owner (agency-side or client-side) has not posted, commented, or moved a task in the project workspace for 7+ business days during an active phase.
5. **Hours starvation** — logged hours this week are below 30% of the rolling 4-week average while the project is still in an active phase. Either work stopped or it moved off-system.

One signal is noise. Two is a pattern the owner should hear about this week.

## What to do

When the alert fires, draft the action card with **all four** of these:

| Piece | What it answers |
|---|---|
| Named signals | Which 2+ rules above tripped, with the specific milestone / task / date / hours number |
| The likely driver | One of: client-side blocker, internal capacity, undisclosed scope shift, owner disengagement, dependency on a third party |
| The recommended next move | Status-call open OR escalation — see the two scripts below |
| The fallback if ignored | What the next worse state looks like (missed launch, refund risk, churn signal) — so the owner feels the cost of not running the call |

Never surface a slip without a driver. "The project is slipping" with no cause is unactionable. "The project is slipping because the client-side approver hasn't reviewed the staging build in 9 days" is a script the owner can run today.

## Conversation script

There are two scripts depending on whether the silence is fixable on a call or needs an escalation.

### Status-call open (signals 1–3 tripped, owner is still engaged)

Use when the slip is internal-friction or normal blockers — recoverable inside a 20-minute call.

> "Before we go through the standing items, I want to flag something. [Milestone X] was committed to [date] and has moved to [new date], and we have [N] tasks tagged blocked for more than a week — [name 2]. I want to make sure we're aligned on three things: (1) is [date X] still the real target, or has it shifted in your mind too? (2) what's the actual blocker on [task] — input from your side, dependency, or capacity on ours? (3) if we don't unblock this week, what does the launch window look like? Want to spend the next ten minutes on this and push the standing items?"

Three explicit asks, no blame, no hedging. The owner runs this — not the PM — because the PM is too inside the project to hear the answer cleanly.

### Escalation when blocked (signals 4–5 tripped, owner has gone quiet)

Use when the named owner has stopped responding and the project is drifting because no one is steering. This is a written escalation up one level, not a status call.

> "I want to flag something on [project] before it becomes a delivery problem. [Owner] has been the primary point of contact, and we haven't had a substantive response on [specific question / blocker] since [date — N business days]. Two milestones are now past their committed date — [milestone A] and [milestone B]. Our team is paused on [specific task] until we hear back. I'm raising this to you because we have two paths from here: (1) you re-engage [owner] this week and we resume the original timeline, (2) you reassign the owner on your side and we recalibrate the dates together. Either works for us. What I can't do is keep burning team hours on a project that's drifting without a steer. Can we talk in the next two business days?"

The escalation has to name the cost ("burning team hours") and offer two paths so it doesn't read as a complaint. The two-business-day deadline is what converts the escalation from a vent into a forcing function.

## What NOT to do

- Don't surface a slip alert without naming the specific milestone, task, or date — vague slip alerts get ignored.
- Don't recommend an escalation on the first week of silence — wait for the second signal to trip before going up a level.
- Don't draft the script for the PM to deliver — these conversations are owner-to-owner; the PM is too close.
- Don't mix scope creep into a delivery slip alert — if scope is the real driver, route to `detecting-scope-creep` instead.
- Don't pull "the project is on fire" framing — every slip is recoverable until it isn't, and panic language burns trust with the owner before the conversation even starts.
- Don't surface the alert in the next briefing if the project owner has already acknowledged it this week — repeated alerts on the same condition train owners to mute the agent.
