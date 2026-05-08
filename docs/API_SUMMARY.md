# Ops-Radar / AI Automation Builder — API Summary

Companion to [`OpenApi.yaml`](./OpenApi.yaml). This document is hand-written from the
actual implementation (Hono routes + Zod schemas + service modules) and assumes the
state of the repository at version `0.1.0`.

---

## 1. Overview

Ops-Radar (codename *AI Automation Builder*) is a single HTTP service that:

1. Turns natural-language requests into validated **n8n** workflow JSON via an AI
   provider (`anthropic`, `digitalocean`, `openai`, or a `mock` for tests).
2. Persists the project, chat history, and workflow JSON in **MySQL**.
3. Pushes workflows to a configured **n8n** instance, manages credentials by reference,
   and verifies live drift (DB ↔ n8n).
4. Ingests run/node lifecycle events from external workers (n8n itself or your runners),
   classifies failures, opens/resolves alerts, and auto-runs an AI failure analyzer.
5. Exposes analytics, per-project health, and a small static UI (`public/index.html`).

The runtime is **Hono on Bun or Node** (auto-detected at startup, see `src/index.ts`).
A monitoring scheduler starts alongside the HTTP server (toggleable via
`MONITORING_ENABLED`).

---

## 2. Base URL

There is no version prefix in the URL — endpoints sit directly under the host.

| Environment | Base URL                              |
| ----------- | ------------------------------------- |
| Local       | `http://localhost:${PORT}` (default `3000`) |
| Production  | `https://<your-deployment-host>`     |

The HTTP port is read from the `PORT` env var (default `3000`).

---

## 3. Authentication

Application-level auth is intentionally minimal. The expectation is that this service
runs behind a reverse proxy / private network. The only token the app currently checks
itself is for **event ingestion**:

| Where         | How                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------- |
| `POST /event` | Either `Authorization: Bearer <EVENT_INGEST_TOKEN>` **or** `X-Event-Token: <EVENT_INGEST_TOKEN>` |

In `production` (`NODE_ENV=production`), the server **refuses to start** if
`EVENT_INGEST_TOKEN` is missing. In other environments it logs a warning and accepts
unauthenticated event posts.

All other routes are unauthenticated at the application layer. Add network-level auth
(VPN, IP allow-listing, Cloudflare Access, oauth-proxy, …) as needed.

---

## 4. Endpoint Categories

### 4.1 Health & static (`Health` tag)

| Method | Path        | Notes                                              |
| ------ | ----------- | -------------------------------------------------- |
| GET    | `/health`   | Liveness + feature-flag readout.                   |
| GET    | `/`         | `public/index.html` (UI).                          |
| GET    | `/app.css`  | Static asset.                                      |
| GET    | `/app.js`   | Static asset.                                      |

### 4.2 Chat (`Chat` tag)

| Method | Path     | Notes                                               |
| ------ | -------- | --------------------------------------------------- |
| POST   | `/chat`  | Generate, validate, persist a workflow from text.   |

### 4.3 Projects (`Projects` tag)

| Method | Path                                                | Notes                                                            |
| ------ | --------------------------------------------------- | ---------------------------------------------------------------- |
| GET    | `/projects`                                         | Paginated list with workflow + health + n8n sync.                |
| GET    | `/projects/report`                                  | Cross-project audit report.                                      |
| GET    | `/projects/{projectId}`                             | Project + latest workflow + health.                              |
| DELETE | `/projects/{projectId}`                             | Delete project, best-effort clean up n8n workflows.              |
| GET    | `/projects/{projectId}/workflow`                    | Latest workflow record for the project.                          |
| GET    | `/projects/{projectId}/messages`                    | Chat history.                                                    |
| GET    | `/projects/{projectId}/events`                      | Recent activity events.                                          |
| GET    | `/projects/{projectId}/credential-bindings`         | Read bindings.                                                   |
| PUT    | `/projects/{projectId}/credential-bindings`         | Replace bindings.                                                |
| POST   | `/projects/{projectId}/deploy-check`                | Deploy preflight (no side effects on n8n).                       |
| POST   | `/projects/{projectId}/deploy`                      | Deploy + optionally activate on n8n.                             |
| POST   | `/projects/{projectId}/fix-workflow`                | AI fix for rejected workflows.                                   |
| GET    | `/projects/{projectId}/health`                      | Full health snapshot, hits n8n.                                  |
| POST   | `/projects/{projectId}/health/refresh`              | Force refresh.                                                   |
| GET    | `/projects/{projectId}/executions`                  | List recent n8n executions.                                      |
| GET    | `/projects/{projectId}/executions/{executionId}`    | Single execution + classified error + redacted detail.           |

### 4.4 Workflows (`Workflows` tag)

| Method | Path                          | Notes                                                          |
| ------ | ----------------------------- | -------------------------------------------------------------- |
| GET    | `/workflows/{workflowId}/status` | Status + run stats + recent errors + open alerts + AI suggestion. |

### 4.5 Events (`Events` tag)

| Method | Path     | Notes                                             |
| ------ | -------- | ------------------------------------------------- |
| POST   | `/event` | Webhook ingest. Bearer token or `X-Event-Token`.  |

### 4.6 Analytics (`Analytics` tag)

| Method | Path          | Notes                                |
| ------ | ------------- | ------------------------------------ |
| GET    | `/analytics`  | Cross-workflow KPIs, top 20 by risk. |

### 4.7 n8n facade (`n8n` tag)

| Method | Path                                          | Notes                                                                 |
| ------ | --------------------------------------------- | --------------------------------------------------------------------- |
| GET    | `/n8n/credentials`                            | List credentials from configured n8n instance.                        |
| POST   | `/n8n/credentials`                            | Currently always rejects (manual-only) — returns structured guidance. |
| GET    | `/n8n/credentials/schema/{credentialType}`    | Local provisioning policy for a credential type.                      |

### 4.8 Debug (`Debug` tag) — only when `NODE_ENV=development`

| Method | Path                                              | Notes                          |
| ------ | ------------------------------------------------- | ------------------------------ |
| GET    | `/debug/knowledge-base`                           | Inspect KB selection.          |
| GET    | `/debug/workflow/{projectId}`                     | DB ↔ n8n drift snapshot.       |
| GET    | `/debug/workflow/{projectId}/node-versions`       | Node-version subset of drift.  |

In `production` and `test`, these all return `404 NOT_FOUND`.

---

## 5. Quick start

### 5.1 Generate a workflow from text

```bash
curl -sS -X POST http://localhost:3000/chat \
  -H 'Content-Type: application/json' \
  -H 'x-trace-id: 11111111-1111-1111-1111-111111111111' \
  -d '{ "message": "When I receive a Telegram message, send the body to my Gmail inbox." }'
```

The response includes `project_id`, the persisted `workflow`, and a `validation` block.
If `validation.valid` is `false`, the workflow was stored with status `rejected` and
secrets were redacted. Use `POST /projects/{projectId}/fix-workflow` to ask the AI to
repair it.

### 5.2 Look at deploy preflight, then deploy

```bash
curl -sS -X POST http://localhost:3000/projects/$PROJECT_ID/deploy-check \
  -H 'Content-Type: application/json' -d '{}'

curl -sS -X POST http://localhost:3000/projects/$PROJECT_ID/deploy \
  -H 'Content-Type: application/json' \
  -d '{ "activate": true, "credential_bindings": [
        { "credential_type": "gmailOAuth2", "id": "42" }
      ] }'
```

### 5.3 Ingest a run-failed event from your runner

```bash
curl -sS -X POST http://localhost:3000/event \
  -H "Authorization: Bearer $EVENT_INGEST_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "workflow_id": "9b41a3a0-a1aa-4ffd-94aa-13d7fb0a2c10",
    "run_id": "exec-2026-05-08-12345",
    "event_type": "run_failed",
    "status": "failure",
    "severity": "high",
    "error_message": "ECONNREFUSED 127.0.0.1:5432"
  }'
```

### 5.4 Check workflow health

```bash
curl -sS http://localhost:3000/projects/$PROJECT_ID/health | jq .
```

---

## 6. Common workflows

### 6.1 Build → fix → bind → deploy → activate

1. `POST /chat` → returns a `project_id` and a workflow that may be `validated` or
   `rejected`.
2. If `rejected`: `POST /projects/{projectId}/fix-workflow` — repeat until validated.
3. `GET /n8n/credentials` to discover existing n8n credentials.
4. `PUT /projects/{projectId}/credential-bindings` to bind credentials per node.
5. `POST /projects/{projectId}/deploy-check` to confirm `can_activate: true`.
6. `POST /projects/{projectId}/deploy` with `activate: true` to deploy + activate.
7. Watch executions with `GET /projects/{projectId}/executions` and
   `GET /projects/{projectId}/health`.

### 6.2 Disable / delete a deployed workflow

- Disable: `POST /projects/{projectId}/deploy` with `{ "activate": false }`. The server
  deactivates on n8n and emits a `workflow_deactivated` event.
- Delete: `DELETE /projects/{projectId}`. Best-effort deactivation + delete on n8n
  before the local row is removed. Remote failures (other than "not found") are
  reported in `cleanup_warnings`.

### 6.3 Push run lifecycle from n8n to Ops-Radar

Configure your n8n workflow's error/success branches to `POST /event` with the schema
defined in `IncomingWorkflowEvent`:

| Event type                   | Effect                                                                 |
| ---------------------------- | ---------------------------------------------------------------------- |
| `run_started` / `node_*`     | Persisted only.                                                        |
| `run_failed`                 | Workflow + project flipped to `failed`; AI failure-analysis runs.      |
| `run_succeeded`              | If workflow was `failed`, restored to `deployed_active`.               |
| `workflow_deactivated`       | Workflow → `deployed_inactive`, project → `draft`.                     |
| `workflow_deleted`           | Workflow → `validated`, project → `draft`.                             |
| `workflow_alert_*`           | Persisted only.                                                        |
| `workflow_health_*`          | Persisted only (monitoring scheduler emits these too).                 |

---

## 7. Error handling

All errors share the envelope below (sourced from `src/server.ts` `app.onError`):

```jsonc
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid request body.",
    "details": [/* present only when statusCode < 500 */]
  }
}
```

Notable codes you will see:

| Code                                | HTTP | When                                                              |
| ----------------------------------- | ---- | ----------------------------------------------------------------- |
| `BAD_REQUEST`                       | 400  | Generic body / query validation failure.                          |
| `INVALID_MESSAGE`                   | 400  | Empty `/chat` message.                                            |
| `BAD_EVENT_PAYLOAD`                 | 400  | Zod validation on `/event` failed.                                |
| `WORKFLOW_NOT_FOUND`                | 400 / 404 | Project has no workflow / event refers to unknown workflow. |
| `WORKFLOW_NOT_DEPLOYED`             | 400  | Hitting executions before deploy.                                 |
| `WORKFLOW_NOT_DEPLOYABLE`           | 400  | Status doesn't allow deploy.                                      |
| `WORKFLOW_REJECTED`                 | 409  | Action requires a non-rejected workflow.                          |
| `WORKFLOW_NOT_REJECTED`             | 409  | Fix is only valid for rejected workflows.                         |
| `DEPLOY_IN_PROGRESS`                | 409  | Concurrent deploy on the same project.                            |
| `CREDENTIAL_MANUAL_ONLY`            | 409  | Server is in `manual_only` provisioning mode.                     |
| `CREDENTIAL_TYPE_NOT_REQUIRED`      | 409  | Type isn't required by the current workflow.                      |
| `CREDENTIAL_CREATION_MANUAL_REQUIRED` | 409 | Default fallback — go create credentials in n8n.                  |
| `CREDENTIAL_BINDINGS_REQUIRED`      | 409  | Activation denied because of missing bindings.                    |
| `N8N_MISSING_CREDENTIALS`           | 409  | n8n returned a missing-credential error during activation.        |
| `N8N_CREDENTIALS_PRECHECK_FAILED`   | 502  | Could not list n8n credentials before activation.                 |
| `N8N_BAD_RESPONSE`                  | 502  | n8n returned an unexpected response.                              |
| `N8N_WORKFLOW_NOT_FOUND`            | 404  | n8n workflow id missing remotely (typically wrapped).             |
| `N8N_CONFIG_ERROR`                  | 500  | `N8N_API_KEY` missing.                                            |
| `EXECUTION_NOT_IN_PROJECT_WORKFLOW` | 404  | Execution does not belong to the requested project.               |
| `PROJECT_NOT_FOUND`                 | 404  | Project id unknown.                                               |
| `PROJECT_DELETE_FAILED`             | 500  | Local DB delete returned 0 rows.                                  |
| `STATIC_NOT_FOUND` / `STATIC_PATH_INVALID` | 400 / 404 | Static-file errors.                                  |
| `UNAUTHORIZED_EVENT`                | 401  | Bad / missing event ingest token.                                 |
| `INTERNAL_ERROR`                    | 500  | Catch-all. `details` is omitted for safety.                       |

Validation errors come from **Zod**: `details` is `error.issues` (array of issues with
`code`, `path`, `message`, …).

The error envelope has `details` only for `4xx`. `5xx` strips them via `redactSecrets`
to avoid leaking stack traces or env values.

---

## 8. Pagination

Pagination is offset-based and lightweight — no cursors, no `next_page` tokens, no
total counts (to keep DB queries cheap).

| Query param | Default | Cap                     | Used by                                    |
| ----------- | ------- | ----------------------- | ------------------------------------------ |
| `limit`     | 20 (`/projects`), 200 (`/projects/report`), 100 (`/projects/{id}/events`, `executions`) | `100` for projects, `100` for executions, no enforced cap on report | All list endpoints. |
| `offset`    | 0       | unbounded               | All list endpoints.                        |

Responses follow either of two shapes:

```jsonc
// /projects, /n8n/credentials
{ "items": [...], "count": 12 }   // count = items returned, NOT total

// /projects/report
{ "generated_at": "...", "totals": { ... }, "items": [...] }
```

Clients that need a total must paginate until `items` is shorter than `limit`.

---

## 9. Rate limits

The application **does not implement rate limiting** itself. Rate limit at the edge
(reverse proxy, API gateway) if needed. The two natural choke-points are:

- `POST /chat` and `POST /projects/{id}/fix-workflow` — these call the AI provider and
  cost real money. Consider per-IP or per-user limits.
- `POST /event` — high volume, but cheap per-call (single insert + a few state
  transitions). Token-based abuse is bounded by the static `EVENT_INGEST_TOKEN`.

Internal serialization:

- Concurrent deploys on the same project are rejected with `DEPLOY_IN_PROGRESS` via an
  in-memory lock (`deployLock` set in `project-service.ts`).
- The monitoring cycle uses `withMonitoringCycleLock` to skip overlapping cycles.

---

## 10. Webhooks

The service does **not** emit webhooks today. The `webhooks:` block in the OpenAPI
spec describes the **inverse**: external systems (n8n, custom workers) push events
into Ops-Radar via `POST /event`. See [section 6.3](#63-push-run-lifecycle-from-n8n-to-ops-radar).

---

## 11. Environment variables related to the API

The full list lives in [`src/config/env.ts`](../src/config/env.ts). Variables that
materially affect the HTTP API:

| Variable                              | Default                       | Purpose                                                                 |
| ------------------------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| `NODE_ENV`                            | `development`                 | Gates `/debug/*` routes; required for `EVENT_INGEST_TOKEN` enforcement. |
| `PORT`                                | `3000`                        | HTTP listen port.                                                       |
| `MYSQL_HOST` / `_PORT` / `_USER` / `_PASSWORD` / `_DATABASE` | —      | MySQL connection. **Required.**                                         |
| `MYSQL_*_TIMEOUT_MS`                  | 10s / 15s / 30s               | Connect / query / transaction timeouts.                                 |
| `EVENT_INGEST_TOKEN`                  | (none)                        | Required in production; gates `POST /event`.                            |
| `N8N_BASE_URL`                        | —                             | n8n REST API base URL. **Required.** Trailing `/api/vN` is stripped when building dashboard URLs. |
| `N8N_API_KEY`                         | (none)                        | n8n API key. Required to deploy or list credentials.                    |
| `N8N_REQUEST_TIMEOUT_MS`              | `15000`                       | n8n HTTP timeout.                                                       |
| `CREDENTIAL_PROVISIONING_MODE`        | `manual_only`                 | `manual_only` makes `POST /n8n/credentials` reject with structured guidance. |
| `PROJECTS_VERIFY_N8N_ON_LIST`         | `true`                        | Default `verify_n8n` for `GET /projects`.                               |
| `MONITORING_ENABLED`                  | `true`                        | Starts the monitoring scheduler at boot.                                |
| `MONITORING_INTERVAL_SECONDS`         | `300`                         | Scheduler interval.                                                     |
| `MONITORING_EXECUTION_LIMIT`          | `20`                          | Executions per workflow per cycle.                                      |
| `MONITORING_SNAPSHOT_RETENTION_DAYS`  | `14`                          | Older `workflow_health_snapshots` rows are pruned.                      |
| `ALERT_FAILURE_THRESHOLD`             | `3`                           | Threshold for `high_failure_rate` / `workflow_failure_burst` alerts.    |
| `AI_PROVIDER`                         | `digitalocean`                | One of `mock`, `openai`, `digitalocean`, `anthropic`.                   |
| `AI_BACKUP_PROVIDER` / `AI_BACKUP_MODEL` | (none)                     | Optional fallback chain.                                                |
| `AI_API_KEY` / `ANTHROPIC_API_KEY`    | (none)                        | Provider keys.                                                          |
| `AI_BASE_URL` / `ANTHROPIC_BASE_URL`  | DO / Anthropic public APIs    | Provider base URLs.                                                     |
| `AI_REQUEST_TIMEOUT_MS`               | `45000`                       | Per-AI-request timeout (affects `/chat` latency cap).                   |
| `AI_REQUEST_RETRIES` / `_RETRY_DELAY_MS` | `0` / `750`                | Retries on AI errors.                                                   |
| `AI_WORKFLOW_TOTAL_TIMEOUT_MS`        | `60000`                       | Total budget for a single workflow generation.                          |
| `AI_WORKFLOW_KNOWLEDGE_BASE_*`        | various                       | Tunes the KB retrieval pipeline used during generation.                 |
| `LOG_*`                               | various                       | Log verbosity (`LOG_LEVEL`, `LOG_CHAT_PROGRESS`, …).                    |

Required at boot: `MYSQL_*` (host/user/password/database), `N8N_BASE_URL`. Boot will
**fail-fast** with an explicit error message if validation fails — there are no silent
fallbacks for required config (see the env-as-single-source-of-truth rule).

---

## 12. Tracing

Every `/chat` request uses an `x-trace-id` header (provided or generated). The id flows
into structured logs (`logInfo` / `logWarn` / `logError`) and is echoed back in the
response header. Other endpoints currently log without a trace id; threading it through
is straightforward — pick it up via `c.req.header('x-trace-id')` and pass it through to
service calls that already accept `{ traceId }`.

---

## 13. Implementation pointers (where things live)

| Concern                              | File                                                                |
| ------------------------------------ | ------------------------------------------------------------------- |
| Server bootstrap & static assets     | `src/server.ts`, `src/index.ts`                                     |
| Error envelope                       | `src/lib/errors.ts`, `src/server.ts` (`onError`)                    |
| Secret redaction                     | `src/lib/redact.ts`                                                 |
| MySQL pool / transactions            | `src/lib/db.ts`                                                     |
| Env loading & validation             | `src/config/env.ts`                                                 |
| Chat → workflow                      | `src/modules/chat/*`, `src/modules/ai/ai-service.ts`                |
| Project lifecycle / deploy           | `src/modules/projects/*`                                            |
| Credential bindings                  | `src/modules/projects/credential-binding-repository.ts`             |
| Workflow normalization               | `src/modules/workflows/workflow-normalizer.ts`                      |
| Workflow validation (security)       | `src/modules/validation/workflow-validator.ts`                      |
| n8n REST client                      | `src/modules/n8n/n8n-client.ts`                                     |
| n8n credential policy                | `src/modules/n8n/credential-policy.ts`                              |
| Node version / compatibility helpers | `src/modules/n8n/node-compatibility.ts`                             |
| Event ingest                         | `src/modules/events/*`                                              |
| Health / monitoring                  | `src/modules/monitoring/*`                                          |
| Analytics                            | `src/modules/analytics/*`                                           |
| Workflow status                      | `src/modules/workflows/workflow-service.ts`                         |
| Audit logs (AI failure analyses)     | `src/modules/audit/audit-repository.ts`                             |
| Knowledge base loader                | `src/modules/ai/knowledge-base-loader.ts`                           |

---

## 14. Notes & assumptions in the OpenAPI spec

Where the implementation is permissive (e.g. `record(z.unknown())`, `Record<string, unknown>`),
the spec uses `additionalProperties: true`. A few schemas (`NormalizedNodeVersionInfo`,
`IncompatibleNodeInfo`, the `classified_error` and `safe_detail` blobs on execution
details) intentionally leave the inner shape open — the helpers that produce them in
`node-compatibility.ts` and `error-classifier.ts` evolve frequently and any frozen
schema would lie.

Two endpoints worth flagging:

- `POST /n8n/credentials` is documented because it exists, but it always returns a
  `409` while `CREDENTIAL_PROVISIONING_MODE = manual_only` (the only mode supported
  today). It is useful as a structured "where do I create this credential?" probe.
- `webhooks:` in the OpenAPI doc describes the inverse direction (external callers →
  `POST /event`), not webhooks emitted by Ops-Radar.

If you find a discrepancy between code and spec, the **code** is the source of truth.
File an issue and update both files together.
