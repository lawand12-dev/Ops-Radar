import { Hono } from "hono";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { requireAuth, getAuth } from "../auth/auth-middleware";
import { executeCooQuery } from "./coo-service";

const cooRoutes = new Hono();
cooRoutes.use("*", requireAuth);

const queryBodySchema = z.object({
  query: z.string().min(1).max(2000),
  context_window_hours: z.coerce.number().int().min(1).max(720).optional(),
  include_evidence: z.boolean().optional()
});

cooRoutes.post("/query", async (c) => {
  const auth = getAuth(c);
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new AppError(400, "INVALID_BODY", "Request body must be valid JSON.");
  }
  const parsed = queryBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "INVALID_BODY", "Invalid request body.", parsed.error.issues);
  }
  const response = await executeCooQuery(auth.userId, {
    query: parsed.data.query,
    context_window_hours: parsed.data.context_window_hours,
    include_evidence: parsed.data.include_evidence
  });
  return c.json(response, 200);
});

export default cooRoutes;
