---
name: using-calendly
description: How to read Calendly the way a fractional COO reads it — booking conversion drops, no-show rate creep, founder calendar overload, and the empty-calendar signal that predicts a revenue gap two weeks out. Use when the user asks "why are bookings dropping", "what's my no-show rate", "the founder calendar is full", "next week is empty", "is sales softening", or you need to write a calendar-driven risk or action into the brain.
---

# Using Calendly

*"Why does next week look empty when last week was full?"*

Calendly is the early-warning system for revenue. By the time MRR drops, the calendar has already been thin for two weeks. Your job is to read the calendar before the bank account reads it back.

## When this triggers

Surface a Calendly-driven signal when any of these are true:

| Signal | Threshold | Source |
|---|---|---|
| Weekly bookings down | WoW drop > 25% on inbound discovery event type | `meetings-list_events` filter by event_type + date range |
| No-show rate creep | Inbound > 10% over trailing 14 days, or outbound > 40% | `meetings-list_event_invitees` + `status` field |
| Founder calendar overload | > 18 booked hours/week on a single host | `meetings-list_events` grouped by host URI |
| Empty calendar ahead | < 2 booked discovery slots in next 10 business days | `meetings-list_events` with future date range |
| Time-to-first-slot blown | First available slot > 48h on public booking URL | `event_types-list_event_type_available_times` |
| Reschedule rate spike | > 20% of bookings rescheduled in trailing 30 days | `meetings-list_event_invitees` `rescheduled` flag |

## What to do

For each signal, follow the same shape: ground in the host account, pull the number, name the driver, write to the brain.

1. **Ground the host.** Call `users-get_current_user` to resolve host URI + timezone before any availability or booking math. Skip this and you'll mis-window every WoW comparison.
2. **Pull the count + the comparison.** Booking volume is meaningless without a baseline. Always fetch trailing 14 days vs prior 14 days from `meetings-list_events`, grouped by event_type URI.
3. **Name the driver.** Bookings don't drop for "no reason." The driver is one of: marketing-source mix shift (UTM check), Routing Form too strict, AE calendar blocked, public booking window capped too tight, or upstream traffic drop. Without the driver, the brief is useless.
4. **Write to the brain.** Append a row to `Agent Action Log` (database #10) with the agent name + summary. For empty-calendar or no-show-creep severity, also write a row to `Risks` (database #9) tagged with the affected client or "Pipeline."
5. **Queue an action, don't act.** Calendly writes (cancel, reschedule, share link) go through the approval gate. The agent proposes a `composio_action`; the owner approves.

## Conversation script

### Empty-calendar signal (founder briefing)

**Bad:**
> "Your calendar has 2 calls next week."

**Good:**
> "Next week has 2 booked discovery calls — down from 7 the week prior and 6 the week before that. The drop is concentrated on the public 20-minute event type; the Routing-Form-gated demo slot is unchanged. UTM source breakdown shows the LinkedIn campaign stopped delivering bookings on Wed — that single source drove 4 of last week's 7. Recommend: check whether the LinkedIn ad budget paused or the landing page changed. I've drafted an action card to ask the marketing lead."

### No-show rate creep (team capacity convo)

**Bad:**
> "Your no-show rate is high."

**Good:**
> "Inbound no-show rate is at 14% trailing 14 days, up from 6% the prior period. The lift is concentrated on one rep (Sasha) and one event type (45-min demo). Two drivers I can see: reminders are off on Sasha's event type (the standard agency template has email + SMS), and the demo is booked 7+ business days out on average. Recommend: turn on Sasha's reminders, cap that event type to a 5-day booking window. Action card drafted."

### Founder calendar overload (delegation convo)

**Bad:**
> "You have too many meetings."

**Good:**
> "You took 22 hours of meetings last week — 11 discovery calls, 6 client check-ins, 5 internal. The 11 discovery calls is the load that compounds. You have two AEs with under 6 hours each. Recommend: switch the public discovery link to a round-robin, weighted 60/30/10 (you/AE-1/AE-2) for the next two weeks. This frees ~6 hours of your time without changing show rate. Want me to queue the round-robin config change?"

### Follow-up to no-shows

When a no-show is marked, the agent proposes a single follow-up — not a sequence:

> "Sasha just marked the 11:00 AM Acme call as a no-show. Last touch was the SMS reminder at 10:00 AM. Recommend a single re-book email with a fresh booking link (not the original) and a 2-sentence note. I've drafted it — approve to send via Gmail."

## What NOT to do

- Don't surface a bookings drop without a named driver. "Bookings are down" is not actionable; "the LinkedIn source stopped delivering on Wed" is.
- Don't compute no-show rate over a short window. Trailing 14 days minimum, otherwise one bad day skews everything.
- Don't show the user a Calendly `api.calendly.com` URI. Those are internal identifiers — only ever paste `scheduling_url` or `booking_url`.
- Don't recommend a price raise or a fire based on calendar load alone. Pair with profitability data — see `flagging-margin-erosion`.
- Don't auto-cancel or auto-reschedule meetings. Every Calendly write goes through the approval gate.
- Don't trust no-show counts blindly — Calendly no-shows are manually marked. If the agency never marks them, your number is wrong by default. Flag this gap to the owner before reporting a "show rate."
- Don't recommend opening up the booking window to "fill the calendar." Wider windows correlate with lower intent. The fix for an empty calendar is upstream traffic, not later slots.
