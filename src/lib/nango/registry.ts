/**
 * Toolkit registry — central dispatcher that maps a toolkit slug
 * (e.g. 'gmail', 'hubspot') to its factory functions.
 *
 * Each toolkit module (src/lib/nango/tools/<name>.ts) exports:
 *   - buildCore(userId)      → tools always loaded for any employee with this toolkit
 *   - buildAdvanced(userId)  → tools loaded only via `load_tool` on demand
 *   - advancedCatalog        → name + description list shown to the model so
 *                              it knows what advanced tools exist
 *
 * runAgent calls `buildToolsForEmployee(employee, userId)` to get the final
 * tool object that Vercel AI SDK's generateText needs. The model never sees
 * userId — it's bound by closure in each factory.
 *
 * New integrations slot in one new file + one entry in TOOLKITS below.
 */

import type { Tool } from 'ai'
import {
  buildGmailToolsCore,
  buildGmailToolsAdvanced,
  GMAIL_TOOLS_ADVANCED_CATALOG,
} from './tools/gmail'

type ToolMap = Record<string, Tool>

type ToolkitEntry = {
  buildCore: (userId: string) => ToolMap
  buildAdvanced: (userId: string) => ToolMap
  advancedCatalog: ReadonlyArray<{ name: string; description: string }>
}

/**
 * Add one entry per Nango integration as it's wired. Today: gmail only.
 * As HubSpot, Stripe, ClickUp, etc. get built, append them here.
 */
export const TOOLKITS: Record<string, ToolkitEntry> = {
  gmail: {
    buildCore: buildGmailToolsCore as (userId: string) => ToolMap,
    buildAdvanced: buildGmailToolsAdvanced as (userId: string) => ToolMap,
    advancedCatalog: GMAIL_TOOLS_ADVANCED_CATALOG,
  },
}

export type ToolkitSlug = keyof typeof TOOLKITS

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
