-- Service-mix dimension for benchmarks. Powers the pricing-page promise:
-- "Peer benchmarks by team size and service mix" (Growth+) and the OpsRadar Index
-- drill-down. 'all' = pooled cohort, preserves prior team-size-only numbers.

ALTER TABLE benchmarks
  ADD COLUMN IF NOT EXISTS service_mix_bucket text NOT NULL DEFAULT 'all';

ALTER TABLE benchmarks DROP CONSTRAINT IF EXISTS benchmarks_metric_team_size_bucket_key;
ALTER TABLE benchmarks DROP CONSTRAINT IF EXISTS benchmarks_metric_team_size_bucket_service_mix_bucket_key;
ALTER TABLE benchmarks
  ADD CONSTRAINT benchmarks_metric_team_size_bucket_service_mix_bucket_key
  UNIQUE (metric, team_size_bucket, service_mix_bucket);

DROP INDEX IF EXISTS benchmarks_lookup_idx;
CREATE INDEX IF NOT EXISTS benchmarks_lookup_idx
  ON benchmarks (team_size_bucket, service_mix_bucket, metric);
