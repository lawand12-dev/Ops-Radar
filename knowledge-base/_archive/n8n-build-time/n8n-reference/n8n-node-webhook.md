# n8n Node: Webhook

**Category:** Tools
**Node Type:** `n8n-nodes-base.webhook`
**Source:** n8n GitHub source
**Updated:** 2026-04-30

## Overview

The Webhook node creates an HTTP endpoint that triggers a workflow when an external system sends a request to it. It is the primary mechanism for event-driven workflows in n8n — receiving data from Stripe, GitHub, Slack slash commands, form submissions, Zapier, and any other system capable of making HTTP requests.

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]] · [[n8n-best-practices]]

---

## What It Does

The Webhook node opens a unique HTTP endpoint at a path you define (e.g. `/webhook/form-submit`). When any HTTP client POSTs or GETs that URL, n8n receives the request, packages the headers, body, query parameters, and path into the output item, and starts executing the workflow. It supports four HTTP methods (GET, POST, PUT, DELETE/PATCH), two response modes (immediate or after workflow completes), and optional authentication to block unauthorised callers.

The node is a trigger — it sits at the start of a workflow and produces exactly one item containing the full request data. Importantly, all POST body data is nested under `.body`, not at the root of `$json`.

## Authentication

**Authentication:** None — no credentials required for the node itself. However, the node supports three optional **inbound** authentication modes to verify incoming requests:

| Auth Mode | How It Works |
|-----------|-------------|
| `None` | Accepts requests from anyone — appropriate only for internal/trusted sources |
| `Basic Auth` | Caller must supply HTTP Basic credentials (username + password) |
| `Header Auth` | Caller must supply a specific header name + secret value (most common for webhooks) |

For webhook events from Stripe, GitHub, or Slack that use HMAC signature verification, use the Code node after the Webhook to manually verify the `x-hub-signature` or `stripe-signature` header — n8n does not auto-verify these.

Security recommendation: always configure Header Auth or signature verification on public-facing webhooks. Unauthenticated webhooks are flagged by `n8n_audit_instance({customChecks: ["unauthenticated_webhooks"]})`.

---

## Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | URL path segment, e.g. `form-submit` → endpoint becomes `/webhook/form-submit`. Must be static (no expressions). Auto-generated UUID if left blank. |
| `httpMethod` | options | Yes | Accepted HTTP method: `GET`, `POST`, `PUT`, `DELETE`. Default `GET`. Most integrations use `POST`. |
| `responseMode` | options | Yes | `onReceived` — respond immediately with 200 before running downstream nodes. `lastNode` — wait for full workflow to complete, then respond with the last node's output. |
| `responseData` | options | No | When `responseMode=onReceived`: `firstEntryJson` (default) — returns first item as JSON. `firstEntryBinary` — returns binary data. `noData` — empty 200 response. |
| `responseCode` | number | No | HTTP status code to return. Default `200`. Use `201` for resource creation, `400` for validation failures. |
| `responseContentType` | string | No | Content-Type of the response body. Default `application/json`. |
| `responseBody` | string | No | Static string to return as the response body when `responseMode=onReceived`. |
| `options.allowedOrigins` | string | No | CORS allowed origins. Use `*` for any origin or comma-separated domains. |
| `options.binaryData` | boolean | No | Set `true` to receive file uploads as binary items. |
| `options.rawBody` | boolean | No | Set `true` to also include the raw unparsed body as a string (useful for HMAC verification). |
| `authentication` | options | No | Inbound auth type: `none`, `basicAuth`, `headerAuth`. |
| `credential` | credential | No | Required when authentication is not `none`. Reference to stored Basic Auth or Header Auth credential. |

---

## Response Modes — Critical Decision

**`onReceived` (default — immediate 200)**
- Responds to the caller instantly before running the rest of the workflow
- Appropriate for: fire-and-forget webhooks (Stripe events, GitHub push hooks, form submissions)
- The caller gets a `200 OK` immediately; downstream processing happens asynchronously
- Use `Respond to Webhook` node if you need a custom immediate response body

**`lastNode` (synchronous — waits for completion)**
- Holds the HTTP connection open until the entire workflow finishes
- The final node's output is returned as the response body
- Appropriate for: Slack slash commands (must respond within 3 seconds), APIs that expect a computed response
- Risk: if the workflow takes too long (>30s), the caller times out

For Slack slash commands, use `onReceived` + a separate HTTP Request back to the `response_url` to avoid the 3-second timeout.

---

## Data Structure — The `.body` Rule

Every incoming request is packaged as a single output item. The structure is:

```json
{
  "headers": { "content-type": "application/json", "x-custom-header": "value" },
  "params": {},
  "query": { "page": "1", "limit": "10" },
  "body": {
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**CRITICAL**: POST body fields are under `.body` — never at the root of `$json`.

```javascript
// In expressions (downstream nodes):
{{$json.body.email}}        // Correct
{{$json.email}}             // Always undefined

// In Code nodes (downstream):
const email = $json.body.email;         // Correct
const email = $input.first().json.body.email;  // Also correct
const email = $json.email;             // Wrong — returns undefined
```

Query parameters from the URL (`?email=x`) are under `$json.query.email`.
Headers are under `$json.headers["header-name"]`.

---

## Common Errors & Fixes

- **Webhook data returns `undefined`**: You are accessing `$json.email` instead of `$json.body.email`. All POST body fields are nested under `.body`.
- **"Path already in use" error**: Another workflow has the same webhook path. Change the path or use the auto-generated UUID path. Fix with `n8n_autofix_workflow({fixTypes: ["webhook-missing-path"]})`.
- **Webhook not triggering**: The workflow is not activated. Webhooks only fire when the workflow is in Active state. Test mode uses a different URL (`/webhook-test/path`).
- **Caller gets timeout / no response**: You are using `responseMode=lastNode` but downstream processing takes too long. Switch to `onReceived` for fire-and-forget scenarios.
- **CORS errors from browser**: Set `options.allowedOrigins` to your frontend domain or `*`.
- **401 errors from caller**: Authentication is configured but the caller is not sending the correct credentials. Verify the header name and value match the stored credential.
- **Signature verification failing**: Use `options.rawBody=true` to get the raw request body string for HMAC verification — parsed JSON changes byte ordering and invalidates signatures.
- **Path expressions ignored**: Webhook paths must be static strings. `{{$env.MY_PATH}}` will not be evaluated.

---

## Typical Workflow Pattern

```
Webhook (POST /form-submit)
  → IF (validate required fields: $json.body.email exists)
    → [True]  Set (map: email=$json.body.email, name=$json.body.name)
                → Send to CRM (HTTP Request or Hubspot node)
                → Respond to Webhook (200, "Success")
    → [False] Respond to Webhook (400, "Missing required fields")
```

For Stripe webhook:
```
Webhook (POST /stripe-events, headerAuth)
  → Code (verify Stripe-Signature header via HMAC)
  → IF ($json.body.type === 'payment_intent.succeeded')
    → [True]  Postgres (insert payment record)
    → [False] Stop (ignore other event types)
```

---

## Important Gotchas

1. **Test URL vs Production URL**: When you click "Listen for test event" in the n8n UI, it uses `/webhook-test/path`. When the workflow is active and called by external systems, it uses `/webhook/path`. Do not use test URLs in external system configs.
2. **One trigger per workflow**: Multiple Webhook nodes in one workflow cause only the first to execute reliably. Use separate workflows for separate endpoints.
3. **Webhook path is global**: Paths are unique per n8n instance, not per workflow. Two workflows cannot share the same path.
4. **Binary uploads**: For file upload endpoints, set `options.binaryData=true` — binary data will not appear in `$json.body` without this flag.
5. **Respond to Webhook node**: When using `responseMode=onReceived`, if you need to send a custom body back to the caller (e.g. a generated token), add a `respondToWebhook` node connected early in the chain — it can send its response independently of when the workflow finishes.
6. **Deactivated workflow still receives but drops**: When a workflow is deactivated, n8n returns a 404 for the production URL. Plan for this in external systems with retry logic.
