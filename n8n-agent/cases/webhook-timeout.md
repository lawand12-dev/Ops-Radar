# Case: Webhook trigger timeout

**Type:** Labeled failure case
**Diagnosis label:** `timeout.upstream` (specifically: webhook caller timed out waiting for n8n)
**Routes from:** `decision-trees/failure-diagnosis` (timeouts on Webhook trigger), or external signal (caller reports failed delivery)
**Auto-handle safety:** Workflow-config change is **not** auto-applied; agent recommends and gets human approval. Auto-retry only if caller will redeliver and workflow is idempotent.
**Updated:** 2026-05-07

## Input — what the error looks like

This case is unusual because n8n itself often shows the execution as `success`. The failure is observed **outside** n8n: the caller (Stripe, Shopify, GitHub, Calendly, custom client) reports that the webhook delivery took too long.

Typical signals from the caller side:

- Stripe Dashboard → Webhooks → endpoint shows `Failed` with `error: timeout` and HTTP code missing or `0`.
- Shopify webhook delivery logs: `Status: Failed`, `Response time: 30000 ms`.
- Custom client logs: `socket hang up` or `ETIMEDOUT` after 10–30 s.

If the agent has visibility into n8n's execution but not the caller, the n8n side may show:

- `status='success'` with a long `stoppedAt - startedAt` duration (> 5 s for Stripe, > 10 s for Shopify, > 30 s for most custom clients).
- `status='error'` with `error.message` matching `/socket hang up|response.*aborted/i` (caller closed the connection before n8n responded — n8n logs this when it tries to write the response).

## Signals — what to check

1. **Webhook trigger node configuration:**
   - Open `workflow_entity.nodes` jsonb, find the Webhook trigger, read `parameters.responseMode`.
   - `"onReceived"` (a.k.a. **Respond Immediately**) → n8n responds before the workflow runs. Caller timeout is **not** webhook-related; look elsewhere.
   - `"lastNode"` (default) → n8n runs the whole workflow before responding. Long workflows = caller timeouts.
   - `"responseNode"` → n8n waits for an explicit `Respond to Webhook` node. Long workflows = caller timeouts unless that node fires fast.
2. **Workflow runtime distribution:** for the past 100 executions of this workflow, p50 / p95 / p99 of `stoppedAt - startedAt`. p95 > caller timeout = consistent failure mode.
3. **Caller's known timeout window:**
   | Caller | Timeout |
   |---|---|
   | Stripe | 10 s (then retry up to 3 days exponential) |
   | Shopify | 5 s (auto-retry up to 19 failures, then disables endpoint) |
   | GitHub | 10 s (no retry) |
   | Calendly | 30 s |
   | HubSpot | 30 s (3 retries) |
   | Twilio | 15 s |
4. **Slow downstream node:** identify the slowest node from `data.resultData.runData.<name>.executionTime` (ms). Often a single API call, an OpenAI request, or a `Code` node iterating over a large array.
5. **Worker availability** (queue mode): if `n8n_queue_jobs_waiting > 0` consistently and `n8n_queue_jobs_active >= worker_count`, the webhook is queued behind other work — n8n responds **only after** workflow completes, and queue waits inflate end-to-end time.
6. **Caller retry behaviour:** if the caller is configured to retry, the agent must check whether failed retries created **duplicate executions**. Stripe and Shopify both retry; both rely on the receiver's idempotency.

## Correct diagnosis — what it actually is

In ~85% of cases this is a **misconfigured Webhook node**: the workflow is set to respond after the last node finishes, and the workflow takes longer than the caller's timeout. The caller times out, marks the delivery failed, and (depending on caller) retries — creating duplicate executions while the original is still running.

Other root causes:

| Sub-diagnosis | How to identify | Severity |
|---|---|---|
| `responseMode=lastNode` + slow workflow | Above signals 1 + 2 + 3 | Medium — fix is config-only |
| Slow downstream node | Above signal 4 | High — workflow re-design |
| Queue saturation | Above signal 5 | High — instance scaling or workflow priority |
| Worker reaping caller's TCP socket | Worker logs show `EPIPE` / `socket hang up` | Low — symptom not cause |
| Caller misconfiguration (timeout set too low) | Caller's own dashboards | Out of scope |

## Fix — exact steps to resolve

> **Safety:** All n8n-side actions are config-only or retry. No customer data is modified. Caller-redelivery cancellation requires caller-side approval.

1. **Stop the runaway, if any.** If the same execution is still `running` and the caller has already retried, cancel: `POST /api/v1/executions/:id/stop`. Idempotency check first (`decision-trees/recovery-routing`).
2. **Recommend the config fix** (notify-human, do not auto-apply):
   - In the Webhook trigger node, set `responseMode = "onReceived"` (Respond Immediately) and add a `Respond to Webhook` node early in the workflow that returns `200 OK` with whatever ack body the caller expects.
   - Move the actual processing to a workflow that runs after the response is sent. Two patterns: (a) the same workflow, with the rest happening after `Respond to Webhook`, n8n keeps executing; (b) the webhook workflow only enqueues to a `Schedule Trigger` / `Execute Workflow` for the heavy work.
3. **De-duplicate retries.** If the caller has already redelivered while the original was running, mark the duplicates `canceled` rather than letting them produce duplicate side effects. The agent must inspect the workflow for an idempotency-key check **before** canceling — if there isn't one, side-effects may have occurred twice.
4. **Document caller retries in the customer report.** Stripe-style providers retry for 3 days; the customer must be told whether duplicate work shipped.
5. **If the root cause is a slow node** (signal 4): notify-human with the node name and its p95 time. Recommend either node-level retry/timeout, caching, or moving the call out of the synchronous response path.
6. **If queue saturation** (signal 5): notify-human with worker count and queue depth trend. Recommend adding workers or changing workflow priority.

## Prevention — how to avoid next time

Add to the customer's `playbooks/report-to-agency` recommendations:

- **Default to `responseMode = onReceived`** for every Webhook trigger node. The Respond-Immediately + async-processing pattern is the only configuration that survives caller timeout windows. The default `lastNode` setting should be considered a tripwire.
- **Always include an idempotency-key check** at the top of webhook workflows. Caller redeliveries are routine, not exceptional.
- **Tag webhook workflows with their caller** (e.g. `caller:stripe`) so the agent can apply caller-specific timeout budgets at audit time.
- **Set a soft SLO** of `p95 response time ≤ 50% of caller timeout`. A Stripe workflow at p95=8 s is one bad day from cascading retries.
- **Avoid OpenAI / LLM calls in the synchronous webhook path.** Their p99 is enormous; they belong in async follow-up workflows triggered by `Respond to Webhook`.
- **Monitor caller dashboards.** Stripe / Shopify / HubSpot all expose webhook delivery health; the agent should ingest these signals as cross-checks against n8n's own execution log.

## Cross-references

`decision-trees/failure-diagnosis` · `decision-trees/error-classification` (subtype `timeout.upstream`) · `playbooks/recover-from-api-error` · existing knowledge-base/failures/webhook-reliability · existing knowledge-base/tools/n8n-node-webhook
