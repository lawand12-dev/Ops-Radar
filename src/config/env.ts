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
  MYSQL_QUERY_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  MYSQL_TRANSACTION_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),

  AI_PROVIDER: z.enum(["mock", "openai", "digitalocean", "anthropic"]).default("digitalocean"),
  AI_BACKUP_PROVIDER: z.enum(["mock", "openai", "digitalocean", "anthropic"]).optional(),
  AI_BACKUP_MODEL: z.string().min(1).optional(),
  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().url().default("https://inference.do-ai.run/v1"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_BASE_URL: z.string().url().default("https://api.anthropic.com/v1"),
  ANTHROPIC_VERSION: z.string().min(1).default("2023-06-01"),
  ANTHROPIC_MODEL: z.string().min(1).default("claude-sonnet-4-5-20250929"),
  ANTHROPIC_MAX_TOKENS: z.coerce.number().int().positive().default(4096),
  AI_MODEL_PRIMARY: z.string().min(1).default("anthropic-claude-4.5-sonnet"),
  AI_MODEL_FAST: z.string().min(1).default("anthropic-claude-haiku-4.5"),
  AI_MODEL_COMPLEX: z.string().min(1).default("anthropic-claude-opus-4.5"),
  AI_WORKFLOW_MODEL: z.string().min(1).default("anthropic-claude-4.5-sonnet"),
  AI_WORKFLOW_FALLBACK_MODELS: z
    .string()
    .default("anthropic-claude-4.5-sonnet,anthropic-claude-haiku-4.5,anthropic-claude-opus-4.5"),
  AI_ANALYSIS_MODEL: z.string().min(1).default("anthropic-claude-4.5-sonnet"),
  AI_WORKFLOW_TOTAL_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(45000),
  AI_REQUEST_RETRIES: z.coerce.number().int().min(0).max(5).default(0),
  AI_REQUEST_RETRY_DELAY_MS: z.coerce.number().int().min(0).default(750),
  AI_WORKFLOW_KNOWLEDGE_BASE_ENABLED: boolFromEnv(true),
  AI_WORKFLOW_KNOWLEDGE_BASE_DIR: z.string().default("knowledge-base"),
  AI_WORKFLOW_KNOWLEDGE_BASE_MAX_CHARS: z.coerce.number().int().positive().default(20000),
  AI_WORKFLOW_KNOWLEDGE_BASE_FILE_MAX_CHARS: z.coerce.number().int().positive().default(6000),
  AI_WORKFLOW_KNOWLEDGE_BASE_TOP_K: z.coerce.number().int().positive().default(8),
  DEBUG_KNOWLEDGE_BASE_CONTENT: boolFromEnv(false),
  AI_SYSTEM_PROMPT: z
    .string()
    .default("You are a senior n8n automation engineer. Return valid JSON only."),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  LOG_CHAT_PROGRESS: boolFromEnv(true),
  LOG_AI_RAW_RESPONSE: boolFromEnv(false),
  LOG_AI_OUTPUT_TEXT: boolFromEnv(false),

  N8N_BASE_URL: z.string().url(),
  N8N_API_KEY: z.string().optional(),
  N8N_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  CREDENTIAL_PROVISIONING_MODE: z.enum(["hybrid", "manual_only"]).default("manual_only"),
  PROJECTS_VERIFY_N8N_ON_LIST: boolFromEnv(true),

  EVENT_INGEST_TOKEN: z.string().optional(),
  ALERT_FAILURE_THRESHOLD: z.coerce.number().int().positive().default(3),
  // Time window (seconds) for `ALERT_FAILURE_THRESHOLD`. The legacy behaviour
  // was "≥ N failures in the last 20 executions" which scaled differently by
  // workflow frequency. Default 1h keeps the same operator intent across
  // hourly and daily schedules.
  ALERT_FAILURE_WINDOW_SECONDS: z.coerce.number().int().positive().default(3600),

  MONITORING_ENABLED: boolFromEnv(true),
  MONITORING_INTERVAL_SECONDS: z.coerce.number().int().positive().default(300),
  MONITORING_EXECUTION_LIMIT: z.coerce.number().int().positive().default(20),
  MONITORING_SNAPSHOT_RETENTION_DAYS: z.coerce.number().int().positive().default(14),

  // --- Silent-failure detection layer (hardening flags) ---
  // All default to FALSE so the new pipeline is dormant until the operator
  // explicitly opts in. Existing legacy monitoring keeps running regardless.
  SILENT_FAILURE_PIPELINE_ENABLED: boolFromEnv(false),
  SCHEDULE_DRIFT_ENABLED: boolFromEnv(false),
  // Master gate for any getN8nExecutionById({ includeData: true }) call in
  // the silent-failure pipeline. Without this, even an "eligible" execution
  // never triggers a deep fetch.
  TELEMETRY_DEEP_INSPECTION_ENABLED: boolFromEnv(false),
  // Backpressure knobs. The cycle aborts deep inspection for the remaining
  // workflows once either threshold is crossed and emits one degraded_mode
  // log line per cycle.
  TELEMETRY_INCLUDE_DATA_BUDGET_PER_CYCLE: z.coerce.number().int().positive().default(200),
  TELEMETRY_CYCLE_TIME_BUDGET_RATIO: z.coerce.number().min(0.1).max(0.95).default(0.7),
  // Comma-separated workflow_id allowlist. Workflows in this list bypass the
  // "only fetch on error/anomaly/drift" rule — useful for explicit deep
  // tracing of a specific automation under investigation.
  TELEMETRY_DEEP_INSPECTION_ALLOWLIST: z.string().default(""),

  // Auth: required so we never silently accept tokens signed by an empty/default secret.
  // SECRETS_ENCRYPTION_KEY hashes to a 32-byte AES-256 key, but we still demand ≥32 chars
  // of entropy so a weak input doesn't survive the SHA-256 derivation.
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(86400),
  SECRETS_ENCRYPTION_KEY: z
    .string()
    .min(32, "SECRETS_ENCRYPTION_KEY must be at least 32 characters"),

  // Platform-level RAG agent (DigitalOcean Gen AI agent or any OpenAI-compatible
  // /chat/completions endpoint). Single shared resource — only users with
  // users.can_use_rag_agent = 1 are routed to it. Both vars optional so the
  // feature can be turned off cluster-wide by leaving them empty.
  RAG_AGENT_URL: z.string().url().optional(),
  RAG_AGENT_API_KEY: z.string().optional(),

  // Bootstrap admin account. On server start we ensure a user with this email
  // exists and has is_admin=1. Password is set on first creation only — later
  // password changes through the UI are not reset by env on every reboot.
  // Required so a fresh deployment never boots without an admin account.
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email"),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be at least 8 characters"),

  // Service-to-service API key for the /service/* endpoints. Optional so the
  // feature can be disabled cluster-wide by leaving the var unset (every
  // /service/* call then returns 401 SERVICE_AUTH_NOT_CONFIGURED). When set,
  // we require ≥32 chars to keep brute-force out of reach. Compared with
  // timingSafeEqual at the middleware layer.
  CHATV2_SERVICE_API_KEY: z
    .string()
    .min(32, "CHATV2_SERVICE_API_KEY must be at least 32 characters")
    .optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Keep startup failure explicit so bad configuration never makes it to runtime.
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

export const env = parsed.data;
