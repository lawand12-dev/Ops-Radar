/**
 * Agent + employee type surface.
 *
 * Kept intentionally narrow — string aliases for slugs/models so adding a
 * new built-in employee or model is one literal change without ripple TS
 * edits across the codebase. The runtime registry enforces shape; the
 * type-level checks catch the easy class of typos at the call site.
 */

export type AgentSlug = string
export type AgentSpecSlug = string
export type AgentModel = string
export type AgentTier = 'starter' | 'growth' | 'pro'

/**
 * Runtime spec for one employee (built-in or restored from custom_employees).
 *
 *   - `requiredIntegrations`: hard requirement — fail the run if any are
 *     missing from the customer's Nango connections.
 *   - `nangoApps`: the toolkit slugs the runAgent loop will load tools for.
 *     Usually a superset of (or equal to) `requiredIntegrations`. Optional
 *     so chat-only employees with no toolkits still satisfy the type.
 */
export type AgentSpec = {
  slug: AgentSpecSlug
  displayName: string
  description: string
  model: AgentModel
  requiredTier: AgentTier
  requiredIntegrations: string[]
  cronSchedule: string
  maxSteps: number
  systemPrompt: string
  nangoApps?: string[]
}

export type AgentRunResult = {
  status: 'success' | 'failed' | 'skipped'
  reason?: string
  summary?: string
  actionsTaken?: number
  notionWrites?: number
  patternsDetected?: number
  risksFlagged?: number
  tokensUsed?: number
  costCents?: number
  errorMessage?: string
}
