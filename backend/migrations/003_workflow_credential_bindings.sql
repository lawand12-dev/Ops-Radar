CREATE TABLE IF NOT EXISTS workflow_credential_bindings (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workflow_id CHAR(36) NOT NULL,
  credential_type VARCHAR(191) NOT NULL,
  credential_id VARCHAR(191) NULL,
  credential_name VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_workflow_credential_bindings_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  UNIQUE KEY uq_workflow_credential_type (workflow_id, credential_type),
  INDEX idx_workflow_credential_bindings_workflow_id (workflow_id)
);
