-- Multi-tenant ownership column on projects.
-- Nullable so pre-existing rows survive the migration. New projects always set it.
-- ON DELETE SET NULL keeps orphaned projects after a user is deleted so an
-- admin can review/reassign instead of cascading the wipe to workflows,
-- events, alerts and audit logs.

ALTER TABLE projects
  ADD COLUMN user_id CHAR(36) NULL AFTER id;

ALTER TABLE projects
  ADD CONSTRAINT fk_projects_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE projects
  ADD INDEX idx_projects_user_id (user_id);
