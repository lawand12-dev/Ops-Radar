import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { env } from "./config/env";
import { AppError, toAppError } from "./lib/errors";
import { logWarn } from "./lib/logger";
import { redactSecrets } from "./lib/redact";
import adminRoutes from "./modules/admin/admin-routes";
import adminMemoryRoutes from "./modules/admin/memory-routes";
import analyticsRoutes from "./modules/analytics/analytics-routes";
import authRoutes from "./modules/auth/auth-routes";
import chatRoutes from "./modules/chat/chat-routes";
import eventRoutes from "./modules/events/event-routes";
import memoryRoutes from "./modules/memory/memory-routes";
import n8nRoutes from "./modules/n8n/n8n-routes";
import projectRoutes from "./modules/projects/project-routes";
import { getProjectWorkflowDebugSnapshot } from "./modules/projects/project-service";
import serviceRoutes from "./modules/service/service-routes";
import workflowRoutes from "./modules/workflows/workflow-routes";
import {
  buildKnowledgeBaseSelectionLogMeta,
  selectKnowledgeForRequest
} from "./modules/ai/knowledge-base-loader";

const app = new Hono();
const PUBLIC_DIR = resolve(process.cwd(), "public");

if (!env.EVENT_INGEST_TOKEN) {
  if (env.NODE_ENV === "production") {
    throw new Error("EVENT_INGEST_TOKEN is required in production.");
  }
  logWarn(
    "security",
    "EVENT_INGEST_TOKEN is missing. Event ingest endpoint is unsecured in non-production."
  );
}

async function servePublicFile(path: string, contentType: string): Promise<Response> {
  const normalizedPath = String(path || "").replace(/^[/\\]+/g, "");
  const fullPath = resolve(PUBLIC_DIR, normalizedPath);
  if (!fullPath.startsWith(PUBLIC_DIR)) {
    throw new AppError(400, "STATIC_PATH_INVALID", "Invalid static file path.");
  }

  if (typeof Bun !== "undefined") {
    const file = Bun.file(fullPath);
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

  let buffer: Buffer;
  try {
    buffer = await readFile(fullPath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new AppError(404, "STATIC_NOT_FOUND", "Static file not found.");
    }
    throw new AppError(500, "STATIC_READ_FAILED", "Failed to read static file.");
  }

  return new Response(new Uint8Array(buffer), {
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

  if (appError.details !== undefined && appError.statusCode < 500) {
    body.error = {
      ...(body.error as object),
      details: redactSecrets(appError.details)
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
    timestamp: new Date().toISOString(),
    monitoring_enabled: env.MONITORING_ENABLED,
    credential_provisioning_mode: env.CREDENTIAL_PROVISIONING_MODE
  })
);

app.get("/", (c) =>
  servePublicFile("index.html", "text/html; charset=utf-8")
);
app.get("/app.css", () => servePublicFile("app.css", "text/css; charset=utf-8"));
app.get("/app.js", () => servePublicFile("app.js", "application/javascript; charset=utf-8"));

app.get("/debug/knowledge-base", (c) => {
  if (env.NODE_ENV !== "development") {
    throw new AppError(404, "NOT_FOUND", "Route not found.");
  }

  const query = (c.req.query("query") ?? "").trim();
  const selection = selectKnowledgeForRequest(query);
  const safeMeta = buildKnowledgeBaseSelectionLogMeta(selection);

  return c.json({
    enabled: selection.enabled,
    query,
    selected: selection.selected.map((item) => ({
      path: item.path,
      section: item.section,
      chars: item.chars,
      score: item.score,
      ...(env.DEBUG_KNOWLEDGE_BASE_CONTENT ? { content: item.content } : {})
    })),
    ...safeMeta
  });
});

app.get("/debug/workflow/:projectId", async (c) => {
  if (env.NODE_ENV !== "development") {
    throw new AppError(404, "NOT_FOUND", "Route not found.");
  }

  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new AppError(400, "BAD_REQUEST", "projectId is required.");
  }

  const verifyN8nRaw = c.req.query("verify_n8n");
  const verifyN8n =
    typeof verifyN8nRaw === "string"
      ? ["1", "true", "yes", "on"].includes(verifyN8nRaw.trim().toLowerCase())
      : true;

  const snapshot = await getProjectWorkflowDebugSnapshot(projectId, { verifyN8n });
  return c.json(snapshot, 200);
});

app.get("/debug/workflow/:projectId/node-versions", async (c) => {
  if (env.NODE_ENV !== "development") {
    throw new AppError(404, "NOT_FOUND", "Route not found.");
  }

  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new AppError(400, "BAD_REQUEST", "projectId is required.");
  }

  const verifyN8nRaw = c.req.query("verify_n8n");
  const verifyN8n =
    typeof verifyN8nRaw === "string"
      ? ["1", "true", "yes", "on"].includes(verifyN8nRaw.trim().toLowerCase())
      : true;

  const snapshot = await getProjectWorkflowDebugSnapshot(projectId, { verifyN8n });
  return c.json(
    {
      project_id: snapshot.project_id,
      workflow_id: snapshot.workflow_id,
      n8n_workflow_id: snapshot.n8n_workflow_id,
      node_types_with_versions: snapshot.node_types_with_versions,
      normalized_node_versions: snapshot.normalized_node_versions,
      incompatible_nodes: snapshot.incompatible_nodes,
      same_nodes: snapshot.same_nodes,
      same_counts: snapshot.same_counts,
      same_connections: snapshot.same_connections,
      same: snapshot.same
    },
    200
  );
});

app.route("/auth", authRoutes);
app.route("/admin", adminRoutes);
// Admin memory dashboard endpoints. Mounted at /admin/memory/* so the
// existing /admin/* tree's requireAdmin middleware applies via composition.
app.route("/admin/memory", adminMemoryRoutes);
app.route("/chat", chatRoutes);
app.route("/memory", memoryRoutes);
app.route("/projects", projectRoutes);
app.route("/workflows", workflowRoutes);
app.route("/event", eventRoutes);
app.route("/analytics", analyticsRoutes);
app.route("/n8n", n8nRoutes);
app.route("/service", serviceRoutes);

export default app;
