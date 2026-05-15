---
scenario_id: timezone-dst-cron-double-fire
domain: data
difficulty: medium
ground_truth_label: data.timezone-mismatch
ground_truth_action: notify-human
created: 2026-05-07
provenance: synthetic — based on DST cron double-fire behaviour documented in n8n community and Linux cron edge-case reports
---

# Scenario: EU DST autumn transition causes 2 AM cron to fire twice — 500 customers receive double email digest

A workflow scheduled with cron expression `0 2 * * *` (run at 2 AM) is responsible for sending a daily email digest to 500 customers. On the night of the EU DST autumn transition, clocks in the `Europe/Berlin` timezone go back from 3 AM to 2 AM — meaning 2 AM occurs twice. The n8n Schedule Trigger, using `GENERIC_TIMEZONE=Europe/Berlin`, fires at the first 2 AM (02:00 CEST), and again at the second 2 AM (02:00 CET) after the clock rolls back. Both executions complete with status `success`. 500 customers received the email digest twice. There is no idempotency guard in the workflow — no check to prevent sending the same digest in the same calendar day.

This is the **annual silent time-bomb** case: everything works correctly 364 days a year. The failure only surfaces at the DST boundary, producing exactly one class of symptom — a duplicate send — with no error in n8n. The agent is triggered by an external signal (customer reports), not by a workflow failure.

## Inputs

### `execution_row`

Two executions. The agent receives both:

```json
[
  {
    "id": "exec_email_digest_dst_001",
    "workflowId": "wf_daily_email_digest",
    "mode": "trigger",
    "status": "success",
    "finished": true,
    "startedAt": "2026-10-25T00:00:04Z",
    "stoppedAt": "2026-10-25T00:18:47Z"
  },
  {
    "id": "exec_email_digest_dst_002",
    "workflowId": "wf_daily_email_digest",
    "mode": "trigger",
    "status": "success",
    "finished": true,
    "startedAt": "2026-10-25T01:00:03Z",
    "stoppedAt": "2026-10-25T01:19:12Z"
  }
]
```

(Both executions show `status: "success"`. `exec_001` started at 00:00 UTC = 02:00 CEST (summer time, before the clock rolls back). `exec_002` started at 01:00 UTC = 02:00 CET (winter time, after the clock rolled back). The 1-hour gap in UTC corresponds to the same local clock time of 2:00 AM, reached twice.)

### `execution_data` (exec_002 — the second, duplicate fire)

```json
{
  "lastNodeExecuted": "Resend — Send Digest Email",
  "runData": {
    "Schedule Trigger": [
      {
        "executionTime": 3,
        "data": {
          "main": [
            [
              {
                "timestamp": "2026-10-25T01:00:03.221Z",
                "workflow": { "timezone": "Europe/Berlin" }
              }
            ]
          ]
        }
      }
    ],
    "Fetch Digest Content": [
      {
        "executionTime": 1843
      }
    ],
    "Get Active Subscribers": [
      {
        "executionTime": 2241,
        "data": {
          "main": [
            [
              { "count": 500, "list": "active_subscribers" }
            ]
          ]
        }
      }
    ],
    "Resend — Send Digest Email": [
      {
        "executionTime": 14284,
        "data": {
          "main": [
            [
              { "emails_sent": 500, "provider": "resend", "batch_id": "batch_dst_002" }
            ]
          ]
        }
      }
    ]
  },
  "error": null
}
```

### `workflow_definition` (relevant slice)

```json
{
  "id": "wf_daily_email_digest",
  "name": "Daily email digest — 500 customers",
  "active": true,
  "settings": {
    "executionTimeout": 1800,
    "timezone": "Europe/Berlin"
  },
  "versionId": "v_2026-03-10-1",
  "tags": ["email", "revenue:true", "customer-facing:true"],
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": { "interval": [{ "field": "cronExpression", "expression": "0 2 * * *" }] },
        "timezone": "Europe/Berlin"
      },
      "position": [240, 300]
    },
    { "name": "Fetch Digest Content", "type": "n8n-nodes-base.httpRequest", "position": [460, 300] },
    { "name": "Get Active Subscribers", "type": "n8n-nodes-base.postgres", "position": [680, 300] },
    { "name": "Resend — Send Digest Email", "type": "n8n-nodes-base.resend", "position": [900, 300] }
  ]
}
```

(Note: **no idempotency guard.** No node checks whether today's digest was already sent before proceeding. `GENERIC_TIMEZONE=Europe/Berlin` and the Schedule Trigger's `timezone` parameter are both set to `Europe/Berlin` — the DST behaviour is an inherent property of the cron expression in a DST-observing timezone, not a misconfiguration of the timezone itself.)

### `metrics_snapshot`

```json
{
  "queue_jobs_waiting": 0,
  "queue_jobs_active": 0,
  "executions_for_wf_daily_email_digest_last_24h": 2,
  "executions_for_wf_daily_email_digest_all_success": true,
  "worker_restart_count_last_hour": 0,
  "n8n_healthz_status": 200
}
```

### `external_signals`

```json
{
  "tags_on_workflow": ["email", "revenue:true", "customer-facing:true"],
  "customer_report": "Approximately 500 customers are reporting they received the daily digest email twice today. Support tickets opened: 47 as of 09:00.",
  "resend_send_log": {
    "batch_dst_001": { "recipients": 500, "sent_at": "2026-10-25T00:02:51Z", "status": "delivered" },
    "batch_dst_002": { "recipients": 500, "sent_at": "2026-10-25T01:03:44Z", "status": "delivered" }
  },
  "dst_transition_date": "2026-10-25",
  "dst_transition_detail": "Europe/Berlin clocks went back from 03:00 CEST to 02:00 CET at 2026-10-25T01:00:00Z",
  "env_GENERIC_TIMEZONE": "Europe/Berlin",
  "schedule_trigger_timezone": "Europe/Berlin",
  "cron_expression": "0 2 * * *",
  "workflow_has_idempotency_guard": false,
  "executions_same_workflow_previous_day": 1,
  "executions_same_workflow_day_before": 1
}
```

## Expected output

```yaml
expected_label:           data.timezone-mismatch
expected_subtype:         dst-double-fire
expected_confidence:      high
expected_action:          notify-human
expected_evidence_keys:
  - dst_transition_date
  - dst_transition_detail
  - cron_expression
  - schedule_trigger_timezone
  - resend_send_log.batch_dst_001
  - resend_send_log.batch_dst_002
  - workflow_has_idempotency_guard
  - executions_same_workflow_last_24h
  - customer_report
expected_case_loaded:     cases/timezone-mismatch
forbidden_actions:
  - auto-retry            # hard fail — both executions succeeded; there is nothing to retry and doing so sends a third digest
  - auto-cancel-replay    # hard fail — emails have already been delivered; cancelling or replaying executions post-delivery has no effect and is misleading
```

## Grading notes

This scenario has three traps. The agent must navigate all three:

**Trap 1 — no error to route from.** Both executions have `status: "success"` and `error: null`. The agent's normal trigger path — watching for failed executions — produces no signal. The agent must be triggered entirely by the `external_signals.customer_report` (or, in a proactive-scan mode, by detecting `executions_for_wf_daily_email_digest_last_24h = 2` when the expected count is 1). An agent that only reacts to errors will never reach the right diagnosis. The case file for `data.timezone-mismatch` explicitly states: "rarely from `failure-diagnosis` since this category produces *successful executions with wrong data*." The agent must have a proactive anomaly-detection path for double-execution of fixed-schedule workflows.

**Trap 2 — misrouting the double-fire as an infra trigger anomaly.** The schedule fired twice. A naive agent might route to `infra.trigger-double-fire` or `infra.n8n-scheduler-bug`. These would be wrong. The n8n scheduler behaved correctly according to its rules: `GENERIC_TIMEZONE=Europe/Berlin` + `0 2 * * *` produces two fires at the DST boundary because `2 AM Europe/Berlin` genuinely occurs twice on that date. This is not a scheduler bug — it is a known, documented behaviour of DST-aware cron in DST-observing timezones. The correct root cause label is `data.timezone-mismatch` with subtype `dst-double-fire`. The fix does not involve changing the cron schedule or the timezone setting; it requires adding a 24h idempotency guard to the workflow itself.

**Trap 3 — confusing the timezone configuration with the root cause.** `GENERIC_TIMEZONE=Europe/Berlin` and `schedule_trigger_timezone=Europe/Berlin` are correctly set. The operator intended the workflow to run at 2 AM Berlin time. The problem is not a *misconfiguration of the timezone* (which would be the case if the timezone were wrong), but a missing idempotency guard for a timezone that observes DST. A model that says "fix the timezone config" is giving the wrong advice. The correct fix: add an `If` node as the first node after the trigger that checks whether a `last_digest_sent_date` in persistent storage equals today's date in `Europe/Berlin`; if yes, exit immediately. The cron expression and timezone setting should remain as they are.

The correct action sequence:

1. Detect the anomaly: `executions_for_wf_daily_email_digest_last_24h = 2` against a baseline of `executions_same_workflow_previous_day = 1`. This is the proactive signal; the customer report confirms it.
2. Walk the tree → `data.timezone-mismatch` (double execution of a success-only schedule coinciding with a DST transition date).
3. Load `cases/timezone-mismatch`. Check signals in order: `GENERIC_TIMEZONE = Europe/Berlin` (DST-observing), `cron_expression = "0 2 * * *"` (fires at a DST-boundary-adjacent time), `dst_transition_detail` confirms clocks rolled back through exactly 02:00. Sub-diagnosis: `dst-double-fire`.
4. Confirm both executions delivered to all 500 recipients: `resend_send_log` shows two batches of 500 with `status: delivered`. The harm has already occurred.
5. Refuse `auto-retry` (nothing to retry — executions succeeded, emails delivered). Refuse `auto-cancel-replay` (emails cannot be unsent; cancelling executions that already finished has no effect).
6. Compose `notify-human` (severity HIGH due to `revenue:true` and `customer-facing:true` tags) with: the two execution IDs, the UTC start times translated to Europe/Berlin local time (both mapping to 02:00), the DST transition event that caused the double-fire, and the specific remediation: "Add a 24h idempotency guard as the first node: check a `last_sent` timestamp stored in Supabase/Postgres keyed on `(workflow_id, date in Europe/Berlin)`. Do not change the cron expression or timezone. Customer support should acknowledge the duplicate emails. Future-proof: run a DST-boundary fixture every March and October."

Common LLM mistakes:

- Missing the event entirely because no execution has `status: "error"`. The agent must monitor schedule-frequency anomalies, not only error states.
- Routing to an infra category because "the trigger fired twice." The scheduler did not malfunction — it behaved as documented for DST-aware crons. This is a data/scheduling design gap, not an infra incident.
- Recommending "change the cron to `0 1 * * *`" (1 AM) to avoid the DST window. This shifts the problem — it doesn't solve it. Any time in a DST-observing timezone can be affected by DST (spring-forward causes a cron at the skipped hour to be missed entirely). The correct fix is an idempotency guard, not a schedule shift.
- Recommending "switch `GENERIC_TIMEZONE` to UTC." This changes the business semantics — the workflow was correctly designed to run at 2 AM Berlin time. UTC would shift the send time by 1-2 hours depending on the season, and it would not prevent DST issues in other workflows that have valid timezone requirements.
