# Case: Generic stuck execution

**Type:** Labeled failure case
**Diagnosis label:** `stuck.zombie-suspected` / `stuck.timeout-exceeded` / `infra.worker-died`
**Routes from:** `decision-trees/failure-diagnosis` for any `status='running'` past its expected duration, or `status='waiting'` past `waitTill`, or `status='crashed'`
**Auto-handle safety:** Cancel + replay only if workflow is idempotent. Default = notify-human.
**Updated:** 2026-05-07

## Input — what the error looks like

A row in `execution_entity` matching one of:

```sql
-- Pattern A: running too long
status = 'running' AND startedAt < NOW() - INTERVAL '15 minutes'

-- Pattern B: waiting past resume window
status = 'waiting' AND waitTill < NOW() - INTERVAL '5 minutes'

-- Pattern C: explicitly crashed
status = 'crashed'

-- Pattern D: queued but not picked up
status = 'new' AND startedAt IS NULL AND <created> < NOW() - INTERVAL '5 minutes'
```

Pattern D in queue mode usually means **no live workers** or **Redis disconnect**. Pattern A and C are the most common in production.

## Signals — what to check

1. **`mode`:** `manual` executions can legitimately stay running for hours (a developer is debugging). Filter manual out before alerting unless the customer has flagged manual mode as out-of-bounds.
2. **`workflowData.settings.executionTimeout`:** if the workflow set its own timeout and `now - startedAt > executionTimeout`, the workflow should have been auto-killed. If it wasn't, n8n's reaper isn't running — that itself is a signal.
3. **Last node executed.** From `execution_data.data.resultData.runData`, take the highest-timestamp entry — that's the last node n8n actually wrote out. Time since that flush is the lower-bound stall time. If `runData` is empty, the worker died before any node completed.
4. **Worker liveness (queue mode):** check `n8n_queue_jobs_active` from Prometheus; if the count is non-zero but worker pods (in Kubernetes) or processes (bare metal) are restarting in a loop, the job is being picked up and dropped repeatedly. Also check `worker.id` in execution metadata if the customer has it tagged.
5. **Redis depth:** `n8n_queue_jobs_waiting`. If this is climbing while `active` is 0, no worker is consuming. If `active` matches `worker_count` and the agent's target execution sits in `waiting`, the system is at saturation but functional.
6. **Postgres lock:** `SELECT * FROM pg_stat_activity WHERE state != 'idle' AND now() - query_start > '1 minute';` — long-held locks block n8n's executor from advancing.
7. **Memory pressure:** `process_resident_memory_bytes` near container limit on the worker that owns the execution → likely OOM-soft-kill in flight.
8. **External API hang:** if the last node was an HTTP-based node, it may be waiting for an upstream that won't respond. Match `last_node.type` against the agent's set of known-slow nodes.

## Correct diagnosis — what it actually is

Stuck doesn't mean broken — it means **the execution is in a state where time has passed but state hasn't advanced**. Disambiguate:

| Sub-diagnosis | Identifying signals | Action target |
|---|---|---|
| **Worker crashed mid-execution** | `status='running'`, no log entries from the worker since startedAt, worker pod restarted | `auto-cancel-replay` if idempotent |
| **Worker OOM-killed** | Memory pressure signal, last node is a heavy-data node (HTTP w/ large response, Code with big arrays, AI Agent) | `auto-cancel-replay` only if smaller payload likely |
| **External API hang** | Last node is an HTTP/AI/DB node; upstream's own status page shows incident | `auto-cancel`, then `auto-retry` after window |
| **Postgres long-running lock** | `pg_stat_activity` shows held lock blocking n8n's tables | `escalate-engineer` (instance-level) |
| **Wait node resume failed** | `status='waiting'`, `waitTill < now`, no movement | `auto-cancel-replay` if idempotent |
| **No live workers (queue mode)** | `status='new'` for many executions; `n8n_queue_jobs_waiting` climbing | `escalate-engineer` (worker fleet) |
| **Redis disconnect** | Workers running but `n8n_queue_jobs_*` series gap | `escalate-engineer` |
| **Manual execution forgotten** | `mode='manual'` AND user closed the browser | `auto-cancel` (no replay) |

## Fix — exact steps to resolve

> **Safety:** Cancel is reversible only via re-firing the trigger; replay can produce duplicate side effects if non-idempotent. Always run idempotency check (`decision-trees/recovery-routing`) before replay.

1. **Confirm stuck-ness.** Don't act on the first observation. Re-query the execution row 60 s later. If `stoppedAt` populated in the interval, drop the alert — n8n was just slow to flush.
2. **Capture forensics first.** Before canceling, snapshot:
   - `execution_entity` row
   - `execution_data.data.resultData.runData` keys + last entry's timestamp
   - Worker logs from `startedAt` to now (if accessible)
   - Prometheus values for queue depth, worker memory, eventloop lag at the time
   These go into the case timeline; the agent will need them if replay also fails.
3. **Cancel:** `POST /api/v1/executions/:id/stop`. The endpoint handles `running`, `waiting`, and `new`; for `crashed` rows the cancel is a no-op (already terminal).
4. **Decide replay.**
   - **Idempotent workflow** (tagged or last-node read-only): re-fire the trigger. For schedule triggers, manually invoke. For webhook triggers, the agent **cannot** synthesize the original payload — it must extract from the execution's input data:
     `data.executionData.contextData["$node"]["<webhook-node>"]` — and POST it back to the webhook URL. This requires the customer's webhook auth.
   - **Non-idempotent or unknown:** stop. Notify-human with the snapshot above.
5. **For Pattern D (queued, no pickup):** cancel is a no-op (no worker holds the job). Escalate to fleet-level: page the agency engineer with worker count, restart loop count, queue depth.
6. **For Postgres lock:** the agent must NOT issue any DB-level kill. Surface the locking PID and query to engineering and stop.
7. **Audit the alert.** If this is the third stuck execution of the same workflow within an hour, suppress further alerts for this workflow for 30 min and raise to severity HIGH. Auto-handler stop conditions (`recovery-routing`) apply.

## Prevention — how to avoid next time

Add to the customer's `playbooks/report-to-agency` recommendations:

- **Set `executionTimeout` on every production workflow.** n8n's default is no timeout. A 30-minute cap prevents zombie executions from accumulating indefinitely.
- **Tag idempotent workflows.** A simple convention (`idempotent:true`) lets the agent auto-recover from worker death without paging anyone.
- **Add per-node timeouts.** For HTTP Request nodes, set `options.timeout` (default 0 = forever). 30 s is sane for most APIs; AI nodes need longer (90 s) but should not block webhook responses.
- **Run worker liveness probes.** In Kubernetes: liveness on `/healthz`, readiness on `/healthz/readiness`. Bare metal: a `systemd` watchdog or `pm2 monit`.
- **Cap memory per worker.** A misconfigured worker without a memory limit can pull a node down. Cap to a known size and let OOM-killer surface the problem rather than letting it cascade.
- **Enable n8n's built-in error workflow** at the instance level (`N8N_ERROR_WORKFLOW=<id>`). The agent can subscribe to that error workflow's executions for fast-path detection of `status='error'`; pair with this case file's signals for `running`/`crashed`/`waiting` cases the error workflow doesn't catch.
- **Prune `execution_data` aggressively.** Disk-full causes Postgres lock. Default `EXECUTIONS_DATA_MAX_AGE=336` (14d) is too generous for high-volume customers; 72h is healthier.

## Cross-references

`decision-trees/failure-diagnosis` · `decision-trees/recovery-routing` · `playbooks/detect-stuck-execution` (master procedure) · `models/n8n-execution-schema` · `models/n8n-workflow-lifecycle` · existing knowledge-base/failures/concurrent-execution-race-conditions
