/**
 * STUB — Composio dependency removed 2026-05-26 during Nango migration.
 * The web-search / research-competitor / analyze-document trio was untouched
 * by Composio, but lived alongside it and shares the broken `coo/` module
 * path. Keeping the function exports so hire/coo tool builders compile.
 */

export async function webSearch(_query: string, _opts?: unknown): Promise<unknown> {
  console.warn('[STUB] webSearch — composio-to-nango migration in progress')
  return { results: [], answer: '' }
}

export async function researchCompetitor(_name: string, _opts?: unknown): Promise<unknown> {
  console.warn('[STUB] researchCompetitor — composio-to-nango migration in progress')
  return null
}

export async function analyzeDocument(_text: string, _opts?: unknown): Promise<unknown> {
  console.warn('[STUB] analyzeDocument — composio-to-nango migration in progress')
  return null
}
