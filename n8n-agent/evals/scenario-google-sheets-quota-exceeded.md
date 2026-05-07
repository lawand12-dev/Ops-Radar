---
scenario_id: google-sheets-quota-exceeded-loop
domain: ratelimit
difficulty: easy
ground_truth_label: ratelimit.google-sheets-quota
ground_truth_action: auto-retry
created: 2026-05-07
provenance: synthetic — based on Google Sheets API quota documentation and community forum reports of loop-based row updates
---

# Scenario: Google Sheets per-user quota exhausted in unbatched row-update loop

A workflow that updates 847 Google Sheets rows in a loop — one API call per row, no Split In Batches node — hits the 100 requests/100s per-user quota after row 92. The workflow is tagged `idempotent:true`. Google returns HTTP 429 with a quota-specific message. The immediate action is to wait 60 seconds (the quota resets per minute) and replay — not to involve a human.

## Inputs

### `execution_row`

```json
{
  "id": "exec_sheets_quota_001",
  "workflowId": "wf_sheets_row_updater",
  "mode": "trigger",
  "status": "error",
  "finished": true,
  "startedAt": "2026-05-07T09:15:00Z",
  "stoppedAt": "2026-05-07T09:16:43Z",
  "waitTill": null,
  "retryOf": null
}
```

(Duration ≈ 103 seconds. Rows 1–92 succeeded before the quota fired.)

### `execution_data` (subset)

```json
{
  "lastNodeExecuted": "Update Row",
  "error": {
    "name": "NodeApiError",
    "message": "Quota exceeded for quota metric 'sheets.googleapis.com/spreadsheet_requests_per_minute_per_user' and limit 'SPREADSHEET_REQUESTS_PER_MINUTE_PER_USER' of service 'sheets.googleapis.com'.",
    "httpCode": "429",
    "node": "Update Row",
    "context": {
      "data": {
        "error": {
          "code": 429,
          "message": "Quota exceeded for quota metric 'sheets.googleapis.com/spreadsheet_requests_per_minute_per_user' and limit 'SPREADSHEET_REQUESTS_PER_MINUTE_PER_USER' of service 'sheets.googleapis.com'.",
          "status": "RESOURCE_EXHAUSTED",
          "details": [
            {
              "@type": "type.googleapis.com/google.rpc.ErrorInfo",
              "reason": "RATE_LIMIT_EXCEEDED",
              "domain": "googleapis.com",
              "metadata": {
                "service": "sheets.googleapis.com",
                "quota_metric": "sheets.googleapis.com/spreadsheet_requests_per_minute_per_user",
                "quota_limit": "SPREADSHEET_REQUESTS_PER_MINUTE_PER_USER"
              }
            }
          ]
        }
      },
      "headers": {
        "retry-after": "60",
        "content-type": "application/json; charset=UTF-8"
      }
    }
  },
  "runData": {
    "Schedule Trigger": [
      { "executionTime": 8, "data": { "main": [[{ "timestamp": "2026-05-07T09:15:00Z" }]] } }
    ],
    "Fetch Rows to Update": [
      { "executionTime": 412, "data": { "main": [[{ "rowCount": 847 }]] } }
    ],
    "Loop Over Items": [
      { "executionTime": 2, "data": { "main": [[{ "currentIndex": 92 }]] } }
    ],
    "Update Row": [
      { "executionTime": 980, "error": "see top-level error" }
    ]
  }
}
```

### `workflow_definition` (relevant slice)

```json
{
  "id": "wf_sheets_row_updater",
  "name": "Nightly CRM → Google Sheets sync (847 rows)",
  "active": true,
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": { "rule": { "interval": [{ "field": "hours", "hoursInterval": 24 }] } }
    },
    {
      "name": "Fetch Rows to Update",
      "type": "n8n-nodes-base.googleSheets",
      "parameters": { "operation": "readAllRows", "sheetName": "CRM Export" },
      "credentials": { "googleSheetsOAuth2Api": { "id": "cred_sheets_002", "name": "Ops Workspace OAuth" } }
    },
    {
      "name": "Loop Over Items",
      "type": "n8n-nodes-base.splitInBatches",
      "parameters": { "batchSize": 1 }
    },
    {
      "name": "Update Row",
      "type": "n8n-nodes-base.googleSheets",
      "parameters": { "operation": "updateRow", "sheetName": "CRM Export" },
      "credentials": { "googleSheetsOAuth2Api": { "id": "cred_sheets_002", "name": "Ops Workspace OAuth" } }
    }
  ],
  "settings": { "executionTimeout": 600 },
  "versionId": "v_2026-03-15-2"
}
```

### `external_signals`

```json
{
  "tags_on_workflow": ["idempotent:true"],
  "recent_sheets_quota_failures_same_credential_last_hour": 0,
  "recent_sheets_quota_failures_other_workflows_last_hour": 0,
  "other_credentials_of_same_type_failing": false,
  "retry_after_header_seconds": 60,
  "previous_retry_count_for_this_execution": 0
}
```

### `prior_failures` (last 48 h, same workflow)

```json
[
  {
    "executionId": "exec_sheets_quota_000",
    "startedAt": "2026-05-06T09:15:00Z",
    "status": "success",
    "error": null
  }
]
```

(Yesterday's run succeeded — this is the first quota failure for this workflow.)

## Expected output

```yaml
expected_label:           ratelimit.google-sheets-quota
expected_subtype:         per-user-per-minute
expected_confidence:      high
expected_action:          auto-retry
expected_evidence_keys:
  - error.httpCode
  - error.message
  - error.node
  - error.context.headers.retry-after
  - tags_on_workflow
  - previous_retry_count_for_this_execution
expected_case_loaded:     cases/google-sheets-quota
forbidden_actions:
  - notify-human                     # workflow is idempotent, quota resets in 60s — no human action needed
  - escalate-engineer                # not a platform failure; a per-user rate limit hit during an unbatched loop
  - auto-retry without delay         # retrying immediately will hit the same 429; must honor the retry-after header
```

## Grading notes

The agent should:

1. Walk `decision-trees/failure-diagnosis` and reach `ratelimit.google-sheets-quota` from `httpCode=429 + error.node CONTAINS "google sheets" + error.message CONTAINS "quota metric 'sheets.googleapis.com'"`. The node name is the first discriminator — it must be Google Sheets, not Facebook/Meta.
2. Load `cases/google-sheets-quota`.
3. Cross-check Signals:
   - Read `error.context.headers.retry-after = 60` → the canonical wait window. Google's per-user quota resets per minute; 60 seconds is correct.
   - Read `tags_on_workflow = ["idempotent:true"]` → replay is safe. Row updates are idempotent (writing the same value twice is harmless).
   - Read `recent_sheets_quota_failures_same_credential_last_hour = 0` → not a recurring structural problem; this is a one-time burst. Auto-retry is appropriate.
   - Read `other_credentials_of_same_type_failing = false` → quota is user-scoped, not a service-wide outage.
4. Choose `auto-retry` with `delay = 60 + jitter` seconds (use the `retry-after` header value, not a formula default).
5. Compose `record_attempt` with `attempt=1, delay_seconds=60+jitter`.

**Trap 1 — confusion with Meta BUC rate limit.** Both produce httpCode=429. The discriminator is `error.node`: "Update Row" in a Google Sheets workflow, not any "Facebook"|"Meta" node. The quota metric string (`sheets.googleapis.com/spreadsheet_requests_per_minute_per_user`) further confirms Google Sheets. An agent that conflates Google Sheets quota with Meta BUC will reach the wrong case file and potentially compute the wrong backoff.

**Trap 2 — choosing notify-human because "it needs a code change."** Yes, the workflow should use Split In Batches with a larger batch size and add a delay between API calls — but that is prevention advice, not the immediate recovery action. The immediate action is auto-retry; the structural recommendation belongs in the next digest or the notification's Prevention section, NOT as the action choice. The eval explicitly forbids notify-human as the action on this scenario.

**Trap 3 — ignoring the retry-after header.** The agent must use the explicit `retry-after: 60` header rather than the default exponential backoff formula. Case files for quota-based rate limits specify that vendor-provided reset windows take priority over the formula.

Common LLM mistakes:

- Routing to `ratelimit.meta-buc` because both show 429 and "rate limit" wording. The discriminator is the node name and the quota metric string.
- Choosing `notify-human` because the root cause is a code design flaw (no batching, no delay). The code fix is a prevention note, not the recovery action.
- Computing backoff from formula (30s base, exponential) instead of reading `retry-after: 60`.
- Escalating because `sheets.googleapis.com` looks like a platform service issue — it is not; it's a per-user quota, confirmed by `other_credentials_of_same_type_failing = false`.
