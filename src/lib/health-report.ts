import { openai } from '<npm>/lib/openai'
import { computeClientProfitability } from '<npm>/lib/profitability'
import { executeComposioAction, ComposioExecuteError } from '<npm>/lib/composio-fetch'
import type { StripePerClientData, HarvestPerClientData } from '<npm>/lib/integration-types'

type StripePerClientRow = StripePerClientData['clients'][number]
type HarvestPerClientRow = HarvestPerClientData['clients'][number]

export type HealthFinding = {
  title: string
  insight: string
  severity: 'good' | 'warn' | 'bad'
}

export type HealthReport = {
  findings: HealthFinding[]
  generated_at: string
}

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
    const remaining = (inv.amount_remaining ?? 0) / 100
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

async function getOverdueStatsViaComposio(
  userId: string,
): Promise<{ count: number; total: number }> {
  try {
    // TODO(composio-slug): verify slug
    const list = await executeComposioAction<{ data?: StripeInvoice[] } | StripeInvoice[]>(
      userId,
      'stripe',
      'STRIPE_LIST_INVOICES',
      { status: 'open', limit: 50 },
    )
    const invoices: StripeInvoice[] = Array.isArray(list) ? list : list?.data ?? []
    const now = Math.floor(Date.now() / 1000)
    const overdue = invoices.filter((inv) => inv.due_date && inv.due_date < now)
    const total = overdue.reduce((s, inv) => s + (inv.amount_due ?? 0) / 100, 0)
    return { count: overdue.length, total }
  } catch {
    return { count: 0, total: 0 }
  }
}

// ---------- Formatting helpers (unchanged) ----------

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`
}

function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}

function normalizeFindings(value: unknown): HealthFinding[] {
  if (!Array.isArray(value)) return []
  const findings: HealthFinding[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const candidate = item as Record<string, unknown>
    const severity = candidate.severity
    if (severity !== 'good' && severity !== 'warn' && severity !== 'bad') continue
    if (typeof candidate.title !== 'string' || typeof candidate.insight !== 'string') continue
    findings.push({
      title: candidate.title.trim(),
      insight: candidate.insight.trim(),
      severity,
    })
  }
  return findings.filter((f) => f.title && f.insight).slice(0, 3)
}

// ---------- Public API ----------

export async function generateHealthReport(opts: {
  userId: string
  stripeConnected: boolean
  harvestConnected: boolean
  blendedRate: number
  companyName: string
}): Promise<HealthReport> {
  const { userId, stripeConnected, harvestConnected, blendedRate, companyName } = opts

  const dataLines: string[] = []
  let overdueStr = 'No overdue invoice data available.'

  if (stripeConnected && harvestConnected) {
    try {
      const [stripeData, harvestData] = await Promise.all([
        fetchStripePerClientViaComposio(userId),
        fetchHarvestPerClientViaComposio(userId),
      ])
      const result = computeClientProfitability(stripeData, harvestData, blendedRate)
      const clientCount = result.clients.length
      const belowBreakeven = result.clients.filter((c) => c.margin_pct < 0).length
      const margins = result.clients
        .map((c) => c.margin_pct)
        .filter(Number.isFinite)
        .sort((a, b) => a - b)
      const medianMargin = margins.length ? margins[Math.floor(margins.length / 2)]! : null
      const totalRevenue = result.clients.reduce((s, c) => s + c.revenue_mtd, 0)
      const topClient = [...result.clients].sort((a, b) => b.revenue_mtd - a.revenue_mtd)[0]
      const topConcentration =
        topClient && totalRevenue > 0
          ? Math.round((topClient.revenue_mtd / totalRevenue) * 100)
          : null

      dataLines.push(
        [
          `Active clients: ${clientCount}`,
          medianMargin !== null ? `Median margin: ${medianMargin.toFixed(1)}%` : null,
          `Clients below break-even: ${belowBreakeven}`,
          `Month-to-date revenue: ${formatMoney(totalRevenue)}`,
          topConcentration !== null
            ? `Top client concentration: ${topConcentration}% of revenue`
            : null,
        ]
          .filter(Boolean)
          .join('; '),
      )
    } catch (err) {
      if (err instanceof ComposioExecuteError) {
        dataLines.push('Profitability data temporarily unavailable from Composio.')
      } else {
        dataLines.push('Profitability data temporarily unavailable.')
      }
    }
  } else if (stripeConnected) {
    try {
      const stripeData = await fetchStripePerClientViaComposio(userId)
      const clientCount = stripeData.clients.length
      const currentRevenue = stripeData.clients.reduce((s, c) => s + c.revenue_current, 0)
      const priorRevenue = stripeData.clients.reduce((s, c) => s + c.revenue_prior, 0)
      const overdueClients = stripeData.clients.filter((c) => c.payment_status === 'overdue').length
      const topClient = [...stripeData.clients].sort((a, b) => b.revenue_current - a.revenue_current)[0]

      dataLines.push(
        [
          `Billing clients with activity: ${clientCount}`,
          `Current-month paid revenue: ${formatMoney(currentRevenue)}`,
          `Prior-month paid revenue: ${formatMoney(priorRevenue)}`,
          `Clients with overdue invoices: ${overdueClients}`,
          topClient
            ? `Top revenue client: ${topClient.name} (${formatMoney(topClient.revenue_current)})`
            : null,
        ]
          .filter(Boolean)
          .join('; '),
      )
    } catch {
      dataLines.push('Stripe revenue data temporarily unavailable.')
    }
  } else if (harvestConnected) {
    try {
      const harvestData = await fetchHarvestPerClientViaComposio(userId)
      const activeClients = harvestData.clients.filter((c) => c.hours_current > 0).length
      const currentHours = harvestData.clients.reduce((s, c) => s + c.hours_current, 0)
      const priorHours = harvestData.clients.reduce((s, c) => s + c.hours_prior, 0)
      const topClient = [...harvestData.clients].sort((a, b) => b.hours_current - a.hours_current)[0]

      dataLines.push(
        [
          `Harvest clients with time: ${activeClients}`,
          `Current-month tracked hours: ${formatNumber(currentHours)}h`,
          `Prior-month tracked hours: ${formatNumber(priorHours)}h`,
          topClient
            ? `Top time client: ${topClient.name} (${formatNumber(topClient.hours_current)}h)`
            : null,
        ]
          .filter(Boolean)
          .join('; '),
      )
    } catch {
      dataLines.push('Harvest time data temporarily unavailable.')
    }
  }

  if (stripeConnected) {
    const { count, total } = await getOverdueStatsViaComposio(userId)
    overdueStr =
      count > 0
        ? `${count} overdue invoice${count > 1 ? 's' : ''} totaling ${formatMoney(total)}`
        : `0 overdue invoices totaling ${formatMoney(0)}`
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are an expert agency CFO. Generate a concise agency health report as strict JSON only.',
      },
      {
        role: 'user',
        content: `Generate exactly 3 health findings for this agency.

Agency: ${companyName || 'this agency'}
${dataLines.join('\n')}
Invoice status: ${overdueStr}

Return JSON: { "findings": [ { "title": "...", "insight": "...", "severity": "good"|"warn"|"bad" }, ... ] }
Rules:
- Each finding must reference a specific number from the data above
- title: 3-5 words, punchy (e.g. "2 clients losing money")
- insight: 1 sentence, specific, actionable
- severity: "good" for positives, "bad" for urgent problems, "warn" for things to watch
- Do NOT invent numbers not in the data above
- Prioritise the most financially impactful findings`,
      },
    ],
    temperature: 0.3,
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'
  let findings: HealthFinding[] = []
  try {
    const parsed = JSON.parse(raw) as { findings?: unknown }
    findings = normalizeFindings(parsed.findings)
  } catch {
    findings = [
      {
        title: 'Agency data loaded',
        insight: 'Your integrations are connected and data is flowing in.',
        severity: 'good',
      },
    ]
  }

  if (findings.length === 0) {
    findings = [
      {
        title: 'Agency data loaded',
        insight: 'Your integrations are connected and data is flowing in.',
        severity: 'good',
      },
    ]
  }

  return { findings, generated_at: new Date().toISOString() }
}
