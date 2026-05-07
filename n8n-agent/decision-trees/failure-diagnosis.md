# Master Failure Diagnosis Tree

**Type:** Decision tree (machine-readable)
**Audience:** n8n monitoring agent
**Inputs:** A single `execution_entity` row + (optionally) its `execution_data.data`
**Outputs:** A diagnosis label and a routing target (case file or playbook)
**Updated:** 2026-05-07

## How to walk this tree

The agent loads this file as compact in-context reference, traverses it deterministically with the inputs in hand, and emits a single label (e.g. `auth.refresh-expired`) plus the next handler. **Stop at the first match.** If no leaf matches, route to `cases/unknown-failure` with confidence=low.

## Inputs (variables used below)

| Var | Source | Type |
|---|---|---|
| `status` | `execution_entity.status` | enum |
| `mode` | `execution_entity.mode` | enum |
| `started_at`, `stopped_at`, `wait_till`, `now` | timestamps | |
| `error.name` | `data.resultData.error.name` | string |
| `error.message` | `data.resultData.error.message` | string |
| `error.httpCode` | `data.resultData.error.httpCode` | string/number |
| `error.node` | `data.resultData.error.node` | string |
| `last_node` | `data.resultData.lastNodeExecuted` | string |

## Tree

```
ROOT
├── status = "running"
│   ├── now − started_at > workflow.executionTimeout
│   │   → label: stuck.timeout-exceeded
│   │   → next:  playbooks/detect-stuck-execution
│   └── now − started_at > 15 min  AND  mode ∈ {trigger, webhook, integrated}
│       → label: stuck.zombie-suspected
│       → next:  playbooks/detect-stuck-execution
│
├── status = "waiting"
│   └── wait_till IS NOT NULL  AND  now > wait_till + 5 min
│       → label: stuck.resume-failed
│       → next:  playbooks/detect-stuck-execution
│
├── status = "crashed"
│   → label: infra.worker-died
│   → next:  playbooks/detect-stuck-execution  (replay if idempotent)
│
├── status = "error"
│   ├── error.name = "NodeApiError"
│   │   ├── error.httpCode IN {401, 403}
│   │   │   ├── error.message MATCHES /invalid_grant|expired|refresh.*token/i
│   │   │   │   → label: auth.refresh-expired
│   │   │   │   → next:  cases/google-oauth-expired
│   │   │   ├── error.message MATCHES /scope|insufficient.*permission/i
│   │   │   │   → label: auth.scope-insufficient
│   │   │   │   → next:  decision-trees/recovery-routing  (no auto-fix)
│   │   │   ├── error.message MATCHES /signature|hmac|webhook.secret|invalid.payload/i
│   │   │   │   → label: webhook.signature-invalid
│   │   │   │   → next:  cases/webhook-signature-validation
│   │   │   └── DEFAULT
│   │   │       → label: auth.unauthorized
│   │   │       → next:  decision-trees/error-classification
│   │   ├── error.httpCode = 429
│   │   │   ├── error.node CONTAINS "facebook"|"meta"
│   │   │   │   → label: ratelimit.meta-buc
│   │   │   │   → next:  cases/meta-api-rate-limit
│   │   │   └── DEFAULT
│   │   │       → label: ratelimit.generic
│   │   │       → next:  playbooks/recover-from-api-error
│   │   ├── error.httpCode IN {408, 504, 524}
│   │   │   → label: timeout.upstream
│   │   │   → next:  cases/webhook-timeout
│   │   ├── error.httpCode = 409
│   │   │   ├── error.node CONTAINS "hubspot"
│   │   │   │   → label: data.duplicate-hubspot
│   │   │   │   → next:  cases/hubspot-duplicate-contact
│   │   │   └── DEFAULT
│   │   │       → label: data.conflict
│   │   │       → next:  decision-trees/recovery-routing
│   │   ├── error.httpCode = 422
│   │   │   → label: data.validation-failed
│   │   │   → next:  decision-trees/recovery-routing
│   │   ├── error.httpCode IN {500, 502, 503}
│   │   │   → label: upstream.server-error
│   │   │   → next:  playbooks/recover-from-api-error
│   │   └── DEFAULT
│   │       → label: api.uncategorized
│   │       → next:  decision-trees/error-classification
│   │
│   ├── error.name = "ExpressionError"
│   │   → label: expression.error
│   │   → next:  cases/n8n-expression-error
│   │
│   ├── error.name = "NodeOperationError"
│   │   ├── error.message MATCHES /\$json\.|Cannot read prop|undefined is not|null is not|not a function|is not defined|\$node\[/i
│   │   │   → label: expression.null-ref
│   │   │   → next:  cases/n8n-expression-error
│   │   ├── error.message MATCHES /Binary data|ENOENT.*n8n-binary-data|binary.*not found/i
│   │   │   → label: infra.binary-data-failure
│   │   │   → next:  cases/binary-data-failure
│   │   ├── error.message MATCHES /signature|hmac|Webhook Error|WebhookAuthorizationError/i
│   │   │   → label: webhook.signature-invalid
│   │   │   → next:  cases/webhook-signature-validation
│   │   ├── error.message MATCHES /pool.*exhausted|connection.*pool|too many connections|remaining connection slots/i
│   │   │   → label: infra.db-connections-exhausted
│   │   │   → next:  cases/postgres-connections-exhausted
│   │   └── DEFAULT
│   │       → label: workflow.logic-error
│   │       → next:  decision-trees/error-classification
│   │
│   ├── error.name = "WorkflowOperationError"
│   │   → label: workflow.config-or-expression
│   │   → next:  decision-trees/error-classification
│   │
│   ├── error.message MATCHES /ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/
│   │   → label: network.transient
│   │   → next:  playbooks/recover-from-api-error
│   │
│   ├── error.message MATCHES /ENOMEM|out of memory|JavaScript heap/
│   │   → label: infra.worker-oom
│   │   → next:  cases/n8n-worker-oom
│   │
│   ├── error.message MATCHES /ENOENT.*n8n-binary-data|Binary data.*not found/i
│   │   → label: infra.binary-data-failure
│   │   → next:  cases/binary-data-failure
│   │
│   ├── error.message MATCHES /pool.*exhausted|connection.*pool|too many connections|remaining connection slots/i
│   │   → label: infra.db-connections-exhausted
│   │   → next:  cases/postgres-connections-exhausted
│   │
│   └── DEFAULT  (confidence: low — no pattern matched)
│       → label: error.unknown
│       → next:  cases/unknown-failure
│
└── status = "success"
    ├── data.resultData.runData.<any-node>.error IS NOT NULL
    │   → label: silent.partial-failure
    │   → next:  decision-trees/error-classification  (then human review)
    │
    └── external_signals.data_quality_anomaly IS NOT NULL
        │   (triggered by proactive data-quality sweep, not error-watcher)
        ├── external_signals.data_quality_anomaly.type = "count-truncation"
        │   AND external_signals.n8n_getall_hard_cap IS NOT NULL
        │   → label: data.pagination-silent-truncation
        │   → next:  cases/pagination-cursor-expired
        └── DEFAULT
            → label: data.quality-anomaly
            → next:  decision-trees/error-classification
```

## Routing semantics

A `next:` value beginning with:

- `cases/...` — the agent loads that case file and follows the **Fix** section. Cases include `Prevention` advice the agent should add to the customer report.
- `playbooks/...` — the agent runs the procedure step-by-step.
- `decision-trees/...` — the agent walks a deeper sub-tree.
- `escalate.<reason>` — the agent emits an alert with collected context and stops auto-handling.

## Confidence

Every leaf carries an implicit confidence. The agent reports:

- **High** — leaf matched on `error.name` AND `httpCode` AND `error.node` pattern. Auto-handle if the case file allows.
- **Medium** — leaf matched on `httpCode` only, or message regex on a generic field. Auto-handle if the case file's `Fix` is read-only / additive (no destructive action).
- **Low** — `DEFAULT` leaves. Always escalate; never auto-handle.

The `cases/<name>` files declare their `Fix` safety in the `Fix` section. The agent must respect that declaration, not infer.

## Label → Case File Map

For quick lookup — the runtime uses this to resolve `next: cases/<name>`:

| Label | Case File |
|---|---|
| `auth.refresh-expired` | `cases/google-oauth-expired.md` |
| `auth.scope-insufficient` | `cases/google-oauth-expired.md` |
| `ratelimit.meta-buc` | `cases/meta-api-rate-limit.md` |
| `ratelimit.generic` | (playbook, no case) |
| `timeout.upstream` | `cases/webhook-timeout.md` |
| `data.duplicate-hubspot` | `cases/hubspot-duplicate-contact.md` |
| `data.concurrent-write-conflict` | `cases/concurrent-execution-conflict.md` |
| `data.pagination-silent-truncation` | `cases/pagination-cursor-expired.md` |
| `expression.error` | `cases/n8n-expression-error.md` |
| `expression.null-ref` | `cases/n8n-expression-error.md` |
| `webhook.signature-invalid` | `cases/webhook-signature-validation.md` |
| `infra.worker-oom` | `cases/n8n-worker-oom.md` |
| `infra.worker-died` | `cases/stuck-execution.md` |
| `infra.binary-data-failure` | `cases/binary-data-failure.md` |
| `infra.db-connections-exhausted` | `cases/postgres-connections-exhausted.md` |
| `stuck.zombie-suspected` | `cases/stuck-execution.md` |
| `stuck.timeout-exceeded` | `cases/stuck-execution.md` |
| `stuck.resume-failed` | `cases/stuck-execution.md` |
| `data.timezone-mismatch` | `cases/timezone-mismatch.md` |
| `error.unknown` | `cases/unknown-failure.md` |

## Cross-references

`decision-trees/error-classification` · `decision-trees/recovery-routing` · all `cases/` · `playbooks/diagnose-workflow-failure`
