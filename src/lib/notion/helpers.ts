/**
 * Typed read/write helpers per Notion database in the OpsRadar Brain.
 *
 * Every helper:
 *   1. Looks up the user's database id from notion_workspaces.databases[slug]
 *   2. Calls the Notion SDK through withNotionRetry() to handle 429s
 *   3. Returns plain typed objects (no raw Notion property shapes leak past this file)
 *
 * Agents only touch the helpers — never the Notion SDK directly.
 */

// import { getNotionClient, getWorkspace, withNotionRetry } from './client'

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

// ---------- Write helpers (one per database, scaffolded) ----------

export async function upsertClient(_userId: string, _client: ClientUpsert): Promise<void> {
  // TODO(scaffold): look up clients db_id, query by 'Client name', create or patch.
  throw new Error('upsertClient not implemented')
}

export async function appendKpiSnapshot(_userId: string, _snapshot: KpiSnapshot): Promise<void> {
  // TODO(scaffold): look up kpi_snapshots db_id, pages.create().
  throw new Error('appendKpiSnapshot not implemented')
}

export async function appendPatternCard(_userId: string, _pattern: PatternCard): Promise<void> {
  // TODO(scaffold): look up pattern_cards db_id, pages.create(). Dedup by title + first observed week.
  throw new Error('appendPatternCard not implemented')
}

export async function appendRiskEntry(_userId: string, _risk: RiskEntry): Promise<void> {
  // TODO(scaffold): look up risk_register db_id, pages.create().
  throw new Error('appendRiskEntry not implemented')
}

export async function appendActionLog(_userId: string, _action: ActionLog): Promise<void> {
  // TODO(scaffold): look up action_log db_id, pages.create().
  throw new Error('appendActionLog not implemented')
}

// ---------- Read helpers ----------

export async function readRecentKpiSnapshots(
  _userId: string,
  _weeks: number,
): Promise<KpiSnapshot[]> {
  // TODO(scaffold): query kpi_snapshots ordered by Week ending desc, limit weeks.
  throw new Error('readRecentKpiSnapshots not implemented')
}

export async function readOpenRisks(_userId: string): Promise<RiskEntry[]> {
  // TODO(scaffold): query risk_register where Status != 'Resolved'.
  throw new Error('readOpenRisks not implemented')
}

export async function readActivePatterns(_userId: string): Promise<PatternCard[]> {
  // TODO(scaffold): query pattern_cards where Status = 'Active'.
  throw new Error('readActivePatterns not implemented')
}

export async function readAllClients(_userId: string): Promise<ClientUpsert[]> {
  // TODO(scaffold): query clients db. Paginate if > 100.
  throw new Error('readAllClients not implemented')
}
