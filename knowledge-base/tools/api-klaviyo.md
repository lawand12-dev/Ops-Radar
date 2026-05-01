# Klaviyo API

**Category:** Tools
**Source:** https://developers.klaviyo.com/en/reference/api_overview, https://developers.klaviyo.com/en/docs/rate_limits_and_error_handling, https://developers.klaviyo.com/en/v2024-02-15/docs/set_up_oauth, https://help.klaviyo.com/hc/en-us/articles/7423954176283
**Updated:** 2026-05-01

## Overview
Klaviyo API handles profiles, events, lists, segments, metrics, flows, and ecommerce marketing data. The gotchas are revision headers, profile object changes, fixed-window rate limits, list vs segment semantics, and high-volume event ingestion.

## Related Notes
[[n8n-node-klaviyo]] · [[rate-limit-recovery]] · [[date-format-mismatches]] · [[ai-cost-optimization]]

---


## Authentication Patterns
Private API keys are scoped and account-bound; OAuth apps receive their own quota per installed app instance. Public API keys belong only on client-side endpoints such as event collection where Klaviyo explicitly allows them.

Production integrations should store the account, app, and credential owner next to the n8n credential ID. The practical failure is rarely "no token"; it is usually the correct token attached to the wrong workspace, ad account, store, property, or portal. For OAuth apps, log token expiry, refresh outcome, granted scopes, and the external account ID returned by the vendor's `me` or metadata endpoint.

| Credential | Use it for | Production note |
| --- | --- | --- |
| Private API key | Server-side profile, list, metric, flow operations | Create scoped keys and rotate on staff changes. |
| OAuth | Distributed app installs | Quota isolated per install. |
| Public key/company ID | Client event collection | Never use for private endpoints. |

## Rate Limits & Quota Systems
Modern Klaviyo endpoints use fixed windows with burst and steady limits, and limits differ by endpoint size class. Bulk import and metric aggregation should be scheduled rather than mixed into live webhook processing.

| Limit surface | Value / behavior | Workflow control |
| --- | --- | --- |
| Endpoint classes | Small/medium/large/XL style budgets | Read endpoint docs before loops. |
| OAuth install | Own quota per installed app instance | Prefer OAuth for SaaS-style agency tooling. |
| Private key | Shared account quota | Centralize throttling per Klaviyo account. |

Keep a local throttle keyed by the external account ID, not by the workflow execution. Parallel executions that each respect a per-node delay can still overload one vendor account. For nightly reports, use a shared queue table with `next_allowed_at` so retries after a `429` do not compete with fresh runs.

## Common Error Codes
| Code / symptom | Operational meaning | Recovery |
| --- | --- | --- |
| 400 validation | Bad JSON:API shape, missing attributes, or wrong revision | Validate payload and revision header. |
| 401/403 | Invalid key or missing scope | Rotate/re-scope credential. |
| 404 | Profile/list/metric not found or not visible | Check account and object ID. |
| 409 | Conflict in unique identifier or relationship | Use update/upsert path. |
| 429 | Burst or steady rate limit | Respect reset headers and queue. |

Always persist the raw error body and response headers. Vendor support teams usually need request IDs, trace IDs, app IDs, and account IDs; without those, the only recovery path is guesswork and repeated failed executions.

## Webhook Reliability
Klaviyo webhooks and event-triggered flows should not replace event ingestion. Verify each webhook topic, deduplicate by event/profile ID, and keep flow-triggering events idempotent so retries do not start duplicate customer journeys.

Webhook handlers should answer quickly, enqueue work, and deduplicate by event ID. Do not perform the expensive API lookup before returning a `2xx`, because several vendors treat a slow response like a failed response and will retry the same event. Store the signature verification result and the received timestamp so replay attacks and delayed retries can be separated during incident review.

## Breaking Changes 2024-2026
Klaviyo revision dates are contract boundaries. The 2024 profile API moved teams toward unified profile objects and stricter JSON:API payloads; pin the `revision` header and test the next revision before bumping.

Pin API versions wherever the platform allows it, and schedule a quarterly smoke test against the next version. The high-risk fields are attribution windows, consent fields, association objects, pagination cursors, and webhook payload shapes because they often change without breaking authentication.

## Production Gotchas
- Lists are explicit membership; segments are rule-based and may not update instantly.
- Metric aggregates can lag behind event ingestion.
- Profiles can be merged or suppressed, changing lookup behavior.
- Events need stable unique IDs for deduplication in ecommerce flows.

## Integration Anti-Patterns
- Omitting the `revision` header.
- Bulk importing profiles through one-item loops.
- Treating a segment as a static send list.
- Using email only when phone/SMS profiles are in scope.

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

Use HTTP Request with `Authorization: Klaviyo-API-Key` and a fixed `revision` header. Normalize JSON:API `data.attributes` into flat fields before routing.
