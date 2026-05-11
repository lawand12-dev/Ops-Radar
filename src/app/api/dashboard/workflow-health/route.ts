import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type WorkflowHealthEntry = {
  workflow_id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'failing' | 'unknown';
  last_run_at: string | null;
  last_error_summary: string | null;
  open_alerts_count: number;
  recent_executions: Array<{
    execution_id: string;
    status: 'success' | 'failure' | 'running' | 'canceled';
    started_at: string | null;
    duration_ms: number | null;
    error_summary: string | null;
  }>;
};

type WorkflowHealthResponse =
  | { status: 'not_enrolled' }
  | { status: 'ok'; workflows: WorkflowHealthEntry[] }
  | { status: 'unavailable'; message: string };

export async function GET(_req: NextRequest): Promise<NextResponse<WorkflowHealthResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { status: 'unavailable', message: 'unauthorized' },
      { status: 401 }
    );
  }

  const apiUrl = process.env.CHATV2_API_URL;
  const serviceKey = process.env.CHATV2_SERVICE_API_KEY;
  if (!apiUrl || !serviceKey) {
    console.error('[workflow-health] CHATV2_API_URL or CHATV2_SERVICE_API_KEY missing');
    return NextResponse.json(
      { status: 'unavailable', message: 'integration_not_configured' },
      { status: 500 }
    );
  }

  const supabase = getServerSupabaseClient();
  const { data: mapping, error: mappingError } = await supabase
    .from('client_n8n_config')
    .select('chatv2_project_id')
    .eq('client_id', userId)
    .maybeSingle();

  if (mappingError) {
    console.error('[workflow-health] mapping lookup failed:', mappingError.message);
    return NextResponse.json(
      { status: 'unavailable', message: 'mapping_lookup_failed' },
      { status: 500 }
    );
  }

  if (!mapping?.chatv2_project_id) {
    return NextResponse.json({ status: 'not_enrolled' });
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${apiUrl}/service/projects/${encodeURIComponent(mapping.chatv2_project_id)}/workflows/health`,
      {
        headers: { Authorization: `Bearer ${serviceKey}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      }
    );
  } catch (err) {
    console.error('[workflow-health] upstream fetch threw:', err);
    return NextResponse.json(
      { status: 'unavailable', message: 'upstream_unreachable' },
      { status: 502 }
    );
  }

  if (upstream.status === 404) {
    return NextResponse.json({ status: 'not_enrolled' });
  }

  if (!upstream.ok) {
    console.error(`[workflow-health] upstream ${upstream.status}`);
    return NextResponse.json(
      { status: 'unavailable', message: `upstream_${upstream.status}` },
      { status: 502 }
    );
  }

  const body = (await upstream.json()) as {
    project_id: string;
    workflows: WorkflowHealthEntry[];
  };

  return NextResponse.json({ status: 'ok', workflows: body.workflows });
}
