import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function requireAdmin(req: NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  // Reuse the same admin password gate as /api/admin-auth.
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

  let body: {
    email?: string;
    n8nBaseUrl?: string;
    n8nWebhookSecret?: string;
    n8nApiKey?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const n8nBaseUrl = body.n8nBaseUrl?.trim();
  const n8nWebhookSecret = body.n8nWebhookSecret?.trim();
  const n8nApiKey = body.n8nApiKey?.trim();

  if (!email || !n8nBaseUrl || !n8nWebhookSecret || !n8nApiKey) {
    return NextResponse.json(
      { error: 'email, n8nBaseUrl, n8nWebhookSecret, and n8nApiKey are required' },
      { status: 400 }
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(n8nBaseUrl);
  } catch {
    return NextResponse.json({ error: 'n8nBaseUrl must be a valid URL' }, { status: 400 });
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') {
    return NextResponse.json({ error: 'n8nBaseUrl must use https' }, { status: 400 });
  }
  const normalizedUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname.replace(/\/+$/, '')}`;

  const supabase = getServerSupabaseClient();

  // Step 1: invite the user (creates auth.users row + sends magic-link email)
  const inviteRes = await supabase.auth.admin.inviteUserByEmail(email);
  if (inviteRes.error || !inviteRes.data.user) {
    console.error('[onboard-customer] invite failed:', inviteRes.error?.message);
    return NextResponse.json(
      { error: `invite failed: ${inviteRes.error?.message ?? 'no user returned'}` },
      { status: 500 }
    );
  }
  const userId = inviteRes.data.user.id;

  // Step 2: insert the n8n config row. If this fails, roll back the user.
  const { error: insertError } = await supabase.from('client_n8n_config').insert({
    client_id: userId,
    n8n_base_url: normalizedUrl,
    n8n_webhook_secret: n8nWebhookSecret,
    n8n_api_key: n8nApiKey,
  });

  if (insertError) {
    console.error('[onboard-customer] insert failed, rolling back user:', insertError.message);
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: `insert failed: ${insertError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, userId, email });
}
