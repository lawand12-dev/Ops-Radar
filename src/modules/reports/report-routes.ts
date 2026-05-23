import { Hono } from "hono";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { AppError } from "../../lib/errors";
import { dbQuery, getDb } from "../../lib/db";
import { requireAuth, getAuth } from "../auth/auth-middleware";
import { generateReport, listReports } from "./report-service";

const reportRoutes = new Hono();
reportRoutes.use("*", requireAuth);

// ---------------------------------------------------------------------------
// POST /reports/generate
// ---------------------------------------------------------------------------

const generateBodySchema = z.object({
  report_type: z
    .enum(["executive_summary", "risk_analysis", "operational_review"])
    .optional(),
  send_email: z.boolean().optional()
});

interface UserEmailRow extends RowDataPacket {
  email: string;
}

reportRoutes.post("/generate", async (c) => {
  const auth = getAuth(c);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  const parsed = generateBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "INVALID_BODY", "Invalid request body.", parsed.error.issues);
  }

  // Resolve the user's email from the users table so callers don't have to
  // re-send it (the JWT already has it via auth-middleware, but we use DB for
  // freshness).
  const [userRows] = await dbQuery<UserEmailRow[]>(
    getDb(),
    "SELECT email FROM users WHERE id = ?",
    [auth.userId]
  );

  const userEmail = userRows[0]?.email ?? auth.email;

  const result = await generateReport({
    userId: auth.userId,
    userEmail,
    reportType: parsed.data.report_type,
    sendEmail: parsed.data.send_email ?? false
  });

  return c.json(result, 201);
});

// ---------------------------------------------------------------------------
// GET /reports
// ---------------------------------------------------------------------------

reportRoutes.get("/", async (c) => {
  const auth = getAuth(c);

  const rawLimit = c.req.query("limit");
  const rawOffset = c.req.query("offset");

  const limit = Math.min(50, Math.max(1, parseInt(rawLimit ?? "20", 10) || 20));
  const offset = Math.max(0, parseInt(rawOffset ?? "0", 10) || 0);

  const items = await listReports(auth.userId, limit, offset);

  return c.json({ items, limit, offset }, 200);
});

// ---------------------------------------------------------------------------
// GET /reports/:id
// ---------------------------------------------------------------------------

interface FullReportRow extends RowDataPacket {
  id: string;
  title: string;
  content: string;
  report_type: string;
  email_delivered: number;
  created_at: Date | string;
}

reportRoutes.get("/:id", async (c) => {
  const auth = getAuth(c);
  const { id } = c.req.param();

  const [rows] = await dbQuery<FullReportRow[]>(
    getDb(),
    `SELECT id, title, content, report_type, email_delivered, created_at
       FROM ai_reports
      WHERE id = ? AND user_id = ?`,
    [id, auth.userId]
  );

  const row = rows[0];
  if (!row) {
    throw new AppError(404, "NOT_FOUND", "Report not found.");
  }

  return c.json(
    {
      id: row.id,
      title: row.title,
      content: row.content,
      report_type: row.report_type,
      email_delivered: Boolean(row.email_delivered),
      created_at:
        row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
    },
    200
  );
});

export default reportRoutes;
