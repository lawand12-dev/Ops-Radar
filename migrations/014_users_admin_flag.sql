-- Admin permission flag. Like can_use_rag_agent, this is operator-controlled
-- (set on the env-bootstrapped admin at startup, granted to others via the
-- admin UI). Default 0 so existing users stay regular tenants.

ALTER TABLE users
  ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER can_use_rag_agent;

ALTER TABLE users
  ADD INDEX idx_users_is_admin (is_admin);
