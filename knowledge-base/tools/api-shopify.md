# Shopify API

**Category:** Tools
**Source:** https://shopify.dev/docs/api/admin-rest, https://shopify.dev/docs/api/admin-rest/usage/rate-limits, https://shopify.dev/docs/api/usage/rate-limits, https://shopify.dev/docs/apps/build/webhooks/troubleshooting-webhooks
**Updated:** 2026-05-01

## Overview
Shopify Admin API now strongly favors GraphQL for new apps while REST remains legacy. Production integrations must handle quarterly API versions, leaky-bucket REST limits, GraphQL cost budgets, webhook retries, HMAC signatures, and bulk operations.

## Related Notes
[[webhook-reliability]] · [[pagination-failures]] · [[currency-conversion]] · [[file-handling-failures]]

---


## Authentication Patterns
Custom and public apps use access tokens scoped to one shop or installed via OAuth. Store the shop domain, API version, scopes, and app type with every credential because the same token shape can represent very different permission surfaces.

Production integrations should store the account, app, and credential owner next to the n8n credential ID. The practical failure is rarely "no token"; it is usually the correct token attached to the wrong workspace, ad account, store, property, or portal. For OAuth apps, log token expiry, refresh outcome, granted scopes, and the external account ID returned by the vendor's `me` or metadata endpoint.

| Credential | Use it for | Production note |
| --- | --- | --- |
| Admin access token | Custom/private shop automation | Scope tightly and rotate on app reinstall. |
| OAuth app token | Multi-shop app installs | Handle uninstall webhooks. |
| Storefront token | Buyer-facing storefront reads | Not valid for Admin writes. |

## Rate Limits & Quota Systems
REST Admin API uses a leaky bucket: standard stores have 40 request bucket and 2 requests/second leak rate; Plus increases capacity. GraphQL uses cost-based throttling, with query cost and restore rate visible in responses.

| Limit surface | Value / behavior | Workflow control |
| --- | --- | --- |
| REST legacy | 40 bucket, 2/sec standard; higher on Plus | Watch `X-Shopify-Shop-Api-Call-Limit`. |
| GraphQL Admin | Cost budget and restore rate | Request only needed fields. |
| Bulk operations | Async exports/mutations | Use for catalog and order backfills. |

Keep a local throttle keyed by the external account ID, not by the workflow execution. Parallel executions that each respect a per-node delay can still overload one vendor account. For nightly reports, use a shared queue table with `next_allowed_at` so retries after a `429` do not compete with fresh runs.

## Common Error Codes
| Code / symptom | Operational meaning | Recovery |
| --- | --- | --- |
| 422 | Validation error, often product/variant/metafield shape | Log field errors and schema version. |
| 429 | REST bucket or resource throttle | Use `Retry-After` and queue per shop. |
| 423 | Shop locked or unavailable | Pause and alert AM. |
| 401/403 | Uninstalled app or missing scope | Stop workflow and reconnect. |
| HMAC mismatch | Body changed before verification | Verify raw request body. |

Always persist the raw error body and response headers. Vendor support teams usually need request IDs, trace IDs, app IDs, and account IDs; without those, the only recovery path is guesswork and repeated failed executions.

## Webhook Reliability
Shopify retries failed webhooks and removes persistently failing subscriptions. Return a fast `2xx`, verify HMAC, store delivery IDs, and re-register subscriptions after app reinstall or API version changes.

Webhook handlers should answer quickly, enqueue work, and deduplicate by event ID. Do not perform the expensive API lookup before returning a `2xx`, because several vendors treat a slow response like a failed response and will retry the same event. Store the signature verification result and the received timestamp so replay attacks and delayed retries can be separated during incident review.

## Breaking Changes 2024-2026
REST Admin API became legacy in 2024, and new public apps must use GraphQL Admin API from 2025. Quarterly API versions are supported for a limited window, so pin versions and review deprecated fields every quarter.

Pin API versions wherever the platform allows it, and schedule a quarterly smoke test against the next version. The high-risk fields are attribution windows, consent fields, association objects, pagination cursors, and webhook payload shapes because they often change without breaking authentication.

## Production Gotchas
- REST page-based pagination is deprecated; use cursor Link headers.
- Order financial fields include presentment and shop currencies.
- Metafield definitions control value types.
- Bulk operation results are JSONL files, not ordinary JSON arrays.

## Integration Anti-Patterns
- Building a new app on REST-only patterns.
- Fetching all orders without `updated_at_min` checkpoints.
- Ignoring app/uninstalled webhook.
- Treating GraphQL cost like ordinary request count.

## n8n Integration Notes
Use the native node only when it exposes the exact version and resource shape needed. For newer API revisions, prefer HTTP Request with explicit headers and a Set node that normalizes IDs, timestamps, currency units, and error metadata before downstream branches.

```javascript
    const retryAfter = Number($json.headers?.["retry-after"] || 0);
    return [{
      json: {
        ok: $json.statusCode < 400,
        retryAfterMs: retryAfter ? retryAfter * 1000 : null,
        requestId: $json.headers?.["x-request-id"] || $json.headers?.["x-shopify-request-id"] || null,
        accountKey: $json.account_id || $json.customer_id || $json.shop || null
      }
    }];
```

Use HTTP Request for GraphQL Admin API and parse `extensions.cost` into a throttle table. For webhooks, n8n should verify HMAC before enqueuing the event.
