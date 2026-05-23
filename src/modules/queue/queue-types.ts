export interface AgentJobData {
  userMessage: string;
  userId: string;
  sessionId?: string;
  anthropicApiKey?: string | null;
  n8nBaseUrl?: string | null;
  n8nApiKey?: string | null;
}

export interface AgentJobResult {
  sessionId: string;
  finalAnswer: string;
  turnCount: number;
  status: "completed" | "failed" | "cancelled";
}

export const AGENT_QUEUE_NAME = "agent-runs";
