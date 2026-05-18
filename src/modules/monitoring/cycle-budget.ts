/**
 * Per-cycle budget tracker for the silent-failure pipeline.
 *
 * Two budgets are enforced:
 *   1. `includeData` fetch count — capped at TELEMETRY_INCLUDE_DATA_BUDGET_PER_CYCLE
 *   2. cycle wall-clock time — capped at TELEMETRY_CYCLE_TIME_BUDGET_RATIO of
 *      MONITORING_INTERVAL_SECONDS so the next cycle has room to start cleanly
 *
 * The tracker lives at module scope because the monitoring cycle is already
 * serialised by `withMonitoringCycleLock`. Concurrent reads/writes are
 * therefore not possible in normal flow — adding a real mutex would just be
 * ceremony. (If a second cycle ever did start in parallel, the legacy lock
 * would skip it before reaching this code.)
 *
 * Contract:
 *   - `startCycle()` resets all counters and records the cycle's start time
 *   - Pipeline code calls `acquireIncludeDataSlot()` before EVERY deep fetch.
 *     If it returns false, the caller MUST skip the fetch. The skip is
 *     counted so the cycle_summary log line carries an accurate
 *     `skipped_workflows_due_to_suspicious_load` value.
 *   - `degradedMode()` is a one-shot flag — it stays true for the rest of the
 *     cycle once tripped, and `markDegraded()` only emits a log line on the
 *     first transition so we don't flood the logs for a 500-workflow cycle.
 *
 * Importantly, hitting the budget DOES NOT crash the cycle. Existing legacy
 * health monitoring runs to completion for every workflow regardless. Only
 * the optional deep-telemetry path is throttled.
 */

import { env } from "../../config/env";
import { logWarn } from "../../lib/logger";

interface CycleState {
  cycleId: string;
  startedAt: number;
  intervalDeadlineMs: number;
  includeDataBudget: number;
  includeDataUsed: number;
  skippedDueToBudget: number;
  anomaliesEmitted: number;
  pipelineFailures: number;
  extractionDurationTotalMs: number;
  extractionRuns: number;
  degraded: boolean;
}

let currentCycle: CycleState | null = null;

function newCycleId(): string {
  // Short readable id (date-sortable). Avoids pulling in randomUUID for
  // something that just needs to correlate log lines within a cycle.
  return `cyc_${Date.now().toString(36)}`;
}

export function startCycle(): string {
  const intervalMs = env.MONITORING_INTERVAL_SECONDS * 1000;
  const ratio = env.TELEMETRY_CYCLE_TIME_BUDGET_RATIO;
  currentCycle = {
    cycleId: newCycleId(),
    startedAt: Date.now(),
    intervalDeadlineMs: Math.floor(intervalMs * ratio),
    includeDataBudget: env.TELEMETRY_INCLUDE_DATA_BUDGET_PER_CYCLE,
    includeDataUsed: 0,
    skippedDueToBudget: 0,
    anomaliesEmitted: 0,
    pipelineFailures: 0,
    extractionDurationTotalMs: 0,
    extractionRuns: 0,
    degraded: false
  };
  return currentCycle.cycleId;
}

export function currentCycleId(): string | null {
  return currentCycle?.cycleId ?? null;
}

/**
 * Returns true and increments the used count if there is budget. Returns
 * false (and records a skip) if the budget is exhausted OR the cycle has
 * already burned its time slice — callers must then NOT issue the deep
 * fetch. The split between "budget exhausted" and "time exhausted" only
 * matters in metrics; both result in the same degraded behaviour.
 */
export function acquireIncludeDataSlot(workflowId: string): boolean {
  if (!currentCycle) return false;

  const elapsed = Date.now() - currentCycle.startedAt;
  const timeExhausted = elapsed >= currentCycle.intervalDeadlineMs;
  const countExhausted = currentCycle.includeDataUsed >= currentCycle.includeDataBudget;

  if (timeExhausted || countExhausted) {
    currentCycle.skippedDueToBudget += 1;
    markDegradedOnce(workflowId, timeExhausted, countExhausted);
    return false;
  }
  currentCycle.includeDataUsed += 1;
  return true;
}

function markDegradedOnce(workflowId: string, timeExhausted: boolean, countExhausted: boolean): void {
  if (!currentCycle || currentCycle.degraded) return;
  currentCycle.degraded = true;
  // One warn per cycle — every subsequent skip is just an increment of
  // skippedDueToBudget, surfaced in the cycle_summary log.
  logWarn("telemetry-observability", "degraded_mode", {
    cycle_id: currentCycle.cycleId,
    triggered_by_workflow: workflowId,
    reason: timeExhausted ? "cycle_time_budget" : countExhausted ? "include_data_count_budget" : "unknown",
    include_data_used: currentCycle.includeDataUsed,
    include_data_budget: currentCycle.includeDataBudget,
    elapsed_ms: Date.now() - currentCycle.startedAt,
    interval_deadline_ms: currentCycle.intervalDeadlineMs
  });
}

export function recordAnomaliesEmitted(count: number): void {
  if (currentCycle && count > 0) currentCycle.anomaliesEmitted += count;
}

export function recordPipelineFailure(): void {
  if (currentCycle) currentCycle.pipelineFailures += 1;
}

export function recordExtractionDuration(ms: number): void {
  if (!currentCycle) return;
  currentCycle.extractionDurationTotalMs += ms;
  currentCycle.extractionRuns += 1;
}

export function isDegraded(): boolean {
  return Boolean(currentCycle?.degraded);
}

/**
 * Snapshot of cycle counters. Used at end-of-cycle to emit a single
 * cycle_summary log line covering every observability metric the spec
 * requires:
 *   - telemetry_extraction_duration_ms (avg over the cycle)
 *   - includeData_fetch_count
 *   - anomaly_detection_count
 *   - silent_failure_pipeline_failures
 *   - skipped_workflows_due_to_suspicious_load
 */
export interface CycleSummary {
  cycle_id: string;
  duration_ms: number;
  include_data_fetch_count: number;
  include_data_budget: number;
  include_data_skipped: number;
  anomaly_detection_count: number;
  silent_failure_pipeline_failures: number;
  telemetry_extraction_avg_ms: number | null;
  telemetry_extraction_runs: number;
  degraded: boolean;
}

export function finishCycle(): CycleSummary | null {
  if (!currentCycle) return null;
  const c = currentCycle;
  const summary: CycleSummary = {
    cycle_id: c.cycleId,
    duration_ms: Date.now() - c.startedAt,
    include_data_fetch_count: c.includeDataUsed,
    include_data_budget: c.includeDataBudget,
    include_data_skipped: c.skippedDueToBudget,
    anomaly_detection_count: c.anomaliesEmitted,
    silent_failure_pipeline_failures: c.pipelineFailures,
    telemetry_extraction_avg_ms:
      c.extractionRuns === 0 ? null : Math.round(c.extractionDurationTotalMs / c.extractionRuns),
    telemetry_extraction_runs: c.extractionRuns,
    degraded: c.degraded
  };
  currentCycle = null;
  return summary;
}
