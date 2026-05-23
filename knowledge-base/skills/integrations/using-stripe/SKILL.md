---
name: using-stripe
description: How the agent helps you get paid through Stripe — auto-charging retainers, chasing overdue invoices, recovering failed cards, responding to disputes, and tagging revenue so profitability math works. Use when an invoice is overdue, when a subscription payment fails, when a client opens a chargeback, when a retainer is about to renew, or when you need to send the same change order twice without double-billing. Triggers on "chase that invoice", "this client hasn't paid", "card failed", "I got a dispute", "set up the retainer in Stripe", "this invoice is 30 days overdue", "send a payment link", "what's my MRR at risk".
---

# Using Stripe

*"Three clients are past due, one card just failed, and a $12K project invoice got disputed — which fire do I put out first, and what do I actually say?"*

Stripe is the cash rail. The agent's job is to make sure money the client agreed to pay actually arrives — and to never let a silent failure cost you a retainer.

## When this triggers

- An invoice crosses its due date in `open` status
- A subscription payment lands in `past_due` after Smart Retries exhausts
- A dispute fires on a charge above ~$2K
- A retainer client is still on manual `send_invoice` collection after 5+ months
- A draft invoice has sat un-finalized for more than 7 days
- A client pays partial on a wire and the remainder is ambiguous
- Owner asks "how much MRR is at risk" or "what's my collection rate"
- A client pays in a non-settlement currency on a card (5%+ in stacked fees)

## What to do

1. **Pull the overdue bucket first.** Query invoices in `open` status past `due_date`. Bucket by 0–30, 31–60, 61–90, 90+ days. B2B professional services run 35–60 day DSO; anything past 60 needs a human call, not another email [Source: Stuut DSO benchmarks 2026; Beancount DSO guide].

2. **Triage by dollar and age, not by alphabet.** A $4K retainer silently failing for 90 days is the emergency. A $400 overage at 35 days waits until tomorrow's batch. Sort the chase list by `(amount_due × days_overdue)` descending.

3. **Migrate the chase target to auto-charge before the next cycle.** Manual `send_invoice` collection adds 14–28 days to DSO. If the client paid late twice in the trailing 90 days, the next-touch script asks for a card or ACH and flips `collection_method: 'charge_automatically'`.

4. **Stop the bleed on failed cards.** Stripe Smart Retries recovers ~25–35% on its own; layering email dunning moves it to 70–85% [Source: Redux Payments analysis; Dev.to dunning best practices]. Confirm the dunning ladder is set: reminder 3 days before due, 1 day overdue, 7 days overdue. Route 30+ days past due to a human; pause subscription at 60 days; cancel at 90.

5. **Use ACH for any invoice above ~$670.** ACH costs 0.8% capped at $5; cards cost 2.9% + 30¢ [Source: Stripe pricing breakdown 2026]. On a $5K invoice you save ~$140 every cycle. Above $2K, push to ACH or wire — both are pull-only and effectively non-disputable, which kills the chargeback risk on large invoices.

6. **Respond to disputes inside Stripe's evidence window.** Disputes have hard deadlines and a $15 fee that's refunded only if you win. Pull the SOW, the deliverables log, the email approval, and the time-tracker export, then submit through the dispute object. Don't argue with the client first — Stripe doesn't see the conversation, it sees the evidence.

7. **Pass an idempotency key on every retry.** One key per business action, not per attempt. Re-sending the same charge without a key on a flaky network is how the agent accidentally double-bills a client. Stripe retries the same key safely; a new key creates a new charge.

8. **Refunds aren't instant.** A refund can fail after creation (issuer-side reversal) — don't confirm "refunded" to the client until the refund object's `status` flips to `succeeded`. Treat the create call as a request, not a receipt.

9. **Tag every invoice with metadata before it's finalized.** Minimum schema: `client_id`, `deal_id`, `service_line`, `billing_type` (retainer / project / overage / deposit), `period_start`. Without these, profitability math (Stripe revenue ÷ Harvest hours by `service_line`) and AR aging by segment are impossible. Stripe allows 50 key/value pairs per object [Source: Stripe metadata docs].

10. **Keep overage out of MRR.** One-off invoices preserve a clean MRR trend; metered subscription items inflate MRR with non-recurring revenue and corrupt the churn read. Overage gets its own invoice with `billing_type: 'overage'`.

11. **Catch drafts that never get sent.** Run a weekly check for invoices in `draft` status older than 7 days and surface the dollar total. Junior staff prep batches, get pulled, and forget; the AR build is silent.

12. **Watch MRR at risk weekly.** Sum the MRR of subscriptions in any of: failed payment retry queue, paused, or `cancel_at_period_end: true`. That's the next 30 days of forecastable churn — pair each one with a save outreach before it drops.

## Conversation script

**First touch — invoice 5–10 days overdue, auto-charge eligible:**

> Hi {first_name} — quick heads-up that invoice {invoice_number} for {amount} (originally due {due_date}) is showing as open on our end. If your card is still good, the fastest path is the portal link below — one click and it's done.
>
> {hosted_invoice_url}
>
> If something's changed on your side (new card, new approver, a question on the line items), reply here and I'll sort it today.

**First touch — failed card on a retainer:**

> Hi {first_name} — the card on file for your {month} retainer just bounced. Stripe will retry automatically over the next few days, but if you'd rather skip the wait, you can update the card here in under a minute: {portal_url}
>
> No service interruption either way — just flagging it before it becomes a thing.

**Escalation — 30+ days overdue, owner-level:**

> Hi {first_name} — circling back on invoice {invoice_number} ({amount}, due {due_date}). I've sent the standard reminders and haven't heard back, so I wanted to reach you directly before this becomes a service question.
>
> Two paths from here:
> 1. If there's a billing issue on your side, point me at the right person and I'll work it with them.
> 2. If there's a delivery question driving the hold, let's get on a 15-minute call this week — {scheduling_link}.
>
> Per our SOW, accounts 60+ days past due pause active work. I'd much rather not get there.

## What NOT to do

- Don't leave retainer clients on manual `send_invoice` past month 3. Migrate to `charge_automatically` or DSO walks away from you.
- Don't retry a failed charge without an idempotency key. One key per business action, reused on every retry.
- Don't ship `card_error` to a retry loop without inspecting the decline code — insufficient funds retries; do-not-honor doesn't.
- Don't put PII or card details in metadata. Stripe policy bans it and metadata is exposed on publishable-key responses [Source: Stripe metadata docs].
- Don't price international card payments at domestic rates. EUR/GBP on a USD Stripe account stacks to ~5.4% + 30¢ — invoice in your settlement currency or build the haircut into pricing [Source: Checkout Page Stripe international fees].
- Don't roll one Stripe Customer across a holding company's sub-brands. Revenue attribution collapses; create one Customer per billing entity with a `parent_account_id` in metadata.
