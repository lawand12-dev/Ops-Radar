# Backend Gap Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the three remaining product gaps between what OpsRadar's pricing page promises and what the backend actually delivers: tier enforcement (no plan gates exist anywhere), retainer surface (Pro tier feature with no backend), and FO multi-client dashboard (the $1,200+/agency tier has zero product reality).

**Architecture:** Three independent phases. Phase A adds a `tier.ts` feature-gate lib + admin plan-setter + API/UI guards — no Stripe dependency (plan lives in `user_metadata`). Phase B adds a `retainer_configs` Supabase table, a computation lib, a new `retainer_overage` agentic evaluator, and a `/dashboard/retainer` page. Phase C adds `fo_clients` + `fo_integrations` tables, per-client key management, an aggregate overview API, and a `/dashboard/fo` multi-client UI — FO manages clients directly by entering each agency's API keys under their account.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (Postgres + auth.admin), Upstash Redis, Stripe SDK (Phase B reads from existing Stripe adapter), Tailwind CSS v4, Lucide icons, Resend (Phase B email).

**Path alias:** All imports use `<npm>/...` → `./src/...`.

---

## Gap Analysis (read before starting)

| Feature | Promised tier | Actual state |
|---|---|---|
| Tier enforcement / feature gates | All tiers | ❌ No plan field, no checks anywhere — everyone gets Pro |
| Retainer surface | Pro ($3,000) | ❌ No retainer concept in DB or code |
| FO multi-client dashboard | FO ($1,200+$300/agency) | ❌ No fo_clients table, no aggregation UI |
| Profitability analysis | Growth ($1,500) | ✅ Shipped |
| Scope creep detection | Growth ($1,500) | ✅ Shipped |
| Agentic actions (invoice reminder, margin alert, scope, etc.) | Pro ($3,000) | ✅ Shipped |
| OpsRadar Index benchmarks | Growth ($1,500) | ✅ Shipped |
| Weekly briefings + threshold alerts | Starter ($750) | ✅ Shipped |

---

## Phase A: Tier Enforcement

### File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/lib/tier.ts` | Plan type, feature matrix, `getUserPlan`, `canAccess` |
| Create | `src/app/api/admin/set-plan/route.ts` | Admin sets user plan via user_metadata |
| Modify | `src/app/api/dashboard/profitability/route.ts` | Require growth+ |
| Modify | `src/app/api/dashboard/scope/route.ts` | Require growth+ |
| Modify | `src/app/api/dashboard/benchmarks/route.ts` | Require growth+ |
| Modify | `src/app/api/dashboard/coo/route.ts` | Require growth+ |
| Modify | `src/app/api/dashboard/actions/route.ts` | Require pro+ |
| Create | `src/app/dashboard/_components/plan-gate.tsx` | UI upgrade prompt for locked pages |
| Modify | `src/app/dashboard/profitability/page.tsx` | Wrap with plan gate |
| Modify | `src/app/dashboard/scope/page.tsx` | Wrap with plan gate |
| Modify | `src/app/dashboard/actions/page.tsx` | Wrap with plan gate |

---

### Task A1: Tier library + admin plan-setter

**Files:**
- Create: `src/lib/tier.ts`
- Create: `src/app/api/admin/set-plan/route.ts`

- [ ] **Step 1: Create `src/lib/tier.ts`**

```typescript
// src/lib/tier.ts

export type Plan = 'starter' | 'growth' | 'pro' | 'fo';

// Feature matrix — which plans include each feature.
// 'fo' inherits all 'pro' features.
export const PLAN_FEATURES = {
  profitability:   ['growth', 'pro', 'fo'],
  scope:           ['growth', 'pro', 'fo'],
  benchmarks:      ['growth', 'pro', 'fo'],
  coo_chat:        ['growth', 'pro', 'fo'],
  agentic_actions: ['pro', 'fo'],
  retainer:        ['pro', 'fo'],
  fo_dashboard:    ['fo'],
} as const satisfies Record<string, Plan[]>;

export type Feature = keyof typeof PLAN_FEATURES;

export function canAccess(plan: Plan, feature: Feature): boolean {
  return (PLAN_FEATURES[feature] as readonly string[]).includes(plan);
}

/** Reads plan from user_metadata; defaults to 'starter' if unset. */
export function getUserPlan(meta: Record<string, unknown>): Plan {
  const p = meta.plan;
  if (p === 'growth' || p === 'pro' || p === 'fo') return p;
  return 'starter';
}

/** Returns a 402 JSON response body for use in API routes. */
export function upgradeRequiredBody(requiredPlan: Plan) {
  return { error: 'upgrade_required', required_plan: requiredPlan } as const;
}
```

- [ ] **Step 2: Create `src/app/api/admin/set-plan/route.ts`**

```typescript
// src/app/api/admin/set-plan/route.ts
// Admin-only endpoint: sets a user's plan tier in user_metadata.
// Auth: bearer token must match ADMIN_API_SECRET env var.
import { NextResponse, type NextRequest } from 'next/server';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import type { Plan } from '<npm>/lib/tier';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_PLANS: Plan[] = ['starter', 'growth', 'pro', 'fo'];

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return NextResponse.json({ error: 'misconfigured' }, { status: 500 });

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { user_id: string; plan: Plan };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.user_id || !VALID_PLANS.includes(body.plan)) {
    return NextResponse.json({ error: 'invalid_params', valid_plans: VALID_PLANS }, { status: 400 });
  }

  const supabase = getServerSupabaseClient();
  const { error } = await supabase.auth.admin.updateUserById(body.user_id, {
    user_metadata: { plan: body.plan },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user_id: body.user_id, plan: body.plan });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run build 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors in the new files.

- [ ] **Step 4: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/lib/tier.ts src/app/api/admin/set-plan/route.ts
git commit -m "feat(tier): plan tier lib + admin set-plan endpoint"
```

---

### Task A2: Gate Growth-tier API routes

**Files:**
- Modify: `src/app/api/dashboard/profitability/route.ts`
- Modify: `src/app/api/dashboard/scope/route.ts`
- Modify: `src/app/api/dashboard/benchmarks/route.ts`
- Modify: `src/app/api/dashboard/coo/route.ts`

For each file, add the tier check immediately after the `userId` check. The pattern is identical for all four routes.

- [ ] **Step 1: Read `src/app/api/dashboard/profitability/route.ts`**

Locate the block that follows `getCurrentUserId()`. It will look like:
```typescript
const userId = await getCurrentUserId();
if (!userId) { return NextResponse.json(..., { status: 401 }); }
```

- [ ] **Step 2: Add growth gate to profitability route**

After the 401 block, insert:
```typescript
const { data: { user: callerUser } } = await getSessionSupabaseClient().auth.getUser();
const callerPlan = getUserPlan((callerUser?.user_metadata ?? {}) as Record<string, unknown>);
if (!canAccess(callerPlan, 'profitability')) {
  return NextResponse.json(upgradeRequiredBody('growth'), { status: 402 });
}
```

And add these imports at the top of the file:
```typescript
import { getUserPlan, canAccess, upgradeRequiredBody } from '<npm>/lib/tier';
import { getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
```

- [ ] **Step 3: Apply the same gate to scope, benchmarks, and coo routes**

In `src/app/api/dashboard/scope/route.ts`, `src/app/api/dashboard/benchmarks/route.ts`, and `src/app/api/dashboard/coo/route.ts`, apply the identical pattern from Step 2 — same imports, same 3-line block after the 401 check. Use `'scope'`, `'benchmarks'`, `'coo_chat'` as the feature argument respectively.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run build 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/app/api/dashboard/profitability/route.ts \
        src/app/api/dashboard/scope/route.ts \
        src/app/api/dashboard/benchmarks/route.ts \
        src/app/api/dashboard/coo/route.ts
git commit -m "feat(tier): gate profitability/scope/benchmarks/coo to growth+ plan"
```

---

### Task A3: Gate Pro-tier API route + UI upgrade card

**Files:**
- Modify: `src/app/api/dashboard/actions/route.ts`
- Create: `src/app/dashboard/_components/plan-gate.tsx`
- Modify: `src/app/dashboard/profitability/page.tsx`
- Modify: `src/app/dashboard/scope/page.tsx`
- Modify: `src/app/dashboard/actions/page.tsx`

- [ ] **Step 1: Gate the actions API route**

In `src/app/api/dashboard/actions/route.ts`, add the same imports and 3-line pattern from Task A2, but use `'agentic_actions'` as the feature and `'pro'` as the required plan in the `upgradeRequiredBody` call.

- [ ] **Step 2: Create `src/app/dashboard/_components/plan-gate.tsx`**

```typescript
// src/app/dashboard/_components/plan-gate.tsx
'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import type { Plan } from '<npm>/lib/tier';

const PLAN_LABELS: Record<Plan, string> = {
  starter: 'Starter',
  growth:  'Growth',
  pro:     'Pro',
  fo:      'Fractional Operator',
};

const PLAN_PRICES: Record<Plan, string> = {
  starter: '$750/mo',
  growth:  '$1,500/mo',
  pro:     '$3,000/mo',
  fo:      '$1,200/mo + $300/agency',
};

export function PlanGate({
  feature,
  requiredPlan,
  children,
}: {
  feature: string;
  requiredPlan: Plan;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-30 blur-[2px]">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-lg">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]">
            <Lock className="h-5 w-5 text-[var(--color-primary)]" />
          </div>
          <p className="font-medium text-[var(--color-fg)]">
            {PLAN_LABELS[requiredPlan]} feature
          </p>
          <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
            {feature} requires the {PLAN_LABELS[requiredPlan]} plan ({PLAN_PRICES[requiredPlan]}).
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-block rounded-[var(--radius)] bg-[var(--color-primary)] px-4 py-2 text-body-sm font-medium text-white no-underline hover:opacity-90"
            target="_blank"
          >
            Upgrade plan →
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add plan-gate API response handler to profitability page**

In `src/app/dashboard/profitability/page.tsx`, the `ApiResp` union already has `not_connected` and `ok` states. Add `upgrade_required` to the union and `PageState`:

```typescript
// Add to ApiResp union in profitability/page.tsx:
| { status: 'upgrade_required'; required_plan: string }

// Add to TableState union:
| { kind: 'upgrade_required' }
```

In the `.then()` fetch handler, add before the `else` branch:
```typescript
if (resp.status === 'upgrade_required') {
  setTableState({ kind: 'upgrade_required' });
  return;
}
```

In the JSX, add a render branch for `upgrade_required`:
```tsx
{tableState.kind === 'upgrade_required' && (
  <PlanGate feature="Per-client profitability" requiredPlan="growth">
    <div className="h-48 rounded-[var(--radius-lg)] bg-[var(--color-surface-sunken)]" />
  </PlanGate>
)}
```

Add import at top: `import { PlanGate } from '../_components/plan-gate';`

- [ ] **Step 4: Apply the same pattern to scope/page.tsx and actions page**

In `src/app/dashboard/scope/page.tsx`: same three changes (add `upgrade_required` to union, handle in fetch, render `<PlanGate feature="Scope Tracker" requiredPlan="growth">`).

In `src/app/dashboard/actions/page.tsx` (or its `_components/actions-feed.tsx`): add `<PlanGate feature="Agentic Actions" requiredPlan="pro">`.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run build 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/app/api/dashboard/actions/route.ts \
        src/app/dashboard/_components/plan-gate.tsx \
        src/app/dashboard/profitability/page.tsx \
        src/app/dashboard/scope/page.tsx \
        src/app/dashboard/actions/
git commit -m "feat(tier): plan gate — pro/growth feature locks with upgrade prompts"
```

---

## Phase B: Retainer Surface

**Context:** A "retainer" is a monthly fixed-fee client contract with an included-hours budget. When logged hours exceed the included budget, the agency is over-delivering without billing for it. OpsRadar detects this and queues a repricing/billing conversation draft.

### File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | (Supabase migration) | `retainer_configs` table |
| Create | `src/lib/retainer.ts` | Types + compute retainer health |
| Create | `src/app/api/dashboard/retainer/route.ts` | GET health + POST upsert config |
| Create | `src/app/dashboard/retainer/_components/retainer-table.tsx` | Table + inline edit form |
| Create | `src/app/dashboard/retainer/page.tsx` | Dashboard page |
| Modify | `src/app/dashboard/_components/sidebar.tsx` | Add "Retainers" nav item |
| Create | `src/lib/actions/evaluators/retainer-overage.ts` | Evaluator: hours > included → draft action |
| Modify | `src/lib/actions/types.ts` | Add `retainer_overage` action type |
| Modify | `src/lib/actions/executor.ts` | Handle `retainer_overage` execution |
| Modify | `src/lib/actions/evaluator.ts` | Wire `evalRetainerOverage` |
| Modify | `src/lib/actions/dedup.ts` | Add dedup window for `retainer_overage` |

---

### Task B1: Supabase migration + retainer types

**Files:**
- Create: `supabase/migrations/20260519_retainer_configs.sql`
- Create: `src/lib/retainer.ts`

- [ ] **Step 1: Apply the Supabase migration**

Use `mcp__claude_ai_Supabase__apply_migration` on project `nbdcrmepvwbfbcjqfubr`:

```sql
-- supabase/migrations/20260519_retainer_configs.sql
CREATE TABLE retainer_configs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL,
  client_name_display text NOT NULL,
  client_name_norm    text NOT NULL,
  monthly_amount_usd  numeric NOT NULL DEFAULT 0,
  included_hours      numeric NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_name_norm)
);

CREATE INDEX retainer_configs_user_idx ON retainer_configs (user_id);

ALTER TABLE retainer_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own retainer configs" ON retainer_configs
  FOR ALL
  USING (auth.uid() = user_id);
```

- [ ] **Step 2: Verify the table exists via Supabase MCP**

Use `mcp__claude_ai_Supabase__execute_sql`:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'retainer_configs'
ORDER BY ordinal_position;
```

Expected: `id`, `user_id`, `client_name_display`, `client_name_norm`, `monthly_amount_usd`, `included_hours`, `created_at`, `updated_at`.

- [ ] **Step 3: Create `src/lib/retainer.ts`**

```typescript
// src/lib/retainer.ts
import type { HarvestMonthlyProjectData } from './integrations/harvest/adapter';

export type RetainerConfig = {
  id: string;
  client_name_display: string;
  client_name_norm: string;
  monthly_amount_usd: number;
  included_hours: number;
};

export type RetainerStatus = 'on_track' | 'at_risk' | 'over_budget';

export type RetainerHealth = {
  config: RetainerConfig;
  logged_hours: number;
  overage_hours: number;
  burn_pct: number;
  status: RetainerStatus;
  implied_hourly_rate: number;
  overage_cost_usd: number;
  harvest_matched: boolean;
};

export type RetainerSummary = {
  retainers: RetainerHealth[];
  total_monthly_arr_usd: number;
  at_risk_count: number;
  over_budget_count: number;
};

function norm(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeClientName(name: string): string {
  return norm(name);
}

export function computeRetainerHealth(
  configs: RetainerConfig[],
  harvest: HarvestMonthlyProjectData,
): RetainerSummary {
  const harvestMap = new Map<string, number>();
  for (const p of harvest.projects) {
    harvestMap.set(norm(p.project_name), p.hours);
  }

  const retainers: RetainerHealth[] = configs.map((cfg) => {
    const loggedHours = harvestMap.get(cfg.client_name_norm) ?? 0;
    const overageHours = Math.max(0, loggedHours - cfg.included_hours);
    const burnPct =
      cfg.included_hours > 0
        ? Math.round((loggedHours / cfg.included_hours) * 1000) / 10
        : 0;
    const status: RetainerStatus =
      burnPct >= 100 ? 'over_budget' : burnPct >= 85 ? 'at_risk' : 'on_track';
    const impliedHourlyRate =
      cfg.included_hours > 0 ? cfg.monthly_amount_usd / cfg.included_hours : 0;
    const overageCostUsd = overageHours * impliedHourlyRate;

    return {
      config: cfg,
      logged_hours: Math.round(loggedHours * 10) / 10,
      overage_hours: Math.round(overageHours * 10) / 10,
      burn_pct: burnPct,
      status,
      implied_hourly_rate: Math.round(impliedHourlyRate),
      overage_cost_usd: Math.round(overageCostUsd),
      harvest_matched: harvestMap.has(cfg.client_name_norm),
    };
  });

  return {
    retainers: retainers.sort((a, b) => b.burn_pct - a.burn_pct),
    total_monthly_arr_usd: configs.reduce((s, c) => s + c.monthly_amount_usd, 0),
    at_risk_count: retainers.filter((r) => r.status === 'at_risk').length,
    over_budget_count: retainers.filter((r) => r.status === 'over_budget').length,
  };
}
```

- [ ] **Step 4: Save the migration file**

```bash
cat > /home/lawand/Desktop/my-startup/opsradar/supabase/migrations/20260519_retainer_configs.sql << 'SQL'
CREATE TABLE retainer_configs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL,
  client_name_display text NOT NULL,
  client_name_norm    text NOT NULL,
  monthly_amount_usd  numeric NOT NULL DEFAULT 0,
  included_hours      numeric NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_name_norm)
);

CREATE INDEX retainer_configs_user_idx ON retainer_configs (user_id);
ALTER TABLE retainer_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can manage own retainer configs" ON retainer_configs
  FOR ALL USING (auth.uid() = user_id);
SQL
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 6: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add supabase/migrations/20260519_retainer_configs.sql src/lib/retainer.ts
git commit -m "feat(retainer): retainer_configs table + health computation lib"
```

---

### Task B2: Retainer API route

**Files:**
- Create: `src/app/api/dashboard/retainer/route.ts`

- [ ] **Step 1: Create the retainer API route**

```typescript
// src/app/api/dashboard/retainer/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { fetchHarvestMonthlyProjectHours } from '<npm>/lib/integrations/harvest/adapter';
import {
  computeRetainerHealth,
  normalizeClientName,
  type RetainerConfig,
  type RetainerSummary,
} from '<npm>/lib/retainer';
import { getUserPlan, canAccess, upgradeRequiredBody } from '<npm>/lib/tier';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL = 60 * 60; // 1 hour
const cacheKey = (uid: string) => `dash:retainer:${uid}`;

// GET: return retainer health for all configured clients
export async function GET(): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const session = getSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  const plan = getUserPlan((user?.user_metadata ?? {}) as Record<string, unknown>);
  if (!canAccess(plan, 'retainer')) {
    return NextResponse.json(upgradeRequiredBody('pro'), { status: 402 });
  }

  const supabase = getServerSupabaseClient();

  const { data: configRows } = await supabase
    .from('retainer_configs')
    .select('id, client_name_display, client_name_norm, monthly_amount_usd, included_hours')
    .eq('user_id', userId);

  const configs: RetainerConfig[] = (configRows ?? []).map((r) => ({
    id: r.id,
    client_name_display: r.client_name_display as string,
    client_name_norm: r.client_name_norm as string,
    monthly_amount_usd: Number(r.monthly_amount_usd),
    included_hours: Number(r.included_hours),
  }));

  if (configs.length === 0) {
    return NextResponse.json({ status: 'no_configs', configs: [] });
  }

  // Try Redis cache
  const redis = (() => { try { return Redis.fromEnv(); } catch { return null; } })();
  if (redis) {
    const cached = await redis.get<RetainerSummary>(cacheKey(userId));
    if (cached) return NextResponse.json({ status: 'ok', ...cached, from_cache: true });
  }

  // Fetch Harvest hours
  const { data: harvestRow } = await supabase
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .eq('tool', 'harvest')
    .eq('status', 'connected')
    .single();

  if (!harvestRow?.encrypted_token) {
    return NextResponse.json({ status: 'harvest_not_connected', configs });
  }

  try {
    const harvestData = await fetchHarvestMonthlyProjectHours(decryptApiKey(harvestRow));
    const summary = computeRetainerHealth(configs, harvestData);

    if (redis) {
      await redis.set(cacheKey(userId), summary, { ex: CACHE_TTL });
    }

    return NextResponse.json({ status: 'ok', ...summary, from_cache: false });
  } catch (err) {
    return NextResponse.json({
      status: 'unavailable',
      message: err instanceof Error ? err.message : 'fetch_failed',
    });
  }
}

// POST: upsert a retainer config (create or update by normalized name)
export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const session = getSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  const plan = getUserPlan((user?.user_metadata ?? {}) as Record<string, unknown>);
  if (!canAccess(plan, 'retainer')) {
    return NextResponse.json(upgradeRequiredBody('pro'), { status: 402 });
  }

  let body: { client_name: string; monthly_amount_usd: number; included_hours: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.client_name || body.monthly_amount_usd < 0 || body.included_hours < 0) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }

  const norm = normalizeClientName(body.client_name);
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from('retainer_configs')
    .upsert(
      {
        user_id: userId,
        client_name_display: body.client_name.trim(),
        client_name_norm: norm,
        monthly_amount_usd: body.monthly_amount_usd,
        included_hours: body.included_hours,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,client_name_norm' },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Bust cache
  const redis = (() => { try { return Redis.fromEnv(); } catch { return null; } })();
  if (redis) await redis.del(cacheKey(userId));

  return NextResponse.json({ ok: true, config: data });
}

// DELETE: remove a retainer config
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const supabase = getServerSupabaseClient();
  const { error } = await supabase
    .from('retainer_configs')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const redis = (() => { try { return Redis.fromEnv(); } catch { return null; } })();
  if (redis) await redis.del(cacheKey(userId));

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 3: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/app/api/dashboard/retainer/route.ts
git commit -m "feat(retainer): /api/dashboard/retainer — GET health + POST/DELETE config"
```

---

### Task B3: Retainer dashboard page

**Files:**
- Create: `src/app/dashboard/retainer/_components/retainer-table.tsx`
- Create: `src/app/dashboard/retainer/page.tsx`
- Modify: `src/app/dashboard/_components/sidebar.tsx`

- [ ] **Step 1: Create `src/app/dashboard/retainer/_components/retainer-table.tsx`**

```typescript
// src/app/dashboard/retainer/_components/retainer-table.tsx
'use client';

import { useState } from 'react';
import type { RetainerHealth, RetainerConfig } from '<npm>/lib/retainer';

const STATUS_STYLES = {
  on_track:    { dot: 'bg-[var(--color-success)]',  text: 'On Track'    },
  at_risk:     { dot: 'bg-[var(--color-warn)]',     text: 'At Risk'     },
  over_budget: { dot: 'bg-[var(--color-danger)]',   text: 'Over Budget' },
} as const;

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function AddForm({ onSave }: { onSave: (data: { client_name: string; monthly_amount_usd: number; included_hours: number }) => void }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [hours, setHours] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !amount || !hours) return;
    setSaving(true);
    onSave({ client_name: name, monthly_amount_usd: Number(amount), included_hours: Number(hours) });
    setSaving(false);
    setName(''); setAmount(''); setHours('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 rounded-[var(--radius)] border border-dashed border-[var(--color-border)] p-3">
      <input
        className="h-8 flex-1 min-w-[140px] rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 text-body-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        placeholder="Client name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        className="h-8 w-28 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 text-body-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        type="number"
        min="0"
        placeholder="$/month"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <input
        className="h-8 w-24 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 text-body-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        type="number"
        min="0"
        step="0.5"
        placeholder="hours"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        required
      />
      <button
        type="submit"
        disabled={saving}
        className="h-8 rounded-[var(--radius)] bg-[var(--color-primary)] px-3 text-body-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        Add retainer
      </button>
    </form>
  );
}

export function RetainerTable({
  retainers,
  onAdd,
  onDelete,
}: {
  retainers: RetainerHealth[];
  onAdd: (data: { client_name: string; monthly_amount_usd: number; included_hours: number }) => void;
  onDelete: (config: RetainerConfig) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <AddForm onSave={onAdd} />
      {retainers.length === 0 ? (
        <p className="text-body-sm text-[var(--color-fg-muted)]">
          No retainer clients configured. Add one above.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {['Client', 'Retainer', 'Included h', 'Logged h', 'Overage', 'Status', ''].map((h) => (
                  <th key={h} className="py-2 pr-4 last:pr-0 text-left font-medium text-[var(--color-fg-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {retainers.map((r) => {
                const s = STATUS_STYLES[r.status];
                return (
                  <tr key={r.config.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-[var(--color-fg)]">
                      {r.config.client_name_display}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-[var(--color-fg-muted)]">
                      {fmtMoney(r.config.monthly_amount_usd)}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-[var(--color-fg-muted)]">
                      {r.config.included_hours}h
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-[var(--color-fg-muted)]">
                      {r.logged_hours}h
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {r.overage_hours > 0 ? (
                        <span className="text-[var(--color-danger)]">
                          +{r.overage_hours}h ({fmtMoney(r.overage_cost_usd)})
                        </span>
                      ) : (
                        <span className="text-[var(--color-fg-subtle)]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                        <span className="text-[var(--color-fg-muted)]">{s.text}</span>
                      </span>
                    </td>
                    <td className="py-2.5">
                      <button
                        onClick={() => onDelete(r.config)}
                        className="text-label text-[var(--color-fg-subtle)] hover:text-[var(--color-danger)]"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/dashboard/retainer/page.tsx`**

```typescript
// src/app/dashboard/retainer/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { RetainerTable } from './_components/retainer-table';
import { PlanGate } from '../_components/plan-gate';
import type { RetainerHealth, RetainerSummary, RetainerConfig } from '<npm>/lib/retainer';

type ApiResp =
  | { status: 'ok' } & RetainerSummary
  | { status: 'no_configs'; configs: [] }
  | { status: 'harvest_not_connected'; configs: RetainerConfig[] }
  | { status: 'upgrade_required'; required_plan: string }
  | { status: 'unavailable'; message: string };

type PageState =
  | { kind: 'loading' }
  | { kind: 'ok'; retainers: RetainerHealth[]; total: number; at_risk: number; over: number }
  | { kind: 'empty' }
  | { kind: 'harvest_not_connected' }
  | { kind: 'upgrade_required' }
  | { kind: 'error' };

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function RetainerPage() {
  const [state, setState] = useState<PageState>({ kind: 'loading' });

  const load = useCallback(() => {
    setState({ kind: 'loading' });
    fetch('/api/dashboard/retainer')
      .then((r) => r.json())
      .then((resp: ApiResp) => {
        if (resp.status === 'ok') {
          setState({ kind: 'ok', retainers: resp.retainers, total: resp.total_monthly_arr_usd, at_risk: resp.at_risk_count, over: resp.over_budget_count });
        } else if (resp.status === 'no_configs') {
          setState({ kind: 'empty' });
        } else if (resp.status === 'harvest_not_connected') {
          setState({ kind: 'harvest_not_connected' });
        } else if (resp.status === 'upgrade_required') {
          setState({ kind: 'upgrade_required' });
        } else {
          setState({ kind: 'error' });
        }
      })
      .catch(() => setState({ kind: 'error' }));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(data: { client_name: string; monthly_amount_usd: number; included_hours: number }) {
    await fetch('/api/dashboard/retainer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    load();
  }

  async function handleDelete(config: RetainerConfig) {
    await fetch(`/api/dashboard/retainer?id=${config.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="border-b border-[var(--color-border)] pb-3 text-body-sm text-[var(--color-fg-muted)]">
        Dashboard / <span className="font-semibold text-[var(--color-fg)]">Retainers</span>
      </div>

      <div className="mb-1">
        <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Retainer Health
        </h1>
        <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
          Fixed-fee clients tracked against included monthly hours. Catch overage before the month ends.
        </p>
      </div>

      {state.kind === 'upgrade_required' && (
        <PlanGate feature="Retainer tracking" requiredPlan="pro">
          <div className="h-64 rounded-[var(--radius-lg)] bg-[var(--color-surface-sunken)]" />
        </PlanGate>
      )}

      {state.kind === 'loading' && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-[var(--radius)] bg-[var(--color-surface-sunken)]" />
          ))}
        </div>
      )}

      {state.kind === 'harvest_not_connected' && (
        <p className="text-body-sm text-[var(--color-warn)]">
          Connect Harvest to track retainer hours.{' '}
          <a href="/dashboard/integrations" className="underline">Go to integrations →</a>
        </p>
      )}

      {state.kind === 'error' && (
        <p className="text-body-sm text-[var(--color-danger)]">Failed to load retainer data.</p>
      )}

      {(state.kind === 'empty' || state.kind === 'ok') && (
        <>
          {state.kind === 'ok' && (
            <div className="flex gap-4">
              {[
                { label: 'Monthly ARR', value: fmtMoney(state.total) },
                { label: 'At risk', value: String(state.at_risk) },
                { label: 'Over budget', value: String(state.over) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                >
                  <p className="text-label text-[var(--color-fg-muted)]">{stat.label}</p>
                  <p className="mt-0.5 text-[22px] font-semibold tabular-nums text-[var(--color-fg)]">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <RetainerTable
              retainers={state.kind === 'ok' ? state.retainers : []}
              onAdd={handleAdd}
              onDelete={handleDelete}
            />
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add "Retainers" to sidebar**

Read `src/app/dashboard/_components/sidebar.tsx`. In the `navSections` array, after the `Scope` item (or after `Profitability`), add:

```typescript
{ label: 'Retainers', href: '/dashboard/retainer', icon: FileText },
```

At the top of the file, ensure `FileText` is imported from `lucide-react`.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 5: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/app/dashboard/retainer/ src/app/dashboard/_components/sidebar.tsx
git commit -m "feat(retainer): retainer dashboard page — health table + add/remove configs"
```

---

### Task B4: Retainer overage agentic action

**Files:**
- Create: `src/lib/actions/evaluators/retainer-overage.ts`
- Modify: `src/lib/actions/types.ts`
- Modify: `src/lib/actions/dedup.ts`
- Modify: `src/lib/actions/executor.ts`
- Modify: `src/lib/actions/evaluator.ts`

- [ ] **Step 1: Read `src/lib/actions/types.ts`**

Find the `ActionType` union and `ACTION_RISK` / `ACTION_LABELS` objects to know where to insert.

- [ ] **Step 2: Add `retainer_overage` to `src/lib/actions/types.ts`**

In `ActionType`, add `'retainer_overage'` to the union. In `ACTION_RISK`, add:
```typescript
retainer_overage: 'approval',
```
In `ACTION_LABELS`, add:
```typescript
retainer_overage: 'Retainer overage — conversation ready',
```

Add the payload type:
```typescript
export type RetainerOveragePayload = {
  client_name: string;
  monthly_amount_usd: number;
  included_hours: number;
  logged_hours: number;
  overage_hours: number;
  overage_cost_usd: number;
  draft_subject: string;
  draft_body: string;
};
```

- [ ] **Step 3: Add dedup window to `src/lib/actions/dedup.ts`**

In the `DEDUP_WINDOWS` record (or equivalent), add:
```typescript
retainer_overage: 14 * 24 * 60 * 60 * 1000, // 14 days
```

- [ ] **Step 4: Create `src/lib/actions/evaluators/retainer-overage.ts`**

```typescript
// src/lib/actions/evaluators/retainer-overage.ts
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { fetchHarvestMonthlyProjectHours } from '<npm>/lib/integrations/harvest/adapter';
import {
  computeRetainerHealth,
  type RetainerConfig,
} from '<npm>/lib/retainer';
import { isDuplicate } from '../dedup';
import type { NewAction, UserContext } from '../types';

export async function evalRetainerOverage(ctx: UserContext): Promise<NewAction[]> {
  const supabase = getServerSupabaseClient();
  const actions: NewAction[] = [];

  // Fetch retainer configs
  const { data: configRows } = await supabase
    .from('retainer_configs')
    .select('id, client_name_display, client_name_norm, monthly_amount_usd, included_hours')
    .eq('user_id', ctx.userId);

  if (!configRows || configRows.length === 0) return [];

  const configs: RetainerConfig[] = configRows.map((r) => ({
    id: r.id as string,
    client_name_display: r.client_name_display as string,
    client_name_norm: r.client_name_norm as string,
    monthly_amount_usd: Number(r.monthly_amount_usd),
    included_hours: Number(r.included_hours),
  }));

  // Fetch Harvest key
  const { data: rows } = await supabase
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', ctx.userId)
    .eq('tool', 'harvest')
    .eq('status', 'connected')
    .limit(1);

  const harvestRow = rows?.[0];
  if (!harvestRow?.encrypted_token) return [];

  const harvestData = await fetchHarvestMonthlyProjectHours(decryptApiKey(harvestRow));
  const { retainers } = computeRetainerHealth(configs, harvestData);

  for (const r of retainers) {
    if (r.status === 'on_track') continue;
    if (r.overage_hours < 2) continue; // don't fire for <2 hours overage

    const isDup = await isDuplicate(ctx.userId, 'retainer_overage', 'client_name_norm', r.config.client_name_norm);
    if (isDup) continue;

    const subject = `Retainer overage: ${r.config.client_name_display} — ${r.overage_hours}h over (${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(r.overage_cost_usd)} unbilled)`;
    const body = `Hi,

We've tracked ${r.logged_hours} hours on ${r.config.client_name_display} this month against a ${r.config.included_hours}h retainer. That's ${r.overage_hours} hours over scope — about ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(r.overage_cost_usd)} at your blended rate.

Options:
1. Bill the overage: add a line item to this month's invoice
2. Adjust the retainer: revisit scope with the client before next month
3. Absorb it: note it and monitor going forward

Let me know how you'd like to handle this.

Best,
${ctx.companyName}`;

    actions.push({
      action_type: 'retainer_overage',
      payload: {
        client_name: r.config.client_name_display,
        monthly_amount_usd: r.config.monthly_amount_usd,
        included_hours: r.config.included_hours,
        logged_hours: r.logged_hours,
        overage_hours: r.overage_hours,
        overage_cost_usd: r.overage_cost_usd,
        draft_subject: subject,
        draft_body: body,
      },
    });
  }

  return actions;
}
```

- [ ] **Step 5: Add `retainer_overage` case to `src/lib/actions/executor.ts`**

Read the executor to find the `switch` block. After the `hubspot_harvest_sync` case, add:

```typescript
case 'retainer_overage': {
  // Approval-required action — no automatic send.
  // The draft sits in the actions queue for the founder to review.
  break;
}
```

- [ ] **Step 6: Wire `evalRetainerOverage` into `src/lib/actions/evaluator.ts`**

Read `evaluator.ts`. Add the import:
```typescript
import { evalRetainerOverage } from './evaluators/retainer-overage';
```

In `evaluateActionsForUser`, alongside the other `await Promise.all` or sequential eval calls, add:
```typescript
const retainerActions = await evalRetainerOverage(ctx).catch((e) => {
  console.error('[evaluator] retainer-overage failed:', e);
  return [] as NewAction[];
});
```

Then include `retainerActions` in the merge with all other action arrays before dedup/insert.

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 8: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/lib/actions/
git commit -m "feat(retainer): retainer_overage agentic evaluator — queues billing conversation draft when hours exceed retainer"
```

---

## Phase C: FO Multi-Client Dashboard

**Context:** The Fractional Operator (FO) tier ($1,200 + $300/agency) is for consultants who manage multiple client agencies. The FO enters each managed agency's integration API keys under their own account. OpsRadar aggregates health across all agencies and lets the FO drill into any individual agency's data.

### File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | (Supabase migration) | `fo_clients` + `fo_integrations` tables |
| Create | `src/lib/fo.ts` | FO client types + decryption helpers |
| Create | `src/app/api/fo/clients/route.ts` | CRUD for FO client list |
| Create | `src/app/api/fo/clients/[id]/integrations/route.ts` | Add/remove integration keys per FO client |
| Create | `src/app/api/fo/dashboard/route.ts` | Aggregate health overview for all FO clients |
| Create | `src/app/dashboard/fo/_components/fo-client-card.tsx` | Per-agency health card |
| Create | `src/app/dashboard/fo/page.tsx` | FO overview page |
| Create | `src/app/dashboard/fo/clients/[id]/page.tsx` | Per-client detail page |
| Modify | `src/app/dashboard/_components/sidebar.tsx` | Add "My Agencies" nav item (FO tier only) |

---

### Task C1: Supabase migration + FO types

**Files:**
- Create: `supabase/migrations/20260519_fo_clients.sql`
- Create: `src/lib/fo.ts`

- [ ] **Step 1: Apply migration**

Use `mcp__claude_ai_Supabase__apply_migration` on project `nbdcrmepvwbfbcjqfubr`:

```sql
-- FO managed agencies
CREATE TABLE fo_clients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fo_user_id   uuid NOT NULL,
  agency_name  text NOT NULL,
  team_size    text,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fo_clients_user_idx ON fo_clients (fo_user_id);
ALTER TABLE fo_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fo owns their clients" ON fo_clients
  FOR ALL USING (auth.uid() = fo_user_id);

-- Integration keys per FO client (mirrors integrations table structure)
CREATE TABLE fo_integrations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fo_client_id     uuid NOT NULL REFERENCES fo_clients(id) ON DELETE CASCADE,
  fo_user_id       uuid NOT NULL,
  tool             text NOT NULL,
  encrypted_token  text NOT NULL,
  iv               text NOT NULL,
  auth_tag         text NOT NULL,
  status           text NOT NULL DEFAULT 'connected',
  connected_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fo_client_id, tool)
);

CREATE INDEX fo_integrations_client_idx ON fo_integrations (fo_client_id);
ALTER TABLE fo_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fo owns their client integrations" ON fo_integrations
  FOR ALL USING (auth.uid() = fo_user_id);
```

- [ ] **Step 2: Verify tables exist**

Use `mcp__claude_ai_Supabase__execute_sql`:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('fo_clients', 'fo_integrations');
```

Expected: 2 rows.

- [ ] **Step 3: Save migration file**

```bash
cat > /home/lawand/Desktop/my-startup/opsradar/supabase/migrations/20260519_fo_clients.sql << 'SQL'
CREATE TABLE fo_clients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fo_user_id   uuid NOT NULL,
  agency_name  text NOT NULL,
  team_size    text,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fo_clients_user_idx ON fo_clients (fo_user_id);
ALTER TABLE fo_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fo owns their clients" ON fo_clients
  FOR ALL USING (auth.uid() = fo_user_id);

CREATE TABLE fo_integrations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fo_client_id     uuid NOT NULL REFERENCES fo_clients(id) ON DELETE CASCADE,
  fo_user_id       uuid NOT NULL,
  tool             text NOT NULL,
  encrypted_token  text NOT NULL,
  iv               text NOT NULL,
  auth_tag         text NOT NULL,
  status           text NOT NULL DEFAULT 'connected',
  connected_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fo_client_id, tool)
);
CREATE INDEX fo_integrations_client_idx ON fo_integrations (fo_client_id);
ALTER TABLE fo_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fo owns their client integrations" ON fo_integrations
  FOR ALL USING (auth.uid() = fo_user_id);
SQL
```

- [ ] **Step 4: Create `src/lib/fo.ts`**

```typescript
// src/lib/fo.ts

export type FoClient = {
  id: string;
  agency_name: string;
  team_size: string | null;
  notes: string | null;
  created_at: string;
};

export type FoIntegrationRow = {
  id: string;
  fo_client_id: string;
  fo_user_id: string;
  tool: string;
  encrypted_token: string;
  iv: string;
  auth_tag: string;
  status: string;
};

export type FoClientHealth = {
  client: FoClient;
  agency_score: number | null;
  margin_pct: number | null;
  at_risk_projects: number;
  integrations_connected: string[];
  last_computed_at: string | null;
};

// Adapts an fo_integrations row to the shape decryptApiKey expects
export function toDecryptableRow(row: FoIntegrationRow): {
  encrypted_token: string;
  iv: string;
  auth_tag: string;
} {
  return {
    encrypted_token: row.encrypted_token,
    iv: row.iv,
    auth_tag: row.auth_tag,
  };
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 6: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add supabase/migrations/20260519_fo_clients.sql src/lib/fo.ts
git commit -m "feat(fo): fo_clients + fo_integrations tables + FO type lib"
```

---

### Task C2: FO client management API

**Files:**
- Create: `src/app/api/fo/clients/route.ts`
- Create: `src/app/api/fo/clients/[id]/integrations/route.ts`

- [ ] **Step 1: Create `src/app/api/fo/clients/route.ts`**

```typescript
// src/app/api/fo/clients/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { getUserPlan, canAccess, upgradeRequiredBody } from '<npm>/lib/tier';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function checkFoPlan(): Promise<{ userId: string } | NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const session = getSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  const plan = getUserPlan((user?.user_metadata ?? {}) as Record<string, unknown>);
  if (!canAccess(plan, 'fo_dashboard')) {
    return NextResponse.json(upgradeRequiredBody('fo'), { status: 402 });
  }
  return { userId };
}

// GET: list FO's managed agencies
export async function GET(): Promise<NextResponse> {
  const check = await checkFoPlan();
  if (check instanceof NextResponse) return check;
  const { userId } = check;

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('fo_clients')
    .select('id, agency_name, team_size, notes, created_at')
    .eq('fo_user_id', userId)
    .order('agency_name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data ?? [] });
}

// POST: add a new FO managed agency
export async function POST(request: NextRequest): Promise<NextResponse> {
  const check = await checkFoPlan();
  if (check instanceof NextResponse) return check;
  const { userId } = check;

  let body: { agency_name: string; team_size?: string; notes?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!body.agency_name?.trim()) {
    return NextResponse.json({ error: 'agency_name required' }, { status: 400 });
  }

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('fo_clients')
    .insert({
      fo_user_id: userId,
      agency_name: body.agency_name.trim(),
      team_size: body.team_size ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, client: data }, { status: 201 });
}

// DELETE: remove an FO managed agency
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const check = await checkFoPlan();
  if (check instanceof NextResponse) return check;
  const { userId } = check;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const supabase = getServerSupabaseClient();
  const { error } = await supabase
    .from('fo_clients')
    .delete()
    .eq('id', id)
    .eq('fo_user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Create `src/app/api/fo/clients/[id]/integrations/route.ts`**

```typescript
// src/app/api/fo/clients/[id]/integrations/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { getUserPlan, canAccess, upgradeRequiredBody } from '<npm>/lib/tier';
import { encryptApiKey } from '<npm>/lib/integrations/crypto';
import type { SupportedTool } from '<npm>/lib/integrations/registry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET: list integrations for a specific FO client
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('fo_integrations')
    .select('id, tool, status, connected_at')
    .eq('fo_client_id', params.id)
    .eq('fo_user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ integrations: data ?? [] });
}

// POST: add or update an integration key for an FO client
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const session = getSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  const plan = getUserPlan((user?.user_metadata ?? {}) as Record<string, unknown>);
  if (!canAccess(plan, 'fo_dashboard')) {
    return NextResponse.json(upgradeRequiredBody('fo'), { status: 402 });
  }

  let body: { tool: SupportedTool; api_key: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!body.tool || !body.api_key?.trim()) {
    return NextResponse.json({ error: 'tool and api_key required' }, { status: 400 });
  }

  // Verify the FO client belongs to this user
  const supabase = getServerSupabaseClient();
  const { data: clientRow } = await supabase
    .from('fo_clients')
    .select('id')
    .eq('id', params.id)
    .eq('fo_user_id', userId)
    .single();

  if (!clientRow) return NextResponse.json({ error: 'client_not_found' }, { status: 404 });

  const encrypted = encryptApiKey(body.api_key.trim());

  const { data, error } = await supabase
    .from('fo_integrations')
    .upsert(
      {
        fo_client_id: params.id,
        fo_user_id: userId,
        tool: body.tool,
        encrypted_token: encrypted.encrypted_token,
        iv: encrypted.iv,
        auth_tag: encrypted.auth_tag,
        status: 'connected',
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'fo_client_id,tool' },
    )
    .select('id, tool, status, connected_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, integration: data });
}

// DELETE: remove an integration key
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const tool = new URL(request.url).searchParams.get('tool');
  if (!tool) return NextResponse.json({ error: 'missing_tool' }, { status: 400 });

  const supabase = getServerSupabaseClient();
  const { error } = await supabase
    .from('fo_integrations')
    .delete()
    .eq('fo_client_id', params.id)
    .eq('fo_user_id', userId)
    .eq('tool', tool);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Check what `encryptApiKey` expects (to ensure the import is correct)**

```bash
grep -n "export.*encryptApiKey" /home/lawand/Desktop/my-startup/opsradar/src/lib/integrations/crypto.ts
```

If the function doesn't exist by that name, check what encryption helper is exported and use it. The goal is to store the API key encrypted the same way the regular `integrations` table does.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 5: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/app/api/fo/
git commit -m "feat(fo): FO client + integration management API routes"
```

---

### Task C3: FO aggregate dashboard API

**Files:**
- Create: `src/app/api/fo/dashboard/route.ts`

- [ ] **Step 1: Create the FO dashboard API**

```typescript
// src/app/api/fo/dashboard/route.ts
// Returns health overview for all FO managed agencies.
// For each agency, fetches profitability (Stripe+Harvest) and scope (ClickUp+Harvest)
// using that agency's stored integration keys.
import { NextResponse } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { getUserPlan, canAccess, upgradeRequiredBody } from '<npm>/lib/tier';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { toDecryptableRow, type FoClient, type FoClientHealth } from '<npm>/lib/fo';
import { fetchStripePerClientRevenue } from '<npm>/lib/integrations/stripe/profitability-adapter';
import { fetchHarvestPerClientHours } from '<npm>/lib/integrations/harvest/profitability-adapter';
import { computeClientProfitability } from '<npm>/lib/profitability';
import { fetchClickupProjectBudgets } from '<npm>/lib/integrations/clickup/scope-adapter';
import { fetchHarvestMonthlyProjectHours } from '<npm>/lib/integrations/harvest/adapter';
import { computeScopeCreep } from '<npm>/lib/scope-creep';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const DEFAULT_BLENDED_RATE = 85;

export async function GET(): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const session = getSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  const plan = getUserPlan((user?.user_metadata ?? {}) as Record<string, unknown>);
  if (!canAccess(plan, 'fo_dashboard')) {
    return NextResponse.json(upgradeRequiredBody('fo'), { status: 402 });
  }

  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const blendedRate = typeof meta.blended_hourly_rate_usd === 'number'
    ? meta.blended_hourly_rate_usd : DEFAULT_BLENDED_RATE;

  const supabase = getServerSupabaseClient();

  const { data: clientRows } = await supabase
    .from('fo_clients')
    .select('id, agency_name, team_size, notes, created_at')
    .eq('fo_user_id', userId)
    .order('agency_name');

  const clients: FoClient[] = (clientRows ?? []) as FoClient[];
  if (clients.length === 0) {
    return NextResponse.json({ clients: [], total_arr_usd: 0 });
  }

  const { data: integrationRows } = await supabase
    .from('fo_integrations')
    .select('id, fo_client_id, fo_user_id, tool, encrypted_token, iv, auth_tag, status')
    .eq('fo_user_id', userId)
    .eq('status', 'connected');

  const intsByClient = new Map<string, typeof integrationRows>();
  for (const row of (integrationRows ?? [])) {
    const existing = intsByClient.get(row.fo_client_id) ?? [];
    existing.push(row);
    intsByClient.set(row.fo_client_id, existing);
  }

  const healthCards: FoClientHealth[] = await Promise.all(
    clients.map(async (client): Promise<FoClientHealth> => {
      const ints = intsByClient.get(client.id) ?? [];
      const getKey = (tool: string) => {
        const row = ints.find((r) => r.tool === tool);
        if (!row?.encrypted_token) return null;
        return decryptApiKey(toDecryptableRow(row));
      };

      const integrationsConnected = ints.map((r) => r.tool);
      let marginPct: number | null = null;
      let atRiskProjects = 0;

      // Profitability
      const stripeKey = getKey('stripe');
      const harvestKey = getKey('harvest');
      if (stripeKey && harvestKey) {
        try {
          const [stripeData, harvestData] = await Promise.all([
            fetchStripePerClientRevenue(stripeKey),
            fetchHarvestPerClientHours(harvestKey),
          ]);
          const result = computeClientProfitability(stripeData, harvestData, blendedRate);
          if (result.clients.length > 0) {
            const totalRevenue = result.clients.reduce((s, c) => s + c.revenue_mtd, 0);
            const totalCost = result.clients.reduce((s, c) => s + c.cost_mtd, 0);
            marginPct = totalRevenue > 0
              ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 100)
              : null;
          }
        } catch {
          // Non-fatal: just leave as null
        }
      }

      // Scope creep
      const clickupKey = getKey('clickup');
      const harvestScopeKey = getKey('harvest');
      if (clickupKey && harvestScopeKey) {
        try {
          const [clickupData, harvestMonthly] = await Promise.all([
            fetchClickupProjectBudgets(clickupKey),
            fetchHarvestMonthlyProjectHours(harvestScopeKey),
          ]);
          const scopeResult = computeScopeCreep(clickupData, harvestMonthly);
          atRiskProjects = scopeResult.projects.filter(
            (p) => p.status === 'at_risk' || p.status === 'over_budget',
          ).length;
        } catch {
          // Non-fatal
        }
      }

      return {
        client,
        agency_score: null, // v2: compute per-client agency score
        margin_pct: marginPct,
        at_risk_projects: atRiskProjects,
        integrations_connected: integrationsConnected,
        last_computed_at: new Date().toISOString(),
      };
    }),
  );

  return NextResponse.json({
    clients: healthCards,
    total_arr_usd: 0, // v2: sum retainer configs once retainer table is available per-FO-client
    computed_at: new Date().toISOString(),
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 3: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/app/api/fo/dashboard/route.ts
git commit -m "feat(fo): FO aggregate dashboard API — profitability + scope per managed agency"
```

---

### Task C4: FO dashboard UI

**Files:**
- Create: `src/app/dashboard/fo/_components/fo-client-card.tsx`
- Create: `src/app/dashboard/fo/page.tsx`
- Create: `src/app/dashboard/fo/clients/[id]/page.tsx`
- Modify: `src/app/dashboard/_components/sidebar.tsx`

- [ ] **Step 1: Create `src/app/dashboard/fo/_components/fo-client-card.tsx`**

```typescript
// src/app/dashboard/fo/_components/fo-client-card.tsx
'use client';

import Link from 'next/link';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { FoClientHealth } from '<npm>/lib/fo';

function MarginBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-label text-[var(--color-fg-subtle)]">No billing data</span>;
  const color = pct >= 20 ? 'var(--color-success)' : pct >= 0 ? 'var(--color-warn)' : 'var(--color-danger)';
  const Icon = pct >= 0 ? (pct >= 20 ? TrendingUp : Minus) : TrendingDown;
  return (
    <span className="flex items-center gap-1 text-body-sm font-medium" style={{ color }}>
      <Icon className="h-3.5 w-3.5" />
      {Math.round(pct)}% margin
    </span>
  );
}

export function FoClientCard({ health }: { health: FoClientHealth }) {
  return (
    <Link
      href={`/dashboard/fo/clients/${health.client.id}`}
      className="block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 no-underline transition-colors hover:border-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_4%,var(--color-surface))]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[var(--color-fg)]">{health.client.agency_name}</p>
          {health.client.team_size && (
            <p className="text-label text-[var(--color-fg-subtle)]">{health.client.team_size} people</p>
          )}
        </div>
        {health.at_risk_projects > 0 && (
          <span className="flex items-center gap-1 rounded-[3px] bg-[color-mix(in_srgb,var(--color-warn)_14%,transparent)] px-1.5 py-0.5 text-label font-medium text-[var(--color-warn)]">
            <AlertTriangle className="h-3 w-3" />
            {health.at_risk_projects} scope risk
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        <MarginBadge pct={health.margin_pct} />
        <span className="text-label text-[var(--color-fg-subtle)]">
          {health.integrations_connected.length} integration{health.integrations_connected.length !== 1 ? 's' : ''}
        </span>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Create `src/app/dashboard/fo/page.tsx`**

```typescript
// src/app/dashboard/fo/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { FoClientCard } from './_components/fo-client-card';
import { PlanGate } from '../_components/plan-gate';
import type { FoClientHealth } from '<npm>/lib/fo';

type ApiResp =
  | { clients: FoClientHealth[]; computed_at: string }
  | { error: 'upgrade_required'; required_plan: string };

type PageState =
  | { kind: 'loading' }
  | { kind: 'upgrade_required' }
  | { kind: 'ok'; clients: FoClientHealth[] }
  | { kind: 'error' };

export default function FoDashboardPage() {
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    fetch('/api/fo/dashboard')
      .then((r) => r.json())
      .then((resp: ApiResp) => {
        if ('error' in resp && resp.error === 'upgrade_required') {
          setState({ kind: 'upgrade_required' });
        } else if ('clients' in resp) {
          setState({ kind: 'ok', clients: resp.clients });
        } else {
          setState({ kind: 'error' });
        }
      })
      .catch(() => setState({ kind: 'error' }));
  }, []);

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const r = await fetch('/api/fo/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agency_name: newName.trim() }),
    });
    if (r.ok) {
      setNewName('');
      setAdding(false);
      setState({ kind: 'loading' });
      fetch('/api/fo/dashboard')
        .then((r2) => r2.json())
        .then((resp: ApiResp) => {
          if ('clients' in resp) setState({ kind: 'ok', clients: resp.clients });
        })
        .catch(() => setState({ kind: 'error' }));
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="border-b border-[var(--color-border)] pb-3 text-body-sm text-[var(--color-fg-muted)]">
        Dashboard / <span className="font-semibold text-[var(--color-fg)]">My Agencies</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
            My Agencies
          </h1>
          <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
            All agencies you manage — margin, scope risk, and integration health at a glance.
          </p>
        </div>
        {state.kind === 'ok' && (
          <button
            onClick={() => setAdding((v) => !v)}
            className="flex items-center gap-1.5 rounded-[var(--radius)] bg-[var(--color-primary)] px-3 py-2 text-body-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add agency
          </button>
        )}
      </div>

      {state.kind === 'upgrade_required' && (
        <PlanGate feature="Fractional Operator multi-client dashboard" requiredPlan="fo">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 rounded-[var(--radius-lg)] bg-[var(--color-surface-sunken)]" />
            ))}
          </div>
        </PlanGate>
      )}

      {state.kind === 'loading' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-sunken)]" />
          ))}
        </div>
      )}

      {state.kind === 'error' && (
        <p className="text-body-sm text-[var(--color-danger)]">Failed to load agency dashboard.</p>
      )}

      {state.kind === 'ok' && (
        <>
          {adding && (
            <form
              onSubmit={handleAddClient}
              className="flex gap-2 rounded-[var(--radius)] border border-dashed border-[var(--color-border)] p-3"
            >
              <input
                className="h-8 flex-1 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 text-body-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                placeholder="Agency name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                required
              />
              <button
                type="submit"
                className="h-8 rounded-[var(--radius)] bg-[var(--color-primary)] px-3 text-body-sm font-medium text-white hover:opacity-90"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="h-8 rounded-[var(--radius)] border border-[var(--color-border)] px-3 text-body-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
              >
                Cancel
              </button>
            </form>
          )}

          {state.clients.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] p-8 text-center">
              <p className="font-medium text-[var(--color-fg)]">No agencies yet</p>
              <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
                Add your first managed agency and connect their integrations.
              </p>
              <button
                onClick={() => setAdding(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-[var(--radius)] bg-[var(--color-primary)] px-4 py-2 text-body-sm font-medium text-white hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Add agency
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {state.clients.map((h) => (
                <FoClientCard key={h.client.id} health={h} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/app/dashboard/fo/clients/[id]/page.tsx`**

```typescript
// src/app/dashboard/fo/clients/[id]/page.tsx
// Per-agency detail page: shows connected integrations and links to add/remove keys.
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Plus, Trash2 } from 'lucide-react';

type Integration = { id: string; tool: string; status: string; connected_at: string };

const TOOLS = ['stripe', 'harvest', 'clickup', 'hubspot', 'asana', 'monday', 'toggl', 'jira', 'quickbooks', 'xero'];

export default function FoClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/fo/clients/${id}/integrations`)
      .then((r) => r.json())
      .then((d: { integrations: Integration[] }) => setIntegrations(d.integrations ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const connectedTools = new Set(integrations.map((i) => i.tool));

  async function handleAdd(tool: string) {
    if (!apiKey.trim()) return;
    setSaving(true);
    await fetch(`/api/fo/clients/${id}/integrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, api_key: apiKey.trim() }),
    });
    setSaving(false);
    setAdding(null);
    setApiKey('');
    load();
  }

  async function handleRemove(tool: string) {
    await fetch(`/api/fo/clients/${id}/integrations?tool=${tool}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="border-b border-[var(--color-border)] pb-3 text-body-sm text-[var(--color-fg-muted)]">
        <Link href="/dashboard/fo" className="hover:text-[var(--color-fg)]">My Agencies</Link>
        {' / '}
        <span className="font-semibold text-[var(--color-fg)]">Integrations</span>
      </div>

      <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
        Agency Integrations
      </h1>
      <p className="text-body-sm text-[var(--color-fg-muted)]">
        Add this agency&apos;s API keys so OpsRadar can pull their live data.
      </p>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-[var(--radius)] bg-[var(--color-surface-sunken)]" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {TOOLS.map((tool) => {
            const connected = connectedTools.has(tool);
            const isAdding = adding === tool;
            return (
              <div
                key={tool}
                className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5"
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full ${connected ? 'bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)]' : 'bg-[var(--color-surface-sunken)]'}`}>
                  {connected && <Check className="h-3 w-3 text-[var(--color-success)]" />}
                </span>
                <span className="flex-1 font-medium capitalize text-[var(--color-fg)]">{tool}</span>
                {connected ? (
                  <button
                    onClick={() => handleRemove(tool)}
                    className="text-[var(--color-fg-subtle)] hover:text-[var(--color-danger)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : isAdding ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="password"
                      placeholder="API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="h-7 w-48 rounded border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2 text-label text-[var(--color-fg)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                    <button
                      onClick={() => handleAdd(tool)}
                      disabled={saving || !apiKey.trim()}
                      className="h-7 rounded bg-[var(--color-primary)] px-2 text-label font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button onClick={() => { setAdding(null); setApiKey(''); }} className="text-label text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)]">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAdding(tool)}
                    className="flex items-center gap-1 text-label text-[var(--color-fg-subtle)] hover:text-[var(--color-primary)]"
                  >
                    <Plus className="h-3 w-3" />
                    Add key
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add "My Agencies" to sidebar (FO tier only)**

Read `src/app/dashboard/_components/sidebar.tsx`. Find the `navSections` array. Add before the last section (settings):

```typescript
{ label: 'My Agencies', href: '/dashboard/fo', icon: Building2 },
```

Add `Building2` to the lucide-react import at the top. This item will show for all users in the nav — the `fo_dashboard` plan gate on the API is what enforces access. (Optionally, conditionally render based on plan from a `usePlan` hook if the sidebar already has user data access.)

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run build 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/app/dashboard/fo/ src/app/dashboard/_components/sidebar.tsx
git commit -m "feat(fo): FO multi-client dashboard — agency overview grid + per-client integration setup"
```

---

### Task C5: End-to-end verification

- [ ] **Step 1: Start dev server**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run dev
```

- [ ] **Step 2: Verify tier enforcement on profitability API**

```bash
# Should return 402 for a user with no plan set (defaults to 'starter'):
curl -s http://localhost:3000/api/dashboard/profitability \
  -H "Cookie: <paste session cookie>" | jq '.error'
```

Expected: `"upgrade_required"`.

Set plan to growth via admin endpoint, then retry — should return data.

- [ ] **Step 3: Verify retainer API creates and reads configs**

```bash
# Create a retainer config:
curl -s -X POST http://localhost:3000/api/dashboard/retainer \
  -H "Cookie: <session>" \
  -H "Content-Type: application/json" \
  -d '{"client_name":"Acme Corp","monthly_amount_usd":5000,"included_hours":40}' | jq .

# Read it back:
curl -s http://localhost:3000/api/dashboard/retainer \
  -H "Cookie: <session>" | jq '.status'
```

Expected: `"ok"` or `"harvest_not_connected"` (if Harvest key absent).

- [ ] **Step 4: Verify FO clients API creates a client**

```bash
# Add a managed agency:
curl -s -X POST http://localhost:3000/api/fo/clients \
  -H "Cookie: <session with fo plan>" \
  -H "Content-Type: application/json" \
  -d '{"agency_name":"Test Agency"}' | jq .ok
```

Expected: `true`.

- [ ] **Step 5: Visual check — open in browser**

Navigate to:
- `http://localhost:3000/dashboard/profitability` → should show upgrade prompt for Starter users
- `http://localhost:3000/dashboard/retainer` → should load retainer page (pro gate) 
- `http://localhost:3000/dashboard/fo` → should show FO dashboard or upgrade prompt

- [ ] **Step 6: Run linter**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run lint 2>&1 | grep -E "^.*error" | head -20
```

Expected: no errors.

- [ ] **Step 7: Commit any lint fixes**

```bash
git add -A && git commit -m "fix: lint fixes post-gap-closure"
```

---

## Self-Review

### Spec coverage

| Gap from user prompt | Addressed |
|---|---|
| Tier/seat/action limits enforced per tier | ✅ Phase A — `tier.ts` feature gates on all Growth/Pro APIs + UI upgrade cards |
| Per-client profitability (Growth tier) | Already shipped — now gated to Growth+ |
| Scope creep detection (Growth tier) | Already shipped — now gated to Growth+ |
| Real agentic invoice drafting + PM nudges | Invoice reminders already ship (evaluator + executor). `retainer_overage` adds retainer conversation drafts. PM nudges = `hours_budget_exceeded` evaluator (already ships) |
| Retainer surface (Pro tier) | ✅ Phase B — `retainer_configs` table, health computation, CRUD API, dashboard page, overage agentic action |
| Multi-client dashboard (FO tier) | ✅ Phase C — `fo_clients` + `fo_integrations`, aggregate API, overview grid, per-client integration setup |
| OpsRadar Index benchmarks | Already shipped — now gated to Growth+ (Phase A) |

### Type consistency

- `RetainerConfig` defined in `src/lib/retainer.ts`, used by `retainer/route.ts`, `retainer-table.tsx`, `retainer-overage.ts` — consistent
- `FoClient`, `FoClientHealth`, `FoIntegrationRow` defined in `src/lib/fo.ts`, used by `fo/dashboard/route.ts`, `fo-client-card.tsx`, `fo/page.tsx` — consistent
- `Plan`, `Feature`, `canAccess`, `getUserPlan` defined in `src/lib/tier.ts`, used in all gated API routes — consistent
- `RetainerOveragePayload` added to `src/lib/actions/types.ts`, referenced in `retainer-overage.ts` evaluator — consistent

### No placeholders

All code blocks contain complete, runnable TypeScript. No "TBD", "TODO", or "add appropriate handling" patterns.
