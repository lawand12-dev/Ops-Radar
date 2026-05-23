import { randomUUID } from "node:crypto";
import { dbQuery, getDb } from "../../lib/db";
import { getRedis } from "../../lib/db-redis";
import { checkRateLimit } from "../../lib/rate-limiter";
import { writeAuditLog } from "../../lib/audit-log";
import { AppError } from "../../lib/errors";
import { logInfo, logError } from "../../lib/logger";
import { checkToolPermission } from "../permissions/permission-service";
import type { ToolName } from "../permissions/permission-types";
import { getTool } from "./tool-registry";
import type { ToolContext, ToolResult } from "./tool-types";

export interface ExecuteToolInput {
  toolName: ToolName;
  args: Record<string, unknown>;
  context: ToolContext;
}

export interface ExecuteToolOutput extends ToolResult {
  executionId: string;
  latencyMs: number;
}

export async function executeTool(input: ExecuteToolInput): Promise<ExecuteToolOutput> {
  const { toolName, args, context } = input;
  const execId = randomUUID();
  const startedAt = Date.now();

  // 1. Permission check
  const perm = await checkToolPermission(context.userId, toolName);
  if (perm.outcome === "denied") {
    await writeAuditLog({
      sessionId: context.sessionId,
      userId: context.userId,
      toolName,
      args,
      outcome: "denied",
      denialCode: perm.reason
    });
    throw new AppError(403, "TOOL_PERMISSION_DENIED", `Tool "${toolName}" not permitted: ${perm.reason}`);
  }

  // 2. Tool lookup
  const tool = getTool(toolName);
  if (!tool) {
    throw new AppError(404, "TOOL_NOT_FOUND", `Tool "${toolName}" not registered.`);
  }

  // 3. Rate limit
  if (tool.rateLimit) {
    const redis = getRedis();
    const rl = await checkRateLimit(redis, {
      scope: toolName,
      userId: context.userId,
      maxRequests: tool.rateLimit.maxRequests,
      windowMs: tool.rateLimit.windowMs
    });
    if (!rl.allowed) {
      await writeAuditLog({
        sessionId: context.sessionId,
        userId: context.userId,
        toolName,
        args,
        outcome: "denied",
        denialCode: "RATE_LIMITED"
      });
      throw new AppError(429, "TOOL_RATE_LIMITED", `Tool "${toolName}" rate limit exceeded.`);
    }
  }

  // 4. Persist execution start
  await dbQuery(
    getDb(),
    `INSERT INTO agent_tool_executions
       (id, session_id, turn_id, user_id, tool_name, args_hash, status)
     VALUES (?, ?, ?, ?, ?, SHA2(?, 256), 'pending')`,
    [execId, context.sessionId, context.sessionId, context.userId, toolName, JSON.stringify(args)]
  );

  // 5. Execute
  let result: ToolResult;
  try {
    result = await tool.execute(args, context);
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const errMsg = err instanceof Error ? err.message : String(err);
    await dbQuery(
      getDb(),
      `UPDATE agent_tool_executions SET status = 'error', error_msg = ?, latency_ms = ? WHERE id = ?`,
      [errMsg.slice(0, 500), latencyMs, execId]
    );
    await writeAuditLog({
      sessionId: context.sessionId, userId: context.userId,
      toolName, args, outcome: "error", latencyMs
    });
    throw err;
  }

  const latencyMs = Date.now() - startedAt;
  const status = result.success ? "success" : "error";

  await dbQuery(
    getDb(),
    `UPDATE agent_tool_executions
     SET status = ?, result_json = ?, error_msg = ?, latency_ms = ?
     WHERE id = ?`,
    [
      status,
      result.data !== undefined ? JSON.stringify(result.data) : null,
      result.error ?? null,
      latencyMs,
      execId
    ]
  );

  await writeAuditLog({
    sessionId: context.sessionId, userId: context.userId,
    toolName, args, outcome: status === "success" ? "success" : "error", latencyMs
  });

  logInfo("tool-executor", "Tool executed", {
    tool_name: toolName, user_id: context.userId, status, latency_ms: latencyMs
  });

  return { ...result, executionId: execId, latencyMs };
}
