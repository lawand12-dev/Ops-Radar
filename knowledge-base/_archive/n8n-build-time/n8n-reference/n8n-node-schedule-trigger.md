# n8n Node: Schedule Trigger

**Category:** Trigger
**Node Type:** `n8n-nodes-base.scheduleTrigger`
**Source:** n8n GitHub source
**Updated:** 2026-05-07

## Overview

The Schedule Trigger fires a workflow automatically on a time-based schedule without requiring an external event. It is the entry point for all cron-style automation: nightly reports, hourly syncs, daily cleanups, and weekly digests. Because it is a trigger node, it must be the first node in the workflow and cannot appear mid-workflow.

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]] · [[n8n-best-practices]]

---

## What It Does

The Schedule Trigger starts a workflow at defined time intervals or cron expressions. Two modes are available: **interval mode** (every N seconds/minutes/hours/days/weeks/months) and **cron expression mode** (full cron syntax for complex schedules like "weekdays only" or "first Monday of the month"). On each fire, the trigger produces a single output item containing the timestamp of when it executed.

The trigger does NOT retry if the downstream workflow fails — it simply fires again at the next scheduled time. Failed runs are recorded as error executions in the n8n database but are otherwise ignored by the scheduler.

## Authentication

None — no credentials required.

---

## Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `rule.interval` | options | Yes | Schedule mode: `seconds`, `minutes`, `hours`, `days`, `weeks`, `months`, `cronExpression` |
| `rule.value` | number | No | Number of intervals (e.g. `5` for every 5 minutes). Not used in cron mode. |
| `rule.cronExpression` | string | No | Standard 5-field cron string (minute hour day month weekday). Used only when `rule.interval=cronExpression`. |
| `timezone` | string | No | Timezone for the schedule. Overrides the instance-level `GENERIC_TIMEZONE` env var for this node. Format: IANA name like `America/New_York`. |

---

## Timezone Handling — Critical

**The Schedule Trigger respects the `GENERIC_TIMEZONE` environment variable, not the system timezone.**

If `GENERIC_TIMEZONE` is not set on the n8n instance, all schedules default to UTC regardless of the server's local timezone. This is the most common cause of off-by-hour misfires (e.g. a "9 AM daily report" triggers at 2 AM local time on a UTC-7 server).

Resolution order for timezone:
1. The `timezone` parameter on the node itself (highest priority)
2. The `GENERIC_TIMEZONE` environment variable on the n8n instance
3. UTC (default fallback)

**Verification**: to check what timezone the instance is using, call `GET /api/v1/settings` — the response includes `timezone`.

---

## DST Behavior

Cron expressions like `0 2 * * *` ("2 AM every day") will behave unexpectedly on Daylight Saving Time boundary nights:

- **Spring forward** (clocks skip from 1:59 to 3:00): the 2 AM execution is skipped entirely — the trigger misses that day.
- **Fall back** (clocks repeat 1:00–2:00): the 2 AM expression may fire twice.

To avoid DST issues:
- Schedule at times far from the 2 AM boundary (midnight, 3 AM, 6 AM, etc.)
- Use UTC-based schedules and accept that the local-time appearance shifts by 1 hour twice a year
- For precision-critical schedules, use interval mode (e.g. every 24 hours from last run) instead of cron

---

## Interval Mode vs Cron Mode

| Feature | Interval Mode | Cron Mode |
|---------|--------------|-----------|
| Syntax | Simple number + unit | 5-field cron string |
| "Weekdays only" | Not possible | `0 9 * * 1-5` |
| "First Monday of month" | Not possible | `0 9 * * 1#1` (some parsers) |
| "Every 90 seconds" | Yes (`90` seconds) | Not possible |
| Human error risk | Low | High (cron typos are silent) |

Use interval mode for simple periodic tasks. Use cron mode when you need day-of-week or specific hour constraints.

---

## Catch Up Setting

The **Catch Up** option controls what happens when n8n restarts after downtime:

- **Catch Up disabled (default)**: Missed executions during downtime are permanently skipped. The trigger resumes from the next scheduled time after restart.
- **Catch Up enabled**: On restart, n8n fires once for each missed schedule window. For a workflow that runs every 5 minutes and n8n was down for an hour, this triggers 12 immediate back-to-back executions.

**Warning**: Catch Up on workflows that call external APIs or write to databases can cause duplicate records or rate-limit bursts. Only enable Catch Up for idempotent workflows where replaying missed runs is safe.

---

## Execution Mode Detection

To determine whether a workflow run was triggered by the Schedule Trigger (as opposed to a manual run or webhook), inspect the execution entity:

- `mode` field = `"trigger"` for scheduled executions
- `mode` field = `"manual"` for runs started from the n8n UI via "Execute Workflow"

The output item from the trigger contains:
```json
{
  "timestamp": "2026-05-07T09:00:00.000Z",
  "Readable date": "May 7, 2026 9:00:00 AM",
  "Readable time": "9:00:00 AM",
  "Day of week": "Wednesday",
  "Year": "2026",
  "Month": "May",
  "Day of month": "7",
  "Hour": "9",
  "Minute": "0",
  "Second": "0",
  "Timezone": "UTC"
}
```

---

## Common Failure Modes

**Trigger fires but no execution is created (silent miss)**
- Cause: the workflow is inactive. Schedule triggers only fire when the workflow is in Active state. In the n8n UI, inactive workflows display a toggle set to off.
- Detection: query `GET /api/v1/workflows/{id}` and check `active: false`. No execution records will exist for the missed time windows.
- Fix: activate the workflow.

**Trigger fires at wrong time (off-by-N-hours)**
- Cause: `GENERIC_TIMEZONE` not set; schedule interpreted in UTC while operator expects local time.
- Detection: compare `startedAt` timestamps in execution records against expected local schedule times.
- Fix: set `GENERIC_TIMEZONE` env var on the n8n instance or set the `timezone` parameter on the node directly.

**Workflow appears to run correctly but produces stale data**
- Cause: cron expression is correct but fires at a time when the upstream data source hasn't refreshed yet (e.g. pulling reports before a nightly data pipeline completes).
- Detection: no execution error — output data is valid but outdated.
- Fix: adjust cron to fire after the upstream system's completion window.

**DST double-fire or skip**
- Cause: cron set to `0 2 * * *` in a timezone that observes DST.
- Detection: count executions on DST boundary dates — you will see 0 or 2 instead of 1.
- Fix: reschedule to a DST-safe hour or switch to UTC.

---

## How to Check for Missed Fires

Compare `last execution startedAt` against the expected schedule:

```javascript
// In a monitoring workflow (Code node):
const workflowId = "abc123";
const expectedIntervalMs = 60 * 60 * 1000; // every 1 hour
const lastStartedAt = new Date($json.lastExecution.startedAt);
const now = new Date();
const msSinceLastRun = now - lastStartedAt;

if (msSinceLastRun > expectedIntervalMs * 1.5) {
  // Workflow has missed at least one expected fire
  return [{ json: { alert: true, missedMs: msSinceLastRun } }];
}
```

Use the n8n API endpoint `GET /api/v1/executions?workflowId={id}&status=success&limit=1` to retrieve the most recent successful execution.

---

## Monitoring Signals

| Signal | Meaning |
|--------|---------|
| `active=false` on a workflow that should be scheduled | All future fires are silently blocked |
| Last execution `startedAt` is more than `1.5 × interval` ago | Likely missed fire — check instance health and active state |
| Execution `mode=manual` in a supposed scheduled run | Someone ran it manually; schedule execution may still be pending |
| Execution count on a DST boundary date is 0 or 2 | DST skip or double-fire |
| `status=error` on schedule executions | Downstream node failure; trigger itself succeeded but workflow failed |

---

## Integration with Other Nodes

```
Schedule Trigger (0 8 * * 1-5 — weekdays 8 AM)
  → HTTP Request (fetch daily report from source API)
  → Filter (drop records with status=inactive)
  → Google Sheets (append rows to report sheet)
  → Send Email (summary to stakeholders)
```

For rate-limited bulk operations triggered by a schedule:

```
Schedule Trigger (every 1 hour)
  → Postgres (SELECT records WHERE processed=false LIMIT 500)
  → Split In Batches (batchSize: 10)
    → [output] HTTP Request (process each batch)
    → Wait (1 second between batches)
  → [done] Set (mark run complete)
```

---

## Important Gotchas

1. **No retry on failure**: If a downstream node errors, the Schedule Trigger does not automatically re-run. The next scheduled execution fires at the next time slot, potentially skipping the failed data window. Implement error branches with alerting.
2. **"Execute Workflow" button runs in manual mode**: Clicking the run button in the n8n editor uses `mode=manual`, not `mode=trigger`. Any logic gated on execution mode will behave differently. Use for testing only.
3. **Cron 5-field format**: n8n uses standard 5-field cron (minute, hour, day-of-month, month, day-of-week). It does not support the 6-field format with seconds. Use interval mode (`seconds`) for sub-minute scheduling.
4. **Multiple triggers**: A single workflow cannot have multiple Schedule Triggers. If you need two different schedules, create two separate workflows.
5. **Workflow deactivated after error**: n8n does NOT deactivate workflows on error — the schedule continues firing. However, some operators configure external monitoring to deactivate workflows after N consecutive failures, which causes silent misses.
