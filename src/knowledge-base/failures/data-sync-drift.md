# Data Sync Drift — Detection and Prevention

**Category:** Failures  
**Source:** n8n community forums, HubSpot developer community, Google Ads API documentation, production incident reports from automation practitioners, Stack Overflow data sync threads  
**Updated:** 2026-04-30

## Overview
Data sync drift is the gradual divergence between a source system and a destination system that accumulates over time without triggering any errors. It is the most insidious automation failure because workflows continue running successfully while data quality degrades silently. An agency's weekly report shows 1,200 HubSpot contacts synced to a Google Sheet — but the sheet actually has 1,187 because 13 webhook deliveries failed three weeks ago and were never retried. The client makes decisions on subtly wrong data.

## Related Notes
[[n8n-common-failures]] · [[webhook-reliability]] · [[pagination-failures]] · [[timezone-handling]]

---

## How It Happens

Drift accumulates through multiple mechanisms, often in combination:

1. **Missed webhooks** — webhook delivery fails during a server restart; records created during the outage window never arrive
2. **Failed retries silently dropped** — n8n workflow errors out on record #47 of a 200-record batch; records 48–200 never process
3. **Timezone conversion errors** — a "today's records" query runs at UTC midnight, missing 2 hours of records from a UTC-8 timezone account
4. **API pagination gaps** — cursor-based pagination returns a cursor that expires before the loop completes; records between page 3 and page 4 are skipped
5. **Partial batch failures** — one of 10 parallel branches fails; 9/10 branches succeed; the 1/10 failure is logged but not retried
6. **Schema drift** — source system adds a new required field; destination sync breaks on records with that field; old records sync, new ones don't
7. **Soft deletes not propagated** — source system marks records as deleted; sync workflow only reads active records and never deletes from destination

## Types of Drift

| Type | Description | Example |
|------|-------------|---------|
| Additive | Records exist in source but not in destination | 50 new leads in HubSpot missing from Google Sheet |
| Subtractive | Records in destination no longer exist in source | Deleted ad campaigns still appear in Postgres |
| Mutative | Records exist in both but have wrong values | CRM contact has old email address; update webhook was missed |
| Temporal | Records placed in wrong time bucket | Yesterday's ad spend in today's report due to timezone error |
| Schema | New fields not reflected | Cost-per-click column missing for campaigns added after schema change |

## Detection Signals
- Record count in destination does not match source for a given time window
- Timestamp of most recent record in destination is older than expected
- Spot-check reveals individual records with stale field values
- Source system shows 500 items; destination aggregation returns a different total
- Running the "full sync" workflow produces a different result than the "incremental sync" has accumulated

## Real Production Examples

**Scenario 1 — HubSpot to Google Sheets incremental drift**: An agency syncs HubSpot contacts to a Google Sheet incrementally using `lastmodifieddate > {last_run_timestamp}`. The workflow runs every hour. One night the workflow errors at 2:00 AM due to a Google Sheets API quota error. The `last_run_timestamp` in n8n's static data is not updated on failure (the update is at the end of the workflow). The 3:00 AM run picks up from 1:00 AM's timestamp — correctly catching the missed hour. However, the 4:00 AM run uses the updated timestamp from the 3:00 AM run, which succeeded. So far so good.

But three months later the team changes the workflow logic and forgets to update the timestamp correctly on partial failures. Drift begins accumulating at ~5 records per day, undetected for 6 weeks. The client notices when a campaign for a "synced" contact list gets 8% lower delivery than expected.

**Scenario 2 — Google Ads to Postgres timezone drift**: A Google Ads performance sync workflow queries `date_range: LAST_7_DAYS`. The Google Ads account timezone is America/Los_Angeles (UTC-8). The n8n workflow runs at 00:05 UTC. The query returns data for "today" in UTC — but Google Ads calculates "today" relative to the account timezone. So `LAST_7_DAYS` from UTC midnight actually includes the most recent 7 days 8 hours of data rather than exactly 7 calendar days in the account's timezone. Over time, this creates overlap and gap patterns in the Postgres table.

**Scenario 3 — Airtable pagination gap**: An Airtable → Supabase sync workflow uses Airtable's offset-based pagination (max 100 records per page). Between pages 2 and 3, a user adds 5 new records to the Airtable base. Airtable's offset is positional, not cursor-based; the next `offset` token skips the 5 new records that shifted earlier positions. Result: 5 records never synced. No error fires.

## Detection Methods

**Method 1 — Count comparison**:
```javascript
// n8n Code node — compare source vs destination counts
const sourceCount = $('Get HubSpot Count').first().json.total;
const destCount = $('Get Sheet Row Count').first().json.count;
const drift = Math.abs(sourceCount - destCount);
const driftPct = (drift / sourceCount * 100).toFixed(2);

if (drift > 10 || driftPct > 1) {
  return [{
    json: {
      alert: true,
      message: `Sync drift detected: source=${sourceCount}, dest=${destCount}, drift=${drift} (${driftPct}%)`,
      severity: drift > 50 ? 'critical' : 'warning'
    }
  }];
}
return [{ json: { alert: false } }];
```

**Method 2 — Timestamp gap detection**: Query the destination for the timestamp of the most recently updated record. If it is more than `2 × sync_interval` behind the current time, drift may be occurring.

**Method 3 — Checksum spot-check**: Select 20 random record IDs from the source. Fetch them from the destination. Compare a hash of 3-5 key fields. Any mismatch = mutative drift.

**Method 4 — Tombstone tracking**: Maintain a `sync_audit` table with `{source_system, record_id, source_hash, synced_at}`. Compare source hash to destination values daily.

## Reconciliation Patterns

**Daily full sync**: For small datasets (< 10,000 records), run a complete full sync nightly. The incremental sync handles real-time; the full sync catches everything the incremental missed. Mark records with a `last_full_sync_at` timestamp.

**Delta sync with watermark**: Store the high-water mark (last successful sync timestamp) in a persistent store (Supabase table, not n8n static data — which resets on restart). On each run, query `modified_since = {watermark}`. On success, update the watermark.

**Idempotent upsert**: All destination writes should use UPSERT semantics (INSERT ON CONFLICT UPDATE), never INSERT-only. This makes the sync re-runnable without creating duplicates.

## Prevention Patterns

- **Never use n8n static data as the sole source of watermarks** — it resets when the workflow is reset or the instance is restarted. Use Supabase or another persistent store.
- **Cursor-based pagination over offset pagination** where the API supports it — cursors are immune to record insertion during pagination
- **Sync both creates and deletes** — maintain a deleted_at field in the destination and propagate soft deletes
- **Build reconciliation alerts** into the end of every sync workflow — compare record counts before marking the run successful

## n8n-Specific Considerations

- n8n's `$getWorkflowStaticData('global')` is persisted to the database but is reset when a workflow is manually reset from the UI. Never rely on it as the sole watermark store.
- The **Split In Batches** node has a built-in failure mode: if the last batch fails, the workflow reports partial success. Use error routing on the process-batch subpath to route failures to a dead letter store.
- For HubSpot syncs, use `lastmodifieddate` as the watermark field — it updates on any property change, including CRM activities.
- For Google Ads, always parameterize date ranges using the account's timezone, not the server's UTC clock.
