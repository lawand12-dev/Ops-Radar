import { applyRateLimit } from '../../../lib/rate-limit'
import { sanitizeString, serverErrorResponse } from '../../../lib/security'
import { getServerSupabaseClient } from '../../../lib/supabase-server'

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
}

export async function GET(request: Request) {
  try {
    const rateLimitResponse = await applyRateLimit(request, 'audit-result')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const url = new URL(request.url)
    const auditId = sanitizeString(url.searchParams.get('id') ?? '', 200)
    const token = sanitizeString(url.searchParams.get('token') ?? '', 200)

    if (!auditId || !token) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: NO_STORE_HEADERS })
    }

    const supabase = getServerSupabaseClient()
    const { data, error } = await supabase
      .from('audits')
      .select('result, company, name, email, answers')
      .eq('id', auditId)
      .eq('access_token', token)
      .single()

    if (error || !data?.result) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: NO_STORE_HEADERS })
    }

    return Response.json(
      {
        audit: data.result,
        meta: {
          company: data.company,
          name: data.name,
          email: data.email,
          answers: data.answers,
        },
      },
      { headers: NO_STORE_HEADERS },
    )
  } catch (error) {
    console.error('[audit-result] Unexpected error:', error)
    return serverErrorResponse()
  }
}
