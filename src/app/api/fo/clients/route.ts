// FO client CRUD: list, add, remove managed agencies.
// Branch: main / Supabase. Gated to FO plan only.
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier';
import { recordFoAudit } from '<npm>/lib/fo-audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function authenticateFo(): Promise<
  { userId: string } | NextResponse
> {
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

export async function GET(): Promise<NextResponse> {
  const auth = await authenticateFo();
  if (auth instanceof NextResponse) return auth;

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('fo_clients')
    .select('id, agency_name, team_size, notes, created_at')
    .eq('fo_user_id', auth.userId)
    .order('agency_name');

  if (error) {
    console.error('[fo/clients] list failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ clients: data ?? [] });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await authenticateFo();
  if (auth instanceof NextResponse) return auth;

  let body: { agency_name?: string; team_size?: string; notes?: string };
  try {
    body = (await request.json()) as { agency_name?: string; team_size?: string; notes?: string };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.agency_name?.trim()) {
    return NextResponse.json({ error: 'agency_name required' }, { status: 400 });
  }

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('fo_clients')
    .insert({
      fo_user_id: auth.userId,
      agency_name: body.agency_name.trim(),
      team_size: body.team_size?.trim() || null,
      notes: body.notes?.trim() || null,
    })
    .select('id, agency_name, team_size, notes, created_at')
    .single();

  if (error) {
    console.error('[fo/clients] insert failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordFoAudit(auth.userId, 'agency_added', { agency_name: data.agency_name }, data.id);

  return NextResponse.json({ ok: true, client: data }, { status: 201 });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await authenticateFo();
  if (auth instanceof NextResponse) return auth;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const supabase = getServerSupabaseClient();
  const { error } = await supabase
    .from('fo_clients')
    .delete()
    .eq('id', id)
    .eq('fo_user_id', auth.userId);

  if (error) {
    console.error('[fo/clients] delete failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordFoAudit(auth.userId, 'agency_removed', { fo_client_id: id });

  return NextResponse.json({ ok: true });
}
