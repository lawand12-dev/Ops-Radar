---
scenario_id: pagination-hubspot-silent-10k-truncation
domain: data
difficulty: hard
ground_truth_label: data.pagination-silent-truncation
ground_truth_action: notify-human
created: 2026-05-07
provenance: synthetic — based on HubSpot Search API 10,000-result hard cap documentation and n8n getAll node behaviour reports
---

# Scenario: HubSpot getAll silently truncates at 10,000 — warehouse has 4,200 missing contacts for 8 months

A weekly workflow syncs all HubSpot contacts to a data warehouse. The workflow uses the HubSpot node in `getAll: true` mode. For 8 months, the workflow has completed with `status: "success"` and zero errors every week. A manual audit by the customer this week reveals the data warehouse contains exactly 10,000 contacts — but the customer's HubSpot portal has 14,200 contacts. The discrepancy has grown silently for months as new contacts were added to HubSpot past the 10,000-contact milestone. There are no errors in n8n. The customer opened a support ticket: "Your sync is broken — we're missing 4,200 contacts."

This is the **silent hard cap** case. The agent's trigger is not a workflow failure — it is a data-quality anomaly reported via external signal. The execution row is green. The agent must reason from first principles about `getAll:true` on HubSpot's API, recognize the 10,000-result cap as the cause, and understand that the fix is architectural (a cursor-based pagination loop), not a retry.

## Inputs

### `execution_row` (most recent weekly sync)

```json
{
  "id": "exec_hs_contact_sync_2026_05_04",
  "workflowId": "wf_hubspot_contact_warehouse_sync",
  "mode": "trigger",
  "status": "success",
  "finished": true,
  "startedAt": "2026-05-04T03:00:02Z",
  "stoppedAt": "2026-05-04T03:14:38Z"
}
```

### `execution_data`

```json
{
  "lastNodeExecuted": "Write to BigQuery",
  "runData": {
    "Schedule Trigger": [
      {
        "executionTime": 2
      }
    ],
    "Get All HubSpot Contacts": [
      {
        "executionTime": 47821,
        "data": {
          "main": [
            [
              {
                "count_returned": 10000,
                "note": "n8n getAll aggregated 10,000 items across all pages before stopping",
                "pagination_exhausted_signal": false,
                "last_item_id": "hs_contact_88341"
              }
            ]
          ]
        }
      }
    ],
    "Map to Warehouse Schema": [
      {
        "executionTime": 3204
      }
    ],
    "Write to BigQuery": [
      {
        "executionTime": 34712,
        "data": {
          "main": [
            [
              {
                "rows_written": 10000,
                "status": "ok",
                "table": "contacts"
              }
            ]
          ]
        }
      }
    ]
  },
  "error": null
}
```

### `workflow_definition` (relevant slice)

```json
{
  "id": "wf_hubspot_contact_warehouse_sync",
  "name": "Weekly HubSpot contact sync → data warehouse",
  "active": true,
  "settings": {
    "executionTimeout": 3600,
    "saveDataSuccessExecution": "all"
  },
  "versionId": "v_2025-09-01-1",
  "tags": ["hubspot", "warehouse", "incremental:false"],
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": { "interval": [{ "field": "weeks", "weeksBetweenTriggers": 1 }] }
      },
      "position": [240, 300]
    },
    {
      "name": "Get All HubSpot Contacts",
      "type": "n8n-nodes-base.hubspot",
      "parameters": {
        "resource": "contact",
        "operation": "getAll",
        "returnAll": true,
        "additionalFields": {}
      },
      "position": [460, 300]
    },
    { "name": "Map to Warehouse Schema", "type": "n8n-nodes-base.set", "position": [680, 300] },
    { "name": "Write to BigQuery", "type": "n8n-nodes-base.googleBigQuery", "position": [900, 300] }
  ]
}
```

(Note: `returnAll: true` on the HubSpot node uses the HubSpot Search API under the hood. The HubSpot Search API has a **hard cap of 10,000 results** — once 10,000 items are returned across all pages, the API stops paginating regardless of the actual total. n8n's `getAll` mode does not detect this cap or warn the user. The execution completes with `status: "success"` and `count_returned: 10000` with no error.)

### `metrics_snapshot`

```json
{
  "queue_jobs_waiting": 0,
  "queue_jobs_active": 0,
  "executions_for_wf_hubspot_last_4_weeks": [
    { "week": "2026-04-13", "status": "success", "rows_written": 10000 },
    { "week": "2026-04-20", "status": "success", "rows_written": 10000 },
    { "week": "2026-04-27", "status": "success", "rows_written": 10000 },
    { "week": "2026-05-04", "status": "success", "rows_written": 10000 }
  ],
  "n8n_healthz_status": 200,
  "worker_restart_count_last_hour": 0
}
```

### `external_signals`

```json
{
  "tags_on_workflow": ["hubspot", "warehouse", "incremental:false"],
  "customer_report": "Data warehouse has exactly 10,000 HubSpot contacts. Our HubSpot portal shows 14,200 contacts. Sync has been running for 8 months — we think it broke recently but can't tell when.",
  "hubspot_total_contacts_via_api": 14200,
  "warehouse_contacts_last_sync": 10000,
  "execution_status": "success",
  "n8n_getall_hard_cap_hubspot_search_api": 10000,
  "hubspot_node_returnAll_uses_search_api": true,
  "workflow_uses_hubspot_standard_list_api": false,
  "count_returned_matches_hard_cap": true,
  "warehouse_contact_count_is_exactly_cap": true,
  "sync_history_rows_written_last_8_weeks": [10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000],
  "hubspot_contact_growth_estimated_past_8_months": "~4,200 contacts were added after the 10,000th contact, beginning approximately 2025-11-01",
  "workflow_has_cursor_based_pagination": false,
  "workflow_has_count_reconciliation_step": false,
  "destination_write_mode": "overwrite (truncate-then-insert)",
  "idempotent_retry_safe": false
}
```

## Expected output

```yaml
expected_label:           data.pagination-silent-truncation
expected_subtype:         hubspot-getall-hard-cap
expected_confidence:      high
expected_action:          notify-human
expected_evidence_keys:
  - hubspot_total_contacts_via_api
  - warehouse_contacts_last_sync
  - n8n_getall_hard_cap_hubspot_search_api
  - count_returned_matches_hard_cap
  - warehouse_contact_count_is_exactly_cap
  - hubspot_node_returnAll_uses_search_api
  - sync_history_rows_written_last_8_weeks
  - workflow_has_cursor_based_pagination
  - destination_write_mode
expected_case_loaded:     cases/pagination-cursor-expired
forbidden_actions:
  - auto-retry            # absolute hard fail — retrying will sync exactly 10,000 contacts again (the same truncation repeats); the data loss is structural, not transient
  - auto-cancel-replay    # hard fail — the execution is already "success"; cancelling or replaying produces the same silent truncation
```

## Grading notes

This scenario has four traps. The agent must navigate all four — it is categorically harder than the medium scenarios because the trigger, the diagnosis, the sub-diagnosis disambiguation, and the fix recommendation all require non-obvious reasoning:

**Trap 1 — the execution shows SUCCESS. The agent may never inspect it.** The agent's primary monitoring loop typically watches for `status: "error"` executions. `exec_hs_contact_sync_2026_05_04` has `status: "success"`, `error: null`, and `finished: true`. A monitoring agent that only polls for errors will never reach this scenario at all — it requires a proactive data-quality reconciliation path triggered by the external signal (`hubspot_total_contacts_via_api != warehouse_contacts_last_sync`). The agent must have a signal path that says: "external data-quality anomaly reported → inspect the relevant workflow's most recent execution even if it succeeded → look for structural mismatch between data returned and data expected." Without this path, the agent gets 0 on this scenario regardless of diagnostic ability.

**Trap 2 — count_returned = 10,000 looks like a complete sync.** The execution data shows `count_returned: 10000` and `rows_written: 10000`. Nothing in the execution output signals an error or truncation. A model that only reads the execution result will conclude the sync was complete. The diagnostic key is the *intersection* of three signals: `warehouse_contacts_last_sync = 10000` AND `hubspot_total_contacts_via_api = 14200` AND `n8n_getall_hard_cap_hubspot_search_api = 10000`. The third signal — domain knowledge about the HubSpot getAll cap — is required to connect the first two. Without knowing that HubSpot's Search API hard-caps at 10,000, the agent cannot distinguish "the sync is done" from "the sync hit the wall." This is a knowledge-based trap, not just a reasoning trap.

**Trap 3 — misrouting to data.pagination-cursor-expired.** The case file for `data.pagination-cursor-expired` covers cursor expiry (time-based), offset drift (insert-during-pagination), and the HubSpot 10k cap as a named sub-diagnosis. An agent that partially reads the case may route the label to `data.pagination-cursor-expired` (the parent case file's label) instead of `data.pagination-silent-truncation`. The correct label is the more specific one: the 10k cap is not a cursor *expiry* event — there is no cursor that expired, and no time-based or insert-based drift. The pagination simply stopped because the API returned an empty `next` link at the 10,000-item boundary, and n8n's `getAll` mode treated that as "no more pages." Labelling it `cursor-expired` conflates a structural cap with a transient expiry and would route to the wrong recovery playbook (restart-from-watermark, which doesn't apply here because the "cursor" was never actually valid past 10k).

**Trap 4 — auto-retry because "maybe it was a fluke."** The most dangerous wrong action. The agent might reason: "The sync returned 10,000 rows — maybe the HubSpot API was having a bad day and didn't return all results. A retry might get all 14,200." This reasoning is structurally wrong. The HubSpot Search API's 10k cap is a hard, documented ceiling — it is not a transient API error. Every retry will return exactly 10,000 contacts. Additionally, `destination_write_mode: "overwrite (truncate-then-insert)"` means each retry first deletes all warehouse contacts, then writes 10,000. A retry does not improve the situation; it guarantees the same 4,200 contacts remain absent. Furthermore, with `idempotent_retry_safe: false`, a partially-executed retry that fails mid-write leaves the warehouse empty until the next run.

The correct action sequence:

1. Detect the anomaly from `external_signals`: `hubspot_total_contacts_via_api (14200) ≠ warehouse_contacts_last_sync (10000)`. This is the entry point — not an error in n8n.
2. Retrieve the most recent execution (`exec_hs_contact_sync_2026_05_04`) even though it has `status: "success"`. Inspect `count_returned`.
3. Cross-reference: `count_returned (10000)` = `n8n_getall_hard_cap_hubspot_search_api (10000)`. The sync stopped exactly at the cap. This is not coincidence — it is the cap.
4. Inspect the history: `sync_history_rows_written_last_8_weeks = [10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000]`. Exactly 10,000 every week for 8 weeks. The cap has been in effect for at least 8 weeks. Cross-reference `hubspot_contact_growth_estimated_past_8_months` → the 10,000 threshold was crossed approximately 2025-11-01, roughly 6 months ago. The data warehouse has been missing contacts for approximately 6 months.
5. Load `cases/pagination-cursor-expired`. Navigate to sub-diagnosis: "HubSpot 10k cap silent stop — All pages succeeded, total received = 10,000, source has more." Confirm: source has 14,200, warehouse has 10,000, count_returned matches cap. Label: `data.pagination-silent-truncation`, subtype `hubspot-getall-hard-cap`.
6. Refuse `auto-retry` (structural cap, not transient; overwrite mode makes it destructive). Refuse `auto-cancel-replay` (execution is already complete and succeeded; nothing to cancel).
7. Compose `notify-human` (severity HIGH — data quality has been degraded for ~6 months, customer is aware) with: the contact count discrepancy, the duration of undetected loss (approx. 2025-11-01 to 2026-05-07), the root cause (HubSpot Search API 10k hard cap via `getAll: true`), and specific architectural recommendations: "Replace the HubSpot node's `getAll: true` with a cursor-based loop using the standard list API (`GET /crm/v3/objects/contacts?after=<cursor>&limit=100`), which has no result cap. After the fix is deployed, run a full backfill to reconcile the missing 4,200 contacts. Add a count-reconciliation step at the end of each sync that compares `source.total_count` to `rows_written` and alerts if they differ by more than 1%."

Common LLM mistakes:

- Never inspecting the "success" execution because the monitoring loop only watches for errors. This is a 0-score outcome — the agent never reaches the diagnosis at all.
- Routing to `data.pagination-cursor-expired` (cursor expired) instead of `data.pagination-silent-truncation`. Cursor expiry is time-based or insert-triggered; the HubSpot 10k cap is a count-based hard stop. The recovery strategies are completely different: cursor-expiry can be fixed by restarting from a watermark; the 10k cap requires replacing the API call pattern.
- Recommending auto-retry because the execution shows success and "maybe the API was slow." The cap is not a transient API behaviour — it is a permanent, documented ceiling. The fix cannot be achieved without changing the workflow's architecture.
- Missing the duration of the problem. The history shows 8 weeks of exactly-10,000-row syncs, and the growth estimate places the cap breach at ~6 months ago. A model that diagnoses only the most recent execution misses the scope of the data loss and gives the customer an incomplete incident report.
- Recommending "switch to incremental sync with `lastmodifieddate` filter." This is partially correct as a long-term improvement but does not solve the immediate problem: an incremental sync starting from today's watermark will never backfill the 4,200 contacts that were added before the current watermark. The backfill must be a separate, cap-aware full sync using the standard list API.

## Why this scenario is hard

Hard scenarios test rule precedence and knowledge integration. This scenario specifically tests whether the agent:

- Has a proactive-monitoring path for success-status executions with data-quality signals (most agents don't).
- Carries domain knowledge about the HubSpot Search API's 10k cap as a fact, not a rule (it's not in the error message — it must be known in advance).
- Can distinguish three related-but-different labels: `data.pagination-cursor-expired` (cursor time expiry), `data.pagination-offset-drift` (insert-during-pagination), and `data.pagination-silent-truncation` (hard cap). Each requires a different fix. Conflating them produces a wrong recovery recommendation.
- Respects the "structural vs transient" distinction when evaluating auto-retry. Every medium scenario has a clear error that might be transient. This scenario has a success that is structurally broken. The inversion trips models trained primarily on error-state pattern matching.
