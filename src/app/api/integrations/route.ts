import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ConnectedTool = {
  tool: string;
  connected_at: string;
};

export async function GET(_req: NextRequest) {
  const clientId = await getCurrentUserId();
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('integrations')
    .select('tool, connected_at')
    .eq('client_id', clientId);

  if (error) {
    return NextResponse.json(
      { error: `Failed to list integrations: ${error.message || JSON.stringify(error)}` },
      { status: 500 }
    );
  }

  const connected: ConnectedTool[] = (data ?? []).map((row) => ({
    tool: row.tool,
    connected_at: row.connected_at,
  }));

  return NextResponse.json({ connected });
}
