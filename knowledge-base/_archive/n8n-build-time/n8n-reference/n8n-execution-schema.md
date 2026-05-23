# n8n Execution Schema (Self-Hosted Postgres)

**Type:** Mechanistic model
**Audience:** n8n monitoring agent
**n8n target:** 1.50+ (queryable schema stable since 1.20)
**Source:** `packages/cli/src/databases/entities/` in n8n-io/n8n
**Updated:** 2026-05-07

## Purpose

Reference for direct database queries against a customer's self-hosted n8n Postgres. Use when the REST API does not expose the required granularity (e.g. node-level run data, multi-tenant rollups), when investigating stuck or crashed executions in bulk, or when computing health signals across thousands of executions efficiently.

> **Reads only.** Never `UPDATE` / `DELETE` against these tables. n8n's ORM owns row lifecycles. Issue corrective actions through the REST API or the n8n CLI, never raw SQL.

## Core tables

### `execution_entity` — one row per execution

| Column | Type | Notes |
|---|---|---|
| `id` | varchar / int | PK. Nanoid in 1.x; older instances may still be int. |
| `workflowId` | varchar | FK → `workflow_entity.id`. |
| `mode` | varchar | `manual`, `trigger`, `webhook`, `integrated`, `internal`, `retry`, `error`, `evaluation`. |
| `status` | varchar | See enum below. **Most important field for the agent.** |
| `finished` | boolean | Legacy; can lag `status` by one transaction. |
| `startedAt` | timestamptz | Set on first node execution. |
| `stoppedAt` | timestamptz | Null while running, stuck, or waiting. |
| `waitTill` | timestamptz | Set when paused on a `Wait` / interval node. |
| `retryOf` | varchar | FK to the original execution if this row is a retry. |
| `retrySuccessId` | varchar | Backref: which retry finally succeeded. |
| `deletedAt` | timestamptz | Soft-delete; pruning runs on schedule. |

### `execution_data` — heavy payload, 1:1 with `execution_entity`

| Column | Type | Notes |
|---|---|---|
| `executionId` | varchar / int | PK; FK to `execution_entity.id`. |
| `workflowData` | jsonb | Snapshot of the workflow at execution time. |
| `data` | jsonb | The actual `runData`: per-node input/output. **Large.** |

The `data` JSON is shaped roughly:

```jsonc
{
  "resultData": {
    "runData": { "<node-name>": [ { "data": { "main": [[...]] }, "error": null } ] },
    "lastNodeExecuted": "<node-name>",
    "error": { "message": "...", "name": "NodeApiError", "node": "...", "httpCode": "401" }
  },
  "executionData": { "contextData": {}, "nodeExecutionStack": [], "waitingExecution": {} }
}
```

### `execution_metadata` — key-value tags per execution

```sql
executionId | varchar    -- FK
key         | varchar    -- e.g. customer/tenant tag
value       | text
```

### `workflow_entity` — workflow definitions

| Column | Type | Notes |
|---|---|---|
| `id` | varchar | Nanoid. |
| `name` | varchar | |
| `active` | boolean | If `false`, no triggers fire. |
| `nodes` | jsonb | Node definitions (each with `parameters`, `credentials`, `typeVersion`). |
| `connections` | jsonb | Edges. |
| `settings` | jsonb | Includes `errorWorkflow`, `timezone`, `executionOrder`, `executionTimeout`. |
| `triggerCount` | int | n8n-maintained counter; useful for healthchecks. |
| `isArchived` | boolean | Newer column; archived workflows are excluded from active lists. |

### `credentials_entity` — encrypted credential blobs

| Column | Type | Notes |
|---|---|---|
| `id` | varchar | Nanoid. |
| `name` | varchar | |
| `type` | varchar | e.g. `googleOAuth2Api`, `slackApi`, `httpHeaderAuth`. |
| `data` | text | Encrypted with `N8N_ENCRYPTION_KEY`. **Never decrypt; never log.** |
| `updatedAt` | timestamptz | Touched on rotation — useful for proactive expiry detection. |

## Status enum

| Status | Meaning | Agent action |
|---|---|---|
| `new` | Queued, not yet picked up | Alert if stale > 5 min in queue mode |
| `running` | Executing on a worker | Alert if stale > workflow timeout (or 15 min default) |
| `waiting` | Paused on `Wait` / interval | Check `waitTill`; alert only if `waitTill < now()` and still `waiting` |
| `success` | Completed without error | No-op |
| `error` | A node threw and halted | Diagnose via `data.resultData.error` → `decision-trees/failure-diagnosis` |
| `crashed` | Worker died mid-execution | Replay if idempotent; → `playbooks/detect-stuck-execution` |
| `canceled` | Manually canceled | No-op unless cancel rate is climbing per workflow |

## Reference queries

```sql
-- Stuck running > 15 min
SELECT id, "workflowId", mode, "startedAt"
FROM execution_entity
WHERE status = 'running'
  AND "startedAt" < NOW() - INTERVAL '15 minutes'
  AND "deletedAt" IS NULL
ORDER BY "startedAt";

-- Error rate per workflow, last 24 h
SELECT "workflowId",
       COUNT(*) FILTER (WHERE status = 'error')   AS errors,
       COUNT(*) FILTER (WHERE status = 'success') AS successes,
       COUNT(*)                                   AS total
FROM execution_entity
WHERE "startedAt" > NOW() - INTERVAL '24 hours'
  AND "deletedAt" IS NULL
GROUP BY "workflowId"
ORDER BY errors DESC;

-- Last error payload for a workflow
SELECT ee.id, ee."startedAt",
       jsonb_path_query_first(ed.data, '$.resultData.error') AS error
FROM execution_entity ee
JOIN execution_data   ed ON ed."executionId" = ee.id
WHERE ee."workflowId" = $1
  AND ee.status = 'error'
ORDER BY ee."startedAt" DESC
LIMIT 1;

-- Stale-credential candidates: never updated, used by active workflow
SELECT c.id, c.name, c.type, c."updatedAt"
FROM credentials_entity c
WHERE c."updatedAt" < NOW() - INTERVAL '60 days';
```

## Pruning behavior

n8n prunes finished executions on a schedule controlled by env:

- `EXECUTIONS_DATA_PRUNE=true` (default in 1.x)
- `EXECUTIONS_DATA_MAX_AGE=336` hours (14 d default)
- `EXECUTIONS_DATA_PRUNE_MAX_COUNT=10000`

If the agent queries beyond the prune window, rows are gone. **Always cache critical diagnoses in the agent's own store** — never assume `execution_entity` has long-term history.

## Cross-references

`models/n8n-workflow-lifecycle` · `models/n8n-api-reference` · `playbooks/detect-stuck-execution` · `decision-trees/failure-diagnosis`
