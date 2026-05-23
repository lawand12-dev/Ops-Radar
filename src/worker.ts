import { env } from "./config/env";
import { logInfo, logError } from "./lib/logger";
import { startAgentWorker, stopAgentWorker } from "./modules/queue/queue-worker";

logInfo("worker", "Starting BullMQ agent worker", {
  concurrency: env.AGENT_WORKER_CONCURRENCY,
  queue: "agent-runs"
});

startAgentWorker();

async function shutdown(signal: string) {
  logInfo("worker", `Received ${signal}, shutting down worker`);
  await stopAgentWorker();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
