import app from "./server";
import { env } from "./config/env";
import { serve as serveNode } from "@hono/node-server";
import { startMonitoringScheduler } from "./modules/monitoring/workflow-health-service";

function startServer() {
  if (typeof Bun !== "undefined") {
    const bunServer = Bun.serve({
      port: env.PORT,
      fetch: app.fetch
    });

    console.log(
      `[ai-automation-builder] running on http://localhost:${bunServer.port} (${env.NODE_ENV}, bun)`
    );
    return;
  }

  serveNode({
    fetch: app.fetch,
    port: env.PORT
  });

  console.log(
    `[ai-automation-builder] running on http://localhost:${env.PORT} (${env.NODE_ENV}, node)`
  );
}

startServer();
startMonitoringScheduler();

