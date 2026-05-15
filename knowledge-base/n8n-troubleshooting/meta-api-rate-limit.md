# Case: Meta Marketing API rate limit

**Type:** Labeled failure case
**Diagnosis label:** `ratelimit.meta-buc`
**Routes from:** `decision-trees/failure-diagnosis` (httpCode=429 with Meta/Facebook node)
**Auto-handle safety:** Auto-retry **with backoff** is safe; never auto-fix by removing rate-limit headers
**Updated:** 2026-05-07

## Input — what the error looks like

The execution lands in `status='error'` with `data.resultData.error` resembling:

```jsonc
{
  "name": "NodeApiError",
  "node": "Facebook Graph API" /* or "Meta Marketing", "Facebook Lead Ads" */,
  "httpCode": "429",            /* sometimes "400" — Meta is inconsistent */
  "message": "(#17) User request limit reached",
  "description": "...",
  "context": {
    "data": {
      "error": {
        "code": 17,             /* common: 17, 32, 4, 613 */
        "error_subcode": 2446079,
        "fbtrace_id": "AbC..."
      }
    }
  }
}
```

The body sometimes returns HTTP 200 with a JSON `error.code ∈ {4, 17, 32, 613}` — n8n's Facebook node still surfaces this as `NodeApiError`, but the `httpCode` field may show `200`. The agent must check **both** `httpCode` and `error.context.data.error.code`.

## Signals — what to check

1. **Response headers** on the most recent failed call:
   - `X-Business-Use-Case-Usage` — JSON keyed by ad-account ID. Each entry has `call_count`, `total_cputime`, `total_time`, and `estimated_time_to_regain_access`. **`estimated_time_to_regain_access` (minutes) is the canonical wait window.**
   - `X-App-Usage` — app-level. Watch `call_count`, `total_cputime`, `total_time` against 100.
   - `X-Ad-Account-Usage` — ad-account-level acquisition tier.
2. **Recent failure clustering:** count `error.code = 17` events for the same `ad_account_id` over the last hour. If > 3, the account is in a prolonged BUC penalty, not a transient burst.
3. **Time of day:** Meta's BUC counter resets on a rolling hourly window. A spike around the same minute-of-hour repeatedly points at a scheduled batch hitting the same window.
4. **Workflow shape:** does the failing node sit inside an `Item Lists` / `Split In Batches` loop? If yes, the loop is multiplying calls by a factor the engineer may not have measured.

## Correct diagnosis — what it actually is

Meta enforces three independent rate-limit tiers. The agent must identify which one is firing — the recovery differs:

| Tier | How to identify | What it means |
|---|---|---|
| **App-level** | `X-App-Usage` ≥ 100 in any field | The whole Facebook App is throttled across ALL customers using it. Other workflows on the same customer's app will also fail. |
| **Business Use Case (BUC)** | `X-Business-Use-Case-Usage` non-empty with high counts | The most common one. Per ad-account-per-use-case quota. Window is rolling hourly. |
| **Ad-account-level** | `X-Ad-Account-Usage` shows a high tier | Per ad-account total. Slower-moving than BUC. |

The error code disambiguates further:
- `code: 4` — generic app rate limit
- `code: 17` — user/ad-account rate limit (BUC)
- `code: 32` — page-level rate limit
- `code: 613` — custom audience rate limit

## Fix — exact steps to resolve

> **Safety:** all steps below are read-only against n8n state (the agent only stops or retries the execution). No customer data is modified. Auto-handle allowed at confidence ≥ medium.

1. **Stop the execution** if still running:
   `POST /api/v1/executions/:id/stop`
2. **Read the wait window** from headers: `estimated_time_to_regain_access` minutes from `X-Business-Use-Case-Usage`. If the field is absent, default to:
   - app-level → wait 60 min
   - BUC → wait 15 min
   - ad-account → wait 30 min
3. **Pause the parent workflow** for the wait window using either:
   - `POST /api/v1/workflows/:id/deactivate` then re-activate after the timer (cleaner, cancels in-flight schedules), **or**
   - inject a `Wait` node downstream of the failing node for the next run if the workflow is idempotent.
4. **Retry the failed execution** after the wait window: re-trigger the workflow with the same input. Use the agent's idempotency check first (see `decision-trees/recovery-routing`).
5. **If app-level (`X-App-Usage` ≥ 100):** notify-human. Multiple customers will be affected. The agency must request a higher app tier from Meta or split traffic across apps.
6. **If BUC repeats > 3× per hour:** notify-human and recommend the `Prevention` items below; auto-retry is masking the underlying problem.

## Prevention — how to avoid next time

Add to the customer's `playbooks/report-to-agency` recommendations:

- **Read BUC headers proactively.** Add an HTTP Request node after every Meta call to inspect `X-Business-Use-Case-Usage` and route to a `Wait` node if `call_count > 75`.
- **Batch insights calls.** Use `?fields=` aggressively and `breakdowns=` instead of N separate calls. The Meta SDK pattern `/{ad-account}/insights?level=campaign&fields=...,actions,...` is one BUC unit; querying each campaign individually is N units.
- **Avoid `Split In Batches` for ads endpoints.** Use Meta's batch API (`POST /` with a `batch=[...]` body) — up to 50 sub-requests per BUC unit.
- **Schedule large pulls off-peak.** Meta's BUC budget is per ad-account; spreading the daily backfill across 23:00–05:00 customer-local-time avoids contending with the customer's own ad-set edits.
- **Cache campaign metadata** (name, objective, status) for 24 h. Most reporting workflows re-fetch metadata that hasn't changed.
- **Tag the workflow `idempotent:true`** if it is — this lets the agent auto-retry instead of escalating.

## Cross-references

`decision-trees/failure-diagnosis` · `decision-trees/error-classification` (subtype `ratelimit.account-tier` or `ratelimit.app-tier`) · `playbooks/recover-from-api-error` · existing knowledge-base/tools/api-meta-marketing
