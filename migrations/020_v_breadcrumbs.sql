-- v_breadcrumbs — unified per-user operational timeline.
--
-- Three sources unioned into one shape so the memory retrieval layer (and
-- one day a UI) can ask "what happened in this tenant" without knowing the
-- physical layout:
--
--   1. ai_interactions      every prompt the model received
--   2. workflow_events      lifecycle + run signals for owned workflows
--   3. execution_anomalies  silent-failure detector observations
--
-- Tenant scoping is structural: the view always carries user_id (derived
-- from projects.user_id) and consumers MUST filter on it. The ai_interactions
-- branch first prefers the joined project's user_id; falls back to the
-- per-row user_id (for pre-project-linkage history). Rows where the user
-- is genuinely unknown surface as user_id IS NULL — those are ignored by
-- every tenant-scoped query in src/modules/memory/breadcrumbs.ts.
--
-- Collation discipline
-- --------------------
-- Every string-typed column in every SELECT branch is forced to
-- utf8mb4_general_ci. Without this MariaDB rejects the UNION because
-- columns inherit collation from their source (projects.user_id may be
-- utf8mb4_unicode_ci, an ENUM column carries its own collation,
-- CONCAT-of-literal returns the server default). The error surface is
-- "Illegal mix of collations for operation 'UNION'".
-- JSON_OBJECT(...) returns json so it doesn't need a collation pin.
--
-- Performance: each branch hits an indexed timestamp column. The view
-- itself doesn't materialize; ORDER BY at DESC pushes into each branch
-- separately. For very large timelines, callers should pre-filter
-- (project_id, sinceHours) before ordering.

CREATE OR REPLACE VIEW v_breadcrumbs AS
SELECT
  COALESCE(p.user_id, ai.user_id) COLLATE utf8mb4_general_ci    AS user_id,
  ai.created_at                                                  AS at,
  'ai_interaction' COLLATE utf8mb4_general_ci                    AS kind,
  CAST(ai.id AS CHAR) COLLATE utf8mb4_general_ci                 AS ref_id,
  ai.project_id COLLATE utf8mb4_general_ci                       AS project_id,
  ai.workflow_id COLLATE utf8mb4_general_ci                      AS workflow_id,
  LEFT(ai.user_prompt, 500) COLLATE utf8mb4_general_ci           AS summary,
  ai.outcome COLLATE utf8mb4_general_ci                          AS outcome,
  JSON_OBJECT(
    'provider', ai.provider,
    'model', ai.model,
    'status', ai.status,
    'tokens_used', ai.tokens_used,
    'latency_ms', ai.latency_ms,
    'matched_pattern_ids', ai.matched_pattern_ids
  )                                                              AS data
FROM ai_interactions ai
LEFT JOIN projects p ON p.id = ai.project_id

UNION ALL

SELECT
  p.user_id COLLATE utf8mb4_general_ci                           AS user_id,
  we.created_at                                                  AS at,
  CONCAT('event:', we.event_type) COLLATE utf8mb4_general_ci     AS kind,
  we.id COLLATE utf8mb4_general_ci                               AS ref_id,
  p.id COLLATE utf8mb4_general_ci                                AS project_id,
  we.workflow_id COLLATE utf8mb4_general_ci                      AS workflow_id,
  COALESCE(we.error_message, we.node_name, we.event_type)
    COLLATE utf8mb4_general_ci                                   AS summary,
  CAST(we.status AS CHAR) COLLATE utf8mb4_general_ci             AS outcome,
  JSON_OBJECT(
    'event_type', we.event_type,
    'run_id', we.run_id,
    'node_name', we.node_name,
    'duration_ms', we.duration_ms,
    'metadata', we.metadata
  )                                                              AS data
FROM workflow_events we
JOIN workflows w ON w.id = we.workflow_id
JOIN projects  p ON p.id = w.project_id
WHERE we.event_type IN (
  'run_succeeded',
  'run_failed',
  'workflow_execution_success',
  'workflow_execution_failed',
  'workflow_alert_created',
  'workflow_alert_resolved',
  'workflow_deployed',
  'workflow_activated',
  'workflow_deactivated',
  'workflow_deleted',
  'workflow_health_warning',
  'workflow_health_failing'
)

UNION ALL

SELECT
  p.user_id COLLATE utf8mb4_general_ci                           AS user_id,
  ea.detected_at                                                 AS at,
  CONCAT('anomaly:', ea.anomaly_type)
    COLLATE utf8mb4_general_ci                                   AS kind,
  ea.id COLLATE utf8mb4_general_ci                               AS ref_id,
  p.id COLLATE utf8mb4_general_ci                                AS project_id,
  ea.workflow_id COLLATE utf8mb4_general_ci                      AS workflow_id,
  COALESCE(ea.node_name, ea.anomaly_type)
    COLLATE utf8mb4_general_ci                                   AS summary,
  CAST(ea.severity AS CHAR) COLLATE utf8mb4_general_ci           AS outcome,
  JSON_OBJECT(
    'anomaly_type', ea.anomaly_type,
    'anomaly_score', ea.anomaly_score,
    'execution_id', ea.execution_id,
    'metadata', ea.metadata
  )                                                              AS data
FROM execution_anomalies ea
JOIN workflows w ON w.id = ea.workflow_id
JOIN projects  p ON p.id = w.project_id;
