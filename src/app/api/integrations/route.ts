import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '<npm>/lib/database.types';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ConnectedTool = {
  tool: string;
  connected_at: string;
};

function getReadClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('missing Supabase env vars');
  return createClient<Database>(url, key);
}

export async function GET(_req: NextRequest) {
  const clientId = await getCurrentUserId();
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const read = getReadClient();
  const { data, error } = await read
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
