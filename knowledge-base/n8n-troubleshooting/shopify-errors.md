# Case: Shopify API errors

**Type:** Labeled failure case
**Diagnosis label:** `shopify.api-version-deprecated` / `shopify.rate-limit-leaky-bucket` / `shopify.inventory-location-required` / `shopify.storefront-api-confusion` / `shopify.bulk-operation-conflict`
**Routes from:** `decision-trees/failure-diagnosis` (Shopify node failure, httpCode∈{401,404,422,423,429} OR deprecation warning header OR GraphQL errors array)
**Auto-handle safety:** `shopify.rate-limit-leaky-bucket` auto-retry is safe when bucket has capacity (compute delay from `X-Shopify-Shop-Api-Call-Limit`). `shopify.bulk-operation-conflict` auto-retry with 60s delay is safe. All others require `notify-human` — they involve deprecated infrastructure, wrong API surfaces, or missing required parameters.
**Updated:** 2026-05-07

## Overview

Shopify's API surface is complex and changing. The REST Admin API became legacy in 2024; new public apps must use the GraphQL Admin API from 2025. n8n's native Shopify node still primarily targets the REST Admin API and hardcodes an API version that may be 1–2 years behind Shopify's current stable release. This version lag is the source of two distinct failure modes: hard deprecation (endpoint gone, 404 returned) and soft deprecation (endpoint works but returns a `X-Shopify-API-Deprecated` warning header that the workflow silently ignores until the hard cutoff).

The rate limiting surface is also dual: the REST Admin API uses a leaky bucket algorithm (40-credit bucket, 2 credits/second refill rate), while the GraphQL Admin API uses a cost-based budget (1,000 cost points per second restore rate, with query cost visible in `extensions.cost`). These are completely independent throttle surfaces and must not be confused.

Shopify webhook duplicate deliveries are handled in `cases/concurrent-execution-conflict.md`. This case covers the API request path and REST/GraphQL-specific errors.

## Shopify API version calendar

| Version | Status (as of 2026-05-07) | Notes |
|---|---|---|
| `2023-01` | Deprecated and removed | Requests return 404 or redirect |
| `2023-04` | Deprecated and removed | Requests return 404 |
| `2023-07` | Deprecated and removed | Requests return 404 |
| `2023-10` | Deprecated and removed | Requests return 404 |
| `2024-01` | Supported (legacy) | Deprecation warnings active; sunsetting mid-2025 |
| `2024-04` | Supported | |
| `2024-07` | Supported | |
| `2024-10` | Supported | |
| `2025-01` | Stable (current) | Recommended for new integrations |
| `2025-04` | Release candidate | |

Shopify releases a new API version quarterly (January, April, July, October). Each version is supported for approximately 12 months after release. Versions older than 12 months are sunset and return errors. The quarterly cadence means n8n's hardcoded version becomes deprecated within one year of a Shopify node release if not updated.

To determine the version n8n's Shopify node is using: inspect the `api_version` parameter in `workflow_entity.nodes` for the Shopify node, or examine the `X-Shopify-API-Version` response header from a successful execution.

## Input — what the error looks like

### api-version-deprecated (HTTP 404 or deprecation header)

Hard deprecation — 404:
```jsonc
{
  "name": "NodeApiError",
  "node": "Shopify",
  "httpCode": "404",
  "message": "Not Found",
  "context": {
    "data": {
      "errors": "Not Found"
    }
  }
}
```

Soft deprecation — successful response with deprecation header (no n8n error):
```
HTTP/2 200
X-Shopify-API-Deprecated: The REST Admin API version 2024-01 will be sunset on 2025-04-01.
X-Shopify-API-Version: 2024-01
```

n8n does not surface this header as an error. Detection requires inspecting the raw response headers in the execution's context data, or monitoring the `X-Shopify-API-Deprecated` header proactively.

### rate-limit-leaky-bucket (HTTP 429)

```jsonc
{
  "name": "NodeApiError",
  "node": "Shopify",
  "httpCode": "429",
  "message": "Exceeded 2 calls per second for api client. Reduce request rates to resume uninterrupted service.",
  "context": {
    "headers": {
      "x-shopify-shop-api-call-limit": "40/40",
      "retry-after": "2.0"
    },
    "data": {
      "errors": "Exceeded 2 calls per second for api client. Reduce request rates to resume uninterrupted service."
    }
  }
}
```

The `X-Shopify-Shop-Api-Call-Limit` header format is `{used}/{bucket_size}`. The example `40/40` means all 40 credits are consumed. The bucket refills at 2 credits/second, so full recovery takes 20 seconds from 40/40.

### inventory-location-required (HTTP 422)

```jsonc
{
  "name": "NodeApiError",
  "node": "Shopify",
  "httpCode": "422",
  "message": "Unprocessable Entity",
  "context": {
    "data": {
      "errors": {
        "location_id": ["can't be blank"],
        "base": ["Couldn't find InventoryLevel for location"]
      }
    }
  }
}
```

Variant from older REST endpoint:
```jsonc
{
  "context": {
    "data": {
      "errors": "Location is required"
    }
  }
}
```

### storefront-api-vs-admin-api (HTTP 401)

```jsonc
{
  "name": "NodeApiError",
  "node": "HTTP Request",
  "httpCode": "401",
  "message": "[HTTP 401] ...",
  "context": {
    "data": {
      "errors": "Invalid API key or access token (unrecognized login or wrong password)"
    }
  }
}
```

This 401 occurs when a valid Admin API access token is used against a Storefront API endpoint (or vice versa). The authentication schemes are incompatible:
- Admin API: `X-Shopify-Access-Token: {admin_access_token}` header
- Storefront API: `X-Shopify-Storefront-Access-Token: {storefront_token}` header OR Authorization Bearer

The n8n Shopify node injects the Admin API header. If the workflow targets a Storefront endpoint (e.g., `storefront.myshopify.com/api/2025-01/graphql.json`), the Admin token is rejected.

### bulk-operation-conflict (HTTP 423 or GraphQL error)

REST response:
```jsonc
{
  "name": "NodeApiError",
  "node": "HTTP Request",
  "httpCode": "423",
  "message": "[HTTP 423] Locked",
  "context": {
    "data": {
      "errors": "Concurrent bulk query already exists for this shop."
    }
  }
}
```

GraphQL Admin API response (HTTP 200, error in body):
```jsonc
{
  "data": {
    "bulkOperationRunQuery": {
      "bulkOperation": null,
      "userErrors": [
        {
          "field": null,
          "message": "A bulk query already exists for this shop. Please wait for it to complete before submitting a new one."
        }
      ]
    }
  },
  "extensions": {
    "cost": {
      "requestedQueryCost": 10,
      "actualQueryCost": 10
    }
  }
}
```

Note: GraphQL bulk operation conflicts return HTTP 200 with errors in `data.bulkOperationRunQuery.userErrors`. The agent must inspect the GraphQL response body even on 200 status when the node is triggering a bulk operation.

## Detection signals

The agent triggers this case when **any** of the following match:

1. `error.node` contains `"Shopify"` AND `error.httpCode = "404"` AND the failing endpoint URL contains a deprecated version string (e.g., `/2023-07/`, `/2023-10/`) → route to `shopify.api-version-deprecated`
2. Proactive scan: Shopify node execution response headers contain `X-Shopify-API-Deprecated` → route to `shopify.api-version-deprecated` (soft deprecation — log and notify before hard cutoff)
3. `error.node` contains `"Shopify"` AND `error.httpCode = "429"` AND `error.message` matches `/exceeded.*calls per second|rate limit/i` → route to `shopify.rate-limit-leaky-bucket`
4. `error.node` contains `"Shopify"` AND `error.httpCode = "422"` AND `error.message` matches `/location.*required|location_id.*blank|inventorylevel/i` → route to `shopify.inventory-location-required`
5. `error.httpCode = "401"` AND the request URL contains `storefront.myshopify.com` or a Storefront API path AND the credential used is an Admin API credential → route to `shopify.storefront-api-confusion`
6. `error.httpCode = "423"` OR (HTTP 200 AND `data.bulkOperationRunQuery.userErrors` array is non-empty) AND error message matches `/bulk.*query.*already|concurrent bulk/i` → route to `shopify.bulk-operation-conflict`

## Sub-diagnoses table

| Label | HTTP code | Key signal | Recovery |
|---|---|---|---|
| `shopify.api-version-deprecated` | 404 or 200+header | Version in URL is beyond 12-month window; OR `X-Shopify-API-Deprecated` header present | `notify-human` + `escalate-engineer` |
| `shopify.rate-limit-leaky-bucket` | 429 | `X-Shopify-Shop-Api-Call-Limit: 40/40`; workflow in loop | `auto-retry` with computed delay from header |
| `shopify.inventory-location-required` | 422 | `location_id: ["can't be blank"]` in errors | `notify-human` (workflow config fix) |
| `shopify.storefront-api-confusion` | 401 | Admin token used against Storefront endpoint | `notify-human` (architectural fix) |
| `shopify.bulk-operation-conflict` | 423 or 200+userErrors | "A bulk query already exists" | `auto-retry` with 60s delay |

## Signal cross-check — identify the sub-diagnosis

Walk these checks in order; stop at the first match:

| Check | If true → label |
|---|---|
| `httpCode = 404` AND the request URL contains a Shopify API version string AND that version appears in the "Deprecated and removed" rows of the version calendar above | → `shopify.api-version-deprecated` (hard deprecation). |
| Proactive header check: `X-Shopify-API-Deprecated` header present on a 200 response | → `shopify.api-version-deprecated` (soft deprecation). Urgency: check the sunset date in the header value and trigger `notify-human` immediately if the sunset is within 30 days. |
| `httpCode = 429` AND message matches `Exceeded.*calls per second` | → `shopify.rate-limit-leaky-bucket`. Read `X-Shopify-Shop-Api-Call-Limit` header: `{used}/{total}`. |
| `httpCode = 422` AND errors contain `location_id` key OR message contains `location` and `inventory` | → `shopify.inventory-location-required`. |
| `httpCode = 401` AND request URL is a Storefront API endpoint (contains `storefront.myshopify.com` or path `/api/{version}/graphql.json` without admin subdomain) | → `shopify.storefront-api-confusion`. |
| `httpCode = 423` OR (HTTP 200 AND GraphQL `userErrors` contains bulk operation conflict text) | → `shopify.bulk-operation-conflict`. |

### REST leaky bucket — reading the header and computing the delay

The `X-Shopify-Shop-Api-Call-Limit` header format:

```
X-Shopify-Shop-Api-Call-Limit: 38/40
```

Meaning: 38 credits have been consumed out of a 40-credit bucket. The bucket refills at 2 credits/second.

**Delay formula** (how many seconds to wait before the next call):

```
available_credits = bucket_size - used_credits
                  = 40 - 38 = 2

# If you need N credits for the next batch:
seconds_to_wait = max(0, ceil((N - available_credits) / refill_rate))
                = max(0, ceil((1 - 2) / 2))
                = max(0, 0) = 0   ← can proceed immediately with 1 credit

# At 40/40 (bucket full, 0 available), for next single call:
seconds_to_wait = max(0, ceil((1 - 0) / 2)) = 1 second
```

In practice, Shopify includes a `Retry-After` header with a pre-computed float value (e.g., `Retry-After: 2.0`). Use this value when present. When absent, compute from the header.

For standard Shopify stores: bucket_size = 40, refill_rate = 2/s. Shopify Plus stores: bucket_size = 80, refill_rate = 4/s (doubled). The bucket size is visible in the denominator of `X-Shopify-Shop-Api-Call-Limit`.

**Safe pre-emptive throttle pattern** — check before the bucket empties:

```javascript
// Code node: parse the call limit header and wait if needed
const header = $json.headers?.['x-shopify-shop-api-call-limit'] || '0/40';
const [used, total] = header.split('/').map(Number);
const available = total - used;
const refillRate = total === 80 ? 4 : 2;  // Plus stores have 80-credit bucket

// Wait if less than 5 credits available (safety buffer)
if (available < 5) {
  const creditsNeeded = 5 - available;
  const waitMs = Math.ceil(creditsNeeded / refillRate) * 1000;
  await new Promise(r => setTimeout(r, waitMs));
}

return $input.all();
```

### GraphQL Admin API rate limits — cost-based, not call-based

The GraphQL Admin API does NOT use the leaky bucket. It uses a cost-based throttle:

- Each query has a **calculated cost** (visible in `extensions.cost.requestedQueryCost`)
- The shop has a **restore rate** of 1,000 cost points/second (standard) or higher for Plus
- If a query's cost exceeds the available budget, Shopify returns a throttled GraphQL error

GraphQL throttle error (HTTP 200, error in body):
```jsonc
{
  "errors": [
    {
      "message": "Throttled",
      "extensions": {
        "code": "THROTTLED",
        "requestedQueryCost": 500,
        "actualQueryCost": null,
        "cost": {
          "requestedQueryCost": 500,
          "actualQueryCost": null,
          "throttleStatus": {
            "maximumAvailable": 1000.0,
            "currentlyAvailable": 300.0,
            "restoreRate": 50.0
          }
        }
      }
    }
  ]
}
```

The delay formula for GraphQL throttle: `wait_seconds = ceil((requestedQueryCost - currentlyAvailable) / restoreRate)`. For the example above: `ceil((500 - 300) / 50) = 4 seconds`.

The agent must check `extensions.cost` on every successful GraphQL response to pre-empt throttling. A query with cost 500 when `currentlyAvailable` is 600 is fine; the same query when `currentlyAvailable` is 400 will be throttled on the next call.

## Recovery actions

### `shopify.api-version-deprecated`

> `notify-human` + `escalate-engineer`. This requires updating the n8n Shopify node's API version, which is a code-level change to the n8n node or workflow configuration.

1. `notify-human` + `escalate-engineer`. Include:
   - The deprecated version string (from the failing URL or from `X-Shopify-API-Version` response header)
   - The current stable version (`2025-01` as of 2026-05-07)
   - Whether this is a hard deprecation (404) or soft deprecation (header warning)
   - The sunset date (from the `X-Shopify-API-Deprecated` header value, if soft deprecation)
   - All workflows using Shopify nodes (search `workflow_entity.nodes` for Shopify node types) — all may need the version update
2. Fix guidance: "Update the API version in the n8n Shopify node credential or the workflow's Shopify node configuration. For n8n's native Shopify node: check if the `API version` parameter is exposed in the node settings — if yes, update it to `2025-01`. If the version is hardcoded in the n8n node and not configurable, this requires either an n8n version upgrade (newer n8n versions include updated node versions) or switching to an HTTP Request node with an explicit version in the URL. After the version update, test the workflow against Shopify's sandbox store to confirm field shapes have not changed."
3. **Pause the affected workflow** immediately if it is actively failing: `POST /api/v1/workflows/:id/deactivate`. Do not leave it retrying against a deprecated endpoint.
4. Do NOT auto-update the version string. API version changes can silently alter response shapes. A human must validate the workflow's field mappings against the new version's response.

### `shopify.rate-limit-leaky-bucket`

> Auto-retry is safe. The bucket refills at 2 credits/second. No customer data is modified by the retry.

1. **Stop the execution** if still running: `POST /api/v1/executions/:id/stop`
2. **Read `X-Shopify-Shop-Api-Call-Limit` header** from the failed execution. Parse `{used}/{total}`.
3. **Compute the wait time:**
   - If `Retry-After` header is present: wait that many seconds (Shopify pre-computes this).
   - If absent: `wait_seconds = ceil((1 - (total - used)) / 2)` — at minimum 1 second.
   - For 40/40 (fully exhausted): wait 20 seconds to fully refill.
4. **Auto-retry** the execution after the computed delay. Use the same idempotency approach as for Stripe — reuse the same input parameters.
5. **If rate limiting recurs on retry:** check whether the workflow loops without a throttle node. Issue `notify-human` with the recommendation: "Add a Code node before the Shopify node that reads the `X-Shopify-Shop-Api-Call-Limit` header from the previous call's response and waits if available credits < 5. Alternatively, use `Split In Batches` (batch 10) + `Wait` (5s) to stay well below the 40-credit limit."
6. **Shopify Plus stores:** the bucket is 80 credits, refill rate is 4/s. Adjust delay computation accordingly. Check the denominator of `X-Shopify-Shop-Api-Call-Limit` to detect Plus: value of 80 indicates a Plus store.

### `shopify.inventory-location-required`

> `notify-human`. The workflow is missing the `location_id` required for multi-location inventory operations. Auto-retry will fail identically.

1. `notify-human`. Include:
   - The workflow node and operation (e.g., "Inventory Level: Adjust" or "POST /admin/api/2025-01/inventory_levels/adjust.json")
   - The `location_id` field that is blank
   - Whether the store has multiple locations (check `GET /admin/api/2025-01/locations.json` to list available locations)
2. Fix guidance: "Shopify's multi-location inventory system (released 2018, required since 2022) requires a `location_id` for all inventory adjustment, connect, and move operations. Add a step before the inventory node to look up the correct location ID: `GET /admin/api/2025-01/locations.json` returns all locations for the store. If the workflow should always use the primary/default location, look up the location where `legacy: true` (the original Shopify location). Hard-code the `location_id` in the workflow configuration once retrieved, or add a lookup step that retrieves it dynamically per execution."
3. Do NOT auto-retry. The request will fail with the same 422 without the location_id.

### `shopify.storefront-api-confusion`

> `notify-human`. This is an architectural issue — the workflow is using the wrong API entirely. Auto-retry against the same endpoint will fail identically.

1. `notify-human`. Include:
   - The URL the workflow is targeting (Admin API vs Storefront API endpoint)
   - The credential type being used (Admin access token vs Storefront token)
   - What the workflow is trying to accomplish (read products, search products, add to cart, etc.)
2. Fix guidance: "The n8n Shopify node uses the Admin API exclusively (`{shop}.myshopify.com/admin/api/{version}/...`) and injects the `X-Shopify-Access-Token` header. Storefront API endpoints (`{shop}.myshopify.com/api/{version}/graphql.json`) use a different token (`X-Shopify-Storefront-Access-Token`) and a different authentication scheme. Common mistake: trying to use the Storefront API for product catalog reads (available in both Admin and Storefront) but building the URL as a Storefront endpoint. Fix: use the Admin API endpoint and the n8n Shopify node for all server-side operations. The Storefront API is for buyer-facing apps (browser/mobile) — agency automation workflows belong on the Admin API."
3. Pause the workflow: `POST /api/v1/workflows/:id/deactivate`. The workflow will produce 401 errors on every execution until the endpoint is corrected.

### `shopify.bulk-operation-conflict`

> Auto-retry with 60s delay is safe. Shopify allows only one bulk operation at a time per shop, but bulk operations typically complete within 1–5 minutes. The conflict is transient.

1. **Stop the execution** if still running: `POST /api/v1/executions/:id/stop`
2. **Check whether a bulk operation is currently running** by querying Shopify's GraphQL Admin API:
   ```graphql
   query {
     currentBulkOperation {
       id
       status
       createdAt
       completedAt
       errorCode
       objectCount
       fileSize
       url
     }
   }
   ```
   If `status = "RUNNING"` or `status = "CREATED"`, the existing bulk operation is still in progress.
3. **Wait 60 seconds.** Bulk operations for catalog/order exports typically complete within 1–5 minutes.
4. **Auto-retry** the execution after the delay. If the bulk operation check from step 2 shows `status = "COMPLETED"`, the conflict is resolved and the new bulk operation can be submitted.
5. **If the bulk operation status shows `status = "FAILED"` with `errorCode` set:** the previous bulk operation failed — it is blocking new operations but will not resolve on its own. Issue `notify-human` with the error code and the URL of the failed operation's result file (if any). Engineering must cancel the failed operation: `mutation { bulkOperationCancel(id: "gid://shopify/BulkOperation/XXXXX") { bulkOperation { status } userErrors { message } } }`.
6. **If two workflows both trigger bulk operations concurrently:** one will always conflict with the other. Recommend adding a Shopify bulk operation lock in the workflow — check `currentBulkOperation` status before submitting, and only submit if `status` is `null` or `COMPLETED`.

## Prevention — recommendations for the customer report

Add to the customer's `playbooks/report-to-agency` section:

- **Pin the Shopify API version explicitly and review it quarterly.** Every Shopify API version has a 12-month support window. Set a calendar reminder to audit all workflows' Shopify node versions when Shopify announces a new quarterly release. The `X-Shopify-API-Deprecated` response header will warn you 1–3 months before the hard cutoff — monitor it proactively.
- **Prefer `X-Shopify-Shop-Api-Call-Limit` header monitoring over retry-on-429.** A pro-active throttle that reads `{used}/{total}` and waits when `used > total - 5` prevents 429s entirely. A reactive retry-on-429 is slower and noisier — each failed call counts against the bucket too.
- **For GraphQL Admin API calls, always read `extensions.cost` in the response.** The cost of a GraphQL query is not fixed — it scales with how many records you request and how deep the connections go. A query for `products(first: 250)` has much higher cost than `products(first: 10)`. Request only the fields and records you need.
- **Use bulk operations for catalog and order backfills, never paginated REST loops.** A paginated loop over 50,000 orders at 250 orders/page = 200 REST calls. A bulk operation returns the same data as a single async job + file download. The bucket impact is 1 call to start and 1 call to poll — 200× more efficient.
- **Always retrieve and use the correct `location_id` for inventory operations.** Do not hard-code it across environments — location IDs differ between development stores and production stores. Store the location ID in a config table and look it up per store.
- **Treat the Admin API and Storefront API as completely separate products.** The Admin API is for backend automation with admin credentials. The Storefront API is for buyer-facing apps with a limited read-only token. There is no overlap in authentication or most endpoints. Never mix them in the same workflow.
- **For multi-workflow Shopify architectures, add a bulk operation coordinator.** If more than one workflow may trigger Shopify bulk operations (catalog sync, order export, metafield backfill), add a shared "lock table" that records the active bulk operation ID. Each workflow checks the lock table before submitting a new bulk operation. This prevents the unpredictable retry loop of `shopify.bulk-operation-conflict`.

## Code snippets

### Leaky bucket throttle guard — Code node

```javascript
// Place this Code node AFTER every Shopify REST node in a loop.
// It reads the call-limit header and waits before the next iteration.

const header = $json.headers?.['x-shopify-shop-api-call-limit'] || '0/40';
const retryAfter = parseFloat($json.headers?.['retry-after'] || '0');

if (retryAfter > 0) {
  // Shopify computed the wait for us — honor it exactly
  await new Promise(r => setTimeout(r, retryAfter * 1000));
  return $input.all();
}

const [used, total] = header.split('/').map(Number);
const available = total - used;
const refillRate = total >= 80 ? 4 : 2; // Shopify Plus has 80-credit bucket

if (available < 5) {
  const creditsNeeded = 5 - available;
  const waitMs = Math.ceil(creditsNeeded / refillRate) * 1000;
  await new Promise(r => setTimeout(r, waitMs));
}

return $input.all();
```

### GraphQL cost tracker — Code node

```javascript
// Place this Code node after any Shopify GraphQL HTTP Request node.
// Returns the cost data for monitoring and pre-emptive throttle decisions.

const extensions = $json.extensions || {};
const cost = extensions.cost || {};
const throttle = cost.throttleStatus || {};

const diagnosis = {
  queryId: $json.data?.id || null,
  requestedCost: cost.requestedQueryCost || null,
  actualCost: cost.actualQueryCost || null,
  budgetAvailable: throttle.currentlyAvailable || null,
  budgetMax: throttle.maximumAvailable || null,
  restoreRate: throttle.restoreRate || null,
  isThrottled: (extensions.errors || []).some(e => e.extensions?.code === 'THROTTLED')
};

if (diagnosis.isThrottled) {
  const waitSeconds = Math.ceil(
    ((diagnosis.requestedCost || 0) - (diagnosis.budgetAvailable || 0)) /
    (diagnosis.restoreRate || 50)
  );
  await new Promise(r => setTimeout(r, Math.max(waitSeconds, 1) * 1000));
}

// Log for monitoring and pass through original data
return [{ json: { ...($json), _costMeta: diagnosis } }];
```

### Bulk operation conflict checker — Code node

```javascript
// Place this Code node before any bulk operation submission.
// Queries the current bulk operation status and waits if one is running.

// This node should use an HTTP Request node to call Shopify's GraphQL API:
// POST {shop}/admin/api/2025-01/graphql.json
// Headers: X-Shopify-Access-Token: {token}
// Body: { "query": "query { currentBulkOperation { id status } }" }

const bulkOp = $json.data?.currentBulkOperation;

if (!bulkOp || bulkOp.status === 'COMPLETED' || bulkOp.status === 'CANCELED') {
  // No active bulk operation — safe to submit
  return [{ json: { bulkOperationBlocked: false } }];
}

if (bulkOp.status === 'FAILED') {
  // A failed bulk op blocks new ones — needs human intervention
  throw new Error(
    `Shopify bulk operation ${bulkOp.id} is in FAILED state and blocks new bulk operations. ` +
    `Cancel it manually via the GraphQL Admin API before retrying.`
  );
}

// RUNNING or CREATED — wait 60 seconds and retry
// (Use a Wait node after this Code node, then loop back to check again)
return [{ json: { bulkOperationBlocked: true, activeOperationId: bulkOp.id, status: bulkOp.status } }];
```

### Detecting the X-Shopify-API-Deprecated header

```javascript
// Place this Code node after any Shopify node.
// Flags soft deprecation warnings before they become hard 404s.

const deprecationHeader = $json.headers?.['x-shopify-api-deprecated'] || null;
const versionHeader = $json.headers?.['x-shopify-api-version'] || null;

if (deprecationHeader) {
  // Extract the sunset date from the header value
  // Example: "The REST Admin API version 2024-01 will be sunset on 2025-04-01."
  const sunsetMatch = deprecationHeader.match(/sunset on (\d{4}-\d{2}-\d{2})/i);
  const sunsetDate = sunsetMatch ? sunsetMatch[1] : 'unknown';
  const daysUntilSunset = sunsetDate !== 'unknown'
    ? Math.floor((new Date(sunsetDate) - Date.now()) / 86400000)
    : null;

  // Return a flag — connect this to a Slack/email notification node
  return [{
    json: {
      ...$json,
      _deprecationWarning: {
        message: deprecationHeader,
        currentVersion: versionHeader,
        sunsetDate,
        daysUntilSunset,
        urgent: daysUntilSunset !== null && daysUntilSunset < 30
      }
    }
  }];
}

return $input.all();
```

## Field checklist

Before escalating or resolving a Shopify case, confirm these fields are captured in the incident record:

- [ ] Shopify store domain (e.g., `mystore.myshopify.com`)
- [ ] API version in use (from URL, node config, or `X-Shopify-API-Version` header)
- [ ] `httpCode` (404 / 422 / 423 / 429 / 401)
- [ ] `X-Shopify-Shop-Api-Call-Limit` header value (`{used}/{total}`) — for rate-limit cases
- [ ] `Retry-After` header value — for rate-limit cases
- [ ] `X-Shopify-API-Deprecated` header value and sunset date — for deprecated version cases
- [ ] Whether the store is Shopify Plus (bucket size = 80 vs 40)
- [ ] `location_id` configured in the workflow (Y/N) — for inventory cases
- [ ] Whether the request targets Admin API or Storefront API — for auth confusion cases
- [ ] Current bulk operation ID and status — for bulk-conflict cases
- [ ] All other Shopify workflows that may trigger bulk operations concurrently
- [ ] GraphQL `extensions.cost` data — for GraphQL throttle cases

## Cross-references

`decision-trees/failure-diagnosis` · `decision-trees/error-classification` (subtypes `ratelimit.shopify-leaky-bucket`, `config.api-version-deprecated`, `config.reference-not-found`) · `cases/concurrent-execution-conflict` (for Shopify webhook duplicate deliveries) · `cases/webhook-signature-validation` (for `X-Shopify-Hmac-Sha256` signature failures) · `playbooks/recover-from-api-error` · `reference/api/api-shopify`
