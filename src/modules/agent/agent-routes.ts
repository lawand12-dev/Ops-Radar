import { Hono } from "hono";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { requireAdmin, getAuth } from "../auth/auth-middleware";
import { getRequestContext } from "../../lib/request-context";
import { runAgentLoop } from "./agent-loop";
import { getSession, listUserSessions, updateSessionStatus } from "./agent-session";
import { createAgentEventStream, sseHeaders } from "./agent-stream";
import { getToolsAsAiSchema } from "../tools/tool-registry";
import {
  grantToolPermission,
  revokeToolPermission,
  listUserPermissions,
  setSuperAdmin
} from "../permissions/permission-service";
import { ALL_TOOLS } from "../permissions/permission-types";
import type { ToolName } from "../permissions/permission-types";

const agentRoutes = new Hono();

agentRoutes.use("/*", requireAdmin);

// ---------------------------------------------------------------------------
// Tool catalog (admin: list all available tools)
// ---------------------------------------------------------------------------

agentRoutes.get("/tools", (c) => {
  const tools = getToolsAsAiSchema();
  return c.json({ tools }, 200);
});

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

agentRoutes.get("/sessions", async (c) => {
  const auth = getAuth(c);
  const limit = Math.min(Math.max(1, Number(c.req.query("limit") ?? 20)), 100);
  const sessions = await listUserSessions(auth.userId, limit);
  return c.json({ sessions }, 200);
});

agentRoutes.get("/sessions/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");
  const session = await getSession(sessionId);
  if (!session) throw new AppError(404, "SESSION_NOT_FOUND", "Session not found.");
  return c.json({ session }, 200);
});

agentRoutes.delete("/sessions/:sessionId", async (c) => {
  const auth = getAuth(c);
  const sessionId = c.req.param("sessionId");
  const session = await getSession(sessionId);
  if (!session) throw new AppError(404, "SESSION_NOT_FOUND", "Session not found.");
  if (session.userId !== auth.userId) {
    throw new AppError(403, "FORBIDDEN", "Cannot cancel another user's session.");
  }
  await updateSessionStatus(sessionId, "cancelled");
  return c.json({ ok: true, message: "Session cancelled." }, 200);
});

// ---------------------------------------------------------------------------
// SSE stream for real-time events
// ---------------------------------------------------------------------------

agentRoutes.get("/sessions/:sessionId/stream", (c) => {
  const sessionId = c.req.param("sessionId");
  const stream = createAgentEventStream(sessionId);
  return new Response(stream, { headers: sseHeaders() });
});

// ---------------------------------------------------------------------------
// Run agent (synchronous inline execution)
// ---------------------------------------------------------------------------

agentRoutes.post("/run", async (c) => {
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

  const result = await runAgentLoop({
    userMessage: parsed.data.message,
    userId: auth.userId,
    sessionId: parsed.data.session_id,
    anthropicApiKey: ctx?.anthropicApiKey,
    n8nBaseUrl: ctx?.n8nBaseUrl,
    n8nApiKey: ctx?.n8nApiKey
  });

  return c.json(result, 200);
});

// ---------------------------------------------------------------------------
// Permission management (super-admin only gates are enforced via requireAdmin
// for now; any admin can manage permissions — tighten with is_super_admin check
// if needed)
// ---------------------------------------------------------------------------

agentRoutes.get("/permissions/:userId", async (c) => {
  const targetUserId = c.req.param("userId");
  const permissions = await listUserPermissions(targetUserId);
  return c.json({ user_id: targetUserId, permissions }, 200);
});

agentRoutes.post("/permissions/:userId/grant", async (c) => {
  const auth = getAuth(c);
  const targetUserId = c.req.param("userId");
  const body = await c.req.json().catch(() => null);

  const schema = z.object({
    tool_name: z.enum(ALL_TOOLS)
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid tool_name.", parsed.error.issues);
  }

  await grantToolPermission(auth.userId, targetUserId, parsed.data.tool_name as ToolName);
  return c.json({ ok: true, message: `Permission granted: ${parsed.data.tool_name}` }, 200);
});

agentRoutes.post("/permissions/:userId/revoke", async (c) => {
  const targetUserId = c.req.param("userId");
  const body = await c.req.json().catch(() => null);

  const schema = z.object({
    tool_name: z.enum(ALL_TOOLS)
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid tool_name.", parsed.error.issues);
  }

  await revokeToolPermission(targetUserId, parsed.data.tool_name as ToolName);
  return c.json({ ok: true, message: `Permission revoked: ${parsed.data.tool_name}` }, 200);
});

agentRoutes.post("/permissions/:userId/super-admin", async (c) => {
  const targetUserId = c.req.param("userId");
  const body = await c.req.json().catch(() => null);

  const schema = z.object({ value: z.boolean() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "value (boolean) is required.");
  }

  await setSuperAdmin(targetUserId, parsed.data.value);
  return c.json({ ok: true, super_admin: parsed.data.value }, 200);
});

export default agentRoutes;
