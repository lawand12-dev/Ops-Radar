/**
 * STUB — integration wire-up pending (engine demolished 2026-05-26)
 * The durable executor is being rebuilt — webhook ingress will
 * change shape so the executor will too.
 */

export type AutomationExecuteInput = {
  automationId?: string
  userId?: string
  triggerEvent?: unknown
  // Legacy fields the trigger.dev task passes. Kept optional during migration.
  automation?: unknown
  source?: string
}

export type AutomationExecuteResult = {
  ok: boolean
  reason?: string
  // Legacy fields callers reference. Kept optional so the stub satisfies them.
  status?: string
  steps_executed?: number
  actions_queued?: number
  runId?: string
  error?: string
}

export async function executeAutomation(
  _input: AutomationExecuteInput,
): Promise<AutomationExecuteResult> {
  console.warn('[STUB] executeAutomation — integration wire-up pending')
  return { ok: false, reason: 'migration_in_progress' }
}
