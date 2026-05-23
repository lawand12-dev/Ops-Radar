/**
 * Typed read/write helpers per Notion database in the OpsRadar Brain.
 *
 * Every helper:
 *   1. Looks up the user's database id from notion_workspaces.databases[slug]
 *   2. Calls the Notion SDK through withNotionRetry() to handle 429s
 *   3. Returns plain typed objects (no raw Notion property shapes leak past this file)
 *
 * Agents only touch the helpers — never the Notion SDK directly.
 *
 * Notion SDK v5 model: each "database" contains one data source. The IDs stored
 * in notion_workspaces.databases[slug] are data source IDs (returned by
 * databases.create with initial_data_source). We use:
 *   - pages.create({ parent: { data_source_id } }) for writes
 *   - dataSources.query({ data_source_id }) for reads
 *   - pages.update({ page_id }) for upserts
 */

import type { Client } from '@notionhq/client'

import { getNotionClient, getWorkspace, withNotionRetry } from './client'
import type { NotionDatabaseSlug } from './schema-keys'

/**
 * Wraps a Notion read so callers can use it as the dashboard's primary source.
 * Returns null in the "Notion isn't connected yet" case (rather than throwing) so
 * widgets can transparently fall back to Composio live data.
 *
 * NOT a generic try/catch — re-throws genuine errors (e.g. transient Notion 500s,
 * malformed token) so the caller can surface "requires_reconnect" etc.
 */
export async function tryReadNotion<T>(op: () => Promise<T>): Promise<T | null> {
  try {
    return await op()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // These two are the "no Notion workspace" / "no DB provisioned" cases from
    // resolveDbId() and getNotionClient(). Anything else bubbles up.
    if (msg.includes('User has not connected Notion')) return null
    if (msg.includes('not provisioned for user')) return null
    throw err
  }
}

// ---------- Domain types (rough — refine when implementing) ----------

export type ClientUpsert = {
  name: string
  status?: 'Active' | 'At-risk' | 'Churned' | 'Prospect'
  monthlyRetainer?: number
  monthlyHoursBudget?: number
  avgHoursLogged?: number
  actualMarginPct?: number
  marginStatus?: 'Healthy' | 'Warning' | 'Critical'
  paymentBehaviour?: 'Always on time' | 'Sometimes late' | 'Chronic'
  avgDaysToPay?: number
  scopeCreepIncidents6mo?: number
  churnRiskScore?: number
  lifetimeValue?: number
  difficultyScore?: number
  npsScore?: number
  daysSinceLastContact?: number
  ghostRisk?: boolean
  notes?: string
}

export type KpiSnapshot = {
  weekEnding: string                    // ISO date
  mrr: number
  cashCollectedMtd: number
  outstandingInvoices: number
  overdueInvoices30d: number
  totalClients: number
  activeClients: number
  avgMarginPct: number
  teamUtilizationPct: number
  hoursLoggedTotal: number
  billableHoursPct: number
  newDealsClosed: number
  pipelineValue: number
  churnThisWeek: number
  netRevenueChange: number
  netMarginPct: number
  grossProfit: number
  agentSummary: string
}

export type PatternCard = {
  title: string
  category: 'Revenue' | 'Delivery' | 'Client' | 'Team' | 'Sales' | 'Growth'
  description: string
  firstObserved: string
  confidence: number                    // 0..1
  status: 'Active' | 'Watching' | 'Resolved'
  recommendedAction: string
  timesConfirmed: number
}

export type RiskEntry = {
  title: string
  type: 'Revenue' | 'Delivery' | 'Team' | 'Client' | 'Cash flow' | 'Legal'
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  description: string
  financialExposure?: number
  dateFlagged: string
  status: 'Open' | 'Mitigating' | 'Resolved'
  deadlineToAct?: string
  agentRecommendation?: string
  owner?: string
}

export type ActionLog = {
  action: string
  agent:
    | 'Revenue'
    | 'Collections'
    | 'Scope'
    | 'Delivery'
    | 'Briefing'
    | 'Profitability'
    | 'Team'
    | 'Growth'
    | 'Renewal'
    | 'Stack'
    | 'COO'
  date: string
  trigger: string
  actionTaken: string
  outcome: 'Resolved' | 'Pending' | 'Escalated' | 'No action'
  valueRecoveredOrSaved?: number
  humanOverride?: boolean
  overrideReason?: string
}

// ---------- Internal helpers ----------

/**
 * Resolves the database (data source) id for a slug, throwing if the user
 * hasn't connected Notion or the database isn't provisioned yet.
 */
async function resolveDbId(userId: string, slug: NotionDatabaseSlug): Promise<string> {
  const ws = await getWorkspace(userId)
  if (!ws) {
    throw new Error('User has not connected Notion')
  }
  const dbId = ws.databases[slug]
  if (!dbId) {
    throw new Error(`Notion database "${slug}" not provisioned for user ${userId}`)
  }
  return dbId
}

/** Notion title property → string. */
function titleText(value: string) {
  return { title: [{ text: { content: value } }] }
}

/** Notion rich_text property → string. */
function richText(value: string | undefined) {
  return { rich_text: [{ text: { content: value ?? '' } }] }
}

/** Notion number property — preserves null vs undefined distinction. */
function num(value: number | undefined) {
  return { number: typeof value === 'number' ? value : null }
}

function select(name: string | undefined) {
  return name ? { select: { name } } : { select: null }
}

function checkbox(value: boolean | undefined) {
  return { checkbox: !!value }
}

function date(value: string | undefined) {
  return value ? { date: { start: value } } : { date: null }
}

// ---------- Read mappers ----------

type NotionProperty = Record<string, unknown>
type NotionPageProps = Record<string, NotionProperty>

function readNumber(props: NotionPageProps, key: string): number | undefined {
  const p = props[key] as { number?: number | null } | undefined
  return typeof p?.number === 'number' ? p.number : undefined
}

function readTitlePlain(props: NotionPageProps, key: string): string {
  const p = props[key] as { title?: Array<{ plain_text?: string }> } | undefined
  return (p?.title ?? []).map((t) => t.plain_text ?? '').join('')
}

function readRichTextPlain(props: NotionPageProps, key: string): string {
  const p = props[key] as { rich_text?: Array<{ plain_text?: string }> } | undefined
  return (p?.rich_text ?? []).map((t) => t.plain_text ?? '').join('')
}

function readSelectName(props: NotionPageProps, key: string): string | undefined {
  const p = props[key] as { select?: { name?: string } | null } | undefined
  return p?.select?.name
}

function readCheckbox(props: NotionPageProps, key: string): boolean | undefined {
  const p = props[key] as { checkbox?: boolean } | undefined
  return typeof p?.checkbox === 'boolean' ? p.checkbox : undefined
}

function readDate(props: NotionPageProps, key: string): string | undefined {
  const p = props[key] as { date?: { start?: string } | null } | undefined
  return p?.date?.start
}

function getPageProperties(page: unknown): NotionPageProps {
  if (page && typeof page === 'object' && 'properties' in page) {
    const p = (page as { properties?: NotionPageProps }).properties
    return p ?? {}
  }
  return {}
}

// ---------- Write helpers ----------

export async function upsertClient(userId: string, client: ClientUpsert): Promise<void> {
  const notion = await getNotionClient(userId)
  const dbId = await resolveDbId(userId, 'clients')

  // Search for existing page by title (Client name)
  const existing = await withNotionRetry(() =>
    (notion as Client).dataSources.query({
      data_source_id: dbId,
      filter: {
        property: 'Client name',
        title: { equals: client.name },
      },
      page_size: 1,
    }),
  )

  const properties: Record<string, unknown> = {
    'Client name': titleText(client.name),
    'Status': select(client.status),
    'Monthly retainer value': num(client.monthlyRetainer),
    'Monthly hours budget': num(client.monthlyHoursBudget),
    'Avg hours logged/mo': num(client.avgHoursLogged),
    'Actual margin %': num(client.actualMarginPct),
    'Margin status': select(client.marginStatus),
    'Payment behaviour': select(client.paymentBehaviour),
    'Avg days to pay': num(client.avgDaysToPay),
    'Scope creep incidents (6mo)': num(client.scopeCreepIncidents6mo),
    'Churn risk score': num(client.churnRiskScore),
    'Lifetime value': num(client.lifetimeValue),
    'Difficulty score': num(client.difficultyScore),
    'NPS score': num(client.npsScore),
    'Days since last contact': num(client.daysSinceLastContact),
    'Ghost risk': checkbox(client.ghostRisk),
    'Notes': richText(client.notes),
  }

  const matched = existing.results[0]
  if (matched && 'id' in matched && typeof matched.id === 'string') {
    await withNotionRetry(() =>
      (notion as Client).pages.update({
        page_id: matched.id as string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        properties: properties as any,
      }),
    )
    return
  }

  await withNotionRetry(() =>
    (notion as Client).pages.create({
      parent: { data_source_id: dbId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      properties: properties as any,
    }),
  )
}

export async function appendKpiSnapshot(userId: string, snapshot: KpiSnapshot): Promise<void> {
  const notion = await getNotionClient(userId)
  const dbId = await resolveDbId(userId, 'kpi_snapshots')

  const properties: Record<string, unknown> = {
    'Week ending': titleText(snapshot.weekEnding),
    'MRR': num(snapshot.mrr),
    'Cash collected MTD': num(snapshot.cashCollectedMtd),
    'Outstanding invoices': num(snapshot.outstandingInvoices),
    'Overdue invoices (30d+)': num(snapshot.overdueInvoices30d),
    'Total clients': num(snapshot.totalClients),
    'Active clients': num(snapshot.activeClients),
    'Avg margin %': num(snapshot.avgMarginPct),
    'Team utilization %': num(snapshot.teamUtilizationPct),
    'Hours logged total': num(snapshot.hoursLoggedTotal),
    'Billable hours %': num(snapshot.billableHoursPct),
    'New deals closed': num(snapshot.newDealsClosed),
    'Pipeline value': num(snapshot.pipelineValue),
    'Churn this week': num(snapshot.churnThisWeek),
    'Net revenue change': num(snapshot.netRevenueChange),
    'Net margin %': num(snapshot.netMarginPct),
    'Gross profit': num(snapshot.grossProfit),
    'Agent summary': richText(snapshot.agentSummary),
  }

  await withNotionRetry(() =>
    (notion as Client).pages.create({
      parent: { data_source_id: dbId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      properties: properties as any,
    }),
  )
}

export async function appendPatternCard(userId: string, pattern: PatternCard): Promise<void> {
  const notion = await getNotionClient(userId)
  const dbId = await resolveDbId(userId, 'pattern_cards')

  const properties: Record<string, unknown> = {
    'Pattern title': titleText(pattern.title),
    'Category': select(pattern.category),
    'Description': richText(pattern.description),
    'First observed': date(pattern.firstObserved),
    // Notion percent format expects 0..1 (e.g. 0.65 renders as 65%).
    'Confidence': num(pattern.confidence),
    'Status': select(pattern.status),
    'Recommended action': richText(pattern.recommendedAction),
    'Times confirmed': num(pattern.timesConfirmed),
  }

  await withNotionRetry(() =>
    (notion as Client).pages.create({
      parent: { data_source_id: dbId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      properties: properties as any,
    }),
  )
}

export async function appendRiskEntry(userId: string, risk: RiskEntry): Promise<void> {
  const notion = await getNotionClient(userId)
  const dbId = await resolveDbId(userId, 'risk_register')

  const properties: Record<string, unknown> = {
    'Risk title': titleText(risk.title),
    'Type': select(risk.type),
    'Severity': select(risk.severity),
    'Description': richText(risk.description),
    'Financial exposure': num(risk.financialExposure),
    'Date flagged': date(risk.dateFlagged),
    'Status': select(risk.status),
    'Deadline to act': date(risk.deadlineToAct),
    'Agent recommendation': richText(risk.agentRecommendation),
    'Owner': richText(risk.owner),
  }

  await withNotionRetry(() =>
    (notion as Client).pages.create({
      parent: { data_source_id: dbId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      properties: properties as any,
    }),
  )
}

export async function appendActionLog(userId: string, action: ActionLog): Promise<void> {
  const notion = await getNotionClient(userId)
  const dbId = await resolveDbId(userId, 'action_log')

  const properties: Record<string, unknown> = {
    'Action': titleText(action.action),
    'Agent': select(action.agent),
    'Date': date(action.date),
    'Trigger': richText(action.trigger),
    'Action taken': richText(action.actionTaken),
    'Outcome': select(action.outcome),
    'Value recovered / saved': num(action.valueRecoveredOrSaved),
    'Human override': checkbox(action.humanOverride),
    'Override reason': richText(action.overrideReason),
  }

  await withNotionRetry(() =>
    (notion as Client).pages.create({
      parent: { data_source_id: dbId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      properties: properties as any,
    }),
  )
}

// ---------- Read helpers ----------

export async function readRecentKpiSnapshots(
  userId: string,
  weeks: number,
): Promise<KpiSnapshot[]> {
  const notion = await getNotionClient(userId)
  const dbId = await resolveDbId(userId, 'kpi_snapshots')

  const res = await withNotionRetry(() =>
    (notion as Client).dataSources.query({
      data_source_id: dbId,
      sorts: [{ property: 'Week ending', direction: 'descending' }],
      page_size: Math.max(1, Math.min(weeks, 100)),
    }),
  )

  return res.results.map((page) => {
    const props = getPageProperties(page)
    return {
      weekEnding: readTitlePlain(props, 'Week ending'),
      mrr: readNumber(props, 'MRR') ?? 0,
      cashCollectedMtd: readNumber(props, 'Cash collected MTD') ?? 0,
      outstandingInvoices: readNumber(props, 'Outstanding invoices') ?? 0,
      overdueInvoices30d: readNumber(props, 'Overdue invoices (30d+)') ?? 0,
      totalClients: readNumber(props, 'Total clients') ?? 0,
      activeClients: readNumber(props, 'Active clients') ?? 0,
      avgMarginPct: readNumber(props, 'Avg margin %') ?? 0,
      teamUtilizationPct: readNumber(props, 'Team utilization %') ?? 0,
      hoursLoggedTotal: readNumber(props, 'Hours logged total') ?? 0,
      billableHoursPct: readNumber(props, 'Billable hours %') ?? 0,
      newDealsClosed: readNumber(props, 'New deals closed') ?? 0,
      pipelineValue: readNumber(props, 'Pipeline value') ?? 0,
      churnThisWeek: readNumber(props, 'Churn this week') ?? 0,
      netRevenueChange: readNumber(props, 'Net revenue change') ?? 0,
      netMarginPct: readNumber(props, 'Net margin %') ?? 0,
      grossProfit: readNumber(props, 'Gross profit') ?? 0,
      agentSummary: readRichTextPlain(props, 'Agent summary'),
    }
  })
}

export async function readOpenRisks(userId: string): Promise<RiskEntry[]> {
  const notion = await getNotionClient(userId)
  const dbId = await resolveDbId(userId, 'risk_register')

  const res = await withNotionRetry(() =>
    (notion as Client).dataSources.query({
      data_source_id: dbId,
      filter: {
        property: 'Status',
        select: { does_not_equal: 'Resolved' },
      },
      page_size: 100,
    }),
  )

  return res.results.map((page) => {
    const props = getPageProperties(page)
    const type = (readSelectName(props, 'Type') ?? 'Revenue') as RiskEntry['type']
    const severity = (readSelectName(props, 'Severity') ?? 'Low') as RiskEntry['severity']
    const status = (readSelectName(props, 'Status') ?? 'Open') as RiskEntry['status']
    return {
      title: readTitlePlain(props, 'Risk title'),
      type,
      severity,
      description: readRichTextPlain(props, 'Description'),
      financialExposure: readNumber(props, 'Financial exposure'),
      dateFlagged: readDate(props, 'Date flagged') ?? '',
      status,
      deadlineToAct: readDate(props, 'Deadline to act'),
      agentRecommendation: readRichTextPlain(props, 'Agent recommendation') || undefined,
      owner: readRichTextPlain(props, 'Owner') || undefined,
    }
  })
}

export async function readActivePatterns(userId: string): Promise<PatternCard[]> {
  const notion = await getNotionClient(userId)
  const dbId = await resolveDbId(userId, 'pattern_cards')

  const res = await withNotionRetry(() =>
    (notion as Client).dataSources.query({
      data_source_id: dbId,
      filter: {
        property: 'Status',
        select: { equals: 'Active' },
      },
      page_size: 100,
    }),
  )

  return res.results.map((page) => {
    const props = getPageProperties(page)
    const category = (readSelectName(props, 'Category') ?? 'Revenue') as PatternCard['category']
    const status = (readSelectName(props, 'Status') ?? 'Active') as PatternCard['status']
    return {
      title: readTitlePlain(props, 'Pattern title'),
      category,
      description: readRichTextPlain(props, 'Description'),
      firstObserved: readDate(props, 'First observed') ?? '',
      confidence: readNumber(props, 'Confidence') ?? 0,
      status,
      recommendedAction: readRichTextPlain(props, 'Recommended action'),
      timesConfirmed: readNumber(props, 'Times confirmed') ?? 0,
    }
  })
}

export async function readAllClients(userId: string): Promise<ClientUpsert[]> {
  const notion = await getNotionClient(userId)
  const dbId = await resolveDbId(userId, 'clients')

  const out: ClientUpsert[] = []
  let cursor: string | undefined

  do {
    const res = await withNotionRetry(() =>
      (notion as Client).dataSources.query({
        data_source_id: dbId,
        page_size: 100,
        start_cursor: cursor,
      }),
    )

    for (const page of res.results) {
      const props = getPageProperties(page)
      const status = readSelectName(props, 'Status') as ClientUpsert['status'] | undefined
      const marginStatus = readSelectName(props, 'Margin status') as
        | ClientUpsert['marginStatus']
        | undefined
      const paymentBehaviour = readSelectName(props, 'Payment behaviour') as
        | ClientUpsert['paymentBehaviour']
        | undefined

      out.push({
        name: readTitlePlain(props, 'Client name'),
        status,
        monthlyRetainer: readNumber(props, 'Monthly retainer value'),
        monthlyHoursBudget: readNumber(props, 'Monthly hours budget'),
        avgHoursLogged: readNumber(props, 'Avg hours logged/mo'),
        actualMarginPct: readNumber(props, 'Actual margin %'),
        marginStatus,
        paymentBehaviour,
        avgDaysToPay: readNumber(props, 'Avg days to pay'),
        scopeCreepIncidents6mo: readNumber(props, 'Scope creep incidents (6mo)'),
        churnRiskScore: readNumber(props, 'Churn risk score'),
        lifetimeValue: readNumber(props, 'Lifetime value'),
        difficultyScore: readNumber(props, 'Difficulty score'),
        npsScore: readNumber(props, 'NPS score'),
        daysSinceLastContact: readNumber(props, 'Days since last contact'),
        ghostRisk: readCheckbox(props, 'Ghost risk'),
        notes: readRichTextPlain(props, 'Notes') || undefined,
      })
    }

    cursor = res.has_more && res.next_cursor ? res.next_cursor : undefined
  } while (cursor)

  return out
}
