-- Alert recurrence visibility. Before this column, two distinct same-fingerprint
-- failures were merged into one row whose only signal was last_seen_at, so
-- operators could not tell whether an alert fired twice or two-hundred times.
-- We default existing rows to 1 to preserve correctness on history.

ALTER TABLE workflow_alerts
  ADD COLUMN occurrence_count INT NOT NULL DEFAULT 1 AFTER status;
