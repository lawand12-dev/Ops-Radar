// Per-FO-client integration key CRUD.
// Branch: main / Supabase. Stores encrypted API keys per managed agency.
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier';
import { encryptApiKey } from '<npm>/lib/integrations/crypto';
import { isFoSupportedTool } from '<npm>/lib/fo';
import { recordFoAudit } from '<npm>/lib/fo-audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function authenticateFo(): Promise<{ userId: string } | NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const session = await getSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  const plan = getUserPlan(user?.user_metadata ?? null);
  if (!canAccess(plan, 'fo_dashboard')) {
    return NextResponse.json(upgradeRequiredBody('fo'), { status: 402 });
  }

  return { userId };
}

async function verifyClientOwnership(
  foUserId: string,
  foClientId: string,
): Promise<boolean> {
  const supabase = getServerSupabaseClient();
  const { data } = await supabase
    .from('fo_clients')
    .select('id')
    .eq('id', foClientId)
    .eq('fo_user_id', foUserId)
    .maybeSingle();
  return !!data;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await authenticateFo();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;

  if (!(await verifyClientOwnership(auth.userId, id))) {
    return NextResponse.json({ error: 'client_not_found' }, { status: 404 });
  }

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('fo_integrations')
    .select('id, tool, status, connected_at')
    .eq('fo_client_id', id)
    .eq('fo_user_id', auth.userId);

  if (error) {
    console.error('[fo/integrations] list failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ integrations: data ?? [] });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await authenticateFo();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;

  let body: { tool?: string; api_key?: string };
  try {
    body = (await request.json()) as { tool?: string; api_key?: string };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.tool || !body.api_key?.trim()) {
    return NextResponse.json({ error: 'tool and api_key required' }, { status: 400 });
  }
  if (!isFoSupportedTool(body.tool)) {
    return NextResponse.json({ error: 'unsupported_tool' }, { status: 400 });
  }

  if (!(await verifyClientOwnership(auth.userId, id))) {
    return NextResponse.json({ error: 'client_not_found' }, { status: 404 });
  }

  const encrypted = encryptApiKey(body.api_key.trim());

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('fo_integrations')
    .upsert(
      {
        fo_client_id: id,
        fo_user_id: auth.userId,
        tool: body.tool,
        encrypted_token: encrypted.encrypted_token,
        iv: encrypted.iv,
        auth_tag: encrypted.auth_tag,
        status: 'connected',
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'fo_client_id,tool' },
    )
    .select('id, tool, status, connected_at')
    .single();

  if (error) {
    console.error('[fo/integrations] upsert failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordFoAudit(auth.userId, 'integration_added', { tool: body.tool }, id);

  return NextResponse.json({ ok: true, integration: data });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await authenticateFo();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;

  const tool = new URL(request.url).searchParams.get('tool');
  if (!tool) return NextResponse.json({ error: 'missing_tool' }, { status: 400 });

  const supabase = getServerSupabaseClient();
  const { error } = await supabase
    .from('fo_integrations')
    .delete()
    .eq('fo_client_id', id)
    .eq('fo_user_id', auth.userId)
    .eq('tool', tool);

  if (error) {
    console.error('[fo/integrations] delete failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordFoAudit(auth.userId, 'integration_removed', { tool }, id);

  return NextResponse.json({ ok: true });
}
