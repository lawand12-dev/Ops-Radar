---
name: using-apollo
description: Diagnose Apollo outbound health for the agency — sequence underperformance, deliverability collapse, list saturation, and the "outbound is dead" panic. Use when the operator asks "why is reply rate dropping", "why are opens crashing", "outbound is broken", "domain reputation", "Apollo sequence performance", "are we burning our domain", or "should I pause sends". Returns the driver + the next conversation with the SDR or sales lead.
---

# Using Apollo

*"Reply rate cratered last week. Are we cooked? Should I pause everything?"*

Outbound is the only function where doing more makes things worse. When Apollo metrics go sideways, the operator's instinct is to push harder. Your job is to find the driver, name it, and recommend the one conversation that fixes it — not to dump every sequence metric on the screen.

## When this triggers

Pull the Apollo lens when any of these fire:

- **Reply rate drops >30%** vs the trailing 30-day baseline on an active sequence
- **Open rate halves** week-over-week on any mailbox (e.g. 50% → 20%)
- **Bounce rate >3%** on a sequence, or >5% on any single mailbox
- **Spam complaint rate >0.1%** anywhere in the workspace
- **Mailbox volume >50 sends/day** sustained for 3+ days
- **Meetings booked / 100 contacts** drops while sends keep climbing (list saturation)
- Operator says "outbound is dead" or "should we pause sends"

## What to do

1. **Identify the driver before saying anything.** Apollo failures cluster into four buckets — name which one, with the number from the source:
   - **Deliverability collapse** → check open rate trend, bounce rate, spam complaint rate per mailbox (Apollo sequence analytics)
   - **List saturation / fatigue** → check contacts-in-flight vs reply rate by ICP segment (Apollo saved lists + sequence analytics)
   - **Copy decay** → check reply rate per touch number; touch-1 collapse means subject line or opener; later-touch collapse means follow-up logic (Apollo sequence step analytics)
   - **Volume / warmup violation** → check sends/day per mailbox vs the 30–50 cap (Apollo mailbox analytics)

2. **Pull per-mailbox numbers, not per-sequence aggregates.** A bad mailbox in a rotation pool drags the whole sequence's metrics. If reply rate is down 40% on the sequence but only one of four mailboxes is collapsed, the recommendation is "pull mailbox X out of the pool," not "rewrite the sequence."

3. **Check bounce rate before recommending any copy change.** Bounce >3% means list quality is broken — no copy change fixes that. Recommend re-running Apollo's list verification on the saved list before touching the sequence.

4. **Match the alert to the threshold.** Use the table below. Don't recommend a fire-drill on a 5pp open-rate dip; don't recommend "keep watching" on a spam complaint spike.

| Signal | Healthy | Watch | Critical |
|---|---|---|---|
| Reply rate (B2B sequence) | >3% | 1.5–3% | <1.5% |
| Open rate (per mailbox) | >40% | 25–40% | <25% |
| Bounce rate | <2% | 2–3% | >3% |
| Spam complaint rate | <0.05% | 0.05–0.1% | >0.1% |
| Sends/day per mailbox | <40 | 40–50 | >50 |

Open rate is noisy (Apple MPP inflation), so weight reply rate higher when the two disagree.

5. **Name one next conversation, not three.** SDRs drown in dashboards. The output is "pause sequence X, verify list Y" or "pull mailbox Z, warm for 7 days" — not a 4-point optimization plan.

6. **Cross-check against the CRM if you have it.** "Reply rate is healthy but meetings booked is zero" means the handoff between Apollo and HubSpot/Pipedrive is broken — surface the "interested" replies older than 7 days with no logged follow-up.

## Conversation script

When briefing the SDR or sales lead:

**Bad:**
> "Apollo metrics are down. Reply rate is 1.2%, opens 22%."

**Good:**
> "Reply rate on the 'SaaS founders' sequence dropped from 3.1% to 1.2% over the last 14 days — but it's isolated to the `agencyhq-mail.com` mailbox. Opens on that mailbox went from 48% to 19%; the other three mailboxes in the pool are flat. Bounce rate is fine (1.8%), so this isn't a list problem — it's a domain reputation hit on one inbox. Recommend: pull that mailbox out of rotation today, run warmup for 7 days before re-adding. The other three mailboxes can carry volume in the meantime. Want me to draft the action card for the SDR?"

Three things this script does:
- **Names the driver** ("isolated to one mailbox") before naming the fix
- **Cites the source per number** ("Apollo mailbox analytics," "bounce rate per mailbox") so the SDR can verify
- **Recommends one action,** not a menu

## What NOT to do

- **Don't surface a sequence-level metric without checking per-mailbox first.** Aggregate reply rates hide which mailbox is bleeding.
- **Don't recommend "rewrite the copy" before checking deliverability.** If opens are collapsing, the copy is irrelevant — the email isn't landing.
- **Don't tell the operator to "increase volume."** Apollo's UI will let them; Gmail will not forgive it. The cap stays at 30–50/mailbox/day regardless of what the dashboard suggests.
- **Don't quote open rate as a primary signal.** Apple Mail Privacy Protection inflates it; reply rate and bounce rate are the real numbers.
- **Don't recommend pausing all sends on a single bad mailbox.** Isolate the bad mailbox, keep the rest of the pool running.

## Cross-references

- `using-hubspot` — for the "interested reply → deal created" handoff check
- `flagging-margin-erosion` — if outbound cost-per-meeting is the driver of margin collapse on an outbound-as-a-service client
- `detecting-scope-creep` — if the agency is running Apollo for a client and sends have ballooned past the retainer scope
