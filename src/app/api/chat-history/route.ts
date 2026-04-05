import { supabase } from '../../../lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { visitor_id, action } = body

    if (!visitor_id) {
      return Response.json({ error: 'Invalid visitor_id' }, { status: 400 })
    }

    if (action === 'get-conversations') {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('id, created_at, updated_at, messages, visitor_id')
        .eq('visitor_id', visitor_id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return Response.json({ conversations: data || [] })
    }

    if (action === 'get-conversation') {
      const { convId } = body
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', convId)
        .eq('visitor_id', visitor_id)
        .single()

      if (error) throw error
      return Response.json({ conversation: data })
    }

    if (action === 'delete-conversation') {
      const { convId } = body
      
      // Verify ownership first
      const { data: conv, error: getErr } = await supabase
        .from('chat_conversations')
        .select('visitor_id')
        .eq('id', convId)
        .single()

      if (getErr || conv?.visitor_id !== visitor_id) {
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
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
