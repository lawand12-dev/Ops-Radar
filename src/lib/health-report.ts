/**
 * STUB — Composio dependency removed 2026-05-26 during Nango migration.
 * Type exports preserved so consumers still compile. Function bodies
 * return empty data and log a warning. Rebuild on Nango per CP-45 plan.
 */

export type HealthFinding = {
  title: string
  insight: string
  severity: 'good' | 'warn' | 'bad'
}

export type HealthReport = {
  findings: HealthFinding[]
  generated_at: string
}

export async function generateHealthReport(opts: {
  userId: string
  stripeConnected: boolean
  harvestConnected: boolean
  blendedRate: number
  companyName: string
}): Promise<HealthReport> {
  void opts
  console.warn('[STUB] generateHealthReport — composio-to-nango migration in progress')
  return {
    findings: [],
    generated_at: new Date().toISOString(),
  }
}
