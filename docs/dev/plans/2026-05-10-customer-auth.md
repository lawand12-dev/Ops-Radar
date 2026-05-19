# OpsRadar Customer Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship customer email+password auth (with magic-link invite + password reset) plus a single admin onboarding form, so OpsRadar staff can invite a real customer in 30 seconds and the customer can sign in with familiar email/password UX.

**Architecture:** Path Z from the spec. `@supabase/ssr` cookie-aware sessions. Two server clients (service-role for system tasks, session-aware for user routes). Next.js middleware guards `/dashboard/*`. One admin form at `/admin/onboard-customer` does invite + n8n config insert in one shot. Customer never touches n8n; OpsRadar manages everything.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (`@supabase/supabase-js` + new `@supabase/ssr`), Supabase Auth (email + password + invites), Tailwind v4. No test runner — verification is `npm run lint`, `npx tsc --noEmit`, and manual smoke tests.

**Spec:** [docs/superpowers/specs/2026-05-10-customer-auth-design.md](../specs/2026-05-10-customer-auth-design.md)

**Supersedes:** [docs/superpowers/plans/2026-05-09-customer-signin-flow.md](2026-05-09-customer-signin-flow.md) — that plan used magic-link-only and predates the admin onboarding decision. Don't execute it; execute this one instead.

---

## Project conventions (read first)

| Convention | Detail |
|---|---|
| Working dir | `/home/lawand/Desktop/my-startup/opsradar` (run all commands from here) |
| Path alias | `<npm>/*` → `./src/*`. Use `<npm>/lib/...` in imports, NOT `@/`. |
| Test runner | None. Verify via `npm run lint`, `npx tsc --noEmit`, and manual smoke. |
| Supabase project | `nbdcrmepvwbfbcjqfubr`. Apply migrations via Supabase MCP `apply_migration`. Regenerate types via `generate_typescript_types`. |
| Service-role key | The legacy JWT is disabled. The publishable `sb_publishable_…` key is in `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Existing `getServerSupabaseClient()` uses whichever is available. |
| Branch | Work on `main` (matches recent commit pattern). Frequent commits, one per task. |
| Commit style | `feat(auth): …`, `chore(auth): …`, `refactor(auth): …`. |
| Dev server | `npm run dev` on `localhost:3000`. Hot-reloads. Don't restart unless required. |
| `.env.local` | Gitignored. Don't `git add` it. Add `DEV_CLIENT_ID=<some-uuid>` if not already present. |

---

## File Structure

### Create (13 files)

| Path | Purpose |
|---|---|
| `supabase/migrations/20260511_client_n8n_config_api_key.sql` | Adds `n8n_api_key text` column |
| `src/lib/supabase-ssr.ts` | SSR helpers — `getSessionSupabaseClient()` and `getCurrentUserId()` |
| `src/middleware.ts` | Next.js middleware guarding `/dashboard/*` |
| `src/app/login/page.tsx` | Email + password login form |
| `src/app/login/check-email/page.tsx` | "We sent you a reset link" confirmation page |
| `src/app/forgot-password/page.tsx` | Request password reset form |
| `src/app/auth/callback/route.ts` | Code → session exchange, branch on `?type` |
| `src/app/auth/set-password/page.tsx` | First-time password setup after invite |
| `src/app/auth/reset-password/page.tsx` | Set new password after reset link |
| `src/app/api/auth/signout/route.ts` | POST → sign out + redirect |
| `src/components/dashboard/sign-out-button.tsx` | Sidebar button |
| `src/app/admin/onboard-customer/page.tsx` | Admin onboarding form (gated by existing admin password) |
| `src/app/api/admin/onboard-customer/route.ts` | Atomic invite + insert endpoint |

### Modify (10 files)

| Path | Change |
|---|---|
| `package.json` | Add `@supabase/ssr` dependency |
| `src/lib/database.types.ts` | Regenerate after migration |
| `src/lib/client-n8n.ts` | Return `n8nApiKey` field |
| `src/app/api/dashboard/metrics/route.ts` | Switch to session helper |
| `src/app/api/dashboard/sales/route.ts` | Switch to session helper |
| `src/app/api/dashboard/marketing/route.ts` | Switch to session helper |
| `src/app/api/dashboard/automation-roi/route.ts` | Switch to session helper |
| `src/app/api/integrations/route.ts` | Switch to session helper |
| `src/app/dashboard/settings/integrations/page.tsx` | Remove `<N8nConnectionSection />` and the inline component code; replace "Connect in n8n →" buttons with read-only badges; drop "Manage credentials in n8n →" button |
| `src/components/ui/site-header.tsx` | Add "Sign in" link before the CTA button |
| `src/app/dashboard/_components/sidebar.tsx` | Add `<SignOutButton />` at bottom |

(11 entries; database.types.ts is automated, file count is effectively 10.)

### Delete (1 file)

| Path | Why |
|---|---|
| `src/app/api/integrations/n8n-connection/route.ts` | Superseded by admin route |

---

## Task 0: Supabase configuration (manual, USER does this)

**This is a user task — Codex/agent skips this and just verifies.**

- [ ] **Step 1: Open Supabase dashboard for project `nbdcrmepvwbfbcjqfubr`**

URL: <https://supabase.com/dashboard/project/nbdcrmepvwbfbcjqfubr>

- [ ] **Step 2: Auth → URL Configuration**

Set:
- Site URL: `http://localhost:3000` (dev) — switch to production URL when deploying
- Redirect URLs: add both:
  - `http://localhost:3000/auth/callback`
  - `https://opsradar.app/auth/callback` (or your production URL)

- [ ] **Step 3: Auth → Providers → Email**

Confirm:
- Enable Email provider: ON
- Confirm email: OFF (we manage invitations directly; we don't want auto-confirmation emails on signup)
- Secure email change: ON
- Min password length: **8** (default 6)

- [ ] **Step 4: Auth → Email Templates**

Verify these templates exist (defaults are usually fine — just inspect):
- "Invite user" — link should resolve to `{{ .SiteURL }}/auth/callback?code={{ .TokenHash }}&type=invite` (or similar PKCE form). If the default doesn't include `type=invite`, edit the template to append it.
- "Reset Password" — link should resolve with `type=recovery`.

If templates lack the `type=` query param, the callback route will fall back to `/dashboard`, which is wrong. Fix the templates.

- [ ] **Step 5: Auth → Sessions**

Set session timeout to 30 days (or your preferred value).

- [ ] **Step 6: Confirm `.env.local` has these values**

```
NEXT_PUBLIC_SUPABASE_URL=https://nbdcrmepvwbfbcjqfubr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_…
SUPABASE_SERVICE_ROLE_KEY=<service role key — required for auth.admin.inviteUserByEmail>
DEV_CLIENT_ID=<some uuid for dev fallback>
```

If `SUPABASE_SERVICE_ROLE_KEY` is missing, the admin onboard route will fail. Get it from the Supabase dashboard → Project Settings → API.

---

## Task 1: Install @supabase/ssr

**Files:**
- Modify: `package.json` (auto by npm)

- [ ] **Step 1: Install the package**

```bash
npm install @supabase/ssr
```

- [ ] **Step 2: Verify install**

```bash
grep '"@supabase/ssr"' package.json
```

Expected: line showing `"@supabase/ssr": "^0.x.x"` in dependencies.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(auth): add @supabase/ssr dependency"
```

---

## Task 2: Add `n8n_api_key` column to `client_n8n_config`

**Files:**
- Create: `supabase/migrations/20260511_client_n8n_config_api_key.sql`
- Modify: `src/lib/database.types.ts` (regenerate via Supabase MCP after applying)

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260511_client_n8n_config_api_key.sql`:

```sql
-- Add n8n REST API key column for workflow CRUD + monitoring.
-- Distinct from n8n_webhook_secret (used by dashboard widget reads).
alter table public.client_n8n_config
  add column if not exists n8n_api_key text;

comment on column public.client_n8n_config.n8n_api_key is
  'n8n REST API key for the customer''s instance. Used by chat service to deploy/edit workflows and by admin tools.';
```

- [ ] **Step 2: Apply via Supabase MCP**

Use the `apply_migration` MCP tool with `name = 20260511_client_n8n_config_api_key` and `query` set to the SQL above.

Expected: `success: true`.

- [ ] **Step 3: Regenerate database types via MCP**

Use the `generate_typescript_types` MCP tool. It returns a TypeScript module — write the entire output to `src/lib/database.types.ts` (full file replacement).

- [ ] **Step 4: Verify the new column appears in types**

```bash
grep -A2 "client_n8n_config" src/lib/database.types.ts | grep n8n_api_key
```

Expected: lines showing `n8n_api_key: string | null` in Row, Insert, and Update types.

- [ ] **Step 5: Verify lint and typecheck**

```bash
npx tsc --noEmit
npm run lint -- src/lib/database.types.ts
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260511_client_n8n_config_api_key.sql src/lib/database.types.ts
git commit -m "feat(db): add n8n_api_key column to client_n8n_config"
```

---

## Task 3: Update `client-n8n.ts` to return `n8nApiKey`

**Files:**
- Modify: `src/lib/client-n8n.ts`

- [ ] **Step 1: Replace the file contents**

Open `src/lib/client-n8n.ts` and replace the whole file with:

```typescript
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export type ClientN8nConfig = {
  n8nBaseUrl: string;
  n8nWebhookSecret: string;
  n8nApiKey: string | null;
  backfillCompletedAt: string | null;
};

export async function getClientN8nConfig(
  clientId: string
): Promise<ClientN8nConfig | null> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('client_n8n_config')
    .select('n8n_base_url, n8n_webhook_secret, n8n_api_key, backfill_completed_at')
    .eq('client_id', clientId)
    .maybeSingle();

  if (error) {
    console.error('[getClientN8nConfig] Supabase error:', error.message);
  }

  if (data) {
    return {
      n8nBaseUrl: data.n8n_base_url,
      n8nWebhookSecret: data.n8n_webhook_secret,
      n8nApiKey: data.n8n_api_key,
      backfillCompletedAt: data.backfill_completed_at,
    };
  }

  // Fallback to env vars (dev environment / OpsRadar's own shared n8n)
  const envBaseUrl = process.env.N8N_BASE_URL;
  const envSecret = process.env.N8N_WEBHOOK_SECRET;
  if (envBaseUrl && envSecret && envBaseUrl !== '__SET_BEFORE_USE__') {
    return {
      n8nBaseUrl: envBaseUrl,
      n8nWebhookSecret: envSecret,
      n8nApiKey: process.env.N8N_API_KEY ?? null,
      backfillCompletedAt: null,
    };
  }

  return null;
}
```

- [ ] **Step 2: Verify lint + typecheck**

```bash
npm run lint -- src/lib/client-n8n.ts
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/client-n8n.ts
git commit -m "feat(auth): include n8n_api_key in ClientN8nConfig"
```

---

## Task 4: Create the SSR session helper

**Files:**
- Create: `src/lib/supabase-ssr.ts`

This helper does two things:
1. `getSessionSupabaseClient()` — returns a cookie-aware Supabase client (reads/writes auth cookies via `next/headers`)
2. `getCurrentUserId()` — wraps `auth.getUser()` and falls back to `process.env.DEV_CLIENT_ID` if no real session, so `npm run dev` keeps working without logging in

- [ ] **Step 1: Write the helper**

Create `src/lib/supabase-ssr.ts`:

```typescript
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Cookie-aware Supabase server client. Uses Next.js cookies() for auth
 * session storage. Subject to RLS — auth.getUser() returns the logged-in
 * customer (or null if no session).
 */
export async function getSessionSupabaseClient(): Promise<SupabaseClient<Database>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error('missing NEXT_PUBLIC_SUPABASE_URL');
  if (!key) throw new Error('missing NEXT_PUBLIC_SUPABASE_ANON_KEY');

  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll called from a Server Component — ignore. Middleware/route
          // handlers handle cookie writes via the response.
        }
      },
    },
  });
}

/**
 * Returns the current user's id from the session cookie, or
 * `process.env.DEV_CLIENT_ID` as a dev fallback.
 *
 * Returns null if neither is available — the caller should treat that as
 * unauthorized (return 401).
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await getSessionSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) return data.user.id;
  } catch (err) {
    console.warn('[getCurrentUserId] session read failed:', err);
  }
  return process.env.DEV_CLIENT_ID ?? null;
}
```

- [ ] **Step 2: Verify lint + typecheck**

```bash
npm run lint -- src/lib/supabase-ssr.ts
npx tsc --noEmit
```

Expected: no errors. If `@supabase/ssr` types complain, check that Task 1 succeeded.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase-ssr.ts
git commit -m "feat(auth): add SSR session helper with DEV_CLIENT_ID fallback"
```

---

## Task 5: Migrate auth-context API routes to the SSR helper

Five routes currently call `getServerSupabaseClient()` then `auth.getUser()` (which always returns null because that client doesn't read cookies). Switch them to `getCurrentUserId()`.

**Files:**
- Modify: `src/app/api/dashboard/metrics/route.ts`
- Modify: `src/app/api/dashboard/sales/route.ts`
- Modify: `src/app/api/dashboard/marketing/route.ts`
- Modify: `src/app/api/dashboard/automation-roi/route.ts`
- Modify: `src/app/api/integrations/route.ts`

- [ ] **Step 1: Update `src/app/api/dashboard/metrics/route.ts`**

Replace the top of the file (imports + auth block) with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { fetchDashboardWidget } from '<npm>/lib/dashboard-fetch';
import { getClientN8nConfig } from '<npm>/lib/client-n8n';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export type MetricsData = {
  revenue: { total: number; weekly: number[] };
  invoiced: { total: number; paid: number; overdue: number };
  hours_tracked: { total: number; weekly: number[] };
  active_projects: { count: number };
  tasks: { completed: number; in_progress: number; todo: number };
  profit_margin_pct: number | null;
  period_label: string;
  sources_connected: string[];
  backfill_pending: boolean;
};

const ALLOWED_PERIODS = [7, 14, 30, 90];

export async function GET(req: NextRequest) {
  const clientId = await getCurrentUserId();
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const n8nConfig = await getClientN8nConfig(clientId);
  if (!n8nConfig) {
    return NextResponse.json(
      { status: 'error', message: 'n8n not configured for this client' },
      { status: 503 }
    );
  }

  const fresh = req.nextUrl.searchParams.get('fresh') === '1';
  const rawPeriod = Number(req.nextUrl.searchParams.get('period_days') ?? '30');
  const periodDays = ALLOWED_PERIODS.includes(rawPeriod) ? rawPeriod : 30;

  const result = await fetchDashboardWidget<MetricsData>({
    widget: 'metrics',
    clientId,
    n8nWorkflow: 'opsradar-dashboard-metrics',
    payload: { client_id: clientId, period_days: periodDays },
    fresh,
    n8nBaseUrl: n8nConfig.n8nBaseUrl,
    n8nWebhookSecret: n8nConfig.n8nWebhookSecret,
  });

  if (result.status === 'ok') {
    result.data.backfill_pending = n8nConfig.backfillCompletedAt === null;
  }

  return NextResponse.json(result);
}
```

- [ ] **Step 2: Apply the same auth-block swap to the other 4 routes**

For each of:
- `src/app/api/dashboard/sales/route.ts`
- `src/app/api/dashboard/marketing/route.ts`
- `src/app/api/dashboard/automation-roi/route.ts`
- `src/app/api/integrations/route.ts`

Find the lines:

```typescript
const supabase = getServerSupabaseClient();
const { data: userData } = await supabase.auth.getUser();
const clientId = userData.user?.id ?? process.env.DEV_CLIENT_ID;
if (!clientId) {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}
```

Replace with:

```typescript
const clientId = await getCurrentUserId();
if (!clientId) {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}
```

Update imports: remove `getServerSupabaseClient` if it's no longer used, add `getCurrentUserId` from `<npm>/lib/supabase-ssr`.

For `src/app/api/integrations/route.ts`, the `getReadClient()` function and downstream `read.from('integrations')` call still uses the publishable key — leave that as-is, only swap the auth block.

- [ ] **Step 3: Verify dev server still serves these routes**

```bash
npm run dev &
sleep 5
curl -s "http://localhost:3000/api/dashboard/metrics" | head -c 200
curl -s "http://localhost:3000/api/dashboard/sales" | head -c 200
```

Expected: JSON response (either `status: ok` data or a graceful `error` — NOT a 500). If `DEV_CLIENT_ID` is set in `.env.local`, you'll get the dev tenant's data.

- [ ] **Step 4: Verify lint + typecheck**

```bash
npm run lint -- src/app/api/dashboard/ src/app/api/integrations/
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/dashboard/metrics/route.ts src/app/api/dashboard/sales/route.ts src/app/api/dashboard/marketing/route.ts src/app/api/dashboard/automation-roi/route.ts src/app/api/integrations/route.ts
git commit -m "refactor(auth): switch user-context API routes to SSR session helper"
```

---

## Task 6: Remove customer-facing N8nConnectionSection

Customers don't self-configure n8n. The section we shipped recently is wrong — move the form work to admin, replace customer "Connect in n8n →" buttons with read-only badges.

**Files:**
- Modify: `src/app/dashboard/settings/integrations/page.tsx`
- Delete: `src/app/api/integrations/n8n-connection/route.ts`

- [ ] **Step 1: Replace the integrations page contents**

Open `src/app/dashboard/settings/integrations/page.tsx` and replace the **whole file** with:

```typescript
'use client';

import { useEffect, useState } from 'react';

type ConnectedTool = { tool: string; connected_at: string };

type ToolDef = {
  key: string;
  label: string;
  blurb: string;
  cardKey: string;
  status: 'available' | 'coming_soon';
};

const TOOL_CATALOG: ToolDef[] = [
  { key: 'hubspot',  label: 'HubSpot',  blurb: 'CRM — pipeline value, leads, auto-created deals', cardKey: 'Sales',     status: 'available' },
  { key: 'apollo',   label: 'Apollo',   blurb: 'Cold outreach — emails sent, opens, replies',     cardKey: 'Marketing', status: 'available' },
  { key: 'calendly', label: 'Calendly', blurb: 'Meetings booked from outreach',                   cardKey: 'Marketing', status: 'available' },
  { key: 'clickup',  label: 'ClickUp',  blurb: 'Projects, tasks, deadlines',                      cardKey: 'Delivery',  status: 'coming_soon' },
  { key: 'asana',    label: 'Asana',    blurb: 'Projects, tasks, deadlines',                      cardKey: 'Delivery',  status: 'coming_soon' },
  { key: 'toggl',    label: 'Toggl',    blurb: 'Hours tracked, utilization',                      cardKey: 'Delivery',  status: 'coming_soon' },
  { key: 'stripe',   label: 'Stripe',   blurb: 'Invoiced, paid, overdue',                         cardKey: 'Finance',   status: 'coming_soon' },
];

const C = {
  bg: '#080C14',
  card: '#0F1923',
  border: 'rgba(0,194,255,0.1)',
  accent: '#00C2FF',
  text: '#E0F0FF',
  muted: '#4A6280',
  green: '#22C55E',
  red: '#FF4D4D',
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function IntegrationsSettingsPage() {
  const [connected, setConnected] = useState<ConnectedTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/integrations', { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? 'Failed to load');
          setConnected([]);
          return;
        }
        setConnected(data.connected ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Network error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function isConnected(tool: string): ConnectedTool | undefined {
    return connected.find((c) => c.tool === tool);
  }

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6 }}>Connected systems</h1>
        <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.5 }}>
          These are the tools your dashboard reads from. Your OpsRadar account team manages
          credentials and connections — reach out if you want to add or change anything.
        </p>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(255,77,77,0.08)',
            border: `1px solid rgba(255,77,77,0.3)`,
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 12.5,
            color: C.red,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {TOOL_CATALOG.map((t) => {
          const conn = isConnected(t.key);
          const isAvailable = t.status === 'available';

          return (
            <div
              key={t.key}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                opacity: isAvailable ? 1 : 0.55,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{t.label}</span>
                  <span
                    style={{
                      fontSize: 10.5,
                      color: C.muted,
                      background: 'rgba(74,98,128,0.15)',
                      borderRadius: 4,
                      padding: '2px 6px',
                      letterSpacing: '0.3px',
                    }}
                  >
                    {t.cardKey} card
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.4 }}>{t.blurb}</div>
                {conn && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                    Tracking since {fmtDate(conn.connected_at)}
                  </div>
                )}
              </div>

              <div style={{ flexShrink: 0 }}>
                {!isAvailable && (
                  <span style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>Coming soon</span>
                )}
                {isAvailable && !loading && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: conn ? C.green : C.muted,
                      background: conn ? 'rgba(34,197,94,0.12)' : 'rgba(74,98,128,0.15)',
                      borderRadius: 4,
                      padding: '4px 10px',
                    }}
                  >
                    {conn ? 'Tracking' : 'Not yet tracking'}
                  </span>
                )}
                {loading && <span style={{ fontSize: 12, color: C.muted }}>Loading…</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
```

This drops:
- `<N8nConnectionSection />` and the inline component code (entire body, ~220 lines)
- The "Manage credentials in n8n →" call-to-action
- The `N8N_MANAGE_URL` constant
- All "Connect in n8n →" buttons (replaced by status badges)

- [ ] **Step 2: Delete the obsolete API route**

```bash
rm src/app/api/integrations/n8n-connection/route.ts
rmdir src/app/api/integrations/n8n-connection 2>/dev/null || true
```

- [ ] **Step 3: Verify lint + typecheck**

```bash
npm run lint -- src/app/dashboard/settings/integrations/
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Smoke test in browser**

```bash
npm run dev
```

Visit `http://localhost:3000/dashboard/settings/integrations`. Expected:
- Page title says "Connected systems"
- Each tool shows "Tracking" or "Not yet tracking" badge — no buttons
- No form, no "Manage credentials in n8n →" CTA

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/settings/integrations/page.tsx src/app/api/integrations/n8n-connection
git commit -m "refactor(integrations): remove customer-facing n8n connection form (moves to admin)"
```

---

## Task 7: Create the auth callback route

This route handles three scenarios via the `?type` query param:
- `invite` → exchange code for session, redirect to `/auth/set-password`
- `recovery` → exchange code for session, redirect to `/auth/reset-password`
- (default, e.g. magic-link sign-in) → redirect to `/dashboard` or `?redirectTo=…`

**Files:**
- Create: `src/app/auth/callback/route.ts`

- [ ] **Step 1: Write the route handler**

Create `src/app/auth/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const type = url.searchParams.get('type'); // 'invite' | 'recovery' | null
  const redirectTo = url.searchParams.get('redirectTo');

  if (!code) {
    const target = new URL('/login', url.origin);
    target.searchParams.set('error', 'missing_code');
    return NextResponse.redirect(target);
  }

  const supabase = await getSessionSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const target = new URL('/login', url.origin);
    target.searchParams.set('error', 'invalid_or_expired_link');
    return NextResponse.redirect(target);
  }

  if (type === 'invite') {
    return NextResponse.redirect(new URL('/auth/set-password', url.origin));
  }

  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/auth/reset-password', url.origin));
  }

  const dest = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard';
  return NextResponse.redirect(new URL(dest, url.origin));
}
```

- [ ] **Step 2: Verify lint + typecheck**

```bash
npm run lint -- src/app/auth/callback/
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "feat(auth): add /auth/callback route with type-based redirect"
```

---

## Task 8: Create the /login page

Email + password form. Includes "Forgot password?" link.

**Files:**
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: Write the login page**

Create `src/app/login/page.tsx`:

```typescript
'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '<npm>/lib/database.types';

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#E0F0FF' }}>Loading…</div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialError = searchParams.get('error');
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError === 'invalid_or_expired_link'
      ? 'That link expired or is invalid. Sign in below.'
      : initialError === 'missing_code'
      ? 'Sign-in link was malformed. Try again.'
      : null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    router.replace(redirectTo);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#0F1923', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 16, padding: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E0F0FF', marginBottom: 6 }}>Sign in to OpsRadar</h1>
        <p style={{ fontSize: 13.5, color: '#4A6280', marginBottom: 22 }}>Welcome back.</p>

        {error && (
          <div style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: '#FF4D4D', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11.5, color: '#4A6280', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ background: '#080C14', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#E0F0FF', outline: 'none' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11.5, color: '#4A6280', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ background: '#080C14', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#E0F0FF', outline: 'none' }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#00C2FF',
              color: '#0D1117',
              border: 'none',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: 4,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <Link href="/forgot-password" style={{ fontSize: 12.5, color: '#00C2FF', textDecoration: 'none' }}>
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint + typecheck**

```bash
npm run lint -- src/app/login/
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Smoke test**

Open `http://localhost:3000/login`. Expected: dark form with email + password fields and "Forgot password?" link below. Submitting with bogus creds shows "Invalid email or password."

- [ ] **Step 4: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat(auth): add /login page with email + password"
```

---

## Task 9: Sign-out flow (route + button + sidebar wiring)

**Files:**
- Create: `src/app/api/auth/signout/route.ts`
- Create: `src/components/dashboard/sign-out-button.tsx`
- Modify: `src/app/dashboard/_components/sidebar.tsx`

- [ ] **Step 1: Write the signout route**

Create `src/app/api/auth/signout/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = await getSessionSupabaseClient();
  await supabase.auth.signOut();

  // 303 forces GET on the redirect target
  return NextResponse.redirect(new URL('/', req.nextUrl.origin), { status: 303 });
}
```

- [ ] **Step 2: Write the SignOutButton component**

Create `src/components/dashboard/sign-out-button.tsx`:

```typescript
'use client';

import { LogOut } from 'lucide-react';

const C = {
  border: 'rgba(0,194,255,0.1)',
  text: '#E0F0FF',
  muted: '#4A6280',
};

export function SignOutButton() {
  return (
    <form action="/api/auth/signout" method="post" style={{ width: '100%' }}>
      <button
        type="submit"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          background: 'transparent',
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          color: C.text,
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <LogOut size={14} color={C.muted} />
        <span>Sign out</span>
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Wire SignOutButton into the dashboard sidebar**

Open `src/app/dashboard/_components/sidebar.tsx`. The sidebar already has a "User" section at the bottom (lines 98-137). Add the import and append the button inside that section.

Add the import (after line 18, the existing `EcgIcon` import):

```typescript
import { SignOutButton } from '<npm>/components/dashboard/sign-out-button';
```

Find this block (around line 99-137):

```tsx
{/* User */}
<div style={{ padding: '12px 14px', borderTop: `1px solid ${C.border}` }}>
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 10px',
      borderRadius: 10,
      background: 'rgba(255,255,255,0.03)',
      cursor: 'pointer',
    }}
  >
    {/* avatar + name + chevron */}
    ...
  </div>
</div>
```

Replace the wrapper `<div style={{ padding: '12px 14px', borderTop: `1px solid ${C.border}` }}>` with one that contains BOTH the existing user card AND the sign-out button. The result:

```tsx
{/* User */}
<div style={{ padding: '12px 14px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 10px',
      borderRadius: 10,
      background: 'rgba(255,255,255,0.03)',
      cursor: 'pointer',
    }}
  >
    {/* keep the existing avatar + name + chevron contents unchanged */}
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
        letterSpacing: '0.5px',
      }}
    >
      AK
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        Alex Kim
      </div>
      <div style={{ fontSize: 11, color: C.muted }}>Agency Owner</div>
    </div>
    <ChevronDown size={13} color={C.muted} />
  </div>

  <SignOutButton />
</div>
```

The only meaningful changes to the existing JSX are:
1. The wrapper `<div>` now has `display: 'flex', flexDirection: 'column', gap: 8` added
2. `<SignOutButton />` is appended after the user card

- [ ] **Step 4: Verify lint + typecheck**

```bash
npm run lint -- src/app/api/auth/ src/components/dashboard/sign-out-button.tsx src/app/dashboard/_components/sidebar.tsx
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Smoke test**

`npm run dev`. Visit `/dashboard`. Expected: "Sign out" button visible at bottom of sidebar. Clicking submits a POST to `/api/auth/signout`, then redirects to `/`.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/auth/signout/route.ts src/components/dashboard/sign-out-button.tsx src/app/dashboard/_components/sidebar.tsx
git commit -m "feat(auth): add sign-out route + sidebar button"
```

---

## Task 10: Create /auth/set-password page

After clicking the invite link, the customer lands here. They have a session (set by the callback) but no password yet — this page lets them set one.

**Files:**
- Create: `src/app/auth/set-password/page.tsx`

- [ ] **Step 1: Write the page**

Create `src/app/auth/set-password/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '<npm>/lib/database.types';

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords don\'t match.');
      return;
    }

    setLoading(true);

    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message ?? 'Failed to set password.');
      setLoading(false);
      return;
    }

    router.replace('/dashboard');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#0F1923', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 16, padding: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E0F0FF', marginBottom: 6 }}>Set your password</h1>
        <p style={{ fontSize: 13.5, color: '#4A6280', marginBottom: 22 }}>Welcome to OpsRadar. Choose a password (at least 8 characters).</p>

        {error && (
          <div style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: '#FF4D4D', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11.5, color: '#4A6280', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ background: '#080C14', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#E0F0FF', outline: 'none' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11.5, color: '#4A6280', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Confirm password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={{ background: '#080C14', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#E0F0FF', outline: 'none' }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#00C2FF',
              color: '#0D1117',
              border: 'none',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: 4,
            }}
          >
            {loading ? 'Saving…' : 'Save and continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint + typecheck**

```bash
npm run lint -- src/app/auth/set-password/
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/set-password/page.tsx
git commit -m "feat(auth): add /auth/set-password page for invite flow"
```

---

## Task 11: Forgot password + check-email pages

Two pages: form to request reset, and confirmation screen.

**Files:**
- Create: `src/app/forgot-password/page.tsx`
- Create: `src/app/login/check-email/page.tsx`

- [ ] **Step 1: Write the forgot-password page**

Create `src/app/forgot-password/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '<npm>/lib/database.types';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Anti-enumeration: ignore the result. ALWAYS redirect to check-email,
    // regardless of whether the email exists.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    router.replace('/login/check-email');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#0F1923', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 16, padding: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E0F0FF', marginBottom: 6 }}>Reset password</h1>
        <p style={{ fontSize: 13.5, color: '#4A6280', marginBottom: 22 }}>Enter your email and we'll send you a reset link.</p>

        {error && (
          <div style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: '#FF4D4D', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11.5, color: '#4A6280', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ background: '#080C14', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#E0F0FF', outline: 'none' }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#00C2FF',
              color: '#0D1117',
              border: 'none',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: 4,
            }}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <Link href="/login" style={{ fontSize: 12.5, color: '#00C2FF', textDecoration: 'none' }}>
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the check-email page**

Create `src/app/login/check-email/page.tsx`:

```typescript
import Link from 'next/link';

export default function CheckEmailPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#0F1923', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E0F0FF', marginBottom: 12 }}>Check your inbox</h1>
        <p style={{ fontSize: 13.5, color: '#4A6280', marginBottom: 22, lineHeight: 1.5 }}>
          If that email is registered with OpsRadar, we sent you a link to reset your password.
        </p>
        <Link
          href="/login"
          style={{
            display: 'inline-block',
            background: '#00C2FF',
            color: '#0D1117',
            border: 'none',
            borderRadius: 8,
            padding: '10px 18px',
            fontSize: 13.5,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify lint + typecheck**

```bash
npm run lint -- src/app/forgot-password/ src/app/login/check-email/
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/forgot-password/page.tsx src/app/login/check-email/page.tsx
git commit -m "feat(auth): add forgot-password + check-email pages"
```

---

## Task 12: Reset-password page

After clicking the email link from forgot-password flow, customer is sent here (via callback's `type=recovery` branch).

**Files:**
- Create: `src/app/auth/reset-password/page.tsx`

- [ ] **Step 1: Write the page**

Create `src/app/auth/reset-password/page.tsx`. The contents are nearly identical to `set-password/page.tsx` from Task 10 — only the page heading and the success-redirect copy differ. Paste the following:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '<npm>/lib/database.types';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords don\'t match.');
      return;
    }

    setLoading(true);

    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message ?? 'Failed to reset password.');
      setLoading(false);
      return;
    }

    router.replace('/dashboard');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#0F1923', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 16, padding: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E0F0FF', marginBottom: 6 }}>New password</h1>
        <p style={{ fontSize: 13.5, color: '#4A6280', marginBottom: 22 }}>Choose a new password (at least 8 characters).</p>

        {error && (
          <div style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: '#FF4D4D', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11.5, color: '#4A6280', letterSpacing: '0.3px', textTransform: 'uppercase' }}>New password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ background: '#080C14', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#E0F0FF', outline: 'none' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11.5, color: '#4A6280', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Confirm new password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={{ background: '#080C14', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#E0F0FF', outline: 'none' }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#00C2FF',
              color: '#0D1117',
              border: 'none',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: 4,
            }}
          >
            {loading ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint + typecheck**

```bash
npm run lint -- src/app/auth/reset-password/
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/reset-password/page.tsx
git commit -m "feat(auth): add /auth/reset-password page"
```

---

## Task 13: /dashboard route guard middleware

Once this lands, hitting `/dashboard/*` without a session redirects to `/login?redirectTo=…`.

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Write the middleware**

Create `src/middleware.ts` (NOT `src/app/middleware.ts` — it's at the `src/` root):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars are missing in dev, skip the guard entirely (DEV_CLIENT_ID
  // fallback handles auth-context routes). Production must have these.
  if (!url || !key) return res;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // In dev: if no real session AND DEV_CLIENT_ID is set, allow through.
  // This preserves the "npm run dev without logging in" workflow.
  if (!user && process.env.DEV_CLIENT_ID) {
    return res;
  }

  if (!user) {
    const target = req.nextUrl.clone();
    target.pathname = '/login';
    target.searchParams.set('redirectTo', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(target);
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

- [ ] **Step 2: Verify lint + typecheck**

```bash
npm run lint -- src/middleware.ts
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Smoke test**

```bash
npm run dev
```

Test cases:
1. With `DEV_CLIENT_ID` set in `.env.local`: hit `http://localhost:3000/dashboard` — should load (dev fallback).
2. Temporarily comment out `DEV_CLIENT_ID` in `.env.local`, restart dev server, hit `/dashboard` — should redirect to `/login?redirectTo=/dashboard`. **Restore `DEV_CLIENT_ID` after the test.**

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(auth): add middleware to guard /dashboard/* routes"
```

---

## Task 14: Add "Sign in" link to marketing nav

**Files:**
- Modify: `src/components/ui/site-header.tsx`

- [ ] **Step 1: Add Sign in link to desktop right-side CTA group**

In `src/components/ui/site-header.tsx`, find this block (around line 116-132):

```tsx
{/* Right CTAs — right column (only desktop) */}
<div className="hidden lg:flex items-center justify-end gap-2">
  <Link
    href="/audit"
    className="inline-flex items-center rounded-md px-3 py-1.5 text-[13px] font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
  >
    Run Free Audit
  </Link>
  <Link
    href={ctaHref}
    target={ctaIsExternal ? "_blank" : undefined}
    rel={ctaIsExternal ? "noopener noreferrer" : undefined}
    className="inline-flex items-center rounded-md bg-[#0066FF] px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#0052CC]"
  >
    {ctaLabel}
  </Link>
</div>
```

Add a new `<Link href="/login">` BEFORE the "Run Free Audit" link, so the order is: Sign in → Run Free Audit → CTA. Final block:

```tsx
{/* Right CTAs — right column (only desktop) */}
<div className="hidden lg:flex items-center justify-end gap-2">
  <Link
    href="/login"
    className="inline-flex items-center rounded-md px-3 py-1.5 text-[13px] font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
  >
    Sign in
  </Link>
  <Link
    href="/audit"
    className="inline-flex items-center rounded-md px-3 py-1.5 text-[13px] font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
  >
    Run Free Audit
  </Link>
  <Link
    href={ctaHref}
    target={ctaIsExternal ? "_blank" : undefined}
    rel={ctaIsExternal ? "noopener noreferrer" : undefined}
    className="inline-flex items-center rounded-md bg-[#0066FF] px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#0052CC]"
  >
    {ctaLabel}
  </Link>
</div>
```

- [ ] **Step 2: Add Sign in link to mobile menu panel**

Find this block (around line 169-186):

```tsx
<div className="mt-2 flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
  <Link
    href="/audit"
    onClick={() => setMobileMenuOpen(false)}
    className="rounded-md px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/[0.04] hover:text-white transition-colors"
  >
    Run Free Audit
  </Link>
  <Link
    href={ctaHref}
    ...
  >
    {ctaLabel}
  </Link>
</div>
```

Add a Sign in link BEFORE the "Run Free Audit" link in the mobile panel:

```tsx
<Link
  href="/login"
  onClick={() => setMobileMenuOpen(false)}
  className="rounded-md px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/[0.04] hover:text-white transition-colors"
>
  Sign in
</Link>
```

- [ ] **Step 3: Verify lint + typecheck**

```bash
npm run lint -- src/components/ui/site-header.tsx
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Smoke test**

`npm run dev`. Visit `/`. Expected: marketing nav now shows "Sign in" link to the left of "Book a Call" button. Clicking goes to `/login`.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/site-header.tsx
git commit -m "feat(auth): add Sign in link to marketing nav"
```

---

## Task 15: Admin onboarding form + API route

Single form: email + n8n_base_url + n8n_webhook_secret + n8n_api_key. Submit → creates Supabase user (with invite email) + inserts `client_n8n_config` atomically.

**Files:**
- Create: `src/app/admin/onboard-customer/page.tsx`
- Create: `src/app/api/admin/onboard-customer/route.ts`

- [ ] **Step 1: Confirm how /admin auth currently works**

```bash
cat src/app/api/admin-auth/route.ts 2>/dev/null | head -40
ls src/app/api/admin-auth/ 2>/dev/null
```

Note the cookie name and auth pattern. The existing pattern uses an `x-admin-password` request header and sets some cookie (likely `admin_session` or similar). Mirror that for the new admin route.

- [ ] **Step 2: Write the API route**

Create `src/app/api/admin/onboard-customer/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function requireAdmin(req: NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  // Reuse the same admin password gate as /api/admin-auth.
  const headerPassword = req.headers.get('x-admin-password');
  const envPassword = process.env.ADMIN_PASSWORD;
  if (!envPassword) {
    return { ok: false, status: 500, error: 'admin password not configured' };
  }
  if (headerPassword !== envPassword) {
    return { ok: false, status: 401, error: 'unauthorized' };
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    email?: string;
    n8nBaseUrl?: string;
    n8nWebhookSecret?: string;
    n8nApiKey?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const n8nBaseUrl = body.n8nBaseUrl?.trim();
  const n8nWebhookSecret = body.n8nWebhookSecret?.trim();
  const n8nApiKey = body.n8nApiKey?.trim();

  if (!email || !n8nBaseUrl || !n8nWebhookSecret || !n8nApiKey) {
    return NextResponse.json(
      { error: 'email, n8nBaseUrl, n8nWebhookSecret, and n8nApiKey are required' },
      { status: 400 }
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(n8nBaseUrl);
  } catch {
    return NextResponse.json({ error: 'n8nBaseUrl must be a valid URL' }, { status: 400 });
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') {
    return NextResponse.json({ error: 'n8nBaseUrl must use https' }, { status: 400 });
  }
  const normalizedUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname.replace(/\/+$/, '')}`;

  const supabase = getServerSupabaseClient();

  // Step 1: invite the user (creates auth.users row + sends magic-link email)
  const inviteRes = await supabase.auth.admin.inviteUserByEmail(email);
  if (inviteRes.error || !inviteRes.data.user) {
    console.error('[onboard-customer] invite failed:', inviteRes.error?.message);
    return NextResponse.json(
      { error: `invite failed: ${inviteRes.error?.message ?? 'no user returned'}` },
      { status: 500 }
    );
  }
  const userId = inviteRes.data.user.id;

  // Step 2: insert the n8n config row. If this fails, roll back the user.
  const { error: insertError } = await supabase.from('client_n8n_config').insert({
    client_id: userId,
    n8n_base_url: normalizedUrl,
    n8n_webhook_secret: n8nWebhookSecret,
    n8n_api_key: n8nApiKey,
  });

  if (insertError) {
    console.error('[onboard-customer] insert failed, rolling back user:', insertError.message);
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: `insert failed: ${insertError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, userId, email });
}
```

- [ ] **Step 3: Write the admin form page**

Create `src/app/admin/onboard-customer/page.tsx`:

```typescript
'use client';

import { useState } from 'react';

export default function OnboardCustomerPage() {
  const [adminPassword, setAdminPassword] = useState('');
  const [email, setEmail] = useState('');
  const [n8nBaseUrl, setN8nBaseUrl] = useState('');
  const [n8nWebhookSecret, setN8nWebhookSecret] = useState('');
  const [n8nApiKey, setN8nApiKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    | { kind: 'success'; userId: string; email: string }
    | { kind: 'error'; message: string }
    | null
  >(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/onboard-customer', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ email, n8nBaseUrl, n8nWebhookSecret, n8nApiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ kind: 'error', message: data.error ?? 'Failed' });
        return;
      }
      setResult({ kind: 'success', userId: data.userId, email: data.email });
      // Clear sensitive fields, keep email visible
      setN8nWebhookSecret('');
      setN8nApiKey('');
    } catch (err) {
      setResult({ kind: 'error', message: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', padding: 32, color: '#E0F0FF' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', background: '#0F1923', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 16, padding: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Onboard customer</h1>
        <p style={{ fontSize: 13.5, color: '#4A6280', marginBottom: 22, lineHeight: 1.5 }}>
          Creates a Supabase user, inserts their <code>client_n8n_config</code> row,
          and sends them a magic-link invite. Atomic — if either step fails, the user is rolled back.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Admin password" type="password" value={adminPassword} onChange={setAdminPassword} required />
          <Field label="Customer email" type="email" value={email} onChange={setEmail} required />
          <Field label="n8n base URL" type="url" placeholder="https://customer.n8n.cloud" value={n8nBaseUrl} onChange={setN8nBaseUrl} required />
          <Field label="n8n webhook secret" type="password" value={n8nWebhookSecret} onChange={setN8nWebhookSecret} required />
          <Field label="n8n API key" type="password" value={n8nApiKey} onChange={setN8nApiKey} required />

          <button
            type="submit"
            disabled={submitting}
            style={{
              background: '#00C2FF',
              color: '#0D1117',
              border: 'none',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              marginTop: 4,
            }}
          >
            {submitting ? 'Onboarding…' : 'Onboard + send invite'}
          </button>
        </form>

        {result?.kind === 'success' && (
          <div style={{ marginTop: 16, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '10px 12px', fontSize: 12.5, color: '#4ADE80' }}>
            Onboarded {result.email} (user id: <code>{result.userId}</code>). Invite email sent.
          </div>
        )}

        {result?.kind === 'error' && (
          <div style={{ marginTop: 16, background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 8, padding: '10px 12px', fontSize: 12.5, color: '#FF4D4D' }}>
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11.5, color: '#4A6280', letterSpacing: '0.3px', textTransform: 'uppercase' }}>{label}</span>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ background: '#080C14', border: '1px solid rgba(0,194,255,0.1)', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#E0F0FF', outline: 'none', fontFamily: 'monospace' }}
      />
    </label>
  );
}
```

- [ ] **Step 4: Verify lint + typecheck**

```bash
npm run lint -- src/app/admin/onboard-customer/ src/app/api/admin/onboard-customer/
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Smoke test**

`npm run dev`. Visit `http://localhost:3000/admin/onboard-customer`. Fill in:
- Admin password = your `ADMIN_PASSWORD` env value
- Email = your test email
- n8n_base_url = e.g. `https://opsradar.app.n8n.cloud`
- webhook_secret + api_key = anything

Submit. Expected: success message with user id. Check Supabase Auth dashboard — new user appears. Check `client_n8n_config` table — row inserted.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/onboard-customer/page.tsx src/app/api/admin/onboard-customer/route.ts
git commit -m "feat(admin): add onboard-customer form + atomic API route"
```

---

## Task 16: End-to-end smoke test pass

This is verification, not coding. Walk through every flow with a real test customer. If any step fails, file an issue and fix before declaring done.

- [ ] **Step 1: Onboard a real test customer**

1. Visit `/admin/onboard-customer`.
2. Submit with a real email you can access.
3. Verify success banner with user id.
4. Verify in Supabase dashboard: user exists in Auth, row exists in `client_n8n_config`.
5. Verify the invite email arrives in your inbox within 1 minute.

- [ ] **Step 2: Accept the invite**

1. Click the magic link in the email.
2. Expected: lands on `/auth/set-password`.
3. Set a password (8+ chars), confirm.
4. Expected: redirected to `/dashboard`.
5. Expected: dashboard renders without errors. (May show empty data if the test customer's n8n isn't running real workflows.)

- [ ] **Step 3: Sign out, sign back in**

1. Click "Sign out" in the sidebar.
2. Expected: redirected to `/`. Cookies cleared.
3. Visit `/login`.
4. Enter email + password.
5. Expected: redirected to `/dashboard`. Logged in.

- [ ] **Step 4: Test middleware (deep link)**

1. Sign out.
2. Visit `/dashboard/settings/integrations` directly.
3. Expected: redirected to `/login?redirectTo=/dashboard/settings/integrations`.
4. Sign in.
5. Expected: redirected to `/dashboard/settings/integrations` (the original deep link).

**Note:** if `DEV_CLIENT_ID` is set, the middleware may fall through. To force the redirect, temporarily clear `DEV_CLIENT_ID` for this test, then restore it.

- [ ] **Step 5: Test wrong-password error**

1. Sign out.
2. Visit `/login`. Enter your email + a wrong password.
3. Expected: "Invalid email or password." No mention of whether email exists.

- [ ] **Step 6: Test forgot-password flow**

1. Visit `/forgot-password`.
2. Enter your test email. Submit.
3. Expected: redirected to `/login/check-email`.
4. Click the reset link in the email.
5. Expected: lands on `/auth/reset-password`.
6. Set a new password, confirm.
7. Expected: redirected to `/dashboard`, logged in with new password.

- [ ] **Step 7: Test forgot-password anti-enumeration**

1. Sign out.
2. Visit `/forgot-password`. Enter `nonexistent-${Date.now()}@example.com`. Submit.
3. Expected: redirected to `/login/check-email` (same as if email existed). No Supabase error leaks.

- [ ] **Step 8: Verify pre-existing routes still work**

```bash
curl -s "http://localhost:3000/api/dashboard/sales" | head -c 200
curl -s "http://localhost:3000/api/dashboard/marketing" | head -c 200
curl -s "http://localhost:3000/api/dashboard/automation-roi" | head -c 200
curl -s "http://localhost:3000/api/integrations" | head -c 200
```

Expected: each returns valid JSON (using DEV_CLIENT_ID fallback if you're not signed in via cookies on the curl request — that's fine for this test).

- [ ] **Step 9: Verify n8n_api_key is in the row you onboarded**

In Supabase SQL editor:

```sql
select client_id, n8n_base_url, n8n_api_key is not null as has_api_key
from public.client_n8n_config
where client_id = '<userId from Task 16 Step 1>';
```

Expected: `has_api_key = true`.

- [ ] **Step 10: Verify customer-facing integrations page is read-only**

Sign in. Visit `/dashboard/settings/integrations`. Expected:
- Title: "Connected systems"
- No form. No "Connect in n8n →" buttons.
- Each tool shows "Tracking" or "Not yet tracking" badge.

- [ ] **Step 11: Final lint + build**

```bash
npm run lint
npm run build
```

Expected: lint passes (warnings OK, no errors). Build completes successfully.

- [ ] **Step 12: Final commit (if any cleanup happened)**

```bash
git status
# If clean, you're done.
# If there are stragglers, commit them with a "chore(auth): smoke test cleanup" message.
```

---

## Self-Review Against Goal

After all tasks: confirm each spec section is covered.

- [x] Customer can sign in with email + password (Tasks 8, 13)
- [x] First-time customer (post-invite) sets password (Tasks 7, 10)
- [x] Forgot-password flow works (Tasks 11, 12)
- [x] /dashboard/* protected by middleware (Task 13)
- [x] Sign-out clears cookies (Task 9)
- [x] Admin can onboard a customer in one click (Task 15)
- [x] n8n_api_key column exists and is captured (Tasks 2, 3, 15)
- [x] Existing API routes use SSR helper (Task 5)
- [x] N8nConnectionSection removed from customer view (Task 6)
- [x] DEV_CLIENT_ID dev fallback preserved (Task 4)
- [x] Sign-in link in marketing nav (Task 14)
- [x] Anti-enumeration on forgot-password (Task 11, Task 16 step 7)
- [x] Email + password min length 8 (Tasks 10, 12)
- [x] Manual smoke testing pass (Task 16)

If any item is unchecked, fix before declaring done.

---

## When you're done

1. All tasks committed.
2. `git log --oneline | head -20` shows the auth commits.
3. Push to origin: `git push origin main`.
4. Update outer wrapper repo: `cd /home/lawand/Desktop/my-startup && git add opsradar && git commit -m "feat: update opsradar submodule — customer auth (Path Z)" && (git push origin master 2>/dev/null || true)`.
5. Tell the user the smoke test is green and the branch is pushed.
