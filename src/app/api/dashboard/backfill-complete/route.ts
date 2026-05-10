import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-opsradar-secret');
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { client_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  if (!body.client_id) {
    return NextResponse.json({ error: 'client_id required' }, { status: 400 });
  }

  const supabase = getServerSupabaseClient();
  const { error } = await supabase
    .from('client_n8n_config')
    .update({ backfill_completed_at: new Date().toISOString() })
    .eq('client_id', body.client_id);

  if (error) {
    console.error('[backfill-complete] Supabase error:', error.message);
    return NextResponse.json({ error: 'failed to update' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
