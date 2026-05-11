import { Hono } from "hono";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import {
  getCurrentUser,
  loginUser,
  registerUser,
  updateMyCredentials
} from "./auth-service";
import { getAuth, requireAuth } from "./auth-middleware";

const authRoutes = new Hono();

const registerSchema = z.object({
  email: z.string().min(3),
  name: z.string().min(2),
  password: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().min(3),
  password: z.string().min(1) // length checked downstream — accept any non-empty here
});

// Each field is optional so the client can update one at a time. `null` clears the value.
// For the API-key fields we reject whitespace-only strings explicitly: zod's `min(1)`
// would otherwise accept "   " and the service would encrypt it, leaving us with a
// stored "key" that is truthy in `has_*_api_key` but useless on every real API call.
// The auth-service.normalizeKey() helper trims defensively in case any other client
// bypasses this schema, but failing fast here gives a clearer 400 message.
const trimmedNonEmpty = z
  .string()
  .refine((s) => s.trim().length > 0, { message: "must not be blank" });

const credentialsSchema = z
  .object({
    n8n_base_url: z.union([z.string().url(), z.null()]).optional(),
    n8n_api_key: z.union([trimmedNonEmpty, z.null()]).optional(),
    anthropic_api_key: z.union([trimmedNonEmpty, z.null()]).optional()
  })
  .refine(
    (v) =>
      v.n8n_base_url !== undefined ||
      v.n8n_api_key !== undefined ||
      v.anthropic_api_key !== undefined,
    { message: "at least one of n8n_base_url, n8n_api_key, anthropic_api_key is required" }
  );

authRoutes.post("/register", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid request body.", parsed.error.issues);
  }

  const result = await registerUser(parsed.data);
  return c.json(result, 201);
});

authRoutes.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid request body.", parsed.error.issues);
  }

  const result = await loginUser(parsed.data);
  return c.json(result, 200);
});

authRoutes.get("/me", requireAuth, async (c) => {
  const auth = getAuth(c);
  const user = await getCurrentUser(auth.claims);
  return c.json({ user }, 200);
});

authRoutes.put("/credentials", requireAuth, async (c) => {
  const auth = getAuth(c);
  const body = await c.req.json().catch(() => null);
  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid request body.", parsed.error.issues);
  }

  const user = await updateMyCredentials(auth.userId, parsed.data);
  return c.json({ user }, 200);
});

export default authRoutes;
