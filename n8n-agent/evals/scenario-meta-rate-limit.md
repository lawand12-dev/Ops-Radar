---
scenario_id: meta-buc-rate-limit-account-tier
parsing-policy: strict
domain: ratelimit
difficulty: medium
ground_truth_label: ratelimit.meta-buc
ground_truth_action: auto-retry
created: 2026-05-07
provenance: synthetic — based on Meta Marketing API BUC throttling docs
---

# Scenario: Meta Marketing API hits BUC ad-account rate limit

A customer's daily reporting workflow pulls insights for 25 ad accounts in series. Around the 18th account, Meta starts returning rate-limit errors with `error.code=17`. The error includes BUC headers indicating the customer's ad account is at 92% utilization with 12 minutes until reset.

## Inputs

### `execution_row`

```json
{
  "id": "exec_meta_2026_05_07_001",
  "workflowId": "wf_paid_media_daily",
  "mode": "trigger",
  "status": "error",
  "finished": true,
  "startedAt": "2026-05-07T05:00:00Z",
  "stoppedAt": "2026-05-07T05:14:32Z"
}
```

### `execution_data` (subset)

```json
{
  "lastNodeExecuted": "Meta Insights — Account 18",
  "error": {
    "name": "NodeApiError",
    "message": "(#17) User request limit reached",
    "httpCode": "429",
    "node": "Meta Insights — Account 18",
    "context": {
      "data": {
        "error": {
          "code": 17,
          "error_subcode": 2446079,
          "fbtrace_id": "AbC123DeF456"
        }
      },
      "headers": {
        "x-business-use-case-usage": "{\"act_998877665\":[{\"type\":\"ads_insights\",\"call_count\":92,\"total_cputime\":48,\"total_time\":52,\"estimated_time_to_regain_access\":12}]}",
        "x-app-usage": "{\"call_count\":34,\"total_cputime\":18,\"total_time\":22}"
      }
    }
  }
}
```

### `workflow_definition` (relevant slice)

```json
{
  "id": "wf_paid_media_daily",
  "name": "Daily paid-media reporting (25 accounts)",
  "active": true,
  "settings": { "executionTimeout": 1800 },
  "versionId": "v_2026-05-01-3"
}
```

### `external_signals`

```json
{
  "tags_on_workflow": ["idempotent:true", "revenue:true"],
  "recent_meta_failures_same_account_last_hour": 1,
  "recent_meta_failures_other_accounts_last_hour": 0,
  "previous_meta_workflow_retry_count_for_this_execution": 0
}
```

## Expected output

```yaml
expected_label:           ratelimit.meta-buc
expected_subtype:         account-tier
expected_confidence:      high
expected_action:          auto-retry
expected_evidence_keys:
  - error.httpCode
  - error.context.data.error.code
  - x-business-use-case-usage.estimated_time_to_regain_access
  - x-app-usage.call_count
  - tags_on_workflow
expected_case_loaded:     cases/meta-api-rate-limit
forbidden_actions:
  - escalate-engineer            # tier is correctly identified as account-level (BUC), not app-level — engineering escalation is wrong
  - auto-retry without backoff   # retrying immediately produces the same 429
  - notify-human                 # workflow is idempotent and BUC has a clear wait window — auto-retry is the correct path
```

## Grading notes

The agent should:

1. Reach `decision-trees/failure-diagnosis` leaf `ratelimit.meta-buc` from `httpCode=429 + error.node CONTAINS "facebook"|"meta"`.
2. Load `cases/meta-api-rate-limit`.
3. Cross-check Signals:
   - Read `x-business-use-case-usage.estimated_time_to_regain_access = 12` → the canonical wait window.
   - Read `x-app-usage.call_count = 34` → well below 100, so app-level tier is **not** firing. Discriminates account-level vs app-level.
   - Read `recent_meta_failures_same_account_last_hour = 1` → not a prolonged BUC penalty pattern.
4. Choose `auto-retry` with `delay = 12 * 60 + jitter` seconds (use the explicit BUC value, not the formula default).
5. Compose `record_attempt` with `attempt=1, delay_seconds=720+jitter`.
6. Workflow is tagged `idempotent:true` AND `revenue:true` — replay is safe; the revenue tag means an extra customer-visible note in the digest, but does not block auto-retry.

Common LLM mistakes:

- Picking `escalate-engineer` because the workflow is `revenue:true`. Wrong — revenue tag affects reporting, not the action choice.
- Picking the default formula backoff (30 s base, exponential) instead of the explicit BUC value (12 min). The case file is explicit that BUC's `estimated_time_to_regain_access` overrides the formula.
- Reading `x-app-usage.call_count = 34` and concluding nothing — failing to use it to **rule out** the app-level tier.

## Variants worth adding later

- App-level rate limit (`x-app-usage.call_count = 100+`) — same surface error, but `escalate-engineer` is correct because all customer apps are throttled.
- Repeated BUC hits over the past hour (`recent_meta_failures > 3`) — auto-retry not appropriate; workflow has a structural problem.
- Meta returns HTTP 200 with `error.code=17` in body (the inconsistent-status-code variant) — the agent must read both fields.
