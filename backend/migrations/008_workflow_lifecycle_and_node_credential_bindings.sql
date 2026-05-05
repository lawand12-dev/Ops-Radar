UPDATE workflows
SET status = 'validated'
WHERE status = 'approved';

UPDATE workflows
SET status = 'deployed_active'
WHERE status = 'deployed';

ALTER TABLE workflows
  MODIFY COLUMN status ENUM('draft', 'validated', 'rejected', 'deployed_inactive', 'deployed_active', 'failed')
  NOT NULL
  DEFAULT 'draft';

UPDATE workflows
SET status = 'deployed_inactive'
WHERE status = 'validated'
  AND n8n_workflow_id IS NOT NULL;

ALTER TABLE workflow_credential_bindings
  ADD COLUMN node_id VARCHAR(191) NULL AFTER workflow_id,
  ADD COLUMN node_name VARCHAR(255) NULL AFTER node_id;

ALTER TABLE workflow_credential_bindings
  DROP INDEX uq_workflow_credential_type;

ALTER TABLE workflow_credential_bindings
  ADD UNIQUE KEY uq_workflow_node_credential (workflow_id, node_id, credential_type),
  ADD INDEX idx_workflow_credential_bindings_workflow_type (workflow_id, credential_type),
  ADD INDEX idx_workflow_credential_bindings_node (workflow_id, node_id);
