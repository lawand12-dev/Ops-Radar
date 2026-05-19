-- Customer-registered outgoing webhooks for event delivery.
-- Powers the Pro/FO-tier "Custom alerts, webhooks" promise. Branch: main / Supabase.

CREATE TABLE IF NOT EXISTS outgoing_webhooks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  url          text NOT NULL,
  events       text[] NOT NULL DEFAULT ARRAY[]::text[],
  signing_secret text NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outgoing_webhooks_user_idx ON outgoing_webhooks (user_id);
CREATE INDEX IF NOT EXISTS outgoing_webhooks_active_idx ON outgoing_webhooks (user_id, is_active);

ALTER TABLE outgoing_webhooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own webhooks" ON outgoing_webhooks;
CREATE POLICY "users manage own webhooks" ON outgoing_webhooks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id      uuid NOT NULL REFERENCES outgoing_webhooks(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  event_type      text NOT NULL,
  payload         jsonb NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  response_status integer,
  response_body   text,
  attempts        integer NOT NULL DEFAULT 0,
  delivered_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_deliveries_user_idx ON webhook_deliveries (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_deliveries_webhook_idx ON webhook_deliveries (webhook_id, created_at DESC);

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own webhook deliveries" ON webhook_deliveries;
CREATE POLICY "users read own webhook deliveries" ON webhook_deliveries
  FOR SELECT USING (auth.uid() = user_id);
