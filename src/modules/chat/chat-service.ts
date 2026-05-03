import { withTransaction } from "../../lib/db";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { logInfo, logWarn } from "../../lib/logger";
import { redactSecrets } from "../../lib/redact";
import { generateWorkflowFromMessage } from "../ai/ai-service";
import { createProject } from "../projects/project-repository";
import { createWorkflow } from "../workflows/workflow-repository";
import { createChatMessage, createChatSession } from "./chat-repository";
import { validateWorkflowSecurity } from "../validation/workflow-validator";
import { createWorkflowEvent } from "../events/event-repository";

export interface ChatResult {
  project_id: string;
  session_id: string;
  project_name: string;
  description: string;
  workflow: unknown;
  validation: {
    valid: boolean;
    errors: string[];
  };
  trace_id?: string;
}

export async function handleChatMessage(
  message: string,
  input?: { traceId?: string }
): Promise<ChatResult> {
  const traceId = input?.traceId;
  const logProgress = env.LOG_CHAT_PROGRESS;

  if (logProgress) {
    logInfo("chat", "Received chat request", { message_length: message.length }, traceId);
  }
  if (!message.trim()) {
    throw new AppError(400, "INVALID_MESSAGE", "Message must not be empty.");
  }

  const aiOutput = await generateWorkflowFromMessage(message, { traceId });
  if (logProgress) {
    logInfo(
      "chat",
      "AI workflow payload generated",
      {
        project_name: aiOutput.project_name,
        node_count: aiOutput.workflow.nodes.length
      },
      traceId
    );
  }

  const validation = validateWorkflowSecurity(aiOutput.workflow);
  const workflowStatus = validation.valid ? "validated" : "rejected";
  const workflowToPersist = validation.valid ? aiOutput.workflow : redactSecrets(aiOutput.workflow);
  if (logProgress) {
    if (!validation.valid) {
      logWarn("chat", "Workflow security validation failed", { errors: validation.errors }, traceId);
    } else {
      logInfo("chat", "Workflow security validation passed", undefined, traceId);
    }
  }

  const result = await withTransaction(async (connection) => {
    if (logProgress) {
      logInfo("chat", "DB transaction started", undefined, traceId);
    }
    const project = await createProject(
      {
        name: aiOutput.project_name,
        description: aiOutput.description,
        status: "draft"
      },
      connection
    );

    if (logProgress) {
      logInfo("chat", "Project created", { project_id: project.id }, traceId);
    }

    const session = await createChatSession(project.id, connection);
    if (logProgress) {
      logInfo("chat", "Chat session created", { session_id: session.id }, traceId);
    }

    await createChatMessage(
      {
        sessionId: session.id,
        role: "user",
        content: message
      },
      connection
    );

    const workflow = await createWorkflow(
      {
        projectId: project.id,
        json: workflowToPersist,
        status: workflowStatus,
        validationErrors: validation.valid ? null : validation.errors
      },
      connection
    );
    if (logProgress) {
      logInfo("chat", "Workflow saved", { workflow_id: workflow.id, status: workflow.status }, traceId);
    }

    await createWorkflowEvent(
      {
        workflowId: workflow.id,
        runId: null,
        nodeName: null,
        eventType: "workflow_created",
        status: "info",
        durationMs: null,
        errorMessage: "Workflow generated from chat.",
        metadata: {
          project_id: project.id
        }
      },
      connection
    );
    await createWorkflowEvent(
      {
        workflowId: workflow.id,
        runId: null,
        nodeName: null,
        eventType: validation.valid ? "workflow_validated" : "workflow_rejected",
        status: validation.valid ? "success" : "failure",
        durationMs: null,
        errorMessage: validation.valid
          ? "Workflow passed validation."
          : "Workflow failed validation.",
        metadata: validation.valid
          ? { project_id: project.id }
          : {
              project_id: project.id,
              validation_errors: validation.errors
            }
      },
      connection
    );

    await createChatMessage(
      {
        sessionId: session.id,
        role: "ai",
        content: JSON.stringify(
          redactSecrets({
            project_name: aiOutput.project_name,
            description: aiOutput.description,
            required_credentials: aiOutput.required_credentials,
            workflow: workflowToPersist,
            validation
          }),
          null,
          2
        )
      },
      connection
    );

    if (logProgress) {
      logInfo("chat", "AI response persisted to chat history", undefined, traceId);
    }

    return {
      project_id: project.id,
      session_id: session.id,
      project_name: aiOutput.project_name,
      description: aiOutput.description,
      workflow: workflowToPersist,
      validation,
      trace_id: traceId
    } satisfies ChatResult;
  });

  if (logProgress) {
    logInfo("chat", "Chat request completed", { project_id: result.project_id }, traceId);
  }
  return result;
}
