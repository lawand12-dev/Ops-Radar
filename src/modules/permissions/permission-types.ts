export type PermissionOutcome = "granted" | "denied";

export interface PermissionCheckResult {
  outcome: PermissionOutcome;
  reason: string;
}

export const ALL_TOOLS = [
  "run_workflow",
  "get_reports",
  "send_email",
  "search_database",
  "fetch_user_data",
  "generate_invoice",
  "create_task",
  "list_projects",
  "get_workflow",
  "deploy_workflow",
  "control_workflow",
  "get_executions",
  "update_workflow_json"
] as const;

export type ToolName = (typeof ALL_TOOLS)[number];
