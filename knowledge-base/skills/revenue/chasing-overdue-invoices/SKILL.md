---
name: chasing-overdue-invoices
description: The 4-touch collections cadence for chasing overdue invoices on agency retainers. Includes the exact email language for each touch (day 3 / day 14 / day 30 / day 45). Use when an invoice is past due, when drafting collection emails, or when a client appears in the overdue list. Returns the next-touch script tuned to days overdue.
---

# Chasing Overdue Invoices

Most agency owners write each chase email from scratch, badly, when stressed. The 4-touch cadence is the one every collections-trained ops person uses. Codify it.

## The cadence

| Touch | When | Tone | What to send |
|---|---|---|---|
| 1 | Day 3 past due | Friendly nudge | "Quick reminder — did this fall through the cracks?" |
| 2 | Day 14 | Direct + accountable | "We're 14 days past due. What's the next step on your side?" |
| 3 | Day 30 | Formal + decision-forcing | "30 days past due. We need to pause work until this clears or schedule a call." |
| 4 | Day 45 | Escalation | "Final notice before sending to collections / pausing the account." |

## Touch 1 — Day 3 (friendly nudge)

```
Subject: Quick reminder · Invoice #{invoice_number}

Hey {first_name},

Hope you had a good {weekday}. Just flagging that invoice #{invoice_number}
for ${amount} was due {days_overdue} days ago — most likely fell through
the cracks. Could you confirm it's in your AP queue?

Happy to resend the invoice if it got lost — just let me know.

{owner_signature}
```

Notes:
- Always assume good faith on Touch 1. Real clients lose invoices in Slack threads constantly.
- Friday is the best day for Touch 1 (low-stakes context).

## Touch 2 — Day 14 (direct + accountable)

```
Subject: Following up · Invoice #{invoice_number} (14 days past due)

Hey {first_name},

Following up on invoice #{invoice_number} from {invoice_date} — ${amount},
14 days past due now. Couple of possibilities I want to rule out:

1. Did this get caught up in your AP approval workflow?
2. Was there a question about the work that I missed?
3. Do you need it re-sent or attached to a different PO?

Could you let me know which one applies? I want to make this easy on
your end. Standard terms are net-15 on our retainers, so we're already
past where most of our other clients land.

{owner_signature}
```

Notes:
- Specific options force a reply.
- "Standard terms" line is the gentlest accountability — it implies others are paying on time.
- Don't escalate to the controller / accountant unless explicitly asked.

## Touch 3 — Day 30 (formal + decision-forcing)

```
Subject: Action needed · Invoice #{invoice_number} (30 days past due)

{first_name},

We're at 30 days past due on invoice #{invoice_number} (${amount}).
Per our retainer agreement, work continues at our discretion past 30
days — so I want to flag two things:

1. We need to either resolve this invoice this week, OR
2. Pause work on {project_name} until it's cleared.

I'd rather not pause — we have {specific_in_flight_work}. But I also
can't keep accruing hours past 30 days unpaid.

What's the quickest path here? Want to jump on a 10-min call
{day_of_week} to clear it?

{owner_signature}
```

Notes:
- Reference the retainer agreement specifically.
- Name the in-flight work — makes the cost of pausing concrete.
- Offer a call — most disputes resolve on a call, not in email.

## Touch 4 — Day 45 (escalation)

```
Subject: Final notice · Invoice #{invoice_number}

{first_name},

I haven't heard back on the last three touches about invoice
#{invoice_number} (${amount}, now 45 days past due).

Per our retainer agreement, I'm formally pausing work on
{project_name} as of {date} until the balance clears. We'll resume
within 24 hours of payment receipt.

If there's a dispute about the invoice, this is the time to raise
it — happy to walk through the work delivered. Otherwise, please
treat this as the final reminder before we engage a collections
service / file under {state} small claims (which we don't want to
do but will if needed).

{owner_signature}
```

Notes:
- This email exists because some clients only respond to a pause.
- Reference the state — small claims thresholds matter for credibility.
- Never threaten in Touch 1-3. Only Touch 4.

## When to deviate

| Situation | Adjustment |
|---|---|
| Client is in a known crisis (layoffs, M&A) | Skip Touch 2, jump to Touch 3 with crisis-aware language |
| First-ever-late invoice from long-standing client | Touch 1 only, then call directly if no response in 7d |
| Client is an enterprise with formal AP cycle | Touch 1 mention "AP workflow"; cycle may legitimately be 30+ days |
| Multiple invoices overdue | Combine into one consolidated chase, don't send 4 emails |

## What the agent should track

For each chase the customer sends:
- Touch number sent + date
- Reply received?
- Days-to-payment after touch
- Outcome (paid / partial-paid / disputed / wrote-off / fired)

Log to `Agent Action Log` in the Notion Brain so the collections agent can refine cadence based on what works for each customer.

## Cross-references

- `calculating-effective-hourly-rate` — for the "is this client worth chasing?" calculus
- `firing-a-client` — when chase #4 fails
- `projecting-cash-runway` — to surface in the daily briefing if overdue AR is critical
- Source data: Stripe `invoices.list({status: 'open', due_date_lt: <today>})` via Composio

## What NOT to do

- Don't send all 4 touches without a reply in between — give 7+ days between Touch 1 and 2, etc.
- Don't bcc the customer's accountant on Touch 1 — that's escalation, save for Touch 3 if needed.
- Don't write off without trying Touch 3. Most "lost" invoices clear on the formal touch.
- Don't include lawyer language in Touch 1-3. That's Touch 4 only.
