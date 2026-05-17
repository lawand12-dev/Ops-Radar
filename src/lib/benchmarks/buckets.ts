import type { TeamSizeBucket } from './types'

export function bucketForTeamSize(raw: string | null | undefined): TeamSizeBucket | null {
  if (!raw) return null
  const s = String(raw).trim().toLowerCase()
  if (!s) return null

  if (s === '1' || s === 'solo' || s === '1 (solo)') return 'solo'
  if (s === '2-5') return '2-5'
  if (s === '6-15') return '6-15'
  if (s === '16-30') return '16-30'
  if (s === '31-50' || s === '51-100' || s === '100+' || s === '31+') return '31+'

  const m = s.match(/\d+/)
  if (!m) return null
  const n = Number(m[0])
  if (!Number.isFinite(n) || n < 1) return null
  if (n === 1)   return 'solo'
  if (n <= 5)    return '2-5'
  if (n <= 15)   return '6-15'
  if (n <= 30)   return '16-30'
  return '31+'
}
