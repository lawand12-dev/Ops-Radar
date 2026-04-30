# Rate Limit Recovery Strategies

**Category:** Failures  
**Source:** Meta Graph API docs, Google Ads API docs, Shopify API engineering blog, n8n community forums, Stack Overflow "429 Too Many Requests" threads, HubSpot developer docs  
**Updated:** 2026-04-30

## Overview
Rate limiting is the second most common source of automation failures after token expiration. The subtle danger is not hitting the limit — it's the recovery strategy. Naive retries that do not implement backoff turn a temporary 429 into a permanent ban. Poor retry logic burns through daily quotas recovering from transient spikes. This page covers algorithmic recovery, platform-specific quota systems, and n8n patterns for building resilient retry queues.

## Related Notes
[[n8n-common-failures]] · [[token-expiration-patterns]] · [[pagination-failures]]

---

## How It Happens

**Fixed window limits** reset at a hard clock boundary (e.g., every minute at :00 seconds). If you burn your 100-request limit at :05 seconds, you wait until :00 of the next minute — not 60 seconds from now. Retrying at :30 will fail.

**Sliding window limits** track a rolling time window. 100 requests in any 60-second period. Retrying after 1 second does not help if 99 requests happened in the last 59 seconds.

**Leaky bucket / token bucket** (used by Shopify and Stripe) fills at a constant rate and drains on requests. You can burst up to the bucket size, then requests are throttled. Shopify's bucket is 40 calls with a 2/second restore rate for REST; GraphQL uses cost points.

**Detecting which system you're in**: Check the rate limit headers in the first response:
- `X-RateLimit-Limit` + `X-RateLimit-Reset` with a Unix timestamp → fixed window
- `X-RateLimit-Remaining` that decreases non-linearly → sliding window
- `X-Shopify-Shop-Api-Call-Limit: 32/40` → leaky bucket (current/max)
- No headers but 429 with `Retry-After` → respect the `Retry-After` value exactly

## Detection Signals
- HTTP 429 responses in execution logs
- HTTP 200 with `{"errors": [{"code": 17}]}` (Meta's rate limit is often buried in a 200 body)
- Execution time growing linearly as workflows spend more time sleeping
- Daily API call graphs showing a cliff at the limit boundary followed by zero calls
- n8n execution queue backing up during peak hours

## Real Production Examples

**Scenario 1 — Meta BUC header ignored**: An agency runs a Facebook Ads reporting workflow that fetches creative-level insights for 300 ad accounts. The workflow ignores the `X-Business-Use-Case-Usage` header. After 500 calls, Meta returns 200 responses with `{"error":{"code":17,"message":"User request limit reached"}}`. The n8n HTTP Request node marks these as successful (HTTP 200). The reporting dashboard shows zero data for all accounts processed after the 500th call. No alert fires.

**Scenario 2 — Shopify bulk order sync**: An e-commerce agency syncs Shopify orders to a Google Sheet every hour. The sync fetches orders one-by-one with individual REST calls. 800 orders × 1 API call each = 800 calls/hour. Shopify's REST bucket (40 calls, 2/sec restore) is overwhelmed within the first 4 minutes. The workflow hits 429s for the remaining 56 minutes. The n8n workflow has no sleep between requests. Solution: switch to GraphQL bulk operations or batch 250 orders per call using the `limit=250` parameter.

**Scenario 3 — Google Ads exponential backoff ignoring jitter**: A Google Ads performance report workflow retries on RESOURCE_EXHAUSTED with a clean 2^n * 1000ms delay. With 10 concurrent workflow instances all starting at the same time (triggered by the same cron), all 10 retry at second 2, then second 4, then second 8, creating a thundering herd. Adding jitter (±500ms random variance) staggers the retries and resolves the issue.

## Exponential Backoff with Jitter — Algorithm

```javascript
// n8n Code node — exponential backoff helper
// Call this before an HTTP Request node in a loop

function getBackoffMs(attempt, baseMs = 1000, maxMs = 60000) {
  // Full jitter: random between 0 and min(max, base * 2^attempt)
  const exponential = Math.min(maxMs, baseMs * Math.pow(2, attempt));
  return Math.floor(Math.random() * exponential);
}

const attempt = $('Set Retry Counter').first().json.attempt || 0;
const waitMs = getBackoffMs(attempt);

// Store wait time for the Wait node downstream
return [{ json: { attempt: attempt + 1, waitMs, waitSeconds: Math.ceil(waitMs / 1000) } }];
```

In n8n, pair this with a **Wait** node (set duration from expression `{{ $json.waitSeconds }}`) and a loop back to the HTTP Request node. Set a max attempt guard (e.g., `if attempt > 5: throw error`) to prevent infinite loops.

## Platform-Specific Rate Limit Headers

| Platform | Rate Limit Header | Recovery Signal |
|----------|-------------------|-----------------|
| Meta Graph API | `X-Business-Use-Case-Usage` (JSON header) | `call_count`, `total_cputime`, `total_time` — alert at 75% |
| Google APIs | `Retry-After` (on 429) | Use 2^n × 1000ms with jitter |
| Shopify REST | `X-Shopify-Shop-Api-Call-Limit: current/max` | Sleep when current > max*0.8 |
| HubSpot | `X-HubSpot-RateLimit-Daily-Remaining` | Switch to batch endpoints at < 1000 |
| Stripe | `Retry-After` | Respect exactly |
| Airtable | `Retry-After` | 5 req/sec per base |
| LinkedIn | `X-RateLimit-Remaining` | 100 calls/day for most endpoints |

## Circuit Breaker Pattern for Persistent Issues

When an API has been rate-limiting for > 5 consecutive attempts, stop retrying and fail fast. Implement in n8n using a static data counter:

```javascript
// n8n Code node — circuit breaker
const workflowStatic = $getWorkflowStaticData('global');
const key = `circuitBreaker_${$node.name}`;
const state = workflowStatic[key] || { failures: 0, openUntil: 0 };

if (Date.now() < state.openUntil) {
  throw new Error(`Circuit open: ${$node.name} rate-limited. Retry after ${new Date(state.openUntil).toISOString()}`);
}

// Reset or increment
const isFailure = $input.first().json.statusCode === 429;
if (isFailure) {
  state.failures += 1;
  if (state.failures >= 5) {
    state.openUntil = Date.now() + 15 * 60 * 1000; // 15-minute cooldown
    state.failures = 0;
  }
} else {
  state.failures = 0;
}

workflowStatic[key] = state;
return $input.all();
```

## Bulk vs Single-Record API Selection

For volume operations, always prefer bulk endpoints:

- **HubSpot**: Use `/crm/v3/objects/contacts/batch/read` (100 records per call) instead of individual `/contacts/{id}` calls
- **Google Ads**: Use `SearchStream` or batch `mutate` operations; never individual resource calls in a loop
- **Meta**: Use `batch` endpoint (`POST /`) to bundle up to 50 requests into one API call
- **Shopify**: Use GraphQL bulk operations for > 1,000 records; REST `limit=250` for moderate volumes

## Request Coalescing in n8n

If multiple workflow branches need the same API data, fetch it once and share via a Merge node. Avoid fetching the same campaign data in 5 parallel branches — fetch once before branching, split the data, and distribute.

## n8n-Specific Considerations

- n8n's built-in **HTTP Request** node does not retry on 429 by default. You must build the retry loop manually or use the "On Error: Continue (using Error Output)" setting combined with a loop.
- The **Wait** node accepts dynamic duration via expression. Use `{{ $('Backoff Calculator').first().json.waitSeconds }}` to drive dynamic sleep durations.
- n8n cloud's execution timeout (Starter: 5min, Pro: 15min) can expire during a long backoff sequence. Design retry logic to stay within limits or offload long-running retries to a queue (e.g., write to Supabase queue table, re-trigger via scheduled workflow).
- For persistent rate limiting, consider splitting high-volume workflows across multiple time windows rather than retrying within a single execution.
