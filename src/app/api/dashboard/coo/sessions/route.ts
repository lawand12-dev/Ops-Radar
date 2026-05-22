// src/app/api/dashboard/coo/sessions/route.ts
//
// COO chat sessions — list + create.
//
// GET  → returns the user's sessions ordered by last_message_at desc.
// POST → creates a new empty session (returns the new id + default title).

import { NextResponse } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = await getSessionSupabaseClient();
  const { data, error } = await supabase
    .from('coo_chat_sessions')
    .select('id, title, message_count, last_message_at, created_at')
    .order('last_message_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data ?? [] });
}

export async function POST(): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = await getSessionSupabaseClient();
  const { data, error } = await supabase
    .from('coo_chat_sessions')
    .insert({ user_id: userId, title: 'New chat' })
    .select('id, title, message_count, last_message_at, created_at')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'create_failed', details: error?.message }, { status: 500 });
  }
  return NextResponse.json({ session: data });
}
