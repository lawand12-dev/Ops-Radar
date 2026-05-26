/**
 * STUB — Nango wire-up pending (engine demolished 2026-05-26)
 * Type exports preserved so consumers still compile. Function bodies
 * return empty data and log a warning. Wire to Nango per the Gmail-first plan when ready.
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
  console.warn('[STUB] generateHealthReport — nango wire-up pending')
  return {
    findings: [],
    generated_at: new Date().toISOString(),
  }
}
