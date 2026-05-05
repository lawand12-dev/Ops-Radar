CREATE TABLE IF NOT EXISTS workflow_health_snapshots (
  id CHAR(36) NOT NULL PRIMARY KEY,
  project_id CHAR(36) NOT NULL,
  workflow_id CHAR(36) NOT NULL,
  n8n_workflow_id VARCHAR(191) NULL,
  status VARCHAR(64) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 0,
  health_status ENUM('healthy', 'warning', 'failing', 'inactive', 'unknown') NOT NULL DEFAULT 'unknown',
  last_success_at TIMESTAMP NULL,
  last_failure_at TIMESTAMP NULL,
  recent_success_count INT NOT NULL DEFAULT 0,
  recent_failure_count INT NOT NULL DEFAULT 0,
  last_error_message TEXT NULL,
  last_error_node VARCHAR(255) NULL,
  last_error_type VARCHAR(100) NULL,
  recommended_action TEXT NULL,
  raw_summary_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_workflow_health_snapshots_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_workflow_health_snapshots_workflow
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  INDEX idx_workflow_health_snapshots_project_id (project_id),
  INDEX idx_workflow_health_snapshots_workflow_id (workflow_id),
  INDEX idx_workflow_health_snapshots_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS workflow_alerts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  project_id CHAR(36) NOT NULL,
  workflow_id CHAR(36) NOT NULL,
  n8n_workflow_id VARCHAR(191) NULL,
  alert_type VARCHAR(100) NOT NULL,
  severity ENUM('low', 'medium', 'high') NOT NULL,
  message TEXT NOT NULL,
  recommended_action TEXT NULL,
  fingerprint VARCHAR(255) NOT NULL,
  failed_node VARCHAR(255) NULL,
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  status ENUM('open', 'resolved') NOT NULL DEFAULT 'open',
  CONSTRAINT fk_workflow_alerts_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_workflow_alerts_workflow
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  UNIQUE KEY uq_workflow_alerts_fingerprint_open (fingerprint, status),
  INDEX idx_workflow_alerts_project_id (project_id),
  INDEX idx_workflow_alerts_workflow_id (workflow_id),
  INDEX idx_workflow_alerts_status (status)
);
