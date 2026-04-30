export type ProjectStatus = "draft" | "active" | "failed";

export type WorkflowStatus =
  | "draft"
  | "validated"
  | "approved"
  | "deployed"
  | "rejected"
  | "failed";

export type ChatRole = "user" | "ai";
export type EventType =
  | "run_started"
  | "run_succeeded"
  | "run_failed"
  | "node_started"
  | "node_succeeded"
  | "node_failed";

export type AlertType = "high_failure_rate" | "workflow_failure_burst";

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
  nodes: N8nNode[];
  connections: N8nConnections;
  settings?: Record<string, unknown>;
}

export interface AiWorkflowOutput {
  project_name: string;
  description: string;
  workflow: N8nWorkflow;
}

export interface ProjectRecord {
  id: string;
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
  workflow_id: string;
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
