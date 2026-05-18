import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { logError, logInfo, logWarn } from "../../lib/logger";
import { redactSecrets } from "../../lib/redact";
import {
  countWorkflowFailuresSince,
  createWorkflowEvent
} from "../events/event-repository";
import {
  getN8nExecutionById,
  getN8nWorkflowById,
  listN8nExecutions,
  type N8nExecutionDetails,
  type N8nExecutionSummary
} from "../n8n/n8n-client";
import { getProjectById, getProjectByIdForUser } from "../projects/project-repository";
import { getRequestContext } from "../../lib/request-context";
import { extractNodeTelemetry } from "./telemetry-extractor";
import {
  detectContinueOnFail,
  detectDurationAnomaly,
  detectZeroOutput,
  evaluateScheduleDrift,
  type AnomalyRecord
} from "./anomaly-detectors";
import {
  persistNodeTelemetry,
  getRecentItemsOutBaselineByNode,
  getExecutionDurationBaseline
} from "./execution-node-stats-repository";
import { persistAnomalies } from "./execution-anomaly-repository";
import {
  listOverdueSchedules,
  recordObservedRun,
  updateSchedulerStatus
} from "./workflow-schedule-repository";

/**
 * Tenant-aware project loader for monitoring helpers.
 *
 *  - In an auth context (user-facing route): require ownership; return 404 on
 *    miss so a cross-tenant id doesn't leak as 403.
 *  - With no context (background scheduler): allow any project — the scheduler
 *    iterates every workflow regardless of owner.
 */
async function loadProjectForCallSite(projectId: string) {
  const ctx = getRequestContext();
  const project = ctx
    ? await getProjectByIdForUser(projectId, ctx.userId)
    : await getProjectById(projectId);
  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found.");
  }
  return project;
}
import {
  getLatestWorkflowByProjectId,
  listWorkflowsWithN8nWorkflowId
} from "../workflows/workflow-repository";
import { classifyExecutionError, type MonitoringErrorClassification } from "./error-classifier";
import {
  cleanupOldWorkflowHealthSnapshots,
  createWorkflowHealthSnapshot,
  getLatestWorkflowHealthSnapshot,
  resolveOpenWorkflowAlerts,
  upsertWorkflowAlert
} from "./workflow-health-repository";
import type {
  HealthStatus,
  N8nNode,
  WorkflowRecord
} from "../../types/workflow";

interface ExecutionView {
  id: string;
  status: string;
  started_at: string | null;
  stopped_at: string | null;
  mode: string | null;
  duration_ms: number | null;
  failed_node: string | null;
  error_type: string | null;
  error_message: string | null;
  recommended_action: string | null;
}

interface HealthErrorView {
  execution_id: string | null;
  failed_node: string | null;
  error_type: string | null;
  severity: "low" | "medium" | "high" | null;
  human_message: string | null;
  raw_message: string | null;
}

export interface ProjectWorkflowHealthResponse {
  project_id: string;
  workflow_id: string | null;
  n8n_workflow_id: string | null;
  n8n_workflow_url: string | null;
  workflow_name: string | null;
  active: boolean;
  health_status: HealthStatus;
  last_success_at: string | null;
  last_failure_at: string | null;
  recent_success_count: number;
  recent_failure_count: number;
  last_error: HealthErrorView | null;
  recommended_action: string | null;
  message: string | null;
  executions: ExecutionView[];
  last_checked_at: string;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildN8nWorkflowUrl(workflowId: string | null): string | null {
  if (!workflowId) {
    return null;
  }
  const apiBase = env.N8N_BASE_URL.replace(/\/+$/, "");
  const dashboardBase = apiBase.replace(/\/api\/v\d+$/i, "");
  return `${dashboardBase}/workflow/${encodeURIComponent(workflowId)}`;
}

function toDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isFailureStatus(status: string): boolean {
  return ["error", "failed", "crashed", "failure"].includes(status.toLowerCase());
}

function isSuccessStatus(status: string): boolean {
  return ["success", "succeeded"].includes(status.toLowerCase());
}

function safeMessage(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    const clean = value.trim();
    if (!clean) {
      return null;
    }
    return String(redactSecrets(clean)).slice(0, 4000);
  }
  try {
    const serialized = JSON.stringify(redactSecrets(value));
    return serialized.slice(0, 4000);
  } catch {
    return String(value).slice(0, 4000);
  }
}

function parseFailedNodeAndMessage(detail: N8nExecutionDetails): {
  failedNode: string | null;
  errorMessage: string | null;
  rawError: unknown;
} {
  const payload = (detail.data && typeof detail.data === "object"
    ? (detail.data as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const resultData = (detail.resultData && typeof detail.resultData === "object"
    ? (detail.resultData as Record<string, unknown>)
    : (payload.resultData && typeof payload.resultData === "object"
      ? (payload.resultData as Record<string, unknown>)
      : {})) as Record<string, unknown>;

  const errorObj =
    resultData.error && typeof resultData.error === "object"
      ? (resultData.error as Record<string, unknown>)
      : (detail.error && typeof detail.error === "object"
        ? (detail.error as Record<string, unknown>)
        : null);

  let failedNode =
    typeof resultData.lastNodeExecuted === "string" ? resultData.lastNodeExecuted : null;

  if (!failedNode && errorObj && typeof errorObj.node === "object" && errorObj.node) {
    const nodeObj = errorObj.node as Record<string, unknown>;
    if (typeof nodeObj.name === "string") {
      failedNode = nodeObj.name;
    }
  }

  const runData =
    resultData.runData && typeof resultData.runData === "object"
      ? (resultData.runData as Record<string, unknown>)
      : {};

  for (const [nodeName, nodeRuns] of Object.entries(runData)) {
    if (!Array.isArray(nodeRuns)) {
      continue;
    }
    for (const run of nodeRuns) {
      if (!run || typeof run !== "object") {
        continue;
      }
      const runObj = run as Record<string, unknown>;
      if (runObj.error) {
        failedNode = failedNode ?? nodeName;
        const runMessage = safeMessage(runObj.error);
        if (runMessage) {
          return {
            failedNode,
            errorMessage: runMessage,
            rawError: runObj.error
          };
        }
      }
    }
  }

  const message =
    safeMessage(errorObj?.message) ??
    safeMessage(errorObj) ??
    safeMessage(detail.error) ??
    safeMessage(payload.error) ??
    safeMessage(payload.message);

  return {
    failedNode,
    errorMessage: message,
    rawError: errorObj ?? detail.error
  };
}

function computeDurationMs(startedAt: string | null, stoppedAt: string | null): number | null {
  const start = toDate(startedAt);
  const stop = toDate(stoppedAt);
  if (!start || !stop) {
    return null;
  }
  const value = stop.getTime() - start.getTime();
  return value >= 0 ? value : null;
}

async function buildExecutionView(
  execution: N8nExecutionSummary,
  workflowNodes: N8nNode[],
  options?: { includeFailureDetails?: boolean }
): Promise<{
  execution: ExecutionView;
  classification: MonitoringErrorClassification | null;
  rawErrorMessage: string | null;
}> {
  let failedNode: string | null = null;
  let errorMessage: string | null = null;
  let classification: MonitoringErrorClassification | null = null;

  const status = execution.status || "unknown";
  const shouldInspectDetails = isFailureStatus(status) && Boolean(options?.includeFailureDetails);
  if (shouldInspectDetails) {
    try {
      const details = await getN8nExecutionById(execution.id, { includeData: true });
      const parsed = parseFailedNodeAndMessage(details);
      failedNode = parsed.failedNode;
      errorMessage = parsed.errorMessage;
      classification = classifyExecutionError({
        executionError: parsed.rawError ?? parsed.errorMessage,
        failedNodeName: failedNode,
        workflowNodes,
        executionStatus: status
      });
    } catch (error) {
      errorMessage = safeMessage(error);
      classification = classifyExecutionError({
        executionError: errorMessage,
        failedNodeName: null,
        workflowNodes,
        executionStatus: status
      });
    }
  }

  return {
    execution: {
      id: execution.id,
      status,
      started_at: execution.startedAt,
      stopped_at: execution.stoppedAt,
      mode: execution.mode,
      duration_ms: computeDurationMs(execution.startedAt, execution.stoppedAt),
      failed_node: failedNode,
      error_type: classification?.error_type ?? null,
      error_message: errorMessage,
      recommended_action: classification?.recommended_action ?? null
    },
    classification,
    rawErrorMessage: errorMessage
  };
}

async function emitMonitoringEvent(input: {
  workflowId: string;
  eventType:
    | "workflow_deployed"
    | "workflow_activated"
    | "workflow_deactivated"
    | "workflow_deleted"
    | "workflow_execution_success"
    | "workflow_execution_failed"
    | "workflow_health_warning"
    | "workflow_health_failing"
    | "workflow_alert_created"
    | "workflow_alert_resolved";
  status?: "success" | "failure" | "info";
  message?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await createWorkflowEvent({
      workflowId: input.workflowId,
      runId: null,
      nodeName: null,
      eventType: input.eventType,
      status: input.status ?? "info",
      durationMs: null,
      errorMessage: input.message ?? null,
      metadata: input.metadata ?? null
    });
  } catch (error) {
    logWarn("monitoring", "Failed to emit monitoring event", {
      workflow_id: input.workflowId,
      event_type: input.eventType,
      error: safeMessage(error)
    });
  }
}

function buildAlertFingerprint(input: {
  projectId: string;
  workflowId: string;
  errorType: string;
  failedNode: string | null;
}): string {
  return `${input.projectId}:${input.workflowId}:${input.errorType}:${input.failedNode ?? "none"}`;
}

async function maybeCreateOrResolveAlerts(input: {
  projectId: string;
  workflow: WorkflowRecord;
  healthStatus: HealthStatus;
  classification: MonitoringErrorClassification | null;
  failedNode: string | null;
  message: string | null;
  recommendedAction: string | null;
  recentFailureCount: number;
  latestExecutionStatus: string | null;
}): Promise<void> {
  const shouldResolve =
    input.healthStatus === "healthy" ||
    (input.latestExecutionStatus !== null && isSuccessStatus(input.latestExecutionStatus));

  if (shouldResolve) {
    const resolvedCount = await resolveOpenWorkflowAlerts(input.workflow.id);
    if (resolvedCount > 0) {
      await emitMonitoringEvent({
        workflowId: input.workflow.id,
        eventType: "workflow_alert_resolved",
        status: "success",
        message: "Workflow recovered and open alerts were resolved.",
        metadata: { resolved_count: resolvedCount }
      });
    }
    return;
  }

  const alertCandidates: Array<{
    alertType: string;
    severity: "low" | "medium" | "high";
    message: string;
    recommendedAction: string | null;
    failedNode: string | null;
  }> = [];

  if (input.healthStatus === "failing" && input.classification) {
    alertCandidates.push({
      alertType: input.classification.error_type,
      severity: input.classification.severity,
      message: input.message ?? input.classification.human_message,
      recommendedAction: input.recommendedAction ?? input.classification.recommended_action,
      failedNode: input.failedNode
    });
  }

  const missingInN8n =
    input.healthStatus === "failing" &&
    !input.classification &&
    (input.message ?? "").toLowerCase().includes("no longer exists in n8n");

  if (missingInN8n) {
    alertCandidates.push({
      alertType: "workflow_missing_in_n8n",
      severity: "high",
      message: "Workflow no longer exists in n8n.",
      recommendedAction: "Workflow no longer exists in n8n. Redeploy it.",
      failedNode: null
    });
  }

  if (input.healthStatus === "failing" && !input.classification && !missingInN8n) {
    alertCandidates.push({
      alertType: "workflow_execution_failed",
      severity: "high",
      message: input.message ?? "Latest workflow execution failed.",
      recommendedAction:
        input.recommendedAction ?? "Open the failed execution in n8n and inspect the failed node.",
      failedNode: input.failedNode
    });
  }

  if (input.healthStatus === "inactive") {
    alertCandidates.push({
      alertType: "workflow_inactive",
      severity: "medium",
      message: "Workflow is deployed but inactive.",
      recommendedAction:
        "Workflow is deployed but inactive. Activate it after resolving credentials and validation.",
      failedNode: null
    });
  }

  // Time-windowed failure threshold. The legacy condition was
  // `recentFailureCount >= ALERT_FAILURE_THRESHOLD` over the last 20 executions —
  // a hourly workflow and a daily workflow with identical thresholds would
  // alert across wildly different real-time windows. The new condition
  // requires the failures to actually be recent (default 1 hour) AND meet the
  // count threshold. Falls back to the old "recent" count if the time query
  // fails (defensive: never silence the alert).
  let timeWindowedFailures = input.recentFailureCount;
  try {
    timeWindowedFailures = await countWorkflowFailuresSince(
      input.workflow.id,
      Date.now() - env.ALERT_FAILURE_WINDOW_SECONDS * 1000
    );
  } catch {
    // keep legacy count
  }
  if (timeWindowedFailures >= env.ALERT_FAILURE_THRESHOLD) {
    alertCandidates.push({
      alertType: "repeated_failures",
      severity: "high",
      message: `Workflow has ${timeWindowedFailures} failures in the last ${Math.round(env.ALERT_FAILURE_WINDOW_SECONDS / 60)} minute(s).`,
      recommendedAction: "Investigate failed executions, fix root cause, and redeploy if needed.",
      failedNode: input.failedNode
    });
  }

  for (const candidate of alertCandidates) {
    const fingerprint = buildAlertFingerprint({
      projectId: input.projectId,
      workflowId: input.workflow.id,
      errorType: candidate.alertType,
      failedNode: candidate.failedNode
    });
    const upserted = await upsertWorkflowAlert({
      projectId: input.projectId,
      workflowId: input.workflow.id,
      n8nWorkflowId: input.workflow.n8n_workflow_id,
      alertType: candidate.alertType,
      severity: candidate.severity,
      message: candidate.message,
      recommendedAction: candidate.recommendedAction,
      fingerprint,
      failedNode: candidate.failedNode
    });

    if (upserted.created) {
      await emitMonitoringEvent({
        workflowId: input.workflow.id,
        eventType: "workflow_alert_created",
        status: "failure",
        message: candidate.message,
        metadata: {
          alert_type: candidate.alertType,
          severity: candidate.severity,
          recommended_action: candidate.recommendedAction,
          failed_node: candidate.failedNode
        }
      });
    }
  }
}

function sortExecutionsNewestFirst(executions: N8nExecutionSummary[]): N8nExecutionSummary[] {
  return [...executions].sort((a, b) => {
    const ad = toDate(a.startedAt ?? a.stoppedAt ?? null)?.getTime() ?? 0;
    const bd = toDate(b.startedAt ?? b.stoppedAt ?? null)?.getTime() ?? 0;
    return bd - ad;
  });
}

async function buildNotDeployedHealth(projectId: string, workflow: WorkflowRecord | null): Promise<ProjectWorkflowHealthResponse> {
  return {
    project_id: projectId,
    workflow_id: workflow?.id ?? null,
    n8n_workflow_id: null,
    n8n_workflow_url: null,
    workflow_name: null,
    active: false,
    health_status: "unknown",
    last_success_at: null,
    last_failure_at: null,
    recent_success_count: 0,
    recent_failure_count: 0,
    last_error: null,
    recommended_action: "Deploy and activate workflow to start monitoring.",
    message: "Workflow has not been deployed yet.",
    executions: [],
    last_checked_at: new Date().toISOString()
  };
}

export async function getWorkflowHealth(
  projectId: string,
  options?: { forceRefresh?: boolean; executionLimit?: number; status?: string }
): Promise<ProjectWorkflowHealthResponse> {
  await loadProjectForCallSite(projectId);

  const workflow = await getLatestWorkflowByProjectId(projectId);
  if (!workflow) {
    return buildNotDeployedHealth(projectId, null);
  }

  if (!workflow.n8n_workflow_id) {
    return buildNotDeployedHealth(projectId, workflow);
  }

  const previousSnapshot = await getLatestWorkflowHealthSnapshot(workflow.id);
  let n8nWorkflow: Awaited<ReturnType<typeof getN8nWorkflowById>> | null = null;
  let executions: N8nExecutionSummary[] = [];
  let healthStatus: HealthStatus = "unknown";
  let recommendedAction: string | null = null;
  let message: string | null = null;
  let n8nErrorSummary: string | null = null;
  let active = false;
  let latestError: HealthErrorView | null = null;

  try {
    n8nWorkflow = await getN8nWorkflowById(workflow.n8n_workflow_id);
    active = Boolean(n8nWorkflow.active);
  } catch (error) {
    if (error instanceof AppError && error.code === "N8N_WORKFLOW_NOT_FOUND") {
      healthStatus = "failing";
      recommendedAction = "Workflow no longer exists in n8n. Redeploy it.";
      message = "Workflow no longer exists in n8n.";
      n8nErrorSummary = safeMessage(error);
    } else {
      healthStatus = "unknown";
      recommendedAction = "Could not fetch workflow from n8n. Verify n8n API connectivity and retry.";
      message = "n8n API request failed while loading workflow.";
      n8nErrorSummary = safeMessage(error);
    }
  }

  let executionsFetchFailed = false;
  if (n8nWorkflow) {
    try {
      executions = await listN8nExecutions({
        workflowId: workflow.n8n_workflow_id,
        limit: options?.executionLimit ?? env.MONITORING_EXECUTION_LIMIT,
        status: options?.status
      });
    } catch (error) {
      executionsFetchFailed = true;
      if (options?.status) {
        logWarn("monitoring", "Execution list with status filter failed; retrying without filter", {
          project_id: projectId,
          workflow_id: workflow.id,
          status_filter: options.status,
          error: safeMessage(error)
        });
        try {
          executions = await listN8nExecutions({
            workflowId: workflow.n8n_workflow_id,
            limit: options?.executionLimit ?? env.MONITORING_EXECUTION_LIMIT
          });
          executionsFetchFailed = false;
        } catch (retryError) {
          executionsFetchFailed = true;
          n8nErrorSummary = safeMessage(retryError) ?? safeMessage(error);
        }
      } else {
        n8nErrorSummary = safeMessage(error);
      }
    }
  }

  const sortedExecutions = sortExecutionsNewestFirst(executions);
  const executionViews: ExecutionView[] = [];
  const workflowNodes = Array.isArray(n8nWorkflow?.nodes)
    ? (n8nWorkflow!.nodes as unknown as N8nNode[])
    : [];

  let latestFailureClassification: MonitoringErrorClassification | null = null;
  let latestFailureNode: string | null = null;
  let latestFailureMessage: string | null = null;
  let failureDetailsBudget = 1;

  for (const execution of sortedExecutions) {
    const includeFailureDetails =
      isFailureStatus(execution.status || "unknown") && failureDetailsBudget > 0;
    if (includeFailureDetails) {
      failureDetailsBudget -= 1;
    }

    const enriched = await buildExecutionView(execution, workflowNodes, {
      includeFailureDetails
    });
    executionViews.push(enriched.execution);

    if (!latestFailureClassification && isFailureStatus(enriched.execution.status)) {
      latestFailureClassification = enriched.classification;
      latestFailureNode = enriched.execution.failed_node;
      latestFailureMessage = enriched.rawErrorMessage;
    }
  }

  const recentSuccessCount = executionViews.filter((item) => isSuccessStatus(item.status)).length;
  const recentFailureCount = executionViews.filter((item) => isFailureStatus(item.status)).length;
  const lastSuccess = executionViews.find((item) => isSuccessStatus(item.status));
  const lastFailure = executionViews.find((item) => isFailureStatus(item.status));
  const latestExecution = executionViews[0] ?? null;

  if (!n8nWorkflow) {
    // keep values from n8n fetch error handling
  } else if (executionsFetchFailed) {
    healthStatus = "unknown";
    recommendedAction = "Could not fetch execution history from n8n. Verify n8n API connectivity and retry.";
    message = "n8n API request failed while loading executions.";
  } else if (!active) {
    healthStatus = "inactive";
    recommendedAction =
      "Workflow is deployed but inactive. Activate it after resolving credentials and validation.";
    message = "Workflow is deployed but inactive.";
  } else if (executionViews.length === 0) {
    healthStatus = "warning";
    recommendedAction =
      "Workflow is active but has no executions yet. Trigger it manually or wait for the trigger condition.";
    message = "Workflow is active but has no executions yet.";
  } else if (recentFailureCount > 0) {
    if (latestExecution && isFailureStatus(latestExecution.status)) {
      healthStatus = "failing";
      message = "Latest execution failed.";
    } else {
      healthStatus = "warning";
      message = "Some recent executions failed but workflow also has successful runs.";
    }
    recommendedAction =
      latestFailureClassification?.recommended_action ??
      "Open the failed execution in n8n and inspect the failed node.";
  } else {
    healthStatus = "healthy";
    recommendedAction = null;
    message = "Everything looks good. The workflow is active and recent executions are successful.";
  }

  if (latestFailureClassification || latestFailureMessage) {
    latestError = {
      execution_id: lastFailure?.id ?? null,
      failed_node: latestFailureNode,
      error_type: latestFailureClassification?.error_type ?? null,
      severity: latestFailureClassification?.severity ?? null,
      human_message: latestFailureClassification?.human_message ?? null,
      raw_message: latestFailureMessage
    };
  }

  const payload: ProjectWorkflowHealthResponse = {
    project_id: projectId,
    workflow_id: workflow.id,
    n8n_workflow_id: workflow.n8n_workflow_id,
    n8n_workflow_url: buildN8nWorkflowUrl(workflow.n8n_workflow_id),
    workflow_name: n8nWorkflow?.name ? String(n8nWorkflow.name) : null,
    active,
    health_status: healthStatus,
    last_success_at: lastSuccess?.stopped_at ?? lastSuccess?.started_at ?? null,
    last_failure_at: lastFailure?.stopped_at ?? lastFailure?.started_at ?? null,
    recent_success_count: recentSuccessCount,
    recent_failure_count: recentFailureCount,
    last_error: latestError,
    recommended_action: recommendedAction,
    message,
    executions: executionViews,
    last_checked_at: new Date().toISOString()
  };

  const snapshot = await createWorkflowHealthSnapshot({
    projectId,
    workflowId: workflow.id,
    n8nWorkflowId: workflow.n8n_workflow_id,
    status: workflow.status,
    active,
    healthStatus,
    lastSuccessAt: toDate(payload.last_success_at),
    lastFailureAt: toDate(payload.last_failure_at),
    recentSuccessCount,
    recentFailureCount,
    lastErrorMessage: latestFailureMessage,
    lastErrorNode: latestFailureNode,
    lastErrorType: latestFailureClassification?.error_type ?? null,
    recommendedAction,
    rawSummaryJson: redactSecrets({
      workflow_status: workflow.status,
      n8n_workflow: n8nWorkflow,
      executions: executionViews,
      n8n_error: n8nErrorSummary
    }) as Record<string, unknown>
  });

  const latestStatus = latestExecution?.status ?? null;
  await maybeCreateOrResolveAlerts({
    projectId,
    workflow,
    healthStatus,
    classification: latestFailureClassification,
    failedNode: latestFailureNode,
    message: latestFailureMessage,
    recommendedAction,
    recentFailureCount,
    latestExecutionStatus: latestStatus
  });

  if (latestExecution && isFailureStatus(latestExecution.status)) {
    await emitMonitoringEvent({
      workflowId: workflow.id,
      eventType: "workflow_execution_failed",
      status: "failure",
      message: latestFailureMessage,
      metadata: {
        execution_id: latestExecution.id,
        failed_node: latestFailureNode,
        error_type: latestFailureClassification?.error_type ?? null,
        recommended_action: recommendedAction
      }
    });
  } else if (latestExecution && isSuccessStatus(latestExecution.status)) {
    await emitMonitoringEvent({
      workflowId: workflow.id,
      eventType: "workflow_execution_success",
      status: "success",
      metadata: {
        execution_id: latestExecution.id
      }
    });
  }

  if (healthStatus === "warning" && previousSnapshot?.health_status !== "warning") {
    await emitMonitoringEvent({
      workflowId: workflow.id,
      eventType: "workflow_health_warning",
      status: "info",
      message
    });
  }

  if (healthStatus === "failing" && previousSnapshot?.health_status !== "failing") {
    await emitMonitoringEvent({
      workflowId: workflow.id,
      eventType: "workflow_health_failing",
      status: "failure",
      message
    });
  }

  // Silent-failure detection pipeline. Fully isolated from the legacy health
  // computation above — if anything here throws, the monitoring cycle still
  // returns the original payload. Reads runData for the LATEST execution only
  // (1 extra n8n call per workflow per cycle, ~1.7 req/s at 500 workflows).
  if (latestExecution && n8nWorkflow) {
    void runSilentFailurePipeline({
      workflowId: workflow.id,
      latestExecution,
      latestExecutionStatus: latestExecution.status,
      latestDurationMs: latestExecution.duration_ms,
      workflowNodes,
      n8nErrorSummary
    });
  }

  return {
    ...payload,
    last_checked_at: snapshot.created_at.toISOString()
  };
}

/**
 * Silent-failure detection — additive pipeline that runs after the legacy
 * health classifier. NEVER awaited from the request path (fire-and-forget),
 * NEVER throws out. Each step is independently try/catched so a parsing
 * issue on one workflow cannot wedge the cycle for the rest.
 *
 * Pipeline:
 *   1. Fetch runData for the latest execution (includeData: true).
 *   2. Extract per-node telemetry via the pure parser.
 *   3. Persist node_stats (batched insert, ON DUPLICATE KEY UPDATE idempotent).
 *   4. Read baselines (per-node items_out mean + execution duration mean/stddev).
 *   5. Run detectors: continue-on-fail, zero-output, duration-z.
 *   6. Persist anomalies (batched insert).
 *   7. Bump schedule tracking (last_seen_run_at) so the drift sweep
 *      can keep the next-run deadline current.
 */
async function runSilentFailurePipeline(input: {
  workflowId: string;
  latestExecution: ExecutionView;
  latestExecutionStatus: string;
  latestDurationMs: number | null;
  workflowNodes: N8nNode[];
  n8nErrorSummary: string | null;
}): Promise<void> {
  const traceCtx = { workflow_id: input.workflowId, execution_id: input.latestExecution.id };
  try {
    let detail: N8nExecutionDetails;
    try {
      detail = await getN8nExecutionById(input.latestExecution.id, { includeData: true });
    } catch (err) {
      logWarn("monitoring", "silent-failure: deep fetch failed; skipping cycle", { ...traceCtx, error: safeMessage(err) });
      return;
    }

    // Build node-name lookup so telemetry rows carry node_type.
    const nodesByName = new Map<string, { type: string | null }>();
    for (const n of input.workflowNodes) {
      if (n && typeof n.name === "string") {
        nodesByName.set(n.name, { type: typeof n.type === "string" ? n.type : null });
      }
    }

    const telemetry = extractNodeTelemetry({
      executionDetail: detail,
      parentExecutionStatus: input.latestExecutionStatus,
      workflowNodesByName: nodesByName
    });
    if (telemetry.length === 0) {
      return;
    }

    try {
      await persistNodeTelemetry({
        workflowId: input.workflowId,
        executionId: input.latestExecution.id,
        telemetry
      });
    } catch (err) {
      logWarn("monitoring", "silent-failure: persist node_stats failed", { ...traceCtx, error: safeMessage(err) });
      // Continue — detectors can still run on in-memory telemetry even if the
      // write failed; baselines just won't include this execution.
    }

    let baselineItemsOut: Map<string, number> = new Map();
    let durationBaseline = { sampleSize: 0, meanMs: 0, stddevMs: 0 };
    try {
      [baselineItemsOut, durationBaseline] = await Promise.all([
        getRecentItemsOutBaselineByNode(input.workflowId, { sampleLimit: 50 }),
        getExecutionDurationBaseline(input.workflowId, { sampleLimit: 50 })
      ]);
    } catch (err) {
      logWarn("monitoring", "silent-failure: baseline query failed", { ...traceCtx, error: safeMessage(err) });
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
          currentDurationMs: input.latestDurationMs,
          baselineMeanMs: durationBaseline.meanMs,
          baselineStddevMs: durationBaseline.stddevMs,
          baselineSampleSize: durationBaseline.sampleSize
        })
      );
    } catch (err) {
      logWarn("monitoring", "silent-failure: detector failure", { ...traceCtx, error: safeMessage(err) });
    }

    if (allAnomalies.length > 0) {
      try {
        await persistAnomalies(allAnomalies);
        logInfo("monitoring", "silent-failure: anomalies persisted", {
          ...traceCtx,
          count: allAnomalies.length,
          types: allAnomalies.map((a) => a.anomaly_type)
        });
      } catch (err) {
        logWarn("monitoring", "silent-failure: persist anomalies failed", { ...traceCtx, error: safeMessage(err) });
      }
    }

    // Schedule observability: any successful or failed execution advances the
    // tracking deadline. Webhook/manual workflows have no row here, so the
    // UPDATE is a harmless no-op for them.
    try {
      const startedAt = input.latestExecution.started_at
        ? new Date(input.latestExecution.started_at)
        : new Date();
      await recordObservedRun(input.workflowId, startedAt);
    } catch (err) {
      logWarn("monitoring", "silent-failure: recordObservedRun failed", { ...traceCtx, error: safeMessage(err) });
    }
  } catch (err) {
    // Hard catch-all so a programmer error in this pipeline still cannot crash
    // the cycle. logError (not Warn) so it shows up in alerting.
    logError("monitoring", "silent-failure: unhandled pipeline error", {
      workflow_id: input.workflowId,
      error: safeMessage(err)
    });
  }
}

/**
 * Schedule-drift sweep. Runs once per monitoring cycle (separate from the
 * per-workflow pipeline because the read pattern is different — a global
 * "what is overdue right now" scan vs per-workflow telemetry).
 */
async function runScheduleDriftSweep(): Promise<{ checked: number; anomalies: number }> {
  let overdue: Awaited<ReturnType<typeof listOverdueSchedules>> = [];
  try {
    overdue = await listOverdueSchedules({ limit: 500 });
  } catch (err) {
    logWarn("monitoring", "schedule-drift: list query failed", { error: safeMessage(err) });
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
      if (evaluation.anomaly) {
        allAnomalies.push(evaluation.anomaly);
      }
      if (evaluation.schedulerStatus !== row.scheduler_status) {
        await updateSchedulerStatus(row.workflow_id, evaluation.schedulerStatus);
      }
    } catch (err) {
      logWarn("monitoring", "schedule-drift: evaluation failed", { workflow_id: row.workflow_id, error: safeMessage(err) });
    }
  }

  if (allAnomalies.length > 0) {
    try {
      await persistAnomalies(allAnomalies);
    } catch (err) {
      logWarn("monitoring", "schedule-drift: persist anomalies failed", { error: safeMessage(err) });
    }
  }

  return { checked: overdue.length, anomalies: allAnomalies.length };
}

export async function refreshWorkflowHealth(projectId: string): Promise<ProjectWorkflowHealthResponse> {
  return getWorkflowHealth(projectId, { forceRefresh: true });
}

export async function getProjectExecutions(
  projectId: string,
  input?: { limit?: number; status?: string }
): Promise<{
  project_id: string;
  workflow_id: string;
  n8n_workflow_id: string;
  executions: ExecutionView[];
}> {
  await loadProjectForCallSite(projectId);

  const workflow = await getLatestWorkflowByProjectId(projectId);
  if (!workflow || !workflow.n8n_workflow_id) {
    throw new AppError(
      400,
      "WORKFLOW_NOT_DEPLOYED",
      "Workflow has not been deployed yet."
    );
  }

  const n8nWorkflow = await getN8nWorkflowById(workflow.n8n_workflow_id);
  let executionList: N8nExecutionSummary[] = [];
  try {
    executionList = await listN8nExecutions({
      workflowId: workflow.n8n_workflow_id,
      limit: input?.limit ?? env.MONITORING_EXECUTION_LIMIT,
      status: input?.status
    });
  } catch (error) {
    if (input?.status) {
      logWarn("monitoring", "Execution list status filter failed; retrying without status", {
        project_id: projectId,
        workflow_id: workflow.id,
        status_filter: input.status,
        error: safeMessage(error)
      });
      executionList = await listN8nExecutions({
        workflowId: workflow.n8n_workflow_id,
        limit: input?.limit ?? env.MONITORING_EXECUTION_LIMIT
      });
    } else {
      throw error;
    }
  }
  const workflowNodes = Array.isArray(n8nWorkflow.nodes)
    ? (n8nWorkflow.nodes as unknown as N8nNode[])
    : [];

  const executions: ExecutionView[] = [];
  let failureDetailsBudget = 3;
  for (const execution of sortExecutionsNewestFirst(executionList)) {
    const includeFailureDetails =
      isFailureStatus(execution.status || "unknown") && failureDetailsBudget > 0;
    if (includeFailureDetails) {
      failureDetailsBudget -= 1;
    }
    const enriched = await buildExecutionView(execution, workflowNodes, {
      includeFailureDetails
    });
    executions.push(enriched.execution);
  }

  return {
    project_id: projectId,
    workflow_id: workflow.id,
    n8n_workflow_id: workflow.n8n_workflow_id,
    executions
  };
}

export async function getProjectExecutionDetails(
  projectId: string,
  executionId: string
): Promise<{
  project_id: string;
  workflow_id: string;
  n8n_workflow_id: string;
  execution: ExecutionView;
  classified_error: MonitoringErrorClassification | null;
  safe_detail: Record<string, unknown> | null;
}> {
  await loadProjectForCallSite(projectId);

  const workflow = await getLatestWorkflowByProjectId(projectId);
  if (!workflow || !workflow.n8n_workflow_id) {
    throw new AppError(400, "WORKFLOW_NOT_DEPLOYED", "Workflow has not been deployed yet.");
  }

  const n8nWorkflow = await getN8nWorkflowById(workflow.n8n_workflow_id);
  const nodes = Array.isArray(n8nWorkflow.nodes)
    ? (n8nWorkflow.nodes as unknown as N8nNode[])
    : [];
  const detail = await getN8nExecutionById(executionId, { includeData: true });

  if (detail.workflowId && String(detail.workflowId) !== String(workflow.n8n_workflow_id)) {
    throw new AppError(404, "EXECUTION_NOT_IN_PROJECT_WORKFLOW", "Execution does not belong to this project workflow.");
  }

  const parsed = parseFailedNodeAndMessage(detail);
  const classification = isFailureStatus(detail.status)
    ? classifyExecutionError({
        executionError: parsed.rawError ?? parsed.errorMessage,
        failedNodeName: parsed.failedNode,
        workflowNodes: nodes,
        executionStatus: detail.status
      })
    : null;

  const execution: ExecutionView = {
    id: detail.id,
    status: detail.status,
    started_at: detail.startedAt,
    stopped_at: detail.stoppedAt,
    mode: detail.mode,
    duration_ms: computeDurationMs(detail.startedAt, detail.stoppedAt),
    failed_node: parsed.failedNode,
    error_type: classification?.error_type ?? null,
    error_message: parsed.errorMessage,
    recommended_action: classification?.recommended_action ?? null
  };

  return {
    project_id: projectId,
    workflow_id: workflow.id,
    n8n_workflow_id: workflow.n8n_workflow_id,
    execution,
    classified_error: classification,
    safe_detail: redactSecrets({
      id: detail.id,
      workflowId: detail.workflowId,
      status: detail.status,
      mode: detail.mode,
      startedAt: detail.startedAt,
      stoppedAt: detail.stoppedAt,
      failed_node: parsed.failedNode,
      resultData: detail.resultData
    }) as Record<string, unknown>
  };
}

export async function refreshAllWorkflowHealths(): Promise<{
  checked: number;
  failures: number;
}> {
  const workflows = await listWorkflowsWithN8nWorkflowId(500);
  let checked = 0;
  let failures = 0;

  for (const workflow of workflows) {
    checked += 1;
    try {
      await getWorkflowHealth(workflow.project_id, {
        executionLimit: env.MONITORING_EXECUTION_LIMIT
      });
    } catch (error) {
      failures += 1;
      logError("monitoring", "Failed to refresh workflow health", {
        workflow_id: workflow.id,
        project_id: workflow.project_id,
        n8n_workflow_id: workflow.n8n_workflow_id,
        error: safeMessage(error)
      });
    }
  }

  return { checked, failures };
}

let monitoringIntervalRef: ReturnType<typeof setInterval> | null = null;
let monitoringCycleRunning = false;

export async function withMonitoringCycleLock<T>(
  task: () => Promise<T>
): Promise<{ skipped: boolean; result: T | null }> {
  if (monitoringCycleRunning) {
    return { skipped: true, result: null };
  }

  monitoringCycleRunning = true;
  try {
    const result = await task();
    return { skipped: false, result };
  } finally {
    monitoringCycleRunning = false;
  }
}

async function runMonitoringCycle(): Promise<{
  checked: number;
  failures: number;
  cleaned_snapshots: number;
  skipped: boolean;
}> {
  const guarded = await withMonitoringCycleLock(async () => {
    const refreshed = await refreshAllWorkflowHealths();
    const cleaned = await cleanupOldWorkflowHealthSnapshots(
      env.MONITORING_SNAPSHOT_RETENTION_DAYS
    );
    // Drift sweep runs AFTER per-workflow refreshes — the latter call
    // recordObservedRun() which advances last_seen_run_at, so the sweep sees
    // an accurate "is this overdue?" picture rather than one polling cycle stale.
    const drift = await runScheduleDriftSweep().catch((err) => {
      logWarn("monitoring", "schedule-drift sweep crashed", { error: safeMessage(err) });
      return { checked: 0, anomalies: 0 };
    });
    return {
      checked: refreshed.checked,
      failures: refreshed.failures,
      cleaned_snapshots: cleaned,
      drift_checked: drift.checked,
      drift_anomalies: drift.anomalies
    };
  });

  if (guarded.skipped || !guarded.result) {
    return {
      checked: 0,
      failures: 0,
      cleaned_snapshots: 0,
      skipped: true
    };
  }

  return {
    ...guarded.result,
    skipped: false
  };
}

export function getMonitoringSchedulerState(): { running: boolean; scheduled: boolean } {
  return {
    running: monitoringCycleRunning,
    scheduled: Boolean(monitoringIntervalRef)
  };
}

export function startMonitoringScheduler(): void {
  if (!env.MONITORING_ENABLED) {
    logInfo("monitoring", "Monitoring scheduler disabled by config.");
    return;
  }

  const intervalMs = env.MONITORING_INTERVAL_SECONDS * 1000;
  if (monitoringIntervalRef) {
    clearInterval(monitoringIntervalRef);
    monitoringIntervalRef = null;
  }

  logInfo("monitoring", "Monitoring scheduler started", {
    interval_seconds: env.MONITORING_INTERVAL_SECONDS,
    execution_limit: env.MONITORING_EXECUTION_LIMIT
  });

  const runCycle = async () => {
    const startedAt = Date.now();
    try {
      const result = await runMonitoringCycle();
      if (result.skipped) {
        logWarn("monitoring", "Monitoring cycle skipped because a previous cycle is still running.");
        return;
      }
      logInfo("monitoring", "Monitoring cycle completed", {
        checked: result.checked,
        failures: result.failures,
        cleaned_snapshots: result.cleaned_snapshots,
        duration_ms: Date.now() - startedAt
      });
    } catch (error) {
      logError("monitoring", "Monitoring cycle crashed", {
        error: safeMessage(error),
        duration_ms: Date.now() - startedAt
      });
    }
  };

  void runCycle();
  monitoringIntervalRef = setInterval(() => {
    void runCycle();
  }, intervalMs);
}
