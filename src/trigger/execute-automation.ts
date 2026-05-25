/**
 * `executeAutomationTask` — Trigger.dev task that runs ONE customer
 * automation in response to a Composio webhook event (CP-TRIGGER-DEV step 3).
 *
 * Replaces the in-process `Promise.allSettled(...executeAutomation)` call
 * that used to live inside the Composio webhook handler. Moving execution
 * here gives us:
 *
 *   - Durable retries with exponential backoff (5 attempts) — a transient
 *     Composio outage no longer eats the customer's event
 *   - Per-automation observability in the Trigger.dev dashboard
 *   - Failures isolated to one automation (the others still fire)
 *   - The webhook can ack Composio in < 200ms regardless of automation
 *     duration, eliminating Composio's own retry storms
 *
 * See: docs/specs/trigger-composio-integration.md §Pattern 2.
 */

import { task, logger } from "@trigger.dev/sdk/v3"
import { executeAutomation } from "<npm>/lib/automations/execute"
import { getServerSupabaseClient } from "<npm>/lib/supabase-server"
import type { CustomerAutomation } from "<npm>/lib/automations/types"

export type ExecuteAutomationPayload = {
  automationId: string
  userId: string
  triggerEvent: Record<string, unknown>
}

export const executeAutomationTask = task({
  id: "execute-automation",
  maxDuration: 300, // 5 min — fits all current spec shapes; wait-bearing specs
                    // are rejected at install time per execute.ts comments
  retry: {
    maxAttempts: 5,
    factor: 2,
    minTimeoutInMs: 2_000,
    maxTimeoutInMs: 60_000,
    randomize: true,
  },

  run: async (payload: ExecuteAutomationPayload, { ctx }) => {
    const { automationId, userId, triggerEvent } = payload
    logger.log("Executing automation", { automationId, userId, runId: ctx.run.id })

    const supabase = getServerSupabaseClient()
    const { data: row, error } = await supabase
      .from("customer_automations")
      .select("*")
      .eq("id", automationId)
      .eq("user_id", userId)
      .maybeSingle()

    if (error || !row) {
      logger.warn("Automation not found or not accessible", {
        automationId,
        userId,
        error: error?.message,
      })
      return { skipped: "not-found" as const }
    }

    if (row.status !== "active") {
      logger.log("Skipping non-active automation", { automationId, status: row.status })
      return { skipped: "paused" as const, status: row.status }
    }

    const automation = row as unknown as CustomerAutomation
    const result = await executeAutomation({
      automation,
      triggerEvent,
      source: "webhook",
    })

    logger.log("Automation execution finished", {
      automationId,
      status: result.status,
      stepsExecuted: result.steps_executed,
      actionsQueued: result.actions_queued,
    })

    return {
      automation_id: automationId,
      run_id: result.runId,
      status: result.status,
      steps_executed: result.steps_executed,
      actions_queued: result.actions_queued,
      error: result.error,
    }
  },
})
