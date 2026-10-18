/**
 * STUB — integration wire-up pending (engine demolished 2026-05-26)
 * Type exports preserved so consumers still compile. Function bodies
 * return empty data and log a warning. Wire to the integration layer when ready.
 */

// ─── Local type aliases ────────────────────────────────────────────────
// Permissive string aliases so consumer call sites still type-check while
// no integration toolkit map exists.
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
  console.warn('[STUB] trackAction — integration wire-up pending')
  return { id: '' }
}

export async function checkOutcomes(userId: string): Promise<CheckOutcomesResult> {
  void userId
  console.warn('[STUB] checkOutcomes — integration wire-up pending')
  return { checked: 0, detected: 0, totalValueUsd: 0 }
}

export async function getRecentWins(
  userId: string,
  sinceDays: number = 7,
): Promise<RecentWin[]> {
  void userId
  void sinceDays
  console.warn('[STUB] getRecentWins — integration wire-up pending')
  return []
}
