import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { logInfo } from "../../lib/logger";
import { handleChatMessage } from "./chat-service";

const chatBodySchema = z.object({
  message: z.string().min(3)
});

const chatRoutes = new Hono();

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

  const result = await handleChatMessage(parsed.data.message, { traceId });
  c.header("x-trace-id", traceId);
  return c.json(result, 201);
});

export default chatRoutes;
