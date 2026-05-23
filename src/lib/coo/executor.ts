// src/lib/coo/executor.ts
//
// Post-Composio-OAuth executor. All tool calls now go through `executeComposioAction`
// rather than calling per-tool adapters with decrypted user-pasted keys (Model C is
// gone). Each `get_*` tool first checks `isComposioConnected(userId, toolSlug)` and
// returns a clear "not connected" reason so the LLM can recommend connecting it.
//
// Data shapes: we intentionally do *not* perfectly replicate the legacy adapter
// shapes. The COO chat is an LLM consumer — it can tolerate slightly different
// field naming. We preserve the key fields the model relies on (amounts, counts,
// names, dates) and document any simplifications inline.
//
// Composio action slugs marked with `TODO(composio-slug): verify slug` are
// best-guesses based on Composio's naming convention (`<TOOLKIT>_<VERB>_<NOUN>`).
// Verify each before flipping the chat to production.
import {
  executeComposioAction,
  safeExecuteComposioAction,
  isComposioConnected,
  ComposioNotConnectedError,
} from '<npm>/lib/composio-fetch';
import { computeClientProfitability } from '<npm>/lib/profitability';
import type {
  StripePerClientData,
  StripeClientRevenue,
} from '<npm>/lib/integrations/stripe/profitability-adapter';
import type {
  HarvestPerClientData,
  HarvestClientHours,
} from '<npm>/lib/integrations/harvest/profitability-adapter';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { retrieveCooKnowledgeHybrid } from '<npm>/lib/knowledge-retrieval';
import { searchBrain, formatBrainContext } from './brain-search';
import type { Json } from '<npm>/lib/database.types';
import type {
  MarginAlertPayload,
  HoursBudgetPayload,
  ScopeApproachingPayload,
  RetainerOveragePayload,
  ActionPayload,
} from '<npm>/lib/actions/types';

export type ExecutorContext = {
  userId: string;
  blendedRate: number;
  teamSizeRaw: string;
  lastUserQuestion: string;
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

// ----------------------------- helpers -----------------------------------

function teamSizeMin(raw: string): number | null {
  if (!raw) return null;
  if (raw === '1') return 1;
  const m = raw.match(/^(\d+)/);
  return m ? parseInt(m[1]!) : null;
}

function notConnected(toolSlug: string): ToolResult {
  return {
    success: false,
    reason: `${toolSlug} is not connected. Connect it from /dashboard/integrations.`,
  };
}

function fetchFailed(toolSlug: string): ToolResult {
  return { success: false, reason: `${toolSlug} fetch failed.` };
}

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function asArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object' && 'data' in v && Array.isArray((v as { data: unknown }).data)) {
    return (v as { data: unknown[] }).data;
  }
  return [];
}

function startOfMonthUnix(): number {
  const d = new Date();
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), 1).getTime() / 1000);
}

function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

// --------------------- per-tool: get_finance -----------------------------

/**
 * Stripe finance summary (MTD invoiced/paid/overdue).
 *
 * Legacy adapter did 3 stripe API calls + currency normalization. Here we do
 * two Composio calls (invoices list filtered by status) and sum on the client.
 * Shape: we keep `invoiced_mtd_usd`, `paid_mtd_usd`, `overdue_usd`, `currency`.
 */
async function runGetFinance(ctx: ExecutorContext): Promise<ToolResult> {
  if (!(await isComposioConnected(ctx.userId, 'stripe'))) {
    return notConnected('Stripe');
  }
  try {
    const monthStart = startOfMonthUnix();
    const now = nowUnix();

    // TODO(composio-slug): verify slug — Stripe invoices list, MTD
    const invoicedResp = await safeExecuteComposioAction<unknown>(
      ctx.userId,
      'stripe',
      'STRIPE_LIST_INVOICES',
      { created: { gte: monthStart }, limit: 100 },
    );
    const paidResp = await safeExecuteComposioAction<unknown>(
      ctx.userId,
      'stripe',
      'STRIPE_LIST_INVOICES',
      { status: 'paid', created: { gte: monthStart }, limit: 100 },
    );
    const openResp = await safeExecuteComposioAction<unknown>(
      ctx.userId,
      'stripe',
      'STRIPE_LIST_INVOICES',
      { status: 'open', limit: 100 },
    );

    const invoiced = asArray(invoicedResp).reduce<number>(
      (s, inv) => s + toNumber((inv as { amount_due?: unknown }).amount_due) / 100,
      0,
    );
    const paid = asArray(paidResp).reduce<number>(
      (s, inv) => s + toNumber((inv as { amount_paid?: unknown }).amount_paid) / 100,
      0,
    );
    const overdue = asArray(openResp)
      .filter((inv) => {
        const due = toNumber((inv as { due_date?: unknown }).due_date);
        return due > 0 && due < now;
      })
      .reduce<number>(
        (s, inv) => s + toNumber((inv as { amount_due?: unknown }).amount_due) / 100,
        0,
      );

    return {
      success: true,
      data: {
        invoiced_mtd_usd: Math.round(invoiced * 100) / 100,
        paid_mtd_usd: Math.round(paid * 100) / 100,
        overdue_usd: Math.round(overdue * 100) / 100,
        currency: 'USD',
      },
    };
  } catch (err) {
    if (err instanceof ComposioNotConnectedError) return notConnected('Stripe');
    return fetchFailed('Stripe');
  }
}

// --------------------- per-tool: get_sales -------------------------------

/**
 * CRM pipeline summary — HubSpot preferred, Pipedrive fallback.
 * Shape (per legacy): pipeline_value_usd, open_deals_count, deals_won_this_month, source, currency.
 */
async function runGetSales(ctx: ExecutorContext): Promise<ToolResult> {
  if (await isComposioConnected(ctx.userId, 'hubspot')) {
    try {
      // TODO(composio-slug): verify slug — HubSpot deals list
      const dealsResp = await executeComposioAction<unknown>(
        ctx.userId,
        'hubspot',
        'HUBSPOT_LIST_DEALS',
        { limit: 100 },
      );
      const deals = asArray(dealsResp) as Array<{
        properties?: { amount?: unknown; dealstage?: unknown; closedate?: unknown; hs_is_closed_won?: unknown };
      }>;
      const monthStartMs = startOfMonthUnix() * 1000;
      let pipelineValue = 0;
      let openDealsCount = 0;
      let dealsWonThisMonth = 0;
      for (const d of deals) {
        const props = d.properties ?? {};
        const amount = toNumber(props.amount);
        const stage = String(props.dealstage ?? '').toLowerCase();
        const isWon = props.hs_is_closed_won === 'true' || props.hs_is_closed_won === true || stage.includes('won');
        const isClosed = isWon || stage.includes('lost') || stage.includes('closed');
        if (!isClosed) {
          pipelineValue += amount;
          openDealsCount += 1;
        }
        if (isWon) {
          const closeDate = toNumber(props.closedate);
          if (closeDate >= monthStartMs) dealsWonThisMonth += 1;
        }
      }
      return {
        success: true,
        data: {
          source: 'hubspot',
          pipeline_value_usd: Math.round(pipelineValue),
          open_deals_count: openDealsCount,
          deals_won_this_month: dealsWonThisMonth,
          currency: 'USD',
        },
      };
    } catch {
      // fall through to Pipedrive
    }
  }
  if (await isComposioConnected(ctx.userId, 'pipedrive')) {
    try {
      // TODO(composio-slug): verify slug — Pipedrive deals list
      const dealsResp = await executeComposioAction<unknown>(
        ctx.userId,
        'pipedrive',
        'PIPEDRIVE_LIST_DEALS',
        { limit: 100 },
      );
      const deals = asArray(dealsResp) as Array<{
        value?: unknown;
        status?: unknown;
        won_time?: unknown;
      }>;
      const monthStartMs = startOfMonthUnix() * 1000;
      let pipelineValue = 0;
      let openDealsCount = 0;
      let dealsWonThisMonth = 0;
      for (const d of deals) {
        const value = toNumber(d.value);
        const status = String(d.status ?? '').toLowerCase();
        if (status === 'open') {
          pipelineValue += value;
          openDealsCount += 1;
        } else if (status === 'won') {
          const wonTime = Date.parse(String(d.won_time ?? '')) || 0;
          if (wonTime >= monthStartMs) dealsWonThisMonth += 1;
        }
      }
      return {
        success: true,
        data: {
          source: 'pipedrive',
          pipeline_value_usd: Math.round(pipelineValue),
          open_deals_count: openDealsCount,
          deals_won_this_month: dealsWonThisMonth,
          currency: 'USD',
        },
      };
    } catch {
      return fetchFailed('Pipedrive');
    }
  }
  return {
    success: false,
    reason: 'No CRM connected. Connect HubSpot or Pipedrive in Integrations.',
  };
}

// --------------------- per-tool: get_profitability -----------------------

/**
 * Per-client profitability — combines Stripe invoices and Harvest time entries.
 *
 * Composio response shapes are reduced to the minimum `computeClientProfitability`
 * needs (`{ name, revenue_current, revenue_prior, ... }` for Stripe and
 * `{ name, hours_current, hours_prior }` for Harvest). The legacy adapters did
 * dual-month windowing — we only fetch the current month here. `revenue_prior`
 * and `hours_prior` are reported as 0, which means margin-trend will display as
 * "no prior data" in the LLM's reasoning. This is acceptable for chat; the
 * dashboard's profitability page should later be reworked with proper prior-month
 * Composio calls.
 */
async function runGetProfitability(ctx: ExecutorContext): Promise<ToolResult> {
  const stripeOk = await isComposioConnected(ctx.userId, 'stripe');
  const harvestOk = await isComposioConnected(ctx.userId, 'harvest');
  if (!stripeOk) return { success: false, reason: 'Stripe is not connected — needed for revenue data.' };
  if (!harvestOk) return { success: false, reason: 'Harvest is not connected — needed for hours data.' };

  try {
    const monthStart = startOfMonthUnix();

    // TODO(composio-slug): verify slug — Stripe paid invoices MTD, expanded customer
    const invoicesResp = await executeComposioAction<unknown>(
      ctx.userId,
      'stripe',
      'STRIPE_LIST_INVOICES',
      { status: 'paid', created: { gte: monthStart }, limit: 100 },
    );
    const invoices = asArray(invoicesResp) as Array<{
      customer?: unknown;
      amount_paid?: unknown;
      due_date?: unknown;
      status_transitions?: { paid_at?: unknown };
    }>;

    // Bucket revenue by customer id; we don't have names without a second call.
    // TODO(composio-slug): verify slug — Stripe customers list
    const customersResp = await safeExecuteComposioAction<unknown>(
      ctx.userId,
      'stripe',
      'STRIPE_LIST_CUSTOMERS',
      { limit: 100 },
    );
    const customersById = new Map<string, string>();
    for (const c of asArray(customersResp)) {
      const obj = c as { id?: unknown; name?: unknown; email?: unknown };
      if (typeof obj.id === 'string') {
        customersById.set(obj.id, String(obj.name ?? obj.email ?? obj.id));
      }
    }

    const revenueByCustomerId = new Map<string, { name: string; revenue: number }>();
    for (const inv of invoices) {
      const custId =
        typeof inv.customer === 'string'
          ? inv.customer
          : ((inv.customer as { id?: string } | null)?.id ?? '');
      if (!custId) continue;
      const name = customersById.get(custId) ?? custId;
      const amount = toNumber(inv.amount_paid) / 100;
      const entry = revenueByCustomerId.get(custId) ?? { name, revenue: 0 };
      entry.revenue += amount;
      revenueByCustomerId.set(custId, entry);
    }
    const stripeData: StripePerClientData = {
      clients: Array.from(revenueByCustomerId.entries()).map(([id, v]): StripeClientRevenue => ({
        id,
        name: v.name,
        revenue_current: v.revenue,
        revenue_prior: 0, // see note above
        payment_status: 'unknown',
        days_overdue: null,
      })),
      currency: 'USD',
    };

    // TODO(composio-slug): verify slug — Harvest time entries since month start
    const timeResp = await executeComposioAction<unknown>(
      ctx.userId,
      'harvest',
      'HARVEST_LIST_TIME_ENTRIES',
      { from: new Date(monthStart * 1000).toISOString().slice(0, 10) },
    );
    const entries = asArray(timeResp) as Array<{
      hours?: unknown;
      client?: { name?: unknown } | null;
    }>;
    const hoursByClient = new Map<string, number>();
    for (const e of entries) {
      const name = String(e.client?.name ?? '').trim();
      if (!name) continue;
      hoursByClient.set(name, (hoursByClient.get(name) ?? 0) + toNumber(e.hours));
    }
    const harvestData: HarvestPerClientData = {
      clients: Array.from(hoursByClient.entries()).map(([name, hours]): HarvestClientHours => ({
        name,
        hours_current: hours,
        hours_prior: 0,
      })),
    };

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
  } catch (err) {
    if (err instanceof ComposioNotConnectedError) {
      return { success: false, reason: `${err.toolSlug} not connected.` };
    }
    return fetchFailed('Profitability');
  }
}

// --------------------- per-tool: get_capacity ----------------------------

async function runGetCapacity(ctx: ExecutorContext): Promise<ToolResult> {
  const minSize = teamSizeMin(ctx.teamSizeRaw);
  const capacityHours = minSize ? minSize * 160 : null;
  if (!capacityHours)
    return { success: false, reason: 'Team size is not set in account settings.' };

  if (await isComposioConnected(ctx.userId, 'harvest')) {
    try {
      const monthStart = startOfMonthUnix();
      // TODO(composio-slug): verify slug — Harvest time entries since month start
      const resp = await executeComposioAction<unknown>(
        ctx.userId,
        'harvest',
        'HARVEST_LIST_TIME_ENTRIES',
        { from: new Date(monthStart * 1000).toISOString().slice(0, 10) },
      );
      const entries = asArray(resp) as Array<{ hours?: unknown }>;
      const totalHours = entries.reduce((s, e) => s + toNumber(e.hours), 0);
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
      // fall through
    }
  }

  if (await isComposioConnected(ctx.userId, 'toggl')) {
    try {
      // TODO(composio-slug): verify slug — Toggl time entries (current month)
      const monthStartIso = new Date(startOfMonthUnix() * 1000).toISOString();
      const resp = await executeComposioAction<unknown>(
        ctx.userId,
        'toggl',
        'TOGGL_LIST_TIME_ENTRIES',
        { start_date: monthStartIso },
      );
      const entries = asArray(resp) as Array<{ duration?: unknown }>;
      const totalSeconds = entries.reduce((s, e) => s + Math.max(0, toNumber(e.duration)), 0);
      const totalHours = totalSeconds / 3600;
      const utilPct = Math.round((totalHours / capacityHours) * 100);
      return {
        success: true,
        data: {
          source: 'toggl',
          estimated_monthly_capacity_hours: capacityHours,
          hours_tracked_this_month: Math.round(totalHours * 10) / 10,
          utilization_pct: utilPct,
          available_hours: Math.round(capacityHours - totalHours),
        },
      };
    } catch {
      return fetchFailed('Toggl');
    }
  }
  return {
    success: false,
    reason: 'No time tracker connected. Connect Harvest or Toggl in Integrations.',
  };
}

// --------------------- per-tool: get_scope -------------------------------

/**
 * Project scope / overrun report. ClickUp preferred (has budgets), Asana / Monday
 * fall back to "active project + overdue task" mode.
 *
 * Composio's ClickUp toolkit doesn't expose project estimated-hours in a known
 * action; we list tasks instead and report task-level signals. The LLM is told
 * up-front this is a simplification.
 */
async function runGetScope(ctx: ExecutorContext): Promise<ToolResult> {
  if (await isComposioConnected(ctx.userId, 'clickup')) {
    try {
      // TODO(composio-slug): verify slug — ClickUp tasks list (likely team-scoped)
      const tasksResp = await executeComposioAction<unknown>(
        ctx.userId,
        'clickup',
        'CLICKUP_LIST_TASKS',
        { archived: false },
      );
      const tasks = asArray(tasksResp) as Array<{
        name?: unknown;
        status?: { status?: unknown } | null;
        due_date?: unknown;
        time_estimate?: unknown;
        time_spent?: unknown;
        list?: { name?: unknown } | null;
      }>;
      const now = Date.now();
      const projects = tasks.slice(0, 20).map((t) => {
        const estimateMs = toNumber(t.time_estimate);
        const spentMs = toNumber(t.time_spent);
        const estimateHours = estimateMs / (1000 * 60 * 60);
        const spentHours = spentMs / (1000 * 60 * 60);
        const overrunPct =
          estimateHours > 0
            ? Math.round(((spentHours - estimateHours) / estimateHours) * 100)
            : 0;
        const dueDate = toNumber(t.due_date);
        return {
          project_name: String(t.list?.name ?? t.name ?? 'unknown'),
          task_name: String(t.name ?? ''),
          status: String(t.status?.status ?? 'unknown'),
          budget_hours: Math.round(estimateHours * 10) / 10,
          logged_hours: Math.round(spentHours * 10) / 10,
          overrun_pct: overrunPct,
          in_scope: estimateHours === 0 || spentHours <= estimateHours,
          overdue: dueDate > 0 && dueDate < now,
        };
      });
      return { success: true, data: { source: 'clickup', projects } };
    } catch {
      // fall through
    }
  }
  if (await isComposioConnected(ctx.userId, 'asana')) {
    try {
      // TODO(composio-slug): verify slug — Asana tasks list
      const resp = await executeComposioAction<unknown>(
        ctx.userId,
        'asana',
        'ASANA_LIST_TASKS',
        { limit: 50 },
      );
      const tasks = asArray(resp) as Array<{
        name?: unknown;
        completed?: unknown;
        due_on?: unknown;
        projects?: Array<{ name?: unknown }>;
      }>;
      const today = new Date().toISOString().slice(0, 10);
      const overdueTasks = tasks.filter(
        (t) => !t.completed && typeof t.due_on === 'string' && t.due_on < today,
      ).length;
      return {
        success: true,
        data: {
          source: 'asana',
          active_projects: new Set(tasks.flatMap((t) => (t.projects ?? []).map((p) => String(p.name ?? '')))).size,
          overdue_tasks: overdueTasks,
          tasks: tasks.slice(0, 10).map((t) => ({
            name: String(t.name ?? ''),
            project_name: String(t.projects?.[0]?.name ?? ''),
            status: t.completed ? 'completed' : 'open',
            overdue: !t.completed && typeof t.due_on === 'string' && t.due_on < today,
          })),
        },
      };
    } catch {
      // fall through
    }
  }
  if (await isComposioConnected(ctx.userId, 'monday')) {
    try {
      // TODO(composio-slug): verify slug — Monday items list
      const resp = await executeComposioAction<unknown>(
        ctx.userId,
        'monday',
        'MONDAY_LIST_ITEMS',
        { limit: 50 },
      );
      const items = asArray(resp) as Array<{ name?: unknown; state?: unknown; board?: { name?: unknown } }>;
      return {
        success: true,
        data: {
          source: 'monday',
          active_projects: new Set(items.map((i) => String(i.board?.name ?? ''))).size,
          overdue_tasks: 0, // Monday item-level due dates require column data; skipped
          tasks: items.slice(0, 10).map((i) => ({
            name: String(i.name ?? ''),
            project_name: String(i.board?.name ?? ''),
            status: String(i.state ?? 'unknown'),
            overdue: false,
          })),
        },
      };
    } catch {
      return fetchFailed('Monday');
    }
  }
  return {
    success: false,
    reason: 'No project tool connected. Connect ClickUp (best — includes budgets), Asana, or Monday in Integrations.',
  };
}

// --------------------- per-tool: get_outbound ----------------------------

async function runGetOutbound(ctx: ExecutorContext): Promise<ToolResult> {
  if (!(await isComposioConnected(ctx.userId, 'apollo'))) {
    return {
      success: false,
      reason: 'Apollo is not connected. Connect it in Integrations to see outbound metrics.',
    };
  }
  try {
    // TODO(composio-slug): verify slug — Apollo emails sent list
    const resp = await executeComposioAction<unknown>(
      ctx.userId,
      'apollo',
      'APOLLO_LIST_EMAILS_SENT',
      { limit: 100 },
    );
    const emails = asArray(resp) as Array<{
      opened?: unknown;
      replied?: unknown;
      sequence?: { name?: unknown };
    }>;
    const emailsSent = emails.length;
    const opened = emails.filter((e) => e.opened === true || toNumber(e.opened) > 0).length;
    const replied = emails.filter((e) => e.replied === true || toNumber(e.replied) > 0).length;
    const openRate = emailsSent > 0 ? Math.round((opened / emailsSent) * 1000) / 10 : 0;
    const replyRate = emailsSent > 0 ? Math.round((replied / emailsSent) * 1000) / 10 : 0;

    const bySequence = new Map<string, { sent: number; opened: number; replied: number }>();
    for (const e of emails) {
      const name = String(e.sequence?.name ?? 'unknown');
      const entry = bySequence.get(name) ?? { sent: 0, opened: 0, replied: 0 };
      entry.sent += 1;
      if (e.opened === true || toNumber(e.opened) > 0) entry.opened += 1;
      if (e.replied === true || toNumber(e.replied) > 0) entry.replied += 1;
      bySequence.set(name, entry);
    }
    const topSequences = Array.from(bySequence.entries())
      .sort((a, b) => b[1].sent - a[1].sent)
      .slice(0, 5)
      .map(([name, s]) => ({
        name,
        contacts_enrolled: s.sent,
        emails_sent: s.sent,
        open_rate_pct: s.sent ? Math.round((s.opened / s.sent) * 1000) / 10 : 0,
        reply_rate_pct: s.sent ? Math.round((s.replied / s.sent) * 1000) / 10 : 0,
      }));

    return {
      success: true,
      data: {
        emails_sent: emailsSent,
        open_rate_pct: openRate,
        reply_rate_pct: replyRate,
        top_sequences: topSequences,
      },
    };
  } catch {
    return fetchFailed('Apollo');
  }
}

// --------------------- per-tool: get_meetings ----------------------------

async function runGetMeetings(ctx: ExecutorContext): Promise<ToolResult> {
  if (!(await isComposioConnected(ctx.userId, 'calendly'))) {
    return {
      success: false,
      reason: 'Calendly is not connected. Connect it in Integrations to see meeting metrics.',
    };
  }
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    // TODO(composio-slug): verify slug — Calendly events list (current month)
    const resp = await executeComposioAction<unknown>(
      ctx.userId,
      'calendly',
      'CALENDLY_LIST_EVENTS',
      { min_start_time: monthStart, max_start_time: monthEnd, count: 100 },
    );
    const events = asArray(resp) as Array<{
      name?: unknown;
      start_time?: unknown;
      invitees_counter?: { active?: unknown } | null;
      event_memberships?: Array<{ user_name?: unknown }>;
    }>;
    const meetingsBooked = events.length;
    const upcoming = events
      .filter((e) => Date.parse(String(e.start_time ?? '')) > Date.now())
      .slice(0, 5)
      .map((e) => ({
        name: String(e.name ?? ''),
        invitee_name: String(e.event_memberships?.[0]?.user_name ?? ''),
        start_time: String(e.start_time ?? ''),
      }));
    return {
      success: true,
      data: {
        meetings_booked: meetingsBooked,
        meeting_conversion_pct: null, // requires invite-vs-confirmed math we don't have here
        period_label: 'this month',
        upcoming,
      },
    };
  } catch {
    return fetchFailed('Calendly');
  }
}

// --------------------- per-tool: search_kb -------------------------------

async function runSearchKb(args: Record<string, unknown>, ctx: ExecutorContext): Promise<ToolResult> {
  if (typeof args.query !== 'string' || !args.query.trim()) {
    return { success: false, reason: 'query must be a non-empty string.' };
  }
  const chunks = await retrieveCooKnowledgeHybrid(args.query);

  // Self-improving loop: log gaps for the admin backlog
  if (chunks.length === 0) {
    try {
      const supabase = getServerSupabaseClient();
      await supabase.from('coo_kb_gaps').insert({
        user_id: ctx.userId,
        user_question: ctx.lastUserQuestion,
        kb_query: args.query,
        found_results: false,
      });
    } catch {
      // Don't break the agent if logging fails
    }
    return { success: false, reason: 'No relevant knowledge found for that query.' };
  }

  return {
    success: true,
    data: {
      results: chunks.map((c) => ({
        source: c.sourceFile,
        category: c.category,
        title: c.frontmatter?.title ?? null,
        summary: c.frontmatter?.summary ?? null,
        authority: c.frontmatter?.authority ?? null,
        publication_date: c.frontmatter?.publication_date ?? null,
        content: c.content,
      })),
    },
  };
}

// --------------------- per-tool: search_brain ----------------------------

async function runSearchBrain(
  args: Record<string, unknown>,
  ctx: ExecutorContext,
): Promise<ToolResult> {
  if (typeof args.query !== 'string' || !args.query.trim()) {
    return { success: false, reason: 'query must be a non-empty string.' };
  }
  const matches = await searchBrain(ctx.userId, args.query, 10);
  if (matches.length === 0) {
    return {
      success: false,
      reason:
        'Your brain is empty (no breadcrumbs ingested yet). Upload a Slack/Gmail/Zoom export via /dashboard/brain, or click Seed sample data to populate it.',
    };
  }
  return {
    success: true,
    data: {
      query: args.query,
      patterns_found: matches.filter((m) => m.kind === 'pattern_card').length,
      breadcrumbs_found: matches.filter((m) => m.kind === 'breadcrumb').length,
      formatted: formatBrainContext(matches),
      raw: matches,
    },
  };
}

// --------------------- per-tool: queue_action ----------------------------

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Find the Stripe customer id matching `clientName` via Composio.
 * Returns an empty string when not found / not connected.
 */
async function findStripeCustomerIdComposio(userId: string, clientName: string): Promise<string> {
  try {
    if (!(await isComposioConnected(userId, 'stripe'))) return '';
    // TODO(composio-slug): verify slug — Stripe customers search
    const resp = await safeExecuteComposioAction<unknown>(
      userId,
      'stripe',
      'STRIPE_LIST_CUSTOMERS',
      { limit: 100 },
    );
    const customers = asArray(resp) as Array<{ id?: unknown; name?: unknown }>;
    const needle = clientName.trim().toLowerCase();
    const hit = customers.find((c) => String(c.name ?? '').trim().toLowerCase() === needle);
    return typeof hit?.id === 'string' ? hit.id : '';
  } catch {
    return '';
  }
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
        const stripeCustomerId = await findStripeCustomerIdComposio(ctx.userId, clientName);
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

// --------------------- dispatcher ----------------------------------------

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
    case 'search_kb':
      return runSearchKb(args, ctx);
    case 'search_brain':
      return runSearchBrain(args, ctx);
    case 'queue_action':
      return runQueueAction(args, ctx);
    default:
      return { success: false, reason: `Unknown tool: ${name}` };
  }
}
