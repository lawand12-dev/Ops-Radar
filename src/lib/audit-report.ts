import { openai } from './openai'
import { PREVIEW_SYSTEM_PROMPT, SYSTEM_PROMPT, buildUserPrompt, type AuditInput } from './prompts'
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
    temperature: stage === 'preview' ? 0.45 : 0.7,
    max_tokens: 500,
  })

  const raw = completion.choices[0].message.content
  if (!raw) {
    throw new Error('Missing audit response')
  }

  const parsed = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid audit response')
  }

  return {
    ...(parsed as Record<string, unknown>),
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
