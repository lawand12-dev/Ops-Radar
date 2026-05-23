-- Indexes to support the memory-layer API surface (Phase A).
--
-- All additive, IF NOT EXISTS, no data movement. Safe to re-run.
-- MariaDB 10.0.2+ supports IF NOT EXISTS on ADD INDEX.

-- /memory/ai-interactions: ORDER BY created_at DESC scoped per user_id.
-- The existing idx_ai_interactions_user_id covers equality only; without
-- the timestamp tail MariaDB does a filesort over the matched rows. The
-- composite below lets the planner walk the index in DESC order directly.
ALTER TABLE ai_interactions
  ADD INDEX IF NOT EXISTS idx_ai_int_user_created (user_id, created_at);

-- /memory/ai-interactions?outcome=deployed,failed_in_n8n: per-user
-- outcome filter. The existing idx_ai_interactions_outcome covers global
-- filtering; the composite below covers the tenant-scoped path that the
-- new user-facing endpoint takes.
ALTER TABLE ai_interactions
  ADD INDEX IF NOT EXISTS idx_ai_int_user_outcome (user_id, outcome, created_at);

-- /memory/breadcrumbs project_id-scoped path: v_breadcrumbs joins
-- workflow_events via workflow_id. Existing idx_workflow_events_workflow_id
-- covers equality; adding the timestamp tail lets MariaDB walk in DESC
-- order without a filesort for the tenant's project drill-in.
ALTER TABLE workflow_events
  ADD INDEX IF NOT EXISTS idx_we_workflow_created (workflow_id, created_at);

-- Same shape for the anomaly branch of v_breadcrumbs.
ALTER TABLE execution_anomalies
  ADD INDEX IF NOT EXISTS idx_ea_workflow_detected (workflow_id, detected_at);
