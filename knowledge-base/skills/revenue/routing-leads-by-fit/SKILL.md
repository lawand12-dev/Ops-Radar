---
name: routing-leads-by-fit
description: How to qualify an inbound lead on three dimensions — source, declared budget, and requested service — then assign it to the right AE or specialist team. Use when the user asks "where should this lead go", "lead routing", "qualify this lead", "AE assignment", "who picks this up", "is this a real lead", or when the growth agent has a new pipeline row that needs an owner before SLA expires.
---

# Routing Leads By Fit

*"A lead just came in. Who owns it? Is it even worth a same-day reply, or should it sit in the nurture bucket?"*

Routing is one decision, not three. You qualify on source, budget, and service together, and only then assign the owner. Routing on any single dimension is how SDRs end up calling tire-kickers and how enterprise leads end up in the SMB sequence.

## When this triggers

- A new row appears in the Pipeline DB (from a webform, CRM, ad form, or referral)
- An existing lead's `service_interest` or `budget_band` field changes
- The growth agent's Monday run sees an unassigned lead older than the SLA window
- The customer drops a forwarded email and asks "should we take this one"
- A lead is sitting in the wrong sequence (e.g. SMB nurture for an enterprise inquiry)

## What to do

Score the lead on all three dimensions before assigning. Any single weak axis can still route, but ambiguity on two or more axes goes to the review queue — not to an AE.

**1. Source qualification — who sent them**

Read the UTM, referrer, or `lead_source` field. Resolve to one of:

- **Referral / partner** — highest intent, route same-day to the senior AE who owns that partner relationship
- **Inbound organic** (search, direct, content) — warm, route to the AE who owns that vertical
- **Paid ad** — variable intent, requires enrichment before routing
- **Outbound reply** — already owned by the SDR who sourced; assignment is automatic
- **Unknown / missing UTM** — log to dead-letter, ask the customer where it came from before assigning

If the source is paid or unknown, run enrichment (company size, industry, role) before scoring the other two axes. Don't route on missing data.

**2. Budget qualification — can they afford the floor**

Read the declared budget band (from form) or infer from company size + industry. Compare to the customer's retainer floor (read from `__how_we_work`):

- **Above floor** — route to senior AE, named-account treatment
- **At floor (within 20%)** — route to standard AE pipeline
- **Below floor but strategic** (right vertical, brand value) — flag for owner review, do not auto-route
- **Well below floor** — route to the self-serve sequence or politely decline; do not burn an AE hour

If budget is not declared and cannot be inferred, default to standard AE pipeline but tag the lead `budget_unknown` so the AE qualifies on the call.

**3. Service qualification — what they're actually asking for**

Read the service-interest field, or classify the freeform message. Map to one of the customer's offered services. Then check:

- Does the agency actually deliver this service? If no, route to the partner-referral playbook
- Is the lead asking for something the customer explicitly listed as a `do_not_take` in `__how_we_work`? Reject politely
- Is the request ambiguous (multiple services or scope unclear)? Send to review queue, do not guess
- Does the service have a named specialist owner? Route to that specialist, not the general AE pool

**4. Assemble the owner**

Combine the three signals into one routing decision:

| Source | Budget | Service | Owner |
|---|---|---|---|
| Referral / inbound | Above floor | Clear + supported | Senior AE for that vertical |
| Referral / inbound | At floor | Clear + supported | Standard AE pool |
| Paid / unknown | Above floor | Clear | Standard AE, enriched first |
| Any | Below floor | Any | Self-serve sequence or decline |
| Any | Any | Ambiguous or unsupported | Review queue (owner triages) |
| Outbound reply | Any | Any | Original SDR (do not reassign) |

Write the assignment to the Pipeline row with the routing rationale (which source, which budget band, which service) so the AE knows why they got it.

**5. Notify and SLA-tag**

Post to the assigned owner's Slack DM or routing channel. Tag the SLA window based on source: referrals get same-day, paid leads get 2-hour for hot intent, organic gets 24-hour. If the SLA elapses without acknowledgment, escalate to the team lead — do not silently fail.

## Conversation script

When the routing is non-obvious or worth flagging to the AE, write the handoff like this:

> "New lead for you: **[Company name]** via [source]. Declared budget [band] — that's [above / at / below] our floor. They're asking for [service], which is in your wheelhouse. Worth same-day reply because [reason: referral / above-floor / strategic vertical]. Routing rationale: [the one-sentence why]. Open the row to see enrichment + the original message."

When the lead doesn't fit and you're sending to review instead of an AE, write to the owner:

> "Lead came in but I'm not auto-routing: **[Company]** via [source]. The ambiguity is [budget below floor / service we don't sell / two axes unclear]. I haven't notified an AE yet. Three options: (1) override and assign to [AE name], (2) send the self-serve sequence, (3) decline politely. Open the action card to decide."

Never assign a lead without naming the rationale. The AE needs to know whether to treat it as a hot inbound or a tire-kicker.

## What NOT to do

- Don't route on source alone. A referral asking for something you don't deliver is still a no.
- Don't route on budget alone. A high-budget lead asking for something out-of-scope is a partner referral, not an AE call.
- Don't route on service alone. An on-target service request from a below-floor lead is still a sequence lead, not an AE conversation.
- Don't guess when two axes are ambiguous. Send to the review queue and let the owner decide.
- Don't auto-route paid or unknown-source leads before enrichment runs. Polished routing on missing data is worse than waiting.
- Don't reassign outbound replies away from the SDR who sourced them. That breaks the comp model.
- Don't notify the AE without writing the rationale to the Pipeline row. They need to know why.
- Don't let the SLA expire silently. Escalate to the team lead before the lead goes cold.
