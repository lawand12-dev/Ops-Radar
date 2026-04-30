# Token Expiration Patterns

**Category:** Failures  
**Source:** Google OAuth 2.0 docs, Meta Graph API docs, HubSpot private app docs, Shopify API docs, LinkedIn API docs, Slack API docs, n8n community forums, Stack Overflow production incidents  
**Updated:** 2026-04-30

## Overview
Token expiration is the single most common cause of silent automation failures in marketing agency workflows. Unlike server errors, expired tokens often return either a 401 or — worse — a 200 with empty data, making them nearly invisible until a client notices their CRM hasn't updated in three days. This page catalogs platform-specific lifetimes, expiration behaviors, and the architectural traps that cause cascading failures.

## Related Notes
[[n8n-common-failures]] · [[oauth-refresh-failures]] · [[rate-limit-recovery]]

---

## How It Happens
Tokens expire through four distinct mechanisms:

1. **Time-based expiry** — access tokens have a hard TTL set by the platform (e.g., Google: 3600s).
2. **Activity-based expiry** — Meta long-lived tokens expire 60 days after last use, not 60 days from issuance. An agency that pauses a campaign for 61 days returns to a broken integration.
3. **Refresh token rotation invalidation** — some platforms (Google, Shopify) issue a new refresh token on every use and immediately invalidate the old one. Two concurrent refresh requests destroy the token pair.
4. **Revocation events** — password changes, admin actions, scope changes, or SSO configuration changes instantly invalidate all tokens without notification.

## Detection Signals
- Workflow runs complete with no error, but destination records stop being created or updated
- API response body contains `{"data": []}` or `{"results": 0}` when data is expected
- HTTP 401 or 403 errors in n8n execution log (check the "Output" tab on the failing node, not just the status indicator)
- Credential "Last tested" timestamp in n8n is stale by more than the platform's access token lifetime
- Monitoring alerts on zero-record-written executions when source data is known to exist

## Real Production Examples

**Scenario 1 — Meta 60-day silent death**: An agency runs a monthly report automation. The workflow runs successfully in January and February. The March run returns HTTP 200 with `{"data":[]}` for all ad insights calls. The Meta long-lived user token issued in December had not been used in 62 days (January was a small month + buffer). The client assumed no spend happened. No alert fired because n8n saw HTTP 200.

**Scenario 2 — Google refresh token race condition**: A high-frequency Google Sheets sync workflow runs every 2 minutes. Two instances fire simultaneously at 14:00:00 and 14:00:01. Both detect the access token has expired. Both call the Google OAuth token endpoint to refresh. Google issues a new refresh token to the first caller and immediately revokes the old one. The second caller presents the (now-revoked) refresh token and receives `invalid_grant`. The n8n credential is permanently broken. All workflows using that Google credential stop. The team spends 30 minutes diagnosing before re-authenticating.

**Scenario 3 — LinkedIn access token 60-day cliff**: A LinkedIn organic post scheduler stops publishing. The 60-day access token expired with no automated refresh path (LinkedIn's refresh token is 365 days but requires explicit refresh calls, which the team's n8n workflow didn't implement). Posts silently fail with 401; the n8n workflow had no error branch.

## Platform-by-Platform Token Lifetimes

| Platform | Access Token TTL | Refresh Token TTL | Rotation? | Expiry Behavior |
|----------|-----------------|-------------------|-----------|-----------------|
| Google OAuth 2.0 | 3,600s (1hr) | Non-expiring (unless revoked) | Yes — new refresh token issued on use | 401 `invalid_grant` |
| Meta Graph API | 60 min (short-lived); 60 days (long-lived user token) | No separate refresh token; exchange short→long | No rotation | 190 `OAuthException` or 200 empty `data` |
| HubSpot Private App | Never expires | N/A | N/A | 401 if key deleted |
| Shopify Private App | Never expires (static token) | N/A | N/A | 401 |
| Shopify Session Token (online) | ~60 seconds | N/A | N/A | 401 |
| LinkedIn | 60 days (access) | 365 days (refresh) | No | 401 |
| Slack Bot Token | Permanent until revoked | N/A | N/A | `invalid_auth` in response |
| Airtable PAT | Never (personal) / org-set | N/A | N/A | 401 |
| Google Ads | 3,600s via OAuth | Non-expiring | Yes | `AuthenticationError` |

## Prevention Patterns

**Use service accounts where possible**: For Google Workspace APIs (Sheets, Drive, Ads via service account impersonation), service account keys do not expire on a TTL — they only expire if rotated by an admin. This eliminates the refresh cycle entirely for non-user-facing workflows.

**Prefer non-expiring credential types**: HubSpot private app tokens and Shopify private app tokens never expire. When agencies have the choice between OAuth and private app credentials, private app is more automation-stable.

**Add a pre-flight token validation step**: At the start of any workflow that uses OAuth credentials, make a cheap API call (e.g., GET /me or equivalent) and branch on 401. Route the 401 branch to a Slack alert with the credential name and workflow ID.

```javascript
// n8n Code node — pre-flight check pattern
const response = $input.first().json;
if (response.statusCode === 401 || response.error?.type === 'OAuthException') {
  throw new Error(`Credential expired for workflow: ${$workflow.name}. Re-authenticate in n8n credentials.`);
}
return $input.all();
```

**Serialize refresh calls**: If a workflow runs at high frequency, use n8n's single-execution mode or a semaphore (Redis via Upstash HTTP) to prevent concurrent refresh requests. See [[concurrent-execution-race-conditions]].

**Monitor Meta tokens proactively**: Meta provides a token debug endpoint: `GET https://graph.facebook.com/debug_token?input_token={token}&access_token={app_token}`. The response includes `expires_at`. Build a weekly workflow that checks all Meta tokens and alerts when `expires_at` is within 14 days.

## Recovery Procedures

1. Identify which n8n credential is broken (check the failing node's "Credential" field in execution details).
2. Open n8n → Credentials → find the credential → click "Test" to confirm it's invalid.
3. Click "Reconnect" or re-enter credentials. For OAuth platforms, you must re-authenticate as the account owner — cannot be done by a different user.
4. After re-authenticating, re-test the credential.
5. Re-run the failed executions from the execution log if data loss occurred during the outage window.
6. For Meta tokens specifically: after re-auth, call the long-lived token exchange endpoint manually to get a 60-day token. Short-lived tokens issued by Meta's login flow expire in 1 hour.
7. Document the date of re-authentication in a shared log so the team knows when the next expiry window opens.

## n8n-Specific Considerations

- n8n stores OAuth credentials and handles token refresh automatically — but only if the credential type supports it. Check the credential type's "Refresh Token" field exists before assuming auto-refresh is active.
- When n8n's automatic refresh fails (e.g., due to a race condition), it logs the error at the credential level, not the workflow level. The workflow execution may show "success" while the credential is silently broken.
- n8n cloud's credential refresh runs in a shared process — high-concurrency workflows on a single credential should use `maxConcurrency: 1` at the workflow settings level to serialize refresh attempts.
- The `HTTP Request` node with "Predefined Credential Type" selected will handle 401 retries with refresh. Manual credential injection via expressions bypasses this logic.
- For platforms without native n8n credential support, implement manual refresh in a sub-workflow that stores the token in a static data store (n8n's built-in key-value) and refreshes based on expiry timestamp comparison.
