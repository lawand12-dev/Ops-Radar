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

import { applyRateLimit } from '../../../lib/rate-limit'
import { sanitizeString, serverErrorResponse } from '../../../lib/security'
import { getServerSupabaseClient, hasServerSupabaseClient } from '../../../lib/supabase-server'

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await applyRateLimit(request, 'audit-step')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const sessionId = sanitizeString(String(body?.sessionId ?? ''), 200)
    const step = body?.step

    if (!sessionId || typeof step !== 'number' || !Number.isFinite(step)) {
      return Response.json({ ok: false }, { status: 400 })
    }

    if (!hasServerSupabaseClient()) {
      return Response.json({ ok: true })
    }

    const supabase = getServerSupabaseClient()

    // Read existing step first so we never regress. Beacons can arrive
    // out-of-order (browser back-button, slow network), and a late beacon
    // for an earlier step would otherwise overwrite the furthest-reached
    // value we care about for funnel analysis.
    const { data: existing, error: selectError } = await supabase
      .from('audit_sessions')
      .select('step_reached')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (selectError) {
      console.error('[audit-step] select failed:', selectError.message)
      // Don't block the beacon — return ok so the client doesn't retry.
      return Response.json({ ok: true })
    }

    const existingStep = typeof existing?.step_reached === 'number' ? existing.step_reached : -1
    if (step <= existingStep) {
      return Response.json({ ok: true })
    }

    const { error: upsertError } = await supabase.from('audit_sessions').upsert(
      { session_id: sessionId, step_reached: step, updated_at: new Date().toISOString() },
      { onConflict: 'session_id', ignoreDuplicates: false },
    )

    if (upsertError) {
      console.error('[audit-step] upsert failed:', upsertError.message)
    }

    return Response.json({ ok: true })
  } catch {
    return serverErrorResponse()
  }
}
