# n8n Node: Wait

**Category:** Flow
**Node Type:** `n8n-nodes-base.wait`
**Source:** n8n GitHub source
**Updated:** 2026-05-07

## Overview

The Wait node pauses workflow execution for a fixed duration, until a specific time, or indefinitely until a webhook resumes it. It is used for three distinct purposes: throttling API call rates between batches, scheduling deferred processing, and implementing human-in-the-loop approval flows. The webhook-resume variant is the most failure-prone — missed resume webhooks leave executions waiting forever (or until data retention purge).

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]] · [[n8n-best-practices]]

---

## What It Does

The Wait node suspends the current workflow execution. While waiting, the execution has `status=waiting` in the n8n database and the worker thread is released (in queue mode). After the wait condition is met, n8n reassigns the execution to an available worker and resumes from the next node.

## Authentication

None — no credentials required.

---

## Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `resume` | options | Yes | Resume trigger: `timeInterval`, `specificTime`, `webhook` |
| `amount` | number | No | Duration to wait (for `timeInterval` mode). E.g. `5`. |
| `unit` | options | No | Time unit for `amount`: `seconds`, `minutes`, `hours`, `days`. |
| `dateTime` | string | No | ISO 8601 datetime to wait until (for `specificTime` mode). Supports expressions. |
| `webhookSuffix` | string | No | Optional suffix to make the resume webhook URL unique within a workflow. |
| `options.respondWith` | options | No | For webhook resume: how to respond to the resume HTTP request (`lastNode`, `onReceived`). |

---

## Resume Modes

### Mode 1: `timeInterval` — Fixed Delay

The execution pauses for the specified duration and automatically resumes.

```
// Wait 1 second (rate limiting between API batches):
resume: timeInterval
amount: 1
unit: seconds

// Wait 30 minutes (retry after temporary API failure):
resume: timeInterval
amount: 30
unit: minutes
```

**Use cases**:
- Rate limit throttling between batches (most common use)
- Retry delay after a transient API failure
- Brief pause to allow upstream systems to propagate data

### Mode 2: `specificTime` — Absolute Datetime

The execution pauses until a specific datetime (e.g. "resume at 9 AM tomorrow").

```
// Wait until a computed future time (expression):
resume: specificTime
dateTime: {{ $now.plus({ days: 1 }).startOf('day').plus({ hours: 9 }).toISO() }}
```

**Use cases**:
- Schedule work to happen during business hours
- Defer notification until a specific time slot
- Implement "send this email at 9 AM" scheduling

### Mode 3: `webhook` — Indefinite Until Resumed

The execution pauses indefinitely and resumes only when a specific HTTP webhook is called.

```
// Workflow generates a unique resume URL and sends it to an approver.
// When the approver clicks "Approve" (a link to the resume URL), the execution resumes.
resume: webhook
webhookSuffix: {{ $json.approvalId }}   // optional — makes URL unique per execution
```

**The resume URL**: available as `$execution.resumeUrl` after the Wait node has started. This URL is a one-time webhook endpoint specific to this execution. POST to it to resume execution.

**Use cases**:
- Human approval workflows ("does this customer qualify?")
- Multi-step form wizards across sessions
- Waiting for an external job to complete and call back

---

## Critical: `$execution.resumeUrl` Must Be Sent BEFORE Wait Executes

**Common mistake**: trying to include `$execution.resumeUrl` in a node BEFORE the Wait node runs, to tell someone the URL before the wait starts.

`$execution.resumeUrl` is only populated after the Wait node has registered the execution as waiting. Accessing it before the Wait node runs returns `undefined`.

**Correct pattern**:
```
Wait (register the wait, get the resumeUrl)
  → Set (extract: resumeUrl = {{ $execution.resumeUrl }})
  → Send Email (include the resumeUrl as the "approve" link)
  → (execution pauses here — Wait has already registered and Set captured the URL)
```

Wait — this looks wrong. The execution pauses AT the Wait node. So the Set and Send Email run AFTER the Wait... but wait pauses execution. The correct understanding:

**Correct pattern**: nodes before Wait → Wait (pauses execution) → nodes after Wait run when resumed.

To send the resume URL to someone, you must send it BEFORE reaching the Wait node, which seems impossible — but the URL IS available before the Wait if you set `webhookSuffix` deterministically:

```
// If webhookSuffix is static or derived from input data, the URL is predictable:
resumeUrl format: {n8n-base-url}/webhook/{executionId}/wait/{suffix}
```

**Practical workaround**: generate the execution ID from an upstream node's context, construct the resume URL manually, send it, then hit the Wait node. OR: use a two-step pattern where the first workflow sends a link to a form, and the form submission triggers a second webhook that calls the resume URL.

For most implementations, the cleanest approach is to use a two-workflow pattern:
1. Workflow A: process the request, store state in DB, send email with a link to a form.
2. The form submission hits a Webhook on Workflow B, which retrieves the stored state and continues.

This avoids the `$execution.resumeUrl` timing problem entirely.

---

## Queue Mode and Worker Slot Behavior

In n8n queue mode (separate main and worker processes):

- When a Wait node executes, the execution is serialized back to the n8n database with `status=waiting`.
- The worker that was executing the workflow is released and becomes available for other executions.
- When the wait condition is met (time elapses or webhook arrives), the n8n main process moves the execution back to `status=running` and enqueues it for a worker.
- **If all workers are busy when the wait ends**, the execution sits in the queue. It appears "stuck" even though it is technically waiting for a worker, not waiting for the timer.

**Detection**: `status=waiting` with `wait_till` in the past by more than 5 minutes indicates the execution should have resumed but hasn't. This is the "stuck resume" failure mode.

---

## Webhook Resume — Timing Out

Webhook-resume executions wait indefinitely by default. If the resume webhook is never called:

- The execution remains in `status=waiting` forever.
- It counts against the n8n database's stored execution count.
- If `EXECUTIONS_DATA_MAX_AGE` is set, n8n will purge old executions including waiting ones after the retention period — the wait is effectively abandoned silently.

**Setting a maximum wait time for webhook resume**:
n8n does not have a built-in timeout for webhook-resume waits. To implement a timeout:
1. In a parallel branch before the Wait, start a sub-workflow with a Schedule Trigger that checks for stale waiting executions.
2. OR: store the execution start time in a database, and have a monitoring workflow periodically check for executions waiting longer than the threshold.
3. OR: use the n8n API to cancel stuck executions programmatically: `DELETE /api/v1/executions/{id}`.

---

## EXECUTIONS_DATA_MAX_AGE Interaction

If `EXECUTIONS_DATA_MAX_AGE` is set on the n8n instance (e.g. `EXECUTIONS_DATA_MAX_AGE=168` for 7 days), executions older than that age are purged — including `status=waiting` executions that are still waiting.

A webhook-resume execution that has been waiting for 8 days will be deleted by the purge process. The resume URL becomes invalid. If someone then clicks the approve link, they receive a 404. The approval is lost with no notification.

**Mitigation**: set a lower maximum wait expectation (24-48 hours for human approvals), and notify the approver if their link has expired.

---

## Common Errors & Failure Modes

**`status=waiting` with `wait_till` in the past (>5 minutes)**
- Cause: execution should have resumed (time elapsed) but the worker was busy or n8n restarted and lost the timer state.
- Detection: query `GET /api/v1/executions?status=waiting` and compare `wait_till` to now.
- Fix: for individual stuck executions, use the n8n UI to retry or cancel. For systemic issues, check worker health and queue depth.
- Route to: `detect-stuck-execution` playbook.

**Webhook resume URL returns 404**
- Cause: execution was purged by `EXECUTIONS_DATA_MAX_AGE`, or the execution was manually cancelled, or the resume URL suffix is incorrect.
- Detection: approver reports "link doesn't work"; execution no longer in n8n database.

**Resume webhook called but execution does not resume**
- Cause: the POST to `$execution.resumeUrl` was made before the Wait node registered the execution (race condition — wait not yet persisted to DB).
- Detection: HTTP 404 on the resume URL call despite the execution existing.
- Fix: ensure the resume URL is only called after a sufficient delay or after confirming the execution is in `status=waiting` via the n8n API.

**Wait node in a loop causes unexpected total duration**
- Cause: a Wait of 1 second in a loop over 1,000 items = 1,000 seconds minimum execution time. This is correct behavior but often surprises implementors.
- Detection: execution duration is `batchSize × wait_duration × number_of_batches`.

**All workers blocked by waiting executions (v1.x queue mode)**
- Cause: if Wait nodes are used but `N8N_CONCURRENCY_PRODUCTION_LIMIT` is low, long-running wait executions can consume all worker slots before the wait releases them. (In properly configured queue mode, Wait releases worker slots; this failure only occurs in single-process mode.)
- Fix: confirm n8n is running in queue mode. In single-process mode, Wait holds the worker thread — do not use long Wait durations in single-process deployments.

---

## Monitoring Signals

| Signal | Meaning |
|--------|---------|
| `status=waiting` AND `wait_till < now - 5min` | Stuck resume-failed execution — route to detect-stuck-execution playbook |
| Large number of `status=waiting` executions accumulating over time | Webhook-resume flows where approvers are not clicking links, OR resume URLs expired |
| Execution duration much longer than expected | Wait node in a loop with more iterations than anticipated |
| Resume webhook returns 404 | Execution purged or cancelled — check `EXECUTIONS_DATA_MAX_AGE` |
| Worker queue depth growing while many executions are `status=waiting` | Single-process mode with long Wait durations blocking worker threads |

---

## Expression Patterns

```javascript
// Compute a specific resume time (9 AM next business day):
{{ $now.plus({ days: 1 }).startOf('day').plus({ hours: 9 }).toISO() }}

// Wait until a time specified in the input data:
{{ $json.scheduledAt }}

// Dynamic delay based on retry count:
{{ Math.min(30, Math.pow(2, $json.retryCount)) }}  // seconds, exponential backoff capped at 30

// Check if an execution is past its wait time (monitoring Code node):
{{ new Date($json.wait_till) < new Date() && $json.status === 'waiting' }}

// Access the resume URL after Wait has registered:
{{ $execution.resumeUrl }}
```

---

## Typical Workflow Patterns

**Rate limiting throttle between batches:**
```
Loop Over Items (batchSize: 10)
  → [output] HTTP Request (call API)
  → Wait (1 second)
  → [feeds back to Loop]
→ [done] Set (complete)
```

**Human approval with email:**
```
Webhook (new contract submitted)
  → Postgres (INSERT contract, status='pending')
  → Wait (webhook resume, webhookSuffix: {{ $json.contractId }})
  → Send Email (to submitter, body: "Contract under review, resume URL: {{ $execution.resumeUrl }}")
  [execution pauses]
  [manager POSTs to resume URL with query ?action=approve]
  → IF ($json.query.action === "approve")
    → [True]  Postgres (UPDATE status='approved')
               → Send Email (submitter: contract approved)
    → [False] Postgres (UPDATE status='rejected')
               → Send Email (submitter: contract rejected, reason: {{ $json.query.reason }})
```

**Retry with exponential backoff:**
```
HTTP Request (call flaky API, Continue On Error: true)
  → IF ($json.statusCode === 429 OR $json.statusCode >= 500)
    → [True]  Set (retryCount = {{ ($json.retryCount ?? 0) + 1 }})
               → IF (retryCount < 5)
                 → [True]  Wait ({{ Math.pow(2, $json.retryCount) }} seconds)
                           → HTTP Request (retry)
                 → [False] Slack (alert: "API failed after 5 retries")
    → [False] (success path continues)
```

**Specific-time deferred notification:**
```
Webhook (POST /schedule-reminder)
  → Set (sendAt = {{ $json.body.sendAt }})
  → Wait (specificTime, dateTime: {{ $json.sendAt }})
  → Send Email (to {{ $json.body.email }}, body: {{ $json.body.message }})
```

---

## Important Gotchas

1. **Single-process mode vs queue mode**: In single-process n8n, Wait holds the worker thread for the duration of the wait. A 1-hour Wait in single-process mode blocks other workflows from running for that hour. Queue mode (separate workers) releases the thread. Always confirm deployment mode before using Wait with long durations.
2. **`wait_till` is stored as UTC in the n8n database**: When comparing `wait_till` to now in a monitoring query, use UTC comparison. Display in local timezone only for human-readable reports.
3. **Resume URL is single-use only**: Each `$execution.resumeUrl` can only be called once. A second POST to the same URL after the execution has resumed returns 404. Design approval flows to acknowledge this (disable the approve button after clicking, etc.).
4. **No native wait timeout for webhook mode**: If the approver never responds, the execution waits until `EXECUTIONS_DATA_MAX_AGE` purges it. Build external timeout monitoring into any human-approval workflow.
5. **Parallel Wait nodes**: If the workflow has parallel branches and both hit a Wait node, both branches pause independently. They resume independently when their conditions are met — not synchronized. Use a Merge node after both Wait nodes if synchronization is needed.
