# Runtime Architecture

**Audience:** Atta — the engineer building the monitoring runtime  
**Purpose:** Enough detail to implement the full system without asking questions  
**Updated:** 2026-05-07

---

## 1. What the Runtime Is

A server-side process (Node.js or Python) that runs a **tick loop** every 60 seconds per customer. On each tick it:

1. Calls the customer's n8n instance via the REST API
2. Detects failed and stuck executions
3. Runs the LLM agent loop to diagnose each finding
4. Takes the agent-approved action (auto-retry, notify-human, escalate)
5. Writes everything to the incident store

The LLM agent is **not autonomous** — it produces a diagnosis + action recommendation. The runtime's safety layer validates the recommendation before executing any write tool. The LLM cannot call tools directly; the runtime calls them on its behalf after checking safety rules.

---

## 2. Folder Structure of the KB

```
n8n-agent/
├── models/               ← Always loaded (system prompt)
│   ├── n8n-execution-schema.md
│   ├── n8n-workflow-lifecycle.md
│   └── n8n-api-reference.md
├── decision-trees/       ← Loaded for every diagnosis
│   ├── failure-diagnosis.md
│   ├── error-classification.md
│   └── recovery-routing.md
├── cases/                ← ONE file loaded per diagnosis, by name from tree
│   ├── google-oauth-expired.md
│   ├── meta-api-rate-limit.md
│   ├── stuck-execution.md
│   ├── webhook-timeout.md
│   ├── hubspot-duplicate-contact.md
│   ├── n8n-worker-oom.md
│   ├── pagination-cursor-expired.md
│   ├── concurrent-execution-conflict.md
│   ├── postgres-connections-exhausted.md
│   ├── binary-data-failure.md
│   └── timezone-mismatch.md
├── playbooks/            ← ONE file loaded per diagnosis, after the case
│   ├── diagnose-workflow-failure.md
│   ├── detect-stuck-execution.md
│   ├── recover-from-api-error.md
│   └── report-to-agency.md
├── tools/                ← Loaded into system prompt (defines tool contracts)
│   ├── agent-tools.md
│   └── safety-rules.md
├── reference/            ← RAG-retrieval only; never preloaded
│   ├── api/
│   ├── n8n-nodes/
│   ├── n8n-production/
│   └── patterns/
└── evals/                ← NEVER loaded at runtime; test harness only
    ├── eval-harness.md
    └── scenario-*.md
```

---

## 3. Context Loading Strategy

This table defines exactly what goes into each LLM call's context window.

| Situation | System Prompt Contents | User Message Contents |
|---|---|---|
| **Idle / health-only tick** | models/* + tools/* | Health check result only |
| **New failure detected** | models/* + tools/* + decision-trees/* | Execution row + execution data + workflow definition + metrics + external signals |
| **Tree picks a label → load case** | Same as above + `cases/<name>.md` | Same inputs + "You have loaded the case file. Now cross-check signals and finalize diagnosis." |
| **Case picks an action → load playbook** | Same + `cases/<name>.md` + `playbooks/<name>.md` | "Execute the playbook for action: `<action>`. Write your evidence and decision chain." |
| **Stuck execution sweep** | models/* + tools/* + decision-trees/* + `cases/stuck-execution.md` + `playbooks/detect-stuck-execution.md` | List of stuck execution rows |
| **Composing human alert** | tools/* + `playbooks/report-to-agency.md` | Diagnosis record to render |
| **RAG fallback** | Same as current situation + retrieved reference chunk | "Additional context from reference: ..." |

**Rules:**
- `evals/` is **never** in any prompt at runtime.
- `reference/` is **never** preloaded. It is retrieved by semantic search only when the case or playbook says "refer to reference/api/..." and the relevant content cannot be inlined.
- Keep the system prompt under 8,000 tokens. models/* + tools/* = ~3,000 tokens. decision-trees/* = ~2,500 tokens. One case = ~1,500 tokens. One playbook = ~1,200 tokens. You have headroom.
- Decision trees, case files, and playbooks are **file reads** (fs.readFileSync / open()), not database lookups.

---

## 4. The Tick Loop (Pseudocode)

```typescript
// runs every 60 seconds per customer, in parallel across customers
async function tick(customer: Customer): Promise<void> {
  const tickStart = new Date();
  const log = buildAuditLogger(customer.id);

  // ── Step 1: Health check ──────────────────────────────────────────────────
  const health = await tools.get_health(customer);
  if (health.status !== 'ok') {
    await createOrUpdateIncident(customer, {
      label: 'infra.n8n-unhealthy',
      action: 'notify-human',
      severity: 'CRITICAL',
      evidence: { health },
    });
    await updateLastTick(customer.id, tickStart);
    return; // skip further work — instance is down
  }

  // ── Step 2: Collect new failures since last tick ──────────────────────────
  const newFailures = await tools.list_executions(customer, {
    status: ['error', 'crashed'],
    started_after: customer.last_tick_at ?? subHours(tickStart, 1),
    limit: 50,
  });

  // ── Step 3: Collect stuck / zombie candidates ─────────────────────────────
  const stuckCandidates = await tools.list_executions(customer, {
    status: ['running', 'waiting'],
    started_before: subMinutes(tickStart, 5),
    limit: 50,
  });

  // ── Step 4: Diagnose each failure ─────────────────────────────────────────
  for (const executionRow of newFailures) {
    // skip if we already have an open incident for this execution
    if (await incidentExists(customer.id, executionRow.id)) continue;

    const [executionData, workflowDef, metrics, externalSignals] = await Promise.all([
      tools.get_execution(customer, executionRow.id),
      tools.get_workflow(customer, executionRow.workflowId),
      tools.get_metrics(customer),
      buildExternalSignals(customer, executionRow),
    ]);

    const diagnosis = await runDiagnosisAgent(customer, {
      executionRow,
      executionData,
      workflowDef,
      metrics,
      externalSignals,
    });

    await dispatchAction(customer, diagnosis, log);
  }

  // ── Step 5: Stuck execution sweep ─────────────────────────────────────────
  if (stuckCandidates.length > 0) {
    const stuckDiagnoses = await runStuckSweepAgent(customer, stuckCandidates);
    for (const diag of stuckDiagnoses) {
      await dispatchAction(customer, diag, log);
    }
  }

  // ── Step 6: Daily digest (00:00–00:01 UTC window) ─────────────────────────
  if (isDigestWindow(tickStart, customer.timezone)) {
    await sendDailyDigest(customer);
  }

  // ── Step 7: Persist tick timestamp ────────────────────────────────────────
  await updateLastTick(customer.id, tickStart);
}
```

---

## 5. The Diagnosis Agent Loop

This is a **multi-turn LLM call sequence**, not a single prompt. Each turn adds more KB context as the tree narrows.

```typescript
async function runDiagnosisAgent(
  customer: Customer,
  inputs: DiagnosisInputs,
): Promise<DiagnosisRecord> {

  // Turn 1: Walk the failure-diagnosis tree + error-classification tree
  const turn1Context = buildSystemPrompt([
    loadFile('models/n8n-execution-schema.md'),
    loadFile('models/n8n-workflow-lifecycle.md'),
    loadFile('models/n8n-api-reference.md'),
    loadFile('tools/agent-tools.md'),
    loadFile('tools/safety-rules.md'),
    loadFile('decision-trees/failure-diagnosis.md'),
    loadFile('decision-trees/error-classification.md'),
    loadFile('decision-trees/recovery-routing.md'),
  ]);

  const turn1Result = await llm.complete({
    system: turn1Context,
    user: formatDiagnosisInputs(inputs),
    // The LLM returns a structured JSON block:
    // { label, subtype, confidence, evidence, case_to_load }
    responseFormat: 'json',
  });

  const { label, subtype, confidence, evidence, case_to_load } = turn1Result;

  // Turn 2: Load the case file and cross-check signals
  const caseFile = CASE_FILE_MAP[case_to_load]; // maps label → file path
  if (!caseFile) {
    // Unknown case → force notify-human
    return buildDiagnosisRecord({ label, subtype, confidence: 'low', action: 'notify-human', evidence });
  }

  const turn2Context = turn1Context + '\n\n' + loadFile(`cases/${caseFile}`);

  const turn2Result = await llm.complete({
    system: turn2Context,
    user: [
      formatDiagnosisInputs(inputs),
      `\nInitial diagnosis: ${JSON.stringify({ label, subtype, confidence, evidence })}`,
      '\nYou have loaded the case file. Cross-check the Signals section. Finalize your diagnosis.',
      '\nRespond with: { label, subtype, confidence, action, evidence, decision_chain }',
    ].join(''),
    responseFormat: 'json',
  });

  // Turn 3 (conditional): Load playbook if action requires procedure
  const { action, decision_chain } = turn2Result;
  const playbookFile = ACTION_PLAYBOOK_MAP[action]; // maps action → playbook path

  if (playbookFile) {
    const turn3Context = turn2Context + '\n\n' + loadFile(`playbooks/${playbookFile}`);
    const turn3Result = await llm.complete({
      system: turn3Context,
      user: [
        formatDiagnosisInputs(inputs),
        `\nDiagnosis: ${JSON.stringify(turn2Result)}`,
        '\nExecute the playbook. Write the tool call sequence you recommend.',
        '\nRespond with: { action, tool_calls: [{tool, params}], alert_message?, decision_chain }',
      ].join(''),
      responseFormat: 'json',
    });

    return buildDiagnosisRecord({ ...turn2Result, ...turn3Result });
  }

  return buildDiagnosisRecord(turn2Result);
}
```

**CASE_FILE_MAP** — maps the tree's label to the case file name:

```typescript
const CASE_FILE_MAP: Record<string, string> = {
  'auth.refresh-expired':             'google-oauth-expired.md',
  'auth.scope-insufficient':          'google-oauth-expired.md',
  'ratelimit.meta-buc':               'meta-api-rate-limit.md',
  'ratelimit.meta-app':               'meta-api-rate-limit.md',
  'ratelimit.generic-429':            'meta-api-rate-limit.md',
  'stuck.zombie-suspected':           'stuck-execution.md',
  'stuck.waiting-webhook':            'stuck-execution.md',
  'stuck.paused':                     'stuck-execution.md',
  'timeout.webhook-caller':           'webhook-timeout.md',
  'data.duplicate-record':            'hubspot-duplicate-contact.md',
  'data.pagination-cursor-expired':   'pagination-cursor-expired.md',
  'data.concurrent-write-conflict':   'concurrent-execution-conflict.md',
  'data.timezone-mismatch':           'timezone-mismatch.md',
  'infra.worker-oom':                 'n8n-worker-oom.md',
  'infra.db-connections-exhausted':   'postgres-connections-exhausted.md',
  'infra.binary-data-failure':        'binary-data-failure.md',
};
```

**ACTION_PLAYBOOK_MAP** — maps action to playbook:

```typescript
const ACTION_PLAYBOOK_MAP: Record<string, string | null> = {
  'auto-retry':          'recover-from-api-error.md',
  'auto-refresh':        'recover-from-api-error.md',
  'auto-cancel-replay':  'recover-from-api-error.md',
  'notify-human':        null, // alert composition handled inline
  'escalate-engineer':   null,
};
```

---

## 6. Action Dispatch (Safety Layer)

The runtime — NOT the LLM — decides whether a recommended tool call is allowed. The LLM proposes; the runtime enforces.

```typescript
async function dispatchAction(
  customer: Customer,
  diagnosis: DiagnosisRecord,
  log: AuditLogger,
): Promise<void> {

  // Write the incident first (always safe)
  const incident = await db.incidents.create({
    customer_id: customer.id,
    execution_id: diagnosis.execution_id,
    workflow_id: diagnosis.workflow_id,
    label: diagnosis.label,
    subtype: diagnosis.subtype,
    confidence: diagnosis.confidence,
    action: diagnosis.action,
    severity: computeSeverity(diagnosis),
    evidence: diagnosis.evidence,
    decision_chain: diagnosis.decision_chain,
  });

  log.event('diagnosis', { incident_id: incident.id, label: diagnosis.label, action: diagnosis.action });

  // ── Safety gate ───────────────────────────────────────────────────────────
  for (const toolCall of diagnosis.tool_calls ?? []) {
    const blocked = checkSafetyRules(toolCall, diagnosis, customer);
    if (blocked) {
      log.event('forbidden_action_blocked', { tool: toolCall.tool, reason: blocked });
      // Blocked write → escalate instead
      await postAlert(customer, incident, { severity: 'HIGH', note: `Blocked: ${blocked}` });
      return;
    }
  }

  // ── Execute approved tool calls ───────────────────────────────────────────
  for (const toolCall of diagnosis.tool_calls ?? []) {
    const result = await executeToolCall(customer, toolCall);

    await db.attempts.create({
      incident_id: incident.id,
      attempt_number: 1,
      action: diagnosis.action,
      tool_called: toolCall.tool,
      tool_params: toolCall.params,
      tool_result: result,
      outcome: result.ok ? 'success' : 'failure',
    });

    log.event('tool_call', {
      incident_id: incident.id,
      tool: toolCall.tool,
      params: toolCall.params,
      result: result,
    });
  }

  // ── Notify if required ────────────────────────────────────────────────────
  if (['notify-human', 'escalate-engineer'].includes(diagnosis.action)) {
    await postAlert(customer, incident, {
      severity: computeSeverity(diagnosis),
      message: diagnosis.alert_message,
    });
    await db.incidents.update(incident.id, { notified_at: new Date() });
  }
}
```

**Safety gate rules** (matches `tools/safety-rules.md`):

```typescript
function checkSafetyRules(
  toolCall: ToolCall,
  diagnosis: DiagnosisRecord,
  customer: Customer,
): string | null {
  const { tool, params } = toolCall;

  // Hard block: never call hard-write tools
  if (['delete_workflow', 'delete_execution', 'update_credentials'].includes(tool)) {
    return `${tool} is a hard-write tool — blocked unconditionally`;
  }

  // Idempotency gate on replay
  if (tool === 'replay_workflow') {
    const isIdempotent = diagnosis.evidence?.workflow_tags?.includes('idempotent:true');
    const lastNodeReadOnly = diagnosis.evidence?.last_node_is_read_only === true;
    const noSideEffects = diagnosis.evidence?.partial_side_effects_detected === false;
    if (!isIdempotent && !lastNodeReadOnly) {
      return 'replay_workflow blocked: workflow is not tagged idempotent:true and last node is not read-only';
    }
    if (!noSideEffects) {
      return 'replay_workflow blocked: partial side effects already shipped — human must decide';
    }
  }

  // Stop condition: max 3 auto-retry attempts on same execution
  if (tool === 'replay_workflow' || tool === 'stop_execution') {
    if ((diagnosis.attempt_count ?? 0) >= 3) {
      return `${tool} blocked: max 3 attempts reached for execution ${params.execution_id}`;
    }
  }

  // Revenue tag gates
  if (diagnosis.evidence?.workflow_tags?.includes('revenue:true')) {
    if (['auto-cancel-replay', 'auto-retry'].includes(diagnosis.action)) {
      const isIdempotent = diagnosis.evidence?.workflow_tags?.includes('idempotent:true');
      if (!isIdempotent) {
        return 'auto-action blocked on revenue:true non-idempotent workflow — notify-human required';
      }
    }
  }

  return null; // allowed
}
```

---

## 7. Tool Implementations

Implement these functions to satisfy the contracts in `tools/agent-tools.md`. All functions take `customer: Customer` as the first argument to resolve base URL + API key.

```typescript
// ── Read tools ────────────────────────────────────────────────────────────────

async function get_execution(customer: Customer, executionId: string): Promise<ExecutionRow> {
  const resp = await fetch(
    `${customer.n8n_base_url}/api/v1/executions/${executionId}`,
    { headers: { 'X-N8N-API-KEY': decrypt(customer.n8n_api_key_encrypted) } }
  );
  return resp.json();
}

async function list_executions(
  customer: Customer,
  params: {
    status?: string[];
    started_after?: Date;
    started_before?: Date;
    workflow_id?: string;
    limit?: number;
  }
): Promise<ExecutionRow[]> {
  const qs = new URLSearchParams();
  if (params.status) params.status.forEach(s => qs.append('status', s));
  if (params.started_after) qs.set('lastId', ''); // use cursor pagination
  if (params.limit) qs.set('limit', String(params.limit ?? 20));

  const resp = await fetch(
    `${customer.n8n_base_url}/api/v1/executions?${qs}`,
    { headers: { 'X-N8N-API-KEY': decrypt(customer.n8n_api_key_encrypted) } }
  );
  const body = await resp.json();
  return body.data ?? [];
}

async function get_workflow(customer: Customer, workflowId: string): Promise<WorkflowRow> {
  const resp = await fetch(
    `${customer.n8n_base_url}/api/v1/workflows/${workflowId}`,
    { headers: { 'X-N8N-API-KEY': decrypt(customer.n8n_api_key_encrypted) } }
  );
  return resp.json();
}

async function list_credentials(customer: Customer): Promise<CredentialRow[]> {
  const resp = await fetch(
    `${customer.n8n_base_url}/api/v1/credentials`,
    { headers: { 'X-N8N-API-KEY': decrypt(customer.n8n_api_key_encrypted) } }
  );
  const body = await resp.json();
  return body.data ?? [];
}

async function get_metrics(customer: Customer): Promise<PrometheusMetrics> {
  // /metrics endpoint requires METRICS_INCLUDE_DEFAULT_METRICS=true in n8n env
  const resp = await fetch(
    `${customer.n8n_base_url}/metrics`,
    { headers: { 'X-N8N-API-KEY': decrypt(customer.n8n_api_key_encrypted) } }
  );
  const text = await resp.text();
  return parsePrometheusText(text); // extract key metrics as object
}

async function get_health(customer: Customer): Promise<{ status: 'ok' | 'error', details: any }> {
  try {
    const resp = await fetch(`${customer.n8n_base_url}/healthz/readiness`, { timeout: 5000 });
    return { status: resp.ok ? 'ok' : 'error', details: await resp.json() };
  } catch (err) {
    return { status: 'error', details: { error: String(err) } };
  }
}

// ── Observe tools ─────────────────────────────────────────────────────────────

async function query_n8n_db(
  customer: Customer,
  sql: string,
  params: unknown[] = []
): Promise<unknown[]> {
  // The customer must have provided their n8n Postgres connection string.
  // Only allowed if customer.n8n_db_connection_string_encrypted is set.
  // Enforce: SELECT-only. Table allowlist: execution_entity, execution_data,
  //   workflow_entity, credentials_entity.
  // Timeout: 30s. Row cap: 10,000.
  if (!customer.n8n_db_connection_string_encrypted) {
    throw new Error('DB access not configured for this customer');
  }
  enforceSelectOnly(sql);
  enforceTableAllowlist(sql, ['execution_entity', 'execution_data', 'workflow_entity', 'credentials_entity']);
  const conn = new PostgresClient(decrypt(customer.n8n_db_connection_string_encrypted));
  const result = await conn.query({ text: sql, values: params, rowMode: 'array', queryTimeout: 30000 });
  if (result.rows.length > 10000) throw new Error('Query exceeded 10,000 row cap');
  return result.rows;
}

// ── Soft-write tools ──────────────────────────────────────────────────────────

async function stop_execution(customer: Customer, executionId: string): Promise<void> {
  // POST /api/v1/executions/:id/stop
  await fetch(
    `${customer.n8n_base_url}/api/v1/executions/${executionId}/stop`,
    {
      method: 'POST',
      headers: { 'X-N8N-API-KEY': decrypt(customer.n8n_api_key_encrypted) },
    }
  );
}

async function set_workflow_active(
  customer: Customer,
  workflowId: string,
  active: boolean
): Promise<void> {
  // PATCH /api/v1/workflows/:id
  await fetch(
    `${customer.n8n_base_url}/api/v1/workflows/${workflowId}`,
    {
      method: 'PATCH',
      headers: {
        'X-N8N-API-KEY': decrypt(customer.n8n_api_key_encrypted),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ active }),
    }
  );
}

async function replay_workflow(
  customer: Customer,
  executionId: string
): Promise<{ new_execution_id: string }> {
  // POST /api/v1/executions/:id/retry
  // Note: only works on failed executions. Zombie executions must be stopped first.
  const resp = await fetch(
    `${customer.n8n_base_url}/api/v1/executions/${executionId}/retry`,
    {
      method: 'POST',
      headers: { 'X-N8N-API-KEY': decrypt(customer.n8n_api_key_encrypted) },
    }
  );
  const body = await resp.json();
  return { new_execution_id: body.data?.id };
}

// ── Agent-internal tools ──────────────────────────────────────────────────────
// (These don't call n8n — they write to the incident store or post alerts)

async function write_incident(/* handled by dispatchAction() above */): Promise<string> { /* ... */ }
async function post_alert(/* handled by dispatchAction() above */): Promise<void> { /* ... */ }
async function record_attempt(/* handled by dispatchAction() above */): Promise<void> { /* ... */ }
```

---

## 8. Incident Store Schema

Run these migrations on your OpsRadar Postgres instance (separate from any customer's n8n Postgres).

```sql
-- Customers registered for monitoring
CREATE TABLE n8n_customers (
  id                              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                            TEXT        NOT NULL,
  n8n_base_url                    TEXT        NOT NULL,               -- e.g. https://n8n.acme.com
  n8n_api_key_encrypted           TEXT        NOT NULL,               -- AES-256 encrypted
  n8n_db_connection_string_encrypted TEXT     NULL,                   -- optional; enables query_n8n_db
  timezone                        TEXT        NOT NULL DEFAULT 'UTC', -- IANA tz
  notify_email                    TEXT        NOT NULL,               -- primary alert destination
  notify_slack_webhook_url        TEXT        NULL,                   -- optional Slack alerts
  digest_time_utc                 TIME        NOT NULL DEFAULT '00:00', -- when to send daily digest
  active                          BOOLEAN     NOT NULL DEFAULT true,
  last_tick_at                    TIMESTAMPTZ NULL,
  onboarded_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per detected incident (a failure event or stuck execution)
CREATE TABLE n8n_incidents (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID        NOT NULL REFERENCES n8n_customers(id) ON DELETE CASCADE,
  execution_id    TEXT        NULL,                                   -- n8n execution ID
  workflow_id     TEXT        NULL,                                   -- n8n workflow ID
  label           TEXT        NOT NULL,                               -- e.g. 'auth.refresh-expired'
  subtype         TEXT        NULL,                                   -- e.g. 'testing-mode-7day'
  confidence      TEXT        NOT NULL CHECK (confidence IN ('high','medium','low')),
  action          TEXT        NOT NULL CHECK (action IN ('auto-retry','auto-refresh','auto-cancel-replay','notify-human','escalate-engineer')),
  severity        TEXT        NOT NULL CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  status          TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','auto-resolved')),
  evidence        JSONB       NOT NULL DEFAULT '{}',
  decision_chain  JSONB       NOT NULL DEFAULT '[]',                  -- [{step, reasoning, kb_file}]
  case_file_used  TEXT        NULL,                                   -- e.g. 'google-oauth-expired.md'
  notified_at     TIMESTAMPTZ NULL,
  acknowledged_at TIMESTAMPTZ NULL,
  resolved_at     TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_n8n_incidents_customer_status ON n8n_incidents (customer_id, status, created_at DESC);
CREATE INDEX idx_n8n_incidents_execution ON n8n_incidents (customer_id, execution_id);

-- One row per action attempt (for retry tracking + audit)
CREATE TABLE n8n_attempts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     UUID        NOT NULL REFERENCES n8n_incidents(id) ON DELETE CASCADE,
  attempt_number  INTEGER     NOT NULL,                               -- starts at 1
  action          TEXT        NOT NULL,
  tool_called     TEXT        NULL,
  tool_params     JSONB       NULL,
  tool_result     JSONB       NULL,
  delay_seconds   INTEGER     NULL,                                   -- scheduled delay before this attempt
  next_attempt_at TIMESTAMPTZ NULL,
  outcome         TEXT        NULL CHECK (outcome IN ('success','failure','pending','blocked')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Immutable audit log (never UPDATE or DELETE)
CREATE TABLE n8n_audit_log (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id             UUID        NOT NULL REFERENCES n8n_customers(id) ON DELETE CASCADE,
  incident_id             UUID        NULL REFERENCES n8n_incidents(id),
  event_type              TEXT        NOT NULL,                       -- 'tick_start' | 'tool_call' | 'diagnosis' | 'action' | 'alert' | 'blocked'
  tool_name               TEXT        NULL,
  tool_params             JSONB       NULL,
  result_summary          TEXT        NULL,
  forbidden_action_blocked TEXT        NULL,                          -- populated when safety gate fires
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_n8n_audit_log_customer ON n8n_audit_log (customer_id, created_at DESC);

-- Weekly digest summary (written after each weekly digest is sent)
CREATE TABLE n8n_weekly_digests (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         UUID        NOT NULL REFERENCES n8n_customers(id) ON DELETE CASCADE,
  week_start          DATE        NOT NULL,
  total_incidents     INTEGER     NOT NULL DEFAULT 0,
  auto_resolved       INTEGER     NOT NULL DEFAULT 0,
  human_escalated     INTEGER     NOT NULL DEFAULT 0,
  top_labels          JSONB       NOT NULL DEFAULT '[]',              -- [{label, count}]
  digest_sent_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Key queries you'll use constantly

```sql
-- Check if incident already open for this execution
SELECT id FROM n8n_incidents
WHERE customer_id = $1 AND execution_id = $2 AND status = 'open'
LIMIT 1;

-- Count attempts for stop-condition gate
SELECT COUNT(*) FROM n8n_attempts
WHERE incident_id = $1 AND outcome != 'pending';

-- Get open incidents for a customer (for daily digest)
SELECT * FROM n8n_incidents
WHERE customer_id = $1 AND status IN ('open','acknowledged')
ORDER BY severity DESC, created_at ASC;

-- Mark incident resolved
UPDATE n8n_incidents SET status = 'auto-resolved', resolved_at = now()
WHERE id = $1;
```

---

## 9. Customer Onboarding

### What the customer provides

Collect via a form (or API call) when a new customer signs up for monitoring:

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Display name (e.g. "Acme Corp") |
| `n8n_base_url` | Yes | Full URL, no trailing slash (e.g. `https://n8n.acme.com`) |
| `n8n_api_key` | Yes | n8n instance API key (`Settings → API → Create API Key`) |
| `notify_email` | Yes | Where alerts go |
| `notify_slack_webhook_url` | No | Optional Slack integration |
| `timezone` | Yes | Customer's local timezone (for digest scheduling) |
| `n8n_db_connection_string` | No | Postgres connection string for `query_n8n_db`; skips if not provided |

### Onboarding flow

```typescript
async function onboardCustomer(form: OnboardingForm): Promise<Customer> {

  // Step 1: Validate n8n connection
  const testResp = await fetch(`${form.n8n_base_url}/api/v1/workflows?limit=1`, {
    headers: { 'X-N8N-API-KEY': form.n8n_api_key },
  });
  if (!testResp.ok) {
    throw new Error(`Cannot reach n8n at ${form.n8n_base_url}. Status: ${testResp.status}. Check the URL and API key.`);
  }

  // Step 2: Validate timezone
  if (!isValidIANATimezone(form.timezone)) {
    throw new Error(`Invalid IANA timezone: ${form.timezone}`);
  }

  // Step 3: Encrypt and store
  const customer = await db.n8n_customers.create({
    name: form.name,
    n8n_base_url: form.n8n_base_url.replace(/\/$/, ''),
    n8n_api_key_encrypted: encrypt(form.n8n_api_key),
    n8n_db_connection_string_encrypted: form.n8n_db_connection_string
      ? encrypt(form.n8n_db_connection_string)
      : null,
    timezone: form.timezone,
    notify_email: form.notify_email,
    notify_slack_webhook_url: form.notify_slack_webhook_url ?? null,
    active: true,
  });

  // Step 4: Run first tick (baseline snapshot)
  // This writes no incidents — it just records last_tick_at so the next
  // scheduled tick knows where to start.
  await tick(customer);

  // Step 5: Send "monitoring active" confirmation email
  await sendOnboardingConfirmation(customer);

  return customer;
}
```

### What n8n settings the customer must enable

The onboarding form or docs must tell the customer to set these in their n8n environment before connecting:

```
N8N_METRICS=true
METRICS_INCLUDE_DEFAULT_METRICS=true
N8N_API_DISABLED=false
```

Without `N8N_METRICS=true`, the `get_metrics()` tool returns an empty response and infra cases (worker OOM, DB connections) cannot be detected. Mention this clearly in the setup instructions.

---

## 10. Encryption

Use **AES-256-GCM** for all encrypted fields. The encryption key lives in your OpsRadar environment variable `ENCRYPTION_KEY` (32-byte hex).

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store as: iv_hex:tag_hex:ciphertext_hex
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(stored: string): string {
  const [ivHex, tagHex, ciphertextHex] = stored.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
}
```

---

## 11. Scheduling

Run `tick()` every 60 seconds per active customer. Use **BullMQ** (or any job queue) to avoid overlapping ticks for the same customer.

```typescript
// Queue setup
const tickQueue = new Queue('n8n-ticks', { connection: redis });

const tickWorker = new Worker('n8n-ticks', async (job) => {
  const customer = await db.n8n_customers.findById(job.data.customerId);
  if (!customer || !customer.active) return;
  await tick(customer);
}, { connection: redis, concurrency: 20 }); // 20 customers in parallel

// Schedule ticks for all active customers on startup and whenever a new customer is onboarded
async function scheduleAllTicks(): Promise<void> {
  const customers = await db.n8n_customers.findAll({ active: true });
  for (const customer of customers) {
    await tickQueue.add(
      `tick-${customer.id}`,
      { customerId: customer.id },
      { repeat: { every: 60_000 }, jobId: `tick-${customer.id}` }
    );
  }
}
```

---

## 12. Error Handling in the Runtime Itself

The runtime must not crash when one customer's n8n is unreachable. Wrap every tick in try/catch and write a runtime error to the audit log (not an incident — that requires a diagnosis).

```typescript
async function safeTick(customer: Customer): Promise<void> {
  try {
    await tick(customer);
  } catch (err) {
    await db.n8n_audit_log.create({
      customer_id: customer.id,
      event_type: 'tick_error',
      result_summary: String(err),
    });
    // Do NOT re-throw — let the queue move to the next customer
  }
}
```

LLM call failures are also non-fatal. If the diagnosis agent fails (token limit, API error, timeout), write the raw inputs to the audit log with `event_type: 'llm_error'` and create a generic `notify-human` incident so the customer doesn't silently lose monitoring.

---

## 13. What to Build First (Suggested Order)

1. **Postgres schema** — run the migrations in section 8.
2. **Encryption utilities** — section 10. Everything else needs these.
3. **Tool implementations** — `get_health`, `list_executions`, `get_execution`, `get_workflow` (the four read tools). Enough to run a tick.
4. **Tick loop skeleton** — steps 1–3 only (health + collect failures + collect stuck). Skip diagnosis.
5. **Diagnosis agent (Turn 1 only)** — load models/* + decision-trees/*. Confirm the tree labels are correct on the three eval scenarios.
6. **Case loading (Turn 2)** — CASE_FILE_MAP + Turn 2 context injection.
7. **Action dispatch + safety gate** — implement `checkSafetyRules`. Run the zombie eval scenario to verify `replay_workflow` is blocked.
8. **Soft-write tools** — `stop_execution`, `replay_workflow` (now that safety gate exists).
9. **Alert delivery** — email + Slack.
10. **Customer onboarding API** — section 9.
11. **Scheduling** — BullMQ setup (section 11).
12. **Daily / weekly digests** — last; low urgency, high customer-visible value.

---

## Cross-References

`tools/agent-tools.md` — canonical tool signatures and safety classes  
`tools/safety-rules.md` — full set of hard prohibitions and authorization model  
`decision-trees/failure-diagnosis.md` — the tree the LLM walks in Turn 1  
`decision-trees/recovery-routing.md` — action selection logic including idempotency probe  
`models/n8n-execution-schema.md` — n8n DB schema (what `query_n8n_db` can see)  
`models/n8n-api-reference.md` — all REST endpoints used by the read tools  
`evals/eval-harness.md` — how to verify the agent loop with the three scenario files  
