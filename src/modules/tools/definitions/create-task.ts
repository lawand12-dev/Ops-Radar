import { randomUUID } from "node:crypto";
import type { ToolDefinition, ToolResult } from "../tool-types";
import { dbQuery, getDb } from "../../../lib/db";
import { logInfo } from "../../../lib/logger";

const createTask: ToolDefinition = {
  name: "create_task",
  description: "Create a new project task record in the database for the current user.",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Task title" },
      description: { type: "string", description: "Task details (optional)" },
      project_id: { type: "string", description: "Project to attach this task to (optional)" }
    },
    required: ["title"]
  },
  rateLimit: { maxRequests: 20, windowMs: 60_000 },
  async execute(args, context): Promise<ToolResult> {
    const title = String(args["title"] ?? "").trim();
    if (!title) return { success: false, error: "title is required" };

    const id = randomUUID();
    try {
      await dbQuery(
        getDb(),
        `INSERT INTO workflow_tasks (id, user_id, project_id, title, description, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [
          id,
          context.userId,
          args["project_id"] ? String(args["project_id"]) : null,
          title,
          args["description"] ? String(args["description"]) : null
        ]
      );
      logInfo("tool:create_task", "Task created", { user_id: context.userId, task_id: id, title });
      return { success: true, data: { id, title, status: "pending" } };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "DB error" };
    }
  }
};

export default createTask;
