-- One session per agent run (can span multiple turns)
CREATE TABLE IF NOT EXISTS agent_sessions (
  id           CHAR(36)     NOT NULL,
  user_id      CHAR(36)     NOT NULL,
  title        VARCHAR(255) NULL,
  model        VARCHAR(128) NOT NULL,
  status       ENUM('running','completed','failed','cancelled') NOT NULL DEFAULT 'running',
  turn_count   INT          NOT NULL DEFAULT 0,
  started_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at  DATETIME     NULL,
  meta_json    LONGTEXT     NULL,
  PRIMARY KEY (id),
  KEY idx_user_id (user_id),
  KEY idx_status (status),
  KEY idx_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
