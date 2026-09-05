/**
 * `load_skill` — meta-tool for on-demand Anthropic Agent Skills.
 *
 * Parallel to `load_tool` (in src/lib/nango/load-tool.ts), but for the
 * 46-skill operator playbook library at knowledge-base/skills/. Mirrors
 * the CP-17 / 17b / 17c pattern from before the demolition — restored
 * post-demolition so the new Nango-based agents have the same skill access.
 *
 * Three-tier progressive disclosure:
 *   Tier 1 — Boot: catalog ("- name: description") injected into system prompt
 *   Tier 2 — Trigger: model calls load_skill({ name }) → full SKILL.md body
 *   Tier 3 — On-demand: SKILL.md may reference reference/*.md siblings
 *                       (today not auto-loaded; the model can quote them)
 */

import { z } from 'zod'
import { tool, type Tool } from 'ai'
import { loadSkillBody } from '<npm>/lib/skills'

export function buildLoadSkillMeta(): Tool {
  return tool({
    description:
      'Read the full instructions for an operator playbook from your skills catalog. Use this when the customer\'s situation matches a skill description — e.g. firing-a-client, raising-retainer-prices, projecting-cash-runway. The returned markdown is your playbook for that situation.',
    inputSchema: z.object({
      name: z
        .string()
        .describe('Exact skill name from the catalog in your system prompt'),
    }),
    execute: async ({ name }) => {
      try {
        const body = await loadSkillBody(name)
        return {
          _loaded: true,
          name,
          body,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return {
          _loaded: false,
          name,
          error: message,
        }
      }
    },
  })
}
