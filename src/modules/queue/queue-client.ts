import { Queue } from "bullmq";
import { getRedis } from "../../lib/db-redis";
import { logInfo } from "../../lib/logger";
import type { AgentJobData, AgentJobResult } from "./queue-types";
import { AGENT_QUEUE_NAME } from "./queue-types";

let agentQueue: Queue<AgentJobData, AgentJobResult> | null = null;

export function getAgentQueue(): Queue<AgentJobData, AgentJobResult> {
  if (!agentQueue) {
    agentQueue = new Queue<AgentJobData, AgentJobResult>(AGENT_QUEUE_NAME, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 }
      }
    });
  }
  return agentQueue;
}

export async function enqueueAgentRun(data: AgentJobData): Promise<string> {
  const queue = getAgentQueue();
  const job = await queue.add("run", data, {
    jobId: `run-${Date.now()}-${Math.random().toString(36).slice(2)}`
  });
  logInfo("queue", "Agent job enqueued", { job_id: job.id, user_id: data.userId });
  return job.id!;
}

export async function getJobStatus(jobId: string): Promise<{
  id: string;
  state: string;
  result: AgentJobResult | undefined;
  failedReason: string | undefined;
} | null> {
  const queue = getAgentQueue();
  const job = await queue.getJob(jobId);
  if (!job) return null;
  const state = await job.getState();
  return {
    id: job.id!,
    state,
    result: job.returnvalue ?? undefined,
    failedReason: job.failedReason ?? undefined
  };
}
