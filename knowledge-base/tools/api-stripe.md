# Stripe API

**Category:** Tools
**Source:** https://docs.stripe.com/api, https://docs.stripe.com/rate-limits, https://docs.stripe.com/webhooks, https://docs.stripe.com/api/idempotent_requests
**Updated:** 2026-05-01

## Overview
Stripe API covers payments, subscriptions, refunds, disputes, invoices, and Connect platform flows. The operational risks are idempotency, webhook ordering, API-version pinning, object locks, SCA/3DS handling, and money-touching approval controls.

## Related Notes
[[approval-money-touching]] · [[webhook-reliability]] · [[currency-conversion]] · [[approval-audit-logging]]

---


## Authentication Patterns
Use restricted keys for narrow server workflows, secret keys for backend-only trusted services, OAuth for Connect platforms, and webhook signing secrets per endpoint. Never share test and live keys or reuse a signing secret across environments.

Production integrations should store the account, app, and credential owner next to the n8n credential ID. The practical failure is rarely "no token"; it is usually the correct token attached to the wrong workspace, ad account, store, property, or portal. For OAuth apps, log token expiry, refresh outcome, granted scopes, and the external account ID returned by the vendor's `me` or metadata endpoint.

| Credential | Use it for | Production note |
| --- | --- | --- |
| Secret/restricted key | Backend API calls | Scope and store in n8n credentials. |
| Connect OAuth | Platform acting for connected accounts | Set `Stripe-Account` correctly. |
| Webhook secret | Signature verification | One secret per endpoint/environment. |

## Rate Limits & Quota Systems
Stripe's basic live-mode rate limiter is high, but endpoint-specific, concurrency, and object-lock limiters matter in automation. `429 lock_timeout` is not the same as global rate limiting; it means concurrent operations are fighting over the same object.

| Limit surface | Value / behavior | Workflow control |
| --- | --- | --- |
| Global live | 100 operations/second basic limiter | Still avoid bursts from backfills. |
| Endpoint default | Often lower than global | Throttle hot endpoints separately. |
| Object locks | `lock_timeout` on concurrent mutations | Serialize by customer/subscription/payment intent. |

Keep a local throttle keyed by the external account ID, not by the workflow execution. Parallel executions that each respect a per-node delay can still overload one vendor account. For nightly reports, use a shared queue table with `next_allowed_at` so retries after a `429` do not compete with fresh runs.

## Common Error Codes
| Code / symptom | Operational meaning | Recovery |
| --- | --- | --- |
| card_error | Issuer or payment-method failure | Do not retry blindly; inspect decline code. |
| invalid_request_error | Bad parameter or object state | Fix payload/state machine. |
| api_error | Stripe-side transient issue | Retry with idempotency key. |
| 429 | Rate, concurrency, or lock limiter | Read `Stripe-Rate-Limited-Reason`. |
| signature verification failed | Raw body or wrong secret | Use raw payload and correct endpoint secret. |

Always persist the raw error body and response headers. Vendor support teams usually need request IDs, trace IDs, app IDs, and account IDs; without those, the only recovery path is guesswork and repeated failed executions.

## Webhook Reliability
Stripe retries live webhook events for up to three days with exponential backoff. Event order is not guaranteed, so fetch current object state before irreversible actions and deduplicate by `event.id`.

Webhook handlers should answer quickly, enqueue work, and deduplicate by event ID. Do not perform the expensive API lookup before returning a `2xx`, because several vendors treat a slow response like a failed response and will retry the same event. Store the signature verification result and the received timestamp so replay attacks and delayed retries can be separated during incident review.

## Breaking Changes 2024-2026
Stripe accounts have pinned API versions, but library upgrades and explicit version changes can alter response shapes. Review Payment Intents, Checkout, subscription billing, and Connect transfer behavior before version bumps.

Pin API versions wherever the platform allows it, and schedule a quarterly smoke test against the next version. The high-risk fields are attribution windows, consent fields, association objects, pagination cursors, and webhook payload shapes because they often change without breaking authentication.

## Production Gotchas
- Refund success can be delayed or fail after creation.
- Disputes have strict evidence deadlines.
- SCA/3DS can leave PaymentIntents in `requires_action`.
- Connect balance availability and payout timing vary by account and country.

## Integration Anti-Patterns
- Charging cards directly from automation without human approval.
- Processing webhooks without idempotency.
- Using Charges API mental models for Payment Intents.
- Updating the same subscription from parallel executions.

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

Use one idempotency key per business action, not per retry attempt. Store Stripe request IDs and event IDs in an audit table before sending client-facing finance notifications.
