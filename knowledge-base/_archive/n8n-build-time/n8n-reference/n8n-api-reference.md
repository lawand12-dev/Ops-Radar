# n8n REST API Reference (Monitoring Surface)

**Type:** Mechanistic model
**Audience:** n8n monitoring agent
**n8n target:** Public REST API v1 (since 1.0)
**Source:** `https://docs.n8n.io/api/api-reference/`, OpenAPI at `/api/v1/docs`
**Updated:** 2026-05-07

## Purpose

The REST API is the **first-choice integration surface** for the monitoring agent — it works for both n8n Cloud and self-hosted, requires no DB credentials, and is the only path that respects n8n's internal locking. Use the database (`models/n8n-execution-schema`) only when the API doesn't expose what's needed.

## Authentication

All endpoints under `/api/v1/...` require:

```
X-N8N-API-KEY: <key>
```

Key creation:
- **Cloud / self-hosted UI:** Settings → n8n API → Create API Key. Per-user. Inherits user permissions.
- **Self-hosted env:** No env-based key; must be created via UI or via SQLite/Postgres bootstrap script.

Notes:
- Keys are bearer tokens — store like passwords; rotate quarterly.
- There is **no scoping** of keys per workflow or per credential. A leaked key has full instance access.
- The API does **not** expose `credentials.data` (the encrypted blob) in plaintext. Calls return only `id`, `name`, `type`.

## Endpoints the agent uses

### `GET /api/v1/executions`

List executions, filterable. The most-called endpoint.

| Query param | Type | Notes |
|---|---|---|
| `status` | enum | `success`, `error`, `waiting`, `running`, `crashed`, `canceled`. Plural per call. |
| `workflowId` | string | Single workflow filter. |
| `includeData` | boolean | `false` by default — do **not** set `true` for list calls; `runData` is huge. |
| `limit` | int | Default 100, max 250. |
| `cursor` | string | Returned by previous response under `nextCursor`. |

```bash
curl -s -H "X-N8N-API-KEY: $KEY" \
  "https://n8n.example.com/api/v1/executions?status=error&limit=50"
```

### `GET /api/v1/executions/:id`

Single execution **with `data`** (set `includeData=true`). Use this when diagnosing one failure — never in a sweep.

The response shape mirrors `execution_data.data`. Read `resultData.error` for the failure reason and `resultData.lastNodeExecuted` for where it stopped.

### `DELETE /api/v1/executions/:id`

Hard-delete an execution. Avoid; prefer letting the pruner do it. Useful only when the agent must purge a customer-flagged sensitive payload.

### `POST /api/v1/executions/:id/stop`

Cancel a `running` or `waiting` execution. **The only safe write the agent should make against running state.**

### `GET /api/v1/workflows`

List workflows. Supports `active`, `tags`, `name` filters.

### `GET /api/v1/workflows/:id`

Returns the workflow definition (nodes, connections, settings). Use to read `settings.errorWorkflow` and `settings.executionTimeout`.

### `POST /api/v1/workflows/:id/activate` / `/deactivate`

Toggle the `active` flag. Use only as part of an explicit incident-response playbook with operator approval.

### `GET /api/v1/credentials`

Lists credential metadata only. Useful for proactively detecting `updatedAt` drift on OAuth credentials before tokens expire.

### `GET /api/v1/audit`

Generates a security audit report. Costly — run weekly, not per check.

## Health endpoints (NOT under `/api/v1`)

These require **no auth** and are safe to poll on short intervals.

| Endpoint | Purpose | Healthy response |
|---|---|---|
| `/healthz` | Liveness — process is up | `200 {"status":"ok"}` |
| `/healthz/readiness` | Readiness — DB + migrations OK | `200 {"status":"ok"}` |
| `/metrics` | Prometheus metrics (env `N8N_METRICS=true`) | `200` text/plain |
| `/webhook-test/...` and `/webhook/...` | Webhook receivers | Workflow-defined |

### Useful Prometheus metrics

Enable with `N8N_METRICS=true`. Key series:

- `n8n_active_workflow_count`
- `n8n_workflow_executions_total{status="success|error|crashed"}`
- `n8n_node_runtime_seconds_bucket{node_type="..."}`
- `n8n_queue_jobs_waiting` *(queue mode)*
- `n8n_queue_jobs_active`
- `process_resident_memory_bytes`
- `nodejs_eventloop_lag_seconds`

The agent should track first-derivative (rate) for `executions_total`, and absolute value for queue depth. A flat `executions_total` for an active instance is a top-priority signal.

## Rate limits

The REST API has **no built-in rate limit** in self-hosted (1.x). On n8n Cloud the limits are not publicly documented; treat as ~10 req/s sustained, 60 req/s burst. Add jitter and cache.

Whatever the deployment, the agent should self-throttle: list-executions is cheap (~10 ms server-side), but `?includeData=true` deserializes the full jsonb and can hit 1–2 s per call.

## Pagination

All list endpoints use cursor pagination:

```jsonc
{ "data": [ ... ], "nextCursor": "MTAw" }
```

`nextCursor` is opaque. Loop until `null`. Do not parse the cursor — its encoding has changed across versions.

## What the API does NOT expose

The agent must not assume any of the following are reachable via the REST API:

- Decrypted credential `data`
- Per-node runtime in execution list (only in single-execution `includeData=true`)
- Worker process list (use Prometheus or the OS / Kubernetes layer)
- Redis queue internals (use Redis directly with read-only credentials)
- Logs (use the host's stdout / file logger; n8n does not expose logs over HTTP)

## Cross-references

`models/n8n-execution-schema` · `models/n8n-workflow-lifecycle` · `tools/` (for the agent's tool wrappers around these endpoints)
