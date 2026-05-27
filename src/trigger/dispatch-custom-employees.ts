/**
 * `dispatchCustomEmployees` — Trigger.dev hourly cron that scans all
 * active custom employees, matches each against its schedule, and fans out
 * one `runCustomEmployee` task per match (CP-TRIGGER-DEV).
 *
 * Replaces /api/cron/custom-employees/route.ts (which ran on Vercel Cron
 * Hobby — daily-only frequency cap). Trigger.dev gives us per-second
 * granularity if we ever need it, plus retries + observability + the
 * realtime SDK that CP-36 will hook into.
 *
 * Schedule: every hour at :05 (avoids contention with the 28 Vercel cron
 * agents that mostly fire at :00).
 *
 * Why a separate dispatcher instead of one schedule per employee:
 *   - Customer-defined schedules can't be statically registered. Creating
 *     one Trigger.dev schedule per (user, employee) at install time is
 *     possible (Trigger.dev supports this via schedules.create) but adds
 *     lifecycle complexity (need to deactivate on archive, rotate on edit).
 *   - For v1, scanning hourly + matching client-side is simpler and free.
 *   - When we need per-second precision, we'll move to per-employee schedules
 *     in a later CP.
 */

import { logger, schedules, tasks } from "@trigger.dev/sdk"
import { getServerSupabaseClient } from "<npm>/lib/supabase-server"
import { runCustomEmployee } from "./run-custom-employee"

/**
 * Returns true if the cron expression's hour field matches the current UTC
 * hour. We check hour-level granularity only because the dispatcher itself
 * fires hourly — we resolve "due this hour" not "due this minute".
 *
 * Supported cron forms:
 *   "0 8 * * *"       08:xx UTC daily
 *   "0 8,14 * * *"    8am and 2pm
 *   "0 8 * * 1"       Monday 8am
 *   step intervals    e.g. star-slash-N means every Nth
 */
function isCronDueThisHour(cronExpr: string, now: Date): boolean {
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length !== 5) return false
  const [, hourField, domField, , dowField] = parts
  if (!matchesField(hourField, now.getUTCHours(), 0, 23)) return false
  if (!matchesField(domField, now.getUTCDate(), 1, 31)) return false
  if (!matchesField(dowField, now.getUTCDay(), 0, 6)) return false
  return true
}

function matchesField(field: string, value: number, min: number, max: number): boolean {
  if (field === "*") return true
  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2), 10)
    if (!Number.isFinite(step) || step <= 0) return false
    return (value - min) % step === 0
  }
  if (field.includes(",")) {
    return field.split(",").some((p) => matchesField(p, value, min, max))
  }
  if (field.includes("-")) {
    const [lo, hi] = field.split("-").map((s) => parseInt(s, 10))
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return false
    return value >= lo && value <= hi
  }
  const n = parseInt(field, 10)
  return Number.isFinite(n) && n === value
}

export const dispatchCustomEmployees = schedules.task({
  id: "dispatch-custom-employees",
  // Every hour at :05. Trigger.dev's free tier supports this trivially.
  cron: "5 * * * *",
  maxDuration: 60, // dispatch is cheap; per-employee work happens in subtasks

  run: async (payload, { ctx }) => {
    const now = payload.timestamp ?? new Date()
    logger.log("Scanning custom employees", { tickAt: now.toISOString(), runId: ctx.run.id })

    const supabase = getServerSupabaseClient()
    const { data, error } = await supabase
      .from("custom_employees")
      .select("id, user_id, slug, schedule_cron")
      .eq("status", "active")
      .not("schedule_cron", "is", null)

    if (error) {
      logger.error("Failed to load custom employees", { error: error.message })
      throw error
    }

    const rows = data ?? []
    const due = rows.filter(
      (r) => r.schedule_cron && isCronDueThisHour(r.schedule_cron, now),
    )

    logger.log("Dispatch scan complete", {
      scanned: rows.length,
      due: due.length,
      sampleDue: due.slice(0, 5).map((r) => r.slug),
    })

    if (due.length === 0) {
      return { scanned: rows.length, fired: 0 }
    }

    // batchTrigger fans out N runs in one API call — much cheaper than N
    // separate trigger() calls. Each subrun is independently retryable +
    // observable in the Trigger.dev dashboard.
    const batchHandle = await tasks.batchTrigger<typeof runCustomEmployee>(
      runCustomEmployee.id,
      due.map((r) => ({
        payload: { employeeId: r.id, userId: r.user_id },
        // Tag every subrun with the customer for the realtime SDK (CP-36).
        options: { tags: [`user:${r.user_id}`, `employee:${r.slug}`] },
      })),
    )

    logger.log("Dispatched custom employees", {
      batchId: batchHandle.batchId,
      count: due.length,
    })

    return {
      scanned: rows.length,
      fired: due.length,
      batch_id: batchHandle.batchId,
    }
  },
})
