import { env } from "../config/env";
import { AppError } from "./errors";
import { logError } from "./logger";

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

export async function callAiWithTools(
  messages: AiMessage[],
  tools: AiTool[],
  systemPrompt: string,
  apiKey?: string | null
): Promise<AiResponse> {
  const key = apiKey?.trim() || env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new AppError(500, "AI_KEY_MISSING", "No Anthropic API key configured.");
  }

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
        "x-api-key": key,
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
    logError("ai-client", "Anthropic returned error", { status: response.status, body: text.slice(0, 300) });
    if (response.status === 401) {
      throw new AppError(401, "AI_AUTH_FAILED", "Invalid Anthropic API key.");
    }
    throw new AppError(502, "AI_UPSTREAM_ERROR", "AI API upstream error.");
  }

  const data = (await response.json()) as AiResponse;
  return data;
}
