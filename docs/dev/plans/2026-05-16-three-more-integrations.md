# Three More Integrations — Pipedrive, Monday.com, Harvest

> **For agentic workers:** Use superpowers:subagent-driven-development to execute task-by-task.

**Goal:** Add Pipedrive (Sales), Monday.com (Delivery), Harvest (Time tracking) using the same Model C pattern as the 5 already shipped.

**Architecture:** 3 new adapters → 3 registry entries → enable in settings page. Pipedrive gets its own Sales section + new route. Monday.com merges into existing `/api/dashboard/delivery`. Harvest gets its own Time tracking section + new route.

**Tech Stack:** Next.js 16 App Router, native `fetch`, AES-256-GCM via existing `lib/integrations/crypto`, Redis 1h cache via `@upstash/redis`. Path alias: `<npm>/` → `src/`.

**Auth note:** Harvest requires 2 pieces (account ID + token). Customer pastes them combined as `<account_id>:<token>` in the single API key field; adapter splits on the first `:`.

---

## File Map

### New
- `src/lib/integrations/pipedrive/adapter.ts`
- `src/lib/integrations/monday/adapter.ts`
- `src/lib/integrations/harvest/adapter.ts`
- `src/app/api/dashboard/sales-pipedrive/route.ts`
- `src/app/api/dashboard/time-harvest/route.ts`

### Modified
- `src/lib/integrations/registry.ts` — add 3 entries
- `src/app/dashboard/integrations/page.tsx` — add 3 catalog entries
- `src/lib/integrations/delivery-types.ts` — extend `source` union to include `'monday'`
- `src/lib/integrations/clickup/adapter.ts` + `asana/adapter.ts` — re-export updated types (no logic change)
- `src/app/api/dashboard/delivery/route.ts` — add Monday.com fetch alongside ClickUp + Asana
- `src/app/dashboard/business/page.tsx` — add `PipedriveSection`, `HarvestSection`; widen `DeliveryTask.source` type

---

## Execution order

Phase 1 (independent): Tasks 1, 2, 3
Phase 2 (depends on Phase 1): Tasks 4, 5, 6
Phase 3 (last): Task 7

---

## Task 1: Pipedrive adapter + registry + settings entry

**Files:**
- Create `src/lib/integrations/pipedrive/adapter.ts`
- Modify `src/lib/integrations/registry.ts`
- Modify `src/app/dashboard/integrations/page.tsx`

### Adapter

```typescript
// src/lib/integrations/pipedrive/adapter.ts
export type PipedriveDealRow = {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  expected_close: string | null;
};

export type PipedriveSalesData = {
  pipeline_value: number;
  open_deals_count: number;
  deals_won_this_month: number;
  rows: PipedriveDealRow[];
  currency: string;
};

export type AdapterValidation =
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string };

const BASE = 'https://api.pipedrive.com/v1';

export async function validatePipedriveKey(apiKey: string): Promise<AdapterValidation> {
  try {
    const res = await fetch(`${BASE}/users/me?api_token=${encodeURIComponent(apiKey)}`);
    if (res.status === 401) {
      return { ok: false, reason: 'invalid_key', message: 'Pipedrive rejected the token.' };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      return { ok: false, reason: 'network', message: `Pipedrive returned ${res.status}: ${text}` };
    }
    const body = (await res.json()) as { data?: { id?: number; company_id?: number } };
    const accountId = body?.data?.company_id ?? body?.data?.id;
    if (!accountId) {
      return { ok: false, reason: 'network', message: 'Pipedrive response missing user/company id.' };
    }
    return { ok: true, externalAccountId: String(accountId) };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message: err instanceof Error ? err.message : 'Could not reach Pipedrive.',
    };
  }
}

type PipedriveDeal = {
  id: number;
  title: string;
  value: number;
  currency: string;
  status: string;
  stage_id?: number;
  expected_close_date?: string | null;
  won_time?: string | null;
};

type PipedriveStage = { id: number; name: string };

export async function fetchPipedriveSalesData(apiKey: string): Promise<PipedriveSalesData> {
  const auth = `api_token=${encodeURIComponent(apiKey)}`;

  const [openRes, wonRes, stagesRes] = await Promise.all([
    fetch(`${BASE}/deals?status=open&limit=100&${auth}`),
    fetch(`${BASE}/deals?status=won&limit=100&${auth}`),
    fetch(`${BASE}/stages?${auth}`),
  ]);

  if (!openRes.ok) throw new Error(`Pipedrive open deals fetch failed: ${openRes.status}`);
  const openData = (await openRes.json()) as { data?: PipedriveDeal[] | null };
  const openDeals = openData.data ?? [];

  const wonData = wonRes.ok
    ? ((await wonRes.json()) as { data?: PipedriveDeal[] | null })
    : { data: [] };
  const wonDeals = wonData.data ?? [];

  const stagesData = stagesRes.ok
    ? ((await stagesRes.json()) as { data?: PipedriveStage[] | null })
    : { data: [] };
  const stageNameById = new Map<number, string>(
    (stagesData.data ?? []).map((s) => [s.id, s.name]),
  );

  const pipelineValue = openDeals.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const openDealsCount = openDeals.length;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const dealsWonThisMonth = wonDeals.filter(
    (d) => d.won_time && new Date(d.won_time) >= monthStart,
  ).length;

  const currency = openDeals[0]?.currency ?? 'USD';

  const rows: PipedriveDealRow[] = openDeals
    .slice()
    .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
    .slice(0, 5)
    .map((d) => ({
      id: String(d.id),
      title: d.title,
      value: Number(d.value) || 0,
      currency: d.currency ?? currency,
      stage: d.stage_id != null ? (stageNameById.get(d.stage_id) ?? `Stage ${d.stage_id}`) : 'unknown',
      expected_close: d.expected_close_date ?? null,
    }));

  return { pipeline_value: pipelineValue, open_deals_count: openDealsCount, deals_won_this_month: dealsWonThisMonth, rows, currency };
}
```

### Registry entry (append inside `REGISTRY` object)

```typescript
import { validatePipedriveKey } from './pipedrive/adapter';
// ...
  pipedrive: {
    tool: 'pipedrive',
    displayName: 'Pipedrive',
    createKeyDocsUrl: 'https://app.pipedrive.com/settings/personal/api',
    instructions:
      'In Pipedrive, click your avatar → Personal preferences → API. ' +
      'Copy your personal API token and paste it below.',
    validate: validatePipedriveKey,
  },
```

### Settings page entry (in `TOOL_CATALOG`)

```typescript
  {
    key: 'pipedrive',
    label: 'Pipedrive',
    blurb: 'CRM — pipeline, deals, stages',
    cardKey: 'Sales',
    enabled: true,
    instructions:
      'In Pipedrive, click your avatar → Personal preferences → API. Copy your personal API token and paste it below.',
    createKeyDocsUrl: 'https://app.pipedrive.com/settings/personal/api',
  },
```

### Verify + commit

```bash
npm run lint && npm run build
git add src/lib/integrations/pipedrive/adapter.ts src/lib/integrations/registry.ts src/app/dashboard/integrations/page.tsx
git commit -m "feat(integrations): add Pipedrive adapter (Model C)"
```

---

## Task 2: Monday.com adapter + registry + settings entry + DeliveryTask source widening

**Files:**
- Create `src/lib/integrations/monday/adapter.ts`
- Modify `src/lib/integrations/delivery-types.ts`
- Modify `src/lib/integrations/registry.ts`
- Modify `src/app/dashboard/integrations/page.tsx`

### Step 1: Widen `DeliveryTask.source`

In `src/lib/integrations/delivery-types.ts`, change:
```typescript
  source: 'clickup' | 'asana';
```
to:
```typescript
  source: 'clickup' | 'asana' | 'monday';
```

### Step 2: Create adapter

```typescript
// src/lib/integrations/monday/adapter.ts
import type { DeliveryTask, DeliveryData } from '<npm>/lib/integrations/delivery-types';

export type AdapterValidation =
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string };

const ENDPOINT = 'https://api.monday.com/v2';

async function gql<T>(token: string, query: string): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      return { ok: false, status: res.status, error: text };
    }
    const body = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (body.errors?.length) {
      return { ok: false, status: 400, error: body.errors.map((e) => e.message).join('; ') };
    }
    return { ok: true, status: res.status, data: body.data };
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : 'network' };
  }
}

export async function validateMondayToken(token: string): Promise<AdapterValidation> {
  const r = await gql<{ me?: { id?: string; name?: string } }>(token, '{ me { id name } }');
  if (!r.ok) {
    if (r.status === 401 || /authentic|unauthor/i.test(r.error ?? '')) {
      return { ok: false, reason: 'invalid_key', message: 'Monday rejected the token.' };
    }
    if (r.status === 403) {
      return { ok: false, reason: 'permission', message: 'Token lacks permissions.' };
    }
    return { ok: false, reason: 'network', message: r.error ?? `Monday returned ${r.status}` };
  }
  const id = r.data?.me?.id;
  if (!id) {
    return { ok: false, reason: 'network', message: 'Monday response missing user id.' };
  }
  return { ok: true, externalAccountId: id };
}

type MondayBoard = {
  id: string;
  name: string;
  items_page?: { items?: MondayItem[] };
};
type MondayItem = {
  id: string;
  name: string;
  state: string;
  column_values?: Array<{ id: string; type?: string; text?: string | null; value?: string | null }>;
};

export async function fetchMondayDeliveryData(token: string): Promise<DeliveryData> {
  const query = `
    query {
      boards(limit: 10, state: active) {
        id
        name
        items_page(limit: 50) {
          items {
            id
            name
            state
            column_values { id type text value }
          }
        }
      }
    }
  `;
  const r = await gql<{ boards?: MondayBoard[] }>(token, query);
  if (!r.ok) throw new Error(`Monday boards fetch failed: ${r.status} ${r.error ?? ''}`);
  const boards = r.data?.boards ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const tasks: DeliveryTask[] = [];
  for (const board of boards) {
    const items = board.items_page?.items ?? [];
    for (const item of items) {
      if (item.state !== 'active') continue;
      const dateCol = item.column_values?.find(
        (c) => c.type === 'date' || /due/i.test(c.id),
      );
      const dueText = dateCol?.text?.trim() || null;
      const due = dueText && /^\d{4}-\d{2}-\d{2}/.test(dueText) ? dueText.slice(0, 10) : null;
      const overdue = due !== null && due < today;
      const statusCol = item.column_values?.find(
        (c) => c.type === 'status' || /status/i.test(c.id),
      );
      tasks.push({
        id: item.id,
        name: item.name,
        status: statusCol?.text || 'open',
        due_date: due,
        overdue,
        project_name: board.name,
        source: 'monday',
      });
    }
  }
  const slice = tasks.slice(0, 50);
  const overdue_tasks = slice.filter((t) => t.overdue).length;
  const active_projects = new Set(slice.map((t) => t.project_name)).size;
  return { active_projects, overdue_tasks, tasks: slice };
}
```

### Step 3: Registry + settings entries

Registry:
```typescript
import { validateMondayToken } from './monday/adapter';
// ...
  monday: {
    tool: 'monday',
    displayName: 'Monday.com',
    createKeyDocsUrl: 'https://monday.com/developers/v2#authentication-section',
    instructions:
      'In Monday, click your avatar → Developers → My Access Tokens. ' +
      'Copy your personal API token and paste it below.',
    validate: validateMondayToken,
  },
```

Settings catalog:
```typescript
  {
    key: 'monday',
    label: 'Monday.com',
    blurb: 'Boards, items, deadlines',
    cardKey: 'Delivery',
    enabled: true,
    instructions:
      'In Monday, click your avatar → Developers → My Access Tokens. Copy your personal API token and paste it below.',
    createKeyDocsUrl: 'https://monday.com/developers/v2#authentication-section',
  },
```

### Verify + commit

```bash
npm run lint && npm run build
git add src/lib/integrations/monday/adapter.ts src/lib/integrations/delivery-types.ts src/lib/integrations/registry.ts src/app/dashboard/integrations/page.tsx
git commit -m "feat(integrations): add Monday.com adapter and widen DeliveryTask source"
```

---

## Task 3: Harvest adapter + registry + settings entry

**Files:**
- Create `src/lib/integrations/harvest/adapter.ts`
- Modify `src/lib/integrations/registry.ts`
- Modify `src/app/dashboard/integrations/page.tsx`

### Adapter

```typescript
// src/lib/integrations/harvest/adapter.ts
export type HarvestProjectRow = {
  project_name: string;
  hours: number;
  client_name: string | null;
};

export type HarvestTimeData = {
  hours_tracked: number;
  utilization_pct: number | null;
  by_project: HarvestProjectRow[];
  period_label: string;
};

export type AdapterValidation =
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string };

const BASE = 'https://api.harvestapp.com/v2';
const UA = 'OpsRadar (https://opsradar.app)';

function parseCombined(combined: string): { accountId: string; token: string } | null {
  const idx = combined.indexOf(':');
  if (idx <= 0 || idx === combined.length - 1) return null;
  const accountId = combined.slice(0, idx).trim();
  const token = combined.slice(idx + 1).trim();
  if (!accountId || !token) return null;
  return { accountId, token };
}

function headers(accountId: string, token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Harvest-Account-Id': accountId,
    'User-Agent': UA,
  };
}

export async function validateHarvestKey(combined: string): Promise<AdapterValidation> {
  const parsed = parseCombined(combined);
  if (!parsed) {
    return {
      ok: false,
      reason: 'invalid_key',
      message: 'Expected format: <account_id>:<token>',
    };
  }
  try {
    const res = await fetch(`${BASE}/users/me`, { headers: headers(parsed.accountId, parsed.token) });
    if (res.status === 401) {
      return { ok: false, reason: 'invalid_key', message: 'Harvest rejected the token.' };
    }
    if (res.status === 403) {
      return { ok: false, reason: 'permission', message: 'Token lacks required scopes.' };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      return { ok: false, reason: 'network', message: `Harvest returned ${res.status}: ${text}` };
    }
    const body = (await res.json()) as { id?: number };
    if (!body.id) {
      return { ok: false, reason: 'network', message: 'Harvest response missing user id.' };
    }
    return { ok: true, externalAccountId: parsed.accountId };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message: err instanceof Error ? err.message : 'Could not reach Harvest.',
    };
  }
}

type HarvestEntry = {
  hours: number;
  project?: { name?: string } | null;
  client?: { name?: string } | null;
};

export async function fetchHarvestTimeData(combined: string): Promise<HarvestTimeData> {
  const parsed = parseCombined(combined);
  if (!parsed) throw new Error('Harvest credentials malformed');
  const h = headers(parsed.accountId, parsed.token);

  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - daysFromMonday);
  weekStart.setUTCHours(0, 0, 0, 0);

  const params = new URLSearchParams({
    from: weekStart.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
    user_id: 'me',
    per_page: '100',
  });

  const res = await fetch(`${BASE}/time_entries?${params}`, { headers: h });
  if (!res.ok) throw new Error(`Harvest time entries fetch failed: ${res.status}`);
  const body = (await res.json()) as { time_entries?: HarvestEntry[] };
  const entries = body.time_entries ?? [];

  const totalHours = entries.reduce((s, e) => s + (Number(e.hours) || 0), 0);
  const hours_tracked = Math.round(totalHours * 10) / 10;
  const utilization_pct = hours_tracked > 0 ? Math.round((hours_tracked / 40) * 1000) / 10 : null;

  const byProject = new Map<string, { hours: number; client: string | null }>();
  for (const e of entries) {
    const name = e.project?.name ?? 'No project';
    const cur = byProject.get(name) ?? { hours: 0, client: e.client?.name ?? null };
    cur.hours += Number(e.hours) || 0;
    if (!cur.client && e.client?.name) cur.client = e.client.name;
    byProject.set(name, cur);
  }

  const by_project: HarvestProjectRow[] = [...byProject.entries()]
    .map(([project_name, v]) => ({
      project_name,
      hours: Math.round(v.hours * 10) / 10,
      client_name: v.client,
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  return { hours_tracked, utilization_pct, by_project, period_label: 'This week' };
}
```

### Registry + settings entries

Registry:
```typescript
import { validateHarvestKey } from './harvest/adapter';
// ...
  harvest: {
    tool: 'harvest',
    displayName: 'Harvest',
    createKeyDocsUrl: 'https://id.getharvest.com/developers',
    instructions:
      'At id.getharvest.com/developers, create a Personal Access Token. ' +
      'Copy BOTH your Account ID and Token, then paste as `<account_id>:<token>` (e.g. 1234567:pat_abc...).',
    validate: validateHarvestKey,
  },
```

Settings catalog:
```typescript
  {
    key: 'harvest',
    label: 'Harvest',
    blurb: 'Hours tracked, utilization',
    cardKey: 'Time tracking',
    enabled: true,
    instructions:
      'At id.getharvest.com/developers, create a Personal Access Token. Copy BOTH your Account ID and Token, then paste as <account_id>:<token> (e.g. 1234567:pat_abc...).',
    createKeyDocsUrl: 'https://id.getharvest.com/developers',
  },
```

### Verify + commit

```bash
npm run lint && npm run build
git add src/lib/integrations/harvest/adapter.ts src/lib/integrations/registry.ts src/app/dashboard/integrations/page.tsx
git commit -m "feat(integrations): add Harvest adapter (combined account_id:token format)"
```

---

## Task 4: New /api/dashboard/sales-pipedrive route

Create `src/app/api/dashboard/sales-pipedrive/route.ts` modeled exactly after `src/app/api/dashboard/finance/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import {
  fetchPipedriveSalesData,
  type PipedriveSalesData,
} from '<npm>/lib/integrations/pipedrive/adapter';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY = (userId: string) => `dash:sales-pipedrive:${userId}`;

type Resp =
  | { status: 'ok'; data: PipedriveSalesData; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected' }
  | { status: 'unavailable'; message: string };

export async function GET(_req: NextRequest): Promise<NextResponse<Resp>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const { data: row } = await supabase
    .from('integrations')
    .select('encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .eq('tool', 'pipedrive')
    .maybeSingle();

  if (!row?.encrypted_token || row.status !== 'connected') {
    return NextResponse.json({ status: 'not_connected' });
  }

  const redis = (() => {
    try { return Redis.fromEnv(); } catch { return null; }
  })();
  if (redis) {
    const cached = await redis.get<Resp>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  let data: PipedriveSalesData;
  try {
    const apiKey = decryptApiKey({
      encrypted_token: row.encrypted_token,
      iv: row.iv,
      auth_tag: row.auth_tag,
    });
    data = await fetchPipedriveSalesData(apiKey);
  } catch (err) {
    console.error('[sales-pipedrive] fetch failed:', err);
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
    .eq('tool', 'pipedrive');

  const payload: Resp = { status: 'ok', data, last_synced_at: lastSyncedAt, from_cache: false };
  if (redis) await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(payload);
}
```

### Verify + commit

```bash
npm run lint && npm run build
git add src/app/api/dashboard/sales-pipedrive/route.ts
git commit -m "feat(api): add sales-pipedrive route"
```

---

## Task 5: Update /api/dashboard/delivery to add Monday.com

Modify `src/app/api/dashboard/delivery/route.ts`:

1. Add import:
```typescript
import { fetchMondayDeliveryData } from '<npm>/lib/integrations/monday/adapter';
```

2. Update the Supabase `.in('tool', ['clickup', 'asana'])` to `.in('tool', ['clickup', 'asana', 'monday'])`.

3. Update the early-return check:
```typescript
const mondayRow = (rows ?? []).find(
  (r): r is IntegrationRow => r.tool === 'monday' && r.status === 'connected',
);
if (!clickupRow && !asanaRow && !mondayRow) {
  return NextResponse.json({ status: 'not_connected' });
}
```

4. After the asana block, add a parallel Monday block:
```typescript
if (mondayRow?.encrypted_token) {
  try {
    const key = decryptApiKey({
      encrypted_token: mondayRow.encrypted_token,
      iv: mondayRow.iv,
      auth_tag: mondayRow.auth_tag,
    });
    const d = await fetchMondayDeliveryData(key);
    merged.active_projects += d.active_projects;
    merged.overdue_tasks += d.overdue_tasks;
    merged.tasks.push(...d.tasks);
    synced.push('monday');
  } catch (err) {
    console.error('[delivery] monday fetch failed:', err);
  }
}
```

### Verify + commit

```bash
npm run lint && npm run build
git add src/app/api/dashboard/delivery/route.ts
git commit -m "feat(api): merge Monday.com into delivery route"
```

---

## Task 6: New /api/dashboard/time-harvest route

Create `src/app/api/dashboard/time-harvest/route.ts` modeled exactly after `src/app/api/dashboard/time-tracking/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import {
  fetchHarvestTimeData,
  type HarvestTimeData,
} from '<npm>/lib/integrations/harvest/adapter';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY = (userId: string) => `dash:time-harvest:${userId}`;

type Resp =
  | { status: 'ok'; data: HarvestTimeData; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected' }
  | { status: 'unavailable'; message: string };

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const { data: row } = await supabase
    .from('integrations')
    .select('encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .eq('tool', 'harvest')
    .maybeSingle();

  if (!row?.encrypted_token || row.status !== 'connected') {
    return NextResponse.json({ status: 'not_connected' });
  }

  const redis = (() => {
    try { return Redis.fromEnv(); } catch { return null; }
  })();
  if (redis) {
    const cached = await redis.get<Resp>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  let data: HarvestTimeData;
  try {
    const combined = decryptApiKey({
      encrypted_token: row.encrypted_token,
      iv: row.iv,
      auth_tag: row.auth_tag,
    });
    data = await fetchHarvestTimeData(combined);
  } catch (err) {
    console.error('[time-harvest] fetch failed:', err);
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
    .eq('tool', 'harvest');

  const payload: Resp = { status: 'ok', data, last_synced_at: lastSyncedAt, from_cache: false };
  if (redis) await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(payload);
}
```

### Verify + commit

```bash
npm run lint && npm run build
git add src/app/api/dashboard/time-harvest/route.ts
git commit -m "feat(api): add time-harvest route"
```

---

## Task 7: Business page — add Pipedrive + Harvest sections, widen DeliveryTask source

Modify `src/app/dashboard/business/page.tsx`:

1. Widen the local `DeliveryTask.source` type to `'clickup' | 'asana' | 'monday'`.

2. Add type defs at top alongside other locals:
```typescript
type PipedriveDealRow = {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  expected_close: string | null;
};
type PipedriveSalesData = {
  pipeline_value: number;
  open_deals_count: number;
  deals_won_this_month: number;
  rows: PipedriveDealRow[];
  currency: string;
};

type HarvestProjectRow = { project_name: string; hours: number; client_name: string | null };
type HarvestTimeData = {
  hours_tracked: number;
  utilization_pct: number | null;
  by_project: HarvestProjectRow[];
  period_label: string;
};
```

3. Add `<PipedriveSection />` after `<PipelineSection />` and `<HarvestSection />` after `<TimeSection />` in the page render.

4. Add the two new section components:
```typescript
function PipedriveSection() {
  return (
    <ToolSection
      title="Sales pipeline (Pipedrive)"
      endpoint="/api/dashboard/sales-pipedrive"
      tool="Pipedrive"
      toolSlug="pipedrive"
      renderConnected={(data) => {
        const pd = (data as { data?: PipedriveSalesData }).data;
        return (
          <>
            <div className="mb-4 grid grid-cols-3 gap-2">
              <StatMini label="Open deals" value={pd?.open_deals_count != null ? String(pd.open_deals_count) : '—'} />
              <StatMini label="Pipeline $" value={pd?.pipeline_value != null ? fmtMoney(pd.pipeline_value) : '—'} />
              <StatMini label="Won · MTD" value={pd?.deals_won_this_month != null ? String(pd.deals_won_this_month) : '—'} />
            </div>
            {pd?.rows && pd.rows.length > 0 ? (
              <RowTable
                headers={['Deal', 'Value', 'Stage', 'Expected close']}
                rows={pd.rows.map((r) => [
                  r.title,
                  fmtMoney(r.value),
                  r.stage,
                  r.expected_close ?? '—',
                ])}
              />
            ) : (
              <p className="text-body-sm text-[var(--color-fg-subtle)]">No open deals.</p>
            )}
          </>
        );
      }}
    />
  );
}

function HarvestSection() {
  return (
    <ToolSection
      title="Time tracking (Harvest)"
      endpoint="/api/dashboard/time-harvest"
      tool="Harvest"
      toolSlug="harvest"
      renderConnected={(data) => {
        const time = (data as { data?: HarvestTimeData }).data;
        return (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <StatMini label="Hours · this week" value={time?.hours_tracked != null ? `${time.hours_tracked}h` : '—'} />
              <StatMini label="Utilization" value={time?.utilization_pct != null ? `${time.utilization_pct.toFixed(1)}%` : '—'} />
            </div>
            {time?.by_project && time.by_project.length > 0 ? (
              <RowTable
                headers={['Project', 'Client', 'Hours']}
                rows={time.by_project.map((p) => [p.project_name, p.client_name ?? '—', `${p.hours}h`])}
              />
            ) : (
              <p className="text-body-sm text-[var(--color-fg-subtle)]">No time entries this week.</p>
            )}
          </>
        );
      }}
    />
  );
}
```

5. Update the `BusinessAlerts` filter regex to add `pipedrive`, `monday`, `harvest`:
```typescript
/tool=(stripe|hubspot|apollo|calendly|clickup|asana|toggl|pipedrive|monday|harvest)/.test(a.href)
```

### Verify + commit

```bash
npm run lint && npm run build
git add src/app/dashboard/business/page.tsx
git commit -m "feat(dashboard): add Pipedrive + Harvest sections, widen DeliveryTask source"
```

---

## Final verification

```bash
npm run lint && npm run build
git log --oneline -10
```
Expected: 7 new commits from this feature.
