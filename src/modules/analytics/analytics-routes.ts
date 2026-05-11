import { Hono } from "hono";
import { requireAuth } from "../auth/auth-middleware";
import { getAnalyticsSnapshot } from "./analytics-service";

const analyticsRoutes = new Hono();

// Tenant-scoped: every snapshot reflects only the authenticated user's data.
analyticsRoutes.use("*", requireAuth);

analyticsRoutes.get("/", async (c) => {
  const snapshot = await getAnalyticsSnapshot();
  return c.json(snapshot);
});

export default analyticsRoutes;

