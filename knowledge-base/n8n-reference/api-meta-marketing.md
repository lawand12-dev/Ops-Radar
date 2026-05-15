# Meta Marketing API

**Category:** Tools
**Source:** https://developers.facebook.com/docs/marketing-api/overview/, https://developers.facebook.com/docs/marketing-api/overview/rate-limiting/, https://developers.facebook.com/docs/marketing-api/lead-ads/, https://developers.facebook.com/docs/graph-api/guides/error-handling/
**Updated:** 2026-05-01

## Overview
Meta Marketing API powers Facebook and Instagram advertising automation, lead ads retrieval, insights reporting, and Conversions API integrations. The operational risk is not the HTTP call itself; it is account access, business permissions, attribution changes, and rate-limit scoring at ad-account level.

## Related Notes
[[n8n-node-facebook]] · [[rate-limit-recovery]] · [[webhook-reliability]] · [[token-expiration-patterns]]

---


## Authentication Patterns
Use system users for server-to-server Business Manager integrations, user tokens for delegated setup, page tokens for page assets, and app tokens only for app-level metadata. Long-lived user tokens still inherit the user's business access, so employee offboarding can break production workflows unless assets are owned by a Business Portfolio and granted to a system user.

Production integrations should store the account, app, and credential owner next to the n8n credential ID. The practical failure is rarely "no token"; it is usually the correct token attached to the wrong workspace, ad account, store, property, or portal. For OAuth apps, log token expiry, refresh outcome, granted scopes, and the external account ID returned by the vendor's `me` or metadata endpoint.

| Credential | Use it for | Production note |
| --- | --- | --- |
| System user token | Server automations against owned ad accounts | Grant least-privilege business asset access. |
| User/Page token | Lead ads, page-connected actions | Monitor user removal and password resets. |
| App token | App metadata and diagnostics | Not sufficient for ad account reads or writes. |

## Rate Limits & Quota Systems
Marketing API rate limiting uses Business Use Case and ad-account-level scoring. Reads are cheaper than writes, development tier apps are heavily constrained, and throttling usually appears after parallel reporting jobs rather than one obvious bad call.

| Limit surface | Value / behavior | Workflow control |
| --- | --- | --- |
| BUC scoring | Read calls commonly score lower than writes; development tier has tiny budgets | Separate reporting and mutation workflows. |
| Ad account boundary | One busy client account can throttle all workflows using it | Key queues by `act_<AD_ACCOUNT_ID>`. |
| Backfills | Insights over long ranges are expensive | Slice by date and level, then persist checkpoints. |

Keep a local throttle keyed by the external account ID, not by the workflow execution. Parallel executions that each respect a per-node delay can still overload one vendor account. For nightly reports, use a shared queue table with `next_allowed_at` so retries after a `429` do not compete with fresh runs.

## Common Error Codes
| Code / symptom | Operational meaning | Recovery |
| --- | --- | --- |
| 100 Invalid parameter | Bad field, unsupported breakdown, or unavailable insight attribute | Log full query; remove fields until minimal request works. |
| 190 Invalid OAuth token | Expired, revoked, or wrong-token-type credential | Reconnect and verify scopes plus asset access. |
| 200 Permissions error | Token lacks asset or business permission | Grant app/system user access in Business Manager. |
| 273 / 2635 | Throttling or temporary platform restriction | Pause account queue and retry after cooldown. |
| 4xx with `fbtrace_id` | Support-correlation error | Store `fbtrace_id` with execution audit row. |

Always persist the raw error body and response headers. Vendor support teams usually need request IDs, trace IDs, app IDs, and account IDs; without those, the only recovery path is guesswork and repeated failed executions.

## Webhook Reliability
Lead Ads webhooks are reliable only when the app is subscribed to the Page and the Page is connected to the form. Treat webhook payloads as notifications and fetch the lead by ID; include GDPR and data-deletion callbacks for apps that store user data outside Meta.

Webhook handlers should answer quickly, enqueue work, and deduplicate by event ID. Do not perform the expensive API lookup before returning a `2xx`, because several vendors treat a slow response like a failed response and will retry the same event. Store the signature verification result and the received timestamp so replay attacks and delayed retries can be separated during incident review.

## Breaking Changes 2024-2026
Graph API versions roll forward regularly, and older Marketing API fields are removed after deprecation windows. Between 2024 and 2026, teams should especially test attribution-window fields, Advantage+ campaign structures, iOS14 aggregation effects, and Conversions API event match-quality requirements.

Pin API versions wherever the platform allows it, and schedule a quarterly smoke test against the next version. The high-risk fields are attribution windows, consent fields, association objects, pagination cursors, and webhook payload shapes because they often change without breaking authentication.

## Production Gotchas
- Ad account IDs need the `act_` prefix in many endpoints.
- Insights dates use the ad account time zone, not the workflow server time zone.
- Conversions API dedup requires stable `event_id` shared with pixel events.
- Business Manager access can look correct in UI while the app lacks the needed approved permission.

## Integration Anti-Patterns
- Using a founder's personal token for all clients.
- Fetching all insights fields at every level for every report.
- Treating lead webhook delivery as the complete lead record.
- Writing budget or campaign changes without an approval and rollback note.

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

The Facebook node is useful for generic Graph calls, but Marketing API reporting usually needs HTTP Request so version, fields, breakdowns, and `time_range` are explicit. Normalize spend from account currency and always include `account_id`, `campaign_id`, `date_start`, and `date_stop` in the output item.
