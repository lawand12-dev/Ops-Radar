import { sanitizeString } from './security'

export const HONEYPOT_FIELD_NAME = 'companyWebsite'
export const TIMING_FIELD_NAME = 'startedAt'
export const MIN_FORM_SUBMISSION_MS = 2500
export const MIN_CHAT_LEAD_MS = 4000

const MAX_SUBMISSION_AGE_MS = 1000 * 60 * 60 * 24

export type AbuseProtectedPayload = {
  [HONEYPOT_FIELD_NAME]: string
  [TIMING_FIELD_NAME]: number
}

export type AbuseCheckOptions = {
  minElapsedMs?: number
}

export function getAbuseProtectionPayload(
  startedAt: number,
  honeypot = '',
): AbuseProtectedPayload {
  return {
    [HONEYPOT_FIELD_NAME]: honeypot,
    [TIMING_FIELD_NAME]: startedAt,
  }
}

export function isAbusiveSubmission(
  body: unknown,
  options: AbuseCheckOptions = {},
): boolean {
  const minElapsedMs = options.minElapsedMs ?? MIN_FORM_SUBMISSION_MS

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return true
  }

  const record = body as Record<string, unknown>
  const honeypot = sanitizeString(String(record[HONEYPOT_FIELD_NAME] ?? ''), 200)
  const startedAt = Number(record[TIMING_FIELD_NAME] ?? 0)

  if (honeypot) {
    return true
  }

  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    return true
  }

  const elapsedMs = Date.now() - startedAt

  if (elapsedMs < minElapsedMs) {
    return true
  }

  if (elapsedMs > MAX_SUBMISSION_AGE_MS) {
    return true
  }

  return false
}
