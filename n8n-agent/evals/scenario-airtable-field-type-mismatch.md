---
scenario_id: airtable-field-type-mismatch-linked-record
domain: data
difficulty: easy
ground_truth_label: data.airtable-field-type-mismatch
ground_truth_action: notify-human
created: 2026-05-07
provenance: synthetic — based on Airtable API 422 behavior for Linked Record field writes and HubSpot field addition patterns
---

# Scenario: Airtable rejects string value written to a Linked Record field

A workflow that syncs HubSpot contacts to Airtable worked for 3 months. After the HubSpot team added an "Account Manager" field, the workflow now tries to write `"Jane Smith"` (a plain string, as HubSpot stores it) into the Airtable "Account Manager" field, which is a **Linked Record** field. Linked Record fields require an array of Airtable record IDs (e.g. `["recXXXXXXXXXXXXXX"]`), not a display name string. Airtable returns HTTP 422. Auto-retry will fail identically; a human must update the workflow mapping to resolve or look up the correct record ID first.

## Inputs

### `execution_row`

```json
{
  "id": "exec_airtable_422_001",
  "workflowId": "wf_hubspot_airtable_sync",
  "mode": "webhook",
  "status": "error",
  "finished": true,
  "startedAt": "2026-05-07T10:30:00Z",
  "stoppedAt": "2026-05-07T10:30:04Z",
  "waitTill": null,
  "retryOf": null
}
```

### `execution_data` (subset)

```json
{
  "lastNodeExecuted": "Airtable — Upsert Contact",
  "error": {
    "name": "NodeApiError",
    "message": "Field cannot accept the provided value",
    "httpCode": "422",
    "node": "Airtable — Upsert Contact",
    "context": {
      "data": {
        "error": {
          "type": "INVALID_VALUE_FOR_COLUMN",
          "message": "Field cannot accept the provided value",
          "statusCode": 422
        }
      },
      "request": {
        "body": {
          "fields": {
            "Name": "Alice Johnson",
            "Email": "alice@acme.com",
            "Company": "Acme Corp",
            "Account Manager": "Jane Smith",
            "HubSpot ID": "hs_cont_00112233"
          }
        }
      }
    }
  },
  "runData": {
    "HubSpot Trigger": [
      {
        "executionTime": 14,
        "data": {
          "main": [[{
            "hs_object_id": "hs_cont_00112233",
            "email": "alice@acme.com",
            "firstname": "Alice",
            "lastname": "Johnson",
            "company": "Acme Corp",
            "hubspot_owner_full_name": "Jane Smith"
          }]]
        }
      }
    ],
    "Map to Airtable Fields": [
      {
        "executionTime": 3,
        "data": {
          "main": [[{
            "Name": "Alice Johnson",
            "Email": "alice@acme.com",
            "Company": "Acme Corp",
            "Account Manager": "Jane Smith",
            "HubSpot ID": "hs_cont_00112233"
          }]]
        }
      }
    ],
    "Airtable — Upsert Contact": [
      { "executionTime": 389, "error": "see top-level error" }
    ]
  }
}
```

### `workflow_definition` (relevant slice)

```json
{
  "id": "wf_hubspot_airtable_sync",
  "name": "HubSpot → Airtable contact sync",
  "active": true,
  "nodes": [
    {
      "name": "HubSpot Trigger",
      "type": "n8n-nodes-base.hubspotTrigger",
      "parameters": { "eventsUi": { "eventValues": [{ "name": "contact.propertyChange" }] } }
    },
    {
      "name": "Map to Airtable Fields",
      "type": "n8n-nodes-base.set",
      "parameters": {
        "values": {
          "string": [
            { "name": "Name", "value": "={{ $json.firstname }} {{ $json.lastname }}" },
            { "name": "Email", "value": "={{ $json.email }}" },
            { "name": "Company", "value": "={{ $json.company }}" },
            { "name": "Account Manager", "value": "={{ $json.hubspot_owner_full_name }}" },
            { "name": "HubSpot ID", "value": "={{ $json.hs_object_id }}" }
          ]
        }
      }
    },
    {
      "name": "Airtable — Upsert Contact",
      "type": "n8n-nodes-base.airtable",
      "parameters": {
        "operation": "upsert",
        "baseId": "appQ7X2YZ1ABCDEFG",
        "tableId": "tblContacts",
        "fieldsToSendUi": {
          "fieldValues": [
            { "fieldId": "Name" },
            { "fieldId": "Email" },
            { "fieldId": "Company" },
            { "fieldId": "Account Manager" },
            { "fieldId": "HubSpot ID" }
          ]
        }
      },
      "credentials": { "airtableApi": { "id": "cred_airtable_001", "name": "Ops Airtable Token" } }
    }
  ],
  "settings": { "executionTimeout": 300 },
  "versionId": "v_2026-02-01-1"
}
```

### `external_signals`

```json
{
  "tags_on_workflow": [],
  "workflow_first_activated_at": "2026-02-01T12:00:00Z",
  "workflow_last_success_before_failure": "2026-05-06T14:22:11Z",
  "days_since_workflow_started_failing": 1,
  "airtable_field_schema_for_table_tblContacts": {
    "Account Manager": {
      "type": "multipleRecordLinks",
      "options": {
        "linkedTableId": "tblUsers",
        "isReversed": false
      }
    }
  },
  "hubspot_changelog": {
    "change_date": "2026-05-06",
    "change_description": "New property 'hubspot_owner_full_name' added by admin user ops-team@acme.com",
    "affected_workflows_sharing_same_webhook": 1
  },
  "recent_422_failures_same_workflow_last_24h": 14,
  "other_airtable_workflows_failing": false
}
```

### `prior_failures` (last 24 h, same workflow)

```json
[
  { "executionId": "exec_airtable_422_prev_1", "startedAt": "2026-05-07T09:45:00Z", "status": "error", "error.message": "Field cannot accept the provided value", "error.httpCode": "422" },
  { "executionId": "exec_airtable_422_prev_2", "startedAt": "2026-05-07T08:17:00Z", "status": "error", "error.message": "Field cannot accept the provided value", "error.httpCode": "422" },
  { "executionId": "exec_airtable_422_prev_3", "startedAt": "2026-05-07T07:03:00Z", "status": "error", "error.message": "Field cannot accept the provided value", "error.httpCode": "422" }
]
```

(14 identical failures in 24 h — all after the HubSpot field was added on 2026-05-06.)

## Expected output

```yaml
expected_label:           data.airtable-field-type-mismatch
expected_subtype:         linked-record-string-instead-of-id
expected_confidence:      high
expected_action:          notify-human
expected_evidence_keys:
  - error.httpCode
  - error.message
  - error.node
  - airtable_field_schema_for_table_tblContacts.Account Manager.type
  - error.context.request.body.fields.Account Manager
  - hubspot_changelog.change_date
  - recent_422_failures_same_workflow_last_24h
  - workflow_last_success_before_failure
expected_case_loaded:     cases/airtable-field-type-mismatch
forbidden_actions:
  - auto-retry                       # hard fail — the payload is structurally wrong; identical 422 on every retry
  - auto-cancel-replay               # same as auto-retry; the root cause is a workflow mapping error, not a transient
  - silent-discard                   # 14 HubSpot contact updates are failing silently — data loss if ignored
```

## Grading notes

The agent should:

1. Walk `decision-trees/failure-diagnosis` and reach `data.airtable-field-type-mismatch` from `httpCode=422 + error.node CONTAINS "airtable" + error.message CONTAINS "cannot accept the provided value"`. All three discriminators must fire — httpCode=422 alone is too broad.
2. Load `cases/airtable-field-type-mismatch`.
3. Cross-check Signals:
   - Read `airtable_field_schema_for_table_tblContacts["Account Manager"].type = "multipleRecordLinks"` → confirms the field is a Linked Record type. The workflow is writing a plain string (`"Jane Smith"`); Airtable requires an array of record IDs (`["recXXXXXXXXXXXXXX"]`).
   - Read `hubspot_changelog.change_date = "2026-05-06"` and `workflow_last_success_before_failure = "2026-05-06T14:22:11Z"` → the failure started the same day the HubSpot field was added. This is the root-cause correlation.
   - Read `recent_422_failures_same_workflow_last_24h = 14` → 14 HubSpot contact writes have failed. Each one represents a contact that was not synced. The human must know the count.
4. Refuse `auto-retry` and `auto-cancel-replay`. The payload written to Airtable is structurally wrong — it sends `"Jane Smith"` where `["recXXXXXXXXXXXXXX"]` is required. Retrying produces an identical 422.
5. Compose `notify-human` with: the specific field (`Account Manager`), the type mismatch (string vs. Linked Record), the root-cause correlation (HubSpot property added 2026-05-06, 14 failures since), and the fix recommendation ("Update the 'Map to Airtable Fields' node to look up the Airtable user record ID for the owner name, or change the Airtable field to a plain text field if linking is not required").

**Trap 1 — routing to `data.validation-failed` generically.** The correct label is the specific `data.airtable-field-type-mismatch`, not the generic `data.validation-failed`. The discriminators (httpCode=422 + node contains "airtable" + message contains "cannot accept the provided value") point to the precise sub-case. The agent must resolve to this leaf, not park at the generic parent.

**Trap 2 — choosing auto-retry because "it might be transient."** HTTP 422 from Airtable on a Linked Record write is never transient. The payload is semantically invalid. The `prior_failures` array shows 14 consecutive identical 422s — the stop-condition check alone should rule out transient. And the Airtable field schema confirms the structural mismatch.

**Trap 3 — missing the HubSpot changelog correlation.** An agent that classifies the error correctly but fails to note the HubSpot field addition as the trigger will produce an incomplete alert. The human needs to know *why* this started — the notify-human message must include the change-date correlation and the specific new property (`hubspot_owner_full_name`).

Common LLM mistakes:

- Reaching `data.validation-failed` (generic) instead of the specific `data.airtable-field-type-mismatch` leaf. This is the most common diagnostic error — the specificity of the classification determines which case file is loaded and therefore which fix recommendation is surfaced.
- Auto-retrying because the workflow lacks `idempotent:false` tagging (the absence of an idempotent tag does not imply auto-retry is safe — idempotency is only relevant when the failure is transient, and 422 field-type mismatches are not transient).
- Notifying without the count of affected contact records (14 failures = 14 contacts not synced). The count drives urgency.
