import { computeClientProfitability } from '<npm>/lib/profitability'
import { fetchStripePerClientRevenue } from '<npm>/lib/integrations/stripe/profitability-adapter'
import { fetchHarvestPerClientHours } from '<npm>/lib/integrations/harvest/profitability-adapter'
import { collectUserMetrics } from '<npm>/lib/benchmarks/collect'
import type { BenchmarkRow, BenchmarkMetric } from '<npm>/lib/benchmarks/types'

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F'

export type ScoreDimension = {
  score: number
  grade: Grade
  label: string
  detail: string
}

export type AgencyScore = {
  dimensions: {
    margins: ScoreDimension
    collection_speed: ScoreDimension
    client_concentration: ScoreDimension
    utilization: ScoreDimension
    benchmark_position: ScoreDimension
  }
  overall_score: number
  overall_grade: Grade
  computed_at: string
  company_name: string
}

function toGrade(score: number): Grade {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

function marginsDimension(medianMarginPct: number | null): ScoreDimension {
  if (medianMarginPct === null) {
    return { score: 50, grade: 'C', label: 'Margins', detail: 'No data — connect Stripe + Harvest' }
  }
  const score =
    medianMarginPct >= 40 ? 100 :
    medianMarginPct >= 30 ? 85 :
    medianMarginPct >= 20 ? 70 :
    medianMarginPct >= 10 ? 45 :
    medianMarginPct >= 0  ? 20 : 0
  return {
    score,
    grade: toGrade(score),
    label: 'Margins',
    detail: `Median client margin: ${medianMarginPct.toFixed(0)}%`,
  }
}

function collectionDimension(avgDaysOverdue: number | null): ScoreDimension {
  if (avgDaysOverdue === null) {
    return { score: 50, grade: 'C', label: 'Collections', detail: 'No invoice data — connect Stripe' }
  }
  const score =
    avgDaysOverdue <= 2  ? 100 :
    avgDaysOverdue <= 7  ? 85 :
    avgDaysOverdue <= 14 ? 65 :
    avgDaysOverdue <= 30 ? 40 : 15
  return {
    score,
    grade: toGrade(score),
    label: 'Collections',
    detail: `Median days overdue: ${avgDaysOverdue.toFixed(0)}d`,
  }
}

function concentrationDimension(
  clients: Array<{ revenue_mtd: number }>,
): ScoreDimension {
  if (clients.length === 0) {
    return { score: 50, grade: 'C', label: 'Client Mix', detail: 'No client data available' }
  }
  const totalRevenue = clients.reduce((s, c) => s + c.revenue_mtd, 0)
  if (totalRevenue === 0) {
    return { score: 50, grade: 'C', label: 'Client Mix', detail: 'No revenue data this month' }
  }
  const topRevenue = Math.max(...clients.map((c) => c.revenue_mtd))
  const concentration = topRevenue / totalRevenue
  const pct = Math.round(concentration * 100)
  const score =
    concentration < 0.20 ? 100 :
    concentration < 0.30 ? 85 :
    concentration < 0.40 ? 70 :
    concentration < 0.50 ? 55 :
    concentration < 0.70 ? 35 : 10
  return {
    score,
    grade: toGrade(score),
    label: 'Client Mix',
    detail: `Top client is ${pct}% of revenue`,
  }
}

function utilizationDimension(
  hoursTracked: number | null,
  teamSizeRaw: string,
): ScoreDimension {
  const minSize = (() => {
    if (!teamSizeRaw) return null
    if (teamSizeRaw === '1') return 1
    const m = teamSizeRaw.match(/^(\d+)/)
    return m ? parseInt(m[1]!) : null
  })()

  if (hoursTracked === null || minSize === null) {
    return { score: 50, grade: 'C', label: 'Utilization', detail: 'Set team size in Settings to unlock' }
  }

  const capacity = minSize * 160
  const utilPct = (hoursTracked / capacity) * 100
  const rounded = Math.round(utilPct)
  const score =
    utilPct >= 80 && utilPct <= 95 ? 100 :
    utilPct >= 65 && utilPct < 80  ? 85 :
    utilPct >= 50 && utilPct < 65  ? 65 :
    utilPct > 95                   ? 55 :
    utilPct >= 35                  ? 40 : 20
  return {
    score,
    grade: toGrade(score),
    label: 'Utilization',
    detail: `${rounded}% utilization (${hoursTracked.toFixed(0)}h of ~${capacity}h capacity)`,
  }
}

function benchmarkDimension(
  positions: Array<'top_25' | 'above' | 'below' | 'bottom_25' | 'no_data'>,
): ScoreDimension {
  if (positions.length === 0 || positions.every((p) => p === 'no_data')) {
    return { score: 50, grade: 'C', label: 'Industry Rank', detail: 'Not enough benchmark data yet' }
  }
  const positionScore = (p: string) => {
    if (p === 'top_25') return 100
    if (p === 'above')  return 75
    if (p === 'below')  return 40
    if (p === 'bottom_25') return 15
    return 50
  }
  const ranked = positions.filter((p) => p !== 'no_data')
  const avg = Math.round(ranked.reduce((s, p) => s + positionScore(p), 0) / ranked.length)
  return {
    score: avg,
    grade: toGrade(avg),
    label: 'Industry Rank',
    detail: `Compared to ${ranked.length} benchmark metric${ranked.length > 1 ? 's' : ''} for your size`,
  }
}

export async function computeAgencyScore(opts: {
  stripeApiKey: string | null
  harvestApiKey: string | null
  blendedRate: number
  teamSizeRaw: string
  companyName: string
  benchmarkRows: BenchmarkRow[]
}): Promise<AgencyScore> {
  const { stripeApiKey, harvestApiKey, blendedRate, teamSizeRaw, companyName, benchmarkRows } = opts

  let medianMarginPct: number | null = null
  let avgDaysOverdue: number | null = null
  let clientsData: Array<{ revenue_mtd: number }> = []
  let hoursTracked: number | null = null
  const benchmarkPositions: Array<'top_25' | 'above' | 'below' | 'bottom_25' | 'no_data'> = []

  if (stripeApiKey && harvestApiKey) {
    try {
      const [sd, hd] = await Promise.all([
        fetchStripePerClientRevenue(stripeApiKey),
        fetchHarvestPerClientHours(harvestApiKey),
      ])
      const result = computeClientProfitability(sd, hd, blendedRate)
      clientsData = result.clients
      const margins = result.clients.map((c) => c.margin_pct).filter(Number.isFinite).sort((a, b) => a - b)
      if (margins.length) medianMarginPct = Math.round(margins[Math.floor(margins.length / 2)]!)
      hoursTracked = result.clients.reduce((s, c) => s + c.hours_mtd, 0)
    } catch { /* best effort */ }
  }

  if (stripeApiKey) {
    try {
      const metrics = await collectUserMetrics({ stripeApiKey, harvestApiKey, blendedRate })
      if (metrics.median_invoice_days_overdue !== undefined) {
        avgDaysOverdue = metrics.median_invoice_days_overdue
      }
      const benchmarkMap = new Map<BenchmarkMetric, BenchmarkRow>()
      for (const row of benchmarkRows) {
        benchmarkMap.set(row.metric as BenchmarkMetric, row)
      }
      const metricKeys: BenchmarkMetric[] = [
        'median_client_margin_pct',
        'median_invoice_days_overdue',
        'hours_per_10k_revenue',
        'active_client_count',
      ]
      for (const metric of metricKeys) {
        const userValue = metrics[metric] ?? null
        const row = benchmarkMap.get(metric) ?? null
        if (userValue === null || row === null) {
          benchmarkPositions.push('no_data')
          continue
        }
        const isLowerBetter = metric === 'median_invoice_days_overdue' || metric === 'hours_per_10k_revenue'
        if (isLowerBetter) {
          benchmarkPositions.push(
            userValue <= row.p25 ? 'top_25' :
            userValue <= row.p50 ? 'above' :
            userValue <= row.p75 ? 'below' : 'bottom_25'
          )
        } else {
          benchmarkPositions.push(
            userValue >= row.p75 ? 'top_25' :
            userValue >= row.p50 ? 'above' :
            userValue >= row.p25 ? 'below' : 'bottom_25'
          )
        }
      }
    } catch { /* best effort */ }
  }

  const margins = marginsDimension(medianMarginPct)
  const collections = collectionDimension(avgDaysOverdue)
  const concentration = concentrationDimension(clientsData)
  const utilization = utilizationDimension(hoursTracked, teamSizeRaw)
  const benchmark = benchmarkDimension(benchmarkPositions)

  const overallScore = Math.round(
    (margins.score + collections.score + concentration.score + utilization.score + benchmark.score) / 5
  )

  return {
    dimensions: {
      margins,
      collection_speed: collections,
      client_concentration: concentration,
      utilization,
      benchmark_position: benchmark,
    },
    overall_score: overallScore,
    overall_grade: toGrade(overallScore),
    computed_at: new Date().toISOString(),
    company_name: companyName,
  }
}
