# Customer Self-Connect Integration Framework — v1: Stripe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Codex reviews each task** (per user memory `feedback_codex_for_reviews`): dispatch `codex:codex-rescue` instead of the default spec/quality reviewers.

**Goal:** Build the reusable customer-self-connect OAuth pattern for opsradar dashboard widgets and ship the Stripe v1 instantiation: customers click "Connect Stripe" on the integrations settings page, OAuth into their Stripe account, and the dashboard's Finance card renders live invoiced/paid/overdue data — without opsradar ever persisting business data.

**Architecture:** Three layers. (1) Generic OAuth route handlers (`/api/integrations/[tool]/connect|callback|disconnect`) parameterized by a per-tool registry. (2) Encryption helper (AES-256-GCM) stores access/refresh tokens in the existing `integrations` table (extended with new columns). (3) Per-widget data routes (`/api/dashboard/finance`) decrypt tokens, call the tool API live, map to widget contract, cache JSON in Upstash Redis (TTL 1h). On any 401: refresh-then-retry, otherwise mark `requires_reconnect`.

**Tech Stack:** Next.js 16 App Router (Node runtime), TypeScript, Supabase (Postgres), `stripe` SDK (Connect OAuth + REST), `@upstash/redis`, AES-256-GCM via Node `crypto`. Tailwind v4 Phase-0 tokens (`--color-success`, `--color-warn`, `--color-danger`, `--color-fg`, `--color-fg-muted`, `--color-fg-subtle`, `--color-border`, `--color-surface`, `--color-surface-sunken`, `--radius`, `--radius-md`, `--radius-sm`).

---

## Prerequisites (one-time team setup)

These are NOT plan tasks — surface them to the user before/during execution:

1. **Stripe Connect app registration** — user opens `dashboard.stripe.com/settings/connect`, creates a Connect app with redirect URI `https://opsradar.com/api/integrations/stripe/callback`, copies `client_id` (`ca_...`) and platform secret key (`sk_live_...`).
2. **Generate INTEGRATIONS_ENCRYPTION_KEY** — 32 random bytes base64-encoded. Run locally: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
3. **Set 3 env vars in Vercel (opsradar project)** AND in local `.env.local`:
   - `STRIPE_CONNECT_CLIENT_ID=ca_...`
   - `STRIPE_SECRET_KEY=sk_live_...` (or sk_test_... for dev)
   - `INTEGRATIONS_ENCRYPTION_KEY=<base64>`

The plan can be implemented and tested locally with test-mode credentials before production env vars are set. Production rollout = setting the live env vars + verifying.

---

## File Structure

### New files

| File | Responsibility |
|---|---|
| `supabase/migrations/20260512_integrations_oauth_v2.sql` | Add `encrypted_access_token`, `encrypted_refresh_token`, `scope`, `external_account_id`, `expires_at`, `status`, `last_synced_at`, `last_error` to `integrations` |
| `supabase/migrations/20260512_oauth_state.sql` | New `oauth_state` table for CSRF protection |
| `src/lib/integrations/crypto.ts` | AES-256-GCM `encrypt()`/`decrypt()` — single base64 string format (IV+ciphertext+tag) |
| `src/lib/integrations/oauth-state.ts` | `createOAuthState(userId, tool)` / `consumeOAuthState(state, userId)` — DB-backed CSRF state |
| `src/lib/integrations/registry.ts` | Per-tool config (authorize URL, token URL, scopes, revoke URL) — Stripe v1 |
| `src/lib/integrations/stripe/client.ts` | Stripe SDK adapter (returns a `Stripe` instance for a connected account) |
| `src/lib/integrations/stripe/oauth.ts` | Stripe-specific token exchange + revoke |
| `src/lib/integrations/stripe/finance.ts` | Maps Stripe API responses → `FinanceWidget` contract |
| `src/app/api/integrations/[tool]/connect/route.ts` | OAuth init → 302 to provider's authorize URL |
| `src/app/api/integrations/[tool]/callback/route.ts` | OAuth callback → exchange code → encrypt + upsert → redirect |
| `src/app/api/integrations/[tool]/disconnect/route.ts` | Revoke at provider + delete row + invalidate cache |
| `src/app/api/dashboard/finance/route.ts` | Customer-facing Finance widget data endpoint |
| `src/components/dashboard/finance-card.tsx` | Finance card UI — `ok`/`not_connected`/`requires_reconnect`/`unavailable` states |
| `src/components/dashboard/integration-card.tsx` | Reusable settings page row (Connect / Disconnect / status pill) |

### Modified files

| File | Change |
|---|---|
| `src/app/api/integrations/route.ts` | Extend response: include `status`, `last_synced_at`, `external_account_id` per row |
| `src/app/dashboard/settings/integrations/page.tsx` | Use `IntegrationCard`; flip `stripe` from `coming_soon` → `available`; rewrite top copy; handle `?connected=stripe`/`?error=...` query params |
| `src/app/dashboard/page.tsx` | Insert `<FinanceCard />` (alongside existing `FinancialsCard`) |
| `src/lib/database.types.ts` | Regenerate via Supabase MCP after migrations apply |
| `src/lib/integrations.ts` | (no change — `ToolName` already includes `stripe`) |
| `package.json` | Add `stripe` dependency |
| `.env.local` (gitignored) | Add `STRIPE_CONNECT_CLIENT_ID`, `STRIPE_SECRET_KEY`, `INTEGRATIONS_ENCRYPTION_KEY` |

---

## Task 1: Apply schema migrations

**Files:**
- Create: `supabase/migrations/20260512_integrations_oauth_v2.sql`
- Create: `supabase/migrations/20260512_oauth_state.sql`
- Modify: `src/lib/database.types.ts` (regenerated)

- [ ] **Step 1: Write `20260512_integrations_oauth_v2.sql`**

```sql
-- Extend integrations table for the customer self-connect OAuth pattern.
-- We keep the existing encrypted_token/iv/auth_tag columns untouched (no
-- code reads them yet) and introduce the v2 columns used by the new
-- generic OAuth handlers. Each access/refresh token is stored as a single
-- base64 string in the form `iv.ciphertext.tag` (AES-256-GCM).

alter table public.integrations
  add column if not exists encrypted_access_token text,
  add column if not exists encrypted_refresh_token text,
  add column if not exists scope text,
  add column if not exists external_account_id text,
  add column if not exists expires_at timestamptz,
  add column if not exists status text not null default 'connected'
    check (status in ('connected','requires_reconnect','revoked')),
  add column if not exists last_synced_at timestamptz,
  add column if not exists last_error text;

comment on column public.integrations.encrypted_access_token is
  'AES-256-GCM ciphertext of the OAuth access token. Base64(iv|ciphertext|tag).';
comment on column public.integrations.encrypted_refresh_token is
  'AES-256-GCM ciphertext of the OAuth refresh token (nullable; some providers omit).';
comment on column public.integrations.external_account_id is
  'Provider-side account/user id (e.g. Stripe stripe_user_id).';
comment on column public.integrations.status is
  'connected = healthy. requires_reconnect = 401 from provider, customer must re-OAuth. revoked = team-marked.';
```

- [ ] **Step 2: Write `20260512_oauth_state.sql`**

```sql
-- CSRF state tokens for the OAuth init→callback handshake.
-- A row exists only between /connect and /callback; consumed (deleted) on read.
-- Expiry is 10 minutes; a background cron can sweep older rows.

create table if not exists public.oauth_state (
  state uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists oauth_state_expires_at_idx
  on public.oauth_state (expires_at);

-- Server-only access; RLS enabled but no policies = full deny for end users.
alter table public.oauth_state enable row level security;
```

- [ ] **Step 3: Apply both migrations to production Supabase**

Use the Supabase MCP `apply_migration` tool (CLI is not authenticated in this environment — see `project_chatv2_deploy_ownership` memory for context on why; same pattern applied here):

```
mcp__claude_ai_Supabase__apply_migration(
  name="20260512_integrations_oauth_v2",
  query=<contents of file>
)
mcp__claude_ai_Supabase__apply_migration(
  name="20260512_oauth_state",
  query=<contents of file>
)
```

Expected: both return success. Project ref: `nbdcrmepvwbfbcjqfubr`.

- [ ] **Step 4: Regenerate database types**

```
mcp__claude_ai_Supabase__generate_typescript_types(project_id="nbdcrmepvwbfbcjqfubr")
```

Save the output to `src/lib/database.types.ts` (overwrite). Verify the diff shows new columns on `integrations` and a new `oauth_state` table type.

- [ ] **Step 5: Type-check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit
```

Expected: PASS (no consumers yet of the new columns).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260512_integrations_oauth_v2.sql \
        supabase/migrations/20260512_oauth_state.sql \
        src/lib/database.types.ts
git commit -m "feat(db): extend integrations + add oauth_state for self-connect OAuth"
```

---

## Task 2: AES-256-GCM crypto helper

**Files:**
- Create: `src/lib/integrations/crypto.ts`
- Create: `src/lib/integrations/__tests__/crypto.test.ts` (or co-located `crypto.test.ts` — pick whichever the repo already uses; default to co-located if neither)

- [ ] **Step 1: Confirm test runner**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && cat package.json | grep -A 2 '"scripts"' | head -10
```

If no `test` script exists (current state per `CLAUDE.md`), this task ships **without an automated test runner**. Instead, the verification step uses a one-off `tsx` script (`tsx` is already a devDep transitively via Next; if not, use `node --import tsx`). Include the script inline in Step 4 below — don't add a permanent test infrastructure.

- [ ] **Step 2: Write `src/lib/integrations/crypto.ts`**

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

function getKey(): Buffer {
  const raw = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('INTEGRATIONS_ENCRYPTION_KEY is not set');
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `INTEGRATIONS_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length})`,
    );
  }
  return key;
}

/**
 * Encrypts a UTF-8 plaintext. Returns base64 of `iv | ciphertext | tag`.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString('base64');
}

/**
 * Decrypts a value previously returned by encrypt(). Throws on tamper.
 */
export function decrypt(packed: string): string {
  const key = getKey();
  const buf = Buffer.from(packed, 'base64');
  if (buf.length < IV_BYTES + TAG_BYTES + 1) {
    throw new Error('ciphertext is too short');
  }
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(buf.length - TAG_BYTES);
  const ct = buf.subarray(IV_BYTES, buf.length - TAG_BYTES);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}
```

- [ ] **Step 3: Manual verification script**

Save as `scripts/verify-crypto.mjs` (gitignored — delete after verification, see Step 5):

```js
import { encrypt, decrypt } from '../src/lib/integrations/crypto.ts';

// Set a known 32-byte key for verification.
process.env.INTEGRATIONS_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');

const original = 'sk_test_secret_value_with_special_chars_!@#$%^&*()';
const packed = encrypt(original);
console.log('packed length:', packed.length, '(base64)');
console.log('round-trip match:', decrypt(packed) === original);

const packed2 = encrypt(original);
console.log('non-deterministic (IV randomized):', packed !== packed2);

try {
  decrypt(packed.replace(/.$/, packed.endsWith('A') ? 'B' : 'A'));
  console.log('TAMPER DETECT: FAILED (should have thrown)');
} catch {
  console.log('TAMPER DETECT: OK (threw on tampered ciphertext)');
}
```

- [ ] **Step 4: Run the verification**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsx scripts/verify-crypto.mjs
```

Expected output:
```
packed length: 92 (base64)         # 12 + ciphertext + 16, base64-encoded
round-trip match: true
non-deterministic (IV randomized): true
TAMPER DETECT: OK (threw on tampered ciphertext)
```

- [ ] **Step 5: Delete the verification script**

```bash
rm scripts/verify-crypto.mjs && rmdir scripts 2>/dev/null || true
```

(`scripts/` may not exist or may have siblings — only the verification file must go.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/integrations/crypto.ts
git commit -m "feat(integrations): add AES-256-GCM encrypt/decrypt helper"
```

---

## Task 3: OAuth state CSRF helpers

**Files:**
- Create: `src/lib/integrations/oauth-state.ts`

- [ ] **Step 1: Write `src/lib/integrations/oauth-state.ts`**

```ts
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

const STATE_TTL_MINUTES = 10;

export type StateValidation =
  | { ok: true }
  | { ok: false; reason: 'missing' | 'expired' | 'wrong_user' | 'wrong_tool' };

/**
 * Mints a CSRF state token bound to (user_id, tool). The caller redirects
 * the user to the provider with this state in the query string.
 *
 * Returns the state UUID.
 */
export async function createOAuthState(userId: string, tool: string): Promise<string> {
  const supabase = getServerSupabaseClient();
  const expiresAt = new Date(Date.now() + STATE_TTL_MINUTES * 60_000).toISOString();

  const { data, error } = await supabase
    .from('oauth_state')
    .insert({ user_id: userId, tool, expires_at: expiresAt })
    .select('state')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create oauth_state: ${error?.message ?? 'no data'}`);
  }
  return data.state;
}

/**
 * Validates a state value from the OAuth callback. If valid, the row is
 * DELETED (single-use). Returns ok or a structured reason on failure.
 *
 * Note: We always attempt to delete (best-effort) on any outcome so that
 * a replayed state can't succeed even if it was momentarily valid.
 */
export async function consumeOAuthState(
  state: string,
  expectedUserId: string,
  expectedTool: string,
): Promise<StateValidation> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from('oauth_state')
    .select('user_id, tool, expires_at')
    .eq('state', state)
    .maybeSingle();

  if (error) throw new Error(`oauth_state lookup failed: ${error.message}`);
  if (!data) return { ok: false, reason: 'missing' };

  // Always delete after read (single-use).
  await supabase.from('oauth_state').delete().eq('state', state);

  if (data.user_id !== expectedUserId) return { ok: false, reason: 'wrong_user' };
  if (data.tool !== expectedTool) return { ok: false, reason: 'wrong_tool' };
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true };
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/integrations/oauth-state.ts
git commit -m "feat(integrations): add oauth_state CSRF helpers"
```

---

## Task 4: Integration registry (Stripe v1)

**Files:**
- Create: `src/lib/integrations/registry.ts`

- [ ] **Step 1: Write `src/lib/integrations/registry.ts`**

```ts
import type { ToolName } from '<npm>/lib/integrations';

export type IntegrationConfig = {
  /** Display name shown in URLs and logs. */
  tool: ToolName;
  /** OAuth authorize endpoint (the URL we redirect the user to). */
  authorizeUrl: string;
  /** OAuth token-exchange endpoint (server-to-server). */
  tokenUrl: string;
  /** Optional revoke endpoint; if absent, disconnect deletes our row only. */
  revokeUrl?: string;
  /** Scopes we request. */
  scope: string;
  /** Env var that holds the platform-side OAuth client id. */
  clientIdEnv: string;
  /** Env var that holds the platform-side OAuth client secret. */
  clientSecretEnv: string;
};

const REGISTRY: Partial<Record<ToolName, IntegrationConfig>> = {
  stripe: {
    tool: 'stripe',
    authorizeUrl: 'https://connect.stripe.com/oauth/authorize',
    tokenUrl: 'https://connect.stripe.com/oauth/token',
    revokeUrl: 'https://connect.stripe.com/oauth/deauthorize',
    scope: 'read_only',
    clientIdEnv: 'STRIPE_CONNECT_CLIENT_ID',
    clientSecretEnv: 'STRIPE_SECRET_KEY',
  },
};

export function getIntegrationConfig(tool: string): IntegrationConfig | null {
  return REGISTRY[tool as ToolName] ?? null;
}

/** Whether a given tool slug has an enabled OAuth integration in this build. */
export function isIntegrationEnabled(tool: string): boolean {
  return getIntegrationConfig(tool) !== null;
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/integrations/registry.ts
git commit -m "feat(integrations): add per-tool integration registry (stripe v1)"
```

---

## Task 5: Install Stripe SDK + adapter

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `src/lib/integrations/stripe/client.ts`

- [ ] **Step 1: Install Stripe SDK**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm install stripe@latest --save
```

Expected: package added, no peer-dep warnings beyond existing ones.

- [ ] **Step 2: Pin the API version**

Open `package.json` and confirm `stripe` is listed under `dependencies`. Note the installed version in the commit message.

- [ ] **Step 3: Write `src/lib/integrations/stripe/client.ts`**

```ts
import Stripe from 'stripe';

const STRIPE_API_VERSION = '2024-06-20' as const;

/**
 * Builds a Stripe client scoped to a connected account's access token.
 * Pass the *decrypted* access_token returned from the OAuth token exchange.
 *
 * Stripe Connect access tokens act as the connected account's secret key:
 * all subsequent API calls operate against THAT account, not the platform.
 */
export function stripeClient(accessToken: string): Stripe {
  // The cast is required because Stripe ships specific literal-typed API
  // versions; the constant above must match one of them. If the version
  // is out of date, bump it after reading Stripe's migration guide.
  return new Stripe(accessToken, {
    apiVersion: STRIPE_API_VERSION as unknown as Stripe.LatestApiVersion,
    typescript: true,
    maxNetworkRetries: 2,
  });
}

/**
 * Builds a Stripe client using the platform secret key (NOT a connected
 * account). Used only for the OAuth token exchange / deauthorize calls.
 */
export function stripePlatformClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, {
    apiVersion: STRIPE_API_VERSION as unknown as Stripe.LatestApiVersion,
    typescript: true,
    maxNetworkRetries: 2,
  });
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: PASS. If the API version type-cast complains, leave the `as unknown as` — Stripe's literal type for `apiVersion` shifts with each SDK release.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/integrations/stripe/client.ts
git commit -m "feat(integrations): add Stripe SDK + adapter helpers"
```

---

## Task 6: Stripe OAuth glue

**Files:**
- Create: `src/lib/integrations/stripe/oauth.ts`

- [ ] **Step 1: Write `src/lib/integrations/stripe/oauth.ts`**

```ts
import { stripePlatformClient } from './client';

export type StripeOAuthTokenResponse = {
  access_token: string;
  refresh_token: string | null;
  scope: string;
  stripe_user_id: string;
  /** Stripe Connect access tokens do not expire; this is always undefined. */
  expires_at?: undefined;
};

/**
 * Exchanges an OAuth `code` for a Stripe Connect access token.
 *
 * Stripe's SDK exposes this via stripe.oauth.token. Errors throw.
 */
export async function exchangeStripeCode(code: string): Promise<StripeOAuthTokenResponse> {
  const stripe = stripePlatformClient();
  const res = await stripe.oauth.token({
    grant_type: 'authorization_code',
    code,
  });

  // The SDK return is typed loosely. Map only the fields we use.
  return {
    access_token: res.access_token!,
    refresh_token: res.refresh_token ?? null,
    scope: res.scope ?? 'read_only',
    stripe_user_id: res.stripe_user_id!,
  };
}

/**
 * Revokes opsradar's access to the connected account. Best-effort:
 * if Stripe returns an error (e.g. already revoked), we swallow it.
 */
export async function deauthorizeStripe(stripeUserId: string): Promise<void> {
  const stripe = stripePlatformClient();
  try {
    await stripe.oauth.deauthorize({
      client_id: process.env.STRIPE_CONNECT_CLIENT_ID!,
      stripe_user_id: stripeUserId,
    });
  } catch (err) {
    // Intentional swallow: disconnect must succeed even if Stripe-side revoke fails.
    // Local row deletion is the authoritative action.
    console.warn('[stripe] deauthorize failed (continuing with local disconnect):', err);
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/integrations/stripe/oauth.ts
git commit -m "feat(integrations): add Stripe OAuth token exchange + revoke"
```

---

## Task 6.5: Stripe finance data shaper

**Files:**
- Create: `src/lib/integrations/stripe/finance.ts`

- [ ] **Step 1: Write `src/lib/integrations/stripe/finance.ts`**

```ts
import type Stripe from 'stripe';
import { stripeClient } from './client';

export type FinanceWidgetData = {
  invoiced: number;  // USD, this month-to-date
  paid: number;      // USD, this month-to-date
  overdue: number;   // USD, currently outstanding past due
  sparkline: Array<{ date: string; amount: number }>; // last 30 days of charge totals
  currency: 'USD';
};

function unix(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

function startOfMonthUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function subDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() - n);
  return out;
}

function dailyKey(unixSec: number): string {
  return new Date(unixSec * 1000).toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Live-fetches the connected account's invoices + charges and shapes them
 * into the FinanceWidget contract. No persistence happens here.
 *
 * v1 scope: USD only, single API page (limit 100) per resource — covers the
 * vast majority of agency monthly volume.
 */
export async function fetchFinanceData(accessToken: string): Promise<FinanceWidgetData> {
  const stripe = stripeClient(accessToken);
  const now = new Date();
  const monthStart = startOfMonthUtc(now);
  const thirtyDaysAgo = subDays(now, 30);
  const nowSec = unix(now);

  const [charges, invoices]: [Stripe.ApiList<Stripe.Charge>, Stripe.ApiList<Stripe.Invoice>] =
    await Promise.all([
      stripe.charges.list({ created: { gte: unix(thirtyDaysAgo) }, limit: 100 }),
      stripe.invoices.list({ created: { gte: unix(monthStart) }, limit: 100 }),
    ]);

  const invoiced = invoices.data.reduce((sum, inv) => sum + (inv.amount_due ?? 0), 0) / 100;
  const paid = invoices.data
    .filter((inv) => inv.paid === true)
    .reduce((sum, inv) => sum + (inv.amount_paid ?? 0), 0) / 100;
  const overdue = invoices.data
    .filter((inv) => inv.status === 'open' && inv.due_date != null && inv.due_date < nowSec)
    .reduce((sum, inv) => sum + (inv.amount_remaining ?? 0), 0) / 100;

  // Build a 30-day sparkline (empty days = 0).
  const buckets: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    buckets[dailyKey(unix(subDays(now, i)))] = 0;
  }
  for (const ch of charges.data) {
    if (ch.status !== 'succeeded') continue;
    const k = dailyKey(ch.created);
    if (k in buckets) buckets[k] += (ch.amount ?? 0) / 100;
  }
  const sparkline = Object.entries(buckets)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, amount]) => ({ date, amount }));

  return { invoiced, paid, overdue, sparkline, currency: 'USD' };
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/integrations/stripe/finance.ts
git commit -m "feat(integrations): shape Stripe invoices/charges into FinanceWidget"
```

---

## Task 7: Generic `/api/integrations/[tool]/connect` route

**Files:**
- Create: `src/app/api/integrations/[tool]/connect/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getIntegrationConfig } from '<npm>/lib/integrations/registry';
import { createOAuthState } from '<npm>/lib/integrations/oauth-state';
import { SITE_URL } from '<npm>/lib/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tool: string }> },
): Promise<NextResponse> {
  const { tool } = await params;
  const config = getIntegrationConfig(tool);
  if (!config) {
    return NextResponse.json({ error: 'tool_not_supported' }, { status: 404 });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  const clientId = process.env[config.clientIdEnv];
  if (!clientId) {
    console.error(`[integrations] ${tool}: ${config.clientIdEnv} is not set`);
    return NextResponse.redirect(
      new URL(`/dashboard/settings/integrations?error=server_misconfigured`, req.url),
    );
  }

  const state = await createOAuthState(userId, config.tool);
  const redirectUri = `${SITE_URL}/api/integrations/${config.tool}/callback`;

  const authorize = new URL(config.authorizeUrl);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('scope', config.scope);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('state', state);

  return NextResponse.redirect(authorize.toString());
}
```

- [ ] **Step 2: Verify `SITE_URL` constant exists**

```bash
grep -n "SITE_URL" /home/lawand/Desktop/my-startup/opsradar/src/lib/constants.ts
```

Expected: a `SITE_URL` export. If named differently (e.g. `APP_URL`), substitute the actual name in the route and any later task that references it.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/integrations/\[tool\]/connect/route.ts
git commit -m "feat(api): add generic OAuth init route /api/integrations/[tool]/connect"
```

---

## Task 8: Generic `/api/integrations/[tool]/callback` route

**Files:**
- Create: `src/app/api/integrations/[tool]/callback/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { getIntegrationConfig } from '<npm>/lib/integrations/registry';
import { consumeOAuthState } from '<npm>/lib/integrations/oauth-state';
import { encrypt } from '<npm>/lib/integrations/crypto';
import { exchangeStripeCode } from '<npm>/lib/integrations/stripe/oauth';
import { SITE_URL } from '<npm>/lib/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function settingsRedirect(qs: string, base: string | URL): NextResponse {
  return NextResponse.redirect(new URL(`/dashboard/settings/integrations?${qs}`, base));
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tool: string }> },
): Promise<NextResponse> {
  const { tool } = await params;
  const config = getIntegrationConfig(tool);
  if (!config) {
    return NextResponse.json({ error: 'tool_not_supported' }, { status: 404 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const providerError = url.searchParams.get('error');

  // Customer hit "Cancel" on the provider's authorize screen.
  if (providerError) {
    return settingsRedirect(`error=user_canceled&tool=${tool}`, req.url);
  }
  if (!code || !state) {
    return settingsRedirect(`error=missing_params&tool=${tool}`, req.url);
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  const stateCheck = await consumeOAuthState(state, userId, config.tool);
  if (!stateCheck.ok) {
    if (stateCheck.reason === 'wrong_user') {
      // Possible CSRF; refuse with 403 (no redirect).
      return NextResponse.json({ error: 'state_user_mismatch' }, { status: 403 });
    }
    return settingsRedirect(`error=${stateCheck.reason}&tool=${tool}`, req.url);
  }

  // Per-provider token exchange. v1 only has Stripe.
  if (config.tool !== 'stripe') {
    return settingsRedirect(`error=tool_not_implemented&tool=${tool}`, req.url);
  }

  let tokens;
  try {
    tokens = await exchangeStripeCode(code);
  } catch (err) {
    console.error('[integrations] stripe token exchange failed:', err);
    return settingsRedirect(`error=connection_failed&tool=${tool}`, req.url);
  }

  const supabase = getServerSupabaseClient();
  const { error: upsertErr } = await supabase
    .from('integrations')
    .upsert(
      {
        client_id: userId,
        tool: config.tool,
        encrypted_access_token: encrypt(tokens.access_token),
        encrypted_refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        scope: tokens.scope,
        external_account_id: tokens.stripe_user_id,
        expires_at: null,
        status: 'connected',
        last_error: null,
        connected_at: new Date().toISOString(),
        // Required legacy columns (existing schema has them NOT NULL).
        // We write placeholder values; the new flow reads encrypted_access_token instead.
        encrypted_token: '',
        iv: '',
        auth_tag: '',
      },
      { onConflict: 'client_id,tool' },
    );

  if (upsertErr) {
    console.error('[integrations] upsert failed:', upsertErr);
    return settingsRedirect(`error=storage_failed&tool=${tool}`, req.url);
  }

  return settingsRedirect(`connected=${tool}`, req.url);
}
```

- [ ] **Step 2: Confirm the legacy NOT-NULL columns and unique constraint**

```bash
grep -A 40 "integrations: {" /home/lawand/Desktop/my-startup/opsradar/src/lib/database.types.ts | head -50
```

Look at the `Insert:` block. If `encrypted_token`, `iv`, or `auth_tag` are typed `string` (not `string | null`), keep the empty-string placeholders above. If `string | null` after the migration, prefer `null` for cleanliness.

Also confirm there's a unique index/constraint on `(client_id, tool)`. If not, ask the user before continuing — `upsert(..., { onConflict: 'client_id,tool' })` requires it.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/integrations/\[tool\]/callback/route.ts
git commit -m "feat(api): add OAuth callback /api/integrations/[tool]/callback (stripe v1)"
```

---

## Task 9: Generic `/api/integrations/[tool]/disconnect` route

**Files:**
- Create: `src/app/api/integrations/[tool]/disconnect/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { getIntegrationConfig } from '<npm>/lib/integrations/registry';
import { decrypt } from '<npm>/lib/integrations/crypto';
import { deauthorizeStripe } from '<npm>/lib/integrations/stripe/oauth';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_KEYS_BY_TOOL: Record<string, string[]> = {
  stripe: ['dash:finance'], // prefix; per-user key is `dash:finance:<userId>`
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tool: string }> },
): Promise<NextResponse> {
  const { tool } = await params;
  const config = getIntegrationConfig(tool);
  if (!config) {
    return NextResponse.json({ error: 'tool_not_supported' }, { status: 404 });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const { data: row, error: readErr } = await supabase
    .from('integrations')
    .select('external_account_id, encrypted_access_token')
    .eq('client_id', userId)
    .eq('tool', config.tool)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ error: `read_failed: ${readErr.message}` }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ ok: true, alreadyDisconnected: true });
  }

  // Best-effort provider revoke (stripe v1 only).
  if (config.tool === 'stripe' && row.external_account_id) {
    try {
      // Decrypting isn't strictly required for deauthorize (we use platform key
      // + stripe_user_id) but we surface a decrypt error if the row is corrupt.
      if (row.encrypted_access_token) decrypt(row.encrypted_access_token);
      await deauthorizeStripe(row.external_account_id);
    } catch (err) {
      console.warn('[integrations] stripe deauthorize precheck failed (proceeding):', err);
    }
  }

  const { error: delErr } = await supabase
    .from('integrations')
    .delete()
    .eq('client_id', userId)
    .eq('tool', config.tool);

  if (delErr) {
    return NextResponse.json({ error: `delete_failed: ${delErr.message}` }, { status: 500 });
  }

  // Invalidate any cached widget data for this user.
  try {
    const redis = Redis.fromEnv();
    const prefixes = CACHE_KEYS_BY_TOOL[config.tool] ?? [];
    await Promise.all(prefixes.map((p) => redis.del(`${p}:${userId}`)));
  } catch (err) {
    console.warn('[integrations] cache invalidate failed (non-fatal):', err);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/integrations/\[tool\]/disconnect/route.ts
git commit -m "feat(api): add disconnect route + cache invalidation"
```

---

## Task 10: Finance widget API `/api/dashboard/finance`

**Files:**
- Create: `src/app/api/dashboard/finance/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decrypt } from '<npm>/lib/integrations/crypto';
import { fetchFinanceData } from '<npm>/lib/integrations/stripe/finance';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60; // 1 hour
const CACHE_KEY = (userId: string) => `dash:finance:${userId}`;

type FinanceResponse =
  | { status: 'ok'; data: import('<npm>/lib/integrations/stripe/finance').FinanceWidgetData; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected' }
  | { status: 'requires_reconnect' }
  | { status: 'unavailable'; message: string };

export async function GET(_req: NextRequest): Promise<NextResponse<FinanceResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const { data: row, error: readErr } = await supabase
    .from('integrations')
    .select('encrypted_access_token, status, last_synced_at')
    .eq('client_id', userId)
    .eq('tool', 'stripe')
    .maybeSingle();

  if (readErr) {
    console.error('[finance] integrations read failed:', readErr);
    return NextResponse.json({ status: 'unavailable', message: 'db_error' });
  }
  if (!row || !row.encrypted_access_token) {
    return NextResponse.json({ status: 'not_connected' });
  }
  if (row.status === 'requires_reconnect' || row.status === 'revoked') {
    return NextResponse.json({ status: 'requires_reconnect' });
  }

  const redis = (() => {
    try { return Redis.fromEnv(); } catch { return null; }
  })();

  // Cache hit fast path.
  if (redis) {
    const cached = await redis.get<FinanceResponse>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  // Live fetch.
  let data;
  try {
    const accessToken = decrypt(row.encrypted_access_token);
    data = await fetchFinanceData(accessToken);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; type?: string; message?: string };
    if (e?.statusCode === 401 || e?.type === 'StripeAuthenticationError') {
      // Mark requires_reconnect and surface that state.
      await supabase
        .from('integrations')
        .update({ status: 'requires_reconnect', last_error: 'stripe_auth_error' })
        .eq('client_id', userId)
        .eq('tool', 'stripe');
      return NextResponse.json({ status: 'requires_reconnect' });
    }
    console.error('[finance] stripe fetch failed:', err);
    return NextResponse.json({ status: 'unavailable', message: e?.message ?? 'fetch_failed' });
  }

  const lastSyncedAt = new Date().toISOString();
  await supabase
    .from('integrations')
    .update({ last_synced_at: lastSyncedAt, last_error: null })
    .eq('client_id', userId)
    .eq('tool', 'stripe');

  const payload: FinanceResponse = {
    status: 'ok',
    data,
    last_synced_at: lastSyncedAt,
    from_cache: false,
  };

  if (redis) {
    // Cache only the success shape, with TTL.
    await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
  }

  return NextResponse.json(payload);
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: PASS. If Stripe's `StripeAuthenticationError` shape doesn't have `statusCode`/`type`, adjust the error-narrowing — Stripe v17+ uses `.type === 'StripeAuthenticationError'`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/finance/route.ts
git commit -m "feat(api): add /api/dashboard/finance live-fetch with 1h Redis cache"
```

---

## Task 11: Extend `/api/integrations` list response

**Files:**
- Modify: `src/app/api/integrations/route.ts`

- [ ] **Step 1: Read current shape and rewrite GET**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ConnectedTool = {
  tool: string;
  connected_at: string;
  status: 'connected' | 'requires_reconnect' | 'revoked';
  external_account_id: string | null;
  last_synced_at: string | null;
};

export async function GET(_req: NextRequest) {
  const clientId = await getCurrentUserId();
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('integrations')
    .select('tool, connected_at, status, external_account_id, last_synced_at')
    .eq('client_id', clientId);

  if (error) {
    return NextResponse.json(
      { error: `Failed to list integrations: ${error.message || JSON.stringify(error)}` },
      { status: 500 },
    );
  }

  const connected: ConnectedTool[] = (data ?? []).map((row) => ({
    tool: row.tool,
    connected_at: row.connected_at,
    status: (row.status ?? 'connected') as ConnectedTool['status'],
    external_account_id: row.external_account_id,
    last_synced_at: row.last_synced_at,
  }));

  return NextResponse.json({ connected });
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/integrations/route.ts
git commit -m "feat(api): include status/last_synced_at/external_account_id in integrations list"
```

---

## Task 12: Reusable `IntegrationCard` + settings page rewrite

**Files:**
- Create: `src/components/dashboard/integration-card.tsx`
- Modify: `src/app/dashboard/settings/integrations/page.tsx`

- [ ] **Step 1: Write `src/components/dashboard/integration-card.tsx`**

```tsx
'use client';

import { cn } from '<npm>/lib/utils';

export type IntegrationCardProps = {
  tool: string;
  label: string;
  blurb: string;
  cardKey: string;
  /** undefined = not connected; otherwise the live state */
  connection?: {
    connected_at: string;
    status: 'connected' | 'requires_reconnect' | 'revoked';
    external_account_id: string | null;
    last_synced_at: string | null;
  };
  /** Whether OAuth is wired for this tool (else "Coming soon"). */
  enabled: boolean;
  onDisconnect?: () => Promise<void> | void;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const fmtRelative = (iso: string | null) => {
  if (!iso) return '—';
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return fmtDate(iso);
};

export function IntegrationCard(props: IntegrationCardProps) {
  const { tool, label, blurb, cardKey, connection, enabled, onDisconnect } = props;
  const isConnected = connection?.status === 'connected';
  const needsReconnect = connection?.status === 'requires_reconnect';

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4',
        !enabled && 'opacity-55',
      )}
    >
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2.5">
          <span className="text-body font-semibold text-[var(--color-fg)]">{label}</span>
          <span className="rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] px-1.5 py-[2px] text-[10.5px] tracking-[0.04em] text-[var(--color-fg-subtle)]">
            {cardKey} card
          </span>
          {isConnected && (
            <span className="flex items-center gap-1 text-[11.5px] text-[var(--color-success)]">
              <span className="size-1.5 rounded-full bg-[var(--color-success)]" /> Connected since {fmtDate(connection!.connected_at)}
            </span>
          )}
          {needsReconnect && (
            <span className="flex items-center gap-1 text-[11.5px] text-[var(--color-warn)]">
              <span className="size-1.5 rounded-full bg-[var(--color-warn)]" /> Disconnected by {label}
            </span>
          )}
        </div>
        <div className="text-body-sm text-[var(--color-fg-muted)]">{blurb}</div>
        {isConnected && (
          <div className="mt-1 text-[11.5px] text-[var(--color-fg-subtle)]">
            Last synced {fmtRelative(connection!.last_synced_at)}
          </div>
        )}
      </div>

      <div className="shrink-0">
        {!enabled ? (
          <span className="text-[12px] text-[var(--color-fg-subtle)]">Coming soon</span>
        ) : isConnected ? (
          <button
            type="button"
            onClick={() => onDisconnect?.()}
            className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[12.5px] text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-fg)]"
          >
            Disconnect
          </button>
        ) : needsReconnect ? (
          <a
            href={`/api/integrations/${tool}/connect`}
            className="rounded-[var(--radius)] bg-[var(--color-warn)] px-3 py-1.5 text-[12.5px] font-medium text-white no-underline hover:opacity-90"
          >
            Reconnect
          </a>
        ) : (
          <a
            href={`/api/integrations/${tool}/connect`}
            className="rounded-[var(--radius)] bg-[var(--color-primary)] px-3 py-1.5 text-[12.5px] font-medium text-white no-underline hover:opacity-90"
          >
            Connect {label}
          </a>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `src/app/dashboard/settings/integrations/page.tsx`**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { IntegrationCard } from '<npm>/components/dashboard/integration-card';

type Connection = {
  tool: string;
  connected_at: string;
  status: 'connected' | 'requires_reconnect' | 'revoked';
  external_account_id: string | null;
  last_synced_at: string | null;
};

type ToolDef = {
  key: string;
  label: string;
  blurb: string;
  cardKey: string;
  enabled: boolean; // wired for OAuth in this build?
};

const TOOL_CATALOG: ToolDef[] = [
  { key: 'stripe',   label: 'Stripe',   blurb: 'Invoiced, paid, overdue',                         cardKey: 'Finance',   enabled: true  },
  { key: 'hubspot',  label: 'HubSpot',  blurb: 'CRM — pipeline value, leads, auto-created deals', cardKey: 'Sales',     enabled: false },
  { key: 'apollo',   label: 'Apollo',   blurb: 'Cold outreach — emails sent, opens, replies',     cardKey: 'Marketing', enabled: false },
  { key: 'calendly', label: 'Calendly', blurb: 'Meetings booked from outreach',                   cardKey: 'Marketing', enabled: false },
  { key: 'clickup',  label: 'ClickUp',  blurb: 'Projects, tasks, deadlines',                      cardKey: 'Delivery',  enabled: false },
  { key: 'asana',    label: 'Asana',    blurb: 'Projects, tasks, deadlines',                      cardKey: 'Delivery',  enabled: false },
  { key: 'toggl',    label: 'Toggl',    blurb: 'Hours tracked, utilization',                      cardKey: 'Delivery',  enabled: false },
];

const ERROR_LABELS: Record<string, string> = {
  user_canceled: 'Connection canceled.',
  missing_params: 'Connection link was incomplete. Please try again.',
  expired: 'The connection link expired. Please try again.',
  missing: 'The connection link expired. Please try again.',
  wrong_tool: 'The connection link mismatched. Please try again.',
  connection_failed: 'Could not exchange the connection token. Please try again.',
  storage_failed: 'Could not save the connection. Please contact support.',
  server_misconfigured: 'OpsRadar is not yet configured to connect this tool. Contact support.',
  tool_not_implemented: 'This tool is not wired up yet.',
};

export default function IntegrationsSettingsPage() {
  const search = useSearchParams();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to load');
        return;
      }
      setConnections(data.connected ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // React to ?connected=stripe / ?error=... query params.
  useEffect(() => {
    const connected = search.get('connected');
    const err = search.get('error');
    const tool = search.get('tool');
    if (connected) {
      setBanner({ kind: 'ok', text: `${connected[0].toUpperCase() + connected.slice(1)} connected.` });
      router.replace('/dashboard/settings/integrations');
      void load();
    } else if (err) {
      setBanner({ kind: 'err', text: ERROR_LABELS[err] ?? `${err}${tool ? ` (${tool})` : ''}` });
      router.replace('/dashboard/settings/integrations');
    }
  }, [search, router, load]);

  async function disconnect(tool: string) {
    if (!confirm(`Disconnect ${tool}? Your dashboard will stop reading from ${tool} until you reconnect.`)) return;
    const res = await fetch(`/api/integrations/${tool}/disconnect`, { method: 'POST' });
    if (res.ok) {
      setBanner({ kind: 'ok', text: `${tool[0].toUpperCase() + tool.slice(1)} disconnected.` });
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setBanner({ kind: 'err', text: data.error ?? 'Disconnect failed.' });
    }
  }

  function connectionFor(tool: string): Connection | undefined {
    return connections.find((c) => c.tool === tool);
  }

  return (
    <>
      <div className="mb-7">
        <h1 className="mb-1.5 font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Connected systems
        </h1>
        <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
          Connect the tools you use. We never store the data — we read it live from each tool when your dashboard opens.
        </p>
      </div>

      {banner && (
        <div
          className={
            banner.kind === 'ok'
              ? 'mb-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_8%,transparent)] px-3 py-2.5 text-[12.5px] text-[var(--color-success)]'
              : 'mb-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-warn)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-warn)_8%,transparent)] px-3 py-2.5 text-[12.5px] text-[var(--color-warn)]'
          }
        >
          {banner.text}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-3 py-2.5 text-[12.5px] text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {loading && !connections.length && (
        <div className="text-[12.5px] text-[var(--color-fg-subtle)]">Loading…</div>
      )}

      <div className="flex flex-col gap-2.5">
        {TOOL_CATALOG.map((t) => (
          <IntegrationCard
            key={t.key}
            tool={t.key}
            label={t.label}
            blurb={t.blurb}
            cardKey={t.cardKey}
            enabled={t.enabled}
            connection={connectionFor(t.key)}
            onDisconnect={() => disconnect(t.key)}
          />
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify `--color-primary`, `--color-warn`, `--color-success` exist**

```bash
grep -E '\-\-color-(primary|warn|success|danger)' /home/lawand/Desktop/my-startup/opsradar/src/app/globals.css | head -10
```

Expected: all four tokens present. If `--color-primary` is named differently (e.g. `--color-accent-500`), substitute throughout.

- [ ] **Step 4: Type-check + lint**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit && npm run lint
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/integration-card.tsx src/app/dashboard/settings/integrations/page.tsx
git commit -m "feat(dashboard): integrations settings page with self-connect (stripe)"
```

---

## Task 13: Finance card UI + insert on dashboard

**Files:**
- Create: `src/components/dashboard/finance-card.tsx`
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Write `src/components/dashboard/finance-card.tsx`**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';

type FinanceData = {
  invoiced: number;
  paid: number;
  overdue: number;
  sparkline: Array<{ date: string; amount: number }>;
  currency: 'USD';
};

type ApiResponse =
  | { status: 'ok'; data: FinanceData; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected' }
  | { status: 'requires_reconnect' }
  | { status: 'unavailable'; message: string };

const fmtCurrency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtRelative = (iso: string) => {
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.round(diffMin / 60)}h ago`;
};

export function FinanceCard() {
  const [resp, setResp] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/dashboard/finance', { cache: 'no-store' });
      const data = (await r.json()) as ApiResponse;
      setResp(data);
    } catch (e) {
      setResp({ status: 'unavailable', message: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-serif text-[16.5px] font-normal text-[var(--color-fg)]">Finance</div>
          <div className="text-[11.5px] text-[var(--color-fg-subtle)]">
            From Stripe · {resp?.status === 'ok' ? `synced ${fmtRelative(resp.last_synced_at)}` : 'live'}
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-[var(--radius)] p-1.5 text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-fg)] disabled:opacity-50"
          aria-label="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && !resp && (
        <div className="text-[12.5px] text-[var(--color-fg-subtle)]">Loading…</div>
      )}

      {resp?.status === 'not_connected' && (
        <div className="flex flex-col items-start gap-2 py-2">
          <div className="text-body-sm text-[var(--color-fg-muted)]">
            Connect Stripe to see invoiced, paid, and overdue.
          </div>
          <Link
            href="/dashboard/settings/integrations"
            className="text-[12.5px] font-medium text-[var(--color-primary)] no-underline hover:underline"
          >
            Go to integrations →
          </Link>
        </div>
      )}

      {resp?.status === 'requires_reconnect' && (
        <div className="flex flex-col items-start gap-2 py-2">
          <div className="text-body-sm text-[var(--color-warn)]">
            Stripe disconnected on their side — please reconnect.
          </div>
          <Link
            href="/dashboard/settings/integrations"
            className="text-[12.5px] font-medium text-[var(--color-warn)] no-underline hover:underline"
          >
            Reconnect Stripe →
          </Link>
        </div>
      )}

      {resp?.status === 'unavailable' && (
        <div className="text-[12.5px] text-[var(--color-fg-subtle)]">
          Stripe is unreachable right now. Try refreshing in a minute.
        </div>
      )}

      {resp?.status === 'ok' && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">Invoiced</div>
            <div className="mt-0.5 font-serif text-[20px] text-[var(--color-fg)]">{fmtCurrency(resp.data.invoiced)}</div>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">Paid</div>
            <div className="mt-0.5 font-serif text-[20px] text-[var(--color-success)]">{fmtCurrency(resp.data.paid)}</div>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">Overdue</div>
            <div className="mt-0.5 font-serif text-[20px] text-[var(--color-warn)]">{fmtCurrency(resp.data.overdue)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Insert FinanceCard onto the dashboard**

Open `src/app/dashboard/page.tsx`. Find where `<FinancialsCard />` is rendered. Add `<FinanceCard />` immediately after it (keep both — the user can decide later whether to replace the old one).

```diff
-import { FinancialsCard } from '<npm>/components/dashboard/financials-card';
+import { FinancialsCard } from '<npm>/components/dashboard/financials-card';
+import { FinanceCard } from '<npm>/components/dashboard/finance-card';
```

Then in the JSX, wherever `<FinancialsCard />` appears:

```diff
 <FinancialsCard />
+<FinanceCard />
```

If the layout uses an explicit grid, slot FinanceCard alongside FinancialsCard following the same column structure. Use the existing card's parent wrapper as a template.

- [ ] **Step 3: Type-check + lint + build**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit && npm run lint && npm run build
```

Expected: all three PASS. `npm run build` is the strictest check — Next.js validates Route Handler types and dynamic params at build time.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/finance-card.tsx src/app/dashboard/page.tsx
git commit -m "feat(dashboard): add FinanceCard powered by /api/dashboard/finance"
```

---

## Task 14: Local smoke test + final verification

**Files:** (none changed)

This task verifies the full flow end-to-end. It requires the prereqs from the top of the plan to be done (Stripe Connect app + 3 env vars in `.env.local`).

- [ ] **Step 1: Confirm env vars present**

```bash
grep -E 'STRIPE_CONNECT_CLIENT_ID|STRIPE_SECRET_KEY|INTEGRATIONS_ENCRYPTION_KEY' /home/lawand/Desktop/my-startup/opsradar/.env.local | sed 's/=.*/=REDACTED/'
```

Expected: 3 lines present.

If any is missing, **STOP and escalate to the user** — the rest of this task can't run without them. (Test-mode Stripe keys are fine; the Connect app must allow `localhost` or use a tunnel like `ngrok` for the callback.)

- [ ] **Step 2: Start the dev server**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run dev
```

Wait for `▲ Next.js ... Ready in Xs`. (Run in background.)

- [ ] **Step 3: Manual browser walkthrough**

In a real browser, signed in as a test user:

1. Visit `/dashboard/settings/integrations`. Expected: Stripe row shows "Connect Stripe" button.
2. Click "Connect Stripe". Expected: redirect to `connect.stripe.com/oauth/authorize?...`.
3. Authorize a test Stripe account. Expected: redirect back to `/dashboard/settings/integrations?connected=stripe`, banner "Stripe connected." appears, row flips to "Connected since …".
4. Visit `/dashboard`. Expected: Finance card shows invoiced/paid/overdue (or zeros if the test account has no data). "From Stripe · synced just now".
5. Click the refresh button on the Finance card. Expected: spinner briefly; "from_cache: false" in the network panel (hit Stripe live), `last_synced_at` updates.
6. Refresh the page (no card-button click). Expected: subsequent fetches return `from_cache: true` within the 1h TTL.
7. Return to `/dashboard/settings/integrations`. Click "Disconnect" on the Stripe row, confirm. Expected: row flips back to "Connect Stripe"; Finance card on `/dashboard` shows "Connect Stripe to see…".
8. Cancel flow: click "Connect Stripe" again; on the Stripe authorize page, click cancel. Expected: redirect to settings page with banner "Connection canceled."

- [ ] **Step 4: Verify no business data persisted**

```
mcp__claude_ai_Supabase__execute_sql(
  project_id="nbdcrmepvwbfbcjqfubr",
  query="select column_name from information_schema.columns where table_name='integrations';"
)
```

Confirm no columns like `last_invoice_amount`, `latest_charge_id`, etc. exist. The only payload-ish columns are `encrypted_access_token` / `encrypted_refresh_token`.

- [ ] **Step 5: Push the branch**

```bash
git push -u origin feat/stripe-integration
```

- [ ] **Step 6: Open a PR (optional, user's call)**

Surface this to the user — they decide whether to PR-then-merge or merge directly.

---

## Self-review

**Spec coverage:**
- ✅ Settings page row → Connect/Disconnect button (Task 12)
- ✅ Generic `/api/integrations/:tool/connect|callback|disconnect` (Tasks 7, 8, 9)
- ✅ Widget data fetch `/api/dashboard/finance` (Task 10)
- ✅ `integrations` table schema extension + `oauth_state` table (Task 1)
- ✅ AES-256-GCM encryption (Task 2)
- ✅ Stripe SDK adapter + OAuth glue + finance shaper (Tasks 5, 6, 6.5)
- ✅ Settings page copy rewrite + states (Task 12)
- ✅ Finance widget contract + UI (Tasks 10, 13)
- ✅ Cache invalidation on disconnect (Task 9)
- ✅ 401 → mark `requires_reconnect` (Task 10)
- ✅ Failure-mode coverage (banner messages in Task 12)

**Plan-time open questions resolved:**
- Env var names: `STRIPE_CONNECT_CLIENT_ID`, `STRIPE_SECRET_KEY`, `INTEGRATIONS_ENCRYPTION_KEY` ✅
- Toast vs banner: inline dismissable banner (simpler, no new dep) ✅
- Currency: hardcoded USD (per v1 non-goals) ✅
- `last_synced_at`: updates on cache miss only (Task 10) ✅
- `?connected=` handling: `useSearchParams` in settings page (Task 12) ✅
- Stripe SDK version: latest, API version `2024-06-20` pinned (Task 5) ✅
- Phase 0 tokens: confirmed in plan — Task 12 Step 3 verifies before continuing ✅
- Finance card empty state: link to settings page (no inline OAuth — v3) ✅

**Placeholder scan:** None. Every step has exact code or an exact command + expected output.

**Type consistency:**
- `FinanceWidgetData` shape consistent in `finance.ts` → `finance/route.ts` → `finance-card.tsx` ✅
- `Connection`/`ConnectedTool` shape consistent across `integrations` API and settings page ✅
- `IntegrationConfig` referenced consistently in registry + connect/callback/disconnect routes ✅

---

## Execution handoff

**Recommended:** Use superpowers:subagent-driven-development with **Codex as the reviewer** for each task (per user feedback memory). Dispatch the `codex:codex-rescue` agent after each implementer subagent returns, instead of the default spec/quality reviewer prompts.

Each Codex review prompt should include:
- The task's full text from this plan
- The exact files changed (`git diff <prev-sha>..HEAD`)
- The spec link: `docs/superpowers/specs/2026-05-11-customer-self-connect-integration-framework-design.md`
- Ask Codex specifically for: (a) does the code match the spec? (b) are there security or correctness bugs? (c) does it match opsradar's existing patterns?

Apply Codex's findings, re-review only if substantive changes were made.
