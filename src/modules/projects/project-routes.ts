import { Hono } from "hono";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import {
  deployProject,
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

const deployBodySchema = z
  .object({
    activate: z.boolean().optional(),
    credential_bindings: z.record(credentialBindingSchema).optional()
  })
  .default({ activate: true });

const deployCheckBodySchema = z
  .object({
    credential_bindings: z.record(credentialBindingSchema).optional()
  })
  .default({});

const projectRoutes = new Hono();

projectRoutes.get("/", async (c) => {
  const limitRaw = c.req.query("limit");
  const offsetRaw = c.req.query("offset");
  const limit = limitRaw ? Number(limitRaw) : 20;
  const offset = offsetRaw ? Number(offsetRaw) : 0;

  if (Number.isNaN(limit) || Number.isNaN(offset)) {
    throw new AppError(400, "BAD_REQUEST", "limit and offset must be numbers.");
  }

  const items = await listProjectsSnapshot(limit, offset);
  return c.json({ items, count: items.length });
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
  const parsed = deployCheckBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid request body.", parsed.error.issues);
  }

  const result = await saveProjectCredentialBindings(projectId, {
    credentialBindings: parsed.data.credential_bindings ?? {}
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

export default projectRoutes;
