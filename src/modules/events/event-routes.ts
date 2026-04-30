import { Hono } from "hono";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { ingestWorkflowEvent, parseIncomingWorkflowEvent } from "./event-service";

const eventRoutes = new Hono();

eventRoutes.post("/", async (c) => {
  if (env.EVENT_INGEST_TOKEN) {
    const authHeader = c.req.header("authorization");
    const tokenHeader = c.req.header("x-event-token");
    const bearerToken = authHeader?.toLowerCase().startsWith("bearer ")
      ? authHeader.slice("bearer ".length).trim()
      : null;
    const provided = bearerToken ?? tokenHeader ?? "";

    if (provided !== env.EVENT_INGEST_TOKEN) {
      throw new AppError(401, "UNAUTHORIZED_EVENT", "Invalid event token.");
    }
  }

  const body = await c.req.json().catch(() => null);
  const payload = parseIncomingWorkflowEvent(body);
  const result = await ingestWorkflowEvent(payload);
  return c.json(result, 202);
});

export default eventRoutes;

