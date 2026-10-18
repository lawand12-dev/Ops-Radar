/**
 * Agent registry — single source of truth for the built-in employees that
 * ship out of the box on day one.
 *
 * Pre-demolition this held 28 agents (10 domain + 17 tool + 1 evaluator).
 * Post-demolition we're rebuilding them one at a time, starting with
 * Gmail. As each agent is verified end-to-end we add it here.
 *
 * New tool/domain agents slot in via one `git restore` of their spec file
 * plus one line in the registry below.
 */

import type { AgentSpec, AgentSpecSlug } from './types'
import { GMAIL_AGENT } from './tools/gmail'

export const AGENT_REGISTRY: Record<string, AgentSpec> = {
  [GMAIL_AGENT.slug]: GMAIL_AGENT,
}

// Legacy aliases retained for downstream consumers (cron dispatcher,
// /dashboard/runs viewer, employees registry).
export const AGENTS = AGENT_REGISTRY
export const AGENT_SLUGS: string[] = Object.keys(AGENT_REGISTRY)

export function getAgentSpec(slug: AgentSpecSlug): AgentSpec | undefined {
  return AGENT_REGISTRY[slug]
}

export function listAgentSpecs(): AgentSpec[] {
  return Object.values(AGENT_REGISTRY)
}
