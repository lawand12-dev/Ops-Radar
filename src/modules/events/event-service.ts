import { z } from "zod";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { analyzeWorkflowFailure } from "../ai/ai-service";
import { createAlert, findUnresolvedAlertByType, resolveAlertsForWorkflow } from "../alerts/alert-repository";
import { createAuditLog } from "../audit/audit-repository";
import { updateProjectStatus } from "../projects/project-repository";
import {
  countWorkflowFailures,
  countConsecutiveWorkflowFailures,
  createWorkflowEvent,
  listRecentEventsByWorkflowId
} from "./event-repository";
import {
  getWorkflowById,
  getWorkflowByN8nWorkflowId,
  updateWorkflowStatus
} from "../workflows/workflow-repository";

const incomingEventSchema = z.object({
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
    "node_failed"
  ]),
  status: z.enum(["success", "failure", "info"]).optional(),
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

  if (input.event_type === "run_failed" || input.event_type === "node_failed") {
    return "failure";
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
  const threshold = env.ALERT_FAILURE_THRESHOLD;
  const totalFailures = await countWorkflowFailures(input.workflowId);
  const consecutiveFailures = await countConsecutiveWorkflowFailures(input.workflowId, threshold + 5);

  if (totalFailures > threshold) {
    const existing = await findUnresolvedAlertByType(input.workflowId, "high_failure_rate");
    if (!existing) {
      await createAlert({
        workflowId: input.workflowId,
        type: "high_failure_rate",
        message: `Workflow failures reached ${totalFailures} runs (threshold: ${threshold}).`
      });
    }
  }

  if (consecutiveFailures >= threshold) {
    const existing = await findUnresolvedAlertByType(input.workflowId, "workflow_failure_burst");
    if (!existing) {
      await createAlert({
        workflowId: input.workflowId,
        type: "workflow_failure_burst",
        message: `Workflow failed ${consecutiveFailures} consecutive runs (threshold: ${threshold}).`
      });
    }
  }

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

  const event = await createWorkflowEvent({
    workflowId: workflow.id,
    runId: input.run_id ?? null,
    nodeName: input.node_name ?? null,
    eventType: input.event_type,
    status: deriveStatus(input),
    durationMs: input.duration_ms ?? null,
    errorMessage: input.error_message ?? null,
    metadata: input.metadata ?? null
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
    await resolveAlertsForWorkflow(workflow.id);
    if (workflow.status === "failed") {
      await updateWorkflowStatus(workflow.id, "deployed");
    }
    await updateProjectStatus(workflow.project_id, "active");
  }

  return {
    accepted: true,
    workflow_id: workflow.id,
    event_id: event.id,
    analysis_error: analysisError
  };
}
