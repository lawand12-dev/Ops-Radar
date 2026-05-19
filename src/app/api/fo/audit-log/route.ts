// FO audit log reader. Gated to FO plan.
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const session = await getSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  const plan = getUserPlan(user?.user_metadata ?? null);
  if (!canAccess(plan, 'fo_dashboard')) {
    return NextResponse.json(upgradeRequiredBody('fo'), { status: 402 });
  }

  const limit = Math.min(Number(new URL(request.url).searchParams.get('limit') ?? '100'), 500);

  const supabase = getServerSupabaseClient();
  // Join to get agency name. Two queries because Supabase TS doesn't auto-join.
  const { data: entries, error } = await supabase
    .from('fo_audit_log')
    .select('id, fo_client_id, action_kind, details, created_at')
    .eq('fo_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Resolve agency names for client_ids
  const clientIds = [...new Set((entries ?? []).map((e) => e.fo_client_id).filter((x): x is string => !!x))];
  const namesById = new Map<string, string>();
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from('fo_clients')
      .select('id, agency_name')
      .in('id', clientIds);
    for (const c of clients ?? []) {
      namesById.set(c.id as string, c.agency_name as string);
    }
  }

  const enriched = (entries ?? []).map((e) => ({
    ...e,
    agency_name: e.fo_client_id ? namesById.get(e.fo_client_id) ?? null : null,
  }));

  return NextResponse.json({ entries: enriched });
}
