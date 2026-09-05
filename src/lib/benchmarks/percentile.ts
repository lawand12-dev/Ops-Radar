export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null
  if (p <= 0) return values[0]!
  if (p >= 100) return values[values.length - 1]!

  const sorted = [...values].sort((a, b) => a - b)
  const idx = (p / 100) * (sorted.length - 1)
  const lo  = Math.floor(idx)
  const hi  = Math.ceil(idx)
  if (lo === hi) return sorted[lo]!
  const frac = idx - lo
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac
}

export function p25(values: number[]): number | null { return percentile(values, 25) }
export function p50(values: number[]): number | null { return percentile(values, 50) }
export function p75(values: number[]): number | null { return percentile(values, 75) }
