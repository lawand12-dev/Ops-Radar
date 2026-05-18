// src/app/api/dashboard/onboarding-status/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export type OnboardingStatus = {
  steps: {
    time_tracking: boolean;
    billing: boolean;
    blended_rate: boolean;
    first_briefing: boolean;
  };
  complete: boolean;
};

export async function GET(): Promise<NextResponse<OnboardingStatus | { error: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const session = await getSessionSupabaseClient();

  const [{ data: integrations }, { data: userData }, { count: briefingCount }] = await Promise.all([
    supabase
      .from('integrations')
      .select('tool, status')
      .eq('client_id', userId)
      .eq('status', 'connected'),
    session.auth.getUser(),
    supabase
      .from('briefings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  const connectedTools = new Set((integrations ?? []).map((r) => r.tool));
  const meta = (userData?.user?.user_metadata ?? {}) as Record<string, unknown>;

  const steps = {
    time_tracking: connectedTools.has('harvest') || connectedTools.has('toggl'),
    billing: connectedTools.has('stripe'),
    blended_rate:
      typeof meta.blended_hourly_rate_usd === 'number' && meta.blended_hourly_rate_usd > 0,
    first_briefing: (briefingCount ?? 0) > 0,
  };

  return NextResponse.json({
    steps,
    complete: Object.values(steps).every(Boolean),
  });
}
