/**
 * THE includeData GATE.
 *
 * The only place in the codebase that decides "should the silent-failure
 * pipeline issue a `getN8nExecutionById({ includeData: true })` for this
 * workflow on this cycle?".
 *
 * The rule from system-hardening mode (`NO EXCEPTIONS`):
 *
 *   includeData: true ONLY if
 *     - execution.status == "error"                            (a)
 *     - OR anomaly_score > threshold                           (b)
 *     - OR scheduler drift detected                            (c)
 *     - OR explicitly flagged workflow in allowlist            (d)
 *
 * If you want to add another exception, change this file and update the
 * audit notes — do NOT route around the gate from the calling site.
 *
 * Returns the decision plus a `reason` enum that the observability layer
 * stamps into the cycle_summary log for retroactive accounting.
 */

import { deepInspectionAllowlist, isDeepInspectionEnabled } from "./feature-flags";

export type DeepInspectReason =
  | "execution_failed"
  | "high_anomaly_score"
  | "scheduler_drifted"
  | "allowlisted"
  | "blocked_by_feature_flag"
  | "no_qualifying_condition";

export interface DeepInspectInput {
  workflowId: string;
  /** n8n's classification of the latest execution. */
  latestExecutionStatus: string;
  /**
   * Highest open-anomaly score within the recent window for this workflow.
   * Pass null when no anomalies exist. The threshold below maps to "z=3" for
   * the duration detector and "drifting" for schedule drift; together they
   * pre-filter to genuinely interesting workflows.
   */
  recentMaxAnomalyScore: number | null;
  /**
   * True if the scheduler-drift sweep flagged this workflow within the
   * recent window. Passed in by the coordinator rather than re-queried here
   * so each cycle does ONE join, not one per workflow.
   */
  hasRecentSchedulerDrift: boolean;
}

export interface DeepInspectDecision {
  allowed: boolean;
  reason: DeepInspectReason;
}

const ANOMALY_SCORE_THRESHOLD = 3;

const FAILURE_STATUSES = new Set(["error", "failed", "crashed", "failure"]);

export function shouldDeepInspect(input: DeepInspectInput): DeepInspectDecision {
  // Top-level kill switch wins over every other condition. The feature flag
  // is the operator's emergency stop — if it's off, we never touch n8n's
  // deep-data endpoint regardless of how alarming this workflow looks.
  if (!isDeepInspectionEnabled()) {
    return { allowed: false, reason: "blocked_by_feature_flag" };
  }

  // (a) Execution-level failure → always eligible. The execution payload is
  // necessary to attribute the failure to a specific node.
  if (FAILURE_STATUSES.has(String(input.latestExecutionStatus).toLowerCase())) {
    return { allowed: true, reason: "execution_failed" };
  }

  // (b) Recent anomaly score above the threshold. The threshold matches the
  // duration-z detector's z=3 boundary so we don't oscillate (a workflow
  // that crossed once stays inspectable while the anomaly is fresh).
  if (input.recentMaxAnomalyScore !== null && input.recentMaxAnomalyScore > ANOMALY_SCORE_THRESHOLD) {
    return { allowed: true, reason: "high_anomaly_score" };
  }

  // (c) Schedule drift observed for this workflow. We re-fetch runData on the
  // next observed execution so the operator can see WHAT recovered the
  // workflow when it eventually fires.
  if (input.hasRecentSchedulerDrift) {
    return { allowed: true, reason: "scheduler_drifted" };
  }

  // (d) Explicit operator override.
  if (deepInspectionAllowlist().has(input.workflowId)) {
    return { allowed: true, reason: "allowlisted" };
  }

  return { allowed: false, reason: "no_qualifying_condition" };
}

/**
 * Code-review guardrail referenced by the spec. Imported by the telemetry
 * extractor (purely as a compile-time anchor for the comment) — searching
 * for this symbol surfaces every code path that must respect the rule.
 *
 * This is intentionally a string constant, not an executable check: the
 * extractor doesn't issue n8n calls itself. The guardrail lives at the
 * CALL SITE (the coordinator), and `shouldDeepInspect` is the only function
 * permitted to authorise a deep fetch.
 */
export const DEEP_INSPECT_GUARDRAIL_DOC = `
  ⚠ Telemetry extraction is a pure parser. It NEVER fetches n8n data.
  The deep fetch (getN8nExecutionById with includeData: true) is gated by
  shouldDeepInspect() — see src/modules/monitoring/should-deep-inspect.ts.
  If you find yourself wanting an "unconditional" includeData fetch, you are
  about to bypass the hardening rule. Add a new reason to DeepInspectReason
  and update should-deep-inspect.ts instead of routing around it.
`;
