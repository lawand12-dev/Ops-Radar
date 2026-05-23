# Playbook: Detect & resolve stuck execution

**Type:** Procedure (the agent runs this top-to-bottom)
**When to run:** On every monitoring tick (suggested 60–120 s) per customer instance, plus on demand from `decision-trees/failure-diagnosis` for suspected stuck rows
**Inputs:** customer instance config (DB connection / API key), `idempotent_workflows` set
**Outputs:** zero-or-more incident events written to the agent's timeline; zero-or-more cancel + replay actions
**Updated:** 2026-05-07

## Step 1 — Sweep candidate rows

Query the customer's n8n Postgres (or paginate `GET /api/v1/executions?status=running` if DB is not available):

```sql
WITH cand AS (
  SELECT id, "workflowId", mode, "startedAt", "waitTill", status,
         EXTRACT(EPOCH FROM (NOW() - "startedAt")) AS age_seconds
  FROM execution_entity
  WHERE "deletedAt" IS NULL
    AND status IN ('new','running','waiting','crashed')
)
SELECT *
FROM cand
WHERE
  (status = 'running'  AND age_seconds > 900)                      -- 15 min default
  OR (status = 'waiting' AND "waitTill" < NOW() - INTERVAL '5 min')
  OR (status = 'new'     AND age_seconds > 300)
  OR (status = 'crashed' AND age_seconds < 86400)                  -- last 24 h
ORDER BY age_seconds DESC
LIMIT 100;
```

Threshold note: 15 min is the default for `running`. Override per-workflow if `workflow.settings.executionTimeout` is set — use that value instead.

## Step 2 — Filter false positives

For each candidate, exclude:

- `mode = 'manual'` AND `age_seconds < 7200` (humans debug for up to 2 h)
- `status = 'waiting'` AND a downstream `Wait for Webhook` callback hasn't been issued yet (check workflow shape)
- workflows with tag `slow-by-design:true` (long-running batch jobs)

## Step 3 — Confirm stuck (don't act on first observation)

Re-query the same row 60 s later. Drop if `stoppedAt` is now populated. n8n flushes can lag.

For rows still stuck after re-query:

## Step 4 — Capture forensics

Before any action, snapshot to the agent's incident store:

```jsonc
{
  "execution_id": "...",
  "workflow_id": "...",
  "captured_at": "...",
  "row":          /* full execution_entity row */,
  "last_node":    /* highest-timestamp key in execution_data.data.resultData.runData */,
  "queue_depth":  /* n8n_queue_jobs_waiting from /metrics */,
  "active_jobs":  /* n8n_queue_jobs_active */,
  "worker_count": /* from infrastructure layer */,
  "worker_mem":   /* process_resident_memory_bytes for the suspected worker */,
  "pg_locks":     /* SELECT FROM pg_stat_activity WHERE state != 'idle' AND now() - query_start > '60 sec' */
}
```

These fields are required by `cases/stuck-execution` when escalating. If any are unavailable in the customer's deployment, record `null` and continue — don't fail the playbook on missing observability.

## Step 5 — Classify the sub-diagnosis

Run the table from `cases/stuck-execution` ("Correct diagnosis" section) against the captured forensics. Pick exactly one sub-diagnosis. If two would apply, pick the **infrastructural** one (worker-died over external-API-hang) — fixing infra subsumes the symptom.

## Step 6 — Decide cancel + replay

| Sub-diagnosis | Cancel? | Replay? |
|---|---|---|
| worker crashed | yes | only if idempotent |
| worker OOM | yes | only if idempotent + payload likely smaller next run |
| external API hang | yes | yes after wait window |
| Postgres lock | **no** | no (escalate) |
| Wait-resume failed | yes | yes if idempotent |
| no live workers | no (cancel is no-op) | no (escalate fleet) |
| Redis disconnect | no | no (escalate) |
| manual forgotten | yes | no |

Idempotency check: workflow has tag `idempotent:true`, OR last-node-executed is read-only. Otherwise notify-human.

## Step 7 — Cancel (if decided)

```
POST /api/v1/executions/:id/stop
Header: X-N8N-API-KEY: <key>
```

Expect `200` with the updated row. If `404`: row was already terminal — re-fetch and confirm; usually a race against the natural flush.

## Step 8 — Replay (if decided)

The agent cannot directly "re-run" an arbitrary execution. By trigger type:

- **Schedule trigger:** manually invoke via `POST /api/v1/workflows/:id/run` (n8n 1.x) with empty input. The schedule will pick the workflow up on its next natural run too — replay only if idempotent and the missed run materially matters.
- **Webhook trigger:** extract original input from `execution_data.data.executionData.contextData["$node"]["<webhook-node>"]` and POST it to the workflow's webhook URL with the same auth. Confirm with the customer that this URL is publicly reachable from the agent.
- **Polling / interval triggers:** wait for the next natural fire; do not synthesize.
- **Manual triggers:** never replay — those were always under human control.

Record the replay attempt in the incident timeline with `attempt: N` and `outcome: pending`. Watch the new execution to its terminal state; reconcile back into the timeline.

## Step 9 — Stop conditions (kill the loop)

Halt automatic action and force `escalate-engineer` if any of these in the past 60 min:

- Same workflow stuck > 3 times
- 5+ workflows in the same instance hit the same sub-diagnosis (instance-level problem)
- Two consecutive replays of the same workflow have failed
- Any `Postgres lock`, `disk full`, or `Redis disconnect` sub-diagnosis (these never self-resolve)

When halted, write a high-severity incident with the captured forensics from every affected execution.

## Step 10 — Customer-visible reporting

Push a single incident event per affected workflow per hour to the customer's timeline (avoid storms). Include:

- Workflow name + ID
- Sub-diagnosis (`cases/stuck-execution` table)
- Time stuck (max age across affected executions)
- Action taken (canceled, replayed, escalated)
- Recommended prevention (link the relevant Prevention bullet from `cases/stuck-execution`)

The aggregated daily/weekly digest is composed by `playbooks/report-to-agency`; the agent does not push raw incidents into customer reports — it pushes them into the incident store, and the report playbook reads from there.

## Step 11 — Self-evaluation

Append to `evals/` (when the harness is in place): the input forensics, the sub-diagnosis the agent chose, and the eventual ground-truth (engineer-confirmed root cause). The playbook is graded on the precision of its sub-diagnosis, not just on whether the symptom went away.

## Cross-references

`models/n8n-execution-schema` · `models/n8n-workflow-lifecycle` · `cases/stuck-execution` · `decision-trees/recovery-routing` · `playbooks/diagnose-workflow-failure`
