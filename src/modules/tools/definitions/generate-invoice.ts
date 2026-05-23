import type { ToolDefinition, ToolResult } from "../tool-types";
import { randomUUID } from "node:crypto";
import { logInfo } from "../../../lib/logger";

const generateInvoice: ToolDefinition = {
  name: "generate_invoice",
  description: "Generate an invoice with line items and return a reference ID.",
  inputSchema: {
    type: "object",
    properties: {
      recipient: { type: "string", description: "Invoice recipient name or email" },
      items: {
        type: "array",
        description: "Line items",
        items: {
          type: "object",
          properties: {
            description: { type: "string" },
            quantity: { type: "number" },
            unit_price: { type: "number" }
          }
        }
      },
      currency: { type: "string", description: "ISO 4217 currency code (default: USD)" }
    },
    required: ["recipient", "items"]
  },
  rateLimit: { maxRequests: 10, windowMs: 60_000 },
  async execute(args, context): Promise<ToolResult> {
    const recipient = String(args["recipient"] ?? "").trim();
    if (!recipient) return { success: false, error: "recipient is required" };

    const items = Array.isArray(args["items"]) ? args["items"] : [];
    const currency = String(args["currency"] ?? "USD").toUpperCase();
    const total = items.reduce((sum: number, item: Record<string, unknown>) => {
      return sum + (Number(item["quantity"] ?? 1) * Number(item["unit_price"] ?? 0));
    }, 0);

    const invoiceId = randomUUID();
    logInfo("tool:generate_invoice", "Invoice generated", {
      user_id: context.userId,
      invoice_id: invoiceId,
      recipient,
      total,
      currency
    });

    return {
      success: true,
      data: { invoice_id: invoiceId, recipient, items, total, currency, status: "draft" }
    };
  }
};

export default generateInvoice;
