// src/lib/coo/executor.ts
import Stripe from 'stripe';
import { fetchStripeFinanceData } from '<npm>/lib/integrations/stripe/adapter';
import { fetchHubspotSalesData } from '<npm>/lib/integrations/hubspot/adapter';
import { fetchStripePerClientRevenue } from '<npm>/lib/integrations/stripe/profitability-adapter';
import { fetchHarvestPerClientHours } from '<npm>/lib/integrations/harvest/profitability-adapter';
import { computeClientProfitability } from '<npm>/lib/profitability';
import { fetchClickupProjectBudgets } from '<npm>/lib/integrations/clickup/scope-adapter';
import { fetchPipedriveSalesData } from '<npm>/lib/integrations/pipedrive/adapter';
import { fetchTogglTimeData } from '<npm>/lib/integrations/toggl/adapter';
import { fetchAsanaDeliveryData } from '<npm>/lib/integrations/asana/adapter';
import { fetchMondayDeliveryData } from '<npm>/lib/integrations/monday/adapter';
import { fetchApolloMarketingData } from '<npm>/lib/integrations/apollo/adapter';
import { fetchCalendlyBookingsData } from '<npm>/lib/integrations/calendly/adapter';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import type { Json } from '<npm>/lib/database.types';
import type {
  MarginAlertPayload,
  HoursBudgetPayload,
  ScopeApproachingPayload,
  RetainerOveragePayload,
  ActionPayload,
} from '<npm>/lib/actions/types';

export type ExecutorContext = {
  stripeKey: string | null;
  hubspotKey: string | null;
  harvestKey: string | null;
  clickupKey: string | null;
  pipedriveKey: string | null;
  togglKey: string | null;
  asanaKey: string | null;
  mondayKey: string | null;
  apolloKey: string | null;
  calendlyKey: string | null;
  blendedRate: number;
  teamSizeRaw: string;
  userId: string;
};

export type ToolResult =
  | { success: true; data: unknown }
  | { success: false; reason: string };

const KNOWN_ACTION_TYPES = [
  'margin_alert',
  'hours_budget_exceeded',
  'scope_approaching',
  'retainer_overage',
] as const;
type KnownActionType = typeof KNOWN_ACTION_TYPES[number];

async function findStripeCustomerId(stripeKey: string, clientName: string): Promise<string> {
  try {
    const stripe = new Stripe(stripeKey, { typescript: true, maxNetworkRetries: 2 });
    const search = await stripe.customers.search({
      query: `name:"${clientName.replace(/"/g, '')}"`,
      limit: 1,
    });
    return search.data[0]?.id ?? '';
  } catch {
    return '';
  }
}

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
  if (ctx.hubspotKey) {
    try {
      const data = await fetchHubspotSalesData(ctx.hubspotKey);
      return {
        success: true,
        data: {
          source: 'hubspot',
          pipeline_value_usd: data.pipeline_value,
          open_deals_count: data.open_deals_count,
          deals_won_this_month: data.deals_won_this_month,
          currency: data.currency,
        },
      };
    } catch {
      // fall through to Pipedrive
    }
  }
  if (ctx.pipedriveKey) {
    try {
      const data = await fetchPipedriveSalesData(ctx.pipedriveKey);
      return {
        success: true,
        data: {
          source: 'pipedrive',
          pipeline_value_usd: data.pipeline_value,
          open_deals_count: data.open_deals_count,
          deals_won_this_month: data.deals_won_this_month,
          currency: data.currency,
        },
      };
    } catch {
      return { success: false, reason: 'Pipedrive fetch failed.' };
    }
  }
  return { success: false, reason: 'No CRM connected. Connect HubSpot or Pipedrive in Integrations.' };
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
  const minSize = teamSizeMin(ctx.teamSizeRaw);
  const capacityHours = minSize ? minSize * 160 : null;
  if (!capacityHours)
    return { success: false, reason: 'Team size is not set in account settings.' };

  if (ctx.harvestKey) {
    try {
      const harvestData = await fetchHarvestPerClientHours(ctx.harvestKey);
      const totalHours = harvestData.clients.reduce((s, c) => s + c.hours_current, 0);
      const utilPct = Math.round((totalHours / capacityHours) * 100);
      return {
        success: true,
        data: {
          source: 'harvest',
          estimated_monthly_capacity_hours: capacityHours,
          hours_tracked_this_month: Math.round(totalHours * 10) / 10,
          utilization_pct: utilPct,
          available_hours: Math.round(capacityHours - totalHours),
        },
      };
    } catch {
      // fall through to Toggl
    }
  }
  if (ctx.togglKey) {
    try {
      const data = await fetchTogglTimeData(ctx.togglKey);
      const utilPct = Math.round((data.hours_tracked / capacityHours) * 100);
      return {
        success: true,
        data: {
          source: 'toggl',
          estimated_monthly_capacity_hours: capacityHours,
          hours_tracked_this_month: Math.round(data.hours_tracked * 10) / 10,
          utilization_pct: utilPct,
          available_hours: Math.round(capacityHours - data.hours_tracked),
        },
      };
    } catch {
      return { success: false, reason: 'Toggl fetch failed.' };
    }
  }
  return { success: false, reason: 'No time tracker connected. Connect Harvest or Toggl in Integrations.' };
}

async function runGetScope(ctx: ExecutorContext): Promise<ToolResult> {
  if (ctx.clickupKey && ctx.harvestKey) {
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
      return { success: true, data: { source: 'clickup+harvest', projects } };
    } catch {
      // fall through
    }
  }
  if (ctx.asanaKey) {
    try {
      const data = await fetchAsanaDeliveryData(ctx.asanaKey);
      return {
        success: true,
        data: {
          source: 'asana',
          active_projects: data.active_projects,
          overdue_tasks: data.overdue_tasks,
          tasks: data.tasks.slice(0, 10).map((t) => ({
            name: t.name,
            project_name: t.project_name,
            status: t.status,
            overdue: t.overdue,
          })),
        },
      };
    } catch {
      // fall through
    }
  }
  if (ctx.mondayKey) {
    try {
      const data = await fetchMondayDeliveryData(ctx.mondayKey);
      return {
        success: true,
        data: {
          source: 'monday',
          active_projects: data.active_projects,
          overdue_tasks: data.overdue_tasks,
          tasks: data.tasks.slice(0, 10).map((t) => ({
            name: t.name,
            project_name: t.project_name,
            status: t.status,
            overdue: t.overdue,
          })),
        },
      };
    } catch {
      return { success: false, reason: 'Monday fetch failed.' };
    }
  }
  return { success: false, reason: 'No project tool connected. Connect ClickUp (best — includes budgets), Asana, or Monday in Integrations.' };
}

async function runGetOutbound(ctx: ExecutorContext): Promise<ToolResult> {
  if (!ctx.apolloKey)
    return { success: false, reason: 'Apollo is not connected. Connect it in Integrations to see outbound metrics.' };
  try {
    const data = await fetchApolloMarketingData(ctx.apolloKey);
    return {
      success: true,
      data: {
        emails_sent: data.emails_sent,
        open_rate_pct: data.open_rate_pct,
        reply_rate_pct: data.reply_rate_pct,
        top_sequences: data.sequences.slice(0, 5).map((s) => ({
          name: s.name,
          contacts_enrolled: s.contacts_enrolled,
          emails_sent: s.emails_sent,
          open_rate_pct: s.open_rate_pct,
          reply_rate_pct: s.reply_rate_pct,
        })),
      },
    };
  } catch {
    return { success: false, reason: 'Apollo fetch failed. The API key may have expired.' };
  }
}

async function runGetMeetings(ctx: ExecutorContext): Promise<ToolResult> {
  if (!ctx.calendlyKey)
    return { success: false, reason: 'Calendly is not connected. Connect it in Integrations to see meeting metrics.' };
  try {
    const data = await fetchCalendlyBookingsData(ctx.calendlyKey);
    return {
      success: true,
      data: {
        meetings_booked: data.meetings_booked,
        meeting_conversion_pct: data.meeting_conversion_pct,
        period_label: data.period_label,
        upcoming: data.upcoming.slice(0, 5).map((m) => ({
          name: m.name,
          invitee_name: m.invitee_name,
          start_time: m.start_time,
        })),
      },
    };
  } catch {
    return { success: false, reason: 'Calendly fetch failed. The API key may have expired.' };
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

async function runQueueAction(
  args: Record<string, unknown>,
  ctx: ExecutorContext,
): Promise<ToolResult> {
  // Validation
  const actionType = args.action_type;
  if (
    typeof actionType !== 'string' ||
    !(KNOWN_ACTION_TYPES as readonly string[]).includes(actionType)
  ) {
    return {
      success: false,
      reason: 'Unknown action_type. Must be one of: margin_alert, hours_budget_exceeded, scope_approaching, retainer_overage.',
    };
  }
  if (typeof args.label !== 'string') return { success: false, reason: 'label must be a string.' };
  if (typeof args.client_name !== 'string') return { success: false, reason: 'client_name must be a string.' };
  if (typeof args.draft_subject !== 'string') return { success: false, reason: 'draft_subject must be a string.' };
  if (typeof args.draft_body !== 'string') return { success: false, reason: 'draft_body must be a string.' };
  if (!isPlainObject(args.metrics)) return { success: false, reason: 'metrics must be an object.' };

  const clientName = args.client_name;
  const metrics = args.metrics as Record<string, unknown>;
  const num = (v: unknown, fallback = 0): number => (typeof v === 'number' ? v : fallback);

  try {
    let payload: ActionPayload;

    switch (actionType as KnownActionType) {
      case 'margin_alert': {
        const stripeCustomerId = ctx.stripeKey
          ? await findStripeCustomerId(ctx.stripeKey, clientName)
          : '';
        payload = {
          stripe_customer_id: stripeCustomerId,
          client_name: clientName,
          margin_pct: num(metrics.margin_pct),
          margin_prior_pct: null,
          revenue_mtd: num(metrics.revenue_mtd_usd ?? metrics.revenue_mtd),
          cost_mtd: num(metrics.cost_usd ?? metrics.cost_mtd),
          draft_subject: args.draft_subject,
          draft_body: args.draft_body,
        } satisfies MarginAlertPayload;
        break;
      }

      case 'hours_budget_exceeded': {
        if (typeof args.project_name !== 'string') {
          return { success: false, reason: 'project_name is required for hours_budget_exceeded.' };
        }
        payload = {
          client_name: clientName,
          project_name: args.project_name,
          harvest_project_id: '',
          hours_logged: num(metrics.hours_logged),
          budget_hours: num(metrics.budget_hours),
          overage_pct: num(metrics.overrun_pct ?? metrics.overage_pct),
          draft_subject: args.draft_subject,
          draft_body: args.draft_body,
        } satisfies HoursBudgetPayload;
        break;
      }

      case 'scope_approaching': {
        if (typeof args.project_name !== 'string') {
          return { success: false, reason: 'project_name is required for scope_approaching.' };
        }
        payload = {
          client_name: clientName,
          project_name: args.project_name,
          harvest_project_id: '',
          hours_logged: num(metrics.hours_logged),
          budget_hours: num(metrics.budget_hours),
          used_pct: num(metrics.used_pct ?? metrics.overrun_pct),
          draft_subject: args.draft_subject,
          draft_body: args.draft_body,
        } satisfies ScopeApproachingPayload;
        break;
      }

      case 'retainer_overage': {
        const supabase = getServerSupabaseClient();
        const clientNameNorm = clientName.trim().toLowerCase();
        const { data: retainer } = await supabase
          .from('retainer_configs')
          .select('monthly_amount_usd, included_hours')
          .eq('user_id', ctx.userId)
          .eq('client_name_norm', clientNameNorm)
          .maybeSingle();

        const monthlyAmount = num(retainer?.monthly_amount_usd, 0);
        const includedHours = num(retainer?.included_hours, 0);
        const hoursLogged = num(metrics.hours_logged);
        const overageHours = Math.max(0, hoursLogged - includedHours);
        const impliedRate = includedHours > 0 ? monthlyAmount / includedHours : ctx.blendedRate;
        const overageCost = overageHours * impliedRate;

        payload = {
          client_name: clientName,
          client_name_norm: clientNameNorm,
          monthly_amount_usd: monthlyAmount,
          included_hours: includedHours,
          logged_hours: hoursLogged,
          overage_hours: overageHours,
          overage_cost_usd: Math.round(overageCost * 100) / 100,
          implied_hourly_rate: Math.round(impliedRate * 100) / 100,
          draft_subject: args.draft_subject,
          draft_body: args.draft_body,
        } satisfies RetainerOveragePayload;
        break;
      }
    }

    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from('agent_actions')
      .insert({
        user_id: ctx.userId,
        action_type: actionType,
        payload: payload as unknown as Json,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error || !data) return { success: false, reason: 'Failed to save action.' };
    return { success: true, data: { action_id: data.id, label: args.label } };
  } catch {
    return { success: false, reason: 'Failed to build or save action.' };
  }
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
    case 'get_outbound':
      return runGetOutbound(ctx);
    case 'get_meetings':
      return runGetMeetings(ctx);
    case 'queue_action':
      return runQueueAction(args, ctx);
    default:
      return { success: false, reason: `Unknown tool: ${name}` };
  }
}
