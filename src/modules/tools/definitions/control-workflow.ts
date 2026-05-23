import type { ToolDefinition, ToolResult } from "../tool-types";
import { AppError } from "../../../lib/errors";

const controlWorkflow: ToolDefinition = {
  name: "control_workflow",
  description:
    "Activate or deactivate an n8n workflow by its n8n workflow ID. Use list_projects to find the n8n_workflow_id. Workflows can only be activated when all required credentials are configured in n8n.",
  inputSchema: {
    type: "object",
    properties: {
      n8n_workflow_id: {
        type: "string",
        description: "The n8n workflow ID (e.g. 'xkK4T0SCrQuKkndK')"
      },
      action: {
        type: "string",
        description: "Either 'activate' or 'deactivate'"
      }
    },
    required: ["n8n_workflow_id", "action"]
  },
  rateLimit: { maxRequests: 15, windowMs: 60_000 },
  async execute(args, _context): Promise<ToolResult> {
    const workflowId =
      typeof args["n8n_workflow_id"] === "string" ? args["n8n_workflow_id"].trim() : "";
    const action = typeof args["action"] === "string" ? args["action"].trim() : "";

    if (!workflowId) {
      return { success: false, error: "n8n_workflow_id is required." };
    }
    if (action !== "activate" && action !== "deactivate") {
      return { success: false, error: "action must be 'activate' or 'deactivate'." };
    }

    try {
      const { activateN8nWorkflow, deactivateN8nWorkflow } = await import(
        "../../n8n/n8n-client"
      );

      const result =
        action === "activate"
          ? await activateN8nWorkflow(workflowId)
          : await deactivateN8nWorkflow(workflowId);

      return {
        success: true,
        data: {
          n8n_workflow_id: workflowId,
          action,
          active: Boolean(result.active)
        }
      };
    } catch (err) {
      if (err instanceof AppError) {
        return {
          success: false,
          error: `${err.code}: ${err.message}`,
          data: err.details ?? undefined
        };
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : "Control action failed."
      };
    }
  }
};

export default controlWorkflow;
