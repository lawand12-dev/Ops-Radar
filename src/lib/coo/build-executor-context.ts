/**
 * STUB — integration wire-up pending (engine demolished 2026-05-26)
 */
import type { ExecutorContext } from './executor'

export async function buildExecutorContext(
  userId: string,
  _lastQuestion?: string,
): Promise<ExecutorContext> {
  return { userId }
}
