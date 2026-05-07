# Eval Harness

**Type:** Test methodology + runner spec
**Audience:** the engineer running evals; the agent runtime when self-grading
**Updated:** 2026-05-07

## Purpose

The agent's quality is **not** "did the customer's workflow recover" — that's outcome bias; sometimes the workflow self-heals or the engineer fixes it independently. The agent's quality is **"did the agent reach the correct diagnosis with the correct action."** That requires labeled scenarios with ground truth.

This file defines the eval format and the metrics. Each scenario file in this folder is a replayable input → expected-output mapping the agent must satisfy.

## Scenario file format

Every scenario file in `evals/` follows this exact structure:

```yaml
---
scenario_id: <unique-slug>
domain: <category>          # e.g. "auth", "ratelimit", "infra", "data"
difficulty: easy|medium|hard
ground_truth_label: <label> # the correct decision-tree leaf label
ground_truth_action: <action>
created: YYYY-MM-DD
provenance: <where this real failure came from — production, n8n forum, GitHub issue>
---

## Inputs

# What the agent receives — exactly the shape it would see in production.
# Use the get_execution / query_n8n_db / get_metrics return shapes from tools/agent-tools.

execution_row:        { ... }
execution_data:       { ... }
workflow_definition:  { ... }
metrics_snapshot:     { ... }
external_signals:     { ... }   # caller dashboards, customer-reported facts
prior_failures:       [ ... ]   # for stop-condition tests

## Expected output

expected_label:       <string>
expected_subtype:     <string>
expected_confidence:  high|medium|low
expected_action:      auto-retry|auto-refresh|auto-cancel-replay|notify-human|escalate-engineer
expected_evidence_keys: [ ... ]   # the agent's evidence object must contain these keys
expected_case_loaded:  <case-file-name>  # which cases/*.md the agent should consult
forbidden_actions:    [ ... ]     # actions that would be wrong even if other checks pass

## Grading rubric

# How a run is scored.
- label_match:         exact string match on label
- subtype_match:       exact match on subtype
- action_match:        exact match on action
- evidence_keys_present:  every key in expected_evidence_keys appears in agent.evidence
- case_consultation:   the agent's tool-use trace shows reading expected_case_loaded
- no_forbidden_actions: agent did not invoke any tool with side-effects matching forbidden_actions
```

## Metrics

For each scenario run, record per-axis pass/fail. Overall agent score is composed:

| Axis | Weight |
|---|---|
| `label_match` | 30% |
| `action_match` | 30% |
| `subtype_match` | 15% |
| `evidence_keys_present` | 15% |
| `case_consultation` | 10% |

`forbidden_actions` is a **hard fail** regardless of other axes — if the agent did something it shouldn't, the scenario score is 0.

## Aggregate metrics across scenarios

| Metric | Definition | Target |
|---|---|---|
| **Diagnostic accuracy** | % of scenarios with `label_match=true` | ≥ 95% on `easy`, ≥ 85% on `medium`, ≥ 70% on `hard` |
| **Action correctness** | % with `action_match=true` | ≥ 90% on `easy`, ≥ 80% on `medium`, ≥ 65% on `hard` |
| **Evidence completeness** | mean evidence-key recall | ≥ 0.90 |
| **No-forbidden-action rate** | % with no forbidden actions | 100% on every difficulty |
| **Calibration** | when agent says `high` confidence, how often is it right | high → ≥ 0.95, medium → ≥ 0.75 |

100% on no-forbidden-action is non-negotiable. Anything less means the runtime's safety guards (`tools/safety-rules`) need tightening — the LLM cannot be the only guardrail.

## Scenario sourcing

New scenarios come from three places:

1. **Real production incidents** the agent has handled, where engineering has confirmed (or corrected) the diagnosis. These are the highest-value scenarios — the eval set should be biased toward them. After each incident, add a scenario file.

2. **Public sources** — n8n community forum threads, GitHub issues with rich error logs, vendor changelogs. Less authentic but cheap and catches known patterns.

3. **Adversarial / synthetic** — deliberately constructed edge cases (DST boundary, multiple-platform failures combined, ambiguous error messages). Useful for stress-testing the agent's calibration.

Each scenario is tagged with provenance so trends across types can be analyzed.

## How to run

The runner (separate program; spec only here):

1. Loads each `evals/scenario-*.md` file, parses front matter and inputs.
2. Composes a synthetic n8n environment from the inputs — the runtime tools are mocked to return the values from the scenario file.
3. Runs the agent loop for one tick using these inputs as the customer's state.
4. Captures the agent's full tool-use trace and final outputs (label, action, evidence).
5. Grades against the scenario's expected output. Writes a per-scenario result row plus an aggregate report.

## Disagreement handling

When the agent's diagnosis disagrees with the engineer in production (a real incident, not a scenario), record the disagreement:

```jsonc
// evals/disagreements/2026-05-07-incident-12345.json
{
  "incident_id": "...",
  "agent_label": "auth.refresh-expired",
  "agent_action": "auto-refresh",
  "engineer_label": "auth.scope-insufficient",
  "engineer_action": "notify-human",
  "engineer_notes": "Refresh token was fine; the user's admin had removed the calendar scope from the workspace."
}
```

After N disagreements (suggested: 5) with a common pattern, promote one to `evals/scenario-<slug>.md` with the engineer-corrected ground truth. The agent's calibration improves only if this loop is closed.

## Anti-patterns

- **Don't grade the eval against the production outcome** ("the workflow recovered, so the agent passed"). The workflow may have recovered for the wrong reason.
- **Don't allow the agent to read `evals/` at runtime.** Test contamination ruins calibration data.
- **Don't grade only on `label_match`.** A correct label with a wrong action (auto-retry on a non-idempotent workflow) is worse than a wrong label that defaults to `notify-human`.
- **Don't mix difficulties in aggregate stats**. An agent at 85% overall could be 99% on `easy` and 30% on `hard` — different stories, different fixes.

## Cross-references

`playbooks/diagnose-workflow-failure` (the procedure being graded) · `decision-trees/recovery-routing` (the rules being verified) · `tools/safety-rules` (forbidden_actions enforcement)
