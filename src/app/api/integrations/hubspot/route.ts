import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { setIntegrationToken, deleteIntegration } from '<npm>/lib/integrations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const accessToken = typeof body?.access_token === 'string' ? body.access_token.trim() : '';

  if (accessToken.length < 8) {
    return NextResponse.json(
      { error: 'access token is required' },
      { status: 400 }
    );
  }

  // Validate the token against HubSpot before storing
  const probe = await fetch('https://api.hubapi.com/account-info/v3/details', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!probe.ok) {
    return NextResponse.json(
      { error: `HubSpot rejected the token (HTTP ${probe.status})` },
      { status: 400 }
    );
  }

  await setIntegrationToken(userData.user.id, 'hubspot', accessToken);
  return NextResponse.json({ status: 'connected' });
}

export async function DELETE(_req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  await deleteIntegration(userData.user.id, 'hubspot');
  return NextResponse.json({ status: 'disconnected' });
}
