# API-Key Integrations Framework — v1: Stripe + HubSpot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Codex reviews each task** (per user memory `feedback_codex_for_reviews`): dispatch `codex:codex-rescue` instead of the default spec/quality reviewers.
>
> **Pivot from spec:** This plan supersedes the OAuth design at `docs/superpowers/specs/2026-05-11-customer-self-connect-integration-framework-design.md`. The user cannot register a Stripe Connect platform (country not supported) but the **customer can** create their own restricted API key in their own Stripe account. So v1 ships an **API-key paste model** instead of OAuth. No platform OAuth apps required by OpsRadar's team. Works globally. The customer creates a Restricted Key in Stripe (or a Private App Token in HubSpot), pastes it into our settings page, we encrypt and store it, then live-fetch their dashboard widget data.

**Goal:** Build the reusable customer-self-connect API-key pattern for opsradar dashboard widgets and ship two instantiations in v1: **Stripe** (powers the new Finance card with invoiced/paid/overdue) and **HubSpot** (powers the new SalesLive card with pipeline value/new leads/won deals). Zero customer business data persisted in opsradar.

**Architecture:** Three layers. (1) Per-tool **adapters** that know how to (a) validate an API key with a benign read call, (b) fetch the widget-specific data with that key. (2) Generic **route handlers** (`/api/integrations/[tool]/connect|disconnect`) that POST-accept an API key, encrypt with AES-256-GCM, upsert into the existing `integrations` table. (3) Per-widget **dashboard endpoints** (`/api/dashboard/finance`, `/api/dashboard/sales-live`) that decrypt the stored key, call the tool live, map to widget contract, cache JSON in Upstash Redis (TTL 1h). On any 401: mark `requires_reconnect`.

**Tech Stack:** Next.js 16 App Router (Node runtime), TypeScript, Supabase (Postgres), `stripe` SDK + `@hubspot/api-client` SDK, `@upstash/redis`, AES-256-GCM via Node `crypto`. Tailwind v4 Phase-0 tokens (`--color-success`, `--color-warn`, `--color-danger`, `--color-fg`, `--color-fg-muted`, `--color-fg-subtle`, `--color-border`, `--color-surface`, `--color-surface-sunken`, `--radius`, `--radius-md`, `--radius-sm`).

---

## Prereqs (one-time, low-friction)

These are the *only* setup steps. Customer-facing prereqs (creating their own API keys) are documented inline in the connect dialog — they happen at customer connect time, not at our deploy time.

1. **Generate `INTEGRATIONS_ENCRYPTION_KEY`** (one-time, 32 random bytes base64):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
2. **Set 1 env var** in `.env.local` (and in Vercel for production):
   - `INTEGRATIONS_ENCRYPTION_KEY=<base64 from step 1>`

That's it. No Stripe Connect app. No HubSpot developer app. No OAuth client secrets.

---

## File Structure

### New files

| File | Responsibility |
|---|---|
| `supabase/migrations/20260512_integrations_status_columns.sql` | Adds `status`, `last_synced_at`, `last_error` columns to `integrations` |
| `src/lib/integrations/crypto.ts` | AES-256-GCM `encryptApiKey`/`decryptApiKey` — returns/accepts the 3-column shape (`encrypted_token`, `iv`, `auth_tag`) that the existing table already uses |
| `src/lib/integrations/registry.ts` | Maps tool slug → adapter (validate + fetcher functions). v1: stripe, hubspot |
| `src/lib/integrations/stripe/adapter.ts` | `validateStripeKey(apiKey)` + `fetchStripeFinanceData(apiKey)` |
| `src/lib/integrations/hubspot/adapter.ts` | `validateHubspotToken(apiKey)` + `fetchHubspotSalesData(apiKey)` |
| `src/app/api/integrations/[tool]/connect/route.ts` | POST `{api_key}` → validate → encrypt → upsert |
| `src/app/api/integrations/[tool]/disconnect/route.ts` | DELETE row + invalidate Redis cache |
| `src/app/api/dashboard/finance/route.ts` | Customer-facing Stripe-powered Finance widget endpoint |
| `src/app/api/dashboard/sales-live/route.ts` | Customer-facing HubSpot-powered SalesLive widget endpoint |
| `src/components/dashboard/integration-card.tsx` | Reusable settings page row (Connect / Disconnect / status pill) |
| `src/components/dashboard/connect-key-dialog.tsx` | Modal dialog with per-tool instructions + paste form |
| `src/components/dashboard/finance-card.tsx` | Finance card UI |
| `src/components/dashboard/sales-live-card.tsx` | SalesLive card UI |

### Modified files

| File | Change |
|---|---|
| `src/app/api/integrations/route.ts` | Extend response: include `status`, `last_synced_at` per row |
| `src/app/dashboard/settings/integrations/page.tsx` | Use new `IntegrationCard` + `ConnectKeyDialog`; flip `stripe` and `hubspot` from `coming_soon`/`available` → `enabled: true`; rewrite top copy |
| `src/app/dashboard/page.tsx` | Insert `<FinanceCard />` and `<SalesLiveCard />` (alongside the existing n8n-managed cards — user keeps both; can decide which to remove later) |
| `src/lib/database.types.ts` | Regenerate via Supabase MCP after migration |
| `package.json` | Add `stripe`, `@hubspot/api-client` dependencies |
| `.env.local` (gitignored) | Add `INTEGRATIONS_ENCRYPTION_KEY` |

---

## Task 1: Schema migration — add status columns to `integrations`

**Files:**
- Create: `supabase/migrations/20260512_integrations_status_columns.sql`
- Modify: `src/lib/database.types.ts` (regenerated)

The existing `integrations` schema already has `encrypted_token` + `iv` + `auth_tag` + `client_id` + `tool` + `connected_at` — that's enough to store an encrypted API key. We add three lifecycle columns.

- [ ] **Step 1: Write `20260512_integrations_status_columns.sql`**

```sql
-- API-key integrations: add lifecycle columns to the existing integrations
-- table. The encrypted_token/iv/auth_tag columns continue to store the
-- customer-supplied API key (encrypted AES-256-GCM, base64-encoded).

alter table public.integrations
  add column if not exists status text not null default 'connected'
    check (status in ('connected','requires_reconnect','revoked')),
  add column if not exists last_synced_at timestamptz,
  add column if not exists last_error text,
  add column if not exists external_account_id text;

comment on column public.integrations.status is
  'connected = healthy. requires_reconnect = 401 from provider on last fetch. revoked = team-marked.';
comment on column public.integrations.last_synced_at is
  'Timestamp of the most recent successful live fetch from the provider.';
comment on column public.integrations.last_error is
  'Last redacted error message observed when fetching, if any.';
comment on column public.integrations.external_account_id is
  'Provider-side identifier discovered during validation (e.g. Stripe account.id, HubSpot portal id).';

-- Ensure the upsert key (client_id, tool) is unique — the existing table
-- may already have this; the constraint is idempotent.
create unique index if not exists integrations_client_tool_unique
  on public.integrations (client_id, tool);
```

- [ ] **Step 2: Apply migration via Supabase MCP**

CLI is not authenticated in this environment — use the MCP tool directly. Project ref `nbdcrmepvwbfbcjqfubr`.

```
mcp__claude_ai_Supabase__apply_migration(
  name="20260512_integrations_status_columns",
  query=<contents of the file>
)
```

Expected: success. If the unique index already exists with a different name, the `if not exists` makes the migration safe.

- [ ] **Step 3: Regenerate types**

```
mcp__claude_ai_Supabase__generate_typescript_types(project_id="nbdcrmepvwbfbcjqfubr")
```

Overwrite `src/lib/database.types.ts` with the output. Verify `integrations.Row` now contains `status`, `last_synced_at`, `last_error`, `external_account_id`.

- [ ] **Step 4: Type-check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260512_integrations_status_columns.sql src/lib/database.types.ts
git commit -m "feat(db): add status/last_synced_at/last_error/external_account_id to integrations"
```

---

## Task 2: AES-256-GCM crypto helper

**Files:**
- Create: `src/lib/integrations/crypto.ts`

The existing DB shape uses three separate columns (`encrypted_token`, `iv`, `auth_tag`). The helper API mirrors that shape so route handlers can pass the object straight into `supabase.from('integrations').insert(...)`.

- [ ] **Step 1: Write `src/lib/integrations/crypto.ts`**

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

export type EncryptedSecret = {
  encrypted_token: string; // base64 ciphertext
  iv: string;              // base64 IV (12 bytes)
  auth_tag: string;        // base64 auth tag (16 bytes)
};

function getKey(): Buffer {
  const raw = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!raw) throw new Error('INTEGRATIONS_ENCRYPTION_KEY is not set');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `INTEGRATIONS_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length})`,
    );
  }
  return key;
}

export function encryptApiKey(plaintext: string): EncryptedSecret {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted_token: ct.toString('base64'),
    iv: iv.toString('base64'),
    auth_tag: tag.toString('base64'),
  };
}

export function decryptApiKey(secret: EncryptedSecret): string {
  const key = getKey();
  const iv = Buffer.from(secret.iv, 'base64');
  const tag = Buffer.from(secret.auth_tag, 'base64');
  const ct = Buffer.from(secret.encrypted_token, 'base64');
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}
```

- [ ] **Step 2: Manual verification (one-shot, do not commit)**

No test runner configured in this repo. Verify behavior inline:

```bash
cd /home/lawand/Desktop/my-startup/opsradar && cat > /tmp/verify-crypto.mjs <<'EOF'
import { encryptApiKey, decryptApiKey } from './src/lib/integrations/crypto.ts';
process.env.INTEGRATIONS_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');
const plain = 'sk_test_abc123!@#$%^&*()xyz';
const enc1 = encryptApiKey(plain);
const enc2 = encryptApiKey(plain);
console.log('round-trip:', decryptApiKey(enc1) === plain);
console.log('non-deterministic IV:', enc1.iv !== enc2.iv);
let tampered = false;
try { decryptApiKey({ ...enc1, auth_tag: Buffer.alloc(16, 7).toString('base64') }); }
catch { tampered = true; }
console.log('tamper detected:', tampered);
EOF
npx --yes tsx /tmp/verify-crypto.mjs && rm /tmp/verify-crypto.mjs
```

Expected output:
```
round-trip: true
non-deterministic IV: true
tamper detected: true
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/integrations/crypto.ts
git commit -m "feat(integrations): AES-256-GCM encryptApiKey/decryptApiKey"
```

---

## Task 3: Install SDKs

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm install stripe@latest @hubspot/api-client@latest --save
```

Expected: both packages added. No peer-dep complaints beyond pre-existing ones.

- [ ] **Step 2: Verify**

```bash
grep -E '"(stripe|@hubspot/api-client)"' package.json
```

Expected: both lines present under `dependencies`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add stripe + @hubspot/api-client for v1 integrations"
```

---

## Task 4: Stripe adapter

**Files:**
- Create: `src/lib/integrations/stripe/adapter.ts`

- [ ] **Step 1: Write the adapter**

```ts
import Stripe from 'stripe';

const STRIPE_API_VERSION = '2024-06-20' as const;

function client(apiKey: string): Stripe {
  return new Stripe(apiKey, {
    apiVersion: STRIPE_API_VERSION as unknown as Stripe.LatestApiVersion,
    typescript: true,
    maxNetworkRetries: 2,
  });
}

export type StripeFinanceData = {
  invoiced: number;       // USD, this month-to-date (sum of invoice amount_due)
  paid: number;           // USD, this month-to-date (sum of paid invoice amount_paid)
  overdue: number;        // USD, currently outstanding past due
  sparkline: Array<{ date: string; amount: number }>; // last 30 days, daily charge totals
  currency: 'USD';
};

export type AdapterValidation = {
  ok: true;
  externalAccountId: string;
} | {
  ok: false;
  reason: 'invalid_key' | 'permission' | 'network';
  message: string;
};

/**
 * Validates a Stripe API key by calling /v1/account. Returns the Stripe
 * account id on success. Restricted keys with at least "Read" permission
 * on Account → "View account details" pass; anything weaker fails.
 */
export async function validateStripeKey(apiKey: string): Promise<AdapterValidation> {
  try {
    const stripe = client(apiKey);
    const account = await stripe.accounts.retrieve();
    return { ok: true, externalAccountId: account.id };
  } catch (err: unknown) {
    const e = err as { type?: string; message?: string; statusCode?: number };
    if (e?.type === 'StripeAuthenticationError' || e?.statusCode === 401) {
      return { ok: false, reason: 'invalid_key', message: 'The API key was rejected by Stripe.' };
    }
    if (e?.type === 'StripePermissionError' || e?.statusCode === 403) {
      return {
        ok: false,
        reason: 'permission',
        message: 'The API key lacks the required read permissions.',
      };
    }
    return { ok: false, reason: 'network', message: e?.message ?? 'Could not reach Stripe.' };
  }
}

function unix(d: Date): number { return Math.floor(d.getTime() / 1000); }
function startOfMonthUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
function subDays(d: Date, n: number): Date {
  const out = new Date(d); out.setUTCDate(out.getUTCDate() - n); return out;
}
function dayKey(sec: number): string {
  return new Date(sec * 1000).toISOString().slice(0, 10);
}

/**
 * Live-fetches the connected account's invoices + charges. No persistence.
 * v1 scope: USD only, single API page (limit 100).
 */
export async function fetchStripeFinanceData(apiKey: string): Promise<StripeFinanceData> {
  const stripe = client(apiKey);
  const now = new Date();
  const monthStart = startOfMonthUtc(now);
  const thirtyDaysAgo = subDays(now, 30);
  const nowSec = unix(now);

  const [charges, invoices] = await Promise.all([
    stripe.charges.list({ created: { gte: unix(thirtyDaysAgo) }, limit: 100 }),
    stripe.invoices.list({ created: { gte: unix(monthStart) }, limit: 100 }),
  ]);

  const invoiced = invoices.data.reduce((s, inv) => s + (inv.amount_due ?? 0), 0) / 100;
  const paid = invoices.data
    .filter((inv) => inv.paid === true)
    .reduce((s, inv) => s + (inv.amount_paid ?? 0), 0) / 100;
  const overdue = invoices.data
    .filter((inv) => inv.status === 'open' && inv.due_date != null && inv.due_date < nowSec)
    .reduce((s, inv) => s + (inv.amount_remaining ?? 0), 0) / 100;

  const buckets: Record<string, number> = {};
  for (let i = 0; i < 30; i++) buckets[dayKey(unix(subDays(now, i)))] = 0;
  for (const ch of charges.data) {
    if (ch.status !== 'succeeded') continue;
    const k = dayKey(ch.created);
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

Expected: PASS. If the `apiVersion` cast complains, leave the `as unknown as Stripe.LatestApiVersion` — Stripe's literal type shifts each SDK release.

- [ ] **Step 3: Commit**

```bash
git add src/lib/integrations/stripe/adapter.ts
git commit -m "feat(integrations): Stripe adapter (validate + fetchFinanceData)"
```

---

## Task 5: HubSpot adapter

**Files:**
- Create: `src/lib/integrations/hubspot/adapter.ts`

HubSpot's API-key equivalent is the **Private App Token** (Bearer token from a private app the customer creates in their HubSpot settings → Integrations → Private Apps). It's used identically to an OAuth access token — same SDK, same endpoints — just doesn't expire and doesn't require OAuth.

- [ ] **Step 1: Write the adapter**

```ts
import { Client as HubspotClient } from '@hubspot/api-client';

function client(token: string): HubspotClient {
  return new HubspotClient({ accessToken: token });
}

export type HubspotSalesData = {
  pipeline_value: number;             // sum of `amount` for all open deals (USD)
  open_deals_count: number;
  new_leads: number;                  // contacts created in last 30 days
  deals_won_this_month: number;       // count of deals closed-won this month
  sparkline: Array<{ date: string; deals_created: number }>; // last 30 days
  currency: 'USD';
};

export type AdapterValidation = {
  ok: true;
  externalAccountId: string;
} | {
  ok: false;
  reason: 'invalid_key' | 'permission' | 'network';
  message: string;
};

/**
 * Validates a HubSpot Private App Token by calling the lightest read
 * endpoint (account-info). Returns the portal id on success.
 */
export async function validateHubspotToken(token: string): Promise<AdapterValidation> {
  try {
    // Use HubSpot's account-info endpoint via fetch — it's faster than spinning
    // up the SDK just for a sanity check, and a 401 is unambiguous here.
    const res = await fetch('https://api.hubapi.com/integrations/v1/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      return { ok: false, reason: 'invalid_key', message: 'The token was rejected by HubSpot.' };
    }
    if (res.status === 403) {
      return { ok: false, reason: 'permission', message: 'The token lacks read permissions for CRM data.' };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      return { ok: false, reason: 'network', message: `HubSpot returned ${res.status}: ${text}` };
    }
    const body = (await res.json()) as { portalId?: number };
    if (!body.portalId) {
      return { ok: false, reason: 'network', message: 'HubSpot response did not include a portal id.' };
    }
    return { ok: true, externalAccountId: String(body.portalId) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not reach HubSpot.';
    return { ok: false, reason: 'network', message };
  }
}

const PAGE_LIMIT = 100;
const OPEN_DEAL_STAGES = new Set([
  'appointmentscheduled', 'qualifiedtobuy', 'presentationscheduled',
  'decisionmakerboughtin', 'contractsent',
]);
const WON_STAGE = 'closedwon';

function startOfMonthUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
function daysAgo(now: Date, n: number): Date {
  const d = new Date(now); d.setUTCDate(d.getUTCDate() - n); return d;
}
function dayKey(input: string | Date): string {
  return new Date(input).toISOString().slice(0, 10);
}

/**
 * Live-fetches deals + contacts from HubSpot. No persistence.
 * v1: USD only, 100 results per resource. Custom pipeline stages outside
 * the default set surface as 0 in pipeline/won buckets — acceptable for v1.
 */
export async function fetchHubspotSalesData(token: string): Promise<HubspotSalesData> {
  const hs = client(token);
  const now = new Date();
  const monthStart = startOfMonthUtc(now);
  const thirtyAgo = daysAgo(now, 30);

  const [dealsResp, contactsResp] = await Promise.all([
    hs.crm.deals.basicApi.getPage(
      PAGE_LIMIT,
      undefined,
      ['amount', 'dealstage', 'createdate', 'closedate'],
      undefined,
      undefined,
      false,
    ),
    hs.crm.contacts.basicApi.getPage(
      PAGE_LIMIT,
      undefined,
      ['createdate', 'email'],
      undefined,
      undefined,
      false,
    ),
  ]);

  let pipelineValue = 0;
  let openDealsCount = 0;
  let dealsWonThisMonth = 0;
  const sparkBuckets: Record<string, number> = {};
  for (let i = 0; i < 30; i++) sparkBuckets[dayKey(daysAgo(now, i))] = 0;

  for (const deal of dealsResp.results) {
    const stage = (deal.properties?.dealstage ?? '').toString();
    const amount = Number(deal.properties?.amount ?? 0) || 0;
    const createIso = deal.properties?.createdate;
    const closeIso = deal.properties?.closedate;
    if (OPEN_DEAL_STAGES.has(stage)) {
      pipelineValue += amount;
      openDealsCount += 1;
    }
    if (stage === WON_STAGE && closeIso && new Date(closeIso) >= monthStart) {
      dealsWonThisMonth += 1;
    }
    if (createIso) {
      const k = dayKey(createIso);
      if (k in sparkBuckets) sparkBuckets[k] += 1;
    }
  }

  let newLeads = 0;
  for (const contact of contactsResp.results) {
    const createIso = contact.properties?.createdate;
    if (createIso && new Date(createIso) >= thirtyAgo) newLeads += 1;
  }

  const sparkline = Object.entries(sparkBuckets)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, deals_created]) => ({ date, deals_created }));

  return {
    pipeline_value: pipelineValue,
    open_deals_count: openDealsCount,
    new_leads: newLeads,
    deals_won_this_month: dealsWonThisMonth,
    sparkline,
    currency: 'USD',
  };
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: PASS. If `basicApi.getPage` signature differs in the installed SDK version, the implementer should consult `node_modules/@hubspot/api-client/lib/codegen/crm/deals/api/BasicApi.d.ts` and adjust positionally.

- [ ] **Step 3: Commit**

```bash
git add src/lib/integrations/hubspot/adapter.ts
git commit -m "feat(integrations): HubSpot adapter (validate + fetchSalesData)"
```

---

## Task 6: Tool registry

**Files:**
- Create: `src/lib/integrations/registry.ts`

- [ ] **Step 1: Write the registry**

```ts
import type { ToolName } from '<npm>/lib/integrations';
import { validateStripeKey } from './stripe/adapter';
import { validateHubspotToken } from './hubspot/adapter';

export type ToolValidator = (apiKey: string) => Promise<
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string }
>;

export type ToolMeta = {
  tool: ToolName;
  displayName: string;
  /** URL of the page in the provider where the customer creates the key. */
  createKeyDocsUrl: string;
  /** Short instructions shown above the paste field in the connect dialog. */
  instructions: string;
  /** Validator used by the /connect route. */
  validate: ToolValidator;
};

const REGISTRY: Partial<Record<ToolName, ToolMeta>> = {
  stripe: {
    tool: 'stripe',
    displayName: 'Stripe',
    createKeyDocsUrl: 'https://dashboard.stripe.com/apikeys',
    instructions:
      'In Stripe, go to Developers → API keys → Create restricted key. ' +
      'Permissions needed: "Read" on Charges, Invoices, Account. ' +
      'Paste the key (starts with rk_ or sk_) below.',
    validate: validateStripeKey,
  },
  hubspot: {
    tool: 'hubspot',
    displayName: 'HubSpot',
    createKeyDocsUrl:
      'https://developers.hubspot.com/docs/api/private-apps#create-a-private-app',
    instructions:
      'In HubSpot, go to Settings → Integrations → Private Apps → Create a private app. ' +
      'Scopes needed: crm.objects.deals.read and crm.objects.contacts.read. ' +
      'Paste the access token (Private App Token) below.',
    validate: validateHubspotToken,
  },
};

export function getToolMeta(tool: string): ToolMeta | null {
  return REGISTRY[tool as ToolName] ?? null;
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
git commit -m "feat(integrations): per-tool registry (stripe + hubspot)"
```

---

## Task 7: `POST /api/integrations/[tool]/connect`

**Files:**
- Create: `src/app/api/integrations/[tool]/connect/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { getToolMeta } from '<npm>/lib/integrations/registry';
import { encryptApiKey } from '<npm>/lib/integrations/crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ConnectBody = { api_key?: unknown };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tool: string }> },
): Promise<NextResponse> {
  const { tool } = await params;
  const meta = getToolMeta(tool);
  if (!meta) {
    return NextResponse.json({ error: 'tool_not_supported' }, { status: 404 });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as ConnectBody;
  const apiKey = typeof body.api_key === 'string' ? body.api_key.trim() : '';
  if (apiKey.length < 8) {
    return NextResponse.json(
      { error: 'invalid_input', message: 'API key looks too short.' },
      { status: 400 },
    );
  }

  const validation = await meta.validate(apiKey);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.reason, message: validation.message },
      { status: validation.reason === 'network' ? 502 : 400 },
    );
  }

  const encrypted = encryptApiKey(apiKey);
  const supabase = getServerSupabaseClient();
  const { error: upsertErr } = await supabase
    .from('integrations')
    .upsert(
      {
        client_id: userId,
        tool: meta.tool,
        encrypted_token: encrypted.encrypted_token,
        iv: encrypted.iv,
        auth_tag: encrypted.auth_tag,
        external_account_id: validation.externalAccountId,
        status: 'connected',
        last_error: null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'client_id,tool' },
    );

  if (upsertErr) {
    console.error('[integrations] upsert failed:', upsertErr);
    return NextResponse.json(
      { error: 'storage_failed', message: upsertErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, tool: meta.tool });
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/integrations/\[tool\]/connect/route.ts
git commit -m "feat(api): POST /api/integrations/[tool]/connect (validate + encrypt + upsert)"
```

---

## Task 8: `POST /api/integrations/[tool]/disconnect`

**Files:**
- Create: `src/app/api/integrations/[tool]/disconnect/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { getToolMeta } from '<npm>/lib/integrations/registry';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_KEYS_BY_TOOL: Record<string, string[]> = {
  stripe: ['dash:finance'],
  hubspot: ['dash:sales-live'],
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tool: string }> },
): Promise<NextResponse> {
  const { tool } = await params;
  const meta = getToolMeta(tool);
  if (!meta) {
    return NextResponse.json({ error: 'tool_not_supported' }, { status: 404 });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const { error: delErr } = await supabase
    .from('integrations')
    .delete()
    .eq('client_id', userId)
    .eq('tool', meta.tool);

  if (delErr) {
    return NextResponse.json(
      { error: 'delete_failed', message: delErr.message },
      { status: 500 },
    );
  }

  try {
    const redis = Redis.fromEnv();
    const prefixes = CACHE_KEYS_BY_TOOL[meta.tool] ?? [];
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
git commit -m "feat(api): POST /api/integrations/[tool]/disconnect (delete + cache flush)"
```

---

## Task 9: Extend `/api/integrations` list response

**Files:**
- Modify: `src/app/api/integrations/route.ts`

- [ ] **Step 1: Rewrite GET**

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

## Task 10: Dashboard endpoint `/api/dashboard/finance` (Stripe)

**Files:**
- Create: `src/app/api/dashboard/finance/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import {
  fetchStripeFinanceData,
  type StripeFinanceData,
} from '<npm>/lib/integrations/stripe/adapter';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY = (userId: string) => `dash:finance:${userId}`;

type FinanceResponse =
  | { status: 'ok'; data: StripeFinanceData; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected' }
  | { status: 'requires_reconnect' }
  | { status: 'unavailable'; message: string };

function isStripeAuthError(err: unknown): boolean {
  const e = err as { type?: string; statusCode?: number };
  return e?.type === 'StripeAuthenticationError' || e?.statusCode === 401;
}

export async function GET(_req: NextRequest): Promise<NextResponse<FinanceResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const { data: row, error: readErr } = await supabase
    .from('integrations')
    .select('encrypted_token, iv, auth_tag, status, last_synced_at')
    .eq('client_id', userId)
    .eq('tool', 'stripe')
    .maybeSingle();

  if (readErr) {
    console.error('[finance] integrations read failed:', readErr);
    return NextResponse.json({ status: 'unavailable', message: 'db_error' });
  }
  if (!row || !row.encrypted_token) {
    return NextResponse.json({ status: 'not_connected' });
  }
  if (row.status === 'requires_reconnect' || row.status === 'revoked') {
    return NextResponse.json({ status: 'requires_reconnect' });
  }

  const redis = (() => {
    try { return Redis.fromEnv(); } catch { return null; }
  })();
  if (redis) {
    const cached = await redis.get<FinanceResponse>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  let data: StripeFinanceData;
  try {
    const apiKey = decryptApiKey({
      encrypted_token: row.encrypted_token,
      iv: row.iv,
      auth_tag: row.auth_tag,
    });
    data = await fetchStripeFinanceData(apiKey);
  } catch (err) {
    if (isStripeAuthError(err)) {
      await supabase
        .from('integrations')
        .update({ status: 'requires_reconnect', last_error: 'stripe_auth_error' })
        .eq('client_id', userId)
        .eq('tool', 'stripe');
      return NextResponse.json({ status: 'requires_reconnect' });
    }
    console.error('[finance] stripe fetch failed:', err);
    return NextResponse.json({
      status: 'unavailable',
      message: err instanceof Error ? err.message : 'fetch_failed',
    });
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
    await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
  }
  return NextResponse.json(payload);
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/finance/route.ts
git commit -m "feat(api): /api/dashboard/finance live-fetch + 1h Redis cache"
```

---

## Task 11: Dashboard endpoint `/api/dashboard/sales-live` (HubSpot)

**Files:**
- Create: `src/app/api/dashboard/sales-live/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import {
  fetchHubspotSalesData,
  type HubspotSalesData,
} from '<npm>/lib/integrations/hubspot/adapter';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY = (userId: string) => `dash:sales-live:${userId}`;

type SalesLiveResponse =
  | { status: 'ok'; data: HubspotSalesData; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected' }
  | { status: 'requires_reconnect' }
  | { status: 'unavailable'; message: string };

function isHubspotAuthError(err: unknown): boolean {
  const e = err as { code?: number; statusCode?: number; status?: number };
  return e?.code === 401 || e?.statusCode === 401 || e?.status === 401;
}

export async function GET(_req: NextRequest): Promise<NextResponse<SalesLiveResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const { data: row, error: readErr } = await supabase
    .from('integrations')
    .select('encrypted_token, iv, auth_tag, status, last_synced_at')
    .eq('client_id', userId)
    .eq('tool', 'hubspot')
    .maybeSingle();

  if (readErr) {
    console.error('[sales-live] integrations read failed:', readErr);
    return NextResponse.json({ status: 'unavailable', message: 'db_error' });
  }
  if (!row || !row.encrypted_token) {
    return NextResponse.json({ status: 'not_connected' });
  }
  if (row.status === 'requires_reconnect' || row.status === 'revoked') {
    return NextResponse.json({ status: 'requires_reconnect' });
  }

  const redis = (() => {
    try { return Redis.fromEnv(); } catch { return null; }
  })();
  if (redis) {
    const cached = await redis.get<SalesLiveResponse>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  let data: HubspotSalesData;
  try {
    const token = decryptApiKey({
      encrypted_token: row.encrypted_token,
      iv: row.iv,
      auth_tag: row.auth_tag,
    });
    data = await fetchHubspotSalesData(token);
  } catch (err) {
    if (isHubspotAuthError(err)) {
      await supabase
        .from('integrations')
        .update({ status: 'requires_reconnect', last_error: 'hubspot_auth_error' })
        .eq('client_id', userId)
        .eq('tool', 'hubspot');
      return NextResponse.json({ status: 'requires_reconnect' });
    }
    console.error('[sales-live] hubspot fetch failed:', err);
    return NextResponse.json({
      status: 'unavailable',
      message: err instanceof Error ? err.message : 'fetch_failed',
    });
  }

  const lastSyncedAt = new Date().toISOString();
  await supabase
    .from('integrations')
    .update({ last_synced_at: lastSyncedAt, last_error: null })
    .eq('client_id', userId)
    .eq('tool', 'hubspot');

  const payload: SalesLiveResponse = {
    status: 'ok',
    data,
    last_synced_at: lastSyncedAt,
    from_cache: false,
  };
  if (redis) {
    await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
  }
  return NextResponse.json(payload);
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/sales-live/route.ts
git commit -m "feat(api): /api/dashboard/sales-live live-fetch + 1h Redis cache"
```

---

## Task 12: Settings page UI — IntegrationCard + ConnectKeyDialog + paste flow

**Files:**
- Create: `src/components/dashboard/integration-card.tsx`
- Create: `src/components/dashboard/connect-key-dialog.tsx`
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
  connection?: {
    connected_at: string;
    status: 'connected' | 'requires_reconnect' | 'revoked';
    external_account_id: string | null;
    last_synced_at: string | null;
  };
  enabled: boolean;
  onConnect?: () => void;
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
  const { label, blurb, cardKey, connection, enabled, onConnect, onDisconnect } = props;
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
              <span className="size-1.5 rounded-full bg-[var(--color-warn)]" /> Key rejected — reconnect
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
        ) : (
          <button
            type="button"
            onClick={() => onConnect?.()}
            className={cn(
              'rounded-[var(--radius)] px-3 py-1.5 text-[12.5px] font-medium text-white no-underline hover:opacity-90',
              needsReconnect ? 'bg-[var(--color-warn)]' : 'bg-[var(--color-primary)]',
            )}
          >
            {needsReconnect ? 'Reconnect' : `Connect ${label}`}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/components/dashboard/connect-key-dialog.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';

export type ConnectKeyDialogProps = {
  open: boolean;
  tool: string;
  displayName: string;
  instructions: string;
  createKeyDocsUrl: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function ConnectKeyDialog(props: ConnectKeyDialogProps) {
  const { open, tool, displayName, instructions, createKeyDocsUrl, onClose, onSuccess } = props;
  const [apiKey, setApiKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setApiKey('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/integrations/${tool}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.message ?? body.error ?? `Connection failed (${res.status}).`);
        return;
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="font-serif text-[18px] text-[var(--color-fg)]">Connect {displayName}</h2>
            <p className="mt-1 text-[12.5px] text-[var(--color-fg-muted)]">
              Paste a read-only API key. We encrypt it; the data stays in {displayName}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius)] p-1 text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-sunken)]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-4 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-3 text-[12px] leading-[1.5] text-[var(--color-fg-muted)]">
          <div className="mb-1.5 font-medium text-[var(--color-fg)]">How to create the key</div>
          <p>{instructions}</p>
          <a
            href={createKeyDocsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[var(--color-primary)] no-underline hover:underline"
          >
            Open {displayName} <ExternalLink size={11} />
          </a>
        </div>

        <form onSubmit={submit}>
          <label className="block text-[11.5px] font-medium text-[var(--color-fg)]">API key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={tool === 'stripe' ? 'rk_live_… or sk_live_…' : 'pat-…'}
            autoComplete="off"
            spellCheck={false}
            required
            className="mt-1 w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]"
          />

          {error && (
            <div className="mt-3 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-3 py-2 text-[12px] text-[var(--color-danger)]">
              {error}
            </div>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--radius)] px-3 py-1.5 text-[12.5px] text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-sunken)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || apiKey.length < 8}
              className="rounded-[var(--radius)] bg-[var(--color-primary)] px-3 py-1.5 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `src/app/dashboard/settings/integrations/page.tsx`**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { IntegrationCard } from '<npm>/components/dashboard/integration-card';
import { ConnectKeyDialog } from '<npm>/components/dashboard/connect-key-dialog';

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
  enabled: boolean;
  instructions: string;
  createKeyDocsUrl: string;
};

const TOOL_CATALOG: ToolDef[] = [
  {
    key: 'stripe',
    label: 'Stripe',
    blurb: 'Invoiced, paid, overdue',
    cardKey: 'Finance',
    enabled: true,
    instructions:
      'In Stripe, go to Developers → API keys → Create restricted key. Permissions: Read on Charges, Invoices, Account. Paste the key (rk_… or sk_…) below.',
    createKeyDocsUrl: 'https://dashboard.stripe.com/apikeys',
  },
  {
    key: 'hubspot',
    label: 'HubSpot',
    blurb: 'CRM — pipeline value, leads, won deals',
    cardKey: 'Sales',
    enabled: true,
    instructions:
      'In HubSpot, go to Settings → Integrations → Private Apps → Create a private app. Scopes: crm.objects.deals.read + crm.objects.contacts.read. Paste the Private App Token below.',
    createKeyDocsUrl: 'https://developers.hubspot.com/docs/api/private-apps#create-a-private-app',
  },
  { key: 'apollo',   label: 'Apollo',   blurb: 'Cold outreach — emails sent, opens, replies', cardKey: 'Marketing', enabled: false, instructions: '', createKeyDocsUrl: '' },
  { key: 'calendly', label: 'Calendly', blurb: 'Meetings booked from outreach',               cardKey: 'Marketing', enabled: false, instructions: '', createKeyDocsUrl: '' },
  { key: 'clickup',  label: 'ClickUp',  blurb: 'Projects, tasks, deadlines',                  cardKey: 'Delivery',  enabled: false, instructions: '', createKeyDocsUrl: '' },
  { key: 'asana',    label: 'Asana',    blurb: 'Projects, tasks, deadlines',                  cardKey: 'Delivery',  enabled: false, instructions: '', createKeyDocsUrl: '' },
  { key: 'toggl',    label: 'Toggl',    blurb: 'Hours tracked, utilization',                  cardKey: 'Delivery',  enabled: false, instructions: '', createKeyDocsUrl: '' },
];

export default function IntegrationsSettingsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [dialogTool, setDialogTool] = useState<ToolDef | null>(null);

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

  useEffect(() => { load(); }, [load]);

  async function disconnect(tool: string) {
    if (!confirm(`Disconnect ${tool}? Your dashboard will stop reading from ${tool}.`)) return;
    const res = await fetch(`/api/integrations/${tool}/disconnect`, { method: 'POST' });
    if (res.ok) {
      setBanner({ kind: 'ok', text: `${tool[0].toUpperCase() + tool.slice(1)} disconnected.` });
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setBanner({ kind: 'err', text: data.message ?? data.error ?? 'Disconnect failed.' });
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
            onConnect={() => setDialogTool(t)}
            onDisconnect={() => disconnect(t.key)}
          />
        ))}
      </div>

      <ConnectKeyDialog
        open={dialogTool !== null}
        tool={dialogTool?.key ?? ''}
        displayName={dialogTool?.label ?? ''}
        instructions={dialogTool?.instructions ?? ''}
        createKeyDocsUrl={dialogTool?.createKeyDocsUrl ?? ''}
        onClose={() => setDialogTool(null)}
        onSuccess={() => {
          const label = dialogTool?.label;
          setDialogTool(null);
          setBanner({ kind: 'ok', text: `${label} connected.` });
          void load();
        }}
      />
    </>
  );
}
```

- [ ] **Step 4: Verify Phase-0 tokens exist**

```bash
grep -E '\-\-color-(primary|warn|success|danger)' /home/lawand/Desktop/my-startup/opsradar/src/app/globals.css | head -10
```

Expected: all four tokens present. If any are renamed (e.g. `--color-accent-500`), substitute throughout the three new components.

- [ ] **Step 5: Type-check + lint**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit && npm run lint
```

Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/integration-card.tsx \
        src/components/dashboard/connect-key-dialog.tsx \
        src/app/dashboard/settings/integrations/page.tsx
git commit -m "feat(dashboard): API-key paste flow for integrations (stripe + hubspot)"
```

---

## Task 13: Finance card + SalesLive card on `/dashboard`

**Files:**
- Create: `src/components/dashboard/finance-card.tsx`
- Create: `src/components/dashboard/sales-live-card.tsx`
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
      setResp((await r.json()) as ApiResponse);
    } catch (e) {
      setResp({ status: 'unavailable', message: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-serif text-[16.5px] font-normal text-[var(--color-fg)]">Finance (live)</div>
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

      {loading && !resp && <div className="text-[12.5px] text-[var(--color-fg-subtle)]">Loading…</div>}

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
            Stripe rejected the key — reconnect required.
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

- [ ] **Step 2: Write `src/components/dashboard/sales-live-card.tsx`**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';

type SalesData = {
  pipeline_value: number;
  open_deals_count: number;
  new_leads: number;
  deals_won_this_month: number;
  sparkline: Array<{ date: string; deals_created: number }>;
  currency: 'USD';
};

type ApiResponse =
  | { status: 'ok'; data: SalesData; last_synced_at: string; from_cache: boolean }
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

export function SalesLiveCard() {
  const [resp, setResp] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/dashboard/sales-live', { cache: 'no-store' });
      setResp((await r.json()) as ApiResponse);
    } catch (e) {
      setResp({ status: 'unavailable', message: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-serif text-[16.5px] font-normal text-[var(--color-fg)]">Sales (live)</div>
          <div className="text-[11.5px] text-[var(--color-fg-subtle)]">
            From HubSpot · {resp?.status === 'ok' ? `synced ${fmtRelative(resp.last_synced_at)}` : 'live'}
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

      {loading && !resp && <div className="text-[12.5px] text-[var(--color-fg-subtle)]">Loading…</div>}

      {resp?.status === 'not_connected' && (
        <div className="flex flex-col items-start gap-2 py-2">
          <div className="text-body-sm text-[var(--color-fg-muted)]">
            Connect HubSpot to see pipeline, leads, and won deals.
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
            HubSpot rejected the token — reconnect required.
          </div>
          <Link
            href="/dashboard/settings/integrations"
            className="text-[12.5px] font-medium text-[var(--color-warn)] no-underline hover:underline"
          >
            Reconnect HubSpot →
          </Link>
        </div>
      )}

      {resp?.status === 'unavailable' && (
        <div className="text-[12.5px] text-[var(--color-fg-subtle)]">
          HubSpot is unreachable right now. Try refreshing in a minute.
        </div>
      )}

      {resp?.status === 'ok' && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">Pipeline</div>
            <div className="mt-0.5 font-serif text-[20px] text-[var(--color-fg)]">{fmtCurrency(resp.data.pipeline_value)}</div>
            <div className="text-[10.5px] text-[var(--color-fg-subtle)]">{resp.data.open_deals_count} open</div>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">New leads</div>
            <div className="mt-0.5 font-serif text-[20px] text-[var(--color-success)]">{resp.data.new_leads}</div>
            <div className="text-[10.5px] text-[var(--color-fg-subtle)]">last 30 days</div>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">Won this month</div>
            <div className="mt-0.5 font-serif text-[20px] text-[var(--color-success)]">{resp.data.deals_won_this_month}</div>
            <div className="text-[10.5px] text-[var(--color-fg-subtle)]">deals</div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Insert both on `/dashboard`**

Open `src/app/dashboard/page.tsx`. Add imports:

```diff
+import { FinanceCard } from '<npm>/components/dashboard/finance-card';
+import { SalesLiveCard } from '<npm>/components/dashboard/sales-live-card';
```

Insert `<FinanceCard />` immediately after `<FinancialsCard />` and `<SalesLiveCard />` immediately after `<SalesCard />`. Keep both old + new cards — match the existing wrapper/grid structure so layout stays consistent.

- [ ] **Step 4: Type-check + lint + build**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit && npm run lint && npm run build
```

Expected: all three PASS. `npm run build` is the strictest check.

- [ ] **Step 5: Commit + push**

```bash
git add src/components/dashboard/finance-card.tsx \
        src/components/dashboard/sales-live-card.tsx \
        src/app/dashboard/page.tsx
git commit -m "feat(dashboard): add FinanceCard + SalesLiveCard powered by live API-key adapters"
git push -u origin feat/stripe-integration
```

---

## Self-review

**Spec coverage** (where the API-key model maps to the original OAuth spec):
- ✅ Settings page row → Connect (paste dialog) / Disconnect (Task 12)
- ✅ Generic `/api/integrations/[tool]/connect|disconnect` (Tasks 7, 8)
- ✅ Widget data fetch + cache + 401 handling (Tasks 10, 11)
- ✅ Encrypted secret storage (Task 2)
- ✅ Tool registry for instructions + validation (Task 6)
- ✅ Stripe finance + HubSpot sales (Tasks 4, 5)
- ✅ UI states: connected/not_connected/requires_reconnect/unavailable (Tasks 12, 13)
- ✅ Failure modes: invalid key, permission denied, network — all mapped to user-readable messages (Tasks 4, 5, 7)
- ✅ Pivot from OAuth → API-key documented at the top

**Resolved open questions:**
- Env vars: just `INTEGRATIONS_ENCRYPTION_KEY` ✅
- Toast vs banner: inline banner ✅
- Currency: hardcoded USD ✅
- `last_synced_at`: cache-miss only (Tasks 10, 11) ✅
- Sales/Finance card empty state: link to settings page ✅
- Phase-0 tokens: Task 12 Step 4 verifies before proceeding ✅
- Connect UX: dialog with per-tool instructions + paste field (Task 12 Step 2) ✅
- Customer creates restricted/limited-scope keys: instructions inline ✅

**Placeholder scan:** None. Every step has exact code or an exact command + expected output.

**Type consistency:**
- `StripeFinanceData` consistent in `stripe/adapter.ts` → `finance/route.ts` → `finance-card.tsx` ✅
- `HubspotSalesData` consistent in `hubspot/adapter.ts` → `sales-live/route.ts` → `sales-live-card.tsx` ✅
- `EncryptedSecret` shape matches `integrations` DB columns ✅
- `Connection` shape consistent across list API + settings page + IntegrationCard ✅
- `AdapterValidation` shape shared by both adapters and consumed by `/connect` route ✅

**Skipped (per user direction):**
- ❌ Local end-to-end smoke test — user explicitly opted out: "why I have to test it." The customer connects when ready.

---

## Execution handoff

Per user memory `feedback_codex_for_reviews`: each task gets a Codex review (`codex:codex-rescue`) after the implementer subagent finishes, instead of the default spec/quality reviewers.

Each Codex review prompt should include:
- The task's full text from this plan
- The exact files changed (`git diff <prev-sha>..HEAD`)
- The pivot note at top of this plan
- Specifically ask Codex: (a) does the code match the plan? (b) are there security or correctness bugs (secret handling, race conditions, error swallowing)? (c) does it match opsradar's existing patterns?

Apply Codex findings; re-review only if substantive changes were made.
