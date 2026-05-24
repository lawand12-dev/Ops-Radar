/**
 * Shared types for the 10-agent system.
 *
 * Source: docs/dev/specs/2026-05-23-agents-notion-composio-design.md §4
 */

import type { ToolSlug } from '<npm>/lib/composio'
import type { Plan } from '<npm>/lib/tier'

export type AgentSlug =
  // Domain agents (synthesize across tools)
  | 'revenue'
  | 'collections'
  | 'scope'
  | 'delivery'
  | 'briefing'
  | 'profitability'
  | 'team'
  | 'growth'
  | 'renewal'
  | 'stack'
  // Tool agents (one per connected integration)
  | 'tool-gmail'
  | 'tool-hubspot'
  | 'tool-pipedrive'
  | 'tool-apollo'
  | 'tool-calendly'
  | 'tool-clickup'
  | 'tool-asana'
  | 'tool-monday'
  | 'tool-harvest'
  | 'tool-toggl'
  | 'tool-notion'
  | 'tool-slack'
  // Meta agents
  | 'evaluator'

/**
 * AgentTier mirrors the canonical Plan from `<npm>/lib/tier` so agents respect
 * the same gating as the rest of the dashboard. We declare the minimum tier
 * an agent requires; `fo` is treated as ≥ pro by tierAllows.
 */
export type AgentTier = Extract<Plan, 'starter' | 'growth' | 'pro'>

/**
 * Real OpenAI model IDs as of May 2026.
 *
 * General models (synthesis / tool use):
 *   gpt-5.5      — flagship, $5/$30 per 1M, 1.05M ctx     — use for weekly synthesis only
 *   gpt-5.4      — $2.50/$15 per 1M                        — production sweet spot
 *   gpt-5.4-mini — cheaper                                 — daily background work
 *   gpt-4.1-nano — $0.10/$0.40 per 1M                      — cheapest, trivial tasks
 *
 * Reasoning models (slower, multi-step):
 *   o3      — $2/$8 per 1M                                 — pattern detection, scoring
 *   o4-mini — $1.10/~$4 per 1M                             — cheapest reasoning
 */
export type AgentModel =
  | 'gpt-5.5'
  | 'gpt-5.4'
  | 'gpt-5.4-mini'
  | 'gpt-4.1-nano'
  | 'o3'
  | 'o4-mini'

export type AgentSpec = {
  slug: AgentSlug
  displayName: string
  description: string                     // one-line, used on the agent card
  model: AgentModel
  composioApps: ToolSlug[]                // which Composio apps the agent loads tools from
  requiredTier: AgentTier
  requiredIntegrations: ToolSlug[]        // hard requirements — if missing, agent run is skipped
  cronSchedule: string                    // standard 5-field cron, e.g. '0 7 * * *'
  maxSteps: number                        // multi-step tool loop budget
  systemPrompt: string
}

export type AgentRunResult = {
  status: 'success' | 'failed' | 'skipped'
  reason?: string                         // e.g. 'tier', 'missing-integration:harvest'
  summary?: string
  actionsTaken?: number
  notionWrites?: number
  patternsDetected?: number
  risksFlagged?: number
  tokensUsed?: number
  costCents?: number
  errorMessage?: string
}
