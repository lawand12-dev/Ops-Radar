/**
 * GET /api/dashboard/brain-status — current state of the customer's Notion
 * Brain provisioning. Used by the post-OAuth progress page to poll until
 * the backfill is complete.
 *
 * Returns:
 *   status: 'not_started' | 'provisioning' | 'ready' | 'failed'
 *   databases_created: number of DBs created so far (best-effort from entity map)
 *   brain_home_ready: boolean — true once the Brain Home page exists
 *   parent_page_id: the root Brain page id (deep-link target)
 *   workspace_name: the connected Notion workspace
 *   error: human-readable error if status='failed'
 *   connected_at: ISO timestamp the Notion OAuth completed
 *
 * RLS scopes to the current user.
 */

import { NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type BrainStatus =
  | 'not_started'
  | 'provisioning'
  | 'ready'
  | 'failed';

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = getServerSupabaseClient();

  // Has the Brain row been created (webhook fired provisionBrain)?
  const { data: workspace } = await supabase
    .from('notion_workspaces')
    .select(
      'parent_page_id, workspace_name, databases, backfill_status, backfill_error, connected_at',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (!workspace) {
    // No workspace row — Notion hasn't been connected + provisioned yet.
    return NextResponse.json({
      status: 'not_started' as BrainStatus,
      databases_created: 0,
      brain_home_ready: false,
      parent_page_id: null,
      workspace_name: null,
      error: null,
      connected_at: null,
    });
  }

  const entities = (workspace.databases ?? {}) as Record<string, string>;
  const databasesCreated = Object.keys(entities).filter(
    (k) => !k.startsWith('__'),
  ).length;
  const brainHomeReady = Boolean(entities['__brain_home']);
  const backfillError = workspace.backfill_error as string | null;
  const backfillStatus = workspace.backfill_status as string;

  let status: BrainStatus;
  if (backfillError) {
    status = 'failed';
  } else if (brainHomeReady && databasesCreated >= 20) {
    status = 'ready';
  } else {
    status = 'provisioning';
  }

  return NextResponse.json({
    status,
    databases_created: databasesCreated,
    brain_home_ready: brainHomeReady,
    parent_page_id: workspace.parent_page_id,
    workspace_name: workspace.workspace_name,
    error: backfillError,
    connected_at: workspace.connected_at,
    backfill_status: backfillStatus,
  });
}
