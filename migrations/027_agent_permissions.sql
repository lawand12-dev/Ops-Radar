-- RBAC for the agent platform: super-admin flag on users + per-user tool permission grants
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_super_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER is_admin;

CREATE TABLE IF NOT EXISTS admin_permissions (
  id           CHAR(36)     NOT NULL,
  user_id      CHAR(36)     NOT NULL,
  tool_name    VARCHAR(128) NOT NULL,
  granted_by   CHAR(36)     NOT NULL,
  granted_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_tool (user_id, tool_name),
  KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
