import { openai } from './openai'
import { PREVIEW_SYSTEM_PROMPT, SYSTEM_PROMPT, buildAuditRepairPrompt, buildUserPrompt, type AuditInput } from './prompts'
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

function getSystemPrompt(stage: AuditReportStage): string {
  return stage === 'preview' ? PREVIEW_SYSTEM_PROMPT : SYSTEM_PROMPT
}

function getTemperature(stage: AuditReportStage): number {
  return stage === 'preview' ? 0.2 : 0.25
}

function getMaxTokens(stage: AuditReportStage): number {
  return stage === 'preview' ? 900 : 2200
}

function parseAuditResponse(raw: string): Record<string, unknown> {
  const parsed = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid audit response')
  }

  return parsed as Record<string, unknown>
}

async function requestAuditDraft(
  input: AuditInput,
  stage: AuditReportStage,
  userPrompt: string,
): Promise<Record<string, unknown>> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: getSystemPrompt(stage),
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: getTemperature(stage),
    max_tokens: getMaxTokens(stage),
  })

  const raw = completion.choices[0].message.content
  if (!raw) {
    throw new Error('Missing audit response')
  }

  return parseAuditResponse(raw)
}

function shouldRepairAudit(
  confidence: ReturnType<typeof assessAuditConfidence>,
  stage: AuditReportStage,
): boolean {
  const opportunityFloor = stage === 'preview' ? 65 : 70
  return (
    confidence.overall < 78
    || confidence.opportunityScores.some((score) => score < opportunityFloor)
    || confidence.issues.length >= 2
  )
}

function rankAuditConfidence(confidence: ReturnType<typeof assessAuditConfidence>): number {
  const weakOpportunities = confidence.opportunityScores.filter((score) => score < 70).length
  return (confidence.overall * 10) - (confidence.issues.length * 6) - (weakOpportunities * 8)
}

export async function generateAuditReport(
  input: AuditInput,
  stage: AuditReportStage,
): Promise<Record<string, unknown>> {
  const initialDraft = await requestAuditDraft(input, stage, buildUserPrompt(input))
  const initialGrounded = groundAuditResult(initialDraft, input, stage)
  const initialConfidence = assessAuditConfidence(initialGrounded, input, stage)

  let bestAudit = initialGrounded
  let bestConfidence = initialConfidence

  if (shouldRepairAudit(initialConfidence, stage)) {
    try {
      const repairedDraft = await requestAuditDraft(
        input,
        stage,
        buildAuditRepairPrompt(input, stage, initialGrounded, initialConfidence),
      )
      const repairedGrounded = groundAuditResult(repairedDraft, input, stage)
      const repairedConfidence = assessAuditConfidence(repairedGrounded, input, stage)

      if (rankAuditConfidence(repairedConfidence) >= rankAuditConfidence(initialConfidence)) {
        bestAudit = repairedGrounded
        bestConfidence = repairedConfidence
      }
    } catch (error) {
      console.warn('[audit-report] repair pass failed', {
        stage,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (bestConfidence.overall < 70) {
    console.warn('[audit-report] low-confidence audit generated', {
      stage,
      overallConfidence: bestConfidence.overall,
      opportunityScores: bestConfidence.opportunityScores,
      issues: bestConfidence.issues,
    })
  }

  return {
    ...bestAudit,
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
