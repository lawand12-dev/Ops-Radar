/**
 * `load_tool` — meta-tool for on-demand advanced-tool disclosure.
 *
 * The agent sees a catalog of advanced tools (name + description) in its
 * system prompt. When it needs one, it calls `load_tool({ name })`. This
 * meta-tool records the request; runAgent's prepareStep callback then
 * merges the requested tool's full schema into the toolset for the next
 * step — mirroring the CP-17 `load_skill` pattern.
 *
 * The returned object surfaces a `_loaded` field so the model knows the
 * tool is now available; loop.ts watches the same field to update the
 * toolset before the next iteration.
 */

import { z } from 'zod'
import { tool, type Tool, type ToolSet } from 'ai'
import { TOOLKITS, loadAdvancedTool } from './registry'

export type LoadedToolsTracker = {
  loaded: Set<string>
  add(name: string): void
}

export function createLoadedToolsTracker(): LoadedToolsTracker {
  const loaded = new Set<string>()
  return {
    loaded,
    add(name: string) {
      loaded.add(name)
    },
  }
}

/**
 * Build the `load_tool` meta-tool. Closure over the toolkitSlugs the
 * employee is allowed to use AND the tracker that the loop watches.
 */
export function buildLoadToolMeta({
  userId,
  toolkitSlugs,
  tracker,
}: {
  userId: string
  toolkitSlugs: ReadonlyArray<string>
  tracker: LoadedToolsTracker
}): Tool {
  const validNames = new Set<string>()
  for (const slug of toolkitSlugs) {
    const entry = TOOLKITS[slug]
    if (!entry) continue
    for (const item of entry.advancedCatalog) {
      validNames.add(item.name)
    }
  }

  return tool({
    description:
      'Load the full schema for an advanced tool listed in the catalog. After loading, the tool becomes available for you to call on the NEXT step. Use this when a catalog tool is the right tool for the job.',
    inputSchema: z.object({
      name: z.string().describe('Exact tool name from the advanced-tools catalog'),
    }),
    execute: async ({ name }) => {
      if (!validNames.has(name)) {
        return {
          _loaded: false,
          error: `"${name}" is not a valid advanced tool for this employee. Available: ${Array.from(validNames).join(', ')}`,
        }
      }
      // We don't actually return the schema here — the loop's prepareStep
      // merges it into the toolset. We just acknowledge so the model
      // continues to the next step.
      tracker.add(name)
      void userId  // bound for symmetry; the registry resolves via toolkitSlugs
      return {
        _loaded: true,
        name,
        message: `${name} schema loaded. Call it on your next step.`,
      }
    },
  })
}

/**
 * Resolve a set of loaded tool names into a real toolset slice. Used by
 * prepareStep to merge into the running toolset.
 */
export function resolveLoadedTools({
  userId,
  toolkitSlugs,
  loadedNames,
}: {
  userId: string
  toolkitSlugs: ReadonlyArray<string>
  loadedNames: ReadonlySet<string>
}): ToolSet {
  const out: ToolSet = {}
  for (const name of loadedNames) {
    const t = loadAdvancedTool(name, toolkitSlugs, userId)
    if (t) out[name] = t
  }
  return out
}
