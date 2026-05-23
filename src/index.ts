import app from "./server";
import { env } from "./config/env";
import { serve as serveNode } from "@hono/node-server";
import { bootstrapAdmin } from "./modules/auth/admin-bootstrap";
import { startMonitoringScheduler } from "./modules/monitoring/workflow-health-service";
import { startOutcomeReconciler } from "./modules/ai/outcome-reconciler";
import { startEmbeddingWorker } from "./modules/memory/embedding-worker";
import { runPatternCardSync } from "./modules/memory/pattern-card-sync";
import { startReportCron } from "./modules/reports/report-cron";
import { logError, logInfo } from "./lib/logger";

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
startOutcomeReconciler();
startReportCron();
// Fire-and-forget: any failure is logged inside bootstrapAdmin and must not
// block the HTTP listener (which is already accepting traffic by this point).
void bootstrapAdmin();

// Phase 2 Week 1 — Postgres intelligence sidecar. Both are guarded by
// env flags (default OFF) and degrade cleanly if POSTGRES_URL is unset.
void (async () => {
  if (env.PATTERN_CARD_SYNC_ENABLED) {
    try {
      const result = await runPatternCardSync();
      logInfo("startup", "Pattern card sync completed", result);
    } catch (err) {
      logError("startup", "Pattern card sync failed (non-fatal)", {
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
  if (env.EMBEDDING_WORKER_ENABLED) {
    try {
      await startEmbeddingWorker();
    } catch (err) {
      logError("startup", "Embedding worker failed to start (non-fatal)", {
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
})();

