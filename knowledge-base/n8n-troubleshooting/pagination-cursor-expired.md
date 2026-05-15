# Case: Pagination cursor expired or invalid

**Type:** Labeled failure case
**Diagnosis label:** `data.pagination-cursor-expired`
**Routes from:** `decision-trees/failure-diagnosis` for httpCode in {400, 410} or 200 with empty page where prior pages had content; or message regex `/cursor.*(expired|invalid)|INVALID_CURSOR|pageToken|queryLocator/`
**Auto-handle safety:** Auto-restart from watermark **only if** the workflow has a persistent watermark store; otherwise `notify-human`. Never silently restart from offset 0 — that re-emits already-processed records.
**Updated:** 2026-05-07

## Input — what the error looks like

The error shape varies sharply by platform. The agent must recognize each:

| Platform | Typical signal |
|---|---|
| **HubSpot Search API** | `400` with body `{"status":"error","message":"Invalid input. Cursor: <cursor>","category":"VALIDATION_ERROR"}` |
| **HubSpot Search API (silent)** | `200` with `{ "results": [], "paging": { "next": { "after": "..." } } }` while prior page returned items — usually means past the **10,000-result hard cap** |
| **Notion API** | `400` with `{"object":"error","code":"validation_error","message":"start_cursor is invalid"}` |
| **Airtable** | `422` with `{"error":{"type":"INVALID_OFFSET","message":"Invalid offset"}}` after data changes mid-pagination |
| **Salesforce** | `400` with `INVALID_QUERY_LOCATOR` after `queryLocator` expires (~2 min idle) |
| **Google Drive / Sheets** | `400` with `{"error":{"code":400,"message":"Invalid Value"}}` or empty `nextPageToken` mid-iteration |
| **Stripe** | `404` on `starting_after=<id>` if that object was deleted between pages |
| **Shopify GraphQL** | `200` with `errors[].extensions.code === "INVALID_CURSOR"` |

In n8n's runtime this typically surfaces as a `NodeApiError` on the API node mid-loop, often inside a `Split In Batches` or a manual Code-driven loop. **The most dangerous variant is the HubSpot 10,000-cap silent stop** — no error, just an empty page that looks like "we're done."

## Signals — what to check

1. **Which page failed.** From `data.resultData.runData.<api-node>`, get the iteration count or the cursor value at failure. Compare to the per-platform limits (HubSpot 10k, Salesforce 2 min idle, Airtable any insert).
2. **Time between pages.** Compute `executionTime` deltas across iterations. Cursor expiry on Salesforce / HubSpot fires when consecutive page calls are > N seconds apart. If pages 1–3 averaged 2 s and page 4 took 180 s (probably an n8n `Wait` or rate-limit pause), expiry is the cause.
3. **Pagination type.** Inspect the n8n node config:
   - **Cursor-based** (HubSpot, Notion, Stripe, GraphQL platforms) — fragile to time, robust to inserts
   - **Offset-based** (Airtable, older REST APIs) — robust to time, fragile to inserts
   - **Token-opaque** (Google APIs) — implementation-defined; assume fragile
4. **Result-count cap.** For HubSpot Search specifically, sum returned items across pages. At 10,000, HubSpot stops paginating regardless of `total`. The workflow believes it's done; the source has more.
5. **Concurrent writes to source.** Were records being added to the source while pagination was running? Airtable offset-pagination skips records inserted mid-loop. Check source's `updatedAt` distribution against pagination start time.
6. **Watermark store presence.** Does the workflow persist its progress somewhere durable (Supabase, Postgres, a `Set` node feeding `$getWorkflowStaticData`)? If only n8n static data, restart will lose progress on instance restart.

## Correct diagnosis — what it actually is

| Sub-diagnosis | Identifier | Severity |
|---|---|---|
| **HubSpot 10k cap silent stop** | All pages succeeded, total received = 10,000, source has more | High — silent data loss |
| **Cursor time expiry** | Time between failing page and prior page > platform window | Medium — restart works |
| **Airtable offset drift** | Source had inserts during pagination | High — records skipped silently |
| **Cursor invalidated by source change** | Stripe object deleted, Notion page archived during loop | Medium — restart with skip-deleted handler |
| **Wrong base/spreadsheet/object** | `404` not `400`; wrong ID in cursor | Workflow bug — escalate |
| **Network hiccup mistaken for cursor expiry** | Same cursor works on retry | Low — the original wasn't actually expired |

## Fix — exact steps to resolve

> **Safety:** Restart-from-watermark is safe **only** when the destination is upsert-shaped (idempotent on record ID). If destination is INSERT-only, restart will create duplicates — `notify-human`.

1. **Identify the watermark.** For incremental syncs (workflows tagged `incremental:true`), the agent reads `last_synced_at` (or equivalent) from the persistent store. For backfills, the watermark is whatever was last successfully written to destination.
2. **Verify destination idempotency.** Inspect destination node config: HubSpot in `Create or Update` mode, Postgres in `INSERT ... ON CONFLICT UPDATE`, Airtable using `Upsert` operation. If any is `Create`-only or `Insert`-only, **stop**. Restart will duplicate. → notify-human.
3. **Restart from watermark.** Re-fire the trigger with the watermark as input. The new execution iterates from where the old one stopped — no double-processing because of upsert; no skipped records because the watermark is durable.
4. **For HubSpot 10k cap specifically:** there is no cursor fix. The workflow must change. Recommend:
   - Split queries by date range: pull `<2024`, `2024-Q1`, `2024-Q2`, ... separately, each capped at 10k.
   - Switch from Search API to the relevant CRM list/streaming API.
   - Use HubSpot's `lastmodifieddate` filter as a moving window.
5. **For Airtable offset drift:** there is no cursor fix either — Airtable doesn't expose a cursor option for non-views. Recommend either:
   - Pre-sort by `createdTime` and use `?filterByFormula=IS_AFTER({createdTime}, "<watermark>")`.
   - Snapshot the base via `?view=<sorted-view>` and accept that view-based pagination is similarly fragile but at least deterministic.
6. **Audit downstream impact.** If silent data loss occurred (cap or drift), the agent reports estimated missed-record count to engineering with the watermark range and recommends a reconciliation full-sync.

## Prevention — how to avoid next time

- **Persist watermarks outside n8n.** `$getWorkflowStaticData('global')` resets when a workflow is reset or the instance reinitializes. Use Supabase / Postgres / a `Wait for Webhook` external store.
- **Always upsert at the destination.** `Create or Update` (HubSpot, Airtable), `INSERT ON CONFLICT UPDATE` (Postgres), upsert by external ID (Salesforce). This makes restart-from-anywhere safe.
- **Cursor-based > offset-based** when the API supports both. If offset is the only option (Airtable), pair it with explicit `createdTime` / `lastModifiedTime` filters.
- **Add a count-reconciliation step** at the end of each sync. Compare `source.count(filter)` to `destination.count(same filter)`. Drift detected = alert before client notices.
- **Don't pause inside pagination loops.** A `Wait` node between pages will trip Salesforce queryLocator (2 min) and HubSpot Search (10 min). Pause **between sync runs**, not between pages.
- **Tag workflows with their pagination kind** (`pagination:cursor`, `pagination:offset`, `pagination:none`) so the agent applies the right restart strategy on failure.
- **For HubSpot specifically:** never use Search API for backfills > 10k. Use the standard list endpoints (`/crm/v3/objects/contacts?after=<cursor>`) which have no result cap.

## Cross-references

`decision-trees/failure-diagnosis` (label `data.pagination-cursor-expired`) · `decision-trees/recovery-routing` · `cases/upstream-data-drift` · `reference/api/api-hubspot` · `reference/api/api-airtable` · `reference/api/api-notion` · `reference/n8n-nodes/n8n-node-httprequest`
