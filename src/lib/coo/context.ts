// src/lib/coo/context.ts
//
// Pre-computed dashboard context that the COO chat can fold into its system
// prompt. Post-Composio-OAuth this fetches per-tool data via
// `executeComposioAction(userId, …)` instead of decrypted-key adapters.
//
// Currently no caller in the codebase imports `buildCooContext` directly — the
// route builds its own prompt — but the type contract is kept so it's ready to
// be wired up by the next iteration of the system-prompt builder.

import {
  executeComposioAction,
  safeExecuteComposioAction,
  isComposioConnected,
  ComposioNotConnectedError,
} from '<npm>/lib/composio-fetch'
import { computeClientProfitability } from '<npm>/lib/profitability'
import type {
  StripePerClientData,
  StripeClientRevenue,
  HarvestPerClientData,
  HarvestClientHours,
} from '<npm>/lib/integration-types'

export type AgencyOverview = {
  company_name: string
  active_clients: number
  total_revenue_mtd: number
  median_margin_pct: number | null
  clients_below_breakeven: number
  overdue_invoices: { count: number; total_usd: number }
  connected_tools: string[]
}

export type CashFlowOutlook = {
  open_invoices_total_usd: number
  open_invoices_due_next_30d_usd: number
  avg_days_to_pay: number | null
}

export type CapacityStatus = {
  team_size_raw: string
  estimated_monthly_capacity_hours: number | null
  hours_tracked_this_month: number | null
  utilization_pct: number | null
  available_hours: number | null
}

export type RateAdvice = {
  current_blended_rate_usd: number
  median_client_margin_pct: number | null
  suggested_rate_usd: number | null
  annual_impact_usd: number | null
  clients_to_reprice: Array<{ name: string; margin_pct: number }>
}

export type CooContext = {
  overview: AgencyOverview
  cash_flow: CashFlowOutlook
  capacity: CapacityStatus
  rate_advice: RateAdvice
  pending_actions_count: number
}

function teamSizeMin(raw: string): number | null {
  if (!raw) return null
  if (raw === '1') return 1
  const m = raw.match(/^(\d+)/)
  return m ? parseInt(m[1]!) : null
}

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function asArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v
  if (v && typeof v === 'object' && 'data' in v && Array.isArray((v as { data: unknown }).data)) {
    return (v as { data: unknown[] }).data
  }
  return []
}

function startOfMonthUnix(): number {
  const d = new Date()
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), 1).getTime() / 1000)
}

/**
 * Fetch Stripe paid-invoices + customers via Composio and reshape to the
 * legacy `StripePerClientData` shape. Returns null when Stripe isn't connected.
 *
 * Simplification vs legacy adapter: no prior-month window. `revenue_prior` is
 * always 0 — margin-trend in `computeClientProfitability` will degrade to "no
 * prior data".
 */
async function fetchStripePerClientViaComposio(
  userId: string,
): Promise<StripePerClientData | null> {
  if (!(await isComposioConnected(userId, 'stripe'))) return null
  try {
    const monthStart = startOfMonthUnix()
    // TODO(composio-slug): verify slug — Stripe paid invoices MTD
    const invoicesResp = await executeComposioAction<unknown>(
      userId,
      'stripe',
      'STRIPE_LIST_INVOICES',
      { status: 'paid', created: { gte: monthStart }, limit: 100 },
    )
    const invoices = asArray(invoicesResp) as Array<{
      customer?: unknown
      amount_paid?: unknown
    }>
    // TODO(composio-slug): verify slug — Stripe customers list
    const customersResp = await safeExecuteComposioAction<unknown>(
      userId,
      'stripe',
      'STRIPE_LIST_CUSTOMERS',
      { limit: 100 },
    )
    const customersById = new Map<string, string>()
    for (const c of asArray(customersResp)) {
      const obj = c as { id?: unknown; name?: unknown; email?: unknown }
      if (typeof obj.id === 'string') {
        customersById.set(obj.id, String(obj.name ?? obj.email ?? obj.id))
      }
    }

    const byId = new Map<string, { name: string; revenue: number }>()
    for (const inv of invoices) {
      const custId =
        typeof inv.customer === 'string'
          ? inv.customer
          : ((inv.customer as { id?: string } | null)?.id ?? '')
      if (!custId) continue
      const name = customersById.get(custId) ?? custId
      const amount = toNumber(inv.amount_paid) / 100
      const entry = byId.get(custId) ?? { name, revenue: 0 }
      entry.revenue += amount
      byId.set(custId, entry)
    }
    return {
      clients: Array.from(byId.entries()).map(([id, v]): StripeClientRevenue => ({
        id,
        name: v.name,
        revenue_current: v.revenue,
        revenue_prior: 0,
        payment_status: 'unknown',
        days_overdue: null,
      })),
      currency: 'USD',
    }
  } catch (err) {
    if (err instanceof ComposioNotConnectedError) return null
    return null
  }
}

/**
 * Harvest per-client hours via Composio. Returns null when Harvest isn't connected.
 * Simplification: no prior-month window.
 */
async function fetchHarvestPerClientViaComposio(
  userId: string,
): Promise<HarvestPerClientData | null> {
  if (!(await isComposioConnected(userId, 'harvest'))) return null
  try {
    const monthStart = startOfMonthUnix()
    // TODO(composio-slug): verify slug — Harvest time entries since month start
    const resp = await executeComposioAction<unknown>(
      userId,
      'harvest',
      'HARVEST_LIST_TIME_ENTRIES',
      { from: new Date(monthStart * 1000).toISOString().slice(0, 10) },
    )
    const entries = asArray(resp) as Array<{
      hours?: unknown
      client?: { name?: unknown } | null
    }>
    const map = new Map<string, number>()
    for (const e of entries) {
      const name = String(e.client?.name ?? '').trim()
      if (!name) continue
      map.set(name, (map.get(name) ?? 0) + toNumber(e.hours))
    }
    return {
      clients: Array.from(map.entries()).map(([name, hours]): HarvestClientHours => ({
        name,
        hours_current: hours,
        hours_prior: 0,
      })),
    }
  } catch (err) {
    if (err instanceof ComposioNotConnectedError) return null
    return null
  }
}

async function fetchOverview(
  userId: string,
  blendedRate: number,
  companyName: string,
  connectedTools: string[],
): Promise<AgencyOverview> {
  let activeClients = 0
  let totalRevenue = 0
  let medianMargin: number | null = null
  let belowBreakeven = 0
  let overdueCount = 0
  let overdueTotal = 0

  const [stripeData, harvestData] = await Promise.all([
    fetchStripePerClientViaComposio(userId),
    fetchHarvestPerClientViaComposio(userId),
  ])

  if (stripeData && harvestData) {
    try {
      const result = computeClientProfitability(stripeData, harvestData, blendedRate)
      activeClients = result.clients.length
      totalRevenue = result.clients.reduce((s, c) => s + c.revenue_mtd, 0)
      belowBreakeven = result.clients.filter((c) => c.margin_pct < 0).length
      const margins = result.clients.map((c) => c.margin_pct).filter(Number.isFinite).sort((a, b) => a - b)
      if (margins.length) medianMargin = margins[Math.floor(margins.length / 2)]!
    } catch { /* best effort */ }
  }

  // Overdue invoices from Stripe (open + due_date < now)
  if (await isComposioConnected(userId, 'stripe')) {
    try {
      const now = Math.floor(Date.now() / 1000)
      // TODO(composio-slug): verify slug — Stripe open invoices
      const resp = await executeComposioAction<unknown>(
        userId,
        'stripe',
        'STRIPE_LIST_INVOICES',
        { status: 'open', limit: 50 },
      )
      const open = asArray(resp) as Array<{ due_date?: unknown; amount_due?: unknown }>
      const overdue = open.filter((inv) => {
        const due = toNumber(inv.due_date)
        return due > 0 && due < now
      })
      overdueCount = overdue.length
      overdueTotal = overdue.reduce((s, inv) => s + toNumber(inv.amount_due) / 100, 0)
    } catch { /* best effort */ }
  }

  return {
    company_name: companyName,
    active_clients: activeClients,
    total_revenue_mtd: totalRevenue,
    median_margin_pct: medianMargin,
    clients_below_breakeven: belowBreakeven,
    overdue_invoices: { count: overdueCount, total_usd: overdueTotal },
    connected_tools: connectedTools,
  }
}

async function fetchCashFlow(userId: string): Promise<CashFlowOutlook> {
  if (!(await isComposioConnected(userId, 'stripe'))) {
    return { open_invoices_total_usd: 0, open_invoices_due_next_30d_usd: 0, avg_days_to_pay: null }
  }
  try {
    const now = Math.floor(Date.now() / 1000)
    const in30d = now + 30 * 24 * 60 * 60
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60

    const [openResp, paidResp] = await Promise.all([
      // TODO(composio-slug): verify slug — Stripe open invoices
      executeComposioAction<unknown>(userId, 'stripe', 'STRIPE_LIST_INVOICES', { status: 'open', limit: 50 }),
      // TODO(composio-slug): verify slug — Stripe paid invoices last 90 days
      executeComposioAction<unknown>(userId, 'stripe', 'STRIPE_LIST_INVOICES', {
        status: 'paid',
        created: { gte: ninetyDaysAgo },
        limit: 100,
      }),
    ])

    const open = asArray(openResp) as Array<{ due_date?: unknown; amount_due?: unknown }>
    const paid = asArray(paidResp) as Array<{
      created?: unknown
      status_transitions?: { paid_at?: unknown }
    }>

    const openTotal = open.reduce((s, inv) => s + toNumber(inv.amount_due) / 100, 0)
    const dueSoon = open
      .filter((inv) => {
        const due = toNumber(inv.due_date)
        return due > 0 && due <= in30d
      })
      .reduce((s, inv) => s + toNumber(inv.amount_due) / 100, 0)

    const daysToPay: number[] = []
    for (const inv of paid) {
      const paidAt = toNumber(inv.status_transitions?.paid_at)
      const created = toNumber(inv.created)
      if (created > 0 && paidAt > 0) {
        daysToPay.push((paidAt - created) / 86400)
      }
    }
    const avgDays = daysToPay.length
      ? Math.round(daysToPay.reduce((s, d) => s + d, 0) / daysToPay.length)
      : null

    return {
      open_invoices_total_usd: openTotal,
      open_invoices_due_next_30d_usd: dueSoon,
      avg_days_to_pay: avgDays,
    }
  } catch {
    return { open_invoices_total_usd: 0, open_invoices_due_next_30d_usd: 0, avg_days_to_pay: null }
  }
}

async function fetchCapacity(
  userId: string,
  teamSizeRaw: string,
): Promise<CapacityStatus> {
  const minSize = teamSizeMin(teamSizeRaw)
  const capacityHours = minSize ? minSize * 160 : null

  if (!capacityHours || !(await isComposioConnected(userId, 'harvest'))) {
    return {
      team_size_raw: teamSizeRaw || 'not set',
      estimated_monthly_capacity_hours: capacityHours,
      hours_tracked_this_month: null,
      utilization_pct: null,
      available_hours: null,
    }
  }

  try {
    const harvestData = await fetchHarvestPerClientViaComposio(userId)
    const totalHours = (harvestData?.clients ?? []).reduce((s, c) => s + c.hours_current, 0)
    const util = Math.round((totalHours / capacityHours) * 100)
    return {
      team_size_raw: teamSizeRaw,
      estimated_monthly_capacity_hours: capacityHours,
      hours_tracked_this_month: Math.round(totalHours * 10) / 10,
      utilization_pct: util,
      available_hours: Math.round(capacityHours - totalHours),
    }
  } catch {
    return {
      team_size_raw: teamSizeRaw || 'not set',
      estimated_monthly_capacity_hours: capacityHours,
      hours_tracked_this_month: null,
      utilization_pct: null,
      available_hours: null,
    }
  }
}

async function fetchRateAdvice(
  userId: string,
  blendedRate: number,
): Promise<RateAdvice> {
  let medianMargin: number | null = null
  let clientsToReprice: Array<{ name: string; margin_pct: number }> = []
  let totalHours = 0

  const [stripeData, harvestData] = await Promise.all([
    fetchStripePerClientViaComposio(userId),
    fetchHarvestPerClientViaComposio(userId),
  ])

  if (stripeData && harvestData) {
    try {
      const result = computeClientProfitability(stripeData, harvestData, blendedRate)
      totalHours = result.clients.reduce((s, c) => s + c.hours_mtd, 0)
      clientsToReprice = result.clients
        .filter((c) => c.margin_pct < 20 && c.revenue_mtd > 0)
        .map((c) => ({ name: c.name, margin_pct: Math.round(c.margin_pct) }))
        .sort((a, b) => a.margin_pct - b.margin_pct)
        .slice(0, 5)
      const margins = result.clients.map((c) => c.margin_pct).filter(Number.isFinite).sort((a, b) => a - b)
      if (margins.length) medianMargin = margins[Math.floor(margins.length / 2)]!
    } catch { /* best effort */ }
  }

  let suggestedRate: number | null = null
  let annualImpact: number | null = null
  if (medianMargin !== null && medianMargin < 25) {
    const targetMargin = 0.30
    const currentCostRate = blendedRate * (1 - medianMargin / 100)
    suggestedRate = Math.ceil(currentCostRate / (1 - targetMargin) / 5) * 5
    if (totalHours > 0) {
      annualImpact = Math.round((suggestedRate - blendedRate) * totalHours * 12)
    }
  }

  return {
    current_blended_rate_usd: blendedRate,
    median_client_margin_pct: medianMargin !== null ? Math.round(medianMargin) : null,
    suggested_rate_usd: suggestedRate,
    annual_impact_usd: annualImpact,
    clients_to_reprice: clientsToReprice,
  }
}

export async function buildCooContext(opts: {
  userId: string
  blendedRate: number
  companyName: string
  teamSizeRaw: string
  connectedTools: string[]
  pendingActionsCount: number
}): Promise<CooContext> {
  const { userId, blendedRate, companyName, teamSizeRaw, connectedTools, pendingActionsCount } = opts

  const [overview, cashFlow, capacity, rateAdvice] = await Promise.all([
    fetchOverview(userId, blendedRate, companyName, connectedTools),
    fetchCashFlow(userId),
    fetchCapacity(userId, teamSizeRaw),
    fetchRateAdvice(userId, blendedRate),
  ])

  return { overview, cash_flow: cashFlow, capacity, rate_advice: rateAdvice, pending_actions_count: pendingActionsCount }
}
