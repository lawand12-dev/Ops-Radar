import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { env } from "./config/env";
import { AppError, toAppError } from "./lib/errors";
import analyticsRoutes from "./modules/analytics/analytics-routes";
import chatRoutes from "./modules/chat/chat-routes";
import eventRoutes from "./modules/events/event-routes";
import n8nRoutes from "./modules/n8n/n8n-routes";
import projectRoutes from "./modules/projects/project-routes";
import workflowRoutes from "./modules/workflows/workflow-routes";

const app = new Hono();

async function servePublicFile(path: string, contentType: string): Promise<Response> {
  const file = Bun.file(`public/${path}`);
  if (!(await file.exists())) {
    throw new AppError(404, "STATIC_NOT_FOUND", "Static file not found.");
  }

  return new Response(await file.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": contentType
    }
  });
}

app.onError((error, c) => {
  const appError = toAppError(error);
  const body: Record<string, unknown> = {
    error: {
      code: appError.code,
      message: appError.message
    }
  };

  if (appError.details !== undefined && env.NODE_ENV !== "production") {
    body.error = {
      ...(body.error as object),
      details: appError.details
    };
  }

  return c.json(body, appError.statusCode as ContentfulStatusCode);
});

app.notFound((c) => {
  throw new AppError(404, "NOT_FOUND", "Route not found.");
});

app.get("/health", (c) =>
  c.json({
    status: "ok",
    service: "ai-automation-builder",
    timestamp: new Date().toISOString()
  })
);

app.get("/", (c) =>
  servePublicFile("index.html", "text/html; charset=utf-8")
);
app.get("/app.css", () => servePublicFile("app.css", "text/css; charset=utf-8"));
app.get("/app.js", () => servePublicFile("app.js", "application/javascript; charset=utf-8"));

app.route("/chat", chatRoutes);
app.route("/projects", projectRoutes);
app.route("/workflows", workflowRoutes);
app.route("/event", eventRoutes);
app.route("/analytics", analyticsRoutes);
app.route("/n8n", n8nRoutes);

export default app;
