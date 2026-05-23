/**
 * Tier → permitted agents mapping. Single source of truth for plan gating.
 *
 * Starter (3 agents) — revenue, collections, briefing
 * Growth  (5 agents) — adds scope, delivery
 * Pro     (10 agents) — adds profitability, team, growth, renewal, stack
 * FO              — same agents as Pro (operator across N managed agencies)
 */

import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { getUserPlan, type Plan } from '<npm>/lib/tier'
import type { AgentSlug, AgentTier } from './types'

const PRO_AGENTS: AgentSlug[] = [
  'revenue',
  'collections',
  'briefing',
  'scope',
  'delivery',
  'profitability',
  'team',
  'growth',
  'renewal',
  'stack',
]

export const PLAN_AGENTS: Record<Plan, readonly AgentSlug[]> = {
  starter: ['revenue', 'collections', 'briefing'],
  growth: ['revenue', 'collections', 'briefing', 'scope', 'delivery'],
  pro: PRO_AGENTS,
  fo: PRO_AGENTS,
} as const

/**
 * `userTier` is the customer's actual plan (incl. 'fo'); `requiredTier` is the
 * minimum declared by an agent (always one of starter/growth/pro). We check
 * the customer's plan against the full PLAN_AGENTS list so 'fo' picks up all
 * pro-tier agents without extra config.
 */
export function tierAllows(userTier: Plan, agentSlug: AgentSlug): boolean {
  return PLAN_AGENTS[userTier].includes(agentSlug)
}

/**
 * Type guard so `tierAllows` callers can keep using the narrower AgentTier when
 * declaring `requiredTier` on AgentSpec, while letting actual users be on any
 * plan including 'fo'.
 */
export function isAgentTier(p: Plan): p is AgentTier {
  return p === 'starter' || p === 'growth' || p === 'pro'
}

/**
 * Reads the user's plan from auth.users.user_metadata.plan. Returns null if the
 * user can't be loaded (deleted, missing service role, etc.) — callers should
 * treat null as "skip this user".
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY at the server. Cron endpoints must run
 * with the service role; getServerSupabaseClient() handles that.
 */
export async function getUserTier(userId: string): Promise<Plan | null> {
  const supabase = getServerSupabaseClient()
  const { data, error } = await supabase.auth.admin.getUserById(userId)
  if (error || !data?.user) {
    console.warn('[tier-gate] getUserById failed:', error?.message)
    return null
  }
  return getUserPlan(data.user.user_metadata ?? {})
}
