# n8n Node: Airtable

**Category:** Tools
**Node Type:** `n8n-nodes-base.airtable`
**Source:** n8n GitHub source
**Updated:** 2026-05-07

## Overview

The Airtable node reads and writes records to Airtable bases. It is commonly used as a lightweight relational database or CRM for agency workflows, particularly where non-technical users maintain data in Airtable and n8n workflows automate processing. The two dominant failure modes are authentication deprecation (API Key → PAT migration) and rate limiting on bulk operations.

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]] · [[n8n-best-practices]]

---

## What It Does

The Airtable node performs CRUD operations on Airtable records: list all records, get a single record by ID, create new records, update existing records by ID, upsert (create-or-update based on a field match), delete records, and search records with filters. It uses the Airtable REST API v0 and handles pagination automatically when "Return All" is enabled.

## Authentication

**CRITICAL — API Key deprecation**: Airtable deprecated its global API Key authentication in November 2024. Workflows still using the legacy `airtableApi` credential type (API Key) will fail with `401 Unauthorized`. All workflows must be migrated to Personal Access Tokens (PAT).

| Type | `credential` | Status |
|------|-------------|--------|
| Personal Access Token (PAT) | `airtableTokenApi` | Current — required |
| API Key | `airtableApi` | Deprecated Nov 2024 — will fail |

**PAT scopes**: PATs are scoped per base and per permission level. Ensure the PAT includes the correct scopes for the operations needed:
- `data.records:read` — List, Get, Search
- `data.records:write` — Create, Update, Upsert, Delete

A PAT with read-only scopes will fail silently on write operations (returns 403).

**API version**: n8n's Airtable node uses API v0 (`https://api.airtable.com/v0/{baseId}/{tableId}`). The v2 beta API (2025+) has different field naming conventions and is not used by the current n8n node.

---

## Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `operation` | options | Yes | `list`, `get`, `create`, `update`, `upsert`, `delete`, `search` |
| `base` | string | Yes | Airtable Base ID — starts with `app` (e.g. `appXXXXXXXXXXXXXX`) |
| `table` | string | Yes | Table ID or table name. Table IDs start with `tbl`. Using names is fragile if the table is renamed. |
| `id` | string | No | Record ID for Get, Update, Delete operations. Starts with `rec`. |
| `fields` | object | No | Key-value pairs of field names → values for Create/Update |
| `options.fields` | array | No | For List/Search: list of field names to return (projection). Returns all fields if omitted. |
| `filterByFormula` | string | No | Airtable formula string to filter records (Search and List operations) |
| `options.sort` | array | No | Sort order: array of `{field, direction}` objects |
| `options.maxRecords` | number | No | Maximum records to return (List). Ignored if `returnAll=true`. |
| `returnAll` | boolean | No | If `true`, automatically pages through all records. If `false`, returns first page only (max 100). |
| `options.view` | string | No | Return only records visible in a specific Airtable view |
| `matchingColumns` | array | No | Fields to match on for Upsert operations |

---

## Rate Limiting — Critical

**Airtable enforces a hard limit of 5 API requests per second per base.** n8n does NOT auto-throttle requests.

For bulk operations (creating/updating many records), unthrottled n8n workflows will trigger rate limit errors (`429 Too Many Requests`) that cause workflow failures or retry storms.

**Required pattern for bulk operations**:
```
Split In Batches (batchSize: 5)
  → [output] Airtable (Create / Update)
  → Wait (1 second)
  → [loop back to Split In Batches]
[done] → next step
```

**Detection**: batch operations that take more than 30 seconds for fewer than 150 records usually indicate missing rate limiting — the node is retrying after hitting the limit.

The 5 req/s limit applies per base, not per table. Multiple workflows operating on the same base simultaneously share this quota.

---

## Field Types and Constraints

Airtable field types impose constraints on what values can be written:

| Field Type | Writable | Notes |
|------------|----------|-------|
| Single line text | Yes | Plain string |
| Long text | Yes | Supports markdown (ignored in API) |
| Number | Yes | Numeric only |
| Single select | Yes | Must match an existing option exactly (case-sensitive) |
| Multi-select | Yes | Array of strings, each must match an existing option |
| Checkbox | Yes | Boolean `true` or `false` |
| Date | Yes | ISO 8601 string: `"2026-05-07"` or `"2026-05-07T09:00:00.000Z"` |
| Linked record | Yes | Array of record IDs: `["recXXXXXXXXXXXXXX"]` — NOT display names |
| Formula | No | Read-only — 422 error on write attempt |
| Rollup | No | Read-only — 422 error on write attempt |
| Lookup | No | Read-only — 422 error on write attempt |
| Autonumber | No | Read-only — 422 error on write attempt |
| Created time | No | Read-only — 422 error on write attempt |

**Linked Record critical detail**: Writing to a Linked Record field requires the **record ID** of the linked record (format: `recXXXXXXXXXXXXXX`), not the display name or primary field value. Writing `"Acme Corp"` to a Linked Record field either fails with 422 or creates a new unlinked record depending on the field configuration.

```javascript
// Correct — write linked record IDs:
{ "Company": ["recABCDEFGHIJKLMN"] }

// Wrong — display name will fail:
{ "Company": ["Acme Corp"] }
```

**Single/Multi-select**: the option string must match exactly — case, spacing, and special characters must be identical to the option defined in the Airtable field settings. A mismatch creates a new option if the field allows it, or returns 422 if the field is locked.

---

## filterByFormula Syntax

`filterByFormula` uses **Airtable formula syntax**, not JavaScript. Common mistakes when coming from JavaScript:

| Intended | Wrong (JS) | Correct (Airtable) |
|----------|-----------|-------------------|
| Logical AND | `&&` | `AND()` |
| Logical OR | `\|\|` | `OR()` |
| Not equal | `!==` | `!=` |
| String equality | `===` | `=` |
| Field reference | `status` | `{Status}` (curly braces, exact field name) |
| Contains check | `.includes()` | `FIND("value", {Field})` |

```
// Find pending records created this week:
AND({Status} = "Pending", IS_AFTER({Created}, DATEADD(TODAY(), -7, "days")))

// Find records matching a dynamic value from n8n:
{Email} = "{{ $json.email }}"
```

**Quoting field names with spaces**: wrap in curly braces: `{First Name}`. Field names without spaces can also use curly braces: `{Status}`.

---

## Record ID Format

All Airtable record IDs follow a fixed format:
- Prefix: `rec`
- Followed by exactly 14 alphanumeric characters
- Total length: 17 characters
- Example: `recABCDEFGHIJKLMN`

**Stale record IDs**: record IDs are permanent for the life of the record. A deleted record's ID is never reused. Attempting to Get or Update a deleted record returns `404 Record not found`.

---

## Pagination

The Airtable API returns a maximum of 100 records per page. n8n handles pagination automatically when `returnAll=true`:
- n8n follows the `offset` cursor returned by the API until the last page
- All pages are concatenated and returned as individual items (one item per record)

**Memory pressure with `returnAll`**: On large bases (10,000+ records), `returnAll=true` loads all records into memory before passing them downstream. For bases over ~5,000 records, use `returnAll=false` + manual pagination with the `offset` parameter, or process records in filtered batches using `filterByFormula` with time-window slicing.

---

## Common Errors & Exact Messages

**`Field cannot accept the provided value`** (HTTP 422)
- Cause: field type mismatch — writing a string to a number field, writing display names to a Linked Record field, or attempting to write to a read-only field (Formula, Rollup, Lookup).
- Fix: check field type in Airtable, use correct value format. For Linked Records, resolve the display name to a record ID first via a Search operation.

**`Record not found`** (HTTP 404)
- Cause: record ID is stale (record was deleted) or the record ID format is invalid.
- Fix: verify the record exists via a List or Search before operating on it. Use Upsert instead of Update to handle missing records gracefully.

**`NOT_AUTHORIZED`** (HTTP 401)
- Cause: PAT is invalid, revoked, or the legacy API Key is being used after deprecation.
- Fix: generate a new PAT in Airtable account settings and update the n8n credential.

**`INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND`** (HTTP 403)
- Cause: PAT lacks the required scope for the operation, or the Base ID / Table ID is wrong.
- Fix: check PAT scopes in Airtable account settings. Verify Base ID starts with `app` and Table ID is correct.

**`ROW_DOES_NOT_EXIST`** (HTTP 422, different from 404)
- Cause: using a table name instead of table ID, and the table name contains special characters or was recently changed.
- Fix: use the Table ID (starts with `tbl`) instead of the table name for stability.

**`429 Too Many Requests`**
- Cause: exceeded 5 requests/second per base.
- Fix: add Split In Batches (5) + Wait (1 second) pattern. See Rate Limiting section.

---

## Expression Patterns

```javascript
// Access a field from the Airtable response:
{{ $json.fields["Email"] }}
{{ $json.fields["First Name"] }}
{{ $json.id }}                    // the record ID (recXXXXXXXXXXXXXX)

// Reference a prior Airtable node's output:
{{ $('Airtable').item.json.id }}

// Build a filterByFormula with a dynamic value:
{{ `{Email} = "${$json.email}"` }}

// Check if a linked record field has a value:
{{ $json.fields["Company"] && $json.fields["Company"].length > 0 }}

// Extract the first linked record ID:
{{ $json.fields["Company"][0] }}
```

Note: Airtable API v0 returns all field values nested under `fields` in the response. The record ID is at the top-level `id` key, not under `fields`.

---

## Typical Workflow Patterns

**Bulk create with rate limiting:**
```
HTTP Request (GET records from source system)
  → Split In Batches (batchSize: 5)
    → [output] Airtable (Create Record)
    → Wait (1 second)
  → [done] Set (mark sync complete)
```

**Lookup linked record ID before writing:**
```
Webhook (new order with customer email)
  → Airtable (Search Records, filterByFormula: {Email} = "{{ $json.email }}")
  → Set (customerId = {{ $json.id }})
  → Airtable (Create Record in Orders, Company: ["{{ $json.customerId }}"])
```

**Upsert pattern:**
```
Schedule Trigger (hourly)
  → HTTP Request (fetch CRM contacts)
  → Airtable (Upsert, matchingColumns: ["email"])
     → creates if email not found, updates if it exists
```

---

## Monitoring Signals

| Signal | Meaning |
|--------|---------|
| `error.message contains "Field cannot accept"` (422) | Field type mismatch — likely Linked Record ID vs display name, or write to read-only field |
| `error.message contains "Record not found"` (404) | Stale record ID — record was deleted since ID was captured |
| `error.message contains "NOT_AUTHORIZED"` (401) | API Key deprecated or PAT revoked |
| `error.httpCode = 429` | Rate limit exceeded — missing batch + wait throttle |
| Batch operations taking >30 seconds for <150 records | Silent rate limit retries — add Wait node |
| `returnAll=true` execution OOM or very slow on large bases | Base has >5,000 records — switch to paginated/filtered approach |
| Execution succeeds but Linked Record field shows blank in Airtable | Wrote display name instead of record ID |

---

## Important Gotchas

1. **API Key deprecation is silent until failure**: Old workflows using the `airtableApi` credential type continue to appear configured correctly in n8n but will fail at runtime after the deprecation date with a 401. Audit all Airtable nodes for credential type.
2. **Table name vs Table ID**: Using table names (`"Contacts"`) is convenient but breaks if anyone renames the table in Airtable. Prefer Table IDs (`tblXXXXXXXXXXXXXX`) for stability.
3. **Upsert requires a unique field**: The Upsert operation matches on `matchingColumns`. That field must contain a unique value across records — if multiple records match, behavior is undefined (n8n updates the first match). Use a field with enforced uniqueness (email, external ID).
4. **`returnAll` and view filtering**: `options.view` filters by what is visible in a view, not just by view formula — it also respects hidden records in that view. A record that exists in the base but is hidden in the specified view will not be returned.
5. **Formula fields in filters**: You can filter on Formula field values even though they are read-only. `filterByFormula: {FullName} = "John Doe"` works if `FullName` is a Formula field concatenating first and last name.
