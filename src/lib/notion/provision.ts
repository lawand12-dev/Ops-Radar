/**
 * STUB — Composio dependency removed 2026-05-26 during Nango migration.
 * Type exports preserved so consumers still compile. Function bodies
 * return empty data and log a warning. Rebuild on Nango per CP-45 plan.
 */

export async function provisionBrainFromComposio(
  userId: string,
  composioConnectionId: string,
  agencyName?: string | null,
): Promise<void> {
  void userId
  void composioConnectionId
  void agencyName
  console.warn('[STUB] provisionBrainFromComposio — composio-to-nango migration in progress')
  return
}
