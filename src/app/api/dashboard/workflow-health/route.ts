import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { chatV2Fetch } from '<npm>/lib/chatv2/client';
import { ChatV2Error } from '<npm>/lib/chatv2/errors';

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
      { status: 401 },
    );
  }

  try {
    const body = await chatV2Fetch<{ project_id: string; workflows: WorkflowHealthEntry[] }>(
      '/workflows/health',
      { projectId: userId },
    );
    return NextResponse.json({ status: 'ok', workflows: body.workflows });
  } catch (err) {
    if (err instanceof ChatV2Error) {
      if (err.isNotFound()) {
        return NextResponse.json({ status: 'not_enrolled' });
      }
      console.error(`[workflow-health] chatv2 ${err.status} ${err.code}: ${err.message}`);
      return NextResponse.json(
        { status: 'unavailable', message: `upstream_${err.status || 'error'}` },
        { status: 502 },
      );
    }
    console.error('[workflow-health] unexpected error:', err);
    return NextResponse.json(
      { status: 'unavailable', message: 'internal_error' },
      { status: 500 },
    );
  }
}
