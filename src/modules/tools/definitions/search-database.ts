import type { RowDataPacket } from "mysql2/promise";
import type { ToolDefinition, ToolResult } from "../tool-types";
import { dbQuery, getDb } from "../../../lib/db";

interface ProjectRow extends RowDataPacket {
  id: string;
  name: string;
  status: string;
}

const searchDatabase: ToolDefinition = {
  name: "search_database",
  description: "Search projects by name keyword for the current user.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search keyword for project name" },
      limit: { type: "number", description: "Max results (1-20, default 10)" }
    },
    required: ["query"]
  },
  rateLimit: { maxRequests: 20, windowMs: 60_000 },
  async execute(args, context): Promise<ToolResult> {
    const query = String(args["query"] ?? "").trim();
    if (!query) return { success: false, error: "query is required" };
    const limit = Math.min(Math.max(1, Number(args["limit"] ?? 10)), 20);

    try {
      const [rows] = await dbQuery<ProjectRow[]>(
        getDb(),
        `SELECT id, name, status FROM projects
         WHERE user_id = ? AND name LIKE ? ORDER BY created_at DESC LIMIT ?`,
        [context.userId, `%${query}%`, limit]
      );
      return { success: true, data: rows.map((r) => ({ id: r.id, name: r.name, status: r.status })) };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "DB error" };
    }
  }
};

export default searchDatabase;
