# Case: Google Sheets API errors

**Type:** Labeled failure case
**Diagnosis label:** `google-sheets.quota-exceeded` / `google-sheets.auth-revoked` / `google-sheets.row-limit-exceeded` / `google-sheets.range-not-found` / `google-sheets.value-input-option-mismatch`
**Routes from:** `decision-trees/failure-diagnosis` (Google Sheets node failure, httpCode∈{400,429} OR silent data corruption path)
**Auto-handle safety:** `quota-exceeded` auto-retry is safe (quota resets per-minute). All others require `notify-human` — they are either admin-gate issues, structural limits, or silent corruption that an auto-retry would mask.
**Updated:** 2026-05-07

## Overview

Google Sheets is one of the most common n8n integration targets for agencies. It sits at the intersection of several distinct failure modes that look superficially similar but require completely different remediation paths. The agent must distinguish between: a transient quota hit (auto-retryable), an admin-level credential revocation (blocks until an admin acts), a spreadsheet structural limit (requires data architecture change), a misconfigured range reference (config fix), and a silent value-encoding mismatch (produces wrong data, not an error).

The critical disambiguation: Google's `RATE_LIMIT_EXCEEDED` and `QUOTA_EXCEEDED` errors both return HTTP 429 but represent different throttle surfaces. Rate limit is transient (per-second burst) and resolves in seconds; quota is per-minute or per-day and may require up to a 100-second wait. The response body `status` and `details[].errorInfo.reason` field disambiguates them.

## Input — what the error looks like

### quota-exceeded (HTTP 429)

```jsonc
{
  "name": "NodeApiError",
  "node": "Google Sheets",
  "httpCode": "429",
  "message": "Quota exceeded for quota metric 'sheets.googleapis.com/spreadsheet_requests_per_minute_per_project' and limit 'SPREADSHEET_REQUESTS_PER_MINUTE_PER_PROJECT' of service 'sheets.googleapis.com'",
  "context": {
    "data": {
      "error": {
        "code": 429,
        "message": "Quota exceeded for quota metric ...",
        "status": "RESOURCE_EXHAUSTED",
        "details": [
          {
            "@type": "type.googleapis.com/google.rpc.ErrorInfo",
            "reason": "RATE_LIMIT_EXCEEDED",      /* or QUOTA_EXCEEDED */
            "domain": "googleapis.com",
            "metadata": {
              "quota_metric": "sheets.googleapis.com/spreadsheet_requests_per_minute_per_project",
              "quota_limit": "SPREADSHEET_REQUESTS_PER_MINUTE_PER_PROJECT",
              "service": "sheets.googleapis.com"
            }
          }
        ]
      }
    }
  }
}
```

### auth-revoked (HTTP 403)

```jsonc
{
  "name": "NodeApiError",
  "node": "Google Sheets",
  "httpCode": "403",
  "message": "The caller does not have permission",
  "context": {
    "data": {
      "error": {
        "code": 403,
        "message": "The caller does not have permission",
        "status": "PERMISSION_DENIED"
      }
    }
  }
}
```

This is distinct from the `invalid_grant` OAuth failure (which returns HTTP 401 with `error: "invalid_grant"`). `PERMISSION_DENIED` with 403 means the credential is valid but access to the specific resource has been administratively blocked.

### row-limit-exceeded (HTTP 400 or silent)

```jsonc
{
  "name": "NodeApiError",
  "node": "Google Sheets",
  "httpCode": "400",
  "message": "You have reached the maximum number of cells for this spreadsheet",
  "context": {
    "data": {
      "error": {
        "code": 400,
        "message": "You have reached the maximum number of cells for this spreadsheet",
        "status": "INVALID_ARGUMENT"
      }
    }
  }
}
```

Silent variant: `values.append` returns HTTP 200 with an empty `updates.updatedRows: 0` or the response `updates` object is absent. The append silently wrote nothing.

### range-not-found (HTTP 400)

```jsonc
{
  "name": "NodeApiError",
  "node": "Google Sheets",
  "httpCode": "400",
  "message": "Unable to parse range: Sheet1!A:Z",   /* tab renamed/deleted */
  "context": {
    "data": {
      "error": {
        "code": 400,
        "message": "Unable to parse range: Sheet1!A:Z",
        "status": "INVALID_ARGUMENT"
      }
    }
  }
}
```

Variant: `"Invalid range"` when a named range was deleted from the spreadsheet while the workflow still references it by name.

### value-input-option-mismatch (no error — silent corruption)

Not an error. The node returns HTTP 200 and reports rows written. Detection requires inspecting the actual written data: formulas appear as string literals (`=SUM(A1:A10)` stored as text), dates appear as ISO strings or integers instead of formatted dates, or currency values import with unexpected decimal precision.

## Detection signals

The agent triggers this case when **any** of the following match:

1. `error.node` contains `"Google Sheets"` AND `error.httpCode = "429"` AND `error.context.data.error.status = "RESOURCE_EXHAUSTED"` → route to `quota-exceeded`
2. `error.node` contains `"Google Sheets"` AND `error.httpCode = "403"` AND `error.context.data.error.status = "PERMISSION_DENIED"` → route to `auth-revoked` (distinguish from `google-oauth-expired` which returns 401)
3. `error.node` contains `"Google Sheets"` AND `error.httpCode = "400"` AND `error.message` matches `/maximum number of cells/i` → route to `row-limit-exceeded`
4. `error.node` contains `"Google Sheets"` AND `error.httpCode = "400"` AND `error.message` matches `/unable to parse range|invalid range/i` → route to `range-not-found`
5. Proactive scan: Google Sheets append node returned HTTP 200 but `updates.updatedRows = 0` or the `updates` key is absent in the response body → investigate `row-limit-exceeded` (silent variant)
6. Proactive scan: data audit flag set on a Google Sheets write workflow where `valueInputOption` parameter equals `"RAW"` but the source data contains formula strings (strings starting with `=`) → flag `value-input-option-mismatch`

## Sub-diagnoses table

| Label | HTTP code | `error.status` | Key signal | Recovery |
|---|---|---|---|---|
| `google-sheets.quota-exceeded` | 429 | `RESOURCE_EXHAUSTED` | `details[].reason = RATE_LIMIT_EXCEEDED` or `QUOTA_EXCEEDED`; workflow loops over Sheets calls | `auto-retry` with 60–100s delay |
| `google-sheets.auth-revoked` | 403 | `PERMISSION_DENIED` | Valid access token; workspace admin has revoked app access or changed DLP policy | `notify-human` (admin action) |
| `google-sheets.row-limit-exceeded` | 400 or 200 | `INVALID_ARGUMENT` or silent | "maximum number of cells" in message, OR append returns `updatedRows: 0` | `notify-human` (structural fix) |
| `google-sheets.range-not-found` | 400 | `INVALID_ARGUMENT` | "Unable to parse range" or "Invalid range"; tab was renamed or deleted | `notify-human` (workflow config fix) |
| `google-sheets.value-input-option-mismatch` | 200 (no error) | — | Written cells contain formula literals or wrong date format; `valueInputOption = RAW` | `notify-human` (not an error; wrong data) |

## Signal cross-check — identify the sub-diagnosis

Walk these checks in order; stop at the first match:

| Check | If true → label |
|---|---|
| `httpCode = 429` AND `error.status = "RESOURCE_EXHAUSTED"` | → `google-sheets.quota-exceeded`. Check `details[].reason`: `RATE_LIMIT_EXCEEDED` = per-second burst (retry in 5–10s); `QUOTA_EXCEEDED` = per-minute or per-100s cap (retry in 60s). |
| `httpCode = 403` AND `error.status = "PERMISSION_DENIED"` AND credential `updatedAt` is recent (refresh token is alive) | → `google-sheets.auth-revoked`. This is **not** `auth.refresh-expired` — the token is valid but access is blocked at the Google Workspace admin layer. |
| `httpCode = 400` AND `error.message` matches `/maximum number of cells/i` | → `google-sheets.row-limit-exceeded` (explicit error). |
| HTTP 200 AND append node's `updates.updatedRows = 0` (or `updates` absent) | → `google-sheets.row-limit-exceeded` (silent variant). The spreadsheet silently refused the write. |
| `httpCode = 400` AND `error.message` matches `/unable to parse range|invalid range/i` | → `google-sheets.range-not-found`. Extract the range string from the message and compare against the workflow's Sheets node `range` parameter. |
| HTTP 200 AND no error AND written data contains formula strings stored as text | → `google-sheets.value-input-option-mismatch`. Inspect the Sheets node's `valueInputOption` parameter in `workflow_entity.nodes`. |

### RATE_LIMIT_EXCEEDED vs QUOTA_EXCEEDED — critical distinction

Both are `status: "RESOURCE_EXHAUSTED"` and both return HTTP 429. The difference is in `details[].errorInfo.reason`:

- **`RATE_LIMIT_EXCEEDED`**: per-second burst exceeded (e.g., > 100 requests in 100 seconds per project). Resolves in 5–10 seconds. The response will NOT include a `Retry-After` header from Google — compute the delay yourself: `max(10, 60 - secondsIntoCurrentMinute)`.
- **`QUOTA_EXCEEDED`**: the per-minute or per-100-second rolling quota is exhausted. The full quota (`spreadsheet_requests_per_minute_per_project: 100`, `spreadsheet_requests_per_minute_per_user_per_project: 500`) is consumed. Must wait the full 60–100 seconds. Check the Google Cloud Console → APIs & Services → Quotas → Google Sheets API to see current consumption vs. limits.

The response body's `quota_metric` field names the exact quota that was hit:
- `sheets.googleapis.com/spreadsheet_requests_per_minute_per_project` — project-level cap (100/min)
- `sheets.googleapis.com/spreadsheet_requests_per_minute_per_user_per_project` — per-user cap (500/min)

### Where to check: Google Cloud Console vs n8n credential

- **n8n credential panel** (`Settings → Credentials → <name>`): shows whether the OAuth token is connected and when it was last refreshed. Useful for `auth.refresh-expired` (401/invalid_grant). Not useful for `auth-revoked` (403/PERMISSION_DENIED) — the token is fine; the access policy changed.
- **Google Cloud Console → APIs & Services → Quotas**: shows current quota usage against limits. Required to diagnose `quota-exceeded` and to determine whether a quota increase request is needed.
- **Google Workspace Admin Console → Apps → Google Workspace Marketplace apps** (or → Security → API permissions): shows whether a specific OAuth app has been blocked by an admin policy. Required to diagnose `auth-revoked`.
- **Google Cloud Console → APIs & Services → Credentials**: shows the OAuth client status (is it in Testing vs. Production mode?). Relevant if the `auth-revoked` is actually the 7-day Testing-mode expiry — but Testing-mode expiry returns 401/invalid_grant, not 403/PERMISSION_DENIED. If you see 403, the admin console is the right place.

## Recovery actions

### `google-sheets.quota-exceeded`

> Auto-retry is safe. The quota resets on a rolling per-minute window. No customer data is modified.

1. **Stop the execution** if still running: `POST /api/v1/executions/:id/stop`
2. **Determine the retry delay:**
   - If `details[].reason = "RATE_LIMIT_EXCEEDED"`: wait 10 seconds.
   - If `details[].reason = "QUOTA_EXCEEDED"`: wait 60 seconds (100-second rolling window; 60s is a safe buffer).
   - If `details` is absent or `reason` is missing: default to 60 seconds.
3. **Auto-retry** the execution after the delay. Check that the workflow is tagged `idempotent:true` before retrying — if not, review whether the failed node had already written partial data.
4. **If the quota-exceeded error repeats 3+ times within 10 minutes**: pause auto-retry, escalate to `notify-human`. The workflow's call volume exceeds the project quota. Either the quota ceiling needs to be raised in Google Cloud Console or the workflow needs batching/caching.
5. **Do not** attempt to increase the quota automatically. Quota increases require a manual request in Google Cloud Console → APIs & Services → Quotas → Request increase.

### `google-sheets.auth-revoked`

> `notify-human`. This requires a Google Workspace admin action. Auto-retry will fail identically.

1. `notify-human`. Include:
   - Credential name and type
   - The specific spreadsheet ID and Google account that the credential belongs to
   - Whether other Sheets or Google Workspace workflows using the same credential are also failing (check by querying `credentials_entity.id` against active `workflow_entity.nodes`)
   - Suspected cause: "Google Workspace admin has revoked or restricted this app's access. This is distinct from an expired token — the token is valid but the access policy blocks it."
2. Fix guidance in the alert: "A Google Workspace admin must check Admin Console → Security → API permissions (or → Apps → Google Workspace Marketplace apps) and restore access for the n8n OAuth application. Alternatively, if a DLP or context-aware access policy was recently tightened, the admin must grant an exception for the service account or user."
3. **Pause affected workflows** if they run on intervals < 15 min to prevent alert spam: `POST /api/v1/workflows/:id/deactivate`.
4. Do NOT attempt to re-authenticate the credential silently. The OAuth token is alive; the problem is the admin policy. Re-auth will produce the same 403.

### `google-sheets.row-limit-exceeded`

> `notify-human`. This is a structural data problem — Google Sheets has a hard limit of 10 million cells per spreadsheet. Auto-retry will fail every time.

1. `notify-human`. Include:
   - Spreadsheet ID (from the node parameters)
   - Approximate current row count (if known from recent successful reads)
   - Affected workflow and the frequency of appends (to estimate when the limit was hit)
2. Fix guidance: "Google Sheets has a hard 10-million-cell limit per spreadsheet (rows × columns). Options: (a) Archive old rows to a new spreadsheet and clear them from the active one; (b) Migrate to a database (Supabase/Postgres) for high-volume append workflows — this limit will recur; (c) Use multiple spreadsheets with month-based rotation and a master index sheet. The workflow's Sheets node must be updated with the new target."
3. Do NOT auto-retry. The spreadsheet is full. Every retry produces the same result.

### `google-sheets.range-not-found`

> `notify-human`. The tab name or named range in the workflow no longer exists in the spreadsheet. This is a config fix.

1. `notify-human`. Include:
   - The exact range string the workflow is using (extract from `workflow_entity.nodes` → Sheets node → `range` parameter)
   - The spreadsheet ID
   - Suspected cause: the referenced sheet tab was renamed or deleted; or a named range was removed
2. Fix guidance: "Update the Google Sheets node in the workflow to reference the correct tab name or range. Open the spreadsheet, verify the current tab names and named ranges (Data → Named ranges), then update the node's `range` parameter to match. If the tab was intentionally deleted, decide whether to recreate it or redirect the workflow to a different tab."
3. Do NOT auto-retry or attempt to auto-create the missing tab. Creating a tab without confirming the schema would write data to an unstructured sheet.

### `google-sheets.value-input-option-mismatch`

> `notify-human`. This is not an error — the API returned 200. The problem is silent data corruption.

1. `notify-human`. Include:
   - The workflow name and the Sheets node where `valueInputOption` is set to `RAW`
   - The type of data being written (formulas, dates, currency — which type is corrupted)
   - An example of the corrupted data: "Formula `=SUM(A1:A10)` was written as the literal string `=SUM(A1:A10)` in cell B5 instead of being evaluated."
2. Fix guidance: "Change the Google Sheets node's `Value Input Option` parameter from `RAW` to `USER_ENTERED`. With `USER_ENTERED`, Google interprets the input the same way a user typing in the spreadsheet would — formulas are evaluated, dates are parsed, numbers are formatted. `RAW` treats everything as a literal string. Note: if the workflow is writing data that should NOT be interpreted as formulas (e.g., user-provided text that might start with `=`), prefix strings with a single quote `'` to escape them before writing."
3. After the config fix, any corrupted rows must be manually reviewed and corrected — the agent cannot auto-correct already-written data without knowing the intended values.

## Prevention — recommendations for the customer report

Add to the customer's `playbooks/report-to-agency` section:

- **Never loop Sheets API calls without a Wait node.** The most common quota trigger is a `Split In Batches` loop that fires one Sheets request per item with no throttle. Add a `Wait` node (1 second) between batches, or use `batchUpdate` (Sheets v4) to write multiple ranges in a single API call.
- **Use `USER_ENTERED` as the default `valueInputOption`** unless you have a specific reason for `RAW`. `USER_ENTERED` matches how a human would use the spreadsheet. `RAW` is appropriate only when writing exact strings that must not be interpreted.
- **Design for the 10M-cell ceiling.** Any workflow that appends rows to a shared spreadsheet will eventually hit this limit. For workflows appending more than 1,000 rows/day, implement monthly rotation from the start: `Spreadsheet_2026_01`, `Spreadsheet_2026_02`. Write a master-index workflow that updates a lookup sheet with the current active spreadsheet URL.
- **Use spreadsheet IDs, not URLs, in workflow config.** The spreadsheet ID is stable even if the file is renamed or moved in Drive. The sharing URL can change.
- **Tab names in range parameters are fragile.** Prefer named ranges (created via Sheets → Data → Named ranges) over hardcoded tab-name strings. Named ranges are visible in the Sheets UI, documented, and can be updated centrally without touching the workflow.
- **Monitor `auth-revoked` separately from `auth-refresh-expired`.** They look similar but have completely different owners. Set up a Google Workspace admin alert for app-access policy changes — the n8n team should not be the first to know that an admin changed an API permission.
- **Separate high-frequency Sheets workflows into their own Google Cloud project.** The `spreadsheet_requests_per_minute_per_project` quota is shared across all API calls in a GCP project. If one workflow hammers Sheets, it degrades all other Sheets workflows in the same project. Isolating heavy workflows to a dedicated project provides quota isolation.

## Code snippets

### Quota-aware Sheets append — Code node with rate-limit guard

```javascript
// Place this Code node before any Google Sheets node in a loop.
// It reads a shared counter from execution metadata and waits if needed.

const CALLS_PER_100S_LIMIT = 90; // stay below the 100/100s project quota
const windowMs = 100_000;

const meta = $execution.customData || {};
const windowStart = meta.sheetsWindowStart || Date.now();
const callCount = meta.sheetsCallCount || 0;

const elapsed = Date.now() - windowStart;

if (elapsed > windowMs) {
  // New window — reset counters
  $execution.customData = { sheetsWindowStart: Date.now(), sheetsCallCount: 1 };
} else if (callCount >= CALLS_PER_100S_LIMIT) {
  // Within the window and at the limit — compute wait
  const waitMs = windowMs - elapsed + 1000; // 1s buffer
  await new Promise(r => setTimeout(r, waitMs));
  $execution.customData = { sheetsWindowStart: Date.now(), sheetsCallCount: 1 };
} else {
  $execution.customData = { sheetsWindowStart: windowStart, sheetsCallCount: callCount + 1 };
}

return $input.all();
```

### Detecting a silent append failure (row-limit check)

```javascript
// Place this Code node immediately after a Google Sheets Append node.
// The Sheets node output contains the API response in $json.

const updatedRows = $json.updates?.updatedRows ?? $json.updatedRows ?? null;

if (updatedRows === 0 || updatedRows === null) {
  throw new Error(
    `Google Sheets append returned updatedRows=${updatedRows}. ` +
    `The spreadsheet may have reached the 10M-cell limit. ` +
    `Spreadsheet ID: ${$json.spreadsheetId}`
  );
}

return $input.all();
```

## Field checklist

Before escalating or resolving a Google Sheets case, confirm these fields are captured in the incident record:

- [ ] Spreadsheet ID (from node parameters or error context)
- [ ] Sheet tab name and range string referenced by the workflow
- [ ] `httpCode` and `error.status` (RESOURCE_EXHAUSTED / PERMISSION_DENIED / INVALID_ARGUMENT)
- [ ] `details[].errorInfo.reason` (RATE_LIMIT_EXCEEDED vs QUOTA_EXCEEDED) — for quota cases
- [ ] Credential name and `credentials_entity.updatedAt` — for auth cases
- [ ] Google Workspace admin contacted? (Y/N) — for auth-revoked cases
- [ ] `valueInputOption` parameter value (RAW vs USER_ENTERED) — for mismatch cases
- [ ] Approximate current row count in the spreadsheet — for row-limit cases
- [ ] Number of Sheets API calls this workflow makes per execution and per hour
- [ ] Whether other workflows on the same GCP project are also failing (quota isolation check)

## Cross-references

`decision-trees/failure-diagnosis` · `decision-trees/error-classification` (subtypes `ratelimit.google-sheets`, `auth.admin-revoked`, `data.silent-corruption`) · `cases/google-oauth-expired` (for 401/invalid_grant — distinct from 403/PERMISSION_DENIED) · `playbooks/recover-from-api-error` · `reference/api/api-google-workspace`
