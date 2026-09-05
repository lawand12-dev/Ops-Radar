-- FO partner audit log: append-only record of every action the FO takes across
-- their managed agencies. Powers: "Partner permissions and audit logs across the book"
CREATE TABLE IF NOT EXISTS fo_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fo_user_id    uuid NOT NULL,
  fo_client_id  uuid REFERENCES fo_clients(id) ON DELETE SET NULL,
  action_kind   text NOT NULL,
  details       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fo_audit_log_user_idx ON fo_audit_log (fo_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fo_audit_log_client_idx ON fo_audit_log (fo_client_id, created_at DESC);

ALTER TABLE fo_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fo reads own audit log" ON fo_audit_log;
CREATE POLICY "fo reads own audit log" ON fo_audit_log
  FOR SELECT USING (auth.uid() = fo_user_id);
