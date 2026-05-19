// Monthly agentic action usage tracking and tier-quota enforcement.
// Branch: main / Supabase. Queries the existing `agent_actions` table —
// no separate usage counter table needed.

import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { ACTION_QUOTAS, getUserPlan, type Plan } from '<npm>/lib/tier';

export type ActionUsage = {
  plan: Plan;
  used: number;
  quota: number; // -1 = unlimited
  remaining: number; // Infinity for unlimited
  period_start: string;
  period_end: string;
  over_quota: boolean;
};

function monthBoundsUTC(date = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { start, end };
}

/**
 * Returns count of actions created for this user in the current calendar month,
 * excluding dismissed actions (those don't consume quota — they were rejected drafts).
 */
export async function countActionsThisMonth(userId: string): Promise<number> {
  const supabase = getServerSupabaseClient();
  const { start, end } = monthBoundsUTC();

  const { count, error } = await supabase
    .from('agent_actions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .neq('status', 'dismissed')
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString());

  if (error) {
    console.error('[actions/usage] count failed:', error.message);
    return 0;
  }

  return count ?? 0;
}

/**
 * Resolves the user's plan from auth.users metadata, then computes usage vs quota.
 */
export async function getMonthlyUsage(userId: string): Promise<ActionUsage> {
  const supabase = getServerSupabaseClient();
  const { data: { user } } = await supabase.auth.admin.getUserById(userId);
  const plan = getUserPlan((user?.user_metadata ?? null) as Record<string, unknown> | null);
  const quota = ACTION_QUOTAS[plan];
  const used = await countActionsThisMonth(userId);
  const { start, end } = monthBoundsUTC();

  const remaining = quota < 0 ? Number.POSITIVE_INFINITY : Math.max(0, quota - used);
  const over_quota = quota >= 0 && used >= quota;

  return {
    plan,
    used,
    quota,
    remaining,
    period_start: start.toISOString(),
    period_end: end.toISOString(),
    over_quota,
  };
}

/**
 * Hard check used inside the evaluator before inserting a new action.
 * Returns true if the user has remaining quota OR is on an unlimited plan.
 */
export async function hasQuotaRemaining(userId: string): Promise<boolean> {
  const usage = await getMonthlyUsage(userId);
  if (usage.quota < 0) return true;
  return usage.used < usage.quota;
}
