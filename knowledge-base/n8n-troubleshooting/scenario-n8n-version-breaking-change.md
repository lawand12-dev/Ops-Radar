---
scenario_id: n8n-version-breaking-change-silent-field-rename
domain: infra
difficulty: medium
ground_truth_label: expression.null-ref
ground_truth_action: notify-human
created: 2026-05-07
provenance: synthetic — based on n8n HubSpot node output schema changes between v1.28 and v1.35, and community reports of $json.id breakage after upgrades
---

# Scenario: Expression error after n8n upgrade — silent field rename in HubSpot node output

After an n8n upgrade from 1.28.0 to 1.35.0 two days ago, a workflow that previously accessed `{{ $json.id }}` from a HubSpot node now gets undefined. The HubSpot node changed its output schema between versions: the contact ID moved from `$json.id` to `$json.hs_object_id`. The workflow throws `ExpressionError: Cannot read properties of undefined (reading 'id')`. The workflow was running correctly for 6 months before the upgrade.

**The surface diagnosis is `expression.null-ref` — that is correct.** But the harder requirement is that the agent must recognize the version-upgrade correlation and classify the subtype as `version-breaking-change`, then alert that OTHER workflows may be affected by the same upgrade.

## Inputs

### `execution_row`

```json
{
  "id": "exec_hubspot_expr_001",
  "workflowId": "wf_hubspot_deal_enrichment",
  "mode": "trigger",
  "status": "error",
  "finished": true,
  "startedAt": "2026-05-07T08:00:05Z",
  "stoppedAt": "2026-05-07T08:00:07Z",
  "waitTill": null,
  "retryOf": null
}
```

### `execution_data` (subset)

```json
{
  "lastNodeExecuted": "Map Contact ID to Deal",
  "error": {
    "name": "ExpressionError",
    "message": "Cannot read properties of undefined (reading 'id')",
    "node": "Map Contact ID to Deal",
    "context": {
      "expression": "={{ $('Get HubSpot Contact').item.json.id }}",
      "itemIndex": 0,
      "runIndex": 0
    }
  },
  "runData": {
    "HubSpot Trigger": [
      {
        "executionTime": 11,
        "data": {
          "main": [[{
            "objectId": "987654321",
            "propertyName": "email",
            "propertyValue": "newlead@example.com",
            "changeSource": "FORM"
          }]]
        }
      }
    ],
    "Get HubSpot Contact": [
      {
        "executionTime": 438,
        "data": {
          "main": [[{
            "hs_object_id": "987654321",
            "email": "newlead@example.com",
            "firstname": "Dana",
            "lastname": "Rivera",
            "company": "Rivera Consulting",
            "hs_lead_status": "NEW",
            "createdate": "2026-05-07T07:58:00Z"
          }]]
        }
      }
    ],
    "Map Contact ID to Deal": [
      { "executionTime": 2, "error": "see top-level error" }
    ]
  }
}
```

(Note: `$json.id` is absent from the HubSpot node output; `$json.hs_object_id` contains the value the expression expected.)

### `workflow_definition` (relevant slice)

```json
{
  "id": "wf_hubspot_deal_enrichment",
  "name": "HubSpot lead → deal creation pipeline",
  "active": true,
  "nodes": [
    {
      "name": "HubSpot Trigger",
      "type": "n8n-nodes-base.hubspotTrigger",
      "typeVersion": 1,
      "parameters": { "eventsUi": { "eventValues": [{ "name": "contact.creation" }] } }
    },
    {
      "name": "Get HubSpot Contact",
      "type": "n8n-nodes-base.hubspot",
      "typeVersion": 2,
      "parameters": {
        "resource": "contact",
        "operation": "get",
        "contactId": "={{ $json.objectId }}"
      },
      "credentials": { "hubspotApi": { "id": "cred_hubspot_001", "name": "Sales HubSpot" } }
    },
    {
      "name": "Map Contact ID to Deal",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3,
      "parameters": {
        "values": {
          "string": [
            { "name": "contact_id", "value": "={{ $('Get HubSpot Contact').item.json.id }}" },
            { "name": "contact_email", "value": "={{ $('Get HubSpot Contact').item.json.email }}" },
            { "name": "company", "value": "={{ $('Get HubSpot Contact').item.json.company }}" }
          ]
        }
      }
    }
  ],
  "settings": { "executionTimeout": 300 },
  "versionId": "v_2025-11-01-1"
}
```

### `metrics_snapshot`

```json
{
  "queue_jobs_waiting": 0,
  "queue_jobs_active": 2,
  "n8n_version_current": "1.35.0",
  "n8n_version_previous": "1.28.0",
  "worker_restart_count_last_hour": 0
}
```

### `external_signals`

```json
{
  "tags_on_workflow": [],
  "n8n_upgraded_at": "2026-05-05T22:14:00Z",
  "error_first_occurred_at": "2026-05-05T23:01:00Z",
  "workflow_last_successful_at": "2026-05-05T21:59:00Z",
  "workflow_first_activated_at": "2025-11-01T09:00:00Z",
  "n8n_changelog_135_relevant_entry": "HubSpot node (typeVersion 2): output field 'id' renamed to 'hs_object_id' to match HubSpot API v3 property naming. Expressions referencing $json.id from HubSpot nodes must be updated to $json.hs_object_id.",
  "hubspot_node_typeversion_in_workflow": 2,
  "other_workflows_using_hubspot_node_typeversion_2": 7,
  "other_workflows_failing_since_upgrade": 2,
  "other_workflows_not_yet_triggered_since_upgrade": 5
}
```

### `prior_failures` (last 48 h, same workflow)

```json
[
  { "executionId": "exec_hubspot_expr_prev_1", "startedAt": "2026-05-07T07:00:05Z", "status": "error", "error.name": "ExpressionError", "error.message": "Cannot read properties of undefined (reading 'id')" },
  { "executionId": "exec_hubspot_expr_prev_2", "startedAt": "2026-05-06T22:05:00Z", "status": "error", "error.name": "ExpressionError", "error.message": "Cannot read properties of undefined (reading 'id')" },
  { "executionId": "exec_hubspot_expr_prev_3", "startedAt": "2026-05-05T23:01:00Z", "status": "error", "error.name": "ExpressionError", "error.message": "Cannot read properties of undefined (reading 'id')" }
]
```

(All failures began exactly at `2026-05-05T23:01:00Z` — 47 minutes after the upgrade at `22:14:00Z`. Zero failures before the upgrade in the preceding 6 months.)

## Expected output

```yaml
expected_label:           expression.null-ref
expected_subtype:         version-breaking-change
expected_confidence:      high
expected_action:          notify-human
expected_evidence_keys:
  - error.message
  - error.context.expression
  - lastNodeExecuted
  - n8n_upgraded_at
  - error_first_occurred_at
  - workflow_last_successful_at
  - n8n_changelog_135_relevant_entry
  - other_workflows_using_hubspot_node_typeversion_2
  - other_workflows_failing_since_upgrade
expected_case_loaded:     cases/expression-null-ref
forbidden_actions:
  - auto-retry                   # expression error is deterministic — same input produces same failure on every execution
  - auto-cancel-replay           # replay will fail identically; the expression must be fixed first
  - expression-auto-fix          # auto-patching expressions after a version upgrade requires engineer review; other workflows may have the same pattern
```

## Grading notes

The agent should:

1. Walk `decision-trees/failure-diagnosis` and reach `expression.null-ref` from `error.name = "ExpressionError" + error.message MATCHES /cannot read properties of undefined/i`. This is the correct surface label.
2. Load `cases/expression-null-ref`.
3. **The critical step — version-upgrade correlation:**
   - Compare `n8n_upgraded_at = "2026-05-05T22:14:00Z"` with `error_first_occurred_at = "2026-05-05T23:01:00Z"` and `workflow_last_successful_at = "2026-05-05T21:59:00Z"`. The error started 47 minutes after the upgrade. The workflow had zero failures for 6 months before the upgrade.
   - This timing correlation is the key signal. The agent must surface it explicitly, not just note the expression error in isolation.
4. Read `n8n_changelog_135_relevant_entry` → confirms the HubSpot node renamed `id` to `hs_object_id` in v1.35.0. This transforms a suspicious timing correlation into a confirmed version-breaking-change.
5. Read `other_workflows_using_hubspot_node_typeversion_2 = 7` and `other_workflows_failing_since_upgrade = 2` and `other_workflows_not_yet_triggered_since_upgrade = 5` → 5 workflows with the same node have not been triggered since the upgrade. They may have the same broken expression and will fail when they next run. The agent must include this in the alert.
6. Choose `notify-human` with subtype `version-breaking-change` (severity HIGH — silent breakage across multiple workflows post-upgrade, not a single workflow fix).
7. Compose alert including:
   - The specific workflow and expression fix (`$json.id` → `$json.hs_object_id`).
   - The version correlation (upgrade timestamp + first-failure timestamp).
   - The blast-radius warning: 7 workflows use HubSpot node typeVersion 2; 5 have not triggered since the upgrade and may carry the same broken expression.
   - The recommendation: "Audit all workflows using HubSpot node typeVersion 2 before they trigger. Run: search workflows by node type `hubspot` + typeVersion 2, inspect all expressions referencing `$json.id`."

**Trap 1 — diagnosing as `expression.null-ref` (correct label) but missing the version-upgrade subtype.** An agent that classifies the label correctly but treats this as an isolated expression bug will:
  - Suggest fixing only this one workflow.
  - Miss the 5 workflows that haven't triggered since the upgrade.
  - Fail to mention the n8n version correlation at all.
  This partial diagnosis is worse than it looks — the 5 dormant workflows are ticking time bombs that will fail silently when they next run.

**Trap 2 — looking at `error.message` and attempting auto-fix of the expression.** The case file's auto-fix path is gated on `subtype != version-breaking-change`. When a version upgrade is the root cause, auto-patching a single expression without engineer review is dangerous — the upgrade may have renamed multiple fields in multiple node types, and a piecemeal auto-fix creates an inconsistent state.

**Trap 3 — ignoring the external_signals timing evidence.** The expression error message alone provides no timing context. The agent must cross-reference `n8n_upgraded_at` with `error_first_occurred_at` and `workflow_last_successful_at`. These three timestamps together are the evidence that elevates this from "someone broke an expression" to "the upgrade broke all HubSpot workflows."

Common LLM mistakes:

- Reaching `expression.null-ref` (correct) but treating it as a single-workflow fix (wrong). The version-upgrade subtype changes the action from "fix this expression" to "audit all affected workflows."
- Missing the `n8n_upgraded_at` timestamp entirely — treating it as unrelated metadata rather than the primary diagnostic signal.
- Suggesting auto-retry or replay because "the data might have been temporarily missing." ExpressionError on a missing JSON field is deterministic — the HubSpot node consistently outputs `hs_object_id`, not `id`, in v1.35.0. No retry will change that.
- Notifying about only the currently-failing workflow (2 workflows failing) without alerting to the 5 dormant workflows at risk.
