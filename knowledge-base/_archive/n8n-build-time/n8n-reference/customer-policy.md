# Customer Policy Schema

**Type:** Configuration reference  
**Audience:** Runtime engineer (Atta) + the agent when checking per-customer authorization  
**Updated:** 2026-05-07

---

## Purpose

Every customer who connects their n8n instance to OpsRadar can configure what the monitoring agent is and isn't allowed to do on their behalf. The runtime reads these settings from the `n8n_customer_policy` table before dispatching any action. The agent must never act outside the bounds of the customer's policy — even if the agent's diagnosis suggests a safe action.

This document defines the schema and all configurable fields.

---

## Database Schema

```sql
CREATE TABLE n8n_customer_policy (
  customer_id                        UUID        PRIMARY KEY REFERENCES n8n_customers(id) ON DELETE CASCADE,

  -- ── Action authorization ──────────────────────────────────────────────────
  allow_auto_retry                   BOOLEAN     NOT NULL DEFAULT true,
  allow_auto_refresh                 BOOLEAN     NOT NULL DEFAULT true,
  allow_auto_cancel_replay           BOOLEAN     NOT NULL DEFAULT false,   -- off by default: riskier action
  allow_stop_execution               BOOLEAN     NOT NULL DEFAULT false,   -- off by default

  -- ── Revenue workflow overrides ────────────────────────────────────────────
  revenue_workflows_require_approval BOOLEAN     NOT NULL DEFAULT true,    -- blocks all auto-actions on revenue:true workflows
  revenue_tag_name                   TEXT        NOT NULL DEFAULT 'revenue:true',

  -- ── Retry limits ─────────────────────────────────────────────────────────
  max_auto_retry_attempts            INTEGER     NOT NULL DEFAULT 3        CHECK (max_auto_retry_attempts BETWEEN 1 AND 10),
  retry_backoff_base_seconds         INTEGER     NOT NULL DEFAULT 30       CHECK (retry_backoff_base_seconds BETWEEN 5 AND 300),
  retry_backoff_multiplier           NUMERIC     NOT NULL DEFAULT 2.0      CHECK (retry_backoff_multiplier BETWEEN 1.0 AND 5.0),
  retry_backoff_max_seconds          INTEGER     NOT NULL DEFAULT 3600,    -- cap at 1 hour

  -- ── Stuck execution thresholds ────────────────────────────────────────────
  stuck_execution_threshold_minutes  INTEGER     NOT NULL DEFAULT 30       CHECK (stuck_execution_threshold_minutes BETWEEN 5 AND 1440),
  stuck_webhook_threshold_minutes    INTEGER     NOT NULL DEFAULT 60,      -- waiting webhooks get more time

  -- ── Alert channels ────────────────────────────────────────────────────────
  alert_on_severity                  TEXT[]      NOT NULL DEFAULT '{"CRITICAL","HIGH","MEDIUM"}',
  digest_on_severity                 TEXT[]      NOT NULL DEFAULT '{"LOW"}',
  alert_email                        TEXT        NOT NULL,                 -- mirrored from n8n_customers
  alert_slack_webhook_url            TEXT        NULL,
  pagerduty_routing_key              TEXT        NULL,                     -- optional PagerDuty integration
  alert_rate_limit_per_hour          INTEGER     NOT NULL DEFAULT 10,      -- max alerts/hr to avoid noise floods

  -- ── Workflow scope ────────────────────────────────────────────────────────
  monitor_all_workflows              BOOLEAN     NOT NULL DEFAULT true,
  monitored_workflow_ids             TEXT[]      NULL,                     -- if monitor_all=false, only these
  excluded_workflow_ids              TEXT[]      NOT NULL DEFAULT '{}',    -- always excluded regardless of monitor_all

  -- ── DB access ─────────────────────────────────────────────────────────────
  allow_db_queries                   BOOLEAN     NOT NULL DEFAULT false,   -- enables query_n8n_db tool
  db_query_timeout_seconds           INTEGER     NOT NULL DEFAULT 30       CHECK (db_query_timeout_seconds BETWEEN 5 AND 120),
  db_max_rows_returned               INTEGER     NOT NULL DEFAULT 10000    CHECK (db_max_rows_returned BETWEEN 100 AND 50000),

  -- ── Escalation contacts ───────────────────────────────────────────────────
  escalation_email                   TEXT        NULL,                     -- different person for escalate-engineer
  escalation_slack_channel           TEXT        NULL,

  -- ── Digest schedule ──────────────────────────────────────────────────────
  daily_digest_enabled               BOOLEAN     NOT NULL DEFAULT true,
  daily_digest_time_utc              TIME        NOT NULL DEFAULT '08:00',
  weekly_digest_enabled              BOOLEAN     NOT NULL DEFAULT true,
  weekly_digest_day                  INTEGER     NOT NULL DEFAULT 1        CHECK (weekly_digest_day BETWEEN 0 AND 6), -- 0=Sun, 1=Mon

  -- ── Metadata ─────────────────────────────────────────────────────────────
  updated_at                         TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Field Reference

### Action Authorization

| Field | Default | Meaning |
|---|---|---|
| `allow_auto_retry` | `true` | Permit the agent to call `replay_workflow` after transient errors (rate limits, timeouts with idempotent:true) |
| `allow_auto_refresh` | `true` | Permit the agent to attempt credential refresh (n8n does this natively; the agent records the attempt) |
| `allow_auto_cancel_replay` | `false` | Permit the agent to call `stop_execution` then `replay_workflow` on zombie executions. Off by default — requires the customer to opt in explicitly. |
| `allow_stop_execution` | `false` | Permit the agent to call `stop_execution` alone (without replay). Off by default — even stopping has consequences for waiting webhooks. |

**Rationale for conservative defaults:** A new customer should receive monitoring and alerts out of the box, but no automated write actions until they have verified the agent's diagnosis quality on their specific workflows. The agent earns write permissions incrementally.

### Revenue Workflow Protection

```typescript
// Runtime check before any auto-action
function isBlockedByRevenuePolicy(customer: Customer, diagnosis: DiagnosisRecord): string | null {
  const policy = customer.policy;
  const tags = diagnosis.evidence?.workflow_tags ?? [];

  if (
    policy.revenue_workflows_require_approval &&
    tags.includes(policy.revenue_tag_name) &&
    ['auto-retry', 'auto-refresh', 'auto-cancel-replay'].includes(diagnosis.action)
  ) {
    return `Auto-action blocked: workflow is tagged ${policy.revenue_tag_name} and revenue_workflows_require_approval=true`;
  }
  return null;
}
```

Customers can change the revenue tag name if they use a different convention:

```sql
UPDATE n8n_customer_policy SET revenue_tag_name = 'critical:true' WHERE customer_id = $1;
```

### Retry Configuration

The retry backoff formula: `delay = min(base * multiplier^(attempt-1) + jitter, max)`

Where:
- `jitter` = `Math.random() * base * 0.2` (20% of base, avoids thundering herd)
- Attempt 1: 30s base → ~30–36s
- Attempt 2: 60s → ~60–72s
- Attempt 3: 120s → ~120–144s
- Capped at `retry_backoff_max_seconds`

Exception: when a case file specifies an explicit wait window (e.g. Meta BUC `estimated_time_to_regain_access = 12 min`), use that value instead of the formula. The explicit value always wins.

```typescript
function computeRetryDelay(
  policy: CustomerPolicy,
  attemptNumber: number,
  explicitWaitSeconds?: number
): number {
  if (explicitWaitSeconds != null) return explicitWaitSeconds;
  const base = policy.retry_backoff_base_seconds;
  const jitter = Math.random() * base * 0.2;
  const delay = base * Math.pow(policy.retry_backoff_multiplier, attemptNumber - 1) + jitter;
  return Math.min(delay, policy.retry_backoff_max_seconds);
}
```

### Stuck Execution Thresholds

The default threshold (30 min) is the minimum age before the agent considers an execution "stuck" and starts the `detect-stuck-execution` playbook. Customers with long-running legitimate workflows should raise this to avoid false positives.

```sql
-- Customer whose ML pipeline legitimately runs for 4 hours
UPDATE n8n_customer_policy
SET stuck_execution_threshold_minutes = 270
WHERE customer_id = $1;
```

Waiting webhook executions (`status=waiting`) get their own threshold. A workflow waiting for a human approval webhook might legitimately wait for hours.

### Alert Channels

The alert routing logic:

```typescript
async function postAlert(
  customer: Customer,
  incident: Incident,
  options: { severity: string; message: string }
): Promise<void> {
  const policy = customer.policy;
  const shouldAlert = policy.alert_on_severity.includes(options.severity);
  const shouldDigest = policy.digest_on_severity.includes(options.severity);

  if (!shouldAlert && !shouldDigest) return; // below configured threshold

  // Rate limit guard
  const alertsThisHour = await countAlertsLastHour(customer.id);
  if (alertsThisHour >= policy.alert_rate_limit_per_hour) {
    // Still write the incident — just suppress the real-time ping
    await appendToDigestQueue(customer.id, incident);
    return;
  }

  if (shouldAlert) {
    if (policy.alert_email) await sendEmail(policy.alert_email, incident, options);
    if (policy.alert_slack_webhook_url) await sendSlack(policy.alert_slack_webhook_url, incident, options);
    if (policy.pagerduty_routing_key && options.severity === 'CRITICAL') {
      await sendPagerDuty(policy.pagerduty_routing_key, incident, options);
    }
  }
}
```

**Alert rate limiting:** If a customer's n8n instance has a systemic failure (worker crash causing 40+ workflow errors in one hour), the agent will alert on the first 10, then batch the rest into the next digest. This prevents alert flooding that causes humans to ignore real alerts.

### Workflow Scope

```typescript
function shouldMonitorWorkflow(
  customer: Customer,
  workflowId: string
): boolean {
  const policy = customer.policy;

  // Always skip explicitly excluded workflows
  if (policy.excluded_workflow_ids.includes(workflowId)) return false;

  if (policy.monitor_all_workflows) return true;
  return policy.monitored_workflow_ids?.includes(workflowId) ?? false;
}
```

Use `excluded_workflow_ids` for workflows that are intentionally noisy (e.g. test workflows that fail often) or for workflows the customer manages independently.

### DB Access

`allow_db_queries = false` by default. When false, `query_n8n_db` throws before executing any SQL. The customer must explicitly opt in, which also requires them to have provided an `n8n_db_connection_string_encrypted` during onboarding.

Even when enabled:
- Only SELECT statements are permitted (enforced at the runtime layer, not just by policy)
- Only the four allowed tables: `execution_entity`, `execution_data`, `workflow_entity`, `credentials_entity`
- Timeout and row caps from the policy apply

---

## Default Policy Object

```typescript
const DEFAULT_POLICY: CustomerPolicy = {
  allow_auto_retry:                   true,
  allow_auto_refresh:                 true,
  allow_auto_cancel_replay:           false,
  allow_stop_execution:               false,
  revenue_workflows_require_approval: true,
  revenue_tag_name:                   'revenue:true',
  max_auto_retry_attempts:            3,
  retry_backoff_base_seconds:         30,
  retry_backoff_multiplier:           2.0,
  retry_backoff_max_seconds:          3600,
  stuck_execution_threshold_minutes:  30,
  stuck_webhook_threshold_minutes:    60,
  alert_on_severity:                  ['CRITICAL', 'HIGH', 'MEDIUM'],
  digest_on_severity:                 ['LOW'],
  alert_rate_limit_per_hour:          10,
  monitor_all_workflows:              true,
  monitored_workflow_ids:             null,
  excluded_workflow_ids:              [],
  allow_db_queries:                   false,
  db_query_timeout_seconds:           30,
  db_max_rows_returned:               10000,
  daily_digest_enabled:               true,
  daily_digest_time_utc:              '08:00',
  weekly_digest_enabled:              true,
  weekly_digest_day:                  1,
};
```

---

## Policy Check Order in dispatchAction()

The safety layer checks policies in this order. The first blocking check wins:

```
1. tools/safety-rules.md hard prohibitions  (always — not customer-configurable)
2. policy.allow_<action>                     (is this action class permitted at all?)
3. isBlockedByRevenuePolicy()               (revenue:true gate)
4. attempt count vs. max_auto_retry_attempts (stop-condition gate)
5. shouldMonitorWorkflow()                   (is this workflow in scope?)
```

If any check fails, the action is blocked. The incident is still written to the store with `status=open`. A `notify-human` is always permitted regardless of policy — it never requires authorization because it is not a write action.

---

## Onboarding: Creating a Policy Record

```sql
-- Run immediately after INSERT INTO n8n_customers
INSERT INTO n8n_customer_policy (customer_id, alert_email)
VALUES ($customer_id, $notify_email);
-- All other fields take their defaults
```

The onboarding API should expose a settings page where customers can adjust:
- Action permissions (auto-retry, auto-cancel-replay, stop-execution toggles)
- Stuck execution thresholds
- Alert severity routing
- Workflow exclusion list
- DB query access opt-in

---

## Cross-References

`tools/safety-rules.md` — hard prohibitions that override policy  
`tools/agent-tools.md` — tool definitions that reference policy gates  
`runtime-architecture.md` section 6 — dispatchAction() where policy checks run  
`runtime-architecture.md` section 9 — onboarding flow that creates the policy record
