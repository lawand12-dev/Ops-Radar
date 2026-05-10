import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const clientId = userData.user?.id ?? process.env.DEV_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('client_n8n_config')
    .select('n8n_base_url, backfill_completed_at, updated_at')
    .eq('client_id', clientId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ configured: false });
  }

  return NextResponse.json({
    configured: true,
    n8nBaseUrl: data.n8n_base_url,
    backfillCompletedAt: data.backfill_completed_at,
    updatedAt: data.updated_at,
  });
}

export async function POST(req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const clientId = userData.user?.id ?? process.env.DEV_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { n8nBaseUrl?: string; n8nWebhookSecret?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const baseUrl = body.n8nBaseUrl?.trim();
  const secret = body.n8nWebhookSecret?.trim();

  if (!baseUrl || !secret) {
    return NextResponse.json(
      { error: 'n8nBaseUrl and n8nWebhookSecret are required' },
      { status: 400 }
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return NextResponse.json({ error: 'n8nBaseUrl must be a valid URL' }, { status: 400 });
  }

  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    return NextResponse.json(
      { error: 'n8nBaseUrl must use https (or localhost for dev)' },
      { status: 400 }
    );
  }

  const normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, '')}`;

  const { error } = await supabase
    .from('client_n8n_config')
    .upsert(
      {
        client_id: clientId,
        n8n_base_url: normalized,
        n8n_webhook_secret: secret,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id' }
    );

  if (error) {
    console.error('[n8n-connection POST] Supabase error:', error.message);
    return NextResponse.json({ error: 'failed to save' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, n8nBaseUrl: normalized });
}
