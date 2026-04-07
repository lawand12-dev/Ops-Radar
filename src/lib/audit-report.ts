import { openai } from './openai'
import { PREVIEW_SYSTEM_PROMPT, SYSTEM_PROMPT, buildUserPrompt, type AuditInput } from './prompts'
import { assessAuditConfidence, groundAuditResult } from './audit-grounding'
import { sanitizeString } from './security'

export type AuditReportStage = 'preview' | 'full'

const AUDIT_INPUT_FIELDS: Array<keyof AuditInput> = [
  'agencyType',
  'teamSize',
  'revenue',
  'activeClients',
  'tools',
  'crmTool',
  'timeHeavy',
  'leadEntry',
  'onboarding',
  'progressTracking',
  'automationWish',
  'futureVision',
]

const OPTIONAL_AUDIT_INPUT_FIELDS: Array<keyof AuditInput> = [
  'toolSignals',
  'websiteUrl',
  'websiteScreenshotUrl',
  'websiteContext',
  'websiteEvidence',
  'websiteDetectedStack',
  'websiteStackEvidence',
  'websiteVisualContext',
  'websiteVisualEvidence',
  'processFrequency',
  'processOwner',
  'failureImpact',
]

export function coerceAuditInput(value: unknown): AuditInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const record = value as Record<string, unknown>
  const normalized: Partial<AuditInput> = {}

  for (const field of AUDIT_INPUT_FIELDS) {
    if (typeof record[field] !== 'string') {
      return null
    }

    const sanitized = sanitizeString(record[field], 1000)
    if (!sanitized) {
      return null
    }

    normalized[field] = sanitized
  }

  for (const field of OPTIONAL_AUDIT_INPUT_FIELDS) {
    const value = record[field]
    if (typeof value !== 'string') {
      normalized[field] = ''
      continue
    }

    normalized[field] = sanitizeString(value, 1000)
  }

  return normalized as AuditInput
}

export async function generateAuditReport(
  input: AuditInput,
  stage: AuditReportStage,
): Promise<Record<string, unknown>> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: stage === 'preview' ? PREVIEW_SYSTEM_PROMPT : SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: buildUserPrompt(input),
      },
    ],
    response_format: { type: 'json_object' },
    temperature: stage === 'preview' ? 0.2 : 0.25,
    max_tokens: stage === 'preview' ? 900 : 2200,
  })

  const raw = completion.choices[0].message.content
  if (!raw) {
    throw new Error('Missing audit response')
  }

  const parsed = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid audit response')
  }

  const grounded = groundAuditResult(parsed as Record<string, unknown>, input, stage)
  const confidence = assessAuditConfidence(grounded, input, stage)

  if (confidence.overall < 70) {
    console.warn('[audit-report] low-confidence audit generated', {
      stage,
      overallConfidence: confidence.overall,
      opportunityScores: confidence.opportunityScores,
    })
  }

  return {
    ...grounded,
    report_stage: stage,
  }
}

export function isPreviewAuditReport(value: unknown): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).report_stage === 'preview'
  )
}
