import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { logInfo, logWarn } from "../../lib/logger";
import { requireAuth } from "../auth/auth-middleware";
import { getRequestContext } from "../../lib/request-context";
import { handleChatMessage, reviewWorkflowWithAgent } from "./chat-service";

const chatBodySchema = z.object({
  message: z.string().min(3)
});

const chatRoutes = new Hono();

// Auth gate: every chat call creates a project owned by the authenticated user.
chatRoutes.use("*", requireAuth);

chatRoutes.post("/", async (c) => {
  const traceId = c.req.header("x-trace-id")?.trim() || randomUUID();
  if (env.LOG_CHAT_PROGRESS) {
    logInfo("chat-route", "Incoming /chat request", undefined, traceId);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = chatBodySchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid request body.", parsed.error.issues);
  }

  try {
    const result = await handleChatMessage(parsed.data.message, { traceId });
    if (env.LOG_CHAT_PROGRESS) {
      logInfo("chat-route", "Completed /chat request", { project_id: result.project_id }, traceId);
    }
    c.header("x-trace-id", traceId);
    return c.json(result, 201);
  } catch (error) {
    if (env.LOG_CHAT_PROGRESS) {
      const message = error instanceof Error ? error.message : String(error);
      logWarn("chat-route", "Failed /chat request", { error: message }, traceId);
    }
    throw error;
  }
});

chatRoutes.post("/review", async (c) => {
  const traceId = c.req.header("x-trace-id")?.trim() || randomUUID();
  const ctx = getRequestContext();
  if (!ctx?.userId) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
  }

  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    project_name: z.string().min(1),
    description: z.string().default(""),
    workflow: z.unknown()
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid request body.", parsed.error.issues);
  }

  const result = await reviewWorkflowWithAgent({
    projectId: randomUUID(),
    projectName: parsed.data.project_name,
    description: parsed.data.description,
    workflowJson: parsed.data.workflow,
    userId: ctx.userId,
    anthropicApiKey: ctx.anthropicApiKey
  });

  c.header("x-trace-id", traceId);
  return c.json(result, 200);
});

export default chatRoutes;
