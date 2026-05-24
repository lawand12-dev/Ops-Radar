// src/app/api/dashboard/automations/route.ts
//
// CP-20 Phase 5d — list endpoint for the customer's automations.
// Matches the auth + response shape of /api/dashboard/runs and /api/dashboard/actions.

import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { listAutomations } from '<npm>/lib/automations/registry';
import type { AutomationStatus } from '<npm>/lib/automations/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_STATUSES: AutomationStatus[] = ['active', 'paused', 'archived'];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const statusParam = url.searchParams.get('status');

  const all = await listAutomations(userId);

  const filtered =
    statusParam && (VALID_STATUSES as string[]).includes(statusParam)
      ? all.filter((a) => a.status === statusParam)
      : all;

  return NextResponse.json({ automations: filtered, total: filtered.length });
}
