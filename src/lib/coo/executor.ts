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
  HarvestPerClientData,
  HarvestClientHours,
} from '<npm>/lib/integration-types';
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

// --------------------- per-tool: get_real_pnl ----------------------------

/**
 * Real P&L from QuickBooks (preferred) or Xero. Returns whatever Composio gives
 * us as a permissive object — the LLM is in charge of interpreting the report
 * shape. We just normalize a few common field names if present.
 */
async function runGetRealPnl(ctx: ExecutorContext): Promise<ToolResult> {
  const qbConnected = await isComposioConnected(ctx.userId, 'quickbooks');
  const xeroConnected = await isComposioConnected(ctx.userId, 'xero');
  if (!qbConnected && !xeroConnected) {
    return {
      success: false,
      reason: 'No accounting system connected. Connect QuickBooks or Xero in Integrations.',
    };
  }
  try {
    if (qbConnected) {
      // TODO(composio-slug): verify QUICKBOOKS_GET_PROFIT_AND_LOSS_REPORT
      const data = await executeComposioAction<Record<string, unknown>>(
        ctx.userId,
        'quickbooks',
        'QUICKBOOKS_GET_PROFIT_AND_LOSS_REPORT',
        {},
      );
      const revenue = toNumber(
        (data as { total_revenue?: unknown; revenue_total?: unknown }).total_revenue ??
          (data as { revenue_total?: unknown }).revenue_total,
      );
      const expense = toNumber(
        (data as { total_expense?: unknown; expense_total?: unknown }).total_expense ??
          (data as { expense_total?: unknown }).expense_total,
      );
      const netIncome = toNumber(
        (data as { net_income?: unknown }).net_income,
        revenue - expense,
      );
      return {
        success: true,
        data: {
          source: 'quickbooks',
          revenue_total: Math.round(revenue * 100) / 100,
          expense_total: Math.round(expense * 100) / 100,
          net_income: Math.round(netIncome * 100) / 100,
          gross_margin_pct: revenue > 0 ? Math.round(((revenue - expense) / revenue) * 100) : 0,
          net_margin_pct: revenue > 0 ? Math.round((netIncome / revenue) * 100) : 0,
          period: 'MTD',
          raw: data,
        },
      };
    }
    // TODO(composio-slug): verify XERO_GET_PROFIT_AND_LOSS
    const data = await executeComposioAction<Record<string, unknown>>(
      ctx.userId,
      'xero',
      'XERO_GET_PROFIT_AND_LOSS',
      {},
    );
    const revenue = toNumber(
      (data as { total_revenue?: unknown; revenue_total?: unknown }).total_revenue ??
        (data as { revenue_total?: unknown }).revenue_total,
    );
    const expense = toNumber(
      (data as { total_expense?: unknown; expense_total?: unknown }).total_expense ??
        (data as { expense_total?: unknown }).expense_total,
    );
    const netIncome = toNumber(
      (data as { net_income?: unknown }).net_income,
      revenue - expense,
    );
    return {
      success: true,
      data: {
        source: 'xero',
        revenue_total: Math.round(revenue * 100) / 100,
        expense_total: Math.round(expense * 100) / 100,
        net_income: Math.round(netIncome * 100) / 100,
        gross_margin_pct: revenue > 0 ? Math.round(((revenue - expense) / revenue) * 100) : 0,
        net_margin_pct: revenue > 0 ? Math.round((netIncome / revenue) * 100) : 0,
        period: 'MTD',
        raw: data,
      },
    };
  } catch (err) {
    if (err instanceof ComposioNotConnectedError) {
      return { success: false, reason: `${err.toolSlug} not connected.` };
    }
    return fetchFailed('Accounting P&L');
  }
}

// --------------------- per-tool: get_payroll -----------------------------

/**
 * Gusto payroll MTD: total cost, employee count, contractor count.
 * Composio's GUSTO_LIST_PAYROLLS likely returns a list of payroll runs — we sum
 * net or gross pay for the current month.
 */
async function runGetPayroll(ctx: ExecutorContext): Promise<ToolResult> {
  if (!(await isComposioConnected(ctx.userId, 'gusto'))) {
    return {
      success: false,
      reason: 'Gusto is not connected. Connect it in Integrations to see payroll costs.',
    };
  }
  try {
    const monthStart = new Date(startOfMonthUnix() * 1000).toISOString().slice(0, 10);
    // TODO(composio-slug): verify GUSTO_LIST_PAYROLLS
    const payrollResp = await executeComposioAction<unknown>(
      ctx.userId,
      'gusto',
      'GUSTO_LIST_PAYROLLS',
      { start_date: monthStart },
    );
    const payrolls = asArray(payrollResp) as Array<{
      totals?: { gross_pay?: unknown; net_pay?: unknown; company_taxes?: unknown };
      employee_compensations?: unknown[];
    }>;
    let payrollTotal = 0;
    for (const p of payrolls) {
      payrollTotal += toNumber(p.totals?.gross_pay);
    }

    // TODO(composio-slug): verify GUSTO_LIST_EMPLOYEES
    const employeesResp = await safeExecuteComposioAction<unknown>(
      ctx.userId,
      'gusto',
      'GUSTO_LIST_EMPLOYEES',
      {},
    );
    const employees = asArray(employeesResp) as Array<{
      employment_status?: unknown;
      onboarded?: unknown;
    }>;
    const employeeCount = employees.filter(
      (e) => e.employment_status === 'active' || e.employment_status === undefined,
    ).length;

    // TODO(composio-slug): verify GUSTO_LIST_CONTRACTORS
    const contractorsResp = await safeExecuteComposioAction<unknown>(
      ctx.userId,
      'gusto',
      'GUSTO_LIST_CONTRACTORS',
      {},
    );
    const contractorCount = asArray(contractorsResp).length;

    return {
      success: true,
      data: {
        payroll_total_mtd: Math.round(payrollTotal * 100) / 100,
        employee_count: employeeCount,
        contractor_count: contractorCount,
        period: 'MTD',
        currency: 'USD',
      },
    };
  } catch (err) {
    if (err instanceof ComposioNotConnectedError) return notConnected('Gusto');
    return fetchFailed('Gusto');
  }
}

// --------------------- per-tool: get_overdue_invoices_detail -------------

async function runGetOverdueInvoicesDetail(ctx: ExecutorContext): Promise<ToolResult> {
  if (!(await isComposioConnected(ctx.userId, 'stripe'))) {
    return notConnected('Stripe');
  }
  try {
    const now = nowUnix();
    // TODO(composio-slug): verify STRIPE_LIST_INVOICES
    const resp = await executeComposioAction<unknown>(
      ctx.userId,
      'stripe',
      'STRIPE_LIST_INVOICES',
      { status: 'open', limit: 100 },
    );
    const invoices = asArray(resp) as Array<{
      customer?: unknown;
      customer_name?: unknown;
      amount_due?: unknown;
      due_date?: unknown;
    }>;

    // Best-effort customer name lookup
    // TODO(composio-slug): verify STRIPE_LIST_CUSTOMERS
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

    const overdue = invoices
      .filter((inv) => {
        const due = toNumber(inv.due_date);
        return due > 0 && due < now;
      })
      .map((inv) => {
        const due = toNumber(inv.due_date);
        const custId =
          typeof inv.customer === 'string'
            ? inv.customer
            : ((inv.customer as { id?: string } | null)?.id ?? '');
        const clientName =
          customersById.get(custId) ?? String(inv.customer_name ?? custId ?? 'unknown');
        return {
          client_name: clientName,
          amount_due: Math.round(toNumber(inv.amount_due)) / 100,
          days_overdue: due > 0 ? Math.max(0, Math.floor((now - due) / 86400)) : 0,
          due_date: due > 0 ? new Date(due * 1000).toISOString().slice(0, 10) : null,
        };
      });

    const totalAmount = overdue.reduce((s, i) => s + i.amount_due, 0);
    return {
      success: true,
      data: {
        invoices: overdue,
        total_amount: Math.round(totalAmount * 100) / 100,
        count: overdue.length,
        currency: 'USD',
      },
    };
  } catch (err) {
    if (err instanceof ComposioNotConnectedError) return notConnected('Stripe');
    return fetchFailed('Stripe overdue invoices');
  }
}

// --------------------- per-tool: get_burnout -----------------------------

/**
 * Burnout signals from Slack + Google Calendar. Returns partial data if only
 * one source is connected — burnout_risk_score is best-effort from what's
 * available.
 */
async function runGetBurnout(ctx: ExecutorContext): Promise<ToolResult> {
  const slackConnected = await isComposioConnected(ctx.userId, 'slack');
  const calendarConnected = await isComposioConnected(ctx.userId, 'google_calendar');
  if (!slackConnected && !calendarConnected) {
    return {
      success: false,
      reason:
        'No comms tools connected. Connect Slack and Google Calendar in Integrations for burnout signals.',
    };
  }

  let afterHoursPct: number | null = null;
  let avgMeetingsPerDay: number | null = null;
  let deepWorkHoursPerDay: number | null = null;

  if (slackConnected) {
    try {
      // TODO(composio-slug): verify SLACK_LIST_MESSAGES
      const resp = await executeComposioAction<unknown>(
        ctx.userId,
        'slack',
        'SLACK_LIST_MESSAGES',
        { limit: 200 },
      );
      const msgs = asArray(resp) as Array<{ ts?: unknown }>;
      let afterHoursCount = 0;
      for (const m of msgs) {
        const ts = toNumber(m.ts);
        if (ts <= 0) continue;
        const hour = new Date(ts * 1000).getHours();
        if (hour < 8 || hour >= 19) afterHoursCount += 1;
      }
      afterHoursPct = msgs.length > 0 ? Math.round((afterHoursCount / msgs.length) * 1000) / 10 : 0;
    } catch {
      // best-effort
    }
  }

  if (calendarConnected) {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400 * 1000).toISOString();
      // TODO(composio-slug): verify GOOGLECALENDAR_LIST_EVENTS
      const resp = await executeComposioAction<unknown>(
        ctx.userId,
        'google_calendar',
        'GOOGLECALENDAR_LIST_EVENTS',
        { timeMin: sevenDaysAgo, timeMax: now.toISOString(), maxResults: 250 },
      );
      const events = asArray(resp) as Array<{
        start?: { dateTime?: unknown };
        end?: { dateTime?: unknown };
      }>;
      avgMeetingsPerDay = Math.round((events.length / 7) * 10) / 10;
      let meetingHours = 0;
      for (const e of events) {
        const startMs = Date.parse(String(e.start?.dateTime ?? '')) || 0;
        const endMs = Date.parse(String(e.end?.dateTime ?? '')) || 0;
        if (startMs > 0 && endMs > startMs) {
          meetingHours += (endMs - startMs) / 3600000;
        }
      }
      const workingHoursPerWeek = 8 * 5;
      deepWorkHoursPerDay =
        Math.round(Math.max(0, workingHoursPerWeek - meetingHours) / 5 * 10) / 10;
    } catch {
      // best-effort
    }
  }

  let risk = 0;
  if (afterHoursPct !== null && afterHoursPct > 15) risk += 35;
  if (avgMeetingsPerDay !== null && avgMeetingsPerDay > 5) risk += 35;
  if (deepWorkHoursPerDay !== null && deepWorkHoursPerDay < 2) risk += 30;
  const burnoutRiskScore = Math.min(100, risk);

  return {
    success: true,
    data: {
      after_hours_message_pct: afterHoursPct,
      avg_meetings_per_day: avgMeetingsPerDay,
      deep_work_hours_per_day: deepWorkHoursPerDay,
      burnout_risk_score: burnoutRiskScore,
      sources: {
        slack: slackConnected,
        google_calendar: calendarConnected,
      },
    },
  };
}

// --------------------- per-tool: get_team_capacity -----------------------

/**
 * BambooHR headcount + PTOs combined with Harvest billable hours.
 */
async function runGetTeamCapacity(ctx: ExecutorContext): Promise<ToolResult> {
  const bambooConnected = await isComposioConnected(ctx.userId, 'bamboo_hr');
  const harvestConnected = await isComposioConnected(ctx.userId, 'harvest');
  if (!bambooConnected && !harvestConnected) {
    return {
      success: false,
      reason:
        'Neither BambooHR nor Harvest is connected. Connect them in Integrations for team capacity.',
    };
  }

  let headcount: number | null = null;
  let ptosThisMonth: number | null = null;
  let billableHoursPct: number | null = null;
  let utilizationPct: number | null = null;

  if (bambooConnected) {
    try {
      // TODO(composio-slug): verify BAMBOOHR_LIST_EMPLOYEES
      const resp = await executeComposioAction<unknown>(
        ctx.userId,
        'bamboo_hr',
        'BAMBOOHR_LIST_EMPLOYEES',
        {},
      );
      const employees = asArray(resp) as Array<{ status?: unknown; employmentStatus?: unknown }>;
      headcount = employees.filter((e) => {
        const status = String(e.status ?? e.employmentStatus ?? '').toLowerCase();
        return status === '' || status === 'active';
      }).length;

      // TODO(composio-slug): verify BAMBOOHR_LIST_TIME_OFF_REQUESTS
      const ptoResp = await safeExecuteComposioAction<unknown>(
        ctx.userId,
        'bamboo_hr',
        'BAMBOOHR_LIST_TIME_OFF_REQUESTS',
        { start: new Date(startOfMonthUnix() * 1000).toISOString().slice(0, 10) },
      );
      ptosThisMonth = asArray(ptoResp).length;
    } catch {
      // best-effort
    }
  }

  if (harvestConnected) {
    try {
      const monthStart = startOfMonthUnix();
      // TODO(composio-slug): verify HARVEST_LIST_TIME_ENTRIES
      const resp = await executeComposioAction<unknown>(
        ctx.userId,
        'harvest',
        'HARVEST_LIST_TIME_ENTRIES',
        { from: new Date(monthStart * 1000).toISOString().slice(0, 10) },
      );
      const entries = asArray(resp) as Array<{ hours?: unknown; billable?: unknown }>;
      const totalHours = entries.reduce((s, e) => s + toNumber(e.hours), 0);
      const billableHours = entries
        .filter((e) => e.billable === true)
        .reduce((s, e) => s + toNumber(e.hours), 0);
      billableHoursPct = totalHours > 0 ? Math.round((billableHours / totalHours) * 1000) / 10 : 0;
      const capacity = (headcount ?? teamSizeMin(ctx.teamSizeRaw) ?? 0) * 160;
      utilizationPct = capacity > 0 ? Math.round((totalHours / capacity) * 100) : null;
    } catch {
      // best-effort
    }
  }

  return {
    success: true,
    data: {
      headcount,
      billable_hours_pct: billableHoursPct,
      utilization_pct: utilizationPct,
      ptos_this_month: ptosThisMonth,
      sources: {
        bamboo_hr: bambooConnected,
        harvest: harvestConnected,
      },
    },
  };
}

// --------------------- per-tool: get_inbox -------------------------------

async function runGetInbox(ctx: ExecutorContext): Promise<ToolResult> {
  if (!(await isComposioConnected(ctx.userId, 'gmail'))) {
    return {
      success: false,
      reason: 'Gmail is not connected. Connect it in Integrations to see inbox status.',
    };
  }
  try {
    // TODO(composio-slug): verify GMAIL_LIST_THREADS
    const unreadResp = await executeComposioAction<unknown>(
      ctx.userId,
      'gmail',
      'GMAIL_LIST_THREADS',
      { q: 'is:unread newer_than:7d', maxResults: 100 },
    );
    const unreadCount = asArray(unreadResp).length;

    // TODO(composio-slug): verify GMAIL_LIST_DRAFTS
    const draftsResp = await safeExecuteComposioAction<unknown>(
      ctx.userId,
      'gmail',
      'GMAIL_LIST_DRAFTS',
      { maxResults: 50 },
    );
    const draftsCount = asArray(draftsResp).length;

    // Look up clients with overdue invoices and match thread subjects best-effort
    let threadsWithOverdueClients = 0;
    if (await isComposioConnected(ctx.userId, 'stripe')) {
      try {
        const now = nowUnix();
        // TODO(composio-slug): verify STRIPE_LIST_INVOICES
        const stripeResp = await safeExecuteComposioAction<unknown>(
          ctx.userId,
          'stripe',
          'STRIPE_LIST_INVOICES',
          { status: 'open', limit: 100 },
        );
        const overdueCustomerIds = new Set<string>();
        for (const inv of asArray(stripeResp)) {
          const i = inv as { customer?: unknown; due_date?: unknown };
          const due = toNumber(i.due_date);
          if (due > 0 && due < now) {
            const id =
              typeof i.customer === 'string'
                ? i.customer
                : ((i.customer as { id?: string } | null)?.id ?? '');
            if (id) overdueCustomerIds.add(id);
          }
        }
        threadsWithOverdueClients = overdueCustomerIds.size;
      } catch {
        // best-effort
      }
    }

    return {
      success: true,
      data: {
        unread_count: unreadCount,
        drafts_count: draftsCount,
        threads_with_overdue_clients: threadsWithOverdueClients,
      },
    };
  } catch (err) {
    if (err instanceof ComposioNotConnectedError) return notConnected('Gmail');
    return fetchFailed('Gmail');
  }
}

// --------------------- per-tool: get_web_traffic -------------------------

async function runGetWebTraffic(ctx: ExecutorContext): Promise<ToolResult> {
  if (!(await isComposioConnected(ctx.userId, 'google_analytics'))) {
    return {
      success: false,
      reason:
        'Google Analytics is not connected. Connect it in Integrations to see traffic data.',
    };
  }
  try {
    // TODO(composio-slug): verify GOOGLEANALYTICS_RUN_REPORT
    const resp = await executeComposioAction<Record<string, unknown>>(
      ctx.userId,
      'google_analytics',
      'GOOGLEANALYTICS_RUN_REPORT',
      {
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'conversions' }],
        dimensions: [{ name: 'sessionDefaultChannelGrouping' }],
      },
    );

    const rows = asArray((resp as { rows?: unknown }).rows ?? resp) as Array<{
      dimensionValues?: Array<{ value?: unknown }>;
      metricValues?: Array<{ value?: unknown }>;
    }>;

    let totalSessions = 0;
    let totalUsers = 0;
    let totalConversions = 0;
    const channels: Array<{ name: string; sessions: number; conversions: number }> = [];
    for (const r of rows) {
      const name = String(r.dimensionValues?.[0]?.value ?? 'unknown');
      const sessions = toNumber(r.metricValues?.[0]?.value);
      const users = toNumber(r.metricValues?.[1]?.value);
      const conversions = toNumber(r.metricValues?.[2]?.value);
      totalSessions += sessions;
      totalUsers += users;
      totalConversions += conversions;
      channels.push({ name, sessions, conversions });
    }
    channels.sort((a, b) => b.sessions - a.sessions);

    return {
      success: true,
      data: {
        sessions: totalSessions,
        users: totalUsers,
        conversions: totalConversions,
        top_channels: channels.slice(0, 5),
        period: 'last 30 days',
      },
    };
  } catch (err) {
    if (err instanceof ComposioNotConnectedError) return notConnected('Google Analytics');
    return fetchFailed('Google Analytics');
  }
}

// --------------------- per-tool: get_ad_performance ----------------------

/**
 * Aggregates Google Ads, Facebook Ads, and LinkedIn Ads insights. Partial OK —
 * we return whichever are connected.
 */
async function runGetAdPerformance(ctx: ExecutorContext): Promise<ToolResult> {
  const googleAdsConnected = await isComposioConnected(ctx.userId, 'google_ads');
  const fbAdsConnected = await isComposioConnected(ctx.userId, 'facebook_ads');
  const linkedinConnected = await isComposioConnected(ctx.userId, 'linkedin');
  if (!googleAdsConnected && !fbAdsConnected && !linkedinConnected) {
    return {
      success: false,
      reason:
        'No ad platforms connected. Connect Google Ads, Facebook Ads, or LinkedIn in Integrations.',
    };
  }

  const channels: Array<{
    name: string;
    spend_30d: number;
    conversions: number;
    roas: number | null;
  }> = [];

  if (googleAdsConnected) {
    try {
      // TODO(composio-slug): verify GOOGLEADS_GET_CAMPAIGN_PERFORMANCE
      const resp = await executeComposioAction<unknown>(
        ctx.userId,
        'google_ads',
        'GOOGLEADS_GET_CAMPAIGN_PERFORMANCE',
        { dateRange: 'LAST_30_DAYS' },
      );
      const rows = asArray(resp) as Array<{
        cost_micros?: unknown;
        cost?: unknown;
        conversions?: unknown;
        conversions_value?: unknown;
      }>;
      const spend = rows.reduce(
        (s, r) => s + (toNumber(r.cost_micros) / 1_000_000 || toNumber(r.cost)),
        0,
      );
      const conversions = rows.reduce((s, r) => s + toNumber(r.conversions), 0);
      const convValue = rows.reduce((s, r) => s + toNumber(r.conversions_value), 0);
      channels.push({
        name: 'google_ads',
        spend_30d: Math.round(spend * 100) / 100,
        conversions: Math.round(conversions * 10) / 10,
        roas: spend > 0 ? Math.round((convValue / spend) * 100) / 100 : null,
      });
    } catch {
      // best-effort
    }
  }

  if (fbAdsConnected) {
    try {
      // TODO(composio-slug): verify FACEBOOKADS_GET_INSIGHTS
      const resp = await executeComposioAction<unknown>(
        ctx.userId,
        'facebook_ads',
        'FACEBOOKADS_GET_INSIGHTS',
        { date_preset: 'last_30d', fields: ['spend', 'actions', 'action_values'] },
      );
      const rows = asArray(resp) as Array<{
        spend?: unknown;
        actions?: Array<{ action_type?: unknown; value?: unknown }>;
        action_values?: Array<{ action_type?: unknown; value?: unknown }>;
      }>;
      const spend = rows.reduce((s, r) => s + toNumber(r.spend), 0);
      const conversions = rows.reduce(
        (s, r) =>
          s +
          (r.actions ?? [])
            .filter((a) => String(a.action_type ?? '').includes('purchase') || String(a.action_type ?? '').includes('lead'))
            .reduce((ss, a) => ss + toNumber(a.value), 0),
        0,
      );
      const convValue = rows.reduce(
        (s, r) =>
          s +
          (r.action_values ?? []).reduce((ss, a) => ss + toNumber(a.value), 0),
        0,
      );
      channels.push({
        name: 'facebook_ads',
        spend_30d: Math.round(spend * 100) / 100,
        conversions: Math.round(conversions * 10) / 10,
        roas: spend > 0 ? Math.round((convValue / spend) * 100) / 100 : null,
      });
    } catch {
      // best-effort
    }
  }

  if (linkedinConnected) {
    try {
      // TODO(composio-slug): verify LINKEDIN_GET_ADS_INSIGHTS
      const resp = await executeComposioAction<unknown>(
        ctx.userId,
        'linkedin',
        'LINKEDIN_GET_ADS_INSIGHTS',
        { dateRange: 'LAST_30_DAYS' },
      );
      const rows = asArray(resp) as Array<{
        costInLocalCurrency?: unknown;
        cost?: unknown;
        externalWebsiteConversions?: unknown;
        conversionValueInLocalCurrency?: unknown;
      }>;
      const spend = rows.reduce(
        (s, r) => s + toNumber(r.costInLocalCurrency ?? r.cost),
        0,
      );
      const conversions = rows.reduce(
        (s, r) => s + toNumber(r.externalWebsiteConversions),
        0,
      );
      const convValue = rows.reduce(
        (s, r) => s + toNumber(r.conversionValueInLocalCurrency),
        0,
      );
      channels.push({
        name: 'linkedin',
        spend_30d: Math.round(spend * 100) / 100,
        conversions: Math.round(conversions * 10) / 10,
        roas: spend > 0 ? Math.round((convValue / spend) * 100) / 100 : null,
      });
    } catch {
      // best-effort
    }
  }

  const totalSpend = channels.reduce((s, c) => s + c.spend_30d, 0);
  const totalConversions = channels.reduce((s, c) => s + c.conversions, 0);
  const weightedRevenue = channels.reduce(
    (s, c) => s + (c.roas != null ? c.roas * c.spend_30d : 0),
    0,
  );
  const blendedRoas = totalSpend > 0 ? Math.round((weightedRevenue / totalSpend) * 100) / 100 : null;

  return {
    success: true,
    data: {
      channels,
      total_spend: Math.round(totalSpend * 100) / 100,
      total_conversions: Math.round(totalConversions * 10) / 10,
      blended_roas: blendedRoas,
      period: 'last 30 days',
    },
  };
}

// --------------------- per-tool: get_contracts ---------------------------

async function runGetContracts(ctx: ExecutorContext): Promise<ToolResult> {
  if (!(await isComposioConnected(ctx.userId, 'docusign'))) {
    return {
      success: false,
      reason:
        'DocuSign is not connected. Connect it in Integrations to see contract expirations.',
    };
  }
  try {
    // TODO(composio-slug): verify DOCUSIGN_LIST_ENVELOPES
    const resp = await executeComposioAction<unknown>(
      ctx.userId,
      'docusign',
      'DOCUSIGN_LIST_ENVELOPES',
      { status: 'completed', from_date: '2024-01-01' },
    );
    const envelopes = asArray(resp) as Array<{
      emailSubject?: unknown;
      recipients?: { signers?: Array<{ name?: unknown; email?: unknown }> } | null;
      completedDateTime?: unknown;
      expireDateTime?: unknown;
      customFields?: { textCustomFields?: Array<{ name?: unknown; value?: unknown }> };
    }>;

    const now = Date.now();
    const contracts = envelopes.map((env) => {
      const signedMs = Date.parse(String(env.completedDateTime ?? '')) || 0;
      let expiryMs = Date.parse(String(env.expireDateTime ?? '')) || 0;
      // If no explicit expiry, assume 1-year contract from signed date
      if (!expiryMs && signedMs) {
        expiryMs = signedMs + 365 * 86400 * 1000;
      }
      const valueField = (env.customFields?.textCustomFields ?? []).find((f) =>
        String(f.name ?? '').toLowerCase().includes('value'),
      );
      return {
        client_name: String(
          env.recipients?.signers?.[0]?.name ??
            env.recipients?.signers?.[0]?.email ??
            env.emailSubject ??
            'unknown',
        ),
        signed_date: signedMs ? new Date(signedMs).toISOString().slice(0, 10) : null,
        expiry_date: expiryMs ? new Date(expiryMs).toISOString().slice(0, 10) : null,
        days_to_expiry: expiryMs ? Math.floor((expiryMs - now) / 86400000) : null,
        value: toNumber(valueField?.value),
      };
    });

    const countUnder60d = contracts.filter(
      (c) => c.days_to_expiry != null && c.days_to_expiry >= 0 && c.days_to_expiry <= 60,
    ).length;
    const countUnder90d = contracts.filter(
      (c) => c.days_to_expiry != null && c.days_to_expiry >= 0 && c.days_to_expiry <= 90,
    ).length;

    return {
      success: true,
      data: {
        contracts: contracts
          .filter((c) => c.days_to_expiry != null && c.days_to_expiry >= 0)
          .sort((a, b) => (a.days_to_expiry ?? Infinity) - (b.days_to_expiry ?? Infinity))
          .slice(0, 50),
        count_under_60d: countUnder60d,
        count_under_90d: countUnder90d,
      },
    };
  } catch (err) {
    if (err instanceof ComposioNotConnectedError) return notConnected('DocuSign');
    return fetchFailed('DocuSign');
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
    case 'get_real_pnl':
      return runGetRealPnl(ctx);
    case 'get_payroll':
      return runGetPayroll(ctx);
    case 'get_overdue_invoices_detail':
      return runGetOverdueInvoicesDetail(ctx);
    case 'get_burnout':
      return runGetBurnout(ctx);
    case 'get_team_capacity':
      return runGetTeamCapacity(ctx);
    case 'get_inbox':
      return runGetInbox(ctx);
    case 'get_web_traffic':
      return runGetWebTraffic(ctx);
    case 'get_ad_performance':
      return runGetAdPerformance(ctx);
    case 'get_contracts':
      return runGetContracts(ctx);
    case 'queue_action':
      return runQueueAction(args, ctx);
    default:
      return { success: false, reason: `Unknown tool: ${name}` };
  }
}
