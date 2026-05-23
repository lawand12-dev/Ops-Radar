CREATE TABLE IF NOT EXISTS tool_executions (
  id            CHAR(36)                               NOT NULL PRIMARY KEY,
  user_id       CHAR(36)                               NOT NULL,
  source        ENUM('composio','n8n','internal')      NOT NULL DEFAULT 'composio',
  app_name      VARCHAR(100)                           NULL,
  action_name   VARCHAR(255)                           NOT NULL,
  input_json    JSON                                   NULL,
  output_json   JSON                                   NULL,
  status        ENUM('pending','success','error')      NOT NULL DEFAULT 'pending',
  error_message TEXT                                   NULL,
  latency_ms    INT UNSIGNED                           NULL,
  created_at    TIMESTAMP                              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tool_exec_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_tool_exec_user_id   (user_id),
  INDEX idx_tool_exec_created   (created_at)
);
