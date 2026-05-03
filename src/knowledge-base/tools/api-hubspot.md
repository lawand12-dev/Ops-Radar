# HubSpot API

**Category:** Tools
**Source:** https://developers.hubspot.com/docs/api/usage-details, https://developers.hubspot.com/docs/guides/api/app-management/webhooks, https://developers.hubspot.com/docs/api/private-apps, https://developers.hubspot.com/docs/api/crm/associations/associations-v4
**Updated:** 2026-05-01

## Overview
HubSpot API spans CRM records, associations, marketing assets, service objects, timeline events, and webhooks. Production work depends on understanding private apps vs OAuth, cursor pagination, property validation, association v4 labels, and search API limits.

## Related Notes
[[n8n-node-hubspot]] · [[pagination-failures]] · [[oauth-refresh-failures]] · [[approval-audit-logging]]

---


## Authentication Patterns
Private app tokens are the fastest path for one portal; OAuth is required for distributed apps and Marketplace-style installs. API keys were deprecated in 2022, so any workflow still asking for a hapikey should be treated as legacy risk.

Production integrations should store the account, app, and credential owner next to the n8n credential ID. The practical failure is rarely "no token"; it is usually the correct token attached to the wrong workspace, ad account, store, property, or portal. For OAuth apps, log token expiry, refresh outcome, granted scopes, and the external account ID returned by the vendor's `me` or metadata endpoint.

| Credential | Use it for | Production note |
| --- | --- | --- |
| Private app token | Single HubSpot account automations | Scopes are static; rotate manually. |
| OAuth app | Multi-client installs | Handle refresh tokens and per-portal limits. |
| Developer API key | App management only | Not CRM data access. |

## Rate Limits & Quota Systems
HubSpot applies per-10-second app limits plus account-level daily limits for private apps, and separate limits for public OAuth apps. Search API is more constrained than ordinary CRM reads and caps page size.

| Limit surface | Value / behavior | Workflow control |
| --- | --- | --- |
| Private app burst | 100-190 requests/10s by tier, higher with add-on | Throttle per portal and app. |
| Daily account | Shared across private apps in the same portal | Track daily budget centrally. |
| Search API | 5 req/s/token and 200 records/page | Use after cursors and incremental filters. |

Keep a local throttle keyed by the external account ID, not by the workflow execution. Parallel executions that each respect a per-node delay can still overload one vendor account. For nightly reports, use a shared queue table with `next_allowed_at` so retries after a `429` do not compete with fresh runs.

## Common Error Codes
| Code / symptom | Operational meaning | Recovery |
| --- | --- | --- |
| RATE_LIMITED / 429 | Burst, daily, or search limit exceeded | Use headers and queue retries. |
| INVALID_PROPERTY | Unknown or wrong-typed property name | Fetch schema before writes. |
| CONTACT_EXISTS | Duplicate unique email/create path | Use upsert or search before create. |
| VALIDATION_ERROR | Enum, date, number, or association issue | Log field-level errors. |
| 401 / 403 | Token revoked or missing scope | Reconnect or add scopes and reinstall. |

Always persist the raw error body and response headers. Vendor support teams usually need request IDs, trace IDs, app IDs, and account IDs; without those, the only recovery path is guesswork and repeated failed executions.

## Webhook Reliability
HubSpot webhooks are configured on public apps and send change notifications for CRM objects. Treat them as at-least-once events, verify signatures, and fetch the full object after receipt because payloads are intentionally compact.

Webhook handlers should answer quickly, enqueue work, and deduplicate by event ID. Do not perform the expensive API lookup before returning a `2xx`, because several vendors treat a slow response like a failed response and will retry the same event. Store the signature verification result and the received timestamp so replay attacks and delayed retries can be separated during incident review.

## Breaking Changes 2024-2026
Association API v4 introduced label-aware association handling, and v3/v4 resources now coexist. Watch 2025 app model changes, search limitations, and property behavior in custom objects during portal migrations.

Pin API versions wherever the platform allows it, and schedule a quarterly smoke test against the next version. The high-risk fields are attribution windows, consent fields, association objects, pagination cursors, and webhook payload shapes because they often change without breaking authentication.

## Production Gotchas
- Milliseconds Unix timestamps are common in CRM date properties.
- Archived records can disappear from normal reads but still affect dedup searches.
- Associations are not automatically returned with object reads.
- Batch endpoints return per-record errors that must be inspected.

## Integration Anti-Patterns
- Using contact email as the only durable ID.
- Creating custom properties from workflow code without schema review.
- Polling all contacts hourly instead of using updated-at windows.
- Ignoring association labels when syncing deals and companies.

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

The HubSpot node covers common CRM operations. For search, custom objects, and association v4, use HTTP Request with explicit path and schema validation before Set/IF branches.
