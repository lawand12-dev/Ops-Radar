# Microsoft Graph API

**Category:** Tools  
**Source:** Microsoft Graph documentation (learn.microsoft.com/graph), Azure AD documentation, Microsoft 365 Developer documentation  
**Updated:** 2026-04-30

## Overview
Microsoft Graph is the unified API gateway for Microsoft 365, Azure AD, Teams, SharePoint, OneDrive, and Outlook. It uses Azure AD for authentication with delegated (user) or application (service) permissions. Understanding throttling behavior per service is critical for production automation, as limits vary significantly across workloads.

## Related Notes
[[api-google-workspace]], [[n8n-credential-management]], [[n8n-performance]]

---

## App Registration (Azure AD)

### Steps to Register an Application
1. Azure Portal → Azure Active Directory → App Registrations → New Registration.
2. Set Redirect URI (for delegated: `http://localhost` for dev; HTTPS for prod).
3. Under "API Permissions" → Add a permission → Microsoft Graph.
4. Choose Delegated (acts as user) or Application (acts as service).
5. For Application permissions: click "Grant admin consent for [tenant]" (requires Global Admin).
6. Under "Certificates & Secrets": create a client secret or upload a certificate.

### Delegated vs Application Permissions

| Feature | Delegated | Application |
|---|---|---|
| Acts as | Signed-in user | Service/daemon (no user) |
| Requires user login | Yes | No |
| Admin consent required | Sometimes (for sensitive scopes) | Always |
| Access token type | On behalf of user | Client credentials |
| Use case | User-facing apps | Background automation, workflows |

---

## Token Acquisition

### MSAL (Microsoft Authentication Library)
```python
from msal import ConfidentialClientApplication

app = ConfidentialClientApplication(
    client_id="YOUR_APP_ID",
    authority="https://login.microsoftonline.com/YOUR_TENANT_ID",
    client_credential="YOUR_CLIENT_SECRET"
)

# Client credentials flow (application permissions)
result = app.acquire_token_for_client(
    scopes=["https://graph.microsoft.com/.default"]
)
access_token = result["access_token"]
```

### Client Credentials Flow (Application Permissions)
- No user interaction. Token has 1-hour lifetime.
- Use `https://graph.microsoft.com/.default` scope to get all pre-consented permissions.
- Token caching: MSAL handles this automatically — do not request a new token on every call.

### Token Refresh
- Delegated: refresh tokens are long-lived (default 90 days, configurable).
- Application: just request a new token when the current one expires (no refresh token concept).

---

## Throttling Limits by Service

| Service | Limit |
|---|---|
| Global (all services, per app across all tenants) | 130,000 requests / 10 seconds |
| SharePoint / OneDrive (per app per tenant) | 12,000 requests / 20 seconds |
| Outlook / Mail / Calendar (per app per tenant) | 10,000 requests / 10 minutes |
| Teams (Cloud Communication Service, per app per tenant) | 50,000 requests / 15 seconds |
| Teams Presence | 10,000 requests / 30 seconds |
| Excel (per app, all tenants) | 5,000 requests / 10 seconds |
| Identity and Access (per app+tenant, large tenant >500 users) | 8,000 resource units / 10 seconds |
| Intune (per tenant, all apps) | 2,000 requests / 20 seconds |

### Throttling Response Pattern
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 10
Content-Type: application/json

{
  "error": {
    "code": "TooManyRequests",
    "message": "Please retry again later."
  }
}
```

Always honor the `Retry-After` header. Implement exponential backoff with jitter when no header is present.

---

## Delta Queries (Change Tracking)

Delta queries allow you to retrieve only changed items since your last sync — critical for avoiding full scans and preventing throttling.

```
# First call: get all items + deltaLink
GET /v1.0/me/messages/delta

# Subsequent calls: get only changes since last sync
GET /v1.0/me/messages/delta?$deltatoken=TOKEN_FROM_PREVIOUS_RESPONSE
```

Supported for: messages, calendar events, contacts, users, groups, OneDrive items, directory objects.

---

## Webhooks / Change Notifications

Subscriptions push notifications when resources change — more efficient than polling.

### Subscription Lifecycle
- **Maximum lifetime**: varies by resource (e.g., mail: 4230 minutes ≈ 3 days; calendar: 4230 min; Teams messages: 60 minutes; OneDrive: 4230 min).
- **Must renew before expiration** — automate renewal in your workflow.
- **Validation**: Graph sends a `validationToken` POST to your endpoint during creation — you must echo it back within 10 seconds.

```json
{
  "changeType": "created,updated",
  "notificationUrl": "https://your-endpoint.com/webhook",
  "resource": "me/mailFolders('Inbox')/messages",
  "expirationDateTime": "2026-05-03T00:00:00Z",
  "clientState": "your-secret-state-value"
}
```

### Subscription Renewal
```
PATCH /v1.0/subscriptions/{subscriptionId}
{ "expirationDateTime": "NEW_EXPIRY" }
```

---

## Batch Requests

Combine up to **20 requests** per batch into a single HTTP call.

```json
POST https://graph.microsoft.com/v1.0/$batch
{
  "requests": [
    { "id": "1", "method": "GET", "url": "/me/messages?$top=10" },
    { "id": "2", "method": "GET", "url": "/me/calendarView?startDateTime=...&endDateTime=..." },
    { "id": "3", "method": "GET", "url": "/me/drive/root/children" }
  ]
}
```

- Each sub-request in a batch is evaluated individually against throttling limits.
- Throttled sub-requests return 429 within the batch response (batch itself returns 200).
- Retry only the failed sub-requests after the longest `Retry-After` value.

---

## OneDrive Large File Upload

Files over 4 MB require an upload session:

```
# 1. Create upload session
POST /v1.0/me/drive/root:/{filename}:/createUploadSession

# 2. Upload chunks (recommended 10MB chunks for reliability)
PUT {uploadUrl}
Content-Range: bytes 0-10485759/TOTAL_SIZE

# 3. Session auto-expires after 24 hours of inactivity
# Monitor 200/201 (complete) vs 202 (in progress) vs 308 (partial)
```

---

## Common Errors

| Code | Error | Cause | Fix |
|---|---|---|---|
| 401 | `Unauthorized` | Token expired or missing | Refresh token; check token scope |
| 403 | `Forbidden` / `insufficientPrivileges` | Missing permission or admin consent not granted | Add permission; grant admin consent |
| 403 | `accessDenied` | Tenant policy blocks access | Check Conditional Access policies |
| 404 | `itemNotFound` | Resource doesn't exist | Validate IDs; check soft-delete |
| 429 | `TooManyRequests` | Throttled | Honor `Retry-After`; implement backoff |
| 503 | `ServiceUnavailable` | Transient outage | Retry with exponential backoff |
| 509 | `bandwidthLimitExceeded` | Data transfer quota exceeded | Reduce response size with `$select` |

---

## Calendar, Mail, and Teams API Gotchas

### Outlook/Mail
- `createdDateTime` is immutable — cannot insert messages with custom timestamps via API.
- Shared mailbox access: use `/users/{mailbox-email}/messages`, not `/me/messages`.
- Mail read operations don't mark messages as read — use `PATCH` with `isRead: true` explicitly.

### Calendar
- `calendarView` (time-bounded) is more efficient than listing all events + filtering.
- Recurring events: the series master has `type: "seriesMaster"`; individual occurrences are separate resources.
- Free/busy queries: use `/calendar/getSchedule` to check availability for multiple users.

### Teams
- Sending messages requires the bot framework or `chatMessages` write permission (application) — not available for all tenant configurations.
- Teams channel message threading: always reply with `POST /teams/{id}/channels/{id}/messages/{id}/replies` to maintain thread context.

---

## Consent Types

| Type | When Required | Who Grants |
|---|---|---|
| User consent | Delegated permissions (non-sensitive) | Individual user |
| Admin consent | Application permissions; sensitive delegated scopes | Tenant Global Admin or Privileged Role Admin |
| Tenant-wide admin consent | Application permissions for all users | Global Admin via Admin Portal |

Sensitive scopes requiring admin consent include: `User.Read.All`, `Mail.ReadWrite`, `Calendar.ReadWrite`, `Files.ReadWrite.All`.

---

## Breaking Changes 2024–2025

- **Azure AD Graph API retired (March 2024)**: All `graph.windows.net` calls must migrate to `graph.microsoft.com`. Azure AD Graph SDKs no longer receive updates.
- **Legacy auth protocols blocked**: Basic authentication for Exchange Online fully disabled. All mail automation must use OAuth 2.0.
- **Teams permissions restructure**: Some Teams permissions split into more granular scopes in 2024. Applications using broad Teams scopes may need to re-consent.
- **OneDrive delta API changes**: `$skiptoken` behavior updated — always persist and use `deltaLink` from final page, not intermediate skip tokens.
- **Subscription max lifetime enforcement**: Stricter enforcement of subscription expiry — subscriptions not renewed are now hard-deleted rather than silently expiring.
