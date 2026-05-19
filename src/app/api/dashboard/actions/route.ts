import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { executeAction } from '<npm>/lib/actions/executor';
import type { AgentAction } from '<npm>/lib/actions/types';
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function checkAgenticActionsPlan(): Promise<NextResponse | null> {
  const session = await getSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  const plan = getUserPlan(user?.user_metadata ?? null);
  if (!canAccess(plan, 'agentic_actions')) {
    return NextResponse.json(upgradeRequiredBody('pro'), { status: 402 });
  }
  return null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const planBlock = await checkAgenticActionsPlan();
  if (planBlock) return planBlock;

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 100);

  const supabase = await getSessionSupabaseClient();

  let query = supabase
    .from('agent_actions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (statusFilter) query = query.eq('status', statusFilter);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 });

  const { count } = await supabase
    .from('agent_actions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  return NextResponse.json({ actions: data ?? [], pending_count: count ?? 0 });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const planBlock = await checkAgenticActionsPlan();
  if (planBlock) return planBlock;

  let body: { action?: string; id?: string };
  try {
    body = await request.json() as { action?: string; id?: string };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { action: op, id } = body;
  if (!id || !['approve', 'dismiss', 'undo'].includes(op ?? '')) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }

  const supabase = await getSessionSupabaseClient();
  const { data: row, error: fetchErr } = await supabase
    .from('agent_actions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const agentAction = row as AgentAction;

  if (op === 'dismiss') {
    if (!['pending', 'executed'].includes(agentAction.status)) {
      return NextResponse.json({ error: 'cannot_dismiss' }, { status: 409 });
    }
    await supabase.from('agent_actions').update({ status: 'dismissed' }).eq('id', id);
    return NextResponse.json({ ok: true });
  }

  if (op === 'undo') {
    if (agentAction.status !== 'executed') {
      return NextResponse.json({ error: 'not_executed' }, { status: 409 });
    }
    if (agentAction.undo_deadline && new Date(agentAction.undo_deadline) < new Date()) {
      return NextResponse.json({ error: 'undo_window_expired' }, { status: 409 });
    }
    await supabase
      .from('agent_actions')
      .update({ status: 'undone', undone_at: new Date().toISOString() })
      .eq('id', id);
    return NextResponse.json({ ok: true });
  }

  if (op === 'approve') {
    if (agentAction.status !== 'pending') {
      return NextResponse.json({ error: 'not_pending' }, { status: 409 });
    }
    await supabase
      .from('agent_actions')
      .update({ status: 'pending', approved_at: new Date().toISOString() })
      .eq('id', id);

    const serviceSupabase = getServerSupabaseClient();
    const { data: freshRow } = await serviceSupabase
      .from('agent_actions')
      .select('*')
      .eq('id', id)
      .single();
    if (freshRow) await executeAction(freshRow as AgentAction);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown_op' }, { status: 400 });
}
