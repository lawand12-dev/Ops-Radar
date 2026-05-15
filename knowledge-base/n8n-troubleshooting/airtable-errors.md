# Case: Airtable API errors

**Type:** Labeled failure case
**Diagnosis label:** `airtable.rate-limit` / `airtable.field-type-mismatch` / `airtable.record-not-found` / `airtable.base-or-table-not-found` / `airtable.write-conflict-locked`
**Routes from:** `decision-trees/failure-diagnosis` (Airtable node failure, httpCode∈{404,422,429,503})
**Auto-handle safety:** `airtable.rate-limit` auto-retry is safe (5 req/s quota resets quickly). `airtable.write-conflict-locked` auto-retry is safe (transient 503). All others require `notify-human` — they are configuration, data mapping, or structural issues that auto-retry will not resolve.
**Updated:** 2026-05-07

## Overview

Airtable behaves like a collaborative spreadsheet with a REST API bolted on. It is not a database — its rate limits, field type enforcement, and workspace reorganization patterns produce failure modes that are distinct from conventional REST APIs. The 5 req/s per-base limit is easy to exceed in any loop that doesn't throttle. Field type mismatches are extremely common when upstream data pipelines change their output shape — Airtable enforces field types server-side but the error message is terse. Record and base deletions produce 404s that surface only when an update is attempted, sometimes long after the record was deleted.

The agent must also track the API version in use. Airtable's REST API v0 (`https://api.airtable.com/v0/{baseId}/{tableIdOrName}`) is still widely used and is what n8n's native Airtable node calls. Airtable v2 (metadata API, `https://api.airtable.com/v2/`) is a separate surface for schema introspection only — it does not replace v0 for record operations. When a failure references v2 URLs, the workflow is calling the wrong endpoint for record CRUD.

## Input — what the error looks like

### rate-limit (HTTP 429)

```jsonc
{
  "name": "NodeApiError",
  "node": "Airtable",
  "httpCode": "429",
  "message": "You have made too many requests in a short period of time. Please retry your request later",
  "context": {
    "data": {
      "error": "TOO_MANY_REQUESTS"
    }
  }
}
```

Response headers on the 429 include:
```
HTTP/2 429
Retry-After: 30
Content-Type: application/json
```

Note: The `Retry-After` value is typically 30 seconds. n8n's native Airtable node does **not** read or honor this header — it surfaces the error immediately. The agent must read `Retry-After` from the raw response headers when available, defaulting to 30s if absent.

### field-type-mismatch (HTTP 422)

```jsonc
{
  "name": "NodeApiError",
  "node": "Airtable",
  "httpCode": "422",
  "message": "Field cannot accept the provided value",
  "context": {
    "data": {
      "error": {
        "type": "INVALID_VALUE_FOR_COLUMN",
        "message": "Field cannot accept the provided value",
        "statusCode": 422
      }
    }
  }
}
```

Variant for linked records:
```jsonc
{
  "message": "Invalid cell value for field \"Client\" (a linked record field): ...",
  "context": { "data": { "error": { "type": "INVALID_MULTIPLE_CHOICE_OPTIONS" } } }
}
```

Variant when `typecast: false` and a select-field option doesn't exist:
```jsonc
{
  "message": "Insufficient permissions to create new select option \"Enterprise\"",
  "context": { "data": { "error": { "type": "INVALID_VALUE_FOR_COLUMN" } } }
}
```

### record-not-found (HTTP 404)

```jsonc
{
  "name": "NodeApiError",
  "node": "Airtable",
  "httpCode": "404",
  "message": "Record not found",
  "context": {
    "data": {
      "error": {
        "type": "NOT_FOUND",
        "message": "Record not found"
      }
    }
  }
}
```

### base-or-table-not-found (HTTP 404)

```jsonc
{
  "name": "NodeApiError",
  "node": "Airtable",
  "httpCode": "404",
  "message": "Could not find table \"Contacts\" in application appXXXXXXXXXXXXXX",
  "context": {
    "data": {
      "error": {
        "type": "TABLE_NOT_FOUND",
        "message": "Could not find table \"Contacts\" in application appXXXXXXXXXXXXXX"
      }
    }
  }
}
```

Variant for base not found:
```jsonc
{
  "message": "Could not find what you are looking for",
  "httpCode": "404",
  "context": { "data": { "error": { "type": "NOT_FOUND" } } }
}
```

### write-conflict-locked (HTTP 503)

```jsonc
{
  "name": "NodeApiError",
  "node": "Airtable",
  "httpCode": "503",
  "message": "Service temporarily unavailable. Please retry your request.",
  "context": {
    "data": {
      "error": "SERVICE_UNAVAILABLE"
    }
  }
}
```

## Detection signals

The agent triggers this case when **any** of the following match:

1. `error.node = "Airtable"` AND `error.httpCode = "429"` → route to `airtable.rate-limit`
2. `error.node = "Airtable"` AND `error.httpCode = "422"` AND `error.message` matches `/field cannot accept|invalid.*value|INVALID_VALUE_FOR_COLUMN/i` → route to `airtable.field-type-mismatch`
3. `error.node = "Airtable"` AND `error.httpCode = "404"` AND `error.message` matches `/record not found/i` (lowercase-insensitive) → route to `airtable.record-not-found`
4. `error.node = "Airtable"` AND `error.httpCode = "404"` AND `error.message` matches `/could not find table|table_not_found|base not found/i` → route to `airtable.base-or-table-not-found`
5. `error.node = "Airtable"` AND `error.httpCode = "404"` AND `error.context.data.error.type = "NOT_FOUND"` AND the node operation is not a record-level read/update → route to `airtable.base-or-table-not-found` (base-level 404 is ambiguous; use node operation to disambiguate)
6. `error.node = "Airtable"` AND `error.httpCode = "503"` → route to `airtable.write-conflict-locked`

## Sub-diagnoses table

| Label | HTTP code | `error.type` | Key signal | Recovery |
|---|---|---|---|---|
| `airtable.rate-limit` | 429 | `TOO_MANY_REQUESTS` | `Retry-After` header present; workflow loops without throttle | `auto-retry` after `Retry-After` delay (default 30s) |
| `airtable.field-type-mismatch` | 422 | `INVALID_VALUE_FOR_COLUMN` | Field name in error body; upstream data shape changed | `notify-human` (data mapping fix) |
| `airtable.record-not-found` | 404 | `NOT_FOUND` | `"Record not found"` in message; node operation is update/patch/delete | `notify-human` (workflow logic fix) |
| `airtable.base-or-table-not-found` | 404 | `TABLE_NOT_FOUND` or `NOT_FOUND` | Table/base name in message; workspace was reorganized | `notify-human` (credential or config fix) |
| `airtable.write-conflict-locked` | 503 | `SERVICE_UNAVAILABLE` | Heavy concurrent writes; plan-level throughput limit hit | `auto-retry` after 10s delay |

## Signal cross-check — identify the sub-diagnosis

Walk these checks in order; stop at the first match:

| Check | If true → label |
|---|---|
| `httpCode = 429` | → `airtable.rate-limit`. Read `Retry-After` header from the execution's raw response. If absent, use 30s. Check whether the failing node is inside a `Split In Batches` loop — if yes, the loop structure is the root cause, not a one-off burst. |
| `httpCode = 422` AND `error.context.data.error.type` matches `INVALID_VALUE_FOR_COLUMN` or `INVALID_MULTIPLE_CHOICE_OPTIONS` | → `airtable.field-type-mismatch`. Extract the field name from the error message. Inspect the Airtable node's field mapping in `workflow_entity.nodes` to identify which upstream field is mapped to the conflicting Airtable field. |
| `httpCode = 404` AND `error.message` matches `/record not found/i` AND the node's operation is `update`, `patch`, or `delete` | → `airtable.record-not-found`. The record ID used in the update was retrieved earlier in the workflow or stored in a previous execution and is now stale. |
| `httpCode = 404` AND error message contains a table name (`"Could not find table"`) OR base ID reference | → `airtable.base-or-table-not-found`. Check whether the error mentions the table name string from the workflow config — if the table was renamed, the name in the workflow is now wrong. |
| `httpCode = 404` AND `error.context.data.error.type = "NOT_FOUND"` AND no table/record language in the message | → `airtable.base-or-table-not-found` (base-level). The base ID in the credential or workflow config may be wrong or the base was deleted/moved to a different workspace. |
| `httpCode = 503` | → `airtable.write-conflict-locked`. Check execution history: was this the same base having many concurrent writes in the last 60 seconds? If yes, the lock is a throughput protection on Airtable's side. |

### Rate limit header structure

The Airtable 429 response follows this header structure:

```
HTTP/2 429 Too Many Requests
Retry-After: 30
Content-Type: application/json; charset=utf-8
X-Airtable-Rate-Limit: base
```

The `X-Airtable-Rate-Limit: base` header identifies that this is a per-base limit (5 req/s), not a per-token or per-account limit. When this header reads `token` instead of `base`, the PAT has hit its aggregate traffic limit across all bases — a different problem requiring a different PAT or a request to Airtable support.

### Airtable API v0 vs v2 — scope of each version

- **v0** (`https://api.airtable.com/v0/{baseId}/{tableIdOrName}`): the data plane — CRUD on records. This is what n8n's native Airtable node calls for all record operations (list, create, update, delete, search).
- **v2** (`https://api.airtable.com/v2/bases/{baseId}/tables`): the metadata/schema plane — introspect field definitions, view configurations, table structure. Not used by n8n's native node; only relevant in HTTP Request nodes calling the Metadata API.

If the workflow uses an HTTP Request node pointed at a v2 URL but expects record data, it will receive schema JSON, not record data — silently returning an unexpected shape without an error. If the workflow uses a v0 URL but accesses a table by name containing special characters, URL-encode the table name: `encodeURIComponent(tableName)`.

### The correct Split In Batches + Wait pattern for safe Airtable writes

The 5 req/s per-base limit means: for every second of continuous requests, at most 5 can be in flight against one base. The safe n8n pattern:

```
[Data source] → [Split In Batches: batch size 5] → [Airtable write node] → [Wait: 1 second]
```

With this configuration, each iteration of the loop sends 5 records (in a single `records[]` batch mutation — Airtable's v0 API accepts up to 10 records per call) and then waits 1 second. This keeps throughput at 5 records/second (if batching 5 records per call) or 5 calls/second (if each call writes 1 record). For maximum throughput without rate limiting, use batch writes with up to 10 records per call + 1s wait = 50 records/second, well within the 5 req/s limit.

**Wrong pattern** (exceeds rate limit):
```
[Data source] → [Split In Batches: batch size 1] → [Airtable write node]
// No Wait node — fires 1 call per item as fast as n8n can process = dozens/second
```

**Correct pattern for high-volume writes**:
```
[Data source]
  → [Code node: group items into arrays of 10]
  → [Split In Batches: batch size 1]   ← each item is now an array of 10 records
  → [Airtable node: Create/Update records (fields: records array)]
  → [Wait: 1s]
```

## Recovery actions

### `airtable.rate-limit`

> Auto-retry is safe. The 5 req/s quota resets within seconds. No customer data is modified by the retry.

1. **Stop the execution** if still running: `POST /api/v1/executions/:id/stop`
2. **Read `Retry-After` header** from the failed execution's response context. If `Retry-After: 30` is present, wait 30 seconds. If absent, default to 30 seconds.
3. **Auto-retry** the execution after the delay. The workflow is idempotent if tagged `idempotent:true`; check before retrying to ensure no partial writes completed.
4. **If the rate limit recurs on retry:** the workflow structure is looping without throttle. Do NOT continue auto-retrying without address the root cause. Issue a `notify-human` with the recommendation to add `Split In Batches` (batch 5) + `Wait` (1s) as described above.
5. **Do not** attempt to parallelize across multiple PATs to bypass the rate limit. The rate limit is per-base, not per-token — multiple tokens hitting the same base share the 5 req/s limit.

### `airtable.field-type-mismatch`

> `notify-human`. The data mapping in the workflow is sending the wrong type to an Airtable field. Auto-retry will fail identically.

1. `notify-human`. Include:
   - The Airtable field name from the error message
   - The value that was rejected (extract from the node input `data.resultData.runData.<nodeName>[0].data.main[0]`)
   - The upstream field that maps to this Airtable field (from `workflow_entity.nodes` → Airtable node → field mappings)
   - The Airtable field type (check the base schema: Airtable → Fields → \<field name\> → field type)
2. Fix guidance: "The field `<FieldName>` in Airtable expects `<FieldType>` but received `<ActualType>`. Common causes: (a) A Number field received a string — add a Set node upstream to coerce the value with `{{ parseInt($json.myField) }}`; (b) A Linked Record field received a plain text name — Linked Record fields require an array of existing record IDs, not the linked record's display name; (c) A Single Select field received a new option string and `typecast` is disabled — either enable `typecast: true` on the Airtable node (which auto-creates new select options) or pre-create the option in Airtable's field settings."
3. Do NOT enable `typecast: true` without customer approval — it silently creates new select options which can pollute Airtable's filter views and automations.

### `airtable.record-not-found`

> `notify-human`. The record ID the workflow is trying to update no longer exists in Airtable. Auto-retry will fail identically.

1. `notify-human`. Include:
   - The record ID that was not found (from the node input or the error context)
   - When this record ID was last successfully used (check recent execution history)
   - Whether the failure is in a "search then update" workflow pattern (where the search may have run hours or days before the update)
2. Fix guidance: "The workflow is using a stale Airtable record ID. Records can be deleted in Airtable by any workspace member while the workflow holds a reference. Fix: implement a check-before-update pattern — add an Airtable `Get Record` node before the update, and add an `If` node: if the get returns a valid record, proceed with the update; if it returns 404, route to a separate handler (log the miss, notify the user, or skip). Never assume a record ID retrieved in a previous execution is still valid."
3. Pause the affected workflow if it is running on a short interval and will continue generating 404 errors for each iteration.

### `airtable.base-or-table-not-found`

> `notify-human`. The base ID or table name in the workflow or credential is wrong. Auto-retry will fail identically.

1. `notify-human`. Include:
   - The base ID and table name from the Airtable node parameters in `workflow_entity.nodes`
   - Whether the error message explicitly mentions a table name or uses a generic NOT_FOUND
   - Whether other workflows using the same Airtable credential are also failing (base-level issue vs. table-level issue)
2. Fix guidance: "Check the Airtable workspace for the base referenced by `appXXXXXXXXXXXXXX`. If the base was moved to a different workspace, the base ID is unchanged but the PAT may not have been granted access to the new workspace. If the table was renamed in Airtable, update the Airtable node's table parameter to the new name. Prefer referencing tables by their table ID (tblXXXX) instead of by display name — the ID survives renames while the name does not. Table IDs are available in Airtable's API documentation for each base."
3. Pause the workflow: `POST /api/v1/workflows/:id/deactivate`.

### `airtable.write-conflict-locked`

> Auto-retry with 10s delay is safe. The 503 is a transient throughput protection on Airtable's side — the record lock clears within seconds.

1. **Stop the execution** if still running: `POST /api/v1/executions/:id/stop`
2. **Wait 10 seconds.**
3. **Auto-retry** the execution. If the 503 recurs on retry, wait 30 seconds and retry once more.
4. **If 503 recurs 3+ times:** escalate to `notify-human`. The workflow may be generating sustained concurrent write pressure that Airtable's plan cannot handle. Consider migrating high-frequency write workflows to a database (Supabase/Postgres) for this use case.

## Prevention — recommendations for the customer report

Add to the customer's `playbooks/report-to-agency` section:

- **Always use batch writes, never single-record loops.** Airtable's v0 API accepts up to 10 records per create/update call. A loop writing 100 records one-at-a-time uses 100 API calls; the same loop with batch-10 uses 10 calls — 10× fewer quota units.
- **Add the `Split In Batches` (batch 5) + `Wait` (1s) pattern to every Airtable write loop.** This is the minimum viable throttle. Without it, any loop of >5 items will hit the rate limit.
- **Reference tables by table ID, not by display name.** In the Airtable node, use the table's `tblXXXXXXXXXXXXXX` ID instead of the display name string. Table IDs are stable; display names change whenever a workspace member renames the table.
- **Implement check-before-update for any workflow that holds record IDs across executions.** If a workflow stores a record ID in one execution and uses it in a later execution (minutes, hours, or days later), that record may have been deleted. The check-before-update pattern prevents 404s from becoming workflow failures.
- **Do not store Airtable record IDs in external systems without a staleness TTL.** Record IDs don't expire, but records do get deleted. Any system that stores `recXXXXXXXXXXXXXX` references should treat them as stale after 30 days unless verified.
- **Use a single PAT per Airtable workspace, not per workflow.** The per-base rate limit is base-scoped, not token-scoped — multiple tokens hitting the same base share the 5 req/s limit. A single PAT simplifies credential management and doesn't improve throughput.
- **Enable `typecast: true` selectively.** The Airtable node's typecast option auto-creates new select options. Useful during initial data migration; dangerous in production where select options define dropdown menus and filter views used by the team. Default to `typecast: false` in production; use it only during controlled migrations.

## Code snippets

### Rate-limit-aware Airtable write — batch pattern

```javascript
// Code node: group flat items into arrays of 10 for batch write
// Place before an Airtable Create/Update node.
// The Airtable node should be configured with "fields.records" mapped to this array.

const items = $input.all();
const batchSize = 10;  // Airtable v0 max per call
const batches = [];

for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize).map(item => ({
    fields: item.json  // adjust to your field mapping
  }));
  batches.push({ json: { records: batch } });
}

return batches;
// After this node: Split In Batches (size 1) → Airtable node → Wait (1s)
```

### Check-before-update pattern

```javascript
// Place this Code node after an Airtable Get Record node.
// If the record doesn't exist, route to the "Not Found" branch.
// Connect the Airtable Get Record node with "Always Output Data" ON and "Ignore Errors" ON.

const record = $input.first().json;

if (!record.id || record.error) {
  // Record not found — return a flag for the downstream If node
  return [{ json: { recordFound: false, recordId: $('Previous Node').first().json.recordId } }];
}

return [{ json: { recordFound: true, record: record } }];
```

### Extracting the field name from a 422 error

```javascript
// Code node placed in the error branch to parse which field caused the 422.
// $json.error.message typically contains "Field cannot accept the provided value"
// but not always the field name. Use the Airtable node's input to find the mapping.

const errorMessage = $json.error?.message || $json.message || '';
const fieldMatch = errorMessage.match(/field\s+"([^"]+)"/i);
const fieldName = fieldMatch ? fieldMatch[1] : 'unknown field';

return [{
  json: {
    diagnosis: 'airtable.field-type-mismatch',
    affectedField: fieldName,
    rejectedValue: $json.error?.detail || null,
    errorType: $json.error?.type || null,
    nodeInput: $('Airtable Node Name').first().json  // capture what was sent
  }
}];
```

## Field checklist

Before escalating or resolving an Airtable case, confirm these fields are captured in the incident record:

- [ ] Base ID (`appXXXXXXXXXXXXXX` — from node parameters or error message)
- [ ] Table name or table ID referenced in the workflow
- [ ] `httpCode` and `error.type` (TOO_MANY_REQUESTS / INVALID_VALUE_FOR_COLUMN / NOT_FOUND / TABLE_NOT_FOUND / SERVICE_UNAVAILABLE)
- [ ] `Retry-After` header value — for rate-limit cases
- [ ] Field name from the 422 error message — for field-type-mismatch cases
- [ ] Record ID that was not found — for record-not-found cases
- [ ] Whether the workflow uses `Split In Batches` + `Wait` (Y/N) — for rate-limit cases
- [ ] Number of concurrent Airtable write workflows hitting the same base
- [ ] PAT scopes and which workspaces it has access to — for base-not-found cases
- [ ] Whether `typecast` is enabled on the Airtable node — for field-type-mismatch cases

## Cross-references

`decision-trees/failure-diagnosis` · `decision-trees/error-classification` (subtypes `ratelimit.airtable`, `data.type-mismatch`, `config.reference-not-found`) · `cases/concurrent-execution-conflict` (for parallel write races to the same Airtable record) · `playbooks/recover-from-api-error` · `reference/api/api-airtable`
