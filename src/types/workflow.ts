export type ProjectStatus = "draft" | "active" | "failed";

export type WorkflowStatus =
  | "draft"
  | "validated"
  | "rejected"
  | "deployed_inactive"
  | "deployed_active"
  | "failed";

export type WorkflowLifecycleState =
  | "draft"
  | "validated"
  | "rejected"
  | "deployed_inactive"
  | "deployed_active"
  | "failed"
  | "missing_in_n8n"
  | "n8n_check_failed"
  | "no_workflow";

export type ChatRole = "user" | "ai";
export type EventType =
  | "run_started"
  | "run_succeeded"
  | "run_failed"
  | "node_started"
  | "node_succeeded"
  | "node_failed"
  | "workflow_created"
  | "workflow_validated"
  | "workflow_rejected"
  | "workflow_deployed"
  | "workflow_activated"
  | "workflow_deactivated"
  | "workflow_deleted"
  | "workflow_execution_success"
  | "workflow_execution_failed"
  | "workflow_health_warning"
  | "workflow_health_failing"
  | "workflow_alert_created"
  | "workflow_alert_resolved";

export type AlertType = "high_failure_rate" | "workflow_failure_burst";

export type HealthStatus = "healthy" | "warning" | "failing" | "inactive" | "unknown";

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion?: number;
  position?: [number, number];
  parameters?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
}

export interface N8nConnectionTarget {
  node: string;
  type: string;
  index: number;
}

export type N8nConnections = Record<string, { main?: N8nConnectionTarget[][] }>;

export interface N8nWorkflow {
  name?: string;
  nodes: N8nNode[];
  connections: N8nConnections;
  settings: Record<string, unknown>;
}

export interface AiWorkflowOutput {
  project_name: string;
  description: string;
  required_credentials: string[];
  workflow: N8nWorkflow;
}

export interface ProjectRecord {
  id: string;
  /**
   * Owner of this project. Nullable because rows that pre-date migration 012
   * have no owner ("legacy unowned") and must remain visible to admin tooling.
   * All new projects MUST have a user_id set at creation time.
   */
  user_id: string | null;
  name: string;
  description: string;
  status: ProjectStatus;
  created_at: Date;
  updated_at: Date;
}

export interface WorkflowRecord {
  id: string;
  project_id: string;
  json: N8nWorkflow;
  status: WorkflowStatus;
  validation_errors: string[] | null;
  n8n_workflow_id: string | null;
  last_deployed_at: Date | null;
  last_activated_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ChatMessageRecord {
  id: number;
  session_id: string;
  role: ChatRole;
  content: string;
  created_at: Date;
}

export interface WorkflowEventRecord {
  id: string;
  workflow_id: string;
  run_id: string | null;
  node_name: string | null;
  event_type: EventType;
  status: "success" | "failure" | "info";
  duration_ms: number | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export interface AlertRecord {
  id: string;
  workflow_id: string;
  type: AlertType;
  message: string;
  is_resolved: boolean;
  created_at: Date;
  resolved_at: Date | null;
}

export interface AuditLogRecord {
  id: string;
  workflow_id: string;
  run_id: string | null;
  issue: string;
  reason: string;
  solution: string;
  raw_input: Record<string, unknown>;
  created_at: Date;
}

export interface WorkflowCredentialBindingRecord {
  id: string;
  project_id: string;
  workflow_id: string;
  node_id: string | null;
  node_name: string | null;
  credential_type: string;
  credential_id: string | null;
  credential_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface FailureAnalysis {
  issue: string;
  reason: string;
  solution: string;
}

export interface WorkflowHealthSnapshotRecord {
  id: string;
  project_id: string;
  workflow_id: string;
  n8n_workflow_id: string | null;
  status: string;
  active: boolean;
  health_status: HealthStatus;
  last_success_at: Date | null;
  last_failure_at: Date | null;
  recent_success_count: number;
  recent_failure_count: number;
  last_error_message: string | null;
  last_error_node: string | null;
  last_error_type: string | null;
  recommended_action: string | null;
  raw_summary_json: Record<string, unknown> | null;
  created_at: Date;
}

export interface WorkflowAlertRecord {
  id: string;
  project_id: string;
  workflow_id: string;
  n8n_workflow_id: string | null;
  alert_type: string;
  severity: "low" | "medium" | "high";
  message: string;
  recommended_action: string | null;
  fingerprint: string;
  failed_node: string | null;
  first_seen_at: Date;
  last_seen_at: Date;
  resolved_at: Date | null;
  status: "open" | "resolved";
  /** Incremented every time the same fingerprint upserts. Lets operators tell
   *  "this alert fired 47 times in 6h" from "this alert fired once". */
  occurrence_count: number;
}
