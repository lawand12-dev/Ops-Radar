# Airtable API

**Category:** Tools
**Source:** https://airtable.com/developers/web/api/introduction, https://support.airtable.com/docs/managing-api-call-limits-in-airtable, https://airtable.com/developers/web/api/webhooks-overview, https://airtable.com/developers/web/api/list-records
**Updated:** 2026-05-01

## Overview
Airtable API is a practical operational datastore for agencies, but it behaves like a collaborative spreadsheet with API constraints rather than a relational database. Watch PAT scopes, base-level rate limits, formula filters, attachment payloads, and linked-record shapes.

## Related Notes
[[pagination-failures]] · [[concurrent-execution-race-conditions]] · [[workflow-client-health-score]] · [[approval-bulk-actions]]

---


## Authentication Patterns
Personal access tokens replaced legacy API keys and must include scopes plus base access. OAuth is available for distributed apps, while service-account-style PATs are preferred for internal agency automations.

Production integrations should store the account, app, and credential owner next to the n8n credential ID. The practical failure is rarely "no token"; it is usually the correct token attached to the wrong workspace, ad account, store, property, or portal. For OAuth apps, log token expiry, refresh outcome, granted scopes, and the external account ID returned by the vendor's `me` or metadata endpoint.

| Credential | Use it for | Production note |
| --- | --- | --- |
| PAT | Internal base automation | Grant exact base and scopes. |
| OAuth | Multi-account app installs | Store base/workspace selection. |
| Metadata API token | Schema introspection | Requires schema scopes. |

## Rate Limits & Quota Systems
Airtable enforces 5 requests per second per base and additional token/user traffic limits. Each list-records request returns up to 100 records, and batch create/update/delete operations handle up to 10 records per request.

| Limit surface | Value / behavior | Workflow control |
| --- | --- | --- |
| Per base | 5 req/s | Throttle by base ID. |
| PAT traffic | Additional aggregate user/service-account limit | Avoid one token for every client base. |
| Records per request | 100 list, 10 mutation batch | Batch and checkpoint. |

Keep a local throttle keyed by the external account ID, not by the workflow execution. Parallel executions that each respect a per-node delay can still overload one vendor account. For nightly reports, use a shared queue table with `next_allowed_at` so retries after a `429` do not compete with fresh runs.

## Common Error Codes
| Code / symptom | Operational meaning | Recovery |
| --- | --- | --- |
| INVALID_FILTER_BY_FORMULA | Formula syntax or field name problem | Test formula in Airtable first. |
| UNKNOWN_FIELD_NAME | Field renamed/deleted or wrong table | Use field IDs in production when possible. |
| REQUEST_TOO_LARGE | Payload too large or too many records | Chunk records/attachments. |
| 422 invalid_multiple_choice_options | Option missing and typecast disabled | Pre-create options or set typecast carefully. |
| 429 | Base or token rate limit | Wait 30s-style cooldown and retry. |

Always persist the raw error body and response headers. Vendor support teams usually need request IDs, trace IDs, app IDs, and account IDs; without those, the only recovery path is guesswork and repeated failed executions.

## Webhook Reliability
Airtable webhooks use payload cursors and can have delayed availability. Consumers must refresh webhook payloads before cursor expiry, store the cursor durably, and reconcile with periodic list-records checks.

Webhook handlers should answer quickly, enqueue work, and deduplicate by event ID. Do not perform the expensive API lookup before returning a `2xx`, because several vendors treat a slow response like a failed response and will retry the same event. Store the signature verification result and the received timestamp so replay attacks and delayed retries can be separated during incident review.

## Breaking Changes 2024-2026
PAT scopes and OAuth app behavior have changed since 2023. Treat base schema changes as breaking changes: field names, select options, linked-record fields, and views can change without API-version labels.

Pin API versions wherever the platform allows it, and schedule a quarterly smoke test against the next version. The high-risk fields are attribution windows, consent fields, association objects, pagination cursors, and webhook payload shapes because they often change without breaking authentication.

## Production Gotchas
- Attachment fields need URL objects; n8n binary data is not automatically uploaded.
- Views filter returned records but are not a query engine.
- Linked records are arrays of record IDs.
- Formula evaluation is server-side but formula strings are easy to misquote.

## Integration Anti-Patterns
- Using Airtable as the only source of truth for money movement.
- Hardcoding field names in many workflows.
- Running parallel updates on the same record without revision checks.
- Ignoring monthly API-call limits on Free/Team plans.

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

Store base ID, table ID, and field IDs in config. Use Split In Batches at 10 for writes and 100 for reads, with a Wait node to stay below the per-base limit.
