// src/app/api/admin/onboard-customer/route.ts
//
// CP-15: stripped of all n8n / client_n8n_config provisioning.
// Customer onboarding is now: invite the user via Supabase, send the
// magic-link email. Tool credentials live in Nango (OAuth), not in
// our DB — the customer connects them themselves at /dashboard/integrations.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function requireAdmin(req: NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  const headerPassword = req.headers.get('x-admin-password');
  const envPassword = process.env.ADMIN_PASSWORD;
  if (!envPassword) {
    return { ok: false, status: 500, error: 'admin password not configured' };
  }
  if (headerPassword !== envPassword) {
    return { ok: false, status: 401, error: 'unauthorized' };
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  const supabase = getServerSupabaseClient();
  const inviteRes = await supabase.auth.admin.inviteUserByEmail(email);
  if (inviteRes.error || !inviteRes.data.user) {
    console.error('[onboard-customer] invite failed:', inviteRes.error?.message);
    return NextResponse.json(
      { error: `invite failed: ${inviteRes.error?.message ?? 'no user returned'}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    userId: inviteRes.data.user.id,
    email,
  });
}
