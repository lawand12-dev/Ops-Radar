# GA4 Data API and BigQuery Export

**Category:** Tools
**Source:** https://developers.google.com/analytics/devguides/reporting/data/v1, https://developers.google.com/analytics/devguides/reporting/data/v1/quotas, https://support.google.com/analytics/answer/9358801, https://developers.google.com/analytics/devguides/reporting/data/v1/rest
**Updated:** 2026-05-01

## Overview
GA4 reporting splits between the Data API for operational reports and BigQuery export for raw event analysis. The failure modes are quota-token exhaustion, dimension/metric incompatibility, property time zone assumptions, and UI-vs-API reconciliation gaps.

## Related Notes
[[n8n-node-google-analytics]] · [[date-format-mismatches]] · [[timezone-handling]] · [[pagination-failures]]

---


## Authentication Patterns
Use OAuth2 for agency user-driven reporting and service accounts for BigQuery projects where the property export is already linked. GA4 Data API calls use numeric property IDs, not measurement IDs, stream IDs, or the `G-` web tag identifier.

Production integrations should store the account, app, and credential owner next to the n8n credential ID. The practical failure is rarely "no token"; it is usually the correct token attached to the wrong workspace, ad account, store, property, or portal. For OAuth apps, log token expiry, refresh outcome, granted scopes, and the external account ID returned by the vendor's `me` or metadata endpoint.

| Credential | Use it for | Production note |
| --- | --- | --- |
| OAuth2 | Data API reports from accessible properties | Grant Analytics read permissions. |
| Service account | BigQuery export queries | Share dataset/project explicitly. |
| API key | Not appropriate for private GA4 data | Use only for public metadata where allowed. |

## Rate Limits & Quota Systems
The Data API uses token quotas by property and method category. Standard properties have lower daily/hourly token budgets than Analytics 360, concurrent request limits apply, and complex reports with many dimensions, rows, and date ranges consume more tokens.

| Limit surface | Value / behavior | Workflow control |
| --- | --- | --- |
| Standard property | Core tokens per property per day and per hour | Return property quota in responses. |
| Analytics 360 | Higher token and concurrency budgets | Still isolate client workloads. |
| BigQuery export | Daily export plus optional streaming export | Use SQL for large raw-event reports. |

Keep a local throttle keyed by the external account ID, not by the workflow execution. Parallel executions that each respect a per-node delay can still overload one vendor account. For nightly reports, use a shared queue table with `next_allowed_at` so retries after a `429` do not compete with fresh runs.

## Common Error Codes
| Code / symptom | Operational meaning | Recovery |
| --- | --- | --- |
| RESOURCE_EXHAUSTED | Property token or concurrency quota exceeded | Wait and reduce report complexity. |
| INVALID_ARGUMENT | Bad dimension/metric/filter/date combination | Run metadata compatibility check. |
| 403 | User or service account lacks property/dataset access | Verify GA4 property and BigQuery IAM. |
| Empty rows | Filter/date range excludes data or freshness lag | Compare with Realtime and BigQuery export. |
| Sampling/thresholding indicators | Privacy or cardinality effects | Use BigQuery export for raw analysis. |

Always persist the raw error body and response headers. Vendor support teams usually need request IDs, trace IDs, app IDs, and account IDs; without those, the only recovery path is guesswork and repeated failed executions.

## Webhook Reliability
GA4 does not provide general reporting webhooks. Schedule reports after expected processing delay, and for near-real-time alerts use Realtime API with stricter limits or stream events to BigQuery and query recent partitions.

Webhook handlers should answer quickly, enqueue work, and deduplicate by event ID. Do not perform the expensive API lookup before returning a `2xx`, because several vendors treat a slow response like a failed response and will retry the same event. Store the signature verification result and the received timestamp so replay attacks and delayed retries can be separated during incident review.

## Breaking Changes 2024-2026
Universal Analytics migration is complete, but legacy UA mental models still break workflows: sessions, source/medium attribution, and event parameters differ in GA4. In 2024-2026, watch Data API compatibility, BigQuery schema additions, and consent-mode effects.

Pin API versions wherever the platform allows it, and schedule a quarterly smoke test against the next version. The high-risk fields are attribution windows, consent fields, association objects, pagination cursors, and webhook payload shapes because they often change without breaking authentication.

## Production Gotchas
- GA4 API dates are `YYYY-MM-DD`; BigQuery event tables are often suffixed `YYYYMMDD`.
- Property time zone controls reporting days.
- Dimension cardinality can collapse rows into `(other)` in UI while BigQuery shows raw events.
- Realtime API should not be used for month-end reporting.

## Integration Anti-Patterns
- Comparing GA4 UI numbers to BigQuery raw rows without defining metric semantics.
- Running every client report at midnight before data settles.
- Using measurement ID as property ID.
- Pulling raw event exports through the Data API.

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

Store `property_id`, `property_timezone`, and report freshness lag per client. Build one normalized report item per metric group and keep the raw Data API response for reconciliation.
