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
  "create_task"
] as const;

export type ToolName = (typeof ALL_TOOLS)[number];
