/**
 * STUB — Composio dependency removed 2026-05-26 during Nango migration.
 * Type exports preserved so consumers still compile. Function bodies
 * return empty data and log a warning. Rebuild on Nango per CP-45 plan.
 */

import type { BenchmarkRow } from '<npm>/lib/benchmarks/types'

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F'

export type ScoreDimension = {
  score: number
  grade: Grade
  label: string
  detail: string
}

export type AgencyScore = {
  dimensions: {
    margins: ScoreDimension
    collection_speed: ScoreDimension
    client_concentration: ScoreDimension
    utilization: ScoreDimension
    benchmark_position: ScoreDimension
  }
  overall_score: number
  overall_grade: Grade
  computed_at: string
  company_name: string
}

export async function computeAgencyScore(opts: {
  userId: string
  stripeConnected: boolean
  harvestConnected: boolean
  blendedRate: number
  teamSizeRaw: string
  companyName: string
  benchmarkRows: BenchmarkRow[]
}): Promise<AgencyScore> {
  void opts
  console.warn('[STUB] computeAgencyScore — composio-to-nango migration in progress')
  const emptyDim: ScoreDimension = {
    score: 0,
    grade: 'F',
    label: '',
    detail: 'Stubbed during Nango migration',
  }
  return {
    dimensions: {
      margins: { ...emptyDim, label: 'Margins' },
      collection_speed: { ...emptyDim, label: 'Collections' },
      client_concentration: { ...emptyDim, label: 'Client Mix' },
      utilization: { ...emptyDim, label: 'Utilization' },
      benchmark_position: { ...emptyDim, label: 'Industry Rank' },
    },
    overall_score: 0,
    overall_grade: 'F',
    computed_at: new Date().toISOString(),
    company_name: opts.companyName,
  }
}
