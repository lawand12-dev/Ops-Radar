import { Hono } from "hono";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { requireAdmin } from "../auth/auth-middleware";
import { getMemoryHealthSnapshot } from "../memory/memory-health";
import { listPatternCardTelemetry } from "../memory/pattern-card-telemetry";
import { listTopFailureClusters } from "../memory/failure-cluster-repository";

/**
 * Admin-only memory dashboard API.
 *
 * Mount: app.route("/admin/memory", adminMemoryRoutes).
 *
 * Gating: every handler runs behind requireAdmin (composes requireAuth
 * + is_admin). Failure returns 403 ADMIN_REQUIRED. No tenant data is
 * surfaced — all three endpoints aggregate cross-tenant. Per-tenant
 * identifiers are deliberately excluded from the response shapes (see
 * failure-cluster-repository.ts header for the redaction discipline).
 */

const adminMemoryRoutes = new Hono();

adminMemoryRoutes.use("*", requireAdmin);

// GET /admin/memory/health
adminMemoryRoutes.get("/health", async (c) => {
  const snapshot = await getMemoryHealthSnapshot();
  return c.json(snapshot, 200);
});

// GET /admin/memory/pattern-cards
adminMemoryRoutes.get("/pattern-cards", async (c) => {
  const response = await listPatternCardTelemetry();
  return c.json(response, 200);
});

// GET /admin/memory/failure-clusters?limit=&since_days=
const failureClustersQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional(),
  since_days: z.coerce.number().int().positive().max(365).optional()
});

adminMemoryRoutes.get("/failure-clusters", async (c) => {
  const parsed = failureClustersQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    throw new AppError(400, "INVALID_QUERY", "Invalid query.", parsed.error.issues);
  }
  const response = await listTopFailureClusters({
    limit: parsed.data.limit,
    sinceDays: parsed.data.since_days
  });
  return c.json(response, 200);
});

export default adminMemoryRoutes;
