import { env } from "../../config/env";
import { logInfo, logWarn, logError } from "../../lib/logger";
import { callAiWithTools } from "../../lib/ai-client";
import type { AiMessage, AiToolUseBlock } from "../../lib/ai-client";
import { getRedis } from "../../lib/db-redis";
import {
  loadWorkingMemory,
  saveWorkingMemory,
  clearWorkingMemory
} from "./agent-memory";
import {
  createSession,
  updateSessionStatus,
  appendTurn
} from "./agent-session";
import { executeTool } from "../tools/tool-executor";
import { getToolsAsAiSchema } from "../tools/tool-registry";
import type { ToolName } from "../permissions/permission-types";
import { publishAgentEvent } from "../realtime/event-bus";

const AGENT_SYSTEM_PROMPT = `You are a production AI agent with access to tools.
Think step by step. Use tools when needed to accomplish the user's goal.
When you have enough information, provide a final answer.`;

const MAX_CONSECUTIVE_ERRORS = 3;

export interface AgentLoopInput {
  userMessage: string;
  userId: string;
  sessionId?: string;
  anthropicApiKey?: string | null;
  n8nBaseUrl?: string | null;
  n8nApiKey?: string | null;
}

export interface AgentLoopResult {
  sessionId: string;
  finalAnswer: string;
  turnCount: number;
  status: "completed" | "failed" | "cancelled";
}

export async function runAgentLoop(input: AgentLoopInput): Promise<AgentLoopResult> {
  const redis = getRedis();
  const model = env.ANTHROPIC_MODEL;
  const maxTurns = env.AGENT_MAX_TURNS;

  // Create or resume session
  let sessionId = input.sessionId;
  if (!sessionId) {
    const session = await createSession({
      userId: input.userId,
      model,
      title: input.userMessage.slice(0, 80)
    });
    sessionId = session.id;
  }

  logInfo("agent-loop", "Loop started", { session_id: sessionId, user_id: input.userId });

  // Load conversation history from Redis working memory
  const messages: AiMessage[] = await loadWorkingMemory(redis, sessionId);

  // Append the new user message
  messages.push({ role: "user", content: input.userMessage });
  await appendTurn({
    sessionId,
    turnIndex: messages.length - 1,
    role: "user",
    content: input.userMessage
  });

  const tools = getToolsAsAiSchema();
  let consecutiveErrors = 0;
  let lastToolCallKey = "";

  for (let turn = 0; turn < maxTurns; turn++) {
    // --- THINK ---
    let aiResponse;
    try {
      aiResponse = await callAiWithTools(
        messages,
        tools,
        AGENT_SYSTEM_PROMPT,
        input.anthropicApiKey
      );
    } catch (err) {
      consecutiveErrors++;
      logError("agent-loop", "AI call failed", {
        session_id: sessionId,
        turn,
        error: err instanceof Error ? err.message : String(err)
      });
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        await updateSessionStatus(sessionId, "failed");
        await clearWorkingMemory(redis, sessionId);
        publishAgentEvent({ type: "error", sessionId, message: "Too many consecutive AI errors" });
        return { sessionId, finalAnswer: "Agent failed due to repeated AI errors.", turnCount: turn, status: "failed" };
      }
      continue;
    }
    consecutiveErrors = 0;

    const assistantContent = aiResponse.content;
    messages.push({ role: "assistant", content: assistantContent });
    await appendTurn({
      sessionId,
      turnIndex: messages.length - 1,
      role: "assistant",
      content: assistantContent
    });

    // Extract text blocks for thinking
    const textBlocks = assistantContent.filter((b) => b.type === "text") as Array<{ type: "text"; text: string }>;
    const thinkText = textBlocks.map((b) => b.text).join("\n").trim();
    if (thinkText) {
      publishAgentEvent({ type: "think", sessionId, text: thinkText });
    }

    // --- Check for final answer ---
    if (aiResponse.stop_reason === "end_turn" || !assistantContent.some((b) => b.type === "tool_use")) {
      const finalText = thinkText || "Done.";
      publishAgentEvent({ type: "final_answer", sessionId, text: finalText });
      await updateSessionStatus(sessionId, "completed");
      await saveWorkingMemory(redis, sessionId, messages);
      logInfo("agent-loop", "Loop completed", { session_id: sessionId, turns: turn + 1 });
      return { sessionId, finalAnswer: finalText, turnCount: turn + 1, status: "completed" };
    }

    // --- ACT: execute tool calls ---
    const toolUseBlocks = assistantContent.filter((b) => b.type === "tool_use") as AiToolUseBlock[];
    const toolResults: AiMessage["content"] = [];

    for (const toolUse of toolUseBlocks) {
      const toolCallKey = `${toolUse.name}:${JSON.stringify(toolUse.input)}`;

      // Identical-args loop detection
      if (toolCallKey === lastToolCallKey) {
        logWarn("agent-loop", "Identical tool call detected, stopping loop", {
          session_id: sessionId,
          tool_name: toolUse.name
        });
        await updateSessionStatus(sessionId, "failed");
        await clearWorkingMemory(redis, sessionId);
        publishAgentEvent({ type: "error", sessionId, message: "Infinite loop detected" });
        return { sessionId, finalAnswer: "Agent stopped: infinite loop detected.", turnCount: turn, status: "failed" };
      }
      lastToolCallKey = toolCallKey;

      publishAgentEvent({ type: "tool_call", sessionId, toolName: toolUse.name, args: toolUse.input });

      // --- OBSERVE ---
      const execStart = Date.now();
      let toolResultContent: string;
      try {
        const result = await executeTool({
          toolName: toolUse.name as ToolName,
          args: toolUse.input,
          context: {
            userId: input.userId,
            sessionId,
            n8nBaseUrl: input.n8nBaseUrl,
            n8nApiKey: input.n8nApiKey
          }
        });
        toolResultContent = JSON.stringify(result.data ?? result.error ?? "ok");
        const latencyMs = Date.now() - execStart;
        publishAgentEvent({ type: "tool_result", sessionId, toolName: toolUse.name, result: result.data, latencyMs });
      } catch (err) {
        toolResultContent = JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
        consecutiveErrors++;
        publishAgentEvent({ type: "error", sessionId, message: `Tool ${toolUse.name} failed: ${toolResultContent}` });
      }

      (toolResults as Array<{ type: "tool_result"; tool_use_id: string; content: string }>).push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: toolResultContent
      });
    }

    if (toolResults.length > 0) {
      const toolResultMessage: AiMessage = { role: "user", content: toolResults as AiMessage["content"] };
      messages.push(toolResultMessage);
      await appendTurn({
        sessionId,
        turnIndex: messages.length - 1,
        role: "tool",
        content: toolResults as AiMessage["content"]
      });
    }
  }

  // Max turns reached
  await updateSessionStatus(sessionId, "failed");
  await saveWorkingMemory(redis, sessionId, messages);
  publishAgentEvent({ type: "error", sessionId, message: `Max turns (${maxTurns}) reached` });
  return { sessionId, finalAnswer: `Agent stopped after ${maxTurns} turns without completing.`, turnCount: maxTurns, status: "failed" };
}
