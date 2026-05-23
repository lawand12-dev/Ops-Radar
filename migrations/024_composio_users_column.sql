ALTER TABLE users
  ADD COLUMN IF NOT EXISTS composio_api_key_encrypted TEXT NULL
  AFTER anthropic_api_key_encrypted;
