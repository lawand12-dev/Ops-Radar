import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { setIntegrationToken, deleteIntegration } from '<npm>/lib/integrations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  const clientId = userData.user?.id ?? process.env.DEV_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const apiKey = typeof body?.api_key === 'string' ? body.api_key.trim() : '';

  if (apiKey.length < 8) {
    return NextResponse.json({ error: 'API key is required' }, { status: 400 });
  }

  const probe = await fetch('https://api.apollo.io/api/v1/auth/health', {
    headers: { 'X-Api-Key': apiKey, accept: 'application/json' },
  });
  if (!probe.ok) {
    return NextResponse.json(
      { error: `Apollo rejected the key (HTTP ${probe.status})` },
      { status: 400 }
    );
  }

  await setIntegrationToken(clientId, 'apollo', apiKey);
  return NextResponse.json({ status: 'connected' });
}

export async function DELETE(_req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  const clientId = userData.user?.id ?? process.env.DEV_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  await deleteIntegration(clientId, 'apollo');
  return NextResponse.json({ status: 'disconnected' });
}
