# Phase 5: Benchmark Network Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compute anonymized industry benchmarks from opted-in customers, store percentiles per team-size bucket, and surface them on the profitability dashboard so each customer sees how they compare to peers.

**Architecture:** A weekly Sunday cron loops over opted-in users, decrypts their Stripe/Harvest keys, computes 4 metrics (median client margin, median invoice days overdue, hours per $10k revenue, active client count), buckets by `team_size`, and upserts p25/p50/p75 into a `benchmarks` table. The dashboard reads from this table via a public-ish API (session-RLS-scoped to the current user's bucket) and renders benchmark cards above the profitability table. Sample-size threshold = 5 — below that we render a "still collecting data" placeholder, not real percentiles.

**Tech Stack:** Next.js 16 App Router, Supabase (service-role + RLS), Stripe SDK, Harvest REST API, AES-256-GCM decryption via existing `decryptApiKey`, Tailwind CSS v4. No GPT calls — pure aggregation.

---

## Scope notes (read before starting)

- **In scope (v1):** opt-in flag, team_size capture, weekly cron, percentile table, dashboard tooltip cards, settings UI for the two new fields.
- **Explicitly out of scope:** quarterly PDF benchmark report, dedicated `/benchmarks` public landing page, agency_type as a secondary bucket dimension, week-over-week trend visualisation. These are Phase 5.5 / marketing work, separate plan.
- **Sample-size floor:** 5 opted-in users in a bucket before we render real numbers. Below that, render a "we need a few more agencies before this is meaningful — your data is helping" message.
- **Privacy invariant:** the read API never exposes another user's row-level data. It only reads from `benchmarks` (aggregated table). Individual computations stay in memory inside the cron handler.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | (SQL via Supabase MCP) | `benchmarks` table + RLS |
| Modify | `src/lib/database.types.ts` | Regenerated to include `benchmarks` |
| Create | `src/lib/benchmarks/types.ts` | `BenchmarkMetric`, `TeamSizeBucket`, `BenchmarkRow`, `UserComparison` |
| Create | `src/lib/benchmarks/buckets.ts` | Maps free-text `team_size` to canonical bucket |
| Create | `src/lib/benchmarks/percentile.ts` | Pure percentile math (p25/p50/p75) |
| Create | `src/lib/benchmarks/collect.ts` | Per-user metric collection (Stripe + Harvest fetch + compute) |
| Create | `src/lib/benchmarks/aggregator.ts` | Loops users, groups by bucket, upserts to `benchmarks` |
| Create | `src/app/api/cron/benchmarks/route.ts` | Cron entry: Bearer auth + invoke aggregator |
| Create | `src/app/api/dashboard/benchmarks/route.ts` | GET: returns benchmarks for current user's bucket + comparison |
| Create | `src/app/dashboard/profitability/_components/benchmark-cards.tsx` | Client component showing 3-4 comparison cards |
| Modify | `src/app/dashboard/profitability/page.tsx` | Mount `<BenchmarkCards />` above the table |
| Modify | `src/app/dashboard/settings/page.tsx` | Add team_size dropdown + benchmark opt-in toggle |
| Modify | `src/app/api/profile/route.ts` | Accept + validate `team_size` and `benchmark_opt_in` on PATCH; return them on GET |
| Modify | `src/lib/rate-limit.ts` | Add `'dashboard-benchmarks'` entry |
| Modify | `vercel.json` | Add Sunday 23:00 UTC cron for `/api/cron/benchmarks` |

---

## Task 1: Database migration + types

**Files:**
- Run SQL via Supabase MCP
- Modify: `src/lib/database.types.ts`
- Create: `src/lib/benchmarks/types.ts`

- [ ] **Step 1: Apply migration**

Use `mcp__claude_ai_Supabase__apply_migration` on project `nbdcrmepvwbfbcjqfubr`:

```sql
CREATE TABLE benchmarks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric            text NOT NULL,
  team_size_bucket  text NOT NULL,
  p25               numeric NOT NULL,
  p50               numeric NOT NULL,
  p75               numeric NOT NULL,
  sample_size       integer NOT NULL,
  computed_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (metric, team_size_bucket)
);

CREATE INDEX benchmarks_lookup_idx ON benchmarks (team_size_bucket, metric);

ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;

-- Aggregates only — every authenticated user can read every row.
CREATE POLICY "anyone authenticated can read benchmarks" ON benchmarks
  FOR SELECT
  TO authenticated
  USING (true);
```

- [ ] **Step 2: Verify**

Use `mcp__claude_ai_Supabase__execute_sql`:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'benchmarks'
ORDER BY ordinal_position;
```

Expected: 8 rows (id, metric, team_size_bucket, p25, p50, p75, sample_size, computed_at).

- [ ] **Step 3: Regenerate `src/lib/database.types.ts`**

Use `mcp__claude_ai_Supabase__generate_typescript_types` on project `nbdcrmepvwbfbcjqfubr`. Read the existing file first, then overwrite with the new output. Verify the `benchmarks` table appears with Row/Insert/Update types.

- [ ] **Step 4: Create `src/lib/benchmarks/types.ts`**

```typescript
export type BenchmarkMetric =
  | 'median_client_margin_pct'
  | 'median_invoice_days_overdue'
  | 'hours_per_10k_revenue'
  | 'active_client_count'

export type TeamSizeBucket = 'solo' | '2-5' | '6-15' | '16-30' | '31+'

export const TEAM_SIZE_BUCKETS: TeamSizeBucket[] = ['solo', '2-5', '6-15', '16-30', '31+']

export const METRIC_LABELS: Record<BenchmarkMetric, string> = {
  median_client_margin_pct:    'Client margin (median %)',
  median_invoice_days_overdue: 'Invoice collection time (days)',
  hours_per_10k_revenue:       'Hours per $10K revenue',
  active_client_count:         'Active clients',
}

// "higher_better": user wants to be above p50 (e.g. margin %)
// "lower_better": user wants to be below p50 (e.g. days overdue, hours/10k)
// "neutral":      no good/bad direction (e.g. client count)
export const METRIC_DIRECTION: Record<BenchmarkMetric, 'higher_better' | 'lower_better' | 'neutral'> = {
  median_client_margin_pct:    'higher_better',
  median_invoice_days_overdue: 'lower_better',
  hours_per_10k_revenue:       'lower_better',
  active_client_count:         'neutral',
}

export type BenchmarkRow = {
  metric: BenchmarkMetric
  team_size_bucket: TeamSizeBucket
  p25: number
  p50: number
  p75: number
  sample_size: number
  computed_at: string
}

export type UserComparison = {
  metric: BenchmarkMetric
  user_value: number | null   // null = couldn't compute (e.g. no invoices)
  bucket: TeamSizeBucket | null
  benchmark: BenchmarkRow | null
  // "top_25"   = user is in best quartile based on METRIC_DIRECTION
  // "above"    = better than p50 but not top quartile
  // "below"    = worse than p50 but not bottom quartile
  // "bottom_25" = worst quartile
  // "no_data"  = sample_size below threshold OR user_value null
  position: 'top_25' | 'above' | 'below' | 'bottom_25' | 'no_data'
}
```

- [ ] **Step 5: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/lib/benchmarks/types.ts src/lib/database.types.ts
git commit -m "feat(benchmarks): benchmarks table + core types"
```

---

## Task 2: Bucket mapping + percentile math

**Files:**
- Create: `src/lib/benchmarks/buckets.ts`
- Create: `src/lib/benchmarks/percentile.ts`

- [ ] **Step 1: Create `src/lib/benchmarks/buckets.ts`**

```typescript
import type { TeamSizeBucket } from './types'

/**
 * Maps a free-text team_size string from user_metadata to a canonical bucket.
 * Accepts the strings the audit form has historically used ('1', '2-5', '6-15',
 * '16-30', '31-50', '51-100', '100+') as well as anything resembling an
 * integer head count.
 */
export function bucketForTeamSize(raw: string | null | undefined): TeamSizeBucket | null {
  if (!raw) return null
  const s = String(raw).trim().toLowerCase()
  if (!s) return null

  // Explicit ranges first
  if (s === '1' || s === 'solo' || s === '1 (solo)') return 'solo'
  if (s === '2-5') return '2-5'
  if (s === '6-15') return '6-15'
  if (s === '16-30') return '16-30'
  if (s === '31-50' || s === '51-100' || s === '100+' || s === '31+') return '31+'

  // Fallback: try numeric parsing on the first integer
  const m = s.match(/\d+/)
  if (!m) return null
  const n = Number(m[0])
  if (!Number.isFinite(n) || n < 1) return null
  if (n === 1)   return 'solo'
  if (n <= 5)    return '2-5'
  if (n <= 15)   return '6-15'
  if (n <= 30)   return '16-30'
  return '31+'
}
```

- [ ] **Step 2: Create `src/lib/benchmarks/percentile.ts`**

```typescript
/**
 * Returns the value at percentile p (0-100) of a numeric array,
 * using linear interpolation. Returns null for empty arrays.
 *
 * Caller is responsible for filtering out NaN/Infinity before calling.
 */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null
  if (p <= 0) return values[0]!
  if (p >= 100) return values[values.length - 1]!

  const sorted = [...values].sort((a, b) => a - b)
  const idx = (p / 100) * (sorted.length - 1)
  const lo  = Math.floor(idx)
  const hi  = Math.ceil(idx)
  if (lo === hi) return sorted[lo]!
  const frac = idx - lo
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac
}

export function p25(values: number[]): number | null { return percentile(values, 25) }
export function p50(values: number[]): number | null { return percentile(values, 50) }
export function p75(values: number[]): number | null { return percentile(values, 75) }
```

- [ ] **Step 3: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/lib/benchmarks/buckets.ts src/lib/benchmarks/percentile.ts
git commit -m "feat(benchmarks): team-size bucketing + percentile math"
```

---

## Task 3: Per-user metric collection

**Files:**
- Create: `src/lib/benchmarks/collect.ts`

This is the only file that actually touches Stripe + Harvest. It fetches once per user and returns 4 numeric metrics (or null for any it can't compute). Errors are swallowed per metric — the cron should never crash because one customer's Stripe is rate-limited.

- [ ] **Step 1: Create `src/lib/benchmarks/collect.ts`**

```typescript
import Stripe from 'stripe'
import { fetchStripePerClientRevenue } from '<npm>/lib/integrations/stripe/profitability-adapter'
import { fetchHarvestPerClientHours } from '<npm>/lib/integrations/harvest/profitability-adapter'
import { computeClientProfitability } from '<npm>/lib/profitability'
import type { BenchmarkMetric } from './types'

export type UserMetrics = Partial<Record<BenchmarkMetric, number>>

const DEFAULT_BLENDED_RATE = 85

function unix(d: Date): number {
  return Math.floor(d.getTime() / 1000)
}

async function medianInvoiceDaysOverdue(stripeApiKey: string): Promise<number | null> {
  try {
    const stripe = new Stripe(stripeApiKey, { typescript: true, maxNetworkRetries: 2 })
    const now = unix(new Date())
    // Look at all paid invoices from the last 90 days; days-overdue at payment
    const resp = await stripe.invoices.list({
      status: 'paid',
      created: { gte: now - 90 * 24 * 60 * 60 },
      limit: 100,
    })
    const days: number[] = []
    for (const inv of resp.data) {
      if (!inv.due_date || !inv.status_transitions?.paid_at) continue
      const overdue = (inv.status_transitions.paid_at - inv.due_date) / 86400
      if (overdue >= 0) days.push(overdue)
    }
    if (days.length === 0) return null
    days.sort((a, b) => a - b)
    return days[Math.floor(days.length / 2)]!
  } catch {
    return null
  }
}

async function collectProfitabilityDerived(
  stripeApiKey: string,
  harvestApiKey: string,
  blendedRate: number,
): Promise<{ marginMedian: number | null; hoursPer10k: number | null; clientCount: number | null }> {
  try {
    const [stripeData, harvestData] = await Promise.all([
      fetchStripePerClientRevenue(stripeApiKey),
      fetchHarvestPerClientHours(harvestApiKey),
    ])
    const result = computeClientProfitability(stripeData, harvestData, blendedRate)

    const margins = result.clients
      .map((c) => c.margin_pct)
      .filter((m) => Number.isFinite(m))
    margins.sort((a, b) => a - b)
    const marginMedian = margins.length ? margins[Math.floor(margins.length / 2)]! : null

    const totalRevenue = result.clients.reduce((s, c) => s + c.revenue_mtd, 0)
    const totalHours   = result.clients.reduce((s, c) => s + c.hours_mtd, 0)
    const hoursPer10k =
      totalRevenue > 0 ? (totalHours / totalRevenue) * 10_000 : null

    const clientCount = result.clients.length || null

    return { marginMedian, hoursPer10k, clientCount }
  } catch {
    return { marginMedian: null, hoursPer10k: null, clientCount: null }
  }
}

export async function collectUserMetrics(args: {
  stripeApiKey: string | null
  harvestApiKey: string | null
  blendedRate: number | null
}): Promise<UserMetrics> {
  const blended = args.blendedRate ?? DEFAULT_BLENDED_RATE
  const metrics: UserMetrics = {}

  // Median days overdue — Stripe only
  if (args.stripeApiKey) {
    const v = await medianInvoiceDaysOverdue(args.stripeApiKey)
    if (v !== null) metrics.median_invoice_days_overdue = v
  }

  // Margin, hours/10k, client count — need both Stripe + Harvest
  if (args.stripeApiKey && args.harvestApiKey) {
    const { marginMedian, hoursPer10k, clientCount } = await collectProfitabilityDerived(
      args.stripeApiKey,
      args.harvestApiKey,
      blended,
    )
    if (marginMedian !== null) metrics.median_client_margin_pct = marginMedian
    if (hoursPer10k   !== null) metrics.hours_per_10k_revenue   = hoursPer10k
    if (clientCount   !== null) metrics.active_client_count     = clientCount
  }

  return metrics
}
```

- [ ] **Step 2: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/benchmarks/collect.ts
git commit -m "feat(benchmarks): per-user metric collection"
```

---

## Task 4: Aggregator + cron route

**Files:**
- Create: `src/lib/benchmarks/aggregator.ts`
- Create: `src/app/api/cron/benchmarks/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Create `src/lib/benchmarks/aggregator.ts`**

```typescript
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { decryptApiKey } from '<npm>/lib/integrations/crypto'
import type { Json } from '<npm>/lib/database.types'
import { bucketForTeamSize } from './buckets'
import { collectUserMetrics, type UserMetrics } from './collect'
import { p25, p50, p75 } from './percentile'
import {
  TEAM_SIZE_BUCKETS,
  type BenchmarkMetric,
  type TeamSizeBucket,
} from './types'

const SAMPLE_SIZE_FLOOR = 5
const ALL_METRICS: BenchmarkMetric[] = [
  'median_client_margin_pct',
  'median_invoice_days_overdue',
  'hours_per_10k_revenue',
  'active_client_count',
]

export type AggregateStats = {
  users_considered: number
  users_with_data:  number
  rows_upserted:    number
}

export async function runBenchmarkAggregation(): Promise<AggregateStats> {
  const supabase = getServerSupabaseClient()

  // 1. Pull all users with a connected integration. They might not all be
  //    opt-in — we filter that next. Using auth.admin to read user_metadata.
  const { data: integrationRows } = await supabase
    .from('integrations')
    .select('client_id')
    .eq('status', 'connected')
    .not('encrypted_token', 'is', null)

  const userIds = [...new Set((integrationRows ?? []).map((r) => r.client_id))]

  // bucket -> metric -> number[] (values across users in that bucket)
  const samples = new Map<TeamSizeBucket, Map<BenchmarkMetric, number[]>>()
  for (const b of TEAM_SIZE_BUCKETS) {
    const inner = new Map<BenchmarkMetric, number[]>()
    for (const m of ALL_METRICS) inner.set(m, [])
    samples.set(b, inner)
  }

  let withData = 0

  for (const userId of userIds) {
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    if (!user) continue
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>
    if (meta.benchmark_opt_in === false) continue  // opt-out

    const bucket = bucketForTeamSize(meta.team_size as string | undefined)
    if (!bucket) continue  // can't bucket without team_size

    const { data: keyRows } = await supabase
      .from('integrations')
      .select('tool, encrypted_token, iv, auth_tag, status')
      .eq('client_id', userId)
      .eq('status', 'connected')

    const getKey = (tool: string): string | null => {
      const row = (keyRows ?? []).find((r) => r.tool === tool)
      try { return row ? decryptApiKey(row) : null } catch { return null }
    }

    let metrics: UserMetrics
    try {
      metrics = await collectUserMetrics({
        stripeApiKey:  getKey('stripe'),
        harvestApiKey: getKey('harvest'),
        blendedRate:   typeof meta.blended_hourly_rate_usd === 'number'
          ? meta.blended_hourly_rate_usd
          : null,
      })
    } catch (err) {
      console.warn('[benchmarks] collect failed for user', userId, err)
      continue
    }

    if (Object.keys(metrics).length === 0) continue
    withData += 1

    const bucketSamples = samples.get(bucket)!
    for (const [metricKey, value] of Object.entries(metrics) as [BenchmarkMetric, number][]) {
      if (!Number.isFinite(value)) continue
      bucketSamples.get(metricKey)!.push(value)
    }
  }

  // 2. Compute p25/p50/p75 per bucket+metric, upsert rows above the floor.
  const computedAt = new Date().toISOString()
  let rowsUpserted = 0

  for (const bucket of TEAM_SIZE_BUCKETS) {
    const inner = samples.get(bucket)!
    for (const metric of ALL_METRICS) {
      const arr = inner.get(metric)!
      if (arr.length < SAMPLE_SIZE_FLOOR) continue
      const v25 = p25(arr); const v50 = p50(arr); const v75 = p75(arr)
      if (v25 === null || v50 === null || v75 === null) continue

      const { error } = await supabase
        .from('benchmarks')
        .upsert(
          {
            metric,
            team_size_bucket: bucket,
            p25: v25,
            p50: v50,
            p75: v75,
            sample_size: arr.length,
            computed_at: computedAt,
          } as Json as never,  // upsert requires Insert shape; benchmarks types are stable
          { onConflict: 'metric,team_size_bucket' },
        )
      if (!error) rowsUpserted += 1
      else console.error('[benchmarks] upsert failed', { metric, bucket, error })
    }
  }

  return {
    users_considered: userIds.length,
    users_with_data:  withData,
    rows_upserted:    rowsUpserted,
  }
}
```

- [ ] **Step 2: Create `src/app/api/cron/benchmarks/route.ts`**

```typescript
import { hasServerSupabaseClient } from '<npm>/lib/supabase-server'
import { serverErrorResponse } from '<npm>/lib/security'
import { runBenchmarkAggregation } from '<npm>/lib/benchmarks/aggregator'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET) {
    console.error('[benchmarks cron] missing CRON_SECRET')
    return serverErrorResponse()
  }
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!hasServerSupabaseClient()) return serverErrorResponse()

  const stats = await runBenchmarkAggregation()
  console.log('[benchmarks cron] done', stats)
  return Response.json({ ok: true, stats })
}
```

- [ ] **Step 3: Update `vercel.json`**

Read it first, then add the new cron after the existing actions cron. Schedule = Sunday 23:00 UTC (so the Monday 8am briefing reads fresh numbers).

Final `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/followups",        "schedule": "0 10 * * *" },
    { "path": "/api/cron/weekly-briefing",  "schedule": "0 8 * * 1" },
    { "path": "/api/cron/actions",          "schedule": "0 9 * * *" },
    { "path": "/api/cron/benchmarks",       "schedule": "0 23 * * 0" }
  ]
}
```

- [ ] **Step 4: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/lib/benchmarks/aggregator.ts src/app/api/cron/benchmarks/route.ts vercel.json
git commit -m "feat(benchmarks): weekly aggregator + Sunday cron"
```

---

## Task 5: Profile API: accept team_size + benchmark_opt_in

**Files:**
- Modify: `src/app/api/profile/route.ts`

The settings UI in Task 7 needs these two fields on both GET and PATCH. Extend the existing handlers.

- [ ] **Step 1: Read the existing file**

```bash
# Just for the engineer's reference — the file is short, ~130 lines.
cat src/app/api/profile/route.ts
```

- [ ] **Step 2: Extend the `Profile` type**

Add two fields at the end:

```typescript
type Profile = {
  email: string;
  full_name: string;
  company_name: string;
  timezone: string;
  role: string;
  blended_hourly_rate_usd: number;
  weekly_briefing_enabled: boolean;
  team_size: string;            // new — free-text; bucket mapping done elsewhere
  benchmark_opt_in: boolean;    // new — default true if missing
};
```

- [ ] **Step 3: Populate them in GET**

Inside the `GET` handler, after the existing `weekly_briefing_enabled` line, add:

```typescript
    team_size: typeof meta.team_size === 'string' ? meta.team_size : '',
    benchmark_opt_in: meta.benchmark_opt_in !== false,
```

- [ ] **Step 4: Validate them in PATCH**

In the `PatchBody` type, add:

```typescript
  team_size?: unknown;
  benchmark_opt_in?: unknown;
```

After the existing `weekly_briefing_enabled` block, add:

```typescript
  if ('team_size' in body) {
    const v = sanitizeText(body.team_size, 20);
    if (v === null) return NextResponse.json({ error: 'invalid_team_size' }, { status: 400 });
    updates.team_size = v;
  }
  if ('benchmark_opt_in' in body) {
    if (typeof body.benchmark_opt_in !== 'boolean') {
      return NextResponse.json({ error: 'invalid_benchmark_opt_in' }, { status: 400 });
    }
    updates.benchmark_opt_in = body.benchmark_opt_in;
  }
```

- [ ] **Step 5: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/profile/route.ts
git commit -m "feat(benchmarks): profile API accepts team_size + benchmark_opt_in"
```

---

## Task 6: Dashboard benchmarks read API

**Files:**
- Create: `src/app/api/dashboard/benchmarks/route.ts`
- Modify: `src/lib/rate-limit.ts`

- [ ] **Step 1: Add rate-limit entry**

In `src/lib/rate-limit.ts`, add to the `RateLimitName` union:

```typescript
  | 'dashboard-benchmarks'
```

And in the `RATE_LIMITS` object:

```typescript
  'dashboard-benchmarks': { limit: 120, window: '1 h' },
```

- [ ] **Step 2: Create `src/app/api/dashboard/benchmarks/route.ts`**

This route resolves the caller's bucket from `user_metadata.team_size`, reads all benchmark rows for that bucket, computes their `user_value` for each metric on the fly, and returns a `UserComparison[]` array.

```typescript
import { NextResponse } from 'next/server'
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { decryptApiKey } from '<npm>/lib/integrations/crypto'
import { bucketForTeamSize } from '<npm>/lib/benchmarks/buckets'
import { collectUserMetrics } from '<npm>/lib/benchmarks/collect'
import {
  METRIC_DIRECTION,
  type BenchmarkMetric,
  type BenchmarkRow,
  type UserComparison,
} from '<npm>/lib/benchmarks/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function classify(
  metric: BenchmarkMetric,
  userValue: number | null,
  row: BenchmarkRow | null,
): UserComparison['position'] {
  if (userValue === null || row === null) return 'no_data'
  const dir = METRIC_DIRECTION[metric]
  if (dir === 'neutral') {
    if (userValue >= row.p75) return 'above'
    if (userValue <= row.p25) return 'below'
    return userValue >= row.p50 ? 'above' : 'below'
  }
  if (dir === 'higher_better') {
    if (userValue >= row.p75) return 'top_25'
    if (userValue >= row.p50) return 'above'
    if (userValue >= row.p25) return 'below'
    return 'bottom_25'
  }
  // lower_better
  if (userValue <= row.p25) return 'top_25'
  if (userValue <= row.p50) return 'above'
  if (userValue <= row.p75) return 'below'
  return 'bottom_25'
}

export async function GET(): Promise<NextResponse> {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Read team_size from user_metadata (service-role; the session client can't
  // call auth.admin.getUserById).
  const service = getServerSupabaseClient()
  const { data: { user }, error: userErr } = await service.auth.admin.getUserById(userId)
  if (userErr || !user) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const bucket = bucketForTeamSize(meta.team_size as string | undefined)

  // No bucket → return placeholders (UI prompts the user to set team_size).
  if (!bucket) {
    return NextResponse.json({
      bucket: null,
      comparisons: [] as UserComparison[],
    })
  }

  // Read benchmark rows for this bucket via the session client (RLS allows
  // any authenticated user to read aggregates).
  const session = await getSessionSupabaseClient()
  const { data: rows } = await session
    .from('benchmarks')
    .select('*')
    .eq('team_size_bucket', bucket)

  const benchmarkByMetric = new Map<BenchmarkMetric, BenchmarkRow>()
  for (const r of rows ?? []) {
    benchmarkByMetric.set(r.metric as BenchmarkMetric, r as BenchmarkRow)
  }

  // Fetch this user's integration keys + compute their own metrics.
  const { data: keyRows } = await service
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .eq('status', 'connected')

  const getKey = (tool: string): string | null => {
    const row = (keyRows ?? []).find((r) => r.tool === tool)
    try { return row ? decryptApiKey(row) : null } catch { return null }
  }

  const metrics = await collectUserMetrics({
    stripeApiKey:  getKey('stripe'),
    harvestApiKey: getKey('harvest'),
    blendedRate:   typeof meta.blended_hourly_rate_usd === 'number'
      ? meta.blended_hourly_rate_usd
      : null,
  })

  const allMetrics: BenchmarkMetric[] = [
    'median_client_margin_pct',
    'median_invoice_days_overdue',
    'hours_per_10k_revenue',
    'active_client_count',
  ]

  const comparisons: UserComparison[] = allMetrics.map((metric) => {
    const userValue = metrics[metric] ?? null
    const benchmark = benchmarkByMetric.get(metric) ?? null
    return {
      metric,
      user_value: userValue,
      bucket,
      benchmark,
      position: classify(metric, userValue, benchmark),
    }
  })

  return NextResponse.json({ bucket, comparisons })
}
```

- [ ] **Step 3: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/dashboard/benchmarks/route.ts src/lib/rate-limit.ts
git commit -m "feat(benchmarks): GET /api/dashboard/benchmarks with comparisons"
```

---

## Task 7: Settings UI — team size + opt-in

**Files:**
- Modify: `src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Extend the `Profile` type**

In the file, replace the existing `Profile` type with:

```typescript
type Profile = {
  email: string;
  full_name: string;
  company_name: string;
  timezone: string;
  role: string;
  blended_hourly_rate_usd: number;
  weekly_briefing_enabled: boolean;
  team_size: string;
  benchmark_opt_in: boolean;
};
```

- [ ] **Step 2: Add state hooks**

After `const [weeklyBriefing, setWeeklyBriefing] = useState(true);`, add:

```typescript
  const [teamSize, setTeamSize] = useState<string>('');
  const [benchmarkOptIn, setBenchmarkOptIn] = useState(true);
```

- [ ] **Step 3: Populate state from the GET response**

After the existing `setWeeklyBriefing(...)` line in the `.then(...)` callback:

```typescript
          setTeamSize(j.profile.team_size ?? '');
          setBenchmarkOptIn(j.profile.benchmark_opt_in !== false);
```

- [ ] **Step 4: Send them in PATCH**

In the `save` handler, extend the `body` object:

```typescript
        body: JSON.stringify({
          full_name: fullName,
          company_name: companyName,
          timezone,
          blended_hourly_rate_usd: blendedRate,
          weekly_briefing_enabled: weeklyBriefing,
          team_size: teamSize,
          benchmark_opt_in: benchmarkOptIn,
        }),
```

- [ ] **Step 5: Add two new `<Field>` blocks**

After the existing "Weekly briefing email" Field and before the submit button, insert:

```tsx
          <Field label="Team size">
            <select
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value)}
              className="w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">Prefer not to say</option>
              <option value="1">Solo (1)</option>
              <option value="2-5">2–5</option>
              <option value="6-15">6–15</option>
              <option value="16-30">16–30</option>
              <option value="31+">31+</option>
            </select>
            <p className="mt-1 text-[11px] text-[var(--color-fg-subtle)]">
              Used to compare your numbers against agencies your size.
            </p>
          </Field>

          <Field label="Industry benchmarks">
            <label className="flex cursor-pointer items-center gap-2.5">
              <div
                onClick={() => setBenchmarkOptIn((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition-colors duration-150 ${benchmarkOptIn ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-150 ${benchmarkOptIn ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
              </div>
              <span className="text-[13px] text-[var(--color-fg-muted)]">
                Contribute anonymized metrics to industry benchmarks
              </span>
            </label>
            <p className="mt-1 text-[11px] text-[var(--color-fg-subtle)]">
              Your data is aggregated with other agencies your size — never shared individually.
            </p>
          </Field>
```

- [ ] **Step 6: Run tsc + production build for this surface**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/settings/page.tsx
git commit -m "feat(benchmarks): settings UI — team size + opt-in toggle"
```

---

## Task 8: Profitability page benchmark cards

**Files:**
- Create: `src/app/dashboard/profitability/_components/benchmark-cards.tsx`
- Modify: `src/app/dashboard/profitability/page.tsx`

- [ ] **Step 1: Create `src/app/dashboard/profitability/_components/benchmark-cards.tsx`**

```typescript
'use client';

import { useEffect, useState } from 'react';
import {
  METRIC_LABELS,
  type BenchmarkMetric,
  type UserComparison,
  type TeamSizeBucket,
} from '<npm>/lib/benchmarks/types';

type ApiResp = {
  bucket: TeamSizeBucket | null;
  comparisons: UserComparison[];
};

function fmt(metric: BenchmarkMetric, v: number | null): string {
  if (v === null) return '—';
  switch (metric) {
    case 'median_client_margin_pct':    return `${v.toFixed(0)}%`;
    case 'median_invoice_days_overdue': return `${v.toFixed(0)}d`;
    case 'hours_per_10k_revenue':       return `${v.toFixed(1)}h`;
    case 'active_client_count':         return `${Math.round(v)}`;
  }
}

function positionCopy(c: UserComparison): { text: string; tone: 'good' | 'ok' | 'bad' | 'neutral' } {
  if (c.position === 'no_data') return { text: 'Not enough data yet', tone: 'neutral' };
  if (c.position === 'top_25')   return { text: 'Top 25% for your size', tone: 'good' };
  if (c.position === 'above')    return { text: 'Above median', tone: 'good' };
  if (c.position === 'below')    return { text: 'Below median', tone: 'bad' };
  if (c.position === 'bottom_25') return { text: 'Bottom 25%', tone: 'bad' };
  return { text: '', tone: 'neutral' };
}

function toneClass(tone: 'good' | 'ok' | 'bad' | 'neutral'): string {
  if (tone === 'good')    return 'text-emerald-400';
  if (tone === 'bad')     return 'text-amber-400';
  return 'text-[var(--color-fg-subtle)]';
}

export function BenchmarkCards() {
  const [state, setState] = useState<{ kind: 'loading' } | { kind: 'no_team' } | { kind: 'ok'; data: ApiResp } | { kind: 'err' }>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/benchmarks')
      .then((r) => r.json() as Promise<ApiResp | { error: string }>)
      .then((j) => {
        if (cancelled) return;
        if ('error' in j) { setState({ kind: 'err' }); return; }
        if (!j.bucket)    { setState({ kind: 'no_team' }); return; }
        setState({ kind: 'ok', data: j });
      })
      .catch(() => { if (!cancelled) setState({ kind: 'err' }); });
    return () => { cancelled = true; };
  }, []);

  if (state.kind === 'loading' || state.kind === 'err') return null;

  if (state.kind === 'no_team') {
    return (
      <div className="mb-3.5 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[12.5px] text-[var(--color-fg-muted)]">
        Set your team size in <a href="/dashboard/settings" className="text-[var(--color-primary)] underline">Settings</a> to see how you compare to agencies your size.
      </div>
    );
  }

  const { comparisons, bucket } = state.data;

  return (
    <div className="mb-3.5">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
        How you compare — agencies {bucket}
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {comparisons.map((c) => {
          const pos = positionCopy(c);
          return (
            <div
              key={c.metric}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 shadow-[var(--shadow-xs)]"
            >
              <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-fg-subtle)]">
                {METRIC_LABELS[c.metric]}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[20px] font-semibold text-[var(--color-fg)]">
                  {fmt(c.metric, c.user_value)}
                </span>
                {c.benchmark && (
                  <span className="text-[11px] text-[var(--color-fg-subtle)]">
                    vs {fmt(c.metric, c.benchmark.p50)} median
                  </span>
                )}
              </div>
              <div className={`mt-1 text-[11px] font-medium ${toneClass(pos.tone)}`}>
                {pos.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mount it on the profitability page**

In `src/app/dashboard/profitability/page.tsx`:

Add import at the top:

```typescript
import { BenchmarkCards } from './_components/benchmark-cards';
```

Insert `<BenchmarkCards />` between the page header `<div className="mb-1">…</div>` and the table wrapper `<div className="rounded-…">`:

```tsx
      <div className="mb-1">
        {/* existing h1 + p */}
      </div>

      <BenchmarkCards />

      <div className="rounded-[var(--radius-lg)] border …">
        <ProfitabilityTable state={tableState} />
      </div>
```

- [ ] **Step 3: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/profitability/_components/benchmark-cards.tsx src/app/dashboard/profitability/page.tsx
git commit -m "feat(benchmarks): profitability page benchmark cards"
```

---

## Task 9: Build verify

- [ ] **Step 1: Run production build**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && NODE_OPTIONS="--max-old-space-size=4096" npm run build 2>&1 | tail -25
```

Expected: `✓ Compiled successfully` and the route list includes `/dashboard/profitability`, `/api/dashboard/benchmarks`, `/api/cron/benchmarks`.

- [ ] **Step 2: Spot-check the route list**

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build 2>&1 | grep -E "benchmarks|profitability"
```

Expected: lines for `/api/cron/benchmarks`, `/api/dashboard/benchmarks`, `/dashboard/profitability`.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(benchmarks): Phase 5 — opt-in industry benchmarks across all surfaces" --allow-empty
```

---

## Self-Review

**Spec coverage:**
- ✅ Opt-in anonymized aggregation (Task 4 — `benchmark_opt_in` is checked before any user contributes; sample-size floor of 5 prevents identifying anyone)
- ✅ Margin distribution by agency size — `median_client_margin_pct` bucketed by `team_size_bucket`
- ✅ Average invoice collection time — `median_invoice_days_overdue` from paid Stripe invoices
- ✅ Hours per $10k revenue — `hours_per_10k_revenue`
- ✅ Dashboard tooltip / comparison cards (Task 8)
- ✅ Settings opt-in UX (Task 7)
- ✅ Default-on opt-in (the GET handler returns `benchmark_opt_in !== false`, so missing = true)
- ⛔ Out of scope per scope notes above: quarterly PDF benchmark report, dedicated public `/benchmarks` landing page, agency_type as a secondary bucket. These are not implemented and would be a Phase 5.5 marketing plan.

**Placeholder scan:** None. Every code step contains the actual code an engineer needs.

**Type consistency:**
- `BenchmarkMetric` union appears in `types.ts`, `collect.ts`, `aggregator.ts`, `dashboard/benchmarks/route.ts`, `benchmark-cards.tsx` — all four enumerated values used everywhere.
- `TeamSizeBucket` union: produced by `bucketForTeamSize()` (Task 2), consumed by aggregator (Task 4) and read API (Task 6).
- `Profile.team_size` and `Profile.benchmark_opt_in` are added in Task 5 (`/api/profile`), consumed in Task 7 (settings), and read by the cron aggregator from `user_metadata` in Task 4.
- `UserComparison.position` enum values used in Task 6 (route) match the ones consumed in Task 8 (`benchmark-cards.tsx`).
