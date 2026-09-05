---
name: using-asana
description: Read the agency's Asana to spot operational risk — stalled tasks, milestone slippage across the portfolio, missed handoffs between team members, and capacity overload before it becomes burnout. Use when the user asks "what's slipping", "who's overloaded", "is delivery on track", "which projects are stuck", "what did the team miss this week", or when proposing a delivery_alert / capacity_alert action that needs Asana evidence behind it.
---

# Using Asana

*Is the work moving — or just sitting in someone's queue with a green status sticker on it?*

Asana is the agency's project tracker. It tells you what's open, who owns it, what's overdue, and which milestones moved this week. The owner cares about four signals: tasks that have stalled, milestones slipping at the portfolio level, handoffs that never landed, and people running hot enough to burn out. Everything else is noise.

## When this triggers

- Cron `delivery` agent (10am daily) and `team` agent (Mon 11am) read Asana
- COO chat receives a delivery question and pulls Asana via Composio
- Owner asks "what's slipping?" or "who needs help?" in the briefing
- Weekly briefing needs a portfolio status roll-up
- An action is being proposed (`delivery_alert`, `capacity_alert`, `handoff_missed`) and you need the evidence row

## What to do

1. **Resolve the portfolio scope from `clients` table in Supabase.** One portfolio per active client. If the customer has not mapped Asana projects to clients yet, queue an `unmapped_project` action and stop — do not guess.
2. **Pull `GET /projects/{gid}/task_counts` per active project via Composio.** Read `num_tasks`, `num_incomplete_tasks`, `num_overdue_tasks`. Any project where `num_overdue_tasks / num_incomplete_tasks > 0.20` is flagged as delivery risk.
3. **Pull milestones via `GET /tasks?project={gid}&resource_subtype=milestone`.** Compare `due_on` to today. Any milestone with `due_on < today AND completed = false` slipped. More than 2 slipped milestones on one project = escalate to owner in the daily briefing.
4. **Compute task aging on incomplete tasks.** For each task with `completed = false`, age = today − `created_at`. Tasks with age > 30 days AND no `modified_at` in the last 14 days are stalled. Surface the top 5 stalled tasks per project.
5. **Pull the latest status update per project via `GET /projects/{gid}/project_statuses`.** If `created_at` of the most recent update is > 14 days old, surface "no recent status" on the briefing — leadership is flying blind on that project.
6. **Compute workload per assignee from incomplete tasks.** Sum `custom_fields.estimated_hours` per `assignee.gid` across the next 14 days of `due_on`. Anyone above 80 hours over 2 weeks gets flagged in the `team` agent run.
7. **Detect missed handoffs.** When a task transitions to `completed = true` and has a `dependent_tasks` link, the dependent task should pick up activity within 3 business days. If `modified_at` on the dependent is still older than the predecessor's `completed_at` after 3 days, queue a `handoff_missed` action naming both assignees.
8. **Write the result row to the Notion brain.** Append to `Projects` DB (status + overdue count + last update age), append risks > threshold to `Risks` DB, and write the action proposal to `Agent Action Log` per the brain write contract.

## Conversation script

**To the agency owner (briefing voice):**
> "Three projects need your attention. *Acme Brand Refresh* has 7 overdue tasks and the Design Review milestone slipped 4 days — last status update was 16 days ago. *Beta Retainer May* is sitting at 92 hours assigned to Priya over the next two weeks, against her 70-hour ceiling. And the *Gamma Launch* handoff from copy to design didn't land — the design task hasn't been touched in 5 days since copy closed theirs. I've drafted three action cards for review."

**To the PM (when escalation is appropriate):**
> "Asana shows the Design Review milestone on Acme moved past due 4 days ago and there's been no status update in 16 days. Two reads of that: either the milestone is wrong, or the project is at risk and leadership doesn't know yet. Pick one and post a status update today. If it's the second, mark the project Yellow or Red so the portfolio rollup is honest."

**To the client (only when the owner approves the message):**
> "Wanted to flag a timing risk on the Design Review milestone for transparency — we're tracking 4 days behind plan because [named cause]. Here's the recovery plan and the revised date. No action needed from you yet; I'll confirm by Friday."

## What NOT to do

- Don't surface an overdue-task count without naming which milestone it threatens — raw counts don't drive owner action.
- Don't flag a project as at-risk if the only signal is "status update missing" — pair it with overdue tasks, slipped milestone, or aging before you escalate.
- Don't compute workload from task count alone; use estimated hours when available, and skip the signal entirely if estimates aren't being filled in (say so in the briefing instead of faking it).
- Don't propose a `handoff_missed` action without naming both assignees and the specific dependent task — anonymous handoff alerts get ignored.
- Don't write recommendations into the project's task list or comments in Asana. All writes route through the OpsRadar action queue and the customer's Notion brain — Asana stays read-mostly from the agent's side.
