// src/lib/coo/executor.ts
import { fetchStripeFinanceData } from '<npm>/lib/integrations/stripe/adapter';
import { fetchHubspotSalesData } from '<npm>/lib/integrations/hubspot/adapter';
import { fetchStripePerClientRevenue } from '<npm>/lib/integrations/stripe/profitability-adapter';
import { fetchHarvestPerClientHours } from '<npm>/lib/integrations/harvest/profitability-adapter';
import { computeClientProfitability } from '<npm>/lib/profitability';
import { fetchClickupProjectBudgets } from '<npm>/lib/integrations/clickup/scope-adapter';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import type { Json } from '<npm>/lib/database.types';

export type ExecutorContext = {
  stripeKey: string | null;
  hubspotKey: string | null;
  harvestKey: string | null;
  clickupKey: string | null;
  blendedRate: number;
  teamSizeRaw: string;
  userId: string;
};

export type ToolResult =
  | { success: true; data: unknown }
  | { success: false; reason: string };

const KNOWN_ACTION_TYPES = [
  'invoice_reminder',
  'reprice_client',
  'scope_alert',
  'margin_alert',
] as const;

function teamSizeMin(raw: string): number | null {
  if (!raw) return null;
  if (raw === '1') return 1;
  const m = raw.match(/^(\d+)/);
  return m ? parseInt(m[1]!) : null;
}

async function runGetFinance(ctx: ExecutorContext): Promise<ToolResult> {
  if (!ctx.stripeKey)
    return { success: false, reason: 'Stripe is not connected. Go to Integrations to connect it.' };
  try {
    const data = await fetchStripeFinanceData(ctx.stripeKey);
    return {
      success: true,
      data: {
        invoiced_mtd_usd: data.invoiced,
        paid_mtd_usd: data.paid,
        overdue_usd: data.overdue,
        currency: data.currency,
      },
    };
  } catch {
    return { success: false, reason: 'Stripe fetch failed. The API key may have expired.' };
  }
}

async function runGetSales(ctx: ExecutorContext): Promise<ToolResult> {
  if (!ctx.hubspotKey)
    return { success: false, reason: 'HubSpot is not connected. Go to Integrations to connect it.' };
  try {
    const data = await fetchHubspotSalesData(ctx.hubspotKey);
    return {
      success: true,
      data: {
        pipeline_value_usd: data.pipeline_value,
        open_deals_count: data.open_deals_count,
        deals_won_this_month: data.deals_won_this_month,
        currency: data.currency,
      },
    };
  } catch {
    return { success: false, reason: 'HubSpot fetch failed. The API key may have expired.' };
  }
}

async function runGetProfitability(ctx: ExecutorContext): Promise<ToolResult> {
  if (!ctx.stripeKey)
    return { success: false, reason: 'Stripe is not connected — needed for revenue data.' };
  if (!ctx.harvestKey)
    return { success: false, reason: 'Harvest is not connected — needed for hours data.' };
  try {
    const [stripeData, harvestData] = await Promise.all([
      fetchStripePerClientRevenue(ctx.stripeKey),
      fetchHarvestPerClientHours(ctx.harvestKey),
    ]);
    const result = computeClientProfitability(stripeData, harvestData, ctx.blendedRate);
    return {
      success: true,
      data: {
        clients: result.clients.map((c) => ({
          name: c.name,
          revenue_mtd_usd: Math.round(c.revenue_mtd),
          hours_mtd: Math.round(c.hours_mtd * 10) / 10,
          cost_usd: Math.round(c.hours_mtd * ctx.blendedRate),
          margin_pct: Math.round(c.margin_pct),
        })),
      },
    };
  } catch {
    return { success: false, reason: 'Profitability fetch failed.' };
  }
}

async function runGetCapacity(ctx: ExecutorContext): Promise<ToolResult> {
  if (!ctx.harvestKey)
    return { success: false, reason: 'Harvest is not connected — needed for hours tracking.' };
  const minSize = teamSizeMin(ctx.teamSizeRaw);
  const capacityHours = minSize ? minSize * 160 : null;
  if (!capacityHours)
    return { success: false, reason: 'Team size is not set in account settings.' };
  try {
    const harvestData = await fetchHarvestPerClientHours(ctx.harvestKey);
    const totalHours = harvestData.clients.reduce((s, c) => s + c.hours_current, 0);
    const utilPct = Math.round((totalHours / capacityHours) * 100);
    return {
      success: true,
      data: {
        estimated_monthly_capacity_hours: capacityHours,
        hours_tracked_this_month: Math.round(totalHours * 10) / 10,
        utilization_pct: utilPct,
        available_hours: Math.round(capacityHours - totalHours),
      },
    };
  } catch {
    return { success: false, reason: 'Harvest capacity fetch failed.' };
  }
}

async function runGetScope(ctx: ExecutorContext): Promise<ToolResult> {
  if (!ctx.clickupKey)
    return { success: false, reason: 'ClickUp is not connected — needed for project budget data.' };
  if (!ctx.harvestKey)
    return { success: false, reason: 'Harvest is not connected — needed for hours logged data.' };
  try {
    const [clickupData, harvestData] = await Promise.all([
      fetchClickupProjectBudgets(ctx.clickupKey),
      fetchHarvestPerClientHours(ctx.harvestKey),
    ]);
    const harvestByName = Object.fromEntries(
      harvestData.clients.map((c) => [c.name.toLowerCase(), c.hours_current]),
    );
    const projects = clickupData.projects.map((p) => {
      const logged = harvestByName[p.project_name.toLowerCase()] ?? 0;
      const overrunPct =
        p.estimated_hours > 0
          ? Math.round(((logged - p.estimated_hours) / p.estimated_hours) * 100)
          : 0;
      return {
        project_name: p.project_name,
        budget_hours: p.estimated_hours,
        logged_hours: Math.round(logged * 10) / 10,
        overrun_pct: overrunPct,
        in_scope: logged <= p.estimated_hours,
      };
    });
    return { success: true, data: { projects } };
  } catch {
    return { success: false, reason: 'Scope fetch failed.' };
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

async function runQueueAction(
  args: Record<string, unknown>,
  ctx: ExecutorContext,
): Promise<ToolResult> {
  const actionType = args.action_type;
  if (
    typeof actionType !== 'string' ||
    !(KNOWN_ACTION_TYPES as readonly string[]).includes(actionType)
  ) {
    return {
      success: false,
      reason:
        'Unknown action_type. Must be one of: invoice_reminder, reprice_client, scope_alert, margin_alert.',
    };
  }
  if (typeof args.label !== 'string') {
    return { success: false, reason: 'label must be a string.' };
  }
  if (!isPlainObject(args.payload)) {
    return { success: false, reason: 'payload must be an object.' };
  }

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('agent_actions')
    .insert({
      user_id: ctx.userId,
      action_type: actionType,
      payload: args.payload as unknown as Json,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !data) return { success: false, reason: 'Failed to save action.' };
  return { success: true, data: { action_id: data.id, label: args.label } };
}

export async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  ctx: ExecutorContext,
): Promise<ToolResult> {
  switch (name) {
    case 'get_finance':
      return runGetFinance(ctx);
    case 'get_sales':
      return runGetSales(ctx);
    case 'get_profitability':
      return runGetProfitability(ctx);
    case 'get_capacity':
      return runGetCapacity(ctx);
    case 'get_scope':
      return runGetScope(ctx);
    case 'queue_action':
      return runQueueAction(args, ctx);
    default:
      return { success: false, reason: `Unknown tool: ${name}` };
  }
}
