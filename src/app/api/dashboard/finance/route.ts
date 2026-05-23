import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import {
  safeExecuteComposioAction,
  ComposioExecuteError,
} from '<npm>/lib/composio-fetch';
import type {
  StripeFinanceData,
  StripeInvoiceRow,
  StripeRecentCharge,
} from '<npm>/lib/integration-types';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const STALE_TTL_SECONDS = 24 * 60 * 60;
const CACHE_KEY = (userId: string) => `dash:finance:${userId}`;
const STALE_KEY = (userId: string) => `dash:finance:${userId}:stale`;

type FinanceResponse =
  | { status: 'ok'; data: StripeFinanceData; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected' }
  | { status: 'requires_reconnect' }
  | { status: 'unavailable'; message: string };

// --- Stripe raw payload shapes (only the fields we read) ---
type StripeCustomerRef =
  | string
  | { id?: string; name?: string | null }
  | null
  | undefined;

type StripeInvoice = {
  id: string;
  status?: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void' | null;
  amount_due?: number;
  amount_paid?: number;
  amount_remaining?: number;
  due_date?: number | null;
  created?: number;
  customer?: StripeCustomerRef;
};

type StripeCharge = {
  id: string;
  status?: 'succeeded' | 'pending' | 'failed';
  amount?: number;
  created: number;
  billing_details?: { name?: string | null } | null;
};

type StripeListResponse<T> = {
  object?: 'list';
  data?: T[];
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
function dayKey(sec: number): string {
  return new Date(sec * 1000).toISOString().slice(0, 10);
}

function customerName(c: StripeCustomerRef): string {
  if (c && typeof c === 'object' && 'name' in c && typeof c.name === 'string' && c.name) {
    return c.name;
  }
  return 'Unknown';
}

function unwrapList<T>(payload: unknown): T[] {
  if (!payload) return [];
  // Composio sometimes returns the raw list, sometimes nests it under `data`.
  if (Array.isArray(payload)) return payload as T[];
  const obj = payload as StripeListResponse<T> & { data?: unknown };
  if (Array.isArray(obj.data)) return obj.data as T[];
  // Some Composio actions wrap once more: { data: { data: [...] } }
  const nested = (obj.data as StripeListResponse<T> | undefined)?.data;
  if (Array.isArray(nested)) return nested;
  return [];
}

function emptyFinanceData(): StripeFinanceData {
  const now = new Date();
  const buckets: Record<string, number> = {};
  for (let i = 0; i < 30; i++) buckets[dayKey(unix(subDays(now, i)))] = 0;
  const sparkline = Object.entries(buckets)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, amount]) => ({ date, amount }));
  return {
    invoiced: 0,
    paid: 0,
    overdue: 0,
    sparkline,
    currency: 'USD',
    rows: [],
    recent_charges: [],
  };
}

function shapeFinanceData(
  invoices: StripeInvoice[],
  charges: StripeCharge[],
): StripeFinanceData {
  const now = new Date();
  const monthStart = startOfMonthUtc(now);
  const monthStartSec = unix(monthStart);
  const nowSec = unix(now);

  const INVOICED_STATUSES = new Set(['open', 'paid', 'uncollectible']);

  // Restrict invoice math to MTD by created date (matches legacy adapter's
  // server-side `created.gte` filter).
  const mtdInvoices = invoices.filter(
    (inv) => typeof inv.created === 'number' && inv.created >= monthStartSec,
  );

  const invoiced =
    mtdInvoices
      .filter((inv) => inv.status != null && INVOICED_STATUSES.has(inv.status))
      .reduce((s, inv) => s + (inv.amount_due ?? 0), 0) / 100;
  const paid =
    mtdInvoices
      .filter((inv) => inv.status === 'paid')
      .reduce((s, inv) => s + (inv.amount_paid ?? 0), 0) / 100;

  // Overdue: any open invoice across the fetched window whose due_date is past.
  const overdueInvoices = invoices.filter(
    (inv) =>
      inv.status === 'open' &&
      typeof inv.due_date === 'number' &&
      inv.due_date < nowSec,
  );
  const overdue =
    overdueInvoices.reduce((s, inv) => s + (inv.amount_remaining ?? 0), 0) / 100;

  const buckets: Record<string, number> = {};
  for (let i = 0; i < 30; i++) buckets[dayKey(unix(subDays(now, i)))] = 0;
  for (const ch of charges) {
    if (ch.status !== 'succeeded') continue;
    const k = dayKey(ch.created);
    if (k in buckets) buckets[k] += (ch.amount ?? 0) / 100;
  }
  const sparkline = Object.entries(buckets)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, amount]) => ({ date, amount }));

  const rows: StripeInvoiceRow[] = overdueInvoices
    .map((inv) => {
      const dueDate = inv.due_date!;
      const daysOverdue = Math.floor((nowSec - dueDate) / 86400);
      return {
        id: inv.id,
        customer_name: customerName(inv.customer),
        amount: (inv.amount_remaining ?? 0) / 100,
        due_date: new Date(dueDate * 1000).toISOString().slice(0, 10),
        days_overdue: daysOverdue,
      };
    })
    .sort((a, b) => b.days_overdue - a.days_overdue)
    .slice(0, 5);

  const recent_charges: StripeRecentCharge[] = charges
    .filter((ch) => ch.status === 'succeeded')
    .slice(0, 5)
    .map((ch) => ({
      id: ch.id,
      customer_name:
        typeof ch.billing_details?.name === 'string' ? ch.billing_details.name : null,
      amount: (ch.amount ?? 0) / 100,
      timestamp: new Date(ch.created * 1000).toISOString(),
    }));

  return { invoiced, paid, overdue, sparkline, currency: 'USD', rows, recent_charges };
}

export async function GET(_req: NextRequest): Promise<NextResponse<FinanceResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
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

  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);

  let data: StripeFinanceData;
  try {
    // TODO(composio-slug): verify STRIPE_LIST_INVOICES / STRIPE_LIST_CHARGES action slugs.
    const invoicesPayload = await safeExecuteComposioAction<unknown>(
      userId,
      'stripe',
      'STRIPE_LIST_INVOICES',
      { limit: 100 },
    );

    // Not connected → empty state.
    if (invoicesPayload === null) {
      return NextResponse.json({ status: 'not_connected' });
    }

    const chargesPayload = await safeExecuteComposioAction<unknown>(
      userId,
      'stripe',
      'STRIPE_LIST_CHARGES',
      { created: { gte: unix(thirtyDaysAgo) }, limit: 100 },
    );

    const invoices = unwrapList<StripeInvoice>(invoicesPayload);
    const charges = unwrapList<StripeCharge>(chargesPayload);

    data = shapeFinanceData(invoices, charges);
  } catch (err) {
    console.error('[finance] composio fetch failed:', err);
    if (redis) {
      const stale = await redis.get<FinanceResponse>(STALE_KEY(userId));
      if (stale && stale.status === 'ok') {
        return NextResponse.json({ ...stale, from_cache: true });
      }
    }
    // If Composio surfaced an execution error (e.g. revoked OAuth), tell the
    // dashboard to render the reconnect prompt rather than a hard failure.
    if (err instanceof ComposioExecuteError) {
      return NextResponse.json({ status: 'requires_reconnect' });
    }
    return NextResponse.json({
      status: 'unavailable',
      message: err instanceof Error ? err.message : 'fetch_failed',
    });
  }

  // Defensive: if both Composio calls returned empty payloads we still hand
  // back ok-with-zeros so the widget renders cleanly. (emptyFinanceData kept
  // available for future paths where we want an explicit empty render.)
  void emptyFinanceData;

  const lastSyncedAt = new Date().toISOString();
  const payload: FinanceResponse = {
    status: 'ok',
    data,
    last_synced_at: lastSyncedAt,
    from_cache: false,
  };
  if (redis) {
    await Promise.all([
      redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS }),
      redis.set(STALE_KEY(userId), payload, { ex: STALE_TTL_SECONDS }),
    ]);
  }
  return NextResponse.json(payload);
}
