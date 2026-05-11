import { Hono } from "hono";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { requireAuth } from "../auth/auth-middleware";
import {
  getProjectExecutionDetails,
  getProjectExecutions,
  getWorkflowHealth,
  refreshWorkflowHealth
} from "../monitoring/workflow-health-service";
import {
  deleteProjectAutomation,
  deployProject,
  fixProjectWorkflow,
  getProjectsAuditReport,
  getProjectActivity,
  getProjectDeployPreflight,
  getProjectCredentialBindings,
  getProjectChatMessages,
  getProjectWithWorkflow,
  listProjectsSnapshot,
  saveProjectCredentialBindings
} from "./project-service";

const credentialBindingSchema = z
  .object({
    id: z.string().min(1).optional(),
    name: z.string().min(1).optional()
  })
  .refine((value) => Boolean(value.id || value.name), {
    message: "either id or name is required for credential binding"
  });

const nodeCredentialBindingSchema = z
  .object({
    node_id: z.string().min(1).nullable().optional(),
    node_name: z.string().min(1).nullable().optional(),
    credential_type: z.string().min(1),
    id: z.string().min(1).optional(),
    name: z.string().min(1).optional()
  })
  .refine((value) => Boolean(value.id || value.name), {
    message: "either id or name is required for credential binding"
  });

const credentialBindingsSchema = z.union([
  z.array(nodeCredentialBindingSchema),
  z.record(credentialBindingSchema)
]);

const deployBodySchema = z
  .object({
    activate: z.boolean().optional(),
    credential_bindings: credentialBindingsSchema.optional()
  })
  .default({ activate: true });

const deployCheckBodySchema = z
  .object({
    credential_bindings: credentialBindingsSchema.optional()
  })
  .default({});

const saveBindingsBodySchema = z
  .object({
    bindings: credentialBindingsSchema.optional(),
    credential_bindings: credentialBindingsSchema.optional()
  })
  .default({});

const executionQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.string().trim().min(1).optional()
});

const projectRoutes = new Hono();

// Every /projects/* endpoint is tenant-scoped — gate with requireAuth so the
// service layer can rely on getRequestContext() returning a valid user.
projectRoutes.use("*", requireAuth);

projectRoutes.get("/", async (c) => {
  const limitRaw = c.req.query("limit");
  const offsetRaw = c.req.query("offset");
  const verifyN8nRaw = c.req.query("verify_n8n");
  const limit = limitRaw ? Number(limitRaw) : 20;
  const offset = offsetRaw ? Number(offsetRaw) : 0;
  const verifyN8n =
    typeof verifyN8nRaw === "string"
      ? ["1", "true", "yes", "on"].includes(verifyN8nRaw.trim().toLowerCase())
      : undefined;

  if (Number.isNaN(limit) || Number.isNaN(offset)) {
    throw new AppError(400, "BAD_REQUEST", "limit and offset must be numbers.");
  }

  const items = await listProjectsSnapshot(limit, offset, { verifyN8n });
  return c.json({ items, count: items.length });
});

projectRoutes.get("/report", async (c) => {
  const limitRaw = c.req.query("limit");
  const offsetRaw = c.req.query("offset");
  const verifyN8nRaw = c.req.query("verify_n8n");

  const limit = limitRaw ? Number(limitRaw) : 200;
  const offset = offsetRaw ? Number(offsetRaw) : 0;
  if (Number.isNaN(limit) || Number.isNaN(offset)) {
    throw new AppError(400, "BAD_REQUEST", "limit and offset must be numbers.");
  }

  const verifyN8n =
    typeof verifyN8nRaw === "string"
      ? ["1", "true", "yes", "on"].includes(verifyN8nRaw.trim().toLowerCase())
      : true;

  const report = await getProjectsAuditReport({ limit, offset, verifyN8n });
  return c.json(report, 200);
});

projectRoutes.get("/:projectId", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new AppError(400, "BAD_REQUEST", "projectId is required.");
  }

  const snapshot = await getProjectWithWorkflow(projectId);
  return c.json(snapshot);
});

projectRoutes.get("/:projectId/workflow", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new AppError(400, "BAD_REQUEST", "projectId is required.");
  }

  const snapshot = await getProjectWithWorkflow(projectId);
  if (!snapshot.workflow) {
    throw new AppError(404, "WORKFLOW_NOT_FOUND", "No workflow found for this project.");
  }

  return c.json(snapshot.workflow);
});

projectRoutes.get("/:projectId/messages", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new AppError(400, "BAD_REQUEST", "projectId is required.");
  }

  const result = await getProjectChatMessages(projectId);
  return c.json(result);
});

projectRoutes.get("/:projectId/events", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new AppError(400, "BAD_REQUEST", "projectId is required.");
  }

  const limitRaw = c.req.query("limit");
  const limit = limitRaw ? Number(limitRaw) : 100;
  if (Number.isNaN(limit)) {
    throw new AppError(400, "BAD_REQUEST", "limit must be a number.");
  }

  const result = await getProjectActivity(projectId, { limit });
  return c.json(result, 200);
});

projectRoutes.get("/:projectId/credential-bindings", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new AppError(400, "BAD_REQUEST", "projectId is required.");
  }

  const result = await getProjectCredentialBindings(projectId);
  return c.json(result);
});

projectRoutes.put("/:projectId/credential-bindings", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new AppError(400, "BAD_REQUEST", "projectId is required.");
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = saveBindingsBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid request body.", parsed.error.issues);
  }

  const normalizedBindings = parsed.data.bindings ?? parsed.data.credential_bindings ?? {};

  const result = await saveProjectCredentialBindings(projectId, {
    credentialBindings: normalizedBindings
  });
  return c.json(result, 200);
});

projectRoutes.post("/:projectId/deploy-check", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new AppError(400, "BAD_REQUEST", "projectId is required.");
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = deployCheckBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid request body.", parsed.error.issues);
  }

  const result = await getProjectDeployPreflight(projectId, {
    credentialBindings: parsed.data.credential_bindings
  });

  return c.json(result, 200);
});

projectRoutes.post("/:projectId/deploy", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new AppError(400, "BAD_REQUEST", "projectId is required.");
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = deployBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid request body.", parsed.error.issues);
  }

  const result = await deployProject(projectId, {
    activate: parsed.data.activate ?? true,
    credentialBindings: parsed.data.credential_bindings
  });
  return c.json(result, 200);
});

projectRoutes.post("/:projectId/fix-workflow", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new AppError(400, "BAD_REQUEST", "projectId is required.");
  }

  const result = await fixProjectWorkflow(projectId);
  return c.json(result, 200);
});

projectRoutes.delete("/:projectId", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new AppError(400, "BAD_REQUEST", "projectId is required.");
  }

  const result = await deleteProjectAutomation(projectId);
  return c.json(result, 200);
});

projectRoutes.get("/:projectId/health", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new AppError(400, "BAD_REQUEST", "projectId is required.");
  }

  const result = await getWorkflowHealth(projectId);
  return c.json(result, 200);
});

projectRoutes.post("/:projectId/health/refresh", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new AppError(400, "BAD_REQUEST", "projectId is required.");
  }

  const result = await refreshWorkflowHealth(projectId);
  return c.json(result, 200);
});

projectRoutes.get("/:projectId/executions", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new AppError(400, "BAD_REQUEST", "projectId is required.");
  }

  const parsed = executionQuerySchema.safeParse({
    limit: c.req.query("limit"),
    status: c.req.query("status")
  });
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid query parameters.", parsed.error.issues);
  }

  const result = await getProjectExecutions(projectId, {
    limit: parsed.data.limit,
    status: parsed.data.status
  });
  return c.json(result, 200);
});

projectRoutes.get("/:projectId/executions/:executionId", async (c) => {
  const projectId = c.req.param("projectId");
  const executionId = c.req.param("executionId");
  if (!projectId || !executionId) {
    throw new AppError(400, "BAD_REQUEST", "projectId and executionId are required.");
  }

  const result = await getProjectExecutionDetails(projectId, executionId);
  return c.json(result, 200);
});

export default projectRoutes;
