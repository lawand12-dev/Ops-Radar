---
scenario_id: worker-oom-high-concurrency
domain: infra
difficulty: easy
ground_truth_label: infra.worker-oom
ground_truth_action: notify-human
created: 2026-05-07
provenance: synthetic — based on n8n community reports of OOMKill when loading large HubSpot contact exports without pagination
---

# Scenario: Worker OOMKilled processing 50,000 HubSpot contacts with no pagination

A nightly CRM sync workflow fetches all HubSpot contacts using a single HTTP Request node (no pagination loop) and then runs a series of enrichment and tagging operations. The worker container is OOMKilled every night at approximately 02:15 UTC. Exit code 137 is recorded. All other workflows on the same instance are healthy and completing normally. The failure pattern is perfectly consistent: only this workflow, only during its scheduled run window.

## Inputs

### `execution_row`

```json
{
  "id": "exec_crm_sync_2026_05_07_021502",
  "workflowId": "wf_hubspot_nightly_sync",
  "mode": "trigger",
  "status": "crashed",
  "finished": false,
  "startedAt": "2026-05-07T02:10:01Z",
  "stoppedAt": "2026-05-07T02:15:48Z",
  "waitTill": null,
  "retryOf": null
}
```

### `execution_data` (subset of `data.resultData`)

```json
{
  "lastNodeExecuted": "Enrich Contacts — Score",
  "error": null,
  "runData": {
    "Schedule Trigger": [
      {
        "executionTime": 5,
        "data": { "main": [[{ "json": { "timestamp": "2026-05-07T02:10:01Z" } }]] }
      }
    ],
    "Fetch All HubSpot Contacts": [
      {
        "executionTime": 34218,
        "data": {
          "main": [[
            { "json": { "id": "5000001", "email": "contact1@example.com", "properties": { "firstname": "Alice", "company": "Acme Corp", "hs_lead_status": "NEW", "num_associated_deals": 3 } } },
            { "json": { "id": "5000002", "email": "contact2@example.com", "properties": { "firstname": "Bob", "company": "Globex", "hs_lead_status": "CONNECTED", "num_associated_deals": 0 } } }
          ]]
        },
        "metadata": { "itemCount": 50247 }
      }
    ],
    "Enrich Contacts — Score": [
      {
        "executionTime": 313409,
        "error": "worker-crashed-before-flush"
      }
    ]
  }
}
```

### `workflow_definition` (relevant slice)

```json
{
  "id": "wf_hubspot_nightly_sync",
  "name": "Nightly HubSpot CRM Sync",
  "active": true,
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": { "rule": { "interval": [{ "field": "cronExpression", "expression": "0 2 * * *" }] } }
    },
    {
      "name": "Fetch All HubSpot Contacts",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "GET",
        "url": "https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,company,hs_lead_status,num_associated_deals,lifecyclestage,createdate,lastmodifieddate&archived=false",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "options": {
          "response": { "response": { "fullResponse": false, "responseFormat": "json" } },
          "pagination": { "pagination": { "paginate": false } }
        }
      },
      "note": "No pagination configured — loads entire contact list into memory as a single response"
    },
    {
      "name": "Enrich Contacts — Score",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const items = $input.all();\nconst enriched = items.map(item => {\n  const deals = item.json.properties.num_associated_deals;\n  const status = item.json.properties.hs_lead_status;\n  const score = (deals * 10) + (status === 'CONNECTED' ? 50 : 0);\n  return { ...item, json: { ...item.json, lead_score: score } };\n});\nreturn enriched;"
      }
    },
    {
      "name": "Filter — High Value Leads",
      "type": "n8n-nodes-base.if",
      "parameters": { "conditions": { "number": [{ "value1": "={{ $json.lead_score }}", "value2": 40, "operation": "largerEqual" }] } }
    },
    {
      "name": "Update CRM Database",
      "type": "n8n-nodes-base.postgres",
      "credentials": { "postgres": { "id": "cred_pg_001", "name": "CRM Postgres Replica" } }
    }
  ],
  "settings": {
    "executionMode": "queue",
    "timezone": "UTC",
    "executionTimeout": 900,
    "errorWorkflow": "wf_alert_handler"
  },
  "tags": ["crm", "nightly", "revenue:true"],
  "versionId": "v_2026-04-29-1"
}
```

### `metrics_snapshot`

```json
{
  "timestamp": "2026-05-07T02:15:48Z",
  "worker_id": "worker-2",
  "process_resident_memory_bytes": {
    "t_minus_300s": 412000000,
    "t_minus_240s": 589000000,
    "t_minus_180s": 901000000,
    "t_minus_120s": 1340000000,
    "t_minus_60s":  1714000000,
    "t_minus_30s":  1891000000,
    "t_crash":      null
  },
  "worker_exit_code": 137,
  "worker_restarts_last_24h": {
    "worker-1": 0,
    "worker-2": 1,
    "worker-3": 0
  },
  "n8n_queue_jobs_waiting": 0,
  "n8n_queue_jobs_active_at_crash": 1,
  "node_options": "--max-old-space-size=1536",
  "container_memory_limit_bytes": 2147483648
}
```

### `external_signals`

```json
{
  "tags_on_workflow": ["crm", "nightly", "revenue:true"],
  "other_workflows_on_worker_2_at_crash_time": [],
  "hubspot_contact_count_current": 50247,
  "hubspot_contact_count_30_days_ago": 47891,
  "failure_same_workflow_last_7_days": [
    { "date": "2026-05-06", "status": "crashed", "crashTime": "02:14:33", "exitCode": 137 },
    { "date": "2026-05-05", "status": "crashed", "crashTime": "02:16:01", "exitCode": 137 },
    { "date": "2026-05-04", "status": "crashed", "crashTime": "02:13:58", "exitCode": 137 },
    { "date": "2026-05-03", "status": "crashed", "crashTime": "02:15:22", "exitCode": 137 },
    { "date": "2026-05-02", "status": "crashed", "crashTime": "02:14:47", "exitCode": 137 },
    { "date": "2026-05-01", "status": "crashed", "crashTime": "02:11:09", "exitCode": 137 },
    { "date": "2026-04-30", "status": "crashed", "crashTime": "02:14:55", "exitCode": 137 }
  ],
  "other_workflows_healthy": true,
  "recent_n8n_version_change": null,
  "recent_host_changes": null
}
```

## Expected output

```yaml
expected_label:           infra.worker-oom
expected_subtype:         container-oom-killed
expected_confidence:      high
expected_action:          notify-human
expected_evidence_keys:
  - worker_exit_code
  - process_resident_memory_bytes
  - node_options
  - container_memory_limit_bytes
  - lastNodeExecuted
  - hubspot_contact_count_current
  - failure_same_workflow_last_7_days
  - other_workflows_healthy
expected_case_loaded:     cases/n8n-worker-oom
forbidden_actions:
  - auto-retry              # the next scheduled run will load the same 50,000+ contacts, hit the same RSS ceiling, and OOMKill again — retry does not change the payload size
  - auto-cancel-replay      # same result as auto-retry; replaying the crashed execution resubmits the same un-paginated fetch
```

## Grading notes

The agent should:

1. Walk `decision-trees/failure-diagnosis` and reach `infra.worker-oom` from `execution_row.status=crashed + worker_exit_code=137`. Exit code 137 is `128 + SIGKILL`, the Linux OOMKiller signal — this is an unambiguous container OOM, not a node.js exception, not a timeout, not a network error.

2. Load `cases/n8n-worker-oom`. Under **Signals**, item 1: RSS climbed from 412 MB to 1,891 MB in 5 minutes and then the worker died — the memory curve is a steady ramp ending in a hard cliff, not a spike (which would suggest a code bug) and not flat (which would suggest a leak). The ramp corresponds to the Code node iterating over 50,247 items via `$input.all()`.

3. Cross-check the node configuration. The `Fetch All HubSpot Contacts` HTTP Request node has `pagination.paginate = false` and no follow-cursor logic. At 50,247 contacts with typical HubSpot property payload (~2–4 KB per contact), the raw JSON response is approximately 100–200 MB. The Code node then calls `$input.all()` and builds a second in-memory array of the same size. RSS peaks at the moment both the input array and output array coexist in V8's heap.

4. Identify the container vs V8 boundary. `node_options = "--max-old-space-size=1536"` (1.5 GB V8 heap limit) and `container_memory_limit_bytes = 2147483648` (2 GB). The V8 limit is lower than the container limit, so the OOMKill at exit code 137 means the **container** OOM-killed the process — RSS exceeded 2 GB before V8's heap limit triggered. This maps to the case file's sub-diagnosis: "Container OOM-killed" (Exit 137; container RSS at or above limit).

5. Note that no other workflows are running on worker-2 at crash time (`n8n_queue_jobs_active_at_crash = 1`, `other_workflows_on_worker_2_at_crash_time = []`). This is a single-workflow cause, not a concurrency saturation scenario.

6. Note the 7-day consecutive failure history, all at ~02:14 UTC, all exit code 137. This is not an intermittent problem — it is structural. The workflow has been broken since at least 2026-04-30 (the oldest recorded failure).

7. Choose `notify-human` because: (a) the fix requires paginating the HubSpot fetch — a workflow structural change the agent cannot make automatically; (b) replaying would OOM again immediately; (c) per the case file: "Replay only if the workflow is tagged idempotent **and** the engineer expects the next payload to fit. If a 200 MB response is the cause and the next payload will also be 200 MB, replay just OOMs again."

8. Compose an alert naming: the workflow (`Nightly HubSpot CRM Sync`), the specific root cause (no pagination, 50,247 contacts loaded into memory at once), the RSS peak (1,891 MB at crash), the fix ("add pagination to the HTTP Request node using HubSpot's `paginationToken` cursor and process batches of 500 contacts"), and a note that the workflow has failed 7 consecutive nights.

**Common LLM mistakes on this scenario:**

- **Diagnosing as `infra.n8n-unhealthy` because the worker is restarting.** The worker did restart (worker-2 has 1 restart in 24 h), but the restart is a consequence of the OOM, not the cause. An `infra.n8n-unhealthy` diagnosis would imply the n8n instance itself is sick — but `other_workflows_healthy = true` and the other two workers show 0 restarts. Only one workflow on one worker crashed. The scope is too narrow for `infra.n8n-unhealthy`.

- **Routing to `cases/stuck-execution` instead of `cases/n8n-worker-oom`.** A model that sees `status=crashed` and a long `executionTime` (313 seconds in the Enrich node) may confuse "crashed execution" with "stuck execution." The discriminator is exit code 137 + a memory curve that ends in a hard cliff. Stuck executions have `status=running` past their timeout; this execution has `status=crashed` and `finished=false`. Load `cases/n8n-worker-oom`, not `cases/stuck-execution`.

- **Recommending `auto-retry` because the workflow has `revenue:true`.** The `revenue:true` tag from the Meta rate-limit scenario pattern means "important workflow — ensure it completes." It does not mean "retry immediately." Per `cases/n8n-worker-oom`: "Never silently increase memory limits — that masks the cause." Retrying does not change the payload (50,247 contacts, unpaginated) and will OOM again within 5 minutes.

- **Missing the pagination gap.** A model that reads the node name "Fetch All HubSpot Contacts" but does not inspect `parameters.options.pagination.paginate = false` will miss the structural cause and give a vague OOM diagnosis without a concrete fix. The agent must read the workflow_definition node parameters to identify unpaginated fetching as the root cause — not just report "OOM occurred."

- **Suggesting raising `--max-old-space-size` as the fix.** The case file is explicit: "Never silently increase memory limits — that masks the cause." Raising the V8 heap limit from 1.5 GB to 3 GB buys one more month before the contact list grows past the new limit. The correct fix is pagination. The agent may note that a heap increase is a temporary workaround only, but it must not present it as the primary recommendation.

## Variants worth adding later

- Same workflow but with `split-in-batches` partially implemented — fetches 500 contacts per batch correctly but accumulates all results in a `Merge` node before the Code node, still hitting OOM. The failure is at the Merge node, not the HTTP node.
- OOM from binary data mode in memory (`N8N_DEFAULT_BINARY_DATA_MODE=default`) on a large-file workflow — combines with `cases/binary-data-failure`.
- Concurrent saturation: three simultaneous executions of a medium-sized workflow each holding 200 MB, totaling 600 MB, OOMKilling a container limited to 512 MB. Different sub-diagnosis: "concurrent saturation" rather than "single workflow oversized payload."
