// Returns the customer's action usage + quota for the current month.
// Powers the "X of Y actions used this month" badge on /dashboard/actions.
import { NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getMonthlyUsage } from '<npm>/lib/actions/usage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const usage = await getMonthlyUsage(userId);

  return NextResponse.json({
    plan: usage.plan,
    used: usage.used,
    quota: usage.quota,
    // Serialize Infinity as -1 so JSON can carry it
    remaining: usage.remaining === Number.POSITIVE_INFINITY ? -1 : usage.remaining,
    period_start: usage.period_start,
    period_end: usage.period_end,
    over_quota: usage.over_quota,
  });
}
