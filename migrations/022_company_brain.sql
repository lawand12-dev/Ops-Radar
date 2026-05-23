-- Company Brain document tracking table
-- Stores metadata for documents ingested via POST /memory/ingest
-- The actual content lives in Postgres (embeddings table, sourceKind='company_brain')

CREATE TABLE IF NOT EXISTS company_brain_documents (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(500) NULL,
  source_kind VARCHAR(50) NOT NULL DEFAULT 'manual',
  content_excerpt TEXT NULL,
  content_chars INT NOT NULL DEFAULT 0,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_cbd_user_id (user_id),
  INDEX idx_cbd_user_created (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
