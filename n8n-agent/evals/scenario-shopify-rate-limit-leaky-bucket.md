---
scenario_id: shopify-rate-limit-leaky-bucket-bulk-update
domain: ratelimit
difficulty: medium
ground_truth_label: ratelimit.shopify-leaky-bucket
ground_truth_action: auto-retry
created: 2026-05-07
provenance: synthetic — based on Shopify REST Admin API leaky bucket throttle documentation and inventory-sync workflow patterns
---

# Scenario: Shopify REST API leaky bucket exhausted during bulk inventory update

A workflow processes a daily inventory update for 1,200 Shopify products, making one REST API call per product. Around product 38, Shopify returns HTTP 429 with the `X-Shopify-Shop-Api-Call-Limit: 40/40` header — the bucket is full. The workflow is tagged `idempotent:true`. The bucket refills at 2 credits/second; the agent must compute the wait from the header, not the default backoff formula.

## Inputs

### `execution_row`

```json
{
  "id": "exec_shopify_bucket_001",
  "workflowId": "wf_shopify_inventory_daily",
  "mode": "trigger",
  "status": "error",
  "finished": true,
  "startedAt": "2026-05-07T02:00:00Z",
  "stoppedAt": "2026-05-07T02:01:09Z",
  "waitTill": null,
  "retryOf": null
}
```

(Duration ≈ 69 seconds. Products 1–37 updated before bucket exhausted.)

### `execution_data` (subset)

```json
{
  "lastNodeExecuted": "Shopify — Update Inventory Level",
  "error": {
    "name": "NodeApiError",
    "message": "Shopify API error: 429 Too Many Requests",
    "httpCode": "429",
    "node": "Shopify — Update Inventory Level",
    "context": {
      "data": {
        "errors": "Throttled"
      },
      "headers": {
        "x-shopify-shop-api-call-limit": "40/40",
        "retry-after": "2.0",
        "content-type": "application/json",
        "x-request-id": "shop_req_a9b2c3d4e5f6"
      }
    }
  },
  "runData": {
    "Schedule Trigger": [
      { "executionTime": 6, "data": { "main": [[{ "timestamp": "2026-05-07T02:00:00Z" }]] } }
    ],
    "Fetch Inventory CSV": [
      { "executionTime": 2341, "data": { "main": [[{ "rowCount": 1200 }]] } }
    ],
    "Split In Batches": [
      { "executionTime": 1, "data": { "main": [[{ "batchSize": 1, "currentIndex": 37 }]] } }
    ],
    "Shopify — Update Inventory Level": [
      {
        "executionTime": 512,
        "data": {
          "main": [[{
            "inventory_item_id": 49125135032345,
            "location_id": 64328319001,
            "available": 14
          }]]
        }
      },
      { "executionTime": 201, "error": "see top-level error" }
    ]
  }
}
```

### `workflow_definition` (relevant slice)

```json
{
  "id": "wf_shopify_inventory_daily",
  "name": "Daily Shopify inventory sync (1,200 SKUs)",
  "active": true,
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": { "rule": { "interval": [{ "field": "hours", "hoursInterval": 24 }] } }
    },
    {
      "name": "Fetch Inventory CSV",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": { "url": "https://internal-erp.acme.com/inventory-export.csv", "method": "GET" }
    },
    {
      "name": "Split In Batches",
      "type": "n8n-nodes-base.splitInBatches",
      "parameters": { "batchSize": 1 }
    },
    {
      "name": "Shopify — Update Inventory Level",
      "type": "n8n-nodes-base.shopify",
      "parameters": {
        "resource": "inventoryLevel",
        "operation": "set",
        "inventoryItemId": "={{ $json.inventory_item_id }}",
        "locationId": "={{ $json.location_id }}",
        "quantity": "={{ $json.quantity_on_hand }}"
      },
      "credentials": { "shopifyApi": { "id": "cred_shopify_001", "name": "Acme Shopify Store" } }
    }
  ],
  "settings": { "executionTimeout": 3600 },
  "versionId": "v_2026-04-01-1"
}
```

### `external_signals`

```json
{
  "tags_on_workflow": ["idempotent:true"],
  "shopify_api_version_in_use": "2024-04",
  "shopify_api_type": "REST",
  "x_shopify_shop_api_call_limit_at_failure": "40/40",
  "shopify_bucket_capacity": 40,
  "shopify_bucket_refill_rate_per_second": 2,
  "previous_retry_count_for_this_execution": 0,
  "recent_shopify_rate_limit_failures_same_store_last_hour": 0,
  "other_shopify_workflows_rate_limited_last_hour": false
}
```

## Expected output

```yaml
expected_label:           ratelimit.shopify-leaky-bucket
expected_subtype:         rest-bucket-exhausted
expected_confidence:      high
expected_action:          auto-retry
expected_evidence_keys:
  - error.httpCode
  - error.node
  - error.context.headers.x-shopify-shop-api-call-limit
  - shopify_bucket_capacity
  - shopify_bucket_refill_rate_per_second
  - tags_on_workflow
  - shopify_api_type
expected_case_loaded:     cases/shopify-rate-limit
forbidden_actions:
  - notify-human                     # workflow is idempotent; Shopify REST leaky bucket is deterministic — auto-retry is correct
  - escalate-engineer                # not a platform failure; the bucket is well-understood behavior
  - auto-retry with default exponential backoff   # using formula (30s base, exponential) is wrong — delay must be computed from header
```

## Grading notes

The agent should:

1. Walk `decision-trees/failure-diagnosis` and reach `ratelimit.shopify-leaky-bucket` from `httpCode=429 + error.node CONTAINS "shopify" + error.context.data.errors = "Throttled"`. The "Throttled" response body is Shopify-specific and confirms REST leaky bucket rather than GraphQL cost limit.
2. Load `cases/shopify-rate-limit`.
3. Cross-check Signals:
   - Read `x-shopify-shop-api-call-limit = "40/40"` → bucket is at capacity (call_count = bucket_max = 40).
   - Compute delay: `call_count / refill_rate = 40 / 2 = 20 seconds` to drain to zero; add jitter (e.g. 20 + rand(1..5) seconds). The `retry-after: 2.0` header from Shopify indicates the minimum refill tick, not the full drain time — the agent must use the formula, not blindly take `retry-after`.
   - Read `tags_on_workflow = ["idempotent:true"]` → setting inventory levels is idempotent (writing the same quantity twice is harmless). Replay is safe.
   - Read `shopify_api_type = "REST"` → confirms this is the leaky bucket system, not the GraphQL cost-point system.
4. Choose `auto-retry` with `delay = ceil(call_count / refill_rate) + jitter = 20 + jitter` seconds.
5. Compose `record_attempt` with `attempt=1, delay_seconds=20+jitter`.

**Trap 1 — using the default exponential backoff formula instead of header-derived delay.** The most common error. The agent's default formula (30s base, exponential) would wait far longer than necessary. The case file is explicit: for Shopify REST, the delay is `ceil(call_count / 2)` seconds derived from `X-Shopify-Shop-Api-Call-Limit`. The `retry-after: 2.0` header is the refill tick, not the full drain time — the agent must do the arithmetic, not copy the header value.

**Trap 2 — confusing Shopify REST leaky bucket with Shopify GraphQL cost-based throttle.** Shopify's GraphQL API uses a cost-point system (different headers: `X-Shopify-Cost-Throttled-By` and `extensions.cost` in the JSON body). The REST API uses the leaky bucket. The agent must check `shopify_api_type = "REST"` and the `X-Shopify-Shop-Api-Call-Limit` header format (`current/max`) to confirm the correct sub-system. GraphQL throttles would require a different computation.

**Trap 3 — choosing notify-human or escalate-engineer because the workflow is making 1,200 API calls.** The volume is not a red flag — Shopify's REST API is designed for this. The bucket behavior is deterministic and well-documented. The workflow is tagged idempotent. There is no structural problem requiring human intervention; the workflow just needs a proper wait before the retry.

Common LLM mistakes:

- Computing delay from the `retry-after: 2.0` header directly (result: wait only 2 seconds → retry too early → another 429). The `retry-after` from Shopify indicates the minimum refill unit per call, not the full drain time.
- Confusing with the GraphQL cost limit because both say "Throttled." The REST leaky bucket uses `X-Shopify-Shop-Api-Call-Limit: current/max`; the GraphQL system uses `extensions.cost.throttleStatus` in the JSON body.
- Choosing `notify-human` because "1,200 API calls is a code design problem." True in the long run, but the immediate action is auto-retry; the batching recommendation goes in the digest's Prevention section.

## Variants worth adding later

- Shopify GraphQL cost-point throttle (different header, different computation, same surface 429).
- Bucket partially consumed (`X-Shopify-Shop-Api-Call-Limit: 38/40`) — throttle hit before bucket is fully drained; delay formula gives shorter wait.
- Multi-store scenario where two workflows share the same API key — both rate-limited simultaneously, escalate-engineer appropriate because the bucket is shared.
