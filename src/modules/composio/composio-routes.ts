import { Hono } from "hono";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { getRequestContext } from "../../lib/request-context";
import { requireAuth, getAuth } from "../auth/auth-middleware";
import {
  saveComposioApiKey,
  removeComposioApiKey,
  listComposioApps,
  getConnectedAccounts,
  syncConnectedAccounts,
  initiateConnection,
  disconnectApp,
  listActions,
  executeAction,
  listExecutions
} from "./composio-service";

const composioRoutes = new Hono();

// All routes require authentication
composioRoutes.use("/*", requireAuth);

// ---------------------------------------------------------------------------
// Credential management
// ---------------------------------------------------------------------------

composioRoutes.put("/credentials", async (c) => {
  const auth = getAuth(c);
  const body = await c.req.json().catch(() => null);

  const schema = z.object({
    composio_api_key: z.string().min(1, "composio_api_key must not be blank")
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid request body.", parsed.error.issues);
  }

  await saveComposioApiKey(auth.userId, parsed.data.composio_api_key);
  return c.json({ ok: true, message: "Composio API key saved." }, 200);
});

composioRoutes.delete("/credentials", async (c) => {
  const auth = getAuth(c);
  await removeComposioApiKey(auth.userId);
  return c.json({ ok: true, message: "Composio API key removed." }, 200);
});

// ---------------------------------------------------------------------------
// Apps
// ---------------------------------------------------------------------------

composioRoutes.get("/apps", async (c) => {
  const ctx = getRequestContext();
  const apps = await listComposioApps(ctx?.composioApiKey ?? null);
  return c.json({ apps }, 200);
});

// ---------------------------------------------------------------------------
// Connected accounts
// ---------------------------------------------------------------------------

composioRoutes.get("/connected-accounts", async (c) => {
  const auth = getAuth(c);
  const sync = c.req.query("sync") === "1" || c.req.query("sync") === "true";

  if (sync) {
    const ctx = getRequestContext();
    const remote = await syncConnectedAccounts(auth.userId, ctx?.composioApiKey ?? null);
    return c.json({ connected_accounts: remote, synced: true }, 200);
  }

  const accounts = await getConnectedAccounts(auth.userId);
  return c.json({ connected_accounts: accounts, synced: false }, 200);
});

composioRoutes.post("/connect", async (c) => {
  const auth = getAuth(c);
  const ctx = getRequestContext();
  const body = await c.req.json().catch(() => null);

  const schema = z.object({
    app_name: z.string().min(1),
    redirect_uri: z.string().url().optional()
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid request body.", parsed.error.issues);
  }

  const result = await initiateConnection(auth.userId, ctx?.composioApiKey ?? null, {
    appName: parsed.data.app_name,
    redirectUri: parsed.data.redirect_uri
  });
  return c.json(result, 200);
});

composioRoutes.delete("/connected-accounts/:appName", async (c) => {
  const auth = getAuth(c);
  const ctx = getRequestContext();
  const appName = c.req.param("appName");
  if (!appName) {
    throw new AppError(400, "BAD_REQUEST", "appName is required.");
  }

  await disconnectApp(auth.userId, ctx?.composioApiKey ?? null, appName);
  return c.json({ ok: true, message: `${appName} disconnected.` }, 200);
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

composioRoutes.get("/actions", async (c) => {
  const ctx = getRequestContext();
  const appNames = c.req.query("appNames") ?? c.req.query("app_names");
  const useCase = c.req.query("useCase") ?? c.req.query("use_case");
  const limit = Number(c.req.query("limit") ?? 50);

  const actions = await listActions(ctx?.composioApiKey ?? null, {
    appNames,
    useCase,
    limit: Math.min(Math.max(1, isNaN(limit) ? 50 : limit), 100)
  });
  return c.json({ actions }, 200);
});

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

composioRoutes.post("/execute", async (c) => {
  const auth = getAuth(c);
  const ctx = getRequestContext();
  const body = await c.req.json().catch(() => null);

  const schema = z.object({
    action_id: z.string().min(1),
    app_name: z.string().optional(),
    params: z.record(z.unknown()).default({})
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid request body.", parsed.error.issues);
  }

  const result = await executeAction({
    userId: auth.userId,
    composioApiKey: ctx?.composioApiKey ?? null,
    actionId: parsed.data.action_id,
    appName: parsed.data.app_name,
    params: parsed.data.params
  });
  return c.json(result, 200);
});

// ---------------------------------------------------------------------------
// Execution history
// ---------------------------------------------------------------------------

composioRoutes.get("/executions", async (c) => {
  const auth = getAuth(c);
  const limit = Number(c.req.query("limit") ?? 20);
  const executions = await listExecutions(
    auth.userId,
    Math.min(Math.max(1, isNaN(limit) ? 20 : limit), 100)
  );
  return c.json({ executions }, 200);
});

export default composioRoutes;
