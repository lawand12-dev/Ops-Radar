-- Per-node execution telemetry extracted from n8n runData on every monitoring cycle.
-- Additive: no existing table is modified. The monitoring scheduler writes one
-- row per node per execution. Indexed for two read paths:
--   1. zero-output detector  scans (workflow_id, node_name) baseline aggregates
--   2. continue-on-fail sweep filters by (continued_on_fail = 1)
-- We do not store raw runData blobs here. Only extracted scalars.

CREATE TABLE IF NOT EXISTS execution_node_stats (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workflow_id CHAR(36) NOT NULL,
  execution_id VARCHAR(191) NOT NULL,
  node_name VARCHAR(255) NOT NULL,
  node_type VARCHAR(255) NULL,
  items_in INT NULL,
  items_out INT NULL,
  branch_index INT NULL,
  duration_ms INT NULL,
  had_error TINYINT(1) NOT NULL DEFAULT 0,
  continued_on_fail TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ens_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  UNIQUE KEY uq_ens_exec_node (workflow_id, execution_id, node_name),
  INDEX idx_ens_workflow_node (workflow_id, node_name),
  INDEX idx_ens_continued_on_fail (continued_on_fail),
  INDEX idx_ens_had_error (had_error),
  INDEX idx_ens_created_at (created_at)
);
