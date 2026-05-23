import type { RowDataPacket } from "mysql2/promise";
import type { ToolDefinition, ToolResult } from "../tool-types";
import { dbQuery, getDb } from "../../../lib/db";

interface ProjectRow extends RowDataPacket {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: Date | string;
  workflow_id: string | null;
  workflow_status: string | null;
  n8n_workflow_id: string | null;
}

const listProjects: ToolDefinition = {
  name: "list_projects",
  description:
    "List the current user's projects with their workflow deployment status and n8n IDs. Use this to find project IDs before deploying or controlling workflows.",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Max projects to return (1–20, default 10)"
      },
      status: {
        type: "string",
        description: "Filter by project status: 'active', 'draft', or 'all' (default 'all')"
      }
    }
  },
  rateLimit: { maxRequests: 30, windowMs: 60_000 },
  async execute(args, context): Promise<ToolResult> {
    const limit = Math.min(Math.max(1, Number(args["limit"] ?? 10)), 20);
    const status = typeof args["status"] === "string" ? args["status"].trim() : "all";
    const filterByStatus = status !== "all" && status.length > 0;

    try {
      const [rows] = await dbQuery<ProjectRow[]>(
        getDb(),
        `SELECT p.id, p.name, p.description, p.status, p.created_at,
                w.id           AS workflow_id,
                w.status       AS workflow_status,
                w.n8n_workflow_id
         FROM   projects p
         LEFT JOIN workflows w
           ON  w.project_id = p.id
           AND w.id = (
               SELECT id FROM workflows
               WHERE  project_id = p.id
               ORDER  BY created_at DESC LIMIT 1
           )
         WHERE  p.user_id = ?
         ${filterByStatus ? "AND p.status = ?" : ""}
         ORDER  BY p.updated_at DESC, p.created_at DESC
         LIMIT  ?`,
        filterByStatus ? [context.userId, status, limit] : [context.userId, limit]
      );

      return {
        success: true,
        data: rows.map((r) => ({
          project_id: r.id,
          name: r.name,
          description: r.description,
          status: r.status,
          workflow_status: r.workflow_status ?? "none",
          n8n_workflow_id: r.n8n_workflow_id ?? null,
          workflow_id: r.workflow_id ?? null,
          created_at:
            r.created_at instanceof Date
              ? r.created_at.toISOString()
              : String(r.created_at)
        }))
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "DB error" };
    }
  }
};

export default listProjects;
