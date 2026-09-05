---
name: raising-retainer-prices
description: The script for raising a retainer price with an existing client. Most owner anxiety lives here. Covers the framing, the lead time, the exact email/call language, and the 3 valid reasons (cost increase / scope growth / market reset). Use when effective hourly rate falls below floor, when a client is approaching their 12-month renewal anniversary, or when the user asks "how do I raise prices on X". Returns the draft + the recommended delivery channel.
---

# Raising Retainer Prices

Most agency owners never raise prices on existing clients. They take the loss for years rather than have one 20-minute conversation. Your job: make the conversation easy by handing them the words.

## The 3 valid reasons (always cite one — never raise without one)

1. **Cost increase** — your loaded labor cost is up (e.g. raises across the team, new senior hire required for this client's work, healthcare premium increases). Best for: clients with stable scope.
2. **Scope growth** — the work has structurally grown beyond what was scoped. Best for: clients where scope creep is the driver (see `detecting-scope-creep`).
3. **Market reset** — your standard rate has gone up; you're closing new clients at a higher number. Best for: long-tenure clients on legacy pricing.

**Never cite "we need more money."** That's an owner problem, not a client reason.

## The cadence — when to raise

| Timing | When | Tone |
|---|---|---|
| 60 days before renewal | Default. Best timing. | Forward-looking ("On renewal in February, we're moving to $X.") |
| At renewal | Standard | Mention in renewal conversation explicitly |
| Mid-contract (rare) | Only if scope has structurally grown OR you've added senior headcount specifically for this client | More careful — must justify the change happening before the agreement period ends |

Default: 60 days before the contract anniversary.

## The size of the raise — how much to ask for

| Client tenure | Last raise | Suggested raise |
|---|---|---|
| < 12 months | Never raised | Don't raise yet. Wait for first anniversary. |
| 12–24 months | Never raised | 8–12% — anchored to inflation + agency labor cost growth |
| > 24 months | Never raised | 15–25% — market reset language |
| Any | Raised within 12 months | Don't raise again unless scope has structurally changed |

Cap any single raise at 25% even if effective rate justifies more. Above 25%, do it in two steps over 12 months.

## The conversation — by channel

### Email-first (default for non-strategic accounts)

Subject: `Heads up on our 2026 renewal — {client_name}`

```
Hey {first_name},

Wanted to give you 60 days heads-up: when we renew on {renewal_date},
our monthly retainer is moving from ${current} to ${new}.

The change reflects {reason}:
{reason_specifics}

This keeps us at our standard rate for {client_type} work and keeps
{your_team_members} focused on you the way we've been. We're not making
the change for any of our other clients on legacy retainers — wanted to
flag it ahead of time so there are no surprises at renewal.

Happy to jump on a 15-min call to walk through it if useful. Otherwise,
I'll send the new agreement in early {renewal_month}.

{owner_signature}
```

### Call-first (for strategic / high-anxiety accounts)

Open the conversation directly:
> "I wanted to give you a heads up on something — when we renew in February, I'm moving our monthly retainer from $X to $Y. The driver is [reason]. I'd rather have this conversation now than land it in a contract. What questions do you have?"

Let them react. The most common reaction is silence or a small pushback. Most clients accept once they hear the reason.

### When the client pushes back

Three valid responses:

1. **"That's a big jump."** → "I know. It's been [N] years since we adjusted, and our team's loaded cost has gone up [N]%. I can do it in two steps over the year if that's easier on your budget — same end-state."
2. **"We don't have the budget."** → "Got it. Let me know your ceiling. If we can't bridge, we can also talk about adjusting scope — keep us where we are but tighten what's in." (DO NOT cave. Offer scope reduction.)
3. **"Let me think about it / I need to check with my CFO."** → "Of course. I'll send a one-page summary you can share. Realistic — we need a decision by [date 14 days before renewal]."

## What the agent prepares for the owner

When the agent queues a `raise_retainer` action, include:

| Field | Source |
|---|---|
| `current_monthly` | Clients DB |
| `proposed_monthly` | Computed from effective-hourly-rate target |
| `reason_code` | cost-increase / scope-growth / market-reset |
| `reason_specifics` | 2-3 concrete bullets the owner can paste in |
| `tenure_months` | Clients DB |
| `last_raise_date` | Clients DB or "never" |
| `effective_rate_now` | `calculating-effective-hourly-rate` |
| `effective_rate_after` | post-raise computed |
| `recommended_channel` | email-first if standard, call-first if strategic |
| `recommended_lead_time_days` | 60 |
| `draft_email` | full email |
| `draft_talking_points` | for the call version |

## Cross-references

- `calculating-effective-hourly-rate` — the supporting number
- `flagging-margin-erosion` — the trigger that leads here
- `discussing-margin-with-client` — sister conversation when you want to lead with the data not the ask
- `detecting-scope-creep` — the alternative conversation if scope is the issue
- `discussing-scope-with-client` — the scope-refresh script if that path is right
- `diagnosing-difficult-clients` — run this if you're not sure whether to raise, reset scope, or fire
- `firing-a-client` — the fallback if the client refuses

## What NOT to do

- Don't raise more than once in 12 months without structural scope change.
- Don't raise without 60-day lead time (unless mid-contract justified by scope growth).
- Don't apologize for the raise — name the reason, then move on.
- Don't raise on every client at the same time — staged across the year.
- Don't raise on a client who lost their biggest customer this quarter — wait one quarter.
