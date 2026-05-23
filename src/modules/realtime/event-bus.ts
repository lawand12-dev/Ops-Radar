import { EventEmitter } from "node:events";

const bus = new EventEmitter();
bus.setMaxListeners(100);

export type AgentEvent =
  | { type: "think"; sessionId: string; text: string }
  | { type: "tool_call"; sessionId: string; toolName: string; args: Record<string, unknown> }
  | { type: "tool_result"; sessionId: string; toolName: string; result: unknown; latencyMs: number }
  | { type: "final_answer"; sessionId: string; text: string }
  | { type: "error"; sessionId: string; message: string }
  | { type: "cancelled"; sessionId: string };

export function publishAgentEvent(event: AgentEvent): void {
  bus.emit(`agent:${event.sessionId}`, event);
  bus.emit("agent:*", event);
}

export function subscribeToSession(
  sessionId: string,
  handler: (event: AgentEvent) => void
): () => void {
  const channel = `agent:${sessionId}`;
  bus.on(channel, handler);
  return () => bus.off(channel, handler);
}

export function subscribeToAll(handler: (event: AgentEvent) => void): () => void {
  bus.on("agent:*", handler);
  return () => bus.off("agent:*", handler);
}
