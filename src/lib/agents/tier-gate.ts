/**
 * Tier → permitted agents mapping. Single source of truth for plan gating.
 *
 * Starter (3 agents) — revenue, collections, briefing
 * Growth  (5 agents) — adds scope, delivery
 * Pro     (10 agents) — adds profitability, team, growth, renewal, stack
 */

import type { AgentSlug, AgentTier } from './types'

export const TIER_AGENTS: Record<AgentTier, readonly AgentSlug[]> = {
  starter: ['revenue', 'collections', 'briefing'],
  growth: ['revenue', 'collections', 'briefing', 'scope', 'delivery'],
  pro: [
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
  ],
} as const

export function tierAllows(userTier: AgentTier, agentSlug: AgentSlug): boolean {
  return TIER_AGENTS[userTier].includes(agentSlug)
}

export async function getUserTier(_userId: string): Promise<AgentTier | null> {
  // TODO(scaffold): read from the existing subscription/tier table.
  //   const supabase = await getServerSupabaseClient()
  //   const { data } = await supabase.from('user_subscriptions').select('tier').eq('user_id', userId).maybeSingle()
  //   return data?.tier ?? null
  throw new Error('getUserTier not wired yet — see src/lib/agents/tier-gate.ts')
}
