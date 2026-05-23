import { computeClientProfitability } from '<npm>/lib/profitability'
import { executeComposioAction } from '<npm>/lib/composio-fetch'
import type { StripePerClientData, HarvestPerClientData } from '<npm>/lib/integration-types'
import type { BenchmarkMetric } from './types'

export type UserMetrics = Partial<Record<BenchmarkMetric, number>>

const DEFAULT_BLENDED_RATE = 85

type StripePerClientRow = StripePerClientData['clients'][number]
type HarvestPerClientRow = HarvestPerClientData['clients'][number]

// ---------- Composio-backed data fetchers ----------

type StripeInvoice = {
  id: string
  status: string
  amount_due?: number       // cents
  amount_paid?: number      // cents
  amount_remaining?: number // cents
  due_date?: number         // unix seconds
  customer?: string | { id?: string; name?: string }
  created?: number
  status_transitions?: { paid_at?: number | null }
}

async function fetchStripePerClientViaComposio(userId: string): Promise<StripePerClientData> {
  // TODO(composio-slug): verify slug
  const list = await executeComposioAction<{ data?: StripeInvoice[] } | StripeInvoice[]>(
    userId,
    'stripe',
    'STRIPE_LIST_INVOICES',
    { limit: 100 },
  )
  const invoices: StripeInvoice[] = Array.isArray(list) ? list : list?.data ?? []

  const now = Math.floor(Date.now() / 1000)
  const monthStart = Math.floor(
    new Date(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1).getTime() / 1000,
  )

  const byClient = new Map<string, StripePerClientRow>()
  for (const inv of invoices) {
    const custId =
      typeof inv.customer === 'string'
        ? inv.customer
        : inv.customer?.id ?? 'unknown'
    const custName =
      typeof inv.customer === 'object' && inv.customer?.name
        ? inv.customer.name
        : 'Unknown'

    const isCurrent = (inv.created ?? 0) >= monthStart
    const paid = (inv.amount_paid ?? 0) / 100
    const overdue = inv.due_date && inv.due_date < now && inv.status !== 'paid'

    const existing: StripePerClientRow =
      byClient.get(custId) ??
      ({
        id: custId,
        name: custName,
        revenue_current: 0,
        revenue_prior: 0,
        payment_status: 'on_time',
      } as StripePerClientRow)
    if (isCurrent) existing.revenue_current += paid
    else existing.revenue_prior += paid
    if (overdue) existing.payment_status = 'overdue'
    byClient.set(custId, existing)
  }

  return { clients: Array.from(byClient.values()), currency: 'USD' }
}

type HarvestTimeEntry = {
  id: number
  hours: number
  client?: { id?: number; name?: string }
  spent_date?: string // YYYY-MM-DD
}

async function fetchHarvestPerClientViaComposio(userId: string): Promise<HarvestPerClientData> {
  const now = new Date()
  const monthStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1)
  const priorStart = new Date(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  // TODO(composio-slug): verify slug
  const resp = await executeComposioAction<{ time_entries?: HarvestTimeEntry[] } | HarvestTimeEntry[]>(
    userId,
    'harvest',
    'HARVEST_LIST_TIME_ENTRIES',
    { from: fmt(priorStart), to: fmt(now), per_page: 100 },
  )
  const entries: HarvestTimeEntry[] = Array.isArray(resp)
    ? resp
    : resp?.time_entries ?? []

  const byClient = new Map<string, HarvestPerClientRow>()
  for (const e of entries) {
    const id = String(e.client?.id ?? 'unknown')
    const name = e.client?.name ?? 'Unknown'
    const isCurrent = e.spent_date ? new Date(e.spent_date) >= monthStart : false
    const row = byClient.get(id) ?? { id, name, hours_current: 0, hours_prior: 0 }
    if (isCurrent) row.hours_current += e.hours ?? 0
    else row.hours_prior += e.hours ?? 0
    byClient.set(id, row)
  }

  return { clients: Array.from(byClient.values()) }
}

async function medianInvoiceDaysOverdue(userId: string): Promise<number | null> {
  try {
    const now = Math.floor(Date.now() / 1000)
    // TODO(composio-slug): verify slug
    const resp = await executeComposioAction<{ data?: StripeInvoice[] } | StripeInvoice[]>(
      userId,
      'stripe',
      'STRIPE_LIST_INVOICES',
      {
        status: 'paid',
        created: { gte: now - 90 * 24 * 60 * 60 },
        limit: 100,
      },
    )
    const invoices: StripeInvoice[] = Array.isArray(resp) ? resp : resp?.data ?? []
    const days: number[] = []
    for (const inv of invoices) {
      const paidAt = inv.status_transitions?.paid_at
      if (!inv.due_date || typeof paidAt !== 'number') continue
      const overdue = (paidAt - inv.due_date) / 86400
      if (overdue >= 0) days.push(overdue)
    }
    if (days.length === 0) return null
    days.sort((a, b) => a - b)
    return days[Math.floor(days.length / 2)]!
  } catch {
    return null
  }
}

async function collectProfitabilityDerived(
  userId: string,
  blendedRate: number,
): Promise<{ marginMedian: number | null; hoursPer10k: number | null; clientCount: number | null }> {
  try {
    const [stripeData, harvestData] = await Promise.all([
      fetchStripePerClientViaComposio(userId),
      fetchHarvestPerClientViaComposio(userId),
    ])
    const result = computeClientProfitability(stripeData, harvestData, blendedRate)

    const margins = result.clients
      .map((c) => c.margin_pct)
      .filter((m) => Number.isFinite(m))
    margins.sort((a, b) => a - b)
    const marginMedian = margins.length ? margins[Math.floor(margins.length / 2)]! : null

    const totalRevenue = result.clients.reduce((s, c) => s + c.revenue_mtd, 0)
    const totalHours   = result.clients.reduce((s, c) => s + c.hours_mtd, 0)
    const hoursPer10k =
      totalRevenue > 0 ? (totalHours / totalRevenue) * 10_000 : null

    const clientCount = result.clients.length || null

    return { marginMedian, hoursPer10k, clientCount }
  } catch {
    return { marginMedian: null, hoursPer10k: null, clientCount: null }
  }
}

export async function collectUserMetrics(args: {
  userId: string
  stripeConnected: boolean
  harvestConnected: boolean
  blendedRate: number | null
}): Promise<UserMetrics> {
  const blended = args.blendedRate ?? DEFAULT_BLENDED_RATE
  const metrics: UserMetrics = {}

  if (args.stripeConnected) {
    const v = await medianInvoiceDaysOverdue(args.userId)
    if (v !== null) metrics.median_invoice_days_overdue = v
  }

  if (args.stripeConnected && args.harvestConnected) {
    const { marginMedian, hoursPer10k, clientCount } = await collectProfitabilityDerived(
      args.userId,
      blended,
    )
    if (marginMedian !== null) metrics.median_client_margin_pct = marginMedian
    if (hoursPer10k   !== null) metrics.hours_per_10k_revenue   = hoursPer10k
    if (clientCount   !== null) metrics.active_client_count     = clientCount
  }

  return metrics
}
