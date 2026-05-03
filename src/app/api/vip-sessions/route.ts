// src/app/api/vip-sessions/route.ts

import { z } from 'zod'
import { type SupabaseClient } from '@supabase/supabase-js'
import {
  getServerSupabaseClient,
  hasServerSupabaseClient,
} from '../../../lib/supabase-server'
import {
  getAdminSessionTokenFromCookieHeader,
  isValidAdminSessionToken,
} from '../../../lib/admin-session'

export const dynamic = 'force-dynamic'

function requireAdmin(request: Request): Response | null {
  const token = getAdminSessionTokenFromCookieHeader(
    request.headers.get('cookie') ?? '',
  )
  return isValidAdminSessionToken(token)
    ? null
    : Response.json({ error: 'Unauthorized' }, { status: 401 })
}

function db(): SupabaseClient {
  return getServerSupabaseClient() as unknown as SupabaseClient
}

const createSchema = z.object({ agency_name: z.string().min(1).max(200) })

// GET /api/vip-sessions — list all sessions (admin only)
export async function GET(request: Request): Promise<Response> {
  const authErr = requireAdmin(request)
  if (authErr) return authErr
  if (!hasServerSupabaseClient())
    return Response.json({ error: 'Supabase not configured' }, { status: 503 })

  const { data, error } = await db()
    .from('deep_audit_briefs')
    .select('id, agency_name, status, created_at, pdf_url')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: 'Failed to load sessions' }, { status: 500 })
  return Response.json({ sessions: data ?? [] })
}

// POST /api/vip-sessions — create new session (admin only)
export async function POST(request: Request): Promise<Response> {
  const authErr = requireAdmin(request)
  if (authErr) return authErr
  if (!hasServerSupabaseClient())
    return Response.json({ error: 'Supabase not configured' }, { status: 503 })

  let body: unknown
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success)
    return Response.json({ error: 'agency_name required' }, { status: 422 })

  const { data, error } = await db()
    .from('deep_audit_briefs')
    .insert({
      agency_name: parsed.data.agency_name,
      status: 'draft_layer1',
      layer1_answers: {},
      layer1_consultant_fields: {},
    })
    .select('id')
    .single()

  if (error || !data)
    return Response.json({ error: 'Failed to create session' }, { status: 500 })

  return Response.json({ id: (data as { id: string }).id }, { status: 201 })
}
