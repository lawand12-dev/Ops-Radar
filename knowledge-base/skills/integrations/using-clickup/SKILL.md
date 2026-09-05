---
name: using-clickup
description: Read the customer's ClickUp to answer the only questions the owner actually asks about delivery — "what's stuck in ClickUp", "is this project late", "what's actually shipping this week", "who's overloaded", "which tasks are zombies", "task velocity dropping", "team capacity overload", "scope creep on Acme". Skip ClickUp's generic PM theory; surface the agency-specific signals the owner can act on today.
---

# Using ClickUp

*Your client's deadline is Friday. Three tasks are still sitting in "In Progress" with no activity since last Tuesday. The PM hasn't flagged it. Are you going to find out from the owner, or from the client?*

ClickUp is where the agency's work lives. The owner does not want a project-management tutorial — they want to know which tasks are stalled, which projects are late, who is buried, and what is actually shipping this week. Everything else is noise.

## When this triggers

- Owner asks "what's stuck in ClickUp" or "what's slipping"
- Owner asks "is the Acme project on track" or "is this project late"
- Owner asks "what did we actually ship last week"
- Owner asks "who's overloaded" or "do we have capacity for more work"
- Owner asks "is there scope creep on [client]"
- Daily briefing needs a delivery section
- Cron `delivery` (10am daily) or `scope` (Mon 8am weekly) agent is running

## What to do

1. **Pull open tasks per client folder via `GET /list/{list_id}/task`** filtered to `status != Done`. Cite the folder name the owner uses — never an internal list ID.
2. **Flag overdue tasks: `due_date < now AND status != Done`.** Group by client. Surface clients where `overdue_count / active_count > 0.25` as a delivery-risk client.
3. **Flag zombie tasks: `status = In Progress AND last_activity_at < now - 14d`.** These are the silent killers. Anything past 14 days of no activity in In Progress is dead until proven otherwise.
4. **Flag review-bottleneck tasks: `status = In Review OR Client Review AND status_age > 5d`.** Group by `assignee.id` on the reviewer side. If one reviewer holds five+ tasks across multiple clients, that reviewer IS the bottleneck — name them.
5. **Compute task velocity per client: tasks closed last 7d vs tasks created last 7d.** Falling close rate with rising create rate = the team is taking on faster than shipping. Threshold: `created_7d / closed_7d > 1.3` for two consecutive weeks = overcommitment.
6. **Compute scope-creep signal per task: `time_spent / time_estimate`.** At ≥ 0.8 surface as scope-watch; at > 1.0 flag for change-order conversation. If `time_estimate IS NULL` on >40% of active tasks, surface a data-hygiene alert first — the scope signal is unreliable until estimates exist.
7. **Compute workload per assignee: sum `time_estimate` of active tasks per `assignee.id`** vs a 40h weekly capacity default. Anyone over 100% is overloaded; over 130% needs intervention this week. Measure by estimates, never by raw task count.
8. **Answer "what shipped" with `status_changed_to = Done AND status_changed_at within last 7 days` grouped by client.** Return the count and the three highest-value deliverables, not the full list.
9. **Respect the rate limit.** Free/Unlimited/Business: 100 req/min per token. On HTTP 429, back off using `X-RateLimit-Reset`. For 50-client dashboards, batch list reads.
10. **Write any flagged client to Notion `Risks` DB and the action to `Agent Action Log`** per the notion-brain-schema write contract.

## Conversation script

To the project manager when zombie tasks or review bottlenecks surface:

> "Three tasks on Acme have been in 'In Progress' since last Tuesday with no activity — [task A], [task B], [task C], all assigned to [name]. Two tasks on Bright have been in 'Client Review' for 8 days waiting on [reviewer]. What's blocking? If [name] is stuck, do they need a reassignment or a pairing session? If [reviewer] is the bottleneck across clients, we need to triage their review queue today, not Friday."

To the owner when scope creep surfaces on a client:

> "Acme is at 92% of monthly retainer hours with 9 days remaining in the cycle. Two tasks went past their time estimate this week: [partner page redesign] at 138% and [LinkedIn ad refresh] at 121%. The drivers are off-scope from the original SOW. Recommend a scope conversation this week — not after overrun. I've drafted the 1st-ask language; open the action card to review."

To the owner when capacity tips:

> "[Designer name] is at 134% of weekly capacity — 53.6 estimated hours across 11 active tasks. Two clients are competing for the same slot on Thursday. Either we push [lower-priority client]'s task to next week or we pull in [other designer] for the [specific deliverable]. The team is not going to flag this themselves."

## What NOT to do

- Don't dump a wall of tables. ClickUp's own dashboards already do that and the owner is drowning in them — one number plus one sentence of context per finding.
- Don't surface scope creep without naming the driver. "Margin dropped" is useless; "the team took 38 creative variants when the SOW agreed to 20" is actionable.
- Don't trust ClickUp data if `time_estimate IS NULL` on more than 40% of active tasks — surface the data-hygiene gap first, then estimates, then scope.
- Don't measure workload by raw task count. A 30-minute task and a 2-day task are not the same unit; always weight by `time_estimate`.
- Don't store ClickUp task data in Supabase. Every read is a live Composio fetch per OpsRadar's no-persistence rule — only flagged actions and risk rows land in our DB.
- Don't pipe routine status changes into Slack `#general`. The team will mute it and miss the real exceptions.
