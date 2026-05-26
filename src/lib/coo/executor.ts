/**
 * STUB — Nango wire-up pending (engine demolished 2026-05-26)
 */

export type ExecutorContext = {
  userId: string
  [key: string]: unknown
}

export type ExecutorResult = {
  ok: boolean
  output?: unknown
  error?: string
  // Legacy fields callers reference. Kept optional so the stub satisfies them.
  success?: boolean
  reason?: string
  data?: unknown
}

export async function executeCooTool(
  _toolName: string,
  _args: Record<string, unknown>,
  _ctx: ExecutorContext,
): Promise<ExecutorResult> {
  console.warn('[STUB] executeCooTool — nango wire-up pending')
  return { ok: false, error: 'migration_in_progress' }
}

// Legacy alias used by /api/mcp/route.ts. The original signature is
// (toolName, args). The MCP route also calls it as (toolName, args, ctx) in
// some paths — `ctx` is optional here to satisfy both call sites.
export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  ctx?: ExecutorContext,
): Promise<ExecutorResult> {
  return executeCooTool(toolName, args, ctx ?? { userId: '' })
}
