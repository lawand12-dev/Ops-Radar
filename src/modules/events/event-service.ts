import { z } from "zod";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { analyzeWorkflowFailure } from "../ai/ai-service";
import { createAuditLog } from "../audit/audit-repository";
import { updateProjectStatus } from "../projects/project-repository";
import {
  createWorkflowEvent,
  listRecentEventsByWorkflowId
} from "./event-repository";
import {
  getWorkflowById,
  getWorkflowByN8nWorkflowId,
  updateWorkflowStatus
} from "../workflows/workflow-repository";

const incomingEventSchema = z.object({
  project_id: z.string().uuid().optional(),
  workflow_id: z.string().uuid().optional(),
  n8n_workflow_id: z.string().optional(),
  run_id: z.string().optional(),
  node_name: z.string().optional(),
  event_type: z.enum([
    "run_started",
    "run_succeeded",
    "run_failed",
    "node_started",
    "node_succeeded",
    "node_failed",
    "workflow_created",
    "workflow_validated",
    "workflow_rejected",
    "workflow_deployed",
    "workflow_activated",
    "workflow_deactivated",
    "workflow_deleted",
    "workflow_execution_success",
    "workflow_execution_failed",
    "workflow_health_warning",
    "workflow_health_failing",
    "workflow_alert_created",
    "workflow_alert_resolved"
  ]),
  status: z.enum(["success", "failure", "info"]).optional(),
  severity: z.enum(["low", "medium", "high"]).optional(),
  message: z.string().optional(),
  duration_ms: z.number().int().nonnegative().optional(),
  error_message: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export type IncomingWorkflowEvent = z.infer<typeof incomingEventSchema>;

function deriveStatus(input: IncomingWorkflowEvent): "success" | "failure" | "info" {
  if (input.status) {
    return input.status;
  }

  if (input.event_type === "run_succeeded" || input.event_type === "node_succeeded") {
    return "success";
  }

  if (
    input.event_type === "run_failed" ||
    input.event_type === "node_failed" ||
    input.event_type === "workflow_rejected" ||
    input.event_type === "workflow_execution_failed" ||
    input.event_type === "workflow_health_failing" ||
    input.event_type === "workflow_alert_created"
  ) {
    return "failure";
  }

  if (
    input.event_type === "workflow_execution_success" ||
    input.event_type === "workflow_created" ||
    input.event_type === "workflow_validated" ||
    input.event_type === "workflow_deployed" ||
    input.event_type === "workflow_activated" ||
    input.event_type === "workflow_deactivated" ||
    input.event_type === "workflow_deleted" ||
    input.event_type === "workflow_alert_resolved"
  ) {
    return "success";
  }

  return "info";
}

async function resolveWorkflowRef(input: IncomingWorkflowEvent) {
  if (input.workflow_id) {
    const workflow = await getWorkflowById(input.workflow_id);
    if (workflow) {
      return workflow;
    }
  }

  if (input.n8n_workflow_id) {
    const workflow = await getWorkflowByN8nWorkflowId(input.n8n_workflow_id);
    if (workflow) {
      return workflow;
    }
  }

  throw new AppError(
    404,
    "WORKFLOW_NOT_FOUND",
    "Unable to resolve workflow. Provide workflow_id or n8n_workflow_id."
  );
}

async function processFailureSideEffects(input: {
  workflowId: string;
  runId: string | null;
  errorMessage: string | null;
}) {
  const workflow = await getWorkflowById(input.workflowId);
  if (!workflow) {
    return;
  }

  const recentEvents = await listRecentEventsByWorkflowId(input.workflowId, 15);
  const analysis = await analyzeWorkflowFailure({
    workflowJson: workflow.json,
    errorMessage: input.errorMessage,
    recentEvents: recentEvents.map((event) => ({
      event_type: event.event_type,
      status: event.status,
      run_id: event.run_id,
      node_name: event.node_name,
      duration_ms: event.duration_ms,
      error_message: event.error_message,
      created_at: event.created_at.toISOString()
    }))
  }, { traceId: input.runId ?? undefined });

  await createAuditLog({
    workflowId: input.workflowId,
    runId: input.runId,
    analysis,
    rawInput: {
      error_message: input.errorMessage,
      recent_events: recentEvents
    }
  });
}

export function parseIncomingWorkflowEvent(candidate: unknown): IncomingWorkflowEvent {
  const parsed = incomingEventSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new AppError(400, "BAD_EVENT_PAYLOAD", "Invalid event payload.", parsed.error.issues);
  }

  return parsed.data;
}

export async function ingestWorkflowEvent(input: IncomingWorkflowEvent) {
  const workflow = await resolveWorkflowRef(input);
  const metadata = {
    ...(input.metadata ?? {}),
    ...(input.project_id ? { project_id: input.project_id } : {}),
    ...(input.n8n_workflow_id ? { n8n_workflow_id: input.n8n_workflow_id } : {}),
    ...(input.severity ? { severity: input.severity } : {})
  };

  const event = await createWorkflowEvent({
    workflowId: workflow.id,
    runId: input.run_id ?? null,
    nodeName: input.node_name ?? null,
    eventType: input.event_type,
    status: deriveStatus(input),
    durationMs: input.duration_ms ?? null,
    errorMessage: input.error_message ?? input.message ?? null,
    metadata
  });

  let analysisError: string | null = null;

  if (input.event_type === "run_failed") {
    await updateWorkflowStatus(workflow.id, "failed");
    await updateProjectStatus(workflow.project_id, "failed");
    try {
      await processFailureSideEffects({
        workflowId: workflow.id,
        runId: input.run_id ?? null,
        errorMessage: input.error_message ?? null
      });
    } catch (error) {
      analysisError = error instanceof Error ? error.message : "Unknown analysis error";
    }
  }

  if (input.event_type === "run_succeeded") {
    if (workflow.status === "failed") {
      await updateWorkflowStatus(workflow.id, "deployed_active");
    }
    await updateProjectStatus(workflow.project_id, "active");
  }

  if (input.event_type === "workflow_deactivated") {
    await updateWorkflowStatus(workflow.id, "deployed_inactive");
    await updateProjectStatus(workflow.project_id, "draft");
  }

  if (input.event_type === "workflow_deleted") {
    await updateWorkflowStatus(workflow.id, "validated");
    await updateProjectStatus(workflow.project_id, "draft");
  }

  return {
    accepted: true,
    workflow_id: workflow.id,
    event_id: event.id,
    analysis_error: analysisError
  };
}
