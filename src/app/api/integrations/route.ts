import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ConnectedTool = {
  tool: string;
  connected_at: string;
  status: 'connected' | 'requires_reconnect' | 'revoked';
  external_account_id: string | null;
  last_synced_at: string | null;
};

export async function GET(_req: NextRequest) {
  const clientId = await getCurrentUserId();
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('integrations')
    .select('tool, connected_at, status, external_account_id, last_synced_at')
    .eq('client_id', clientId);

  if (error) {
    console.error('[integrations] list failed:', error);
    return NextResponse.json(
      { error: 'list_failed', message: 'Failed to list integrations.' },
      { status: 500 },
    );
  }

  const connected: ConnectedTool[] = (data ?? []).map((row) => ({
    tool: row.tool,
    connected_at: row.connected_at,
    status: (row.status ?? 'connected') as ConnectedTool['status'],
    external_account_id: row.external_account_id,
    last_synced_at: row.last_synced_at,
  }));

  return NextResponse.json({ connected });
}
