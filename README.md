# AI Automation Platform Backend

Backend-only API (Bun + TypeScript + MySQL) for:

1. Chat-to-automation generation
2. n8n deployment
3. Event ingestion
4. Monitoring + alerts
5. AI-based failure analysis

A full operational dashboard UI is included and served from `GET /`.

## Model Choice

Default recommendation:

- `anthropic-claude-4.5-sonnet` for production workflow generation and failure analysis.
- `anthropic-claude-haiku-4.5` for low-cost drafts.
- `anthropic-claude-opus-4.5` for highly complex flows.

This repo is preconfigured for DigitalOcean inference compatibility (`/v1/chat/completions`) and supports model switching via env vars.

## Folder Structure

```txt
src/
  config/
    env.ts
  lib/
    db.ts
    errors.ts
  modules/
    ai/
      ai-service.ts
    alerts/
      alert-repository.ts
    analytics/
      analytics-routes.ts
      analytics-service.ts
    audit/
      audit-repository.ts
    chat/
      chat-repository.ts
      chat-routes.ts
      chat-service.ts
    events/
      event-repository.ts
      event-routes.ts
      event-service.ts
    n8n/
      n8n-client.ts
    projects/
      project-repository.ts
      project-routes.ts
      project-service.ts
    validation/
      workflow-validator.ts
    workflows/
      workflow-repository.ts
      workflow-routes.ts
      workflow-service.ts
  scripts/
    migrate.ts
  types/
    workflow.ts
  index.ts
  server.ts
migrations/
  001_init.sql
  002_monitoring_and_audit.sql
public/
  index.html
  app.css
  app.js
```

## Environment

Copy `.env.example` to `.env` and set values.

Key vars:

- `AI_PROVIDER`: `digitalocean` | `openai` | `mock`
- `AI_BASE_URL`: default `https://inference.do-ai.run/v1`
- `AI_API_KEY`: model access key
- `AI_WORKFLOW_MODEL`: default `anthropic-claude-4.5-sonnet`
- `AI_WORKFLOW_FALLBACK_MODELS`: fallback chain separated by comma
- `AI_ANALYSIS_MODEL`: default `anthropic-claude-4.5-sonnet`
- `N8N_BASE_URL`: e.g. `http://localhost:5678/api/v1`
- `N8N_API_KEY`: required for deployment calls
- `EVENT_INGEST_TOKEN`: optional shared secret for `/event`
- `ALERT_FAILURE_THRESHOLD`: default `3`
- `LOG_LEVEL`: `debug | info | warn | error`
- `LOG_CHAT_PROGRESS`: logs each `/chat` pipeline step
- `LOG_AI_RAW_RESPONSE`: print full provider response payload in terminal
- `LOG_AI_OUTPUT_TEXT`: print extracted AI text output in terminal

## Full MySQL Schema

Schema is implemented through `migrations/001_init.sql` and `migrations/002_monitoring_and_audit.sql`.

```sql
CREATE TABLE IF NOT EXISTS projects (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('draft', 'active', 'failed') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflows (
  id CHAR(36) NOT NULL PRIMARY KEY,
  project_id CHAR(36) NOT NULL,
  json JSON NOT NULL,
  status ENUM('draft', 'validated', 'approved', 'deployed', 'rejected', 'failed') NOT NULL DEFAULT 'draft',
  validation_errors JSON NULL,
  n8n_workflow_id VARCHAR(191) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_workflows_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_workflows_project_id (project_id),
  INDEX idx_workflows_status (status)
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  project_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_sessions_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_chat_sessions_project_id (project_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  role ENUM('user', 'ai') NOT NULL,
  content LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_messages_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  INDEX idx_chat_messages_session_id (session_id),
  INDEX idx_chat_messages_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS workflow_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workflow_id CHAR(36) NOT NULL,
  run_id VARCHAR(191) NULL,
  node_name VARCHAR(255) NULL,
  event_type ENUM('run_started','run_succeeded','run_failed','node_started','node_succeeded','node_failed') NOT NULL,
  status ENUM('success', 'failure', 'info') NOT NULL DEFAULT 'info',
  duration_ms INT NULL,
  error_message TEXT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_workflow_events_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  INDEX idx_workflow_events_workflow_id (workflow_id),
  INDEX idx_workflow_events_run_id (run_id),
  INDEX idx_workflow_events_event_type (event_type),
  INDEX idx_workflow_events_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS alerts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workflow_id CHAR(36) NOT NULL,
  type ENUM('high_failure_rate', 'workflow_failure_burst') NOT NULL,
  message TEXT NOT NULL,
  is_resolved TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  CONSTRAINT fk_alerts_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  INDEX idx_alerts_workflow_id (workflow_id),
  INDEX idx_alerts_unresolved (workflow_id, is_resolved)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workflow_id CHAR(36) NOT NULL,
  run_id VARCHAR(191) NULL,
  issue TEXT NOT NULL,
  reason TEXT NOT NULL,
  solution TEXT NOT NULL,
  raw_input JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_logs_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  INDEX idx_audit_logs_workflow_id (workflow_id),
  INDEX idx_audit_logs_run_id (run_id),
  INDEX idx_audit_logs_created_at (created_at)
);
```

## Run

```bash
bun install
bun run migrate
bun run dev
```

Health check:

```http
GET /health
```

Dashboard:

```http
GET /
```

Debug mode:

- `POST /chat` now returns `trace_id` and response header `x-trace-id`.
- Send your own trace id in header: `x-trace-id: my-debug-id`.
- Enable full debugging in `.env`:
  - `LOG_LEVEL=debug`
  - `LOG_AI_RAW_RESPONSE=true`
  - `LOG_AI_OUTPUT_TEXT=true`

## API Endpoints

### Chat + Generation

- `POST /chat`
  - Input:
    ```json
    { "message": "Send weekly report to Slack" }
    ```
  - Output: project/session IDs + generated workflow JSON + validation result

### Projects

- `GET /projects?limit=20&offset=0`
- `GET /projects/:projectId`
- `GET /projects/:projectId/workflow`
- `GET /projects/:projectId/messages`
- `GET /projects/:projectId/credential-bindings`
  - Returns saved credential bindings for this project/workflow.
- `PUT /projects/:projectId/credential-bindings`
  - Input:
    ```json
    {
      "credential_bindings": {
        "imap": { "id": "12" },
        "telegramApi": { "name": "Main Telegram Bot" }
      }
    }
    ```
- `POST /projects/:projectId/deploy-check`
  - Input:
    ```json
    {
      "credential_bindings": {
        "imap": { "id": "12" },
        "telegramApi": { "name": "Telegram Bot" }
      }
    }
    ```
  - Output:
    - required credentials per type
    - nodes using each credential
    - available n8n credentials
    - missing credentials
    - `can_activate` flag
- `POST /projects/:projectId/deploy`
  - Input:
    ```json
    { "activate": true }
    ```
  - With credential bindings:
    ```json
    {
      "activate": true,
      "credential_bindings": {
        "imap": { "id": "12" },
        "telegramApi": { "name": "Telegram Bot" }
      }
    }
    ```
  - If credentials are missing and `activate=true`, API returns:
    - `code: CREDENTIAL_BINDINGS_REQUIRED`
    - details with `required_credentials` and `missing_credentials`

### Workflow Health

- `GET /workflows/:workflowId/status`
  - Returns:
    - `is_working`
    - `last_run_status`
    - recent errors
    - unresolved alerts
    - latest AI suggestion

### Event Collector

- `POST /event`
  - Optional auth:
    - `Authorization: Bearer <EVENT_INGEST_TOKEN>`
    - or `X-Event-Token: <EVENT_INGEST_TOKEN>`

### Analytics

- `GET /analytics`
  - Returns:
    - total runs
    - failed runs
    - success rate
    - avg duration
    - unresolved alerts
    - workflows health summary

### n8n Credentials

- `GET /n8n/credentials`
  - Returns available credentials (`id`, `name`, `type`) to use in `credential_bindings`.
- `GET /n8n/credentials/schema/:credentialType`
  - Returns credential schema for building the `data` payload.
- `POST /n8n/credentials`
  - Create credential directly in n8n:
    ```json
    {
      "name": "My Slack Credential",
      "type": "slackApi",
      "data": {
        "accessToken": "xoxb-..."
      }
    }
    ```

## Example AI Prompts

Workflow generation system prompt (used internally):

```txt
You are a senior n8n automation engineer.
Return only valid JSON.
Use exact shape:
{ "project_name": "", "description": "", "workflow": { "nodes": [], "connections": {} } }
```

Failure analysis system prompt:

```txt
You are a senior n8n reliability engineer.
Analyze failures and return only JSON:
{ "issue": "", "reason": "", "solution": "" }
```

## Example n8n Event Payloads

Run success:

```json
{
  "n8n_workflow_id": "1042",
  "run_id": "run_2026_04_30_001",
  "event_type": "run_succeeded",
  "status": "success",
  "duration_ms": 1850,
  "metadata": {
    "trigger": "schedule",
    "executed_nodes": 4
  }
}
```

Run failure:

```json
{
  "n8n_workflow_id": "1042",
  "run_id": "run_2026_04_30_002",
  "event_type": "run_failed",
  "status": "failure",
  "error_message": "Slack API: channel_not_found",
  "duration_ms": 620,
  "metadata": {
    "failed_node": "Send Slack",
    "http_status": 404
  }
}
```

Node failure:

```json
{
  "n8n_workflow_id": "1042",
  "run_id": "run_2026_04_30_002",
  "node_name": "Send Slack",
  "event_type": "node_failed",
  "status": "failure",
  "error_message": "invalid_auth"
}
```

## Security Guardrails

- All AI output is schema-validated before use.
- Workflow validator blocks unsafe node types (command execution / file write / ssh / code nodes).
- AI cannot execute workflows directly.
- Deployment happens only through backend-controlled n8n API calls.

## Credential-First Deploy Flow

1. Create automation with `POST /chat`.
2. Call `POST /projects/:projectId/deploy-check`.
3. Show user missing credential types (for example `imap`, `telegramApi`).
4. User enters credential bindings and save with `PUT /projects/:projectId/credential-bindings`.
5. Call `POST /projects/:projectId/deploy-check` again to confirm `can_activate=true`.
6. Call `POST /projects/:projectId/deploy` with `activate=true` and optional `credential_bindings`.
7. Backend deploys and activates only after credentials pass pre-check.
