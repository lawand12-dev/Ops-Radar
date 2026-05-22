// src/app/api/dashboard/coo/sessions/[id]/route.ts
//
// COO chat single-session API.
//
// GET    → returns the session metadata + ordered messages.
// DELETE → deletes the session (cascades to messages).
// PATCH  → rename (body: { title }).

import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const supabase = await getSessionSupabaseClient();

  const [sessionRes, messagesRes] = await Promise.all([
    supabase
      .from('coo_chat_sessions')
      .select('id, title, message_count, last_message_at, created_at')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('coo_chat_messages')
      .select('id, role, content, tool_steps, action_card, created_at')
      .eq('session_id', id)
      .order('created_at', { ascending: true }),
  ]);

  if (sessionRes.error) return NextResponse.json({ error: 'db_error', details: sessionRes.error.message }, { status: 500 });
  if (!sessionRes.data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({
    session: sessionRes.data,
    messages: messagesRes.data ?? [],
  });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const supabase = await getSessionSupabaseClient();
  const { error } = await supabase.from('coo_chat_sessions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'delete_failed', details: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  let body: { title?: string };
  try {
    body = (await request.json()) as { title?: string };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : null;
  if (!title) return NextResponse.json({ error: 'invalid_title' }, { status: 400 });

  const supabase = await getSessionSupabaseClient();
  const { data, error } = await supabase
    .from('coo_chat_sessions')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, title, message_count, last_message_at, created_at')
    .single();

  if (error || !data) return NextResponse.json({ error: 'update_failed', details: error?.message }, { status: 500 });
  return NextResponse.json({ session: data });
}
