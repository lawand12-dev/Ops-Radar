# AI COO Intelligence Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the "AI COO for agencies" product by adding scope creep detection, proactive threshold alert emails, and an onboarding checklist that drives time-to-first-value.

**Architecture:** Three independent features built on the existing OpsRadar infrastructure. Scope creep cross-references ClickUp time estimates against Harvest monthly hours per project. Threshold alerts run on a 4-hour Vercel cron and send Resend emails only when a threshold is newly crossed (deduped by a new `alert_notifications` Supabase table). The onboarding checklist reads three existing endpoints and auto-triggers the first briefing.

**Tech Stack:** Next.js 16, TypeScript, Supabase (Postgres), Upstash Redis, Resend, Vercel Cron, ClickUp API v2, Harvest API v2, Stripe API.

**Path alias:** All imports use `<npm>/...` → `./src/...` as configured in `tsconfig.json`.

---

## File Map

**New files:**
- `src/lib/integrations/clickup/scope-adapter.ts` — fetch time estimates per project from ClickUp
- `src/lib/scope-creep.ts` — cross-reference ClickUp budgets with Harvest monthly hours
- `src/app/api/dashboard/scope/route.ts` — scope endpoint (cached, auth-gated)
- `src/app/dashboard/scope/page.tsx` — scope tracker page
- `src/app/dashboard/scope/_components/scope-table.tsx` — project burn table component
- `src/lib/emails/threshold-alert-email.ts` — threshold alert email template
- `src/app/api/cron/threshold-alerts/route.ts` — 4-hour cron for proactive alerts
- `supabase/migrations/20260518_alert_notifications.sql` — dedup table for sent alerts
- `src/app/api/dashboard/onboarding-status/route.ts` — onboarding progress endpoint
- `src/app/dashboard/_components/onboarding-checklist.tsx` — onboarding card

**Modified files:**
- `src/lib/integrations/harvest/adapter.ts` — add `fetchHarvestMonthlyProjectHours`
- `src/lib/dashboard-alert-rules.ts` — add `scopeCreepRule`
- `src/app/api/dashboard/alerts/route.ts` — include scope creep alerts in ribbon
- `src/app/dashboard/_components/sidebar.tsx` — add Scope nav item
- `src/app/dashboard/page.tsx` — add onboarding checklist
- `vercel.json` — add threshold-alerts cron schedule

---

## Task 1: Scope Creep Core — ClickUp Budget Adapter

**Files:**
- Create: `src/lib/integrations/clickup/scope-adapter.ts`

- [ ] **Step 1: Create the ClickUp scope adapter**

```typescript
// src/lib/integrations/clickup/scope-adapter.ts

const BASE = 'https://api.clickup.com/api/v2';

export type ClickupProjectBudget = {
  project_name: string;
  estimated_hours: number;
};

export type ClickupScopeData = {
  projects: ClickupProjectBudget[];
};

type ScopeTask = {
  time_estimate?: number | null;
  list?: { name?: string } | null;
};

export async function fetchClickupProjectBudgets(token: string): Promise<ClickupScopeData> {
  const h = { Authorization: token };

  const teamsRes = await fetch(`${BASE}/team`, { headers: h });
  if (!teamsRes.ok) throw new Error(`ClickUp teams fetch failed: ${teamsRes.status}`);
  const teamsData = (await teamsRes.json()) as { teams?: { id: string }[] };
  const teams = teamsData.teams ?? [];
  if (teams.length === 0) return { projects: [] };

  const teamId = teams[0].id;
  const tasksRes = await fetch(
    `${BASE}/team/${teamId}/task?include_closed=true&subtasks=true&per_page=100`,
    { headers: h },
  );
  if (!tasksRes.ok) throw new Error(`ClickUp tasks fetch failed: ${tasksRes.status}`);
  const tasksData = (await tasksRes.json()) as { tasks?: ScopeTask[] };
  const tasks = tasksData.tasks ?? [];

  const budgetMap = new Map<string, number>();
  for (const task of tasks) {
    const name = task.list?.name ?? 'No project';
    const estimateMs = typeof task.time_estimate === 'number' ? task.time_estimate : 0;
    budgetMap.set(name, (budgetMap.get(name) ?? 0) + estimateMs / 3_600_000);
  }

  const projects: ClickupProjectBudget[] = [...budgetMap.entries()]
    .filter(([, hours]) => hours > 0)
    .map(([project_name, hours]) => ({
      project_name,
      estimated_hours: Math.round(hours * 10) / 10,
    }))
    .sort((a, b) => b.estimated_hours - a.estimated_hours);

  return { projects };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/integrations/clickup/scope-adapter.ts
git commit -m "feat(scope): ClickUp project budget adapter — fetches time_estimate per list"
```

---

## Task 2: Harvest Monthly Project Hours

**Files:**
- Modify: `src/lib/integrations/harvest/adapter.ts`

- [ ] **Step 1: Read the current file to understand its structure before editing**

Read `src/lib/integrations/harvest/adapter.ts` and locate the end of the file (after `fetchHarvestTimeData`).

- [ ] **Step 2: Add monthly project hours function at the bottom of `adapter.ts`**

The existing `HarvestEntry` type in this file already has `project?: { name?: string } | null`. Add after the last export:

```typescript
export type HarvestMonthlyProjectRow = {
  project_name: string;
  hours: number;
};

export type HarvestMonthlyProjectData = {
  projects: HarvestMonthlyProjectRow[];
};

export async function fetchHarvestMonthlyProjectHours(
  combined: string,
): Promise<HarvestMonthlyProjectData> {
  const parsed = parseCombined(combined);
  if (!parsed) throw new Error('Harvest credentials malformed');
  const h = headers(parsed.accountId, parsed.token);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const params = new URLSearchParams({
    from: monthStart.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
    per_page: '100',
  });

  const res = await fetch(`${BASE}/time_entries?${params}`, { headers: h });
  if (!res.ok) throw new Error(`Harvest monthly project fetch failed: ${res.status}`);
  const body = (await res.json()) as { time_entries?: HarvestEntry[] };
  const entries = body.time_entries ?? [];

  const projectMap = new Map<string, number>();
  for (const e of entries) {
    const name = e.project?.name ?? 'No project';
    projectMap.set(name, (projectMap.get(name) ?? 0) + (Number(e.hours) || 0));
  }

  const projects: HarvestMonthlyProjectRow[] = [...projectMap.entries()]
    .map(([project_name, hours]) => ({
      project_name,
      hours: Math.round(hours * 10) / 10,
    }))
    .sort((a, b) => b.hours - a.hours);

  return { projects };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd opsradar && npm run build 2>&1 | head -30
```

Expected: no type errors in the harvest adapter.

- [ ] **Step 4: Commit**

```bash
git add src/lib/integrations/harvest/adapter.ts
git commit -m "feat(scope): add fetchHarvestMonthlyProjectHours — current month by project"
```

---

## Task 3: Scope Creep Computation Library

**Files:**
- Create: `src/lib/scope-creep.ts`

- [ ] **Step 1: Create scope-creep.ts**

```typescript
// src/lib/scope-creep.ts
import type { ClickupScopeData } from './integrations/clickup/scope-adapter';
import type { HarvestMonthlyProjectData } from './integrations/harvest/adapter';

export type ScopeStatus = 'on_track' | 'at_risk' | 'over_budget';

export type ScopeProject = {
  project_name: string;
  estimated_hours: number;
  logged_hours: number;
  burn_pct: number;
  status: ScopeStatus;
  matched: boolean;
};

export type ScopeCreepResult = {
  projects: ScopeProject[];
  unmatched_clickup: string[];
  unmatched_harvest: string[];
};

function normalizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeScopeCreep(
  clickup: ClickupScopeData,
  harvest: HarvestMonthlyProjectData,
): ScopeCreepResult {
  const harvestMap = new Map<string, number>();
  for (const p of harvest.projects) {
    harvestMap.set(normalizeProjectName(p.project_name), p.hours);
  }

  const matchedHarvestNorms = new Set<string>();
  const projects: ScopeProject[] = [];

  for (const cp of clickup.projects) {
    const norm = normalizeProjectName(cp.project_name);
    const loggedHours = harvestMap.get(norm) ?? 0;
    const isMatched = harvestMap.has(norm);
    if (isMatched) matchedHarvestNorms.add(norm);

    const burn_pct =
      cp.estimated_hours > 0
        ? Math.round((loggedHours / cp.estimated_hours) * 1000) / 10
        : 0;

    projects.push({
      project_name: cp.project_name,
      estimated_hours: cp.estimated_hours,
      logged_hours: Math.round(loggedHours * 10) / 10,
      burn_pct,
      status: burn_pct >= 100 ? 'over_budget' : burn_pct >= 80 ? 'at_risk' : 'on_track',
      matched: isMatched,
    });
  }

  return {
    projects: projects.sort((a, b) => b.burn_pct - a.burn_pct),
    unmatched_clickup: clickup.projects
      .filter((cp) => !harvestMap.has(normalizeProjectName(cp.project_name)))
      .map((cp) => cp.project_name),
    unmatched_harvest: harvest.projects
      .filter((hp) => !matchedHarvestNorms.has(normalizeProjectName(hp.project_name)))
      .map((hp) => hp.project_name),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/scope-creep.ts
git commit -m "feat(scope): scope creep computation — ClickUp estimates vs Harvest monthly hours"
```

---

## Task 4: Scope API Endpoint

**Files:**
- Create: `src/app/api/dashboard/scope/route.ts`

- [ ] **Step 1: Create the scope API route**

```typescript
// src/app/api/dashboard/scope/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { fetchClickupProjectBudgets } from '<npm>/lib/integrations/clickup/scope-adapter';
import { fetchHarvestMonthlyProjectHours } from '<npm>/lib/integrations/harvest/adapter';
import { computeScopeCreep, type ScopeCreepResult } from '<npm>/lib/scope-creep';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY = (userId: string) => `dash:scope:${userId}`;

type ScopeResponse =
  | { status: 'ok'; data: ScopeCreepResult; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected'; missing: ('clickup' | 'harvest')[] }
  | { status: 'unavailable'; message: string };

export async function GET(): Promise<NextResponse<ScopeResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const { data: integrations } = await supabase
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .in('tool', ['clickup', 'harvest']);

  const clickupRow = integrations?.find((r) => r.tool === 'clickup');
  const harvestRow = integrations?.find((r) => r.tool === 'harvest');

  const missing: ('clickup' | 'harvest')[] = [];
  if (!clickupRow?.encrypted_token || clickupRow.status !== 'connected') missing.push('clickup');
  if (!harvestRow?.encrypted_token || harvestRow.status !== 'connected') missing.push('harvest');

  if (missing.length === 2) {
    return NextResponse.json({ status: 'not_connected', missing });
  }

  const redis = (() => { try { return Redis.fromEnv(); } catch { return null; } })();
  if (redis && missing.length === 0) {
    const cached = await redis.get<ScopeResponse>(CACHE_KEY(userId));
    if (cached?.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  try {
    const [clickupData, harvestData] = await Promise.all([
      clickupRow?.encrypted_token && clickupRow.status === 'connected'
        ? fetchClickupProjectBudgets(decryptApiKey(clickupRow))
        : Promise.resolve({ projects: [] }),
      harvestRow?.encrypted_token && harvestRow.status === 'connected'
        ? fetchHarvestMonthlyProjectHours(decryptApiKey(harvestRow))
        : Promise.resolve({ projects: [] }),
    ]);

    const data = computeScopeCreep(clickupData, harvestData);
    const last_synced_at = new Date().toISOString();
    const payload: ScopeResponse = { status: 'ok', data, last_synced_at, from_cache: false };

    if (redis && missing.length === 0) {
      await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error('[scope] fetch failed:', err);
    return NextResponse.json({
      status: 'unavailable',
      message: err instanceof Error ? err.message : 'fetch_failed',
    });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd opsradar && npm run build 2>&1 | grep -E "error|warning" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/scope/route.ts
git commit -m "feat(scope): /api/dashboard/scope — scope creep endpoint with 1h Redis cache"
```

---

## Task 5: Scope Creep Dashboard Page

**Files:**
- Create: `src/app/dashboard/scope/_components/scope-table.tsx`
- Create: `src/app/dashboard/scope/page.tsx`

- [ ] **Step 1: Create the scope table component**

```typescript
// src/app/dashboard/scope/_components/scope-table.tsx
'use client';

import type { ScopeProject } from '<npm>/lib/scope-creep';
import Link from 'next/link';

const STATUS_STYLES: Record<
  ScopeProject['status'],
  { bg: string; text: string; label: string }
> = {
  on_track:    { bg: 'bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)]', text: 'text-[var(--color-success)]',  label: 'On Track'    },
  at_risk:     { bg: 'bg-[color-mix(in_srgb,var(--color-warn)_14%,transparent)]',    text: 'text-[var(--color-warn)]',     label: 'At Risk'     },
  over_budget: { bg: 'bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)]',  text: 'text-[var(--color-danger)]',   label: 'Over Budget' },
};

function BurnBar({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100);
  const color = pct >= 100 ? 'var(--color-danger)' : pct >= 80 ? 'var(--color-warn)' : 'var(--color-success)';
  return (
    <div className="h-1.5 w-full rounded-full bg-[var(--color-surface-sunken)]">
      <div
        className="h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${capped}%`, background: color }}
      />
    </div>
  );
}

export function ScopeTable({ projects }: { projects: ScopeProject[] }) {
  if (projects.length === 0) {
    return (
      <p className="text-body-sm text-[var(--color-fg-muted)]">
        No projects with time budgets found in ClickUp. Add time estimates to your ClickUp tasks to track scope burn.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-body-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="py-2 pr-4 text-left font-medium text-[var(--color-fg-muted)]">Project</th>
            <th className="py-2 px-4 text-right font-medium text-[var(--color-fg-muted)]">Budget h</th>
            <th className="py-2 px-4 text-right font-medium text-[var(--color-fg-muted)]">Logged h</th>
            <th className="py-2 px-4 min-w-[140px] font-medium text-[var(--color-fg-muted)]">Burn</th>
            <th className="py-2 pl-4 text-right font-medium text-[var(--color-fg-muted)]">Status</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const s = STATUS_STYLES[p.status];
            return (
              <tr
                key={p.project_name}
                className="border-b border-[var(--color-border)] last:border-0"
              >
                <td className="py-2.5 pr-4 font-medium text-[var(--color-fg)]">
                  {p.project_name}
                  {!p.matched && (
                    <span className="ml-2 text-label text-[var(--color-fg-subtle)]">(no Harvest match)</span>
                  )}
                </td>
                <td className="py-2.5 px-4 text-right tabular-nums text-[var(--color-fg-muted)]">
                  {p.estimated_hours}h
                </td>
                <td className="py-2.5 px-4 text-right tabular-nums text-[var(--color-fg-muted)]">
                  {p.logged_hours}h
                </td>
                <td className="py-2.5 px-4">
                  <div className="flex flex-col gap-1">
                    <BurnBar pct={p.burn_pct} />
                    <span className="text-label tabular-nums text-[var(--color-fg-muted)]">
                      {p.burn_pct}%
                    </span>
                  </div>
                </td>
                <td className="py-2.5 pl-4 text-right">
                  <span
                    className={`inline-block rounded-[3px] px-1.5 py-0.5 text-label font-medium ${s.bg} ${s.text}`}
                  >
                    {s.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ScopeNotConnected({ missing }: { missing: ('clickup' | 'harvest')[] }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
      <p className="font-medium text-[var(--color-fg)]">Connect your tools to track scope</p>
      <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
        {missing.includes('clickup') && missing.includes('harvest')
          ? 'Both ClickUp (for budgets) and Harvest (for logged hours) are required.'
          : missing.includes('clickup')
          ? 'ClickUp is required for project time budgets.'
          : 'Harvest is required for logged hours.'}
      </p>
      <Link
        href="/dashboard/integrations"
        className="mt-4 inline-block rounded-[var(--radius)] bg-[var(--color-primary)] px-4 py-2 text-body-sm font-medium text-white no-underline hover:opacity-90"
      >
        Connect Integrations →
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Create the scope page**

```typescript
// src/app/dashboard/scope/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ScopeTable, ScopeNotConnected } from './_components/scope-table';
import type { ScopeCreepResult } from '<npm>/lib/scope-creep';

type ApiResp =
  | { status: 'ok'; data: ScopeCreepResult; last_synced_at: string }
  | { status: 'not_connected'; missing: ('clickup' | 'harvest')[] }
  | { status: 'unavailable'; message: string };

type PageState =
  | { kind: 'loading' }
  | { kind: 'not_connected'; missing: ('clickup' | 'harvest')[] }
  | { kind: 'error' }
  | { kind: 'ok'; data: ScopeCreepResult; last_synced_at: string };

export default function ScopePage() {
  const [state, setState] = useState<PageState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/scope')
      .then((r) => r.json())
      .then((resp: ApiResp) => {
        if (cancelled) return;
        if (resp.status === 'not_connected') {
          setState({ kind: 'not_connected', missing: resp.missing });
        } else if (resp.status === 'ok') {
          setState({ kind: 'ok', data: resp.data, last_synced_at: resp.last_synced_at });
        } else {
          setState({ kind: 'error' });
        }
      })
      .catch(() => { if (!cancelled) setState({ kind: 'error' }); });
    return () => { cancelled = true; };
  }, []);

  const atRisk =
    state.kind === 'ok'
      ? state.data.projects.filter((p) => p.status === 'at_risk' || p.status === 'over_budget').length
      : 0;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="text-body-sm text-[var(--color-fg-muted)]">
          Dashboard /{' '}
          <span className="font-semibold text-[var(--color-fg)]">Scope Tracker</span>
        </div>
        {state.kind === 'ok' && (
          <span className="text-label text-[var(--color-fg-subtle)]">
            Synced {new Date(state.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      <div className="mb-1">
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
            Scope Tracker
          </h1>
          {atRisk > 0 && (
            <span className="inline-block rounded-[3px] bg-[color-mix(in_srgb,var(--color-warn)_14%,transparent)] px-1.5 py-0.5 text-label font-medium text-[var(--color-warn)]">
              {atRisk} at risk
            </span>
          )}
        </div>
        <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
          ClickUp time budgets vs Harvest hours this month — catch scope creep before it costs you.
        </p>
      </div>

      {state.kind === 'loading' && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-[var(--radius)] bg-[var(--color-surface-sunken)]" />
          ))}
        </div>
      )}

      {state.kind === 'not_connected' && (
        <ScopeNotConnected missing={state.missing} />
      )}

      {state.kind === 'error' && (
        <p className="text-body-sm text-[var(--color-danger)]">
          Failed to load scope data. Check your ClickUp and Harvest connections.
        </p>
      )}

      {state.kind === 'ok' && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <ScopeTable projects={state.data.projects} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd opsradar && npm run build 2>&1 | grep -E "error TS" | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/scope/
git commit -m "feat(scope): scope tracker page — ClickUp budget vs Harvest hours burn table"
```

---

## Task 6: Scope Alert Rule + Cockpit Integration

**Files:**
- Modify: `src/lib/dashboard-alert-rules.ts`
- Modify: `src/app/api/dashboard/alerts/route.ts`
- Modify: `src/app/dashboard/_components/sidebar.tsx`

- [ ] **Step 1: Read `src/lib/dashboard-alert-rules.ts` to find where to add the new rule**

It should go after the last exported rule function, before the `sortAlertsBySeverity` function.

- [ ] **Step 2: Add `scopeCreepRule` to `src/lib/dashboard-alert-rules.ts`**

Add this function before `sortAlertsBySeverity`:

```typescript
/** Scope creep: a project has logged >= threshold% of its ClickUp time estimate. */
export function scopeCreepRule(input: {
  projectName: string;
  burnPct: number;
  threshold?: number;
}): DashboardAlert | null {
  const threshold = input.threshold ?? 80;
  if (input.burnPct < threshold) return null;
  const statusText = input.burnPct >= 100 ? 'over budget' : `${Math.round(input.burnPct)}% burned`;
  return {
    id: `scope-${input.projectName.replace(/\W+/g, '-').toLowerCase().slice(0, 40)}`,
    severity: input.burnPct >= 100 ? 'needs-you' : 'watch',
    label: severityLabel(input.burnPct >= 100 ? 'needs-you' : 'watch'),
    message: `"${input.projectName}" is ${statusText} — review scope or bill overage.`,
    href: '/dashboard/scope',
  };
}
```

- [ ] **Step 3: Read `src/app/api/dashboard/alerts/route.ts` to understand current imports and structure**

The file imports from `<npm>/lib/dashboard-alert-rules` and fetches `finance`, `sales-live`, `workflow-health`, `marketing`. Scope will be added as a fifth fetch.

- [ ] **Step 4: Modify `src/app/api/dashboard/alerts/route.ts` to include scope alerts**

At the top, add `scopeCreepRule` to the import:
```typescript
import {
  stripeAuthErrorRule,
  elevatedErrorRateRule,
  stuckDealRule,
  failingWorkflowRule,
  emptyCalendarRule,
  scopeCreepRule,
  sortAlertsBySeverity,
  MAX_COCKPIT_ALERTS,
  type DashboardAlert,
} from '<npm>/lib/dashboard-alert-rules';
```

In the `settled` block, add `fetchJson(request, 'scope')` as the fifth item:
```typescript
const settled = await Promise.allSettled([
  fetchJson(request, 'finance'),
  fetchJson(request, 'sales-live'),
  fetchJson(request, 'workflow-health'),
  fetchJson(request, 'marketing'),
  fetchJson(request, 'scope'),
]);
const [finance, sales, workflows, marketing, scope] = settled.map(
  (s) => (s.status === 'fulfilled' ? s.value : null),
);
```

Add scope rules after the existing `emptyCalendarRule` candidate push (before the `const alerts = sortAlertsBySeverity` line):
```typescript
// ── Scope creep ───────────────────────────────────────────────────────────────
type ScopeProject = {
  project_name?: string;
  burn_pct?: number;
};
const scopeProjects =
  (scope as { status?: string; data?: { projects?: ScopeProject[] } } | null)?.data?.projects ?? [];
for (const p of scopeProjects) {
  if (!p.project_name || typeof p.burn_pct !== 'number') continue;
  candidates.push(scopeCreepRule({ projectName: p.project_name, burnPct: p.burn_pct }));
}
```

- [ ] **Step 5: Add Scope to sidebar**

Read `src/app/dashboard/_components/sidebar.tsx`. Find the `navSections` array. After `{ label: 'Profitability', ... }`, add:

```typescript
{ label: 'Scope',          href: '/dashboard/scope',          icon: Target          },
```

At the top of the file, add `Target` to the lucide-react import.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd opsradar && npm run build 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/dashboard-alert-rules.ts src/app/api/dashboard/alerts/route.ts src/app/dashboard/_components/sidebar.tsx
git commit -m "feat(scope): scope creep alert rule — feeds cockpit ribbon + adds sidebar nav"
```

---

## Task 7: Supabase Migration — Alert Notifications Table

**Files:**
- Create: `supabase/migrations/20260518_alert_notifications.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260518_alert_notifications.sql
-- Deduplication table for threshold-based alert emails.
-- Prevents re-sending the same alert for the same entity within the cooldown window.

CREATE TABLE IF NOT EXISTS alert_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  alert_kind text NOT NULL,
  entity_name text NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  email_sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS alert_notifications_lookup
  ON alert_notifications (user_id, alert_kind, entity_name, triggered_at DESC);

ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;

-- Only the service role (server-side) can read/write alert notifications.
-- No user-facing RLS policy needed since this table is only accessed server-side.
CREATE POLICY "service_role_only" ON alert_notifications
  USING (false)
  WITH CHECK (false);
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use the Supabase MCP tool `apply_migration` with the SQL above for project `nbdcrmepvwbfbcjqfubr`.

- [ ] **Step 3: Verify the table exists**

Run via Supabase MCP `execute_sql`:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'alert_notifications' 
ORDER BY ordinal_position;
```

Expected: columns `id`, `user_id`, `alert_kind`, `entity_name`, `triggered_at`, `email_sent_at`.

- [ ] **Step 4: Commit the migration file**

```bash
git add supabase/migrations/20260518_alert_notifications.sql
git commit -m "feat(alerts): alert_notifications table — dedup sent threshold alert emails"
```

---

## Task 8: Threshold Alert Email Template

**Files:**
- Create: `src/lib/emails/threshold-alert-email.ts`

- [ ] **Step 1: Create the email template**

```typescript
// src/lib/emails/threshold-alert-email.ts

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://opsradar.co';

export type AlertEmailKind =
  | 'negative_margin'
  | 'scope_over_budget'
  | 'scope_at_risk'
  | 'invoice_overdue';

export type ThresholdAlertPayload = {
  kind: AlertEmailKind;
  entityName: string;
  detail: string;
};

const KIND_META: Record<AlertEmailKind, { label: string; isAlert: boolean }> = {
  negative_margin:   { label: 'Client losing money',   isAlert: true  },
  scope_over_budget: { label: 'Scope over budget',      isAlert: true  },
  scope_at_risk:     { label: 'Scope at risk (>80%)',   isAlert: false },
  invoice_overdue:   { label: 'Invoice overdue 30+ days', isAlert: true },
};

export function buildThresholdAlertEmail(
  payload: ThresholdAlertPayload,
  firstName: string,
): { subject: string; html: string } {
  const meta = KIND_META[payload.kind];
  const accentColor = meta.isAlert ? '#ef4444' : '#f59e0b';
  const accentBg = meta.isAlert ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)';
  const ctaUrl = `${BASE_URL}/dashboard/${payload.kind.startsWith('scope') ? 'scope' : payload.kind === 'invoice_overdue' ? 'profitability' : 'profitability'}`;

  const subject = `${firstName ? firstName + ', ' : ''}${meta.label}: ${payload.entityName}`;

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#060c1e;color:#eef2ff;border-radius:14px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#0f1e45,#060c1e);padding:32px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.07);">
    <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.3);">OpsRadar · Alert</p>
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#eef2ff;">Action needed${firstName ? ', ' + firstName : ''}</h1>
  </div>
  <div style="padding:28px 32px;">
    <div style="background:${accentBg};border:1px solid ${accentColor};border-left:3px solid ${accentColor};border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${accentColor};">${meta.label}</p>
      <p style="margin:0;font-size:18px;font-weight:600;color:#eef2ff;">${payload.entityName}</p>
      <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.65);">${payload.detail}</p>
    </div>
    <div style="text-align:center;">
      <a href="${ctaUrl}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">View in OpsRadar →</a>
    </div>
    <p style="margin:24px 0 0;font-size:12px;color:rgba(255,255,255,0.25);text-align:center;">
      Your AI COO monitors this 24/7. 
      <a href="${BASE_URL}/dashboard/settings" style="color:rgba(255,255,255,0.35);">Manage notifications</a>
    </p>
  </div>
</div>`.trim();

  return { subject, html };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/emails/threshold-alert-email.ts
git commit -m "feat(alerts): threshold alert email template — negative margin, scope, overdue"
```

---

## Task 9: Threshold Alert Cron

**Files:**
- Create: `src/app/api/cron/threshold-alerts/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Create the cron route**

```typescript
// src/app/api/cron/threshold-alerts/route.ts
import { Resend } from 'resend';
import { getServerSupabaseClient, hasServerSupabaseClient } from '<npm>/lib/supabase-server';
import { serverErrorResponse } from '<npm>/lib/security';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { fetchStripePerClientRevenue } from '<npm>/lib/integrations/stripe/profitability-adapter';
import { fetchHarvestPerClientHours } from '<npm>/lib/integrations/harvest/profitability-adapter';
import { computeClientProfitability } from '<npm>/lib/profitability';
import { fetchClickupProjectBudgets } from '<npm>/lib/integrations/clickup/scope-adapter';
import { fetchHarvestMonthlyProjectHours } from '<npm>/lib/integrations/harvest/adapter';
import { computeScopeCreep } from '<npm>/lib/scope-creep';
import {
  buildThresholdAlertEmail,
  type AlertEmailKind,
} from '<npm>/lib/emails/threshold-alert-email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const resend = new Resend(process.env.RESEND_API_KEY);
const CRON_SECRET = process.env.CRON_SECRET;
const DEFAULT_BLENDED_RATE = 85;
const ALERT_COOLDOWN_DAYS = 7;

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET) {
    console.error('[threshold-alerts] missing CRON_SECRET');
    return serverErrorResponse();
  }
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasServerSupabaseClient()) return serverErrorResponse();

  const supabase = getServerSupabaseClient();
  const stats = { sent: 0, skipped: 0, errors: 0 };

  // Find users with both Stripe or Harvest connected
  const { data: rows } = await supabase
    .from('integrations')
    .select('client_id, tool')
    .eq('status', 'connected')
    .not('encrypted_token', 'is', null)
    .in('tool', ['stripe', 'harvest', 'clickup']);

  if (!rows || rows.length === 0) {
    return Response.json({ ok: true, stats });
  }

  // Group tools per user
  const userTools = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!userTools.has(row.client_id)) userTools.set(row.client_id, new Set());
    userTools.get(row.client_id)!.add(row.tool);
  }

  const cooldownThreshold = new Date(
    Date.now() - ALERT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  for (const [userId, tools] of userTools.entries()) {
    try {
      const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(userId);
      if (userErr || !user?.email) { stats.skipped++; continue; }

      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      if (meta.threshold_alerts_enabled === false) { stats.skipped++; continue; }

      const firstName = (typeof meta.full_name === 'string' ? meta.full_name : '').split(' ')[0] ?? '';
      const blendedRate = typeof meta.blended_hourly_rate_usd === 'number'
        ? meta.blended_hourly_rate_usd : DEFAULT_BLENDED_RATE;

      const { data: keyRows } = await supabase
        .from('integrations')
        .select('tool, encrypted_token, iv, auth_tag, status')
        .eq('client_id', userId)
        .eq('status', 'connected');

      const getKey = (tool: string) => {
        const row = (keyRows ?? []).find((r) => r.tool === tool);
        if (!row?.encrypted_token) return null;
        return decryptApiKey(row);
      };

      // ── Profitability alerts (negative margin + invoice overdue) ──────────
      if (tools.has('stripe') && tools.has('harvest')) {
        const stripeKey = getKey('stripe');
        const harvestKey = getKey('harvest');
        if (stripeKey && harvestKey) {
          const [stripeData, harvestData] = await Promise.all([
            fetchStripePerClientRevenue(stripeKey),
            fetchHarvestPerClientHours(harvestKey),
          ]);
          const profResult = computeClientProfitability(stripeData, harvestData, blendedRate);

          for (const client of profResult.clients) {
            // Negative margin alert
            if (client.hours_mtd > 0 && client.margin_pct < 0) {
              const sent = await wasAlertSentRecently(
                supabase, userId, 'negative_margin', client.name, cooldownThreshold,
              );
              if (!sent) {
                const { subject, html } = buildThresholdAlertEmail(
                  {
                    kind: 'negative_margin',
                    entityName: client.name,
                    detail: `Margin is ${Math.round(client.margin_pct)}% this month. Losing ${fmtMoney(Math.abs(client.cost_mtd - client.revenue_mtd))} on this client.`,
                  },
                  firstName,
                );
                await sendAndRecord(supabase, resend, userId, user.email, 'negative_margin', client.name, subject, html, stats);
              }
            }

            // Invoice overdue 30+ days alert
            if (client.payment_status === 'overdue' && (client.days_overdue ?? 0) >= 30 && client.revenue_mtd > 1000) {
              const sent = await wasAlertSentRecently(
                supabase, userId, 'invoice_overdue', client.name, cooldownThreshold,
              );
              if (!sent) {
                const { subject, html } = buildThresholdAlertEmail(
                  {
                    kind: 'invoice_overdue',
                    entityName: client.name,
                    detail: `Invoice is ${client.days_overdue} days overdue (${fmtMoney(client.revenue_mtd)}). Follow up now.`,
                  },
                  firstName,
                );
                await sendAndRecord(supabase, resend, userId, user.email, 'invoice_overdue', client.name, subject, html, stats);
              }
            }
          }
        }
      }

      // ── Scope creep alerts ────────────────────────────────────────────────
      if (tools.has('clickup') && tools.has('harvest')) {
        const clickupKey = getKey('clickup');
        const harvestKey = getKey('harvest');
        if (clickupKey && harvestKey) {
          const [clickupData, harvestMonthly] = await Promise.all([
            fetchClickupProjectBudgets(clickupKey),
            fetchHarvestMonthlyProjectHours(harvestKey),
          ]);
          const scopeResult = computeScopeCreep(clickupData, harvestMonthly);

          for (const project of scopeResult.projects) {
            if (project.status === 'on_track') continue;
            const kind: AlertEmailKind =
              project.status === 'over_budget' ? 'scope_over_budget' : 'scope_at_risk';
            const sent = await wasAlertSentRecently(
              supabase, userId, kind, project.project_name, cooldownThreshold,
            );
            if (!sent) {
              const { subject, html } = buildThresholdAlertEmail(
                {
                  kind,
                  entityName: project.project_name,
                  detail: `${project.burn_pct}% of time budget used (${project.logged_hours}h of ${project.estimated_hours}h budgeted this month).`,
                },
                firstName,
              );
              await sendAndRecord(supabase, resend, userId, user.email, kind, project.project_name, subject, html, stats);
            }
          }
        }
      }
    } catch (err) {
      console.error('[threshold-alerts] error for user', userId, err);
      stats.errors++;
    }
  }

  console.log('[threshold-alerts] done', stats);
  return Response.json({ ok: true, stats });
}

async function wasAlertSentRecently(
  supabase: ReturnType<typeof getServerSupabaseClient>,
  userId: string,
  kind: string,
  entityName: string,
  since: string,
): Promise<boolean> {
  const { count } = await supabase
    .from('alert_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('alert_kind', kind)
    .eq('entity_name', entityName)
    .gte('triggered_at', since);
  return (count ?? 0) > 0;
}

async function sendAndRecord(
  supabase: ReturnType<typeof getServerSupabaseClient>,
  resend: Resend,
  userId: string,
  email: string,
  kind: string,
  entityName: string,
  subject: string,
  html: string,
  stats: { sent: number; skipped: number; errors: number },
): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from('alert_notifications').insert({
    user_id: userId,
    alert_kind: kind,
    entity_name: entityName,
    triggered_at: now,
  });

  const { error } = await resend.emails.send({
    from: 'OpsRadar <notifications@opsradar.co>',
    to: email,
    subject,
    html,
  });

  if (error) {
    console.error('[threshold-alerts] email send failed', kind, entityName, error);
    stats.errors++;
    return;
  }

  await supabase
    .from('alert_notifications')
    .update({ email_sent_at: now })
    .eq('user_id', userId)
    .eq('alert_kind', kind)
    .eq('entity_name', entityName)
    .eq('triggered_at', now);

  stats.sent++;
}

function fmtMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}
```

- [ ] **Step 2: Add the cron schedule to `vercel.json`**

Read `vercel.json` and add the threshold-alerts cron to the existing `crons` array:

```json
{
  "path": "/api/cron/threshold-alerts",
  "schedule": "0 */4 * * *"
}
```

Result — `vercel.json` crons section should be:
```json
"crons": [
  { "path": "/api/cron/followups",          "schedule": "0 10 * * *"    },
  { "path": "/api/cron/weekly-briefing",    "schedule": "0 8 * * 1"     },
  { "path": "/api/cron/actions",            "schedule": "0 9 * * *"     },
  { "path": "/api/cron/benchmarks",         "schedule": "0 23 * * 0"    },
  { "path": "/api/cron/threshold-alerts",   "schedule": "0 */4 * * *"   }
]
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd opsradar && npm run build 2>&1 | grep -E "error TS" | head -30
```

Expected: no type errors in the cron route.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/threshold-alerts/route.ts vercel.json
git commit -m "feat(alerts): threshold alert cron — emails agencies when margin/scope/invoice thresholds crossed (4h, 7d dedup)"
```

---

## Task 10: Onboarding Status Endpoint

**Files:**
- Create: `src/app/api/dashboard/onboarding-status/route.ts`

- [ ] **Step 1: Create the onboarding status route**

```typescript
// src/app/api/dashboard/onboarding-status/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export type OnboardingStatus = {
  steps: {
    time_tracking: boolean;
    billing: boolean;
    blended_rate: boolean;
    first_briefing: boolean;
  };
  complete: boolean;
};

export async function GET(): Promise<NextResponse<OnboardingStatus | { error: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const session = await getSessionSupabaseClient();

  const [{ data: integrations }, { data: userData }, { count: briefingCount }] = await Promise.all([
    supabase
      .from('integrations')
      .select('tool, status')
      .eq('client_id', userId)
      .eq('status', 'connected'),
    session.auth.getUser(),
    supabase
      .from('briefings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  const connectedTools = new Set((integrations ?? []).map((r) => r.tool));
  const meta = (userData?.user?.user_metadata ?? {}) as Record<string, unknown>;

  const steps = {
    time_tracking: connectedTools.has('harvest') || connectedTools.has('toggl'),
    billing: connectedTools.has('stripe'),
    blended_rate:
      typeof meta.blended_hourly_rate_usd === 'number' && meta.blended_hourly_rate_usd > 0,
    first_briefing: (briefingCount ?? 0) > 0,
  };

  return NextResponse.json({
    steps,
    complete: Object.values(steps).every(Boolean),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/dashboard/onboarding-status/route.ts
git commit -m "feat(onboarding): /api/dashboard/onboarding-status — 4-step progress endpoint"
```

---

## Task 11: Onboarding Checklist Component

**Files:**
- Create: `src/app/dashboard/_components/onboarding-checklist.tsx`
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Create the onboarding checklist component**

```typescript
// src/app/dashboard/_components/onboarding-checklist.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { CheckCircle, Circle } from 'lucide-react';
import type { OnboardingStatus } from '<npm>/app/api/dashboard/onboarding-status/route';

type ApiResp = OnboardingStatus | { error: string };

const STEPS: Array<{
  key: keyof OnboardingStatus['steps'];
  label: string;
  description: string;
  href: string;
}> = [
  {
    key: 'time_tracking',
    label: 'Connect time tracking',
    description: 'Harvest or Toggl — so we can track hours per client',
    href: '/dashboard/integrations',
  },
  {
    key: 'billing',
    label: 'Connect billing',
    description: 'Stripe — so we can match revenue to clients',
    href: '/dashboard/integrations',
  },
  {
    key: 'blended_rate',
    label: 'Set your blended hourly rate',
    description: 'Your average cost per hour — used for margin calculations',
    href: '/dashboard/settings',
  },
  {
    key: 'first_briefing',
    label: 'Get your first AI briefing',
    description: 'Your COO summary — delivered in under 30 seconds',
    href: '/dashboard',
  },
];

export function OnboardingChecklist() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);

  const fetchStatus = useCallback(() => {
    fetch('/api/dashboard/onboarding-status')
      .then((r) => r.json())
      .then((d: ApiResp) => {
        if ('steps' in d) setStatus(d);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Auto-generate first briefing when steps 1-3 complete but briefing not yet done
  useEffect(() => {
    if (!status) return;
    const { time_tracking, billing, blended_rate, first_briefing } = status.steps;
    if (time_tracking && billing && blended_rate && !first_briefing && !generatingBriefing) {
      setGeneratingBriefing(true);
      fetch('/api/dashboard/briefing', { method: 'POST' })
        .then(() => fetchStatus())
        .catch(() => {})
        .finally(() => setGeneratingBriefing(false));
    }
  }, [status, generatingBriefing, fetchStatus]);

  if (!status || status.complete) return null;

  const doneCount = Object.values(status.steps).filter(Boolean).length;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-surface))] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-medium text-[var(--color-fg)]">Get your AI COO up and running</p>
          <p className="text-body-sm text-[var(--color-fg-muted)]">
            {doneCount} of {STEPS.length} steps complete
          </p>
        </div>
        <div className="flex gap-1">
          {STEPS.map((s) => (
            <div
              key={s.key}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                status.steps[s.key]
                  ? 'bg-[var(--color-primary)]'
                  : 'bg-[var(--color-surface-sunken)]'
              }`}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {STEPS.map((step) => {
          const done = status.steps[step.key];
          const isGenerating = step.key === 'first_briefing' && generatingBriefing;
          return (
            <Link
              key={step.key}
              href={step.href}
              className={`flex items-start gap-3 rounded-[var(--radius)] px-3 py-2.5 no-underline transition-colors ${
                done
                  ? 'opacity-50 cursor-default pointer-events-none'
                  : 'hover:bg-[var(--color-surface-sunken)]'
              }`}
            >
              {done ? (
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-success)]" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-fg-subtle)]" />
              )}
              <div>
                <p className={`text-body-sm font-medium ${done ? 'text-[var(--color-fg-muted)]' : 'text-[var(--color-fg)]'}`}>
                  {step.label}
                  {isGenerating && (
                    <span className="ml-2 text-label text-[var(--color-fg-subtle)]">generating…</span>
                  )}
                </p>
                {!done && (
                  <p className="text-label text-[var(--color-fg-subtle)]">{step.description}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add `OnboardingChecklist` to the dashboard page**

Read `src/app/dashboard/page.tsx`. Find the `<HealthReportBanner />` line. Add `OnboardingChecklist` import and render it right after `HealthReportBanner`:

```typescript
import { OnboardingChecklist } from './_components/onboarding-checklist';
```

In `DashboardPage`, after `<HealthReportBanner />`:
```tsx
<OnboardingChecklist />
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd opsradar && npm run build 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/dashboard/onboarding-status/route.ts src/app/dashboard/_components/onboarding-checklist.tsx src/app/dashboard/page.tsx
git commit -m "feat(onboarding): checklist card — 4-step guide with auto-briefing trigger"
```

---

## Task 12: End-to-End Verification

- [ ] **Step 1: Start dev server**

```bash
cd opsradar && npm run dev
```

- [ ] **Step 2: Verify scope API**

```bash
curl -s http://localhost:3000/api/dashboard/scope \
  -H "Cookie: <paste a valid session cookie from browser>" | jq .
```

Expected for a user without ClickUp/Harvest: `{ "status": "not_connected", "missing": ["clickup", "harvest"] }`

- [ ] **Step 3: Verify onboarding status**

```bash
curl -s http://localhost:3000/api/dashboard/onboarding-status \
  -H "Cookie: <session cookie>" | jq .
```

Expected: `{ "steps": { "time_tracking": ..., "billing": ..., "blended_rate": ..., "first_briefing": ... }, "complete": false }`

- [ ] **Step 4: Verify scope page loads**

Open `http://localhost:3000/dashboard/scope` in browser. Expect:
- If tools not connected: connect prompt with link to integrations
- If ClickUp + Harvest connected: table with project burn data
- "Scope Tracker" appears in sidebar

- [ ] **Step 5: Verify alert rule fires in ribbon**

Open `http://localhost:3000/api/dashboard/alerts` with auth. If any project has burn > 80%, a scope alert should appear in the response `alerts` array.

- [ ] **Step 6: Run linter**

```bash
cd opsradar && npm run lint 2>&1 | grep -E "error|warning" | head -20
```

Expected: no errors. Fix any lint warnings before proceeding.

- [ ] **Step 7: Final commit if any lint fixes**

```bash
git add -A
git commit -m "fix(scope): lint fixes post-implementation"
```

---

## Self-Review Notes

**Spec coverage:**
- ✅ Scope creep detection ($1K-$20K/month claim) — Tasks 1-6
- ✅ 30-90 day early warning → proactive emails — Tasks 7-9
- ✅ "AI COO working 24/7" → 4-hour cron with threshold emails
- ✅ Time-to-value onboarding → Tasks 10-11
- ✅ Alert ribbon integration → Task 6
- ✅ Sidebar nav updated → Task 6

**Type consistency check:**
- `ScopeCreepResult` defined in `scope-creep.ts`, used by `scope/route.ts` and `alerts/route.ts`
- `ClickupScopeData` defined in `scope-adapter.ts`, consumed by `scope-creep.ts` and `threshold-alerts/route.ts`
- `HarvestMonthlyProjectData` defined in `harvest/adapter.ts`, consumed by same
- `OnboardingStatus` exported from `onboarding-status/route.ts`, imported by `onboarding-checklist.tsx`
- `AlertEmailKind` defined in `threshold-alert-email.ts`, used in `threshold-alerts/route.ts`
- `scopeCreepRule` exported from `dashboard-alert-rules.ts`, imported in `alerts/route.ts`

**No placeholders:** All code blocks are complete. All file paths are exact.
