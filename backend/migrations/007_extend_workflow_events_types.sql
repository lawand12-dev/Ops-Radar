ALTER TABLE workflow_events
  MODIFY COLUMN event_type ENUM(
    'run_started',
    'run_succeeded',
    'run_failed',
    'node_started',
    'node_succeeded',
    'node_failed',
    'workflow_deployed',
    'workflow_activated',
    'workflow_execution_success',
    'workflow_execution_failed',
    'workflow_health_warning',
    'workflow_health_failing',
    'workflow_alert_created',
    'workflow_alert_resolved'
  ) NOT NULL;
