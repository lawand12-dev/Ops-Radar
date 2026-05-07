# Case: Concurrent execution conflict (webhook duplicates)

**Type:** Labeled failure case
**Diagnosis label:** `data.concurrent-conflict`
**Routes from:** `decision-trees/failure-diagnosis` (httpCode 409 from a non-idempotent endpoint), or external signal (downstream record has duplicate or last-write-wins data loss), or proactive scan (multiple executions started within seconds for the same upstream event ID)
**Auto-handle safety:** Cancel duplicates is **safe only after** an idempotency check confirms only one execution will produce the side effect. Otherwise `notify-human`. Never auto-restart conflicting executions — that creates a third duplicate.
**Updated:** 2026-05-07

## Input — what the error looks like

Three observable shapes:

**(a) Direct API conflict — visible to n8n:**
```jsonc
{
  "name": "NodeApiError",
  "node": "Stripe" /* or HubSpot, Postgres, Salesforce */,
  "httpCode": "409",
  "message": "Idempotency-Key 'evt_1A2b...' was previously used for a different operation"
}
```

**(b) Postgres unique-constraint violation:**
```
duplicate key value violates unique constraint "contacts_email_key"
DETAIL: Key (email)=(alice@acme.com) already exists.
```

**(c) Silent corruption — visible only to the customer:**
- Two webhook deliveries for the same Stripe `event.id` create two charges in QuickBooks.
- Two parallel branches of a `Split In Batches` write to the same Airtable record; second write wins; first write's data is lost.
- Two HubSpot updates within the same second produce non-deterministic property final state.

The agent must catch (c) proactively — there's no error to react to. Detection signal: `execution_metadata` contains the same upstream `event_id` (or HubSpot `objectId`, Stripe `event.id`, Shopify webhook signature) across two `success` executions within 5 minutes.

## Signals — what to check

1. **Webhook caller's retry behaviour:**
   | Caller | Retries on slow / failed delivery |
   |---|---|
   | Stripe | up to 3 days exponential, 16+ attempts |
   | Shopify | up to 19 retries within 48 h |
   | HubSpot | 3 retries over ~15 min |
   | GitHub | none |
   | Calendly | 5 retries over ~1 h |
   | Twilio | 11 retries over 24 h |
2. **n8n queue mode parallelism.** With `N8N_CONCURRENCY_PRODUCTION_LIMIT > 1` and multiple workers, n8n will happily process two webhook events with the same payload concurrently if both arrive within the worker pickup window.
3. **Workflow shape:** is the duplicate-creating node *upstream* of any deduplication gate? If yes, races are inevitable. The dedup must be the **first** node touching shared state.
4. **Idempotency keys received.** Most providers send a header or body field that uniquely identifies the event:
   - Stripe: `Stripe-Signature` (timestamped) + `event.id` in body
   - Shopify: `X-Shopify-Webhook-Id` header
   - HubSpot: `X-HubSpot-Request-Id` header
   - GitHub: `X-GitHub-Delivery` header
   - Calendly: `Calendly-Webhook-Signature`
   The webhook node exposes these as headers in the trigger output. If the workflow is not reading them, idempotency is impossible.
5. **Upstream Postgres / Redis lock state.** If the workflow uses an external dedup (Postgres advisory lock, Redis SETNX), check whether the lock was acquired by both executions or only one. If both, the lock implementation is broken (e.g. acquired with too-short TTL).
6. **Downstream record fingerprint.** For (c), pull the destination record's audit / change history. Two updates within 1 second with different content = race. One update with the second-execution's content only = last-write-wins data loss.

## Correct diagnosis — what it actually is

| Sub-diagnosis | Identifier | Severity |
|---|---|---|
| **Webhook redelivery storm** | Same caller event_id across 2+ executions; caller is retrying | High — escalates fast |
| **Parallel branch race** | Single execution; `Split In Batches` writes to same record from two items | High — silent |
| **Multiple-worker race** | Same event arrives twice within 1 s; queue mode picks both into different workers | High — needs lock |
| **Replay after partial success** | First execution failed mid-chain; retry created duplicate of completed step | Medium — needs idempotent steps |
| **Trigger fires on schedule + manual** | Schedule trigger fires while a manual run is mid-flight | Low — coincidence |
| **Wrong dedup key** | Workflow dedups on workflow-internal ID instead of upstream event ID | Medium — config bug |

## Fix — exact steps to resolve

> **Safety:** First action is always **stop the bleeding** — pause the workflow if duplicates are still arriving. Reconciliation comes after the source is staunched.

1. **Pause the workflow** if duplicates are still being produced: `POST /api/v1/workflows/:id/deactivate`. The customer's caller will accumulate undelivered events; better that than more corruption.
2. **Inventory duplicates.** Query `execution_metadata` and `execution_entity` for all rows matching the upstream event ID(s) in the last hour. Build the duplicate set.
3. **Decide which execution "wins."** Conventions, in order:
   - **First successful completion.** If exec A completed and exec B is still running, B is the duplicate.
   - **First-arrived if both succeeded.** Earlier `startedAt` wins; later is the duplicate.
   - **Last-arrived if both failed.** Most useful retry to keep alive.
4. **Cancel losers.** For executions still running, `POST /api/v1/executions/:id/stop`. For completed losers, the side effect already shipped — those need reconciliation, not cancel.
5. **Reconcile destination.** For each duplicate that produced a side effect, the agent must surface the record IDs to engineering. The agent does **not** auto-merge — destination merges are domain-specific (HubSpot dedupe, Stripe refund, Postgres delete-newer) and must be human-approved.
6. **Apply idempotency at the workflow's first node.** Recommend the engineer add an `If` node with a check against a dedup table:
   ```sql
   INSERT INTO webhook_dedup (event_id, workflow_id, received_at)
   VALUES ($1, $2, NOW())
   ON CONFLICT (event_id, workflow_id) DO NOTHING
   RETURNING received_at;
   ```
   If `received_at` is null (no row inserted), the event is a duplicate — short-circuit with `Respond to Webhook` 200 and stop. If the row was just inserted, proceed with the workflow.
7. **Re-activate the workflow** only after the dedup gate is in place AND the duplicate set is reconciled.

## Prevention — how to avoid next time

- **Read the caller's idempotency header on every webhook trigger.** Stripe `event.id`, Shopify `X-Shopify-Webhook-Id`, HubSpot `X-HubSpot-Request-Id`, GitHub `X-GitHub-Delivery`. The dedup table is keyed on this.
- **The dedup gate is the first node** in the workflow, before any branching, before any HTTP call, before any DB write. Deduplicating later means you've already done expensive work.
- **Use a Postgres unique constraint** for the dedup table — race-safe by construction. Application-level checks (read-then-write) are not race-safe even with `SELECT FOR UPDATE`.
- **Set `N8N_CONCURRENCY_PRODUCTION_LIMIT=1` for non-thread-safe workflows.** Forces serial processing per workflow. Reduces throughput but eliminates same-workflow races. Use sparingly.
- **For `Split In Batches`, ensure each item targets a distinct destination record.** If multiple items can write to the same record, group-by before the split.
- **Tag workflows with `concurrency-safe:true`** when the engineer has audited the dedup path. Without the tag, the agent treats parallel arrivals as suspect and slows recovery.
- **Webhook callers must be configured to redeliver** — that's a feature. The receiver (you) must be configured to dedupe. Never disable caller redelivery to "fix" duplicates.

## Cross-references

`decision-trees/failure-diagnosis` (label `data.concurrent-conflict`) · `decision-trees/recovery-routing` (idempotency probe rules) · `cases/hubspot-duplicate-contact` · `cases/webhook-timeout` · `reference/n8n-production/n8n-queue-mode` · `reference/n8n-nodes/n8n-node-webhook`
