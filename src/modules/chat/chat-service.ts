import { withTransaction } from "../../lib/db";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { logInfo, logWarn } from "../../lib/logger";
import { redactSecrets } from "../../lib/redact";
import { getRequestContext } from "../../lib/request-context";
import { generateWorkflowFromMessage } from "../ai/ai-service";
import { bindLatestAIInteractionToWorkflow } from "../ai/ai-interaction-repository";
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

  // Forward the requester's userId so ai_interactions rows are attributable
  // to a specific user in the admin console (it's nullable, so unauthenticated
  // background callers still work — they just record as anonymous).
  const ctx = getRequestContext();
  // Capture a timestamp BEFORE the AI call so the post-commit binder can
  // narrow its UPDATE to "the row this chat just produced" rather than an
  // older orphan for the same user.
  const aiCallStartedAt = new Date(Date.now() - 1000);
  const aiOutput = await generateWorkflowFromMessage(message, {
    traceId,
    userId: ctx?.userId
  });
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
    // Owner is the authenticated user. requireAuth has already validated the
    // bearer token before reaching here, so getRequestContext() is non-null.
    // We still defensively read+throw to avoid silently creating unowned rows
    // if /chat is ever wired without the auth middleware.
    const requestCtx = getRequestContext();
    if (!requestCtx?.userId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }
    const project = await createProject(
      {
        name: aiOutput.project_name,
        description: aiOutput.description,
        status: "draft",
        userId: requestCtx.userId
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
        },
        ownerUserId: requestCtx.userId
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
            },
        ownerUserId: requestCtx.userId
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
      workflow_id: workflow.id,
      project_name: aiOutput.project_name,
      description: aiOutput.description,
      workflow: workflowToPersist,
      validation,
      trace_id: traceId
    };
  });

  // Best-effort post-commit linkage: stamp the just-produced workflow on the
  // most recent pending ai_interactions row for this user. The reconciler
  // takes it from here — moving outcome to 'deployed'/'failed_in_n8n' once
  // the workflow lifecycle progresses. Failure logs a warning; the row stays
  // 'pending' and gets retired by the reconciler's stale guard after a week.
  if (ctx?.userId) {
    try {
      const initialOutcome = result.validation.valid ? "validated" : "rejected";
      const bound = await bindLatestAIInteractionToWorkflow({
        userId: ctx.userId,
        projectId: result.project_id,
        workflowId: result.workflow_id,
        initialOutcome,
        createdAfter: aiCallStartedAt
      });
      if (logProgress && bound) {
        logInfo(
          "chat",
          "AI interaction linked to workflow",
          { workflow_id: result.workflow_id, outcome: initialOutcome },
          traceId
        );
      }
    } catch (error) {
      logWarn(
        "chat",
        "Failed to link AI interaction to workflow (non-fatal)",
        { error: error instanceof Error ? error.message : String(error) },
        traceId
      );
    }
  }

  const publicResult: ChatResult = {
    project_id: result.project_id,
    session_id: result.session_id,
    project_name: result.project_name,
    description: result.description,
    workflow: result.workflow,
    validation: result.validation,
    trace_id: result.trace_id
  };

  if (logProgress) {
    logInfo("chat", "Chat request completed", { project_id: publicResult.project_id }, traceId);
  }
  return publicResult;
}

export interface WorkflowReviewResult {
  session_id: string;
  agent_analysis: string;
  status: "completed" | "failed";
}

export async function reviewWorkflowWithAgent(input: {
  projectId: string;
  projectName: string;
  description: string;
  workflowJson: unknown;
  userId: string;
  anthropicApiKey?: string | null;
}): Promise<WorkflowReviewResult> {
  const { runAgentLoop } = await import("../agent/agent-loop");

  const workflowStr = JSON.stringify(input.workflowJson, null, 2);
  const message = `You are a senior n8n automation engineer. Review the following n8n workflow JSON that was generated for a project called "${input.projectName}".

Description: ${input.description}

Workflow JSON:
\`\`\`json
${workflowStr.slice(0, 6000)}
\`\`\`

Please:
1. Identify any issues, missing error handlers, or inefficiencies
2. Suggest specific improvements (node types, connections, settings)
3. Provide an improved version summary (not the full JSON, just describe the key changes)
4. Rate the workflow quality: Poor / Fair / Good / Excellent

Be concise and actionable.`;

  const result = await runAgentLoop({
    userMessage: message,
    userId: input.userId,
    anthropicApiKey: input.anthropicApiKey
  });

  return {
    session_id: result.sessionId,
    agent_analysis: result.finalAnswer,
    status: result.status === "completed" ? "completed" : "failed"
  };
}
