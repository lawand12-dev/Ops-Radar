import type { RowDataPacket } from "mysql2/promise";
import type { ToolDefinition, ToolResult } from "../tool-types";
import { dbQuery, getDb } from "../../../lib/db";
import { validateWorkflowSecurity } from "../../validation/workflow-validator";
import { updateWorkflowById } from "../../workflows/workflow-repository";
import type { N8nWorkflow } from "../../../types/workflow";

interface OwnershipRow extends RowDataPacket {
  workflow_id: string;
  user_id: string;
}

const updateWorkflowJson: ToolDefinition = {
  name: "update_workflow_json",
  description:
    "Update a workflow's JSON in the database. Use this to fix node configuration issues (e.g. scheduleTrigger parameters) before redeploying. After updating, call deploy_workflow to push the fix to n8n.",
  inputSchema: {
    type: "object",
    properties: {
      workflow_id: {
        type: "string",
        description: "The workflow UUID (from get_workflow or list_projects)"
      },
      workflow_json: {
        type: "object",
        description:
          "The corrected workflow JSON object. Must contain 'nodes' (array) and 'connections' (object)."
      }
    },
    required: ["workflow_id", "workflow_json"]
  },
  rateLimit: { maxRequests: 10, windowMs: 60_000 },
  async execute(args, context): Promise<ToolResult> {
    const workflowId =
      typeof args["workflow_id"] === "string" ? args["workflow_id"].trim() : "";
    const workflowJson = args["workflow_json"];

    if (!workflowId) {
      return { success: false, error: "workflow_id is required." };
    }
    if (!workflowJson || typeof workflowJson !== "object") {
      return { success: false, error: "workflow_json must be an object." };
    }

    const json = workflowJson as Record<string, unknown>;
    if (!Array.isArray(json.nodes)) {
      return { success: false, error: "workflow_json.nodes must be an array." };
    }
    if (!json.connections || typeof json.connections !== "object") {
      return { success: false, error: "workflow_json.connections must be an object." };
    }

    // Verify ownership: only allow updating workflows that belong to the user
    try {
      const [rows] = await dbQuery<OwnershipRow[]>(
        getDb(),
        `SELECT w.id AS workflow_id, p.user_id
         FROM   workflows w
         JOIN   projects  p ON p.id = w.project_id
         WHERE  w.id = ? AND p.user_id = ?`,
        [workflowId, context.userId]
      );

      if (!rows.length) {
        return { success: false, error: "Workflow not found or access denied." };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "DB error" };
    }

    // Run security validation on the new JSON
    const typedJson = workflowJson as unknown as N8nWorkflow;
    const validation = validateWorkflowSecurity(typedJson);

    try {
      await updateWorkflowById(workflowId, {
        json: typedJson,
        status: validation.valid ? "validated" : "rejected",
        validationErrors: validation.valid ? null : validation.errors
      });

      return {
        success: true,
        data: {
          workflow_id: workflowId,
          validation_passed: validation.valid,
          validation_errors: validation.valid ? null : validation.errors,
          next_step: validation.valid
            ? "Call deploy_workflow with this project_id to push the fix to n8n."
            : "Workflow failed security validation. Fix the reported errors first."
        }
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to update workflow."
      };
    }
  }
};

export default updateWorkflowJson;
