import { Hono } from "hono";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { AppError } from "../../lib/errors";
import { dbQuery, getDb } from "../../lib/db";
import { requireAuth, getAuth } from "../auth/auth-middleware";
import { findGroundingForWorkflow } from "./grounding";
import {
  decodeBreadcrumbCursor,
  decodeInteractionCursor,
  previewMemoryContext,
  selectBreadcrumbsPage,
  selectInteractionsPage
} from "./memory-service";
import { ingestDocument } from "./ingest-service";

/**
 * User-facing memory-layer API.
 *
 * Mount: app.route("/memory", memoryRoutes) in src/server.ts.
 *
 * Tenant isolation
 * ----------------
 * Every handler reads userId from getAuth(c) — never from any request
 * field. Underlying service functions throw if userId is missing, so
 * even a misrouted call (without requireAuth) surfaces as 500 instead
 * of leaking cross-tenant data.
 */

const memoryRoutes = new Hono();

memoryRoutes.use("*", requireAuth);

// ============================================================
// POST /memory/context
//
// Returns the memory grounding (pattern cards + recent breadcrumbs)
// that the workflow generator would use for a given prompt. Drives the
// frontend's <MemoryGroundingWidget>.
//
// POST (not GET) so very long prompts aren't constrained by querystring
// length and to make rate-limiting / abuse policies match the chat
// endpoint (which is also POST). The endpoint is still idempotent.
// ============================================================

const contextBodySchema = z.object({
  prompt: z.string().min(1).max(4000),
  output_kind: z.enum(["workflow_json", "coo_playbook", "failure_playbook"]).optional()
});

memoryRoutes.post("/context", async (c) => {
  const auth = getAuth(c);
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new AppError(400, "INVALID_BODY", "Request body must be valid JSON.");
  }
  const parsed = contextBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "INVALID_BODY", "Invalid request body.", parsed.error.issues);
  }

  const response = await previewMemoryContext(auth.userId, {
    prompt: parsed.data.prompt,
    outputKind: parsed.data.output_kind
  });
  return c.json(response, 200);
});

// ============================================================
// GET /memory/breadcrumbs
//
// Tenant-scoped operational timeline. Drives <BreadcrumbsTimeline>.
// ============================================================

const breadcrumbsQuerySchema = z.object({
  since_hours: z.coerce.number().int().positive().max(720).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  project_id: z.string().min(1).max(64).optional(),
  /** Comma-separated kinds: "ai_interaction,event:,anomaly:" */
  kinds: z.string().min(1).max(500).optional(),
  cursor: z.string().min(1).max(512).optional()
});

memoryRoutes.get("/breadcrumbs", async (c) => {
  const auth = getAuth(c);
  const parsed = breadcrumbsQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    throw new AppError(400, "INVALID_QUERY", "Invalid query.", parsed.error.issues);
  }

  const kindPrefixes = parsed.data.kinds
    ? parsed.data.kinds
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
    : undefined;

  const cursor = parsed.data.cursor
    ? decodeBreadcrumbCursor(parsed.data.cursor)
    : null;
  if (parsed.data.cursor && !cursor) {
    throw new AppError(400, "INVALID_CURSOR", "Cursor is malformed.");
  }

  const response = await selectBreadcrumbsPage(auth.userId, {
    sinceHours: parsed.data.since_hours,
    limit: parsed.data.limit,
    projectId: parsed.data.project_id,
    kindPrefixes,
    cursor
  });
  return c.json(response, 200);
});

// ============================================================
// GET /memory/ai-interactions
//
// Tenant-scoped recent AI calls with outcome lineage. Drives the
// interaction history view + drill-in from individual workflows.
// ============================================================

const interactionsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
  /** Comma-separated outcomes; clamped to known enum surface. */
  outcome: z.string().min(1).max(200).optional(),
  project_id: z.string().min(1).max(64).optional(),
  cursor: z.string().min(1).max(512).optional()
});

const ALLOWED_OUTCOMES = new Set([
  "pending",
  "validated",
  "rejected",
  "deployed",
  "failed_in_n8n",
  "superseded",
  "unknown"
] as const);
type AllowedOutcome = typeof ALLOWED_OUTCOMES extends Set<infer U> ? U : never;

memoryRoutes.get("/ai-interactions", async (c) => {
  const auth = getAuth(c);
  const parsed = interactionsQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    throw new AppError(400, "INVALID_QUERY", "Invalid query.", parsed.error.issues);
  }

  const outcomes: AllowedOutcome[] | undefined = parsed.data.outcome
    ? Array.from(
        new Set(
          parsed.data.outcome
            .split(",")
            .map((o) => o.trim())
            .filter((o): o is AllowedOutcome =>
              ALLOWED_OUTCOMES.has(o as AllowedOutcome)
            )
        )
      )
    : undefined;

  const cursor = parsed.data.cursor
    ? decodeInteractionCursor(parsed.data.cursor)
    : null;
  if (parsed.data.cursor && !cursor) {
    throw new AppError(400, "INVALID_CURSOR", "Cursor is malformed.");
  }

  const response = await selectInteractionsPage(auth.userId, {
    limit: parsed.data.limit,
    outcomes,
    projectId: parsed.data.project_id,
    cursor
  });
  return c.json(response, 200);
});

// ============================================================
// GET /memory/workflows/:id/grounding
//
// "Why did the AI build this workflow?" — returns the pattern cards
// and breadcrumb snapshot that grounded the generating prompt.
// 404 on wrong-tenant OR missing workflow (same code; no enumeration).
// ============================================================

const workflowIdParamSchema = z.string().min(1).max(64);

memoryRoutes.get("/workflows/:id/grounding", async (c) => {
  const auth = getAuth(c);
  const parsed = workflowIdParamSchema.safeParse(c.req.param("id"));
  if (!parsed.success) {
    throw new AppError(400, "INVALID_WORKFLOW_ID", "Invalid workflow id.");
  }
  const response = await findGroundingForWorkflow({
    ownerUserId: auth.userId,
    workflowId: parsed.data
  });
  return c.json(response, 200);
});

// ============================================================
// POST /memory/ingest
//
// Company Brain ingestion: stores text documents (from Slack, email,
// meetings, manual upload) into all three memory layers.
// consent_verified: true is required in the request body.
// ============================================================

const ingestBodySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(10).max(100000),
  source_kind: z.enum(["manual", "slack", "email", "meeting", "document", "file"]).optional(),
  metadata: z.record(z.unknown()).optional(),
  consent_verified: z.literal(true)
});

memoryRoutes.post("/ingest", async (c) => {
  const auth = getAuth(c);
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new AppError(400, "INVALID_BODY", "Request body must be valid JSON.");
  }
  const parsed = ingestBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "INVALID_BODY", "Invalid request body.", parsed.error.issues);
  }
  const result = await ingestDocument({
    userId: auth.userId,
    title: parsed.data.title ?? null,
    content: parsed.data.content,
    sourceKind: parsed.data.source_kind ?? "manual",
    metadata: parsed.data.metadata ?? null,
    consent_verified: parsed.data.consent_verified
  });
  return c.json(result, 201);
});

// ============================================================
// GET /memory/documents
//
// Lists Company Brain documents ingested by this user.
// ============================================================

const documentsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

type DocRow = RowDataPacket & {
  id: string;
  title: string | null;
  source_kind: string;
  content_chars: number;
  created_at: Date | string;
};

memoryRoutes.get("/documents", async (c) => {
  const auth = getAuth(c);
  const parsed = documentsQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    throw new AppError(400, "INVALID_QUERY", "Invalid query.", parsed.error.issues);
  }
  const limit = Math.min(parsed.data.limit ?? 50, 100);
  const offset = parsed.data.offset ?? 0;

  const [rows] = await dbQuery<DocRow[]>(
    getDb(),
    `SELECT id, title, source_kind, content_chars, created_at
       FROM company_brain_documents
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
    [auth.userId, limit, offset]
  );
  return c.json({ items: rows, limit, offset }, 200);
});

export default memoryRoutes;
