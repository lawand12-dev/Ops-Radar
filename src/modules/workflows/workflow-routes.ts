import { Hono } from "hono";
import { AppError } from "../../lib/errors";
import { requireAuth } from "../auth/auth-middleware";
import { getWorkflowStatus } from "./workflow-service";

const workflowRoutes = new Hono();

// Tenant gate: ownership check is folded into getWorkflowStatus itself.
workflowRoutes.use("*", requireAuth);

workflowRoutes.get("/:workflowId/status", async (c) => {
  const workflowId = c.req.param("workflowId");
  if (!workflowId) {
    throw new AppError(400, "BAD_REQUEST", "workflowId is required.");
  }

  const status = await getWorkflowStatus(workflowId);
  return c.json(status);
});

export default workflowRoutes;

