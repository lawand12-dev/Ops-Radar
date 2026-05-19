# Dashboard Hero ROI Block + Workflow Health Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Hero ROI block and Workflow Health strip to the top of `/dashboard`, sourced from the CTO's chat-branch backend (`https://opstest.atta.codes`).

**Architecture:** New API route `/api/dashboard/automation-roi` calls the CTO's `GET /analytics` directly (no n8n hop), caches in Upstash Redis (180s TTL), and returns a flat widget contract. Two new client components consume that endpoint and render the Hero block + Workflow Health strip. Inserted at the top of `src/app/dashboard/page.tsx` above the existing static stat cards.

**Tech Stack:** Next.js 16, React 19, TypeScript, Upstash Redis (already in stack), CTO's Hono backend at `opstest.atta.codes`.

**Source spec:** [docs/superpowers/specs/2026-05-09-dashboard-hero-workflow-health-design.md](../specs/2026-05-09-dashboard-hero-workflow-health-design.md)

**Project conventions:**
- Path alias: `<npm>/*` → `./src/*` (NOT `@/`)
- Branch: work on a new branch `feat/dashboard-hero-workflow-health` off `main`
- Don't restart the dev server — it auto-reloads on .env.local changes
- TypeScript checks via `npx tsc --noEmit`; lint via `npm run lint`
- No test runner configured; verification = tsc + lint + build + manual smoke

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/app/api/dashboard/automation-roi/route.ts` | Calls CTO's `/analytics`, caches, returns widget JSON |
| Create | `src/components/dashboard/hero-roi-block.tsx` | Big $ saved + sub-stats UI |
| Create | `src/components/dashboard/workflow-health-strip.tsx` | Healthy/failing pills + Open monitor link |
| Modify | `src/app/dashboard/page.tsx` | Insert HeroRoiBlock + WorkflowHealthStrip above stat cards |
| Modify | `.env.local` (gitignored) | Add 4 new env vars |

---

## Task 1: Create feature branch + add env vars

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Create the feature branch from main**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && git checkout -b feat/dashboard-hero-workflow-health && git branch --show-current
```

Expected: `feat/dashboard-hero-workflow-health`

- [ ] **Step 2: Append the 4 new env vars to `.env.local`**

Open `/home/lawand/Desktop/my-startup/opsradar/.env.local` and append (only if absent — leave any existing lines alone):

```
CTO_BACKEND_URL=https://opstest.atta.codes
DEFAULT_MINUTES_PER_EXECUTION=5
DEFAULT_HOURLY_RATE_USD=25
WORKFLOW_MONITOR_URL=https://opstest.atta.codes/#/projects
```

- [ ] **Step 3: Smoke-test that the CTO's backend is reachable**

```bash
curl -s -w "\nHTTP %{http_code}\n" https://opstest.atta.codes/analytics | head -c 300
```

Expected: HTTP 200 with JSON containing `"overview"` and `"workflows_health"`. If 5xx or unreachable, STOP and report BLOCKED — the CTO's backend has to be up to verify this widget at the end.

- [ ] **Step 4: No commit yet** — `.env.local` is gitignored. Branch is created but no files are staged.

---

## Task 2: API route `/api/dashboard/automation-roi`

**Files:**
- Create: `src/app/api/dashboard/automation-roi/route.ts`

- [ ] **Step 1: Create the route file**

Create `/home/lawand/Desktop/my-startup/opsradar/src/app/api/dashboard/automation-roi/route.ts` with this exact content:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const redis = Redis.fromEnv();
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
  | { status: 'error'; message: string; staleData?: AutomationRoiWidget; staleAgeMs?: number };

const CACHE_KEY = 'dash:automation-roi';
const STALE_KEY = `${CACHE_KEY}:stale`;

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
  const fresh = req.nextUrl.searchParams.get('fresh') === '1';

  if (!fresh) {
    const cached = await redis.get<{ data: AutomationRoiWidget; ts: number }>(CACHE_KEY);
    if (cached) {
      return NextResponse.json({ status: 'ok', data: cached.data, fromCache: true });
    }
  }

  const baseUrl = process.env.CTO_BACKEND_URL;
  if (!baseUrl) {
    return NextResponse.json({ status: 'error', message: 'CTO_BACKEND_URL not configured' });
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/analytics`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
  } catch (err) {
    const stale = await redis.get<{ data: AutomationRoiWidget; ts: number }>(STALE_KEY);
    return NextResponse.json({
      status: 'error',
      message: err instanceof Error ? err.message : 'CTO backend unreachable',
      ...(stale && { staleData: stale.data, staleAgeMs: Date.now() - stale.ts }),
    });
  }

  if (!response.ok) {
    const stale = await redis.get<{ data: AutomationRoiWidget; ts: number }>(STALE_KEY);
    return NextResponse.json({
      status: 'error',
      message: `CTO backend returned ${response.status}`,
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
    return NextResponse.json({
      status: 'error',
      message: 'CTO backend returned an unexpected response shape',
    });
  }

  const data = shape(raw);
  const wrapped = { data, ts: Date.now() };
  await Promise.all([
    redis.set(CACHE_KEY, wrapped, { ex: CACHE_TTL_SECONDS }),
    redis.set(STALE_KEY, wrapped, { ex: STALE_TTL_SECONDS }),
  ]);

  return NextResponse.json({ status: 'ok', data, fromCache: false });
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -10
```

Expected: zero errors.

- [ ] **Step 3: Smoke-test the route**

The dev server is running on port 3000. Hit:

```bash
curl -s -w "\nHTTP %{http_code}\n" http://localhost:3000/api/dashboard/automation-roi | head -c 400
```

Expected: HTTP 200, JSON with `"status":"ok"` and a `data` block containing `dollars_saved`, `hours_saved`, `actions_automated`, etc. If you see `"status":"error"`, check that:
- `CTO_BACKEND_URL` is set in `.env.local`
- `https://opstest.atta.codes/analytics` is reachable (run the same curl command from Task 1 Step 3 to confirm)

- [ ] **Step 4: Verify cache by hitting the route again**

```bash
curl -s http://localhost:3000/api/dashboard/automation-roi | grep -o '"fromCache":[^,}]*'
```

Expected: `"fromCache":true` (the second call hits cache).

- [ ] **Step 5: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/app/api/dashboard/automation-roi/route.ts
git commit -m "feat(dashboard): add /api/dashboard/automation-roi route fetching CTO analytics"
```

---

## Task 3: HeroRoiBlock component

**Files:**
- Create: `src/components/dashboard/hero-roi-block.tsx`

- [ ] **Step 1: Create the component file**

Create `/home/lawand/Desktop/my-startup/opsradar/src/components/dashboard/hero-roi-block.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';

type WidgetData = {
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

type ApiResponse =
  | { status: 'ok'; data: WidgetData; fromCache: boolean }
  | { status: 'error'; message: string; staleData?: WidgetData; staleAgeMs?: number };

const C = {
  card: '#0F1923',
  border: 'rgba(0,194,255,0.1)',
  accent: '#00C2FF',
  text: '#E0F0FF',
  muted: '#4A6280',
  green: '#22C55E',
  amber: '#F59E0B',
  red: '#FF4D4D',
};

const fmtCurrency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtNumber = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 0 });

export function HeroRoiBlock() {
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/automation-roi', { cache: 'no-store' });
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
        padding: '28px 28px 24px',
        marginBottom: 14,
      }}
    >
      {loading && <Skeleton />}
      {!loading && response?.status === 'ok' && <Content data={response.data} />}
      {!loading && response?.status === 'error' && (
        <ErrorContent
          message={response.message}
          staleData={response.staleData}
          staleAgeMs={response.staleAgeMs}
          onRetry={load}
        />
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ height: 56, background: 'rgba(0,194,255,0.05)', borderRadius: 6, width: '40%' }} />
      <div style={{ height: 14, background: 'rgba(0,194,255,0.05)', borderRadius: 4, width: '55%' }} />
      <div style={{ height: 28, background: 'rgba(0,194,255,0.05)', borderRadius: 6, width: '70%', marginTop: 4 }} />
    </div>
  );
}

function Content({ data }: { data: WidgetData }) {
  if (data.total_workflows === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>No automations yet</div>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
          Once your first workflow runs, your saved hours and dollars will show up here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 56, fontWeight: 700, color: C.text, lineHeight: 1, letterSpacing: '-1.5px' }}>
        {fmtCurrency(data.dollars_saved)} saved
      </div>
      <div style={{ fontSize: 13.5, color: C.muted }}>
        based on {fmtNumber(data.actions_automated)} actions automated
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        <Chip label={`${data.hours_saved.toFixed(1)}h saved`} tone="accent" />
        <Chip label={`${fmtNumber(data.total_workflows)} workflows`} tone="muted" />
        <Chip
          label={`${fmtNumber(data.open_alerts)} alerts open`}
          tone={data.open_alerts > 0 ? 'amber' : 'muted'}
        />
        <Chip
          label={`${data.success_rate_pct.toFixed(1)}% success rate`}
          tone={data.success_rate_pct >= 90 ? 'green' : data.success_rate_pct >= 50 ? 'amber' : 'red'}
        />
      </div>
    </div>
  );
}

function Chip({ label, tone }: { label: string; tone: 'accent' | 'muted' | 'amber' | 'red' | 'green' }) {
  const colors: Record<typeof tone, { fg: string; bg: string }> = {
    accent: { fg: C.accent, bg: 'rgba(0,194,255,0.1)' },
    muted: { fg: C.muted, bg: 'rgba(74,98,128,0.12)' },
    amber: { fg: C.amber, bg: 'rgba(245,158,11,0.14)' },
    red: { fg: C.red, bg: 'rgba(255,77,77,0.14)' },
    green: { fg: C.green, bg: 'rgba(34,197,94,0.14)' },
  };
  const { fg, bg } = colors[tone];
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: fg,
        background: bg,
        padding: '4px 10px',
        borderRadius: 999,
      }}
    >
      {label}
    </span>
  );
}

function ErrorContent({
  message,
  staleData,
  staleAgeMs,
  onRetry,
}: {
  message: string;
  staleData?: WidgetData;
  staleAgeMs?: number;
  onRetry: () => void;
}) {
  const minutes = staleAgeMs ? Math.round(staleAgeMs / 60_000) : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          background: 'rgba(255,77,77,0.08)',
          border: `1px solid rgba(255,77,77,0.3)`,
          borderRadius: 8,
          padding: '10px 12px',
          fontSize: 12.5,
          color: C.red,
        }}
      >
        Automation system temporarily unreachable.
        {minutes !== null && (
          <span style={{ color: C.muted, marginLeft: 6 }}>
            Last good fetch: {minutes}m ago
          </span>
        )}
      </div>
      {staleData && <Content data={staleData} />}
      <button
        onClick={onRetry}
        style={{
          alignSelf: 'flex-start',
          fontSize: 12,
          color: C.accent,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
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

- [ ] **Step 3: Lint check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run lint -- src/components/dashboard/hero-roi-block.tsx 2>&1 | tail -10
```

Expected: no errors. If `_message` (or any unused param) shows as a warning, prefix with `_` if not already, or remove from the destructure.

- [ ] **Step 4: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/components/dashboard/hero-roi-block.tsx
git commit -m "feat(dashboard): add HeroRoiBlock component with all widget states"
```

---

## Task 4: WorkflowHealthStrip component

**Files:**
- Create: `src/components/dashboard/workflow-health-strip.tsx`

- [ ] **Step 1: Create the component file**

Create `/home/lawand/Desktop/my-startup/opsradar/src/components/dashboard/workflow-health-strip.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';

type WidgetData = {
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

type ApiResponse =
  | { status: 'ok'; data: WidgetData; fromCache: boolean }
  | { status: 'error'; message: string; staleData?: WidgetData; staleAgeMs?: number };

const C = {
  card: '#0F1923',
  border: 'rgba(0,194,255,0.1)',
  accent: '#00C2FF',
  text: '#E0F0FF',
  muted: '#4A6280',
  green: '#22C55E',
  amber: '#F59E0B',
  red: '#FF4D4D',
};

export function WorkflowHealthStrip() {
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/dashboard/automation-roi', { cache: 'no-store' });
        const data = (await res.json()) as ApiResponse;
        if (!cancelled) setResponse(data);
      } catch (err) {
        if (!cancelled) {
          setResponse({
            status: 'error',
            message: err instanceof Error ? err.message : 'Network error',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const data: WidgetData | undefined =
    response?.status === 'ok' ? response.data : response?.staleData;

  const failingTone = (data?.failing_count ?? 0) > 0;

  return (
    <div
      style={{
        background: failingTone ? 'rgba(255,77,77,0.05)' : C.card,
        border: `1px solid ${failingTone ? 'rgba(255,77,77,0.18)' : C.border}`,
        borderRadius: 12,
        padding: '14px 20px',
        marginBottom: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      {loading && (
        <div
          style={{ height: 18, width: 320, background: 'rgba(0,194,255,0.05)', borderRadius: 4 }}
        />
      )}
      {!loading && data && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <Pill dotColor={C.green} label={`${data.healthy_count} healthy`} />
          <Pill
            dotColor={data.failing_count > 0 ? C.red : C.muted}
            label={`${data.failing_count} failing`}
          />
          <Pill
            dotColor={data.open_alerts > 0 ? C.amber : C.muted}
            label={`${data.open_alerts} alerts`}
          />
        </div>
      )}
      {!loading && !data && response?.status === 'error' && (
        <span style={{ fontSize: 12.5, color: C.red }}>
          Automation status unavailable — {response.message}
        </span>
      )}
      <a
        href={data?.monitor_url ?? 'https://opstest.atta.codes/#/projects'}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 12.5,
          fontWeight: 500,
          color: C.accent,
          textDecoration: 'none',
        }}
      >
        Open monitor →
      </a>
    </div>
  );
}

function Pill({ dotColor, label }: { dotColor: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.text }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
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
cd /home/lawand/Desktop/my-startup/opsradar && npm run lint -- src/components/dashboard/workflow-health-strip.tsx 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/components/dashboard/workflow-health-strip.tsx
git commit -m "feat(dashboard): add WorkflowHealthStrip with healthy/failing/alerts pills"
```

---

## Task 5: Wire components into the dashboard overview page

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Open the page**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && wc -l src/app/dashboard/page.tsx
```

Note the line count for context.

- [ ] **Step 2: Add the imports near the existing imports (alongside the other component imports)**

In `src/app/dashboard/page.tsx`, locate the import block (lines ~1-30) and add these two lines:

```tsx
import { HeroRoiBlock } from '<npm>/components/dashboard/hero-roi-block';
import { WorkflowHealthStrip } from '<npm>/components/dashboard/workflow-health-strip';
```

(Keep them alongside the existing `SalesCard` import, which uses the same `<npm>/components/dashboard/...` pattern.)

- [ ] **Step 3: Insert the two components in the JSX, immediately after `<PageHeader ... />` and BEFORE the static stat-cards row**

Find the `<PageHeader ... />` block (~line 376-392) and the stat-cards `<div>` immediately after it (~line 394-396). Between them, insert:

```tsx
<HeroRoiBlock />
<WorkflowHealthStrip />
```

So the JSX flow becomes:

```tsx
<PageHeader ... />

<HeroRoiBlock />
<WorkflowHealthStrip />

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
  {metrics.map((m) => <StatCard key={m.label} {...m} />)}
</div>
```

(Both components own their own `marginBottom` so no extra wrapper is needed.)

- [ ] **Step 4: TypeScript check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -10
```

Expected: zero errors.

- [ ] **Step 5: Lint check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run lint -- src/app/dashboard/page.tsx 2>&1 | tail -10
```

Expected: no errors (warnings ok).

- [ ] **Step 6: Build check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` (or compiled with warnings — warnings ok, errors not).

- [ ] **Step 7: Smoke check the page renders**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/dashboard
```

Expected: `200`.

- [ ] **Step 8: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/app/dashboard/page.tsx
git commit -m "feat(dashboard): wire HeroRoiBlock and WorkflowHealthStrip into overview"
```

---

## Task 6: End-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Open `/dashboard` in a browser**

Visit http://localhost:3000/dashboard. The page should render with the new blocks at the top:

```
[Page Header — Welcome back!]
[$X saved (Hero ROI block)]                    ← NEW
[●N healthy ●N failing ●N alerts | Open →]      ← NEW
[5 static stat cards]
... (rest of existing content)
```

- [ ] **Step 2: Verify the Hero block shows real numbers**

Cross-check the Hero block against the live `/analytics` response:

```bash
curl -s https://opstest.atta.codes/analytics | python3 -c "import sys,json; d=json.load(sys.stdin)['overview']; succ=d['total_runs']-d['failed_runs']; print(f'Successful runs: {succ}'); print(f'Hours saved: {succ*5/60:.2f}'); print(f'Dollars saved: {succ*5/60*25:.2f}'); print(f'Workflows: {d[\"total_workflows\"]}'); print(f'Alerts: {d[\"unresolved_alerts\"]}'); print(f'Healthy/Unhealthy: {d[\"healthy_workflows\"]}/{d[\"unhealthy_workflows\"]}')"
```

The numbers in the Hero block (dollars saved, hours saved, workflows, alerts) should match this output. Healthy/failing counts in the strip should match too.

- [ ] **Step 3: Verify cache works**

Reload the dashboard. Open browser devtools → Network tab → find the `GET /api/dashboard/automation-roi` request. The response JSON should include `"fromCache": true` after the first load.

- [ ] **Step 4: Verify "Open monitor →" link**

Click the link in the Workflow Health strip. It should open `https://opstest.atta.codes/#/projects` in a new tab.

- [ ] **Step 5: Verify error fallback**

Temporarily break `CTO_BACKEND_URL` in `.env.local` (e.g. set it to `https://opstest.invalid`). Force-refresh the page after waiting 3 minutes (cache TTL) — or hit `http://localhost:3000/api/dashboard/automation-roi?fresh=1` first to bypass cache. Expected: the components render the red "Automation system temporarily unreachable" banner. If a previous successful fetch is still in the 24h stale cache, stale data should also be shown beneath the banner.

Restore `CTO_BACKEND_URL` to the correct value when done.

- [ ] **Step 6: If any step revealed a bug, fix and commit. If everything passed, this verification is complete.**

---

## Self-Review Against Spec

| Spec section | Plan task | Notes |
|---|---|---|
| Direct call to CTO's `/analytics` (no n8n) | Task 2 | API route fetches directly |
| 180s cache TTL + 24h stale backup | Task 2 | Both keys written on success |
| `?fresh=1` cache bypass | Task 2 | Implemented in route |
| Field-by-field mapping (dollars/hours/actions/success_rate/etc.) | Task 2 (`shape()` function) | All fields covered |
| Hero block UI (big $ + sub-stats + chips) | Task 3 | Layout matches spec |
| Workflow Health strip (pills + Open monitor link) | Task 4 | Layout matches spec |
| 5 widget states (loading/data/empty/not-connected/error) | Tasks 3, 4 | Loading + data + empty + error all handled. "Not-connected" doesn't apply (no per-tenant token here) |
| Position above existing stat cards | Task 5 | Wired in correct spot |
| Env vars added | Task 1 | All 4 set |
| End-to-end verification with live numbers | Task 6 | Cross-checks live response |

**Placeholder scan:** No "TBD", no "implement later", no "similar to Task N" — every step has full code or full commands.

**Type consistency:** `WidgetData` shape in Task 3 matches `WidgetData` in Task 4 matches `AutomationRoiWidget` in Task 2. `ApiResponse` shape matches `ApiResult` from the route. All field names (`dollars_saved`, `hours_saved`, `actions_automated`, `success_rate_pct`, `total_workflows`, `open_alerts`, `healthy_count`, `failing_count`, `monitor_url`) align across tasks.
