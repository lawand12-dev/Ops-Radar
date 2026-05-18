/**
 * Unified workflow health view.
 *
 * Reconciles two truth sources that previously could disagree:
 *
 *   1. LEGACY: the status the executions-poller computes — purely from
 *      n8n's success/error labels over the recent window.
 *   2. ANOMALIES: the silent-failure layer's `execution_anomalies`, which
 *      catch continue-on-fail, zero-output, schedule drift, and duration
 *      deviations that legacy cannot see.
 *
 * Without this builder, the public `health_status` returned by
 * `getWorkflowHealth()` only reflected (1). A workflow whose every execution
 * succeeded but whose silent failures were piling up would still show
 * `health_status: "healthy"`. That is the divergence hardening mode is
 * meant to prevent.
 *
 * Strategy:
 *   - Compute the unified status by escalating legacy when fresh high/critical
 *     anomalies exist (within the last hour).
 *   - Return `legacy_status` alongside so back-compat consumers can still see
 *     the original signal.
 *   - The PUBLIC API shape stays unchanged: callers receive
 *     `ProjectWorkflowHealthResponse.health_status = unified.status` and the
 *     anomalies are surfaced via the existing `last_error` / events channels.
 *     The richer `WorkflowHealthView` object is internal — exposed for tests
 *     and for future admin endpoints, but not breaking any client.
 */

import type { HealthStatus } from "../../types/workflow";
import { listAnomaliesByWorkflowId, type ExecutionAnomalyRecord } from "./execution-anomaly-repository";

export interface WorkflowHealthView {
  /** What the legacy executions-poller would have said (status + reason). */
  legacy: { status: HealthStatus; reason: string };
  /** Recent open anomalies for this workflow (capped, newest first). */
  anomalies: ExecutionAnomalyRecord[];
  /** Single source of truth status the public API should return. */
  unified: { status: HealthStatus; reason: string };
}

/** How recent an anomaly must be to influence the unified status. */
const ANOMALY_INFLUENCE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/** Anomaly types whose presence escalates legacy `healthy` → `warning`. */
const SOFT_ESCALATION_TYPES = new Set(["zero_output", "duration_anomaly"]);
/** Anomaly types whose presence escalates legacy `healthy` → `failing`. */
const HARD_ESCALATION_TYPES = new Set(["continue_on_fail_swallowed", "scheduler_drift"]);

export function buildWorkflowHealthView(input: {
  workflowId: string;
  legacyStatus: HealthStatus;
  legacyReason: string;
  /**
   * When anomaly fetch fails we degrade gracefully to legacy-only — never
   * upgrade or downgrade based on absent data. Callers pass the fetch
   * result; the builder is pure so it stays unit-testable.
   */
  recentAnomalies: ExecutionAnomalyRecord[];
  now?: Date;
}): WorkflowHealthView {
  const nowMs = (input.now ?? new Date()).getTime();
  const inWindow = input.recentAnomalies.filter(
    (a) => nowMs - a.detected_at.getTime() <= ANOMALY_INFLUENCE_WINDOW_MS
  );

  const legacy = { status: input.legacyStatus, reason: input.legacyReason };

  // Rule 1: when legacy already says failing/inactive/unknown, keep it. We
  // never DOWNGRADE legacy on the strength of anomalies — operator intuition
  // is "if legacy is alarmed, the workflow is alarmed". Anomalies can only
  // ESCALATE legacy "healthy"/"warning" to a more pessimistic state.
  if (legacy.status !== "healthy" && legacy.status !== "warning") {
    return { legacy, anomalies: inWindow, unified: legacy };
  }

  // Rule 2: any HARD anomaly forces `failing`.
  const hardHit = inWindow.find((a) => HARD_ESCALATION_TYPES.has(a.anomaly_type));
  if (hardHit) {
    return {
      legacy,
      anomalies: inWindow,
      unified: {
        status: "failing",
        reason: `Silent failure detected: ${hardHit.anomaly_type} on ${hardHit.node_name ?? "workflow"}.`
      }
    };
  }

  // Rule 3: any SOFT anomaly escalates healthy → warning. Warning stays
  // warning (no point promoting from warning to warning).
  const softHit = inWindow.find((a) => SOFT_ESCALATION_TYPES.has(a.anomaly_type));
  if (softHit && legacy.status === "healthy") {
    return {
      legacy,
      anomalies: inWindow,
      unified: {
        status: "warning",
        reason: `Anomaly detected: ${softHit.anomaly_type}${softHit.node_name ? ` on ${softHit.node_name}` : ""}.`
      }
    };
  }

  // Rule 4: no fresh anomalies of interest → legacy is the unified truth.
  return { legacy, anomalies: inWindow, unified: legacy };
}

/**
 * Convenience for the service layer: builds the view AND swallows fetch
 * errors so a transient DB issue never poisons the legacy response. On
 * fetch failure the unified status equals legacy — i.e. we silently
 * degrade to pre-hardening behaviour rather than block.
 */
export async function buildHealthViewWithFallback(input: {
  workflowId: string;
  legacyStatus: HealthStatus;
  legacyReason: string;
}): Promise<WorkflowHealthView> {
  let anomalies: ExecutionAnomalyRecord[] = [];
  try {
    anomalies = await listAnomaliesByWorkflowId(input.workflowId, { limit: 20 });
  } catch {
    // legacy-only fallback; do not log here — listAnomaliesByWorkflowId logs
    // at its own level if it cares to.
  }
  return buildWorkflowHealthView({
    workflowId: input.workflowId,
    legacyStatus: input.legacyStatus,
    legacyReason: input.legacyReason,
    recentAnomalies: anomalies
  });
}
