-- Per-tool-call audit within an agent session (separate from composio tool_executions in 026)
CREATE TABLE IF NOT EXISTS agent_tool_executions (
  id           CHAR(36)     NOT NULL,
  session_id   CHAR(36)     NOT NULL,
  turn_id      CHAR(36)     NOT NULL,
  user_id      CHAR(36)     NOT NULL,
  tool_name    VARCHAR(128) NOT NULL,
  args_hash    CHAR(64)     NOT NULL,
  status       ENUM('pending','success','error') NOT NULL DEFAULT 'pending',
  result_json  LONGTEXT     NULL,
  error_msg    VARCHAR(500) NULL,
  latency_ms   INT          NULL,
  executed_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_session_id (session_id),
  KEY idx_user_id (user_id),
  KEY idx_tool_name (tool_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
