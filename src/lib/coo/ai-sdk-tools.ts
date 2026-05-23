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
import { COO_TOOLS } from './tools'
import { executeToolCall, type ExecutorContext } from './executor'

export function buildAiSdkCooTools(ctx: ExecutorContext): Record<string, Tool> {
  const out: Record<string, Tool> = {}

  for (const entry of COO_TOOLS) {
    if (entry.type !== 'function') continue
    const fn = entry.function
    const params = fn.parameters as Record<string, unknown> | undefined

    out[fn.name] = tool({
      description: fn.description ?? `Run ${fn.name}`,
      // Existing parameters are already valid JSON Schema (the OpenAI shape
      // requires it). jsonSchema() adapts to the SDK's Standard Schema.
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

  return out
}
