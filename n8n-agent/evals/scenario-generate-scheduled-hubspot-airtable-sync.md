---
scenario_id: generate-hubspot-airtable-daily-sync
domain: generation
difficulty: medium
task_type: new-workflow
created: 2026-05-07
provenance: synthetic — common agency automation pattern
---

# Eval Scenario: Generate Scheduled HubSpot → Airtable Daily Sync

**Type:** Workflow generation eval  
**Purpose:** Verify the agent can generate a production-grade scheduled sync workflow with correct HubSpot pagination, dynamic date filtering, and a search-then-branch upsert pattern — catching the most common truncation and data-path mistakes  
**Runtime loading:** Never loaded during runtime diagnosis  
**Updated:** 2026-05-07

## User Request

Build an n8n workflow that runs every day at 7 AM UTC. It should pull all HubSpot contacts updated in the last 24 hours, then upsert each one into an Airtable base (table: "CRM Contacts"). The Airtable record key is the contact's email address. If the contact doesn't exist in Airtable, create it. If it does, update it. The fields to sync: email, firstname, lastname, company, phone, hs_lead_status.

## Expected Context Loading

The agent should load:

- `playbooks/generate-workflow.md`
- `reference/tooling/n8n-tooling-map.md`
- `reference/patterns/n8n-workflow-patterns.md`
- `reference/n8n-nodes/n8n-node-hubspot.md` (or `reference/api/api-hubspot.md`)
- `reference/api/api-airtable.md`
- `../n8n-skills-main/skills/n8n-workflow-patterns/SKILL.md`
- `../n8n-skills-main/skills/n8n-node-configuration/SKILL.md`
- `../n8n-skills-main/skills/n8n-validation-expert/SKILL.md`

If n8n-MCP tools are available, it should use:

- `search_nodes({ query: "schedule trigger", includeExamples: true })`
- `search_nodes({ query: "hubspot contact search", includeExamples: true })`
- `search_nodes({ query: "split in batches", includeExamples: true })`
- `search_nodes({ query: "airtable", includeExamples: true })`
- `search_nodes({ query: "if", includeExamples: true })`
- `get_node({ nodeType: "nodes-base.scheduleTrigger", detail: "standard", includeExamples: true })`
- `get_node({ nodeType: "nodes-base.hubspot", detail: "standard", includeExamples: true })`
- `get_node({ nodeType: "nodes-base.splitInBatches", detail: "standard", includeExamples: true })`
- `get_node({ nodeType: "nodes-base.airtable", detail: "standard", includeExamples: true })`
- `get_node({ nodeType: "nodes-base.if", detail: "standard", includeExamples: true })`
- `validate_node(...)` per node
- `validate_workflow(...)`

## Expected Workflow Shape

Pattern:

```text
Schedule Trigger (cron: "0 7 * * *", timezone: UTC)
  -> HubSpot: Search Contacts
     resource: contact, operation: search
     filter: lastmodifieddate GTE {{ $now.minus(86400, 'seconds').toMillis() }}
     returnAll: true  (or pagination loop — must not silently cap at 100)
  -> Split In Batches (batchSize: 10)
  -> Airtable: Search Records
     resource: record, operation: search
     table: "CRM Contacts"
     filter by formula: {Email} = "{{ $json.properties.email.value }}"
  -> IF: Airtable record found?
     condition: {{ $json.records.length > 0 }}  (or equivalent non-empty check)
       [YES branch] -> Airtable: Update Record
                       resource: record, operation: update
                       recordId: {{ $json.records[0].id }}
                       fields: email, firstname, lastname, company, phone, hs_lead_status
       [NO branch]  -> Airtable: Create Record
                       resource: record, operation: create
                       fields: email, firstname, lastname, company, phone, hs_lead_status
```

Required properties:

- Schedule Trigger uses cron expression `0 7 * * *` with timezone set to UTC. Do not rely on server timezone default.
- HubSpot node uses resource: `contact`, operation: `search` (not `getAll`) to apply the `lastmodifieddate` filter.
- HubSpot filter: property `lastmodifieddate`, operator `GTE` (greater than or equal), value = current timestamp minus 86 400 seconds expressed in milliseconds: `{{ $now.minus(86400, 'seconds').toMillis() }}` or equivalent dynamic expression. Never hardcode a date.
- HubSpot pagination: `returnAll: true` (preferred) or a Loop Over Items node. The workflow must not silently cap at 100 contacts.
- Split In Batches node: `batchSize: 10` to respect Airtable's 5 req/s rate limit.
- Airtable Search Records node: resource: `record`, operation: `search`, filter formula matches on the `Email` field using the value at `{{ $json.properties.email.value }}` (not `$json.email`).
- IF node correctly branches: YES (length > 0 or equivalent) routes to Update Record; NO routes to Create Record.
- All 6 fields mapped from HubSpot property paths (`$json.properties.<field>.value`) to Airtable field names — never from `$json.<field>` directly.
- Credential requirements listed as named placeholders: `HubSpot API Key` and `Airtable Personal Access Token`. No real secrets included.
- Operational notes cover: HubSpot rate limit (100 req/10 s); Airtable rate limit (5 req/s — addressed by batching); behavior when HubSpot returns 0 contacts (workflow exits gracefully, no error); behavior when HubSpot or Airtable is unavailable (node error surfaced, workflow marked failed, no silent truncation).

## Must Not Do

- Must not use HubSpot node operation `getAll` — it silently truncates at 10 000 records and does not support date filtering. Must use operation `search` with a `lastmodifieddate` filter.
- Must not hardcode yesterday's date or a static timestamp in the HubSpot filter — the filter value must be a dynamic n8n expression evaluated at execution time.
- Must not access HubSpot contact fields at `$json.email`, `$json.firstname`, etc. — HubSpot contact properties live at `$json.properties.email.value`, `$json.properties.firstname.value`, etc.
- Must not build a flat create-only workflow without the Airtable search-then-branch pattern — always creates duplicates and never updates existing records.
- Must not skip batching for Airtable calls — unbatched looping over large contact sets hits Airtable's 5 req/s rate limit and causes 429 errors.
- Must not deploy, activate, or test against a real n8n instance without confirming the target instance, credential bindings, and explicit approval.
- Must not include real HubSpot API keys or Airtable personal access tokens in the output.

## Passing Criteria

Pass if the agent returns:

- valid n8n workflow JSON or structured workflow output with all nodes in the pattern above;
- Schedule Trigger with cron `0 7 * * *` and timezone UTC;
- HubSpot node using operation `search` with a dynamic `lastmodifieddate` filter (no hardcoded date);
- pagination handled via `returnAll: true` or an explicit loop — no silent 100-record cap;
- Split In Batches node present with `batchSize` set to 10 or fewer;
- Airtable search uses `{{ $json.properties.email.value }}` (correct HubSpot property path) as the lookup value;
- IF node with a branch for found vs. not-found, routing to Update Record and Create Record respectively;
- all 6 fields (`email`, `firstname`, `lastname`, `company`, `phone`, `hs_lead_status`) mapped in both the create and update branches;
- credential requirements listed as named placeholders, no secrets;
- validation status of `passed` or `passed-with-warnings` (Airtable field names are user-defined and may produce a warning without live schema);
- deployment gate — workflow JSON ready, activation requires explicit approval;
- operational notes for empty HubSpot results, rate-limit behavior, and unavailability of either service.

## Common LLM Mistakes

- **Using HubSpot operation `getAll`** — the most common mistake with HubSpot in n8n. `getAll` silently truncates at 10 000 records and cannot filter by `lastmodifieddate`. Even in "return all" mode it is the wrong operation for a filtered sync. Must use `search`.
- **Hardcoding yesterday's date** — computing `new Date(Date.now() - 86400000).toISOString()` at generation time and embedding a literal timestamp like `"2026-05-06T07:00:00.000Z"` in the workflow. The filter must use a dynamic expression so it re-evaluates on each execution.
- **Wrong HubSpot property path** — writing `$json.email` or `$json.properties.email` instead of `$json.properties.email.value`. HubSpot contacts always nest property values under `.value`.
- **Flat create-only workflow** — building a linear chain (HubSpot → Set → Airtable Create) without the search-then-branch upsert pattern. Always creates new records, duplicating contacts that already exist in Airtable.
- **Skipping batching** — looping directly from HubSpot output into Airtable without Split In Batches. Works on small test sets, hits 429 rate-limit errors in production.
- **Wrong IF branch logic** — checking `$json.records[0]` (throws if records is empty) instead of `$json.records.length > 0` or using the Airtable response item count.
- **Deploying without approval** — outputting the workflow and immediately calling a create/activate tool without waiting for the user to confirm the target instance and credential bindings.
