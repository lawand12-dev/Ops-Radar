type AuditLikeInput = {
  agencyType: string
  teamSize: string
  revenue: string
  activeClients: string
  tools: string
  toolSignals?: string
  websiteUrl?: string
  websiteScreenshotUrl?: string
  websiteContext?: string
  websiteEvidence?: string
  websiteDetectedStack?: string
  websiteStackEvidence?: string
  websiteVisualContext?: string
  websiteVisualEvidence?: string
  crmTool: string
  timeHeavy: string
  leadEntry: string
  onboarding: string
  progressTracking: string
  automationWish: string
  processFrequency: string
  processOwner: string
  failureImpact: string
  futureVision: string
}

type AuditStage = 'preview' | 'full'

type ToolCatalogEntry = {
  canonicalName: string
  aliases: string[]
  n8nNode: string | null
  notes?: string
}

type GroundingContext = {
  detectedTools: ToolCatalogEntry[]
  allowedNodes: string[]
  allowedToolNames: string[]
  primaryCrm: string | null
  hourlyRate: number
}

type OpportunityLike = Record<string, unknown>
type ConfidenceReport = {
  overall: number
  opportunityScores: number[]
  issues: string[]
  opportunityIssues: string[][]
  lowEvidenceMode: boolean
}

const CORE_N8N_NODES = [
  'Webhook',
  'Schedule Trigger',
  'Manual Trigger',
  'If',
  'Switch',
  'Set',
  'Merge',
  'Code',
  'HTTP Request',
  'Wait',
]

const TOOL_CATALOG: ToolCatalogEntry[] = [
  { canonicalName: 'Slack', aliases: ['slack'], n8nNode: 'Slack' },
  { canonicalName: 'Google Workspace', aliases: ['google workspace', 'google apps'], n8nNode: null, notes: 'Prefer specific Google nodes such as Gmail, Google Sheets, or Google Drive when the workflow makes that clear.' },
  { canonicalName: 'Gmail', aliases: ['gmail', 'google mail'], n8nNode: 'Gmail' },
  { canonicalName: 'Google Sheets', aliases: ['google sheets', 'sheets', 'spreadsheet', 'spreadsheets'], n8nNode: 'Google Sheets' },
  { canonicalName: 'Google Drive', aliases: ['google drive', 'drive'], n8nNode: 'Google Drive' },
  { canonicalName: 'Notion', aliases: ['notion'], n8nNode: 'Notion' },
  { canonicalName: 'Airtable', aliases: ['airtable'], n8nNode: 'Airtable' },
  { canonicalName: 'Stripe', aliases: ['stripe'], n8nNode: 'Stripe' },
  { canonicalName: 'QuickBooks', aliases: ['quickbooks', 'quick books'], n8nNode: 'QuickBooks' },
  { canonicalName: 'Calendly', aliases: ['calendly'], n8nNode: 'Calendly' },
  { canonicalName: 'Zoom', aliases: ['zoom'], n8nNode: 'Zoom' },
  { canonicalName: 'Trello', aliases: ['trello'], n8nNode: 'Trello' },
  { canonicalName: 'HubSpot', aliases: ['hubspot'], n8nNode: 'HubSpot' },
  { canonicalName: 'Salesforce', aliases: ['salesforce'], n8nNode: 'Salesforce' },
  { canonicalName: 'GoHighLevel', aliases: ['gohighlevel', 'highlevel', 'go high level'], n8nNode: 'HTTP Request', notes: 'Use HTTP Request against the GoHighLevel API unless a vetted custom node is available in the runtime.' },
  { canonicalName: 'Pipedrive', aliases: ['pipedrive'], n8nNode: 'Pipedrive' },
  { canonicalName: 'Monday CRM', aliases: ['monday crm', 'monday'], n8nNode: 'Monday.com' },
  { canonicalName: 'Mailchimp', aliases: ['mailchimp'], n8nNode: 'Mailchimp' },
  { canonicalName: 'ActiveCampaign', aliases: ['activecampaign', 'active campaign'], n8nNode: 'ActiveCampaign' },
  { canonicalName: 'SEMrush', aliases: ['semrush'], n8nNode: 'HTTP Request' },
  { canonicalName: 'Google Ads', aliases: ['google ads', 'adwords'], n8nNode: 'Google Ads' },
  { canonicalName: 'Meta Ads Manager', aliases: ['meta ads manager', 'meta ads', 'facebook ads', 'ads manager'], n8nNode: 'Facebook Graph API' },
  { canonicalName: 'Meta Pixel', aliases: ['meta pixel', 'facebook pixel'], n8nNode: 'Facebook Graph API', notes: 'Use Meta/Facebook APIs or tracking events as context, not a made-up pixel node.' },
  { canonicalName: 'Google Analytics', aliases: ['google analytics', 'ga4', 'analytics'], n8nNode: 'Google Analytics' },
  { canonicalName: 'Google Tag Manager', aliases: ['google tag manager', 'gtm'], n8nNode: 'HTTP Request', notes: 'Treat GTM as a web tag signal or use HTTP Request for API-based maintenance tasks.' },
  { canonicalName: 'Bullhorn', aliases: ['bullhorn'], n8nNode: 'HTTP Request' },
  { canonicalName: 'Greenhouse', aliases: ['greenhouse'], n8nNode: 'Greenhouse' },
  { canonicalName: 'Lever', aliases: ['lever'], n8nNode: 'HTTP Request' },
  { canonicalName: 'LinkedIn Recruiter', aliases: ['linkedin recruiter', 'linkedin'], n8nNode: 'HTTP Request' },
  { canonicalName: 'Indeed', aliases: ['indeed'], n8nNode: 'HTTP Request' },
  { canonicalName: 'Workable', aliases: ['workable'], n8nNode: 'Workable' },
  { canonicalName: 'JazzHR', aliases: ['jazzhr', 'jazz hr'], n8nNode: 'HTTP Request' },
  { canonicalName: 'Figma', aliases: ['figma'], n8nNode: 'Figma' },
  { canonicalName: 'Adobe Creative Suite', aliases: ['adobe creative suite', 'adobe'], n8nNode: null, notes: 'Adobe asset automation usually needs HTTP Request or file-based handoff rather than a single native node.' },
  { canonicalName: 'Canva', aliases: ['canva'], n8nNode: 'HTTP Request' },
  { canonicalName: 'Monday.com', aliases: ['monday.com'], n8nNode: 'Monday.com' },
  { canonicalName: 'Asana', aliases: ['asana'], n8nNode: 'Asana' },
  { canonicalName: 'ClickUp', aliases: ['clickup', 'click up'], n8nNode: 'ClickUp' },
  { canonicalName: 'PandaDoc', aliases: ['pandadoc', 'panda doc'], n8nNode: 'PandaDoc' },
  { canonicalName: 'Instantly', aliases: ['instantly'], n8nNode: 'HTTP Request' },
  { canonicalName: 'Clay', aliases: ['clay'], n8nNode: 'HTTP Request' },
  { canonicalName: 'Looker Studio', aliases: ['looker studio', 'datastudio', 'data studio'], n8nNode: 'HTTP Request' },
  { canonicalName: 'Supermetrics', aliases: ['supermetrics'], n8nNode: 'HTTP Request' },
  { canonicalName: 'GitHub', aliases: ['github'], n8nNode: 'GitHub' },
  { canonicalName: 'GitLab', aliases: ['gitlab', 'git lab'], n8nNode: 'GitLab' },
  { canonicalName: 'Jira', aliases: ['jira'], n8nNode: 'Jira Software' },
  { canonicalName: 'Linear', aliases: ['linear'], n8nNode: 'Linear' },
  { canonicalName: 'Vercel', aliases: ['vercel'], n8nNode: 'HTTP Request' },
  { canonicalName: 'Sentry', aliases: ['sentry'], n8nNode: 'Sentry' },
  { canonicalName: 'PostHog', aliases: ['posthog', 'post hog'], n8nNode: 'HTTP Request' },
  { canonicalName: 'Muck Rack', aliases: ['muck rack', 'muckrack'], n8nNode: 'HTTP Request' },
  { canonicalName: 'Cision', aliases: ['cision'], n8nNode: 'HTTP Request' },
  { canonicalName: 'Meltwater', aliases: ['meltwater'], n8nNode: 'HTTP Request' },
  { canonicalName: 'Prowly', aliases: ['prowly'], n8nNode: 'HTTP Request' },
  { canonicalName: 'CoverageBook', aliases: ['coveragebook', 'coverage book'], n8nNode: 'HTTP Request' },
  { canonicalName: 'Shopify', aliases: ['shopify'], n8nNode: 'Shopify' },
  { canonicalName: 'Klaviyo', aliases: ['klaviyo'], n8nNode: 'Klaviyo' },
  { canonicalName: 'Intercom', aliases: ['intercom'], n8nNode: 'HTTP Request' },
  { canonicalName: 'Typeform', aliases: ['typeform'], n8nNode: 'HTTP Request' },
  { canonicalName: 'Gorgias', aliases: ['gorgias'], n8nNode: 'HTTP Request' },
  { canonicalName: 'ShipStation', aliases: ['shipstation', 'ship station'], n8nNode: 'HTTP Request' },
  { canonicalName: 'Recharge', aliases: ['recharge', 'recharge payments'], n8nNode: 'HTTP Request' },
  { canonicalName: 'Zendesk', aliases: ['zendesk'], n8nNode: 'Zendesk' },
  { canonicalName: 'Google Merchant Center', aliases: ['google merchant center', 'merchant center'], n8nNode: 'HTTP Request' },
  { canonicalName: 'n8n', aliases: ['n8n'], n8nNode: null, notes: 'n8n is the orchestration layer, not an external app node.' },
]

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)]
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function splitSignals(value: string): string[] {
  return value
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function asNumber(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

function findToolCatalogEntry(rawTool: string): ToolCatalogEntry | null {
  const normalized = normalizeToken(rawTool)
  if (!normalized) return null

  for (const entry of TOOL_CATALOG) {
    if (normalizeToken(entry.canonicalName) === normalized) return entry
    if (entry.aliases.some((alias) => normalizeToken(alias) === normalized)) return entry
  }

  for (const entry of TOOL_CATALOG) {
    if (normalized.includes(normalizeToken(entry.canonicalName))) return entry
    if (entry.aliases.some((alias) => normalized.includes(normalizeToken(alias)))) return entry
  }

  return null
}

function detectTools(input: AuditLikeInput): ToolCatalogEntry[] {
  const rawTools = unique([
    ...splitList(input.tools),
    ...splitList(input.websiteDetectedStack ?? ''),
    input.crmTool,
    input.progressTracking,
    input.leadEntry,
  ])

  const detected: ToolCatalogEntry[] = []
  const seen = new Set<string>()

  for (const rawTool of rawTools) {
    const entry = findToolCatalogEntry(rawTool)
    if (!entry || seen.has(entry.canonicalName)) continue
    seen.add(entry.canonicalName)
    detected.push(entry)
  }

  return detected
}

function midpointForTeamSize(teamSize: string): number {
  const normalized = normalizeToken(teamSize)
  if (normalized.includes('just me')) return 1
  if (normalized.includes('2 5')) return 3.5
  if (normalized.includes('6 15')) return 10.5
  if (normalized.includes('16 30')) return 23
  if (normalized.includes('31 50')) return 40.5
  if (normalized.includes('50')) return 60
  return 8
}

function midpointForRevenue(revenue: string): number {
  const normalized = normalizeToken(revenue)
  if (normalized.includes('under 10k')) return 8_000
  if (normalized.includes('10k 25k')) return 17_500
  if (normalized.includes('25k 50k')) return 37_500
  if (normalized.includes('50k 100k')) return 75_000
  if (normalized.includes('100k 250k')) return 175_000
  if (normalized.includes('250k')) return 300_000
  return 50_000
}

function estimateHourlyRate(input: AuditLikeInput): number {
  const revenueMidpoint = midpointForRevenue(input.revenue)
  const teamMidpoint = midpointForTeamSize(input.teamSize)
  const perHeadMonthlyRevenue = revenueMidpoint / Math.max(teamMidpoint, 1)
  const hourlyRate = Math.round((perHeadMonthlyRevenue / 160) * 1.05)
  return Math.max(30, Math.min(hourlyRate, 180))
}

function midpointForClientLoad(activeClients: string): number {
  const values = activeClients.match(/\d+/g)?.map((value) => Number(value)).filter(Number.isFinite) ?? []
  if (values.length >= 2) return Math.round((values[0] + values[1]) / 2)
  if (values.length === 1) return values[0]
  return 12
}

function benchmarkHoursForTeamSize(teamSize: string): number {
  const normalized = normalizeToken(teamSize)
  if (normalized.includes('just me') || normalized.includes('2 5')) return 18
  if (normalized.includes('6 15')) return 38
  if (normalized.includes('16 30')) return 65
  if (normalized.includes('31 50')) return 100
  if (normalized.includes('50')) return 160
  return 38
}

function healthyOpsRatioForRevenue(revenue: string): number {
  const normalized = normalizeToken(revenue)
  if (normalized.includes('under 10k') || normalized.includes('10k 25k') || normalized.includes('25k 50k')) return 30
  if (normalized.includes('50k 100k')) return 35
  if (normalized.includes('100k 250k')) return 25
  if (normalized.includes('250k')) return 22
  return 30
}

function maturityCategoryForScore(score: number): { category: string; percentile: string } {
  if (score <= 25) return { category: 'Manual Chaos', percentile: 'bottom 20% of agencies your size' }
  if (score <= 50) return { category: 'Partially Automated', percentile: 'bottom 45% of agencies your size' }
  if (score <= 75) return { category: 'Systematized', percentile: 'top 45% of agencies your size' }
  return { category: 'Intelligent Ops', percentile: 'top 15% of agencies your size' }
}

function buildGroundingContext(input: AuditLikeInput): GroundingContext {
  const detectedTools = detectTools(input)
  const allowedNodes = unique([
    ...CORE_N8N_NODES,
    ...detectedTools.map((tool) => tool.n8nNode).filter((node): node is string => Boolean(node)),
    'OpenAI',
  ]).sort()

  return {
    detectedTools,
    allowedNodes,
    allowedToolNames: detectedTools.map((tool) => tool.canonicalName),
    primaryCrm: findToolCatalogEntry(input.crmTool)?.canonicalName ?? input.crmTool ?? null,
    hourlyRate: estimateHourlyRate(input),
  }
}

function quoteList(items: string[]): string {
  return items.length > 0 ? items.map((item) => `"${item}"`).join(', ') : 'none'
}

export function buildAuditGroundingPrompt(input: AuditLikeInput): string {
  const context = buildGroundingContext(input)

  return `
GROUNDING CONTEXT — use this as the source of truth for tool references and savings calculations:
- Detected client tools: ${quoteList(context.allowedToolNames)}
- Public website stack hints: ${quoteList(splitList(input.websiteDetectedStack ?? ''))}
- Primary CRM: ${context.primaryCrm ? `"${context.primaryCrm}"` : 'unknown'}
- Estimated loaded labor rate for savings math: $${context.hourlyRate}/hour

GROUNDING RULES:
- Only reference tools from the client's confirmed stack in opportunity titles and hard_truth.
- Use the estimated labor rate above to keep monthly_savings calculations realistic.
- Opportunity titles must name at least one of the client's real tools.
`.trim()
}

function clampNumber(value: unknown, fallback: number, options: { min?: number; max?: number } = {}): number {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return fallback
  const min = options.min ?? number
  const max = options.max ?? number
  return Math.max(min, Math.min(Math.round(number), max))
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeDifficulty(value: unknown): 'easy' | 'medium' | 'complex' {
  const normalized = normalizeToken(String(value ?? ''))
  if (normalized === 'easy' || normalized === 'medium' || normalized === 'complex') return normalized
  return 'medium'
}

function deriveBiggestFrictionPoint(
  input: AuditLikeInput,
  context: GroundingContext,
  opportunities: Record<string, unknown>[],
): string {
  const declaredSignals = splitSignals(input.toolSignals ?? '')
  if (declaredSignals[0]) return declaredSignals[0]

  const topOpportunity = asString(opportunities[0]?.title)
  if (topOpportunity) return `${topOpportunity} is carrying the most operational drag right now.`

  if (context.allowedToolNames.length > 1) {
    return `The biggest drag is the manual bridge between ${context.allowedToolNames.slice(0, 2).join(' and ')}.`
  }

  return `The core friction point is still "${input.automationWish}", which is forcing manual coordination and follow-up.`
}

function deriveCurrentStackRating(input: AuditLikeInput, context: GroundingContext): number {
  const toolCount = unique([
    ...splitList(input.tools),
    input.crmTool,
    input.leadEntry,
    input.progressTracking,
  ]).filter(Boolean).length
  const signalCount = splitSignals(input.toolSignals ?? '').length
  const crmToken = normalizeToken(input.crmTool)

  let rating = 8
  if (toolCount >= 8) rating -= 2
  else if (toolCount >= 5) rating -= 1
  if (signalCount >= 2) rating -= 1
  if (crmToken.includes('spreadsheet') || crmToken.includes('manual')) rating -= 2
  if (context.allowedToolNames.length >= 4) rating += 1

  return Math.max(2, Math.min(rating, 9))
}

function buildFallbackToolsAnalysis(
  input: AuditLikeInput,
  context: GroundingContext,
  opportunities: Record<string, unknown>[],
): Record<string, unknown> {
  return {
    current_stack_rating: deriveCurrentStackRating(input, context),
    biggest_friction_point: deriveBiggestFrictionPoint(input, context, opportunities),
    redundant_tools: [],
    recommended_additions: [],
  }
}

function buildFallbackRoadmap(
  input: AuditLikeInput,
  opportunities: Record<string, unknown>[],
): Record<string, unknown> {
  const titles = opportunities
    .map((opportunity) => asString(opportunity.title))
    .filter((title): title is string => Boolean(title))

  const quickWins = titles.slice(0, 2)
  const coreSystems = titles.slice(1, 3)
  const intelligenceLayer = titles.slice(2, 5)

  return {
    phase_1_quick_wins: quickWins.length > 0
      ? `Start with ${quickWins.join(' and ')} to remove the fastest recurring manual drag in the next 1-2 weeks.`
      : 'Start with the most repetitive handoff first so the team gets immediate time back.',
    phase_2_core_systems: coreSystems.length > 0
      ? `Use month 1 to productionize ${coreSystems.join(' and ')} with alerts, retries, and clean ownership.`
      : 'Use month 1 to lock the core client-facing handoffs into one reliable system.',
    phase_3_intelligence_layer: intelligenceLayer.length > 0
      ? `By month 3, layer in ${intelligenceLayer.join(', ')} plus reporting, prioritization, and exception handling.`
      : 'By month 3, add monitoring, prioritization, and exception handling so operations stay ahead of growth.',
    path_to_vision: `This roadmap moves the team toward "${input.futureVision}" by turning the current bottleneck around "${input.automationWish}" into a repeatable operating system.`,
  }
}

function buildFallbackPriorityRoadmap(opportunities: Record<string, unknown>[]): Record<string, unknown> {
  const titles = opportunities
    .map((opportunity) => asString(opportunity.title))
    .filter((title): title is string => Boolean(title))

  return {
    week_1: titles[0]
      ? `Map the trigger, required fields, and owner for ${titles[0]}, then ship the first stable workflow.`
      : 'Map the highest-frequency bottleneck and ship the first stable workflow.',
    month_1: titles[1]
      ? `Extend automation into ${titles[1]} and add alerting, retries, and duplicate protection.`
      : 'Expand automation into the next cross-team handoff and add safeguards.',
    month_3: titles[2]
      ? `Unify ${titles.slice(0, 3).join(', ')} into one monitored system with reporting and exception handling.`
      : 'Unify the first workflows into one monitored operating layer with reporting and exception handling.',
  }
}

function buildFallbackLaborArbitrage(
  context: GroundingContext,
  totalHoursSavedWeekly: number,
): Record<string, unknown> {
  const weeklyHours = Math.max(totalHoursSavedWeekly, 8)
  const annualLaborWaste = Math.round(weeklyHours * context.hourlyRate * 52)

  return {
    estimated_hourly_rate: context.hourlyRate,
    hours_wasted_on_low_value_weekly: weeklyHours,
    annual_labor_waste: annualLaborWaste,
    explanation: `$${context.hourlyRate}/hr x ${weeklyHours} hrs/week x 52 weeks = $${annualLaborWaste.toLocaleString()}/year in avoidable labor drag.`,
  }
}

function buildFallbackContextSwitching(
  input: AuditLikeInput,
  context: GroundingContext,
): Record<string, unknown> {
  const toolsCount = Math.max(context.allowedToolNames.length, unique([
    ...splitList(input.tools),
    input.crmTool,
    input.leadEntry,
    input.progressTracking,
  ]).filter(Boolean).length)
  const switchingHeadcount = Math.max(1, Math.min(Math.round(midpointForTeamSize(input.teamSize) * 0.35), 6))
  const estimatedDailySwitches = Math.max(10, Math.min(70, Math.round(toolsCount * (switchingHeadcount + 2))))
  const timeLostDailyMinutes = estimatedDailySwitches * 17
  const annualCost = Math.round((timeLostDailyMinutes / 60) * context.hourlyRate * 260 * switchingHeadcount)

  return {
    tools_count: toolsCount,
    estimated_daily_switches: estimatedDailySwitches,
    time_lost_daily_minutes: timeLostDailyMinutes,
    annual_cost: annualCost,
  }
}

function buildFallbackOnboardingAssessment(input: AuditLikeInput): Record<string, unknown> {
  const normalizedOnboarding = normalizeToken(input.onboarding)
  const currentHours = normalizedOnboarding.includes('wing it')
    ? '4-6 hours'
    : normalizedOnboarding.includes('email') || normalizedOnboarding.includes('manual')
      ? '3-5 hours'
      : '2-4 hours'
  const automatedTime = normalizedOnboarding.includes('wing it') ? '35-50 minutes' : '25-40 minutes'
  const clientLoad = midpointForClientLoad(input.activeClients)

  return {
    current_state: `Right now onboarding looks like: ${input.onboarding}.`,
    time_per_client_current: currentHours,
    time_per_client_automated: automatedTime,
    revenue_impact: `At roughly ${clientLoad} active clients, compressing onboarding admin creates more delivery capacity and lowers the odds of rough starts that hurt trust.`,
  }
}

function buildFallbackBenchmarks(
  input: AuditLikeInput,
  totalHoursSavedWeekly: number,
  totalMonthlySavings: number,
  readinessScore: number,
): Record<string, unknown> {
  const industryAverage = benchmarkHoursForTeamSize(input.teamSize)
  const theirHours = Math.max(totalHoursSavedWeekly, Math.round(industryAverage * 0.95))
  const percentDifference = Math.round(((theirHours - industryAverage) / industryAverage) * 100)
  const healthyRatioPercent = healthyOpsRatioForRevenue(input.revenue)
  const revenueMidpoint = midpointForRevenue(input.revenue)
  const theirRatioPercent = Math.max(4, Math.min(70, Math.round((totalMonthlySavings / Math.max(revenueMidpoint, 1)) * 100)))
  const maturity = maturityCategoryForScore(readinessScore)

  return {
    hours_wasted_vs_average: {
      their_hours: theirHours,
      industry_average: industryAverage,
      percent_difference: percentDifference,
      verdict: percentDifference >= 40 ? 'critical' : percentDifference >= 15 ? 'above average' : percentDifference <= -10 ? 'below average' : 'average',
    },
    ops_cost_ratio: {
      their_ratio_percent: theirRatioPercent,
      healthy_ratio_percent: healthyRatioPercent,
      verdict: theirRatioPercent > healthyRatioPercent + 8
        ? 'Their ops drag is above the healthy range for this revenue band.'
        : theirRatioPercent < healthyRatioPercent - 5
          ? 'Their ops cost ratio is better than the typical benchmark for this revenue band.'
          : 'Their ops cost ratio is roughly in line with the benchmark for this revenue band.',
    },
    automation_maturity: {
      their_score: readinessScore,
      category: maturity.category,
      percentile: maturity.percentile,
    },
  }
}

function buildFallbackOpportunities(input: AuditLikeInput, context: GroundingContext): OpportunityLike[] {
  const crm = context.primaryCrm && context.allowedToolNames.includes(context.primaryCrm)
    ? context.primaryCrm
    : context.allowedToolNames[0] ?? 'the CRM'

  return [
    {
      title: `${crm} lead capture and qualification`,
      hard_truth: `New lead intake is still creating drag around "${input.automationWish}". Slow qualification means slower follow-up and wasted sales capacity.`,
      urgency_reason: `Every week this runs manually is another week of delayed follow-ups and potential deals falling through the cracks.`,
      difficulty: 'easy',
      hours_saved_weekly: 6,
    },
    {
      title: 'Client onboarding handoff automation',
      hard_truth: `The current onboarding process (${input.onboarding}) is creating avoidable handoff risk and inconsistent client setup quality.`,
      urgency_reason: `Rough onboarding experiences compound — each bad start increases churn risk and damages referrals.`,
      difficulty: 'medium',
      hours_saved_weekly: 8,
    },
    {
      title: 'Operational reporting and status sync',
      hard_truth: `Tracking work through "${input.progressTracking}" makes reporting slower and increases the chance that client updates are late or incomplete.`,
      urgency_reason: `Late status updates erode client trust faster than almost any other ops failure — and this one is entirely preventable.`,
      difficulty: 'medium',
      hours_saved_weekly: 5,
    },
    {
      title: 'Cross-tool data consistency workflow',
      hard_truth: `The stack (${input.tools}) relies on manual updates across tools, which makes data drift and duplicate entry almost guaranteed as the agency grows.`,
      urgency_reason: `Data inconsistency gets exponentially worse as client volume grows — fixing it now costs a fraction of what it will cost at scale.`,
      difficulty: 'complex',
      hours_saved_weekly: 10,
    },
  ]
}

function normalizeOpportunity(
  rawOpportunity: unknown,
  index: number,
  context: GroundingContext,
): Record<string, unknown> {
  const opportunity = (rawOpportunity && typeof rawOpportunity === 'object' && !Array.isArray(rawOpportunity))
    ? rawOpportunity as OpportunityLike
    : {}

  const difficulty = normalizeDifficulty(opportunity.difficulty)
  const hoursSavedWeekly = clampNumber(opportunity.hours_saved_weekly, 4 + index * 2, { min: 1, max: 80 })
  const monthlySavings = clampNumber(
    opportunity.monthly_savings,
    Math.round(hoursSavedWeekly * context.hourlyRate * 4.33),
    { min: 250, max: 200_000 },
  )

  return {
    rank: clampNumber(opportunity.rank, index + 1, { min: 1, max: 6 }),
    title: asString(opportunity.title) ?? `Automation opportunity ${index + 1}`,
    hard_truth: asString(opportunity.hard_truth) ?? 'Manual work is creating avoidable labor cost and response delays.',
    hours_saved_weekly: hoursSavedWeekly,
    monthly_savings: monthlySavings,
    difficulty,
    quick_win: difficulty === 'easy',
    urgency_reason: asString(opportunity.urgency_reason) ?? null,
  }
}

function normalizeTopLevelFields(
  raw: Record<string, unknown>,
  input: AuditLikeInput,
  stage: AuditStage,
  context: GroundingContext,
): Record<string, unknown> {
  const opportunities = Array.isArray(raw.opportunities) ? raw.opportunities : []
  const minimumCount = stage === 'preview' ? 2 : 4
  const supplemented = opportunities.slice()

  for (const fallback of buildFallbackOpportunities(input, context)) {
    if (supplemented.length >= minimumCount) break
    supplemented.push(fallback)
  }

  const normalizedOpportunities = supplemented
    .slice(0, stage === 'preview' ? 2 : 6)
    .map((opportunity, index) => normalizeOpportunity(opportunity, index, context))

  const totalHoursSavedWeekly = normalizedOpportunities.reduce((sum, opportunity) => {
    const value = typeof opportunity.hours_saved_weekly === 'number' ? opportunity.hours_saved_weekly : 0
    return sum + value
  }, 0)

  const totalMonthlySavings = normalizedOpportunities.reduce((sum, opportunity) => {
    const value = typeof opportunity.monthly_savings === 'number' ? opportunity.monthly_savings : 0
    return sum + value
  }, 0)

  const readinessScore = clampNumber(raw.automation_readiness_score, 52, { min: 1, max: 100 })
  const summarySource = asRecord(raw.summary)
  const toolsAnalysisSource = asRecord(raw.tools_analysis)
  const fallbackToolsAnalysis = buildFallbackToolsAnalysis(input, context, normalizedOpportunities)

  const normalized: Record<string, unknown> = {
    ...raw,
    executive_summary: asString(raw.executive_summary) ?? `This ${input.agencyType} team is losing time to manual operational work that can be systemized with n8n and their current stack.`,
    estimated_monthly_waste: clampNumber(raw.estimated_monthly_waste, Math.round(totalMonthlySavings), { min: 500, max: 500_000 }),
    estimated_annual_waste: clampNumber(raw.estimated_annual_waste, Math.round(totalMonthlySavings * 12), { min: 6_000, max: 6_000_000 }),
    automation_readiness_score: readinessScore,
    opportunities: normalizedOpportunities,
    summary: {
      ...summarySource,
      total_hours_saved_weekly: clampNumber(
        summarySource.total_hours_saved_weekly,
        totalHoursSavedWeekly,
        { min: 1, max: 200 },
      ),
      total_annual_cost_savings: clampNumber(
        summarySource.total_annual_cost_savings,
        Math.round(totalMonthlySavings * 12),
        { min: 6_000, max: 6_000_000 },
      ),
      automation_readiness_score: clampNumber(
        summarySource.automation_readiness_score,
        readinessScore,
        { min: 1, max: 100 },
      ),
      headline: asString(summarySource.headline) ?? 'Highest-leverage automations for this agency',
    },
    tools_analysis: {
      ...toolsAnalysisSource,
      current_stack_rating: clampNumber(
        toolsAnalysisSource.current_stack_rating,
        asNumber(fallbackToolsAnalysis.current_stack_rating) ?? 6,
        { min: 1, max: 10 },
      ),
      biggest_friction_point: asString(toolsAnalysisSource.biggest_friction_point)
        ?? asString(fallbackToolsAnalysis.biggest_friction_point)
        ?? `The biggest friction point is still "${input.automationWish}".`,
      redundant_tools: asStringArray(toolsAnalysisSource.redundant_tools),
      recommended_additions: asStringArray(toolsAnalysisSource.recommended_additions),
    },
  }

  if (stage === 'preview') {
    normalized.preview_notice = asString(raw.preview_notice)
      ?? 'Unlock the full blueprint to get the roadmap, implementation steps, node-level architecture, and execution guidance.'
    return normalized
  }

  const roadmapSource = asRecord(raw.roadmap)
  const priorityRoadmapSource = asRecord(raw.priority_roadmap)
  const laborSource = asRecord(raw.labor_arbitrage_breakdown)
  const contextSwitchingSource = asRecord(raw.context_switching_analysis)
  const onboardingSource = asRecord(raw.onboarding_assessment)
  const benchmarksSource = asRecord(raw.benchmarks)
  const hoursBenchmarkSource = asRecord(benchmarksSource.hours_wasted_vs_average)
  const opsRatioSource = asRecord(benchmarksSource.ops_cost_ratio)
  const automationMaturitySource = asRecord(benchmarksSource.automation_maturity)

  const fallbackRoadmap = buildFallbackRoadmap(input, normalizedOpportunities)
  const fallbackPriorityRoadmap = buildFallbackPriorityRoadmap(normalizedOpportunities)
  const fallbackLabor = buildFallbackLaborArbitrage(context, totalHoursSavedWeekly)
  const fallbackContextSwitching = buildFallbackContextSwitching(input, context)
  const fallbackOnboarding = buildFallbackOnboardingAssessment(input)
  const fallbackBenchmarks = buildFallbackBenchmarks(input, totalHoursSavedWeekly, totalMonthlySavings, readinessScore)
  const fallbackHoursBenchmark = asRecord(fallbackBenchmarks.hours_wasted_vs_average)
  const fallbackOpsRatio = asRecord(fallbackBenchmarks.ops_cost_ratio)
  const fallbackAutomationMaturity = asRecord(fallbackBenchmarks.automation_maturity)

  normalized.roadmap = {
    ...roadmapSource,
    phase_1_quick_wins: asString(roadmapSource.phase_1_quick_wins) ?? asString(fallbackRoadmap.phase_1_quick_wins),
    phase_2_core_systems: asString(roadmapSource.phase_2_core_systems) ?? asString(fallbackRoadmap.phase_2_core_systems),
    phase_3_intelligence_layer: asString(roadmapSource.phase_3_intelligence_layer) ?? asString(fallbackRoadmap.phase_3_intelligence_layer),
    path_to_vision: asString(roadmapSource.path_to_vision) ?? asString(fallbackRoadmap.path_to_vision),
  }

  normalized.priority_roadmap = {
    ...priorityRoadmapSource,
    week_1: asString(priorityRoadmapSource.week_1) ?? asString(fallbackPriorityRoadmap.week_1),
    month_1: asString(priorityRoadmapSource.month_1) ?? asString(fallbackPriorityRoadmap.month_1),
    month_3: asString(priorityRoadmapSource.month_3) ?? asString(fallbackPriorityRoadmap.month_3),
  }

  normalized.labor_arbitrage_breakdown = {
    ...laborSource,
    estimated_hourly_rate: clampNumber(
      laborSource.estimated_hourly_rate,
      asNumber(fallbackLabor.estimated_hourly_rate) ?? context.hourlyRate,
      { min: 30, max: 180 },
    ),
    hours_wasted_on_low_value_weekly: clampNumber(
      laborSource.hours_wasted_on_low_value_weekly,
      asNumber(fallbackLabor.hours_wasted_on_low_value_weekly) ?? 8,
      { min: 1, max: 200 },
    ),
    annual_labor_waste: clampNumber(
      laborSource.annual_labor_waste,
      asNumber(fallbackLabor.annual_labor_waste) ?? 10_000,
      { min: 1_000, max: 6_000_000 },
    ),
    explanation: asString(laborSource.explanation) ?? asString(fallbackLabor.explanation),
  }

  normalized.context_switching_analysis = {
    ...contextSwitchingSource,
    tools_count: clampNumber(
      contextSwitchingSource.tools_count,
      asNumber(fallbackContextSwitching.tools_count) ?? 3,
      { min: 1, max: 20 },
    ),
    estimated_daily_switches: clampNumber(
      contextSwitchingSource.estimated_daily_switches,
      asNumber(fallbackContextSwitching.estimated_daily_switches) ?? 12,
      { min: 1, max: 100 },
    ),
    time_lost_daily_minutes: clampNumber(
      contextSwitchingSource.time_lost_daily_minutes,
      asNumber(fallbackContextSwitching.time_lost_daily_minutes) ?? 90,
      { min: 10, max: 1200 },
    ),
    annual_cost: clampNumber(
      contextSwitchingSource.annual_cost,
      asNumber(fallbackContextSwitching.annual_cost) ?? 10_000,
      { min: 1_000, max: 6_000_000 },
    ),
  }

  normalized.onboarding_assessment = {
    ...onboardingSource,
    current_state: asString(onboardingSource.current_state) ?? asString(fallbackOnboarding.current_state),
    time_per_client_current: asString(onboardingSource.time_per_client_current) ?? asString(fallbackOnboarding.time_per_client_current),
    time_per_client_automated: asString(onboardingSource.time_per_client_automated) ?? asString(fallbackOnboarding.time_per_client_automated),
    revenue_impact: asString(onboardingSource.revenue_impact) ?? asString(fallbackOnboarding.revenue_impact),
  }

  normalized.benchmarks = {
    ...benchmarksSource,
    hours_wasted_vs_average: {
      ...hoursBenchmarkSource,
      their_hours: clampNumber(hoursBenchmarkSource.their_hours, asNumber(fallbackHoursBenchmark.their_hours) ?? 20, { min: 1, max: 300 }),
      industry_average: clampNumber(hoursBenchmarkSource.industry_average, asNumber(fallbackHoursBenchmark.industry_average) ?? 38, { min: 1, max: 300 }),
      percent_difference: clampNumber(hoursBenchmarkSource.percent_difference, asNumber(fallbackHoursBenchmark.percent_difference) ?? 0, { min: -100, max: 400 }),
      verdict: asString(hoursBenchmarkSource.verdict) ?? asString(fallbackHoursBenchmark.verdict),
    },
    ops_cost_ratio: {
      ...opsRatioSource,
      their_ratio_percent: clampNumber(opsRatioSource.their_ratio_percent, asNumber(fallbackOpsRatio.their_ratio_percent) ?? 20, { min: 1, max: 100 }),
      healthy_ratio_percent: clampNumber(opsRatioSource.healthy_ratio_percent, asNumber(fallbackOpsRatio.healthy_ratio_percent) ?? 30, { min: 1, max: 100 }),
      verdict: asString(opsRatioSource.verdict) ?? asString(fallbackOpsRatio.verdict),
    },
    automation_maturity: {
      ...automationMaturitySource,
      their_score: clampNumber(automationMaturitySource.their_score, asNumber(fallbackAutomationMaturity.their_score) ?? readinessScore, { min: 1, max: 100 }),
      category: asString(automationMaturitySource.category) ?? asString(fallbackAutomationMaturity.category),
      percentile: asString(automationMaturitySource.percentile) ?? asString(fallbackAutomationMaturity.percentile),
    },
  }

  return normalized
}

export function groundAuditResult(
  raw: Record<string, unknown>,
  input: AuditLikeInput,
  stage: AuditStage,
): Record<string, unknown> {
  const context = buildGroundingContext(input)
  const normalized = normalizeTopLevelFields(raw, input, stage, context)
  return normalized
}

function buildOpportunityCorpus(opportunity: OpportunityLike): string {
  return normalizeToken([
    asString(opportunity.title),
    asString(opportunity.hard_truth),
    asString(opportunity.urgency_reason),
  ].filter(Boolean).join(' '))
}

function opportunityMentionsClientContext(
  opportunity: OpportunityLike,
  input: AuditLikeInput,
  context: GroundingContext,
): boolean {
  const corpus = buildOpportunityCorpus(opportunity)
  if (!corpus) return false

  const painSignals = [
    input.automationWish,
    ...splitSignals(input.toolSignals ?? ''),
    input.processOwner,
    input.failureImpact,
    ...context.allowedToolNames,
  ]

  return painSignals
    .map((signal) => normalizeToken(signal))
    .filter(Boolean)
    .some((signal) => corpus.includes(signal))
}

function savingsMathLooksReasonable(
  opportunity: OpportunityLike,
  context: GroundingContext,
): boolean {
  const hoursSavedWeekly = asNumber(opportunity.hours_saved_weekly)
  const monthlySavings = asNumber(opportunity.monthly_savings)
  if (hoursSavedWeekly == null || monthlySavings == null || hoursSavedWeekly <= 0) return false

  const expectedSavings = hoursSavedWeekly * context.hourlyRate * 4.33
  const ratio = monthlySavings / Math.max(expectedSavings, 1)
  return ratio >= 0.45 && ratio <= 1.65
}

export function assessAuditConfidence(
  audit: Record<string, unknown>,
  input: AuditLikeInput,
  stage: AuditStage,
): ConfidenceReport {
  const context = buildGroundingContext(input)
  const opportunities = Array.isArray(audit.opportunities) ? audit.opportunities : []
  const opportunityIssues: string[][] = []
  const opportunityScores = opportunities.map((rawOpportunity) => {
    const opportunity = rawOpportunity && typeof rawOpportunity === 'object' && !Array.isArray(rawOpportunity)
      ? rawOpportunity as OpportunityLike
      : {}

    const hasSolidSavings = typeof opportunity.hours_saved_weekly === 'number' && opportunity.hours_saved_weekly > 0
    const hasHardTruth = Boolean(asString(opportunity.hard_truth))
    const hasUrgencyReason = Boolean(asString(opportunity.urgency_reason))
    const mentionsClientContext = opportunityMentionsClientContext(opportunity, input, context)
    const savingsLooksReasonable = savingsMathLooksReasonable(opportunity, context)
    const issues: string[] = []

    let score = 35
    if (hasSolidSavings) score += 15
    else issues.push('Hours saved estimate is weak.')
    if (hasHardTruth) score += 15
    else issues.push('Hard truth is missing.')
    if (hasUrgencyReason) score += 10
    else issues.push('Urgency reason is missing.')
    if (mentionsClientContext) score += 15
    else issues.push('Recommendation does not clearly reflect the client-specific pain or stack.')
    if (savingsLooksReasonable) score += 10
    else issues.push('Savings math falls outside the expected range.')

    opportunityIssues.push(issues)
    return Math.max(0, Math.min(score, 100))
  })

  const base =
    opportunityScores.length > 0
      ? Math.round(opportunityScores.reduce((sum, score) => sum + score, 0) / opportunityScores.length)
      : 40

  const executiveSummary = asString(audit.executive_summary)
  const readiness = typeof audit.automation_readiness_score === 'number'
    ? audit.automation_readiness_score
    : null
  const laborBreakdown = asRecord(audit.labor_arbitrage_breakdown)
  const contextSwitching = asRecord(audit.context_switching_analysis)
  const onboardingAssessment = asRecord(audit.onboarding_assessment)
  const evidenceSignals = [
    splitList(input.tools).length > 0,
    Boolean(input.automationWish.trim()),
    Boolean(input.processFrequency.trim()),
    Boolean(input.processOwner.trim()),
    Boolean(input.failureImpact.trim()),
    splitSignals(input.toolSignals ?? '').length > 0,
    Boolean((input.websiteEvidence ?? '').trim() || (input.websiteStackEvidence ?? '').trim() || (input.websiteVisualEvidence ?? '').trim() || (input.websiteDetectedStack ?? '').trim()),
  ]
  const lowEvidenceMode = evidenceSignals.filter(Boolean).length < 4
  const issues: string[] = []

  let overall = base
  if (executiveSummary) overall += 5
  else issues.push('Executive summary is missing.')
  if (readiness != null && readiness >= 1 && readiness <= 100) overall += 5
  else issues.push('Automation readiness score is missing or invalid.')
  if (stage === 'full' && asString(laborBreakdown.explanation) && asString(onboardingAssessment.current_state) && asNumber(contextSwitching.annual_cost) != null) {
    overall += 5
  } else if (stage === 'full') {
    issues.push('One or more supporting analysis sections are too thin.')
  }
  if (!lowEvidenceMode) overall += 5
  else issues.push('Evidence is thin, so recommendations should stay conservative.')
  if (opportunityScores.some((score) => score < (stage === 'preview' ? 65 : 70))) {
    issues.push('At least one recommendation failed the quality bar.')
  }

  return {
    overall: Math.max(0, Math.min(overall, 100)),
    opportunityScores,
    issues,
    opportunityIssues,
    lowEvidenceMode,
  }
}
