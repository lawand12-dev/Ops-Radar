---
name: onboarding-new-clients
description: The first 30 days set the trajectory for the entire engagement. Most agencies treat onboarding as paperwork — contract, deposit, kickoff, get to work — and pay for it in month-four churn. This skill covers the 24-hour post-signature checklist, the kickoff agenda, the week-by-week milestones through day 30, the soft handoff to the AM, and the early signals that predict whether this client churns at month four. Use when the user says "we just signed X," "kickoff call prep," "new client checklist," "what do I do this week," or "onboarding new client."
---

# Onboarding New Clients

*"We just signed Acme — what do I actually do this week to make sure they don't churn at month four?"*

The honest answer: the first 30 days are not setup. They are the entire relationship in compressed form. Trust, communication norms, scope discipline, escalation paths, and the client's private narrative about whether hiring you was a good idea all get written this month. Get this right and you compound retention for years. Skip it and you spend the next twelve months fighting fires you lit yourself.

## When this triggers

Run this skill when:

- A contract just got countersigned and the deposit has cleared
- The owner says "we just signed [client]" or "kickoff is next week"
- A `deal.stage = Closed-Won` event fires in HubSpot and the customer is in the first 48 hours post-signature
- The owner asks for a kickoff agenda, a welcome email, an intake form, or a 30-day plan
- The owner mentions a new logo and asks "what should we ship first"

Do NOT run this skill for:

- Re-onboarding an existing client after a relationship reset (different playbook — relationship is already loaded with history)
- Onboarding a new internal team member (different skill — `team-onboarding`)
- A client who has been signed for more than ~5 business days and is past the welcome-package window — pivot to `kickoff-recovery` framing instead

## What to do

The four phases. Each one has a single deliverable that closes it; don't move to the next phase until the previous one is closed.

### Phase 1 — Day 0 to Day 2: Welcome (the 48 hours after signature)

The honeymoon window is at maximum brightness right now. Spend it on structure, not on starting work.

- [ ] **Within 24 hours of signature** — Send the welcome email (script below). Not "this week." Within 24 hours. A late welcome email signals you operate loosely and the client subconsciously revises their expectations downward.
- [ ] Attach: countersigned contract, one-page communications plan (response SLAs both ways, weekly status day/time, monthly call, QBR cadence, vacation coverage), pre-filled RACI chart, intake form (10–15 min, focused), restated NDA in plain English.
- [ ] Send three kickoff-call time options for a 60-minute slot within the next 5 business days.
- [ ] Internal: provision the workspace — Slack/Teams channel `#client-[slug]`, shared Drive folder from template, project board (ClickUp/Asana/Linear) from vertical template, shared password vault, CRM record updated.
- [ ] Confirm the AE-to-delivery handoff memo is complete. If sales promised anything (timeline, channel, tool, deliverable) that isn't in the SOW, reconcile it now — not at kickoff in front of the client.
- [ ] Name the early-win deliverable internally. Write it down. It ships by day 14.

**Phase deliverable:** Welcome package received, kickoff scheduled, intake form returned. Do not start substantive work until all three are true.

### Phase 2 — Week 1: Kickoff and discovery

- [ ] Send the kickoff agenda 2–3 business days before the call. Agenda below.
- [ ] Run the kickoff. 60 minutes, no more. If it needs 90, the scope is too big or you're doing discovery you should have done in sales.
- [ ] **Within 24 hours after kickoff** — send the recap email. Bullets only. Decisions, action items with owners and dates, recording link if recorded, and confirmation that the 30-day review is on both calendars.
- [ ] Finalize the RACI with the client's side filled in. Confirm the single decision-maker by name.
- [ ] Kick off credential collection in earnest. Default to least-privilege roles, not Admin/Full Control. Use a tracker (one row per credential) so nothing falls through email.
- [ ] Lock the weekly status email day/time and the monthly review date. Send the calendar invites yourself.

**Phase deliverable:** Recap sent, RACI confirmed, credentials at ≥80% provisioned, weekly cadence on both calendars.

### Phase 3 — Weeks 2 to 3: Early win

This is the most important phase. The client is being asked by their boss or board *what did we get for the money*. If your honest answer at day 14 is "we had a meeting and they're working on strategy," you have lost the early-win window and you are now playing defense for the rest of the engagement.

- [ ] Ship the early-win deliverable by **day 12 at the latest**. Visible, standalone, forwardable, authored by a senior person, useful even if the rest of the engagement vanished.
- [ ] Walk it through on a live call, not email. Clients consistently rate live walkthroughs higher than written deliverables of identical quality.
- [ ] Send the first weekly status email on the agreed day. Outcomes, not tasks. Under 300 words. Traffic-light status at the top.
- [ ] Continue chasing remaining credentials. Anything not in by end of week 2 gets escalated to the client's decision-maker, not to their day-to-day contact.
- [ ] Internal: do a private quality-of-engagement check. Has the client responded to anything within the SLAs they agreed to? Have they missed an intake field, ghosted a meeting, or pushed back on the agreed cadence? Write it down — these are the month-four churn signals.

**Phase deliverable:** Early-win artifact delivered, two weekly status emails sent on time, credentials at 100%.

### Phase 4 — Week 4: 30-day review and soft handoff

- [ ] Send the pre-meeting survey 3 days before the review (4 questions, async).
- [ ] Run the 30-day review. 45 minutes. Video, not email. Decision-maker required.
- [ ] Ask both of the two questions in Conversation script. Then shut up. Count to ten.
- [ ] Document the recalibration in writing within 24 hours — what's changing about scope, cadence, people, or channels, signed off by both sides.
- [ ] Execute the soft handoff to the AM. Until now the founder (or senior strategist) has been the visible face. From day 30 onward the AM owns day-to-day; the senior person stays on monthly calls + QBRs. Telegraph this in the 30-day review with the AM in the room: *"From here, [AM] is your day-to-day. I'm still in the loop and on every monthly review. If anything ever feels off, you have my direct line."*
- [ ] Schedule the 90-day QBR on the calendar before leaving the review.

**Phase deliverable:** Documented 30-day recalibration, AM handoff completed in the client's presence, 90-day QBR booked.

### The month-four churn signals to watch from day 1

Score these privately each week. Two or more red flags by week 4 means escalate to the owner, not the AM.

| Signal | Red flag |
|---|---|
| Intake form completion | Not returned by day 7, or returned half-empty |
| Kickoff attendance | Decision-maker no-shows or sends a delegate |
| Credential turnaround | Still missing key access by end of week 2 |
| Feedback SLA | Approvals breach the agreed window twice in 4 weeks |
| Communication asymmetry | They Slack you daily but ghost the weekly status |
| Scope drift | Out-of-scope asks in week 1 with no acceptance of the change-order process |
| Decision-maker silence | Has not been on a call since kickoff |

## Conversation script

### Day 0 welcome email (verbatim — adjust bracketed fields)

> **Subject:** Welcome to [Agency] — your first steps & kickoff scheduling
>
> Hi [Client first name],
>
> Welcome aboard. We're genuinely glad to be working with you, and the team is excited to get started on [project / engagement].
>
> A few things to handle right away so we hit the ground running:
>
> **1. Your point of contact.** [Strategist name] is your day-to-day lead. Their direct line is [phone] and they're in [Slack/email]. Expect a reply from them within one business day on anything routine, same day for anything urgent.
>
> **2. Your escalation path.** If something ever feels off — pace, quality, communication, anything — and you don't want to raise it with [Strategist] directly, email me personally at [owner email]. I read every one and reply within 24 hours. We'd rather hear about a small concern at week two than a big one at month three.
>
> **3. Attached for your review.**
> - Signed agreement (countersigned copy)
> - Communications plan (response times, weekly cadence, escalation path)
> - Decision-maker chart — please fill in your side and return
> - Onboarding intake form (10 minutes, please complete before kickoff)
> - NDA reminder — both teams are bound; please loop in anyone on your end who'll see our work
>
> **4. Kickoff call.** [Strategist] will send three time options today for a 60-minute kickoff in the next 5 business days. Please bring [decision-maker name] and anyone whose input we need on [topic].
>
> **5. Quick win.** Before our kickoff, we'd like to ship you one thing of immediate value — [specific deliverable]. You'll have it inside 14 days.
>
> Welcome again.
>
> [Owner name]

### 60-minute kickoff agenda (send 2–3 business days ahead)

```
0:00 – 0:05   Introductions and roles — both sides, no exceptions
0:05 – 0:15   Goals and success metrics — confirm the 2–3 KPIs
0:15 – 0:25   Scope, in / out, non-goals — read the not-in-scope list out loud
0:25 – 0:35   Roles, decision-making, approvals — confirm RACI + approval SLA
0:35 – 0:45   Working cadence and tools — weekly status, monthly review, QBR
0:45 – 0:55   Risks, dependencies, the first 30 days — preview the early win
0:55 – 1:00   Next steps + confirm the 30-day review is on the calendar now
```

Surface these working norms explicitly during the call — most agencies skip this and pay for it later:

- **Response times both ways.** "We respond to routine email within one business day. Urgent is text. We need the same from you on approvals — 48 business hours, or we proceed using best judgment and flag it in the next status email."
- **Change-order language.** "New asks come through [Strategist] in writing. Anything that affects scope, fee, or timeline becomes a change order. We never start work on something out-of-scope without your written approval."
- **The escalation invitation.** "We'd rather hear it's not working at week two than at month four. The path to me is the email you already have."

### The two 30-day review questions

Ask them exactly like this, with silence after each. The first answer is rarely the real answer. The real one comes 15 seconds in, after they've stopped being polite.

1. *"If we were starting this engagement over today, what would you want us to do differently?"*
2. *"What's one thing we're doing that's making your life harder?"*

### Soft-handoff language at the 30-day review

> *"[Client], you've been working primarily with me for the first month because I wanted to set the relationship up myself. From here, [AM name] is your day-to-day point of contact — they're already in every working session and they own the weekly. I'm still on every monthly review and the quarterly. If anything ever feels off and you don't want to go through [AM], my line stays open."*

## What NOT to do

- **Don't skip the welcome email** because "we already talked yesterday." The artifact matters. The client forwards it internally and it becomes the operating manual.
- **Don't schedule the kickoff before the deposit has cleared.** That single discipline filters out a meaningful share of bad-fit deals before you sink calendar time into them.
- **Don't do discovery in the kickoff.** Discovery happens in sales. Kickoff is for alignment on what was already discovered.
- **Don't let the kickoff run past 60 minutes.** Anything you can't fit either belongs in a follow-up working session or shouldn't be in scope.
- **Don't send status updates that are task lists.** "We built three landing pages" is a task. "Three landing pages live, 412 visitors, 38 form fills" is an outcome. The client only cares about the second sentence.
- **Don't skip the early win.** A day-14 deliverable is the difference between a client who renews and a client who privately decided in week 3 you weren't worth it.
- **Don't introduce the AM cold.** The soft handoff happens in the client's presence with the senior person framing it. Otherwise it reads as a demotion.
- **Don't skip the 30-day review.** Schedule it during kickoff, before the relationship gets busy. Once it's on the calendar, it happens.
- **Don't talk only to the junior contact.** You lose the relationship with the decision-maker — who is the person who can fire you.
- **Don't absorb the first out-of-scope ask quietly.** Train your team on the line: *"Great idea — let me look at the impact on our current plan and get back to you with the best way to fold it in."* Then send the written change order within 24 hours.
- **Don't run this skill for an existing client.** Re-onboarding has different dynamics — the relationship is already loaded with history and a welcome-style email reads as condescending. Pivot to a relationship-reset framing.
