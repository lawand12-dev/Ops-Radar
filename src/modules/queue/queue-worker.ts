import { Worker } from "bullmq";
import { getRedis } from "../../lib/db-redis";
import { logInfo, logError, logWarn } from "../../lib/logger";
import { env } from "../../config/env";
import { runAgentLoop } from "../agent/agent-loop";
import type { AgentJobData, AgentJobResult } from "./queue-types";
import { AGENT_QUEUE_NAME } from "./queue-types";

let workerInstance: Worker<AgentJobData, AgentJobResult> | null = null;

export function startAgentWorker(): Worker<AgentJobData, AgentJobResult> {
  if (workerInstance) return workerInstance;

  workerInstance = new Worker<AgentJobData, AgentJobResult>(
    AGENT_QUEUE_NAME,
    async (job) => {
      logInfo("queue-worker", "Processing agent job", { job_id: job.id, user_id: job.data.userId });
      const result = await runAgentLoop(job.data);
      logInfo("queue-worker", "Agent job done", {
        job_id: job.id,
        session_id: result.sessionId,
        status: result.status
      });
      return result;
    },
    {
      connection: getRedis(),
      concurrency: env.AGENT_WORKER_CONCURRENCY,
      lockDuration: 5 * 60 * 1000
    }
  );

  workerInstance.on("failed", (job, err) => {
    logError("queue-worker", "Job failed", {
      job_id: job?.id,
      error: err.message
    });
  });

  workerInstance.on("error", (err) => {
    logWarn("queue-worker", "Worker error", { error: err.message });
  });

  logInfo("queue-worker", "Agent worker started", {
    concurrency: env.AGENT_WORKER_CONCURRENCY
  });

  return workerInstance;
}

export async function stopAgentWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
    logInfo("queue-worker", "Agent worker stopped");
  }
}
