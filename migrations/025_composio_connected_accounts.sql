CREATE TABLE IF NOT EXISTS composio_connected_accounts (
  id                   CHAR(36)     NOT NULL PRIMARY KEY,
  user_id              CHAR(36)     NOT NULL,
  composio_account_id  VARCHAR(255) NOT NULL,
  app_name             VARCHAR(100) NOT NULL,
  status               VARCHAR(50)  NOT NULL DEFAULT 'active',
  meta                 JSON         NULL,
  created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_composio_acct_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_composio_user_app (user_id, app_name),
  INDEX idx_composio_acct_user_id (user_id)
);
