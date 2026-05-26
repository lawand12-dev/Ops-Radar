/**
 * STUB — Composio dependency removed 2026-05-26 during Nango migration.
 */
import type { AgentSpec, AgentTier } from './types'

export function isAgentEnabledForTier(_spec: AgentSpec, _tier: AgentTier): boolean {
  return false
}

export function listEnabledAgentsForTier(_tier: AgentTier): AgentSpec[] {
  return []
}

// Legacy helper used by /api/dashboard/usage. Returns null so callers fall
// back to their default tier.
export async function getUserTier(_userId: string): Promise<AgentTier | null> {
  return null
}
