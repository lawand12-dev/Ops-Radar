import { randomBytes } from 'crypto'
import { type AuditInput } from '../../../lib/prompts'
import { generateAuditReport } from '../../../lib/audit-report'
import { applyRateLimit } from '../../../lib/rate-limit'
import { sanitizeString, sanitizeStringArray, serverErrorResponse } from '../../../lib/security'
import {
  getServerSupabaseClient,
  hasServerSupabaseClient,
} from '../../../lib/supabase-server'
import type { Json } from '../../../lib/database.types'
import { stripWrappingQuotes } from '../../../lib/utils'
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
import { Resend } from 'resend'
import { buildNewAuditNotification } from '../../../lib/emails/new-audit-notification'
import { generateDraftResponse } from '../../../lib/draft-response'
import { CONTACT_EMAIL } from '../../../lib/constants'

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
    return data.research_data as unknown as AgencyResearch
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
        { url, research_data: research as unknown as Json, fetched_at: new Date().toISOString(), expires_at: expiresAt },
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
    const rateLimitResponse = await applyRateLimit(request, 'generate-audit')
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

    body.automationWish = stripWrappingQuotes(body.automationWish)
    body.failureImpact = stripWrappingQuotes(body.failureImpact)
    body.futureVision = stripWrappingQuotes(body.futureVision)
    body.progressTracking = stripWrappingQuotes(body.progressTracking)
    body.onboarding = stripWrappingQuotes(body.onboarding)

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
    const unsubscribeToken = randomBytes(32).toString('base64url')

    const insertPayload = {
      name,
      email,
      company,
      answers: auditInput as unknown as Json,
      result: audit as unknown as Json,
      access_token: accessToken,
      unsubscribe_token: unsubscribeToken,
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

    // ── Pre-call briefing email ──────────────────────────────────────────
    if (storedAuditId && accessToken) {
      try {
        const laborWaste = (audit.labor_arbitrage_breakdown as Record<string, unknown> | undefined)
          ?.annual_labor_waste
        const annualWaste = typeof laborWaste === 'number'
          ? laborWaste
          : typeof audit.estimated_annual_waste === 'number'
            ? audit.estimated_annual_waste
            : null

        const topOpp = Array.isArray(audit.opportunities) && audit.opportunities.length > 0
          ? String((audit.opportunities[0] as Record<string, unknown>).title ?? '')
          : null

        const draftResponse = await generateDraftResponse({
          name,
          company,
          agencyType,
          teamSize,
          revenueRange: revenue,
          tools,
          biggestPain: automationWish || undefined,
          topOpportunity: topOpp || undefined,
          annualWaste,
          readinessScore: typeof audit.automation_readiness_score === 'number'
            ? audit.automation_readiness_score
            : undefined,
        })

        const { subject, html, text } = buildNewAuditNotification({
          auditId: storedAuditId,
          accessToken,
          name,
          email,
          company,
          biggestPain: automationWish || undefined,
          tools,
          annualWaste,
          topOpportunity: topOpp || undefined,
          readinessScore: typeof audit.automation_readiness_score === 'number'
            ? audit.automation_readiness_score
            : undefined,
          agencyType,
          teamSize,
          revenueRange: revenue,
          draftResponse,
        })

        const resend = new Resend(process.env.RESEND_API_KEY)

        // Internal briefing email to sales/ops
        const { error: briefingError } = await resend.emails.send({
          from: 'OpsRadar <notifications@opsradar.co>',
          to: CONTACT_EMAIL,
          subject,
          html,
          text,
          replyTo: email,
        })

        if (briefingError) {
          console.error('[generate-audit] briefing email failed:', JSON.stringify(briefingError))
        } else {
          console.log('[generate-audit] briefing notification sent for audit', storedAuditId)
        }

        // Immediate results email to the lead
        const resultsUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.opsradar.co'}/results?id=${encodeURIComponent(storedAuditId)}&token=${encodeURIComponent(accessToken)}`
        const scoreColor = typeof audit.automation_readiness_score === 'number'
          ? (audit.automation_readiness_score >= 60 ? '#10b981' : audit.automation_readiness_score >= 30 ? '#f59e0b' : '#ef4444')
          : '#3b82f6'

        const { error: leadEmailError } = await resend.emails.send({
          from: 'OpsRadar <notifications@opsradar.co>',
          to: email,
          subject: `${name ? name.split(' ')[0] + ', your' : 'Your'} OpsRadar audit is ready`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#060c1e;color:#eef2ff;border-radius:14px;overflow:hidden;">
              <div style="background:linear-gradient(135deg,#0f1e45,#060c1e);padding:32px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.07);">
                <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.3);">OpsRadar</p>
                <h1 style="margin:0;font-size:22px;font-weight:700;color:#eef2ff;">Your automation audit is ready${company ? `, ${company}` : ''}</h1>
              </div>
              <div style="padding:28px 32px;">
                <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.6);line-height:1.65;">
                  Hey${name ? ' ' + name.split(' ')[0] : ''}, your OpsRadar report identified exactly where your team is losing time — and what to fix first.
                </p>
                <div style="display:flex;gap:12px;margin-bottom:24px;">
                  ${typeof audit.automation_readiness_score === 'number' ? `<div style="flex:1;background:rgba(59,130,246,0.07);border:1px solid rgba(59,130,246,0.2);border-radius:10px;padding:16px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.3);">Readiness Score</p>
                    <p style="margin:0;font-size:32px;font-weight:800;color:${scoreColor};">${audit.automation_readiness_score}<span style="font-size:14px;font-weight:400;color:rgba(255,255,255,0.25);">/100</span></p>
                  </div>` : ''}
                  ${annualWaste ? `<div style="flex:1;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:10px;padding:16px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.3);">Annual Savings Potential</p>
                    <p style="margin:0;font-size:32px;font-weight:800;color:#fbbf24;">$${annualWaste >= 1000 ? (annualWaste / 1000).toFixed(0) + 'K' : annualWaste}</p>
                  </div>` : ''}
                </div>
                <p style="margin:0 0 20px;font-size:14px;color:rgba(255,255,255,0.5);line-height:1.6;">Your report shows where time, money, and team energy are leaking — plus the highest-urgency fixes to prioritize.</p>
                <a href="${resultsUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:16px;border-radius:12px;margin-bottom:16px;box-shadow:0 0 24px rgba(59,130,246,0.3);">View My Full Report →</a>
                <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.2);text-align:center;">Questions? Reply to this email — it goes straight to a human.</p>
              </div>
              <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
                <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.15);">OpsRadar · <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.opsradar.co'}" style="color:rgba(255,255,255,0.2);">opsradar.co</a></p>
              </div>
            </div>`,
          replyTo: CONTACT_EMAIL,
        })

        if (leadEmailError) {
          console.error('[generate-audit] lead results email failed:', JSON.stringify(leadEmailError))
        } else {
          console.log('[generate-audit] results email sent to lead', email)
        }
      } catch (notifErr) {
        // Never block the audit on notification failure
        console.error('[generate-audit] email sending failed:', notifErr)
      }
    }

    return Response.json(storedAuditId ? { id: storedAuditId, audit, accessToken } : { audit })
  } catch (err) {
    console.error('generate-audit error:', err)
    return serverErrorResponse()
  }
}
