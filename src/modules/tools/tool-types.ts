import type { ToolName } from "../permissions/permission-types";

export interface ToolDefinition {
  name: ToolName;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  rateLimit?: { maxRequests: number; windowMs: number };
  execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
}

export interface ToolContext {
  userId: string;
  sessionId: string;
  n8nBaseUrl?: string | null;
  n8nApiKey?: string | null;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
