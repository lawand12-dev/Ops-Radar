// src/app/api/dashboard/tool-policies/route.ts
//
// CP-14 Day 4b — per-tool autonomy policy API.
//
// GET  /api/dashboard/tool-policies → list user's policies
// POST /api/dashboard/tool-policies → upsert (body: { tool_slug, policy })

import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_POLICIES = new Set(['ask', 'auto', 'off']);

export async function GET(): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = await getSessionSupabaseClient();
  const { data, error } = await (supabase
    .from('tool_policies' as unknown as 'agent_actions')
    .select('tool_slug, policy, updated_at')
    .eq('user_id', userId)) as unknown as {
      data: Array<{ tool_slug: string; policy: string; updated_at: string }> | null
      error: { message: string } | null
    };

  if (error) {
    console.error('[tool-policies] list failed:', error.message);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
  return NextResponse.json({ policies: data ?? [] });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as
    | { tool_slug?: string; policy?: string }
    | null;
  const toolSlug = body?.tool_slug?.toString().toLowerCase().trim();
  const policy = body?.policy?.toString().trim();

  if (!toolSlug || !policy || !VALID_POLICIES.has(policy)) {
    return NextResponse.json(
      { error: 'invalid_request', message: 'tool_slug and policy (ask|auto|off) required' },
      { status: 400 },
    );
  }

  const supabase = await getSessionSupabaseClient();
  // tool_policies isn't in generated types yet (created in 20260523 migration).
  // Use a typed-as-any client for the upsert; RLS at the DB still enforces user_id scope.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const untyped = supabase as unknown as { from: (t: string) => any };
  const { error } = await untyped
    .from('tool_policies')
    .upsert(
      { user_id: userId, tool_slug: toolSlug, policy, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,tool_slug' },
    );

  if (error) {
    console.error('[tool-policies] upsert failed:', error.message);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, tool_slug: toolSlug, policy });
}
