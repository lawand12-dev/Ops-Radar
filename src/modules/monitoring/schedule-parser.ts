/**
 * Convert an n8n scheduleTrigger node's `parameters.rule` into the
 * `(trigger_type, cron_expression, expected_interval_seconds)` triple stored
 * in `workflow_schedule_tracking`.
 *
 * n8n's schedule shapes (observed across versions):
 *
 *   parameters.rule.interval = [
 *     { field: "seconds",   secondsInterval:  30 }
 *     { field: "minutes",   minutesInterval:  5  }
 *     { field: "hours",     hoursInterval:    2, triggerAtMinute: 0 }
 *     { field: "days",      daysInterval:     1, triggerAtHour: 9 }
 *     { field: "weeks",     weeksInterval:    1, triggerAtDayOfWeek: [1] }
 *     { field: "months",    monthsInterval:   1, triggerAtDayOfMonth: 1 }
 *     { field: "cronExpression", expression: "0 9 * * *" }
 *   ]
 *
 * We handle the fixed-interval cases exactly. For cronExpression we record the
 * expression but leave expected_interval_seconds null — the drift detector
 * skips workflows without an interval rather than mis-estimating from a
 * cron string. (A future enhancement can lift this with a real cron lib.)
 *
 * Non-schedule triggers (webhook, manual, etc.) return null. The caller then
 * deletes any prior schedule_tracking row for that workflow on redeploy.
 */

export interface ScheduleSummary {
  trigger_type: string;
  cron_expression: string | null;
  expected_interval_seconds: number | null;
}

const SCHEDULE_TRIGGER_TYPE = "n8n-nodes-base.scheduleTrigger";

const SECONDS_PER_UNIT: Record<string, number> = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400,
  weeks: 7 * 86400,
  // 30 is a deliberate underestimate — a "monthly" cron that takes 31 days
  // should still be considered drifting after >30 days, not >31. The detector
  // applies a tolerance multiplier on top, so the floor is sufficient.
  months: 30 * 86400
};

const INTERVAL_FIELD_KEYS: Record<string, string> = {
  seconds: "secondsInterval",
  minutes: "minutesInterval",
  hours: "hoursInterval",
  days: "daysInterval",
  weeks: "weeksInterval",
  months: "monthsInterval"
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function findScheduleTriggerNode(
  nodes: Array<{ type?: string; parameters?: unknown } | null | undefined> | undefined
): { type: string; parameters: unknown } | null {
  if (!Array.isArray(nodes)) return null;
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    if (typeof node.type !== "string") continue;
    if (node.type === SCHEDULE_TRIGGER_TYPE) {
      return { type: node.type, parameters: node.parameters };
    }
  }
  return null;
}

function findFirstTriggerNode(
  nodes: Array<{ type?: string } | null | undefined> | undefined
): { type: string } | null {
  if (!Array.isArray(nodes)) return null;
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    if (typeof node.type !== "string") continue;
    const tail = node.type.split(".").at(-1) ?? node.type;
    if (/trigger$/i.test(tail)) return { type: node.type };
  }
  return null;
}

function intervalFromRuleEntry(entry: unknown): {
  interval_seconds: number | null;
  cron_expression: string | null;
} {
  if (!isPlainObject(entry)) return { interval_seconds: null, cron_expression: null };

  const field = typeof entry.field === "string" ? entry.field : null;
  if (!field) return { interval_seconds: null, cron_expression: null };

  if (field === "cronExpression") {
    const expr = typeof entry.expression === "string" ? entry.expression.trim() : null;
    return { interval_seconds: null, cron_expression: expr || null };
  }

  const unit = SECONDS_PER_UNIT[field];
  if (!unit) return { interval_seconds: null, cron_expression: null };

  const key = INTERVAL_FIELD_KEYS[field];
  const raw = key ? entry[key] : null;
  const multiplier = Number(raw);
  // n8n defaults to 1 when the user didn't override (e.g. "every day").
  // Treat 0/negative/missing as 1 rather than producing a zero-seconds drift
  // baseline that would alert on every cycle.
  const effective = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  return { interval_seconds: Math.round(unit * effective), cron_expression: null };
}

/**
 * Inspect a workflow's node list and produce a ScheduleSummary, or null if
 * the workflow has no schedule-style trigger. Callers should delete any
 * existing schedule_tracking row when this returns null on redeploy.
 */
export function summarizeSchedule(
  workflowNodes: Array<{ type?: string; parameters?: unknown }> | undefined
): ScheduleSummary | null {
  const scheduleNode = findScheduleTriggerNode(workflowNodes);

  if (scheduleNode) {
    const params = isPlainObject(scheduleNode.parameters) ? scheduleNode.parameters : {};
    const rule = isPlainObject(params.rule) ? params.rule : null;
    const intervalEntries = rule && Array.isArray(rule.interval) ? rule.interval : [];

    // n8n's UI allows several intervals. Use the FIRST valid entry as the
    // canonical baseline; mixing intervals is rare in practice and a single
    // drift signal is more actionable than a composite expectation.
    for (const entry of intervalEntries) {
      const { interval_seconds, cron_expression } = intervalFromRuleEntry(entry);
      if (interval_seconds !== null || cron_expression !== null) {
        return {
          trigger_type: SCHEDULE_TRIGGER_TYPE,
          cron_expression,
          expected_interval_seconds: interval_seconds
        };
      }
    }

    // schedule node present but rule unparseable — record presence so the
    // drift detector can still alert on "schedule defined but never fired"
    // even though it cannot compute next-run.
    return {
      trigger_type: SCHEDULE_TRIGGER_TYPE,
      cron_expression: null,
      expected_interval_seconds: null
    };
  }

  // No schedule trigger. We still record trigger_type for the deploy hook so
  // dashboards can show "webhook-driven" vs "manual" vs unscheduled. Drift
  // detection is skipped for these.
  const trigger = findFirstTriggerNode(workflowNodes);
  if (!trigger) return null;
  return {
    trigger_type: trigger.type,
    cron_expression: null,
    expected_interval_seconds: null
  };
}

/**
 * Given the schedule's expected interval and a known last_seen_run_at, derive
 * the next expected fire time. Used both at registration (to seed the row)
 * and after each observed execution (to advance the deadline).
 */
export function nextExpectedRunAt(
  lastSeenRunAt: Date | null,
  expectedIntervalSeconds: number | null,
  now: Date = new Date()
): Date | null {
  if (expectedIntervalSeconds === null || expectedIntervalSeconds <= 0) return null;
  const anchor = lastSeenRunAt ?? now;
  return new Date(anchor.getTime() + expectedIntervalSeconds * 1000);
}
