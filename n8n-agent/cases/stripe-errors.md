# Case: Stripe API errors

**Type:** Labeled failure case
**Diagnosis label:** `stripe.idempotency-conflict` / `stripe.card-declined` / `stripe.rate-limit` / `stripe.api-version-mismatch` / `stripe.insufficient-permissions`
**Routes from:** `decision-trees/failure-diagnosis` (Stripe node failure, httpCode∈{400,402,403,429} OR silent data shape change)
**Auto-handle safety:** `stripe.rate-limit` auto-retry is safe (Retry-After header sets the delay). `stripe.card-declined` produces no n8n error — it is a business event, not a system failure. All others require `notify-human`. Never auto-retry idempotency-conflict (it is a code bug, not a transient condition).
**Updated:** 2026-05-07

## Overview

Stripe errors require more careful triage than most APIs because several of them are not n8n failures at all — they are Stripe-side business events that the workflow must handle as first-class outcomes. A declined card (HTTP 402) is not a bug; it is information the workflow must route and act on. An idempotency conflict (HTTP 400, `idempotency_error`) is a code bug that looks like a transient failure and must never be auto-retried.

The agent must also distinguish between test-mode and live-mode errors. Stripe returns the same error codes in both environments, but `error.livemode: false` signals a test-mode execution. Test-mode errors do not affect real customers or real money. Some decline codes only appear in live mode (e.g., `insufficient_funds`, `stolen_card`); test mode uses predictable synthetic codes.

Stripe webhook signature mismatches are handled separately — see `cases/webhook-signature-validation.md`. This case covers the API request path only.

## Stripe error object shape

Every Stripe API error returns a JSON body containing a top-level `error` object. The agent must inspect all four discriminating fields:

```jsonc
{
  "error": {
    "type": "card_error",           // top-level error family
    "code": "card_declined",        // specific code within the family
    "decline_code": "insufficient_funds",  // only present for card_error + card_declined
    "message": "Your card has insufficient funds.",  // human-readable; do not parse
    "param": null,                  // the request parameter that was invalid (for invalid_request_error)
    "charge": "ch_3XXXXXXXXXX",    // the charge object ID (for card_error)
    "payment_intent": "pi_3XXX",   // if using Payment Intents flow
    "request_id": "req_XXXXXXXXXX", // Stripe's request ID — include in all escalations
    "livemode": true               // false = test mode; real money is NOT involved
  }
}
```

### `error.type` values and their meaning

| `error.type` | Meaning | HTTP code | Auto-retry? |
|---|---|---|---|
| `card_error` | Card-level decline from the issuing bank | 402 | No — business event |
| `invalid_request_error` | Bad parameters, wrong object state | 400 | No — code fix |
| `api_error` | Stripe-side transient failure | 500/503 | Yes — with backoff |
| `authentication_error` | Invalid API key | 401 | No — credential fix |
| `rate_limit_error` | Request rate exceeded | 429 | Yes — Retry-After |
| `idempotency_error` | Idempotency key reused with different params | 400 | Never — code bug |

## Input — what the error looks like

### idempotency-conflict (HTTP 400)

```jsonc
{
  "name": "NodeApiError",
  "node": "Stripe",
  "httpCode": "400",
  "message": "Keys for idempotent requests can only be used with the same parameters they were first used with.",
  "context": {
    "data": {
      "error": {
        "type": "idempotency_error",
        "code": "idempotency_key_in_use",
        "message": "Keys for idempotent requests can only be used with the same parameters they were first used with. Try using a key other than 'order_123_charge_2026-05-07' if you meant to make a different request.",
        "request_id": "req_XXXXXXXXXX",
        "livemode": true
      }
    }
  }
}
```

Note: `error.type = "idempotency_error"` is the definitive signal. When `code = "idempotency_key_in_use"`, the key is currently being processed by a concurrent request (not a historical conflict) — the correct response is to wait and then check whether the original request completed, not to use a new key.

### card-declined (HTTP 402)

```jsonc
{
  "name": "NodeApiError",
  "node": "Stripe",
  "httpCode": "402",
  "message": "Your card has insufficient funds.",
  "context": {
    "data": {
      "error": {
        "type": "card_error",
        "code": "card_declined",
        "decline_code": "insufficient_funds",
        "message": "Your card has insufficient funds.",
        "charge": "ch_3XXXXXXXXXX",
        "request_id": "req_XXXXXXXXXX",
        "livemode": true
      }
    }
  }
}
```

### rate-limit (HTTP 429)

```jsonc
{
  "name": "NodeApiError",
  "node": "Stripe",
  "httpCode": "429",
  "message": "Too Many Requests",
  "context": {
    "headers": {
      "retry-after": "1",
      "x-ratelimit-limit": "100",
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": "1715097600"
    },
    "data": {
      "error": {
        "type": "rate_limit_error",
        "message": "Too many requests; your request has been rate limited.",
        "request_id": "req_XXXXXXXXXX"
      }
    }
  }
}
```

### insufficient-permissions (HTTP 403)

```jsonc
{
  "name": "NodeApiError",
  "node": "Stripe",
  "httpCode": "403",
  "message": "The provided key 'rk_live_...' does not have the required permissions.",
  "context": {
    "data": {
      "error": {
        "type": "invalid_request_error",
        "code": "api_key_expired",          /* or "permission_denied" */
        "message": "The provided key 'rk_live_...' does not have the required permissions.",
        "request_id": "req_XXXXXXXXXX",
        "livemode": true
      }
    }
  }
}
```

Note: Stripe uses `type: "invalid_request_error"` for permission errors, not a dedicated `type`. The HTTP code (403) and the message text are the discriminating signals.

### api-version-mismatch (no error — silent)

This is not an n8n error. The execution completes with `status='success'`. The symptom is field names appearing or disappearing in the Stripe response: `payment_method_details` renamed to `payment_method`; `customer.invoice_prefix` absent; a field that was a string now being an object. The workflow continues downstream but processes stale or unexpected field shapes.

Detection signal: a downstream node fails with `Cannot read properties of undefined (reading 'X')` where X is a Stripe response field, OR a `Set` node writes null/undefined to a destination because the Stripe field no longer exists in the response shape.

## Detection signals

The agent triggers this case when **any** of the following match:

1. `error.node` contains `"Stripe"` AND `error.httpCode = "400"` AND `error.context.data.error.type = "idempotency_error"` → route to `stripe.idempotency-conflict`
2. `error.node` contains `"Stripe"` AND `error.httpCode = "402"` AND `error.context.data.error.type = "card_error"` → route to `stripe.card-declined`
3. `error.node` contains `"Stripe"` AND `error.httpCode = "429"` AND `error.context.data.error.type = "rate_limit_error"` → route to `stripe.rate-limit`
4. `error.node` contains `"Stripe"` AND `error.httpCode = "403"` AND `error.context.data.error.type = "invalid_request_error"` AND error message contains `"does not have the required permissions"` → route to `stripe.insufficient-permissions`
5. Proactive scan: workflow contains Stripe node AND a downstream node fails with `Cannot read properties of undefined` on a Stripe response field AND no `httpCode` error from the Stripe node → investigate `stripe.api-version-mismatch`
6. Do NOT route HTTP 403 with a Stripe `authentication_error` here — that is `auth.refresh-expired` (wrong or expired secret key, not a permissions mismatch on a restricted key).

## Sub-diagnoses table

| Label | HTTP code | `error.type` | Key signal | Recovery |
|---|---|---|---|---|
| `stripe.idempotency-conflict` | 400 | `idempotency_error` | Same key, different params OR key in use by concurrent request | `notify-human` (code fix — never reuse key with different params) |
| `stripe.card-declined` | 402 | `card_error` | `code: "card_declined"` + `decline_code` present; business event | `notify-human` (customer must be contacted) |
| `stripe.rate-limit` | 429 | `rate_limit_error` | `Retry-After` header; parallel workers or batch job | `auto-retry` after `Retry-After` delay |
| `stripe.api-version-mismatch` | 200 (no error) | — | Downstream field access fails; Stripe Dashboard API version differs from node's pinned version | `notify-human` (check Stripe Dashboard → Developers → API version) |
| `stripe.insufficient-permissions` | 403 | `invalid_request_error` | `"does not have the required permissions"` in message; restricted key | `notify-human` (key permission expansion required) |

## Signal cross-check — identify the sub-diagnosis

Walk these checks in order; stop at the first match:

| Check | If true → label |
|---|---|
| `httpCode = 400` AND `error.type = "idempotency_error"` | → `stripe.idempotency-conflict`. Check `error.code`: `idempotency_key_in_use` = concurrent duplicate (wait, then check if original succeeded); anything else = different-params reuse (code bug). |
| `httpCode = 402` AND `error.type = "card_error"` AND `error.code = "card_declined"` | → `stripe.card-declined`. Read `decline_code` to determine the decline reason. Check `error.livemode`: if `false`, this is a test-mode simulation — no real customer impact. |
| `httpCode = 429` AND `error.type = "rate_limit_error"` | → `stripe.rate-limit`. Read `Retry-After` header — Stripe always includes it on 429. The value is in seconds (typically 1–5 for burst). Also check `X-RateLimit-Remaining` to understand remaining budget. |
| `httpCode = 403` AND error message matches `/does not have the required permissions|permission_denied/i` | → `stripe.insufficient-permissions`. Note: Stripe uses `type: "invalid_request_error"` for this, so you cannot use `error.type` to discriminate — you must check `httpCode = 403` AND the message text. |
| Stripe node returned HTTP 200 AND a downstream node fails accessing a Stripe response field | → investigate `stripe.api-version-mismatch`. Open Stripe Dashboard → Developers → API version. Compare the version shown there against the version in the n8n Stripe node's request headers (`Stripe-Version: YYYY-MM-DD`). |

### Test-mode vs live-mode error differences

The `error.livemode` field on every Stripe error indicates the key environment:

- `"livemode": false`: the API key used is a test-mode key (`sk_test_...` or `rk_test_...`). The error happened in a sandbox. **No real customer, real payment, or real money is involved.** Auto-retry is lower-stakes.
- `"livemode": true`: the API key used is a live-mode key (`sk_live_...` or `rk_live_...`). Real charges, real customers, real money. Every recovery action must be conservative.

In test mode, specific decline codes are triggered by specific test card numbers:
- `decline_code: "insufficient_funds"` → test card `4000000000009995`
- `decline_code: "card_declined"` (generic) → test card `4000000000000002`
- `decline_code: "fraudulent"` → test card `4100000000000019`

In live mode, decline codes are returned by the issuing bank and are not predictable. The most common live-mode decline codes and their handling:

| `decline_code` | Meaning | Customer action |
|---|---|---|
| `insufficient_funds` | Card balance too low | Try another payment method |
| `card_declined` | Generic decline (no specifics from bank) | Contact bank or try another card |
| `expired_card` | Card expired | Update card details |
| `incorrect_cvc` | Wrong CVV | Re-enter card details |
| `lost_card` / `stolen_card` | Fraud signal — do NOT retry | Do not reveal reason to customer; contact compliance |
| `do_not_honor` | Bank decline, no reason given | Customer must contact bank |
| `fraudulent` | Stripe's own risk evaluation | Stripe Radar blocked the charge |

For `lost_card` and `stolen_card`: **do not reveal the decline reason to the customer in any automated message.** Surface a generic "payment declined" message. Flag for compliance review.

### Idempotency key best practices

Stripe's idempotency guarantees: if you send two requests with the same key within 24 hours, the second returns the result of the first (even if the first failed). After 24 hours, Stripe allows the key to be reused.

**Wrong approach — random UUID per retry:**
```javascript
// WRONG: each retry attempt generates a new key.
// Stripe treats each as a distinct request. No dedup. Also misses Stripe's
// replay protection.
const idempotencyKey = require('crypto').randomUUID();
```

**Wrong approach — reusing same key with modified payload:**
```javascript
// WRONG: if you change the amount on a retry (e.g., due to a corrected price),
// and use the same key, you get idempotency_error.
const idempotencyKey = `order_${orderId}`;  // used earlier with amount=100
// later: same key, but amount=95 due to discount → idempotency_error
```

**Correct approach — key encodes the business intent, fixed per action:**
```javascript
// CORRECT: the key is derived from the stable business identifiers for this
// specific action. It does not change between retries. The params also do not
// change between retries.
// Pattern: {customer_id}_{action}_{date} — changes daily, preventing stale replays
// while being stable within a single business day.
const idempotencyKey = `cus_${customerId}_charge_${new Date().toISOString().slice(0,10)}`;

// For subscription creation:
const idempotencyKey = `cus_${customerId}_sub_${planId}_${new Date().toISOString().slice(0,10)}`;

// For refunds:
const idempotencyKey = `ch_${chargeId}_refund_full`;  // charge ID is inherently unique
```

If a retry with the same key is needed because the first attempt timed out or returned an ambiguous error: reuse the **same key and exactly the same parameters**. Stripe will return the original result if it completed, or process it fresh if it never completed.

## Recovery actions

### `stripe.idempotency-conflict`

> `notify-human`. This is a code bug — the workflow is reusing an idempotency key with different parameters, which Stripe forbids. Auto-retry is not appropriate and will produce the same error.

1. `notify-human`. Include:
   - The idempotency key value from the error message (Stripe includes it in the error text: `"Try using a key other than 'xxx'"`)
   - Whether `error.code = "idempotency_key_in_use"` (concurrent duplicate) vs other (different-params reuse)
   - The workflow execution that first used this key (search execution history for a successful Stripe call with the same key value)
   - `error.livemode` value
2. For `idempotency_key_in_use` (concurrent): the original request is still in flight. Wait 10 seconds, then retrieve the Stripe object (charge, PaymentIntent, etc.) using Stripe's `GET /v1/{object}/{id}` to check if the original request completed. Do NOT send a new request with a new key — you may create a duplicate charge.
3. For different-params reuse: the workflow has a code bug. "The workflow is generating the same idempotency key for two different operations, OR modifying the payload between retries. Fix: ensure the idempotency key formula is specific enough to be unique per business action, and never mutate the payload between retries. The key should be derived from stable business identifiers, not from mutable fields like `amount` or `discount_code`."
4. Do NOT auto-retry either sub-case. For in-use: manual check required. For different-params: retry produces the same idempotency_error.

### `stripe.card-declined`

> `notify-human`. This is a business event, not a system failure. From n8n's perspective, the workflow ran correctly — Stripe processed the request and returned a declined result. The business process must handle the decline.

1. `notify-human`. Include:
   - `decline_code` (the specific reason from the bank)
   - `charge` ID (so the customer record can be updated)
   - `error.livemode` value
   - Whether the workflow has a downstream branch for declined cards — if not, this declined charge has no handler and the customer will never be notified
2. Include the customer-facing message guidance based on `decline_code`:
   - For `lost_card`/`stolen_card`: do not reveal the reason; flag for compliance
   - For all others: safe to surface a generic "payment declined" message
3. The workflow should have an `If` node that branches on the Stripe response: if `error.code = "card_declined"`, route to the "declined" branch (notify customer, update CRM record, set task for follow-up). If the workflow does not have this branch, it is architecturally incomplete — flag this as a workflow design issue.
4. Do NOT retry a declined card. The bank's decision is final for this transaction.

### `stripe.rate-limit`

> Auto-retry is safe. Stripe's `Retry-After` header specifies the exact wait period. No customer data is modified by the retry.

1. **Stop the execution** if still running: `POST /api/v1/executions/:id/stop`
2. **Read `Retry-After` header** from the failed response. Stripe always includes this header on 429 responses. The value is in seconds (typically 1–5 for burst limits on the 100 req/s live-mode limit). Wait this many seconds.
3. **Auto-retry** the execution with the same idempotency key (if the original request was a write operation). The idempotency key ensures the operation is not duplicated.
4. **If the rate limit recurs on retry:** check whether queue-mode workers are all hammering Stripe simultaneously (N8N_CONCURRENCY_PRODUCTION_LIMIT high AND a backfill workflow running). Notify-human if sustained rate limiting continues past 3 retries — the workflow architecture may need per-account throttling.
5. Note: Stripe's live-mode limit is 100 req/s globally per account. Test-mode limit is typically lower (25 req/s). Rate limiting is unusual for agency-scale workflows unless a bulk backfill is running.

### `stripe.api-version-mismatch`

> `notify-human`. This is a silent data shape change — no error from n8n, but downstream logic produces wrong results. Auto-retry is not applicable.

1. `notify-human`. Include:
   - The Stripe API version currently set in Stripe Dashboard → Developers → API version
   - The Stripe-Version header that n8n's Stripe node is sending (inspect the raw request in the execution's input data, or check n8n's Stripe node documentation for the hardcoded version)
   - The specific field that disappeared or changed shape (from the downstream error)
2. Fix guidance: "Stripe accounts have a pinned API version configured in Dashboard → Developers → API version. n8n's native Stripe node sends requests with its own hardcoded `Stripe-Version` header. If the account's version and the node's version differ, field shapes can diverge silently — fields added in the account's newer version won't appear when using an older node version, and fields removed from the account's version may still appear in older-version responses. Resolution: (a) Pin the Stripe account's API version to match n8n's node version (check n8n's changelog for the Stripe node's current pinned version); or (b) switch to an HTTP Request node that explicitly sets `Stripe-Version: YYYY-MM-DD` to the version the workflow was tested against."
3. After the version is aligned, audit the downstream field mappings — there may be other fields that changed shape silently and have not yet caused a visible failure.

### `stripe.insufficient-permissions`

> `notify-human`. The Stripe API key in the n8n credential is a restricted key that lacks permission for the operation being attempted. This is distinct from an expired key.

1. `notify-human`. Include:
   - The restricted key identifier (Stripe shows `rk_live_...` in the error message — safe to include, it's not a secret)
   - The operation that was denied (from the node type and parameters — e.g., "create refund", "update customer")
   - The Stripe Dashboard link for the key's permission settings: Dashboard → Developers → API keys → Restricted keys → \<key name\>
2. Fix guidance: "In Stripe Dashboard → Developers → API keys → Restricted keys, find the key named in the error. Add the missing permission for `<resource>/<write>` (e.g., `Refunds / Write`, `Customers / Write`). Stripe restricted keys have granular resource-level permissions — `read` permission is insufficient for write operations even on the same resource. After updating the key's permissions, no changes are needed in n8n — the key identifier does not change."
3. Do NOT automatically upgrade to a full secret key. Restricted keys exist to limit blast radius. The correct fix is to grant the specific permission needed, not to switch to an unrestricted key.
4. Check whether other workflows using the same restricted key are also affected by this permission gap.

## Prevention — recommendations for the customer report

Add to the customer's `playbooks/report-to-agency` section:

- **Use restricted API keys, not secret keys, for all n8n Stripe workflows.** A restricted key that can only `Customers/Read` and `Charges/Write` cannot accidentally cancel subscriptions or issue refunds even if the workflow has a bug. Minimum-permission keys are the most important security control for money-touching automation.
- **Always design a declined-card branch.** Any workflow that initiates a Stripe charge must handle HTTP 402. If the workflow does not have an explicit declined branch, failed charges are silent. The customer is not notified, the CRM is not updated, and the payment gap compounds. Use an `If` node immediately after the Stripe charge node: if `error.code = "card_declined"`, route to the decline handler.
- **Derive idempotency keys from stable business identifiers, not from random UUIDs.** The pattern `{customerId}_{action}_{YYYY-MM-DD}` is stable across retries within the same business day and prevents both accidental duplicates and idempotency conflicts from payload changes.
- **Pin the Stripe API version.** Set an explicit `Stripe-Version: YYYY-MM-DD` header when using HTTP Request nodes for Stripe. Check the Stripe changelog quarterly for breaking changes to fields your workflow depends on. The Stripe Dashboard → Developers → API version setting controls what version the account uses, but n8n's node may override it with its own hardcoded version — verify which version wins.
- **For bulk Stripe operations (backfills, batch charges), use a queue architecture.** A scheduler that fires one execution per customer, with the executions queued and processed serially, avoids rate limiting. A loop that fires 1,000 charge requests in a single execution will hit the 100 req/s limit within seconds.
- **Log `request_id` for every Stripe API call.** Stripe's `request_id` (the `req_XXXXXXXXXX` field in every response) is required when contacting Stripe support. Without it, Stripe cannot look up the specific API call. Log it to your incident table before any notification or further processing.
- **Do not treat `api_error` (HTTP 500/503) the same as `rate_limit_error`.** Both can be retried, but `api_error` represents a Stripe-side transient failure — use exponential backoff (1s, 2s, 4s, 8s) rather than the fixed `Retry-After` delay.

## Code snippets

### Stripe error router — Code node

```javascript
// Place immediately after any Stripe node that can decline or fail.
// Returns a categorized outcome for downstream If/Switch routing.

const httpCode = $json.httpCode || $json.statusCode || null;
const error = $json.error || {};

let diagnosis = 'stripe.unknown';
let autoRetry = false;

if (error.type === 'idempotency_error') {
  diagnosis = 'stripe.idempotency-conflict';
  autoRetry = false;
} else if (httpCode === 402 && error.type === 'card_error') {
  diagnosis = 'stripe.card-declined';
  autoRetry = false;
} else if (httpCode === 429 && error.type === 'rate_limit_error') {
  diagnosis = 'stripe.rate-limit';
  autoRetry = true;
} else if (httpCode === 403) {
  diagnosis = 'stripe.insufficient-permissions';
  autoRetry = false;
} else if (httpCode >= 500 && error.type === 'api_error') {
  diagnosis = 'stripe.transient-error';
  autoRetry = true;
}

return [{
  json: {
    diagnosis,
    autoRetry,
    declineCode: error.decline_code || null,
    requestId: error.request_id || null,
    livemode: error.livemode ?? null,
    chargeId: error.charge || null,
    retryAfterMs: autoRetry ? (Number($json.headers?.['retry-after'] || 1) * 1000) : null,
    rawError: error
  }
}];
```

### Idempotency key generator — stable business-intent pattern

```javascript
// Place in a Set node or Code node before any Stripe charge/create call.
// Generates a stable idempotency key from business identifiers.

const customerId = $json.stripeCustomerId;   // e.g. cus_XXXXXXXX
const planId = $json.stripePriceId;          // e.g. price_XXXXXXXX
const today = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD

// For a subscription creation — stable within the day
const subscriptionKey = `${customerId}_sub_${planId}_${today}`;

// For a one-time charge — stable for this specific invoice
const invoiceId = $json.internalInvoiceId;  // your system's invoice ID
const chargeKey = `inv_${invoiceId}_charge`;  // no date needed — invoice ID is already unique

// For a refund on a known charge — inherently unique
const chargeToRefund = $json.stripeChargeId;
const refundKey = `${chargeToRefund}_refund_full`;

return [{
  json: {
    ...$json,
    idempotencyKey: chargeKey  // use whichever key is appropriate
  }
}];
```

### Detecting silent API version mismatch

```javascript
// Code node placed after any Stripe node to validate expected fields are present.
// Customize `requiredFields` based on what downstream nodes depend on.

const response = $json;
const requiredFields = [
  'id',
  'customer',
  'payment_method_details',  // renamed in some API versions
  'amount',
  'currency'
];

const missingFields = requiredFields.filter(field => !(field in response));

if (missingFields.length > 0) {
  // Do not throw — log the mismatch and route to the version-mismatch handler
  return [{
    json: {
      versionMismatch: true,
      missingFields,
      stripeVersionReceived: $json.headers?.['stripe-version'] || 'unknown',
      objectId: response.id || null,
      objectType: response.object || null
    }
  }];
}

return $input.all();
```

## Field checklist

Before escalating or resolving a Stripe case, confirm these fields are captured in the incident record:

- [ ] `error.type` (idempotency_error / card_error / rate_limit_error / invalid_request_error)
- [ ] `error.code` and `error.decline_code` — for card_declined cases
- [ ] `error.request_id` (`req_XXXXXXXXXX`) — required for Stripe support escalation
- [ ] `error.livemode` (true/false) — confirms whether real money is involved
- [ ] HTTP status code (400 / 402 / 403 / 429)
- [ ] The idempotency key used — for idempotency-conflict cases
- [ ] `Retry-After` header value — for rate-limit cases
- [ ] Stripe Dashboard API version — for api-version-mismatch cases
- [ ] Restricted key ID and permissions configured — for insufficient-permissions cases
- [ ] Whether other workflows using the same Stripe key are also affected
- [ ] `charge` or `payment_intent` ID — for card-declined cases (needed for CRM update)

## Cross-references

`decision-trees/failure-diagnosis` · `decision-trees/error-classification` (subtypes `ratelimit.stripe`, `auth.key-permissions`, `data.silent-corruption`) · `cases/webhook-signature-validation` (for Stripe webhook HMAC failures — not covered here) · `cases/concurrent-execution-conflict` (for duplicate Stripe charges from parallel webhook deliveries) · `playbooks/recover-from-api-error` · `reference/api/api-stripe`
