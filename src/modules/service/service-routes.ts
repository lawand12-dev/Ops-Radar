import { Hono } from "hono";
import { AppError } from "../../lib/errors";
import { getUserById } from "../auth/user-repository";
import {
  getWorkflowLastTerminalRun,
  getWorkflowRunStats,
  listRecentTerminalEventsByWorkflowId,
  listUserRecentTerminalEvents
} from "../events/event-repository";
import {
  countOpenWorkflowAlertsByWorkflowId
} from "../monitoring/workflow-health-repository";
import { listProjectsByUserId } from "../projects/project-repository";
import { listWorkflowsByProjectId } from "../workflows/workflow-repository";
import type {
  EventType,
  ProjectRecord,
  WorkflowRecord
} from "../../types/workflow";
import { requireServiceApiKey } from "./service-middleware";

// `recent_executions[]` cap per workflow on /workflows/health and for the
// dashboard's cross-workflow `recent_executions` widget on /analytics.
const RECENT_EXECUTIONS_PER_WORKFLOW = 10;
const RECENT_EXECUTIONS_GLOBAL = 25;

// One-line error summary cap. n8n error blobs can be 4KB+ JSON; consumers
// want a label, not the full payload.
const ERROR_SUMMARY_MAX_CHARS = 200;

// Business heuristic for `hours_saved` in /analytics. Each successful run is
// treated as replacing this many minutes of manual operator effort. The value
// is echoed back under `assumptions` so consumers can see and override it.
const MANUAL_MINUTES_PER_SUCCESSFUL_RUN = 3;

const serviceRoutes = new Hono();

serviceRoutes.use("*", requireServiceApiKey);

type RunStatus = "success" | "failure" | "unknown";
type WorkflowHealthLabel = "healthy" | "warning" | "failing";

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
      // Fall through to line-based extraction.
    }
  }

  if (!candidate) {
    candidate =
      trimmed.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ??
      trimmed;
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

/**
 * Heuristic category derived from the workflow's trigger node type. n8n node
 * types look like `n8n-nodes-base.telegramTrigger`; we strip the package
 * prefix and the trailing "Trigger" / "Tool" suffixes to get a stable label
 * like "telegram", "schedule", "webhook", "manual". Returns "unknown" when
 * we cannot find a trigger node (e.g. malformed workflow JSON).
 */
function deriveCategory(workflow: WorkflowRecord): string {
  const nodes = workflow.json?.nodes;
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return "unknown";
  }

  // Trigger nodes either explicitly have "Trigger"/"trigger" in the type or
  // are well-known entry points like the bare webhook node.
  const trigger =
    nodes.find((node) => /trigger$/i.test(String(node.type ?? ""))) ??
    nodes.find((node) => /\.webhook$/i.test(String(node.type ?? "")));

  const raw = typeof trigger?.type === "string" ? trigger.type : null;
  if (!raw) {
    return "unknown";
  }

  const stripped = raw.replace(/^[^.]*\./, ""); // drop "n8n-nodes-base." prefix
  return stripped
    .replace(/Trigger$/i, "")
    .replace(/Tool$/i, "")
    .toLowerCase()
    .trim() || "unknown";
}

function isWebhookTriggered(workflow: WorkflowRecord): boolean {
  const nodes = workflow.json?.nodes;
  if (!Array.isArray(nodes)) {
    return false;
  }
  return nodes.some((node) => /\.webhook$/i.test(String(node.type ?? "")));
}

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
 * Load every workflow owned by a user (across all of their projects) along
 * with the per-workflow stats / last terminal run / open alert count needed
 * to build both /workflows/health and /analytics responses. One pass through
 * the data so both endpoints stay consistent.
 */
async function loadUserWorkflowSnapshot(userId: string): Promise<{
  projects: ProjectRecord[];
  rows: Array<{
    project: ProjectRecord;
    workflow: WorkflowRecord;
    runStats: Awaited<ReturnType<typeof getWorkflowRunStats>>;
    last: Awaited<ReturnType<typeof getWorkflowLastTerminalRun>>;
    openAlerts: number;
  }>;
}> {
  const projects = await listProjectsByUserId(userId);

  const perProject = await Promise.all(
    projects.map(async (project) => {
      const workflows = await listWorkflowsByProjectId(project.id);
      const enriched = await Promise.all(
        workflows.map(async (workflow) => {
          const [runStats, last, openAlerts] = await Promise.all([
            getWorkflowRunStats(workflow.id),
            getWorkflowLastTerminalRun(workflow.id),
            countOpenWorkflowAlertsByWorkflowId(workflow.id)
          ]);
          return { project, workflow, runStats, last, openAlerts };
        })
      );
      return enriched;
    })
  );

  return { projects, rows: perProject.flat() };
}

/* ============================================================
   GET /service/projects/:userUuid/workflows/health
   Per-workflow view across ALL of a user's projects.
   ============================================================ */

serviceRoutes.get("/projects/:userUuid/workflows/health", async (c) => {
  const userUuid = c.req.param("userUuid");
  if (!userUuid) {
    throw new AppError(400, "BAD_REQUEST", "userUuid is required.");
  }

  const user = await getUserById(userUuid);
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found.");
  }

  const snapshot = await loadUserWorkflowSnapshot(user.id);

  const workflows = await Promise.all(
    snapshot.rows.map(async ({ project, workflow, runStats, last, openAlerts }) => {
      const recentEvents = await listRecentTerminalEventsByWorkflowId(
        workflow.id,
        RECENT_EXECUTIONS_PER_WORKFLOW
      );

      const lastRunStatus = classifyRunStatus(last.eventType);
      const status = classifyWorkflowHealth({
        lifecycleStatus: workflow.status,
        lastRunStatus,
        openAlerts
      });

      return {
        workflow_id: workflow.id,
        n8n_workflow_id: workflow.n8n_workflow_id,
        name: readWorkflowName(workflow),
        project_id: project.id,
        project_name: project.name,
        category: deriveCategory(workflow),
        lifecycle_status: workflow.status,
        status,
        active: workflow.status === "deployed_active",
        has_webhook: isWebhookTriggered(workflow),
        last_run_at: last.createdAt ? last.createdAt.toISOString() : null,
        last_run_status: lastRunStatus,
        last_error_summary: summarizeError(last.errorMessage),
        last_deployed_at: workflow.last_deployed_at
          ? workflow.last_deployed_at.toISOString()
          : null,
        last_activated_at: workflow.last_activated_at
          ? workflow.last_activated_at.toISOString()
          : null,
        open_alerts_count: openAlerts,
        total_runs: runStats.totalRuns,
        success_runs: runStats.successRuns,
        failed_runs: runStats.failedRuns,
        success_rate: Number(runStats.successRate.toFixed(2)),
        failure_rate:
          runStats.totalRuns > 0
            ? Number((100 - runStats.successRate).toFixed(2))
            : 0,
        average_duration_ms: Math.round(runStats.averageDurationMs),
        created_at: workflow.created_at.toISOString(),
        updated_at: workflow.updated_at.toISOString(),
        recent_executions: recentEvents.map((event) => ({
          execution_id: event.run_id,
          status: classifyRunStatus(event.event_type),
          started_at: event.created_at.toISOString(),
          duration_ms: event.duration_ms,
          error_summary: summarizeError(event.error_message)
        }))
      };
    })
  );

  return c.json({
    user: {
      uuid: user.id,
      email: user.email,
      name: user.name
    },
    workflows,
    count: workflows.length,
    generated_at: new Date().toISOString()
  });
});

/* ============================================================
   GET /service/projects/:userUuid/analytics
   Full tenant dashboard payload.
   ============================================================ */

serviceRoutes.get("/projects/:userUuid/analytics", async (c) => {
  const userUuid = c.req.param("userUuid");
  if (!userUuid) {
    throw new AppError(400, "BAD_REQUEST", "userUuid is required.");
  }

  const user = await getUserById(userUuid);
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found.");
  }

  const [{ projects, rows }, recentEventsAcrossUser] = await Promise.all([
    loadUserWorkflowSnapshot(user.id),
    listUserRecentTerminalEvents(user.id, RECENT_EXECUTIONS_GLOBAL)
  ]);

  let totalRuns = 0;
  let successRuns = 0;
  let failedRuns = 0;
  let weightedDurationMs = 0;
  let unresolvedAlerts = 0;
  let activeWorkflows = 0;
  let inactiveWorkflows = 0;
  let healthyWorkflows = 0;
  let warningWorkflows = 0;
  let failingWorkflows = 0;
  let lastActivityAt: Date | null = null;

  const categoryCounts: Record<string, number> = {};
  const workflowsHealth: Array<{
    workflow_id: string;
    project_id: string;
    project_name: string;
    name: string;
    category: string;
    status: WorkflowHealthLabel;
    lifecycle_status: WorkflowRecord["status"];
    active: boolean;
    is_working: boolean;
    last_run_at: string | null;
    last_run_status: RunStatus;
    last_error_summary: string | null;
    total_runs: number;
    failed_runs: number;
    success_runs: number;
    success_rate: number;
    average_duration_ms: number;
    unresolved_alerts: number;
  }> = [];

  // Per-project aggregates ("automations[]" in the response).
  const projectAggregates = new Map<
    string,
    {
      project: ProjectRecord;
      workflow_count: number;
      active_workflow_count: number;
      total_runs: number;
      success_runs: number;
      failed_runs: number;
      unresolved_alerts: number;
      last_run_at: Date | null;
      last_run_status: RunStatus;
    }
  >();
  for (const project of projects) {
    projectAggregates.set(project.id, {
      project,
      workflow_count: 0,
      active_workflow_count: 0,
      total_runs: 0,
      success_runs: 0,
      failed_runs: 0,
      unresolved_alerts: 0,
      last_run_at: null,
      last_run_status: "unknown"
    });
  }

  for (const { project, workflow, runStats, last, openAlerts } of rows) {
    const lastRunStatus = classifyRunStatus(last.eventType);
    const category = deriveCategory(workflow);
    const status = classifyWorkflowHealth({
      lifecycleStatus: workflow.status,
      lastRunStatus,
      openAlerts
    });
    const isActive = workflow.status === "deployed_active";

    totalRuns += runStats.totalRuns;
    successRuns += runStats.successRuns;
    failedRuns += runStats.failedRuns;
    weightedDurationMs += runStats.averageDurationMs * runStats.totalRuns;
    unresolvedAlerts += openAlerts;
    if (isActive) {
      activeWorkflows += 1;
    } else {
      inactiveWorkflows += 1;
    }
    if (status === "healthy") healthyWorkflows += 1;
    else if (status === "warning") warningWorkflows += 1;
    else failingWorkflows += 1;

    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;

    if (last.createdAt && (!lastActivityAt || last.createdAt > lastActivityAt)) {
      lastActivityAt = last.createdAt;
    }

    const projAgg = projectAggregates.get(project.id);
    if (projAgg) {
      projAgg.workflow_count += 1;
      if (isActive) projAgg.active_workflow_count += 1;
      projAgg.total_runs += runStats.totalRuns;
      projAgg.success_runs += runStats.successRuns;
      projAgg.failed_runs += runStats.failedRuns;
      projAgg.unresolved_alerts += openAlerts;
      if (last.createdAt && (!projAgg.last_run_at || last.createdAt > projAgg.last_run_at)) {
        projAgg.last_run_at = last.createdAt;
        projAgg.last_run_status = lastRunStatus;
      }
    }

    workflowsHealth.push({
      workflow_id: workflow.id,
      project_id: project.id,
      project_name: project.name,
      name: readWorkflowName(workflow),
      category,
      status,
      lifecycle_status: workflow.status,
      active: isActive,
      is_working: lastRunStatus !== "failure" && openAlerts === 0,
      last_run_at: last.createdAt ? last.createdAt.toISOString() : null,
      last_run_status: lastRunStatus,
      last_error_summary: summarizeError(last.errorMessage),
      total_runs: runStats.totalRuns,
      failed_runs: runStats.failedRuns,
      success_runs: runStats.successRuns,
      success_rate: Number(runStats.successRate.toFixed(2)),
      average_duration_ms: Math.round(runStats.averageDurationMs),
      unresolved_alerts: openAlerts
    });
  }

  const totalWorkflows = rows.length;
  const successRate = totalRuns > 0 ? (successRuns / totalRuns) * 100 : 0;
  const averageDurationMs = totalRuns > 0 ? weightedDurationMs / totalRuns : 0;
  const hoursSaved = (successRuns * MANUAL_MINUTES_PER_SUCCESSFUL_RUN) / 60;

  const automations = Array.from(projectAggregates.values())
    .map((agg) => {
      const projSuccessRate =
        agg.total_runs > 0 ? (agg.success_runs / agg.total_runs) * 100 : 0;
      return {
        project_id: agg.project.id,
        name: agg.project.name,
        description: agg.project.description,
        status: agg.project.status,
        workflow_count: agg.workflow_count,
        active_workflow_count: agg.active_workflow_count,
        total_runs: agg.total_runs,
        success_runs: agg.success_runs,
        failed_runs: agg.failed_runs,
        success_rate: Number(projSuccessRate.toFixed(2)),
        unresolved_alerts: agg.unresolved_alerts,
        last_run_at: agg.last_run_at ? agg.last_run_at.toISOString() : null,
        last_run_status: agg.last_run_status,
        created_at: agg.project.created_at.toISOString(),
        updated_at: agg.project.updated_at.toISOString()
      };
    })
    .sort((a, b) => {
      const aTs = a.last_run_at ? Date.parse(a.last_run_at) : 0;
      const bTs = b.last_run_at ? Date.parse(b.last_run_at) : 0;
      return bTs - aTs;
    });

  const categoryBreakdown = Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, workflow_count: count }))
    .sort((a, b) => b.workflow_count - a.workflow_count);

  const recentExecutions = recentEventsAcrossUser.map((event) => ({
    execution_id: event.run_id,
    workflow_id: event.workflow_id,
    project_id: event.project_id,
    status: classifyRunStatus(event.event_type),
    started_at: event.created_at.toISOString(),
    duration_ms: event.duration_ms,
    error_summary: summarizeError(event.error_message)
  }));

  return c.json({
    user: {
      uuid: user.id,
      email: user.email,
      name: user.name
    },
    overview: {
      total_projects: projects.length,
      total_workflows: totalWorkflows,
      active_workflows: activeWorkflows,
      inactive_workflows: inactiveWorkflows,
      total_runs: totalRuns,
      success_runs: successRuns,
      failed_runs: failedRuns,
      success_rate: Number(successRate.toFixed(2)),
      failure_rate:
        totalRuns > 0 ? Number((100 - successRate).toFixed(2)) : 0,
      average_duration_ms: Math.round(averageDurationMs),
      hours_saved: Number(hoursSaved.toFixed(2)),
      unresolved_alerts: unresolvedAlerts,
      healthy_workflows: healthyWorkflows,
      warning_workflows: warningWorkflows,
      failing_workflows: failingWorkflows,
      last_activity_at: lastActivityAt ? lastActivityAt.toISOString() : null
    },
    automations,
    workflows_health: workflowsHealth,
    recent_executions: recentExecutions,
    category_breakdown: categoryBreakdown,
    assumptions: {
      manual_minutes_per_successful_run: MANUAL_MINUTES_PER_SUCCESSFUL_RUN
    },
    generated_at: new Date().toISOString()
  });
});

export default serviceRoutes;
