import { NextResponse } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import {
  safeExecuteComposioAction,
  isComposioConnected,
} from '<npm>/lib/composio-fetch';
import type {
  StripePerClientData,
  StripeClientRevenue,
  HarvestPerClientData,
  HarvestClientHours,
} from '<npm>/lib/integration-types';
import { computeClientProfitability, type ProfitabilityResult, type ClientProfitability } from '<npm>/lib/profitability';
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier';
import { readAllClients, tryReadNotion, type ClientUpsert } from '<npm>/lib/notion/helpers';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 30;
const CACHE_KEY = (userId: string) => `dash:profitability:${userId}`;
const DEFAULT_BLENDED_RATE = 85;

type ProfitabilityResponse =
  | {
      status: 'ok';
      source: 'notion' | 'composio';
      data: ProfitabilityResult;
      blended_rate_usd: number;
      last_synced_at: string;
      from_cache: boolean;
    }
  | { status: 'not_connected'; missing: ('stripe' | 'harvest')[] }
  | { status: 'upgrade_required'; required_plan: string; required_plan_label: string; required_plan_price: string }
  | { status: 'unavailable'; message: string };

// --- Minimal raw Stripe shapes (only the fields we read) ---
type StripeCustomerRef =
  | string
  | { id?: string; name?: string | null }
  | null
  | undefined;

type StripeInvoice = {
  id: string;
  status?: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void' | null;
  amount_paid?: number;
  due_date?: number | null;
  created?: number;
  customer?: StripeCustomerRef;
};

// --- Minimal raw Harvest shapes ---
type HarvestTimeEntry = {
  hours?: number;
  spent_date?: string; // YYYY-MM-DD
  client?: { name?: string | null } | null;
};

function unwrapList<T>(payload: unknown): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];
  const obj = payload as { data?: unknown; time_entries?: unknown };
  if (Array.isArray(obj.data)) return obj.data as T[];
  if (Array.isArray(obj.time_entries)) return obj.time_entries as T[];
  const nested = (obj.data as { data?: unknown; time_entries?: unknown } | undefined);
  if (nested && Array.isArray(nested.data)) return nested.data as T[];
  if (nested && Array.isArray(nested.time_entries)) return nested.time_entries as T[];
  return [];
}

function unix(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

function customerIdOf(c: StripeCustomerRef): string {
  if (typeof c === 'string') return c;
  if (c && typeof c === 'object' && typeof c.id === 'string') return c.id;
  return 'unknown';
}

function customerNameOf(c: StripeCustomerRef): string {
  if (c && typeof c === 'object' && 'name' in c && typeof c.name === 'string' && c.name) {
    return c.name;
  }
  return 'Unknown';
}

/**
 * Build the per-client Stripe revenue payload from raw invoice rows fetched
 * via Composio. Mirrors the legacy fetchStripePerClientRevenue() shape.
 */
function shapeStripePerClient(invoices: StripeInvoice[]): StripePerClientData {
  const now = new Date();
  const currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const priorStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const priorEnd = new Date(currentStart.getTime() - 1);
  const nowSec = unix(now);
  const currentStartSec = unix(currentStart);
  const priorStartSec = unix(priorStart);
  const priorEndSec = unix(priorEnd);

  const currentByCustomer = new Map<string, { name: string; revenue: number }>();
  const priorByCustomer = new Map<string, number>();
  const overdueByCustomer = new Map<string, number>(); // custId → max days overdue

  for (const inv of invoices) {
    const custId = customerIdOf(inv.customer);
    const custName = customerNameOf(inv.customer);
    const created = typeof inv.created === 'number' ? inv.created : 0;

    if (inv.status === 'paid') {
      if (created >= currentStartSec) {
        const cur = currentByCustomer.get(custId) ?? { name: custName, revenue: 0 };
        cur.revenue += (inv.amount_paid ?? 0) / 100;
        if (cur.name === 'Unknown' && custName !== 'Unknown') cur.name = custName;
        currentByCustomer.set(custId, cur);
      } else if (created >= priorStartSec && created <= priorEndSec) {
        priorByCustomer.set(
          custId,
          (priorByCustomer.get(custId) ?? 0) + (inv.amount_paid ?? 0) / 100,
        );
      }
    }

    if (
      inv.status === 'open' &&
      typeof inv.due_date === 'number' &&
      inv.due_date < nowSec
    ) {
      const days = Math.floor((nowSec - inv.due_date) / 86400);
      overdueByCustomer.set(custId, Math.max(overdueByCustomer.get(custId) ?? 0, days));
    }
  }

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
    const paymentStatus: 'on_time' | 'overdue' | 'unknown' =
      daysOverdue !== null
        ? 'overdue'
        : revenueCurrent > 0 || revenuePrior > 0
          ? 'on_time'
          : 'unknown';
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

function shapeHarvestPerClient(entries: HarvestTimeEntry[]): HarvestPerClientData {
  const now = new Date();
  const currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const priorStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const priorEnd = new Date(currentStart.getTime() - 86400_000);

  const currentStartIso = currentStart.toISOString().slice(0, 10);
  const priorStartIso = priorStart.toISOString().slice(0, 10);
  const priorEndIso = priorEnd.toISOString().slice(0, 10);

  const currentMap = new Map<string, number>();
  const priorMap = new Map<string, number>();

  for (const e of entries) {
    const name = e.client?.name ?? 'No client';
    const hours = Number(e.hours) || 0;
    const date = e.spent_date ?? '';
    if (!date) continue;
    if (date >= currentStartIso) {
      currentMap.set(name, (currentMap.get(name) ?? 0) + hours);
    } else if (date >= priorStartIso && date <= priorEndIso) {
      priorMap.set(name, (priorMap.get(name) ?? 0) + hours);
    }
  }

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

/**
 * Slugify a client name into a stable id for the Notion-sourced path.
 * Notion doesn't expose a Stripe customer id, so we synthesise an id from the
 * normalised client name. Frontend treats this as opaque.
 */
function notionClientId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug ? `notion:${slug}` : `notion:unknown`;
}

/** Map Profitability-Agent margin status → trend bucket for the dashboard widget. */
function trendFromMarginStatus(
  marginStatus: ClientUpsert['marginStatus'],
): ClientProfitability['trend'] {
  if (marginStatus === 'Critical') return 'down';
  if (marginStatus === 'Healthy') return 'up';
  return 'flat';
}

/**
 * Coarse health-score heuristic for the Notion-sourced path. We don't have
 * payment-status / overdue-days from Notion, so we score off marginStatus +
 * margin% only. Mirrors the bands used by computeHealthScore() in
 * src/lib/profitability.ts well enough for the widget's colour bucket.
 */
function notionHealthScore(client: ClientUpsert): number {
  const marginPct = client.actualMarginPct ?? 0;
  // Margin component (up to 35)
  let margin = 0;
  if (marginPct >= 30) margin = 35;
  else if (marginPct >= 20) margin = 28;
  else if (marginPct >= 10) margin = 18;
  else if (marginPct >= 0) margin = 8;

  // Status-driven component (up to 65 — replaces payment + trend since we
  // don't have those from Notion).
  let statusScore = 30; // default — unknown marginStatus
  if (client.marginStatus === 'Healthy') statusScore = 65;
  else if (client.marginStatus === 'Warning') statusScore = 40;
  else if (client.marginStatus === 'Critical') statusScore = 10;

  return margin + statusScore;
}

/**
 * Reshape the Profitability-Agent-written Notion Clients DB rows into the
 * same ProfitabilityResult shape the Composio path produces. Notion is the
 * source of truth when present (agent runs weekly), so prior-month / payment
 * fields not stored in Notion are defaulted to 0 / null / 'unknown'.
 */
function reshapeNotionToProfitability(
  notionClients: ClientUpsert[],
  blendedRateUsd: number,
): ProfitabilityResult {
  const clients: ClientProfitability[] = notionClients.map((c) => {
    const hoursMtd = c.avgHoursLogged ?? 0;
    const marginPct = c.actualMarginPct ?? 0;
    const trend = trendFromMarginStatus(c.marginStatus);
    return {
      id: notionClientId(c.name),
      name: c.name,
      revenue_mtd: c.monthlyRetainer ?? 0,
      revenue_prior: 0,                  // Notion doesn't store prior-month revenue
      hours_mtd: hoursMtd,
      hours_prior: 0,                    // Notion doesn't store prior-month hours
      blended_rate_usd: blendedRateUsd,
      cost_mtd: hoursMtd * blendedRateUsd,
      margin_pct: marginPct,
      margin_prior_pct: null,            // Notion doesn't store prior-month margin
      trend,
      health_score: notionHealthScore(c),
      payment_status: 'unknown',         // Not tracked in Notion Clients DB
      days_overdue: null,                // Not tracked in Notion Clients DB
      stripe_customer_id: null,          // Notion is name-keyed, not Stripe-keyed
      matched: true,                     // By definition — the agent wrote it
    };
  });

  // Same ordering as the Composio path: worst margin first.
  clients.sort((a, b) => a.margin_pct - b.margin_pct);

  return {
    clients,
    unmatched_stripe: [],
    unmatched_harvest: [],
  };
}

export async function GET(): Promise<NextResponse<ProfitabilityResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  const sessionSupabase = await getSessionSupabaseClient();
  const { data: userData } = await sessionSupabase.auth.getUser();
  const meta = (userData?.user?.user_metadata ?? {}) as Record<string, unknown>;

  const plan = getUserPlan(meta);
  if (!canAccess(plan, 'profitability')) {
    return NextResponse.json(upgradeRequiredBody('growth'), { status: 402 });
  }

  const blendedRate = typeof meta.blended_hourly_rate_usd === 'number'
    ? meta.blended_hourly_rate_usd
    : DEFAULT_BLENDED_RATE;

  // ----- 1. Notion-first ----------------------------------------------------
  // The Profitability Agent writes per-client margin analysis to the customer's
  // Notion Clients DB on Sundays. If that data is present we serve it directly
  // — it's authoritative, the source of cross-agent reasoning, and avoids
  // hitting Composio at all. tryReadNotion() swallows the "not connected" /
  // "not provisioned" cases and returns null so we transparently fall through.
  try {
    const notionClients = await tryReadNotion(() => readAllClients(userId));
    if (notionClients && notionClients.length > 0) {
      const data = reshapeNotionToProfitability(notionClients, blendedRate);
      return NextResponse.json({
        status: 'ok',
        source: 'notion',
        data,
        blended_rate_usd: blendedRate,
        last_synced_at: new Date().toISOString(),
        from_cache: false,
      });
    }
  } catch (err) {
    // Genuine Notion error (transient 5xx, malformed token, etc.) — log and
    // fall through to Composio so the widget stays useful.
    console.warn('[profitability] notion read failed, falling back to composio:', err);
  }

  // ----- 2. Composio live fallback (unchanged from pre-Notion behaviour) ----
  // Connection presence check: route preserves legacy behaviour where if BOTH
  // are missing we surface `not_connected` with the missing array; if one is
  // connected we still try to compute partial profitability.
  const [stripeConnected, harvestConnected] = await Promise.all([
    isComposioConnected(userId, 'stripe'),
    isComposioConnected(userId, 'harvest'),
  ]);

  const missing: ('stripe' | 'harvest')[] = [];
  if (!stripeConnected) missing.push('stripe');
  if (!harvestConnected) missing.push('harvest');

  if (missing.length === 2) {
    return NextResponse.json({ status: 'not_connected', missing });
  }

  const redis = (() => { try { return Redis.fromEnv(); } catch { return null; } })();
  if (redis && missing.length === 0) {
    const cached = await redis.get<ProfitabilityResponse>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  try {
    let stripeData: StripePerClientData = { clients: [], currency: 'USD' };
    let harvestData: HarvestPerClientData = { clients: [] };

    if (stripeConnected) {
      // TODO(composio-slug): verify STRIPE_LIST_INVOICES action slug + that the
      // `created.gte=priorMonthStart` filter is honoured. We currently pull a
      // single page (limit 100) which matches the legacy adapter.
      const now = new Date();
      const priorStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const invoicesPayload = await safeExecuteComposioAction<unknown>(
        userId,
        'stripe',
        'STRIPE_LIST_INVOICES',
        { limit: 100, created: { gte: unix(priorStart) } },
      );
      const invoices = unwrapList<StripeInvoice>(invoicesPayload);
      stripeData = shapeStripePerClient(invoices);
    }

    if (harvestConnected) {
      // TODO(composio-slug): verify HARVEST_LIST_TIME_ENTRIES action slug + the
      // `from`/`to` parameter names. Pulling from the prior month start through
      // today so we can split current vs prior in-memory.
      const now = new Date();
      const priorStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const entriesPayload = await safeExecuteComposioAction<unknown>(
        userId,
        'harvest',
        'HARVEST_LIST_TIME_ENTRIES',
        { from: fmt(priorStart), to: fmt(now), per_page: 100 },
      );
      const entries = unwrapList<HarvestTimeEntry>(entriesPayload);
      harvestData = shapeHarvestPerClient(entries);
    }

    const data = computeClientProfitability(stripeData, harvestData, blendedRate);
    const lastSyncedAt = new Date().toISOString();

    const payload: ProfitabilityResponse = {
      status: 'ok',
      source: 'composio',
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
