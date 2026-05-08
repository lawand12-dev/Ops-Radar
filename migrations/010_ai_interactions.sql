CREATE TABLE IF NOT EXISTS ai_interactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NULL,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  system_prompt LONGTEXT NOT NULL,
  user_prompt LONGTEXT NOT NULL,
  response LONGTEXT NOT NULL,
  raw_response JSON NULL,
  status VARCHAR(50) NOT NULL,
  error_message TEXT NULL,
  tokens_used INT NULL,
  latency_ms INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ai_interactions_created_at (created_at),
  INDEX idx_ai_interactions_provider_model (provider, model),
  INDEX idx_ai_interactions_status (status),
  INDEX idx_ai_interactions_user_id (user_id)
);
