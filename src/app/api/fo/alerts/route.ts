// Side-by-side alerts feed across all FO-managed agencies.
// Aggregates the same signals the threshold-alerts cron detects per single tenant,
// but loops across every managed agency the FO owns.
// Gated to FO plan.
//
// Composio migration note (2026-05-23):
//   The legacy implementation pulled per-managed-client API keys from
//   `fo_integrations` and called adapter functions directly. Composio's
//   connection model is keyed on (user_id, tool_slug) — `composio_connections`
//   does not have a column for fo_client_id, and managed agencies (rows in
//   `fo_clients`) are NOT independent Supabase users with their own auth
//   identity, just records owned by the FO operator.
//
//   Until per-managed-client Composio connections are designed, this route
//   uses the FO operator's own Composio connections (`userId`) for each
//   managed client and gracefully skips any tool the FO operator has not
//   connected. Per-managed-client data fidelity will be restored once the
//   FO ↔ Composio connection model is reworked.
import { NextResponse } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier';
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

type FoAlertSeverity = 'critical' | 'warning' | 'info';
type FoAlertKind =
  | 'negative_margin'
  | 'invoice_overdue'
  | 'scope_over_budget'
  | 'scope_at_risk';

type FoAlert = {
  id: string;
  fo_client_id: string;
  agency_name: string;
  kind: FoAlertKind;
  severity: FoAlertSeverity;
  entity_name: string; // client name or project name
  detail: string;
  value: number | null;
};

const SEVERITY_RANK: Record<FoAlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function fmtMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

// --- Raw payload shapes (only fields we read) ---
type StripeInvoice = {
  status?: string;
  amount_paid?: number;      // cents
  amount_remaining?: number; // cents
  due_date?: number;         // unix seconds
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

// --- Composio-backed fetchers (keyed on the FO operator's userId) ---

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
      // Keep the largest days_overdue across this customer's invoices.
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

  const { data: clientRows } = await supabase
    .from('fo_clients')
    .select('id, agency_name')
    .eq('fo_user_id', userId);

  const clients = (clientRows ?? []) as Array<{ id: string; agency_name: string }>;
  if (clients.length === 0) {
    return NextResponse.json({ alerts: [], counts: { critical: 0, warning: 0, info: 0 } });
  }

  // Composio connection presence is keyed on (user_id, tool_slug); fetch once
  // for the FO operator and reuse the result across every managed client.
  // When per-managed-client Composio is added, look these up per fo_client.
  const [stripeConnected, harvestConnected, clickupConnected] = await Promise.all([
    isComposioConnected(userId, 'stripe'),
    isComposioConnected(userId, 'harvest'),
    isComposioConnected(userId, 'clickup'),
  ]);

  const alerts: FoAlert[] = [];

  for (const client of clients) {
    // ── Profitability-derived alerts ──────────────────────────────────────
    if (stripeConnected && harvestConnected) {
      try {
        const [stripeData, harvestData] = await Promise.all([
          fetchStripePerClientViaComposio(userId),
          fetchHarvestPerClientViaComposio(userId),
        ]);
        if (stripeData && harvestData) {
          const result = computeClientProfitability(stripeData, harvestData, blendedRate);
          for (const c of result.clients) {
            if (c.hours_mtd > 0 && c.margin_pct < 0) {
              alerts.push({
                id: `${client.id}-margin-${c.id}`,
                fo_client_id: client.id,
                agency_name: client.agency_name,
                kind: 'negative_margin',
                severity: 'critical',
                entity_name: c.name,
                detail: `${Math.round(c.margin_pct)}% margin · losing ${fmtMoney(Math.abs(c.cost_mtd - c.revenue_mtd))}`,
                value: c.margin_pct,
              });
            }
            if (c.payment_status === 'overdue' && (c.days_overdue ?? 0) >= 30 && c.revenue_mtd > 1000) {
              alerts.push({
                id: `${client.id}-overdue-${c.id}`,
                fo_client_id: client.id,
                agency_name: client.agency_name,
                kind: 'invoice_overdue',
                severity: 'critical',
                entity_name: c.name,
                detail: `${c.days_overdue} days overdue · ${fmtMoney(c.revenue_mtd)}`,
                value: c.days_overdue ?? null,
              });
            }
          }
        }
      } catch (err) {
        console.warn('[fo/alerts] profitability failed for', client.id, err);
      }
    }

    // ── Scope-derived alerts ──────────────────────────────────────────────
    if (clickupConnected && harvestConnected) {
      try {
        const [clickupData, harvestMonthly] = await Promise.all([
          fetchClickupScopeViaComposio(userId),
          fetchHarvestMonthlyViaComposio(userId),
        ]);
        if (clickupData && harvestMonthly) {
          const scopeResult = computeScopeCreep(clickupData, harvestMonthly);
          for (const p of scopeResult.projects) {
            if (p.status === 'on_track') continue;
            const isOver = p.status === 'over_budget';
            alerts.push({
              id: `${client.id}-scope-${p.project_name}`,
              fo_client_id: client.id,
              agency_name: client.agency_name,
              kind: isOver ? 'scope_over_budget' : 'scope_at_risk',
              severity: isOver ? 'critical' : 'warning',
              entity_name: p.project_name,
              detail: `${p.burn_pct}% of budget used · ${p.logged_hours}h logged`,
              value: p.burn_pct,
            });
          }
        }
      } catch (err) {
        console.warn('[fo/alerts] scope failed for', client.id, err);
      }
    }
  }

  // Sort: critical first, then by agency name for stable display
  alerts.sort((a, b) => {
    const rankDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (rankDiff !== 0) return rankDiff;
    return a.agency_name.localeCompare(b.agency_name);
  });

  const counts = {
    critical: alerts.filter((a) => a.severity === 'critical').length,
    warning: alerts.filter((a) => a.severity === 'warning').length,
    info: alerts.filter((a) => a.severity === 'info').length,
  };

  return NextResponse.json({ alerts, counts });
}
