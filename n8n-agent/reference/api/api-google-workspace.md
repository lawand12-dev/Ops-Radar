# Google Workspace APIs (Sheets, Drive, Gmail)

**Category:** Tools  
**Source:** Google Workspace Developer Documentation, Google Cloud Console quota documentation, Google Identity documentation  
**Updated:** 2026-04-30

## Overview
Google Workspace APIs provide programmatic access to Sheets, Drive, and Gmail — the three most commonly automated surfaces in marketing agency stacks. Authentication can be handled via Service Account (server-to-server) or OAuth 2.0 (user-delegated), with Service Accounts supporting domain-wide delegation for impersonating workspace users at scale.

## Related Notes
[[n8n-node-gmail]], [[n8n-node-google-analytics]], [[n8n-credential-management]], [[api-microsoft-graph]]

---

## Authentication Patterns

### Service Account vs OAuth 2.0

| Feature | Service Account | OAuth 2.0 |
|---|---|---|
| User interaction required | No | Yes (first time) |
| Acts as specific user | Via domain-wide delegation | As the authenticated user |
| Token lifespan | Self-signed JWT, 1-hour access token | Access token 1 hr, refresh token long-lived |
| Best for | Automation, server-to-server | User-facing apps, accessing user data directly |
| Requires Workspace Admin setup | Yes (for DWD) | No |

### Domain-Wide Delegation (DWD) Setup
1. Create a Service Account in Google Cloud Console (IAM & Admin → Service Accounts).
2. Generate and download a JSON key file (rotate every 90 days — see key rotation below).
3. In Google Workspace Admin Console: Security → API Controls → Domain-wide Delegation → Add new.
4. Enter the Service Account Client ID and the required OAuth scopes.
5. In code, use `google.auth.JWT` with `subject` set to the user email to impersonate.

```python
from google.oauth2 import service_account

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
credentials = service_account.Credentials.from_service_account_file(
    'service-account.json',
    scopes=SCOPES
)
# Impersonate a user via DWD
delegated_credentials = credentials.with_subject('user@yourdomain.com')
```

### Service Account Key Rotation
- Keys do not auto-expire — rotation is a manual operational responsibility.
- Recommended rotation interval: every 90 days.
- Process: create new key → update secret in vault → verify → delete old key.
- Monitor key age via Cloud Console or `gcloud iam service-accounts keys list`.

---

## Google Sheets API v4

### Quota Limits

| Limit | Value |
|---|---|
| Requests per minute per project | 300 |
| Requests per minute per user | 60 |
| Read requests per minute per user | 60 |
| Write requests per minute per project | 300 |
| Max cells per spreadsheet | 10,000,000 |
| Max columns per sheet | 18,278 (ZZZ) |

### Key Operations

```
GET  /v4/spreadsheets/{spreadsheetId}/values/{range}          # Read values
PUT  /v4/spreadsheets/{spreadsheetId}/values/{range}          # Overwrite range
POST /v4/spreadsheets/{spreadsheetId}/values/{range}:append   # Append rows
POST /v4/spreadsheets/{spreadsheetId}/values:batchGet         # Read multiple ranges
POST /v4/spreadsheets/{spreadsheetId}/values:batchUpdate      # Write multiple ranges
POST /v4/spreadsheets/{spreadsheetId}:batchUpdate             # Structural changes
```

**Batch requests** are critical: `batchGet` and `batchUpdate` count as a single request against quota regardless of how many ranges are included. Always prefer batch operations over individual cell reads/writes.

### ValueInputOption
- `RAW` — stores exactly as input; no formula evaluation.
- `USER_ENTERED` — interprets formulas, date formats (use for human-readable data).

---

## Google Drive API v3

### Quota Limits

| Limit | Value |
|---|---|
| Queries per day | 1,000,000,000 |
| Queries per 100 seconds per user | 1,000 |
| Queries per 100 seconds | 1,000 |
| Upload size (simple upload) | 5 MB max |
| Upload size (resumable upload) | 5 TB max |

### Upload Strategies

**Simple upload** (`uploadType=media`): Use for files under 5 MB. Single request.

**Multipart upload** (`uploadType=multipart`): File + metadata in one request. Still limited to 5 MB.

**Resumable upload** (`uploadType=resumable`): Required for files over 5 MB. Use for all binary uploads in production — handles network interruptions.

```
# Resumable upload flow:
POST /upload/drive/v3/files?uploadType=resumable
  → Returns upload URI in Location header
PUT {upload_uri} with Content-Range: bytes 0-{n}/{total}
  → Returns 200/201 on completion, 308 Resume Incomplete on partial
```

### Export vs Download for Google Docs
Google Docs, Sheets, Slides are stored in Google's internal format and have no file size on Drive. You **cannot** use `files.get` + `alt=media` to download them. Instead:

- **Export**: `GET /drive/v3/files/{fileId}/export?mimeType={exportMimeType}`
- Common export MIME types: `application/pdf`, `text/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Export size limit: 10 MB for Google Docs exports.

---

## Gmail API

### Quota Units

| Method | Units |
|---|---|
| `messages.list` | 5 |
| `messages.get` | 5 |
| `messages.send` | 100 |
| `messages.insert` | 25 |
| `drafts.send` | 100 |
| `threads.list` | 10 |
| `threads.get` | 10 |

### Quota Limits

| Limit | Value |
|---|---|
| Quota units per user per second | 250 |
| Daily sending limit (Gmail consumer) | 500 emails/day |
| Daily sending limit (Workspace) | 2,000 emails/day |
| Daily quota units | 1,000,000,000 (1B) |
| Max message size | 25 MB (attachment + body) |

### Batch Requests (All Google APIs)
Use the batch endpoint to combine up to **100 requests** in a single HTTP call. This reduces API calls by up to 90% for bulk operations.

```
POST https://www.googleapis.com/batch/gmail/v1
Content-Type: multipart/mixed; boundary=batch_boundary

--batch_boundary
Content-Type: application/http
GET /gmail/v1/users/me/messages/MSG_ID_1

--batch_boundary
Content-Type: application/http
GET /gmail/v1/users/me/messages/MSG_ID_2
--batch_boundary--
```

Each sub-request still counts against per-user quota, but the overhead of 100 separate HTTP connections is eliminated.

---

## Common Errors

| Error Code | Name | Cause | Fix |
|---|---|---|---|
| 403 | `quotaExceeded` | Project or user quota exhausted | Implement exponential backoff; batch requests |
| 429 | `rateLimitExceeded` | Too many requests in window | Honor `Retry-After` header; use jitter in backoff |
| 500 | `backendError` | Transient Google server error | Retry with exponential backoff (up to 5 attempts) |
| 403 | `forbidden` | Scope not granted or DWD not configured | Check OAuth scopes; verify DWD in Admin Console |
| 404 | `notFound` | Resource deleted or wrong ID | Validate IDs before operations |
| 400 | `badRequest` | Malformed range notation or body | Check A1 notation; validate request structure |

### Exponential Backoff Pattern
```
delay = min(2^attempt + random_ms, max_delay)
# attempt 0: ~1s, attempt 1: ~2s, attempt 2: ~4s, attempt 3: ~8s
```

---

## Impersonation Patterns

For automation accessing multiple users' data in a Workspace organization, domain-wide delegation is the correct pattern. Key rules:
- The Service Account must have DWD enabled in the Admin Console.
- The `subject` in the JWT must be a real user in the domain.
- The scopes requested must be pre-authorized in the Admin Console.
- Cannot impersonate `@gmail.com` (consumer) accounts — only Workspace (domain) accounts.

---

## Workspace Admin SDK

For user provisioning and management automation:

```
POST /admin/directory/v1/users           # Create user
GET  /admin/directory/v1/users           # List users
PUT  /admin/directory/v1/users/{userKey} # Update user
POST /admin/directory/v1/groups          # Create group
POST /admin/directory/v1/groups/{groupKey}/members  # Add member
```

Requires `https://www.googleapis.com/auth/admin.directory.user` scope and DWD with a super-admin subject.

---

## Breaking Changes 2024–2025

- **Drive API v2 deprecation** (ongoing): v3 is the current version. v2 endpoints still work but new development should use v3.
- **OAuth out-of-band (OOB) flow removal** (completed 2022-2023): Desktop apps must use loopback redirect or system browser. Affects older automation scripts.
- **Service account key creation restrictions**: Some organizations have org-level policies blocking SA key creation. Use Workload Identity Federation (keyless auth) as alternative.
- **Gmail SMTP/IMAP deprecation for Google accounts** (2024): Less secure app access disabled; all access now requires OAuth 2.0. Direct SMTP/IMAP with username+password no longer works for Workspace accounts with the policy enforced.
- **Sheets API batch size**: batchUpdate now enforces a soft limit of 1000 operations per batch — split large structural updates accordingly.
