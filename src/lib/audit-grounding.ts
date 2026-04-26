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
  hourlyRateLabel: string
}

type CalculationSource = {
  value: number | null
  source: 'user_input' | 'knowledge_base' | 'ai_generated' | 'benchmark_estimate' | 'unavailable'
  confidence: 'high' | 'medium' | 'low'
  label?: string
}

type CalculationSources = Record<string, CalculationSource>

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

// Internal hourly labor costs (NOT billable rates) from research-04-hourly-rate-benchmarks.
// These represent what agencies PAY employees to do manual ops work, not what they CHARGE clients.
const INTERNAL_HOURLY_COSTS = {
  ops_coordinator: { min: 25, max: 35, blended: 30 },
  account_manager: { min: 40, max: 60, blended: 50 },
  project_manager: { min: 50, max: 70, blended: 60 },
  designer: { min: 50, max: 80, blended: 65 },
  content_creator: { min: 40, max: 70, blended: 55 },
  developer: { min: 70, max: 120, blended: 95 },
  strategist: { min: 60, max: 100, blended: 80 },
  blended_ops_waste: { min: 35, max: 55, blended: 45 },
} as const

// Agency segment → which role's rate to use for manual ops work.
function selectHourlyRateForSegment(agencyType: string | undefined): { rate: number; roleLabel: string } {
  const type = (agencyType || '').toLowerCase()
  if (type.includes('paid') || type.includes('performance')) {
    return { rate: INTERNAL_HOURLY_COSTS.account_manager.blended, roleLabel: 'account manager (paid-media ops)' }
  }
  if (type.includes('seo')) {
    return { rate: INTERNAL_HOURLY_COSTS.account_manager.blended, roleLabel: 'account manager (SEO ops)' }
  }
  if (type.includes('design') || type.includes('creative')) {
    return { rate: INTERNAL_HOURLY_COSTS.designer.blended, roleLabel: 'designer' }
  }
  if (type.includes('dev') || type.includes('engineering')) {
    return { rate: INTERNAL_HOURLY_COSTS.developer.blended, roleLabel: 'developer' }
  }
  if (type.includes('full')) {
    return { rate: INTERNAL_HOURLY_COSTS.blended_ops_waste.blended, roleLabel: 'blended ops (full-service)' }
  }
  return { rate: INTERNAL_HOURLY_COSTS.blended_ops_waste.blended, roleLabel: 'blended ops' }
}

const HOURLY_RATE_MIN = 25
const HOURLY_RATE_MAX = 70

function estimateHourlyRate(input: AuditLikeInput): { rate: number; label: string } {
  const { rate: baseRate, roleLabel } = selectHourlyRateForSegment(input.agencyType)
  const revenueMidpoint = midpointForRevenue(input.revenue)
  const teamMidpoint = midpointForTeamSize(input.teamSize)

  let adjusted = baseRate
  let adjustmentNote = ''
  if (revenueMidpoint > 0 && teamMidpoint > 0) {
    const revenuePerHead = revenueMidpoint / teamMidpoint
    if (revenuePerHead > 20000) {
      adjusted = Math.round(baseRate * 1.1)
      adjustmentNote = ', +10% for high revenue-per-head'
    } else if (revenuePerHead < 8000) {
      adjusted = Math.round(baseRate * 0.9)
      adjustmentNote = ', -10% for low revenue-per-head'
    }
  }

  const clampedRate = Math.min(Math.max(adjusted, HOURLY_RATE_MIN), HOURLY_RATE_MAX)
  if (adjusted !== clampedRate) {
    console.log(`[audit-grounding] clamped hourly rate from $${adjusted} to $${clampedRate}`)
  }

  return {
    rate: clampedRate,
    label: `Based on research-grounded internal labor cost for ${roleLabel}${adjustmentNote}`,
  }
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

  const hourlyEstimate = estimateHourlyRate(input)

  return {
    detectedTools,
    allowedNodes,
    allowedToolNames: detectedTools.map((tool) => tool.canonicalName),
    primaryCrm: null,
    hourlyRate: hourlyEstimate.rate,
    hourlyRateLabel: hourlyEstimate.label,
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
- Stated operations state: "${input.crmTool}"
- Estimated loaded labor rate for savings math: $${context.hourlyRate}/hour (${context.hourlyRateLabel})

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
    ...splitList(input.websiteDetectedStack ?? ''),
  ]).filter(Boolean).length
  const signalCount = splitSignals(input.toolSignals ?? '').length
  const opsStateToken = normalizeToken(input.crmTool)

  let rating = 8
  if (toolCount >= 8) rating -= 2
  else if (toolCount >= 5) rating -= 1
  if (signalCount >= 2) rating -= 1
  if (opsStateToken.includes('pure chaos')) rating -= 2
  else if (opsStateToken.includes('patchwork')) rating -= 1
  else if (opsStateToken.includes('mostly systematized')) rating += 1
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

function teamCapacityHoursPerWeek(teamSize: string): number {
  const teamMidpoint = midpointForTeamSize(teamSize)
  return teamMidpoint * 40
}

function buildFallbackContextSwitching(
  input: AuditLikeInput,
  context: GroundingContext,
): Record<string, unknown> {
  const toolsCount = Math.max(context.allowedToolNames.length, unique([
    ...splitList(input.tools),
    ...splitList(input.websiteDetectedStack ?? ''),
  ]).filter(Boolean).length)
  const switchingHeadcount = Math.max(1, Math.min(Math.round(midpointForTeamSize(input.teamSize) * 0.35), 6))
  const estimatedDailySwitches = Math.max(10, Math.min(70, Math.round(toolsCount * (switchingHeadcount + 2))))
  const rawTimeLostDailyMinutes = estimatedDailySwitches * 17

  // Cap context switching time at 15% of team's total weekly capacity
  const weeklyCapacityMinutes = teamCapacityHoursPerWeek(input.teamSize) * 60
  const maxSwitchingMinutesPerWeek = weeklyCapacityMinutes * 0.15
  const rawWeeklyMinutes = rawTimeLostDailyMinutes * 5
  const cappedWeeklyMinutes = Math.min(rawWeeklyMinutes, maxSwitchingMinutesPerWeek)
  const cappedDailyMinutes = Math.round(cappedWeeklyMinutes / 5)

  if (rawWeeklyMinutes > maxSwitchingMinutesPerWeek) {
    console.log(`[audit-grounding] context switching capped from ${rawWeeklyMinutes}min/week to ${cappedWeeklyMinutes}min/week (15% of ${weeklyCapacityMinutes}min capacity)`)
  }

  const annualCost = Math.round((cappedDailyMinutes / 60) * context.hourlyRate * 260 * switchingHeadcount)

  return {
    tools_count: toolsCount,
    estimated_daily_switches: estimatedDailySwitches,
    time_lost_daily_minutes: cappedDailyMinutes,
    annual_cost: annualCost,
  }
}

function buildFallbackOnboardingAssessment(input: AuditLikeInput): Record<string, unknown> {
  const clientLoad = midpointForClientLoad(input.activeClients)
  const costLine = asString(input.failureImpact)?.toLowerCase() || 'more wasted time, slower delivery, and less room to grow'

  return {
    current_state: `Right now, when "${input.automationWish}" breaks, ${input.leadEntry.toLowerCase()}.`,
    time_per_client_current: input.timeHeavy,
    time_per_client_automated: 'Meaningfully lower once the bottleneck is systemized',
    revenue_impact: `At roughly ${clientLoad} active clients, letting this stay manual for another 6 months means ${costLine}.`,
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


/**
 * Validate and sanitize the `pattern_match` field the LLM may emit per
 * opportunity. This is the code-level anti-fabrication guardrail:
 * - If the LLM hallucinates a source_file that wasn't actually retrieved,
 *   we drop the whole pattern_match (not just the filename) so users never
 *   see a citation detached from a real chunk.
 * - If no RAG context was injected at all, we drop pattern_match entirely.
 * - Empty/blank sub-fields collapse to null.
 */
function normalizePatternMatch(
  raw: unknown,
  allowedSources: Set<string> | null,
): Record<string, unknown> | null {
  // If RAG wasn't used for this audit, there's nothing to cite.
  if (!allowedSources || allowedSources.size === 0) return null

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>

  const sourceFile = asString(record.source_file)
  const observedIn = asString(record.observed_in)
  const similarityNote = asString(record.similarity_note)

  // Fabrication check: if the LLM put a filename here, it MUST be one we
  // actually retrieved. Anything else gets dropped on the floor.
  if (sourceFile && !allowedSources.has(sourceFile)) {
    console.warn(
      `[audit-grounding] dropped fabricated pattern_match source_file: ${sourceFile}`,
    )
    return null
  }

  // Need a similarity_note for the UI to have anything meaningful to show.
  if (!similarityNote) return null

  return {
    observed_in: observedIn ?? null,
    source_file: sourceFile ?? null,
    similarity_note: similarityNote,
  }
}

function normalizeOpportunity(
  rawOpportunity: unknown,
  index: number,
  context: GroundingContext,
  allowedSources: Set<string> | null,
): Record<string, unknown> {
  const opportunity = (rawOpportunity && typeof rawOpportunity === 'object' && !Array.isArray(rawOpportunity))
    ? rawOpportunity as OpportunityLike
    : {}

  const difficulty = normalizeDifficulty(opportunity.difficulty)
  const aiProvidedHours = asNumber(opportunity.hours_saved_weekly)
  const aiProvidedSavings = asNumber(opportunity.monthly_savings)
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
    confidence_level: (['high', 'medium', 'low'].includes(String(opportunity.confidence_level))
      ? String(opportunity.confidence_level) as 'high' | 'medium' | 'low'
      : null),
    urgency_reason: asString(opportunity.urgency_reason) ?? null,
    pattern_match: normalizePatternMatch(opportunity.pattern_match, allowedSources),
    calculation_sources: {
      hours_saved_weekly: {
        value: hoursSavedWeekly,
        source: aiProvidedHours != null ? 'ai_generated' : 'benchmark_estimate',
        confidence: aiProvidedHours != null ? 'medium' as const : 'low' as const,
        ...(aiProvidedHours == null ? { label: 'Estimated based on similar automations' } : {}),
      },
      monthly_savings: {
        value: monthlySavings,
        source: aiProvidedSavings != null ? 'ai_generated' : 'benchmark_estimate',
        confidence: aiProvidedSavings != null ? 'medium' as const : 'low' as const,
        ...(aiProvidedSavings == null ? { label: `Derived from hours × $${context.hourlyRate}/hr benchmark rate` } : {}),
      },
    },
  }
}

function normalizeTopLevelFields(
  raw: Record<string, unknown>,
  input: AuditLikeInput,
  stage: AuditStage,
  context: GroundingContext,
  allowedSources: Set<string> | null,
): Record<string, unknown> {
  const opportunities = Array.isArray(raw.opportunities) ? raw.opportunities : []

  const normalizedOpportunities = opportunities
    .slice(0, stage === 'preview' ? 2 : 6)
    .map((opportunity, index) => normalizeOpportunity(opportunity, index, context, allowedSources))

  const totalHoursSavedWeekly = normalizedOpportunities.reduce((sum, opportunity) => {
    const value = typeof opportunity.hours_saved_weekly === 'number' ? opportunity.hours_saved_weekly : 0
    return sum + value
  }, 0)

  const totalMonthlySavings = normalizedOpportunities.reduce((sum, opportunity) => {
    const value = typeof opportunity.monthly_savings === 'number' ? opportunity.monthly_savings : 0
    return sum + value
  }, 0)

  const aiProvidedReadiness = asNumber(raw.automation_readiness_score)
  // Fix E: calculate readiness from inputs instead of hardcoded 52
  const readinessToolsCount = unique([
    ...splitList(input.tools),
    ...splitList(input.websiteDetectedStack ?? ''),
  ]).filter(Boolean).length
  const manualProcessMentions = [
    input.automationWish,
    input.timeHeavy,
    input.failureImpact,
  ].filter((field) => field && field.trim().length > 0).length
  const canCalculateReadiness = readinessToolsCount > 0 || manualProcessMentions > 0
  const calculatedReadiness = canCalculateReadiness
    ? clampNumber(100 - (readinessToolsCount * 5) - (manualProcessMentions * 10), 30, { min: 1, max: 100 })
    : null
  const readinessScore = aiProvidedReadiness != null
    ? clampNumber(aiProvidedReadiness, 50, { min: 1, max: 100 })
    : (calculatedReadiness ?? null)
  const readinessIsBenchmark = aiProvidedReadiness == null
  const summarySource = asRecord(raw.summary)
  const toolsAnalysisSource = asRecord(raw.tools_analysis)
  const fallbackToolsAnalysis = buildFallbackToolsAnalysis(input, context, normalizedOpportunities)

  const aiProvidedMonthlyWaste = asNumber(raw.estimated_monthly_waste)
  const aiProvidedAnnualWaste = asNumber(raw.estimated_annual_waste)

  // ── Fix B: single source of truth for annual waste ────────────────────────
  // The reconciled annual waste is always sum(monthly_savings) × 12.
  // If the AI's original value diverges by more than 15%, we override and log.
  const reconciledAnnualWaste = Math.round(totalMonthlySavings * 12)
  const reconciledMonthlyWaste = Math.round(totalMonthlySavings)
  let annualWasteOverridden = false
  if (aiProvidedAnnualWaste != null && reconciledAnnualWaste > 0) {
    const divergence = Math.abs(aiProvidedAnnualWaste - reconciledAnnualWaste) / reconciledAnnualWaste
    if (divergence > 0.15) {
      console.log(
        `[audit-grounding] annual waste reconciliation: AI said $${aiProvidedAnnualWaste}, ` +
        `reconciled sum is $${reconciledAnnualWaste} (${Math.round(divergence * 100)}% divergence) — overriding`,
      )
      annualWasteOverridden = true
    }
  }
  const finalAnnualWaste = clampNumber(
    annualWasteOverridden ? reconciledAnnualWaste : (aiProvidedAnnualWaste ?? reconciledAnnualWaste),
    reconciledAnnualWaste,
    { min: 0, max: 6_000_000 },
  )
  const finalMonthlyWaste = clampNumber(
    annualWasteOverridden ? reconciledMonthlyWaste : (aiProvidedMonthlyWaste ?? reconciledMonthlyWaste),
    reconciledMonthlyWaste,
    { min: 0, max: 500_000 },
  )

  const calculationSources: CalculationSources = {
    estimated_hourly_rate: {
      value: context.hourlyRate,
      source: 'benchmark_estimate',
      confidence: 'medium',
      label: context.hourlyRateLabel,
    },
    automation_readiness_score: {
      value: readinessScore ?? null,
      source: readinessIsBenchmark ? (canCalculateReadiness ? 'benchmark_estimate' : 'unavailable') : 'ai_generated',
      confidence: readinessIsBenchmark ? (canCalculateReadiness ? 'low' : 'low') : 'medium',
      ...(readinessIsBenchmark ? { label: canCalculateReadiness ? 'Calculated from tool count and manual process signals' : 'Insufficient data to calculate readiness' } : {}),
    },
    estimated_monthly_waste: {
      value: finalMonthlyWaste,
      source: annualWasteOverridden || aiProvidedMonthlyWaste == null ? 'benchmark_estimate' : 'ai_generated',
      confidence: annualWasteOverridden || aiProvidedMonthlyWaste == null ? 'low' : 'medium',
      ...(annualWasteOverridden || aiProvidedMonthlyWaste == null ? { label: 'Derived from opportunity estimates' } : {}),
    },
    estimated_annual_waste: {
      value: finalAnnualWaste,
      source: annualWasteOverridden || aiProvidedAnnualWaste == null ? 'benchmark_estimate' : 'ai_generated',
      confidence: annualWasteOverridden || aiProvidedAnnualWaste == null ? 'low' : 'medium',
      ...(annualWasteOverridden || aiProvidedAnnualWaste == null ? { label: 'Reconciled from opportunity monthly_savings × 12' } : {}),
    },
  }

  const normalized: Record<string, unknown> = {
    ...raw,
    executive_summary: asString(raw.executive_summary) ?? 'Your audit was generated with limited information. For a more complete analysis, please retry with additional details about your team, tools, and specific pain points.',
    estimated_monthly_waste: finalMonthlyWaste,
    estimated_annual_waste: finalAnnualWaste,
    automation_readiness_score: readinessScore ?? undefined,
    opportunities: normalizedOpportunities,
    audit_incomplete: normalizedOpportunities.length === 0,
    calculation_sources: calculationSources,
    summary: {
      ...summarySource,
      total_hours_saved_weekly: clampNumber(
        summarySource.total_hours_saved_weekly,
        totalHoursSavedWeekly,
        { min: 0, max: 200 },
      ),
      total_annual_cost_savings: finalAnnualWaste,
      automation_readiness_score: readinessScore != null
        ? clampNumber(summarySource.automation_readiness_score, readinessScore, { min: 1, max: 100 })
        : undefined,
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
      ?? 'Book a call if you want help prioritizing or fixing what this diagnosis surfaced.'
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
  const fallbackBenchmarks = buildFallbackBenchmarks(input, totalHoursSavedWeekly, totalMonthlySavings, readinessScore ?? 50)
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

  const aiProvidedHourlyRate = asNumber(laborSource.estimated_hourly_rate)
  const aiProvidedHoursWasted = asNumber(laborSource.hours_wasted_on_low_value_weekly)
  const aiProvidedAnnualLaborWaste = asNumber(laborSource.annual_labor_waste)

  normalized.labor_arbitrage_breakdown = {
    ...laborSource,
    estimated_hourly_rate: clampNumber(
      laborSource.estimated_hourly_rate,
      asNumber(fallbackLabor.estimated_hourly_rate) ?? context.hourlyRate,
      { min: HOURLY_RATE_MIN, max: HOURLY_RATE_MAX },
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
    calculation_sources: {
      estimated_hourly_rate: {
        value: aiProvidedHourlyRate ?? context.hourlyRate,
        source: aiProvidedHourlyRate != null ? 'ai_generated' : 'benchmark_estimate' as const,
        confidence: aiProvidedHourlyRate != null ? 'medium' as const : 'low' as const,
        ...(aiProvidedHourlyRate == null ? { label: context.hourlyRateLabel } : {}),
      },
      annual_labor_waste: {
        value: aiProvidedAnnualLaborWaste ?? (asNumber(fallbackLabor.annual_labor_waste) ?? 10_000),
        source: aiProvidedAnnualLaborWaste != null ? 'ai_generated' : 'benchmark_estimate' as const,
        confidence: aiProvidedAnnualLaborWaste != null ? 'medium' as const : 'low' as const,
        ...(aiProvidedAnnualLaborWaste == null ? { label: 'Derived from benchmark hourly rate × estimated hours × 52 weeks' } : {}),
      },
      hours_wasted_on_low_value_weekly: {
        value: aiProvidedHoursWasted ?? (asNumber(fallbackLabor.hours_wasted_on_low_value_weekly) ?? 8),
        source: aiProvidedHoursWasted != null ? 'ai_generated' : 'benchmark_estimate' as const,
        confidence: aiProvidedHoursWasted != null ? 'medium' as const : 'low' as const,
        ...(aiProvidedHoursWasted == null ? { label: 'Estimated from opportunity hours' } : {}),
      },
    },
  }

  // ── Force estimated_annual_waste to match annual_labor_waste ─────────────
  // Labor arbitrage (hourly_rate × weekly_hours × 52) is the canonical
  // display value everywhere in the report.
  const laborBreakdown = normalized.labor_arbitrage_breakdown as Record<string, unknown> | undefined
  const reconciledLaborWaste = asNumber(laborBreakdown?.annual_labor_waste)
  if (reconciledLaborWaste != null) {
    const priorAnnualWaste = asNumber(normalized.estimated_annual_waste)
    if (priorAnnualWaste !== reconciledLaborWaste) {
      console.log(
        `[audit-grounding] annual waste reconciliation: overriding estimated_annual_waste ` +
        `($${priorAnnualWaste ?? 'null'}) to match annual_labor_waste ($${reconciledLaborWaste})`,
      )
    }

    normalized.estimated_annual_waste = reconciledLaborWaste
    normalized.estimated_monthly_waste = Math.round(reconciledLaborWaste / 12)

    const summaryObj = normalized.summary as Record<string, unknown> | undefined
    if (summaryObj) summaryObj.total_annual_cost_savings = reconciledLaborWaste

    const calculationSourcesObj = normalized.calculation_sources as CalculationSources | undefined
    if (calculationSourcesObj) {
      calculationSourcesObj.estimated_annual_waste = {
        value: reconciledLaborWaste,
        source: 'benchmark_estimate',
        confidence: 'medium',
        label: 'Forced to match labor_arbitrage_breakdown.annual_labor_waste',
      }
      calculationSourcesObj.estimated_monthly_waste = {
        value: Math.round(reconciledLaborWaste / 12),
        source: 'benchmark_estimate',
        confidence: 'medium',
        label: 'Derived from annual_labor_waste / 12',
      }
    }
  }

  // ── Scale opportunity hours to match labor arbitrage hours ─────────────
  // If opportunity hours_saved_weekly sums higher than the labor breakdown's
  // hours_wasted_on_low_value_weekly, the report would claim to recover more
  // hours than it says are being wasted. Scale opportunities proportionally
  // (preserving relative ranking) so the numbers agree.
  const opportunitiesArr = Array.isArray(normalized.opportunities)
    ? (normalized.opportunities as Record<string, unknown>[])
    : []
  const oppSum = opportunitiesArr.reduce(
    (total, op) => total + (asNumber(op.hours_saved_weekly) ?? 0),
    0,
  )
  const laborBreakdownRec = asRecord(normalized.labor_arbitrage_breakdown)
  const laborHoursForScale = asNumber(laborBreakdownRec.hours_wasted_on_low_value_weekly) ?? 0
  const laborRateForScale = asNumber(laborBreakdownRec.estimated_hourly_rate) ?? 45

  if (oppSum > laborHoursForScale && laborHoursForScale > 0) {
    const scaleFactor = laborHoursForScale / oppSum
    console.log(
      `[audit-grounding] opportunity hours (${oppSum}) exceed labor arbitrage hours (${laborHoursForScale}) — scaling by ${scaleFactor.toFixed(2)}`,
    )
    opportunitiesArr.forEach((op) => {
      const currentHours = asNumber(op.hours_saved_weekly) ?? 0
      const scaled = Math.max(1, Math.round(currentHours * scaleFactor))
      op.hours_saved_weekly = scaled
      op.monthly_savings = Math.round((scaled * laborRateForScale * 52) / 12)
    })

    const summaryRec = normalized.summary && typeof normalized.summary === 'object'
      ? (normalized.summary as Record<string, unknown>)
      : null
    if (summaryRec) {
      summaryRec.total_hours_saved_weekly = laborHoursForScale
      summaryRec.total_annual_cost_savings = Math.round(laborHoursForScale * laborRateForScale * 52)
    }
  }

  // Only include context switching analysis if we have real tool/team data
  const knownToolsCount = context.allowedToolNames.length > 0 || splitList(input.tools).length > 0
  const knownTeamSize = Boolean(input.teamSize.trim())
  if (knownToolsCount && knownTeamSize) {
    const aiProvidedSwitching = asNumber(contextSwitchingSource.annual_cost)

    // Cap context switching at 15% of team's weekly capacity
    const csWeeklyCapacityMinutes = teamCapacityHoursPerWeek(input.teamSize) * 60
    const csMaxDailyMinutes = Math.round((csWeeklyCapacityMinutes * 0.15) / 5)

    const rawDailyMinutes = clampNumber(
      contextSwitchingSource.time_lost_daily_minutes,
      asNumber(fallbackContextSwitching.time_lost_daily_minutes) ?? 90,
      { min: 10, max: 1200 },
    )
    const cappedDailyMinutes = Math.min(rawDailyMinutes, csMaxDailyMinutes)

    if (rawDailyMinutes > csMaxDailyMinutes) {
      console.log(`[audit-grounding] context switching daily minutes capped from ${rawDailyMinutes} to ${csMaxDailyMinutes} (15% of team capacity)`)
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
      time_lost_daily_minutes: cappedDailyMinutes,
      annual_cost: clampNumber(
        contextSwitchingSource.annual_cost,
        asNumber(fallbackContextSwitching.annual_cost) ?? 10_000,
        { min: 1_000, max: 6_000_000 },
      ),
      is_benchmark_estimate: aiProvidedSwitching == null,
    }
    calculationSources.context_switching_annual_cost = {
      value: aiProvidedSwitching ?? (asNumber(fallbackContextSwitching.annual_cost) ?? 10_000),
      source: aiProvidedSwitching != null ? 'ai_generated' : 'benchmark_estimate',
      confidence: aiProvidedSwitching != null ? 'medium' : 'low',
      ...(aiProvidedSwitching == null ? { label: 'Based on typical context-switching costs for your tool count and team size' } : {}),
    }
  }

  normalized.onboarding_assessment = {
    ...onboardingSource,
    current_state: asString(onboardingSource.current_state) ?? asString(fallbackOnboarding.current_state),
    time_per_client_current: asString(onboardingSource.time_per_client_current) ?? asString(fallbackOnboarding.time_per_client_current),
    time_per_client_automated: asString(onboardingSource.time_per_client_automated) ?? asString(fallbackOnboarding.time_per_client_automated),
    revenue_impact: asString(onboardingSource.revenue_impact) ?? asString(fallbackOnboarding.revenue_impact),
  }

  const benchmarkHoursData = {
    their_hours: clampNumber(hoursBenchmarkSource.their_hours, asNumber(fallbackHoursBenchmark.their_hours) ?? 20, { min: 1, max: 300 }),
    industry_average: clampNumber(hoursBenchmarkSource.industry_average, asNumber(fallbackHoursBenchmark.industry_average) ?? 38, { min: 1, max: 300 }),
    percent_difference: clampNumber(hoursBenchmarkSource.percent_difference, asNumber(fallbackHoursBenchmark.percent_difference) ?? 0, { min: -100, max: 400 }),
    verdict: asString(hoursBenchmarkSource.verdict) ?? asString(fallbackHoursBenchmark.verdict),
  }

  let maturityScore = clampNumber(automationMaturitySource.their_score, asNumber(fallbackAutomationMaturity.their_score) ?? (readinessScore ?? 50), { min: 1, max: 100 })

  // ── Reconcile benchmarks: hours verdict and maturity must not contradict ──
  const isBelowAverage = benchmarkHoursData.their_hours < benchmarkHoursData.industry_average
  const isBottomTier = maturityScore < 50
  const isTopTier = maturityScore >= 70
  const isContradiction =
    (isBelowAverage && isBottomTier) ||  // below avg waste but bottom tier maturity?
    (!isBelowAverage && isTopTier)       // above avg waste but top tier maturity?

  if (isContradiction) {
    if (isBelowAverage) {
      maturityScore = Math.max(65, maturityScore)
    } else {
      maturityScore = Math.min(45, maturityScore)
    }
    console.log(`[audit-grounding] benchmark contradiction resolved: maturity adjusted to ${maturityScore}`)
  }

  const reconciledMaturity = maturityCategoryForScore(maturityScore)

  normalized.benchmarks = {
    ...benchmarksSource,
    hours_wasted_vs_average: {
      ...hoursBenchmarkSource,
      ...benchmarkHoursData,
    },
    ops_cost_ratio: {
      ...opsRatioSource,
      their_ratio_percent: clampNumber(opsRatioSource.their_ratio_percent, asNumber(fallbackOpsRatio.their_ratio_percent) ?? 20, { min: 1, max: 100 }),
      healthy_ratio_percent: clampNumber(opsRatioSource.healthy_ratio_percent, asNumber(fallbackOpsRatio.healthy_ratio_percent) ?? 30, { min: 1, max: 100 }),
      verdict: asString(opsRatioSource.verdict) ?? asString(fallbackOpsRatio.verdict),
    },
    automation_maturity: {
      ...automationMaturitySource,
      their_score: maturityScore,
      category: isContradiction ? reconciledMaturity.category : (asString(automationMaturitySource.category) ?? asString(fallbackAutomationMaturity.category)),
      percentile: isContradiction ? reconciledMaturity.percentile : (asString(automationMaturitySource.percentile) ?? asString(fallbackAutomationMaturity.percentile)),
    },
  }

  // ── Detect insufficient information ──────────────────────────────────────
  const INSUFFICIENT_DATA_THRESHOLD = 3_000
  const finalWasteForCheck = asNumber(normalized.estimated_annual_waste) ?? 0
  const finalOpportunities = normalized.opportunities as unknown[]
  const isInsufficientData =
    finalWasteForCheck < INSUFFICIENT_DATA_THRESHOLD ||
    !Array.isArray(finalOpportunities) ||
    finalOpportunities.length === 0

  if (isInsufficientData) {
    normalized.estimated_annual_waste = null
    normalized.estimated_monthly_waste = null
    normalized.insufficient_information = true
    const summaryObj = normalized.summary as Record<string, unknown> | undefined
    if (summaryObj) summaryObj.total_annual_cost_savings = null
  }

  return normalized
}

function classifyPainCategory(automationWish: string): string {
  const text = (automationWish || '').toLowerCase()
  if (!text.trim()) return 'unknown'

  // Order matters — more specific keywords first
  if (/\b(answer|respond|reply|follow[\s-]?up).*(lead|inquir|prospect)\b/.test(text)) return 'lead_response'
  if (/\b(lead|inquir|prospect).*(answer|respond|reply|follow[\s-]?up)\b/.test(text)) return 'lead_response'
  if (/\b(qualif|score|rout|nurtur).*lead\b/.test(text)) return 'lead_qualification'
  if (/\breport|dashboard|client update\b/.test(text)) return 'reporting'
  if (/\bonboard|kickoff|new client/.test(text)) return 'onboarding'
  if (/\binvoic|bill|payment|quickbook/.test(text)) return 'invoicing'
  if (/\bcontent.*(repurpos|recycle|multi.?channel|social)/.test(text)) return 'content_repurposing'
  if (/\b(proposal|pitch|sow)\b/.test(text)) return 'proposal'
  if (/\bproject.*(status|update|handoff)/.test(text)) return 'pm'
  if (/\bmeeting.*(summary|note|follow[\s-]?up|recap)/.test(text)) return 'meeting_followup'
  if (/\blead\b/.test(text)) return 'lead_response'
  return 'other'
}

function classifyOpportunityCategory(title: string): string {
  const t = (title || '').toLowerCase()
  if (/lead.*(respon|answer|reply)|respon.*lead/.test(t)) return 'lead_response'
  if (/lead.*(qualif|scor|rout|attribut)/.test(t)) return 'lead_qualification'
  if (/(report|dashboard|client.*brief)/.test(t)) return 'reporting'
  if (/onboard|kickoff|new.client/.test(t)) return 'onboarding'
  if (/invoic|bill|payment/.test(t)) return 'invoicing'
  if (/content.*(repurpos|recycle|multi)/.test(t)) return 'content_repurposing'
  if (/proposal|pitch|sow/.test(t)) return 'proposal'
  if (/project.*(status|handoff|update|recap)/.test(t)) return 'pm'
  if (/meeting.*(summary|recap|note)/.test(t)) return 'meeting_followup'
  return 'other'
}

// Some pain categories have multiple valid opportunity answers.
// e.g. "answering leads" pain can be addressed by response OR qualification workflows.
const PAIN_CATEGORY_EQUIVALENCES: Record<string, string[]> = {
  lead_response: ['lead_response', 'lead_qualification'],
  lead_qualification: ['lead_qualification', 'lead_response'],
  // Other categories are only equivalent to themselves (fallthrough below).
}

function isOpportunityAcceptable(painCategory: string, opportunityCategory: string): boolean {
  const acceptable = PAIN_CATEGORY_EQUIVALENCES[painCategory] ?? [painCategory]
  return acceptable.includes(opportunityCategory)
}

export type PainAlignmentResult = {
  result: Record<string, unknown>
  needsRepair: boolean
  mismatch?: { expected: string; got: string }
}

export function enforcePainAlignment(
  result: Record<string, unknown>,
  automationWish: string,
): PainAlignmentResult {
  const painCategory = classifyPainCategory(automationWish)

  if (painCategory === 'unknown' || painCategory === 'other') {
    return { result, needsRepair: false }
  }

  const rawOpportunities = Array.isArray(result.opportunities)
    ? (result.opportunities as unknown[])
    : []

  if (rawOpportunities.length === 0) {
    return { result, needsRepair: true, mismatch: { expected: painCategory, got: 'none' } }
  }

  const opportunities = rawOpportunities.map((op) => (op ?? {}) as Record<string, unknown>)
  const topCategory = classifyOpportunityCategory(asString(opportunities[0].title) ?? '')

  if (isOpportunityAcceptable(painCategory, topCategory)) {
    return { result, needsRepair: false }
  }

  const matchIdx = opportunities.findIndex(
    (op) => isOpportunityAcceptable(painCategory, classifyOpportunityCategory(asString(op.title) ?? '')),
  )

  if (matchIdx > 0) {
    const [matched] = opportunities.splice(matchIdx, 1)
    matched.rank = 1
    opportunities.forEach((op, i) => {
      op.rank = i + 2
    })
    opportunities.unshift(matched)
    console.log(
      `[audit-grounding] pain-aligned re-rank: promoted ${painCategory} opportunity from position ${matchIdx + 1} to 1`,
    )
    return {
      result: { ...result, opportunities },
      needsRepair: false,
    }
  }

  return { result, needsRepair: true, mismatch: { expected: painCategory, got: topCategory } }
}

// If the verdict / waste implies urgency but the benchmarks section says the prospect
// is healthy (below-average waste, top-percentile maturity), the report contradicts
// itself. Rebuild the benchmarks to match the waste reality rather than fight it.
export function enforceBenchmarkVerdictCoherence(
  result: Record<string, unknown>,
): Record<string, unknown> {
  const verdict = asRecord(result.verdict)
  const benchmarks = asRecord(result.benchmarks)
  if (!asString(verdict.headline) || Object.keys(benchmarks).length === 0) {
    return result
  }

  const annualWaste = asNumber(result.estimated_annual_waste) ?? 0
  const wasteIsSignificant = annualWaste >= 20000

  const hoursBenchmarkRec = asRecord(benchmarks.hours_wasted_vs_average)
  const maturityRec = asRecord(benchmarks.automation_maturity)

  const hoursVerdict = (asString(hoursBenchmarkRec.verdict) ?? '').toLowerCase()
  const maturityPercentile = (asString(maturityRec.percentile) ?? '').toLowerCase()

  const benchmarksSayHealthy =
    hoursVerdict.includes('below average') ||
    (maturityPercentile.includes('top') && /\b(10|15|20|25|30)%/.test(maturityPercentile))

  if (!(wasteIsSignificant && benchmarksSayHealthy)) {
    return result
  }

  const impliedHours = Math.round(annualWaste / 52 / 45)
  const industryAvg = asNumber(hoursBenchmarkRec.industry_average) ?? 30

  // Recalculate percent_difference so the numbers agree with the verdict.
  // Edge case: if the implied hours are still at or below industry average,
  // the "above average" claim would be a lie — flip to honest labeling instead.
  let finalHoursVerdict: string
  let finalTheirHours: number
  let finalPercentDifference: number
  if (impliedHours <= industryAvg) {
    finalHoursVerdict = 'at industry average'
    finalTheirHours = industryAvg
    finalPercentDifference = 0
  } else {
    finalHoursVerdict = 'above average'
    finalTheirHours = impliedHours
    finalPercentDifference = Math.round(((impliedHours - industryAvg) / industryAvg) * 100)
  }

  const readinessScore = asNumber(result.automation_readiness_score) ?? 45
  const currentMaturityScore = asNumber(maturityRec.their_score)
  const newMaturityScore = currentMaturityScore != null
    ? Math.min(currentMaturityScore, readinessScore)
    : readinessScore

  console.log(
    '[audit-grounding] benchmark-verdict coherence: waste claims urgency but benchmarks say healthy — rebuilding benchmarks',
  )

  return {
    ...result,
    benchmarks: {
      ...benchmarks,
      hours_wasted_vs_average: {
        ...hoursBenchmarkRec,
        verdict: finalHoursVerdict,
        their_hours: finalTheirHours,
        industry_average: industryAvg,
        percent_difference: finalPercentDifference,
      },
      automation_maturity: {
        ...maturityRec,
        percentile: 'bottom 60%',
        their_score: newMaturityScore,
      },
    },
  }
}

export function groundAuditResult(
  raw: Record<string, unknown>,
  input: AuditLikeInput,
  stage: AuditStage,
  allowedSources: Set<string> | null = null,
): Record<string, unknown> {
  const context = buildGroundingContext(input)
  const normalized = normalizeTopLevelFields(raw, input, stage, context, allowedSources)
  return normalized
}

// Defensive post-processing applied after grounding + verdict-coherence:
// clamp context-switching math to benchmark-defensible values, and rewrite
// the verdict's headline + stakes from estimated_annual_waste so all
// dollar figures shown to the user trace back to a single source of truth.
export function applyDefensivePostProcessing(
  result: Record<string, unknown>,
): Record<string, unknown> {
  const formatMoney = (n: number) => `$${n.toLocaleString('en-US')}`

  const cs = asRecord(result.context_switching_analysis)
  if (Object.keys(cs).length > 0) {
    const calcSources = asRecord(result.calculation_sources)
    const hourlyRateRec = asRecord(calcSources.estimated_hourly_rate)
    const hourlyRate = asNumber(hourlyRateRec.value) ?? 45

    const dailySwitches = Math.min(asNumber(cs.estimated_daily_switches) ?? 0, 15)
    const dailyMinutes = Math.min(asNumber(cs.time_lost_daily_minutes) ?? 0, 90)
    const recalculated = Math.round((dailyMinutes / 60) * hourlyRate * 250)

    result.context_switching_analysis = {
      ...cs,
      estimated_daily_switches: dailySwitches,
      time_lost_daily_minutes: dailyMinutes,
      annual_cost: recalculated,
      is_benchmark_estimate: true,
    }

    if (calcSources.context_switching_annual_cost) {
      const csCalcRec = asRecord(calcSources.context_switching_annual_cost)
      result.calculation_sources = {
        ...calcSources,
        context_switching_annual_cost: {
          ...csCalcRec,
          value: recalculated,
          source: 'benchmark_estimate',
        },
      }
    }
  }

  const annualWaste = asNumber(result.estimated_annual_waste)
  const verdict = asRecord(result.verdict)
  if (annualWaste != null && annualWaste > 0 && Object.keys(verdict).length > 0) {
    const weekly = Math.round(annualWaste / 52)

    result.verdict = {
      ...verdict,
      headline: `You're losing approximately ${formatMoney(annualWaste)} annually to manual operations work.`,
      stakes: `Every week this stays manual, you're losing approximately ${formatMoney(weekly)} in labor waste — and risking client trust.`,
    }
  }

  // Anchor executive_summary with canonical numbers. Different phrasing
  // than verdict.headline to avoid redundancy; "pure labor waste" signals
  // this is a conservative figure that excludes churn, so any higher
  // number the AI mentions reads as additional context, not contradiction.
  if (annualWaste != null && annualWaste > 0) {
    const existingSummary = typeof result.executive_summary === 'string'
      ? result.executive_summary
      : ''

    if (!existingSummary.startsWith('Bottom line:')) {
      const hoursLostWeekly = asNumber(
        asRecord(result.labor_arbitrage_breakdown).hours_wasted_on_low_value_weekly,
      ) ?? 0

      const hoursClause = hoursLostWeekly > 0
        ? ` across ${hoursLostWeekly} hours per week of manual operations work,`
        : ''

      const anchor = `Bottom line:${hoursClause} this agency is losing roughly ${formatMoney(annualWaste)} annually in pure labor waste. `

      result.executive_summary = anchor + existingSummary
    }
  }

  // Regenerate labor_arbitrage_breakdown.explanation from structured numbers
  // so the prose math always agrees with the forced annual_labor_waste.
  const labArb = asRecord(result.labor_arbitrage_breakdown)
  if (Object.keys(labArb).length > 0) {
    const hourlyRate = asNumber(labArb.estimated_hourly_rate) ?? 45
    const hoursWeekly = asNumber(labArb.hours_wasted_on_low_value_weekly) ?? 0
    const annualLaborWaste = asNumber(labArb.annual_labor_waste) ?? 0

    if (hoursWeekly > 0 && annualLaborWaste > 0) {
      result.labor_arbitrage_breakdown = {
        ...labArb,
        explanation: `${formatMoney(hourlyRate)}/hour × ${hoursWeekly} hours/week × 52 weeks = ${formatMoney(annualLaborWaste)}/year wasted on low-value manual work.`,
      }
    }
  }

  return result
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
