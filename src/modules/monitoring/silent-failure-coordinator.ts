/**
 * Silent-failure pipeline coordinator.
 *
 * Owns the orchestration that used to live inline in `workflow-health-service`.
 * The service now delegates to the two entry points exported here:
 *
 *   - `runSilentFailurePipeline(input)`  per-workflow, called once per cycle
 *   - `runScheduleDriftSweep()`          cycle-wide, called once per cycle
 *
 * Every public path is gated by feature flags AND the cycle budget so a
 * production deploy with all flags off behaves EXACTLY like the legacy
 * monitor — no extra n8n calls, no extra DB writes, no behaviour drift.
 *
 * Hardening invariants enforced here (not at call sites):
 *   1. `isSilentFailurePipelineEnabled()` master kill switch
 *   2. `shouldDeepInspect()` 4-condition rule for every `includeData` fetch
 *   3. `acquireIncludeDataSlot()` cycle-budget check before every fetch
 *   4. Every step independently try/catched — pipeline failures are
 *      recorded as observability events, never propagated
 *   5. Schedule observability (`recordObservedRun`) runs even when deep
 *      inspection is skipped — it's a cheap UPDATE and the drift sweep
 *      relies on it
 */

import { logError, logInfo, logWarn } from "../../lib/logger";
import {
  getN8nExecutionById,
  type N8nExecutionDetails
} from "../n8n/n8n-client";
import type { N8nNode } from "../../types/workflow";
import {
  detectContinueOnFail,
  detectDurationAnomaly,
  detectZeroOutput,
  evaluateScheduleDrift,
  type AnomalyRecord
} from "./anomaly-detectors";
import {
  acquireIncludeDataSlot,
  recordAnomaliesEmitted,
  recordExtractionDuration,
  recordPipelineFailure
} from "./cycle-budget";
import {
  listAnomaliesByWorkflowId,
  persistAnomalies
} from "./execution-anomaly-repository";
import {
  getExecutionDurationBaseline,
  getRecentItemsOutBaselineByNode,
  persistNodeTelemetry
} from "./execution-node-stats-repository";
import {
  isScheduleDriftEnabled,
  isSilentFailurePipelineEnabled
} from "./feature-flags";
import { extractNodeTelemetry } from "./telemetry-extractor";
import { shouldDeepInspect } from "./should-deep-inspect";
import {
  listOverdueSchedules,
  recordObservedRun,
  updateSchedulerStatus
} from "./workflow-schedule-repository";

function safeMessage(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  try { return JSON.stringify(value); } catch { return String(value); }
}

export interface PipelineExecutionInput {
  /** Internal workflow uuid (not the n8n workflow id). */
  workflowId: string;
  /** Latest execution view from listN8nExecutions — already lightweight. */
  latestExecution: {
    id: string;
    status: string;
    duration_ms: number | null;
    started_at: string | null;
  };
  /** Static node definitions from the n8n workflow record (for node_type lookup). */
  workflowNodes: N8nNode[];
}

/**
 * Per-workflow pipeline. Fire-and-forget from the service layer.
 *
 * Flow:
 *   1. Master flag gate → noop if pipeline disabled
 *   2. Always advance schedule observability (cheap, independent of fetch)
 *   3. Read recent-anomaly + drift state for shouldDeepInspect()
 *   4. Apply gate + cycle budget → may abort early
 *   5. Deep fetch + extract + persist telemetry
 *   6. Read baselines + run detectors + persist anomalies
 *
 * The function NEVER throws — every step has a local catch that bumps the
 * pipeline_failure counter so the cycle_summary log captures the issue.
 */
export async function runSilentFailurePipeline(input: PipelineExecutionInput): Promise<void> {
  if (!isSilentFailurePipelineEnabled()) return;

  const traceCtx = {
    workflow_id: input.workflowId,
    execution_id: input.latestExecution.id
  };

  // (2) Schedule observability advances regardless of deep-fetch eligibility.
  // It's a UPDATE on at most one row and the drift sweep needs it current.
  try {
    const startedAt = input.latestExecution.started_at
      ? new Date(input.latestExecution.started_at)
      : new Date();
    await recordObservedRun(input.workflowId, startedAt);
  } catch (err) {
    logWarn("telemetry-observability", "record_observed_run_failed", {
      ...traceCtx,
      error: safeMessage(err)
    });
    recordPipelineFailure();
  }

  // (3) Compute BOTH deep-inspection signals from a single repo call.
  //
  // Before this hardening pass the coordinator used a coarse COUNT(*) over
  // 24h and approximated the score as 99 — and it never populated
  // `hasRecentSchedulerDrift`, leaving condition (c) of the 4-condition rule
  // as dead code. The fix: one `listAnomaliesByWorkflowId(limit=10)` call
  // gives us the exact max score (for condition b) AND a real flag for
  // recent drift (for condition c) without doubling the query count.
  //
  // `limit: 10` is an over-fetch by design — we look at type+score on each
  // row, so a workflow with a stale duration anomaly plus a fresh drift
  // can't hide the latter behind the former in result ordering.
  let recentMaxAnomalyScore: number | null = null;
  let hasRecentSchedulerDrift = false;
  try {
    const recent = await listAnomaliesByWorkflowId(input.workflowId, { limit: 10 });
    const scores = recent
      .map((a) => a.anomaly_score)
      .filter((s): s is number => s !== null && Number.isFinite(s));
    recentMaxAnomalyScore = scores.length === 0 ? null : Math.max(...scores);
    hasRecentSchedulerDrift = recent.some((a) => a.anomaly_type === "scheduler_drift");
  } catch {
    // Fall through with defaults — the gate denies as "no_qualifying_condition"
    // rather than silently allowing through on partial information.
  }

  const decision = shouldDeepInspect({
    workflowId: input.workflowId,
    latestExecutionStatus: input.latestExecution.status,
    recentMaxAnomalyScore,
    hasRecentSchedulerDrift
  });

  if (!decision.allowed) {
    // Eligible but-budget-exhausted shows up later; eligible-but-flag-off too.
    // No log noise here — the cycle_summary line carries the aggregate.
    return;
  }

  // (4) Cycle-budget check. The decision was eligible, but the cycle may have
  // already burned its time/count budget. acquireIncludeDataSlot() emits the
  // one-shot degraded_mode log when it first denies.
  if (!acquireIncludeDataSlot(input.workflowId)) {
    return;
  }

  // (5) Deep fetch + extract.
  let detail: N8nExecutionDetails;
  try {
    detail = await getN8nExecutionById(input.latestExecution.id, { includeData: true });
  } catch (err) {
    logWarn("telemetry-observability", "deep_fetch_failed", {
      ...traceCtx,
      reason: decision.reason,
      error: safeMessage(err)
    });
    recordPipelineFailure();
    return;
  }

  const nodesByName = new Map<string, { type: string | null }>();
  for (const n of input.workflowNodes) {
    if (n && typeof n.name === "string") {
      nodesByName.set(n.name, { type: typeof n.type === "string" ? n.type : null });
    }
  }

  const extractStart = Date.now();
  let telemetry: ReturnType<typeof extractNodeTelemetry> = [];
  try {
    telemetry = extractNodeTelemetry({
      executionDetail: detail,
      parentExecutionStatus: input.latestExecution.status,
      workflowNodesByName: nodesByName
    });
  } catch (err) {
    // extractNodeTelemetry is documented as never-throw; if it does, we
    // treat it as a hard pipeline failure so it surfaces in alerting.
    logError("telemetry-observability", "extraction_threw", {
      ...traceCtx,
      error: safeMessage(err)
    });
    recordPipelineFailure();
    return;
  } finally {
    recordExtractionDuration(Date.now() - extractStart);
  }

  if (telemetry.length === 0) return;

  try {
    await persistNodeTelemetry({
      workflowId: input.workflowId,
      executionId: input.latestExecution.id,
      telemetry
    });
  } catch (err) {
    logWarn("telemetry-observability", "persist_node_stats_failed", {
      ...traceCtx,
      error: safeMessage(err)
    });
    recordPipelineFailure();
    // Continue — detectors still run on in-memory telemetry
  }

  // (6) Baselines + detectors + persist.
  let baselineItemsOut: Map<string, number> = new Map();
  let durationBaseline = { sampleSize: 0, meanMs: 0, stddevMs: 0 };
  try {
    [baselineItemsOut, durationBaseline] = await Promise.all([
      getRecentItemsOutBaselineByNode(input.workflowId, { sampleLimit: 50 }),
      getExecutionDurationBaseline(input.workflowId, { sampleLimit: 50 })
    ]);
  } catch (err) {
    logWarn("telemetry-observability", "baseline_query_failed", {
      ...traceCtx,
      error: safeMessage(err)
    });
    recordPipelineFailure();
  }

  const allAnomalies: AnomalyRecord[] = [];
  try {
    allAnomalies.push(
      ...detectContinueOnFail({
        workflowId: input.workflowId,
        executionId: input.latestExecution.id,
        telemetry
      }),
      ...detectZeroOutput({
        workflowId: input.workflowId,
        executionId: input.latestExecution.id,
        telemetry,
        itemsOutMeanByNode: baselineItemsOut
      }),
      ...detectDurationAnomaly({
        workflowId: input.workflowId,
        executionId: input.latestExecution.id,
        currentDurationMs: input.latestExecution.duration_ms,
        baselineMeanMs: durationBaseline.meanMs,
        baselineStddevMs: durationBaseline.stddevMs,
        baselineSampleSize: durationBaseline.sampleSize
      })
    );
  } catch (err) {
    logWarn("telemetry-observability", "detector_failure", {
      ...traceCtx,
      error: safeMessage(err)
    });
    recordPipelineFailure();
  }

  if (allAnomalies.length === 0) return;

  try {
    await persistAnomalies(allAnomalies);
    recordAnomaliesEmitted(allAnomalies.length);
    logInfo("telemetry-observability", "anomalies_persisted", {
      ...traceCtx,
      reason: decision.reason,
      count: allAnomalies.length,
      types: allAnomalies.map((a) => a.anomaly_type)
    });
  } catch (err) {
    logWarn("telemetry-observability", "persist_anomalies_failed", {
      ...traceCtx,
      error: safeMessage(err)
    });
    recordPipelineFailure();
  }
}

/**
 * Cycle-wide schedule drift sweep. Independently gated from the
 * per-workflow pipeline because operators may want one without the other
 * (drift detection is much cheaper than telemetry extraction).
 */
export async function runScheduleDriftSweep(): Promise<{ checked: number; anomalies: number }> {
  if (!isScheduleDriftEnabled()) return { checked: 0, anomalies: 0 };

  let overdue: Awaited<ReturnType<typeof listOverdueSchedules>> = [];
  try {
    overdue = await listOverdueSchedules({ limit: 500 });
  } catch (err) {
    logWarn("telemetry-observability", "drift_list_failed", { error: safeMessage(err) });
    recordPipelineFailure();
    return { checked: 0, anomalies: 0 };
  }

  if (overdue.length === 0) return { checked: 0, anomalies: 0 };

  const allAnomalies: AnomalyRecord[] = [];
  for (const row of overdue) {
    if (row.expected_next_run_at === null || row.expected_interval_seconds === null) continue;
    try {
      const evaluation = evaluateScheduleDrift({
        workflowId: row.workflow_id,
        expectedNextRunAt: row.expected_next_run_at,
        lastSeenRunAt: row.last_seen_run_at,
        expectedIntervalSeconds: row.expected_interval_seconds
      });
      if (evaluation.anomaly) allAnomalies.push(evaluation.anomaly);
      if (evaluation.schedulerStatus !== row.scheduler_status) {
        await updateSchedulerStatus(row.workflow_id, evaluation.schedulerStatus);
      }
    } catch (err) {
      logWarn("telemetry-observability", "drift_evaluation_failed", {
        workflow_id: row.workflow_id,
        error: safeMessage(err)
      });
      recordPipelineFailure();
    }
  }

  if (allAnomalies.length > 0) {
    try {
      await persistAnomalies(allAnomalies);
      recordAnomaliesEmitted(allAnomalies.length);
    } catch (err) {
      logWarn("telemetry-observability", "drift_persist_failed", { error: safeMessage(err) });
      recordPipelineFailure();
    }
  }

  return { checked: overdue.length, anomalies: allAnomalies.length };
}
