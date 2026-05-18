/**
 * Anomaly detectors — pure functions that turn extracted telemetry + a small
 * baseline payload into `execution_anomalies` rows.
 *
 * Design rules:
 *   - No DB access here. The caller provides baselines as plain numbers/maps
 *     so we can unit-test detectors without a mysql instance.
 *   - Each detector returns 0..N rows. We never throw — empty results mean
 *     "nothing to alert on", not "failure to evaluate".
 *   - The output shape matches the `execution_anomalies` columns 1:1 with
 *     metadata as a plain JS object that the repository will JSON.stringify.
 */

import type { NodeTelemetry } from "./telemetry-extractor";

export type AnomalySeverity = "low" | "medium" | "high" | "critical";

export interface AnomalyRecord {
  workflow_id: string;
  execution_id: string | null;
  anomaly_type: string;
  severity: AnomalySeverity;
  node_name: string | null;
  anomaly_score: number | null;
  metadata: Record<string, unknown> | null;
}

/* ============================================================
   D1. continue-on-fail detector
   ============================================================
   One anomaly per node whose `continued_on_fail` flag is set. We do not
   collapse multiple nodes from the same execution into one row — different
   nodes can fail for different reasons, and the alert layer dedups by
   fingerprint anyway. */

export function detectContinueOnFail(input: {
  workflowId: string;
  executionId: string | null;
  telemetry: NodeTelemetry[];
}): AnomalyRecord[] {
  const out: AnomalyRecord[] = [];
  for (const node of input.telemetry) {
    if (!node.continued_on_fail) continue;
    out.push({
      workflow_id: input.workflowId,
      execution_id: input.executionId,
      anomaly_type: "continue_on_fail_swallowed",
      severity: "high",
      node_name: node.node_name,
      anomaly_score: null,
      metadata: {
        node_type: node.node_type,
        items_in: node.items_in,
        items_out: node.items_out
      }
    });
  }
  return out;
}

/* ============================================================
   D2. zero-output detector
   ============================================================
   Caller passes a per-node "historical mean items_out" map computed from
   recent successful executions. If a node currently emitted 0 items AND its
   historical mean is meaningfully > 0, we flag it. We deliberately skip:
     - nodes the baseline has never seen (first-runs would alert spuriously)
     - nodes that had_error=true (the error itself is the actionable signal)
   The threshold (mean > 1) avoids alerting on naturally bursty nodes whose
   typical output is "0 or 1 item".
*/

export function detectZeroOutput(input: {
  workflowId: string;
  executionId: string | null;
  telemetry: NodeTelemetry[];
  /** Map of node_name -> mean items_out across recent successful executions. */
  itemsOutMeanByNode: Map<string, number>;
  /** Minimum baseline mean before we consider the node "should produce". */
  meanThreshold?: number;
}): AnomalyRecord[] {
  const threshold = input.meanThreshold ?? 1;
  const out: AnomalyRecord[] = [];

  for (const node of input.telemetry) {
    if (node.had_error) continue;
    if (node.items_out !== 0) continue;
    const baselineMean = input.itemsOutMeanByNode.get(node.node_name);
    if (baselineMean === undefined) continue;
    if (baselineMean <= threshold) continue;

    out.push({
      workflow_id: input.workflowId,
      execution_id: input.executionId,
      anomaly_type: "zero_output",
      severity: "medium",
      node_name: node.node_name,
      anomaly_score: baselineMean, // how many items we usually expect
      metadata: {
        node_type: node.node_type,
        items_out: 0,
        baseline_mean: baselineMean,
        threshold
      }
    });
  }
  return out;
}

/* ============================================================
   D3. scheduler-drift detector
   ============================================================
   Pure variant of the drift logic — the monitoring scheduler's drift sweep
   queries workflow_schedule_tracking for rows where expected_next_run_at is
   already in the past, then calls this to compute the severity bucket and
   anomaly_score (how many intervals overdue we are).

   We bucket severity rather than emit raw seconds:
     1x interval overdue → drifting (medium)
     3x interval overdue → stopped  (critical)
*/

export interface DriftEvaluationInput {
  workflowId: string;
  expectedNextRunAt: Date;
  lastSeenRunAt: Date | null;
  expectedIntervalSeconds: number;
  now?: Date;
}

export interface DriftEvaluation {
  overdueSeconds: number;
  intervalsOverdue: number;
  schedulerStatus: "healthy" | "drifting" | "stopped";
  anomaly: AnomalyRecord | null;
}

export function evaluateScheduleDrift(input: DriftEvaluationInput): DriftEvaluation {
  const now = (input.now ?? new Date()).getTime();
  const due = input.expectedNextRunAt.getTime();
  const overdueMs = now - due;

  // Within one interval of the expected fire time → still healthy. Cron jitter,
  // pod restarts, and our own poll cadence all contribute small offsets.
  if (overdueMs < input.expectedIntervalSeconds * 1000) {
    return {
      overdueSeconds: Math.max(0, Math.round(overdueMs / 1000)),
      intervalsOverdue: overdueMs <= 0 ? 0 : overdueMs / (input.expectedIntervalSeconds * 1000),
      schedulerStatus: "healthy",
      anomaly: null
    };
  }

  const intervalsOverdue = overdueMs / (input.expectedIntervalSeconds * 1000);
  const stopped = intervalsOverdue >= 3;
  const severity: AnomalySeverity = stopped ? "critical" : "medium";

  return {
    overdueSeconds: Math.round(overdueMs / 1000),
    intervalsOverdue,
    schedulerStatus: stopped ? "stopped" : "drifting",
    anomaly: {
      workflow_id: input.workflowId,
      execution_id: null,
      anomaly_type: "scheduler_drift",
      severity,
      node_name: null,
      anomaly_score: Number(intervalsOverdue.toFixed(4)),
      metadata: {
        expected_next_run_at: input.expectedNextRunAt.toISOString(),
        last_seen_run_at: input.lastSeenRunAt?.toISOString() ?? null,
        expected_interval_seconds: input.expectedIntervalSeconds,
        overdue_seconds: Math.round(overdueMs / 1000),
        intervals_overdue: Number(intervalsOverdue.toFixed(4))
      }
    }
  };
}

/* ============================================================
   D4. duration-z anomaly detector
   ============================================================
   Standard z-score over the success-history mean + population stddev. We use
   *population* stddev rather than sample because the "baseline" is treated
   as the full population we care about, not a sample drawn from it.

   Guards:
     - Baseline sample size < 5 → bail (not enough data, alerts would be noise)
     - stddev = 0 → bail (any deviation would z=Infinity)
     - currentDurationMs <= 0 → bail (n8n sometimes reports 0 for ultra-fast)
*/

export function detectDurationAnomaly(input: {
  workflowId: string;
  executionId: string | null;
  currentDurationMs: number | null;
  baselineMeanMs: number;
  baselineStddevMs: number;
  baselineSampleSize: number;
  zThreshold?: number;
}): AnomalyRecord[] {
  const threshold = input.zThreshold ?? 3;
  if (input.currentDurationMs === null || input.currentDurationMs <= 0) return [];
  if (input.baselineSampleSize < 5) return [];
  if (input.baselineStddevMs <= 0) return [];

  const z = (input.currentDurationMs - input.baselineMeanMs) / input.baselineStddevMs;
  if (Math.abs(z) < threshold) return [];

  return [
    {
      workflow_id: input.workflowId,
      execution_id: input.executionId,
      anomaly_type: "duration_anomaly",
      severity: "medium",
      node_name: null,
      anomaly_score: Number(z.toFixed(4)),
      metadata: {
        current_duration_ms: input.currentDurationMs,
        baseline_mean_ms: input.baselineMeanMs,
        baseline_stddev_ms: input.baselineStddevMs,
        baseline_sample_size: input.baselineSampleSize,
        z_score: Number(z.toFixed(4)),
        direction: z > 0 ? "slower" : "faster"
      }
    }
  ];
}
