---
scenario_id: repair-broken-expression-hubspot-sync
domain: generation
difficulty: medium
task_type: repair-workflow
created: 2026-05-07
provenance: synthetic — common real-world pattern
---

# Eval Scenario: Repair Broken Expression — HubSpot Sync After Node Rename

**Type:** Workflow repair eval  
**Purpose:** Verify the agent can locate and fix all broken `$node["..."]` expression references after a node rename, without reverting the rename or missing secondary occurrences  
**Runtime loading:** Never loaded during runtime diagnosis  
**Updated:** 2026-05-07

## User Request

Our HubSpot contact sync workflow broke after we renamed the "Get Contacts" node to "Fetch HubSpot Contacts". Now it errors with:

```
ExpressionError: Referenced node 'Get Contacts' does not exist
```

Here's the workflow JSON:

```json
{
  "name": "HubSpot Contact Sync",
  "nodes": [
    {
      "id": "uuid-1",
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1,
      "position": [240, 300],
      "parameters": {
        "rule": { "interval": [{ "field": "hours", "hoursInterval": 24 }] }
      }
    },
    {
      "id": "uuid-2",
      "name": "Fetch HubSpot Contacts",
      "type": "n8n-nodes-base.hubspot",
      "typeVersion": 2,
      "position": [460, 300],
      "parameters": {
        "resource": "contact",
        "operation": "getAll",
        "returnAll": true
      },
      "credentials": { "hubspotApi": "HubSpot API Key" }
    },
    {
      "id": "uuid-3",
      "name": "Set Contact Fields",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3,
      "position": [680, 300],
      "parameters": {
        "mode": "manual",
        "fields": {
          "values": [
            {
              "name": "email",
              "value": "={{ $node[\"Get Contacts\"].json.properties.email.value }}"
            },
            {
              "name": "firstname",
              "value": "={{ $node[\"Get Contacts\"].json.properties.firstname.value }}"
            },
            {
              "name": "company",
              "value": "={{ $node[\"Get Contacts\"].json.properties.company.value }}"
            }
          ]
        }
      }
    },
    {
      "id": "uuid-4",
      "name": "Google Sheets Update",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4,
      "position": [900, 300],
      "parameters": {
        "resource": "sheet",
        "operation": "appendOrUpdate",
        "documentId": "{{ $env.SHEET_ID }}",
        "sheetName": "Contacts",
        "columnToMatchOn": "email",
        "fieldsUi": {
          "values": [
            {
              "column": "Last Synced",
              "fieldValue": "={{ $now.toISO() }}"
            }
          ]
        }
      },
      "credentials": { "googleSheetsOAuth2Api": "Google Sheets OAuth2" }
    }
  ],
  "connections": {
    "Schedule Trigger": { "main": [[{ "node": "Fetch HubSpot Contacts", "type": "main", "index": 0 }]] },
    "Fetch HubSpot Contacts": { "main": [[{ "node": "Set Contact Fields", "type": "main", "index": 0 }]] },
    "Set Contact Fields": { "main": [[{ "node": "Google Sheets Update", "type": "main", "index": 0 }]] }
  }
}
```

## Expected Context Loading

The agent should load:

- `playbooks/generate-workflow.md` (task_type: `repair-workflow`)
- `reference/tooling/n8n-tooling-map.md`
- `cases/n8n-expression-error.md` (the case matching this error type)
- `reference/n8n-nodes/n8n-node-set.md`
- `../n8n-skills-main/skills/n8n-expression-syntax/SKILL.md`

If n8n-MCP tools are available, it should use:

- `get_node({ nodeType: "nodes-base.set", detail: "standard", includeExamples: true })`
- `validate_node({ nodeType: "nodes-base.set", config: <repaired config>, mode: "full", profile: "runtime" })`
- `validate_workflow(<repaired workflow>)`

## Expected Workflow Shape

Pattern:

```text
Schedule Trigger
  -> Fetch HubSpot Contacts   (HubSpot node, resource: contact, operation: getAll)
  -> Set Contact Fields        (Set node — ALL $node["Get Contacts"] refs updated to "Fetch HubSpot Contacts")
  -> Google Sheets Update      (Google Sheets node, resource: sheet, operation: appendOrUpdate)
```

Required properties of the repair:

- Scan the entire workflow JSON for every occurrence of `$node["Get Contacts"]`, not just the first field.
- Update all occurrences to `$node["Fetch HubSpot Contacts"]`.
- Add defensive optional chaining to prevent null-reference errors on contacts where a property is absent:
  - Before: `{{ $node["Get Contacts"].json.properties.email.value }}`
  - After: `{{ $node["Fetch HubSpot Contacts"].json.properties?.email?.value ?? '' }}`
- Apply the same defensive pattern to `firstname` and `company` fields.
- Preserve all node IDs, positions, credentials, and connections — patch the smallest possible diff.
- Run node-level validation on the repaired Set node, then full workflow validation.
- Note: node rename is intentional — fix forward, do not rename "Fetch HubSpot Contacts" back.

## Must Not Do

- Must not suggest renaming "Fetch HubSpot Contacts" back to "Get Contacts" — the rename is intentional.
- Must not auto-deploy or activate the workflow without explicit user approval and target-instance confirmation.
- Must not use `$json.properties.email.value` as a shorthand — this references the current node's output, not the upstream HubSpot node's shape, and produces a different (wrong) result in this context.
- Must not silently fix only the first broken reference and leave the remaining two in `firstname` and `company`.
- Must not alter the Google Sheets node, Schedule Trigger, or connection topology — they are unrelated to the failure.

## Passing Criteria

Pass if the agent returns:

- repaired workflow JSON (or structured diff output) where **every** `$node["Get Contacts"]` reference is replaced with `$node["Fetch HubSpot Contacts"]`;
- defensive optional chaining added (`?.` and `?? ''` or equivalent) on at least the email field;
- count of references found and fixed (minimum 3: email, firstname, company);
- validation status showing no blocking errors on the Set node or full workflow;
- deployment gate — workflow JSON ready but deployment requires explicit approval;
- a note that the HubSpot `getAll` operation (without a filter) fetches all contacts and may be slow/expensive at scale, with a recommendation to add a `lastmodifieddate` filter if this runs on a schedule.

## Common LLM Mistakes

- **Finding only the first broken reference** — scanning stops after the first match, leaving `firstname` and `company` still pointing at `"Get Contacts"`. The eval requires all three be fixed.
- **Suggesting to rename the node back** — taking the path of least resistance (undo the rename) instead of reading the user intent (rename was deliberate, fix forward).
- **Not adding optional chaining** — fixing the `ExpressionError` by updating the node name but leaving the workflow vulnerable to a `TypeError` on any contact that is missing an optional HubSpot property.
- **Replacing with `$json` shorthand** — using `{{ $json.properties.email.value }}` instead of `{{ $node["Fetch HubSpot Contacts"].json.properties?.email?.value ?? '' }}`, which breaks when the Set node is not the immediate successor of the HubSpot node.
- **Deploying without approval** — outputting the repaired workflow and immediately calling a deploy/activate tool without waiting for user confirmation.
- **Altering unrelated nodes** — "improving" the Google Sheets or Schedule Trigger nodes as part of the repair, introducing unreviewed changes.
