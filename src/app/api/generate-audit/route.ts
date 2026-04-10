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
import { researchAgency, serializeAgencyResearch } from '../../../lib/website-agent'
import type { NotifyPayload } from '../notify/route'

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
    let agencyResearch = null

    if (normalizedWebsiteUrl) {
      const [websiteSignalsResult, websiteVisualSignalsResult, agencyResearchResult] = await Promise.allSettled([
        fetchWebsiteSignals(normalizedWebsiteUrl),
        analyzeWebsiteVisualSignals(normalizedWebsiteUrl),
        researchAgency(normalizedWebsiteUrl),
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
      agencyResearchIntel: agencyResearch ? serializeAgencyResearch(agencyResearch) : '',
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

    let audit: Record<string, unknown>
    try {
      audit = await generateAuditReport(auditInput, 'full')
    } catch (aiError) {
      console.error('[generate-audit] AI generation failed:', aiError instanceof Error ? aiError.message : aiError)
      return Response.json({ error: 'Audit generation failed. Please try again.' }, { status: 502 })
    }

    const insertPayload = {
      name,
      email,
      company,
      answers: auditInput,
      result: audit,
      steps_completed: 12, // all 12 steps completed — used for funnel analysis
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

    return Response.json(storedAuditId ? { id: storedAuditId, audit } : { audit })
  } catch (err) {
    console.error('generate-audit error:', err)
    return serverErrorResponse()
  }
}
