-- FO white-label branding: per-FO logo, accent color, brand name.
-- Powers: "Branded as your firm (optional white-label)" — FO tier.
CREATE TABLE IF NOT EXISTS fo_branding (
  fo_user_id        uuid PRIMARY KEY,
  brand_name        text,
  logo_url          text,
  accent_color      text,
  email_from_name   text,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fo_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fo manages own branding" ON fo_branding;
CREATE POLICY "fo manages own branding" ON fo_branding
  FOR ALL
  USING (auth.uid() = fo_user_id)
  WITH CHECK (auth.uid() = fo_user_id);
