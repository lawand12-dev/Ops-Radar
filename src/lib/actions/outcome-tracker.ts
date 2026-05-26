/**
 * STUB — Composio dependency removed 2026-05-26 during Nango migration.
 * Type exports preserved so consumers still compile. Function bodies
 * return empty data and log a warning. Rebuild on Nango per CP-45 plan.
 */

// ─── Local type stubs (were imported from deleted modules) ──────────────
// AgentSlug previously lived in <npm>/lib/agents/types (folder deleted).
// ToolSlug previously lived in <npm>/lib/composio (file deleted).
// Both stay as permissive string aliases so consumer call sites still type-check.
type AgentSlug = string
type ToolSlug = string

// ─── Public types ───────────────────────────────────────────────────────

export type TrackedEntityType = 'invoice' | 'deal' | 'contract' | 'project' | 'task'

export type TrackerAgentSlug = AgentSlug | 'coo'

export type TrackActionInput = {
  userId: string
  agentActionId: string
  agentSlug: TrackerAgentSlug
  entityType: TrackedEntityType
  entityId: string
  entityToolSlug: ToolSlug
  expectedOutcome?: string
  baselineState?: Record<string, unknown>
}

export type CheckOutcomesResult = {
  checked: number
  detected: number
  totalValueUsd: number
}

export type RecentWin = {
  agentSlug: string
  entityType: string
  entityId: string
  outcomeValueUsd: number
  outcomeDetectedAt: string
}

// ─── Stubbed implementations ────────────────────────────────────────────

export async function trackAction(input: TrackActionInput): Promise<{ id: string }> {
  void input
  console.warn('[STUB] trackAction — composio-to-nango migration in progress')
  return { id: '' }
}

export async function checkOutcomes(userId: string): Promise<CheckOutcomesResult> {
  void userId
  console.warn('[STUB] checkOutcomes — composio-to-nango migration in progress')
  return { checked: 0, detected: 0, totalValueUsd: 0 }
}

export async function getRecentWins(
  userId: string,
  sinceDays: number = 7,
): Promise<RecentWin[]> {
  void userId
  void sinceDays
  console.warn('[STUB] getRecentWins — composio-to-nango migration in progress')
  return []
}
