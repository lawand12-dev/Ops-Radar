---
scenario_id: postgres-connections-exhausted-pool-default
domain: infra
difficulty: medium
ground_truth_label: infra.db-connections-exhausted
ground_truth_action: notify-human
created: 2026-05-07
provenance: synthetic — based on n8n queue-mode production tuning docs and community reports of default pool_size causing pool exhaustion
---

# Scenario: Connection pool exhausted under load — DB_POSTGRESDB_POOL_SIZE left at default 2

A production n8n instance running in queue mode with 5 workers and `N8N_CONCURRENCY_PRODUCTION_LIMIT=10` starts failing under load. The env `DB_POSTGRESDB_POOL_SIZE` was never set — it defaults to 2 per process. Executions of high-concurrency workflows begin failing with "Connection pool exhausted — pool size: 2, pending: 47". The n8n health endpoint returns HTTP 200 (the instance is up). 4 of 5 workers report healthy. Worker 3 (`worker-3`) has 14 `idle in transaction` connections in `pg_stat_activity` — it is stuck but not crashed. Low-traffic workflows (which need at most 1 DB connection per execution) continue succeeding. Only workflows that open multiple DB connections within a single execution are affected.

This is the **deceptively partial-failure** case: the health endpoint is green, most workers are fine, and some workflows succeed. A naive agent sees "some failures, health is green" and either dismisses it as transient or misroutes to `infra.n8n-unhealthy`. The pool constraint is the true bottleneck and requires a configuration change — there is no auto-fix.

## Inputs

### `execution_row`

```json
{
  "id": "exec_customer_sync_pool_fail_001",
  "workflowId": "wf_customer_data_sync",
  "mode": "trigger",
  "status": "error",
  "finished": true,
  "startedAt": "2026-05-07T09:41:02Z",
  "stoppedAt": "2026-05-07T09:41:07Z"
}
```

### `execution_data`

```json
{
  "lastNodeExecuted": "Read Customer Segment",
  "runData": {
    "Schedule Trigger": [
      {
        "executionTime": 2
      }
    ],
    "Read Customer Segment": [
      {
        "executionTime": 4981,
        "error": {
          "name": "Error",
          "message": "Connection pool exhausted — pool size: 2, pending: 47",
          "node": "Read Customer Segment",
          "stack": "Error: Connection pool exhausted — pool size: 2, pending: 47\n    at Pool.acquire (/usr/local/lib/node_modules/n8n/node_modules/typeorm/connection/Connection.js:312:19)"
        }
      }
    ]
  },
  "error": {
    "name": "Error",
    "message": "Connection pool exhausted — pool size: 2, pending: 47",
    "node": "Read Customer Segment"
  }
}
```

### `workflow_definition` (relevant slice)

```json
{
  "id": "wf_customer_data_sync",
  "name": "Customer data sync — multi-segment read + write",
  "active": true,
  "settings": {
    "executionTimeout": 600
  },
  "versionId": "v_2026-05-02-1",
  "tags": ["db:heavy", "priority:high"],
  "nodes": [
    { "name": "Schedule Trigger", "type": "n8n-nodes-base.scheduleTrigger", "position": [240, 300] },
    { "name": "Read Customer Segment", "type": "n8n-nodes-base.postgres", "position": [460, 300] },
    { "name": "Enrich via HubSpot", "type": "n8n-nodes-base.hubspot", "position": [680, 300] },
    { "name": "Write Enriched Customers", "type": "n8n-nodes-base.postgres", "position": [900, 300] },
    { "name": "Update Sync Timestamp", "type": "n8n-nodes-base.postgres", "position": [1120, 300] }
  ]
}
```

(Note: three Postgres nodes in a single execution path — `Read Customer Segment`, `Write Enriched Customers`, `Update Sync Timestamp`. Under `N8N_CONCURRENCY_PRODUCTION_LIMIT=10` and `DB_POSTGRESDB_POOL_SIZE=2`, 10 concurrent executions can demand up to 30 connections from a pool of 10 total across 5 workers.)

### `metrics_snapshot`

```json
{
  "queue_jobs_waiting": 23,
  "queue_jobs_active": 10,
  "worker_health": {
    "worker-1": "healthy",
    "worker-2": "healthy",
    "worker-3": "stuck — 14 idle-in-transaction connections in pg_stat_activity",
    "worker-4": "healthy",
    "worker-5": "healthy"
  },
  "n8n_healthz_status": 200,
  "n8n_healthz_body": { "status": "ok" },
  "executions_failed_last_15min": 31,
  "executions_succeeded_last_15min": 44,
  "low_traffic_workflow_success_rate_last_15min": 1.0,
  "high_concurrency_workflow_success_rate_last_15min": 0.29
}
```

### `external_signals`

```json
{
  "tags_on_workflow": ["db:heavy", "priority:high"],
  "env_DB_POSTGRESDB_POOL_SIZE": "not set (default: 2)",
  "env_N8N_CONCURRENCY_PRODUCTION_LIMIT": "10",
  "env_N8N_WORKER_COUNT": "5",
  "pg_stat_activity_snapshot": {
    "total_connections": 58,
    "max_connections": 100,
    "by_state": {
      "active": 12,
      "idle": 16,
      "idle in transaction": 22,
      "idle in transaction (aborted)": 8
    },
    "by_application_name": {
      "n8n": 52,
      "metabase": 4,
      "psql": 2
    },
    "top_idle_in_transaction_age_seconds": [
      { "pid": 18241, "age_s": 483, "worker": "worker-3" },
      { "pid": 18242, "age_s": 479, "worker": "worker-3" },
      { "pid": 18243, "age_s": 476, "worker": "worker-3" }
    ]
  },
  "recent_failures_other_workflows_same_error": 28,
  "recent_failures_low_traffic_workflows_same_error": 0
}
```

## Expected output

```yaml
expected_label:           infra.db-connections-exhausted
expected_subtype:         n8n-pool-too-small
expected_confidence:      high
expected_action:          notify-human
expected_evidence_keys:
  - error.message
  - env_DB_POSTGRESDB_POOL_SIZE
  - env_N8N_CONCURRENCY_PRODUCTION_LIMIT
  - pg_stat_activity_snapshot.by_application_name.n8n
  - pg_stat_activity_snapshot.by_state.idle in transaction
  - worker_health.worker-3
  - high_concurrency_workflow_success_rate_last_15min
  - low_traffic_workflow_success_rate_last_15min
expected_case_loaded:     cases/postgres-connections-exhausted
forbidden_actions:
  - auto-retry                # hard fail — the pool is still exhausted; retry joins the back of the queue and worsens the stampede
  - escalate-engineer         # wrong path — the case file is explicit that this label routes to notify-human, not engineering oncall; the fix is a config change, not an incident response
```

## Grading notes

This scenario has two traps. The agent must navigate both:

**Trap 1 — health endpoint is green, so the instance appears healthy.** The most common misroute is `infra.n8n-unhealthy` because executions are failing. But `n8n_healthz_status = 200` and `n8n_healthz_body.status = "ok"` mean the n8n process itself is running fine. The pool exhaustion is internal to the worker's connection management — it does not fail the health check. The agent must distinguish "n8n is up but some operations fail due to resource contention" from "n8n is down." The discriminator is: `error.message` contains `Connection pool exhausted` + `env_DB_POSTGRESDB_POOL_SIZE` is at default + `pg_stat_activity.by_application_name.n8n` dominates the connection count. That pattern routes to `infra.db-connections-exhausted`, sub-diagnosis `n8n-pool-too-small`.

**Trap 2 — partial failure looks like transient noise.** `executions_succeeded_last_15min = 44` alongside `executions_failed_last_15min = 31`. 44 successes suggests the system is mostly healthy. But the split is not random: `low_traffic_workflow_success_rate = 1.0` (zero failures) versus `high_concurrency_workflow_success_rate = 0.29` (71% failure rate). This pattern — perfect success for simple workflows, catastrophic failure for DB-heavy ones — is the fingerprint of pool exhaustion, not random transience. A model that looks only at the aggregate pass rate misses the stratification entirely.

The correct action sequence:

1. Walk the tree → `infra.db-connections-exhausted` (from `Connection pool exhausted` message + `pg_stat_activity` showing n8n holds 52 of 58 connections with 22 `idle in transaction`).
2. Load `cases/postgres-connections-exhausted`. Confirm sub-diagnosis `n8n-pool-too-small`: `DB_POSTGRESDB_POOL_SIZE` is at default (2), `N8N_CONCURRENCY_PRODUCTION_LIMIT=10` with 5 workers means n8n can theoretically demand `5 workers × 2 pool × 10 concurrency spikes = up to 100 connection acquisition attempts` against a pool of 10. The math is immediately wrong.
3. Scope the impact: the `pg_stat_activity` snapshot shows n8n owns 52 of 58 active connections, with 22 `idle in transaction` — idle-in-transaction connections hold their slot without doing work, starving new requests.
4. Identify the stuck worker: `worker-3` has 14 connections all `idle in transaction`, some held for 8+ minutes. It is not crashed (health check passes) but is a connection hoarder.
5. Refuse `auto-retry` — the case file is explicit: "Auto-retry on this category creates a stampede that worsens the outage." With `queue_jobs_waiting = 23` already backed up, auto-retry compounds the queue depth.
6. Refuse `escalate-engineer` — the case file routes this label to `notify-human`, not `escalate-engineer`. The distinction matters: `notify-human` sends an alert with specific remediation steps to the operator; `escalate-engineer` pages the oncall engineer for an emergency. This is a configuration issue, not a production outage requiring emergency response.
7. Compose `notify-human` with: the pool size mismatch calculation (`workers × pool_size vs concurrency limit`), the `pg_stat_activity` census (n8n dominates, 22 idle-in-transaction, worker-3 stuck), and specific remediation steps: "Set `DB_POSTGRESDB_POOL_SIZE=5` as a minimum; right-size via `worker_count × concurrency_limit / DB_capacity`. Consider pgBouncer transaction pooling for the Supabase-backed deployment. Review worker-3's idle-in-transaction connections — candidate for `pg_cancel_backend` after engineer review."

Common LLM mistakes:

- Routing to `infra.n8n-unhealthy` because executions are failing. The health endpoint is the authoritative liveness signal — it is green. The agent must not override a 200 health response based on execution failures alone without additional evidence of process failure.
- Not differentiating the failure rate by workflow type. The aggregate 59% success rate obscures the real signal. The stratified view (100% success for low-traffic, 29% for high-concurrency) is the diagnostic key. An agent that computes only averages will under-diagnose the severity.
- Calling `escalate-engineer` because the failure rate is high and the tag includes `priority:high`. The priority tag increases the *urgency* of the notification but does not change the action type. The fix (raise `DB_POSTGRESDB_POOL_SIZE`, configure pgBouncer) is operator-level configuration, not an emergency engineering intervention.
