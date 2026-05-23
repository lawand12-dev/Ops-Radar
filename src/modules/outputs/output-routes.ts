import { Hono } from "hono";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { requireAuth, requireAdmin, getAuth } from "../auth/auth-middleware";
import {
  createOutput,
  getOutput,
  listUserOutputs,
  markOutputRead
} from "./output-service";

const outputRoutes = new Hono();

// ---------------------------------------------------------------------------
// User-facing: read own outputs (requireAuth)
// ---------------------------------------------------------------------------

outputRoutes.get("/", requireAuth, async (c) => {
  const auth = getAuth(c);
  const limit = Math.min(Math.max(1, Number(c.req.query("limit") ?? 20)), 100);
  const outputs = await listUserOutputs(auth.userId, limit);
  return c.json({ outputs }, 200);
});

outputRoutes.get("/:id", requireAuth, async (c) => {
  const auth = getAuth(c);
  const id = c.req.param("id");
  if (!id) throw new AppError(400, "BAD_REQUEST", "id is required.");
  const output = await getOutput(id, auth.userId);
  if (!output) throw new AppError(404, "OUTPUT_NOT_FOUND", "Output not found.");
  return c.json({ output }, 200);
});

outputRoutes.post("/:id/read", requireAuth, async (c) => {
  const auth = getAuth(c);
  const id = c.req.param("id");
  if (!id) throw new AppError(400, "BAD_REQUEST", "id is required.");
  await markOutputRead(id, auth.userId);
  return c.json({ ok: true }, 200);
});

// ---------------------------------------------------------------------------
// Admin-facing: create outputs for target users (requireAdmin)
// ---------------------------------------------------------------------------

outputRoutes.post("/", requireAdmin, async (c) => {
  const auth = getAuth(c);
  const body = await c.req.json().catch(() => null);

  const schema = z.object({
    session_id: z.string().min(1),
    visible_to_user: z.string().min(1),
    output_type: z.string().optional(),
    content: z.unknown()
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid request body.", parsed.error.issues);
  }

  const output = await createOutput({
    sessionId: parsed.data.session_id,
    createdBy: auth.userId,
    visibleToUser: parsed.data.visible_to_user,
    outputType: parsed.data.output_type,
    content: parsed.data.content
  });

  return c.json({ output }, 201);
});

export default outputRoutes;
