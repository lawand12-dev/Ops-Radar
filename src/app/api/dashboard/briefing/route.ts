import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { generateBriefingForUser } from '<npm>/lib/briefing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_BLENDED_RATE = 85;
const MIN_REGEN_HOURS = 6;

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

// POST /api/dashboard/briefing — generate a new briefing (throttled to 1 per 6h)
export async function POST(): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = getServerSupabaseClient();
  const threshold = new Date(Date.now() - MIN_REGEN_HOURS * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from('briefings')
    .select('id, created_at')
    .eq('user_id', userId)
    .gte('created_at', threshold)
    .limit(1);

  if (recent && recent.length > 0) {
    return NextResponse.json(
      { error: 'too_soon', next_allowed_at: recent[0].created_at },
      { status: 429 },
    );
  }

  const sessionSupabase = await getSessionSupabaseClient();
  const { data: userData } = await sessionSupabase.auth.getUser();
  const meta = (userData?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const blendedRate = typeof meta.blended_hourly_rate_usd === 'number'
    ? meta.blended_hourly_rate_usd
    : DEFAULT_BLENDED_RATE;

  const briefing = await generateBriefingForUser(userId, blendedRate, 'manual');
  if (!briefing) {
    return NextResponse.json({ error: 'generation_failed' }, { status: 503 });
  }

  return NextResponse.json({ briefing });
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
