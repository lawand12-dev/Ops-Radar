import { Hono } from "hono";
import { AppError } from "../../lib/errors";
import {
  getWorkflowLastTerminalRun,
  getWorkflowRunStats,
  listRecentTerminalEventsByWorkflowId
} from "../events/event-repository";
import { countOpenWorkflowAlertsByWorkflowId } from "../monitoring/workflow-health-repository";
import { getProjectById } from "../projects/project-repository";
import { listWorkflowsByProjectId } from "../workflows/workflow-repository";
import type { EventType, WorkflowRecord } from "../../types/workflow";
import { requireServiceApiKey } from "./service-middleware";

// Cap on `recent_executions[]` per workflow in /workflows/health responses.
// The CTO contract does not specify a count; 10 is enough to spot a trend
// without exploding payload size on noisy workflows.
const RECENT_EXECUTIONS_LIMIT = 10;

// `error_summary` / `last_error_summary` truncation cap. n8n error messages
// can be 4KB+ JSON blobs; consumers want a short label, not the full payload.
const ERROR_SUMMARY_MAX_CHARS = 200;

const serviceRoutes = new Hono();

serviceRoutes.use("*", requireServiceApiKey);

type RunStatus = "success" | "failure" | "unknown";

function classifyRunStatus(eventType: EventType | null): RunStatus {
  if (eventType === "run_failed" || eventType === "workflow_execution_failed") {
    return "failure";
  }
  if (
    eventType === "run_succeeded" ||
    eventType === "workflow_execution_success"
  ) {
    return "success";
  }
  return "unknown";
}

/**
 * Compact arbitrary n8n / runner error blobs into a one-line summary capped
 * at ~200 chars. If the payload is JSON we try to surface the most useful
 * field (description → message → first messages[] entry); otherwise we use
 * the first non-empty line. Returns null for null/empty input.
 */
function summarizeError(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  let candidate: string | null = null;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (typeof parsed.description === "string" && parsed.description.trim()) {
        candidate = parsed.description.trim();
      } else if (typeof parsed.message === "string" && parsed.message.trim()) {
        candidate = parsed.message.trim();
      } else if (Array.isArray(parsed.messages) && typeof parsed.messages[0] === "string") {
        candidate = parsed.messages[0].trim();
      }
    } catch {
      // Fall through to line-based extraction below.
    }
  }

  if (!candidate) {
    candidate = trimmed.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ?? trimmed;
  }

  const oneLine = candidate.replace(/\s+/g, " ").trim();
  return oneLine.length > ERROR_SUMMARY_MAX_CHARS
    ? `${oneLine.slice(0, ERROR_SUMMARY_MAX_CHARS - 1)}…`
    : oneLine;
}

function readWorkflowName(workflow: WorkflowRecord): string {
  const fromJson = workflow.json?.name;
  if (typeof fromJson === "string" && fromJson.trim().length > 0) {
    return fromJson.trim();
  }
  return workflow.id;
}

type WorkflowHealthLabel = "healthy" | "warning" | "failing";

function classifyWorkflowHealth(input: {
  lifecycleStatus: WorkflowRecord["status"];
  lastRunStatus: RunStatus;
  openAlerts: number;
}): WorkflowHealthLabel {
  if (input.lifecycleStatus === "failed" || input.lifecycleStatus === "rejected") {
    return "failing";
  }
  if (input.lastRunStatus === "failure") {
    return "failing";
  }
  if (input.openAlerts > 0) {
    return "warning";
  }
  return "healthy";
}

/**
 * Per-workflow health rollup for a single project, including the last
 * `RECENT_EXECUTIONS_LIMIT` terminal runs per workflow. Cross-tenant by
 * design: the service key is platform-level, so any caller with the key can
 * read any project. Returns 404 PROJECT_NOT_FOUND when the id is unknown.
 *
 * Contract is the shape the chatv2 consumer (Automations page) expects —
 * keep field names and nesting stable; downstream code depends on them.
 */
serviceRoutes.get("/projects/:projectId/workflows/health", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new AppError(400, "BAD_REQUEST", "projectId is required.");
  }

  const project = await getProjectById(projectId);
  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found.");
  }

  const workflows = await listWorkflowsByProjectId(projectId);

  const items = await Promise.all(
    workflows.map(async (workflow) => {
      const [last, openAlerts, recentEvents] = await Promise.all([
        getWorkflowLastTerminalRun(workflow.id),
        countOpenWorkflowAlertsByWorkflowId(workflow.id),
        listRecentTerminalEventsByWorkflowId(workflow.id, RECENT_EXECUTIONS_LIMIT)
      ]);

      const lastRunStatus = classifyRunStatus(last.eventType);
      const status = classifyWorkflowHealth({
        lifecycleStatus: workflow.status,
        lastRunStatus,
        openAlerts
      });

      const recent_executions = recentEvents.map((event) => ({
        execution_id: event.run_id,
        status: classifyRunStatus(event.event_type),
        started_at: event.created_at.toISOString(),
        duration_ms: event.duration_ms,
        error_summary: summarizeError(event.error_message)
      }));

      return {
        workflow_id: workflow.id,
        name: readWorkflowName(workflow),
        status,
        last_run_at: last.createdAt ? last.createdAt.toISOString() : null,
        last_error_summary: summarizeError(last.errorMessage),
        open_alerts_count: openAlerts,
        recent_executions
      };
    })
  );

  return c.json({
    project_id: project.id,
    workflows: items
  });
});

/**
 * Project-scoped analytics. Same shape as the per-user /analytics endpoint
 * (`{ overview, workflows_health }`) but scoped to a single project so the
 * consumer can compute project-level KPIs without holding a user JWT.
 *
 * `overview.total_projects` is always `1` here (mirrors the global shape).
 */
serviceRoutes.get("/projects/:projectId/analytics", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new AppError(400, "BAD_REQUEST", "projectId is required.");
  }

  const project = await getProjectById(projectId);
  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found.");
  }

  const workflows = await listWorkflowsByProjectId(projectId);

  const perWorkflow = await Promise.all(
    workflows.map(async (workflow) => {
      const [stats, last, openAlerts] = await Promise.all([
        getWorkflowRunStats(workflow.id),
        getWorkflowLastTerminalRun(workflow.id),
        countOpenWorkflowAlertsByWorkflowId(workflow.id)
      ]);
      return { workflow, stats, last, openAlerts };
    })
  );

  let totalRuns = 0;
  let failedRuns = 0;
  let successRuns = 0;
  let weightedDurationMs = 0;
  let unresolvedAlerts = 0;
  let healthyWorkflows = 0;
  let unhealthyWorkflows = 0;

  const workflows_health = perWorkflow.map(({ workflow, stats, last, openAlerts }) => {
    totalRuns += stats.totalRuns;
    failedRuns += stats.failedRuns;
    successRuns += stats.successRuns;
    weightedDurationMs += stats.averageDurationMs * stats.totalRuns;
    unresolvedAlerts += openAlerts;

    const lifecycleHealthy =
      workflow.status === "validated" ||
      workflow.status === "deployed_inactive" ||
      workflow.status === "deployed_active";
    const isHealthy = lifecycleHealthy && openAlerts === 0;
    if (isHealthy) {
      healthyWorkflows += 1;
    } else {
      unhealthyWorkflows += 1;
    }

    const lastRunStatus = classifyRunStatus(last.eventType);
    return {
      workflow_id: workflow.id,
      project_id: project.id,
      project_name: project.name,
      is_working: lastRunStatus !== "failure" && openAlerts === 0,
      last_run_status: lastRunStatus,
      failed_runs: stats.failedRuns,
      total_runs: stats.totalRuns,
      unresolved_alerts: openAlerts
    };
  });

  const successRate = totalRuns > 0 ? (successRuns / totalRuns) * 100 : 0;
  const averageDurationMs = totalRuns > 0 ? weightedDurationMs / totalRuns : 0;

  return c.json({
    overview: {
      total_projects: 1,
      total_workflows: workflows.length,
      total_runs: totalRuns,
      failed_runs: failedRuns,
      success_rate: Number(successRate.toFixed(2)),
      average_duration_ms: Math.round(averageDurationMs),
      unresolved_alerts: unresolvedAlerts,
      healthy_workflows: healthyWorkflows,
      unhealthy_workflows: unhealthyWorkflows
    },
    workflows_health
  });
});

export default serviceRoutes;
