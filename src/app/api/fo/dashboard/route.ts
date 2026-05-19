// FO aggregate dashboard: runs profitability + scope computation per managed agency.
// Branch: main / Supabase. Reuses the same adapters as single-tenant Growth/Pro routes.
import { NextResponse } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import {
  type FoClient,
  type FoClientHealth,
  type FoDashboardResponse,
  type FoIntegrationRow,
} from '<npm>/lib/fo';
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

  const { data: integrationRows, error: intsErr } = await supabase
    .from('fo_integrations')
    .select('id, fo_client_id, fo_user_id, tool, encrypted_token, iv, auth_tag, status')
    .eq('fo_user_id', userId)
    .eq('status', 'connected');

  if (intsErr) {
    console.error('[fo/dashboard] integrations lookup failed:', intsErr.message);
    return NextResponse.json({ error: intsErr.message }, { status: 500 });
  }

  const integrationsByClient = new Map<string, FoIntegrationRow[]>();
  for (const row of (integrationRows ?? []) as FoIntegrationRow[]) {
    const existing = integrationsByClient.get(row.fo_client_id) ?? [];
    existing.push(row);
    integrationsByClient.set(row.fo_client_id, existing);
  }

  const computedAt = new Date().toISOString();

  const healthCards: FoClientHealth[] = await Promise.all(
    clients.map(async (client): Promise<FoClientHealth> => {
      const integrations = integrationsByClient.get(client.id) ?? [];
      const integrationsConnected = integrations.map((r) => r.tool);
      const fetchErrors: string[] = [];

      const getKey = (tool: string): string | null => {
        const row = integrations.find((r) => r.tool === tool);
        if (!row) return null;
        try {
          return decryptApiKey(row);
        } catch (e) {
          fetchErrors.push(`decrypt_${tool}_failed`);
          console.error('[fo/dashboard] decrypt failed for', client.id, tool, e);
          return null;
        }
      };

      let marginPct: number | null = null;
      let totalRevenueMtd: number | null = null;
      let totalCostMtd: number | null = null;
      let atRiskProjects = 0;

      // Profitability requires both Stripe and Harvest
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
            totalRevenueMtd = result.clients.reduce((s, c) => s + c.revenue_mtd, 0);
            totalCostMtd = result.clients.reduce((s, c) => s + c.cost_mtd, 0);
            marginPct = totalRevenueMtd > 0
              ? Math.round(((totalRevenueMtd - totalCostMtd) / totalRevenueMtd) * 100)
              : null;
          }
        } catch (e) {
          fetchErrors.push('profitability_fetch_failed');
          console.error('[fo/dashboard] profitability failed for', client.id, e);
        }
      }

      // Scope creep requires both ClickUp and Harvest
      const clickupKey = getKey('clickup');
      if (clickupKey && harvestKey) {
        try {
          const [clickupData, harvestMonthly] = await Promise.all([
            fetchClickupProjectBudgets(clickupKey),
            fetchHarvestMonthlyProjectHours(harvestKey),
          ]);
          const scopeResult = computeScopeCreep(clickupData, harvestMonthly);
          atRiskProjects = scopeResult.projects.filter(
            (p) => p.status === 'at_risk' || p.status === 'over_budget',
          ).length;
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
