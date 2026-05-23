import type { ToolDefinition, ToolResult } from "../tool-types";
import { logInfo } from "../../../lib/logger";

const sendEmail: ToolDefinition = {
  name: "send_email",
  description: "Send a plain-text email to a recipient. Requires send_email permission.",
  inputSchema: {
    type: "object",
    properties: {
      to: { type: "string", description: "Recipient email address" },
      subject: { type: "string", description: "Email subject" },
      body: { type: "string", description: "Plain text email body" }
    },
    required: ["to", "subject", "body"]
  },
  rateLimit: { maxRequests: 5, windowMs: 60_000 },
  async execute(args, context): Promise<ToolResult> {
    const to = String(args["to"] ?? "").trim();
    const subject = String(args["subject"] ?? "").trim();
    const body = String(args["body"] ?? "").trim();

    if (!to || !subject || !body) {
      return { success: false, error: "to, subject, and body are required" };
    }

    // Stub: in production wire this to an SMTP service or transactional email provider.
    logInfo("tool:send_email", "Email queued", { user_id: context.userId, to, subject });
    return {
      success: true,
      data: { queued: true, to, subject, note: "Email delivery not yet wired to SMTP" }
    };
  }
};

export default sendEmail;
