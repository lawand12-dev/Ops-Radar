# Case: Webhook signature validation failure

**Type:** Labeled failure case
**Diagnosis label:** `webhook.secret-mismatch` / `webhook.body-encoding` / `webhook.manual-verify-bug` / `webhook.replay-attack-rejected`
**Routes from:** `decision-trees/failure-diagnosis` → error.message matches `/signature|hmac|webhook.secret|invalid.payload|Webhook Error/i`, OR httpCode=400 returned by the workflow's own Respond to Webhook node, OR external platform shows webhook delivery failed with "Invalid signature"
**Auto-handle safety:** No auto-retry for any sub-diagnosis. Signature failures are either config problems (secret wrong) or infrastructure problems (proxy re-encoding). Neither resolves without human action.
**Updated:** 2026-05-07

## Overview

Webhook-sending platforms — Stripe, Shopify, GitHub, Twilio, Klaviyo, and others — sign each outbound webhook payload using HMAC-SHA256. They compute the signature over the raw request body (the exact bytes sent), append it to a request header, and expect the receiver to recompute the HMAC and compare. If the signatures don't match, the receiver should reject the request with a 400.

In n8n, signature verification can happen in two places: (1) n8n's built-in Webhook node with a platform-specific credential that handles verification automatically, or (2) a customer-written Code node that implements the verification manually. Both paths can fail, but for different reasons.

The critical detail: HMAC is computed over the **raw body bytes**, not the parsed JSON. Any transformation of the request body between the platform and n8n — re-encoding by a reverse proxy, decompression by a load balancer that then re-compresses, Content-Type normalization — produces a different byte string and invalidates the signature even if the JSON content is semantically identical.

There are two directions of failure: either n8n is the receiver (platform sends to n8n's webhook URL) and n8n rejects it, or n8n is checking a signature and the check fails internally before the workflow produces any output.

## Input — what the error looks like

### Pattern A — n8n Webhook node rejects the incoming request

```jsonc
{
  "name": "WebhookAuthorizationError",
  "message": "The webhook is not authorized.",
  "httpCode": "401",   /* n8n returns 401 to the platform when sig check fails */
  "node": "Webhook"
}
```

### Pattern B — Code node performing manual verification throws

```jsonc
{
  "name": "NodeOperationError",
  "message": "Signature verification failed: signatures do not match",
  "httpCode": null,
  "node": "Verify Stripe Signature"   /* or whatever the customer named it */
}
```

### Pattern C — Workflow responds 400 via Respond to Webhook node

```jsonc
{
  "name": "WorkflowOperationError",
  "message": "Workflow finished with status code 400",
  "httpCode": "400",
  "node": "Respond to Webhook"
}
```

### Pattern D — External platform reports delivery failure

This is not an n8n error at all. The execution may not exist (n8n rejected the request before creating an execution), or it exists with `status='error'` and no useful error content because the failure happened at the HTTP layer. Check the platform's webhook dashboard:
- Stripe: Dashboard → Developers → Webhooks → \<endpoint\> → Recent deliveries → inspect the failing delivery's response body
- Shopify: Partners → Apps → Notifications → Webhook delivery attempts
- GitHub: Repository → Settings → Webhooks → Recent deliveries

## Detection signals

The agent must trigger this case when **any** of the following match:

1. `error.message` matches `/signature|hmac|webhook.*secret|invalid.*payload|Webhook Error/i` (case-insensitive)
2. `error.name = "WebhookAuthorizationError"` — n8n's dedicated class for webhook auth failures
3. `lastNodeExecuted` is a Webhook node or a Code node AND `error.message` mentions "signature", "hash", or "mismatch"
4. `httpCode = 400` AND the workflow's last node is `n8n-nodes-base.respondToWebhook` AND the workflow contains any HMAC verification logic in a Code node upstream
5. The external platform's delivery log shows 401 responses from n8n's webhook URL, but no corresponding execution exists in `execution_entity` (n8n rejected before creating an execution)

## Sub-diagnoses

| Label | Description | Most common trigger |
|---|---|---|
| `webhook.secret-mismatch` | The webhook secret was rotated in the platform's dashboard but the credential in n8n was not updated. The platform signs with the new secret; n8n verifies with the old one — they never match. | Periodic security rotation, developer rotating secrets manually, or a security incident response that changes all secrets |
| `webhook.body-encoding` | A reverse proxy, load balancer, or CDN between the platform and n8n transforms the raw request body bytes before n8n receives them. The HMAC is computed by the platform over the original bytes; n8n computes its HMAC over the transformed bytes. The signatures are permanently different until the proxy config is corrected. | nginx with `proxy_buffering on` that also gzip-compresses; Cloudflare with Rocket Loader or certain WAF rules; AWS ALB with `stickiness` or compression features; any proxy that normalizes JSON whitespace |
| `webhook.manual-verify-bug` | The customer wrote a Code node to verify the signature, but the implementation has a bug. Common bugs: using `JSON.stringify(body)` instead of the raw buffer (JSON.stringify re-serializes, changing whitespace and key order), using the wrong encoding (hex vs base64), comparing digests case-insensitively when the platform uses lowercase hex, or using the wrong HMAC key. | First-time implementation of signature verification; copy-paste from Stack Overflow |
| `webhook.replay-attack-rejected` | Some platforms (Stripe, Twilio) embed a timestamp in the signature header and reject replays where the timestamp is older than a threshold (Stripe: 5 minutes, Twilio: depends on config). If n8n's queue is backed up or the instance was paused, a legitimate event can arrive at n8n for processing after the tolerance window has closed, and the platform's own SDK or the customer's Code node rejects it as a potential replay attack. | Queue saturation, n8n instance restart, Redis disconnect that paused queue processing |

## Per-platform signature header reference

The agent uses these to identify which platform is sending the webhook (by inspecting the incoming request headers available in the execution's input data) and to provide accurate fix guidance.

| Platform | Signature header | Format | Tolerance window |
|---|---|---|---|
| **Stripe** | `stripe-signature` | `t=<unix_timestamp>,v1=<hex_digest>[,v0=<legacy>]` | 5 minutes (configurable via `Webhook.construct_event` tolerance param) |
| **Shopify** | `X-Shopify-Hmac-Sha256` | Base64-encoded HMAC-SHA256 | No timestamp; no replay protection by default |
| **GitHub** | `X-Hub-Signature-256` | `sha256=<hex_digest>` | No timestamp; no replay protection |
| **Twilio** | `X-Twilio-Signature` | Base64-encoded HMAC-SHA1 (note: SHA-1, not SHA-256) | No timestamp in the signature itself; uses request URL as part of the signed content |
| **Klaviyo** | `X-Klaviyo-Signature-v1` | HMAC-SHA256 of the raw body with the private API key; base64url-encoded | No replay protection |
| **WooCommerce** | `X-WC-Webhook-Signature` | Base64-encoded HMAC-SHA256 | No timestamp |
| **Paddle** | `Paddle-Signature` | `ts=<unix_timestamp>;h1=<hex_digest>` | 5 seconds (strict) |
| **Clerk** | `svix-signature` | Svix envelope: `v1,<base64>` | 5 minutes |

The platform is identified from the execution's `data.executionData.contextData["$node"]["Webhook"]["main"][0][0].headers` — the agent reads the headers from the first webhook input item to determine which platform sent the request.

## Signal cross-check — identify the sub-diagnosis

Walk these checks in order; stop at the first match:

| Check | If true → label |
|---|---|
| Does the n8n credential for the Webhook node have a `webhookSecret` (or equivalent) field, AND was that credential updated (check `credentials_entity.updatedAt`) more recently than the last **successful** execution of this workflow? | → `webhook.secret-mismatch` — the credential was recently touched |
| Does the credential's `updatedAt` predate the last successful execution by more than 7 days, AND the platform's dashboard shows the secret was rotated recently? | → `webhook.secret-mismatch` — secret was rotated in the platform but not in n8n |
| Is there a Code node before the Respond to Webhook node? AND does that Code node contain `createHmac` or `crypto` calls? AND is the error coming from that Code node? | → investigate `webhook.manual-verify-bug` |
| Does `error.message` contain `"does not match"` or `"signatures do not match"` AND the Code node uses `JSON.stringify` or `JSON.parse` on the body before hashing it? | → `webhook.manual-verify-bug` (confirmed: JSON re-serialization bug) |
| Is n8n behind a load balancer or reverse proxy (check instance config or infrastructure notes)? AND is this failure happening for ALL incoming webhooks from this platform, not just occasionally? | → `webhook.body-encoding` |
| Does the Stripe `stripe-signature` header's `t=` value differ from the current time by more than 300 seconds at the time n8n processed the request? (Check the timestamp n8n received the request vs. the `t=` value in the header.) | → `webhook.replay-attack-rejected` |
| Does n8n's queue depth metric (`n8n_queue_jobs_waiting`) show a spike immediately before these failures? | → `webhook.replay-attack-rejected` (queue backup caused delayed processing past the tolerance window) |

## Recovery actions

> **Safety:** No auto-retry for any sub-diagnosis. A signature failure will fail identically on retry because the secret is wrong, the body will be re-encoded again, or the timestamp will be even further in the past.

### `webhook.secret-mismatch`

1. `notify-human`. Include: credential name, credential type, `credentials_entity.updatedAt`, the platform identified from headers, the last successful execution timestamp.
2. Fix guidance to include in the alert: "Update the webhook secret in n8n Credentials → \<credential name\> → Webhook Secret field to match the secret currently configured in \<platform\>'s dashboard. Then re-enable the n8n workflow and ask the platform to retry the failed delivery (most platforms have a 'Retry' button in their webhook delivery log)."
3. Do NOT auto-update the credential. Reading the platform's new secret would require access to the platform's credentials, which the agent does not have. This is always a human action.

### `webhook.body-encoding`

1. `notify-human` AND `escalate-engineer`. This is an infrastructure change, not a workflow change. The proxy configuration must be modified so that the raw body bytes are forwarded unmodified.
2. Include in the alert: the n8n instance's proxy/load balancer details (from instance config), the platform sending the webhook, and the specific bytes-level transformation suspected.
3. Fix guidance for the alert: "The reverse proxy must forward the raw request body to n8n without re-encoding. In nginx: ensure `proxy_pass` does not have any body rewrite rules and that `gzip_proxied` does not apply to POST requests from this platform's IP range. In Cloudflare: disable Rocket Loader for the webhook endpoint path. The n8n documentation recommends configuring the proxy to set `Content-Type: application/json` and `Transfer-Encoding: identity` when forwarding."
4. Do NOT auto-retry. The proxy is still in place on retry.

### `webhook.manual-verify-bug`

1. `notify-human`. Include: the Code node name, the relevant code snippet (extract from `workflow_entity.nodes` where `type = 'n8n-nodes-base.code'`), the specific bug pattern identified from the signal cross-check.
2. Fix guidance: include the correct verification pattern from the Code Snippets section below.
3. Do NOT auto-retry.

### `webhook.replay-attack-rejected`

1. `notify-human`. The event is legitimately rejected — the platform's replay protection is working as designed.
2. Include in the alert: the queue depth at the time of the failure (from Prometheus), the timestamp difference between the `t=` header value and the time n8n processed the request, and whether there was a visible queue backup event (Redis restart, worker restart) in the same time window.
3. The failed event cannot be re-processed safely by replaying — the event itself is expired. The engineer must investigate the queue backup that caused the delay and reprocess the event from the platform's side (if the platform supports re-delivery of expired events — most don't; a manual API call may be needed to reconstruct the missed state).
4. Do NOT auto-retry.

## Code snippets

### Correct Stripe signature verification in a Code node

```javascript
// CORRECT — using the raw body buffer, which is what Stripe signed
// n8n makes the raw body available as $input.first().binary.data when the Webhook node
// is configured to return binary data, OR as the raw string in $input.first().json.body
// if the Webhook node is in "Raw Body" mode.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// OR import { Stripe } from 'stripe' in ESM environments

const rawBody = $input.first().json.rawBody;   // n8n Webhook node "Raw Body" mode
const signature = $input.first().headers['stripe-signature'];
const webhookSecret = $credentials.webhookSecret;  // read from n8n credential, not hardcoded

let event;
try {
  // stripe.webhooks.constructEvent handles timestamp tolerance (default 300s) automatically
  event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
} catch (err) {
  // err.message will tell you whether it's a signature mismatch or a timestamp issue
  throw new Error(`Stripe webhook verification failed: ${err.message}`);
}

return [{ json: event }];
```

### Manual HMAC verification (for platforms without an SDK)

```javascript
// CORRECT — compute HMAC over the raw body string, not over JSON.stringify(parsedBody)
const crypto = require('crypto');

const rawBody = $input.first().json.rawBody;       // raw bytes as string (UTF-8)
const receivedSig = $input.first().headers['x-shopify-hmac-sha256'];
const secret = $credentials.webhookSecret;

const computedSig = crypto
  .createHmac('sha256', secret)
  .update(rawBody, 'utf8')      // explicitly specify encoding; default is 'utf8' but be explicit
  .digest('base64');             // Shopify uses base64; Stripe/GitHub use hex — match the platform

// Use timingSafeEqual to prevent timing attacks
const sigBuffer = Buffer.from(receivedSig, 'base64');
const computedBuffer = Buffer.from(computedSig, 'base64');

if (sigBuffer.length !== computedBuffer.length || !crypto.timingSafeEqual(sigBuffer, computedBuffer)) {
  throw new Error('Signature verification failed: signatures do not match');
}

return $input.all();  // pass through if valid
```

### Common bug — WRONG pattern

```javascript
// WRONG — JSON.stringify re-serializes the body. Even if the JSON is semantically identical,
// the byte order, whitespace, and key ordering may differ from the platform's original bytes.
// This will fail even when the secret is correct.
const body = $input.first().json;
const computedSig = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(body))   // ← THIS IS THE BUG
  .digest('hex');

// WRONG — string comparison is not timing-safe (vulnerable to timing attacks)
if (computedSig !== receivedSig) {
  throw new Error('Invalid signature');
}
```

### Enabling "Raw Body" mode in the n8n Webhook node

To access `$input.first().json.rawBody` in a Code node, the Webhook node must have its "Raw Body" option enabled. This is a node-level setting in the n8n editor (Webhook node → Options → Raw Body → toggle on). Without this, n8n parses the JSON before the Code node runs and the raw bytes are lost.

## Prevention — recommendations for the customer report

Add to the customer's `playbooks/report-to-agency` section:

- **Use n8n's built-in platform integrations instead of manual Code node verification wherever possible.** The Stripe, Shopify, and GitHub nodes in n8n have signature verification built into the credential layer. This eliminates the manual-verify-bug class entirely and means the agent can diagnose a secret-mismatch from `credentials_entity.updatedAt` rather than from a Code node bug.
- **Store webhook secrets in n8n Credentials, never hardcoded in Code nodes.** Hardcoded secrets appear in the workflow JSON, which may be exported, shared, or stored in version control. Credentials are encrypted at rest in n8n's database.
- **Set up a monitoring alert for credential age.** Any webhook credential where `credentials_entity.updatedAt` is older than 90 days should trigger a review. Stale credentials may indicate a secret rotation that was not propagated to n8n.
- **After any security rotation event, update n8n webhook credentials immediately.** Establish an explicit checklist item: "rotate platform secret → update n8n credential → verify with a test delivery." The gap between rotation and update is the window of failure.
- **Configure the reverse proxy to preserve raw body bytes.** If n8n is behind nginx, Cloudflare, or an AWS load balancer, test that the HMAC of the body received by n8n matches the HMAC computed by the platform. A one-time test with a known payload and secret confirms the proxy is not re-encoding.
- **Enable n8n's "Raw Body" option on all Webhook nodes that receive HMAC-signed payloads.** Without this, the raw bytes are discarded after JSON parsing. Once discarded, there is no way to verify the signature correctly in a downstream Code node.
- **Monitor queue depth to prevent replay-attack rejections.** If `n8n_queue_jobs_waiting` exceeds 50 for more than 60 seconds, alert the engineering team. A backed-up queue causes delayed processing, which pushes events past signature timestamp tolerance windows. Preventing queue saturation prevents replay rejection.

## Cross-references

`decision-trees/failure-diagnosis` (error.message signature match leaf) · `decision-trees/recovery-routing` (auth → notify-human) · `cases/unknown-failure` (if platform cannot be identified from headers) · `playbooks/recover-from-api-error` · `playbooks/report-to-agency`
