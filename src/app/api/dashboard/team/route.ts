// Team management: list members + invitations, invite new member, remove member.
// Branch: main / Supabase. Only the org owner can invite/remove.
import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { Resend } from 'resend';
import { getActualUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { getOrgMembership } from '<npm>/lib/org';
import {
  SEATS_INCLUDED,
  getUserPlan,
  type Plan,
} from '<npm>/lib/tier';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const INVITE_TTL_DAYS = 7;
const resend = new Resend(process.env.RESEND_API_KEY);

type AuthResult =
  | { ok: true; userId: string; ownerUserId: string; orgId: string; isOwner: boolean; plan: Plan }
  | { ok: false; response: NextResponse };

async function authenticate(): Promise<AuthResult> {
  const userId = await getActualUserId();
  if (!userId) return { ok: false, response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  const membership = await getOrgMembership(userId);
  if (!membership) return { ok: false, response: NextResponse.json({ error: 'no_org' }, { status: 500 }) };

  // Plan check: look at the OWNER's plan (the canonical data-owning user).
  const supabase = getServerSupabaseClient();
  const { data: { user: owner } } = await supabase.auth.admin.getUserById(membership.owner_user_id);
  const plan = getUserPlan((owner?.user_metadata ?? null) as Record<string, unknown> | null);

  return {
    ok: true,
    userId,
    ownerUserId: membership.owner_user_id,
    orgId: membership.org_id,
    isOwner: membership.is_owner,
    plan,
  };
}

export async function GET(): Promise<NextResponse> {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;

  const supabase = getServerSupabaseClient();

  const [{ data: memberRows }, { data: inviteRows }] = await Promise.all([
    supabase
      .from('organization_members')
      .select('user_id, role, joined_at')
      .eq('org_id', auth.orgId),
    supabase
      .from('organization_invitations')
      .select('id, email, role, expires_at, accepted_at, created_at')
      .eq('org_id', auth.orgId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString()),
  ]);

  // Resolve member user details (email, full_name) via auth admin
  const members = await Promise.all(
    (memberRows ?? []).map(async (m) => {
      const { data: { user } } = await supabase.auth.admin.getUserById(m.user_id as string);
      const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
      return {
        user_id: m.user_id as string,
        email: user?.email ?? '',
        full_name: (typeof meta.full_name === 'string' ? meta.full_name : null),
        role: m.role as string,
        joined_at: m.joined_at as string,
        is_you: m.user_id === auth.userId,
      };
    }),
  );

  const seatLimit = SEATS_INCLUDED[auth.plan];

  return NextResponse.json({
    org_id: auth.orgId,
    you_are_owner: auth.isOwner,
    plan: auth.plan,
    seats_included: seatLimit,
    member_count: members.length,
    seats_remaining: Math.max(0, seatLimit - members.length),
    members,
    pending_invitations: inviteRows ?? [],
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  if (!auth.isOwner) {
    return NextResponse.json({ error: 'only_owner_can_invite' }, { status: 403 });
  }

  let body: { email?: string; role?: string };
  try {
    body = (await request.json()) as { email?: string; role?: string };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  const role = body.role === 'admin' ? 'admin' : 'member';
  const supabase = getServerSupabaseClient();

  // Seat enforcement
  const { count: memberCount } = await supabase
    .from('organization_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('org_id', auth.orgId);

  const { count: pendingCount } = await supabase
    .from('organization_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', auth.orgId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString());

  const seatLimit = SEATS_INCLUDED[auth.plan];
  const used = (memberCount ?? 0) + (pendingCount ?? 0);
  if (used >= seatLimit) {
    return NextResponse.json(
      { error: 'seat_limit_reached', seats_included: seatLimit, used },
      { status: 402 },
    );
  }

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: invite, error } = await supabase
    .from('organization_invitations')
    .insert({
      org_id: auth.orgId,
      email,
      role,
      token,
      invited_by: auth.userId,
      expires_at: expiresAt,
    })
    .select('id, email, role, expires_at, created_at')
    .single();

  if (error) {
    console.error('[team] invite insert failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send the invite email
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://opsradar.co';
  const acceptUrl = `${baseUrl}/auth/accept-invite?token=${encodeURIComponent(token)}`;
  const { data: { user: inviter } } = await supabase.auth.admin.getUserById(auth.userId);
  const inviterName = (inviter?.user_metadata?.full_name as string | undefined) ?? inviter?.email ?? 'Your colleague';

  try {
    await resend.emails.send({
      from: 'OpsRadar <invitations@opsradar.co>',
      to: email,
      subject: `${inviterName} invited you to OpsRadar`,
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 12px">${inviterName} invited you to OpsRadar</h2>
          <p style="color:#555;line-height:1.6;margin:0 0 16px">
            You've been invited to join an OpsRadar team. Accept the invite to view live profitability, scope, and the AI COO dashboard.
          </p>
          <p style="margin:24px 0"><a href="${acceptUrl}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">Accept invitation</a></p>
          <p style="color:#888;font-size:12px;margin:24px 0 0">This invitation expires in ${INVITE_TTL_DAYS} days. If you weren't expecting this email, ignore it.</p>
        </div>
      `,
    });
  } catch (err) {
    console.warn('[team] invite email send failed:', err);
    // Don't fail the request — the invite row was created; admin can resend.
  }

  return NextResponse.json({ ok: true, invitation: invite }, { status: 201 });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  if (!auth.isOwner) {
    return NextResponse.json({ error: 'only_owner_can_remove' }, { status: 403 });
  }

  const url = new URL(request.url);
  const memberId = url.searchParams.get('user_id');
  const inviteId = url.searchParams.get('invitation_id');

  if (!memberId && !inviteId) {
    return NextResponse.json({ error: 'missing_user_id_or_invitation_id' }, { status: 400 });
  }

  const supabase = getServerSupabaseClient();

  if (memberId) {
    if (memberId === auth.ownerUserId) {
      return NextResponse.json({ error: 'cannot_remove_owner' }, { status: 400 });
    }
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('org_id', auth.orgId)
      .eq('user_id', memberId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (inviteId) {
    const { error } = await supabase
      .from('organization_invitations')
      .delete()
      .eq('id', inviteId)
      .eq('org_id', auth.orgId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
