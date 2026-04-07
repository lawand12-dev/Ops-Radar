/**
 * Lightweight step-tracking beacon for audit funnel analysis.
 * Called client-side with navigator.sendBeacon on each step advance.
 * Upserts a row keyed by (session_id) so we get the furthest step reached.
 *
 * SQL to create the table (run once in Supabase):
 *   CREATE TABLE IF NOT EXISTS audit_sessions (
 *     id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     session_id   text NOT NULL UNIQUE,
 *     step_reached int  NOT NULL DEFAULT 0,
 *     created_at   timestamptz DEFAULT now(),
 *     updated_at   timestamptz DEFAULT now()
 *   );
 */

import { supabase } from '../../../lib/supabase'
import { applyRateLimit } from '../../../lib/rate-limit'
import { sanitizeString, serverErrorResponse } from '../../../lib/security'

export async function POST(request: Request) {
  try {
    const rateLimitResponse = applyRateLimit(request, 'audit-step')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const sessionId = sanitizeString(String(body?.sessionId ?? ''), 200)
    const step = body?.step

    if (!sessionId || typeof step !== 'number' || !Number.isFinite(step)) {
      return Response.json({ ok: false }, { status: 400 })
    }

    await supabase.from('audit_sessions').upsert(
      { session_id: sessionId, step_reached: step, updated_at: new Date().toISOString() },
      { onConflict: 'session_id', ignoreDuplicates: false },
    )

    return Response.json({ ok: true })
  } catch {
    return serverErrorResponse()
  }
}
