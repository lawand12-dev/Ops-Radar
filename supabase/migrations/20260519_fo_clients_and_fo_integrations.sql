-- FO multi-client dashboard: one FO operator owns N managed agencies.
-- Each agency has its own per-tool API keys (Model C). Branch: main / Supabase.

CREATE TABLE IF NOT EXISTS fo_clients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fo_user_id   uuid NOT NULL,
  agency_name  text NOT NULL,
  team_size    text,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fo_clients_user_idx ON fo_clients (fo_user_id);

ALTER TABLE fo_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fo owns their clients" ON fo_clients;
CREATE POLICY "fo owns their clients" ON fo_clients
  FOR ALL USING (auth.uid() = fo_user_id) WITH CHECK (auth.uid() = fo_user_id);

CREATE TABLE IF NOT EXISTS fo_integrations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fo_client_id     uuid NOT NULL REFERENCES fo_clients(id) ON DELETE CASCADE,
  fo_user_id       uuid NOT NULL,
  tool             text NOT NULL,
  encrypted_token  text NOT NULL,
  iv               text NOT NULL,
  auth_tag         text NOT NULL,
  status           text NOT NULL DEFAULT 'connected',
  connected_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fo_client_id, tool)
);

CREATE INDEX IF NOT EXISTS fo_integrations_client_idx ON fo_integrations (fo_client_id);

ALTER TABLE fo_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fo owns their client integrations" ON fo_integrations;
CREATE POLICY "fo owns their client integrations" ON fo_integrations
  FOR ALL USING (auth.uid() = fo_user_id) WITH CHECK (auth.uid() = fo_user_id);
