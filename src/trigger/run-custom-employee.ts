/**
 * `runCustomEmployee` — Trigger.dev task that runs ONE custom AI employee
 * for ONE customer (CP-TRIGGER-DEV).
 *
 * This is the per-employee execution unit. The dispatcher
 * (./dispatch-custom-employees.ts) fans out by triggering one of these per
 * (user, employee) pair that is due to run.
 *
 * Why per-employee tasks instead of a single big task:
 *   - Each gets its own Trigger.dev run record in the dashboard — easy to
 *     filter / debug / replay one bad run without rerunning everyone.
 *   - Retries scope to the failing employee only, not the whole batch.
 *   - Each run can fan out to up to 600s of compute without affecting peers.
 *
 * What it does inside:
 *   1. Loads the custom_employees row by id (with RLS bypass via service role)
 *   2. Synthesizes an AgentSpec from the row (mirrors the Vercel cron path
 *      we built in CP-34a, but now lives in Trigger.dev instead)
 *   3. Calls the shared `runAgent` loop — same code path as the 28 built-in
 *      agents, so brain commits / approval gate / Langfuse traces / consult_coo
 *      escalation all just work
 *   4. Marks last_run_at on success so the UI shows "ran Nm ago"
 *
 * See: docs/strategy/trigger-composio-integration-2026.md §Pattern 1.
 */

import { task, logger, metadata } from "@trigger.dev/sdk/v3"
import { runAgent } from "<npm>/lib/agents/loop"
import { getServerSupabaseClient } from "<npm>/lib/supabase-server"
import type { AgentSpec } from "<npm>/lib/agents/types"
import type { ToolSlug } from "<npm>/lib/composio"
import type { Database } from "<npm>/lib/database.types"

type CustomEmployeeRow = Database["public"]["Tables"]["custom_employees"]["Row"]

export type RunCustomEmployeePayload = {
  employeeId: string
  userId: string
  /**
   * CP-37 — delegation context. When set, this run was kicked off by another
   * employee calling `delegate_to_employee` from inside `runAgent`. We inject
   * the delegating employee's slug + the task description into the system
   * prompt so the report knows it's a delegation and focuses its run on the
   * specific task instead of its default cron behavior.
   */
  delegatedFrom?: string
  taskDescription?: string
}

/**
 * Synthesize an AgentSpec from a custom_employees row so we can hand it to
 * the shared `runAgent` loop. The slug is prefixed with `custom:` so brain
 * commits and agent_runs rows stay distinguishable from the 28 built-ins.
 *
 * When `delegation` is provided (CP-37), we splice a delegation header onto
 * the front of the system prompt so the model treats this run as a focused
 * sub-task instead of its default scheduled cycle.
 */
function specFromCustomEmployee(
  row: CustomEmployeeRow,
  delegation?: { delegatedFrom: string; taskDescription: string },
): AgentSpec {
  const baseSystemPrompt = row.system_prompt
  const systemPrompt = delegation
    ? [
        '# Delegated task',
        '',
        `You are being delegated to by **${delegation.delegatedFrom}** (your manager).`,
        `Their request: ${delegation.taskDescription}`,
        '',
        'Focus your run on completing THIS specific task. When you finish, write a clear, concrete summary — your manager is paused right now waiting for your output, and your summary is what they see when they resume. Keep it tight, surface the key facts, and call out anything that needs follow-up.',
        '',
        '---',
        '',
        baseSystemPrompt,
      ].join('\n')
    : baseSystemPrompt
  return {
    slug: `custom:${row.slug}`,
    displayName: `${row.name} · ${row.role}`,
    description: row.persona_summary?.slice(0, 200) ?? `${row.role} (custom employee)`,
    model: (row.model_slug ?? "gpt-5.4") as AgentSpec["model"],
    composioApps: row.scoped_toolkits as ToolSlug[],
    requiredTier: "starter",
    requiredIntegrations: [],
    cronSchedule: row.schedule_cron ?? "0 0 * * *",
    maxSteps: row.max_steps ?? 10,
    systemPrompt,
  }
}

export const runCustomEmployee = task({
  id: "run-custom-employee",
  maxDuration: 600, // 10 min — plenty of headroom for big agent runs
  // We rely on the global config's retry settings (3 attempts, exponential)
  // but explicitly cap retries here so a misbehaving custom prompt doesn't
  // burn through credits.
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 5_000, maxTimeoutInMs: 60_000 },

  run: async (payload: RunCustomEmployeePayload, { ctx }) => {
    const { employeeId, userId, delegatedFrom, taskDescription } = payload
    logger.log("Starting custom employee run", {
      employeeId,
      userId,
      runId: ctx.run.id,
      delegatedFrom: delegatedFrom ?? null,
    })

    const supabase = getServerSupabaseClient()
    const { data: row, error } = await supabase
      .from("custom_employees")
      .select("*")
      .eq("id", employeeId)
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      // Transient Supabase failure — let Trigger.dev retry by throwing.
      // Previously this returned a "not-found" skip and permanently lost
      // the hourly run on a single DB blip.
      logger.error("Custom employee lookup failed", {
        employeeId,
        userId,
        error: error.message,
      })
      throw new Error(`custom_employees lookup failed: ${error.message}`)
    }
    if (!row) {
      logger.warn("Custom employee not found", { employeeId, userId })
      return { skipped: "not-found" as const }
    }

    if (row.status !== "active") {
      logger.log("Skipping non-active employee", { employeeId, status: row.status })
      return { skipped: "paused" as const, status: row.status }
    }

    // CP-36: publish identity metadata so the realtime Team Live widget on
    // /dashboard can render this run as "<emoji> <name> · running · …" without
    // a server round-trip. The widget subscribes via useRealtimeRunsWithTag
    // (tag: `user:<userId>`) and reads these fields off run.metadata.
    metadata.set("employee_slug", row.slug)
    metadata.set("employee_name", row.name)
    metadata.set("employee_emoji", row.emoji)
    metadata.set("user_id", userId)

    // If this run was delegated, splice the manager + task description into
    // the system prompt so the model focuses on the sub-task.
    const delegation =
      delegatedFrom && taskDescription
        ? { delegatedFrom, taskDescription }
        : undefined
    if (delegation) {
      metadata.set("delegated_from", delegation.delegatedFrom)
      metadata.set("delegated_task", delegation.taskDescription.slice(0, 200))
    }
    const spec = specFromCustomEmployee(row, delegation)
    const result = await runAgent(spec, userId)

    // Mark last_run_at on success so the /dashboard/employees UI can show
    // "ran 12m ago" without a separate timestamp query per row.
    if (result.status === "success") {
      const { error: updateError } = await supabase
        .from("custom_employees")
        .update({ last_run_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("user_id", row.user_id) // defense-in-depth — service-role bypasses RLS
      if (updateError) {
        logger.warn("Failed to mark last_run_at", {
          employeeId,
          error: updateError.message,
        })
      }
    }

    logger.log("Custom employee run finished", {
      employeeId,
      status: result.status,
      reason: result.reason,
      actionsTaken: result.actionsTaken,
    })

    return {
      employee_slug: row.slug,
      status: result.status,
      reason: result.reason,
      summary: result.summary?.slice(0, 500),
      actions_taken: result.actionsTaken ?? 0,
      notion_writes: result.notionWrites ?? 0,
      risks_flagged: result.risksFlagged ?? 0,
    }
  },
})
