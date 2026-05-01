# Google Ads API

**Category:** Tools
**Source:** https://developers.google.com/google-ads/api/docs/access-levels, https://developers.google.com/google-ads/api/docs/best-practices/quotas, https://developers.google.com/google-ads/api/docs/query/overview, https://developers.google.com/google-ads/api/reference/rpc/v19/overview
**Updated:** 2026-05-01

## Overview
Google Ads API integrates campaign reporting, conversion uploads, asset management, and account hierarchy operations. The production traps are developer-token access level, manager-account context, GAQL semantics, micros currency units, and partial-failure handling.

## Related Notes
[[n8n-node-google-ads]] · [[rate-limit-recovery]] · [[currency-conversion]] · [[pagination-failures]]

---


## Authentication Patterns
Every production call needs OAuth2, a developer token, and the correct customer context. Manager accounts can see child accounts only when the login customer ID is set correctly; remove hyphens from customer IDs in headers and store both manager and client IDs in workflow config.

Production integrations should store the account, app, and credential owner next to the n8n credential ID. The practical failure is rarely "no token"; it is usually the correct token attached to the wrong workspace, ad account, store, property, or portal. For OAuth apps, log token expiry, refresh outcome, granted scopes, and the external account ID returned by the vendor's `me` or metadata endpoint.

| Credential | Use it for | Production note |
| --- | --- | --- |
| OAuth2 user | Most agency MCC integrations | Use production OAuth app, not testing mode. |
| Developer token | Required on all API calls | Access level controls daily operations. |
| Login customer ID | MCC hierarchy selection | Wrong value causes authorization errors despite valid OAuth. |

## Rate Limits & Quota Systems
Daily operations depend on access level: test and basic access are limited, while standard access removes the general daily operation cap for most services. Mutates count per mutated entity, search counts as one operation, and service-specific limits still apply.

| Limit surface | Value / behavior | Workflow control |
| --- | --- | --- |
| Basic access | 15,000 operations/day | Cache metadata and avoid per-row mutates. |
| Standard access | Unlimited daily ops for most services | Still obey service and gRPC size limits. |
| Mutate request | Max 10,000 operations/request | Use partial failure and chunking. |

Keep a local throttle keyed by the external account ID, not by the workflow execution. Parallel executions that each respect a per-node delay can still overload one vendor account. For nightly reports, use a shared queue table with `next_allowed_at` so retries after a `429` do not compete with fresh runs.

## Common Error Codes
| Code / symptom | Operational meaning | Recovery |
| --- | --- | --- |
| AuthenticationError | OAuth or developer token problem | Refresh token and verify app publishing status. |
| AuthorizationError | Customer not accessible from login customer | Check MCC links and `login-customer-id`. |
| QuotaError / RESOURCE_EXHAUSTED | Daily, short-term, or service quota exceeded | Back off and reduce query breadth. |
| INVALID_ARGUMENT | GAQL, resource name, or enum issue | Validate with a minimal GAQL query. |
| PartialFailureError | Some mutate ops failed while others succeeded | Persist operation indexes and retry only failed entities. |

Always persist the raw error body and response headers. Vendor support teams usually need request IDs, trace IDs, app IDs, and account IDs; without those, the only recovery path is guesswork and repeated failed executions.

## Webhook Reliability
Google Ads is primarily polled rather than webhook-driven. Use ChangeEvent, ChangeStatus, and scheduled searches for sync; for conversion uploads, use idempotent order or click IDs and reconcile delayed conversion processing.

Webhook handlers should answer quickly, enqueue work, and deduplicate by event ID. Do not perform the expensive API lookup before returning a `2xx`, because several vendors treat a slow response like a failed response and will retry the same event. Store the signature verification result and the received timestamp so replay attacks and delayed retries can be separated during incident review.

## Breaking Changes 2024-2026
v17-v19 changes affected resources, enums, and reporting fields. Pin client libraries and API version, run GAQL compatibility checks before upgrades, and re-test bidding and conversion upload workflows on each version sunset.

Pin API versions wherever the platform allows it, and schedule a quarterly smoke test against the next version. The high-risk fields are attribution windows, consent fields, association objects, pagination cursors, and webhook payload shapes because they often change without breaking authentication.

## Production Gotchas
- Money values are micros: divide by 1,000,000 for reporting and multiply for writes.
- GAQL date segments can multiply rows unexpectedly.
- Conversion upload success does not mean conversion appears in UI immediately.
- SearchStream can hide large response-size failures until production data volume.

## Integration Anti-Patterns
- One mutate request per record from n8n loops.
- Using formatted customer IDs with dashes in headers.
- Ignoring partial failure details.
- Building reports without storing GAQL query versions.

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

Use the Google Ads node for simple campaign reads; use HTTP Request or a Code node with a signed client for advanced GAQL and conversion uploads. Convert micros in a Set node immediately so downstream reports never mix raw and human currency units.
