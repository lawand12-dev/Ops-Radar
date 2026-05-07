# Case: Timezone mismatch

**Type:** Labeled failure case
**Diagnosis label:** `data.timezone-mismatch`
**Routes from:** External signal (customer reports "report shifted by one day", "scheduled email arrived at wrong local time", "yesterday's spend in today's report") OR proactive scan (records placed in wrong day-bucket); rarely from `failure-diagnosis` since this category produces *successful executions with wrong data*
**Auto-handle safety:** Never auto-fix. Time math errors require domain context (which tz the customer expects). Agent's job is detection + escalation. Auto-retry never helps — the same wrong tz produces the same wrong answer.
**Updated:** 2026-05-07

## Input — what the error looks like

This case is a **silent failure** — n8n's execution row says `success`. The error is in the data:

- A "yesterday's revenue" report shows ad spend that includes the first 8 hours of today (UTC report on a Pacific-timezone account).
- A scheduled email designed to send "Monday morning" arrives at 11 PM Sunday for users in Asia.
- A Google Ads `LAST_7_DAYS` filter at midnight UTC includes 8 hours that the Google Ads account considers Sunday.
- A `Wait until 9 AM` workflow fires at 9 AM UTC instead of 9 AM customer-local — because the Schedule Trigger doesn't have a timezone set.
- DST transition: a `0 9 * * *` cron fires at 8 AM (autumn) or 10 AM (spring) instead of 9 AM, for a week, every year.

The agent's input is therefore a **discrepancy report**, not an n8n error:

```jsonc
{
  "signal": "destination_count_mismatch",
  "workflow_id": "...",
  "expected_count": 432,
  "actual_count": 451,
  "expected_window": "2026-05-06 00:00 to 2026-05-07 00:00 America/Los_Angeles",
  "actual_window_observed": "2026-05-06 00:00 to 2026-05-07 00:00 UTC"
}
```

## Signals — what to check

1. **n8n instance timezone.** Env `GENERIC_TIMEZONE` (process-wide) and `TZ` (OS-level). If both unset, the container defaults to UTC.
2. **Workflow-level timezone.** `workflow_entity.settings.timezone`. If unset, falls back to `GENERIC_TIMEZONE`. The Schedule Trigger node respects this.
3. **Schedule Trigger node parameter `timezone`.** The node has its own override; if set, beats the workflow setting. Always check this on the failing schedule.
4. **Customer-platform timezone.** Each upstream platform stores dates in its own way:
   | Platform | Default timezone for date filters |
   |---|---|
   | Google Ads | Account timezone (Customer.time_zone) |
   | Meta Marketing | Ad account timezone |
   | GA4 | Property timezone |
   | HubSpot | Portal timezone (`hub_id` config) for activity dates; UTC for record `createdAt` |
   | Shopify | Store timezone |
   | Stripe | UTC (always) |
   | Mailchimp | List timezone for send-time optimization |
5. **Date filter expressions.** In `workflow_entity.nodes`, find the failing filter — common patterns:
   - `LAST_7_DAYS` / `THIS_MONTH` / `YESTERDAY` (Google Ads, Meta) — interpreted **in account tz**
   - `>= NOW() - INTERVAL 1 day` (Postgres) — interpreted in DB tz, usually UTC
   - `new Date()` in Code nodes — interpreted in **process tz** (`TZ` env)
   - `$now`, `$today` n8n expressions — workflow tz
6. **DST transition recency.** Was the failure window crossing a DST transition? US (March 2nd Sun, November 1st Sun), EU (March/October last Sun), most-of-world: no DST. If yes, and a non-DST-aware cron is involved, the issue is DST.
7. **Customer's expected tz.** This is a knowledge gap the agent must hold per-customer (config). "All reports are in customer's local timezone" is a typical agency convention.

## Correct diagnosis — what it actually is

| Sub-diagnosis | Identifier | Severity |
|---|---|---|
| **`GENERIC_TIMEZONE` unset, instance defaults to UTC** | Container `TZ` is unset; workflow tz is unset | High — affects every schedule |
| **Schedule Trigger missing tz override** | `node.parameters.timezone` is empty; workflow tz disagrees with caller's expectation | High — silent for weeks |
| **Date filter in caller's wrong tz** | Google Ads `LAST_7_DAYS` query without account-tz alignment | High — silent data drift |
| **JS `new Date()` in Code node** | Process tz isn't customer tz; off by hours | Medium — workflow code change |
| **DST cron skip / double-fire** | Cron expression in tz with DST; failure window crosses transition | Annual recurrence |
| **String-parsed local date** | `new Date("2026-05-07")` vs `"2026-05-07T00:00:00Z"` — local interpretation | Medium |

## Fix — exact steps to resolve

> **Safety:** No data writes by the agent. Tz fixes require domain knowledge (which tz the customer wants); auto-applying corrections is dangerous.

1. **Identify the misalignment.** Compose:
   - Workflow tz (from `settings.timezone`)
   - Schedule Trigger tz (from node config)
   - Process tz (from `TZ` / `GENERIC_TIMEZONE`)
   - Caller / platform tz (Google Ads, GA4, etc. — the agent reads this from the customer's platform via API where possible)
   - Customer's expected tz (from per-customer config)

   Surface all five to the engineer in the alert. The fix is the engineer aligning them; the agent provides the diff.

2. **Pause the affected schedule** while the engineer assesses. `POST /api/v1/workflows/:id/deactivate`. Better to skip a run than continue producing wrong-tz output.

3. **Recommend the alignment.** For most agency cases:
   - Set `GENERIC_TIMEZONE` to the agency's primary tz.
   - On every Schedule Trigger, set `parameters.timezone` explicitly — don't rely on inheritance.
   - In every date-filter expression for a customer-platform call, use the **platform's account tz**, not n8n's. Compute the local-day boundary and pass an explicit ISO string.
   - In every Code node that does date math, use a tz-aware library (Luxon, `date-fns-tz`) and pass the tz explicitly. Never use bare `new Date()` for business logic.

4. **Reconciliation.** If silent drift has been ongoing, the agent surfaces the affected windows to engineering. Typical reconciliation: re-run the workflow with a **wider window** that overlaps both the wrong and the correct one, and let upsert deduplicate. Requires destination idempotency (`cases/concurrent-execution-conflict` Prevention).

5. **For DST specifically:** the engineer must replace `0 9 * * *` style crons with tz-pinned schedules. n8n's Schedule Trigger handles this if the timezone field is set; manual cron syntax in custom triggers does not.

## Prevention — how to avoid next time

- **Set `GENERIC_TIMEZONE` and `TZ` on every n8n instance.** Defaulting to UTC is fine if everyone agrees on it; defaulting to UTC by accident while the workflows assume local is the entire failure mode.
- **Always set the Schedule Trigger's `timezone` parameter explicitly.** Inheritance is invisible to the next engineer reading the workflow.
- **For each customer-platform date filter, parameterize by account tz.** Don't use `LAST_7_DAYS` literals — compute `[startDate, endDate]` in the account's tz and pass them. Then the same workflow works for accounts in any tz.
- **Tag every workflow with `tz:<iana>`** (e.g. `tz:America/Los_Angeles`) reflecting the assumed business timezone. The agent can flag mismatch when an output crosses the boundary.
- **Reject naked `new Date()` in Code nodes** in code review. Always Luxon `DateTime.now().setZone(tz)` or `date-fns-tz`.
- **Run a DST-boundary fixture twice a year.** A pinned input that lands on the spring-forward and fall-back hour for the configured tz. Catches DST cron bugs before customers do.
- **Store all timestamps in destination as UTC**, render-time-convert to local. The "store local, display local" anti-pattern is unreliable across DST and tz changes.
- **For Google Ads / Meta / GA4 specifically:** read the platform's reported `time_zone` field at workflow start; use it for that platform's date math; never assume.

## Cross-references

`decision-trees/error-classification` (subtype `data.timezone-mismatch`) · `cases/upstream-data-drift` (sister case) · `reference/n8n-production/n8n-monitoring` · `reference/api/api-google-ads` · `reference/api/api-ga4` · `reference/api/api-meta-marketing`
