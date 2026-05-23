-- Agent-prepared outputs that specific users are allowed to see (read-only)
CREATE TABLE IF NOT EXISTS agent_outputs (
  id              CHAR(36)     NOT NULL,
  session_id      CHAR(36)     NOT NULL,
  created_by      CHAR(36)     NOT NULL,
  visible_to_user CHAR(36)     NOT NULL,
  output_type     VARCHAR(64)  NOT NULL DEFAULT 'text',
  content_json    LONGTEXT     NOT NULL,
  read_at         DATETIME     NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_visible_to_user (visible_to_user),
  KEY idx_session_id (session_id),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
