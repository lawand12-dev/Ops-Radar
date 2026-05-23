import type { ToolDefinition, ToolResult } from "../tool-types";
import { AppError } from "../../../lib/errors";

const getExecutions: ToolDefinition = {
  name: "get_executions",
  description:
    "List recent executions for an n8n workflow. Shows status (success/error), timing, and error messages. Useful for diagnosing workflow failures.",
  inputSchema: {
    type: "object",
    properties: {
      n8n_workflow_id: {
        type: "string",
        description: "The n8n workflow ID (get it from list_projects)"
      },
      limit: {
        type: "number",
        description: "Number of executions to return (1–25, default 10)"
      },
      status: {
        type: "string",
        description: "Filter by execution status: 'success', 'error', 'waiting', or omit for all"
      }
    },
    required: ["n8n_workflow_id"]
  },
  rateLimit: { maxRequests: 20, windowMs: 60_000 },
  async execute(args, _context): Promise<ToolResult> {
    const workflowId =
      typeof args["n8n_workflow_id"] === "string" ? args["n8n_workflow_id"].trim() : "";
    const limit = Math.min(Math.max(1, Number(args["limit"] ?? 10)), 25);
    const status = typeof args["status"] === "string" ? args["status"].trim() : undefined;

    if (!workflowId) {
      return { success: false, error: "n8n_workflow_id is required." };
    }

    try {
      const { listN8nExecutions } = await import("../../n8n/n8n-client");

      const executions = await listN8nExecutions({
        workflowId,
        limit,
        status
      });

      return {
        success: true,
        data: {
          n8n_workflow_id: workflowId,
          count: executions.length,
          executions: executions.map((e) => ({
            id: e.id,
            status: e.status,
            finished: e.finished,
            mode: e.mode,
            started_at: e.startedAt,
            stopped_at: e.stoppedAt,
            error: e.error
          }))
        }
      };
    } catch (err) {
      if (err instanceof AppError) {
        return {
          success: false,
          error: `${err.code}: ${err.message}`
        };
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to fetch executions."
      };
    }
  }
};

export default getExecutions;
