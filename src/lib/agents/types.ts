/**
 * STUB — Composio dependency removed 2026-05-26 during Nango migration.
 * Type-only module. The full 28-agent system was Composio-coupled and was
 * deleted. Types that downstream code imports are kept here as `string`
 * aliases so the codebase still compiles. Rebuild on Nango per CP-45.
 */

export type AgentSlug = string
export type AgentSpecSlug = string
export type AgentModel = string
export type AgentTier = 'starter' | 'growth' | 'pro'

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
  // Kept optional so legacy spec literals that include this field still
  // typecheck during the migration. Will be removed when the Nango layer
  // replaces the per-toolkit composioApps list with Nango provider keys.
  composioApps?: string[]
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
