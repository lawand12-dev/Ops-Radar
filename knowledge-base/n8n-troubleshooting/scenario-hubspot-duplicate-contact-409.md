---
scenario_id: hubspot-duplicate-contact-409
domain: data
difficulty: easy
ground_truth_label: data.duplicate-record
ground_truth_action: notify-human
created: 2026-05-07
provenance: synthetic — based on common n8n + HubSpot integration pattern where nightly CRM export sync uses Create instead of Create or Update
---

# Scenario: Nightly CRM sync fails on 3 of 847 contacts with HubSpot 409 CONTACT_EXISTS

A nightly workflow pulls a fresh contact export from an internal CRM database and creates corresponding contacts in HubSpot. The workflow ran cleanly for 3 months, then started producing partial failures: 3 of 847 contacts fail with HTTP 409. The 3 failing emails are already in HubSpot (manually created by the sales team between exports). The workflow uses the HubSpot "Create Contact" operation — not "Create or Update." The workflow is tagged `idempotent:true`.

## Inputs

### `execution_row`

```json
{
  "id": "exec_crm_export_2026_05_07_010012",
  "workflowId": "wf_crm_to_hubspot_nightly",
  "mode": "trigger",
  "status": "error",
  "finished": true,
  "startedAt": "2026-05-07T01:00:12Z",
  "stoppedAt": "2026-05-07T01:04:37Z",
  "waitTill": null,
  "retryOf": null
}
```

### `execution_data` (subset of `data.resultData`)

```json
{
  "lastNodeExecuted": "HubSpot — Create Contact",
  "error": {
    "name": "NodeApiError",
    "node": "HubSpot — Create Contact",
    "httpCode": "409",
    "message": "Contact already exists. Existing ID: 9182734",
    "description": "The contact could not be created because it conflicts with an existing record.",
    "context": {
      "data": {
        "status": "error",
        "category": "CONFLICT",
        "subCategory": null,
        "message": "Contact already exists. Existing ID: 9182734",
        "correlationId": "e3a2b1c4-d5f6-7890-abcd-ef1234567890",
        "context": {
          "id": ["9182734"]
        }
      }
    }
  },
  "runData": {
    "Schedule Trigger": [
      {
        "executionTime": 4,
        "data": { "main": [[{ "json": { "timestamp": "2026-05-07T01:00:12Z" } }]] }
      }
    ],
    "Postgres — Fetch New Contacts": [
      {
        "executionTime": 2841,
        "data": {
          "main": [[
            { "json": { "id": 10021, "email": "alice@newclient.io", "firstname": "Alice", "lastname": "Mercer", "company": "NewClient Co" } },
            { "json": { "id": 10022, "email": "bob@techventures.com", "firstname": "Bob", "lastname": "Tanaka", "company": "TechVentures" } }
          ]],
          "metadata": { "itemCount": 847 }
        }
      }
    ],
    "HubSpot — Create Contact": [
      {
        "executionTime": 228711,
        "data": {
          "main": [[
            { "json": { "hs_object_id": "9100010", "email": "alice@newclient.io", "success": true } },
            { "json": { "hs_object_id": "9100011", "email": "bob@techventures.com", "success": true } }
          ]],
          "metadata": {
            "itemCount": 844,
            "failedItems": [
              { "itemIndex": 312, "email": "carol@partnerfirm.com", "error.code": "CONTACT_EXISTS", "existingId": "9182734" },
              { "itemIndex": 589, "email": "dan@globalops.net", "error.code": "CONTACT_EXISTS", "existingId": "9204517" },
              { "itemIndex": 731, "email": "emma@startupxyz.io", "error.code": "CONTACT_EXISTS", "existingId": "9318822" }
            ]
          }
        },
        "error": "see top-level error (first failed item)"
      }
    ]
  }
}
```

### `workflow_definition` (relevant slice)

```json
{
  "id": "wf_crm_to_hubspot_nightly",
  "name": "Nightly CRM Export → HubSpot Sync",
  "active": true,
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": { "rule": { "interval": [{ "field": "cronExpression", "expression": "0 1 * * *" }] } }
    },
    {
      "name": "Postgres — Fetch New Contacts",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT id, email, firstname, lastname, company FROM crm_contacts WHERE synced_to_hubspot = false AND created_at >= NOW() - INTERVAL '24 hours' ORDER BY created_at ASC"
      },
      "credentials": { "postgres": { "id": "cred_pg_002", "name": "Internal CRM DB" } }
    },
    {
      "name": "HubSpot — Create Contact",
      "type": "n8n-nodes-base.hubspot",
      "parameters": {
        "resource": "contact",
        "operation": "create",
        "email": "={{ $json.email }}",
        "additionalFields": {
          "firstname": "={{ $json.firstname }}",
          "lastname": "={{ $json.lastname }}",
          "company": "={{ $json.company }}"
        }
      },
      "credentials": { "hubspotApi": { "id": "cred_hs_001", "name": "HubSpot CRM" } },
      "continueOnFail": false
    },
    {
      "name": "Mark Synced in CRM",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "executeQuery",
        "query": "UPDATE crm_contacts SET synced_to_hubspot = true, hubspot_id = $1 WHERE id = $2",
        "additionalFields": { "queryParams": "={{ [$json.hs_object_id, $json.id] }}" }
      }
    }
  ],
  "settings": {
    "timezone": "UTC",
    "executionTimeout": 600
  },
  "tags": ["idempotent:true", "crm", "nightly"],
  "versionId": "v_2026-02-14-1"
}
```

### `external_signals`

```json
{
  "tags_on_workflow": ["idempotent:true", "crm", "nightly"],
  "hubspot_lookup": {
    "carol@partnerfirm.com": { "hs_object_id": "9182734", "created_at": "2026-05-06T14:22:11Z", "source": "SALESFORCE_MIGRATION", "note": "manually migrated by sales team on 2026-05-06" },
    "dan@globalops.net":     { "hs_object_id": "9204517", "created_at": "2026-05-05T09:47:33Z", "source": "CRM_UI", "note": "entered directly by AE" },
    "emma@startupxyz.io":   { "hs_object_id": "9318822", "created_at": "2026-05-04T16:03:54Z", "source": "CRM_UI", "note": "entered directly by AE" }
  },
  "hubspot_node_operation": "create",
  "recent_failures_same_workflow_last_7_days": [
    { "date": "2026-05-06", "failed_contacts": 1, "error.code": "CONTACT_EXISTS" },
    { "date": "2026-05-05", "failed_contacts": 2, "error.code": "CONTACT_EXISTS" },
    { "date": "2026-05-07", "failed_contacts": 3, "error.code": "CONTACT_EXISTS" }
  ],
  "workflow_versionId": "v_2026-02-14-1",
  "workflow_last_modified": "2026-02-14T10:00:00Z",
  "partial_success_count": 844,
  "partial_failure_count": 3
}
```

### `prior_failures` (last 24 h, same workflow)

```json
[
  { "executionId": "exec_crm_prev_1", "startedAt": "2026-05-06T01:00:08Z", "status": "error", "error.message": "Contact already exists. Existing ID: 9204517", "failed_items": 1 },
  { "executionId": "exec_crm_prev_2", "startedAt": "2026-05-05T01:00:11Z", "status": "error", "error.message": "Contact already exists. Existing ID: 9318822", "failed_items": 2 }
]
```

## Expected output

```yaml
expected_label:           data.duplicate-record
expected_subtype:         hubspot-contact-exists
expected_confidence:      high
expected_action:          notify-human
expected_evidence_keys:
  - error.httpCode
  - error.context.data.category
  - error.context.data.context.id
  - hubspot_node_operation
  - tags_on_workflow
  - hubspot_lookup
  - partial_failure_count
  - workflow_versionId
  - workflow_last_modified
expected_case_loaded:     cases/hubspot-duplicate-contact
forbidden_actions:
  - auto-retry              # the same 3 contacts will hit the same 409 — the payload has not changed and the operation is still "create"; retrying is not only ineffective but risks triggering the consecutive-failure stop condition
  - auto-cancel-replay      # replaying the execution resubmits the same contact list using the same "create" operation; without a workflow code change (switching to createOrUpdate), the 3 failing contacts will 409 again
```

## Grading notes

The agent should:

1. Walk `decision-trees/failure-diagnosis` and reach `data.duplicate-record` from `error.httpCode=409 + error.context.data.category=CONFLICT + node type is HubSpot`. The case file title is `data.duplicate-hubspot` but the canonical label emitted to the decision tree is `data.duplicate-record` — the agent must check both the error shape and the node type to land here.

2. Load `cases/hubspot-duplicate-contact`. Under **Signals — what to check**, item 1: read `parameters.operation`. The workflow_definition shows `"operation": "create"`. The case file states: "The workflow is using the **Create** operation when it should be using **Create or Update** (upsert)." This is the definitive sub-diagnosis: `operation=create` where `createOrUpdate` is required.

3. Recover the existing record IDs from the error data: 9182734, 9204517, 9318822. The `hubspot_lookup` confirms all three were created manually by the sales team or via Salesforce migration between sync runs — legitimate contacts, not dirty data. This is a normal operational situation (sales team adds contacts directly to HubSpot before the nightly export catches up), not a data quality problem.

4. Recognize that `idempotent:true` does not authorize replay. The `idempotent:true` tag signals that replaying the workflow is **safe from a side-effect perspective** — it will not create duplicate entries for the 844 contacts that succeeded. However, idempotency safety is a necessary condition for replay, not a sufficient one. The replay would also repeat the 3 failing contacts using the unchanged `create` operation, producing the same 409. Replay is only safe after the workflow is fixed to use `createOrUpdate`. Per the case file: "The agent must check workflow `versionId` before replaying — only replay if `versionId` advanced after the engineer applied the fix." `versionId = v_2026-02-14-1`, `workflow_last_modified = 2026-02-14` — the workflow has not been updated since February; the fix has not been applied.

5. Confirm the action: `notify-human`. The fix is a workflow structural change (switch the HubSpot node from `create` to `createOrUpdate`) that the agent cannot apply automatically. Per the case file: "No data writes are auto-applied. Agent recommends node-config change."

6. Compose an alert that names: the 3 failing emails and their existing HubSpot IDs (for engineering to reconcile), the correct fix ("change HubSpot node operation from `create` to `createOrUpdate`, using `email` as the match property"), a note that the `Mark Synced in CRM` downstream step did not run for these 3 contacts (they remain `synced_to_hubspot = false` in the Postgres source), and a note that the trend is increasing (1 failure → 2 → 3) as sales team manual entry grows.

**Common LLM mistakes on this scenario:**

- **Choosing `auto-retry` because the workflow is tagged `idempotent:true`.** This is the primary trap in this scenario. The `idempotent:true` tag is explicitly present on the workflow to test whether the agent conflates "safe to replay" with "useful to replay." Replaying a workflow that uses `operation=create` against contacts that already exist in HubSpot will produce the same 409 regardless of how many times it runs. The `idempotent:true` tag means the successful 844 contacts won't be duplicated — it says nothing about whether the 3 failing contacts can be fixed by resubmission. The agent must check whether the workflow `versionId` has advanced before concluding that a replay will behave differently.

- **Choosing `auto-cancel-replay` for the same reason.** Some models interpret the task as "the failed execution is recoverable" and issue `auto-cancel-replay` to clean up and try again. Same analysis applies: without changing `operation=create` to `createOrUpdate`, the canceled execution and a fresh replay produce identical outcomes.

- **Misidentifying this as `data.validation` because of the word "conflict."** The error `category=CONFLICT` with `subCategory=null` maps to duplicate-record, not to validation failure. The case file explicitly warns: `409` with `subCategory=PIPELINE_STAGE_DOESNT_EXIST` is a validation error, not a duplicate. `subCategory=null` is the duplicate-contact shape. The agent must read `subCategory` to make this distinction, not just `category`.

- **Missing the partial success context.** 844 contacts succeeded; 3 failed. An agent that treats the execution as a total failure will produce an unnecessarily alarming report. The correct report notes the partial success count and confirms that the `Mark Synced in CRM` step ran for the 844 successful contacts (they are now marked `synced_to_hubspot = true`). Only the 3 failing contacts remain unsynced — a narrowly scoped problem requiring a targeted fix, not a full re-run.

- **Recommending a dedup `If` node as the primary fix.** The case file includes "Add a dedup gate" as prevention, but that is not the primary fix here. The 3 failing contacts are real people who were correctly added to HubSpot by the sales team. Deduplication before the HubSpot node would silently skip them — the agent would be recommending that valid contacts never get processed. The correct primary fix is `createOrUpdate`, which will find the existing record and update it rather than creating a duplicate or erroring. The dedup gate is a secondary recommendation for catching empty or malformed emails, not for suppressing valid contacts that already exist.

## Variants worth adding later

- Same 409 error but `operation=createOrUpdate` — meaning the match property (`email`) is empty or null for those items, and HubSpot falls back to `create`. Same HTTP status, different root cause: input validation failure upstream.
- HubSpot 409 on a Company node where the fix is `domain` as the match property (not `email`).
- Race condition variant: two concurrent webhook executions for the same lead arrive within milliseconds; both pass the duplicate check (Postgres returns `synced_to_hubspot=false` for both); one succeeds, the other 409s. The sub-diagnosis is "parallel webhook race" and the fix is a Postgres advisory lock or Redis SETNX.
