/**
 * Lightweight funnel-event ingestion for conversion analysis.
 *
 * SQL to create the table (run once in Supabase):
 *   CREATE TABLE IF NOT EXISTS audit_events (
 *     id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     session_id   text,
 *     audit_id     uuid REFERENCES audits(id) ON DELETE SET NULL,
 *     event_name   text NOT NULL,
 *     step         int,
 *     source       text,
 *     section_id   text,
 *     report_stage text,
 *     metadata     jsonb,
 *     created_at   timestamptz DEFAULT now()
 *   );
 *
 * Recommended indexes:
 *   CREATE INDEX IF NOT EXISTS audit_events_session_idx ON audit_events(session_id);
 *   CREATE INDEX IF NOT EXISTS audit_events_audit_idx ON audit_events(audit_id);
 *   CREATE INDEX IF NOT EXISTS audit_events_name_idx ON audit_events(event_name);
 */

import { supabase } from '../../../lib/supabase'
import { applyRateLimit } from '../../../lib/rate-limit'
import { sanitizeString } from '../../../lib/security'

const ALLOWED_EVENTS = new Set([
  'audit_started',
  'lead_modal_opened',
  'audit_submitted',
  'results_viewed',
  'report_section_viewed',
  'unlock_cta_clicked',
  'unlock_email_requested',
  'unlock_email_sent',
  'report_unlocked',
  'strategy_call_clicked',
  'build_request_opened',
  'build_request_submitted',
  'build_request_success',
])

function sanitizeMetadata(value: unknown): Record<string, string | number | boolean | null> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const entries: Array<[string, string | number | boolean | null]> = []

  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>).slice(0, 12)) {
    const safeKey = sanitizeString(key, 50)
    if (!safeKey) continue

    if (typeof rawValue === 'string') {
      entries.push([safeKey, sanitizeString(rawValue, 200) || null])
      continue
    }

    if (typeof rawValue === 'number' || typeof rawValue === 'boolean' || rawValue == null) {
      entries.push([safeKey, rawValue ?? null])
    }
  }

  return entries.length > 0 ? Object.fromEntries(entries) : null
}

export async function POST(request: Request) {
  try {
    const rateLimitResponse = applyRateLimit(request, 'funnel-event')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const eventName = sanitizeString(String(body?.event ?? ''), 80)
    const sessionId = sanitizeString(String(body?.sessionId ?? ''), 200)
    const auditId = sanitizeString(String(body?.auditId ?? ''), 200)
    const source = sanitizeString(String(body?.source ?? ''), 80)
    const sectionId = sanitizeString(String(body?.sectionId ?? ''), 80)
    const reportStage = sanitizeString(String(body?.reportStage ?? ''), 20)
    const step = typeof body?.step === 'number' && Number.isFinite(body.step)
      ? Math.max(0, Math.min(20, Math.round(body.step)))
      : null
    const metadata = sanitizeMetadata(body?.metadata)

    if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
      return Response.json({ ok: false }, { status: 400 })
    }

    await supabase.from('audit_events').insert({
      session_id: sessionId || null,
      audit_id: auditId || null,
      event_name: eventName,
      step,
      source: source || null,
      section_id: sectionId || null,
      report_stage: reportStage || null,
      metadata,
    })

    return Response.json({ ok: true })
  } catch {
    // Analytics should never break the user flow.
    return Response.json({ ok: true })
  }
}
