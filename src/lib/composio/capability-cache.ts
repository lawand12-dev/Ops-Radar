/**
 * Per-user Composio capability cache.
 *
 * Stores available triggers and actions for each connected toolkit in Redis
 * (TTL: 24h). Populated when a user connects a tool via the Composio webhook.
 * Read by compile.ts (propose_automation) to build a dynamic catalog instead
 * of the static 8-trigger seed in composio-catalog.ts.
 *
 * Two methods exposed:
 *   refreshCapabilitiesForUser(userId, toolkits) — call on connection.created
 *   getCachedTriggers(userId)                    — call in compile.ts
 */

import { Redis } from '@upstash/redis'
import { COMPOSIO_TOOLS, getComposio } from '<npm>/lib/composio'

const CACHE_TTL_SECONDS = 60 * 60 * 24 // 24 hours

export type CachedTrigger = {
  slug: string
  name: string
  description: string
  toolkit: string
}

export type CachedAction = {
  slug: string
  toolkit: string
}

function redis(): Redis {
  return Redis.fromEnv()
}

function triggerKey(userId: string): string {
  return `caps:triggers:${userId}`
}

function actionKey(userId: string): string {
  return `caps:actions:${userId}`
}

/**
 * Fetch triggers and actions for the given toolkits from Composio and cache
 * them in Redis under the user's key. Merges with any existing cached data
 * so successive connects append rather than overwrite.
 */
export async function refreshCapabilitiesForUser(
  userId: string,
  toolkits: string[],
): Promise<void> {
  if (!toolkits.length) return

  const composio = getComposio()
  const r = redis()

  // Resolve ToolSlug → ComposioToolkitSlug for each requested toolkit.
  // e.g. 'google_calendar' → 'googlecalendar', 'bamboo_hr' → 'bamboohr'.
  // If the slug isn't in our map (shouldn't happen), fall back to the raw value.
  const composioSlugs = toolkits.map(
    (t) => (COMPOSIO_TOOLS as Record<string, string>)[t] ?? t,
  )

  try {
    // Fetch triggers for these toolkits (Composio API expects its own slug format)
    const triggerResult = await composio.triggers.listTypes({ toolkits: composioSlugs })
    const newTriggers: CachedTrigger[] = (triggerResult.items ?? []).map((t) => ({
      slug: t.slug,
      name: t.name,
      description: t.description,
      toolkit: t.toolkit.slug,
    }))

    if (newTriggers.length > 0) {
      // Merge with existing cache: read → dedupe by slug → write
      const existing = await r.get<CachedTrigger[]>(triggerKey(userId)) ?? []
      const existingSlugs = new Set(existing.map((t) => t.slug))
      const merged = [...existing, ...newTriggers.filter((t) => !existingSlugs.has(t.slug))]
      await r.set(triggerKey(userId), merged, { ex: CACHE_TTL_SECONDS })
    }
  } catch (err) {
    console.warn('[capability-cache] trigger fetch failed:', err instanceof Error ? err.message : err)
  }

  try {
    // Fetch action enum for these toolkits (slugs only — enough for compile.ts).
    // Composio action slugs use uppercase toolkit prefix with no underscores:
    // e.g. GOOGLECALENDAR_LIST_EVENTS, BAMBOOHR_GET_EMPLOYEES — so we uppercase
    // the ComposioToolkitSlug (not the ToolSlug) to build the correct prefix.
    const rawActions = await composio.tools.getToolsEnum()
    const allSlugs: string[] = Array.isArray(rawActions) ? rawActions as string[] : []

    const prefixes = composioSlugs.map((s) => s.toUpperCase())
    const newActions: CachedAction[] = allSlugs
      .filter((slug) => prefixes.some((p) => slug.startsWith(p)))
      .map((slug) => {
        const toolkit = prefixes.find((p) => slug.startsWith(p))?.toLowerCase() ?? ''
        return { slug, toolkit }
      })

    if (newActions.length > 0) {
      const existing = await r.get<CachedAction[]>(actionKey(userId)) ?? []
      const existingSlugs = new Set(existing.map((a) => a.slug))
      const merged = [...existing, ...newActions.filter((a) => !existingSlugs.has(a.slug))]
      await r.set(actionKey(userId), merged, { ex: CACHE_TTL_SECONDS })
    }
  } catch (err) {
    console.warn('[capability-cache] action fetch failed:', err instanceof Error ? err.message : err)
  }
}

/**
 * Returns cached triggers for this user across all connected toolkits.
 * Falls back to empty array — callers should fall back to the static
 * COMPOSIO_TRIGGER_CATALOG if the result is empty.
 */
export async function getCachedTriggers(userId: string): Promise<CachedTrigger[]> {
  try {
    const r = redis()
    return (await r.get<CachedTrigger[]>(triggerKey(userId))) ?? []
  } catch {
    return []
  }
}

/**
 * Returns cached action slugs for this user across all connected toolkits.
 * Falls back to empty array.
 */
export async function getCachedActions(userId: string): Promise<CachedAction[]> {
  try {
    const r = redis()
    return (await r.get<CachedAction[]>(actionKey(userId))) ?? []
  } catch {
    return []
  }
}
