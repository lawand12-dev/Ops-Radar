// Accepts a team invitation. Requires the invitee to be already signed in
// with the email the invitation was sent to.
import { NextResponse, type NextRequest } from 'next/server';
import { getActualUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getActualUserId();
  if (!userId) {
    return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  }

  let body: { token?: string };
  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const token = (body.token ?? '').trim();
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 });

  const session = await getSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const { data: invite } = await supabase
    .from('organization_invitations')
    .select('id, org_id, email, role, expires_at, accepted_at')
    .eq('token', token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: 'invalid_token' }, { status: 404 });
  if (invite.accepted_at) return NextResponse.json({ error: 'already_accepted' }, { status: 410 });
  if (new Date(invite.expires_at as string).getTime() < Date.now()) {
    return NextResponse.json({ error: 'invitation_expired' }, { status: 410 });
  }

  // The invitee must be signed in with the same email the invitation was sent to.
  if (user.email.toLowerCase() !== (invite.email as string).toLowerCase()) {
    return NextResponse.json({
      error: 'email_mismatch',
      message: `This invitation was sent to ${invite.email}. Sign in with that email to accept.`,
    }, { status: 403 });
  }

  // Already a member?
  const { data: existing } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('org_id', invite.org_id as string)
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    const { error: addErr } = await supabase
      .from('organization_members')
      .insert({
        org_id: invite.org_id as string,
        user_id: userId,
        role: invite.role as string,
      });
    if (addErr) {
      console.error('[accept-invite] insert member failed:', addErr.message);
      return NextResponse.json({ error: addErr.message }, { status: 500 });
    }
  }

  await supabase
    .from('organization_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id as string);

  return NextResponse.json({ ok: true, org_id: invite.org_id });
}
