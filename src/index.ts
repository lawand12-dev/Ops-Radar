import app from "./server";
import { env } from "./config/env";
import { serve as serveNode } from "@hono/node-server";
import { bootstrapAdmin } from "./modules/auth/admin-bootstrap";
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
// Fire-and-forget: any failure is logged inside bootstrapAdmin and must not
// block the HTTP listener (which is already accepting traffic by this point).
void bootstrapAdmin();

