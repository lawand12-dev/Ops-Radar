import type { ToolDefinition, ToolResult } from "../tool-types";
import { AppError } from "../../../lib/errors";

const deployWorkflow: ToolDefinition = {
  name: "deploy_workflow",
  description:
    "Deploy a project's workflow to n8n. Can create a new workflow or update an existing one. Optionally activate it. Use list_projects to find the project_id first.",
  inputSchema: {
    type: "object",
    properties: {
      project_id: {
        type: "string",
        description: "The project UUID to deploy"
      },
      activate: {
        type: "boolean",
        description:
          "Whether to activate the workflow after deploy (default false). Only set true when credentials are configured in n8n."
      }
    },
    required: ["project_id"]
  },
  rateLimit: { maxRequests: 10, windowMs: 60_000 },
  async execute(args, _context): Promise<ToolResult> {
    const projectId = typeof args["project_id"] === "string" ? args["project_id"].trim() : "";
    const activate = args["activate"] === true;

    if (!projectId) {
      return { success: false, error: "project_id is required." };
    }

    try {
      const { deployProject } = await import("../../projects/project-service");
      const result = await deployProject(projectId, { activate });

      return {
        success: true,
        data: {
          project_id: result.project_id,
          workflow_id: result.workflow_id,
          n8n_workflow_id: result.n8n_workflow_id,
          workflow_status: result.workflow_status,
          activated: result.activated,
          activation_warning: result.activation_warning ?? null
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
      return { success: false, error: err instanceof Error ? err.message : "Deploy failed." };
    }
  }
};

export default deployWorkflow;
