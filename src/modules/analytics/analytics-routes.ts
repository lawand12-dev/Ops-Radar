import { Hono } from "hono";
import { getAnalyticsSnapshot } from "./analytics-service";

const analyticsRoutes = new Hono();

analyticsRoutes.get("/", async (c) => {
  const snapshot = await getAnalyticsSnapshot();
  return c.json(snapshot);
});

export default analyticsRoutes;

