import type Redis from "ioredis";
import type { AiMessage } from "../../lib/ai-client";
import { logWarn } from "../../lib/logger";

const WORKING_MEMORY_TTL_SECONDS = 2 * 60 * 60; // 2 hours

function memKey(sessionId: string): string {
  return `agent:memory:${sessionId}`;
}

export async function loadWorkingMemory(
  redis: Redis,
  sessionId: string
): Promise<AiMessage[]> {
  try {
    const raw = await redis.get(memKey(sessionId));
    if (!raw) return [];
    return JSON.parse(raw) as AiMessage[];
  } catch (err) {
    logWarn("agent-memory", "Failed to load working memory, starting fresh", {
      session_id: sessionId,
      error: err instanceof Error ? err.message : String(err)
    });
    return [];
  }
}

export async function saveWorkingMemory(
  redis: Redis,
  sessionId: string,
  messages: AiMessage[]
): Promise<void> {
  try {
    await redis.setex(memKey(sessionId), WORKING_MEMORY_TTL_SECONDS, JSON.stringify(messages));
  } catch (err) {
    logWarn("agent-memory", "Failed to save working memory", {
      session_id: sessionId,
      error: err instanceof Error ? err.message : String(err)
    });
  }
}

export async function clearWorkingMemory(redis: Redis, sessionId: string): Promise<void> {
  await redis.del(memKey(sessionId));
}

export async function appendToWorkingMemory(
  redis: Redis,
  sessionId: string,
  message: AiMessage
): Promise<AiMessage[]> {
  const messages = await loadWorkingMemory(redis, sessionId);
  messages.push(message);
  await saveWorkingMemory(redis, sessionId, messages);
  return messages;
}
