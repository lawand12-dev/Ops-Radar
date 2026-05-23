import { Hono } from "hono";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { requireAdmin, getAuth } from "../auth/auth-middleware";
import { getRequestContext } from "../../lib/request-context";
import { enqueueAgentRun, getJobStatus } from "./queue-client";

const queueRoutes = new Hono();

queueRoutes.use("/*", requireAdmin);

// ---------------------------------------------------------------------------
// Enqueue an agent run (returns job_id immediately; result via SSE or poll)
// ---------------------------------------------------------------------------

queueRoutes.post("/enqueue", async (c) => {
  const auth = getAuth(c);
  const ctx = getRequestContext();
  const body = await c.req.json().catch(() => null);

  const schema = z.object({
    message: z.string().min(1, "message is required"),
    session_id: z.string().optional()
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid request body.", parsed.error.issues);
  }

  const jobId = await enqueueAgentRun({
    userMessage: parsed.data.message,
    userId: auth.userId,
    sessionId: parsed.data.session_id,
    anthropicApiKey: ctx?.anthropicApiKey,
    n8nBaseUrl: ctx?.n8nBaseUrl,
    n8nApiKey: ctx?.n8nApiKey
  });

  return c.json({ job_id: jobId, status: "queued" }, 202);
});

// ---------------------------------------------------------------------------
// Poll job status
// ---------------------------------------------------------------------------

queueRoutes.get("/jobs/:jobId", async (c) => {
  const jobId = c.req.param("jobId");
  const status = await getJobStatus(jobId);
  if (!status) throw new AppError(404, "JOB_NOT_FOUND", "Job not found.");
  return c.json(status, 200);
});

export default queueRoutes;
