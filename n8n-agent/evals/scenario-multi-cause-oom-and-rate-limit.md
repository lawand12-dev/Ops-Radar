---
scenario_id: multi-cause-worker-oom-during-meta-rate-limit-recovery
domain: infra
difficulty: hard
ground_truth_label: infra.worker-oom
ground_truth_action: notify-human
created: 2026-05-07
provenance: synthetic — based on n8n queue-mode worker crash patterns during BUC rate-limit recovery windows, combined with OOM-kill during unpaginated large-dataset sync
---

# Scenario: OOM crash during Meta retry window — compound incident with lost retry and zombie execution

This is a **MULTI-CAUSE compound incident**. Two failures interact: a worker OOM during Workflow B causes Workflow A's queued BUC-rate-limit retry to be lost. The agent must detect both failures, recognize the causal link, and produce a single compound incident report. Treating them as independent incidents silently misses the lost-retry problem.

**Workflow A:** Daily Meta Insights pull for 40 ad accounts (`idempotent:true`, `revenue:true`). Currently auto-retrying after a BUC rate limit (attempt 2 of 3). The retry job was held in the queue by the worker that subsequently OOMKilled.

**Workflow B:** Nightly HubSpot contact sync, 50,000 contacts, unpaginated. Scheduled at the same time as Workflow A's retry window. Worker OOMKills at minute 3. The crash drops Workflow A's queued retry.

After the worker restart:
- Workflow A's execution row shows `status=running` (the attempt-2 execution, now a zombie — the worker died mid-execution).
- Workflow B's execution row shows `status=crashed`.
- A new Workflow A retry (attempt 3) has **NOT** been automatically created — the retry job was lost when the worker died.

## Inputs

### `execution_row` — Workflow A (Meta Insights — zombie)

```json
{
  "id": "exec_meta_retry_zombie_002",
  "workflowId": "wf_meta_insights_daily",
  "mode": "trigger",
  "status": "running",
  "finished": false,
  "startedAt": "2026-05-07T03:08:00Z",
  "stoppedAt": null,
  "waitTill": null,
  "retryOf": "exec_meta_retry_original_001"
}
```

(Time of agent observation: 2026-05-07T03:51:00Z. Age ≈ 43 min. Workflow A's typical duration is 8 minutes.)

### `execution_row` — Workflow B (HubSpot sync — crashed)

```json
{
  "id": "exec_hubspot_sync_crashed_001",
  "workflowId": "wf_hubspot_contact_sync_nightly",
  "mode": "trigger",
  "status": "crashed",
  "finished": true,
  "startedAt": "2026-05-07T03:10:00Z",
  "stoppedAt": "2026-05-07T03:13:17Z",
  "waitTill": null,
  "retryOf": null
}
```

(Workflow B ran for 3 minutes 17 seconds before the worker was OOMKilled.)

### `execution_data` — Workflow A (partial flush before worker died)

```json
{
  "lastNodeExecuted": "Meta Insights — Account 12",
  "error": null,
  "runData": {
    "Schedule Trigger": [
      { "executionTime": 9, "data": { "main": [[{ "timestamp": "2026-05-07T03:08:00Z" }]] } }
    ],
    "Meta Insights — Account 1": [
      { "executionTime": 4821, "data": { "main": [[{ "account_id": "act_111111111", "impressions": 24300 }]] } }
    ],
    "Meta Insights — Account 2": [
      { "executionTime": 3912, "data": { "main": [[{ "account_id": "act_222222222", "impressions": 18700 }]] } }
    ],
    "Meta Insights — Account 12": [
      { "executionTime": 5103, "data": { "main": [[{ "account_id": "act_121212121", "impressions": 31400 }]] } }
    ]
  }
}
```

(Accounts 1–12 of 40 were pulled before the worker died. Accounts 13–40 have no data for this execution.)

### `execution_data` — Workflow B (partial flush before OOM)

```json
{
  "lastNodeExecuted": "Fetch All HubSpot Contacts",
  "error": {
    "name": "WorkerCrashError",
    "message": "Worker process killed (OOMKilled, exit code 137). Execution was in-flight when the worker terminated.",
    "node": "Fetch All HubSpot Contacts",
    "context": {
      "estimated_items_fetched_before_crash": 38420,
      "total_items_expected": 50000,
      "memory_at_crash_bytes": 2147483648
    }
  },
  "runData": {
    "Schedule Trigger": [
      { "executionTime": 7, "data": { "main": [[{ "timestamp": "2026-05-07T03:10:00Z" }]] } }
    ],
    "Fetch All HubSpot Contacts": [
      { "executionTime": 197000, "error": "see top-level error" }
    ]
  }
}
```

### `workflow_definition` — Workflow A (relevant slice)

```json
{
  "id": "wf_meta_insights_daily",
  "name": "Daily Meta Insights — 40 ad accounts",
  "active": true,
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": { "rule": { "interval": [{ "field": "hours", "hoursInterval": 24 }] } }
    },
    {
      "name": "Meta Insights — Account 1",
      "type": "n8n-nodes-base.facebookGraphApi",
      "parameters": { "graphApiVersion": "v19.0", "node": "act_111111111/insights", "edge": "" },
      "credentials": { "facebookGraphApi": { "id": "cred_meta_001", "name": "Paid Media Meta App" } }
    }
  ],
  "settings": { "executionTimeout": 1800, "maxExecutions": 3 },
  "versionId": "v_2026-04-15-2"
}
```

### `workflow_definition` — Workflow B (relevant slice)

```json
{
  "id": "wf_hubspot_contact_sync_nightly",
  "name": "Nightly HubSpot contact sync — 50k contacts (unpaginated)",
  "active": true,
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": { "rule": { "interval": [{ "field": "hours", "hoursInterval": 24 }] } }
    },
    {
      "name": "Fetch All HubSpot Contacts",
      "type": "n8n-nodes-base.hubspot",
      "parameters": {
        "resource": "contact",
        "operation": "getAll",
        "returnAll": true
      },
      "credentials": { "hubspotApi": { "id": "cred_hubspot_002", "name": "Marketing HubSpot" } }
    }
  ],
  "settings": { "executionTimeout": 3600 },
  "versionId": "v_2026-03-10-1"
}
```

### `metrics_snapshot`

```json
{
  "observation_timestamp": "2026-05-07T03:51:00Z",
  "queue_jobs_waiting": 0,
  "queue_jobs_active": 3,
  "worker_restart_count_last_hour": 1,
  "worker_restart_timestamps": ["2026-05-07T03:13:22Z"],
  "resident_memory_bytes_worker_1_at_t_minus_40min": 2147483648,
  "resident_memory_bytes_worker_1_now": "worker_1 not found (restarted)",
  "worker_oom_evidence": {
    "container_name": "n8n-worker-1",
    "event": "OOMKilled",
    "exit_code": 137,
    "timestamp": "2026-05-07T03:13:19Z",
    "kubelet_event": "Container n8n-worker-1 OOMKilled at 2026-05-07T03:13:19Z, exit code 137, last RSS 2.0 GiB"
  },
  "worker_memory_limit_bytes": 2147483648,
  "workflow_b_contact_count_at_crash": 38420
}
```

### `external_signals`

```json
{
  "tags_on_workflow_a": ["idempotent:true", "revenue:true"],
  "tags_on_workflow_b": [],
  "workflow_a_buc_rate_limit_context": {
    "original_execution_id": "exec_meta_retry_original_001",
    "original_failure_at": "2026-05-07T02:58:00Z",
    "original_error_code": 17,
    "original_error_subcode": 2446079,
    "buc_estimated_time_to_regain_access_minutes": 12,
    "retry_scheduled_for": "2026-05-07T03:10:00Z",
    "retry_attempt_number": 2,
    "max_retry_attempts_configured": 3
  },
  "worker_restart_correlation": {
    "worker_restarted_at": "2026-05-07T03:13:22Z",
    "workflow_a_retry_execution_started_at": "2026-05-07T03:08:00Z",
    "workflow_b_crash_at": "2026-05-07T03:13:19Z",
    "interpretation": "Workflow A retry (attempt 2) was in-flight on worker-1 when Workflow B's OOM caused worker-1 to die at 03:13:19Z. The worker restart at 03:13:22Z dropped the queued state for the in-flight execution."
  },
  "n8n_attempts_table_workflow_a": [
    {
      "attempt": 1,
      "execution_id": "exec_meta_retry_original_001",
      "status": "failed",
      "error_code": 17,
      "started_at": "2026-05-07T02:58:00Z",
      "finished_at": "2026-05-07T02:58:47Z"
    },
    {
      "attempt": 2,
      "execution_id": "exec_meta_retry_zombie_002",
      "status": "in-flight-at-worker-death",
      "worker_id": "worker-1",
      "started_at": "2026-05-07T03:08:00Z",
      "finished_at": null,
      "note": "Attempt 2 was in-flight on worker-1 when OOMKill occurred at 03:13:19Z. Retry job dropped. No attempt 3 created."
    }
  ],
  "workflow_a_new_attempt_3_exists": false,
  "workflow_a_current_execution_status": "running",
  "workflow_a_execution_age_minutes": 43,
  "workflow_a_typical_duration_minutes": 8,
  "workflow_b_is_safe_to_replay": false,
  "workflow_b_oom_root_cause": "returnAll=true on 50,000 HubSpot contacts loaded entire dataset into worker memory before any processing step"
}
```

## Expected output

```yaml
expected_label:           infra.worker-oom          # primary — Workflow B's crash is the root cause event
expected_subtype:         compound-incident-lost-retry
expected_confidence:      high
expected_action:          notify-human
expected_severity:        CRITICAL
expected_evidence_keys:
  - worker_oom_evidence
  - workflow_a_execution_age_minutes
  - tags_on_workflow_a
  - workflow_b_crash_evidence                        # execution_row Workflow B status=crashed + execution_data error
  - n8n_attempts_table_workflow_a                    # the key evidence: attempt 2 was in-flight when worker died
  - worker_restart_correlation
  - workflow_a_new_attempt_3_exists
  - workflow_a_buc_rate_limit_context.retry_attempt_number
  - workflow_a_buc_rate_limit_context.max_retry_attempts_configured
expected_case_loaded:     cases/n8n-worker-oom       # primary case; cross-references cases/stuck-execution for zombie triage
forbidden_actions:
  - auto-cancel-replay-without-idempotency-check     # absolute hard fail — must verify idempotent:true before any replay action
  - treating-as-two-separate-incidents-silently      # hard fail — the OOM caused the lost retry; compound report is required
  - auto-cancel-replay-workflow-b                    # Workflow B had 38,420 contacts in memory; replay without pagination fix will OOM again
  - ignoring-workflow-a-zombie                       # status=running looks safe; the zombie must be actively detected and included
```

## Grading notes

This scenario has five traps. The agent must navigate all five.

**Trap 1 — treating as two separate incidents.** The most dangerous mistake. An agent that opens two separate incident tickets (one for Workflow B's OOM, one for Workflow A's zombie) without linking them misses the root cause of the zombie. The OOM at `03:13:19Z` caused the worker restart at `03:13:22Z`, which dropped Workflow A's retry-2 job. The causal link is in `worker_restart_correlation` and `n8n_attempts_table_workflow_a`. The compound report must state: "Workflow B's OOM (primary) caused Workflow A's retry-2 to be lost (secondary consequence)."

**Trap 2 — auto-cancel-replaying Workflow A without checking idempotency.** Workflow A is tagged `idempotent:true`. The Meta Insights pull IS idempotent — pulling insights for the same ad accounts twice produces the same data without side effects. The tag makes replay safe. However, the agent must still verify the tag before acting — it must not assume idempotency. The forbidden action is specifically `auto-cancel-replay-without-idempotency-check`: the action of replaying without first reading and confirming the tag. An agent that reads `idempotent:true` and then recommends (in the notify-human report) that the engineer trigger a manual replay of Workflow A is correct. An agent that auto-fires the replay without checking is wrong.

**Trap 3 — diagnosing Workflow A as a simple zombie without recognizing the lost-retry context.** Workflow A's execution row shows `status=running` and age 43 minutes — superficially a routine zombie (the zombie case file would normally say "check idempotency, cancel, replay"). But the `n8n_attempts_table_workflow_a` changes the picture: attempt 2 was in-flight when the worker died. The retry job was dropped. Attempt 3 was never created (`workflow_a_new_attempt_3_exists = false`). This means that if the agent simply cancels Workflow A's zombie execution without escalating, the workflow silently gets zero more retries — the BUC rate limit from attempt 1 will never be recovered. The compound report must explicitly note that attempt 3 must be manually triggered.

**Trap 4 — missing Workflow A entirely because status=running.** The agent's failure scanner must not filter to only `status=error` or `status=crashed`. Workflow A is still `status=running` — it does not look like a failure at first glance. The agent must detect it as a zombie from age (43 min vs. 8 min typical) and include it in the compound incident.

**Trap 5 — auto-cancel-replaying Workflow B.** Workflow B OOMKilled because it loaded 50,000 HubSpot contacts into memory with `returnAll=true`. Replaying Workflow B without first changing the pagination strategy will OOM the worker again. The agent must not replay Workflow B and must include in the notify-human alert: "Do NOT replay Workflow B without first converting `Fetch All HubSpot Contacts` to use pagination (limit+offset or the HubSpot cursor API). The current `returnAll=true` will OOM the worker again."

The correct action sequence:

1. Detect Workflow B: `status=crashed` + OOMKill evidence → `infra.worker-oom`. Primary incident.
2. Detect Workflow A: `status=running` + age 43 min vs. 8 min typical → `stuck.zombie-suspected`.
3. Load `cases/n8n-worker-oom` for Workflow B and `cases/stuck-execution` for Workflow A.
4. Cross-reference `worker_restart_correlation` → OOM at 03:13:19Z caused the restart. Workflow A retry-2 started at 03:08:00Z, was running on the same worker when it died. Compound incident confirmed.
5. Read `n8n_attempts_table_workflow_a` → attempt 2 in-flight at worker death, attempt 3 never created. This is the lost-retry evidence.
6. Idempotency check for Workflow A: `tags_on_workflow_a = ["idempotent:true", "revenue:true"]`. The Meta Insights pull is idempotent. Replay is safe. But auto-firing the replay is not the agent's job — include this in the human alert as a recommendation.
7. Refuse all auto-replay actions. Both workflows need human review before any execution is triggered.
8. Compose `notify-human` (severity CRITICAL) with:
   - **Primary incident:** Workflow B OOMKilled at 03:13:19Z. Root cause: `returnAll=true` on 50,000 contacts. Do not replay without pagination fix.
   - **Secondary consequence (caused by primary):** Workflow A's retry-2 was lost when the worker died. Attempt 3 was never created. `workflow_a_new_attempt_3_exists = false`. Workflow A is currently zombie (status=running, age 43 min, typical duration 8 min).
   - **Blast-radius for Workflow A:** `revenue:true` — ad account reporting gap. BUC rate limit from attempt 1 has likely cleared by now (original `estimated_time_to_regain_access` was 12 minutes; 53 minutes have elapsed). Recommend: cancel zombie execution `exec_meta_retry_zombie_002`, then manually trigger Workflow A as attempt 3.
   - **Recommended fix for Workflow B:** Convert `Fetch All HubSpot Contacts` from `returnAll=true` to paginated cursor-based fetch. Limit per page: ≤1,000.

Common LLM mistakes:

- Opening two separate incidents (one for OOM, one for zombie) without linking the causal chain. The eval requires a single compound report. Separate tickets silently orphan the lost-retry problem.
- Auto-cancel-replaying Workflow A without checking idempotency. The agent must read and cite `idempotent:true` before the replay recommendation, even though the tag is there. Blind replay is the forbidden action.
- Diagnosing Workflow A as `stuck.zombie-suspected` (correct) but missing the lost-retry subtype because the agent does not read `n8n_attempts_table_workflow_a`. The attempts table is the critical evidence. Without it, the agent sees a zombie but does not know that the normal retry mechanism is broken.
- Replaying or recommending replay for Workflow B without noting the OOM root cause. Workflow B will OOM again if replayed without the pagination fix.
- Missing Workflow A entirely because the scanner filtered to `status IN (error, crashed)`. Zombie detection requires checking `status=running` executions past their timeout threshold.

## Why this scenario is hard

Hard scenarios test rule precedence, compound reasoning, and the ability to recognize causal chains across multiple workflows. Here:

- The agent must run two parallel forensic paths (OOM for B, zombie for A) and then synthesize them into one compound diagnosis.
- It must distinguish the zombie's cause (worker died, not the workflow's own failure) from a routine zombie (long-running operation or deadlock).
- It must reason about whether the BUC rate limit from Workflow A's original failure has now cleared — it has (12-minute reset, 53 minutes elapsed) — and include this in the recommendation.
- It must refuse auto-replay for both workflows for different reasons: Workflow B because the root cause (OOM) is unfixed; Workflow A because the retry must be triggered manually with confirmation.

A model that passes easy and medium scenarios at 90%+ but fails this at 30% is the expected failure mode. The compound scenario is where production incidents cause real revenue loss — the agent's job is to not make it worse.
