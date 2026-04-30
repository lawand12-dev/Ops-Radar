import { z } from "zod";

const boolFromEnv = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["1", "true", "yes", "on"].includes(normalized)) {
        return true;
      }
      if (["0", "false", "no", "off", ""].includes(normalized)) {
        return false;
      }
    }
    return value;
  }, z.boolean().default(defaultValue));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  MYSQL_HOST: z.string().min(1),
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_USER: z.string().min(1),
  MYSQL_PASSWORD: z.string(),
  MYSQL_DATABASE: z.string().min(1),
  MYSQL_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),

  AI_PROVIDER: z.enum(["mock", "openai", "digitalocean"]).default("digitalocean"),
  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().url().default("https://inference.do-ai.run/v1"),
  AI_MODEL_PRIMARY: z.string().min(1).default("anthropic-claude-4.5-sonnet"),
  AI_MODEL_FAST: z.string().min(1).default("anthropic-claude-haiku-4.5"),
  AI_MODEL_COMPLEX: z.string().min(1).default("anthropic-claude-opus-4.5"),
  AI_WORKFLOW_MODEL: z.string().min(1).default("anthropic-claude-4.5-sonnet"),
  AI_WORKFLOW_FALLBACK_MODELS: z
    .string()
    .default("anthropic-claude-4.5-sonnet,anthropic-claude-haiku-4.5,anthropic-claude-opus-4.5"),
  AI_ANALYSIS_MODEL: z.string().min(1).default("anthropic-claude-4.5-sonnet"),
  AI_SYSTEM_PROMPT: z
    .string()
    .default("You are a senior n8n automation engineer. Return valid JSON only."),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  LOG_CHAT_PROGRESS: boolFromEnv(true),
  LOG_AI_RAW_RESPONSE: boolFromEnv(false),
  LOG_AI_OUTPUT_TEXT: boolFromEnv(true),

  N8N_BASE_URL: z.string().url(),
  N8N_API_KEY: z.string().optional(),

  EVENT_INGEST_TOKEN: z.string().optional(),
  ALERT_FAILURE_THRESHOLD: z.coerce.number().int().positive().default(3)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Keep startup failure explicit so bad configuration never makes it to runtime.
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

export const env = parsed.data;
