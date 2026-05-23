// FO aggregate dashboard: runs profitability + scope computation per managed agency.
// Branch: main / Supabase.
//
// Composio migration note (2026-05-23):
//   Replaces the legacy `fo_integrations` + decryptApiKey + adapter pipeline.
//   `composio_connections` is keyed on (user_id, tool_slug) and rows in
//   `fo_clients` do NOT have their own Supabase auth identity — they are
//   records owned by the FO operator. Until a per-managed-client Composio
//   connection model exists, this route uses the FO operator's own
//   connections for every managed client and gracefully skips any tool the
//   FO operator has not connected. Per-managed-client data fidelity will
//   require a follow-up to extend `composio_connections` (or add a sister
//   table) with an `fo_client_id` column.
import { NextResponse } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier';
import {
  type FoClient,
  type FoClientHealth,
  type FoDashboardResponse,
} from '<npm>/lib/fo';
import {
  isComposioConnected,
  safeExecuteComposioAction,
} from '<npm>/lib/composio-fetch';
import type {
  StripePerClientData,
  StripeClientRevenue,
  HarvestPerClientData,
  HarvestClientHours,
  ClickupScopeData,
  HarvestMonthlyProjectData,
} from '<npm>/lib/integration-types';
import { computeClientProfitability } from '<npm>/lib/profitability';
import { computeScopeCreep } from '<npm>/lib/scope-creep';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const DEFAULT_BLENDED_RATE = 85;

// --- Raw payload shapes (only fields we read) ---
type StripeInvoice = {
  status?: string;
  amount_paid?: number;
  amount_remaining?: number;
  due_date?: number;
  customer?: string | { id?: string; name?: string };
  created?: number;
};

type HarvestTimeEntry = {
  hours?: number;
  client?: { id?: number | string; name?: string } | null;
  spent_date?: string;
};

type ClickupScopeTask = {
  time_estimate?: number | null;
  list?: { name?: string } | null;
};

type HarvestMonthlyEntry = {
  hours?: number;
  project?: { name?: string } | null;
};

function unwrapList<T>(payload: unknown, key?: string): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];
  const obj = payload as Record<string, unknown>;
  if (key && Array.isArray(obj[key])) return obj[key] as T[];
  if (Array.isArray(obj.data)) return obj.data as T[];
  const nested = obj.data as Record<string, unknown> | undefined;
  if (nested) {
    if (key && Array.isArray(nested[key])) return nested[key] as T[];
    if (Array.isArray(nested.data)) return nested.data as T[];
  }
  return [];
}

async function fetchStripePerClientViaComposio(
  userId: string,
): Promise<StripePerClientData | null> {
  // TODO(composio-slug): verify STRIPE_LIST_INVOICES slug.
  const payload = await safeExecuteComposioAction<unknown>(
    userId,
    'stripe',
    'STRIPE_LIST_INVOICES',
    { limit: 100 },
  );
  if (payload === null) return null;
  const invoices = unwrapList<StripeInvoice>(payload);

  const now = Math.floor(Date.now() / 1000);
  const monthStart = Math.floor(
    new Date(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1).getTime() / 1000,
  );

  const byClient = new Map<string, StripeClientRevenue>();
  for (const inv of invoices) {
    const custId =
      typeof inv.customer === 'string'
        ? inv.customer
        : inv.customer?.id ?? 'unknown';
    const custName =
      typeof inv.customer === 'object' && inv.customer?.name
        ? inv.customer.name
        : 'Unknown';

    const isCurrent = (inv.created ?? 0) >= monthStart;
    const paid = (inv.amount_paid ?? 0) / 100;
    const overdue = !!(inv.due_date && inv.due_date < now && inv.status !== 'paid');
    const daysOverdue = overdue && inv.due_date
      ? Math.floor((now - inv.due_date) / 86_400)
      : null;

    const existing: StripeClientRevenue =
      byClient.get(custId) ?? {
        id: custId,
        name: custName,
        revenue_current: 0,
        revenue_prior: 0,
        payment_status: 'on_time',
        days_overdue: null,
      };
    if (isCurrent) existing.revenue_current += paid;
    else existing.revenue_prior += paid;
    if (overdue) {
      existing.payment_status = 'overdue';
      if (daysOverdue !== null && (existing.days_overdue ?? 0) < daysOverdue) {
        existing.days_overdue = daysOverdue;
      }
    }
    byClient.set(custId, existing);
  }

  return { clients: Array.from(byClient.values()), currency: 'USD' };
}

async function fetchHarvestPerClientViaComposio(
  userId: string,
): Promise<HarvestPerClientData | null> {
  const now = new Date();
  const monthStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const priorStart = new Date(now.getUTCFullYear(), now.getUTCMonth() - 1, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  // TODO(composio-slug): verify HARVEST_LIST_TIME_ENTRIES slug.
  const payload = await safeExecuteComposioAction<unknown>(
    userId,
    'harvest',
    'HARVEST_LIST_TIME_ENTRIES',
    { from: fmt(priorStart), to: fmt(now), per_page: 100 },
  );
  if (payload === null) return null;
  const entries = unwrapList<HarvestTimeEntry>(payload, 'time_entries');

  const byClient = new Map<string, HarvestClientHours>();
  for (const e of entries) {
    const id = String(e.client?.id ?? 'unknown');
    const name = e.client?.name ?? 'Unknown';
    const isCurrent = e.spent_date ? new Date(e.spent_date) >= monthStart : false;
    const row = byClient.get(id) ?? { id, name, hours_current: 0, hours_prior: 0 };
    if (isCurrent) row.hours_current += e.hours ?? 0;
    else row.hours_prior += e.hours ?? 0;
    byClient.set(id, row);
  }

  return { clients: Array.from(byClient.values()) };
}

function shapeClickupScope(tasks: ClickupScopeTask[]): ClickupScopeData {
  const budgetMap = new Map<string, number>();
  for (const task of tasks) {
    const name = task.list?.name ?? 'No project';
    const estimateMs = typeof task.time_estimate === 'number' ? task.time_estimate : 0;
    budgetMap.set(name, (budgetMap.get(name) ?? 0) + estimateMs / 3_600_000);
  }
  const projects = [...budgetMap.entries()]
    .filter(([, hours]) => hours > 0)
    .map(([project_name, hours]) => ({
      project_name,
      estimated_hours: Math.round(hours * 10) / 10,
    }))
    .sort((a, b) => b.estimated_hours - a.estimated_hours);
  return { projects };
}

async function fetchClickupScopeViaComposio(
  userId: string,
): Promise<ClickupScopeData | null> {
  // TODO(composio-slug): verify CLICKUP_LIST_SPACES / CLICKUP_LIST_TASKS slugs.
  const spacesPayload = await safeExecuteComposioAction<unknown>(
    userId,
    'clickup',
    'CLICKUP_LIST_SPACES',
  );
  if (spacesPayload === null) return null;
  const spaces = unwrapList<{ team_id?: string; id?: string }>(spacesPayload, 'spaces');
  const teamId = spaces.find((s) => typeof s.team_id === 'string')?.team_id;

  const tasksPayload = await safeExecuteComposioAction<unknown>(
    userId,
    'clickup',
    'CLICKUP_LIST_TASKS',
    {
      team_id: teamId,
      include_closed: true,
      subtasks: true,
      archived: false,
      per_page: 100,
    },
  );
  const tasks = unwrapList<ClickupScopeTask>(tasksPayload, 'tasks');
  return shapeClickupScope(tasks);
}

function shapeHarvestMonthly(entries: HarvestMonthlyEntry[]): HarvestMonthlyProjectData {
  const projectMap = new Map<string, number>();
  for (const e of entries) {
    const name = e.project?.name ?? 'No project';
    projectMap.set(name, (projectMap.get(name) ?? 0) + (Number(e.hours) || 0));
  }
  const projects = [...projectMap.entries()]
    .map(([project_name, hours]) => ({
      project_name,
      hours: Math.round(hours * 10) / 10,
    }))
    .sort((a, b) => b.hours - a.hours);
  return { projects };
}

async function fetchHarvestMonthlyViaComposio(
  userId: string,
): Promise<HarvestMonthlyProjectData | null> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  // TODO(composio-slug): verify HARVEST_LIST_TIME_ENTRIES slug.
  const payload = await safeExecuteComposioAction<unknown>(
    userId,
    'harvest',
    'HARVEST_LIST_TIME_ENTRIES',
    {
      from: monthStart.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
      per_page: 100,
    },
  );
  if (payload === null) return null;
  const entries = unwrapList<HarvestMonthlyEntry>(payload, 'time_entries');
  return shapeHarvestMonthly(entries);
}

export async function GET(): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const session = await getSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const plan = getUserPlan(meta);
  if (!canAccess(plan, 'fo_dashboard')) {
    return NextResponse.json(upgradeRequiredBody('fo'), { status: 402 });
  }

  const blendedRate = typeof meta.blended_hourly_rate_usd === 'number'
    ? meta.blended_hourly_rate_usd
    : DEFAULT_BLENDED_RATE;

  const supabase = getServerSupabaseClient();

  const { data: clientRows, error: clientsErr } = await supabase
    .from('fo_clients')
    .select('id, agency_name, team_size, notes, created_at')
    .eq('fo_user_id', userId)
    .order('agency_name');

  if (clientsErr) {
    console.error('[fo/dashboard] clients lookup failed:', clientsErr.message);
    return NextResponse.json({ error: clientsErr.message }, { status: 500 });
  }

  const clients: FoClient[] = (clientRows ?? []) as FoClient[];
  if (clients.length === 0) {
    const empty: FoDashboardResponse = {
      clients: [],
      total_revenue_mtd: 0,
      total_at_risk: 0,
      computed_at: new Date().toISOString(),
    };
    return NextResponse.json(empty);
  }

  // Composio connection presence is keyed on (user_id, tool_slug); resolve
  // once for the FO operator and reuse across every managed client.
  const [stripeConnected, harvestConnected, clickupConnected] = await Promise.all([
    isComposioConnected(userId, 'stripe'),
    isComposioConnected(userId, 'harvest'),
    isComposioConnected(userId, 'clickup'),
  ]);

  const integrationsConnected: string[] = [];
  if (stripeConnected) integrationsConnected.push('stripe');
  if (harvestConnected) integrationsConnected.push('harvest');
  if (clickupConnected) integrationsConnected.push('clickup');

  const computedAt = new Date().toISOString();

  const healthCards: FoClientHealth[] = await Promise.all(
    clients.map(async (client): Promise<FoClientHealth> => {
      const fetchErrors: string[] = [];

      let marginPct: number | null = null;
      let totalRevenueMtd: number | null = null;
      let totalCostMtd: number | null = null;
      let atRiskProjects = 0;

      // Profitability requires both Stripe and Harvest
      if (stripeConnected && harvestConnected) {
        try {
          const [stripeData, harvestData] = await Promise.all([
            fetchStripePerClientViaComposio(userId),
            fetchHarvestPerClientViaComposio(userId),
          ]);
          if (stripeData && harvestData) {
            const result = computeClientProfitability(stripeData, harvestData, blendedRate);
            if (result.clients.length > 0) {
              totalRevenueMtd = result.clients.reduce((s, c) => s + c.revenue_mtd, 0);
              totalCostMtd = result.clients.reduce((s, c) => s + c.cost_mtd, 0);
              marginPct = totalRevenueMtd > 0
                ? Math.round(((totalRevenueMtd - totalCostMtd) / totalRevenueMtd) * 100)
                : null;
            }
          }
        } catch (e) {
          fetchErrors.push('profitability_fetch_failed');
          console.error('[fo/dashboard] profitability failed for', client.id, e);
        }
      }

      // Scope creep requires both ClickUp and Harvest
      if (clickupConnected && harvestConnected) {
        try {
          const [clickupData, harvestMonthly] = await Promise.all([
            fetchClickupScopeViaComposio(userId),
            fetchHarvestMonthlyViaComposio(userId),
          ]);
          if (clickupData && harvestMonthly) {
            const scopeResult = computeScopeCreep(clickupData, harvestMonthly);
            atRiskProjects = scopeResult.projects.filter(
              (p) => p.status === 'at_risk' || p.status === 'over_budget',
            ).length;
          }
        } catch (e) {
          fetchErrors.push('scope_fetch_failed');
          console.error('[fo/dashboard] scope failed for', client.id, e);
        }
      }

      return {
        client,
        margin_pct: marginPct,
        total_revenue_mtd: totalRevenueMtd,
        total_cost_mtd: totalCostMtd,
        at_risk_projects: atRiskProjects,
        integrations_connected: integrationsConnected,
        computed_at: computedAt,
        fetch_errors: fetchErrors,
      };
    }),
  );

  const totalRevenue = healthCards.reduce((s, h) => s + (h.total_revenue_mtd ?? 0), 0);
  const totalAtRisk = healthCards.reduce((s, h) => s + h.at_risk_projects, 0);

  const payload: FoDashboardResponse = {
    clients: healthCards,
    total_revenue_mtd: totalRevenue,
    total_at_risk: totalAtRisk,
    computed_at: computedAt,
  };

  return NextResponse.json(payload);
}
