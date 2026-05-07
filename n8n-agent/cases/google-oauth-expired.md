# Case: Google OAuth refresh token expired or revoked

**Type:** Labeled failure case
**Diagnosis label:** `auth.refresh-expired`
**Routes from:** `decision-trees/failure-diagnosis` (httpCode∈{401,403} on a Google node)
**Auto-handle safety:** Auto-refresh allowed only when n8n's credential refresh flow is intact; otherwise notify-human. Never re-create credentials silently.
**Updated:** 2026-05-07

## Input — what the error looks like

```jsonc
{
  "name": "NodeApiError",
  "node": "Google Sheets" /* or Google Ads, Gmail, Google Analytics, Google Drive */,
  "httpCode": "401",        /* sometimes 400 with body.error="invalid_grant" */
  "message": "Unauthorized — Token has been expired or revoked.",
  "description": "...",
  "context": {
    "data": {
      "error": "invalid_grant",
      "error_description": "Token has been expired or revoked."
    }
  }
}
```

Variants the agent must also catch:

- `400 invalid_grant` with `error_description: "Bad Request"` — the refresh token itself is dead, not just the access token.
- `403` with `accessNotConfigured` — different problem (API not enabled); do **not** treat as `auth.refresh-expired`.
- `401` with `unauthorized_client` — OAuth client (not the user token) is revoked or app deleted.

## Signals — what to check

1. **Credential `updatedAt`** in `credentials_entity`. n8n updates this every time a refresh succeeds. If `now - updatedAt > 7 days`, refresh has been silently failing for a week.
2. **Affected scope:** does `error.message` reference a specific scope? If yes, the user has revoked one scope but not all — handle as `auth.scope-insufficient`, not `refresh-expired`.
3. **OAuth client status:** can the agent reach `https://oauth2.googleapis.com/tokeninfo?access_token=<token>`? (Only possible if the agent has the access token in memory mid-execution; it cannot read it from `credentials.data` over the API.) A `400 invalid_token` from tokeninfo confirms revocation.
4. **App verification status:** if the OAuth app is in **Testing** mode in Google Cloud, refresh tokens expire after **7 days** by policy. Production-verified apps issue long-lived refresh tokens. Check Google Cloud Console → OAuth consent screen → Publishing status.
5. **User account:** has the user changed their Google password recently, or revoked the connection at `myaccount.google.com/permissions`? Both invalidate refresh tokens immediately.
6. **Multiple credentials affected:** if more than one Google credential of the same type fails simultaneously, the OAuth client itself is revoked, not the user tokens.

## Correct diagnosis — what it actually is

Disambiguate before acting:

| Sub-diagnosis | Identifying signal | Recovery path |
|---|---|---|
| **Refresh token expired (7-day rule)** | OAuth app in Testing mode AND refresh token age = 7 d | `auto-refresh` will fail; user must re-consent; root cause = unverified app |
| **User revoked at myaccount.google.com** | Single user; `error_description: "Token has been expired or revoked"` and verified-app | User must re-consent; `auto-refresh` will fail |
| **Password changed / 2FA reset** | Same as above; user reports recent account change | Re-consent |
| **Scope removed in Google admin** | Workspace admin disabled scope; affects all org users | Workspace admin must restore scope; engineering ticket |
| **OAuth client revoked / app deleted** | Multiple credentials fail at once; `unauthorized_client` | Engineering: re-create OAuth client and migrate credentials |
| **Service account key rotated** (if using SA auth instead of OAuth) | `invalid_jwt`; not OAuth at all | Rotate key in n8n credential store |
| **Access token expired but refresh works** | Rare — n8n refreshes proactively | `auto-refresh` succeeds; do not alert customer |

## Fix — exact steps to resolve

> **Safety:** Auto-refresh is read-only against the customer's credential (n8n internally calls `oauth2.googleapis.com/token`). It does **not** touch n8n's stored credential blob. Do not delete or recreate credentials automatically.

1. **Trigger n8n's credential refresh.** Re-execute the failed node once via `POST /api/v1/executions/:id/retry` (or re-fire the trigger). n8n will attempt a refresh on the next call. If refresh succeeds, `credentials_entity.updatedAt` advances; the agent confirms by polling.
2. **If refresh fails with `invalid_grant`:** the refresh token itself is dead. Stop. Notify-human.
3. **Compose the customer alert** (notify-human path). Include:
   - Credential `name` and `type`
   - Last successful refresh timestamp
   - Suspected sub-diagnosis from the table above
   - The exact action required ("Re-authenticate this credential in n8n: Settings → Credentials → \<name\> → Reconnect.")
   - Whether other workflows are affected (cross-reference `credentials_entity.id` against active `workflow_entity.nodes` blobs)
4. **Pause affected workflows** if they fire on a short interval (< 15 min) to avoid alarm spam:
   `POST /api/v1/workflows/:id/deactivate`. Track each pause for resumption after the engineer reports completion.
5. **Do not** auto-create a new OAuth credential. Migration of node references is too risky to automate; it can re-point the wrong workflow to the wrong customer's account.

## Prevention — how to avoid next time

Add to the customer's `playbooks/report-to-agency` recommendations:

- **Move the OAuth app from Testing to Production-verified.** This eliminates the 7-day refresh-token expiry, which is the #1 silent cause for early-stage agencies.
- **Use a Google Workspace service account where possible.** Sheets, Drive, Gmail (with domain-wide delegation), and Calendar all support service accounts and avoid the human-consent failure mode entirely.
- **Monitor `credentials_entity.updatedAt`.** Run a daily check: any Google credential where `now - updatedAt > 24 h` AND there are scheduled workflows referencing it = anomaly. Alert before failure.
- **Document re-consent recovery** in the agency's runbook. Reconnect time = 60 s when documented; 30 min when not.
- **Avoid sharing one OAuth credential across many workflows.** When the credential dies, blast radius = all workflows. Per-purpose credentials limit damage.
- **Rotate refresh tokens proactively** once a quarter for high-value workflows (billing, invoicing). Forced rotation surfaces broken refresh flows on a known schedule.

## Cross-references

`decision-trees/failure-diagnosis` · `decision-trees/recovery-routing` (action `auto-refresh`) · `playbooks/recover-from-api-error` · existing knowledge-base/failures/oauth-refresh-failures · existing knowledge-base/tools/api-google-workspace
