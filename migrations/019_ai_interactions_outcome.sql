-- Outcome lineage on ai_interactions.
--
-- Today the table records the AI call (prompt, response, tokens, latency)
-- but loses track of what happened next. This migration closes that edge:
--   project_id            owning project for the AI-generated artifact
--   workflow_id           workflow produced from this interaction (if any)
--   matched_pattern_ids   JSON array of Pattern Card ids @version selected
--                         by the deterministic selector when building the
--                         prompt (lets us measure card→outcome quality)
--   outcome               lifecycle state of the produced artifact:
--                           pending    - artifact created, not yet settled
--                           validated  - passed structural+security checks
--                           rejected   - validation failed; not deployed
--                           deployed   - active in n8n
--                           failed_in_n8n - deployed then started failing
--                           superseded - pending too long; reconciler gave up
--                           unknown    - pre-existing row from before tracking
--   outcome_settled_at    when outcome transitioned away from pending
--
-- Reconciliation runs out-of-band (src/modules/ai/outcome-reconciler.ts):
-- it reads workflow status + recent events and advances `outcome`. Existing
-- rows are stamped 'unknown' so the reconciler ignores them (no project_id
-- linkage exists for the historic backlog).

ALTER TABLE ai_interactions
  ADD COLUMN project_id CHAR(36) NULL AFTER user_id,
  ADD COLUMN workflow_id CHAR(36) NULL AFTER project_id,
  ADD COLUMN matched_pattern_ids JSON NULL AFTER workflow_id,
  ADD COLUMN outcome VARCHAR(32) NOT NULL DEFAULT 'pending' AFTER matched_pattern_ids,
  ADD COLUMN outcome_settled_at TIMESTAMP NULL AFTER outcome;

-- Historic backlog: no project/workflow linkage available, so mark closed
-- and stamp settled_at = created_at to avoid noisy reconciler iterations.
UPDATE ai_interactions
SET outcome = 'unknown',
    outcome_settled_at = created_at
WHERE outcome = 'pending'
  AND workflow_id IS NULL;

ALTER TABLE ai_interactions
  ADD INDEX idx_ai_interactions_project (project_id),
  ADD INDEX idx_ai_interactions_workflow (workflow_id),
  ADD INDEX idx_ai_interactions_outcome (outcome, created_at);
