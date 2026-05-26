/**
 * STUB — Nango wire-up pending (engine demolished 2026-05-26)
 * Type exports preserved so consumers still compile. Function bodies
 * return empty data and log a warning. Wire to Nango per the Gmail-first plan when ready.
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
  console.warn('[STUB] computeAgencyScore — nango wire-up pending')
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
