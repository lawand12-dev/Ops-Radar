# Playbook: Diagnose a workflow failure

**Type:** Procedure (top-level diagnostic flow for any non-success terminal execution)
**When to run:** Triggered by `status = 'error' | 'crashed' | 'canceled'` on a finished execution; or on demand from a customer ticket with execution ID
**Inputs:** execution ID, customer instance config
**Outputs:** a labeled diagnosis (label + subtype + confidence) written to the incident store; a routed next action (case file or escalation)
**Updated:** 2026-05-07

## Step 1 — Fetch the execution

Prefer the API for stability:

```
GET /api/v1/executions/:id?includeData=true
Header: X-N8N-API-KEY: <key>
```

Fall back to direct DB if the API fails or the execution is too old:

```sql
SELECT ee.*, ed.data
FROM execution_entity ee
LEFT JOIN execution_data ed ON ed."executionId" = ee.id
WHERE ee.id = $1;
```

If `data` is null but `status='error'`, the worker died before flushing partial data. Handle as `infra.worker-died` and stop here — there is no node-level diagnosis to do.

## Step 2 — Extract diagnostic fields

Pull these into a flat shape the decision tree can match against:

```jsonc
{
  "status":          /* execution_entity.status */,
  "mode":            /* execution_entity.mode */,
  "started_at":      /* timestamp */,
  "stopped_at":      /* timestamp or null */,
  "wait_till":       /* timestamp or null */,
  "last_node":       /* data.resultData.lastNodeExecuted */,
  "error.name":      /* data.resultData.error.name */,
  "error.message":   /* data.resultData.error.message */,
  "error.httpCode":  /* data.resultData.error.httpCode */,
  "error.node":      /* data.resultData.error.node */,
  "error.context":   /* data.resultData.error.context */
}
```

If `error` is null but `status='error'`, walk `data.resultData.runData.<each node>.error` and pick the first non-null. n8n occasionally records the failure on the node row but not at the top level (older 1.x versions and certain branch configurations).

## Step 3 — Walk the decision tree

Load `decision-trees/failure-diagnosis` and traverse it with the fields from Step 2. Stop at the first matching leaf. The leaf yields:

- a `label` (e.g. `auth.refresh-expired`, `ratelimit.meta-buc`, `data.duplicate-hubspot`)
- a `next` target (`cases/...`, `playbooks/...`, `decision-trees/...`, or `escalate.<reason>`)
- an implicit confidence level

If the leaf is `DEFAULT` / `escalate.unknown`, branch into `decision-trees/error-classification` to attach a category (one of seven). The label becomes `<category>.unclassified`.

## Step 4 — Load the matching case (if any)

If `next` points to `cases/<name>`, load that file. Cross-check that the actual execution matches the case's `Input` and `Signals` sections — the decision tree is fast but coarse; the case file is precise. If the case's `Signals` don't match (e.g. the tree picked `meta-api-rate-limit` but `error.code` is not in `{4,17,32,613}`), demote confidence to LOW and re-route to `decision-trees/error-classification` for a coarser match.

## Step 5 — Compose the diagnosis record

```jsonc
{
  "ts": "...",
  "execution_id": "...",
  "workflow_id": "...",
  "label": "auth.refresh-expired",
  "category": "auth",
  "subtype": "refresh-expired",
  "confidence": "high|medium|low",
  "case_file": "cases/google-oauth-expired",   /* may be null if escalated */
  "next_action": "auto-refresh|notify-human|escalate-engineer|...",
  "evidence": {
    "error.httpCode": "401",
    "error.message": "Token has been expired or revoked.",
    "error.node": "Google Sheets",
    "credential_updatedAt_age_days": 14
  }
}
```

`evidence` is the minimum set the agent used to reach the label. It must be sufficient that an engineer could reproduce the diagnosis without re-querying n8n.

## Step 6 — Route the action

Hand off based on `next_action`:

- `auto-retry` / `auto-refresh` / `auto-cancel-replay` → invoke `playbooks/recover-from-api-error` with the diagnosis record.
- `notify-human` → push to the customer's alert channel; include the case file's `Fix` and `Prevention` sections.
- `escalate-engineer` → page the on-call; bundle the diagnosis record + the failed execution's full `data.resultData` blob.

## Step 7 — Confidence-gated auto-handling

Auto-handle is allowed only when:

- `confidence == "high"` AND
- The case file's `Auto-handle safety` declares the proposed action safe AND
- The agent's stop conditions (`decision-trees/recovery-routing`) are not currently tripped.

If any of those is false, downgrade to `notify-human` regardless of what the case file's default action is.

## Step 8 — Schema-drift cross-check (special case)

Even when a leaf matches with HIGH confidence, run the schema-drift heuristic from `decision-trees/error-classification` for any `data.*` label:

1. The same `(workflow_id, error.node, error.httpCode)` succeeded in the trailing 7 days.
2. The current error message names a specific field.
3. The upstream platform has a published change in the last 30 days.

If all three: override the original label to `data.schema-drift` and route to `escalate-engineer`. Schema drift caught early is much cheaper than caught after the customer notices.

## Step 9 — Write to the incident store

The diagnosis record (Step 5) is the source of truth for `playbooks/report-to-agency`. The store must support:

- per-customer / per-workflow / per-time-window queries
- de-duplication by `(workflow_id, label, evidence_fingerprint)` within a 1 h window
- retention long enough to compute weekly trends (90 d minimum)

A simple Postgres table with appropriate indices is sufficient; pgvector for similarity over `evidence` is a bonus that lets the agent recognize "this is the same incident as last Tuesday's."

## Step 10 — Self-eval hooks

For every diagnosis record, the agent should optionally append the engineer's eventual confirmation (or correction) when it arrives. Disagreements between the agent's chosen `label` and the engineer's confirmed root cause go into `evals/disagreements/` for later analysis. The agent's calibration depends on this loop being closed.

## Cross-references

`decision-trees/failure-diagnosis` · `decision-trees/error-classification` · `decision-trees/recovery-routing` · all `cases/` · `playbooks/recover-from-api-error` · `playbooks/report-to-agency`
