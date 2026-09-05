# Agent Tool Definitions

**Type:** Tool catalog (the functions the LLM agent invokes)
**Audience:** the agent loop implementing the n8n monitoring agent
**Used by:** every playbook + decision tree
**Updated:** 2026-05-07

## How to use this file

Each tool below is defined with: name, purpose, parameters (typed), return shape, safety class, and examples. Tools are the **only** way the agent acts on the customer's n8n. Anything not on this list is out of scope; the agent must escalate instead of inventing.

The runtime (Node.js / Python / whatever wraps the LLM call) is responsible for translating these definitions into the LLM's tool-use format (Anthropic tool definitions, OpenAI functions, etc.) and executing them with proper authorization.

## Safety classes

| Class | Definition | Authorization |
|---|---|---|
| **read** | No side effects on customer state. Safe to call any time. | Per-customer credentials only |
| **observe** | No side effects, but expensive (large DB scans, full execution data). Rate-limited. | Per-customer credentials + rate budget |
| **soft-write** | Writes that cancel or pause but don't mutate customer data | Customer's policy — most allow auto |
| **hard-write** | Writes that mutate customer data or change customer-visible state | Always requires the agent's stop-condition checks plus customer policy |
| **agent-internal** | Writes to the agent's own incident / eval store, not the customer | Agent-only |

Auto-handling rules (`decision-trees/recovery-routing`) reference these classes — `auto-cancel-replay` uses soft-write tools; `auto-refresh` uses soft-write; engineering escalation uses no write tools.

---

## Read tools (n8n REST API)

### `get_execution`

**Class:** read
**Purpose:** Fetch one execution with optional run data. The single most-used tool.

```ts
get_execution(input: {
  customer_id: string,
  execution_id: string,
  include_data?: boolean   // default: false. Set true only when diagnosing a single failure.
}): {
  id: string,
  workflowId: string,
  mode: "manual"|"trigger"|"webhook"|"integrated"|"internal"|"retry"|"error"|"evaluation",
  status: "new"|"running"|"waiting"|"success"|"error"|"crashed"|"canceled",
  finished: boolean,
  startedAt: string,        // ISO
  stoppedAt: string|null,
  waitTill: string|null,
  retryOf: string|null,
  data?: {                  // only when include_data=true
    resultData: {
      runData: Record<string, NodeRun[]>,
      lastNodeExecuted: string|null,
      error?: { name: string, message: string, httpCode?: string, node?: string, context?: object }
    }
  }
}
```

**Used by:** `playbooks/diagnose-workflow-failure` (Step 1). Never call with `include_data=true` in a sweep — `runData` can be many MB.

---

### `list_executions`

**Class:** read
**Purpose:** Paginate executions matching filters. Use for sweeps and dashboards.

```ts
list_executions(input: {
  customer_id: string,
  status?: ("new"|"running"|"waiting"|"success"|"error"|"crashed"|"canceled")[],
  workflow_id?: string,
  started_after?: string,    // ISO
  started_before?: string,   // ISO
  limit?: number,            // default 100, max 250
  cursor?: string            // from previous response.nextCursor
}): {
  data: Array</* same as get_execution without include_data */>,
  nextCursor: string|null
}
```

**Used by:** `playbooks/detect-stuck-execution` (Step 1). Always paginate to completion when computing rollups.

---

### `get_workflow`

**Class:** read
**Purpose:** Read workflow definition (nodes, connections, settings, credentials references).

```ts
get_workflow(input: {
  customer_id: string,
  workflow_id: string
}): {
  id: string,
  name: string,
  active: boolean,
  isArchived: boolean,
  nodes: Node[],            // includes parameters, credentials refs, typeVersion
  connections: object,
  settings: {
    timezone?: string,
    executionTimeout?: number,
    errorWorkflow?: string,
    executionOrder?: "v0"|"v1"
  },
  triggerCount: number,
  versionId: string         // changes when workflow is edited; agent uses to detect engineering fixes
}
```

**Used by:** `playbooks/diagnose-workflow-failure` (to read tags, settings); every case file's Signals step (to inspect node config).

---

### `list_workflows`

**Class:** read
**Purpose:** List active workflows for a customer.

```ts
list_workflows(input: {
  customer_id: string,
  active?: boolean,
  tags?: string[]            // e.g. ["revenue:true"]
}): { data: Workflow[], nextCursor: string|null }
```

---

### `list_credentials`

**Class:** read
**Purpose:** Metadata only (id, name, type, updatedAt). **Never returns credential `data`.**

```ts
list_credentials(input: {
  customer_id: string,
  type?: string             // e.g. "googleOAuth2Api"
}): { data: Array<{ id, name, type, createdAt, updatedAt }> }
```

**Used by:** `cases/google-oauth-expired` (proactive expiry detection via `updatedAt`).

---

### `get_metrics`

**Class:** read
**Purpose:** Fetch Prometheus `/metrics` output, parse the n8n-relevant series.

```ts
get_metrics(input: {
  customer_id: string,
  series?: string[]         // filter; if empty, returns the standard n8n set
}): {
  active_workflow_count: number,
  executions_total: { success: number, error: number, crashed: number },
  queue_jobs_waiting: number,         // queue mode only
  queue_jobs_active: number,          // queue mode only
  resident_memory_bytes: number,
  eventloop_lag_seconds: number,
  scraped_at: string
}
```

**Used by:** `playbooks/detect-stuck-execution` (Step 4 — capture forensics); customer reporting.

---

### `get_health`

**Class:** read
**Purpose:** Fetch `/healthz` and `/healthz/readiness`.

```ts
get_health(input: { customer_id: string }): {
  liveness: "ok"|"fail",
  readiness: "ok"|"fail",
  fetched_at: string
}
```

**Used by:** `playbooks/recover-from-api-error` (Step 5 — instance unreachable detection).

---

## Observe tools (n8n DB direct)

### `query_n8n_db`

**Class:** observe
**Purpose:** Read-only parameterized SQL against the customer's n8n Postgres. Use only when the REST API doesn't expose what's needed.

```ts
query_n8n_db(input: {
  customer_id: string,
  sql: string,              // MUST be SELECT only; runtime enforces
  params?: any[]
}): { rows: object[], rowCount: number }
```

**Hard constraints (enforced by runtime):**
- SQL must start with `SELECT`. UPDATE / DELETE / DDL rejected.
- Result row count capped at 10,000.
- Query timeout: 30 s.
- Tables allowed: `execution_entity`, `execution_data`, `execution_metadata`, `workflow_entity`, `credentials_entity`, `pg_stat_activity`. Anything else rejected.

**Used by:** `playbooks/detect-stuck-execution` (the SQL in Step 1); `cases/postgres-connections-exhausted` (`pg_stat_activity` query).

---

## Soft-write tools

### `stop_execution`

**Class:** soft-write
**Purpose:** Cancel a running / waiting / new execution. Idempotent — calling on a terminal row is a no-op.

```ts
stop_execution(input: {
  customer_id: string,
  execution_id: string
}): { ok: boolean, status_after: string }
```

**Used by:** `playbooks/detect-stuck-execution`, `playbooks/recover-from-api-error`, `cases/concurrent-execution-conflict`.

---

### `set_workflow_active`

**Class:** soft-write
**Purpose:** Activate / deactivate a workflow. Reversible.

```ts
set_workflow_active(input: {
  customer_id: string,
  workflow_id: string,
  active: boolean
}): { ok: boolean, active_after: boolean }
```

**Used by:** `cases/concurrent-execution-conflict` (pause source of duplicates); `cases/meta-api-rate-limit` (pause for wait window).

---

### `replay_workflow`

**Class:** soft-write (when invoked on idempotent workflows)
**Purpose:** Re-fire a workflow's trigger with original input.

```ts
replay_workflow(input: {
  customer_id: string,
  workflow_id: string,
  source_execution_id: string,    // for trigger payload extraction
  trigger_kind: "schedule"|"webhook"|"manual"
}): { ok: boolean, new_execution_id?: string, reason_if_skipped?: string }
```

The runtime is responsible for the idempotency probe (per `decision-trees/recovery-routing`); the agent must call `replay_workflow` only after deciding replay is safe. The runtime double-checks via the `idempotent` workflow tag.

---

## Hard-write tools

The agent does not have hard-write tools that touch customer data. Credential rotation, workflow definition edits, infrastructure changes — all `escalate-engineer`. There is no `update_credential` tool by design.

---

## Agent-internal tools

### `write_incident`

**Class:** agent-internal
**Purpose:** Append to the agent's incident store.

```ts
write_incident(input: {
  customer_id: string,
  workflow_id: string|null,
  execution_id: string|null,
  label: string,
  category: string,
  subtype: string,
  confidence: "high"|"medium"|"low",
  evidence: object,
  next_action: string
}): { incident_id: string }
```

---

### `post_alert`

**Class:** agent-internal (writes to the agency's notification channel, not the customer's n8n)
**Purpose:** Push a real-time alert per `playbooks/report-to-agency`.

```ts
post_alert(input: {
  customer_id: string,
  severity: "critical"|"high"|"medium"|"low"|"info",
  channel: "slack"|"email"|"webhook",
  title: string,
  body: string,
  links: { label: string, url: string }[]
}): { ok: boolean, message_id?: string }
```

The runtime handles channel-specific formatting (Slack Block Kit, email HTML, etc.). The agent only composes the structured payload.

---

### `record_attempt`

**Class:** agent-internal
**Purpose:** Log a recovery attempt to the incident timeline.

```ts
record_attempt(input: {
  incident_id: string,
  action: "auto-retry"|"auto-refresh"|"auto-cancel-replay"|"notify-human"|"escalate-engineer",
  attempt: number,
  delay_seconds?: number,
  outcome: "success"|"same-failure"|"different-failure"|"pending",
  next_check_at?: string
}): { ok: boolean }
```

**Used by:** `playbooks/recover-from-api-error` (Step 4).

---

## Cross-references

`decision-trees/recovery-routing` (which class-of-action uses which tools) · `models/n8n-api-reference` (the underlying n8n endpoints) · `models/n8n-execution-schema` (what `query_n8n_db` reads) · all `playbooks/`
