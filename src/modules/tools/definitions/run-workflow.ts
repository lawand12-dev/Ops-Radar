import type { ToolDefinition, ToolContext, ToolResult } from "../tool-types";
import { env } from "../../../config/env";

const runWorkflow: ToolDefinition = {
  name: "run_workflow",
  description: "Trigger an n8n workflow by its ID and return the execution result.",
  inputSchema: {
    type: "object",
    properties: {
      workflow_id: { type: "string", description: "The n8n workflow ID to trigger" },
      payload: { type: "object", description: "Optional JSON payload to send" }
    },
    required: ["workflow_id"]
  },
  rateLimit: { maxRequests: 10, windowMs: 60_000 },
  async execute(args, context: ToolContext): Promise<ToolResult> {
    const workflowId = String(args["workflow_id"] ?? "").trim();
    if (!workflowId) {
      return { success: false, error: "workflow_id is required" };
    }

    const baseUrl = (context.n8nBaseUrl ?? env.N8N_BASE_URL ?? "").replace(/\/+$/, "");
    const webhookBase = (env.AGENT_N8N_WEBHOOK_BASE_URL ?? baseUrl).replace(/\/+$/, "");
    const url = `${webhookBase}/webhook/${encodeURIComponent(workflowId)}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(context.n8nApiKey ? { "X-N8N-API-KEY": context.n8nApiKey } : {})
        },
        body: JSON.stringify(args["payload"] ?? {}),
        signal: AbortSignal.timeout(30_000)
      });

      const text = await response.text();
      let data: unknown = text;
      try { data = JSON.parse(text); } catch { /* keep text */ }

      return { success: response.ok, data, error: response.ok ? undefined : `HTTP ${response.status}` };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }
};

export default runWorkflow;
