import type { RowDataPacket } from "mysql2/promise";
import type { ToolDefinition, ToolResult } from "../tool-types";
import { dbQuery, getDb } from "../../../lib/db";

interface WorkflowRow extends RowDataPacket {
  project_id: string;
  project_name: string;
  project_status: string;
  workflow_id: string;
  workflow_status: string;
  n8n_workflow_id: string | null;
  json: string;
  validation_errors: string | null;
  last_deployed_at: Date | string | null;
}

const getWorkflow: ToolDefinition = {
  name: "get_workflow",
  description:
    "Get the full workflow JSON and metadata for a specific project. Use this to inspect a workflow before fixing or redeploying it.",
  inputSchema: {
    type: "object",
    properties: {
      project_id: {
        type: "string",
        description: "The project UUID (get it from list_projects)"
      }
    },
    required: ["project_id"]
  },
  rateLimit: { maxRequests: 20, windowMs: 60_000 },
  async execute(args, context): Promise<ToolResult> {
    const projectId = typeof args["project_id"] === "string" ? args["project_id"].trim() : "";
    if (!projectId) {
      return { success: false, error: "project_id is required." };
    }

    try {
      const [rows] = await dbQuery<WorkflowRow[]>(
        getDb(),
        `SELECT p.id           AS project_id,
                p.name         AS project_name,
                p.status       AS project_status,
                w.id           AS workflow_id,
                w.status       AS workflow_status,
                w.n8n_workflow_id,
                w.json,
                w.validation_errors,
                w.last_deployed_at
         FROM   projects p
         JOIN   workflows w ON w.project_id = p.id
         WHERE  p.id = ? AND p.user_id = ?
         ORDER  BY w.created_at DESC
         LIMIT  1`,
        [projectId, context.userId]
      );

      const r = rows[0];
      if (!r) {
        return { success: false, error: "Project not found or access denied." };
      }

      let parsedJson: unknown = null;
      try {
        parsedJson = JSON.parse(r.json);
      } catch {
        parsedJson = r.json;
      }

      let validationErrors: unknown = null;
      if (r.validation_errors) {
        try {
          validationErrors = JSON.parse(r.validation_errors);
        } catch {
          validationErrors = r.validation_errors;
        }
      }

      return {
        success: true,
        data: {
          project_id: r.project_id,
          project_name: r.project_name,
          project_status: r.project_status,
          workflow_id: r.workflow_id,
          workflow_status: r.workflow_status,
          n8n_workflow_id: r.n8n_workflow_id ?? null,
          validation_errors: validationErrors,
          last_deployed_at: r.last_deployed_at
            ? r.last_deployed_at instanceof Date
              ? r.last_deployed_at.toISOString()
              : String(r.last_deployed_at)
            : null,
          workflow_json: parsedJson
        }
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "DB error" };
    }
  }
};

export default getWorkflow;
