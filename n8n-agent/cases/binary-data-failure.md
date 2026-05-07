# Case: Binary data failure

**Type:** Labeled failure case
**Diagnosis label:** `data.binary-handling`
**Routes from:** `decision-trees/failure-diagnosis` for errors matching `/PayloadTooLargeError|request entity too large|binary data missing|file too large|413|MIME/`, or `infra.worker-oom` rooted in a binary-handling node
**Auto-handle safety:** No auto-retry — same payload will fail the same way. Agent recommends config changes (binary mode, payload limit, URL-vs-bytes upload). Engineering applies them.
**Updated:** 2026-05-07

## Input — what the error looks like

Five distinct error shapes; each maps to a different root cause:

**(a) Webhook payload too large:**
```
PayloadTooLargeError: request entity too large
```
HTTP 413 from n8n's own webhook endpoint. The caller's payload exceeded `N8N_PAYLOAD_SIZE_MAX` (MB, default 16).

**(b) Binary data missing downstream:**
```jsonc
{
  "name": "NodeOperationError",
  "message": "Item index 0 has no binary data set!",
  "node": "Move Binary Data" /* or any node expecting binary */
}
```
The previous node didn't produce binary, or it was lost across a queue-mode worker handoff.

**(c) Upstream upload size limit:**
```
413 Request Entity Too Large
{ "error": "File size exceeds maximum allowed (...)" }
```
Slack 1 GB, Notion **URL-only** (no direct file bytes), Airtable 5 MB attachment URL fetch limit, HubSpot Files 100 MB, Google Drive 5 TB but resumable required > 5 MB.

**(d) MIME mismatch:**
```
Unsupported media type
{ "error": { "code": "INVALID_MIME_TYPE", "message": "Expected image/png, got application/octet-stream" }}
```
The binary's `mimeType` was set wrong upstream (or not set) and the destination rejects.

**(e) Temporary URL expired:**
```
404 Not Found
{ "error": "The signed URL has expired" }
```
Slack file URLs expire after 24 h, Notion file URLs after 1 h, Twilio media URLs after retention period.

## Signals — what to check

1. **`N8N_DEFAULT_BINARY_DATA_MODE`.** Three values:
   - `default` (in-memory) — binaries serialized into the execution data JSON; **lost across worker handoff**, expensive on memory
   - `filesystem` — written to disk on the executing worker; readable by that worker, lost if worker dies
   - `s3` — written to S3-compatible storage; survives worker handoff and crash
2. **`N8N_PAYLOAD_SIZE_MAX` (MB).** Default 16. Caller (webhook) hits 413 if body > limit.
3. **Last node's binary output.** From `data.resultData.runData.<node-name>[0].data.binary`, inspect the keys. Empty `binary` map after a node that should produce one = node failure or wrong config.
4. **MIME type set.** `binary.<key>.mimeType` should be specific (`image/png`, `application/pdf`); generic `application/octet-stream` causes downstream rejection on strict APIs.
5. **File size in bytes.** `binary.<key>.fileSize`. Compare to destination limits (table below). If a workflow is uploading files to Slack at >1 GB, it will never succeed regardless of n8n config.
6. **URL TTL.** If the upstream URL was extracted from a previous step (Slack `file.url_private`, Notion `file.file.url`), check time elapsed since that step's `executionTime` to detect expiry.
7. **Worker handoff in queue mode.** If `binary` was set on the trigger worker but consumed on a different worker, in-memory mode loses it. Symptom: binary present at first node, absent at later node. Always.

## Correct diagnosis — what it actually is

| Sub-diagnosis | Identifier | Severity |
|---|---|---|
| **Webhook body > `N8N_PAYLOAD_SIZE_MAX`** | 413 from n8n itself | Easy — config change |
| **Binary lost across queue workers** | Memory mode + queue mode + multi-worker | High — needs FS or S3 mode |
| **Upload exceeds destination limit** | 413 from upstream (Slack 1 GB, Airtable 5 MB) | Medium — workflow redesign |
| **Notion direct upload attempt** | 400 / 404 from Notion file API | Workflow bug — Notion only accepts URLs |
| **Wrong MIME** | 415 / `INVALID_MIME_TYPE` | Easy — Set node fixes |
| **Expired temporary URL** | 404 from a Slack/Notion/Twilio URL > expiry window | Medium — re-fetch source |
| **Worker OOM from large binary** | Crash + last node was binary handling | High — switch binary mode (`infra.worker-oom`) |

## Reference — destination size limits

| Destination | Max | Notes |
|---|---|---|
| Slack `files.upload` | 1 GB | But 5 MB recommended for inline preview |
| Notion file property | URL only | Must upload elsewhere first |
| HubSpot Files API | 100 MB | Multipart for > 25 MB |
| Airtable attachment | URL → 5 MB fetched by Airtable | Pre-host files on permanent storage |
| Google Drive | 5 TB | Resumable upload required > 5 MB |
| Dropbox | 350 GB | Chunked > 150 MB |
| Email (Gmail / SMTP) | 25 MB attachment (Gmail), 10–25 MB SMTP | Use Drive link for larger |
| Discord webhook | 25 MB free / 100 MB nitro | Use file-host link |

## Fix — exact steps to resolve

> **Safety:** No retries on the same payload — they fail identically. Agent recommends config; engineer applies.

1. **Identify which sub-diagnosis** from the table. The `httpCode` + node + binary state combination disambiguates.
2. **For (a) webhook 413:** raise `N8N_PAYLOAD_SIZE_MAX`. Round-trip — confirm the customer's caller can actually send less, or accept the higher limit. Note: raising this also raises memory pressure per execution.
3. **For (b) binary lost:** the only durable fix is `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` or `s3`. In queue mode with multi-worker, **memory mode is broken by design** for any workflow that hands binary across nodes. Switch to S3 if the customer has multi-pod / multi-host workers.
4. **For (c) upload exceeds destination:** re-architect. Options, by destination:
   - **Notion:** upload to S3 / Cloudinary / Supabase Storage first; pass URL to Notion.
   - **Airtable:** same — Airtable fetches the URL itself; must be permanent (not signed-with-expiry).
   - **Slack:** chunk file pre-upload, or post a Drive link, or use `files.uploadV2` for resumable.
   - **HubSpot Files > 25 MB:** switch to multipart endpoint.
5. **For (d) MIME mismatch:** add a `Set` node that normalizes `binary.<key>.mimeType` based on file extension. The agent can compute the correct MIME from `binary.<key>.fileExtension`; engineering adds the node.
6. **For (e) expired URL:** the agent must trigger a re-fetch from the original source (Slack `files.info`, Notion `pages.retrieve`) which returns a fresh URL. Auto-retry **after re-fetch** is safe.
7. **For (g) OOM from binary:** join with `cases/n8n-worker-oom`. Same fix path — binary mode change.

## Prevention — how to avoid next time

- **Set `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` (single-node) or `s3` (multi-worker)** on every production instance handling files. The default in-memory mode is for development only.
- **Set `N8N_PAYLOAD_SIZE_MAX` to a value that matches reality.** Don't accept 100 MB webhooks if downstream nodes can't process them. Conservative: 32 MB.
- **Never upload directly from a webhook payload to a destination** without an intermediate storage step. The webhook body is in n8n's process memory; the upload streams from there. Any failure mid-upload loses the bytes — the caller has already moved on. Persist to S3 / FS first, then upload from durable storage.
- **Always set `mimeType` explicitly** on binary outputs in `Code` and `HTTP Request` nodes. Don't rely on auto-detection on the receiving end.
- **For Notion specifically:** never try to upload bytes — Notion accepts URLs only. Build the workflow with this constraint from day one.
- **Tag workflows by `binary:heavy`** (> 50 MB per item) so the agent applies stricter timeouts and routes failures to engineering immediately.
- **Refresh URLs at the moment of use**, not at the moment of fetch. If an upstream URL is going to be used in 2 minutes via a `Wait` node, fetch it after the `Wait`, not before.

## Cross-references

`decision-trees/failure-diagnosis` (label `data.binary-handling`) · `cases/n8n-worker-oom` · `cases/webhook-timeout` · `reference/n8n-production/n8n-performance` · `reference/n8n-nodes/n8n-node-httprequest` · `reference/api/api-notion` · `reference/api/api-slack-deep`
