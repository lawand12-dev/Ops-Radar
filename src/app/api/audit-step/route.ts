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

export async function POST(request: Request) {
  try {
    const { sessionId, step }: { sessionId: string; step: number } = await request.json()
    if (!sessionId || typeof step !== 'number') {
      return Response.json({ ok: false }, { status: 400 })
    }

    await supabase.from('audit_sessions').upsert(
      { session_id: sessionId, step_reached: step, updated_at: new Date().toISOString() },
      { onConflict: 'session_id', ignoreDuplicates: false },
    )

    return Response.json({ ok: true })
  } catch {
    // Non-critical — never surface errors to the user
    return Response.json({ ok: false }, { status: 500 })
  }
}
