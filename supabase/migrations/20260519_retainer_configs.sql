-- Retainer configs: customer-defined fixed-fee monthly contracts with included hours.
-- Powers the Pro-tier retainer surface and the retainer_overage agentic action.
-- Branch: main / Supabase (per branch-organization.md).

CREATE TABLE IF NOT EXISTS retainer_configs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL,
  client_name_display text NOT NULL,
  client_name_norm    text NOT NULL,
  monthly_amount_usd  numeric NOT NULL DEFAULT 0,
  included_hours      numeric NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_name_norm)
);

CREATE INDEX IF NOT EXISTS retainer_configs_user_idx ON retainer_configs (user_id);

ALTER TABLE retainer_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can manage own retainer configs" ON retainer_configs;
CREATE POLICY "users can manage own retainer configs" ON retainer_configs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
