import { supabase } from '../../../lib/supabase'
import { applyRateLimit } from '../../../lib/rate-limit'
import { sanitizeString, serverErrorResponse } from '../../../lib/security'

export async function POST(request: Request) {
  try {
    const rateLimitResponse = applyRateLimit(request, 'chat-history')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const action = sanitizeString(String(body?.action ?? ''), 64)
    const visitorId = sanitizeString(String(body?.visitor_id ?? ''), 200)
    const email = sanitizeString(String(body?.email ?? ''), 320)
    const convId = sanitizeString(String(body?.convId ?? ''), 200)

    if (!action || (!visitorId && !email)) {
      return Response.json({ error: 'Invalid request payload' }, { status: 400 })
    }

    const queryField = email ? 'visitor_email' : 'visitor_id'
    const queryValue = email || visitorId

    if (!queryValue) {
      return Response.json({ error: 'Invalid request payload' }, { status: 400 })
    }

    if (action === 'get-conversations') {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('id, created_at, updated_at, messages, visitor_id, visitor_email')
        .eq(queryField, queryValue)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return Response.json({ conversations: data || [] })
    }

    if (action === 'get-conversation') {
      if (!convId) {
        return Response.json({ error: 'Invalid request payload' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', convId)
        .eq(queryField, queryValue)
        .single()

      if (error) throw error
      return Response.json({ conversation: data })
    }

    if (action === 'delete-conversation') {
      if (!convId) {
        return Response.json({ error: 'Invalid request payload' }, { status: 400 })
      }

      // Verify ownership first
      const { data: conv, error: getErr } = await supabase
        .from('chat_conversations')
        .select('visitor_id, visitor_email')
        .eq('id', convId)
        .single()

      const ownsConversation = conv && (
        (email && conv.visitor_email === email) ||
        (visitorId && conv.visitor_id === visitorId)
      )

      if (getErr || !ownsConversation) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 })
      }

      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', convId)

      if (error) throw error
      return Response.json({ success: true })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('[chat-history api]:', err)
    return serverErrorResponse()
  }
}
