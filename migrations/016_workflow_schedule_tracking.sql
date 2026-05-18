-- One row per workflow that has a scheduled trigger. The monitoring scheduler
-- uses this to detect cron-stoppage silent failures: if last_seen_run_at is
-- much older than expected_next_run_at, the cron is presumed stuck.
--
-- workflow_id is the PK because a workflow has at most one schedule tracking
-- record. Webhook and manual triggers do not write here.
--
-- scheduler_status values:
--   healthy   last run within tolerance window
--   drifting  last run late by up to a few intervals
--   stopped   no run for many intervals (likely cron stopped firing)
--   unknown   first registration, nothing observed yet

CREATE TABLE IF NOT EXISTS workflow_schedule_tracking (
  workflow_id CHAR(36) NOT NULL PRIMARY KEY,
  trigger_type VARCHAR(64) NULL,
  cron_expression VARCHAR(255) NULL,
  expected_interval_seconds INT NULL,
  expected_next_run_at TIMESTAMP NULL,
  last_seen_run_at TIMESTAMP NULL,
  scheduler_status ENUM('healthy','drifting','stopped','unknown') NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_wst_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  INDEX idx_wst_next_run (expected_next_run_at),
  INDEX idx_wst_status (scheduler_status)
);
