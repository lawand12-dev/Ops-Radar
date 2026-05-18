# Ops-Radar / AI Automation Builder — API Summary (v1.0.0)

Companion to [`OpenApi-v1.yaml`](./OpenApi-v1.yaml). This document is hand-written
from the actual implementation (Hono routes + Zod schemas + service modules) and
assumes the state of the repository at version **1.0.0** (branch `chatv2`).

This file supersedes [`API_SUMMARY.md`](./API_SUMMARY.md), which describes the
single-tenant v0.1.0 surface and is kept for historical reference only.

---

## 1. Overview

Ops-Radar is a multi-tenant HTTP service that:

1. Authenticates users with email/password, issues a JWT, and stores per-user
   credentials (n8n base URL + n8n API key, optional Anthropic API key)
   encrypted at rest.
2. Turns natural-language requests into validated **n8n** workflow JSON. The AI
   provider chosen at runtime is either the platform default (`anthropic` /
   `digitalocean`) or, for users with `can_use_rag_agent = true`, a shared
   **RAG agent** at `RAG_AGENT_URL`. No per-user RAG keys.
3. Persists projects, chat history, workflow JSON, alerts, snapshots, and AI
   interactions in **MySQL**, scoped to the owning user via `projects.user_id`.
4. Pushes workflows to **the user's own** n8n instance (resolved from request
   context at every call site — never falls back to env keys for an authenticated
   request).
5. Ingests run/node lifecycle events from external workers, classifies failures,
   opens/resolves alerts, and runs an AI failure analyzer in the background.
6. Runs a monitoring scheduler that re-derives workflow health, optionally with
   the **silent-failure detection layer** (3 feature flags, default OFF).
7. Exposes an **admin console** under `/admin/*`: platform overview, user CRUD,
   RAG-agent permission toggles, AI-interaction log, cross-tenant project view.
8. Serves a small vanilla-JS hash-routed SPA from `public/` (`index.html`,
   `app.css`, `app.js`).

The runtime is **Hono on Bun or Node** (auto-detected in `src/index.ts`). The
monitoring scheduler starts alongside the HTTP server (toggleable via
`MONITORING_ENABLED`). On boot, the bootstrap admin (`ADMIN_EMAIL` /
`ADMIN_PASSWORD`) is upserted: password is set on first creation only — it is
**not** reset by env on later reboots.

---

## 2. Base URL

There is no version prefix in the URL — endpoints sit directly under the host.

| Environment | Base URL                                    |
| ----------- | ------------------------------------------- |
| Local       | `http://localhost:${PORT}` (default `3000`) |
| Production  | `https://<your-deployment-host>`            |

The HTTP port is read from the `PORT` env var (default `3000`).

---

## 3. Authentication

There are now **two** independent auth mechanisms.

### 3.1 JWT Bearer (everything except `/event`, public routes, and static)

Every API call except the small public set below must carry a Bearer JWT
obtained from `POST /auth/login` or `POST /auth/register`:

```
Authorization: Bearer <jwt>
```

The token is HS256, signed with `JWT_SECRET`, and expires after
`JWT_EXPIRES_IN_SECONDS` (default `86400` = 24h). On every protected request
the server:

1. Verifies the signature and expiry.
2. Re-reads the user from MySQL by `claims.sub` (so credential rotations and
   account deletions take effect on the next call — JWT claims are never
   trusted for authorization decisions).
3. Decrypts the user's `n8n_api_key` and `anthropic_api_key` (AES-256-GCM with
   `SECRETS_ENCRYPTION_KEY`) and stashes the values in an AsyncLocalStorage
   request context. Downstream code (n8n client, AI service) reads the active
   user's credentials from that context without any signature changes.

Failure modes (all return the same body, never leaking which check failed):

| HTTP | `error.code`        | When                                                          |
| ---- | ------------------- | ------------------------------------------------------------- |
| 401  | `UNAUTHENTICATED`   | Missing / malformed / invalid / expired JWT; user deleted.    |
| 403  | `ADMIN_REQUIRED`    | JWT is valid but `users.is_admin = 0` on an `/admin/*` route. |

Public routes (no JWT required):

- `GET /health`
- `GET /`, `GET /app.css`, `GET /app.js`
- `POST /auth/register`
- `POST /auth/login`
- `GET /debug/*` (only in `NODE_ENV=development`; 404 otherwise)

### 3.2 Event ingest token (`/event` only)

`POST /event` is for n8n / external workers and never carries a user JWT.
Instead it checks a static shared secret:

| Header form 1 | `Authorization: Bearer <EVENT_INGEST_TOKEN>` |
| Header form 2 | `X-Event-Token: <EVENT_INGEST_TOKEN>`        |

In `production`, the server **refuses to start** if `EVENT_INGEST_TOKEN` is
missing. In other environments it logs a warning at boot and accepts
unauthenticated event posts. When the env var is set, mismatched / missing
tokens return `401 UNAUTHORIZED_EVENT`.

### 3.3 Bootstrap admin

`ADMIN_EMAIL` + `ADMIN_PASSWORD` are read from `.env` (both required). On every
boot:

- If no user exists with that email, one is created with `is_admin = 1` and the
  given password (scrypt-hashed).
- If one already exists, `is_admin` is set to `1` but the password is **not**
  rewritten — operators can change the password through the UI without env
  hot-reloads stomping it on the next reboot.

---

## 4. Endpoint Categories

### 4.1 Health & static (`Health` tag)

| Method | Path        | Auth | Notes                                              |
| ------ | ----------- | ---- | -------------------------------------------------- |
| GET    | `/health`   | —    | Liveness + monitoring-enabled + provisioning mode. |
| GET    | `/`         | —    | `public/index.html` (SPA shell).                   |
| GET    | `/app.css`  | —    | Static asset.                                      |
| GET    | `/app.js`   | —    | Static asset.                                      |

### 4.2 Auth (`Auth` tag)

| Method | Path                | Auth | Notes                                                                |
| ------ | ------------------- | ---- | -------------------------------------------------------------------- |
| POST   | `/auth/register`    | —    | Create an account, return JWT + user. Email must be unused.          |
| POST   | `/auth/login`       | —    | Verify password (scrypt), return JWT + user.                         |
| GET    | `/auth/me`          | JWT  | Current user profile (no credential plaintext).                      |
| PUT    | `/auth/credentials` | JWT  | Update per-user `n8n_base_url` / `n8n_api_key` / `anthropic_api_key`.|

`PUT /auth/credentials` accepts each field as **string / null / omitted**:

- omitted → leave alone.
- `null` → clear (encrypted blob set to NULL; `has_*_api_key = false`).
- string → must be non-blank after `trim()`. `""` / `"   "` is rejected with
  `400 BAD_REQUEST` (Zod refinement `trimmedNonEmpty`).

At least one of the three fields must be provided per call.

### 4.3 Admin (`Admin` tag) — `is_admin = true` required on every route

| Method | Path                                | Notes                                                                            |
| ------ | ----------------------------------- | -------------------------------------------------------------------------------- |
| GET    | `/admin/me`                         | Admin's own profile (saves a separate `/auth/me` round-trip in the UI).          |
| GET    | `/admin/analytics`                  | Platform-wide overview (user counts, projects, AI usage, failure counts).        |
| GET    | `/admin/users`                      | List users (paginated; `q` searches name/email).                                 |
| POST   | `/admin/users`                      | Create user (`email`, `name`, `password`, optional `can_use_rag_agent`, `is_admin`). |
| GET    | `/admin/users/{id}`                 | User detail incl. projects, recent AI interactions, has_*_api_key flags.         |
| PATCH  | `/admin/users/{id}`                 | Update `name` / `can_use_rag_agent` / `is_admin`. Self-demote is rejected.       |
| POST   | `/admin/users/{id}/reset-password`  | Force a new password (≥8 chars). Re-hashed with scrypt.                          |
| DELETE | `/admin/users/{id}`                 | Hard-delete a user. Self-deletion is rejected.                                   |
| GET    | `/admin/ai-interactions`            | List AI interactions across all users (filters: `user_id`, `status`, `provider`).|
| GET    | `/admin/ai-interactions/{id}`       | Full interaction (raw request + raw response).                                   |
| GET    | `/admin/projects`                   | Cross-tenant project list (paginated).                                           |

Admin authorization is **re-read from MySQL on every request** by `requireAdmin`
— a stale JWT for a since-demoted user fails at the gate without waiting for
the JWT to expire.

### 4.4 Chat (`Chat` tag)

| Method | Path     | Auth | Notes                                                       |
| ------ | -------- | ---- | ----------------------------------------------------------- |
| POST   | `/chat`  | JWT  | Generate + validate + persist a workflow from text. Owns the new project. |

The route routes to one of two AI paths:

- If `users.can_use_rag_agent = true` **and** `RAG_AGENT_URL` is set → call the
  platform RAG agent at `RAG_AGENT_URL` with `RAG_AGENT_API_KEY`.
- Otherwise → standard provider (Anthropic preferred, with optional fallback)
  using the user's stored `anthropic_api_key` if present, else the env
  `ANTHROPIC_API_KEY` (background tasks only — see [§ 11](#11-environment-variables-related-to-the-api)).

### 4.5 Projects (`Projects` tag) — all tenant-scoped to caller

| Method | Path                                              | Notes                                                            |
| ------ | ------------------------------------------------- | ---------------------------------------------------------------- |
| GET    | `/projects`                                       | Paginated list (caller's projects only).                         |
| GET    | `/projects/report`                                | Audit report across caller's projects.                           |
| GET    | `/projects/{projectId}`                           | Project + latest workflow + health.                              |
| DELETE | `/projects/{projectId}`                           | Delete, best-effort clean up on the user's n8n.                  |
| GET    | `/projects/{projectId}/workflow`                  | Latest workflow record.                                          |
| GET    | `/projects/{projectId}/messages`                  | Chat history.                                                    |
| GET    | `/projects/{projectId}/events`                    | Recent activity events.                                          |
| GET    | `/projects/{projectId}/credential-bindings`       | Read bindings.                                                   |
| PUT    | `/projects/{projectId}/credential-bindings`       | Replace bindings.                                                |
| POST   | `/projects/{projectId}/deploy-check`              | Deploy preflight (no n8n side effects).                          |
| POST   | `/projects/{projectId}/deploy`                    | Deploy + optionally activate on the user's n8n.                  |
| POST   | `/projects/{projectId}/fix-workflow`              | AI fix for rejected workflows.                                   |
| GET    | `/projects/{projectId}/health`                    | Full health snapshot (unified status — see [§ 6.4](#64-silent-failure-detection-flow)). |
| POST   | `/projects/{projectId}/health/refresh`            | Force refresh.                                                   |
| GET    | `/projects/{projectId}/executions`                | List recent executions on the user's n8n.                        |
| GET    | `/projects/{projectId}/executions/{executionId}`  | Single execution + classified error + redacted detail.           |

A `projectId` you don't own returns `404 PROJECT_NOT_FOUND` (**not** 403) — the
404 is deliberate so attackers can't probe for other tenants' project ids.

### 4.6 Workflows (`Workflows` tag)

| Method | Path                              | Auth | Notes                                                          |
| ------ | --------------------------------- | ---- | -------------------------------------------------------------- |
| GET    | `/workflows/{workflowId}/status`  | JWT  | Status + run stats + recent errors + open alerts + AI suggestion. Ownership is enforced inside `getWorkflowStatus` (workflow → project → user). Cross-tenant id returns `404 WORKFLOW_NOT_FOUND`. |

### 4.7 Events (`Events` tag)

| Method | Path     | Auth                            | Notes                              |
| ------ | -------- | ------------------------------- | ---------------------------------- |
| POST   | `/event` | `EVENT_INGEST_TOKEN` (not JWT)  | Webhook ingest. Returns `202 Accepted`. |

### 4.8 Analytics (`Analytics` tag)

| Method | Path          | Auth | Notes                                                         |
| ------ | ------------- | ---- | ------------------------------------------------------------- |
| GET    | `/analytics`  | JWT  | Cross-workflow KPIs, top-N by risk. Tenant-scoped to caller. |

### 4.9 n8n facade (`n8n` tag)

| Method | Path                                          | Auth | Notes                                                                 |
| ------ | --------------------------------------------- | ---- | --------------------------------------------------------------------- |
| GET    | `/n8n/credentials`                            | JWT  | List credentials from the **caller's** n8n instance.                  |
| POST   | `/n8n/credentials`                            | JWT  | Currently always rejects with structured guidance (manual-only mode). |
| GET    | `/n8n/credentials/schema/{credentialType}`    | JWT  | Local provisioning policy for a credential type.                      |

### 4.10 Debug (`Debug` tag) — only when `NODE_ENV=development`

| Method | Path                                              | Auth | Notes                          |
| ------ | ------------------------------------------------- | ---- | ------------------------------ |
| GET    | `/debug/knowledge-base`                           | —    | Inspect KB selection.          |
| GET    | `/debug/workflow/{projectId}`                     | —    | DB ↔ n8n drift snapshot.       |
| GET    | `/debug/workflow/{projectId}/node-versions`       | —    | Node-version subset of drift.  |

In `production` and `test`, these all return `404 NOT_FOUND`. They are
deliberately **not** auth-gated so a local developer can hit them without a
token — do not expose `NODE_ENV=development` to the public internet.

---

## 5. Quick start

### 5.1 Register and log in

```bash
# Register (or call /auth/login if you already have an account)
TOKEN=$(curl -sS -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{ "email": "alice@example.com", "name": "Alice", "password": "correcthorse-batterystaple" }' \
  | jq -r .token)

# All subsequent calls send the bearer token
AUTH="-H Authorization: Bearer $TOKEN"
```

### 5.2 Configure your n8n credentials

```bash
curl -sS -X PUT http://localhost:3000/auth/credentials \
  $AUTH -H 'Content-Type: application/json' \
  -d '{ "n8n_base_url": "https://n8n.alice.example.com/api/v1", "n8n_api_key": "n8n_pat_..." }'
```

### 5.3 Generate a workflow from text

```bash
curl -sS -X POST http://localhost:3000/chat \
  $AUTH -H 'Content-Type: application/json' \
  -H 'x-trace-id: 11111111-1111-1111-1111-111111111111' \
  -d '{ "message": "When I receive a Telegram message, send the body to my Gmail inbox." }'
```

The response includes `project_id`, the persisted `workflow`, and a
`validation` block. If `validation.valid` is `false`, the workflow was stored
with status `rejected` and secrets were redacted — use
`POST /projects/{projectId}/fix-workflow` to ask the AI to repair it.

### 5.4 Look at deploy preflight, then deploy

```bash
curl -sS -X POST http://localhost:3000/projects/$PROJECT_ID/deploy-check \
  $AUTH -H 'Content-Type: application/json' -d '{}'

curl -sS -X POST http://localhost:3000/projects/$PROJECT_ID/deploy \
  $AUTH -H 'Content-Type: application/json' \
  -d '{ "activate": true, "credential_bindings": [
        { "credential_type": "gmailOAuth2", "id": "42" }
      ] }'
```

### 5.5 Ingest a run-failed event from your runner

```bash
curl -sS -X POST http://localhost:3000/event \
  -H "Authorization: Bearer $EVENT_INGEST_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "workflow_id": "9b41a3a0-a1aa-4ffd-94aa-13d7fb0a2c10",
    "run_id": "exec-2026-05-08-12345",
    "event_type": "workflow_execution_failed",
    "status": "failure",
    "severity": "high",
    "error_message": "ECONNREFUSED 127.0.0.1:5432"
  }'
```

(Both `run_failed` and `workflow_execution_failed` are accepted — older external
callers may still emit the legacy form.)

### 5.6 Check workflow health

```bash
curl -sS $AUTH http://localhost:3000/projects/$PROJECT_ID/health | jq .
```

---

## 6. Common workflows

### 6.1 Build → fix → bind → deploy → activate

1. `POST /chat` → returns a `project_id` and a workflow that may be `validated`
   or `rejected`.
2. If `rejected`: `POST /projects/{projectId}/fix-workflow` — repeat until
   validated.
3. `GET /n8n/credentials` to discover existing credentials in the caller's n8n
   instance.
4. `PUT /projects/{projectId}/credential-bindings` to bind credentials per node.
5. `POST /projects/{projectId}/deploy-check` to confirm `can_activate: true`.
6. `POST /projects/{projectId}/deploy` with `activate: true`.
7. Watch executions with `GET /projects/{projectId}/executions` and
   `GET /projects/{projectId}/health`.

### 6.2 Disable / delete a deployed workflow

- Disable: `POST /projects/{projectId}/deploy` with `{ "activate": false }` —
  deactivates on n8n and emits a `workflow_deactivated` event.
- Delete: `DELETE /projects/{projectId}` — best-effort deactivate + delete on
  n8n before the local row is removed. Remote failures (other than "not found")
  are reported in `cleanup_warnings`.

### 6.3 Push run lifecycle from n8n to Ops-Radar

Configure your n8n workflow's error/success branches to `POST /event` with the
schema defined in `IncomingWorkflowEvent`:

| Event type                                                | Effect                                                                 |
| --------------------------------------------------------- | ---------------------------------------------------------------------- |
| `run_started` / `node_*`                                  | Persisted only.                                                        |
| `run_failed` / `workflow_execution_failed`                | Workflow + project flipped to `failed`; AI failure-analysis runs.      |
| `run_succeeded` / `workflow_execution_success`            | If workflow was `failed`, restored to `deployed_active`.               |
| `workflow_deactivated`                                    | Workflow → `deployed_inactive`, project → `draft`.                     |
| `workflow_deleted`                                        | Workflow → `validated`, project → `draft`.                             |
| `workflow_alert_*`                                        | Persisted only.                                                        |
| `workflow_health_*`                                       | Persisted only (monitoring scheduler emits these too).                 |

### 6.4 Silent-failure detection flow

When `SILENT_FAILURE_PIPELINE_ENABLED=true` (and optionally
`SCHEDULE_DRIFT_ENABLED=true` and/or `TELEMETRY_DEEP_INSPECTION_ENABLED=true`),
the monitoring scheduler performs an extra pass per cycle:

1. **Eligibility.** A `shouldDeepInspect` 4-condition gate decides whether
   `getN8nExecutionById({ includeData: true })` is allowed for a given
   execution (failure / anomaly hint / drift signal / explicit allowlist).
   The gate is strict and has no exceptions other than
   `TELEMETRY_DEEP_INSPECTION_ALLOWLIST`.
2. **Backpressure.** Per cycle, deep fetches stop once either limit is hit:
   - `TELEMETRY_INCLUDE_DATA_BUDGET_PER_CYCLE` (count, default `200`)
   - `TELEMETRY_CYCLE_TIME_BUDGET_RATIO × MONITORING_INTERVAL_SECONDS`
     (wall-clock, default `0.7`)
   When either is exceeded, one `degraded_mode` line is logged (one-shot per
   cycle) and a `cycle_summary` is always emitted via `try/finally` — even on
   cycle failure.
3. **Anomaly detectors.** `continue-on-fail`, `zero-output`,
   `scheduler-drift`, and `duration-z` write into `workflow_anomalies`.
4. **Unified status.** `GET /projects/{id}/health` returns a `health_status`
   that escalates legacy status using recent anomalies:
   - `healthy` + drift signal → `warning`
   - `healthy` / `warning` + recent silent-failure anomaly → `failing`
   The unified value is computed **before** snapshot / alert / event writes, so
   the DB snapshot and the API response can never disagree.

All three flags default to `false` — the legacy monitoring path is unaffected
when they are off, and existing API consumers see identical shapes.

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

Codes you will see (v1.0.0 superset — auth/admin codes are new):

| Code                                  | HTTP | When                                                                  |
| ------------------------------------- | ---- | --------------------------------------------------------------------- |
| `BAD_REQUEST`                         | 400  | Generic body / query validation failure.                              |
| `INVALID_MESSAGE`                     | 400  | Empty `/chat` message.                                                |
| `BAD_EVENT_PAYLOAD`                   | 400  | Zod validation on `/event` failed.                                    |
| `UNAUTHENTICATED`                     | 401  | Missing / invalid / expired JWT (uniform message, never enumerates).  |
| `UNAUTHORIZED_EVENT`                  | 401  | Bad / missing event ingest token on `POST /event`.                    |
| `INVALID_CREDENTIALS`                 | 401  | Wrong password on `POST /auth/login`.                                 |
| `ADMIN_REQUIRED`                      | 403  | Token valid, but caller is not `is_admin`.                            |
| `AUTH_NOT_APPLIED`                    | 500  | Internal: `getAuth(c)` called on a route missing `requireAuth`.       |
| `EMAIL_ALREADY_REGISTERED`            | 409  | `POST /auth/register` with a taken email.                             |
| `USER_NOT_FOUND`                      | 404  | Admin lookup of a missing user id.                                    |
| `CANNOT_DEMOTE_SELF` / `CANNOT_DELETE_SELF` | 409 | Admin tries to self-demote / self-delete.                       |
| `WORKFLOW_NOT_FOUND`                  | 400 / 404 | Project has no workflow / event refers to unknown workflow.   |
| `WORKFLOW_NOT_DEPLOYED`               | 400  | Hitting executions before deploy.                                     |
| `WORKFLOW_NOT_DEPLOYABLE`             | 400  | Status doesn't allow deploy.                                          |
| `WORKFLOW_REJECTED`                   | 409  | Action requires a non-rejected workflow.                              |
| `WORKFLOW_NOT_REJECTED`               | 409  | Fix is only valid for rejected workflows.                             |
| `DEPLOY_IN_PROGRESS`                  | 409  | Concurrent deploy on the same project.                                |
| `CREDENTIAL_MANUAL_ONLY`              | 409  | Server is in `manual_only` provisioning mode.                         |
| `CREDENTIAL_TYPE_NOT_REQUIRED`        | 409  | Type isn't required by the current workflow.                          |
| `CREDENTIAL_CREATION_MANUAL_REQUIRED` | 409  | Default fallback — go create credentials in n8n.                      |
| `CREDENTIAL_BINDINGS_REQUIRED`        | 409  | Activation denied because of missing bindings.                        |
| `N8N_MISSING_CREDENTIALS`             | 409  | n8n returned a missing-credential error during activation.            |
| `N8N_CREDENTIALS_PRECHECK_FAILED`     | 502  | Could not list n8n credentials before activation.                     |
| `N8N_BAD_RESPONSE`                    | 502  | n8n returned an unexpected response.                                  |
| `N8N_WORKFLOW_NOT_FOUND`              | 404  | n8n workflow id missing remotely (typically wrapped).                 |
| `N8N_CONFIG_ERROR`                    | 500  | The caller has no usable n8n base URL / API key (per-user nor env).   |
| `EXECUTION_NOT_IN_PROJECT_WORKFLOW`   | 404  | Execution does not belong to the requested project.                   |
| `PROJECT_NOT_FOUND`                   | 404  | Project id unknown **or owned by another tenant** (intentional).      |
| `PROJECT_DELETE_FAILED`               | 500  | Local DB delete returned 0 rows.                                      |
| `STATIC_NOT_FOUND` / `STATIC_PATH_INVALID` | 400 / 404 | Static-file errors.                                          |
| `NOT_FOUND`                           | 404  | Catch-all unknown route. `/debug/*` returns this outside `development`.|
| `INTERNAL_ERROR`                      | 500  | Catch-all. `details` is omitted for safety.                           |

Validation errors come from **Zod**: `details` is `error.issues` (array of
issues with `code`, `path`, `message`, …).

The error envelope has `details` only for `4xx`. `5xx` strips them via
`redactSecrets` to avoid leaking stack traces or env values.

---

## 8. Pagination

Pagination remains offset-based and lightweight — no cursors, no `next_page`
tokens, no total counts.

| Query param | Default | Cap | Used by                                                              |
| ----------- | ------- | --- | -------------------------------------------------------------------- |
| `limit`     | 20 (`/projects`), 100 (`/admin/users`), 200 (`/projects/report`, `/admin/projects`, `/admin/ai-interactions`), 100 (`/projects/{id}/events`, executions) | `100` for projects + executions, `500` for `/admin/ai-interactions`, no enforced cap on report / admin projects | All list endpoints. |
| `offset`    | 0       | unbounded | All list endpoints.                                            |

Responses follow either of two shapes:

```jsonc
// /projects, /n8n/credentials, /admin/users, /admin/ai-interactions, /admin/projects
{ "items": [...], "count": 12 }   // count = items returned, NOT total

// /projects/report
{ "generated_at": "...", "totals": { ... }, "items": [...] }
```

Clients that need a total must paginate until `items.length < limit`.

---

## 9. Rate limits

The application **does not implement rate limiting** itself. Rate limit at the
edge (reverse proxy, API gateway) if needed. Natural choke-points:

- `POST /chat` and `POST /projects/{id}/fix-workflow` — these call the AI
  provider and cost real money. Consider per-user limits, especially for users
  with `can_use_rag_agent = true` (shared platform resource).
- `POST /auth/login` — scrypt-hashed verification is intentionally slow. Add
  per-IP throttling at the edge.
- `POST /event` — high volume, cheap per-call. Token-based abuse is bounded by
  the static `EVENT_INGEST_TOKEN`.

Internal serialization:

- Concurrent deploys on the same project are rejected with `DEPLOY_IN_PROGRESS`
  via an in-memory lock (`deployLock` set in `project-service.ts`).
- The monitoring cycle uses `withMonitoringCycleLock` to skip overlapping cycles.

---

## 10. Webhooks

The service does **not** emit webhooks today. The `webhooks:` block in the
OpenAPI spec describes the **inverse**: external systems (n8n, custom workers)
push events into Ops-Radar via `POST /event`. See
[section 6.3](#63-push-run-lifecycle-from-n8n-to-ops-radar).

---

## 11. Environment variables related to the API

The full list lives in [`src/config/env.ts`](../src/config/env.ts). Variables
that materially affect the HTTP API:

### 11.1 Runtime / DB

| Variable                                                | Default                       | Purpose                                                                 |
| ------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| `NODE_ENV`                                              | `development`                 | Gates `/debug/*`; required for `EVENT_INGEST_TOKEN` enforcement.        |
| `PORT`                                                  | `3000`                        | HTTP listen port.                                                       |
| `MYSQL_HOST` / `_PORT` / `_USER` / `_PASSWORD` / `_DATABASE` | — / `3306`              | MySQL connection. **Required** (no host/user/database default).         |
| `MYSQL_*_TIMEOUT_MS`                                    | 10s / 15s / 30s               | Connect / query / transaction timeouts.                                 |

### 11.2 Auth (all required at boot)

| Variable                | Default | Purpose                                                                            |
| ----------------------- | ------- | ---------------------------------------------------------------------------------- |
| `JWT_SECRET`            | —       | HS256 signing key. **≥32 chars required.** Boot fails otherwise.                   |
| `JWT_EXPIRES_IN_SECONDS`| `86400` | Token lifetime.                                                                    |
| `SECRETS_ENCRYPTION_KEY`| —       | Derived to a 32-byte AES-256-GCM key for per-user credentials. **≥32 chars required.** Rotating invalidates every previously stored credential. |
| `ADMIN_EMAIL`           | —       | Bootstrap admin email (used on first boot to seed `is_admin`).                     |
| `ADMIN_PASSWORD`        | —       | Bootstrap admin password (**only applied on first creation**; not reset on reboot).|

### 11.3 n8n + event ingest

| Variable                              | Default       | Purpose                                                                 |
| ------------------------------------- | ------------- | ----------------------------------------------------------------------- |
| `N8N_BASE_URL`                        | —             | Fallback n8n REST base URL for background tasks (monitoring scheduler, failure analysis). User-facing requests use the per-user URL when set. **Required.** |
| `N8N_API_KEY`                         | (none)        | Fallback n8n API key for background tasks. Per-user key supersedes for authenticated requests. |
| `N8N_REQUEST_TIMEOUT_MS`              | `15000`       | n8n HTTP timeout.                                                       |
| `CREDENTIAL_PROVISIONING_MODE`        | `manual_only` | `manual_only` makes `POST /n8n/credentials` reject with structured guidance. |
| `PROJECTS_VERIFY_N8N_ON_LIST`         | `true`        | Default `verify_n8n` for `GET /projects`.                               |
| `EVENT_INGEST_TOKEN`                  | (none)        | Required in production; gates `POST /event`.                            |

### 11.4 Monitoring + silent-failure detection

| Variable                                  | Default | Purpose                                                                 |
| ----------------------------------------- | ------- | ----------------------------------------------------------------------- |
| `MONITORING_ENABLED`                      | `true`  | Starts the monitoring scheduler at boot.                                |
| `MONITORING_INTERVAL_SECONDS`             | `300`   | Scheduler interval (also drives cycle wall-clock budget).               |
| `MONITORING_EXECUTION_LIMIT`              | `20`    | Executions per workflow per cycle.                                      |
| `MONITORING_SNAPSHOT_RETENTION_DAYS`      | `14`    | Older `workflow_health_snapshots` rows are pruned.                      |
| `ALERT_FAILURE_THRESHOLD`                 | `3`     | Threshold for `high_failure_rate` / `workflow_failure_burst` alerts.    |
| `ALERT_FAILURE_WINDOW_SECONDS`            | `3600`  | Time window (seconds) for the failure-threshold check.                  |
| `SILENT_FAILURE_PIPELINE_ENABLED`         | `false` | Master flag for silent-failure detectors. Off → unified status = legacy status. |
| `SCHEDULE_DRIFT_ENABLED`                  | `false` | Enables `scheduler-drift` detector.                                     |
| `TELEMETRY_DEEP_INSPECTION_ENABLED`       | `false` | Master gate for any `includeData: true` n8n fetch in the silent-failure pipeline. |
| `TELEMETRY_INCLUDE_DATA_BUDGET_PER_CYCLE` | `200`   | Max deep fetches per cycle before degraded_mode.                        |
| `TELEMETRY_CYCLE_TIME_BUDGET_RATIO`       | `0.7`   | Fraction of `MONITORING_INTERVAL_SECONDS` reserved for deep work.       |
| `TELEMETRY_DEEP_INSPECTION_ALLOWLIST`     | `""`    | Comma-separated workflow ids that always deep-inspect (bypasses the 4-condition rule). |

### 11.5 AI providers + RAG agent

| Variable                                   | Default                       | Purpose                                                                            |
| ------------------------------------------ | ----------------------------- | ---------------------------------------------------------------------------------- |
| `AI_PROVIDER`                              | `digitalocean`                | One of `mock`, `openai`, `digitalocean`, `anthropic`.                              |
| `AI_BACKUP_PROVIDER` / `AI_BACKUP_MODEL`   | (none)                        | Optional fallback chain.                                                           |
| `AI_API_KEY` / `ANTHROPIC_API_KEY`         | (none)                        | Provider keys (used for background tasks; per-user `anthropic_api_key` wins for user requests). |
| `AI_BASE_URL` / `ANTHROPIC_BASE_URL`       | DO / Anthropic public APIs    | Provider base URLs.                                                                |
| `ANTHROPIC_MODEL` / `AI_MODEL_*` / `AI_WORKFLOW_*` | various                | Model selection per task (workflow generation, fast path, complex path, analysis). |
| `AI_REQUEST_TIMEOUT_MS`                    | `45000`                       | Per-AI-request timeout (affects `/chat` latency cap).                              |
| `AI_REQUEST_RETRIES` / `_RETRY_DELAY_MS`   | `0` / `750`                   | Retries on AI errors.                                                              |
| `AI_WORKFLOW_TOTAL_TIMEOUT_MS`             | `60000`                       | Total budget for a single workflow generation.                                     |
| `AI_WORKFLOW_KNOWLEDGE_BASE_*`             | various                       | Tunes the KB retrieval pipeline used during generation.                            |
| `RAG_AGENT_URL`                            | (none)                        | Platform RAG agent endpoint. Optional — feature is off cluster-wide when blank.    |
| `RAG_AGENT_API_KEY`                        | (none)                        | RAG agent bearer key. Only used when a user has `can_use_rag_agent = true`.        |
| `LOG_*`                                    | various                       | Log verbosity (`LOG_LEVEL`, `LOG_CHAT_PROGRESS`, …).                               |

**Required at boot:** `MYSQL_HOST` / `_USER` / `_PASSWORD` / `_DATABASE`,
`N8N_BASE_URL`, `JWT_SECRET` (≥32 chars), `SECRETS_ENCRYPTION_KEY` (≥32 chars),
`ADMIN_EMAIL`, `ADMIN_PASSWORD` (≥8 chars). Boot **fail-fast** with an explicit
error message if any is missing or invalid — there are no silent fallbacks for
required config (see the env-as-single-source-of-truth rule).

**Note on `ALLOWED_ORIGINS`:** the variable appears in `.env.example` but no
CORS middleware is currently wired into `src/server.ts`. It is reserved for a
future CORS layer — setting it today has no effect.

---

## 12. Tracing

Every `/chat` request uses an `x-trace-id` header (provided or generated). The
id flows into structured logs (`logInfo` / `logWarn` / `logError`) and is
echoed back in the response header. Auth + admin routes also log a structured
context line with the resolved `userId` and `email` so admin actions can be
attributed end-to-end. Other endpoints currently log without a trace id;
threading it through is straightforward — pick it up via
`c.req.header('x-trace-id')` and pass it through to service calls that already
accept `{ traceId }`.

---

## 13. Implementation pointers (where things live)

| Concern                              | File                                                                |
| ------------------------------------ | ------------------------------------------------------------------- |
| Server bootstrap & static assets     | `src/server.ts`, `src/index.ts`                                     |
| Error envelope                       | `src/lib/errors.ts`, `src/server.ts` (`onError`)                    |
| Secret redaction                     | `src/lib/redact.ts`                                                 |
| MySQL pool / transactions / migrations | `src/lib/db.ts`, `src/lib/migrations/*`                           |
| Env loading & validation             | `src/config/env.ts`                                                 |
| JWT + scrypt + AES-256-GCM           | `src/lib/crypto.ts`                                                 |
| Per-request user context (ALS)       | `src/lib/request-context.ts`                                        |
| Auth routes / service / middleware   | `src/modules/auth/*`                                                |
| User repository (encrypted at rest)  | `src/modules/auth/user-repository.ts`                               |
| Admin console (routes + service)     | `src/modules/admin/*`                                               |
| Chat → workflow                      | `src/modules/chat/*`, `src/modules/ai/ai-service.ts`                |
| RAG agent client                     | `src/modules/ai/rag-agent-client.ts`                                |
| Project lifecycle / deploy           | `src/modules/projects/*`                                            |
| Credential bindings                  | `src/modules/projects/credential-binding-repository.ts`             |
| Workflow normalization               | `src/modules/workflows/workflow-normalizer.ts`                      |
| Workflow validation (security)       | `src/modules/validation/workflow-validator.ts`                      |
| n8n REST client (per-user)           | `src/modules/n8n/n8n-client.ts`                                     |
| n8n credential policy                | `src/modules/n8n/credential-policy.ts`                              |
| Event ingest                         | `src/modules/events/*`                                              |
| Health / monitoring                  | `src/modules/monitoring/*`                                          |
| Silent-failure feature flags         | `src/modules/monitoring/feature-flags.ts`                           |
| Cycle budget / backpressure          | `src/modules/monitoring/cycle-budget.ts`                            |
| `shouldDeepInspect` strict gate      | `src/modules/monitoring/should-deep-inspect.ts`                     |
| Silent-failure coordinator           | `src/modules/monitoring/silent-failure-coordinator.ts`              |
| Unified health view builder          | `src/modules/monitoring/health-view-builder.ts`                     |
| Analytics                            | `src/modules/analytics/*`                                           |
| Workflow status (ownership-checked)  | `src/modules/workflows/workflow-service.ts`                         |
| Audit logs (AI interactions)         | `src/modules/audit/*`                                               |
| Knowledge base loader                | `src/modules/ai/knowledge-base-loader.ts`                           |

---

## 14. Notes & assumptions in the OpenAPI spec

Where the implementation is permissive (e.g. `record(z.unknown())`,
`Record<string, unknown>`), the spec uses `additionalProperties: true`. A few
schemas (`NormalizedNodeVersionInfo`, `IncompatibleNodeInfo`, the
`classified_error` and `safe_detail` blobs on execution details) intentionally
leave the inner shape open — the helpers that produce them in
`node-compatibility.ts` and `error-classifier.ts` evolve frequently and any
frozen schema would lie.

Endpoints worth flagging:

- `POST /n8n/credentials` is documented because it exists, but it always
  returns a `409` while `CREDENTIAL_PROVISIONING_MODE = manual_only` (the only
  mode supported today). It is useful as a structured "where do I create this
  credential?" probe.
- `webhooks:` in the OpenAPI doc describes the inverse direction (external
  callers → `POST /event`), not webhooks emitted by Ops-Radar.
- `health_status` in `WorkflowHealthSnapshot` is the **unified** status
  (legacy + silent-failure anomalies). When all three silent-failure flags are
  off, it equals the legacy status. Existing consumers see no shape change.
- `ProjectRecord.user_id` is **nullable** for projects created before
  migration `012_projects_user_id`. New projects always carry the owner.
- `WorkflowAlertRecord.occurrence_count` is added in v1.0.0; duplicate
  fingerprints increment the counter rather than insert new rows.

### 14.1 Cross-tenant safety

Operations that name a `projectId` or `workflowId` you don't own return
`404 PROJECT_NOT_FOUND` / `404 WORKFLOW_NOT_FOUND` — **not** `403`. This is
deliberate: a 403 would confirm the id exists and belongs to someone else,
which is a probe oracle. The 404 makes "doesn't exist" and "isn't yours"
indistinguishable to an attacker.

### 14.2 Per-user vs env credentials

Authenticated user requests **never** silently fall back to the env-level
`N8N_API_KEY` / `ANTHROPIC_API_KEY` if the user's per-account credentials are
missing — they get `N8N_CONFIG_ERROR` (n8n) or a clear AI-provider error
(Anthropic). The env keys are reserved for background tasks that run outside
any user request:

- The monitoring scheduler (no user attached to the cycle).
- AI failure-analysis triggered by `POST /event` ingest.
- Bootstrap admin actions during boot.

If you find a discrepancy between code and spec, the **code** is the source of
truth. File an issue and update both files together.
