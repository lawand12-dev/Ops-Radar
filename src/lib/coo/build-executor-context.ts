/**
 * STUB — Composio dependency removed 2026-05-26 during Nango migration.
 */
import type { ExecutorContext } from './executor'

export async function buildExecutorContext(
  userId: string,
  _lastQuestion?: string,
): Promise<ExecutorContext> {
  return { userId }
}
