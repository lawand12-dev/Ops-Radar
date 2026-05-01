# Notion API

**Category:** Tools
**Source:** https://developers.notion.com/reference/intro, https://developers.notion.com/reference/request-limits, https://developers.notion.com/reference/versioning, https://developers.notion.com/reference/post-database-query
**Updated:** 2026-05-01

## Overview
Notion API is useful for lightweight portals, task databases, report pages, and knowledge-base storage. Its production risks are integration sharing, object model complexity, rich text limits, pagination, and rate limiting around three requests per second per integration.

## Related Notes
[[n8n-node-notion]] · [[pagination-failures]] · [[date-format-mismatches]] · [[file-handling-failures]]

---


## Authentication Patterns
Internal integrations use a bearer token and must be explicitly shared with every page or database they need. Public integrations use OAuth and receive bot access scoped by the user's selected workspace resources.

Production integrations should store the account, app, and credential owner next to the n8n credential ID. The practical failure is rarely "no token"; it is usually the correct token attached to the wrong workspace, ad account, store, property, or portal. For OAuth apps, log token expiry, refresh outcome, granted scopes, and the external account ID returned by the vendor's `me` or metadata endpoint.

| Credential | Use it for | Production note |
| --- | --- | --- |
| Internal integration | One workspace automation | Share every parent database/page. |
| Public OAuth | Distributed Notion app | Respect selected pages and refresh flow. |
| File URLs | External file references | Binary upload support is limited and version-dependent. |

## Rate Limits & Quota Systems
Notion's average request limit is about three requests per second per integration, with some burst tolerance. Payload size, block limits, rich text arrays, and pagination create practical limits before raw request count does.

| Limit surface | Value / behavior | Workflow control |
| --- | --- | --- |
| Request rate | Average 3 req/s/integration | Central queue for all workflows using same token. |
| Pagination | `has_more` and `start_cursor` | Loop until false with max-iteration guard. |
| Payload size | Block/rich-text/file limits | Chunk page writes. |

Keep a local throttle keyed by the external account ID, not by the workflow execution. Parallel executions that each respect a per-node delay can still overload one vendor account. For nightly reports, use a shared queue table with `next_allowed_at` so retries after a `429` do not compete with fresh runs.

## Common Error Codes
| Code / symptom | Operational meaning | Recovery |
| --- | --- | --- |
| object_not_found | Not shared with integration or wrong ID | Share parent and verify workspace. |
| rate_limited | Too many requests | Respect `Retry-After`. |
| validation_error | Property, block, or filter shape invalid | Compare against database schema. |
| restricted_resource | Integration lacks capability | Update integration capabilities. |
| conflict_error | Concurrent update/version conflict | Refetch and retry safely. |

Always persist the raw error body and response headers. Vendor support teams usually need request IDs, trace IDs, app IDs, and account IDs; without those, the only recovery path is guesswork and repeated failed executions.

## Webhook Reliability
Notion API historically required polling for changes; newer automation should still design for polling windows and idempotent updates unless a specific webhook/event capability is available for the workspace plan and integration type.

Webhook handlers should answer quickly, enqueue work, and deduplicate by event ID. Do not perform the expensive API lookup before returning a `2xx`, because several vendors treat a slow response like a failed response and will retry the same event. Store the signature verification result and the received timestamp so replay attacks and delayed retries can be separated during incident review.

## Breaking Changes 2024-2026
The `Notion-Version` header pins behavior. Database, data source, and property APIs have evolved; pin the version used by the n8n workflow and test schema queries before changing it.

Pin API versions wherever the platform allows it, and schedule a quarterly smoke test against the next version. The high-risk fields are attribution windows, consent fields, association objects, pagination cursors, and webhook payload shapes because they often change without breaking authentication.

## Production Gotchas
- Database IDs and page IDs often include hyphen/no-hyphen variants.
- Rollups and formulas may be read-only or delayed.
- Rich text arrays need annotations and plain text fallback.
- Nested block content requires separate child-block calls.

## Integration Anti-Patterns
- Using Notion as a high-throughput operational database.
- Creating pages without checking required properties.
- Assuming a shared parent means all child databases are shared.
- Writing huge reports as one block append.

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

The Notion node is good for common database-page CRUD. For complex filters, rollups, and block children, HTTP Request with explicit `Notion-Version` is easier to debug.
