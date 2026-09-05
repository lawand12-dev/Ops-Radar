---
name: preparing-status-calls
description: How to prep an agency status call so the client leaves believing the work is in control — even when results are flat or bad. Covers what to bring, what NOT to lead with, the 3-number open, the bad-news framing, and when to recommend a strategy pivot instead of defending the plan. Use when the owner asks "prep for my Acme call", "status report for {client}", "what do I say on the check-in", or when the Briefings agent surfaces a scheduled client review in the next 48 hours. Works across paid media, SEO, and full-service retainers.
---

# Preparing Status Calls

*"The Acme call is tomorrow and the numbers aren't great — what do I lead with?"*

The status call is where retainers die or get re-signed. Most agency owners walk in with a dashboard and let the client interpret it. Wrong order. Your job: walk them in with a story, a number, and a decision to ask for.

## When this triggers

- Owner explicitly asks to prep for a named client call.
- A recurring client review is on the calendar in the next 48 hours and no prep doc exists.
- The Briefings agent flagged a client with two consecutive flat/down weeks heading into a scheduled check-in.
- A renewal conversation is queued within 30 days — every status call from here forward is a renewal touchpoint, not a status call.

Do NOT trigger this for kickoff calls, scope conversations, or escalations. Those are different scripts.

## What to do

The prep is a checklist, not a slide deck. Do it in this order. Skipping is what gets people in trouble.

### 1. Pull the 3 numbers — and ONLY these three

Every status call opens with three numbers. No more. The owner picks them based on the service line:

| Service line | The 3 numbers |
|---|---|
| Paid media | Spend, ROAS (or CPA), pacing vs budget |
| SEO | Organic sessions WoW/MoM, ranked keywords in top 10, conversions from organic |
| Full-service | Pipeline value, delivery on-time %, blended ROAS or attributed revenue |

Source from the live integration adapter — never from memory or a stale Sheet. If the adapter is partial (GSC 3-day lag, Meta same-day unreliable, GA4 sampling), state the partial window in the prep doc so the owner doesn't get caught.

### 2. Compute the comparison

Every number needs a comparison. A bare metric is a Rorschach test — the client fills in the meaning. Always pair with one of:

- WoW (week-over-week) — for weekly calls
- MoM (month-over-month) — for monthly calls
- vs target — if a target exists in the retainer config
- vs prior 4-week average — when the period is too noisy for WoW

If prior-period data is missing (new client, <16 weeks of history), say so explicitly. Don't fake a baseline.

### 3. Surface the ONE risk

Just one. Pick the highest financial-impact risk that's surfaced from the data. Examples:

- Paid media: "Meta CPA up 38% MoM — creative fatigue is the most likely cause."
- SEO: "Three top-10 keywords dropped to page 2 after the May core update."
- Full-service: "Pipeline coverage is 1.4× quota; we need 3× to hit Q3."

If there's no real risk, write that down. "No material risk this period" is a valid line. Inventing one to look vigilant is worse than admitting calm.

### 4. Surface the ONE win

Same rule. One real outcome. Not "we tried hard." A specific thing that moved.

If the period was genuinely flat, say so. "Holding pattern week — no notable wins, no notable risks. Recommending we use the call to {decision}."

### 5. Write the ask

Every call needs ONE thing you want the client to decide or commit to. Examples:

- Approve the creative refresh budget ($X).
- Sign off on adding the second LP variant.
- Greenlight the content cluster for Q3.
- Confirm renewal terms before the 14th.

A status call without an ask is a status call without a next step — which is how retainers drift into "we're not sure if this is working."

### 6. Pre-frame the bad news (if any)

If a number is down, draft the explanation BEFORE the call:

- Cause (be specific — "iOS 17.4 attribution loss," not "platform noise")
- What you already did (action you took within the period)
- What you're recommending next (the ask)

If you cannot name the cause, write "We don't have a clean attribution yet — investigating this week." That is better than a speculative story the client will remember verbatim and quote back in 90 days.

### 7. Decide if this is a pivot call

Run this check before the call, not during it. Recommend a strategy pivot conversation IF:

- Same KPI has missed target for 3+ consecutive reporting periods.
- The cause is structural (channel saturation, algo shift, ICP mismatch) — not tactical.
- You've already burned the obvious tactical fixes (creative refresh, bid changes, content additions).

If all three are true, the status call becomes a pivot call. Reset the agenda: "I want to use today to step back on strategy, not walk through numbers." This is a different conversation and saves the relationship more than a fourth quarter of defending the plan.

## Conversation script

The opening 90 seconds set the call. Owner delivers — live, on video, never on a deck-only async send.

```
[The 3-number open]
"Before we get into anything — three numbers. {Metric 1} is {value},
{comparison}. {Metric 2} is {value}, {comparison}. {Metric 3} is
{value}, {comparison}.

[The one-line read]
{Pick one}
- "Net: a strong period. The win we're going to talk about is {win}."
- "Net: a flat period. Holding pattern, no surprises, here's what's
  queued."
- "Net: a soft period. {Metric} is the issue. I want to walk you
  through what happened and what I'm recommending."

[The risk + win]
"One risk I'm watching: {risk_one_sentence}.
One win worth flagging: {win_one_sentence}."

[The ask]
"What I'd like to walk away from today with is your decision on
{specific_ask}. We can go through the detail first if you want — or
I can give you the recommendation now."
```

### Bad-news framing

When a number is meaningfully down, the order matters. Cause → action taken → recommendation → ask. Never just cause.

```
"{Metric} dropped {value} this period. The cause is
{specific_cause} — not {plausible_but_wrong_cause_you_ruled_out}.

What I already did this period: {action_1}, {action_2}.

What I'm recommending: {next_action}. The reason it's the right
next move is {one_sentence_logic}.

If you greenlight today, we can have {observable_signal} by
{date}. If we don't act now, the cost is {quantified_or_stated
_consequence}."
```

Two rules on bad news:

- NEVER blame the platform without naming what you tried. "Meta is just expensive right now" is the line that gets agencies fired.
- NEVER promise a rebound timeline you don't believe. "We'll get it back next week" is the line that turns one bad month into a churn event.

### The pivot call open

If the pre-call check flagged this as a pivot conversation, replace the 3-number open:

```
"I want to do something different today. We've been hitting the same
wall on {KPI} for {N} months, and I don't think more of the same is
the right answer. I want to step back and talk about whether
{current_strategy} is still the best use of the retainer, or whether
we should be pointing this at {alternative}. The numbers are in the
doc — we can come back to them — but the call I want to have is the
strategic one."
```

This conversation saves more accounts than any tactical fix. Owners avoid it because it feels like admitting failure. It isn't. It's the move that signals the agency is thinking like a partner, not a vendor.

## What NOT to do

- Don't open with a dashboard share-screen. The client will read ahead of you and form their interpretation before you've framed it.
- Don't walk through every channel/keyword/campaign. The call is about the top three numbers and the ask. Detail goes in the report doc, not the call.
- Don't surface a risk without a recommended action. Anxious-without-a-plan is worse than calm-without-a-plan.
- Don't lead with the wins when results are soft. The client knows the results are soft; leading with wins reads as deflection.
- Don't promise a recovery timeline you can't justify. "We expect to see {signal} by {date}" only if the signal-to-date logic actually holds.
- Don't run a status call against a flat or down KPI three periods in a row. After two, queue the pivot conversation. Status call #3 on the same losing plan is the moment the client starts shopping.
- Don't send the report doc only — always pair it with a live call when the period was soft. Bad news async is how retainers die quietly.
- Don't fabricate a baseline when prior-period data is missing. State the gap.
- Don't pad with platform-noise excuses ("iOS, attribution, algo updates"). Use them only when you can name the specific shift and quantify its impact.
