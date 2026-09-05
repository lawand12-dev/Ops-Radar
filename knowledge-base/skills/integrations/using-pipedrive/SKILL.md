---
name: using-pipedrive
description: How to read a customer's Pipedrive instance to answer the four questions agency owners actually ask — where deals stall, what's the win-rate trend, how stale is the pipeline, and what's actually closing this month. Use when the customer's CRM is Pipedrive (not HubSpot), when proposing a pipeline_alert or stale_deal action, when drafting the growth section of the weekly briefing, or when answering "is my pipeline healthy", "what's closing", "why aren't deals moving", or "show me the forecast".
---

# Using Pipedrive

*"My pipeline looks full but nothing's closing — is the forecast lying to me, or am I lying to myself?"*

Pipedrive is the alternative CRM to HubSpot — most common at agencies of 2–15 people who outgrew a spreadsheet but won't pay HubSpot prices. It is a sales-execution tool, narrow by design. Your job is to read it like an operator, not catalogue features.

## When this triggers

- Customer has Pipedrive connected (not HubSpot) and asks any pipeline / forecast / win-rate question
- Weekly growth agent runs (Mon 10am cron) and the customer's CRM is Pipedrive
- Customer asks "where are deals stalling" or "why is nothing closing"
- COO is drafting a briefing and needs the pipeline section
- A deal has crossed its stage rotting threshold and an action needs proposing

## What to do

Answer one of four questions. Never recite features. Pull live via the Pipedrive adapter — no persistence.

### Question 1: Where are deals stalling?

1. Pull **average days-in-stage** per stage for open deals — source: Pipedrive adapter, deals endpoint, `stage_change_time` deltas.
2. Pull **stage-to-stage conversion** for deals closed in trailing 90 days — source: same adapter, deal history.
3. The stalling stage is the one with **highest avg days-in-stage AND lowest forward conversion**. Usually Proposal Sent → Negotiation.
4. Name the count: "12 open deals stuck in Proposal Sent for >14 days." Pull the count directly from the deals query; do not estimate.

### Question 2: Win-rate trend

1. Pull **win rate this quarter** = won deals / (won + lost) for deals with `close_time` in current quarter — source: Pipedrive deals endpoint, status filter.
2. Pull **win rate trailing 4 quarters** for the same calculation, quarter by quarter.
3. Flag if current quarter is **>5 percentage points below** the 4-quarter average. Below that, it's noise.
4. Pair with **lost-reason distribution** — top 3 reasons by count. If >40% of losses are "Other" or null, surface the data-hygiene gap first; the win-rate diagnosis is unreliable until lost-reason is enforced.

### Question 3: Pipeline staleness

1. Pull **deals with no scheduled next activity** — source: Pipedrive deals endpoint, `next_activity_date` is null. This is Pipedrive's own warning metric.
2. Pull **deals past their stage rotting threshold** — source: pipeline config + deal `update_time`. If rotting is not configured, surface that as the first finding ("rotting is off — you have no aging signal").
3. Stale count to surface: "X open deals have no next activity scheduled" + "Y deals are past stage rot threshold."
4. Recommend wiring a Pipedrive Workflow Automation to push rotten-deal alerts to Slack — Pipedrive does not push these natively.

### Question 4: What's actually closing this month

1. Pull **weighted pipeline value for current month** = sum of (deal value × stage probability) for open deals with `expected_close_date` in current month — source: Pipedrive forecast endpoint.
2. Pull **deals won MTD** count and value.
3. Compare weighted forecast + already-won against last month's actual. Flag if weighted forecast is **>20% below** trailing 3-month average closed-won.
4. Always quote the **weighted** number, not the raw open pipeline. Raw pipeline is vanity.

## Conversation script

**Bad:**
> "You have 47 open deals worth $312K."

**Good:**
> "Weighted forecast for May is $48K — that's 31% below your trailing 3-month closed-won average of $69K. The driver is Proposal Sent: 12 deals sitting an average of 19 days, vs your typical 8. Two of those deals have no next activity scheduled. Recommend: walk the Proposal Sent column tomorrow morning, mark dead ones Lost, schedule a next-step call on the rest. Open the action card for the deal list."

The structure: **weighted number → trend → driver → specific count → recommended next action.**

## What NOT to do

- Don't quote raw open pipeline value as a forecast. Always weighted.
- Don't surface a stalling-stage finding without naming the deal count.
- Don't diagnose win-rate trend if >40% of lost-reason is "Other" or null — fix the data first.
- Don't recommend "configure rotting" as a finding by itself — pair it with the cost (no aging signal).
- Don't list Pipedrive's feature inventory. The customer doesn't care that recurring products exist; they care whether their MRR is moving.
- Don't recommend migrating to HubSpot unless the customer asks. CRM migrations are painful; a well-maintained Pipedrive beats a neglected HubSpot.
- Don't write to Pipedrive. The agent reads only. If a write is needed (update a deal stage, log an activity), queue it as an action with `composio_action` payload through the approval gate.
- Don't surface findings without naming the source field. "Deals stuck" is useless; "12 deals in Proposal Sent >14 days per `stage_change_time`" is actionable.
