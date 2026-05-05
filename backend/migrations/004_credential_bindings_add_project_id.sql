ALTER TABLE workflow_credential_bindings
  ADD COLUMN project_id CHAR(36) NULL AFTER workflow_id;

UPDATE workflow_credential_bindings wb
INNER JOIN workflows w ON w.id = wb.workflow_id
SET wb.project_id = w.project_id
WHERE wb.project_id IS NULL;

ALTER TABLE workflow_credential_bindings
  MODIFY COLUMN project_id CHAR(36) NOT NULL;

ALTER TABLE workflow_credential_bindings
  ADD CONSTRAINT fk_workflow_credential_bindings_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE workflow_credential_bindings
  ADD INDEX idx_workflow_credential_bindings_project_id (project_id);
