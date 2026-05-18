-- Silent-failure signals emitted by anomaly detectors. Distinct from
-- workflow_alerts: alerts are aggregated open/resolved actionables, anomalies
-- are raw observations. One detector run can produce many anomaly rows that
-- collapse into a single alert via fingerprint dedup.
--
-- anomaly_type examples:
--   continue_on_fail_swallowed   node had an error but execution succeeded
--   zero_output                  node produced 0 items where baseline > 0
--   scheduler_drift              cron expected to fire by now did not
--   duration_anomaly             |z-score| over success-history > 3
--
-- severity matches workflow_alerts (low / medium / high / critical) so we can
-- route them through the same alert pipeline without translation.

CREATE TABLE IF NOT EXISTS execution_anomalies (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workflow_id CHAR(36) NOT NULL,
  execution_id VARCHAR(191) NULL,
  anomaly_type VARCHAR(64) NOT NULL,
  severity ENUM('low','medium','high','critical') NOT NULL,
  node_name VARCHAR(255) NULL,
  anomaly_score DECIMAL(10,4) NULL,
  metadata JSON NULL,
  detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ea_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  INDEX idx_ea_workflow (workflow_id),
  INDEX idx_ea_type (anomaly_type),
  INDEX idx_ea_severity (severity),
  INDEX idx_ea_detected_desc (detected_at)
);
