// src/app/api/vip/[token]/route.ts

import { z } from 'zod'
import { type SupabaseClient } from '@supabase/supabase-js'
import {
  getServerSupabaseClient,
  hasServerSupabaseClient,
} from '../../../../lib/supabase-server'

export const dynamic = 'force-dynamic'

function db(): SupabaseClient {
  return getServerSupabaseClient() as unknown as SupabaseClient
}

// A+B field keys the client is allowed to read/write
const CLIENT_FIELDS = new Set([
  'a1_agency_vertical', 'a1_what_company_does',
  'a2_pricing_model', 'a2_main_result_promised',
  'a3_first_result_days', 'a3_intro_to_first_result',
  'a4_one_thing_to_protect',
  'b1_team_size', 'b1_contractor_mix', 'b1_key_people',
  'b2_heaviest_load_role', 'b2_typical_day',
  'b3_stuck_locations', 'b3_handoff_breaks',
  'b4_spof_severity', 'b4_single_person_knowledge',
])

const saveSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  submit: z.boolean().optional(),
})

type RouteContext = { params: Promise<{ token: string }> }

// GET /api/vip/[token] — load session A+B fields for client
export async function GET(
  _request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { token } = await params
  if (!hasServerSupabaseClient())
    return Response.json({ error: 'Supabase not configured' }, { status: 503 })

  const { data, error } = await db()
    .from('deep_audit_briefs')
    .select('id, agency_name, status, layer1_answers')
    .eq('id', token)
    .single()

  if (error || !data)
    return Response.json({ error: 'Session not found' }, { status: 404 })

  // Strip non-client fields from layer1_answers before returning
  const row = data as {
    id: string
    agency_name: string
    status: string
    layer1_answers: Record<string, unknown>
  }
  const clientAnswers: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row.layer1_answers ?? {})) {
    if (CLIENT_FIELDS.has(k)) clientAnswers[k] = v
  }

  return Response.json({
    id: row.id,
    agency_name: row.agency_name,
    status: row.status,
    answers: clientAnswers,
  })
}

// POST /api/vip/[token] — save client A+B answers (auto-save + final submit)
export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { token } = await params
  if (!hasServerSupabaseClient())
    return Response.json({ error: 'Supabase not configured' }, { status: 503 })

  let body: unknown
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = saveSchema.safeParse(body)
  if (!parsed.success)
    return Response.json({ error: 'answers required' }, { status: 422 })

  // Load existing layer1_answers to merge into
  const { data: existing } = await db()
    .from('deep_audit_briefs')
    .select('layer1_answers')
    .eq('id', token)
    .single()

  if (!existing)
    return Response.json({ error: 'Session not found' }, { status: 404 })

  const existingRow = existing as { layer1_answers: Record<string, unknown> }
  const current: Record<string, unknown> = existingRow.layer1_answers ?? {}

  // Only merge keys the client is allowed to write
  const incoming = parsed.data.answers
  for (const [k, v] of Object.entries(incoming)) {
    if (CLIENT_FIELDS.has(k)) current[k] = v
  }

  const updatePayload: Record<string, unknown> = { layer1_answers: current }
  if (parsed.data.submit) updatePayload.status = 'client_prefill'

  const { error: updateError } = await db()
    .from('deep_audit_briefs')
    .update(updatePayload)
    .eq('id', token)

  if (updateError)
    return Response.json({ error: 'Failed to save' }, { status: 500 })

  return Response.json({ ok: true })
}
