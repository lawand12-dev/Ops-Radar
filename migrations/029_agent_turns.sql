-- Each THINK/ACT/OBSERVE cycle stored here
CREATE TABLE IF NOT EXISTS agent_turns (
  id             CHAR(36)    NOT NULL,
  session_id     CHAR(36)    NOT NULL,
  turn_index     INT         NOT NULL,
  role           ENUM('user','assistant','tool') NOT NULL,
  content_json   LONGTEXT    NOT NULL,
  tool_name      VARCHAR(128) NULL,
  tool_call_id   VARCHAR(128) NULL,
  created_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_session_id (session_id),
  KEY idx_session_turn (session_id, turn_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
