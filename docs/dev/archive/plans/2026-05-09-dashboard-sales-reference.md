# Dashboard Live-Data Foundation + Sales/HubSpot Reference Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the data-fetching foundation (token storage, encryption, cache helper) and the Sales widget (HubSpot CRM) end-to-end as the reference implementation. Once shipped, every subsequent dashboard widget is a mechanical copy of the same pattern.

**Reference-widget choice:** Originally Stripe Finance, swapped to HubSpot Sales because Stripe isn't available in the user's country. Architecture is unchanged — same n8n + cache + integrations table — only the specific tool, endpoints, and widget shape differ.

**Architecture:** Browser → Next.js API route → Upstash Redis cache (180s TTL) → n8n webhook → HubSpot API → response. Tokens stored encrypted (AES-256-GCM) in Supabase, never in app source. Agency role only — end-client portal is a future plan.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (Postgres + Auth), Upstash Redis (already in stack), n8n (hosted externally), HubSpot CRM API (Private App auth), Node crypto.

**Source spec:** [docs/superpowers/specs/2026-05-09-dashboard-live-data-design.md](../specs/2026-05-09-dashboard-live-data-design.md)

**Out of scope for this plan (handled in later plans):**
- Hero block ($ saved this month)
- Workflow Health strip
- Marketing/Delivery/Finance widgets
- End-client role / portal
- OAuth Connect for HubSpot (v1 uses Private App access token)
- Per-workflow ROI config

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | Supabase migration | `integrations` table with RLS |
| Create | `src/lib/encryption.ts` | AES-256-GCM encrypt/decrypt of tokens |
| Create | `src/lib/integrations.ts` | Read/write encrypted tokens by `client_id` + `tool` |
| Create | `src/lib/dashboard-fetch.ts` | Shared helper: cache check → n8n call → cache write |
| Create | `src/app/api/dashboard/sales/route.ts` | Sales widget API endpoint |
| Create | `src/app/api/integrations/hubspot/route.ts` | POST (connect) / DELETE (disconnect) HubSpot |
| Create | `src/components/dashboard/sales-card.tsx` | Sales widget UI, all 5 states |
| Create | `src/components/dashboard/connect-hubspot-modal.tsx` | Private-App-token entry modal |
| Modify | `src/app/dashboard/page.tsx` | Replace static sales section with `<SalesCard />` |
| Modify | `.env.local` (gitignored) | Add `OPSRADAR_TOKEN_KEY`, `N8N_BASE_URL`, `N8N_WEBHOOK_SECRET` |
| External | n8n instance | New workflow `dashboard-sales-hubspot` |

---

## Task 1: Add `integrations` Supabase table

**Files:**
- Create: Supabase migration via MCP `apply_migration`
- Modify: `src/lib/database.types.ts` (regenerated)

- [ ] **Step 1: Apply the migration**

Use the Supabase MCP tool `apply_migration` with name `create_integrations_table` and this SQL:

```sql
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  tool text not null check (tool in ('stripe','hubspot','clickup','asana','toggl','harvest','google_ads','meta_ads','calendly','quickbooks','pipedrive','salesforce','monday')),
  encrypted_token text not null,
  iv text not null,
  auth_tag text not null,
  connected_at timestamptz not null default now(),
  unique(client_id, tool)
);

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

create index idx_integrations_client_tool on public.integrations(client_id, tool);
```

- [ ] **Step 2: Regenerate Supabase types**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run types:supabase
```

Expected: no errors; `src/lib/database.types.ts` now includes `integrations` table.

- [ ] **Step 3: Verify table exists**

Use Supabase MCP `list_tables` to confirm `integrations` is present in the `public` schema.

- [ ] **Step 4: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/lib/database.types.ts
git commit -m "feat(db): add integrations table for encrypted tool credentials"
```

---

## Task 2: Token encryption helper

**Files:**
- Create: `src/lib/encryption.ts`

- [ ] **Step 1: Add `OPSRADAR_TOKEN_KEY` to `.env.local`**

Generate a 32-byte hex key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and add to `/home/lawand/Desktop/my-startup/opsradar/.env.local`:

```
OPSRADAR_TOKEN_KEY=<paste-the-64-hex-chars-here>
```

- [ ] **Step 2: Create `src/lib/encryption.ts`**

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const hex = process.env.OPSRADAR_TOKEN_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('OPSRADAR_TOKEN_KEY must be a 64-char hex string (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

export type EncryptedBlob = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

export function encryptToken(plaintext: string): EncryptedBlob {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decryptToken(blob: EncryptedBlob): string {
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(blob.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(blob.authTag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(blob.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}
```

- [ ] **Step 3: Smoke test the helper**

Inline test using Node's crypto directly to confirm the env key is valid:

```bash
cd /home/lawand/Desktop/my-startup/opsradar && cat > /tmp/enc-test.mjs << 'EOF'
import { config } from 'dotenv';
config({ path: '.env.local' });

const { createCipheriv, createDecipheriv, randomBytes } = await import('crypto');

const key = Buffer.from(process.env.OPSRADAR_TOKEN_KEY, 'hex');
const iv = randomBytes(12);
const cipher = createCipheriv('aes-256-gcm', key, iv);
const ct = Buffer.concat([cipher.update('pat-na1-secret', 'utf8'), cipher.final()]);
const tag = cipher.getAuthTag();

const decipher = createDecipheriv('aes-256-gcm', key, iv);
decipher.setAuthTag(tag);
const pt = Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');

console.log(pt === 'pat-na1-secret' ? 'OK' : 'FAIL');
EOF
node /tmp/enc-test.mjs
```

Expected: `OK`. If `FAIL` or error, the env key is wrong length or missing — fix before proceeding.

- [ ] **Step 4: TypeScript check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -10
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/lib/encryption.ts
git commit -m "feat(security): add AES-256-GCM token encryption helpers"
```

---

## Task 3: Integrations library

**Files:**
- Create: `src/lib/integrations.ts`

- [ ] **Step 1: Create `src/lib/integrations.ts`**

```ts
import { createServerClient } from '@/lib/supabase-server';
import { encryptToken, decryptToken, type EncryptedBlob } from '@/lib/encryption';

export type ToolName =
  | 'stripe' | 'hubspot' | 'clickup' | 'asana' | 'toggl' | 'harvest'
  | 'google_ads' | 'meta_ads' | 'calendly' | 'quickbooks' | 'pipedrive'
  | 'salesforce' | 'monday';

export async function getIntegrationToken(
  clientId: string,
  tool: ToolName
): Promise<string | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('integrations')
    .select('encrypted_token, iv, auth_tag')
    .eq('client_id', clientId)
    .eq('tool', tool)
    .maybeSingle();

  if (error) throw new Error(`Failed to read integration: ${error.message}`);
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
  const supabase = await createServerClient();
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
  const supabase = await createServerClient();
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
  const supabase = await createServerClient();
  const { count, error } = await supabase
    .from('integrations')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('tool', tool);

  if (error) throw new Error(`Failed to check integration: ${error.message}`);
  return (count ?? 0) > 0;
}
```

- [ ] **Step 2: Verify the supabase-server import path matches existing convention**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && grep -E "^export" src/lib/supabase-server.ts | head -5
```

If the export name differs (e.g. `createClient` instead of `createServerClient`), adjust the import on line 1 of `integrations.ts` to match.

- [ ] **Step 3: TypeScript check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/lib/integrations.ts
git commit -m "feat(integrations): add token storage CRUD with encryption"
```

---

## Task 4: Dashboard-fetch shared helper

**Files:**
- Create: `src/lib/dashboard-fetch.ts`
- Modify: `.env.local` — add `N8N_BASE_URL` and `N8N_WEBHOOK_SECRET`

- [ ] **Step 1: Add n8n env vars to `.env.local`**

Ask the user for the n8n hosted URL (they have it hosted externally). Then add to `/home/lawand/Desktop/my-startup/opsradar/.env.local`:

```
N8N_BASE_URL=<the n8n hosted URL, e.g. https://n8n.example.com>
N8N_WEBHOOK_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

- [ ] **Step 2: Verify Upstash Redis client is available**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && grep -E '"@upstash/redis"' package.json
```

Expected: shows the dep with a version. If missing, run `npm install @upstash/redis`.

- [ ] **Step 3: Verify rate-limit lib already imports redis (to follow same client pattern)**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && head -30 src/lib/rate-limit.ts
```

Note the import pattern (`Redis.fromEnv()` or explicit construction). Use the same pattern in the new file so we stay consistent with the existing Redis usage.

- [ ] **Step 4: Create `src/lib/dashboard-fetch.ts`**

```ts
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const CACHE_TTL_SECONDS = 180;
const STALE_TTL_SECONDS = 60 * 60 * 24; // 24h backup for stale-while-error

export type WidgetFetchOptions = {
  widget: string;
  clientId: string;
  n8nWorkflow: string;
  payload: Record<string, unknown>;
  fresh?: boolean;
};

export type WidgetFetchResult<T> =
  | { status: 'ok'; data: T; fromCache: boolean }
  | { status: 'error'; message: string; staleData?: T; staleAgeMs?: number };

export async function fetchDashboardWidget<T>(
  opts: WidgetFetchOptions
): Promise<WidgetFetchResult<T>> {
  const cacheKey = `dash:${opts.widget}:${opts.clientId}`;
  const staleKey = `${cacheKey}:stale`;

  // 1. Try cache (unless fresh forced)
  if (!opts.fresh) {
    const cached = await redis.get<{ data: T; ts: number }>(cacheKey);
    if (cached) {
      return { status: 'ok', data: cached.data, fromCache: true };
    }
  }

  // 2. Call n8n
  const baseUrl = process.env.N8N_BASE_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!baseUrl || !secret) {
    return { status: 'error', message: 'n8n is not configured (missing env vars)' };
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/webhook/${opts.n8nWorkflow}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-opsradar-secret': secret,
      },
      body: JSON.stringify(opts.payload),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    const stale = await redis.get<{ data: T; ts: number }>(staleKey);
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'n8n call failed',
      ...(stale && { staleData: stale.data, staleAgeMs: Date.now() - stale.ts }),
    };
  }

  if (!response.ok) {
    const stale = await redis.get<{ data: T; ts: number }>(staleKey);
    return {
      status: 'error',
      message: `n8n returned ${response.status}`,
      ...(stale && { staleData: stale.data, staleAgeMs: Date.now() - stale.ts }),
    };
  }

  const data = (await response.json()) as T;

  // 3. Write cache (fresh + long-lived stale backup)
  const wrapped = { data, ts: Date.now() };
  await Promise.all([
    redis.set(cacheKey, wrapped, { ex: CACHE_TTL_SECONDS }),
    redis.set(staleKey, wrapped, { ex: STALE_TTL_SECONDS }),
  ]);

  return { status: 'ok', data, fromCache: false };
}
```

- [ ] **Step 5: TypeScript check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -10
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/lib/dashboard-fetch.ts
git commit -m "feat(dashboard): add shared widget fetch helper with cache + n8n call"
```

---

## Task 5: Set up n8n workflow `dashboard-sales-hubspot`

**Files:**
- External: n8n instance at `$N8N_BASE_URL`
- Create: `docs/integrations/n8n-dashboard-sales-hubspot.md`

This task is performed in the n8n UI by the user (Claude can't reach n8n). After completion, the workflow ID is `dashboard-sales-hubspot`.

- [ ] **Step 1: Verify n8n is reachable**

```bash
curl -s -o /dev/null -w "%{http_code}\n" "$N8N_BASE_URL/healthz"
```

(Substitute the actual N8N_BASE_URL.) Expected: `200`. If not, n8n needs to be started.

- [ ] **Step 2: Create the workflow in n8n UI**

In the n8n web UI:

1. Click **+ New Workflow** → name it `dashboard-sales-hubspot`
2. Add a **Webhook** trigger node:
   - HTTP Method: `POST`
   - Path: `dashboard-sales-hubspot`
   - Authentication: Header Auth → header name `x-opsradar-secret`, value = `$N8N_WEBHOOK_SECRET` from `.env.local`
   - Response Mode: `When last node finishes`
3. Add an **HTTP Request** node named `OpenDeals`:
   - Method: `GET`
   - URL: `https://api.hubapi.com/crm/v3/objects/deals?properties=amount,dealstage,createdate&limit=100&archived=false`
   - Authentication: Header Auth → name `Authorization`, value: `Bearer {{ $json.body.hubspot_token }}`
   - On error: `Continue (using error output)`
4. Add an **HTTP Request** node named `RecentContacts`:
   - Method: `POST`
   - URL: `https://api.hubapi.com/crm/v3/objects/contacts/search`
   - Same Authorization header
   - Body (JSON):
     ```json
     {
       "filterGroups": [{
         "filters": [{
           "propertyName": "createdate",
           "operator": "GTE",
           "value": "{{ Date.now() - 14 * 24 * 60 * 60 * 1000 }}"
         }]
       }],
       "properties": ["createdate", "hs_analytics_source", "hs_analytics_source_data_1"],
       "limit": 100
     }
     ```
5. Add a **Code (JavaScript)** node that aggregates into the widget contract:

```js
// inputs:
// - OpenDeals: { results: [{ properties: { amount, dealstage } }, ...] }
// - RecentContacts: { results: [{ properties: { createdate, hs_analytics_source, ... } }, ...] }

const dealsItems = $('OpenDeals').all()[0]?.json?.results ?? [];
const contactsItems = $('RecentContacts').all()[0]?.json?.results ?? [];

// Pipeline value = sum of `amount` on deals NOT in closedwon/closedlost stages
const closedStages = new Set(['closedwon', 'closedlost']);
const pipelineValue = dealsItems
  .filter(d => !closedStages.has((d.properties.dealstage || '').toLowerCase()))
  .reduce((s, d) => s + (parseFloat(d.properties.amount) || 0), 0);

// New leads = total contacts created in window
const newLeads = contactsItems.length;

// Auto-created leads = subset whose source indicates automation/integration
// HubSpot source values include OFFLINE, DIRECT_TRAFFIC, ORGANIC_SEARCH, INTEGRATION, etc.
// We treat 'INTEGRATION' as the automation signal.
const autoLeads = contactsItems.filter(c => {
  const src = (c.properties.hs_analytics_source || '').toUpperCase();
  return src === 'INTEGRATION' || src === 'API';
}).length;

// 14-day sparkline of daily lead counts
const sparkline = [];
const now = Date.now();
for (let d = 13; d >= 0; d--) {
  const dayStart = now - (d + 1) * 86400_000;
  const dayEnd = now - d * 86400_000;
  const dayCount = contactsItems.filter(c => {
    const t = parseInt(c.properties.createdate, 10);
    return t >= dayStart && t < dayEnd;
  }).length;
  sparkline.push(dayCount);
}

return [{
  json: {
    pipeline_value: pipelineValue,
    new_leads: newLeads,
    auto_leads: autoLeads,
    sparkline,
    period_label: 'Last 14 days',
  },
}];
```

6. Add a **Respond to Webhook** node connected after the Code node, returning the JSON.
7. **Save & Activate** the workflow.

- [ ] **Step 3: Verify the webhook is reachable**

Get a HubSpot Private App access token. In HubSpot: **Settings → Integrations → Private Apps → Create private app** with scopes `crm.objects.deals.read` and `crm.objects.contacts.read`. Token format: `pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.

```bash
N8N_BASE_URL="<your n8n url>"
SECRET=$(grep N8N_WEBHOOK_SECRET /home/lawand/Desktop/my-startup/opsradar/.env.local | cut -d= -f2)
curl -s -X POST "$N8N_BASE_URL/webhook/dashboard-sales-hubspot" \
  -H "x-opsradar-secret: $SECRET" \
  -H "content-type: application/json" \
  -d '{"hubspot_token": "pat-na1-PASTE_TOKEN_HERE", "client_id": "fake-uuid"}'
```

Expected: JSON with `pipeline_value`, `new_leads`, `auto_leads`, `sparkline`, `period_label`. If 401: secret header mismatch. If 5xx: check n8n execution log.

- [ ] **Step 4: Document the workflow**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && mkdir -p docs/integrations
```

Create `docs/integrations/n8n-dashboard-sales-hubspot.md` with the workflow steps above (so a future engineer can rebuild it).

- [ ] **Step 5: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add docs/integrations/n8n-dashboard-sales-hubspot.md
git commit -m "docs(integrations): document n8n dashboard-sales-hubspot workflow"
```

---

## Task 6: Sales API route

**Files:**
- Create: `src/app/api/dashboard/sales/route.ts`

- [ ] **Step 1: Check the auth pattern used by existing API routes**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && grep -l "auth.getUser\|getSession\|getClaims" src/app/api/**/*.ts 2>/dev/null | head -3
```

Open one of those files and note the exact session/user retrieval pattern. Use the same pattern in the new route.

- [ ] **Step 2: Create `src/app/api/dashboard/sales/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { fetchDashboardWidget } from '@/lib/dashboard-fetch';
import { getIntegrationToken, isIntegrationConnected } from '@/lib/integrations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SalesWidgetData = {
  pipeline_value: number;
  new_leads: number;
  auto_leads: number;
  sparkline: number[];
  period_label: string;
};

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const clientId = userData.user.id;

  // Connection check first — distinguishes "not connected" from "errored"
  const connected = await isIntegrationConnected(clientId, 'hubspot');
  if (!connected) {
    return NextResponse.json({ status: 'not_connected', tool: 'hubspot' });
  }

  const hubspotToken = await getIntegrationToken(clientId, 'hubspot');
  if (!hubspotToken) {
    return NextResponse.json({ status: 'not_connected', tool: 'hubspot' });
  }

  const fresh = req.nextUrl.searchParams.get('fresh') === '1';

  const result = await fetchDashboardWidget<SalesWidgetData>({
    widget: 'sales',
    clientId,
    n8nWorkflow: 'dashboard-sales-hubspot',
    payload: { hubspot_token: hubspotToken, client_id: clientId },
    fresh,
  });

  return NextResponse.json(result);
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -10
```

Expected: zero errors.

- [ ] **Step 4: Smoke-test the route (without a connected HubSpot yet)**

Make sure dev server is running, then:

```bash
curl -s http://localhost:3000/api/dashboard/sales
```

Expected: `{"error":"unauthorized"}` (because no session cookie). That confirms the route loads and the auth check works.

- [ ] **Step 5: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/app/api/dashboard/sales/route.ts
git commit -m "feat(dashboard): add /api/dashboard/sales live-fetch route"
```

---

## Task 7: HubSpot connect flow API

**Files:**
- Create: `src/app/api/integrations/hubspot/route.ts`

- [ ] **Step 1: Create `src/app/api/integrations/hubspot/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { setIntegrationToken, deleteIntegration } from '@/lib/integrations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const accessToken = typeof body?.access_token === 'string' ? body.access_token.trim() : '';

  if (!accessToken.startsWith('pat-')) {
    return NextResponse.json(
      { error: 'invalid HubSpot Private App token — expected pat-...' },
      { status: 400 }
    );
  }

  // Validate the token against HubSpot before storing
  const probe = await fetch('https://api.hubapi.com/account-info/v3/details', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!probe.ok) {
    return NextResponse.json(
      { error: `HubSpot rejected the token (HTTP ${probe.status})` },
      { status: 400 }
    );
  }

  await setIntegrationToken(userData.user.id, 'hubspot', accessToken);
  return NextResponse.json({ status: 'connected' });
}

export async function DELETE(_req: NextRequest) {
  const supabase = await createServerClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  await deleteIntegration(userData.user.id, 'hubspot');
  return NextResponse.json({ status: 'disconnected' });
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
git add src/app/api/integrations/hubspot/route.ts
git commit -m "feat(integrations): add HubSpot connect/disconnect API"
```

---

## Task 8: Connect-HubSpot modal UI

**Files:**
- Create: `src/components/dashboard/connect-hubspot-modal.tsx`

- [ ] **Step 1: Verify Dialog primitive exists**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && ls src/components/ui/dialog.tsx
```

Expected: file exists. If not, check `src/components/ui/` and use whatever modal/dialog pattern is in place.

- [ ] **Step 2: Create `src/components/dashboard/connect-hubspot-modal.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
};

export function ConnectHubSpotModal({ open, onOpenChange, onConnected }: Props) {
  const [accessToken, setAccessToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/hubspot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Connection failed');
        return;
      }
      onConnected();
      onOpenChange(false);
      setAccessToken('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect HubSpot</DialogTitle>
        </DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
          <p style={{ fontSize: 13, color: '#4A6280', lineHeight: 1.5 }}>
            Paste a HubSpot <strong>Private App access token</strong> (starts with <code>pat-</code>) with read access
            to <em>Deals</em> and <em>Contacts</em>. Create one at{' '}
            <strong>HubSpot Settings → Integrations → Private Apps</strong>.
          </p>
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="pat-na1-..."
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid rgba(0,194,255,0.2)',
              background: '#0F1923',
              color: '#E0F0FF',
              fontSize: 13,
              fontFamily: 'monospace',
            }}
            disabled={submitting}
          />
          {error && (
            <div style={{ fontSize: 12, color: '#FF4D4D' }}>{error}</div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting || accessToken.length < 8}>
              {submitting ? 'Connecting…' : 'Connect'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -10
```

Expected: zero errors. If `@/components/ui/dialog` or `@/components/ui/button` exports differ, adjust imports.

- [ ] **Step 4: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/components/dashboard/connect-hubspot-modal.tsx
git commit -m "feat(dashboard): add HubSpot connect modal"
```

---

## Task 9: Sales card UI component

**Files:**
- Create: `src/components/dashboard/sales-card.tsx`

- [ ] **Step 1: Create `src/components/dashboard/sales-card.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { ConnectHubSpotModal } from './connect-hubspot-modal';

type SalesData = {
  pipeline_value: number;
  new_leads: number;
  auto_leads: number;
  sparkline: number[];
  period_label: string;
};

type ApiResponse =
  | { status: 'ok'; data: SalesData; fromCache: boolean }
  | { status: 'not_connected'; tool: 'hubspot' }
  | { status: 'error'; message: string; staleData?: SalesData; staleAgeMs?: number }
  | { error: string };

const C = {
  card: '#0F1923',
  border: 'rgba(0,194,255,0.1)',
  accent: '#00C2FF',
  text: '#E0F0FF',
  muted: '#4A6280',
  red: '#FF4D4D',
};

export function SalesCard() {
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/sales', { cache: 'no-store' });
      const data = (await res.json()) as ApiResponse;
      setResponse(data);
    } catch (err) {
      setResponse({
        status: 'error',
        message: err instanceof Error ? err.message : 'Network error',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '20px 20px 16px',
        flex: 1,
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Sales / CRM</div>
        {response && 'status' in response && response.status === 'ok' && (
          <span style={{ fontSize: 11, color: C.muted }}>{response.data.period_label}</span>
        )}
      </div>

      {loading && <SkeletonState />}

      {!loading && response && 'status' in response && response.status === 'ok' && (
        <DataState data={response.data} />
      )}

      {!loading && response && 'status' in response && response.status === 'not_connected' && (
        <NotConnectedState onConnect={() => setModalOpen(true)} />
      )}

      {!loading && response && 'status' in response && response.status === 'error' && (
        <ErrorState
          message={response.message}
          staleData={response.staleData}
          staleAgeMs={response.staleAgeMs}
          onRetry={load}
        />
      )}

      {!loading && response && 'error' in response && response.error === 'unauthorized' && (
        <div style={{ fontSize: 12, color: C.muted }}>Sign in to see sales data.</div>
      )}

      <ConnectHubSpotModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onConnected={load}
      />
    </div>
  );
}

function SkeletonState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ height: 28, background: 'rgba(0,194,255,0.05)', borderRadius: 4 }} />
      <div style={{ height: 16, background: 'rgba(0,194,255,0.05)', borderRadius: 4, width: '60%' }} />
      <div style={{ height: 16, background: 'rgba(0,194,255,0.05)', borderRadius: 4, width: '40%' }} />
      <div style={{ height: 40, background: 'rgba(0,194,255,0.05)', borderRadius: 4, marginTop: 12 }} />
    </div>
  );
}

function DataState({ data }: { data: SalesData }) {
  const fmtCurrency = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const allEmpty = data.pipeline_value === 0 && data.new_leads === 0;

  if (allEmpty) {
    return (
      <div style={{ fontSize: 12.5, color: C.muted }}>No deals or new leads in the last 14 days.</div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
      <Row label="Pipeline" value={fmtCurrency(data.pipeline_value)} color={C.text} />
      <Row label="New leads" value={data.new_leads.toString()} color={C.accent} />
      <Row
        label="Auto-created"
        value={`${data.auto_leads} of ${data.new_leads}`}
        color={C.muted}
      />
      <Sparkline values={data.sparkline} />
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 36, marginTop: 8 }}>
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(v / max) * 100}%`,
            background: C.accent,
            opacity: 0.6,
            borderRadius: 1,
            minHeight: 1,
          }}
        />
      ))}
    </div>
  );
}

function NotConnectedState({ onConnect }: { onConnect: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
        Connect HubSpot to see your pipeline value, new leads, and which were auto-created by your workflows.
      </div>
      <button
        onClick={onConnect}
        style={{
          background: C.accent,
          color: '#0D1117',
          border: 'none',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Connect HubSpot →
      </button>
    </div>
  );
}

function ErrorState({
  message,
  staleData,
  staleAgeMs,
  onRetry,
}: {
  message: string;
  staleData?: SalesData;
  staleAgeMs?: number;
  onRetry: () => void;
}) {
  const minutes = staleAgeMs ? Math.round(staleAgeMs / 60_000) : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          background: 'rgba(255,77,77,0.08)',
          border: `1px solid rgba(255,77,77,0.3)`,
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 12,
          color: C.red,
        }}
      >
        HubSpot is temporarily unreachable.
        {minutes !== null && (
          <span style={{ color: C.muted, marginLeft: 6 }}>
            Last good fetch: {minutes}m ago
          </span>
        )}
      </div>
      {staleData && <DataState data={staleData} />}
      <button
        onClick={onRetry}
        style={{
          fontSize: 12,
          color: C.accent,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
        }}
      >
        Retry →
      </button>
    </div>
  );
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
git add src/components/dashboard/sales-card.tsx
git commit -m "feat(dashboard): add live Sales card with all 5 widget states"
```

---

## Task 10: Wire SalesCard into the overview page

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Read the current page**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && wc -l src/app/dashboard/page.tsx
```

Open the file and locate the section currently rendering the static Sales / CRM card (likely a `<div>` or component with hardcoded `Pipeline`, `New leads` text).

- [ ] **Step 2: Replace the static sales section**

Add at top of `src/app/dashboard/page.tsx`:

```tsx
import { SalesCard } from '@/components/dashboard/sales-card';
```

Find the static sales/CRM card markup (the block showing `Pipeline`, `New leads` with hardcoded numbers) and replace it entirely with:

```tsx
<SalesCard />
```

Leave the other 3 supporting cards (Marketing, Delivery, Finance) static for now — they'll be replaced by future plans.

- [ ] **Step 3: TypeScript check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -10
```

Expected: zero errors.

- [ ] **Step 4: Lint check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run lint 2>&1 | tail -10
```

Expected: no errors (warnings acceptable).

- [ ] **Step 5: Build check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully`. If build fails, fix before committing.

- [ ] **Step 6: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/app/dashboard/page.tsx
git commit -m "feat(dashboard): wire live SalesCard into overview page"
```

---

## Task 11: End-to-end manual verification

**Files:** none (verification only)

This is the proof the architecture works. Do NOT skip — without this you don't actually know the pipeline functions.

- [ ] **Step 1: Make sure dev server is running**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
```

Expected: `200`. If not, start `npm run dev` in another terminal.

- [ ] **Step 2: Make sure n8n is running and the workflow is active**

```bash
curl -s -o /dev/null -w "%{http_code}\n" "$N8N_BASE_URL/healthz"
```

Expected: ok. Confirm in n8n UI that `dashboard-sales-hubspot` workflow is **Active** (toggle on top right).

- [ ] **Step 3: Sign in to OpsRadar**

Open `http://localhost:3000/dashboard` in a browser. If you're redirected to a sign-in page, sign in with a test user (or create one via Supabase auth UI). Confirm you reach `/dashboard`.

- [ ] **Step 4: Verify "Not connected" state shows**

The Sales card should display:

> Connect HubSpot to see your pipeline value, new leads, and which were auto-created by your workflows.
> [Connect HubSpot →]

If you see a loading skeleton forever or an error, open browser devtools → Network tab, find the `GET /api/dashboard/sales` request, check the response. Common issues:
- 401 → not signed in / session cookie missing
- 500 → check terminal for the dev server's error log
- Other → fix before proceeding

- [ ] **Step 5: Connect HubSpot**

Click **Connect HubSpot →**. In the modal, paste a HubSpot Private App access token (with `crm.objects.deals.read` and `crm.objects.contacts.read` scopes). Click **Connect**.

Expected: modal closes, card shows live data after a moment (or "No deals or new leads in the last 14 days" if your test account is empty — create a deal and a contact in HubSpot UI if so).

- [ ] **Step 6: Verify cache works**

Reload the dashboard page. The Sales card should populate **instantly** (cache hit, <50ms).

Inspect the response in devtools — `fromCache: true` should be set.

- [ ] **Step 7: Verify error state**

In a terminal, stop the n8n workflow (deactivate the toggle in the n8n UI). Hard-refresh `/dashboard` after the cache TTL (or wait 3 minutes, or change the cache key temporarily to bypass). Expected: red banner "HubSpot is temporarily unreachable" with stale data still rendered.

Reactivate the workflow, click **Retry →** on the card. Expected: returns to live data.

- [ ] **Step 8: Verify the token is stored encrypted**

Use Supabase MCP `execute_sql`:

```sql
select tool, encrypted_token, iv, auth_tag from public.integrations limit 1;
```

Expected: `encrypted_token` is base64 ciphertext, **not** the plaintext `pat-na1-...` token. If you see the plaintext, the encryption helper isn't being used — fix before shipping.

- [ ] **Step 9: Verify disconnect works**

In a browser devtools console:

```js
await fetch('/api/integrations/hubspot', { method: 'DELETE' })
```

Reload `/dashboard`. Card should return to "Not connected" state.

- [ ] **Step 10: Final commit (no changes — just confirmation)**

If any verification step revealed a bug, fix it and commit. If everything passed, the previous commits stand.

---

## Self-Review Against Spec

| Spec section | Plan task | Notes |
|---|---|---|
| Live pass-through architecture | Task 4 | `dashboard-fetch.ts` implements browser → API → Redis → n8n |
| No client business data in Supabase | All tasks | Only encrypted tokens stored; widget responses cached in Redis only |
| Supabase stores: auth, encrypted tokens, integration metadata | Task 1 | `integrations` table with RLS |
| Cache TTL 180s | Task 4 | `CACHE_TTL_SECONDS` constant |
| Cache key `dash:<widget>:<client_id>` | Task 4 | exact format used |
| `?fresh=1` cache bypass | Tasks 4, 6 | implemented in helper and route |
| Sales card 4 fields (pipeline/leads/auto/sparkline) | Tasks 5, 9 | n8n shapes the data, card renders it |
| 5 widget UI states | Task 9 | loading, ok, empty, not-connected, error |
| Never show misleading zero | Task 9 | `allEmpty` check renders "No deals/leads" rather than $0 |
| Reference widget = Sales (HubSpot) | Tasks 1–11 | this entire plan |
| Drill-in to `/dashboard/clients` | Out of scope | the existing route stays static; future plan |
| Hero block | Out of scope | future plan |
| Workflow Health strip | Out of scope | future plan |
| Marketing/Delivery/Finance cards | Out of scope | future plan |
| End-client portal / role-based scoping | Out of scope | v2 |

**Coverage:** Every v1 requirement that is *in scope for this plan* has a task. Out-of-scope items are explicitly listed at the top.

**Placeholder scan:** No "TBD", no "implement later", no "similar to Task N" — every step has full code or full commands.

**Type consistency:** `WidgetFetchResult<T>` shape in Task 4 matches the response shape consumed by `SalesCard` in Task 9 (both use `status: 'ok' | 'not_connected' | 'error'`). `SalesWidgetData` fields in Task 6 match `SalesData` in Task 9 (pipeline_value, new_leads, auto_leads, sparkline, period_label). `setIntegrationToken(clientId, tool, plaintextToken)` signature in Task 3 matches its call sites in Task 7.
