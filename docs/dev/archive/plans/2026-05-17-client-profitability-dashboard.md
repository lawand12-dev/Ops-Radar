# Client Profitability Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/dashboard/profitability` page that shows per-client revenue (Stripe), hours (Harvest), margin, and payment health — giving agency founders their first clear view of which clients are actually making them money.

**Architecture:** Two new adapter functions (one Stripe, one Harvest) fetch per-client data for current + prior month. A pure compute function matches clients by normalized name and calculates margins. An API route orchestrates the fetch/compute/cache cycle. A client-side page renders the result as a sortable table.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase (user_metadata for blended rate), Upstash Redis (30-min cache), Stripe SDK, Harvest REST API, Tailwind CSS v4, Lucide icons.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/integrations/stripe/profitability-adapter.ts` | Fetch invoices grouped by customer, current + prior month |
| Create | `src/lib/integrations/harvest/profitability-adapter.ts` | Fetch time entries grouped by client, current + prior month |
| Create | `src/lib/profitability.ts` | Match clients, compute margins, sort results |
| Create | `src/app/api/dashboard/profitability/route.ts` | Auth → keys → adapters → compute → cache → respond |
| Create | `src/app/dashboard/_components/profitability-table.tsx` | Sortable table, badges, empty states |
| Create | `src/app/dashboard/profitability/page.tsx` | Dashboard page shell |
| Modify | `src/app/dashboard/_components/sidebar.tsx` | Add "Profitability" nav item |
| Modify | `src/app/api/profile/route.ts` | Add `blended_hourly_rate_usd` to GET + PATCH |
| Modify | `src/app/dashboard/settings/page.tsx` | Add blended rate input field |

---

## Task 1: Stripe per-client revenue adapter

**Files:**
- Create: `src/lib/integrations/stripe/profitability-adapter.ts`

- [ ] **Step 1: Create the adapter file**

```typescript
// src/lib/integrations/stripe/profitability-adapter.ts
import Stripe from 'stripe';

export type StripeClientRevenue = {
  id: string;
  name: string;
  revenue_current: number;   // USD paid invoices, current month-to-date
  revenue_prior: number;     // USD paid invoices, prior full month
  payment_status: 'on_time' | 'overdue' | 'unknown';
  days_overdue: number | null;
};

export type StripePerClientData = {
  clients: StripeClientRevenue[];
  currency: 'USD';
};

function stripeClient(apiKey: string): Stripe {
  return new Stripe(apiKey, { typescript: true, maxNetworkRetries: 2 });
}

function unix(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

export async function fetchStripePerClientRevenue(apiKey: string): Promise<StripePerClientData> {
  const stripe = stripeClient(apiKey);
  const now = new Date();

  // Current month bounds
  const currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  // Prior month bounds
  const priorStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const priorEnd = new Date(currentStart.getTime() - 1);

  const [currentInvoices, priorInvoices, overdueInvoices] = await Promise.all([
    stripe.invoices.list({
      status: 'paid',
      created: { gte: unix(currentStart) },
      limit: 100,
      expand: ['data.customer'],
    }),
    stripe.invoices.list({
      status: 'paid',
      created: { gte: unix(priorStart), lte: unix(priorEnd) },
      limit: 100,
      expand: ['data.customer'],
    }),
    stripe.invoices.list({
      status: 'open',
      due_date: { lt: unix(now) },
      limit: 100,
      expand: ['data.customer'],
    }),
  ]);

  // revenue_current keyed by customer id
  const currentByCustomer = new Map<string, { name: string; revenue: number }>();
  for (const inv of currentInvoices.data) {
    const custId = typeof inv.customer === 'string' ? inv.customer : (inv.customer as Stripe.Customer | null)?.id ?? 'unknown';
    const custName = typeof inv.customer === 'object' && inv.customer !== null
      ? ((inv.customer as Stripe.Customer).name ?? 'Unknown')
      : 'Unknown';
    const cur = currentByCustomer.get(custId) ?? { name: custName, revenue: 0 };
    cur.revenue += (inv.amount_paid ?? 0) / 100;
    currentByCustomer.set(custId, cur);
  }

  // revenue_prior keyed by customer id
  const priorByCustomer = new Map<string, number>();
  for (const inv of priorInvoices.data) {
    const custId = typeof inv.customer === 'string' ? inv.customer : (inv.customer as Stripe.Customer | null)?.id ?? 'unknown';
    priorByCustomer.set(custId, (priorByCustomer.get(custId) ?? 0) + (inv.amount_paid ?? 0) / 100);
  }

  // overdue status keyed by customer id
  const overdueByCustomer = new Map<string, number>(); // custId → max days overdue
  const nowSec = unix(now);
  for (const inv of overdueInvoices.data) {
    if (!inv.due_date || inv.due_date >= nowSec) continue;
    const custId = typeof inv.customer === 'string' ? inv.customer : (inv.customer as Stripe.Customer | null)?.id ?? 'unknown';
    const days = Math.floor((nowSec - inv.due_date) / 86400);
    overdueByCustomer.set(custId, Math.max(overdueByCustomer.get(custId) ?? 0, days));
  }

  // Merge all customer ids seen across any list
  const allIds = new Set([
    ...currentByCustomer.keys(),
    ...priorByCustomer.keys(),
    ...overdueByCustomer.keys(),
  ]);

  const clients: StripeClientRevenue[] = [];
  for (const id of allIds) {
    const cur = currentByCustomer.get(id);
    const name = cur?.name ?? 'Unknown';
    const revenueCurrent = cur?.revenue ?? 0;
    const revenuePrior = priorByCustomer.get(id) ?? 0;
    const daysOverdue = overdueByCustomer.get(id) ?? null;
    const paymentStatus = daysOverdue !== null ? 'overdue' : (revenueCurrent > 0 || revenuePrior > 0) ? 'on_time' : 'unknown';

    clients.push({
      id,
      name,
      revenue_current: revenueCurrent,
      revenue_prior: revenuePrior,
      payment_status: paymentStatus,
      days_overdue: daysOverdue,
    });
  }

  return { clients, currency: 'USD' };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/integrations/stripe/profitability-adapter.ts
git commit -m "feat(profitability): Stripe per-client revenue adapter (current + prior month)"
```

---

## Task 2: Harvest per-client hours adapter

**Files:**
- Create: `src/lib/integrations/harvest/profitability-adapter.ts`

- [ ] **Step 1: Create the adapter file**

```typescript
// src/lib/integrations/harvest/profitability-adapter.ts

const BASE = 'https://api.harvestapp.com/v2';
const UA = 'OpsRadar (https://opsradar.app)';

export type HarvestClientHours = {
  name: string;
  hours_current: number;   // current month-to-date
  hours_prior: number;     // prior full month
};

export type HarvestPerClientData = {
  clients: HarvestClientHours[];
};

function parseCombined(combined: string): { accountId: string; token: string } | null {
  const idx = combined.indexOf(':');
  if (idx <= 0 || idx === combined.length - 1) return null;
  return { accountId: combined.slice(0, idx).trim(), token: combined.slice(idx + 1).trim() };
}

function harvestHeaders(accountId: string, token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Harvest-Account-Id': accountId,
    'User-Agent': UA,
  };
}

type HarvestEntry = {
  hours: number;
  client?: { name?: string } | null;
};

type HarvestListResponse = {
  time_entries?: HarvestEntry[];
  next_page?: number | null;
};

async function fetchEntriesForRange(
  accountId: string,
  token: string,
  from: string,
  to: string,
): Promise<HarvestEntry[]> {
  const h = harvestHeaders(accountId, token);
  const params = new URLSearchParams({ from, to, per_page: '100' });
  const res = await fetch(`${BASE}/time_entries?${params}`, { headers: h });
  if (!res.ok) throw new Error(`Harvest time entries fetch failed: ${res.status}`);
  const body = (await res.json()) as HarvestListResponse;
  return body.time_entries ?? [];
}

export async function fetchHarvestPerClientHours(combined: string): Promise<HarvestPerClientData> {
  const parsed = parseCombined(combined);
  if (!parsed) throw new Error('Harvest credentials malformed');

  const now = new Date();
  const currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const priorStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const priorEnd = new Date(currentStart.getTime() - 86400_000); // last day of prior month

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const [currentEntries, priorEntries] = await Promise.all([
    fetchEntriesForRange(parsed.accountId, parsed.token, fmt(currentStart), fmt(now)),
    fetchEntriesForRange(parsed.accountId, parsed.token, fmt(priorStart), fmt(priorEnd)),
  ]);

  const aggregate = (entries: HarvestEntry[]): Map<string, number> => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const name = e.client?.name ?? 'No client';
      map.set(name, (map.get(name) ?? 0) + (Number(e.hours) || 0));
    }
    return map;
  };

  const currentMap = aggregate(currentEntries);
  const priorMap = aggregate(priorEntries);

  const allNames = new Set([...currentMap.keys(), ...priorMap.keys()]);
  const clients: HarvestClientHours[] = [];
  for (const name of allNames) {
    clients.push({
      name,
      hours_current: Math.round((currentMap.get(name) ?? 0) * 10) / 10,
      hours_prior: Math.round((priorMap.get(name) ?? 0) * 10) / 10,
    });
  }

  return { clients };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/integrations/harvest/profitability-adapter.ts
git commit -m "feat(profitability): Harvest per-client hours adapter (current + prior month)"
```

---

## Task 3: Core profitability compute logic

**Files:**
- Create: `src/lib/profitability.ts`

- [ ] **Step 1: Create the compute module**

```typescript
// src/lib/profitability.ts
import type { StripePerClientData } from './integrations/stripe/profitability-adapter';
import type { HarvestPerClientData } from './integrations/harvest/profitability-adapter';

export type ClientProfitability = {
  id: string;
  name: string;
  revenue_mtd: number;
  revenue_prior: number;
  hours_mtd: number;
  hours_prior: number;
  blended_rate_usd: number;
  cost_mtd: number;
  margin_pct: number;
  margin_prior_pct: number | null;
  // up: margin improved >5pp vs prior; down: dropped >5pp; flat: within ±5pp
  trend: 'up' | 'down' | 'flat';
  payment_status: 'on_time' | 'overdue' | 'unknown';
  days_overdue: number | null;
  stripe_customer_id: string | null;
  matched: boolean;
};

export type ProfitabilityResult = {
  clients: ClientProfitability[];
  unmatched_stripe: Array<{ id: string; name: string; revenue_mtd: number }>;
  unmatched_harvest: Array<{ name: string; hours_mtd: number }>;
};

// Strip common legal suffixes and punctuation for fuzzy name matching.
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(ltd|llc|inc|co|corp|limited|pty|gmbh|bv|srl|sarl|ag)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeTrend(current: number, prior: number | null): 'up' | 'down' | 'flat' {
  if (prior === null) return 'flat';
  const diff = current - prior;
  if (diff > 5) return 'up';
  if (diff < -5) return 'down';
  return 'flat';
}

export function computeClientProfitability(
  stripeData: StripePerClientData,
  harvestData: HarvestPerClientData,
  blendedRateUsd: number,
): ProfitabilityResult {
  // Build Harvest lookup keyed by normalized name
  const harvestMap = new Map<string, (typeof harvestData.clients)[0]>();
  for (const hc of harvestData.clients) {
    harvestMap.set(normalizeName(hc.name), hc);
  }

  const matchedHarvestNames = new Set<string>();
  const clients: ClientProfitability[] = [];

  for (const sc of stripeData.clients) {
    const key = normalizeName(sc.name);
    const hc = harvestMap.get(key) ?? null;
    if (hc) matchedHarvestNames.add(normalizeName(hc.name));

    const hoursCurrent = hc?.hours_current ?? 0;
    const hoursPrior = hc?.hours_prior ?? 0;
    const costMtd = hoursCurrent * blendedRateUsd;
    const marginPct = sc.revenue_current > 0
      ? ((sc.revenue_current - costMtd) / sc.revenue_current) * 100
      : costMtd > 0 ? -100 : 0;

    const priorCost = hoursPrior * blendedRateUsd;
    const marginPriorPct = sc.revenue_prior > 0
      ? ((sc.revenue_prior - priorCost) / sc.revenue_prior) * 100
      : hc !== null ? null : null;

    clients.push({
      id: sc.id,
      name: sc.name,
      revenue_mtd: sc.revenue_current,
      revenue_prior: sc.revenue_prior,
      hours_mtd: hoursCurrent,
      hours_prior: hoursPrior,
      blended_rate_usd: blendedRateUsd,
      cost_mtd: costMtd,
      margin_pct: marginPct,
      margin_prior_pct: marginPriorPct,
      trend: computeTrend(marginPct, marginPriorPct),
      payment_status: sc.payment_status,
      days_overdue: sc.days_overdue,
      stripe_customer_id: sc.id,
      matched: hc !== null,
    });
  }

  // Sort: losing money (margin < 0) first, then thin (0-20%), then healthy (>20%)
  clients.sort((a, b) => a.margin_pct - b.margin_pct);

  // Unmatched Harvest clients (have hours but no Stripe invoice)
  const unmatched_harvest = harvestData.clients
    .filter((hc) => !matchedHarvestNames.has(normalizeName(hc.name)))
    .map((hc) => ({ name: hc.name, hours_mtd: hc.hours_current }));

  // Stripe clients with no Harvest match (revenue but no hours tracked)
  const unmatched_stripe = stripeData.clients
    .filter((sc) => {
      const key = normalizeName(sc.name);
      return !harvestMap.has(key);
    })
    .map((sc) => ({ id: sc.id, name: sc.name, revenue_mtd: sc.revenue_current }));

  return { clients, unmatched_stripe, unmatched_harvest };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/profitability.ts
git commit -m "feat(profitability): core compute logic — client matching, margin, trend, sort"
```

---

## Task 4: API route `/api/dashboard/profitability`

**Files:**
- Create: `src/app/api/dashboard/profitability/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/dashboard/profitability/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { fetchStripePerClientRevenue } from '<npm>/lib/integrations/stripe/profitability-adapter';
import { fetchHarvestPerClientHours } from '<npm>/lib/integrations/harvest/profitability-adapter';
import { computeClientProfitability, type ProfitabilityResult } from '<npm>/lib/profitability';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 30; // 30 minutes
const CACHE_KEY = (userId: string) => `dash:profitability:${userId}`;

const DEFAULT_BLENDED_RATE = 85;

type ProfitabilityResponse =
  | { status: 'ok'; data: ProfitabilityResult; blended_rate_usd: number; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected'; missing: ('stripe' | 'harvest')[] }
  | { status: 'unavailable'; message: string };

export async function GET(): Promise<NextResponse<ProfitabilityResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  // Get blended rate from user metadata
  const sessionSupabase = await getSessionSupabaseClient();
  const { data: userData } = await sessionSupabase.auth.getUser();
  const meta = (userData?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const blendedRate = typeof meta.blended_hourly_rate_usd === 'number'
    ? meta.blended_hourly_rate_usd
    : DEFAULT_BLENDED_RATE;

  const supabase = getServerSupabaseClient();
  const { data: integrations } = await supabase
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .in('tool', ['stripe', 'harvest']);

  const stripeRow = integrations?.find((r) => r.tool === 'stripe');
  const harvestRow = integrations?.find((r) => r.tool === 'harvest');

  const missing: ('stripe' | 'harvest')[] = [];
  if (!stripeRow?.encrypted_token || stripeRow.status !== 'connected') missing.push('stripe');
  if (!harvestRow?.encrypted_token || harvestRow.status !== 'connected') missing.push('harvest');

  if (missing.length === 2) {
    return NextResponse.json({ status: 'not_connected', missing });
  }

  // Redis cache check (only when both connected)
  const redis = (() => { try { return Redis.fromEnv(); } catch { return null; } })();
  if (redis && missing.length === 0) {
    const cached = await redis.get<ProfitabilityResponse>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  try {
    const [stripeData, harvestData] = await Promise.all([
      stripeRow?.encrypted_token && stripeRow.status === 'connected'
        ? fetchStripePerClientRevenue(decryptApiKey(stripeRow))
        : Promise.resolve({ clients: [], currency: 'USD' as const }),
      harvestRow?.encrypted_token && harvestRow.status === 'connected'
        ? fetchHarvestPerClientHours(decryptApiKey(harvestRow))
        : Promise.resolve({ clients: [] }),
    ]);

    const data = computeClientProfitability(stripeData, harvestData, blendedRate);
    const lastSyncedAt = new Date().toISOString();

    const payload: ProfitabilityResponse = {
      status: 'ok',
      data,
      blended_rate_usd: blendedRate,
      last_synced_at: lastSyncedAt,
      from_cache: false,
    };

    if (redis && missing.length === 0) {
      await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error('[profitability] fetch failed:', err);
    return NextResponse.json({
      status: 'unavailable',
      message: err instanceof Error ? err.message : 'fetch_failed',
    });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from `opsradar/`:
```bash
npx tsc --noEmit 2>&1 | grep profitability
```
Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/profitability/route.ts
git commit -m "feat(profitability): API route — orchestrates Stripe + Harvest + compute + cache"
```

---

## Task 5: Add blended hourly rate to profile settings

**Files:**
- Modify: `src/app/api/profile/route.ts`
- Modify: `src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Update the profile API GET to expose `blended_hourly_rate_usd`**

In `src/app/api/profile/route.ts`, find the `Profile` type and the `GET` handler. Replace them:

```typescript
type Profile = {
  email: string;
  full_name: string;
  company_name: string;
  timezone: string;
  role: string;
  blended_hourly_rate_usd: number;
};
```

In `GET`, replace the `profile` object construction:

```typescript
  const profile: Profile = {
    email: data.user.email ?? '',
    full_name: typeof meta.full_name === 'string' ? meta.full_name : '',
    company_name: typeof meta.company_name === 'string' ? meta.company_name : '',
    timezone: typeof meta.timezone === 'string' ? meta.timezone : 'UTC',
    role: typeof meta.role === 'string' ? meta.role : '',
    blended_hourly_rate_usd: typeof meta.blended_hourly_rate_usd === 'number'
      ? meta.blended_hourly_rate_usd
      : 85,
  };
```

- [ ] **Step 2: Update the profile API PATCH to accept `blended_hourly_rate_usd`**

In the `PatchBody` type, add:
```typescript
type PatchBody = {
  full_name?: unknown;
  company_name?: unknown;
  timezone?: unknown;
  blended_hourly_rate_usd?: unknown;
};
```

In the `PATCH` handler, after the timezone block, add:
```typescript
  if ('blended_hourly_rate_usd' in body) {
    const v = body.blended_hourly_rate_usd;
    if (typeof v !== 'number' || v < 1 || v > 10_000 || !Number.isFinite(v)) {
      return NextResponse.json({ error: 'invalid_blended_hourly_rate_usd' }, { status: 400 });
    }
    updates.blended_hourly_rate_usd = v;
  }
```

Note: `updates` is typed as `Record<string, string>` in the existing code — change it to `Record<string, string | number>` to allow the numeric rate.

- [ ] **Step 3: Update settings page to show the blended rate field**

In `src/app/dashboard/settings/page.tsx`:

Add state after the existing state declarations:
```typescript
  const [blendedRate, setBlendedRate] = useState<number>(85);
```

In the `useEffect` where profile is loaded, add after `setTimezone(...)`:
```typescript
          setBlendedRate(j.profile.blended_hourly_rate_usd ?? 85);
```

In the `save` function's `JSON.stringify` body, add `blended_hourly_rate_usd: blendedRate`.

Add the input field inside the `<form>`, after the timezone `<select>`:
```tsx
        <div className="flex flex-col gap-1.5">
          <label className="text-label text-[var(--color-fg-muted)]">
            Blended hourly rate (USD)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-body-sm text-[var(--color-fg-subtle)]">
              $
            </span>
            <input
              type="number"
              min={1}
              max={10000}
              step={1}
              value={blendedRate}
              onChange={(e) => setBlendedRate(Number(e.target.value))}
              className="w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-6 pr-3 text-body text-[var(--color-fg)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
          <p className="text-label text-[var(--color-fg-subtle)]">
            Your average cost per hour of team work delivered — used to calculate client margins.
          </p>
        </div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "(profile|settings)"
```
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/profile/route.ts src/app/dashboard/settings/page.tsx
git commit -m "feat(profitability): add blended_hourly_rate_usd to profile settings"
```

---

## Task 6: Profitability table component

**Files:**
- Create: `src/app/dashboard/_components/profitability-table.tsx`

- [ ] **Step 1: Create the component file**

```typescript
// src/app/dashboard/_components/profitability-table.tsx
'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { EmptyStateConnect } from './empty-state-connect';
import type { ClientProfitability, ProfitabilityResult } from '<npm>/lib/profitability';

type SortKey = 'name' | 'revenue_mtd' | 'hours_mtd' | 'margin_pct';
type SortDir = 'asc' | 'desc';

type Props = {
  state:
    | { kind: 'loading' }
    | { kind: 'not_connected'; missing: ('stripe' | 'harvest')[] }
    | { kind: 'error' }
    | { kind: 'ok'; data: ProfitabilityResult; blended_rate_usd: number };
};

export function ProfitabilityTable({ state }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('margin_pct');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  if (state.kind === 'loading') {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-[var(--color-surface-sunken)]" />
        ))}
      </div>
    );
  }

  if (state.kind === 'not_connected') {
    const missing = state.missing;
    if (missing.length === 2) {
      return (
        <div className="flex gap-3">
          <EmptyStateConnect tool="Stripe" toolSlug="stripe" description="Connect Stripe for revenue data." />
          <EmptyStateConnect tool="Harvest" toolSlug="harvest" description="Connect Harvest for hours data." />
        </div>
      );
    }
    const tool = missing[0] === 'stripe' ? 'Stripe' : 'Harvest';
    const slug = missing[0];
    return <EmptyStateConnect tool={tool} toolSlug={slug} description={`Connect ${tool} to complete your profitability picture.`} />;
  }

  if (state.kind === 'error') {
    return (
      <p className="text-body-sm text-[var(--color-fg-subtle)]">
        Couldn&apos;t load profitability data. We&apos;ll retry shortly.
      </p>
    );
  }

  const { data, blended_rate_usd } = state;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'margin_pct' ? 'asc' : 'desc');
    }
  }

  const sorted = [...data.clients].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  if (sorted.length === 0 && data.unmatched_stripe.length === 0 && data.unmatched_harvest.length === 0) {
    return (
      <p className="text-body-sm text-[var(--color-fg-subtle)]">
        No client data yet this month. Data will appear once Stripe invoices or Harvest time entries exist.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {sorted.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {(['name', 'revenue_mtd', 'hours_mtd', 'margin_pct'] as SortKey[]).map((key) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="cursor-pointer pb-2 pr-4 text-left text-label font-normal text-[var(--color-fg-subtle)] last:pr-0 hover:text-[var(--color-fg)]"
                  >
                    {colLabel(key)}
                    {sortKey === key && (
                      <span className="ml-1 text-[var(--color-primary)]">
                        {sortDir === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                ))}
                <th className="pb-2 pr-4 text-left text-label font-normal text-[var(--color-fg-subtle)]">Payment</th>
                <th className="pb-2 text-left text-label font-normal text-[var(--color-fg-subtle)]">Trend</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <ClientRow key={c.id} client={c} blendedRate={blended_rate_usd} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(data.unmatched_stripe.length > 0 || data.unmatched_harvest.length > 0) && (
        <UnmatchedSection
          unmatchedStripe={data.unmatched_stripe}
          unmatchedHarvest={data.unmatched_harvest}
        />
      )}

      <p className="text-label text-[var(--color-fg-subtle)]">
        Margin calculated at ${blended_rate_usd}/hr blended rate.{' '}
        <a href="/dashboard/settings" className="underline hover:text-[var(--color-fg)]">
          Adjust rate →
        </a>
      </p>
    </div>
  );
}

function colLabel(key: SortKey): string {
  switch (key) {
    case 'name': return 'Client';
    case 'revenue_mtd': return 'Revenue · MTD';
    case 'hours_mtd': return 'Hours · MTD';
    case 'margin_pct': return 'Margin';
  }
}

function ClientRow({ client: c, blendedRate }: { client: ClientProfitability; blendedRate: number }) {
  return (
    <tr className="border-b border-[var(--color-border)] last:border-b-0">
      <td className="py-3 pr-4 font-medium text-[var(--color-fg)]">{c.name}</td>
      <td className="py-3 pr-4 text-[var(--color-fg-muted)]">{fmtMoney(c.revenue_mtd)}</td>
      <td className="py-3 pr-4 text-[var(--color-fg-muted)]">
        {c.hours_mtd > 0 ? `${c.hours_mtd}h` : <span className="text-[var(--color-fg-subtle)]">—</span>}
        {c.hours_mtd > 0 && (
          <span className="ml-1.5 text-label text-[var(--color-fg-subtle)]">
            ({fmtMoney(c.hours_mtd * blendedRate)} cost)
          </span>
        )}
      </td>
      <td className="py-3 pr-4">
        <MarginBadge pct={c.margin_pct} />
      </td>
      <td className="py-3 pr-4">
        <PaymentBadge status={c.payment_status} daysOverdue={c.days_overdue} />
      </td>
      <td className="py-3">
        <TrendIcon trend={c.trend} />
      </td>
    </tr>
  );
}

function MarginBadge({ pct }: { pct: number }) {
  const rounded = Math.round(pct);
  const color =
    pct < 0
      ? 'text-[var(--color-error)] bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]'
      : pct < 20
      ? 'text-[var(--color-warn)] bg-[color-mix(in_srgb,var(--color-warn)_10%,transparent)]'
      : 'text-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)]';

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-label font-semibold ${color}`}>
      {rounded}%
    </span>
  );
}

function PaymentBadge({
  status,
  daysOverdue,
}: {
  status: ClientProfitability['payment_status'];
  daysOverdue: number | null;
}) {
  if (status === 'overdue') {
    return (
      <span className="text-[var(--color-error)] text-label">
        Overdue {daysOverdue !== null ? `${daysOverdue}d` : ''}
      </span>
    );
  }
  if (status === 'on_time') {
    return <span className="text-[var(--color-success)] text-label">On time</span>;
  }
  return <span className="text-[var(--color-fg-subtle)] text-label">—</span>;
}

function TrendIcon({ trend }: { trend: ClientProfitability['trend'] }) {
  if (trend === 'up') return <ArrowUp size={14} className="text-[var(--color-success)]" />;
  if (trend === 'down') return <ArrowDown size={14} className="text-[var(--color-error)]" />;
  return <Minus size={14} className="text-[var(--color-fg-subtle)]" />;
}

function UnmatchedSection({
  unmatchedStripe,
  unmatchedHarvest,
}: {
  unmatchedStripe: ProfitabilityResult['unmatched_stripe'];
  unmatchedHarvest: ProfitabilityResult['unmatched_harvest'];
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4">
      <p className="mb-2 text-label font-semibold text-[var(--color-fg-muted)]">
        Unmatched clients — names differ between Stripe and Harvest
      </p>
      {unmatchedStripe.length > 0 && (
        <div className="mb-2">
          <p className="text-label text-[var(--color-fg-subtle)]">In Stripe only (no hours tracked):</p>
          <ul className="mt-1 space-y-0.5">
            {unmatchedStripe.map((c) => (
              <li key={c.id} className="text-body-sm text-[var(--color-fg-muted)]">
                {c.name} — {fmtMoney(c.revenue_mtd)} revenue, hours unknown
              </li>
            ))}
          </ul>
        </div>
      )}
      {unmatchedHarvest.length > 0 && (
        <div>
          <p className="text-label text-[var(--color-fg-subtle)]">In Harvest only (no invoices found):</p>
          <ul className="mt-1 space-y-0.5">
            {unmatchedHarvest.map((c) => (
              <li key={c.name} className="text-body-sm text-[var(--color-fg-muted)]">
                {c.name} — {c.hours_mtd}h tracked, no Stripe customer found
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep profitability-table
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/_components/profitability-table.tsx
git commit -m "feat(profitability): ProfitabilityTable component with sort, badges, unmatched section"
```

---

## Task 7: Dashboard profitability page

**Files:**
- Create: `src/app/dashboard/profitability/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// src/app/dashboard/profitability/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ProfitabilityTable } from '../_components/profitability-table';
import type { ProfitabilityResult } from '<npm>/lib/profitability';

type ApiResp =
  | { status: 'ok'; data: ProfitabilityResult; blended_rate_usd: number }
  | { status: 'not_connected'; missing: ('stripe' | 'harvest')[] }
  | { status: 'unavailable'; message: string };

type TableState =
  | { kind: 'loading' }
  | { kind: 'not_connected'; missing: ('stripe' | 'harvest')[] }
  | { kind: 'error' }
  | { kind: 'ok'; data: ProfitabilityResult; blended_rate_usd: number };

export default function ProfitabilityPage() {
  const [tableState, setTableState] = useState<TableState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/profitability')
      .then((r) => r.json())
      .then((resp: ApiResp) => {
        if (cancelled) return;
        if (resp.status === 'not_connected') {
          setTableState({ kind: 'not_connected', missing: resp.missing });
        } else if (resp.status === 'ok') {
          setTableState({ kind: 'ok', data: resp.data, blended_rate_usd: resp.blended_rate_usd });
        } else {
          setTableState({ kind: 'error' });
        }
      })
      .catch(() => {
        if (!cancelled) setTableState({ kind: 'error' });
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="text-body-sm text-[var(--color-fg-muted)]">
          Dashboard /{' '}
          <span className="font-semibold text-[var(--color-fg)]">Profitability</span>
        </div>
      </div>

      <div className="mb-1">
        <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Client Profitability
        </h1>
        <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
          Revenue vs. hours worked — see which clients are making you money this month.
        </p>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-xs)]">
        <ProfitabilityTable state={tableState} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "(profitability/page|ProfitabilityPage)"
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/profitability/page.tsx
git commit -m "feat(profitability): /dashboard/profitability page"
```

---

## Task 8: Add Profitability to sidebar nav

**Files:**
- Modify: `src/app/dashboard/_components/sidebar.tsx`

- [ ] **Step 1: Add the import and nav item**

In `src/app/dashboard/_components/sidebar.tsx`, find the existing imports from `lucide-react`:

```typescript
import {
  LayoutDashboard,
  Activity,
  TrendingUp,
  Plug,
  Settings,
  ChevronRight,
} from 'lucide-react';
```

Replace with:

```typescript
import {
  LayoutDashboard,
  Activity,
  TrendingUp,
  DollarSign,
  Plug,
  Settings,
  ChevronRight,
} from 'lucide-react';
```

Find the `navSections` array. In the first section (tag: null), add "Profitability" after "Business":

```typescript
const navSections: NavSection[] = [
  {
    tag: null,
    items: [
      { label: 'Overview',      href: '/dashboard',              icon: LayoutDashboard },
      { label: 'Automations',   href: '/dashboard/automations',  icon: Activity        },
      { label: 'Business',      href: '/dashboard/business',     icon: TrendingUp      },
      { label: 'Profitability', href: '/dashboard/profitability', icon: DollarSign     },
    ],
  },
  {
    tag: 'WORKSPACE',
    items: [
      { label: 'Integrations', href: '/dashboard/integrations', icon: Plug },
      { label: 'Settings',     href: '/dashboard/settings',     icon: Settings },
    ],
  },
];
```

- [ ] **Step 2: Verify TypeScript compiles and lint passes**

```bash
npx tsc --noEmit && npm run lint 2>&1 | tail -5
```
Expected: clean output (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/_components/sidebar.tsx
git commit -m "feat(profitability): add Profitability to dashboard sidebar nav"
```

---

## Task 9: End-to-end smoke test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard/profitability` in a browser.

- [ ] **Step 2: Verify empty state (no tools connected)**

Expected: two `EmptyStateConnect` cards for Stripe and Harvest, each with a connect button.

- [ ] **Step 3: Verify settings page shows blended rate field**

Open `http://localhost:3000/dashboard/settings`.
Expected: a "$" prefixed number input labeled "Blended hourly rate (USD)" with default value 85.

- [ ] **Step 4: Change blended rate and save**

Set rate to 95, click Save.
Expected: "Profile saved." banner, no errors in browser console.

- [ ] **Step 5: Verify API route responds correctly**

```bash
curl http://localhost:3000/api/dashboard/profitability
```
Expected with no tools connected: `{"status":"not_connected","missing":["stripe","harvest"]}`

- [ ] **Step 6: Run production build to catch any remaining errors**

```bash
npm run build 2>&1 | tail -20
```
Expected: successful build, no TypeScript or import errors.

- [ ] **Step 7: Commit any fixes, then final commit**

```bash
git add -p  # stage only relevant changes
git commit -m "feat(profitability): phase 1 complete — client profitability dashboard"
```

---

## Self-review notes

- **Spec coverage:** All items from Phase 1 in the strategy spec are covered: new route, data model, client matching, margin/trend/payment calculation, UI components, settings field, sidebar nav, empty states.
- **No placeholders:** All code blocks are complete and self-contained.
- **Type consistency:** `ClientProfitability` defined in `src/lib/profitability.ts` and imported (not redefined) in the component and page files.
- **Blended rate default:** $85 appears in three places — the API route, the profile GET, and the settings page default. All three are consistent.
- **Trend threshold:** ±5pp → 'flat', >5pp → 'up', <-5pp → 'down'. Defined in `profitability.ts` `computeTrend` and matches the spec.
