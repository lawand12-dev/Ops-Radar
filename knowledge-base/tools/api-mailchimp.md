# Mailchimp API

**Category:** Tools
**Source:** https://mailchimp.com/developer/marketing/docs/fundamentals/, https://mailchimp.com/developer/marketing/docs/errors/, https://mailchimp.com/developer/marketing/guides/sync-audience-data-with-the-batch-endpoint/, https://mailchimp.com/developer/marketing/guides/about-webhooks/
**Updated:** 2026-05-01

## Overview
Mailchimp Marketing API manages audiences, members, tags, segments, campaigns, ecommerce stores, and batch jobs. Production issues cluster around datacenter routing, audience terminology, concurrent connection limits, async batch behavior, and compliance-sensitive unsubscribe handling.

## Related Notes
[[email-deliverability]] · [[pagination-failures]] · [[webhook-reliability]] · [[approval-client-facing-actions]]

---


## Authentication Patterns
API keys include the datacenter suffix, such as `us10`, and requests must target that datacenter. OAuth is better for multi-client apps, while API keys remain common for single-account agency workflows.

Production integrations should store the account, app, and credential owner next to the n8n credential ID. The practical failure is rarely "no token"; it is usually the correct token attached to the wrong workspace, ad account, store, property, or portal. For OAuth apps, log token expiry, refresh outcome, granted scopes, and the external account ID returned by the vendor's `me` or metadata endpoint.

| Credential | Use it for | Production note |
| --- | --- | --- |
| API key | Single account server automation | Parse `dc` suffix for base URL. |
| OAuth | Distributed integrations | Store account/datacenter metadata. |
| Mandrill key | Transactional email | Not the Marketing API. |

## Rate Limits & Quota Systems
Mailchimp focuses on concurrent connection limits rather than a simple published requests-per-second number. Batch operations are async and should be used for large audience syncs instead of one request per member.

| Limit surface | Value / behavior | Workflow control |
| --- | --- | --- |
| Concurrent requests | 10 simultaneous processing requests per user | Limit n8n concurrency and long requests. |
| Pagination | `count` + `offset`, max page sizes | Checkpoint offsets and totals. |
| Batch | Async job with status endpoint/webhook | Use for bulk member updates. |

Keep a local throttle keyed by the external account ID, not by the workflow execution. Parallel executions that each respect a per-node delay can still overload one vendor account. For nightly reports, use a shared queue table with `next_allowed_at` so retries after a `429` do not compete with fresh runs.

## Common Error Codes
| Code / symptom | Operational meaning | Recovery |
| --- | --- | --- |
| 214 invalid email | Address format or domain issue | Validate before subscribe/update. |
| 250 tag not found | Tag or segment reference missing | Create or map tags first. |
| 400 Member Exists | Create path used for existing member | Use PUT upsert with subscriber hash. |
| 429 TooManyRequests | Connection or pending webhook/batch limit | Pause and reduce parallelism. |
| 502/504 | Server timeout while operation may continue | Check batch/status before retrying. |

Always persist the raw error body and response headers. Vendor support teams usually need request IDs, trace IDs, app IDs, and account IDs; without those, the only recovery path is guesswork and repeated failed executions.

## Webhook Reliability
Mailchimp webhooks can notify subscribe, unsubscribe, profile update, cleaned, campaign, and ecommerce events. Verify the source and always re-fetch member status before resubscribing or sending because compliance state can change outside the workflow.

Webhook handlers should answer quickly, enqueue work, and deduplicate by event ID. Do not perform the expensive API lookup before returning a `2xx`, because several vendors treat a slow response like a failed response and will retry the same event. Store the signature verification result and the received timestamp so replay attacks and delayed retries can be separated during incident review.

## Breaking Changes 2024-2026
Mailchimp's v3 API is stable, but product terminology has shifted from lists to audiences and specific endpoints evolve. Keep Mandrill/Transactional Email separate from Marketing API workflows.

Pin API versions wherever the platform allows it, and schedule a quarterly smoke test against the next version. The high-risk fields are attribution windows, consent fields, association objects, pagination cursors, and webhook payload shapes because they often change without breaking authentication.

## Production Gotchas
- Member IDs are MD5 hashes of lowercase email addresses.
- Unsubscribed and cleaned contacts should not be blindly re-added.
- Offset pagination drifts during active list changes.
- Campaign send actions are client-facing and need approval gates.

## Integration Anti-Patterns
- Looping thousands of contacts synchronously.
- Hardcoding `usX` datacenter from one client.
- Treating tags as permission to email.
- Ignoring GDPR/delete vs unsubscribe semantics.

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

Use HTTP Request for batch operations and store the batch ID. For member upserts, compute the subscriber hash in a Code node and write status changes to audit logging.
