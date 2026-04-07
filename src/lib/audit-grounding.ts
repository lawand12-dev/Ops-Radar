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

const DIFFICULTY_DEFAULT_DAYS = {
  easy: 6,
  medium: 10,
  complex: 17,
} as const

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
  const supported = context.detectedTools.filter((tool) => tool.n8nNode)
  const fallbackOnly = context.detectedTools.filter((tool) => !tool.n8nNode)

  return `
GROUNDING CONTEXT — use this as the source of truth for tool and n8n architecture choices:
- Detected client tools: ${quoteList(context.allowedToolNames)}
- Public website stack hints: ${quoteList(splitList(input.websiteDetectedStack ?? ''))}
- Primary CRM: ${context.primaryCrm ? `"${context.primaryCrm}"` : 'unknown'}
- Estimated loaded labor rate for savings math: $${context.hourlyRate}/hour
- Approved n8n node names for this audit: ${quoteList(context.allowedNodes)}
- Supported tool -> node mappings: ${supported.length > 0 ? supported.map((tool) => `"${tool.canonicalName}" -> "${tool.n8nNode}"`).join('; ') : 'none detected'}
- Tools that should use "HTTP Request" or generic file handoff if referenced: ${fallbackOnly.length > 0 ? fallbackOnly.map((tool) => `"${tool.canonicalName}"${tool.notes ? ` (${tool.notes})` : ''}`).join('; ') : 'none'}

GROUNDING RULES:
- Never invent a connector node for a tool outside the approved list above.
- If a detected tool does not have a trusted native node mapping above, use "HTTP Request" instead of a made-up node.
- Only mention tools from the client's stack unless you clearly label something as a recommended addition.
- Keep technical_flow aligned with the n8n_nodes list.
- Build-time ranges must stay realistic: easy 5-7 days, medium 7-14 days, complex 14-21 days.
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

function filterAllowedNodes(nodes: string[], allowedNodes: string[]): string[] {
  const allowed = new Set(allowedNodes.map((node) => normalizeToken(node)))
  return unique(
    nodes.filter((node) => allowed.has(normalizeToken(node))),
  )
}

function chooseRelevantTools(opportunity: OpportunityLike, context: GroundingContext): string[] {
  const explicitTools = unique(asStringArray(opportunity.tools_connected).concat(asStringArray(opportunity.tools_involved)))
    .map((tool) => findToolCatalogEntry(tool)?.canonicalName ?? tool)
    .filter((tool) => context.allowedToolNames.includes(tool))

  if (explicitTools.length > 0) return explicitTools

  const corpus = normalizeToken([
    asString(opportunity.title),
    asString(opportunity.hard_truth),
    asString(opportunity.current_process),
    asString(opportunity.automated_process),
    asString(opportunity.technical_flow),
  ].filter(Boolean).join(' '))

  const inferred = context.detectedTools
    .filter((tool) => corpus.includes(normalizeToken(tool.canonicalName)))
    .map((tool) => tool.canonicalName)

  if (inferred.length > 0) return inferred

  const fallback: string[] = []
  if (context.primaryCrm && context.allowedToolNames.includes(context.primaryCrm)) {
    fallback.push(context.primaryCrm)
  }
  if (context.allowedToolNames.includes('Slack')) fallback.push('Slack')
  if (context.allowedToolNames.includes('Gmail')) fallback.push('Gmail')

  return unique(fallback).slice(0, 3)
}

function deriveNodesFromTools(tools: string[], context: GroundingContext): string[] {
  const toolNodes = tools
    .map((tool) => TOOL_CATALOG.find((entry) => entry.canonicalName === tool)?.n8nNode)
    .filter((node): node is string => Boolean(node))

  return unique([
    'Webhook',
    'If',
    'Set',
    ...toolNodes,
  ]).filter((node) => context.allowedNodes.includes(node))
}

function defaultTechnicalFlow(tools: string[]): string {
  const actions = tools.length > 0 ? tools.join(' + ') : 'target systems'
  return `Trigger -> Validate and route -> Update ${actions} -> Confirm outcome`
}

function defaultImplementationSteps(tools: string[]): string[] {
  const destination = tools.length > 0 ? tools.join(', ') : 'the connected systems'
  return [
    'Document the trigger event, required fields, and ownership for the workflow.',
    `Authenticate n8n against ${destination} and map the minimum required data.`,
    'Add branching, retries, and duplicate protection before the workflow touches production data.',
    'Test happy path and failure path with real sample records before launch.',
  ]
}

function buildFallbackOpportunities(input: AuditLikeInput, context: GroundingContext): OpportunityLike[] {
  const crm = context.primaryCrm && context.allowedToolNames.includes(context.primaryCrm)
    ? context.primaryCrm
    : context.allowedToolNames[0] ?? 'the CRM'

  const hasSlack = context.allowedToolNames.includes('Slack')
  const hasGmail = context.allowedToolNames.includes('Gmail')
  const hasClickUp = context.allowedToolNames.includes('ClickUp')
  const hasPandaDoc = context.allowedToolNames.includes('PandaDoc')
  const hasSheets = context.allowedToolNames.includes('Google Sheets')

  return [
    {
      title: `${crm} lead capture and qualification`,
      hard_truth: `New lead intake is still creating drag around "${input.automationWish}". Slow qualification means slower follow-up and wasted sales capacity.`,
      technical_flow: `Trigger -> Validate lead -> Score and route in ${crm} -> Notify owner`,
      tools_connected: unique([crm, hasSlack ? 'Slack' : hasGmail ? 'Gmail' : '']),
      difficulty: 'easy',
      hours_saved_weekly: 6,
    },
    {
      title: 'Client onboarding handoff automation',
      hard_truth: `The current onboarding process (${input.onboarding}) is creating avoidable handoff risk and inconsistent setup quality.`,
      technical_flow: `Deal won -> Create onboarding assets -> Notify delivery team -> Confirm setup completion`,
      tools_connected: unique([crm, hasPandaDoc ? 'PandaDoc' : '', hasClickUp ? 'ClickUp' : hasSlack ? 'Slack' : '']),
      difficulty: 'medium',
      hours_saved_weekly: 8,
    },
    {
      title: 'Operational reporting and status sync',
      hard_truth: `Tracking work through "${input.progressTracking}" makes reporting slower and increases the chance that client updates are late or incomplete.`,
      technical_flow: `Schedule Trigger -> Pull status data -> Summarize exceptions -> Send digest`,
      tools_connected: unique([hasSheets ? 'Google Sheets' : crm, hasSlack ? 'Slack' : hasGmail ? 'Gmail' : '']),
      difficulty: 'medium',
      hours_saved_weekly: 5,
    },
    {
      title: 'Cross-tool data consistency workflow',
      hard_truth: `The stack (${input.tools}) relies on manual updates across tools, which makes data drift and duplicate entry almost guaranteed as the agency grows.`,
      technical_flow: `Source update -> Normalize record -> Sync target tools -> Log success or retry`,
      tools_connected: context.allowedToolNames.slice(0, 3),
      difficulty: 'complex',
      hours_saved_weekly: 10,
    },
  ]
}

function normalizeOpportunity(
  rawOpportunity: unknown,
  index: number,
  stage: AuditStage,
  context: GroundingContext,
): Record<string, unknown> {
  const opportunity = (rawOpportunity && typeof rawOpportunity === 'object' && !Array.isArray(rawOpportunity))
    ? rawOpportunity as OpportunityLike
    : {}

  const difficulty = normalizeDifficulty(opportunity.difficulty)
  const toolsConnected = chooseRelevantTools(opportunity, context)
  const suppliedNodes = filterAllowedNodes(asStringArray(opportunity.n8n_nodes), context.allowedNodes)
  const n8nNodes = suppliedNodes.length > 0 ? suppliedNodes : deriveNodesFromTools(toolsConnected, context)
  const hoursSavedWeekly = clampNumber(opportunity.hours_saved_weekly, 4 + index * 2, { min: 1, max: 80 })
  const monthlySavings = clampNumber(
    opportunity.monthly_savings,
    Math.round(hoursSavedWeekly * context.hourlyRate * 4.33),
    { min: 250, max: 200_000 },
  )

  const base: Record<string, unknown> = {
    rank: clampNumber(opportunity.rank, index + 1, { min: 1, max: 6 }),
    title: asString(opportunity.title) ?? `Automation opportunity ${index + 1}`,
    hard_truth: asString(opportunity.hard_truth) ?? 'Manual work is creating avoidable labor cost and response delays.',
    technical_flow: asString(opportunity.technical_flow) ?? defaultTechnicalFlow(toolsConnected),
    hours_saved_weekly: hoursSavedWeekly,
    monthly_savings: monthlySavings,
    difficulty,
    quick_win: difficulty === 'easy',
  }

  if (stage === 'preview') {
    return base
  }

  return {
    ...base,
    current_process: asString(opportunity.current_process) ?? 'Work is being handled manually across multiple steps and tools, which increases lag and the chance of missed handoffs.',
    automated_process: asString(opportunity.automated_process) ?? 'n8n captures the trigger, validates the record, routes it to the right systems, and confirms completion automatically.',
    n8n_nodes: n8nNodes,
    tools_connected: toolsConnected,
    build_time_days: clampNumber(opportunity.build_time_days, DIFFICULTY_DEFAULT_DAYS[difficulty], {
      min: difficulty === 'easy' ? 5 : difficulty === 'medium' ? 7 : 14,
      max: difficulty === 'easy' ? 7 : difficulty === 'medium' ? 14 : 21,
    }),
    implementation_steps: asStringArray(opportunity.implementation_steps).length > 0
      ? asStringArray(opportunity.implementation_steps).slice(0, 6)
      : defaultImplementationSteps(toolsConnected),
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
    .map((opportunity, index) => normalizeOpportunity(opportunity, index, stage, context))

  const totalHoursSavedWeekly = normalizedOpportunities.reduce((sum, opportunity) => {
    const value = typeof opportunity.hours_saved_weekly === 'number' ? opportunity.hours_saved_weekly : 0
    return sum + value
  }, 0)

  const totalMonthlySavings = normalizedOpportunities.reduce((sum, opportunity) => {
    const value = typeof opportunity.monthly_savings === 'number' ? opportunity.monthly_savings : 0
    return sum + value
  }, 0)

  return {
    ...raw,
    executive_summary: asString(raw.executive_summary) ?? `This ${input.agencyType} team is losing time to manual operational work that can be systemized with n8n and their current stack.`,
    estimated_monthly_waste: clampNumber(raw.estimated_monthly_waste, Math.round(totalMonthlySavings), { min: 500, max: 500_000 }),
    estimated_annual_waste: clampNumber(raw.estimated_annual_waste, Math.round(totalMonthlySavings * 12), { min: 6_000, max: 6_000_000 }),
    automation_readiness_score: clampNumber(raw.automation_readiness_score, 52, { min: 1, max: 100 }),
    opportunities: normalizedOpportunities,
    summary: {
      ...(raw.summary && typeof raw.summary === 'object' && !Array.isArray(raw.summary) ? raw.summary as Record<string, unknown> : {}),
      total_hours_saved_weekly: clampNumber(
        (raw.summary as Record<string, unknown> | undefined)?.total_hours_saved_weekly,
        totalHoursSavedWeekly,
        { min: 1, max: 200 },
      ),
      total_annual_cost_savings: clampNumber(
        (raw.summary as Record<string, unknown> | undefined)?.total_annual_cost_savings,
        Math.round(totalMonthlySavings * 12),
        { min: 6_000, max: 6_000_000 },
      ),
      automation_readiness_score: clampNumber(
        (raw.summary as Record<string, unknown> | undefined)?.automation_readiness_score,
        clampNumber(raw.automation_readiness_score, 52, { min: 1, max: 100 }),
        { min: 1, max: 100 },
      ),
      headline: asString((raw.summary as Record<string, unknown> | undefined)?.headline) ?? 'Highest-leverage automations for this agency',
    },
  }
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

export function assessAuditConfidence(
  audit: Record<string, unknown>,
  input: AuditLikeInput,
  stage: AuditStage,
): ConfidenceReport {
  const context = buildGroundingContext(input)
  const opportunities = Array.isArray(audit.opportunities) ? audit.opportunities : []
  const opportunityScores = opportunities.map((rawOpportunity) => {
    const opportunity = rawOpportunity && typeof rawOpportunity === 'object' && !Array.isArray(rawOpportunity)
      ? rawOpportunity as OpportunityLike
      : {}

    const tools = chooseRelevantTools(opportunity, context)
    const validNodes = filterAllowedNodes(asStringArray(opportunity.n8n_nodes), context.allowedNodes)
    const hasTechnicalFlow = Boolean(asString(opportunity.technical_flow))
    const hasSolidSavings = typeof opportunity.hours_saved_weekly === 'number' && opportunity.hours_saved_weekly > 0
    const hasImplementation = stage === 'preview' || asStringArray(opportunity.implementation_steps).length > 0

    let score = 35
    if (tools.length > 0) score += 20
    if (hasTechnicalFlow) score += 15
    if (hasSolidSavings) score += 10
    if (hasImplementation) score += 10
    if (stage === 'preview') {
      score += 10
    } else if (validNodes.length > 0) {
      score += 10
    }

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

  let overall = base
  if (executiveSummary) overall += 5
  if (readiness != null && readiness >= 1 && readiness <= 100) overall += 5

  return {
    overall: Math.max(0, Math.min(overall, 100)),
    opportunityScores,
  }
}
