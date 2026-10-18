/**
 * STUB — integration wire-up pending (engine demolished 2026-05-26)
 */

export type Outcome = {
  id: string
  status: string
  decision?: string
  decided_at?: string
  action_type?: string
  [key: string]: unknown
}

export async function getRecentOutcomes(
  _userId: string,
  _limit?: number,
): Promise<Outcome[]> {
  return []
}

export async function enrichWithRecentWins(): Promise<string> {
  return ''
}

// Legacy export used by /api/dashboard/actions to record approve/reject/edit
// feedback. No-op while no integrations layer is wired.
export async function logOutcome(_input: Record<string, unknown>): Promise<void> {
  console.warn('[STUB] logOutcome — integration wire-up pending')
}
