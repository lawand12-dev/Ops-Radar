---
name: using-monday
description: Read the agency's Monday.com workspace to surface operational risk — stalled items, board-level slippage, timeline overruns, broken automations, and stale client boards. Use when the user asks "what's stuck on Monday", "which client is going quiet", "are our automations still firing", "which projects haven't moved", "is the team overloaded", or when proposing a delivery_alert / stalled_board / automation_drift action that needs Monday evidence behind it.
---

# Using Monday

*Is the board telling you the truth — or are 40 items quietly rotting in "Waiting on client" while leadership thinks the project is on track?*

Monday is where the agency lives day-to-day: board per client, items per deliverable, status columns that everyone glances at and trusts. The owner cares about four signals: items that have stalled in status, boards that have gone quiet, automations that stopped firing under the action cap, and timelines drifting past their `Date` column. Everything else is noise — including most of Monday's own dashboards.

## When this triggers

- Cron `delivery` agent (10am daily) and `team` agent (Mon 11am) read Monday
- COO chat receives a delivery question and pulls Monday via Composio
- Owner asks "what's stalled?" or "which client has gone quiet?" in the briefing
- Weekly briefing needs a per-board health rollup across the portfolio
- An action is being proposed (`delivery_alert`, `stalled_board`, `automation_drift`, `handoff_missed`) and you need the evidence row

## What to do

1. **Resolve board-to-client mapping from `clients` table in Supabase.** One Monday board (or board group) per active client. If a board has no client mapping, queue an `unmapped_board` action and stop — do not guess from board names.
2. **Pull boards via `GET items_by_board` GraphQL at `https://api.monday.com/v2`.** For each mapped board, read `items.column_values` filtered to the canonical status column. Any board where (`Stuck` + `Waiting on client`) / total open items > 0.40 is flagged as stalled delivery.
3. **Compute item age in current status.** For each item, age = today − last `activity_logs` entry with `event = "change_column_value"` on the status column. Items aged > 14 days in `In Progress` or `In Review`, or > 10 days in `Waiting on client`, are surfaced as stalled. Cap at top 5 per board.
4. **Pull overdue items via the date column.** Any item where `date_column.date < today AND status != "Done"` is overdue. Boards with > 5 overdue items, or any overdue item past due by > 7 days, get escalated to the owner in the daily briefing.
5. **Check board freshness via `boards.updated_at`.** A client board with no `updated_at` movement in the last 14 days means delivery has paused or moved to email/Slack — both are visibility losses. Queue a `stalled_board` action naming the last person who touched it.
6. **Detect automation drift.** Compare status-change event volume on the board for the trailing 7 days vs the prior 7 days. A drop > 60% on a board with active items is a likely Standard-plan automation cap hit (250 actions/month) — queue an `automation_drift` action and recommend Pro upgrade only if the math justifies it, per the agency's `__how_we_work` rules.
7. **Compute owner workload from the People column.** Count open (non-Done) items per `person.id` across all mapped boards, weighted +2 for overdue. Anyone above 30 weighted items goes to the `team` agent run as a capacity flag — and only if estimates aren't in the board (Monday time tracking is Pro+ and rarely billable-grade, so do not fake hour math).
8. **Detect missed handoffs via Connect Boards columns.** When an upstream item flips to `Done` and is linked to a downstream item, the downstream should see a status change within 3 business days. If the downstream item is still in its initial status after 3 days, queue a `handoff_missed` action naming both owners and both item URLs.
9. **Write the result row to the Notion brain.** Append per-board health to `Projects` DB (status mix + overdue count + last-activity age), append risks above threshold to `Risks` DB, and write every proposed action to `Agent Action Log` per the brain write contract. Do not write into Monday itself.

## Conversation script

**To the agency owner (briefing voice):**
> "Three boards need your attention. *Acme Brand Refresh* has 47% of items in Stuck or Waiting on client and the board hasn't moved in 12 days — last touch was Priya on the 11th. *Beta Retainer May* is showing automation drift, status-change events dropped 70% week-over-week, which usually means you've hit the 250-action cap on Standard. And the *Gamma Launch* copy → design handoff didn't land — the design item is still in Not Started 5 days after copy flipped to Done. Three action cards drafted for review."

**To the PM (when escalation is appropriate):**
> "Monday shows the *Acme* board has had no status changes in 12 days and 47% of open items are Stuck or Waiting on client. Two reads: either status is wrong, or the project is silently slipping and the client hasn't been told. Pick one and either move the items today or post a status update naming the blocker. If it's slipping, mark the board's overview item Stuck so the portfolio view is honest."

**To the client (only when the owner approves the message):**
> "Wanted to flag a timing risk on *Acme Brand Refresh* — three deliverables have been waiting on input from your side for 10+ days. Here's the list with what we need from each. No deadline change yet, but we'll need a decision by Friday to keep the milestone date."

## What NOT to do

- Don't surface a "stalled items" count without naming the specific items and which milestone or deliverable they threaten — raw counts don't drive owner action.
- Don't flag a board as at-risk on board freshness alone — pair stale `updated_at` with status mix or overdue count before you escalate.
- Don't compute workload from Monday's Time Tracking column — it's Pro+ only and rarely used seriously; use open-item counts weighted by overdue instead, or skip the signal and say so in the briefing.
- Don't propose an `automation_drift` action without naming the board and the trailing 7-day status-change delta — anonymous "your automations broke" alerts get muted.
- Don't write recommendations into Monday items, updates, or columns. All writes route through the OpsRadar action queue and the customer's Notion brain — Monday stays read-mostly from the agent's side.
