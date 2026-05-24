/**
 * Central registry of all agents.
 * Cron handlers, the agents UI, and tier-gate checks all import from here
 * so adding/removing an agent is a one-line change.
 */

// Domain agents
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

// Tool agents (one per connected integration)
import { GMAIL_AGENT } from './tools/gmail'
import { HUBSPOT_AGENT } from './tools/hubspot'
import { PIPEDRIVE_AGENT } from './tools/pipedrive'
import { APOLLO_AGENT } from './tools/apollo'
import { CALENDLY_AGENT } from './tools/calendly'
import { CLICKUP_AGENT } from './tools/clickup'
import { ASANA_AGENT } from './tools/asana'
import { MONDAY_AGENT } from './tools/monday'
import { HARVEST_AGENT } from './tools/harvest'
import { TOGGL_AGENT } from './tools/toggl'
import { NOTION_AGENT } from './tools/notion'
import { SLACK_AGENT } from './tools/slack'

// Meta agents
import { EVALUATOR_AGENT } from './evaluator'

import type { AgentSlug, AgentSpec } from './types'

export const AGENTS: Record<AgentSlug, AgentSpec> = {
  // Domain agents
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
  // Tool agents
  'tool-gmail': GMAIL_AGENT,
  'tool-hubspot': HUBSPOT_AGENT,
  'tool-pipedrive': PIPEDRIVE_AGENT,
  'tool-apollo': APOLLO_AGENT,
  'tool-calendly': CALENDLY_AGENT,
  'tool-clickup': CLICKUP_AGENT,
  'tool-asana': ASANA_AGENT,
  'tool-monday': MONDAY_AGENT,
  'tool-harvest': HARVEST_AGENT,
  'tool-toggl': TOGGL_AGENT,
  'tool-notion': NOTION_AGENT,
  'tool-slack': SLACK_AGENT,
  // Meta agents
  evaluator: EVALUATOR_AGENT,
}

export const AGENT_SLUGS = Object.keys(AGENTS) as AgentSlug[]
