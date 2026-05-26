/**
 * STUB — Nango wire-up pending (engine demolished 2026-05-26)
 * The web-search / research-competitor / analyze-document trio was untouched
 * coupled to the old broker, but lived alongside it and shares the broken `coo/` module
 * path. Keeping the function exports so hire/coo tool builders compile.
 */

export async function webSearch(_query: string, _opts?: unknown): Promise<unknown> {
  console.warn('[STUB] webSearch — nango wire-up pending')
  return { results: [], answer: '' }
}

export async function researchCompetitor(_name: string, _opts?: unknown): Promise<unknown> {
  console.warn('[STUB] researchCompetitor — nango wire-up pending')
  return null
}

export async function analyzeDocument(_text: string, _opts?: unknown): Promise<unknown> {
  console.warn('[STUB] analyzeDocument — nango wire-up pending')
  return null
}
