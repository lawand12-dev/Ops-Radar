import Stripe from 'stripe'
import { fetchStripePerClientRevenue } from '<npm>/lib/integrations/stripe/profitability-adapter'
import { fetchHarvestPerClientHours } from '<npm>/lib/integrations/harvest/profitability-adapter'
import { computeClientProfitability } from '<npm>/lib/profitability'
import type { BenchmarkMetric } from './types'

export type UserMetrics = Partial<Record<BenchmarkMetric, number>>

const DEFAULT_BLENDED_RATE = 85

function unix(d: Date): number {
  return Math.floor(d.getTime() / 1000)
}

async function medianInvoiceDaysOverdue(stripeApiKey: string): Promise<number | null> {
  try {
    const stripe = new Stripe(stripeApiKey, { typescript: true, maxNetworkRetries: 2 })
    const now = unix(new Date())
    const resp = await stripe.invoices.list({
      status: 'paid',
      created: { gte: now - 90 * 24 * 60 * 60 },
      limit: 100,
    })
    const days: number[] = []
    for (const inv of resp.data) {
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
  stripeApiKey: string,
  harvestApiKey: string,
  blendedRate: number,
): Promise<{ marginMedian: number | null; hoursPer10k: number | null; clientCount: number | null }> {
  try {
    const [stripeData, harvestData] = await Promise.all([
      fetchStripePerClientRevenue(stripeApiKey),
      fetchHarvestPerClientHours(harvestApiKey),
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
  stripeApiKey: string | null
  harvestApiKey: string | null
  blendedRate: number | null
}): Promise<UserMetrics> {
  const blended = args.blendedRate ?? DEFAULT_BLENDED_RATE
  const metrics: UserMetrics = {}

  if (args.stripeApiKey) {
    const v = await medianInvoiceDaysOverdue(args.stripeApiKey)
    if (v !== null) metrics.median_invoice_days_overdue = v
  }

  if (args.stripeApiKey && args.harvestApiKey) {
    const { marginMedian, hoursPer10k, clientCount } = await collectProfitabilityDerived(
      args.stripeApiKey,
      args.harvestApiKey,
      blended,
    )
    if (marginMedian !== null) metrics.median_client_margin_pct = marginMedian
    if (hoursPer10k   !== null) metrics.hours_per_10k_revenue   = hoursPer10k
    if (clientCount   !== null) metrics.active_client_count     = clientCount
  }

  return metrics
}
