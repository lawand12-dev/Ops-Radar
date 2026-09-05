import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/dashboard/briefing?limit=4
// GET /api/dashboard/briefing?unread_only=true  → returns { count: number }
export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get('unread_only') === 'true';

  const supabase = await getSessionSupabaseClient();

  if (unreadOnly) {
    const { count, error } = await supabase
      .from('briefings')
      .select('*', { count: 'exact', head: true })
      .is('read_at', null);
    if (error) return NextResponse.json({ count: 0 });
    return NextResponse.json({ count: count ?? 0 });
  }

  const limit = Math.min(Number(url.searchParams.get('limit') ?? '4'), 20);
  const { data, error } = await supabase
    .from('briefings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 });
  return NextResponse.json({ briefings: data ?? [] });
}

// POST /api/dashboard/briefing — previously generated an on-demand briefing.
// The legacy generator was removed in favor of the Briefing Agent
// (src/lib/agents/briefing), which writes the weekly briefing to Notion +
// Gmail on the agent cron. Manual on-demand generation is not wired yet.
// TODO(post-cleanup): wire to Briefing Agent / Notion Weekly Briefings DB.
export async function POST(): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(
    { error: 'not_implemented', message: 'Manual briefing generation is being migrated to the Briefing Agent.' },
    { status: 501 },
  );
}

// PATCH /api/dashboard/briefing — mark briefing(s) as read
// Body: { ids: string[] }
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let ids: string[];
  try {
    const body = await request.json() as { ids?: unknown };
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: 'ids required' }, { status: 400 });
    }
    ids = body.ids as string[];
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const supabase = await getSessionSupabaseClient();
  const { error } = await supabase
    .from('briefings')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('id', ids)
    .is('read_at', null);

  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
