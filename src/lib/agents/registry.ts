/**
 * Central registry of all 10 agents. Cron handlers, the agents UI, and tier-gate
 * checks all import from here so adding/removing an agent is a one-line change.
 */

import { REVENUE_AGENT } from './revenue'
import { COLLECTIONS_AGENT } from './collections'
import { SCOPE_AGENT } from './scope'
import { DELIVERY_AGENT } from './delivery'
import { BRIEFING_AGENT } from './briefing'
import { PROFITABILITY_AGENT } from './profitability'
import { TEAM_AGENT } from './team'
import { GROWTH_AGENT } from './growth'
import { RENEWAL_AGENT } from './renewal'
import { STACK_AGENT } from './stack'

import type { AgentSlug, AgentSpec } from './types'

export const AGENTS: Record<AgentSlug, AgentSpec> = {
  revenue: REVENUE_AGENT,
  collections: COLLECTIONS_AGENT,
  scope: SCOPE_AGENT,
  delivery: DELIVERY_AGENT,
  briefing: BRIEFING_AGENT,
  profitability: PROFITABILITY_AGENT,
  team: TEAM_AGENT,
  growth: GROWTH_AGENT,
  renewal: RENEWAL_AGENT,
  stack: STACK_AGENT,
}

export const AGENT_SLUGS = Object.keys(AGENTS) as AgentSlug[]
