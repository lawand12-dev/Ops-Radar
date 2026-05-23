import type { RowDataPacket } from "mysql2/promise";
import type { ToolDefinition, ToolResult } from "../tool-types";
import { dbQuery, getDb } from "../../../lib/db";

interface UserRow extends RowDataPacket {
  id: string;
  email: string;
  name: string;
  created_at: Date | string;
}

const fetchUserData: ToolDefinition = {
  name: "fetch_user_data",
  description: "Fetch profile information for the currently authenticated user.",
  inputSchema: { type: "object", properties: {} },
  rateLimit: { maxRequests: 30, windowMs: 60_000 },
  async execute(_args, context): Promise<ToolResult> {
    try {
      const [rows] = await dbQuery<UserRow[]>(
        getDb(),
        `SELECT id, email, name, created_at FROM users WHERE id = ? LIMIT 1`,
        [context.userId]
      );
      const u = rows[0];
      if (!u) return { success: false, error: "User not found" };
      return {
        success: true,
        data: {
          id: u.id,
          email: u.email,
          name: u.name,
          created_at: u.created_at instanceof Date ? u.created_at.toISOString() : String(u.created_at)
        }
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "DB error" };
    }
  }
};

export default fetchUserData;
