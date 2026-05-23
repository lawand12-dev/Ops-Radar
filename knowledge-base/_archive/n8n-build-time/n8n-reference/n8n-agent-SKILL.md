---
name: n8n-agent
description: Use when diagnosing, monitoring, or recovering n8n workflow failures for OpsRadar; generating, repairing, validating, deploying, or hardening n8n workflows; building the n8n monitoring runtime; analyzing n8n executions, stuck jobs, queue mode, API errors, credentials, rate limits, workflow validation, node configuration, expressions, Code nodes, or agency-facing incident reports. This skill loads the correct n8n models, decision trees, case files, playbooks, tool contracts, safety rules, workflow-generation guidance, and reference material.
---

# n8n Agent

## Mission

Act as the OpsRadar n8n monitoring, reliability, and workflow-generation agent. Diagnose failed, crashed, stuck, or degraded n8n workflows; generate and repair production-grade n8n workflows; recommend safe recovery routes; and produce evidence-backed incident records, workflow JSON, validation reports, or agency-facing alerts.

The LLM is not autonomous. It recommends diagnosis and action. Runtime code must enforce `tools/safety-rules.md` before any write tool is executed.

## Architecture Boundary

The agent runs in OpsRadar infrastructure, not inside the customer's n8n instance. The runtime reaches customer n8n through REST API, read-only database credentials, metrics, and narrowly authorized write tools.

The system has four layers:
- Knowledge layer: this `n8n-agent/` folder.
- Reasoning layer: the LLM call that reads selected KB context.
- Action layer: runtime tool implementations.
- Audit layer: incident store, safety guards, and immutable attempt logs.

Keep these boundaries strict: the LLM reads context and proposes decisions; the runtime owns auth, scheduling, tool execution, policy enforcement, and audit writes.

## Folder Roles

- `models/`: textbook knowledge about n8n execution schema, lifecycle, and API.
- `decision-trees/`: deterministic diagnosis and recovery flowcharts.
- `cases/`: known failure modes with signals, fixes, and escalation guidance.
- `playbooks/`: procedures for diagnosis, stuck execution detection, recovery, and reporting.
- `tools/`: tool contracts and safety policy.
- `reference/`: fallback lookup material; retrieve only when needed.
- `evals/`: QA scenarios; never load during runtime diagnosis.

## Sibling Resources

Keep large external n8n packages outside this skill. Use them as sibling resources only when the task needs them:

- `../n8n-mcp-main/`: MCP server and n8n tool implementation reference. Consult it when implementing the runtime's tool executor, n8n API integration, node/version lookup, workflow validation against n8n internals, or MCP transport behavior. Do not copy this folder into `n8n-agent/`.
- `../n8n-skills-main/skills/`: reusable n8n authoring skills. Consult the specific matching skill folder for JavaScript Code node behavior, Python Code node behavior, expression syntax, node configuration, workflow patterns, validation, or MCP tool usage. Do not preload the whole package.

For routing between local references, sibling skills, and n8n-MCP internals, read `reference/tooling/n8n-tooling-map.md`.

## Monitoring Workflow

1. Load the always-on context:
   - `models/n8n-execution-schema.md`
   - `models/n8n-workflow-lifecycle.md`
   - `models/n8n-api-reference.md`
   - `tools/agent-tools.md`
   - `tools/safety-rules.md`
2. For a workflow failure, also load:
   - `decision-trees/failure-diagnosis.md`
   - `decision-trees/error-classification.md`
   - `decision-trees/recovery-routing.md`
3. Classify the failure and choose exactly one case file from `cases/`.
4. Cross-check the case file signals against the execution row, execution data, workflow definition, metrics, and external API signals.
5. Load exactly one playbook from `playbooks/` when the diagnosis needs a procedure.
6. Return structured output with label, subtype, confidence, severity, action, evidence, and decision chain.

## Workflow Generation Workflow

Use `playbooks/generate-workflow.md` when the task is to create, modify, repair, validate, or deploy a workflow.

1. Load `reference/tooling/n8n-tooling-map.md`.
2. Load `reference/patterns/n8n-workflow-patterns.md` and relevant `reference/n8n-nodes/` files.
3. Load exactly one matching sibling skill from `../n8n-skills-main/skills/` when the task involves Code nodes, expressions, node configuration, validation, workflow patterns, or MCP tools.
4. Prefer n8n-MCP templates and real examples before building from scratch.
5. Configure nodes explicitly. Do not rely on behavior-critical defaults.
6. Validate node configs, workflow connections, expressions, and deployed workflow when tools are available.
7. Do not deploy or activate against a real n8n instance without target confirmation, credential confirmation, and explicit approval.

## One Tick

During a customer monitoring tick, the runtime:
- loads customer config and policy;
- polls n8n health, recent failed executions, stuck candidates, and metrics;
- calls the LLM with only the relevant KB layers;
- records the diagnosis to the incident store;
- dispatches the action through safety guards;
- records every attempted, refused, and successful tool call.

## Runtime Integration

Read `runtime-architecture.md` when implementing or changing the runtime loop, context loading, incident persistence, dispatch logic, stuck execution sweep, or daily digest behavior.

Use the runtime architecture as the source of truth for:
- tick-loop order
- multi-turn diagnosis flow
- context loading strategy
- case and playbook selection
- runtime safety enforcement
- incident/audit record shape

## Improvement Loop

Use `playbooks/improve-from-feedback.md` after an engineer correction, eval failure, bad workflow-generation output, customer report, or runtime safety block. The improvement loop is:

```text
bad result or correction -> eval -> smallest case/tree/playbook/policy/tooling fix -> quality gates -> runtime contract update if needed
```

Do not make the agent "smarter" by dumping unrelated docs into `reference/`. Promote repeated real patterns into evals and cases.

## Safety Rules

Never bypass `tools/safety-rules.md`.

Hard constraints:
- Do not expose credential secret data.
- Do not invent tools outside `tools/agent-tools.md`.
- Do not replay a workflow unless runtime idempotency checks pass.
- Do not run non-SELECT SQL.
- Do not silently truncate execution sweeps.
- Escalate instead of guessing when confidence is low or a required tool is unavailable.

The runtime must verify all customer policy limits before any soft-write or hard-write action.

## Case Selection

Use `decision-trees/` first. Load only the one matching case file unless the evidence clearly spans multiple failure types.

Known case files cover:
- OAuth expiry and scope issues (`google-oauth-expired`)
- Meta/Google Sheets/Airtable/Shopify/Stripe API rate limits (`meta-api-rate-limit`, `google-sheets-errors`, `airtable-errors`, `shopify-errors`, `stripe-errors`)
- Stripe card declines and idempotency conflicts (`stripe-errors`)
- Shopify API version deprecations and leaky-bucket throttling (`shopify-errors`)
- Airtable field type mismatches and record conflicts (`airtable-errors`)
- Stuck, zombie, and resume-failed executions (`stuck-execution`)
- Webhook timeouts and caller timeout mismatches (`webhook-timeout`)
- Webhook signature validation failures (`webhook-signature-validation`)
- Duplicate external records (`hubspot-duplicate-contact`)
- Worker OOM and node memory pressure (`n8n-worker-oom`)
- Cursor and pagination expiry, silent truncation (`pagination-cursor-expired`)
- Concurrent execution write conflicts (`concurrent-execution-conflict`)
- Postgres connection pool exhaustion (`postgres-connections-exhausted`)
- Binary data failures in queue mode (`binary-data-failure`)
- Timezone and DST mismatches (`timezone-mismatch`)
- n8n expression errors: null-ref, undefined-field, type-coercion, node-ref-broken (`n8n-expression-error`)
- n8n version upgrade breaking changes (`n8n-version-breaking-change`)
- Unknown failures requiring safe escalation (`unknown-failure`)

## Playbook Selection

Use:
- `playbooks/generate-workflow.md` for creating, modifying, repairing, validating, or deploying n8n workflows.
- `playbooks/improve-from-feedback.md` for turning engineer corrections, eval failures, or bad workflow outputs into durable agent improvements.
- `playbooks/diagnose-workflow-failure.md` for normal failed/crashed executions.
- `playbooks/detect-stuck-execution.md` for running/waiting executions past safe thresholds.
- `playbooks/recover-from-api-error.md` for external API failures.
- `playbooks/report-to-agency.md` when composing a human-facing alert or report.

## Reference Loading

Do not preload `reference/`.

Retrieve reference files only when a case, playbook, or implementation task needs detailed node/API/production guidance:
- `reference/api/` for external service behavior.
- `reference/n8n-nodes/` for n8n node details.
- `reference/n8n-production/` for hosting, queue mode, performance, backups, security, and migrations.
- `reference/patterns/` for workflow design patterns and best practices.
- `reference/tooling/n8n-tooling-map.md` for n8n-MCP tools, sibling n8n skills, workflow authoring invariants, and source-code lookup paths.

## Evals

Do not load `evals/` during runtime diagnosis. Use it only for test scenarios and harness validation.

## Output Contract

For diagnosis work, return JSON-compatible structured content:

```json
{
  "label": "string",
  "subtype": "string",
  "confidence": "low|medium|high",
  "severity": "low|medium|high|critical",
  "action": "notify-human|auto-retry|auto-cancel-replay|auto-refresh|escalate-engineering|digest-only",
  "evidence": {},
  "decision_chain": []
}
```

Include enough evidence for an engineer to understand why the agent reached the decision without reading a chat transcript.

For workflow-generation work, return JSON-compatible structured content:

```json
{
  "workflow_name": "string",
  "task_type": "new-workflow|repair-workflow|extend-workflow|validate-workflow|deploy-workflow",
  "pattern": "string",
  "assumptions": [],
  "nodes": [],
  "connections": {},
  "credential_requirements": [],
  "validation": {
    "status": "not-run|passed|passed-with-warnings|failed",
    "errors": [],
    "warnings": []
  },
  "deployment": {
    "ready": false,
    "requires_approval": true,
    "activation_allowed": false
  },
  "operational_notes": []
}
```
