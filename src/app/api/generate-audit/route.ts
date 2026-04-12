import { randomBytes } from 'crypto'
import { type AuditInput } from '../../../lib/prompts'
import { generateAuditReport } from '../../../lib/audit-report'
import { applyRateLimit, getClientIp } from '../../../lib/rate-limit'
import { sanitizeString, sanitizeStringArray, serverErrorResponse } from '../../../lib/security'
import {
  getServerSupabaseClient,
  hasServerSupabaseClient,
} from '../../../lib/supabase-server'
import { isAbusiveSubmission } from '../../../lib/abuse-protection'
import {
  fetchWebsiteSignals,
  normalizeWebsiteUrlInput,
  serializeWebsiteDetectedStack,
  serializeWebsiteEvidence,
  serializeWebsiteStackSignals,
} from '../../../lib/website-intel'
import { analyzeWebsiteVisualSignals, serializeWebsiteVisualEvidence } from '../../../lib/website-visual-intel'
import {
  researchAgency,
  findLinkedInJobSignals,
  serializeAgencyResearch,
  type AgencyResearch,
} from '../../../lib/website-research-agent'
import {
  retrieveRelevantKnowledge,
  formatKnowledgeContext,
} from '../../../lib/knowledge-retrieval'
import type { NotifyPayload } from '../notify/route'

const RESEARCH_TIMEOUT_MS = 15_000
const RESEARCH_CACHE_TTL_DAYS = 7

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms)
    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch(() => {
        clearTimeout(timer)
        resolve(fallback)
      })
  })
}

async function getCachedResearch(url: string): Promise<AgencyResearch | null> {
  if (!hasServerSupabaseClient()) return null
  try {
    const supabase = getServerSupabaseClient()
    const { data, error } = await supabase
      .from('research_cache')
      .select('research_data, expires_at')
      .eq('url', url)
      .maybeSingle()

    if (error || !data) return null
    const expiresAt = new Date(data.expires_at as string).getTime()
    if (Number.isNaN(expiresAt) || expiresAt < Date.now()) return null
    return data.research_data as AgencyResearch
  } catch {
    return null
  }
}

async function setCachedResearch(url: string, research: AgencyResearch): Promise<void> {
  if (!hasServerSupabaseClient()) return
  // Never cache a completely-failed fetch — we want to retry next time.
  if (research.errors.length > 0 && !research.homepage.headline) return
  try {
    const supabase = getServerSupabaseClient()
    const expiresAt = new Date(Date.now() + RESEARCH_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
    await supabase
      .from('research_cache')
      .upsert(
        { url, research_data: research, fetched_at: new Date().toISOString(), expires_at: expiresAt },
        { onConflict: 'url' },
      )
  } catch (err) {
    console.warn('[generate-audit] failed to cache research:', err instanceof Error ? err.message : err)
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type RequestBody = AuditInput & {
  name: string
  email: string
  company: string
}

const STRING_FIELDS: Array<keyof RequestBody> = [
  'name',
  'email',
  'company',
  'agencyType',
  'teamSize',
  'revenue',
  'activeClients',
  'crmTool',
  'leadEntry',
  'progressTracking',
  'automationWish',
  'processFrequency',
  'failureImpact',
  'futureVision',
]

const OPTIONAL_STRING_FIELDS: Array<keyof RequestBody> = ['toolSignals', 'websiteUrl', 'processOwner']
const ARRAY_COMPATIBLE_FIELDS = new Set<keyof RequestBody>(['tools', 'timeHeavy', 'onboarding'])

function normalizeAuditField(
  value: unknown,
  options: { allowArray?: boolean; maxLength?: number } = {},
): string | null {
  const maxLength = options.maxLength ?? 1000

  if (typeof value === 'string') {
    const sanitized = sanitizeString(value, maxLength)
    return sanitized || null
  }

  if (options.allowArray && Array.isArray(value)) {
    if (value.length === 0 || value.length > 50 || value.some((item) => typeof item !== 'string')) {
      return null
    }

    const sanitizedItems = sanitizeStringArray(value, 50, maxLength)
    return sanitizedItems.length > 0 ? sanitizedItems.join(', ') : null
  }

  return null
}

function validateRequestBody(body: unknown): RequestBody | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null
  }

  const input = body as Record<string, unknown>
  const normalized: Partial<RequestBody> = {}

  for (const field of STRING_FIELDS) {
    const maxLength = field === 'email' ? 320 : 1000
    const value = normalizeAuditField(input[field], { maxLength })
    if (!value) {
      return null
    }
    normalized[field] = value
  }

  for (const field of OPTIONAL_STRING_FIELDS) {
    const rawValue = input[field]
    if (rawValue == null || rawValue === '') {
      normalized[field] = ''
      continue
    }

    const value = normalizeAuditField(rawValue, { maxLength: 1000 })
    if (value == null) {
      return null
    }

    normalized[field] = value
  }

  for (const field of ARRAY_COMPATIBLE_FIELDS) {
    const value = normalizeAuditField(input[field], { allowArray: true, maxLength: 1000 })
    if (!value) {
      return null
    }
    normalized[field] = value
  }

  return normalized as RequestBody
}

export async function POST(request: Request) {
  try {
    const rateLimitResponse = applyRateLimit(request, 'generate-audit')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const rawBody = await request.json()
    if (isAbusiveSubmission(rawBody)) {
      return Response.json({ error: 'Invalid request payload' }, { status: 400 })
    }

    const body = validateRequestBody(rawBody)
    if (!body) {
      return Response.json({ error: 'Invalid request payload' }, { status: 400 })
    }

    const {
      name, email, company,
      agencyType, teamSize, revenue, activeClients,
      tools, toolSignals, websiteUrl, crmTool, timeHeavy, leadEntry,
      onboarding, progressTracking, automationWish, processFrequency, processOwner, failureImpact, futureVision,
    } = body

    if (!EMAIL_REGEX.test(email)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const normalizedWebsiteUrl = normalizeWebsiteUrlInput(websiteUrl ?? '')
    let websiteSignals = null
    let websiteVisualSignals = null
    let agencyResearch: AgencyResearch | null = null
    let linkedInJobSignals: string[] = []

    if (normalizedWebsiteUrl) {
      // Check cache first for the deep research agent.
      const cached = await getCachedResearch(normalizedWebsiteUrl)

      const researchPromise: Promise<AgencyResearch | null> = cached
        ? Promise.resolve(cached)
        : withTimeout(researchAgency(normalizedWebsiteUrl), RESEARCH_TIMEOUT_MS, null)

      const [websiteSignalsResult, websiteVisualSignalsResult, agencyResearchResult, linkedInResult] =
        await Promise.allSettled([
          fetchWebsiteSignals(normalizedWebsiteUrl),
          analyzeWebsiteVisualSignals(normalizedWebsiteUrl),
          researchPromise,
          withTimeout(findLinkedInJobSignals(company), RESEARCH_TIMEOUT_MS, [] as string[]),
        ])

      websiteSignals = websiteSignalsResult.status === 'fulfilled'
        ? websiteSignalsResult.value
        : null
      websiteVisualSignals = websiteVisualSignalsResult.status === 'fulfilled'
        ? websiteVisualSignalsResult.value
        : null
      agencyResearch = agencyResearchResult.status === 'fulfilled'
        ? agencyResearchResult.value
        : null
      linkedInJobSignals = linkedInResult.status === 'fulfilled' && Array.isArray(linkedInResult.value)
        ? linkedInResult.value
        : []

      // Populate cache on miss (fire-and-forget — don't block the audit).
      if (!cached && agencyResearch) {
        void setCachedResearch(normalizedWebsiteUrl, agencyResearch)
      }
    }

    const auditInput = {
      agencyType,
      teamSize,
      revenue,
      activeClients,
      tools,
      toolSignals,
      websiteUrl: normalizedWebsiteUrl,
      websiteScreenshotUrl: websiteVisualSignals?.screenshotUrl ?? '',
      websiteContext: websiteSignals?.summary ?? '',
      websiteEvidence: serializeWebsiteEvidence(websiteSignals?.evidence ?? []),
      websiteDetectedStack: serializeWebsiteDetectedStack(websiteSignals?.detectedStack ?? []),
      websiteStackEvidence: serializeWebsiteStackSignals(websiteSignals?.detectedStack ?? []),
      websiteVisualContext: websiteVisualSignals?.summary ?? '',
      websiteVisualEvidence: serializeWebsiteVisualEvidence(websiteVisualSignals?.evidence ?? []),
      agencyResearchIntel: agencyResearch
        ? serializeAgencyResearch(agencyResearch, linkedInJobSignals)
        : '',
      crmTool,
      timeHeavy,
      leadEntry,
      onboarding,
      progressTracking,
      automationWish,
      processFrequency,
      processOwner,
      failureImpact,
      futureVision,
    }

    if (!(process.env.OPENAI_API_KEY ?? '').trim()) {
      console.error('[generate-audit] OPENAI_API_KEY is not configured')
      return Response.json({ error: 'Service configuration error. Please try again later.' }, { status: 503 })
    }

    // Pull the most semantically-rich fields from the questionnaire to use as
    // the retrieval query. We want the research library to match on *what the
    // agency is doing and struggling with*, not their email or revenue band.
    const knowledgeQuery = [
      `Agency type: ${agencyType}`,
      `Tools: ${tools}`,
      `CRM / operations: ${crmTool}`,
      `Time-heavy work: ${timeHeavy}`,
      `Biggest failing process: ${automationWish}`,
      processFrequency ? `Frequency: ${processFrequency}` : '',
      failureImpact ? `Cost of staying manual: ${failureImpact}` : '',
      futureVision ? `Vision: ${futureVision}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    let knowledgeContext = ''
    try {
      const chunks = await retrieveRelevantKnowledge(knowledgeQuery, 5)
      knowledgeContext = formatKnowledgeContext(chunks)
      if (chunks.length > 0) {
        console.log(
          `[generate-audit] injected ${chunks.length} knowledge chunk(s) from`,
          Array.from(new Set(chunks.map((c) => c.sourceFile))),
        )
      }
    } catch (ragError) {
      // RAG is best-effort — never block the audit on retrieval failure.
      console.warn(
        '[generate-audit] knowledge retrieval failed:',
        ragError instanceof Error ? ragError.message : ragError,
      )
    }

    let audit: Record<string, unknown>
    try {
      audit = await generateAuditReport(auditInput, 'full', knowledgeContext)
    } catch (aiError) {
      console.error('[generate-audit] AI generation failed:', aiError instanceof Error ? aiError.message : aiError)
      return Response.json({ error: 'Audit generation failed. Please try again.' }, { status: 502 })
    }

    const accessToken = randomBytes(32).toString('base64url')

    const insertPayload = {
      name,
      email,
      company,
      answers: auditInput,
      result: audit,
      access_token: accessToken,
    }

    let storedAuditId: string | null = null

    if (hasServerSupabaseClient()) {
      const supabase = getServerSupabaseClient()
      const { data, error } = await supabase
        .from('audits')
        .insert(insertPayload)
        .select('id')
        .single()

      if (error) {
        console.error('[generate-audit] failed to persist audit')
        return Response.json({ audit })
      }

      storedAuditId = typeof data?.id === 'string' ? data.id : null
    } else {
      console.error('[generate-audit] missing server Supabase configuration')
    }

    // ── Fire-and-forget notification ────────────────────────────────────────
    const automationReadinessScore = typeof audit.automation_readiness_score === 'number'
      ? audit.automation_readiness_score
      : 0
    const estimatedAnnualWaste = typeof audit.estimated_annual_waste === 'number'
      ? audit.estimated_annual_waste
      : null

    const notifyPayload: NotifyPayload = {
      company,
      name,
      email,
      teamSize,
      agencyType,
      timeWasters: automationWish,
      automationReadinessScore,
      estimatedAnnualWaste,
    }
    fetch(new URL('/api/notify', request.url).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': getClientIp(request),
      },
      body: JSON.stringify(notifyPayload),
    }).catch((err) => console.error('[notify] Failed to send notification:', err))

    return Response.json(storedAuditId ? { id: storedAuditId, audit, accessToken } : { audit })
  } catch (err) {
    console.error('generate-audit error:', err)
    return serverErrorResponse()
  }
}
