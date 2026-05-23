-- Immutable audit trail for every tool invocation (args never stored raw — SHA256 hash only)
CREATE TABLE IF NOT EXISTS agent_audit_log (
  id           CHAR(36)     NOT NULL,
  session_id   CHAR(36)     NOT NULL,
  user_id      CHAR(36)     NOT NULL,
  tool_name    VARCHAR(128) NOT NULL,
  args_hash    CHAR(64)     NOT NULL,
  outcome      ENUM('success','error','denied') NOT NULL,
  denial_code  VARCHAR(64)  NULL,
  latency_ms   INT          NULL,
  logged_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_session_id (session_id),
  KEY idx_user_id (user_id),
  KEY idx_logged_at (logged_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
