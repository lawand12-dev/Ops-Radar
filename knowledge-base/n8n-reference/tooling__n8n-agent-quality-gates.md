# n8n Agent Quality Gates

**Purpose:** Review checklist for changes to the n8n agent package. Use this when adding cases, evals, decision-tree leaves, customer policy rules, workflow-generation behavior, or runtime tool contracts.

This file does not define new diagnosis behavior. It defines the gates a change must pass before the agent should be considered stronger.

---

## Non-Negotiable Rule

A change is not complete if it only helps the model sound smarter. It must improve at least one of:

- diagnosis accuracy
- action safety
- evidence quality
- runtime enforceability
- workflow-generation correctness
- eval coverage
- engineer debuggability

---

## Case File Gates

Every new `cases/*.md` file must answer:

- What exact input shape triggers this case?
- What signals confirm it?
- What signals rule it out?
- What evidence keys must appear in the incident record?
- What action is safe by default?
- What action is forbidden even when confidence is high?
- What should the customer or engineer do next?
- What prevention advice belongs in digests or reports?

Required sections:

```text
## Input
## Signals
## Non-signals / false positives
## Diagnosis
## Auto-handle safety
## Fix
## Prevention
## Evidence keys
## Escalation message
## Cross-references
```

Reject a case if it has a fix but no explicit auto-handle safety. That is how unsafe actions sneak in.

---

## Monitoring Eval Gates

Every monitoring eval must fail if the agent chooses an unsafe action, even when the label is correct.

Required front matter:

```yaml
scenario_id:
domain:
difficulty: easy|medium|hard
ground_truth_label:
ground_truth_action:
created:
provenance:
```

Required expected-output fields:

```yaml
expected_label:
expected_subtype:
expected_confidence:
expected_action:
expected_evidence_keys:
expected_case_loaded:
forbidden_actions:
```

Strong evals include at least one discriminator: a field that rules out a plausible but wrong diagnosis. Examples:

- `x-app-usage` rules out app-level Meta rate limit.
- credential age rules out refreshable OAuth access-token expiry.
- workflow tags rule out auto-replay.
- preserved headers/body rule out webhook signature replay.
- prior failures rule out transient network noise.

Reject an eval if it can be passed by matching only `error.message`.

---

## Generation Eval Gates

Every workflow-generation eval must verify both workflow shape and operational safety.

Required checks:

- pattern selected correctly;
- node sequence is plausible;
- credential placeholders are present and secrets are absent;
- webhook payload paths use `.body` when appropriate;
- expressions use `{{ }}` and exact node names;
- Code nodes return `[{ json: ... }]`;
- workflow has error handling or explicit notes explaining why not;
- deployment and activation are gated behind approval;
- validation status is included.

Reject a generation eval if it only checks that a workflow was produced. A bad workflow JSON is worse than no workflow.

---

## Decision Tree Gates

A new decision-tree leaf must include:

- exact label;
- target case/playbook/tree;
- confidence expectation;
- at least one positive match condition;
- at least one fallback or disambiguation route when evidence is weak.

Fallback leaves must never auto-handle. They should route through a case such as `cases/unknown-failure.md` so the alert still has structure and evidence requirements.

---

## Customer Policy Gates

Any policy schema must be enforceable by runtime code. Avoid policy fields that are vague or only advisory.

Good policy fields:

- booleans;
- numbers with units;
- explicit tags;
- explicit action allowlists/denylists;
- severity thresholds;
- channel identifiers;
- approval requirements.

Bad policy fields:

- "be careful"
- "important workflow"
- "retry when reasonable"
- "notify if bad"

For each policy field, define:

- type;
- default;
- who controls it;
- what runtime gate reads it;
- what happens when the value is missing.

---

## Runtime Tool Gates

Every tool contract must define:

- purpose;
- input schema;
- output schema;
- safety class;
- authorization scope;
- rate/size limits;
- audit behavior;
- failure behavior.

Soft-write and hard-write tools must name the exact policy gates that can block them.

---

## Workflow Authoring Gates

Generated or repaired workflows must:

- prefer templates/examples before novel graphs;
- use full node type names in workflow JSON;
- explicitly set behavior-critical fields;
- preserve existing node names, credentials, and IDs during repair unless changing them is necessary;
- validate node configs before whole-workflow validation;
- include credential requirements;
- explain deployment/activation gates.

The workflow-generation playbook is allowed to output "not ready to deploy" when credentials, target instance, or side-effect approval is missing.

---

## Review Questions

Before merging n8n-agent changes, ask:

1. Would this change have prevented a real wrong action?
2. Can an engineer reproduce the diagnosis from the evidence keys?
3. Does the runtime have enough structure to enforce the safety rule?
4. Does the eval fail for the common wrong answer?
5. Does the new knowledge route to one specific file, or does it encourage loading everything?
6. Does the change make workflow generation safer, not just more confident?
