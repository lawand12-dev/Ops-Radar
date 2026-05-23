import { env } from "../config/env";
import { AppError } from "./errors";
import { logError, logInfo } from "./logger";

export interface AiTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface AiMessage {
  role: "user" | "assistant";
  content: string | AiContentBlock[];
}

export interface AiTextBlock {
  type: "text";
  text: string;
}

export interface AiToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AiToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
}

export type AiContentBlock = AiTextBlock | AiToolUseBlock | AiToolResultBlock;

export interface AiResponse {
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | string;
  content: AiContentBlock[];
  usage?: { input_tokens: number; output_tokens: number };
}

// ---------------------------------------------------------------------------
// Anthropic path (tool_use native format)
// ---------------------------------------------------------------------------

async function callAnthropic(
  messages: AiMessage[],
  tools: AiTool[],
  systemPrompt: string,
  apiKey: string
): Promise<AiResponse> {
  const body = {
    model: env.ANTHROPIC_MODEL,
    max_tokens: env.ANTHROPIC_MAX_TOKENS,
    system: systemPrompt,
    messages,
    tools: tools.length > 0 ? tools : undefined
  };

  let response: Response;
  try {
    response = await fetch(`${env.ANTHROPIC_BASE_URL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": env.ANTHROPIC_VERSION
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(env.AI_REQUEST_TIMEOUT_MS)
    });
  } catch (err) {
    logError("ai-client", "Anthropic request failed", {
      error: err instanceof Error ? err.message : String(err)
    });
    throw new AppError(502, "AI_REQUEST_FAILED", "AI API request failed.");
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    logError("ai-client", "Anthropic error", { status: response.status, body: text.slice(0, 300) });
    if (response.status === 401) {
      throw new AppError(401, "AI_AUTH_FAILED", "Invalid Anthropic API key.");
    }
    throw new AppError(502, "AI_UPSTREAM_ERROR", "AI API upstream error.");
  }

  return (await response.json()) as AiResponse;
}

// ---------------------------------------------------------------------------
// DigitalOcean / OpenAI-compatible path (DeepSeek)
// Converts Anthropic message format <-> OpenAI format
// ---------------------------------------------------------------------------

interface OpenAiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

interface OpenAiResponse {
  choices: Array<{
    message: {
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

function convertMessagesToOpenAi(
  systemPrompt: string,
  messages: AiMessage[]
): OpenAiMessage[] {
  const result: OpenAiMessage[] = [{ role: "system", content: systemPrompt }];

  for (const msg of messages) {
    if (typeof msg.content === "string") {
      result.push({ role: msg.role, content: msg.content });
      continue;
    }

    // Array of content blocks
    const blocks = msg.content;
    const textParts = blocks
      .filter((b) => b.type === "text")
      .map((b) => (b as AiTextBlock).text)
      .join("\n")
      .trim();

    const toolUseParts = blocks.filter(
      (b) => b.type === "tool_use"
    ) as AiToolUseBlock[];

    const toolResultParts = blocks.filter(
      (b) => b.type === "tool_result"
    ) as AiToolResultBlock[];

    if (toolResultParts.length > 0) {
      // Each tool result becomes a separate "tool" role message
      for (const tr of toolResultParts) {
        result.push({
          role: "tool",
          tool_call_id: tr.tool_use_id,
          content: tr.content
        });
      }
      continue;
    }

    if (toolUseParts.length > 0) {
      // Assistant message with tool_calls
      result.push({
        role: "assistant",
        content: textParts || null,
        tool_calls: toolUseParts.map((tu) => ({
          id: tu.id,
          type: "function" as const,
          function: {
            name: tu.name,
            arguments: JSON.stringify(tu.input)
          }
        }))
      });
      continue;
    }

    result.push({ role: msg.role, content: textParts || "" });
  }

  return result;
}

function convertOpenAiResponseToAiResponse(oai: OpenAiResponse): AiResponse {
  const choice = oai.choices[0];
  if (!choice) {
    return { stop_reason: "end_turn", content: [] };
  }

  const content: AiContentBlock[] = [];

  if (choice.message.content) {
    content.push({ type: "text", text: choice.message.content });
  }

  if (choice.message.tool_calls) {
    for (const tc of choice.message.tool_calls) {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(tc.function.arguments) as Record<string, unknown>;
      } catch { /* keep empty */ }

      content.push({
        type: "tool_use",
        id: tc.id,
        name: tc.function.name,
        input: parsed
      });
    }
  }

  const hasToolUse = content.some((b) => b.type === "tool_use");
  const stopReason =
    choice.finish_reason === "tool_calls"
      ? "tool_use"
      : choice.finish_reason === "length"
      ? "max_tokens"
      : "end_turn";

  return {
    stop_reason: hasToolUse ? "tool_use" : stopReason,
    content,
    usage: oai.usage
      ? {
          input_tokens: oai.usage.prompt_tokens,
          output_tokens: oai.usage.completion_tokens
        }
      : undefined
  };
}

async function callDeepSeek(
  messages: AiMessage[],
  tools: AiTool[],
  systemPrompt: string
): Promise<AiResponse> {
  const apiKey = env.AI_API_KEY?.trim();
  if (!apiKey) {
    throw new AppError(
      500,
      "AI_KEY_MISSING",
      "No AI API key configured. Set ANTHROPIC_API_KEY or AI_API_KEY in your environment."
    );
  }

  const openAiMessages = convertMessagesToOpenAi(systemPrompt, messages);

  const openAiTools =
    tools.length > 0
      ? tools.map((t) => ({
          type: "function" as const,
          function: {
            name: t.name,
            description: t.description,
            parameters: t.input_schema
          }
        }))
      : undefined;

  const body: Record<string, unknown> = {
    model: env.DEEPSEEK_MODEL,
    max_tokens: env.ANTHROPIC_MAX_TOKENS,
    messages: openAiMessages,
    ...(openAiTools ? { tools: openAiTools, tool_choice: "auto" } : {})
  };

  let response: Response;
  try {
    response = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(env.AI_REQUEST_TIMEOUT_MS)
    });
  } catch (err) {
    logError("ai-client", "DeepSeek request failed", {
      error: err instanceof Error ? err.message : String(err)
    });
    throw new AppError(502, "AI_REQUEST_FAILED", "DeepSeek API request failed.");
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    logError("ai-client", "DeepSeek error", { status: response.status, body: text.slice(0, 300) });
    if (response.status === 401) {
      throw new AppError(401, "AI_AUTH_FAILED", "Invalid DeepSeek/DigitalOcean API key.");
    }
    throw new AppError(502, "AI_UPSTREAM_ERROR", "DeepSeek upstream error.");
  }

  const data = (await response.json()) as OpenAiResponse;
  return convertOpenAiResponseToAiResponse(data);
}

// ---------------------------------------------------------------------------
// Public entrypoint — Anthropic first, DeepSeek fallback
// ---------------------------------------------------------------------------

export async function callAiWithTools(
  messages: AiMessage[],
  tools: AiTool[],
  systemPrompt: string,
  apiKey?: string | null
): Promise<AiResponse> {
  const anthropicKey = (apiKey?.trim() || env.ANTHROPIC_API_KEY?.trim()) ?? "";

  if (anthropicKey) {
    logInfo("ai-client", "Using Anthropic provider");
    return callAnthropic(messages, tools, systemPrompt, anthropicKey);
  }

  logInfo("ai-client", "No Anthropic key — falling back to DeepSeek (DigitalOcean)");
  return callDeepSeek(messages, tools, systemPrompt);
}
