# Customer Sign-In Flow — Self-Contained Codex Brief

> **Note:** This plan is written to be handed off to a separate agent (Codex) running in parallel. It's MORE detailed than a typical plan because the receiving agent has zero session context. Read top to bottom.

---

## Goal

Build a customer sign-in flow for OpsRadar so the dashboard knows who's logged in, so we can drop three dev-mode hacks that exist in the codebase right now:

1. `DEV_CLIENT_ID` env var fallback in `/api/dashboard/sales/route.ts` and `/api/integrations/hubspot/route.ts`
2. RLS disabled on the `integrations` Supabase table
3. `GRANT ALL` to the `anon` role on the `integrations` table

After this work ships, every authenticated user gets their own scoped data through Supabase's RLS, exactly as the original design intended.

---

## Context (read this before writing code)

### What this app is

**OpsRadar** is a Next.js 16 / React 19 app at `/home/lawand/Desktop/my-startup/opsradar`. The customer-facing dashboard lives at `/dashboard` and pulls live data from third-party tools (HubSpot, etc.) without storing any of it — encrypted access tokens are kept in a Supabase `integrations` table.

### Why sign-in matters

Currently, the API routes that read/write the `integrations` table fall back to a hardcoded `DEV_CLIENT_ID` UUID when no Supabase session is present (which is always, because there's no sign-in flow yet). To make this safe, RLS was dropped on the table and `anon` role got `GRANT ALL`. These are explicit dev concessions documented in commits `2f045eb` and the migrations on Supabase project `nbdcrmepvwbfbcjqfubr`.

Once a real session exists per request, we can:
- Restore the RLS policies (per-user scoping)
- Revoke the anon grant
- Delete the DEV_CLIENT_ID fallback code

### Key project conventions you MUST follow

| Convention | Detail |
|---|---|
| Path alias | `<npm>/*` → `./src/*` (NOT `@/`). Imports inside `src/` use `<npm>/...`. See `tsconfig.json`. |
| Branch | Create `feat/customer-signin` off `main`. Don't commit to other branches. |
| Working dir | `/home/lawand/Desktop/my-startup/opsradar` (use absolute paths in commands) |
| Test runner | None configured. Verification = `npx tsc --noEmit` + `npm run lint -- <file>` + `npm run build` + manual smoke. |
| Commits | Frequent, one per task. Match the recent style: `feat(auth): ...`, `fix(integrations): ...`. |
| `.env.local` | Gitignored. Modify to add new vars; NEVER `git add .env.local`. |
| Dev server | Runs on port 3000 via `npm run dev`. Hot-reloads on .env.local changes. Don't restart unless explicitly required. |

### Supabase quirks specific to this project

- The legacy JWT `service_role` key is **DISABLED** on the project. The `eyJ...` value still in `SUPABASE_SERVICE_ROLE_KEY` does NOT work — Supabase rejects with "Legacy API keys are disabled."
- The publishable key (`sb_publishable_...`) IS active. It's stored as `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
- Supabase project ID: `nbdcrmepvwbfbcjqfubr`. URL: `https://nbdcrmepvwbfbcjqfubr.supabase.co`.
- The existing helper `src/lib/supabase-server.ts` exports `getServerSupabaseClient()` that creates a plain `@supabase/supabase-js` client. It does NOT do cookie/session handling. **You will replace it (or add an SSR variant) with `@supabase/ssr`.**

### Current state of the code (what's already there)

- `src/lib/supabase-server.ts` — server-side client, no cookie handling
- `src/lib/supabase.ts` — browser client (used by some legacy admin flows)
- `src/lib/integrations.ts` — uses publishable key directly via its own `createClient()` call (a v1 dev hack — change this to use a proper SSR client that carries the user's session)
- `src/app/api/dashboard/sales/route.ts` — has `clientId = userData.user?.id ?? process.env.DEV_CLIENT_ID` fallback
- `src/app/api/integrations/hubspot/route.ts` — same pattern, used in POST and DELETE
- `src/app/admin/login/` — admin password login (UNRELATED to customer sign-in; don't touch)
- Supabase schema: `integrations` table exists, RLS is OFF, anon has GRANT ALL

### Architecture decisions

- **Auth method: passwordless magic link** via Supabase Auth. Pros: no password storage, no forgot-password flow, simple. Supabase's default email template works out of the box.
- **SSR client: `@supabase/ssr`** package. Provides cookie-based session handling that works in Next.js 16 server components and route handlers.
- **Middleware** gates all `/dashboard/*` routes and redirects unauthenticated users to `/sign-in`.
- **Sign-up = sign-in.** Magic link works for both — first link = create user, subsequent = sign in.
- **Site URL / redirect URL configuration** is a one-time manual setup step the user (Lawand) does in the Supabase dashboard. The plan calls this out as a manual prerequisite (Task 0).

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Manual | Supabase dashboard | Configure Site URL + Redirect URLs |
| Install | `package.json` | Add `@supabase/ssr` |
| Create | `src/lib/supabase-ssr.ts` | SSR-aware client factories (browser + server + middleware variants) |
| Create | `src/middleware.ts` | Refresh sessions + gate `/dashboard/*` |
| Create | `src/app/sign-in/page.tsx` | Email-input form + magic-link send |
| Create | `src/app/auth/callback/route.ts` | OAuth/magic-link exchange handler |
| Modify | `src/app/api/dashboard/sales/route.ts` | Use SSR client, drop DEV_CLIENT_ID fallback |
| Modify | `src/app/api/integrations/hubspot/route.ts` | Use SSR client, drop DEV_CLIENT_ID fallback |
| Modify | `src/lib/integrations.ts` | Use SSR client (not standalone publishable client) |
| Migration | Supabase | Restore RLS + policies, revoke anon grant |
| Modify | `.env.local` | Optionally remove `DEV_CLIENT_ID` (no longer needed) |

---

## Task 0: Manual prerequisite (USER, not Codex)

**The human user must do this once, before Codex starts.**

In the Supabase dashboard at `https://supabase.com/dashboard/project/nbdcrmepvwbfbcjqfubr/auth/url-configuration`:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** add `http://localhost:3000/auth/callback`

Save. (For production, add the production URL too — `https://www.opsradar.co/auth/callback`. Out of scope for this plan.)

Codex should NOT proceed with Task 1 until the user confirms this is done.

---

## Task 1: Branch + install dependency

- [ ] **Step 1: Create branch from main**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && git checkout main && git pull --ff-only 2>/dev/null; git checkout -b feat/customer-signin && git branch --show-current
```

Expected: `feat/customer-signin`

- [ ] **Step 2: Install `@supabase/ssr`**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm install @supabase/ssr
```

Expected: package installed, no errors. Adds 1-3 packages.

- [ ] **Step 3: Commit the dependency**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add package.json package-lock.json
git commit -m "chore(auth): add @supabase/ssr for cookie-based session handling"
```

---

## Task 2: SSR client factories

**Files:**
- Create: `src/lib/supabase-ssr.ts`

- [ ] **Step 1: Create `src/lib/supabase-ssr.ts`** with this content:

```ts
import { createBrowserClient, createServerClient as createSsrServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import type { Database } from '<npm>/lib/database.types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** For client components / browser-only code. */
export function createBrowserSupabase() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/** For server components and route handlers. Reads/writes session cookies. */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createSsrServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll fails when called from a server component (read-only).
          // Middleware refreshes the session; this is the documented pattern.
        }
      },
    },
  });
}

/** For middleware. Refreshes the session and updates response cookies. */
export function createMiddlewareSupabase(req: NextRequest, res: NextResponse) {
  return createSsrServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options as CookieOptions);
        });
      },
    },
  });
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -10
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/lib/supabase-ssr.ts
git commit -m "feat(auth): add SSR Supabase client factories"
```

---

## Task 3: Auth middleware

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Check whether middleware.ts already exists**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && ls src/middleware.ts 2>&1
```

If it exists: STOP and report BLOCKED. The plan assumed no existing middleware — adapting an existing one needs human review.

- [ ] **Step 2: Create `src/middleware.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareSupabase } from '<npm>/lib/supabase-ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });
  const supabase = createMiddlewareSupabase(req, res);

  // Refreshes the session cookie if the access token is expired.
  const { data: { user } } = await supabase.auth.getUser();

  // Gate /dashboard/* — redirect unauthenticated users to /sign-in
  if (!user && req.nextUrl.pathname.startsWith('/dashboard')) {
    const url = req.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('redirect_to', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // If signed in and visiting /sign-in, send them to /dashboard
  if (user && req.nextUrl.pathname === '/sign-in') {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/sign-in'],
};
```

- [ ] **Step 3: TypeScript check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -10
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/middleware.ts
git commit -m "feat(auth): add middleware that gates /dashboard and refreshes sessions"
```

---

## Task 4: Sign-in page

**Files:**
- Create: `src/app/sign-in/page.tsx`

- [ ] **Step 1: Create `src/app/sign-in/page.tsx`**

```tsx
'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserSupabase } from '<npm>/lib/supabase-ssr';

const C = {
  bg: '#080C14',
  card: '#0F1923',
  border: 'rgba(0,194,255,0.1)',
  accent: '#00C2FF',
  text: '#E0F0FF',
  muted: '#4A6280',
  red: '#FF4D4D',
  green: '#22C55E',
};

function SignInInner() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect_to') ?? '/dashboard';
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createBrowserSupabase();
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('next', redirectTo);
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: callbackUrl.toString() },
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 380,
          maxWidth: '100%',
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: 32,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6 }}>
          Sign in to OpsRadar
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 24, lineHeight: 1.5 }}>
          We'll email you a one-time link. No password needed.
        </div>
        {sent ? (
          <div
            style={{
              fontSize: 13.5,
              color: C.green,
              background: 'rgba(34,197,94,0.08)',
              border: `1px solid rgba(34,197,94,0.3)`,
              borderRadius: 8,
              padding: '12px 14px',
              lineHeight: 1.5,
            }}
          >
            Check <strong>{email}</strong> for a sign-in link. Click it to continue.
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              disabled={submitting}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid rgba(0,194,255,0.2)`,
                background: '#0B121A',
                color: C.text,
                fontSize: 14,
              }}
            />
            {error && <div style={{ fontSize: 12.5, color: C.red }}>{error}</div>}
            <button
              type="submit"
              disabled={submitting || email.length < 4}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: C.accent,
                color: '#0D1117',
                border: 'none',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting || email.length < 4 ? 0.6 : 1,
              }}
            >
              {submitting ? 'Sending…' : 'Send sign-in link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -10
```

Expected: zero errors.

- [ ] **Step 3: Lint check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run lint -- src/app/sign-in/page.tsx 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Smoke check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/sign-in
```

Expected: `200`.

- [ ] **Step 5: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/app/sign-in/page.tsx
git commit -m "feat(auth): add /sign-in page with magic-link form"
```

---

## Task 5: Magic-link callback handler

**Files:**
- Create: `src/app/auth/callback/route.ts`

- [ ] **Step 1: Create `src/app/auth/callback/route.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '<npm>/lib/supabase-ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';

  if (!code) {
    const errorUrl = url.clone();
    errorUrl.pathname = '/sign-in';
    errorUrl.search = '?error=missing_code';
    return NextResponse.redirect(errorUrl);
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorUrl = url.clone();
    errorUrl.pathname = '/sign-in';
    errorUrl.search = `?error=${encodeURIComponent(error.message)}`;
    return NextResponse.redirect(errorUrl);
  }

  const dest = url.clone();
  dest.pathname = next.startsWith('/') ? next : `/${next}`;
  dest.search = '';
  return NextResponse.redirect(dest);
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -10
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/app/auth/callback/route.ts
git commit -m "feat(auth): add /auth/callback route to exchange OTP code for session"
```

---

## Task 6: Migrate API routes off `DEV_CLIENT_ID` and onto SSR session

**Files:**
- Modify: `src/lib/integrations.ts`
- Modify: `src/app/api/dashboard/sales/route.ts`
- Modify: `src/app/api/integrations/hubspot/route.ts`

- [ ] **Step 1: Update `src/lib/integrations.ts`**

Replace the entire contents with:

```ts
import { createServerSupabase } from '<npm>/lib/supabase-ssr';
import { encryptToken, decryptToken, type EncryptedBlob } from '<npm>/lib/encryption';

export type ToolName =
  | 'stripe' | 'hubspot' | 'clickup' | 'asana' | 'toggl' | 'harvest'
  | 'google_ads' | 'meta_ads' | 'calendly' | 'quickbooks' | 'pipedrive'
  | 'salesforce' | 'monday';

export async function getIntegrationToken(
  clientId: string,
  tool: ToolName
): Promise<string | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('integrations')
    .select('encrypted_token, iv, auth_tag')
    .eq('client_id', clientId)
    .eq('tool', tool)
    .maybeSingle();

  if (error) throw new Error(`Failed to read integration: ${error.message || JSON.stringify(error)}`);
  if (!data) return null;

  return decryptToken({
    ciphertext: data.encrypted_token,
    iv: data.iv,
    authTag: data.auth_tag,
  });
}

export async function setIntegrationToken(
  clientId: string,
  tool: ToolName,
  plaintextToken: string
): Promise<void> {
  const supabase = await createServerSupabase();
  const blob: EncryptedBlob = encryptToken(plaintextToken);

  const { error } = await supabase
    .from('integrations')
    .upsert(
      {
        client_id: clientId,
        tool,
        encrypted_token: blob.ciphertext,
        iv: blob.iv,
        auth_tag: blob.authTag,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'client_id,tool' }
    );

  if (error) throw new Error(`Failed to store integration: ${error.message}`);
}

export async function deleteIntegration(clientId: string, tool: ToolName): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from('integrations')
    .delete()
    .eq('client_id', clientId)
    .eq('tool', tool);

  if (error) throw new Error(`Failed to delete integration: ${error.message}`);
}

export async function isIntegrationConnected(
  clientId: string,
  tool: ToolName
): Promise<boolean> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('integrations')
    .select('id')
    .eq('client_id', clientId)
    .eq('tool', tool)
    .maybeSingle();

  if (error) throw new Error(`Failed to check integration: ${error.message || JSON.stringify(error)}`);
  return Boolean(data);
}
```

- [ ] **Step 2: Update `src/app/api/dashboard/sales/route.ts`**

Replace the auth block. Find:

```ts
  const supabase = getServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  const clientId = userData.user?.id ?? process.env.DEV_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
```

Replace with:

```ts
  const supabase = await createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const clientId = userData.user.id;
```

Update the import at the top of the same file:

```ts
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
```

→

```ts
import { createServerSupabase } from '<npm>/lib/supabase-ssr';
```

- [ ] **Step 3: Update `src/app/api/integrations/hubspot/route.ts`**

Same migration pattern: replace both `getServerSupabaseClient()` callers (POST and DELETE handlers) with `await createServerSupabase()`. Drop the `DEV_CLIENT_ID` fallback in both — if no user, return 401.

The POST handler's `clientId` resolution becomes:

```ts
  const supabase = await createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const clientId = userData.user.id;
```

DELETE handler same. Update the import too.

- [ ] **Step 4: TypeScript check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/lib/integrations.ts src/app/api/dashboard/sales/route.ts src/app/api/integrations/hubspot/route.ts
git commit -m "refactor(auth): use SSR session in API routes; drop DEV_CLIENT_ID fallback"
```

---

## Task 7: Restore RLS + revoke anon grant on Supabase

**Files:** Supabase migrations via MCP `mcp__claude_ai_Supabase__apply_migration`. Project ID `nbdcrmepvwbfbcjqfubr`.

- [ ] **Step 1: Apply migration `restore_rls_on_integrations`**

```sql
revoke all on public.integrations from anon;

alter table public.integrations enable row level security;

create policy "users can read their own integrations"
  on public.integrations for select
  using (auth.uid() = client_id);

create policy "users can insert their own integrations"
  on public.integrations for insert
  with check (auth.uid() = client_id);

create policy "users can update their own integrations"
  on public.integrations for update
  using (auth.uid() = client_id);

create policy "users can delete their own integrations"
  on public.integrations for delete
  using (auth.uid() = client_id);
```

Use the Supabase MCP tool. If you don't have MCP access, the user (Lawand) needs to run this SQL via Supabase Studio. Don't proceed past this step until the migration is applied.

- [ ] **Step 2: Verify RLS is on**

```sql
select relrowsecurity from pg_class where relname = 'integrations';
```

Expected: `relrowsecurity = t`.

- [ ] **Step 3: No commit needed** (Supabase migrations live in the cloud, not the repo). Note this in the next task's commit message.

---

## Task 8: End-to-end verification

- [ ] **Step 1: Make sure dev server is running**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
```

Expected: `200`.

- [ ] **Step 2: Visit `/dashboard` while signed out**

Open `http://localhost:3000/dashboard` in a private/incognito window (so no existing session interferes).

Expected: redirected to `http://localhost:3000/sign-in?redirect_to=/dashboard`.

- [ ] **Step 3: Submit your email**

Type a real email (Lawand's `dominicordlr@gmail.com` or any inbox he can access). Click **Send sign-in link**.

Expected: form is replaced by "Check <email> for a sign-in link." If you see an error, check that:
- Site URL + Redirect URL are configured in Supabase (Task 0)
- Supabase auth is enabled
- The email isn't blocked

- [ ] **Step 4: Click the magic link in the email**

Expected: browser opens `http://localhost:3000/auth/callback?code=...` → redirects to `/dashboard`. You're now signed in.

- [ ] **Step 5: Verify the dashboard loads with your data**

Network tab → `GET /api/dashboard/sales` should return `{"status":"not_connected","tool":"hubspot"}` or live data if you've connected HubSpot under this user.

`GET /api/dashboard/automation-roi` should still return 200 (no auth required for that route by design — it's public CTO data).

- [ ] **Step 6: Verify RLS scoping**

Connect HubSpot via the Sales card (paste any HubSpot Service Key). Then in Supabase MCP `execute_sql`:

```sql
select client_id, tool from public.integrations;
```

Expected: only one row, with `client_id` matching the auth.uid() of the email you signed in with.

If you sign in with a DIFFERENT email and visit /dashboard, the Sales card should show "Connect HubSpot →" again (no rows visible to that user).

- [ ] **Step 7: Optional cleanup**

Remove `DEV_CLIENT_ID` from `.env.local` (no longer used). Don't commit `.env.local` (gitignored).

```bash
# In .env.local, delete the line: DEV_CLIENT_ID=00000000-...
```

- [ ] **Step 8: Final commit (optional, if env hygiene matters)**

If you also want to delete the unused dev row from auth.users:

```sql
delete from auth.users where email = 'dev@opsradar.local';
```

(This cascades to `integrations` rows, removing any leftover DEV_CLIENT_ID-keyed data.)

---

## Self-Review Against Goal

| Goal | Task |
|---|---|
| Build sign-in flow | Tasks 4, 5 |
| Sessions thread through API routes | Tasks 2, 3, 6 |
| Drop `DEV_CLIENT_ID` fallback | Task 6 |
| Restore RLS | Task 7 |
| Revoke anon grant | Task 7 |
| Verify end-to-end | Task 8 |

**Type consistency:** `clientId: string` is consistent across `getIntegrationToken`, `setIntegrationToken`, `deleteIntegration`, `isIntegrationConnected`, and the API routes that call them.

**Placeholder scan:** No "TBD" / "implement later" / "similar to Task N." Every step has full code or full commands.

---

## When you're done

Report status back to the user (Lawand). The Claude Code session will pull your branch, review, and merge it sequentially with its own work.
