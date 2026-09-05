-- KPI Snapshots: daily computed metrics per customer.
-- Stores computed values only — no raw client data.
-- Enables trend analysis, the AI COO learning loop, and peer benchmarks over time.

CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE        NOT NULL,

  -- Finance (from Stripe)
  invoiced_mtd_usd   NUMERIC(12, 2),  -- invoiced this month-to-date
  paid_mtd_usd       NUMERIC(12, 2),  -- collected this month-to-date
  overdue_usd        NUMERIC(12, 2),  -- outstanding past-due balance

  -- Pipeline (from HubSpot)
  pipeline_value_usd NUMERIC(12, 2),  -- total open pipeline
  open_deals_count   INTEGER,
  deals_won_mtd      INTEGER,         -- deals closed-won this month

  -- Delivery / utilization — populated when Harvest/ClickUp connected (nullable)
  utilization_pct    NUMERIC(5, 2),   -- logged hours / capacity hours

  -- Computed at snapshot time
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT kpi_snapshots_user_date UNIQUE (user_id, snapshot_date)
);

-- Fast lookups for the trend queries (last N days per user)
CREATE INDEX IF NOT EXISTS kpi_snapshots_user_date_idx
  ON kpi_snapshots (user_id, snapshot_date DESC);

-- RLS: each customer sees only their own snapshots
ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY kpi_snapshots_owner ON kpi_snapshots
  FOR ALL USING (user_id = auth.uid());
