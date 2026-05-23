import { Hono } from "hono";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { env } from "../../config/env";
import { logInfo } from "../../lib/logger";
import { requireAdmin } from "../auth/auth-middleware";

// In-memory model config (resets on server restart; env vars are the persistent store)
interface ModelConfig {
  coo_model: string;
  workflow_model: string;
  analysis_model: string;
  fast_model: string;
  embed_model: string;
  updated_at: string | null;
}

let runtimeConfig: ModelConfig | null = null;

function getEffectiveConfig(): ModelConfig {
  return runtimeConfig ?? {
    coo_model: env.AI_MODEL_COMPLEX || env.AI_MODEL_PRIMARY,
    workflow_model: env.AI_WORKFLOW_MODEL || env.AI_MODEL_PRIMARY,
    analysis_model: env.AI_ANALYSIS_MODEL || env.AI_MODEL_PRIMARY,
    fast_model: env.AI_MODEL_FAST,
    embed_model: env.AI_MODEL_EMBED,
    updated_at: null
  };
}

// Export so coo-service.ts and ai-service.ts can read the runtime override
export function getModelForRole(role: keyof Omit<ModelConfig, "updated_at">): string {
  return getEffectiveConfig()[role] || env.AI_MODEL_PRIMARY;
}

const modelConfigRoutes = new Hono();
modelConfigRoutes.use("*", requireAdmin);

// GET /admin/models
modelConfigRoutes.get("/", (c) => {
  return c.json({
    config: getEffectiveConfig(),
    available_providers: ["anthropic", "openai", "digitalocean", "mock"],
    current_provider: env.AI_PROVIDER
  }, 200);
});

// PUT /admin/models
const updateSchema = z.object({
  coo_model: z.string().min(3).max(100).optional(),
  workflow_model: z.string().min(3).max(100).optional(),
  analysis_model: z.string().min(3).max(100).optional(),
  fast_model: z.string().min(3).max(100).optional(),
  embed_model: z.string().min(3).max(100).optional()
}).refine(v =>
  Object.values(v).some(x => x !== undefined),
  { message: "At least one model field must be provided" }
);

modelConfigRoutes.put("/", async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch {
    throw new AppError(400, "INVALID_BODY", "Request body must be valid JSON.");
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "INVALID_BODY", "Invalid model config.", parsed.error.issues);
  }

  const current = getEffectiveConfig();
  runtimeConfig = {
    coo_model: parsed.data.coo_model ?? current.coo_model,
    workflow_model: parsed.data.workflow_model ?? current.workflow_model,
    analysis_model: parsed.data.analysis_model ?? current.analysis_model,
    fast_model: parsed.data.fast_model ?? current.fast_model,
    embed_model: parsed.data.embed_model ?? current.embed_model,
    updated_at: new Date().toISOString()
  };

  logInfo("admin", "Model config updated", runtimeConfig);

  return c.json({ config: runtimeConfig, message: "Model configuration updated." }, 200);
});

// DELETE /admin/models (reset to env defaults)
modelConfigRoutes.delete("/", (c) => {
  runtimeConfig = null;
  logInfo("admin", "Model config reset to env defaults");
  return c.json({ config: getEffectiveConfig(), message: "Model configuration reset to defaults." }, 200);
});

export default modelConfigRoutes;
