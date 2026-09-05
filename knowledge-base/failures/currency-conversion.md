# Currency Conversion

**Category:** Failures
**Source:** https://docs.stripe.com/currencies, https://developers.google.com/google-ads/api/docs/reporting/fields/v19/metrics, https://www.exchangerate-api.com/docs/overview
**Updated:** 2026-05-01

## Overview
Multi-region money data fails when workflows mix micros, cents, zero-decimal currencies, stale FX rates, and display formatting. This note turns the recurring incident pattern into detection signals, prevention controls, and recovery steps for n8n production workflows.

## Related Notes
[[api-google-ads]] · [[api-stripe]] · [[approval-money-touching]]

---


## How It Happens
Multi-region money data fails when workflows mix micros, cents, zero-decimal currencies, stale FX rates, and display formatting. It usually appears after a client is added, volume grows, or a workflow moves from manual testing to scheduled production runs.

The usual agency pattern is a workflow that worked during a manual test with ten records, then fails when it sees multiple clients, old data, parallel executions, or a vendor-specific limit. The fix is to make the hidden assumption explicit: time zone, currency unit, page boundary, connection lifetime, retry ownership, or file-size limit.

## Detection Signals
- Unexpected deltas in outputs tied to currency conversion assumptions.
- Executions marked successful while downstream business counts disagree.
- Vendor errors, empty result sets, duplicate records, or delayed client-visible actions.
- Support tickets that mention wrong dates, wrong totals, missing files, or duplicate updates.

Detection should include both workflow symptoms and business symptoms. A green execution is not enough if the report has fewer rows than expected, the CRM has duplicate records, or the client receives a message at the wrong local time.

## Real Production Examples
- A scheduled report works for one timezone/client but shifts by one day after onboarding a second region.
- A backfill retries after a transient error and reprocesses already-mutated records because currency conversion was not checkpointed.
- A client-facing notification goes out from a green n8n execution even though the source system rejected part of the batch.

## Prevention Patterns
| Risk | Preventive control | n8n implementation |
| --- | --- | --- |
| Ambiguous input | Normalize and validate at workflow entry | Set node creates canonical fields. |
| Scale edge | Batch, checkpoint, and cap loops | Split In Batches plus durable cursor. |
| Partial success | Write audit rows per object | Supabase/Airtable log before mutation. |
| Human impact | Route risky action through approval | Wait node and Slack buttons. |

Use fixture executions for the edge cases: empty input, maximum page, DST boundary, duplicate webhook, revoked token, and vendor `429`. Keep those pinned inputs with the workflow so future edits can be regression-tested without waiting for a live incident.

## Recovery Procedures
- Freeze the workflow or reduce concurrency so the incident stops growing.
- Export affected execution IDs and upstream object IDs.
- Recompute expected state from source-of-truth data.
- Backfill through the normal deduplicated path.
- Add a pinned regression case that reproduces the incident.

After recovery, backfill through the same normalized path as normal traffic. Emergency scripts that bypass deduplication, audit logging, or unit conversion often create the second incident.

## n8n-Specific Considerations
For currency conversion, put normalization immediately after the trigger and before any IF/Switch branch. Keep raw vendor payloads in execution data, but pass only canonical fields into downstream nodes.

```javascript
    const key = `${$workflow.id}:${$execution.id}`;
    const item = $input.first().json;
    return [{
      json: {
        incident_key: key,
        source_id: item.id || item.event_id || null,
        detected_at: new Date().toISOString(),
        needs_manual_review: Boolean(item.error || item.ambiguous || item.amount_mismatch)
      }
    }];
```

## Field Checklist
Before enabling this in production, confirm the credential owner, account or workspace identifier, rate-limit budget, retry policy, and dead-letter path are written into the workflow notes. Run one backfill with a deliberately small date range or batch size, record the expected count, and compare it with the destination count before widening scope. For client-facing or money-touching actions, keep the final node disabled until a human approves the sample payload and the rollback path.

In n8n, pin a representative success item and a representative error item. Validate the expressions that read nested webhook bodies, add null checks before every ID lookup, and store upstream request IDs in execution data so support can correlate incidents with vendor logs. Any workflow that mutates external state should emit an audit row with `workflow_id`, `execution_id`, source object ID, destination object ID, before/after summary, and the chosen retry count.

Keep a small operator runbook beside the workflow. It should name the owner, normal execution cadence, expected record counts, known vendor delay, escalation channel, and the exact switch that disables external side effects. That runbook is what lets an AM or engineer pause safely during a client incident instead of editing nodes under pressure.
