import { getServerSupabaseClient } from '../../../lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token || typeof token !== 'string') {
    return Response.json({ error: 'Invalid token' }, { status: 400 })
  }

  const supabase = getServerSupabaseClient()

  const { data: audit, error: findError } = await supabase
    .from('audits')
    .select('id, email, unsubscribed_at')
    .eq('unsubscribe_token', token)
    .single()

  if (findError || !audit) {
    return Response.json({ error: 'Invalid or expired token' }, { status: 404 })
  }

  if (audit.unsubscribed_at) {
    return Response.json({ success: true, alreadyUnsubscribed: true, email: audit.email })
  }

  const { error: updateError } = await supabase
    .from('audits')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('id', audit.id)

  if (updateError) {
    return Response.json({ error: 'Unsubscribe failed, please try again' }, { status: 500 })
  }

  return Response.json({ success: true, email: audit.email })
}
