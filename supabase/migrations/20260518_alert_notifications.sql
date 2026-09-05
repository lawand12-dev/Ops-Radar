-- supabase/migrations/20260518_alert_notifications.sql
-- Deduplication table for threshold-based alert emails.
-- Prevents re-sending the same alert for the same entity within the cooldown window.

CREATE TABLE IF NOT EXISTS alert_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  alert_kind text NOT NULL,
  entity_name text NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  email_sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS alert_notifications_lookup
  ON alert_notifications (user_id, alert_kind, entity_name, triggered_at DESC);

ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;

-- Only the service role (server-side) can read/write alert notifications.
-- No user-facing RLS policy needed since this table is only accessed server-side.
CREATE POLICY "service_role_only" ON alert_notifications
  USING (false)
  WITH CHECK (false);
