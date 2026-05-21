# OpsRadar Customer Auth — Design Spec

**Date:** 2026-05-10
**Status:** Approved (pending implementation plan)
**Path:** Z (one-page admin form + customer auth, no full admin/customers UI)

---

## Context

OpsRadar's dashboard is the OPERATE phase of the AIOS three-phase model (DIAGNOSE → BUILD → OPERATE). The customer journey works like this:

1. Lead lands on the marketing site → takes the audit at `/audit` → email captured for marketing.
2. Lead books a strategy call (Calendly).
3. **OpsRadar (you)** sells them, deploys their n8n instance, builds their workflows, automates their operations.
4. **OpsRadar** has full access to their n8n: base URL, webhook secret (for dashboard reads), and API key (for workflow CRUD + monitoring).
5. After the customer's n8n is configured and workflows are running, OpsRadar invites them to the dashboard.
6. Customer logs in and sees a fully working dashboard — they never touch n8n, never configure anything.

This spec covers the auth machinery that makes step 5–6 possible, plus a single admin form so onboarding is a 30-second ritual instead of 10 minutes of manual SQL.

**What this spec is NOT:**
- Not a customer-facing self-signup flow (`/signup` does not exist).
- Not a full admin/customers CRM (deferred until volume justifies).
- Not chat-service workflow auto-deploy logic (separate workstream in the chat repo).
- Not encryption of webhook secrets / API keys at rest (deferred — known gap).

---

## Goals

1. Customers can sign in to `/dashboard` securely.
2. OpsRadar staff can onboard a new customer in one click via `/admin/onboard-customer`.
3. The same Supabase row that powers dashboard reads also stores the n8n API key for future workflow management.
4. Existing dashboard widgets (sales, marketing, metrics, integrations) work unchanged with the new SSR session helper.
5. Local dev (`npm run dev`) continues to work without a real session, via the existing `DEV_CLIENT_ID` fallback.

## Non-goals

- Public self-serve signup
- Multi-tenant role-based access control (every customer has exactly one user)
- 2FA, SSO, OAuth providers
- Encrypted credential storage (deferred to a separate hardening pass)
- Customer-facing tooling to view/edit their n8n configuration

---

## Architecture

```
Marketing site (/, /audit, /pricing, …) ── public
        │ click "Sign in" in nav
        ▼
   /login ── email + password
        │ submit
        ▼
   supabase.auth.signInWithPassword
        │ cookies set
        ▼
   /dashboard/* ── protected by Next.js middleware (@supabase/ssr)
                   no session → /login?redirectTo=…

INVITE FLOW (admin onboards new customer):
   /admin/onboard-customer (gated by existing admin password)
        │ POST → creates auth.users row + client_n8n_config row + sends invite email
        ▼
   Customer email contains magic link
        ▼
   /auth/callback?code=…&type=invite
        │ exchangeCodeForSession → cookies set
        ▼
   /auth/set-password ── customer chooses password
        │
        ▼
   /dashboard

PASSWORD RESET FLOW:
   /forgot-password → email → resetPasswordForEmail
        ▼
   Email link → /auth/callback?code=…&type=recovery
        ▼
   /auth/reset-password → new password → /dashboard
```

### Two Supabase clients, separated by concern

| Client | Used by | Reads/writes |
|---|---|---|
| `getServerSupabaseClient()` (existing, service-role key) | n8n webhook callbacks (`/api/dashboard/backfill-complete`), admin tasks like `auth.admin.inviteUserByEmail`, system actions | Bypasses RLS |
| `getSessionSupabaseClient()` (NEW, `@supabase/ssr` cookie-aware) | All dashboard pages and `/api/dashboard/*` user routes, middleware | Subject to RLS, returns the logged-in customer |

The existing `getServerSupabaseClient()` stays for system tasks (n8n calls, admin invitation API). The new helper handles everything tied to a logged-in customer.

### `DEV_CLIENT_ID` fallback

Preserved. When no real session exists (local dev), the SSR auth path resolves the user id to `process.env.DEV_CLIENT_ID` instead of failing. Concretely: a thin helper (e.g. `getCurrentUserId()`) wraps `getSessionSupabaseClient().auth.getUser()` and falls back to the env var if the cookie is missing. Exact helper shape decided in the implementation plan. `npm run dev` continues to work without logging in.

---

## Files

### Create — customer auth (10 files)

| File | Purpose |
|---|---|
| `src/lib/supabase-ssr.ts` | New SSR helper using `@supabase/ssr`. Reads cookies, returns logged-in user. Falls back to `DEV_CLIENT_ID` in dev. |
| `src/middleware.ts` | Next.js middleware. Protects `/dashboard/*`. Reads cookies, redirects to `/login?redirectTo=…` if no session. |
| `src/app/login/page.tsx` | Email + password form with "Forgot password?" link. POSTs to `signInWithPassword`. |
| `src/app/forgot-password/page.tsx` | Single email field. POSTs to `resetPasswordForEmail`. Always shows generic success (anti-enumeration). |
| `src/app/auth/callback/route.ts` | Exchanges `?code=…` for session, sets cookies. Branches on `?type` query param: `invite` → `/auth/set-password`, `recovery` → `/auth/reset-password`, otherwise → `redirectTo` or `/dashboard`. |
| `src/app/auth/set-password/page.tsx` | First-time password setup. Customer lands here after clicking invite link. POSTs to `updateUser({ password })`. |
| `src/app/auth/reset-password/page.tsx` | Set new password after clicking reset link. POSTs to `updateUser({ password })`. |
| `src/app/login/check-email/page.tsx` | Static "We sent you a link" confirmation screen for the forgot-password flow. |
| `src/app/api/auth/signout/route.ts` | POST → `supabase.auth.signOut()` → clears cookies → redirect to `/`. |
| `src/components/dashboard/sign-out-button.tsx` | Button in dashboard sidebar. Hits the signout route. |

### Create — admin onboarding (2 files)

| File | Purpose |
|---|---|
| `src/app/admin/onboard-customer/page.tsx` | Form: `email`, `n8n_base_url`, `n8n_webhook_secret`, `n8n_api_key`. Gated by existing admin password cookie. |
| `src/app/api/admin/onboard-customer/route.ts` | Validates admin password header. Calls `auth.admin.inviteUserByEmail`. Inserts `client_n8n_config` row. Atomic — if invite fails, the row insert is rolled back (or never attempted). Returns `{ ok, userId, email }`. |

### Create — schema (1 file)

| File | Purpose |
|---|---|
| `supabase/migrations/20260511_client_n8n_config_api_key.sql` | Adds `n8n_api_key text` column to `client_n8n_config`. |

### Modify (9 files)

| File | Change |
|---|---|
| `package.json` | Add `@supabase/ssr` |
| `src/lib/database.types.ts` | Regenerate via Supabase MCP after migration |
| `src/lib/client-n8n.ts` | Return `n8nApiKey` field alongside `n8nBaseUrl`, `n8nWebhookSecret`, `backfillCompletedAt` |
| `src/app/api/dashboard/metrics/route.ts` | Switch from `getServerSupabaseClient()` to `getSessionSupabaseClient()` for `auth.getUser()` |
| `src/app/api/dashboard/sales/route.ts` | Same |
| `src/app/api/dashboard/marketing/route.ts` | Same |
| `src/app/api/dashboard/automation-roi/route.ts` | Same |
| `src/app/api/integrations/route.ts` | Same |
| `src/app/dashboard/settings/integrations/page.tsx` | Remove `<N8nConnectionSection />`. Replace "Connect in n8n →" buttons with read-only status badges. Drop "Manage credentials in n8n →" CTA. |
| `src/components/ui/site-header.tsx` | Add "Sign in" link to marketing nav |

(That's 10 files, but `database.types.ts` regeneration counts as automated.)

### Delete (1 file + 1 component)

| File | Why |
|---|---|
| `src/app/api/integrations/n8n-connection/route.ts` | Superseded by admin route — customers don't self-configure |
| `N8nConnectionSection` component (inline in `integrations/page.tsx`) | Same reason. The component code is removed when the page is modified. |

### Stays untouched (deliberately)

- `src/app/api/dashboard/backfill-complete/route.ts` — called by n8n with shared secret, not user-context. Keeps using service-role.
- `src/lib/supabase-server.ts` — service-role client for admin/system tasks.
- `src/lib/dashboard-fetch.ts` — pure cache + fetch helper, no auth context needed.
- `/admin/login` and `/api/admin-auth` — existing admin password gate, reused for the new admin route.

---

## Data flows

### Onboarding (admin invites a new customer)

1. You finish their call + deploy their n8n + build workflows.
2. Open `/admin/onboard-customer` (already authenticated by admin password cookie).
3. Fill the form: email, n8n_base_url, n8n_webhook_secret, n8n_api_key.
4. Submit → `POST /api/admin/onboard-customer`:
   - Verify admin password header (same pattern as `/api/admin-auth`).
   - `supabase.auth.admin.inviteUserByEmail(email)` → creates `auth.users` row with no password, sends magic-link invite email.
   - `INSERT INTO client_n8n_config (client_id = newUser.id, n8n_base_url, n8n_webhook_secret, n8n_api_key)`.
   - If either step fails, attempt rollback (`auth.admin.deleteUser` if invite succeeded but INSERT failed). Return `{ error }`.
   - On success, return `{ ok: true, userId, email }`.
5. Customer receives email, clicks magic link → `https://opsradar.app/auth/callback?code=…&type=invite`.
6. Callback route: `exchangeCodeForSession(code)` → cookies set → redirect to `/auth/set-password`.
7. Customer chooses a password → `updateUser({ password })` → redirect to `/dashboard`.

### Returning login (existing customer)

1. Customer goes to `/login`, enters email + password.
2. POST → `supabase.auth.signInWithPassword({ email, password })`.
3. On success, cookies set, redirect to `/dashboard` (or `redirectTo` query param if present).
4. On failure, show generic "Invalid email or password" — no enumeration.

### Forgot password

1. Customer goes to `/forgot-password`, enters email.
2. POST → `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${SITE_URL}/auth/callback?type=recovery })`.
3. **Always** show "If that email is registered, we sent a reset link" — regardless of whether the user exists. Anti-enumeration.
4. Customer clicks link → `/auth/callback?code=…&type=recovery` → `/auth/reset-password`.
5. Enters new password → `updateUser({ password })` → redirect to `/dashboard`.

### Protected route guard

1. Customer hits `/dashboard/anything`.
2. `src/middleware.ts` (matcher: `/dashboard/:path*`) reads cookies via `@supabase/ssr`.
3. `auth.getUser()` returns user or null.
4. No user → 302 to `/login?redirectTo=/dashboard/anything`.
5. User present → request continues.

### Sign out

1. Customer clicks sign-out button in sidebar.
2. POST `/api/auth/signout` → `supabase.auth.signOut()` → cookies cleared → 303 to `/`.

### Dashboard data fetch (after auth)

1. Browser → `GET /api/dashboard/metrics`.
2. Route handler uses `getSessionSupabaseClient()`.
3. `auth.getUser()` → real user from cookies (or `DEV_CLIENT_ID` synthetic in dev).
4. `clientId = user.id`.
5. `getClientN8nConfig(clientId)` → returns `{ n8nBaseUrl, n8nWebhookSecret, n8nApiKey, backfillCompletedAt }`.
6. `fetchDashboardWidget(...)` → Redis cache → POST `{n8nBaseUrl}/webhook/opsradar-dashboard-metrics` → JSON response.
7. Annotate `backfill_pending` from `backfillCompletedAt === null` → return.

---

## Security

- **Cookies**: `@supabase/ssr` sets HttpOnly + Secure + SameSite=Lax by default. No code change needed.
- **CSRF**: SameSite=Lax + POST-only state-changing routes is sufficient. No anti-CSRF tokens needed.
- **Email enumeration**:
  - `/login` (signInWithPassword) leaks "user exists with wrong password" vs "no user". Standard SaaS exposure — accepted.
  - `/forgot-password` MUST swallow the Supabase response and always return generic success. Critical.
- **Token lifetimes** (Supabase defaults — verify in dashboard):
  - Invite token: 1 hour
  - Recovery token: 1 hour
  - Session: configurable, recommend 30 days with auto-refresh
- **Password rules**: bump Supabase min password length to 8 (default 6). No complexity rules.
- **Admin route**: `/api/admin/onboard-customer` reuses the existing admin password header pattern from `/api/admin-auth`.
- **Known gaps** (deferred):
  - `n8n_webhook_secret` and `n8n_api_key` stored plaintext in Supabase. Encrypt with Supabase Vault or pgsodium in a later hardening pass.
  - No 2FA on admin or customer accounts.

---

## Error handling

| Failure | UX |
|---|---|
| Invite link expired | `/auth/callback` shows "Link expired" + "Contact support" message |
| Wrong password on `/login` | Generic "Invalid email or password" (no enumeration) |
| `/forgot-password` with non-existent email | Always shows "If that email is registered, we sent a reset link" |
| Network error during sign-in | Inline form error + retry |
| Middleware fails to parse cookies | Treat as no session → redirect to `/login` (fail closed) |
| Admin invite-email send fails | Admin form shows error with retry; user is rolled back if INSERT failed |
| Customer hits `/dashboard` with no `client_n8n_config` row | Should never happen (admin form inserts atomically). If it does, metrics route returns 503; dashboard shows error states cleanly. |

---

## Testing

No test runner is configured in the repo (Playwright is installed but no scripts). **Plan: manual smoke test after implementation.** Playwright tests are out of scope for this spec; revisit post-launch.

### Smoke test checklist

1. Onboard a real test customer via `/admin/onboard-customer` → verify Supabase has user + config row + invite email arrives in real inbox
2. Click invite link → lands on `/auth/set-password` → set password → redirected to `/dashboard`
3. Sign out → cookies gone → redirected to `/`
4. Sign back in via `/login` with email + password → `/dashboard` works
5. Visit `/dashboard/metrics` while signed out → redirect to `/login?redirectTo=/dashboard/metrics`; complete login → redirected back to `/dashboard/metrics`
6. Wrong password → generic error, no enumeration
7. Forgot password flow → email → set new password → signed in
8. Old `DEV_CLIENT_ID` fallback still works in `npm run dev` (no real session)
9. Pre-existing routes (`/api/dashboard/sales`, `/api/dashboard/marketing`, `/api/dashboard/automation-roi`, `/api/integrations`) still respond correctly with the new SSR helper
10. Direct access to `/admin/onboard-customer` without admin password cookie → redirected to `/admin/login`

---

## Supabase configuration changes (manual, in dashboard)

These are NOT code changes but must be done in the Supabase dashboard before deploying:

1. **Auth → URL Configuration**:
   - Site URL: `https://opsradar.app` (production), `http://localhost:3000` (dev)
   - Redirect URLs: add `https://opsradar.app/auth/callback` and `http://localhost:3000/auth/callback`

2. **Auth → Email Templates**:
   - Verify "Invite user" template link points to `{{ .SiteURL }}/auth/callback?type=invite&code={{ .TokenHash }}` (or PKCE equivalent)
   - Verify "Reset password" template uses `type=recovery`
   - Default templates usually work; just verify

3. **Auth → Password Policy**:
   - Bump minimum password length to 8

4. **Auth → Session Settings**:
   - Set session timeout to 30 days (or your preferred number)

---

## Open questions / deferred items

- **Workflow auto-deploy from chat service**: when customer is onboarded, the chat service should programmatically deploy `opsradar-dashboard-metrics` and `opsradar-backfill` to their n8n via the n8n REST API using the new `n8n_api_key`. Not in scope for this spec — handled in the chat repo.
- **Trigger backfill button**: a future admin tool to kick off the backfill workflow on a customer's n8n. Not in scope.
- **Custom email branding**: Supabase default email templates are functional but unbranded. Custom Resend-based emails can come later.
- **Encryption at rest**: webhook secret + API key encryption via Supabase Vault. Future hardening pass.
