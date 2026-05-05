CREATE TABLE IF NOT EXISTS workflow_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workflow_id CHAR(36) NOT NULL,
  run_id VARCHAR(191) NULL,
  node_name VARCHAR(255) NULL,
  event_type ENUM(
    'run_started',
    'run_succeeded',
    'run_failed',
    'node_started',
    'node_succeeded',
    'node_failed'
  ) NOT NULL,
  status ENUM('success', 'failure', 'info') NOT NULL DEFAULT 'info',
  duration_ms INT NULL,
  error_message TEXT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_workflow_events_workflow
    FOREIGN KEY (workflow_id)
    REFERENCES workflows(id)
    ON DELETE CASCADE,
  INDEX idx_workflow_events_workflow_id (workflow_id),
  INDEX idx_workflow_events_run_id (run_id),
  INDEX idx_workflow_events_event_type (event_type),
  INDEX idx_workflow_events_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS alerts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workflow_id CHAR(36) NOT NULL,
  type ENUM('high_failure_rate', 'workflow_failure_burst') NOT NULL,
  message TEXT NOT NULL,
  is_resolved TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  CONSTRAINT fk_alerts_workflow
    FOREIGN KEY (workflow_id)
    REFERENCES workflows(id)
    ON DELETE CASCADE,
  INDEX idx_alerts_workflow_id (workflow_id),
  INDEX idx_alerts_unresolved (workflow_id, is_resolved)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workflow_id CHAR(36) NOT NULL,
  run_id VARCHAR(191) NULL,
  issue TEXT NOT NULL,
  reason TEXT NOT NULL,
  solution TEXT NOT NULL,
  raw_input JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_logs_workflow
    FOREIGN KEY (workflow_id)
    REFERENCES workflows(id)
    ON DELETE CASCADE,
  INDEX idx_audit_logs_workflow_id (workflow_id),
  INDEX idx_audit_logs_run_id (run_id),
  INDEX idx_audit_logs_created_at (created_at)
);

