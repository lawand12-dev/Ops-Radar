# n8n Node: Google Sheets

**Category:** Tools
**Node Type:** `n8n-nodes-base.googleSheets`
**Source:** n8n GitHub source
**Updated:** 2026-05-07

## Overview

The Google Sheets node reads and writes data to Google Spreadsheets. It is the most common lightweight database substitute in n8n workflows — used for logging results, maintaining lookup tables, syncing CRM records, and building simple dashboards. Failures in this node most often stem from authentication misconfiguration, incorrect range specifications, or the `valueInputOption` setting silently corrupting data.

## Related Notes

[[n8n-nodes]] · [[n8n-api]] · [[n8n-common-failures]] · [[n8n-workflow-patterns]] · [[n8n-best-practices]]

---

## What It Does

The Google Sheets node performs CRUD operations on spreadsheet rows: read existing rows, append new rows, update rows by row number, delete rows, clear ranges, and create new spreadsheets. All read operations return one output item per data row (not one item per spreadsheet). Write operations return metadata about the operation.

## Authentication

Two credential types are supported:

| Type | `credential` | Token Expiry | Production Suitability |
|------|-------------|--------------|------------------------|
| OAuth2 (user account) | `googleSheetsOAuth2Api` | 7 days if app is in "Testing" status in Google Cloud Console | Not recommended for production — tokens expire and break silently |
| Service Account | `googleApi` (service account JSON) | Never expires | Recommended for production |

**CRITICAL — OAuth2 Testing Mode Expiry**: Google OAuth2 apps in "Testing" status (not verified or published) issue tokens that expire after 7 days with no automatic renewal. The workflow breaks silently — executions fail with `401 invalid_grant`. The operator must re-authorize manually. Fix: either publish the Google Cloud OAuth app or switch to a Service Account.

**Service Account setup**: Create a service account in Google Cloud Console → download the JSON key → add the service account email address as an **Editor** (not Viewer) to each Google Sheet it needs to access. Without Editor access, write operations fail with 403.

---

## Key Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `operation` | options | Yes | `read`, `append`, `update`, `clear`, `delete`, `create` |
| `documentId` | string | Yes | The Google Spreadsheet ID — the long string in the sheet URL between `/d/` and `/edit` |
| `sheetName` | string | Yes | The sheet tab name (e.g. `Sheet1`, `Data`, `Q1 Report`) |
| `range` | string | No | A1 notation range (e.g. `A:Z`, `A1:D100`). Omitting uses the full sheet. |
| `options.valueInputOption` | options | No | `USER_ENTERED` (interprets formulas and date strings) or `RAW` (writes literal strings). Default: `USER_ENTERED`. |
| `options.valueRenderOption` | options | No | For reads: `FORMATTED_VALUE` (as displayed), `UNFORMATTED_VALUE` (raw number), `FORMULA` (formula text). Default: `FORMATTED_VALUE`. |
| `keyRow` | number | No | Row number containing column headers. Default: `1`. |
| `dataStartRow` | number | No | First row of data (below headers). Default: `2`. |
| `filtersUI` | object | No | Row-matching filters for Update and Delete operations |
| `rowNumber` | number | No | Explicit 1-based row number for Update/Delete operations |

---

## valueInputOption — The Silent Data Corruption Risk

**CRITICAL**: the `valueInputOption` setting controls how Google Sheets interprets the values you write. The wrong setting silently corrupts data.

| Value | Behavior | Risk |
|-------|----------|------|
| `USER_ENTERED` | Google interprets values like a user typing — dates become date serials, `=SUM(A1:A5)` becomes a formula | Date strings like `"2026-05-07"` may be converted to serial numbers (e.g. `46378`) if Google's locale doesn't recognize the format |
| `RAW` | Values written exactly as strings — no interpretation | Formulas written as text (`=SUM(...)` appears literally), dates stored as strings (not sortable as dates) |

**Date corruption scenario**: You write `"2026-05-07"` with `USER_ENTERED`. Google interprets it as a date and stores it as the integer `46378` (days since 1900-01-00). Downstream reads return `46378`, not a date string — silently wrong data.

**Formula corruption scenario**: You write `"=SUM(A1:A5)"` with `RAW`. The cell displays the literal text `=SUM(A1:A5)` instead of calculating.

**Safe defaults**:
- For data rows (non-formula, non-date): use `RAW`
- For date columns: write ISO strings with `RAW` and format the column as Text in Sheets, OR use `USER_ENTERED` with a locale-matching format
- For formula columns: use `USER_ENTERED`

---

## Range Format

Ranges use A1 notation. The sheet tab name prefix is optional but recommended for clarity:

```
Sheet1!A:Z          → all columns A through Z on Sheet1
Sheet1!A1:D100      → rows 1-100, columns A-D on Sheet1
Sheet1              → entire sheet (all rows, all columns)
A:D                 → columns A-D on the default (first) sheet
```

**Common mistakes**:
- Using a tab name that contains spaces without quoting: use `'My Sheet'!A:Z` (single quotes around the tab name)
- Referencing a tab that was renamed: if the tab name changes, the range breaks with `Unable to parse range`

---

## Row Numbering

n8n uses **1-based row numbers** throughout. Row 1 is typically the header row. Data rows start at row 2.

The Read operation returns items with a `row_number` field indicating the source row. For Update and Delete, you must supply this row number (accessible as `{{$json.row_number}}` from a prior Read).

---

## Resource Mapper (v4+ nodes)

The Resource Mapper automatically maps spreadsheet column headers to input fields by name. This is convenient but introduces a fragility: **if a column header in the spreadsheet is renamed, the mapping breaks silently** — the field stops being written without any error.

To detect this: compare expected column names against headers returned by a Read operation on row 1.

---

## Common Errors & Exact Messages

**`Unable to parse range: Sheet1!A:Z`**
- Cause: the sheet tab named `Sheet1` does not exist (was renamed or deleted) OR the range syntax is malformed.
- Fix: verify tab name exactly matches (case-sensitive). Use the Sheets UI to confirm.

**`The caller does not have permission`**
- Cause: Service account email not added as an Editor to the spreadsheet, OR OAuth2 user does not have write access.
- Fix: open the spreadsheet → Share → add the service account email with Editor role.

**`Request had insufficient authentication scopes`**
- Cause: OAuth2 credential was created without the `https://www.googleapis.com/auth/spreadsheets` scope.
- Fix: re-authorize the credential with the correct scope checked.

**`invalid_grant` (in 401 response)**
- Cause: OAuth2 token expired (common after 7 days in Testing mode apps).
- Fix: re-authorize the OAuth2 credential in n8n, or switch to Service Account.

**`Quota exceeded for quota metric 'Read Requests'`**
- Cause: hit the 100 reads/100 seconds per project rate limit.
- Fix: add a Wait node between batch reads, or switch to a batch read approach.

**`429 Too Many Requests`**
- Cause: write operations exceeded 500 writes/100 seconds per user limit.
- Monitoring signal: `lastNodeExecuted = "Google Sheets"` + `error.httpCode = 429` → quota case. Add Wait nodes or reduce write frequency.

---

## Rate Limits

Google Sheets API quotas (as of 2026):

| Quota | Limit |
|-------|-------|
| Read requests | 100 per 100 seconds per project |
| Write requests | 100 per 100 seconds per project |
| Per-user write requests | 500 per 100 seconds per user |

For workflows that write many rows, use Split In Batches (50 rows) + Wait (2 seconds) between batches to stay under limits.

---

## Expression Patterns

```javascript
// After a Read operation — access a column called "Email":
{{ $json.Email }}
{{ $json["First Name"] }}   // for column headers with spaces

// Get the row number of the current row (for later Update):
{{ $json.row_number }}

// Reference a cell from the previous Read in an Update expression:
{{ $('Google Sheets').item.json.Email }}

// Build a range dynamically:
{{ `Sheet1!A${$json.startRow}:Z${$json.endRow}` }}
```

The Read operation maps column headers as keys. If the sheet has a column "Order ID", the value is at `$json["Order ID"]`, not `$json.order_id` or `$json.OrderID`.

---

## Typical Workflow Patterns

**Nightly sync — API to Sheets:**
```
Schedule Trigger (0 2 * * *)
  → HTTP Request (GET /api/records, pagination)
  → Split In Batches (batchSize: 50)
    → [output] Google Sheets (Append Row, RAW)
    → Wait (2 seconds)
  → [done] Send Email (sync complete)
```

**Read + conditional update:**
```
Schedule Trigger (every 15 minutes)
  → Google Sheets (Read Rows, Sheet1!A:F)
  → Filter (status = "pending")
  → HTTP Request (process each pending row)
  → Google Sheets (Update Row, set status="done", rowNumber={{ $json.row_number }})
```

**Log webhook events:**
```
Webhook (POST /events)
  → Set (extract: event_type, payload, timestamp={{ $now.toISO() }})
  → Google Sheets (Append Row, USER_ENTERED for timestamp interpretation)
```

---

## Monitoring Signals

| Signal | Meaning |
|--------|---------|
| `lastNodeExecuted = "Google Sheets"` + `error.httpCode = 429` | Rate limit hit — add Wait nodes or reduce batch size |
| `lastNodeExecuted = "Google Sheets"` + `error.message contains "invalid_grant"` | OAuth2 token expired — re-authorize or switch to Service Account |
| `lastNodeExecuted = "Google Sheets"` + `error.message contains "Unable to parse range"` | Sheet tab renamed or range malformed |
| `lastNodeExecuted = "Google Sheets"` + `error.message contains "does not have permission"` | Service account not shared on spreadsheet |
| Workflow runs with 0 output items from Google Sheets Read | Sheet is empty, OR `dataStartRow` misconfigured, OR filter matched nothing |
| Numeric values where dates are expected in downstream nodes | `valueInputOption=USER_ENTERED` + locale mismatch converting date strings to serials |

---

## Important Gotchas

1. **Service Account must be shared per-sheet**: The service account email must be added as an Editor to each individual spreadsheet. It cannot be granted access at the Google Drive folder level for Sheets API calls.
2. **Column header changes break Resource Mapper silently**: If anyone renames a column header in the spreadsheet, the mapped field stops being written with no error — the row is appended with that column blank.
3. **`row_number` is only available from Read**: The Update and Delete operations require a row number. You must read first to get `$json.row_number`. You cannot update by column value without a prior Read.
4. **Append vs Update**: Append always adds a new row at the bottom — it never modifies existing rows. If you call Append on an existing record, you get a duplicate. Use a Read → Filter → Update pattern for upsert behavior.
5. **`FORMATTED_VALUE` vs `UNFORMATTED_VALUE` on reads**: `FORMATTED_VALUE` (default) returns numbers formatted as strings with currency symbols or thousand separators (`"$1,234.56"`). This breaks numeric comparisons downstream. Use `UNFORMATTED_VALUE` for numbers you will do math on.
