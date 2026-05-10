import { type NextRequest } from 'next/server'
import {
  getAdminSessionTokenFromCookieHeader,
  isValidAdminSessionToken,
} from '../../../../lib/admin-session'
import { applyRateLimit } from '../../../../lib/rate-limit'
import { sanitizeString, serverErrorResponse } from '../../../../lib/security'
import { getServerSupabaseClient } from '../../../../lib/supabase-server'

type MutableTableName = 'audits' | 'chat_conversations' | 'build_requests'
type AdminAuditRow = {
  id: string
  email?: string | null
} & Record<string, unknown>

const MUTABLE_TABLES = new Set<MutableTableName>([
  'audits',
  'chat_conversations',
  'build_requests',
])

const JSON_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
}

function requireAdminSession(request: Request): Response | null {
  const sessionToken = getAdminSessionTokenFromCookieHeader(
    request.headers.get('cookie') ?? '',
  )

  if (!isValidAdminSessionToken(sessionToken)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: JSON_HEADERS })
  }

  return null
}

function normalizeMutableTable(value: unknown): MutableTableName | null {
  const table = sanitizeString(String(value ?? ''), 64)
  return MUTABLE_TABLES.has(table as MutableTableName) ? (table as MutableTableName) : null
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await applyRateLimit(request, 'admin-data')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const authResponse = requireAdminSession(request)
    if (authResponse) {
      return authResponse
    }

    const view = sanitizeString(request.nextUrl.searchParams.get('view') ?? '', 32)
    const supabase = getServerSupabaseClient()

    if (view === 'audits') {
      const { data, error } = await supabase
        .from('audits')
        .select('id, created_at, name, email, company, answers, result, access_token')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return Response.json({
        audits: (data ?? []) as AdminAuditRow[],
      }, { headers: JSON_HEADERS })
    }

    const [auditRes, chatRes, buildRes, auditSessionsRes, auditEventsRes] = await Promise.all([
      supabase.from('audits').select('*').order('created_at', { ascending: false }),
      supabase.from('chat_conversations').select('*').order('created_at', { ascending: false }),
      supabase.from('build_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('audit_sessions').select('*').order('updated_at', { ascending: false }),
      supabase.from('audit_events').select('*').order('created_at', { ascending: false }),
    ])

    if (auditRes.error) throw auditRes.error
    if (chatRes.error) throw chatRes.error
    if (buildRes.error) throw buildRes.error
    if (auditSessionsRes.error) throw auditSessionsRes.error
    if (auditEventsRes.error) throw auditEventsRes.error

    return Response.json(
      {
        audits: auditRes.data ?? [],
        chats: chatRes.data ?? [],
        builds: buildRes.data ?? [],
        auditSessions: auditSessionsRes.data ?? [],
        auditEvents: auditEventsRes.data ?? [],
      },
      { headers: JSON_HEADERS },
    )
  } catch (error) {
    console.error('[admin-data] GET failed:', error)
    return serverErrorResponse()
  }
}

export async function DELETE(request: Request) {
  try {
    const rateLimitResponse = await applyRateLimit(request, 'admin-data')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const authResponse = requireAdminSession(request)
    if (authResponse) {
      return authResponse
    }

    const body = await request.json()
    const table = normalizeMutableTable(body?.table)
    const id = sanitizeString(String(body?.id ?? ''), 200)

    if (!table || !id) {
      return Response.json({ error: 'Invalid request payload' }, { status: 400, headers: JSON_HEADERS })
    }

    const supabase = getServerSupabaseClient()
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      throw error
    }

    return Response.json({ ok: true }, { headers: JSON_HEADERS })
  } catch (error) {
    console.error('[admin-data] DELETE failed:', error)
    return serverErrorResponse()
  }
}

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await applyRateLimit(request, 'admin-data')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const authResponse = requireAdminSession(request)
    if (authResponse) {
      return authResponse
    }

    const body = await request.json()
    const action = sanitizeString(String(body?.action ?? ''), 64)
    const supabase = getServerSupabaseClient()

    if (action === 'delete-old-audits') {
      const days = Math.min(3650, Math.max(1, Math.round(Number(body?.days ?? 30))))
      const cutoff = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString()
      const { error, count } = await supabase
        .from('audits')
        .delete({ count: 'exact' })
        .lt('created_at', cutoff)

      if (error) {
        throw error
      }

      return Response.json({ count: count ?? 0 }, { headers: JSON_HEADERS })
    }

    if (action === 'delete-test-audits') {
      const { error, count } = await supabase
        .from('audits')
        .delete({ count: 'exact' })
        .or('email.ilike.%test%,company.ilike.%test%')

      if (error) {
        throw error
      }

      return Response.json({ count: count ?? 0 }, { headers: JSON_HEADERS })
    }

    if (action === 'delete-empty-chat-conversations') {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('id, messages')

      if (error) {
        throw error
      }

      const idsToDelete = (data ?? [])
        .filter((conversation: { id?: unknown; messages?: unknown }) => (
          !Array.isArray(conversation.messages) || conversation.messages.length < 2
        ))
        .map((conversation: { id?: unknown }) => conversation.id)
        .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)

      if (idsToDelete.length === 0) {
        return Response.json({ count: 0 }, { headers: JSON_HEADERS })
      }

      const { error: deleteError } = await supabase
        .from('chat_conversations')
        .delete()
        .in('id', idsToDelete)

      if (deleteError) {
        throw deleteError
      }

      return Response.json({ count: idsToDelete.length }, { headers: JSON_HEADERS })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400, headers: JSON_HEADERS })
  } catch (error) {
    console.error('[admin-data] POST failed:', error)
    return serverErrorResponse()
  }
}
