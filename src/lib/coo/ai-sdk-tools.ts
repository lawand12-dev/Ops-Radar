/**
 * Converts COO_TOOLS (OpenAI ChatCompletionTool[] shape) into the Vercel AI
 * SDK's Tool record so we can pass them to streamText. Each tool's execute
 * delegates to the existing executeToolCall — no executor logic changes.
 *
 * Path A from the AI SDK docs: use jsonSchema() to wrap the existing
 * OpenAI-shape parameters (already valid JSON Schema). No need to rewrite
 * 20 tool schemas as zod just to move SDKs.
 *
 * Used by /api/dashboard/coo (route.ts) — the migration from raw OpenAI
 * streaming to Vercel AI SDK streamText.
 */

import { tool, jsonSchema, type Tool } from 'ai'
import { z } from 'zod'
import { COO_TOOLS } from './tools'
import { executeToolCall, type ExecutorContext } from './executor'
import { loadSkillBody } from '<npm>/lib/skills'

export function buildAiSdkCooTools(ctx: ExecutorContext): Record<string, Tool> {
  const out: Record<string, Tool> = {}

  for (const entry of COO_TOOLS) {
    if (entry.type !== 'function') continue
    const fn = entry.function
    const params = fn.parameters as Record<string, unknown> | undefined

    out[fn.name] = tool({
      description: fn.description ?? `Run ${fn.name}`,
      inputSchema: jsonSchema(
        (params ?? { type: 'object', properties: {} }) as Parameters<typeof jsonSchema>[0],
      ),
      execute: async (args: unknown) => {
        const result = await executeToolCall(
          fn.name,
          (args ?? {}) as Record<string, unknown>,
          ctx,
        )
        return result
      },
    })
  }

  // Anthropic Agent Skills — progressive disclosure tier 2.
  // The boot system prompt lists every skill's name+description; the agent
  // calls load_skill with a name to get the full SKILL.md body.
  out['load_skill'] = tool({
    description:
      'Load the full SKILL.md body for a named skill (Anthropic Agent Skills pattern). The skill catalog (name + description) is in your system prompt. Call this only when a skill clearly applies to the current task — the returned body contains the operational procedure to follow.',
    inputSchema: z.object({
      name: z.string().describe('The skill name (kebab-case identifier) from the catalog.'),
    }),
    execute: async (args: { name: string }) => {
      try {
        const body = await loadSkillBody(args.name)
        return { success: true, name: args.name, body }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'load failed',
        }
      }
    },
  })

  return out
}
