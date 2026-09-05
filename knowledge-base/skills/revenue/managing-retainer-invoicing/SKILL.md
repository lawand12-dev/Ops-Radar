---
name: managing-retainer-invoicing
description: How the revenue agent thinks about monthly retainer invoicing — flat retainer vs performance-based, the right send date (1st of month vs contract anniversary), what line items every invoice must carry, and how to handle overage hours inside the retainer before they become a billing fight. Use when proposing an invoice draft, answering "when should I send Acme's invoice", drafting overage-charge language, or deciding whether this month's bill is base-only or base + bonus.
---

# Managing Retainer Invoicing

*"Did I bill Acme this month? Was it for the right amount? And do I have to charge them for the 90 extra hours, or do I let it slide again?"*

Retainer invoicing is the operating heartbeat of an agency. Miss a send date and cash slips. Bill the wrong number and trust slips. The agent's job is to be the owner's memory for both — and to make the awkward overage conversation a script, not a confrontation.

## When this triggers

Three different clocks, and the agent must pick the right one per client:

1. **Calendar-month clients (the default).** Invoice generates on the **1st of the month** for that month's service. Send window is 1st–3rd. Net terms run from the send date.
2. **Anniversary clients.** Client signed mid-month and asked to be billed on their start date. Invoice generates on the **contract anniversary day** (e.g. the 17th). Don't let this drift back to the 1st unless the client requests it — anniversary billing is a retention concession you keep honoring.
3. **Performance-based clients.** Invoice generates on the **2nd business day of the month** so the previous month's ad platform / conversion data has finalized. Pulling earlier means restated numbers and disputes.

Within those clocks, the agent also wakes up when:

- Logged hours for a client are tracking above the retainer's hour budget mid-cycle → overage warning, not invoice
- A new client's first invoice falls mid-month → proration question
- The client's currency or tax jurisdiction has changed → re-check before generating
- The previous month's invoice is unpaid → flag before sending the next one, don't stack debt silently

## What to do

### Decide the invoicing model first

| Model | When to use | What the invoice contains |
|---|---|---|
| **Flat retainer** | Fixed monthly fee, hour budget capped at a number | Single line item: "Retainer — {{month}}" at the contract rate |
| **Retainer + overage** | Flat retainer with hourly overage billed when budget exceeded | Two lines: retainer + overage hours × overage rate, with hours itemized |
| **Performance-based** | Base fee + bonus tied to ad spend / conversions / KPI delta | Two lines minimum: base fee, performance bonus (separate for audit clarity) |
| **Pure performance** | Rare. % of ad spend or % of MRR generated, no base | One line referencing the formula + the input value the agent computed |

If the agent is unsure which model applies, check the client row in the Notion `Clients` database — the retainer terms live there. Never invent the model.

### Build the line items the same way every time

Every retainer invoice the agent drafts must carry:

1. **Period covered** — exact `YYYY-MM-DD` to `YYYY-MM-DD`, not just "May"
2. **Retainer base** — the contracted amount, currency explicit
3. **Hour budget** — "Includes up to N hours" stated on the line, even when no overage
4. **Overage block (if any)** — hours over budget × overage rate, with the count and the rate visible
5. **Performance block (if any)** — base + bonus shown as separate lines; the formula and the inputs go in the email body or the evidence link, never hidden
6. **Payment terms** — net days from send date
7. **Reference** — invoice number, agency entity, client's PO if they use one

The "hour budget stated even when no overage" rule matters: when a client is at 195 of 200 hours, them seeing the budget on every invoice for six months is what makes the overage conversation in month seven uneventful.

### Handle overage hours before the invoice goes out

Overage is the most common source of invoice friction. The flow:

1. **Detect mid-cycle, not at send.** If logged hours pass 80% of the retainer budget before the 25th, the agent surfaces a heads-up — to the owner first, then the client. The invoice itself is never the first time the client hears about overage.
2. **Reconcile what counts as overage.** Did the extra hours come from a documented change request, or are they scope creep the client doesn't know they triggered? See `detecting-scope-creep` — if it's the latter, the conversation is about scope, not the bill.
3. **Decide: bill, absorb, or convert.** Bill = invoice the overage at the contract rate. Absorb = eat it, log it as a goodwill credit on the client's Notion row, do not silently absorb twice. Convert = roll the overage into a retainer increase next month. The agent proposes; the owner decides.
4. **Itemize the overage on the invoice.** Hours, rate, what generated them ("Q2 partner page redesign — 18h"). Vague overage lines get disputed.

### Proration for new clients

When a client starts mid-month, the first invoice is prorated. Formula:
`amount = retainer / days_in_month * remaining_days_including_start`. Use UTC dates consistently. State the proration explicitly on the line item ("Prorated for May 17–31, 15 of 31 days").

## Conversation script

**Mid-cycle overage warning to owner (the one the agent drafts on day 22):**

> Acme is at 178 of 200 retainer hours with 8 days left in the cycle. At current pace they'll land near 240. The bulk (28h) is the [partner page redesign] — that's an off-scope item. Options:
> 1. **Bill overage at contract rate** — adds 40h × $X to the May invoice. I can draft the line item now.
> 2. **Absorb this month, convert to scope refresh next month** — see `raising-retainer-prices` for the framing.
> 3. **Absorb silently** — I'd flag that you absorbed 38h in March too. Two in a row sets a precedent.
> Which one?

**Overage line on the invoice itself (when option 1 wins):**

> Retainer — May 2026 — Includes up to 200 hours — {{currency}} {{retainer_amount}}
> Overage hours — 40h × {{overage_rate}} — {{overage_total}}
> &nbsp;&nbsp;Source: partner page redesign (Q2 change request, approved 2026-04-28)
> &nbsp;&nbsp;Source: LinkedIn ad refresh (off-scope, see Slack thread {{link}})

**Email body to client (sent with the invoice, not as a separate message):**

> Hi {{name}},
>
> May's invoice is attached — {{currency}} {{total}} due by {{due_date}}.
>
> This month included 40 hours above the 200-hour retainer budget, itemized on the invoice. Both items were tracked as change requests outside the original scope. Happy to walk through any line on a call this week — and if the work pattern is becoming the norm, that's a signal we should refresh the retainer rather than keep settling up in overage. Let me know.

**Performance-based send (different shape entirely):**

> April performance invoice attached — base {{base}} + bonus {{bonus}} = {{total}}.
>
> Bonus calc: target ROAS 3.5, actual {{actual_roas}}, performance ratio {{ratio}}. Full evidence package (platform screenshots + metrics PDF) here: {{drive_link}}. The formula and every input value are on page 2 — same format as last month, so disputes can be settled against the source data directly.

## What NOT to do

- Don't send the invoice without confirming the previous one was paid. Stacking unpaid invoices is how an awkward conversation becomes a write-off. See `chasing-overdue-invoices`.
- Don't bury overage in the retainer total. Always separate lines. A single "May services" line at an unfamiliar number is the most common dispute trigger.
- Don't generate a performance invoice on the 1st. The ad platforms haven't finalized the previous month's data. Wait for the 2nd business day.
- Don't silently absorb overage twice in a row. The first time is a goodwill gesture. The second time becomes the new contract.
- Don't change the bill date without telling the client. If a client is on anniversary billing, the agent does not "tidy them up" to the 1st of the month — that's a unilateral change to a contract they negotiated.
- Don't issue a credit, refund, or formula adjustment without the owner approving — queue it as an action.
- Don't include the bonus calculation only in the PDF body. Put it on the invoice line and in the email. If the client has to hunt for the math, they'll dispute it.
- Don't propose firing a client over overage before trying a retainer refresh. See `raising-retainer-prices` first, `firing-a-client` only after that conversation fails.
