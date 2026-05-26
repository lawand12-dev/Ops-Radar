/**
 * Toolkit registry — central dispatcher mapping toolkit slug → its module.
 *
 * Adding a new integration is intentionally a TWO-line change:
 *   1. Author `src/lib/nango/tools/<slug>.ts` exporting a `ToolkitEntry`.
 *   2. Add one line to the TOOLKITS map below.
 *
 * Each ToolkitEntry carries everything the engine needs to know about
 * the toolkit so we don't sprinkle hard-coded slug checks across the
 * codebase (hooks.ts, confidence.ts, loop.ts, flags). Once added here,
 * the engine's loop, approval gate, confidence scorer, and kill-switch
 * resolver all pick it up automatically.
 */

import type { Tool } from 'ai'
import {
  buildGmailToolsCore,
  buildGmailToolsAdvanced,
  GMAIL_TOOLS_ADVANCED_CATALOG,
  GMAIL_DESTRUCTIVE_TOOLS,
} from './tools/gmail'

type ToolMap = Record<string, Tool>

export type ToolkitEntry = {
  /** Tools always loaded for any employee that has this toolkit. */
  buildCore: (userId: string) => ToolMap
  /** Tools loaded on-demand via the `load_tool` meta-tool. */
  buildAdvanced: (userId: string) => ToolMap
  /** Name + description for catalog injection — no schemas. */
  advancedCatalog: ReadonlyArray<{ name: string; description: string }>
  /** Tool names that write to the customer's tool. Gate goes through these. */
  destructiveTools: ReadonlySet<string>
  /** Optional Statsig flag name to kill this toolkit globally. */
  killSwitchFlag?: string
}

/**
 * Add one entry per Nango integration as it ships. Today: gmail only.
 * As HubSpot, Stripe, ClickUp, etc. get built, append them here.
 */
export const TOOLKITS: Record<string, ToolkitEntry> = {
  gmail: {
    buildCore: buildGmailToolsCore as (userId: string) => ToolMap,
    buildAdvanced: buildGmailToolsAdvanced as (userId: string) => ToolMap,
    advancedCatalog: GMAIL_TOOLS_ADVANCED_CATALOG,
    destructiveTools: GMAIL_DESTRUCTIVE_TOOLS,
    killSwitchFlag: 'gmail-toolkit-enabled',
  },
}

export type ToolkitSlug = keyof typeof TOOLKITS

/**
 * Union of every destructive tool name across all registered toolkits.
 * Built lazily so adding a toolkit Just Works. The result is cached
 * after first build because TOOLKITS is module-level + frozen at
 * import time.
 */
let _destructiveTools: Set<string> | null = null
export function allDestructiveTools(): ReadonlySet<string> {
  if (_destructiveTools) return _destructiveTools
  const set = new Set<string>()
  for (const entry of Object.values(TOOLKITS)) {
    for (const t of entry.destructiveTools) set.add(t)
  }
  _destructiveTools = set
  return set
}

/**
 * Build the tool object passed to generateText for an employee.
 *
 * - Includes core tools for every toolkit the employee has.
 * - Does NOT include advanced tools by default — those load via `load_tool`.
 *
 * @param toolkitSlugs  — toolkits the employee is allowed to use
 * @param userId        — bound into every tool's execute() by closure
 */
export function buildToolsForEmployee(
  toolkitSlugs: ReadonlyArray<string>,
  userId: string,
): ToolMap {
  const tools: ToolMap = {}
  for (const slug of toolkitSlugs) {
    const entry = TOOLKITS[slug]
    if (!entry) {
      console.warn(`[toolkit-registry] Unknown toolkit slug "${slug}" — skipping`)
      continue
    }
    Object.assign(tools, entry.buildCore(userId))
  }
  return tools
}

/**
 * Build the catalog text injected into the system prompt so the model knows
 * which advanced tools exist (and can request them via `load_tool`).
 *
 * Pattern matches the CP-17 skills catalog injection.
 */
export function buildAdvancedToolsCatalog(
  toolkitSlugs: ReadonlyArray<string>,
): string {
  const lines: string[] = []
  for (const slug of toolkitSlugs) {
    const entry = TOOLKITS[slug]
    if (!entry || entry.advancedCatalog.length === 0) continue
    lines.push(`### ${slug} — advanced (load via \`load_tool\`)`)
    for (const item of entry.advancedCatalog) {
      lines.push(`- ${item.name}: ${item.description}`)
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}

/**
 * Look up one advanced tool by name across all toolkits an employee has.
 * Used by the `load_tool` discovery tool to return the real implementation.
 *
 * Returns null if the tool isn't in any of the employee's toolkits — the
 * model is asking for something it shouldn't have access to.
 */
export function loadAdvancedTool(
  toolName: string,
  toolkitSlugs: ReadonlyArray<string>,
  userId: string,
): Tool | null {
  for (const slug of toolkitSlugs) {
    const entry = TOOLKITS[slug]
    if (!entry) continue
    const advanced = entry.buildAdvanced(userId)
    if (toolName in advanced) return advanced[toolName]
  }
  return null
}
