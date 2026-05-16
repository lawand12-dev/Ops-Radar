# chatv2 Per-Customer Integration Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every customer see their own automation data (workflows, ROI, incidents) — not global platform-wide numbers — by (1) writing `chatv2_project_id` during onboarding, and (2) routing `automation-roi` through per-customer project scoping.

**Architecture:** The chatv2 system (opstest.atta.codes, CTO-owned) exposes service endpoints scoped by project: `/service/projects/{id}/workflows/health` (already used) and `/service/projects/{id}/analytics` (to be used for ROI). OpsRadar stores `chatv2_project_id` in `client_n8n_config` per customer, looks it up server-side, and proxies using `CHATV2_SERVICE_API_KEY`. Redis cache keys become per-user (`dash:automation-roi:{userId}`).

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (server client), Upstash Redis, `CHATV2_API_URL` + `CHATV2_SERVICE_API_KEY` env vars (already set in `.env.local`)

---

## Files Changed

| File | Change |
|---|---|
| `src/app/admin/onboard-customer/page.tsx` | Add `chatv2ProjectId` state + input field + include in submit body + clear on success; fix sidebar copy |
| `src/app/api/admin/onboard-customer/route.ts` | Accept `chatv2ProjectId` in body; write `chatv2_project_id` to `client_n8n_config` insert |
| `src/app/api/dashboard/automation-roi/route.ts` | Add auth gate + per-user chatv2_project_id lookup; call per-project analytics endpoint; per-user Redis cache key; return `not_enrolled` when no mapping |
| `src/app/dashboard/automations/page.tsx` | Add `not_enrolled` to `RoiResp` type; handle in `Kpis()` |
| `src/app/dashboard/_components/cockpit-kpi-strip.tsx` | Handle `not_enrolled` in `loadTimeSaved()` |

---

## Task 1: Fix admin onboard form — add chatv2_project_id field

**Files:**
- Modify: `src/app/admin/onboard-customer/page.tsx`

- [ ] **Step 1: Add state variable for chatv2ProjectId**

In `src/app/admin/onboard-customer/page.tsx`, add state after the existing `n8nApiKey` state:

```tsx
const [chatv2ProjectId, setChatv2ProjectId] = useState('');
```

- [ ] **Step 2: Include chatv2ProjectId in the submit body**

In `handleSubmit`, change the `JSON.stringify` call to include the new field:

```tsx
body: JSON.stringify({ email, n8nBaseUrl, n8nWebhookSecret, n8nApiKey, chatv2ProjectId }),
```

- [ ] **Step 3: Clear chatv2ProjectId on success**

After the `setN8nApiKey('')` clear call on success, add:

```tsx
setChatv2ProjectId('');
```

- [ ] **Step 4: Add the input field to the form**

Inside the "Automation config from chatv2" section (`<div className="flex flex-col gap-4">`), add a new field **after** the existing API key field:

```tsx
<div className="flex flex-col gap-1.5">
  <Label htmlFor="chatv2-project-id">chatv2 project ID</Label>
  <Input
    id="chatv2-project-id"
    type="text"
    value={chatv2ProjectId}
    onChange={e => setChatv2ProjectId(e.target.value)}
    placeholder="proj_abc123"
    className="font-mono"
  />
  <p className="text-caption text-[var(--color-fg-subtle)]">
    Leave blank if this customer has no chatv2 project yet. Can be added later.
  </p>
</div>
```

- [ ] **Step 5: Fix the right-panel sidebar copy**

The sidebar currently says "encrypted and saved to `automation_config`" — that column does not exist. Change the text of step 2 in the sidebar `<ol>`:

Old:
```tsx
<p className="text-body-sm text-[var(--color-fg-muted)] mt-0.5">
  Their chatv2 project_id, webhook secret, and API key are encrypted and saved to <code className="text-caption font-mono">automation_config</code>.
</p>
```

New:
```tsx
<p className="text-body-sm text-[var(--color-fg-muted)] mt-0.5">
  Their n8n base URL, webhook secret, API key, and chatv2 project ID are saved to <code className="text-caption font-mono">client_n8n_config</code>.
</p>
```

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/onboard-customer/page.tsx
git commit -m "feat(admin): add chatv2_project_id field to onboard form"
```

---

## Task 2: Fix onboard API route — write chatv2_project_id to DB

**Files:**
- Modify: `src/app/api/admin/onboard-customer/route.ts`

- [ ] **Step 1: Add chatv2ProjectId to the request body type**

Change the `body` type declaration (lines 26–31) to:

```ts
let body: {
  email?: string;
  n8nBaseUrl?: string;
  n8nWebhookSecret?: string;
  n8nApiKey?: string;
  chatv2ProjectId?: string;
};
```

- [ ] **Step 2: Extract and sanitize chatv2ProjectId**

After the existing `const n8nApiKey = body.n8nApiKey?.trim();` line, add:

```ts
const chatv2ProjectId = body.chatv2ProjectId?.trim() || null;
```

- [ ] **Step 3: Include chatv2_project_id in the DB insert**

Change the `.insert({...})` call to include the new field:

```ts
const { error: insertError } = await supabase.from('client_n8n_config').insert({
  client_id: userId,
  n8n_base_url: normalizedUrl,
  n8n_webhook_secret: n8nWebhookSecret,
  n8n_api_key: n8nApiKey,
  chatv2_project_id: chatv2ProjectId,
});
```

- [ ] **Step 4: Verify manually**

Start the dev server (`npm run dev` from `opsradar/`), go to `/admin/onboard-customer`, fill in all fields including a test project ID like `proj_test`, submit. Then in Supabase check `client_n8n_config` — the new row should have `chatv2_project_id` populated.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/onboard-customer/route.ts
git commit -m "feat(api): write chatv2_project_id to client_n8n_config on onboard"
```

---

## Task 3: Make automation-roi per-customer

**Files:**
- Modify: `src/app/api/dashboard/automation-roi/route.ts`

This is the most significant change. The route currently calls a global `CTO_BACKEND_URL/analytics` endpoint with no auth and no per-customer scope. We change it to:
1. Auth-gate via `getCurrentUserId()`
2. Look up `chatv2_project_id` from `client_n8n_config` (same as `workflow-health` does)
3. Call `${CHATV2_API_URL}/service/projects/{project_id}/analytics` with `CHATV2_SERVICE_API_KEY`
4. Use per-user Redis cache keys

- [ ] **Step 1: Replace the route file with the per-customer implementation**

Replace the entire contents of `src/app/api/dashboard/automation-roi/route.ts` with:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

let redisInstance: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisInstance !== undefined) return redisInstance;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisInstance = null;
    return null;
  }
  try {
    redisInstance = new Redis({ url, token });
    return redisInstance;
  } catch (err) {
    console.warn('[automation-roi] Redis init failed, caching disabled:', err);
    redisInstance = null;
    return null;
  }
}

async function safeRedisGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  try { return (await r.get<T>(key)) ?? null; } catch (err) {
    console.warn('[automation-roi] redis.get failed:', err);
    return null;
  }
}

async function safeRedisSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try { await r.set(key, value, { ex: ttlSeconds }); } catch (err) {
    console.warn('[automation-roi] redis.set failed:', err);
  }
}

const CACHE_TTL_SECONDS = 180;
const STALE_TTL_SECONDS = 60 * 60 * 24;

type CtoAnalyticsResponse = {
  overview: {
    total_projects: number;
    total_workflows: number;
    total_runs: number;
    failed_runs: number;
    success_rate: number;
    average_duration_ms: number;
    unresolved_alerts: number;
    healthy_workflows: number;
    unhealthy_workflows: number;
  };
  workflows_health: Array<{
    workflow_id: string;
    project_id: string;
    project_name: string;
    is_working: boolean;
    last_run_status: 'success' | 'failure' | 'unknown';
    failed_runs: number;
    total_runs: number;
    unresolved_alerts: number;
  }>;
};

type AutomationRoiWidget = {
  dollars_saved: number;
  hours_saved: number;
  actions_automated: number;
  success_rate_pct: number;
  total_workflows: number;
  open_alerts: number;
  healthy_count: number;
  failing_count: number;
  monitor_url: string;
};

type ApiResult =
  | { status: 'ok'; data: AutomationRoiWidget; fromCache: boolean }
  | { status: 'not_enrolled' }
  | { status: 'error'; message: string; staleData?: AutomationRoiWidget; staleAgeMs?: number };

function cacheKeys(userId: string) {
  return {
    fresh: `dash:automation-roi:${userId}`,
    stale: `dash:automation-roi:${userId}:stale`,
  };
}

function shape(raw: CtoAnalyticsResponse): AutomationRoiWidget {
  const minutesPerExec = Number(process.env.DEFAULT_MINUTES_PER_EXECUTION ?? 5);
  const hourlyRate = Number(process.env.DEFAULT_HOURLY_RATE_USD ?? 25);
  const monitorUrl = process.env.WORKFLOW_MONITOR_URL ?? 'https://opstest.atta.codes/#/projects';

  const successfulRuns = Math.max(0, raw.overview.total_runs - raw.overview.failed_runs);
  const hoursSaved = (successfulRuns * minutesPerExec) / 60;

  return {
    dollars_saved: hoursSaved * hourlyRate,
    hours_saved: hoursSaved,
    actions_automated: successfulRuns,
    success_rate_pct: raw.overview.success_rate,
    total_workflows: raw.overview.total_workflows,
    open_alerts: raw.overview.unresolved_alerts,
    healthy_count: raw.overview.healthy_workflows,
    failing_count: raw.overview.unhealthy_workflows,
    monitor_url: monitorUrl,
  };
}

export async function GET(req: NextRequest): Promise<NextResponse<ApiResult>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'error', message: 'unauthorized' }, { status: 401 });
  }

  const apiUrl = process.env.CHATV2_API_URL;
  const serviceKey = process.env.CHATV2_SERVICE_API_KEY;
  if (!apiUrl || !serviceKey) {
    console.error('[automation-roi] CHATV2_API_URL or CHATV2_SERVICE_API_KEY missing');
    return NextResponse.json({ status: 'error', message: 'integration_not_configured' }, { status: 500 });
  }

  const keys = cacheKeys(userId);
  const fresh = req.nextUrl.searchParams.get('fresh') === '1';

  if (!fresh) {
    const cached = await safeRedisGet<{ data: AutomationRoiWidget; ts: number }>(keys.fresh);
    if (cached) {
      return NextResponse.json({ status: 'ok', data: cached.data, fromCache: true });
    }
  }

  // Look up this customer's chatv2 project
  const supabase = getServerSupabaseClient();
  const { data: mapping, error: mappingError } = await supabase
    .from('client_n8n_config')
    .select('chatv2_project_id')
    .eq('client_id', userId)
    .maybeSingle();

  if (mappingError) {
    console.error('[automation-roi] mapping lookup failed:', mappingError.message);
    return NextResponse.json({ status: 'error', message: 'mapping_lookup_failed' }, { status: 500 });
  }

  if (!mapping?.chatv2_project_id) {
    return NextResponse.json({ status: 'not_enrolled' });
  }

  let response: Response;
  try {
    response = await fetch(
      `${apiUrl}/service/projects/${encodeURIComponent(mapping.chatv2_project_id)}/analytics`,
      {
        headers: { Authorization: `Bearer ${serviceKey}` },
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      }
    );
  } catch (err) {
    const stale = await safeRedisGet<{ data: AutomationRoiWidget; ts: number }>(keys.stale);
    return NextResponse.json({
      status: 'error',
      message: err instanceof Error ? err.message : 'chatv2 unreachable',
      ...(stale && { staleData: stale.data, staleAgeMs: Date.now() - stale.ts }),
    });
  }

  if (response.status === 404) {
    return NextResponse.json({ status: 'not_enrolled' });
  }

  if (!response.ok) {
    const stale = await safeRedisGet<{ data: AutomationRoiWidget; ts: number }>(keys.stale);
    return NextResponse.json({
      status: 'error',
      message: `chatv2 returned ${response.status}`,
      ...(stale && { staleData: stale.data, staleAgeMs: Date.now() - stale.ts }),
    });
  }

  let raw: CtoAnalyticsResponse;
  try {
    raw = (await response.json()) as CtoAnalyticsResponse;
    if (!raw?.overview || typeof raw.overview.total_runs !== 'number') {
      throw new Error('unexpected shape');
    }
  } catch {
    return NextResponse.json({ status: 'error', message: 'chatv2 returned unexpected shape' });
  }

  const data = shape(raw);
  const wrapped = { data, ts: Date.now() };
  await Promise.all([
    safeRedisSet(keys.fresh, wrapped, CACHE_TTL_SECONDS),
    safeRedisSet(keys.stale, wrapped, STALE_TTL_SECONDS),
  ]);

  return NextResponse.json({ status: 'ok', data, fromCache: false });
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | grep automation-roi
```

Expected: no output (no errors for this file).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/automation-roi/route.ts
git commit -m "feat(api): make automation-roi per-customer via chatv2_project_id lookup"
```

---

## Task 4: Update consumers — handle not_enrolled from automation-roi

**Files:**
- Modify: `src/app/dashboard/automations/page.tsx`
- Modify: `src/app/dashboard/_components/cockpit-kpi-strip.tsx`

### automations/page.tsx

- [ ] **Step 1: Add not_enrolled to RoiResp type**

Change the `RoiResp` type (currently around line 50) from:

```ts
type RoiResp =
  | { status: 'ok'; data: AutomationRoiWidget; fromCache: boolean }
  | { status: 'error'; message: string; staleData?: AutomationRoiWidget };
```

To:

```ts
type RoiResp =
  | { status: 'ok'; data: AutomationRoiWidget; fromCache: boolean }
  | { status: 'not_enrolled' }
  | { status: 'error'; message: string; staleData?: AutomationRoiWidget };
```

- [ ] **Step 2: Verify roiData derivation already handles not_enrolled**

In `Kpis()`, the existing line:

```ts
const roiData = roi?.status === 'ok' ? roi.data : roi?.status === 'error' && roi.staleData ? roi.staleData : null;
```

This already returns `null` when `status === 'not_enrolled'` (no match), so all ROI-derived KPIs display `—`. No further change needed here.

### cockpit-kpi-strip.tsx

- [ ] **Step 3: Handle not_enrolled in loadTimeSaved()**

In `loadTimeSaved()`, the current check is:

```ts
if (r?.status === 'error' || !r?.data) return { error: 'failed' };
```

Change to:

```ts
if (r?.status === 'not_enrolled') return { error: 'not_connected' };
if (r?.status === 'error' || !r?.data) return { error: 'failed' };
```

This matches the existing pattern used by `loadSuccessRate()` for `workflow-health`.

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | grep -E "automations/page|cockpit-kpi"
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/automations/page.tsx src/app/dashboard/_components/cockpit-kpi-strip.tsx
git commit -m "fix(dashboard): handle not_enrolled from per-customer automation-roi"
```

---

## Task 5: End-to-end smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test not_enrolled state (customer with no chatv2_project_id)**

Log in as a customer whose `client_n8n_config.chatv2_project_id` is null. Go to `/dashboard/automations`. Verify:
- All 4 KPI cards show `—`
- Workflow leaderboard shows the "not enrolled" empty state
- No opstest.atta.codes URL appears in any network request from the browser

- [ ] **Step 3: Test enrolled state (customer with a valid chatv2_project_id)**

Either update a test row in Supabase (`client_n8n_config` → set `chatv2_project_id` to a real project ID from the CTO), or onboard a new test customer via `/admin/onboard-customer` filling in the project ID. Then:
- `GET /api/dashboard/automation-roi` → should return `{ status: 'ok', data: {...} }` with per-customer numbers
- `GET /api/dashboard/workflow-health` → should return `{ status: 'ok', workflows: [...] }`
- `/dashboard/automations` → KPI cards show real numbers, leaderboard shows workflow rows

- [ ] **Step 4: Verify Redis keys are per-user**

Check Upstash Redis (via their dashboard or CLI) — keys should be `dash:automation-roi:{userId}` and `dash:automation-roi:{userId}:stale`, not the old global `dash:automation-roi`.

- [ ] **Step 5: Final lint check**

```bash
npm run lint 2>&1 | grep -v "^$"
```

Expected: no new errors.

- [ ] **Step 6: Final commit if any lint fixes needed, then done**

```bash
git add -p
git commit -m "fix: lint cleanup after chatv2 per-customer integration"
```
