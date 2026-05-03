ALTER TABLE workflows
  ADD COLUMN last_deployed_at TIMESTAMP NULL AFTER n8n_workflow_id,
  ADD COLUMN last_activated_at TIMESTAMP NULL AFTER last_deployed_at;
