import { AppError } from "../../lib/errors";
import { listAlertsByWorkflowId, countUnresolvedAlerts } from "../alerts/alert-repository";
import { getLatestAuditLog } from "../audit/audit-repository";
import {
  getWorkflowLastTerminalRun,
  getWorkflowRunStats,
  listRecentFailureEventsByWorkflowId
} from "../events/event-repository";
import { getWorkflowById } from "./workflow-repository";

export async function getWorkflowStatus(workflowId: string) {
  const workflow = await getWorkflowById(workflowId);
  if (!workflow) {
    throw new AppError(404, "WORKFLOW_NOT_FOUND", "Workflow not found.");
  }

  const [stats, lastRun, failures, alerts, unresolvedAlerts, latestAudit] = await Promise.all([
    getWorkflowRunStats(workflowId),
    getWorkflowLastTerminalRun(workflowId),
    listRecentFailureEventsByWorkflowId(workflowId, 10),
    listAlertsByWorkflowId(workflowId, 10),
    countUnresolvedAlerts(workflowId),
    getLatestAuditLog(workflowId)
  ]);

  const isWorking =
    workflow.status !== "failed" &&
    workflow.status !== "rejected" &&
    (lastRun.eventType === null || lastRun.eventType === "run_succeeded");

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
      last_run_status:
        lastRun.eventType === "run_failed"
          ? "failure"
          : lastRun.eventType === "run_succeeded"
            ? "success"
            : "unknown",
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
    alerts,
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

