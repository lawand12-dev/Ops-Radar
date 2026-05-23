import { subscribeToSession } from "../realtime/event-bus";
import type { AgentEvent } from "../realtime/event-bus";

/**
 * Returns a ReadableStream that emits SSE-formatted events for a given session.
 * The stream closes automatically when a terminal event (final_answer, error, cancelled) arrives.
 */
export function createAgentEventStream(sessionId: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      function send(event: AgentEvent) {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));

        if (
          event.type === "final_answer" ||
          event.type === "error" ||
          event.type === "cancelled"
        ) {
          unsubscribe();
          controller.close();
        }
      }

      const unsubscribe = subscribeToSession(sessionId, send);

      // Clean up on cancel
      return () => {
        unsubscribe();
      };
    }
  });
}

export function sseHeaders(): Record<string, string> {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  };
}
