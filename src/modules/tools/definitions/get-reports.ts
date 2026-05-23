import type { RowDataPacket } from "mysql2/promise";
import type { ToolDefinition, ToolResult } from "../tool-types";
import { dbQuery, getDb } from "../../../lib/db";

interface ReportRow extends RowDataPacket {
  id: string;
  title: string;
  report_type: string;
  email_delivered: number;
  created_at: Date | string;
}

const getReports: ToolDefinition = {
  name: "get_reports",
  description: "Retrieve recent AI-generated reports for the current user.",
  inputSchema: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Max reports to return (1-20, default 5)" }
    }
  },
  rateLimit: { maxRequests: 30, windowMs: 60_000 },
  async execute(args, context): Promise<ToolResult> {
    const limit = Math.min(Math.max(1, Number(args["limit"] ?? 5)), 20);
    try {
      const [rows] = await dbQuery<ReportRow[]>(
        getDb(),
        `SELECT id, title, report_type, email_delivered, created_at FROM ai_reports
         WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
        [context.userId, limit]
      );
      return {
        success: true,
        data: rows.map((r) => ({
          id: r.id,
          title: r.title,
          report_type: r.report_type,
          email_delivered: r.email_delivered === 1,
          created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)
        }))
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "DB error" };
    }
  }
};

export default getReports;
