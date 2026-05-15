# n8n Node: Respond to Webhook

**Category:** Tools
**Node Type:** `n8n-nodes-base.respondToWebhook`
**Source:** n8n GitHub source
**Updated:** 2026-05-07

## Overview

The Respond to Webhook node sends the HTTP response back to the caller of a webhook-triggered workflow. It is the only mechanism in n8n for returning custom response bodies, status codes, and headers to webhook callers. It only functions when the triggering Webhook node is configured with `responseMode=lastNode`. Misconfiguration here silently breaks caller integrations — the caller either hangs, receives a 500, or gets the wrong response body.

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]] · [[n8n-best-practices]]

---

## What It Does

The Respond to Webhook node terminates the HTTP connection that the Webhook node opened. It sends whatever response body, status code, and headers you configure back to the waiting HTTP client. Execution of the workflow continues after the response is sent (downstream nodes still run), which enables async processing patterns where the caller receives a quick acknowledgment and the workflow continues working in the background.

## Authentication

None — no credentials required.

---

## Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `respondWith` | options | Yes | Response type: `text`, `json`, `binary`, `redirect`, `noData` |
| `responseBody` | string | No | The body to send when `respondWith=text` or `respondWith=json`. Supports expressions. |
| `responseCode` | number | No | HTTP status code to return. Default `200`. Common values: `200`, `201`, `204`, `400`, `401`, `422`, `500`. |
| `responseHeaders` | object | No | Additional HTTP headers to include in the response. Array of `{name, value}` pairs. |
| `options.responseKey` | string | No | For `respondWith=json`: wraps the response under this key (e.g. `"data"` → `{"data": {...}}`). |

### `respondWith` Options

| Value | Behavior | Use Case |
|-------|----------|----------|
| `json` | Sends `Content-Type: application/json` with a JSON body | API responses |
| `text` | Sends `Content-Type: text/plain` with a plain text body | Simple acknowledgments |
| `binary` | Sends binary data from `$binary` as the response body | File downloads |
| `redirect` | Sends a 301/302 redirect to a URL you specify | OAuth callbacks, form redirects |
| `noData` | Sends an empty `204 No Content` response | Fire-and-forget acknowledgments |

---

## Critical Dependency: responseMode Must Be `lastNode`

**The Respond to Webhook node is ignored if the triggering Webhook node has `responseMode=onReceived`.**

When `responseMode=onReceived`, n8n sends the response immediately when the webhook is received, before any downstream nodes run. The Respond to Webhook node in the workflow is then a no-op — it executes but has no effect on the caller.

The pairing must be:
- **Webhook node**: `responseMode=lastNode`
- **Respond to Webhook node**: present and reachable in the execution path

If this pairing is wrong, the caller waits until n8n's execution timeout, then receives a 500 — or receives the wrong (auto-generated) response body.

---

## Timing and Caller Timeouts

When the Webhook node is set to `responseMode=lastNode`, the HTTP connection remains open until the Respond to Webhook node executes. **The caller waits for the full duration of the workflow.**

This creates a timeout risk with external services that have strict response windows:

| Service | Response timeout |
|---------|-----------------|
| Stripe webhooks | 30 seconds |
| Slack slash commands | 3 seconds |
| Twilio webhooks | 15 seconds |
| Shopify webhooks | 5 seconds |

**Example failure**: A workflow triggered by Stripe takes 11 seconds to process. Stripe's timeout is 30 seconds — fine. But then n8n has a slow database query that adds 25 more seconds. Total: 36 seconds. Stripe sees a timeout, marks the delivery as failed, and retries the webhook — triggering a duplicate execution.

**Solution for time-sensitive callers**: Use `responseMode=onReceived` on the Webhook node and process asynchronously. The Respond to Webhook node is not needed in this pattern. If a custom response body is required immediately, use the Webhook node's own `responseBody` parameter for a static response.

**Solution for Slack slash commands**: Immediately respond with `200 OK` (Webhook `responseMode=onReceived`) and send the actual response to the `response_url` from the Slack payload via a separate HTTP Request node.

---

## Position in Workflow

The Respond to Webhook node can be placed at any point in the workflow, not just at the end:

**At the end (most common)**: The workflow completes all processing, then responds. The caller waits for the full workflow duration.

```
Webhook → IF → [True] Process → Respond to Webhook (200, computed result)
                [False] Respond to Webhook (400, "Invalid input")
```

**In the middle (async pattern)**: Respond immediately with acknowledgment, then continue processing in the remaining nodes. The caller gets a response quickly; the workflow keeps running.

```
Webhook → Respond to Webhook (200, "Received") → Long-running process → Database write
```

In the middle-position pattern, execution continues after the response is sent. If a downstream node errors after the response, the caller has already received `200` — the error is invisible to the caller but recorded in n8n's execution log.

---

## Branch Execution and Hanging Callers

**CRITICAL**: If the Respond to Webhook node is in a branch that does not execute, the caller hangs.

```
Webhook
  → IF (condition)
    → [True]  Respond to Webhook (200)
    → [False] Slack (send alert)      ← No Respond to Webhook here!
```

In this example, if the IF condition is false, the Slack node runs but no response is sent to the webhook caller. The caller waits until n8n's `EXECUTIONS_TIMEOUT` setting (default: no timeout) and then receives a 500 or a connection reset.

**Fix**: always place a Respond to Webhook node at every branch terminal that a webhook caller's request can reach.

```
Webhook
  → IF (condition)
    → [True]  Respond to Webhook (200, "Processed")
    → [False] Respond to Webhook (422, "Condition not met")
```

---

## Error Handling Position

A common mistake is placing error handling logic after the Respond to Webhook node in an error path that still needs to respond to the caller:

```
// WRONG — error response never reaches the caller:
Webhook → Process Data → Respond to Webhook (200)
                       ↓ (error output)
                       Slack Alert → Respond to Webhook (500)  ← too late
```

Once the first Respond to Webhook fires (on success), the HTTP connection is closed. The error-path Respond to Webhook has no connection to respond to.

**Fix**: route errors before the Respond to Webhook, not after:

```
// CORRECT:
Webhook → Process Data
  → [Success] Respond to Webhook (200)
  → [Error]   Set (build error body) → Respond to Webhook (500, error message)
```

---

## Binary Response

To send a file as the HTTP response:

1. Set `respondWith=binary`
2. Binary data must be available at the Respond to Webhook node in `$binary`
3. The binary field name can be specified (default: `data`)

```
Webhook (GET /download-report)
  → Generate PDF (produces $binary.data)
  → Respond to Webhook (binary, responseCode: 200)
     → adds Content-Disposition header for download filename
```

---

## Common Errors & Failure Modes

**Caller receives `500 Internal Server Error` with no body**
- Cause: the Respond to Webhook node was in a branch that did not execute (e.g. the IF condition routed to the other branch which had no Respond to Webhook). n8n times out and returns 500.
- Detection: `lastNodeExecuted` in the execution record is NOT `respondToWebhook` on a workflow that has a Webhook trigger.

**Caller receives `200` but with wrong/empty body**
- Cause: `responseMode=onReceived` on the Webhook node — the response was sent before any processing, ignoring this node entirely.
- Fix: change Webhook `responseMode` to `lastNode`.

**Caller hangs indefinitely**
- Cause: `responseMode=lastNode` on Webhook but the workflow is stuck (infinite loop, dead Wait node, external API timeout).
- Detection: execution has `status=running` for more than the expected workflow duration.

**`respondWith=json` sends unexpected shape**
- Cause: `responseBody` is a string, not a valid JSON expression. The node may wrap the string in quotes.
- Fix: use an expression that evaluates to a JavaScript object: `{{ { success: true, id: $json.id } }}` rather than the string `{"success": true}`.

**Binary response returns `Content-Type: application/octet-stream` instead of expected type**
- Cause: binary data has no MIME type set. When generating binary (e.g. PDF), ensure the generating node sets the `mimeType` field on the binary item.

---

## Expression Patterns

```javascript
// Return a computed JSON body:
{{ { success: true, recordId: $json.id, processedAt: $now.toISO() } }}

// Return an error message from an upstream node's error:
{{ { error: $json.error, message: "Processing failed" } }}

// Return the full output of a prior node as the response body:
{{ $('Process Data').item.json }}

// Dynamic status code (200 or 400 based on validation):
{{ $json.isValid ? 200 : 400 }}

// Include caller's data in response for confirmation:
{{ { received: $('Webhook').item.json.body, status: "queued" } }}
```

---

## Typical Workflow Patterns

**Synchronous API endpoint:**
```
Webhook (POST /create-contact, responseMode: lastNode)
  → Validate (IF required fields exist)
    → [True]  HTTP Request (POST to CRM)
              → Respond to Webhook (201, { id: $json.id, created: true })
    → [False] Respond to Webhook (400, { error: "Missing required fields" })
```

**Async processing with immediate acknowledgment:**
```
Webhook (POST /process-upload, responseMode: lastNode)
  → Set (jobId = {{ $now.toMillis() }})
  → Respond to Webhook (202, { jobId: $json.jobId, status: "processing" })
  → [workflow continues] Heavy processing → Database write → Email notification
```

**Human approval webhook:**
```
Wait (webhook resume mode, indefinite)
  → IF ($json.query.action === "approve")
    → [True]  Respond to Webhook (200, { approved: true })
              → Continue with approved workflow path
    → [False] Respond to Webhook (200, { approved: false, reason: $json.query.reason })
              → Notify requester of rejection
```

---

## Monitoring Signals

| Signal | Meaning |
|--------|---------|
| `lastNodeExecuted != "respondToWebhook"` in a webhook-triggered execution | Caller did not receive a response — likely received 500 or timed out |
| Execution `status=running` for >30 seconds in a webhook workflow | Workflow stuck before reaching Respond to Webhook; caller is hanging |
| Caller system logs showing webhook retries | Previous response was a 500, timeout, or non-2xx — caller retrying causes duplicate executions |
| `status=error` AND `lastNodeExecuted = "respondToWebhook"` | Response WAS sent but a downstream node failed after — caller got a 200; n8n logs the error |

---

## Important Gotchas

1. **`responseMode=lastNode` on Webhook is a prerequisite**: Without this, this node is completely inert. Check the Webhook node configuration first before debugging response issues.
2. **One Respond to Webhook per execution path**: Only the first Respond to Webhook in any execution path sends the response. If two such nodes execute in sequence (linear workflow), the second is ignored.
3. **Error output does not auto-respond**: If Process Data errors and has an error output connection to a Slack node but no Respond to Webhook in the error path, the caller hangs. Every error path in a synchronous webhook workflow needs its own Respond to Webhook.
4. **Middleware integrations**: Services like Stripe, GitHub, and Twilio expect specific response formats (JSON with `received: true`, empty 200, etc.). Verify the expected format in their documentation and match it exactly to prevent delivery retries.
5. **`noData` vs `json` empty object**: Use `respondWith=noData` for a clean 204. Using `respondWith=json` with an empty `responseBody` sends `null` as JSON, which some callers reject.
