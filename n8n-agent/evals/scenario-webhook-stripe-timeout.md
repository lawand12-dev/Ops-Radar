---
scenario_id: webhook-stripe-timeout
domain: timeout
difficulty: medium
ground_truth_label: timeout.webhook-caller
ground_truth_action: notify-human
created: 2026-05-07
provenance: synthetic — based on Stripe webhook reliability docs (10 s timeout, 3-day retry schedule) and n8n community reports of duplicate HubSpot deals from Stripe retries
---

# Scenario: Stripe payment webhook times out, retries, and creates duplicate HubSpot deals

A Stripe payment webhook workflow processes `payment_intent.succeeded` events. The workflow creates a HubSpot deal, updates an Airtable record, and sends a Slack notification. Average execution time: 12 seconds. The workflow itself completes successfully from n8n's perspective. However, Stripe marks the webhook deliveries as `failed` (Stripe times out at 10 seconds) and retries each event — creating a duplicate HubSpot deal per Stripe retry. The customer reports that deals are being created twice or three times in HubSpot. n8n shows the executions as `success`. There is no error in n8n at all.

## Inputs

### `execution_row`

```json
{
  "id": "exec_stripe_wh_2026_05_07_143801",
  "workflowId": "wf_stripe_payment_processor",
  "mode": "webhook",
  "status": "success",
  "finished": true,
  "startedAt": "2026-05-07T14:38:01Z",
  "stoppedAt": "2026-05-07T14:38:13Z",
  "waitTill": null,
  "retryOf": null
}
```

### `execution_data` (subset of `data.resultData`)

```json
{
  "lastNodeExecuted": "Slack — Notify Team",
  "error": null,
  "runData": {
    "Stripe Webhook": [
      {
        "executionTime": 14,
        "data": {
          "main": [[{
            "json": {
              "type": "payment_intent.succeeded",
              "id": "evt_3PkQrR2eZvKYlo2C1A2B3C4D",
              "data": {
                "object": {
                  "id": "pi_3PkQrR2eZvKYlo2C0Z9Y8X7W",
                  "amount": 249900,
                  "currency": "usd",
                  "customer": "cus_Qx7mN3kLpR2sT1v",
                  "metadata": { "crm_deal_id": "deal_88821", "account_id": "acc_5512" }
                }
              },
              "livemode": true
            }
          }]]
        }
      }
    ],
    "HubSpot — Create Deal": [
      {
        "executionTime": 4219,
        "data": {
          "main": [[{
            "json": {
              "id": "hs_deal_7710293",
              "properties": {
                "dealname": "Payment — acc_5512 — $2,499.00",
                "amount": "2499.00",
                "dealstage": "closedwon",
                "stripe_payment_intent_id": "pi_3PkQrR2eZvKYlo2C0Z9Y8X7W"
              }
            }
          }]]
        }
      }
    ],
    "Airtable — Update Payment Record": [
      {
        "executionTime": 3887,
        "data": { "main": [[{ "json": { "id": "rec_9Xy3kLmN", "fields": { "Status": "Paid", "PaymentIntentId": "pi_3PkQrR2eZvKYlo2C0Z9Y8X7W" } } }]] }
      }
    ],
    "Slack — Notify Team": [
      {
        "executionTime": 3741,
        "data": { "main": [[{ "json": { "ok": true, "ts": "1746625093.000200", "channel": "C08XPAY9GTR" } }]] }
      }
    ]
  }
}
```

### `workflow_definition` (relevant slice)

```json
{
  "id": "wf_stripe_payment_processor",
  "name": "Stripe Payment → HubSpot + Airtable + Slack",
  "active": true,
  "nodes": [
    {
      "name": "Stripe Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "stripe-payment-succeeded",
        "responseMode": "lastNode",
        "options": {}
      },
      "webhookId": "wh_n8n_stripe_prod_abc123"
    },
    {
      "name": "HubSpot — Create Deal",
      "type": "n8n-nodes-base.hubspot",
      "parameters": {
        "resource": "deal",
        "operation": "create",
        "dealName": "Payment — {{ $json.data.object.metadata.account_id }} — {{ $json.data.object.amount / 100 | currency }}",
        "additionalFields": {
          "amount": "={{ $json.data.object.amount / 100 }}",
          "dealstage": "closedwon",
          "stripe_payment_intent_id": "={{ $json.data.object.id }}"
        }
      }
    },
    {
      "name": "Airtable — Update Payment Record",
      "type": "n8n-nodes-base.airtable",
      "parameters": {
        "operation": "update",
        "baseId": "appW4Kx9rL3mN7vQ",
        "tableId": "tblPayments",
        "id": "={{ $json.data.object.metadata.crm_deal_id }}"
      }
    },
    {
      "name": "Slack — Notify Team",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "operation": "post",
        "channel": "C08XPAY9GTR",
        "text": "Payment received: ${{ $json.data.object.amount / 100 }} from {{ $json.data.object.customer }}"
      }
    }
  ],
  "settings": {
    "timezone": "UTC",
    "executionTimeout": 60
  },
  "tags": ["revenue:true", "caller:stripe"],
  "versionId": "v_2026-03-18-2"
}
```

### `metrics_snapshot`

```json
{
  "workflow_runtime_distribution_last_100_executions": {
    "p50_seconds": 11.4,
    "p75_seconds": 12.8,
    "p95_seconds": 14.9,
    "p99_seconds": 17.2,
    "max_seconds": 22.1
  },
  "stripe_webhook_caller_timeout_seconds": 10,
  "executions_last_24h": 31,
  "executions_last_24h_status_breakdown": {
    "success": 31,
    "error": 0,
    "crashed": 0
  }
}
```

### `external_signals`

```json
{
  "tags_on_workflow": ["revenue:true", "caller:stripe"],
  "stripe_dashboard_signals": {
    "endpoint_url": "https://n8n.agency.io/webhook/stripe-payment-succeeded",
    "endpoint_status": "disabled",
    "disable_reason": "too_many_failures",
    "recent_deliveries": [
      { "event_id": "evt_3PkQrR2eZvKYlo2C1A2B3C4D", "created": "2026-05-07T14:38:01Z", "status": "failed", "http_status": null, "response_duration_ms": null, "error": "Request timeout" },
      { "event_id": "evt_3PkQrR2eZvKYlo2C1A2B3C4D", "created": "2026-05-07T14:48:01Z", "status": "failed", "http_status": null, "response_duration_ms": null, "error": "Request timeout", "attempt": 2 },
      { "event_id": "evt_3PkQrR2eZvKYlo2C1A2B3C4D", "created": "2026-05-07T15:08:01Z", "status": "failed", "http_status": null, "response_duration_ms": null, "error": "Request timeout", "attempt": 3 },
      { "event_id": "evt_3PkNmL2eZvKYlo2C5D6E7F8", "created": "2026-05-07T11:22:14Z", "status": "failed", "http_status": null, "response_duration_ms": null, "error": "Request timeout" },
      { "event_id": "evt_3PkNmL2eZvKYlo2C5D6E7F8", "created": "2026-05-07T11:32:14Z", "status": "failed", "http_status": null, "response_duration_ms": null, "error": "Request timeout", "attempt": 2 }
    ],
    "total_failed_deliveries_last_24h": 9,
    "total_events_last_24h": 5
  },
  "hubspot_duplicate_deals_detected": {
    "pi_3PkQrR2eZvKYlo2C0Z9Y8X7W": ["hs_deal_7710293", "hs_deal_7710601", "hs_deal_7711044"],
    "pi_3PkNmL2eZvKYlo2C4W5X6Y7Z": ["hs_deal_7698122", "hs_deal_7698543"]
  },
  "n8n_executions_for_stripe_event_evt_3PkQrR2eZvKYlo2C1A2B3C4D": [
    { "executionId": "exec_stripe_wh_2026_05_07_143801", "status": "success", "startedAt": "2026-05-07T14:38:01Z" },
    { "executionId": "exec_stripe_wh_2026_05_07_144801", "status": "success", "startedAt": "2026-05-07T14:48:02Z" },
    { "executionId": "exec_stripe_wh_2026_05_07_150801", "status": "success", "startedAt": "2026-05-07T15:08:03Z" }
  ],
  "webhook_node_responseMode": "lastNode",
  "idempotency_key_check_in_workflow": false
}
```

### `prior_failures` (last 24 h, same workflow)

```json
[]
```

## Expected output

```yaml
expected_label:           timeout.webhook-caller
expected_subtype:         stripe-caller-timeout
expected_confidence:      high
expected_action:          notify-human
expected_evidence_keys:
  - webhook_node_responseMode
  - stripe_webhook_caller_timeout_seconds
  - workflow_runtime_distribution_last_100_executions.p50_seconds
  - stripe_dashboard_signals.endpoint_status
  - stripe_dashboard_signals.recent_deliveries
  - hubspot_duplicate_deals_detected
  - n8n_executions_for_stripe_event_evt_3PkQrR2eZvKYlo2C1A2B3C4D
  - idempotency_key_check_in_workflow
  - executions_last_24h_status_breakdown
expected_case_loaded:     cases/webhook-timeout
forbidden_actions:
  - auto-retry              # the workflow succeeded; there is nothing to retry in n8n — the problem is that Stripe is retrying because it never received a timely response; issuing an n8n retry would add a fourth execution and a fourth HubSpot deal
  - auto-cancel-replay      # same issue as auto-retry — replaying adds more executions; the root problem is Stripe's timeout, not an n8n failure
```

## Grading notes

The agent should:

1. Recognize that `execution_row.status = "success"` and `error = null` — n8n reports no failure. This is the scenario's core diagnostic challenge: the signal that something is wrong comes entirely from `external_signals`, not from the n8n execution log. The agent must synthesize the cross-platform picture.

2. Walk `decision-trees/failure-diagnosis` via the external-signal path: `stripe_dashboard_signals.endpoint_status = "disabled"` with `disable_reason = "too_many_failures"` AND `stripe_dashboard_signals.recent_deliveries[*].error = "Request timeout"`. The case file states: "This case is unusual because n8n itself often shows the execution as `success`. The failure is observed **outside** n8n: the caller reports that the webhook delivery took too long." The entry point to `timeout.webhook-caller` is the Stripe dashboard signal, not the n8n error log.

3. Load `cases/webhook-timeout`. Under **Signals — what to check**, item 1: read `parameters.responseMode`. The workflow_definition shows `"responseMode": "lastNode"` — the default. Per the case file: "`lastNode` (default) → n8n runs the whole workflow before responding. Long workflows = caller timeouts." Combined with `webhook_node_responseMode = "lastNode"` in `external_signals`, this confirms the misconfiguration.

4. Confirm the timing gap. `metrics_snapshot.workflow_runtime_distribution_last_100_executions.p50_seconds = 11.4`, `p95_seconds = 14.9`. `stripe_webhook_caller_timeout_seconds = 10`. p50 (the median execution) already exceeds Stripe's timeout. This is not a rare p99 edge case — more than half of all executions time out Stripe. Per the case file's table: "Stripe → 10 s (then retry up to 3 days exponential)."

5. Quantify the damage. `hubspot_duplicate_deals_detected` shows 3 duplicate deals for payment intent `pi_3PkQrR2eZvKYlo2C0Z9Y8X7W` (3 executions → 3 deals) and 2 duplicate deals for `pi_3PkNmL2eZvKYlo2C4W5X6Y7Z`. Per the `n8n_executions_for_stripe_event` array: all 3 executions of the same Stripe event ID succeeded — n8n ran the workflow 3 times for the same event and created a HubSpot deal each time. The `idempotency_key_check_in_workflow = false` confirms no deduplication guard exists.

6. Note that the Stripe endpoint is now **disabled** (`endpoint_status = "disabled"`, `disable_reason = "too_many_failures"`). Stripe disables endpoints that repeatedly fail. Future payment events will not be delivered until the endpoint is re-enabled. This is an urgent operational issue beyond the duplicate deals.

7. Choose `notify-human` because the fix requires two engineering actions the agent cannot auto-apply: (a) change `responseMode` from `"lastNode"` to `"onReceived"` in the Webhook trigger node and add a `Respond to Webhook` node that immediately returns `200 OK` to Stripe; (b) add an idempotency key check (use Stripe's `event.id` as the idempotency key, check against a Postgres or Redis store before running downstream nodes). Per the case file: "Workflow-config change is not auto-applied; agent recommends and gets human approval."

8. Compose an alert that names: the root cause (`responseMode=lastNode` on a Stripe webhook with p50 runtime 11.4 s, Stripe timeout 10 s), the immediate damage (5 HubSpot deals created as duplicates, specific deal IDs listed), the urgency (Stripe endpoint is disabled — no new payment events will be processed until fixed), the two-part fix (responseMode + idempotency key), and the customer-facing instructions for re-enabling the Stripe endpoint after the fix is deployed.

**Common LLM mistakes on this scenario:**

- **Diagnosing as `data.duplicate-record` because of the duplicate HubSpot deals.** The duplicate deals are the symptom, not the cause. A model that keys on `hubspot_duplicate_deals_detected` and loads `cases/hubspot-duplicate-contact` will recommend switching to `createOrUpdate` on the HubSpot node — which is wrong because HubSpot Deal objects have no native upsert, and more importantly, this does not stop Stripe from re-delivering the event. Even if the HubSpot node were idempotent, Stripe would still retry because it never receives a timely HTTP response. The root cause is `responseMode=lastNode` causing Stripe caller timeouts. Fix the responseMode first; the duplicate-deal cleanup is a remediation task, not the diagnosis.

- **Recommending `auto-retry` because n8n shows `status=success` and the agent interprets the Stripe retries as the customer's desired behavior.** A model that does not synthesize the Stripe dashboard signal with the n8n execution log will see a successful execution and conclude there is nothing to fix. The agent must integrate external_signals as first-class inputs, not treat n8n's own execution status as the sole source of truth. When `external_signals.stripe_dashboard_signals.endpoint_status = "disabled"` and `recent_deliveries[*].error = "Request timeout"`, the scenario is a webhook timeout even if n8n says success.

- **Diagnosing as `ratelimit` because Stripe made multiple delivery attempts.** Stripe's retry behavior is not rate-limit throttling — it is a reliability mechanism triggered by timeout, not by 429 responses. The `recent_deliveries` all show `http_status: null` (no HTTP response was received before the 10-second timeout). A 429 rate-limit response from the n8n server would have `http_status: 429`. Null HTTP status = timeout, not rate limit.

- **Missing that Stripe's endpoint is disabled.** The scenario includes `endpoint_status: "disabled"` as a critical urgency signal. An agent that focuses only on the duplicate-deals problem and omits the endpoint-disabled status will fail to communicate that no future Stripe payment events will be delivered until the endpoint is re-enabled — a revenue-critical oversight. The `revenue:true` tag on the workflow should trigger the agent to escalate urgency and check the full external signals set.

- **Recommending only `responseMode = onReceived` without the idempotency key fix.** Switching to `onReceived` stops Stripe from timing out and retrying — it prevents new duplicates going forward. But it does not prevent duplicates if another future event triggers two concurrent deliveries (network flap, Stripe double-fire). The case file explicitly states: "Always include an idempotency-key check at the top of webhook workflows. Caller redeliveries are routine, not exceptional." A complete fix requires both changes. An agent that recommends only the responseMode change passes the primary diagnosis but produces an incomplete fix recommendation — penalized on evidence_keys_present.

- **Recommending `auto-cancel-replay` to clean up the duplicate executions.** The 3 duplicate executions already completed successfully — the HubSpot deals are already created. Canceling them in n8n after the fact has no effect on HubSpot (n8n cannot undo a deal creation by stopping a completed execution). The duplicates must be cleaned up in HubSpot directly, by engineering. The agent should surface the duplicate deal IDs in its report, not attempt a cancellation that has no remedial effect.

## Variants worth adding later

- Shopify webhook variant — Shopify times out at 5 s (stricter than Stripe) and disables the endpoint after 19 consecutive failures. Same responseMode misconfiguration, different urgency window and disable threshold.
- Queue saturation variant — the workflow itself is fast (p95 = 2 s) but the Stripe webhook is queued behind 40 other running jobs; n8n doesn't even start processing until 15 s after Stripe delivers. The root cause is queue depth, not workflow runtime. Signal: `n8n_queue_jobs_waiting > 30` at delivery time.
- Stripe double-fire variant — Stripe sends the same event twice within 1 ms (documented Stripe edge case); even with `responseMode=onReceived`, two concurrent executions race. The fix is the idempotency-key Redis/Postgres guard, not the responseMode change.
