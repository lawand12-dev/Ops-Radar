---
name: monitoring-client-health-score
description: Composite client health score that fuses NPS, response time, performance delivery, billing posture, product/portal activity, and renewal proximity into one weekly number per client. Detects churn risk 30-60 days before a non-renewal lands. Use when answering "is this client about to churn", "what's our churn risk this quarter", "how is Acme doing", or when proposing a renewal save or QBR action. Returns the score, the dominant driver, and the action ladder for that bucket.
---

# Monitoring Client Health Score

*Is Acme about to churn and I just haven't noticed yet?*

Churn never announces itself. By the time a client says "we're not renewing," the signals have been there for two months — a missed QBR, a late invoice, a Slack channel that went quiet, an NPS reply that dropped from 9 to 7. Your job is to fuse those signals into one weekly number per client, name the dominant driver, and hand the owner the right conversation before the cancellation email is drafted.

## When this triggers

Compute the composite score weekly per active client. Surface to the owner when any of these are true:

- Score crosses a bucket boundary (Healthy → Watch, Watch → At-risk, At-risk → Critical)
- Score drops by more than 15 points week-over-week regardless of bucket
- Renewal is within 60 days AND score is below the Healthy threshold
- Any single dimension flips to its red state, even if composite is still green
- Owner asks "how is [client] doing" or "what's our churn risk this quarter"

The score is a *floor* for the conversation, not a ceiling. A green composite with a red billing signal still warrants a quiet check-in.

## What to do

### The six dimensions

Each dimension contributes to the composite. Weight per the owner's `__how_we_work` config; defaults below.

| Dimension | Default weight | Red state | Source |
|---|---|---|---|
| **NPS / sentiment** | 25% | Latest survey response below the owner's chosen NPS floor, or no response when one was due | Survey tool or CRM custom field |
| **Response time** | 15% | Client email/Slack response time has roughly doubled vs their own 90-day baseline | Gmail + Slack |
| **Performance / delivery** | 20% | Missed milestones, slipped SLAs, or `detecting-scope-creep` already triggered for this client | ClickUp / Asana / Harvest |
| **Billing posture** | 15% | Invoice unpaid past terms, or finance team has flagged a renegotiation request | Stripe / accounting |
| **Product / portal activity** | 15% | Logins, deliverable downloads, or portal opens have dropped meaningfully vs their own 30-day baseline | Portal logs / CRM activity |
| **Renewal proximity** | 10% | Contract end date within 60 days AND no renewal conversation logged | CRM / contracts |

Don't invent absolute thresholds. The score is *relative to the client's own baseline*, not to other clients. A 3-day response time is healthy for one client and a screaming red flag for another.

### The buckets and the action ladder

| Composite | Bucket | What it means | Action |
|---|---|---|---|
| Healthy | Top quartile of the client's own history | Stable, no intervention | Note in weekly briefing. Don't dwell. |
| Watch | Drifting but no red dimensions | Early signal | Quiet internal note. Ask the AM what changed this month. No client conversation yet. |
| At-risk | One or more red dimensions OR composite has eroded for 3+ weeks | Churn risk window opens | Recommend a proactive check-in call. Use the conversation script below. Log the call. |
| Critical | Multiple red dimensions OR renewal < 60 days with red NPS or billing | Save mode | Owner-led conversation, not AM. Pull together a save plan: scope refresh, exec sponsor outreach, or a deliberate price/scope concession decision. |

The point of the ladder is that the *first* response is curiosity, not a save campaign. Most Watch-bucket clients self-correct. Treating Watch like Critical burns relationship capital.

### Name the driver every time

Never surface "Acme is At-risk" alone. Always pair the bucket with the dominant driver:

> "Acme moved from Healthy to At-risk this week. The driver is response time — their replies have gone from same-day to 4-day average over the last three weeks. NPS and billing are still green. Recommend a low-key check-in from the AM before the next standing call."

Without the driver, the owner can't act. With it, the conversation writes itself.

## Conversation script

For proactive client check-ins when score is At-risk and the driver is sentiment, response time, or activity drop. Owner or AM initiates.

**Opener (don't lead with the score, lead with care):**
> "Hey [name] — wanted to grab 20 minutes this week, no agenda. We've been heads-down on [recent deliverable] and I want to check in on how things feel on your side, not just on the work."

**The pivot (after small talk):**
> "Honestly, one thing I noticed is that we've been a bit slower in our back-and-forth than we were earlier this year. I don't want to read into it, but I'd rather ask than guess — is there anything shifting on your end? New priority, team change, anything we're getting wrong?"

**The listen.** This is the whole point. Don't pitch. Don't defend. Take notes. The answer is almost always one of: (1) their internal priority moved, (2) something we delivered missed, (3) they're shopping, (4) budget pressure.

**The close:**
> "Thanks for the honesty. Two things I want to do: (1) [specific adjustment based on what they said], and (2) let's put a 30-min QBR on the calendar in the next two weeks so we're not relying on the day-to-day to stay aligned. Sound good?"

If the driver is **billing** or **renewal proximity**, run a different script — that's a commercial conversation, not a relationship one. Pull `raising-retainer-prices` or `firing-a-client` depending on the underlying margin picture.

## What NOT to do

- Don't surface the raw composite to the client. The score is an internal compass, not a report card.
- Don't recommend a save campaign on first At-risk detection — start with the curiosity check-in.
- Don't treat a single red dimension as Critical if the composite is still Healthy. Investigate quietly first.
- Don't fire off an apology email when score drops. Premature self-flagellation tells the client they were right to lose confidence.
- Don't compare clients to each other in the conversation ("you're our healthiest account") — it leaks information and reads as transactional.
- Don't surface this to anyone but the agency owner and the named AM. Never to the client's team, never to junior staff who handle the day-to-day.
- Don't recommend a discount as the first save lever. Discount is the last move, not the first — see `flagging-margin-erosion` for the order of operations.

## Cross-references

- `detecting-scope-creep` — when the driver is performance / delivery overrun
- `flagging-margin-erosion` — when the driver is billing and the client is also unprofitable
- `raising-retainer-prices` — the conversation if renewal is near and scope has grown
- `firing-a-client` — when the save math doesn't work and the relationship has to end
- `calculating-effective-hourly-rate` — the supporting number for any renewal conversation
