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

  // --- AI memory: outcome reconciliation + breadcrumbs + pattern cards ---
  // Outcome reconciler closes the lineage edge on ai_interactions by reading
  // workflows.status + recent workflow_events. Off by default so legacy
  // deployments without migration 019 don't crash; flip after migrating.
  OUTCOME_RECONCILER_ENABLED: boolFromEnv(true),
  OUTCOME_RECONCILER_INTERVAL_SECONDS: z.coerce.number().int().positive().default(300),
  OUTCOME_RECONCILER_BATCH_SIZE: z.coerce.number().int().positive().default(200),
  OUTCOME_RECONCILER_STALE_DAYS: z.coerce.number().int().positive().default(7),

  // Pattern Cards: deterministic selector over knowledge-base/patterns/*.md
  // files that carry YAML frontmatter. Top-N per request injected into the
  // workflow-generation system prompt alongside the legacy KB block.
  AI_PATTERN_CARDS_ENABLED: boolFromEnv(true),
  AI_PATTERN_CARDS_DIR: z.string().default("knowledge-base/patterns"),
  AI_PATTERN_CARDS_TOP_N: z.coerce.number().int().positive().default(3),

  // Breadcrumbs: per-user operational timeline fed into AI prompts to ground
  // the model in *what just happened in this tenant*. Strictly tenant-scoped.
  AI_BREADCRUMBS_ENABLED: boolFromEnv(true),
  AI_BREADCRUMBS_LIMIT: z.coerce.number().int().positive().default(10),
  AI_BREADCRUMBS_HOURS: z.coerce.number().int().positive().default(24),
  AI_BREADCRUMBS_MAX_CHARS: z.coerce.number().int().positive().default(4000),

  // --- Phase 2: Postgres intelligence sidecar ---
  // POSTGRES_URL is intentionally optional: when unset, the sidecar is
  // disabled and every memory call falls back to keyword-only retrieval.
  // Format: postgres://user:pass@host:port/db?sslmode=require
  POSTGRES_URL: z.string().url().optional(),
  POSTGRES_POOL_MAX: z.coerce.number().int().positive().default(8),

  // Embedding worker: runs the LISTEN+SKIP-LOCKED loop that drains
  // embedding_jobs. Disabled by default; flip after the sidecar is
  // provisioned + 001_init.sql has been applied.
  EMBEDDING_WORKER_ENABLED: boolFromEnv(false),
  EMBEDDING_WORKER_ID: z.string().min(1).default("worker-1"),
  EMBEDDING_BATCH_SIZE: z.coerce.number().int().min(1).max(64).default(32),
  EMBEDDING_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  EMBEDDING_MAX_ATTEMPTS: z.coerce.number().int().positive().default(8),
  EMBEDDING_LOCK_TTL_MS: z.coerce.number().int().positive().default(5 * 60 * 1000),

  // Embedding API. Defaults match DigitalOcean's OpenAI-compatible
  // /v1/embeddings shape; AI_BASE_URL above is reused as the endpoint.
  // 1024-dim matches the embeddings table column. Changing dims requires
  // re-embedding all rows (the unique key by source_version makes this
  // tractable: bump source_version and re-enqueue).
  AI_MODEL_EMBED: z.string().min(1).default("openai-text-embedding-3-small"),
  AI_MODEL_EMBED_DIM: z.coerce.number().int().positive().default(1024),
  AI_MODEL_EMBED_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),

  // Hybrid retrieval: vector + keyword + recency + success-rate.
  // When disabled, the workflow generator continues using the deterministic
  // keyword pattern-card selector from Phase 1 (no regression).
  HYBRID_RETRIEVAL_ENABLED: boolFromEnv(false),
  HYBRID_RETRIEVAL_TOPK: z.coerce.number().int().positive().default(8),
  HYBRID_RETRIEVAL_VECTOR_POOL: z.coerce.number().int().positive().default(50),
  // HNSW recall knob. Higher = better recall, more CPU. Defaults to 64 which
  // is a safe starting point for m=16 ef_construction=64 indexes.
  HYBRID_RETRIEVAL_EF_SEARCH: z.coerce.number().int().positive().default(64),

  // Pattern card sync: hashes knowledge-base/patterns/*.md and UPSERTs
  // into the pattern_cards table on boot + nightly. Idempotent.
  PATTERN_CARD_SYNC_ENABLED: boolFromEnv(false),

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

  // Composio.dev integration platform (per-user API keys stored encrypted in DB).
  // Base URL defaults to the public Composio backend; override only in self-hosted setups.
  COMPOSIO_BASE_URL: z
    .string()
    .url()
    .default("https://backend.composio.dev/api/v1"),
  COMPOSIO_REQUEST_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30_000),

  // DeepSeek model served via the DigitalOcean OpenAI-compatible endpoint.
  // Used as fallback in the agent loop when no Anthropic key is configured.
  DEEPSEEK_MODEL: z.string().min(1).default("deepseek-chat"),

  // Service-to-service API key for the /service/* endpoints. Optional so the
  // feature can be disabled cluster-wide by leaving the var unset (every
  // /service/* call then returns 401 SERVICE_AUTH_NOT_CONFIGURED). When set,
  // we require ≥32 chars to keep brute-force out of reach. Compared with
  // timingSafeEqual at the middleware layer.
  CHATV2_SERVICE_API_KEY: z
    .string()
    .min(32, "CHATV2_SERVICE_API_KEY must be at least 32 characters")
    .optional(),

  // --- AI Agent Platform ---
  // Redis is required for BullMQ job queues + agent working memory.
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  AGENT_MAX_TURNS: z.coerce.number().int().min(1).max(50).default(12),
  AGENT_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(4),
  // Base URL for n8n webhook triggers (used by the run_workflow tool).
  // Falls back to N8N_BASE_URL when unset.
  AGENT_N8N_WEBHOOK_BASE_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Keep startup failure explicit so bad configuration never makes it to runtime.
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

export const env = parsed.data;
