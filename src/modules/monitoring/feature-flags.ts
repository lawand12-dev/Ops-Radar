/**
 * Centralized accessors for the silent-failure-layer feature flags.
 *
 * Every gate in the new pipeline reads from here rather than reaching into
 * `env` directly so:
 *   1. We have one place to extend if we later move to a dynamic flag service
 *   2. Tests can stub the layer without polluting process.env
 *   3. A code reviewer can audit "is this guarded?" by grepping for these names
 *
 * Defaults are FALSE in env.ts — production deploys this file dormant until
 * the operator explicitly turns each switch on. See suggested rollout order
 * at the bottom of this PR's notes.
 */

import { env } from "../../config/env";

/** Master gate for the entire telemetry + anomaly pipeline. */
export function isSilentFailurePipelineEnabled(): boolean {
  return env.SILENT_FAILURE_PIPELINE_ENABLED;
}

/** Independent gate for the schedule-drift sweep. */
export function isScheduleDriftEnabled(): boolean {
  return env.SCHEDULE_DRIFT_ENABLED;
}

/**
 * Independent gate for `getN8nExecutionById({ includeData: true })` calls
 * issued by the silent-failure pipeline. Even with the pipeline enabled, if
 * this is off the pipeline degrades to "we have no runData" and skips the
 * detectors that need it. Useful for canarying without doubling n8n load.
 */
export function isDeepInspectionEnabled(): boolean {
  return env.TELEMETRY_DEEP_INSPECTION_ENABLED;
}

/**
 * Parsed allowlist of workflow ids that bypass the strict deep-inspection
 * rule (see `should-deep-inspect.ts`). Parsed once and cached for the
 * lifetime of the process — env vars are immutable at runtime.
 */
let cachedAllowlist: Set<string> | null = null;
export function deepInspectionAllowlist(): Set<string> {
  if (cachedAllowlist) return cachedAllowlist;
  cachedAllowlist = new Set(
    env.TELEMETRY_DEEP_INSPECTION_ALLOWLIST.split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  );
  return cachedAllowlist;
}

/** Snapshot of all flag values, useful for the cycle_summary log line. */
export function flagsSnapshot(): Record<string, unknown> {
  return {
    silent_failure_pipeline_enabled: env.SILENT_FAILURE_PIPELINE_ENABLED,
    schedule_drift_enabled: env.SCHEDULE_DRIFT_ENABLED,
    deep_inspection_enabled: env.TELEMETRY_DEEP_INSPECTION_ENABLED,
    include_data_budget_per_cycle: env.TELEMETRY_INCLUDE_DATA_BUDGET_PER_CYCLE,
    cycle_time_budget_ratio: env.TELEMETRY_CYCLE_TIME_BUDGET_RATIO,
    allowlist_size: deepInspectionAllowlist().size
  };
}

/** Test hook — re-parse the allowlist after process.env mutation in tests. */
export function _resetFlagsCacheForTest(): void {
  cachedAllowlist = null;
}
