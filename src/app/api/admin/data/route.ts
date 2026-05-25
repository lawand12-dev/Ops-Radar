import { type NextRequest } from 'next/server'
import {
  getAdminSessionTokenFromCookieHeader,
  isValidAdminSessionToken,
} from '../../../../lib/admin-session'
import { applyRateLimit } from '../../../../lib/rate-limit'
import { sanitizeString, serverErrorResponse } from '../../../../lib/security'
import { getServerSupabaseClient } from '../../../../lib/supabase-server'

// `audits` / `audit_sessions` / `audit_events` / `build_requests` were
// dropped in CP-16 (the prospect-facing audit funnel was retired). The
// admin panel pages still reference them — we return empty arrays so the
// UI degrades to "no rows" instead of crashing. There are no longer any
// mutable tables exposed through this admin endpoint.
type MutableTableName = never
const MUTABLE_TABLES = new Set<MutableTableName>()

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
      // CP-16 retired the audits table — return empty so the admin panel
      // doesn't crash.
      return Response.json({ audits: [] }, { headers: JSON_HEADERS })
    }

    // Suppress unused-var lint without removing the import — easier to
    // restore later if the audits/build_requests tables come back.
    void supabase

    return Response.json(
      {
        audits: [],
        builds: [],
        auditSessions: [],
        auditEvents: [],
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

    // CP-16 dropped all tables this endpoint used to mutate. There's
    // nothing valid to delete; reject every payload until the admin UI
    // is rewired to whatever the new mutation surface is.
    void normalizeMutableTable
    return Response.json(
      { error: 'Invalid request payload' },
      { status: 400, headers: JSON_HEADERS },
    )
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

    // CP-16 dropped the audits table — delete-old-audits / delete-test-audits
    // are no-ops now. Return success with count=0 so the UI shows a confirmation
    // instead of a 400.
    if (action === 'delete-old-audits' || action === 'delete-test-audits') {
      void supabase // silence unused
      return Response.json({ count: 0 }, { headers: JSON_HEADERS })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400, headers: JSON_HEADERS })
  } catch (error) {
    console.error('[admin-data] POST failed:', error)
    return serverErrorResponse()
  }
}
