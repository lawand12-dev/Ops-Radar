-- MCP server audit log: one row per external-agent tool invocation
-- against the OpsRadar MCP server. Surfaces who called what, when,
-- whether it succeeded, and what scope authorised it.
--
-- The MCP server lives at POST /api/mcp. External agents (Claude Desktop,
-- ChatGPT, partner agency agents) authenticate with a Supabase JWT and
-- call MCP tools that wrap the existing OpsRadar capabilities.

CREATE TABLE IF NOT EXISTS mcp_invocations (
  id              BIGSERIAL    PRIMARY KEY,
  user_id         UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  caller          TEXT,        -- e.g. "claude-desktop", "chatgpt", "partner-agent"
  tool_name       TEXT         NOT NULL,
  scope           TEXT,        -- e.g. "kb:read", "finance:read"
  args            JSONB,       -- redacted args (no PII / no secrets)
  result_status   TEXT         NOT NULL CHECK (result_status IN ('success', 'error', 'unauthorised', 'rate_limited')),
  error_message   TEXT,        -- when result_status != 'success'
  latency_ms      INT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mcp_invocations_user_id_idx        ON mcp_invocations (user_id);
CREATE INDEX IF NOT EXISTS mcp_invocations_tool_name_idx      ON mcp_invocations (tool_name);
CREATE INDEX IF NOT EXISTS mcp_invocations_created_at_idx     ON mcp_invocations (created_at DESC);
CREATE INDEX IF NOT EXISTS mcp_invocations_user_created_idx   ON mcp_invocations (user_id, created_at DESC);

-- RLS: no customer access. Admin reads via service role only.
ALTER TABLE mcp_invocations ENABLE ROW LEVEL SECURITY;
