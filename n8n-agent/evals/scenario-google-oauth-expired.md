---
scenario_id: google-oauth-expired-testing-mode
domain: auth
difficulty: easy
ground_truth_label: auth.refresh-expired
ground_truth_action: notify-human
created: 2026-05-07
provenance: synthetic — based on Google OAuth 7-day testing-mode policy
---

# Scenario: Google OAuth refresh token expired (testing-mode 7-day rule)

A customer's Google Sheets workflow has been running successfully for 6 days, then starts failing on every execution. The Google OAuth app is in **Testing** publishing status (visible only via the customer's Google Cloud Console — not via the n8n API).

## Inputs

### `execution_row`

```json
{
  "id": "exec_8a2c1d4e5f",
  "workflowId": "wf_abc123",
  "mode": "trigger",
  "status": "error",
  "finished": true,
  "startedAt": "2026-05-07T08:00:01Z",
  "stoppedAt": "2026-05-07T08:00:03Z",
  "waitTill": null,
  "retryOf": null
}
```

### `execution_data` (subset of `data.resultData`)

```json
{
  "lastNodeExecuted": "Google Sheets",
  "error": {
    "name": "NodeApiError",
    "message": "Unauthorized — Token has been expired or revoked.",
    "httpCode": "401",
    "node": "Google Sheets",
    "context": {
      "data": {
        "error": "invalid_grant",
        "error_description": "Token has been expired or revoked."
      }
    }
  },
  "runData": {
    "Schedule Trigger": [{ "executionTime": 12, "data": { "main": [[{}]] } }],
    "Google Sheets":    [{ "executionTime": 287, "error": "see top-level error" }]
  }
}
```

### `workflow_definition` (relevant slice)

```json
{
  "id": "wf_abc123",
  "name": "Daily client report — sheet sync",
  "active": true,
  "nodes": [
    { "name": "Schedule Trigger", "type": "n8n-nodes-base.scheduleTrigger", "parameters": { "timezone": "America/Los_Angeles" }},
    { "name": "Google Sheets",    "type": "n8n-nodes-base.googleSheets",   "credentials": { "googleApi": { "id": "cred_g_001", "name": "Sales Workspace OAuth" }}}
  ],
  "settings": { "timezone": "America/Los_Angeles", "executionTimeout": 600 },
  "versionId": "v_2026-04-12-1"
}
```

### `external_signals`

```json
{
  "credential_metadata": {
    "id": "cred_g_001",
    "name": "Sales Workspace OAuth",
    "type": "googleApi",
    "createdAt": "2026-05-01T15:00:00Z",
    "updatedAt": "2026-05-01T15:00:00Z"
  },
  "credential_age_days_since_last_refresh": 6.7,
  "other_credentials_of_same_type_failing": false
}
```

### `prior_failures` (last 24 h, same workflow)

```json
[
  { "executionId": "exec_prev_1", "startedAt": "2026-05-07T07:00:00Z", "status": "error", "error.message": "invalid_grant" },
  { "executionId": "exec_prev_2", "startedAt": "2026-05-07T06:00:00Z", "status": "error", "error.message": "invalid_grant" }
]
```

## Expected output

```yaml
expected_label:           auth.refresh-expired
expected_subtype:         refresh-expired
expected_confidence:      high
expected_action:          notify-human
expected_evidence_keys:
  - error.httpCode
  - error.message
  - error.node
  - credential_updatedAt_age_days
  - other_credentials_of_same_type_failing
expected_case_loaded:     cases/google-oauth-expired
forbidden_actions:
  - auto-refresh                  # because credential_age_days > 7d testing-mode window — refresh will fail; auto-refresh wastes a call and may trip the consecutive-failure stop condition
  - auto-cancel-replay            # would just produce another invalid_grant
  - any soft-write tool that does not first surface the issue to the customer
```

## Grading notes

The agent should:

1. Walk `decision-trees/failure-diagnosis` and reach the leaf `auth.refresh-expired` from `error.name=NodeApiError + httpCode=401 + error.message matches /invalid_grant|expired|refresh.*token/i`.
2. Load `cases/google-oauth-expired`.
3. Cross-check Signals: `credential_updatedAt` age = 6.7 days; `other_credentials_of_same_type_failing = false`. This rules out OAuth client revocation; it's a single-user / testing-mode scenario.
4. Notice the prior_failures pattern (3 consecutive failures, all same error). Treat as known issue, not a fresh transient.
5. Choose `notify-human` because:
   - The case file's "Sub-diagnoses" table specifically identifies the testing-mode 7-day rule.
   - `auto-refresh` would fail (the refresh token itself is dead, not just the access token).
6. Compose an alert that names the credential (`Sales Workspace OAuth`), the suspected sub-diagnosis (testing-mode 7-day expiry), the customer-facing fix ("Reconnect this credential in n8n: Settings → Credentials → Sales Workspace OAuth → Reconnect"), and a Prevention bullet ("move the OAuth app from Testing to Production-verified to eliminate the 7-day expiry").

A common LLM mistake on this scenario: choosing `auto-refresh` because it sees `auth.refresh-expired` in the decision tree and forgets to read the case file's specific sub-diagnosis disambiguation. The runtime's stop-condition guard would catch the second consecutive `auto-refresh` failure within 24 h, but the eval still penalizes the agent for the wasted call and the customer-visible delay.

## Variants worth adding later

- Production-verified Google app (refresh token would have succeeded; expected action shifts to `auto-refresh`).
- Multiple credentials of the same type failing simultaneously (OAuth client revoked → `escalate-engineer`).
- User-revoked-at-myaccount.google.com (single user; same outcome as testing-mode but different prevention bullet).
