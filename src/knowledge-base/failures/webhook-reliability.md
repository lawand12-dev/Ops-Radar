# Webhook Reliability — When They Silently Fail

**Category:** Failures  
**Source:** Stripe webhook docs, Shopify webhook docs, HubSpot webhook docs, GitHub webhook docs, n8n community forums, Stack Overflow webhook debugging threads  
**Updated:** 2026-04-30

## Overview
Webhooks are the backbone of real-time automation — and one of the most dangerous single points of failure. Unlike polling, a webhook failure produces no error: the sending platform gives up and moves on. You only discover the failure when a client asks why a form submission didn't trigger an email, or why Shopify orders aren't appearing in the CRM. This page documents platform delivery guarantees, silent failure modes, and patterns for building reliable webhook-based workflows.

## Related Notes
[[n8n-common-failures]] · [[token-expiration-patterns]] · [[concurrent-execution-race-conditions]]

---

## How It Happens

Webhook delivery relies on the receiving endpoint being available, responding correctly, and processing the event. Any failure in this chain causes silent data loss:

1. **Endpoint unavailable** — server down, DNS failure, firewall block, expired TLS cert
2. **Endpoint responds 200 but crashes internally** — HTTP 200 acknowledged, but the processing code throws after responding
3. **Webhook deleted by platform** — after too many consecutive failures, platforms auto-delete the webhook registration
4. **Duplicate delivery** — same event sent multiple times (all major platforms have at-least-once delivery semantics)
5. **Out-of-order delivery** — events arrive in a different order than they occurred
6. **Signature not verified** — malicious or test payloads processed as real events

## Platform Delivery Guarantees

| Platform | Max Retries | Retry Window | Auto-Delete on Failure | Delivery Order |
|----------|------------|--------------|----------------------|----------------|
| Stripe | ~87 retries over 3 days | Exponential, up to 3 days | No auto-delete (but stops retrying) | Not guaranteed |
| Shopify | 19 consecutive failures | Up to ~48 hours | Yes — webhook deleted after 19 failures | Not guaranteed |
| HubSpot | 3 attempts | 24 hours | No auto-delete | Not guaranteed |
| GitHub | 3 attempts | 30 minutes | No auto-delete | Not guaranteed |
| Meta / Facebook | 3 attempts | Not documented | No auto-delete | Not guaranteed |
| Slack Events API | 3 attempts | 30 seconds per attempt | No auto-delete | Not guaranteed |

## Detection Signals
- Shopify webhook dashboard shows "Last delivery: failed" — check Admin → Settings → Notifications → Webhooks
- Stripe Dashboard → Developers → Webhooks → endpoint shows failed deliveries in red
- n8n execution log shows no executions for a webhook workflow despite known events occurring in the source system
- Client reports "form submission didn't trigger anything" — check the webhook URL is still registered
- n8n cloud webhook URL changes after workspace migration (a common cause of broken Shopify webhooks)
- TLS certificate on self-hosted n8n domain expired — all platforms will reject the endpoint

## Real Production Examples

**Scenario 1 — Shopify webhook auto-deleted**: An agency self-hosts n8n on a VPS. The VPS goes down for maintenance for 2 days. During that window, Shopify fires 19 webhook delivery attempts for various order and customer events. All fail. On the 19th failure, Shopify silently deletes the webhook subscription. When the VPS comes back up, n8n is running but no Shopify webhooks arrive. The team assumes the issue is network-related and spends an hour checking logs before discovering the webhook was deleted. Recovery requires re-registering the webhook via the Shopify API or Admin UI.

**Scenario 2 — HTTPS cert expiry drops all webhooks**: An agency renews Let's Encrypt manually. The cert expires on a Sunday. All webhook-based automations (Stripe payments, HubSpot form submissions, GitHub CI triggers) stop delivering from that moment. HTTP 200 was previously returned, so no platform marks the endpoint as failed immediately — but new events post-expiry receive SSL handshake errors. By Monday morning, 18 hours of events have been missed. Some platforms (Stripe) will retry back through the backlog; others (GitHub) will not.

**Scenario 3 — 200 ACK before processing**: An n8n webhook workflow triggers a complex 45-second database operation. n8n returns HTTP 200 to the sender immediately (correct behavior), but the subsequent processing node fails due to a Postgres connection error. The sender receives 200, considers the event delivered, and never retries. The event is permanently lost. Fix: use n8n's "Respond to Webhook" node strategically, and implement a dead letter queue for processing failures.

## Deduplication Requirement

All platforms use at-least-once delivery. Build deduplication into every webhook workflow:

```javascript
// n8n Code node — idempotency check using Static Data
const eventId = $input.first().json.id || $input.first().json.event_id;
if (!eventId) throw new Error('No event ID found for deduplication');

const seen = $getWorkflowStaticData('global');
if (seen[eventId]) {
  // Already processed — return empty to stop execution
  return [];
}

// Mark as seen (store for 24 hours worth of events)
seen[eventId] = Date.now();

// Prune old entries to prevent unbounded growth
const cutoff = Date.now() - 86400000; // 24h
for (const key of Object.keys(seen)) {
  if (seen[key] < cutoff) delete seen[key];
}

return $input.all();
```

For higher-volume deduplication, use a Supabase table with a unique constraint on `event_id`.

## Webhook Signature Verification

Always verify webhook signatures. Processing unsigned or maliciously crafted webhooks can trigger unintended automation (e.g., fake "payment succeeded" events).

```javascript
// n8n Code node — Stripe signature verification
const crypto = require('crypto');
const payload = $input.first().binary?.data 
  ? Buffer.from($input.first().binary.data, 'base64').toString('utf8')
  : JSON.stringify($input.first().json);
const sig = $input.first().headers['stripe-signature'];
const secret = 'whsec_...'; // from n8n credential

const parts = sig.split(',').reduce((acc, part) => {
  const [k, v] = part.split('=');
  acc[k] = v;
  return acc;
}, {});

const signedPayload = `${parts.t}.${payload}`;
const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

if (expected !== parts.v1) {
  throw new Error('Invalid webhook signature — request rejected');
}
return $input.all();
```

## Dead Letter Queue Pattern

When webhook processing fails, route to a Supabase dead letter table rather than losing the event:

```
[Webhook Trigger] → [Verify Signature] → [Process Event]
                                               ↓ (on error)
                                         [Write to dead_letter_queue table]
                                         {event_id, payload, error, created_at}
```

A separate scheduled workflow checks `dead_letter_queue` every 15 minutes and retries processable failures.

## Prevention Patterns

- **Register webhooks programmatically** with a startup workflow, so they are re-registered automatically after server migrations
- **Monitor webhook health** with a synthetic test: send a known test event daily and verify it appears in your database within 60 seconds
- **Use n8n cloud for webhook endpoints** rather than self-hosted when uptime SLA matters — cloud endpoints have guaranteed availability
- **TLS auto-renewal**: use Certbot with systemd timer or Caddy (auto-HTTPS) to prevent cert expiry
- **Set up Shopify webhook alerts**: use the Shopify webhook deliveries API to poll failure rates weekly

## Recovery Procedures

1. **Re-register deleted webhooks**: For Shopify, POST to `/admin/api/2024-01/webhooks.json`. For HubSpot, use the subscriptions API. Document all webhook registrations in a runbook.
2. **Replay missed events**: Stripe allows replaying failed webhook deliveries from the dashboard. HubSpot does not; use the API to query events by timestamp and replay.
3. **For Shopify**: after re-registering, backfill missed orders by querying `GET /admin/api/2024-01/orders.json?created_at_min={failure_start}`.
4. **Audit all webhook registrations** after any server migration or URL change.

## n8n-Specific Considerations

- n8n webhook URLs are tied to the workflow ID and the n8n instance URL. Changing either breaks all registered webhooks.
- n8n cloud webhook URLs follow the pattern `https://{workspace}.app.n8n.cloud/webhook/{webhook-id}`. The workspace subdomain is fixed.
- Self-hosted n8n requires `WEBHOOK_URL` env var to be set to the externally accessible URL — if not set, n8n uses the internal URL, which is unreachable by external platforms.
- Use **ngrok** or **Cloudflare Tunnel** for local webhook development testing instead of exposing the dev server directly.
- n8n's webhook node responds to the sender before executing downstream nodes. For long-running workflows, this is correct behavior but means downstream failures are invisible to the sender.
- Test webhook workflows with n8n's built-in "Listen for Test Event" mode before activating — this keeps a temporary endpoint open for one request, useful during initial setup.
