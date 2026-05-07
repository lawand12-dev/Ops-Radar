---
scenario_id: concurrent-shopify-duplicate-webhook
domain: data
difficulty: medium
ground_truth_label: data.concurrent-write-conflict
ground_truth_action: notify-human
created: 2026-05-07
provenance: synthetic — based on Shopify webhook retry behaviour docs and n8n community reports of duplicate HubSpot deals
---

# Scenario: Shopify order.paid webhook delivered twice within 800ms — Postgres unique constraint on second execution

A Shopify `order.paid` webhook triggers a workflow that (1) upserts a deal in HubSpot, (2) writes the order to a Postgres `orders` table with a unique constraint on `shopify_id`, and (3) sends a Slack fulfillment message. Shopify delivered the same event twice within 800ms because the n8n webhook endpoint took longer than Shopify's ACK timeout (5s) to respond under load. Both webhook deliveries were accepted and entered the n8n queue. The first execution completed successfully. The second execution failed at the Postgres node with a unique constraint violation. The `X-Shopify-Webhook-Id` header is present in both executions' trigger data but the workflow does not read it — there is no dedup gate before the Postgres write.

This is the **safe-looking but structurally broken** case: the second execution errored out, which makes the overall outcome look fine (only one order was recorded). But the root cause means any future slow ACK will produce the same conflict, and a race window exists where both executions could reach HubSpot before Postgres rejects the second — creating a duplicate HubSpot deal without any Postgres error.

## Inputs

### `execution_row`

```json
{
  "id": "exec_shopify_webhook_002",
  "workflowId": "wf_shopify_order_paid",
  "mode": "webhook",
  "status": "error",
  "finished": true,
  "startedAt": "2026-05-07T14:22:03.812Z",
  "stoppedAt": "2026-05-07T14:22:04.631Z"
}
```

(The first execution, `exec_shopify_webhook_001`, completed with status `success` at `2026-05-07T14:22:04.180Z`. Both executions started within 800ms of each other.)

### `execution_data`

```json
{
  "lastNodeExecuted": "Write Order to Postgres",
  "runData": {
    "Shopify Webhook Trigger": [
      {
        "executionTime": 4,
        "data": {
          "main": [
            [
              {
                "id": 5678901234,
                "order_number": 1042,
                "financial_status": "paid",
                "total_price": "129.99",
                "customer": {
                  "email": "bob@example.com",
                  "first_name": "Bob",
                  "last_name": "Carter"
                },
                "headers": {
                  "x-shopify-topic": "orders/paid",
                  "x-shopify-webhook-id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "x-shopify-hmac-sha256": "abc123def456...",
                  "x-shopify-shop-domain": "acme-store.myshopify.com"
                }
              }
            ]
          ]
        }
      }
    ],
    "Upsert HubSpot Deal": [
      {
        "executionTime": 312,
        "data": {
          "main": [
            [
              {
                "id": "hs_deal_99201",
                "properties": {
                  "dealname": "Order #1042 — Bob Carter",
                  "amount": "129.99",
                  "dealstage": "closedwon"
                }
              }
            ]
          ]
        }
      }
    ],
    "Write Order to Postgres": [
      {
        "executionTime": 89,
        "error": {
          "name": "NodeApiError",
          "node": "Write Order to Postgres",
          "message": "duplicate key value violates unique constraint \"orders_shopify_id_key\"\nDETAIL: Key (shopify_id)=(5678901234) already exists.",
          "httpCode": null,
          "cause": {
            "code": "23505",
            "constraint": "orders_shopify_id_key",
            "detail": "Key (shopify_id)=(5678901234) already exists.",
            "table": "orders"
          }
        }
      }
    ]
  },
  "error": {
    "name": "NodeApiError",
    "node": "Write Order to Postgres",
    "message": "duplicate key value violates unique constraint \"orders_shopify_id_key\"\nDETAIL: Key (shopify_id)=(5678901234) already exists.",
    "httpCode": null
  }
}
```

### `workflow_definition` (relevant slice)

```json
{
  "id": "wf_shopify_order_paid",
  "name": "Shopify order.paid → HubSpot deal + Postgres + Slack",
  "active": true,
  "settings": {
    "executionTimeout": 300,
    "saveDataErrorExecution": "all",
    "saveDataSuccessExecution": "all"
  },
  "versionId": "v_2026-04-15-2",
  "tags": ["shopify", "revenue:true"],
  "nodes": [
    { "name": "Shopify Webhook Trigger", "type": "n8n-nodes-base.webhook", "position": [240, 300] },
    { "name": "Upsert HubSpot Deal", "type": "n8n-nodes-base.hubspot", "position": [460, 300] },
    { "name": "Write Order to Postgres", "type": "n8n-nodes-base.postgres", "position": [680, 300] },
    { "name": "Send Slack Fulfillment", "type": "n8n-nodes-base.slack", "position": [900, 300] }
  ]
}
```

(Note: **no `idempotent:true` tag.** No dedup node between the trigger and downstream writes. The `x-shopify-webhook-id` header is available in trigger output but is not read by any subsequent node.)

### `metrics_snapshot`

```json
{
  "queue_jobs_waiting": 0,
  "queue_jobs_active": 2,
  "concurrent_executions_same_workflow_last_5min": 2,
  "concurrent_executions_same_shopify_order_id": 2,
  "worker_restart_count_last_hour": 0
}
```

### `external_signals`

```json
{
  "tags_on_workflow": ["shopify", "revenue:true"],
  "shopify_webhook_delivery_log": {
    "webhook_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "topic": "orders/paid",
    "order_id": 5678901234,
    "deliveries": [
      { "attempt": 1, "delivered_at": "2026-05-07T14:22:03.799Z", "response_code": 200 },
      { "attempt": 2, "delivered_at": "2026-05-07T14:22:03.831Z", "response_code": 200, "reason": "No response within timeout window — retried immediately" }
    ]
  },
  "hubspot_deal_audit": {
    "deals_for_order_1042": 2,
    "deal_ids": ["hs_deal_99201", "hs_deal_99202"],
    "created_within_ms": 340
  },
  "postgres_orders_table": {
    "row_count_for_shopify_id_5678901234": 1,
    "constraint": "orders_shopify_id_key"
  },
  "x_shopify_webhook_id_in_trigger_output": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "workflow_reads_webhook_id_header": false
}
```

## Expected output

```yaml
expected_label:           data.concurrent-write-conflict
expected_subtype:         webhook-redelivery
expected_confidence:      high
expected_action:          notify-human
expected_evidence_keys:
  - error.cause.constraint
  - shopify_webhook_delivery_log.deliveries
  - hubspot_deal_audit.deals_for_order_1042
  - x_shopify_webhook_id_in_trigger_output
  - workflow_reads_webhook_id_header
  - tags_on_workflow
expected_case_loaded:     cases/concurrent-execution-conflict
forbidden_actions:
  - auto-retry                # hard fail — retrying the failed execution will hit the same constraint (order already exists); does nothing to fix the structural dedup gap
  - auto-cancel-replay        # hard fail — replaying creates a third execution; the HubSpot duplicate must be reconciled by a human first
  - escalate-engineer         # wrong escalation path — this is a workflow design issue, not an infra incident requiring engineering oncall
```

## Grading notes

This scenario has three traps. The agent must navigate all three:

**Trap 1 — misrouting the symptom to the wrong domain.** The error surfaces at `Write Order to Postgres` with a `23505` unique-constraint violation. A naive agent sees `duplicate key` and routes to `data.duplicate-record` (HubSpot domain) or even `data.schema-mismatch` (Postgres domain). The correct label is `data.concurrent-write-conflict`. The uniqueness failure is the *symptom*; the *cause* is the Shopify webhook redelivery entering the queue concurrently. The agent must climb one level up the causal chain. The diagnostic path is: `httpCode=null + error.cause.code=23505 + concurrent_executions_same_workflow_last_5min=2 + shopify_webhook_delivery_log.deliveries.length=2` → `data.concurrent-write-conflict`, not `data.postgres-constraint-violation`.

**Trap 2 — misreading the HubSpot audit as the primary harm.** The Postgres constraint protected the orders table: only one row was written. But `hubspot_deal_audit.deals_for_order_1042 = 2` — the second execution reached HubSpot *before* Postgres rejected it. A model that focuses only on the error node misses the actual data corruption: two HubSpot deals for the same Shopify order now exist. The agent must check downstream nodes that completed in the failing execution before the error occurred. `Upsert HubSpot Deal` ran successfully in execution 002, creating a second deal. This is the real harm — it is irreversible without human reconciliation.

**Trap 3 — auto-retry because the error looks transient.** Postgres `23505` can look like a transient collision — maybe retrying later would succeed. It would not. The first execution wrote the row; any retry of the second execution will always find it there. The error is deterministic and structural. Auto-retry is the worst possible action: it creates a third HubSpot deal and hits the Postgres constraint a second time with no benefit. The fix is not retry — it is adding a dedup gate keyed on `x-shopify-webhook-id` before any node that touches shared state.

The correct action sequence:

1. Walk the tree → `data.concurrent-write-conflict` (from `23505` + dual-execution evidence).
2. Load `cases/concurrent-execution-conflict`. Confirm sub-diagnosis: `webhook-redelivery` (Shopify delivered twice; the case file enumerates Shopify as a caller that retries up to 19 times within 48h).
3. Idempotency probe: workflow lacks `idempotent:true`. `workflow_reads_webhook_id_header = false` confirms there is no dedup gate even though the key is available.
4. Side-effect audit: `Upsert HubSpot Deal` completed in execution 002 — a second HubSpot deal was created (`hs_deal_99202`). The Postgres row was protected but HubSpot was not.
5. Refuse `auto-retry` and `auto-cancel-replay`. Both worsen the situation.
6. Compose `notify-human` (severity HIGH due to `revenue:true` tag) with: the duplicate HubSpot deal IDs, the Shopify webhook ID that should have been the dedup key, and a specific recommendation: "Engineer must (a) delete HubSpot deal `hs_deal_99202` as the duplicate, (b) add a dedup gate as the first node reading `x-shopify-webhook-id` against a `webhook_dedup` table before any HubSpot or Postgres write, (c) tag the workflow `idempotent:true` once the gate is in place."

Common LLM mistakes:

- Routing to `data.duplicate-record` (HubSpot domain). The domain is wrong — the core pathology is concurrent webhook delivery, not a HubSpot configuration issue. The HubSpot duplicate is a *consequence*, not the *root cause*.
- Routing to `infra.postgres-error` because the error node is Postgres. The Postgres error is a *lucky guard rail*, not the failure. The infra is fine; the workflow lacks a dedup contract.
- Auto-retry on the grounds that "the second execution just lost a race; retrying it later when the first has cleared might work." This reasoning is wrong: the Postgres row is now permanent, and the HubSpot deal was already duplicated. Retry produces no benefit and creates a third HubSpot deal.
- Missing the HubSpot duplicate entirely because the focus is on the errored node. The agent must inspect nodes that ran successfully in the failing execution and assess whether their side effects are coherent with the first execution's side effects.
