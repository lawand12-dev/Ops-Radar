import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { getToolMeta } from '<npm>/lib/integrations/registry';
import { encryptApiKey } from '<npm>/lib/integrations/crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ConnectBody = { api_key?: unknown };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tool: string }> },
): Promise<NextResponse> {
  const { tool } = await params;
  const meta = getToolMeta(tool);
  if (!meta) {
    return NextResponse.json({ error: 'tool_not_supported' }, { status: 404 });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as ConnectBody;
  const apiKey = typeof body.api_key === 'string' ? body.api_key.trim() : '';
  if (apiKey.length < 8) {
    return NextResponse.json(
      { error: 'invalid_input', message: 'API key looks too short.' },
      { status: 400 },
    );
  }

  const validation = await meta.validate(apiKey);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.reason, message: validation.message },
      { status: validation.reason === 'network' ? 502 : 400 },
    );
  }

  const encrypted = encryptApiKey(apiKey);
  const supabase = getServerSupabaseClient();
  const { error: upsertErr } = await supabase
    .from('integrations')
    .upsert(
      {
        client_id: userId,
        tool: meta.tool,
        encrypted_token: encrypted.encrypted_token,
        iv: encrypted.iv,
        auth_tag: encrypted.auth_tag,
        external_account_id: validation.externalAccountId,
        status: 'connected',
        last_error: null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'client_id,tool' },
    );

  if (upsertErr) {
    console.error('[integrations] upsert failed:', upsertErr);
    return NextResponse.json(
      { error: 'storage_failed', message: upsertErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, tool: meta.tool });
}
