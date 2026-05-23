# Playbook: Improve the Agent From Feedback

**Type:** Procedure (post-incident and post-generation learning loop)  
**When to run:** After an engineer corrects a diagnosis, a customer reports a bad alert, an eval fails, a generated workflow is rejected, or a runtime safety guard blocks an attempted action  
**Inputs:** incident record, agent output, tool trace, engineer/customer correction, final outcome, optional workflow JSON or failed eval result  
**Outputs:** one or more updates to evals, cases, decision trees, playbooks, policy, tooling maps, or runtime gates  
**Updated:** 2026-05-07

## Goal

Turn real mistakes into durable agent improvements without bloating the knowledge base.

The agent does not get smarter because the model "remembers." It gets smarter because confirmed corrections become evals, cases, decision-tree changes, playbook changes, policy gates, or runtime safety checks.

## Step 1 — Capture the Correction

Record the smallest complete correction package:

```jsonc
{
  "source": "production-incident|eval-failure|workflow-generation-review|runtime-safety-block|customer-report",
  "incident_id": "...",
  "agent_label": "...",
  "agent_action": "...",
  "agent_confidence": "low|medium|high",
  "engineer_label": "...",
  "engineer_action": "...",
  "engineer_notes": "...",
  "wrong_behavior": "wrong-label|wrong-action|missing-evidence|unsafe-tool|bad-workflow-json|bad-alert",
  "evidence_the_agent_missed": {},
  "tool_trace": []
}
```

If the correction contains customer secrets, redact them before writing any eval or case.

## Step 2 — Classify the Fix Type

Choose the smallest durable fix:

| Problem | Preferred fix |
|---|---|
| Correct label exists but agent missed it | Add or improve an eval |
| Pattern is repeated and well understood | Add or update a case file |
| Routing is wrong before case loading | Update `decision-trees/failure-diagnosis.md` or `error-classification.md` |
| Action is unsafe despite correct label | Update `decision-trees/recovery-routing.md`, case auto-handle safety, or `tools/safety-rules.md` |
| Runtime allowed a forbidden call | Add a runtime safety gate and document it in `tools/safety-rules.md` |
| Behavior differs by customer tolerance | Add/adjust `tools/customer-policy.md` |
| Generated workflow is structurally bad | Add a generation eval and update `playbooks/generate-workflow.md` or `reference/tooling/n8n-tooling-map.md` |
| Alert is confusing or missing evidence | Update `playbooks/report-to-agency.md` and evidence keys |

Do not solve a local routing bug by dumping broad docs into `reference/`.

## Step 3 — Promote to an Eval First

When possible, write or update an eval before changing the behavior.

Monitoring evals must include:

- `expected_label`
- `expected_subtype`
- `expected_confidence`
- `expected_action`
- `expected_evidence_keys`
- `expected_case_loaded`
- `forbidden_actions`

Generation evals must include:

- expected workflow pattern;
- required nodes;
- credential requirements;
- expression/data-path requirements;
- validation expectations;
- deployment/activation gates.

The eval should fail for the common wrong answer that caused the correction.

## Step 4 — Patch the Knowledge or Procedure

Patch exactly the layer that caused the failure:

- `cases/` for precise known patterns.
- `decision-trees/` for routing.
- `playbooks/` for procedures.
- `tools/` for contracts, safety, and policy.
- `reference/tooling/` for lookup maps and review gates.
- `reference/n8n-*` or `reference/api/` only when missing factual reference caused the failure.

Keep changes narrow. If one new case fixes it, do not rewrite the whole tree.

## Step 5 — Run Quality Gates

Before accepting the improvement, read:

- `reference/tooling/n8n-agent-quality-gates.md`
- `evals/eval-harness.md`

Reject the update if:

- the eval can pass by matching only `error.message`;
- the case lacks auto-handle safety;
- the fix makes the agent more confident without making it safer;
- the runtime could not enforce the new policy;
- a generated workflow can deploy/activate without explicit approval.

## Step 6 — Update the Runtime Contract if Needed

If the improvement depends on data the runtime does not currently provide, update the relevant contract:

- `tools/agent-tools.md` for tool input/output shape.
- `tools/customer-policy.md` for per-customer settings.
- `runtime-architecture.md` for context loading, incident schema, or dispatch behavior.

Never assume the LLM can use evidence that the runtime does not collect.

## Step 7 — Record the Result

The final improvement record should name:

- the original incident/eval;
- files changed;
- expected behavior before;
- expected behavior after;
- safety impact;
- evals added or updated.

This makes future CTO review possible without reconstructing the reasoning from chat history.

## Cross-references

`evals/eval-harness.md` · `reference/tooling/n8n-agent-quality-gates.md` · `playbooks/diagnose-workflow-failure.md` · `playbooks/generate-workflow.md` · `tools/safety-rules.md` · `tools/customer-policy.md`
