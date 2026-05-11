import { AppError } from "../../lib/errors";
import { getRequestContext } from "../../lib/request-context";
import { getLatestAuditLog } from "../audit/audit-repository";
import {
  getWorkflowLastTerminalRun,
  getWorkflowRunStats,
  listRecentFailureEventsByWorkflowId
} from "../events/event-repository";
import {
  countOpenWorkflowAlertsByWorkflowId,
  listOpenWorkflowAlertsByWorkflowId
} from "../monitoring/workflow-health-repository";
import { getProjectByIdForUser } from "../projects/project-repository";
import { getWorkflowById } from "./workflow-repository";

export async function getWorkflowStatus(workflowId: string) {
  const workflow = await getWorkflowById(workflowId);
  if (!workflow) {
    throw new AppError(404, "WORKFLOW_NOT_FOUND", "Workflow not found.");
  }
  // Tenancy enforcement: when called from an auth context, the caller must own
  // the workflow's project. Background calls (no context) skip this and return
  // the global view — this is what the monitoring scheduler relies on.
  const ctx = getRequestContext();
  if (ctx) {
    const project = await getProjectByIdForUser(workflow.project_id, ctx.userId);
    if (!project) {
      // Same 404 we'd give for a missing workflow id — never reveal that the
      // workflow exists but belongs to a different tenant.
      throw new AppError(404, "WORKFLOW_NOT_FOUND", "Workflow not found.");
    }
  }

  const [stats, lastRun, failures, alerts, unresolvedAlerts, latestAudit] = await Promise.all([
    getWorkflowRunStats(workflowId),
    getWorkflowLastTerminalRun(workflowId),
    listRecentFailureEventsByWorkflowId(workflowId, 10),
    listOpenWorkflowAlertsByWorkflowId(workflowId, 10),
    countOpenWorkflowAlertsByWorkflowId(workflowId),
    getLatestAuditLog(workflowId)
  ]);

  // A workflow is "working" only if its lifecycle status is healthy AND there are no
  // open alerts AND the most-recent terminal run wasn't a failure. Without the alert
  // and unified-event-type check, a workflow with 20 monitoring-scheduler failures
  // but no `run_failed` event would falsely report as working.
  const lastIsFailure =
    lastRun.eventType === "run_failed" || lastRun.eventType === "workflow_execution_failed";
  const lastIsSuccess =
    lastRun.eventType === "run_succeeded" || lastRun.eventType === "workflow_execution_success";
  const isWorking =
    workflow.status !== "failed" &&
    workflow.status !== "rejected" &&
    unresolvedAlerts === 0 &&
    (lastRun.eventType === null || lastIsSuccess);

  return {
    workflow: {
      id: workflow.id,
      project_id: workflow.project_id,
      status: workflow.status,
      n8n_workflow_id: workflow.n8n_workflow_id,
      created_at: workflow.created_at,
      updated_at: workflow.updated_at
    },
    health: {
      is_working: isWorking,
      last_run_status: lastIsFailure ? "failure" : lastIsSuccess ? "success" : "unknown",
      last_run_at: lastRun.createdAt,
      unresolved_alerts: unresolvedAlerts
    },
    metrics: {
      total_runs: stats.totalRuns,
      failed_runs: stats.failedRuns,
      success_rate: Number(stats.successRate.toFixed(2)),
      average_duration_ms: Math.round(stats.averageDurationMs)
    },
    recent_errors: failures.map((event) => ({
      run_id: event.run_id,
      node_name: event.node_name,
      error_message: event.error_message,
      created_at: event.created_at
    })),
    alerts: alerts.map((alert) => ({
      id: alert.id,
      alert_type: alert.alert_type,
      severity: alert.severity,
      message: alert.message,
      recommended_action: alert.recommended_action,
      failed_node: alert.failed_node,
      first_seen_at: alert.first_seen_at,
      last_seen_at: alert.last_seen_at,
      status: alert.status
    })),
    ai_suggestion: latestAudit
      ? {
          issue: latestAudit.issue,
          reason: latestAudit.reason,
          solution: latestAudit.solution,
          created_at: latestAudit.created_at
        }
      : null
  };
}

