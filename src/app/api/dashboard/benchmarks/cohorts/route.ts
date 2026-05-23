// OpsRadar Index cohort browser API.
// Returns all benchmark rows the customer can drill into, filtered by
// team_size and service_mix. Gated to Growth+ (same as base benchmarks).
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier';
import { collectUserMetrics } from '<npm>/lib/benchmarks/collect';
import { isComposioConnected } from '<npm>/lib/composio-fetch';
import { bucketForServiceMix, bucketForTeamSize } from '<npm>/lib/benchmarks/buckets';
import {
  SERVICE_MIX_BUCKETS,
  TEAM_SIZE_BUCKETS,
  type BenchmarkRow,
  type ServiceMixBucket,
  type TeamSizeBucket,
} from '<npm>/lib/benchmarks/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const service = getServerSupabaseClient();
  const { data: { user }, error: userErr } = await service.auth.admin.getUserById(userId);
  if (userErr || !user) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const plan = getUserPlan(meta);
  if (!canAccess(plan, 'benchmarks')) {
    return NextResponse.json(upgradeRequiredBody('growth'), { status: 402 });
  }

  const url = new URL(request.url);
  const teamFilter = url.searchParams.get('team_size') as TeamSizeBucket | null;
  const mixFilter = url.searchParams.get('service_mix') as ServiceMixBucket | null;

  const session = await getSessionSupabaseClient();
  let q = session.from('benchmarks').select('*');
  if (teamFilter && (TEAM_SIZE_BUCKETS as readonly string[]).includes(teamFilter)) {
    q = q.eq('team_size_bucket', teamFilter);
  }
  if (mixFilter && (SERVICE_MIX_BUCKETS as readonly string[]).includes(mixFilter)) {
    q = q.eq('service_mix_bucket', mixFilter);
  }
  const { data: rows, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also include the user's own metric values so the UI can show "your number" alongside cohort percentiles.
  const userTeam = bucketForTeamSize(meta.team_size as string | undefined);
  const userMix = bucketForServiceMix(meta.service_mix as string | undefined);

  const [stripeConnected, harvestConnected] = await Promise.all([
    isComposioConnected(userId, 'stripe'),
    isComposioConnected(userId, 'harvest'),
  ]);

  const userMetrics = await collectUserMetrics({
    userId,
    stripeConnected,
    harvestConnected,
    blendedRate:   typeof meta.blended_hourly_rate_usd === 'number'
      ? meta.blended_hourly_rate_usd
      : null,
  });

  return NextResponse.json({
    user_team_size: userTeam,
    user_service_mix: userMix,
    user_metrics: userMetrics,
    benchmarks: (rows ?? []) as BenchmarkRow[],
  });
}
