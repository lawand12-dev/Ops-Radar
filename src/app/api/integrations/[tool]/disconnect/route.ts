import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { getToolMeta } from '<npm>/lib/integrations/registry';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_KEYS_BY_TOOL: Record<string, string[]> = {
  stripe: ['dash:finance'],
  hubspot: ['dash:sales-live'],
};

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

  const supabase = getServerSupabaseClient();
  const { error: delErr } = await supabase
    .from('integrations')
    .delete()
    .eq('client_id', userId)
    .eq('tool', meta.tool);

  if (delErr) {
    console.error('[integrations] disconnect delete failed:', delErr);
    return NextResponse.json(
      { error: 'delete_failed', message: 'Failed to disconnect. Please try again.' },
      { status: 500 },
    );
  }

  try {
    const redis = Redis.fromEnv();
    const prefixes = CACHE_KEYS_BY_TOOL[meta.tool] ?? [];
    await Promise.all(prefixes.map((p) => redis.del(`${p}:${userId}`)));
  } catch (err) {
    console.warn('[integrations] cache invalidate failed (non-fatal):', err);
  }

  return NextResponse.json({ ok: true });
}
