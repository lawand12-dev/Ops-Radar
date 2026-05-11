import { Hono } from "hono";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { getAuth, requireAdmin } from "../auth/auth-middleware";
import {
  adminAnalyticsOverview,
  adminCreateUser,
  adminGetAIInteraction,
  adminGetUser,
  adminGetUserDetail,
  adminListAIInteractions,
  adminListAllProjects,
  adminListUsers,
  adminPatchUser,
  adminRemoveUser,
  adminResetUserPassword
} from "./admin-service";

const adminRoutes = new Hono();

// Every /admin/* endpoint goes through requireAdmin. Authn check + is_admin
// re-read from the DB on every request — no JWT trust for authorization.
adminRoutes.use("*", requireAdmin);

const createUserSchema = z.object({
  email: z.string().min(3),
  name: z.string().min(2),
  password: z.string().min(8),
  can_use_rag_agent: z.boolean().optional(),
  is_admin: z.boolean().optional()
});

const patchUserSchema = z
  .object({
    name: z.string().min(2).optional(),
    can_use_rag_agent: z.boolean().optional(),
    is_admin: z.boolean().optional()
  })
  .refine(
    (v) => v.name !== undefined || v.can_use_rag_agent !== undefined || v.is_admin !== undefined,
    { message: "at least one field must be provided" }
  );

const resetPasswordSchema = z.object({ password: z.string().min(8).max(256) });

const interactionListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
  user_id: z.string().min(1).optional(),
  status: z.enum(["success", "error"]).optional(),
  provider: z.string().min(1).optional()
});

/* ============================================================
   Users
   ============================================================ */

adminRoutes.get("/users", async (c) => {
  const limit = Number(c.req.query("limit") ?? 100);
  const offset = Number(c.req.query("offset") ?? 0);
  const query = c.req.query("q") ?? undefined;
  if (Number.isNaN(limit) || Number.isNaN(offset)) {
    throw new AppError(400, "BAD_REQUEST", "limit/offset must be numeric.");
  }
  const result = await adminListUsers({ limit, offset, query });
  return c.json(result);
});

adminRoutes.post("/users", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid request body.", parsed.error.issues);
  }
  const user = await adminCreateUser(parsed.data);
  return c.json({ user }, 201);
});

adminRoutes.get("/users/:id", async (c) => {
  const id = c.req.param("id");
  if (!id) throw new AppError(400, "BAD_REQUEST", "id is required.");
  const detail = await adminGetUserDetail(id);
  return c.json(detail);
});

adminRoutes.patch("/users/:id", async (c) => {
  const id = c.req.param("id");
  if (!id) throw new AppError(400, "BAD_REQUEST", "id is required.");
  const body = await c.req.json().catch(() => null);
  const parsed = patchUserSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid request body.", parsed.error.issues);
  }
  const auth = getAuth(c);
  const user = await adminPatchUser(auth.userId, id, parsed.data);
  return c.json({ user });
});

adminRoutes.post("/users/:id/reset-password", async (c) => {
  const id = c.req.param("id");
  if (!id) throw new AppError(400, "BAD_REQUEST", "id is required.");
  const body = await c.req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid request body.", parsed.error.issues);
  }
  const auth = getAuth(c);
  const result = await adminResetUserPassword(auth.userId, id, parsed.data.password);
  return c.json(result);
});

adminRoutes.delete("/users/:id", async (c) => {
  const id = c.req.param("id");
  if (!id) throw new AppError(400, "BAD_REQUEST", "id is required.");
  const auth = getAuth(c);
  const result = await adminRemoveUser(auth.userId, id);
  return c.json(result);
});

/* ============================================================
   AI Interactions (prompt + response log across all users)
   ============================================================ */

adminRoutes.get("/ai-interactions", async (c) => {
  const parsed = interactionListQuerySchema.safeParse({
    limit: c.req.query("limit"),
    offset: c.req.query("offset"),
    user_id: c.req.query("user_id"),
    status: c.req.query("status"),
    provider: c.req.query("provider")
  });
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid query.", parsed.error.issues);
  }
  const result = await adminListAIInteractions({
    limit: parsed.data.limit,
    offset: parsed.data.offset,
    userId: parsed.data.user_id,
    status: parsed.data.status,
    provider: parsed.data.provider
  });
  return c.json(result);
});

adminRoutes.get("/ai-interactions/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) throw new AppError(400, "BAD_REQUEST", "id must be numeric.");
  const result = await adminGetAIInteraction(id);
  return c.json(result);
});

/* ============================================================
   Projects + Analytics (cross-tenant)
   ============================================================ */

adminRoutes.get("/projects", async (c) => {
  const limit = Number(c.req.query("limit") ?? 200);
  const offset = Number(c.req.query("offset") ?? 0);
  if (Number.isNaN(limit) || Number.isNaN(offset)) {
    throw new AppError(400, "BAD_REQUEST", "limit/offset must be numeric.");
  }
  const result = await adminListAllProjects({ limit, offset });
  return c.json(result);
});

adminRoutes.get("/analytics", async (c) => {
  const overview = await adminAnalyticsOverview();
  return c.json({ overview });
});

// Admin's own profile lookup — saves the frontend a separate /auth/me call
// when it boots into the admin section.
adminRoutes.get("/me", async (c) => {
  const auth = getAuth(c);
  const user = await adminGetUser(auth.userId);
  return c.json({ user });
});

export default adminRoutes;
