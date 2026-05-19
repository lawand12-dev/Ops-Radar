// Side-by-side alerts feed across all FO-managed agencies.
// Aggregates the same signals the threshold-alerts cron detects per single tenant,
// but loops across every managed agency the FO owns.
// Gated to FO plan.
import { NextResponse } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { fetchStripePerClientRevenue } from '<npm>/lib/integrations/stripe/profitability-adapter';
import { fetchHarvestPerClientHours } from '<npm>/lib/integrations/harvest/profitability-adapter';
import { computeClientProfitability } from '<npm>/lib/profitability';
import { fetchClickupProjectBudgets } from '<npm>/lib/integrations/clickup/scope-adapter';
import { fetchHarvestMonthlyProjectHours } from '<npm>/lib/integrations/harvest/adapter';
import { computeScopeCreep } from '<npm>/lib/scope-creep';
import type { FoIntegrationRow } from '<npm>/lib/fo';

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

  const { data: integrationRows } = await supabase
    .from('fo_integrations')
    .select('id, fo_client_id, fo_user_id, tool, encrypted_token, iv, auth_tag, status')
    .eq('fo_user_id', userId)
    .eq('status', 'connected');

  const integrationsByClient = new Map<string, FoIntegrationRow[]>();
  for (const row of (integrationRows ?? []) as FoIntegrationRow[]) {
    const existing = integrationsByClient.get(row.fo_client_id) ?? [];
    existing.push(row);
    integrationsByClient.set(row.fo_client_id, existing);
  }

  const alerts: FoAlert[] = [];

  for (const client of clients) {
    const ints = integrationsByClient.get(client.id) ?? [];
    const getKey = (tool: string): string | null => {
      const row = ints.find((r) => r.tool === tool);
      if (!row) return null;
      try { return decryptApiKey(row); } catch { return null; }
    };

    const stripeKey = getKey('stripe');
    const harvestKey = getKey('harvest');
    const clickupKey = getKey('clickup');

    // ── Profitability-derived alerts ──────────────────────────────────────
    if (stripeKey && harvestKey) {
      try {
        const [stripeData, harvestData] = await Promise.all([
          fetchStripePerClientRevenue(stripeKey),
          fetchHarvestPerClientHours(harvestKey),
        ]);
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
      } catch (err) {
        console.warn('[fo/alerts] profitability failed for', client.id, err);
      }
    }

    // ── Scope-derived alerts ──────────────────────────────────────────────
    if (clickupKey && harvestKey) {
      try {
        const [clickupData, harvestMonthly] = await Promise.all([
          fetchClickupProjectBudgets(clickupKey),
          fetchHarvestMonthlyProjectHours(harvestKey),
        ]);
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
