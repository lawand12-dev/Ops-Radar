import Stripe from 'stripe'
import { computeClientProfitability } from '<npm>/lib/profitability'
import { fetchStripePerClientRevenue } from '<npm>/lib/integrations/stripe/profitability-adapter'
import { fetchHarvestPerClientHours } from '<npm>/lib/integrations/harvest/profitability-adapter'

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

async function fetchOverview(
  stripeApiKey: string | null,
  harvestApiKey: string | null,
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

  if (stripeApiKey && harvestApiKey) {
    try {
      const [sd, hd] = await Promise.all([
        fetchStripePerClientRevenue(stripeApiKey),
        fetchHarvestPerClientHours(harvestApiKey),
      ])
      const result = computeClientProfitability(sd, hd, blendedRate)
      activeClients = result.clients.length
      totalRevenue = result.clients.reduce((s, c) => s + c.revenue_mtd, 0)
      belowBreakeven = result.clients.filter((c) => c.margin_pct < 0).length
      const margins = result.clients.map((c) => c.margin_pct).filter(Number.isFinite).sort((a, b) => a - b)
      if (margins.length) medianMargin = margins[Math.floor(margins.length / 2)]!
    } catch { /* best effort */ }
  }

  if (stripeApiKey) {
    try {
      const stripe = new Stripe(stripeApiKey, { typescript: true, maxNetworkRetries: 2 })
      const now = Math.floor(Date.now() / 1000)
      const resp = await stripe.invoices.list({ status: 'open', limit: 50 })
      const overdue = resp.data.filter((inv) => inv.due_date && inv.due_date < now)
      overdueCount = overdue.length
      overdueTotal = overdue.reduce((s, inv) => s + (inv.amount_due ?? 0) / 100, 0)
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

async function fetchCashFlow(stripeApiKey: string | null): Promise<CashFlowOutlook> {
  if (!stripeApiKey) {
    return { open_invoices_total_usd: 0, open_invoices_due_next_30d_usd: 0, avg_days_to_pay: null }
  }
  try {
    const stripe = new Stripe(stripeApiKey, { typescript: true, maxNetworkRetries: 2 })
    const now = Math.floor(Date.now() / 1000)
    const in30d = now + 30 * 24 * 60 * 60

    const [openResp, paidResp] = await Promise.all([
      stripe.invoices.list({ status: 'open', limit: 50 }),
      stripe.invoices.list({ status: 'paid', created: { gte: now - 90 * 24 * 60 * 60 }, limit: 100 }),
    ])

    const openTotal = openResp.data.reduce((s, inv) => s + (inv.amount_due ?? 0) / 100, 0)
    const dueSoon = openResp.data
      .filter((inv) => inv.due_date && inv.due_date <= in30d)
      .reduce((s, inv) => s + (inv.amount_due ?? 0) / 100, 0)

    const daysToPay: number[] = []
    for (const inv of paidResp.data) {
      const paidAt = inv.status_transitions?.paid_at
      if (inv.created && typeof paidAt === 'number') {
        daysToPay.push((paidAt - inv.created) / 86400)
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
  harvestApiKey: string | null,
  teamSizeRaw: string,
): Promise<CapacityStatus> {
  const minSize = teamSizeMin(teamSizeRaw)
  const capacityHours = minSize ? minSize * 160 : null

  if (!harvestApiKey || !capacityHours) {
    return {
      team_size_raw: teamSizeRaw || 'not set',
      estimated_monthly_capacity_hours: capacityHours,
      hours_tracked_this_month: null,
      utilization_pct: null,
      available_hours: null,
    }
  }

  try {
    const harvestData = await fetchHarvestPerClientHours(harvestApiKey)
    const totalHours = harvestData.clients.reduce((s, c) => s + c.hours_current, 0)
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
  stripeApiKey: string | null,
  harvestApiKey: string | null,
  blendedRate: number,
  teamSizeRaw: string,
): Promise<RateAdvice> {
  let medianMargin: number | null = null
  let clientsToReprice: Array<{ name: string; margin_pct: number }> = []
  let totalHours = 0

  if (stripeApiKey && harvestApiKey) {
    try {
      const [sd, hd] = await Promise.all([
        fetchStripePerClientRevenue(stripeApiKey),
        fetchHarvestPerClientHours(harvestApiKey),
      ])
      const result = computeClientProfitability(sd, hd, blendedRate)
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
  stripeApiKey: string | null
  harvestApiKey: string | null
  blendedRate: number
  companyName: string
  teamSizeRaw: string
  connectedTools: string[]
  pendingActionsCount: number
}): Promise<CooContext> {
  const { stripeApiKey, harvestApiKey, blendedRate, companyName, teamSizeRaw, connectedTools, pendingActionsCount } = opts

  const [overview, cashFlow, capacity, rateAdvice] = await Promise.all([
    fetchOverview(stripeApiKey, harvestApiKey, blendedRate, companyName, connectedTools),
    fetchCashFlow(stripeApiKey),
    fetchCapacity(harvestApiKey, teamSizeRaw),
    fetchRateAdvice(stripeApiKey, harvestApiKey, blendedRate, teamSizeRaw),
  ])

  return { overview, cash_flow: cashFlow, capacity, rate_advice: rateAdvice, pending_actions_count: pendingActionsCount }
}
