# Workflow Health Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Per-task review:** Per the user's saved preference (`feedback_codex_for_reviews.md`), after each task is completed dispatch `codex:codex-rescue` for review instead of the default review subagent.

**Goal:** Build the customer-facing `/dashboard/workflow-health` page in opsradar, sourced live from chatv2's new `/service/projects/:id/workflows/health` endpoint, with team-managed onboarding.

**Architecture:** Two-repo work. (1) chatv2 (Hono backend at `opstest.atta.codes`) gains a service-key-authed endpoint that live-fetches n8n executions for a project, derives status, and returns JSON. (2) opsradar (Next.js) gains a `chatv2_project_id` column on the existing `client_n8n_config` table, a Route Handler that proxies through to chatv2 with the service key, a page component with 30s auto-refresh + row-expand, and a new GUARD sidebar section.

**Tech Stack:** chatv2 — Hono, Node/Bun, Zod env schema, bun:test. opsradar — Next.js 16 App Router, React 19, TypeScript, Supabase, Tailwind v4 + Phase 0 tokens.

**Source spec:** [docs/superpowers/specs/2026-05-11-workflow-health-page-design.md](../specs/2026-05-11-workflow-health-page-design.md)

**Project conventions:**
- opsradar path alias: `<npm>/*` → `./src/*` (NOT `@/`)
- opsradar branch: `feat/workflow-health-page` off `main`
- chatv2 working tree at `/home/lawand/Desktop/opsradar-chat`; branch: `feat/workflow-health-service` off `chatv2`
- chatv2 commits push to `github.com:lawand11-beep/Ops-Radar` (same repo as opsradar — different branch)
- opsradar dev server auto-reloads `.env.local`; no restart needed
- opsradar verification: `npx tsc --noEmit` + `npm run lint` + manual browser smoke (no test runner configured)
- chatv2 test runner: `bun test`

---

## File Map

### chatv2 repo (branch `feat/workflow-health-service`)

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/config/env.ts` | Add `CHATV2_SERVICE_API_KEY` to Zod schema |
| Create | `src/modules/monitoring/service-auth-middleware.ts` | Bearer-token check against the env var |
| Create | `src/modules/monitoring/service-auth-middleware.test.ts` | Unit tests for the middleware |
| Create | `src/modules/monitoring/health-derive.ts` | Pure function deriving health from raw n8n executions |
| Create | `src/modules/monitoring/health-derive.test.ts` | Unit tests (TDD) for the derivation logic |
| Create | `src/modules/monitoring/service-routes.ts` | Hono live-fetch handler for the service endpoint |
| Modify | `src/server.ts` | Mount the service routes under `/service` |

### opsradar repo (branch `feat/workflow-health-page`)

| Action | Path | Responsibility |
|---|---|---|
| Create | `supabase/migrations/20260511_client_n8n_config_chatv2_project_id.sql` | Add `chatv2_project_id text` column |
| Modify | `src/lib/database.types.ts` | Auto-regenerated after migration |
| Create | `src/app/api/dashboard/workflow-health/route.ts` | Reads user session, joins mapping, proxies to chatv2 |
| Create | `src/app/dashboard/workflow-health/page.tsx` | Compact status table + row expand + 30s refresh |
| Modify | `src/app/dashboard/_components/sidebar.tsx` | Add `GUARD` nav section with "Workflow Health" item |
| Modify | `.env.local` (gitignored) | Add `CHATV2_API_URL` + `CHATV2_SERVICE_API_KEY` |

### Outer my-startup repo

| Action | Path | Responsibility |
|---|---|---|
| Modify | `opsradar` submodule pointer | Bump to new HEAD after merge |

---

## Phase 1 — chatv2 backend

### Task 1: Create chatv2 feature branch

**Files:** none (git only)

- [ ] **Step 1: Switch to the opsradar-chat working tree and check the chatv2 branch is fetched**

```bash
cd /home/lawand/Desktop/opsradar-chat
git fetch origin chatv2 2>&1 | tail -3
git branch -a | grep chatv2
```

Expected: shows `chatv2` and `remotes/origin/chatv2`.

- [ ] **Step 2: Verify no uncommitted local changes that would block branching**

```bash
git status --short | grep -v "^??"
```

Expected: empty output. If anything is staged/modified, surface it to the user before continuing — do NOT auto-discard.

- [ ] **Step 3: Create the feature branch off chatv2**

```bash
git checkout chatv2
git checkout -b feat/workflow-health-service
```

Expected: `Switched to a new branch 'feat/workflow-health-service'`.

- [ ] **Step 4: Confirm we're on the new branch**

```bash
git branch --show-current
```

Expected: `feat/workflow-health-service`

---

### Task 2: Add CHATV2_SERVICE_API_KEY to env schema

**Files:**
- Modify: `src/config/env.ts`
- Modify: `src/server.ts`

- [ ] **Step 1: Add the env entry**

Open `src/config/env.ts` and find the existing `EVENT_INGEST_TOKEN: z.string().optional(),` line. Add this line directly after it:

```ts
  CHATV2_SERVICE_API_KEY: z.string().min(32).optional(),
```

Rationale: `.optional()` so non-production environments don't break; the route handler will throw a clear error at request time if the value is missing. `.min(32)` enforces minimum strength on any value present.

- [ ] **Step 2: Add the production-required runtime check**

Open `src/server.ts` and find the existing `if (!env.EVENT_INGEST_TOKEN) {` block. Add an analogous block right after it:

```ts
if (!env.CHATV2_SERVICE_API_KEY) {
  if (env.NODE_ENV === "production") {
    throw new Error("CHATV2_SERVICE_API_KEY is required in production.");
  }
  logWarn(
    "security",
    "CHATV2_SERVICE_API_KEY is missing. /service/* endpoints are disabled in non-production."
  );
}
```

- [ ] **Step 3: Verify env still parses**

```bash
bun run typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Generate a service key for local dev**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Add the output to `.env` (already gitignored):

```
CHATV2_SERVICE_API_KEY=<paste-the-base64url-here>
```

Save the same value — opsradar will need it.

- [ ] **Step 5: Commit**

```bash
git add src/config/env.ts src/server.ts
git commit -m "feat(env): add CHATV2_SERVICE_API_KEY for service-to-service auth"
```

---

### Task 3: Write the service-auth middleware (TDD)

**Files:**
- Create: `src/modules/monitoring/service-auth-middleware.ts`
- Create: `src/modules/monitoring/service-auth-middleware.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/modules/monitoring/service-auth-middleware.test.ts`:

```ts
import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { Hono } from "hono";
import { requireServiceAuth } from "./service-auth-middleware";

const originalKey = process.env.CHATV2_SERVICE_API_KEY;

function makeApp() {
  const app = new Hono();
  app.use("*", requireServiceAuth);
  app.get("/ok", (c) => c.json({ ok: true }));
  return app;
}

describe("requireServiceAuth", () => {
  beforeEach(() => {
    process.env.CHATV2_SERVICE_API_KEY = "test-service-key-must-be-at-least-32-chars-long";
  });
  afterEach(() => {
    if (originalKey === undefined) delete process.env.CHATV2_SERVICE_API_KEY;
    else process.env.CHATV2_SERVICE_API_KEY = originalKey;
  });

  it("401s when authorization header is missing", async () => {
    const res = await makeApp().request("/ok");
    expect(res.status).toBe(401);
  });

  it("401s when authorization scheme is not Bearer", async () => {
    const res = await makeApp().request("/ok", {
      headers: { authorization: "Basic some-creds" }
    });
    expect(res.status).toBe(401);
  });

  it("401s when bearer token does not match the service key", async () => {
    const res = await makeApp().request("/ok", {
      headers: { authorization: "Bearer wrong-token-value-32-chars-min-here" }
    });
    expect(res.status).toBe(401);
  });

  it("passes through with the correct service key", async () => {
    const res = await makeApp().request("/ok", {
      headers: { authorization: "Bearer test-service-key-must-be-at-least-32-chars-long" }
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("503s with SERVICE_AUTH_DISABLED when env var is unset", async () => {
    delete process.env.CHATV2_SERVICE_API_KEY;
    const res = await makeApp().request("/ok", {
      headers: { authorization: "Bearer anything" }
    });
    expect(res.status).toBe(503);
  });
});
```

- [ ] **Step 2: Run the test — expect failure**

```bash
bun test src/modules/monitoring/service-auth-middleware.test.ts
```

Expected: 5 failures with "Cannot find module './service-auth-middleware'".

- [ ] **Step 3: Implement the middleware**

Create `src/modules/monitoring/service-auth-middleware.ts`:

```ts
import type { Context, Next } from "hono";
import { timingSafeEqual } from "node:crypto";
import { AppError } from "../../lib/errors";

/**
 * Service-to-service bearer auth for the chatv2 /service/* endpoints.
 * Constant-time comparison against CHATV2_SERVICE_API_KEY.
 *
 * Never use `requireAuth` here — that one verifies JWTs and loads users,
 * neither of which applies when opsradar's server calls us on behalf of
 * one of its customers.
 *
 * Reads the env var at request time so tests that mutate process.env
 * between cases work without re-importing.
 */
export async function requireServiceAuth(
  c: Context,
  next: Next
): Promise<void | Response> {
  const expected = process.env.CHATV2_SERVICE_API_KEY;
  if (!expected) {
    throw new AppError(
      503,
      "SERVICE_AUTH_DISABLED",
      "Service endpoints are disabled — CHATV2_SERVICE_API_KEY is not configured."
    );
  }

  const header = c.req.header("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    throw new AppError(401, "UNAUTHENTICATED", "Service authentication required.");
  }
  const token = header.slice("bearer ".length).trim();
  if (!token) {
    throw new AppError(401, "UNAUTHENTICATED", "Service authentication required.");
  }

  const provided = Buffer.from(token, "utf8");
  const target = Buffer.from(expected, "utf8");
  if (provided.length !== target.length || !timingSafeEqual(provided, target)) {
    throw new AppError(401, "UNAUTHENTICATED", "Service authentication required.");
  }

  await next();
}
```

- [ ] **Step 4: Run the test — expect pass**

```bash
bun test src/modules/monitoring/service-auth-middleware.test.ts
```

Expected: `5 pass, 0 fail`.

- [ ] **Step 5: Commit**

```bash
git add src/modules/monitoring/service-auth-middleware.ts src/modules/monitoring/service-auth-middleware.test.ts
git commit -m "feat(monitoring): add service-auth middleware with timing-safe equal"
```

---

### Task 4: Write the health-derive helper (TDD)

**Files:**
- Create: `src/modules/monitoring/health-derive.ts`
- Create: `src/modules/monitoring/health-derive.test.ts`

This is the pure status-derivation logic. Takes an array of n8n executions (most recent first) and returns the workflow's current health status plus a trimmed `recent_executions` list. Pure function — no IO.

- [ ] **Step 1: Write the failing test**

Create `src/modules/monitoring/health-derive.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { deriveWorkflowHealth, type ExecutionInput } from "./health-derive";

function exec(overrides: Partial<ExecutionInput>): ExecutionInput {
  return {
    id: "exec-1",
    status: "success",
    startedAt: "2026-05-11T10:00:00.000Z",
    stoppedAt: "2026-05-11T10:00:01.000Z",
    finished: true,
    error: null,
    ...overrides
  };
}

describe("deriveWorkflowHealth", () => {
  it("unknown when there are no executions", () => {
    const result = deriveWorkflowHealth([]);
    expect(result.status).toBe("unknown");
    expect(result.last_run_at).toBeNull();
    expect(result.last_error_summary).toBeNull();
    expect(result.recent_executions).toEqual([]);
  });

  it("healthy when the most recent 5 runs all succeeded", () => {
    const runs = Array.from({ length: 5 }, (_, i) =>
      exec({ id: `e${i}`, status: "success" })
    );
    const result = deriveWorkflowHealth(runs);
    expect(result.status).toBe("healthy");
    expect(result.last_error_summary).toBeNull();
  });

  it("failing when the most recent run is a failure", () => {
    const runs = [
      exec({ id: "e0", status: "failed", error: { message: "boom" } }),
      exec({ id: "e1", status: "success" }),
      exec({ id: "e2", status: "success" })
    ];
    const result = deriveWorkflowHealth(runs);
    expect(result.status).toBe("failing");
    expect(result.last_error_summary).toContain("boom");
  });

  it("degraded when last run succeeded but earlier failures appear in window", () => {
    const runs = [
      exec({ id: "e0", status: "success" }),
      exec({ id: "e1", status: "failed", error: { message: "earlier failure" } }),
      exec({ id: "e2", status: "success" }),
      exec({ id: "e3", status: "success" })
    ];
    const result = deriveWorkflowHealth(runs);
    expect(result.status).toBe("degraded");
  });

  it("caps recent_executions at 20 even if more are passed in", () => {
    const runs = Array.from({ length: 50 }, (_, i) =>
      exec({ id: `e${i}`, status: i === 0 ? "failed" : "success" })
    );
    const result = deriveWorkflowHealth(runs);
    expect(result.recent_executions.length).toBe(20);
  });

  it("computes last_run_at from the most recent execution startedAt", () => {
    const runs = [
      exec({ id: "e0", startedAt: "2026-05-11T10:00:00.000Z" }),
      exec({ id: "e1", startedAt: "2026-05-11T09:00:00.000Z" })
    ];
    const result = deriveWorkflowHealth(runs);
    expect(result.last_run_at).toBe("2026-05-11T10:00:00.000Z");
  });

  it("truncates error summaries to 200 chars", () => {
    const longErr = "x".repeat(500);
    const runs = [exec({ id: "e0", status: "failed", error: { message: longErr } })];
    const result = deriveWorkflowHealth(runs);
    expect(result.last_error_summary?.length).toBeLessThanOrEqual(200);
  });
});
```

- [ ] **Step 2: Run the test — expect failure**

```bash
bun test src/modules/monitoring/health-derive.test.ts
```

Expected: failures with "Cannot find module './health-derive'".

- [ ] **Step 3: Implement the helper**

Create `src/modules/monitoring/health-derive.ts`:

```ts
/**
 * Pure status-derivation logic for the customer-facing workflow-health view.
 *
 * Input: n8n executions for ONE workflow, sorted most-recent-first.
 * Output: a single workflow's health entry (status badge + last run + capped
 *         recent executions) ready for opsradar to render.
 *
 * No IO, no DB, no env. Easy to unit-test.
 */

export interface ExecutionInput {
  id: string;
  status: string;
  startedAt: string | null;
  stoppedAt: string | null;
  finished: boolean | null;
  error: unknown;
}

export type HealthStatus = "healthy" | "degraded" | "failing" | "unknown";

export interface RecentExecutionOutput {
  execution_id: string;
  status: "success" | "failure" | "running" | "canceled";
  started_at: string | null;
  duration_ms: number | null;
  error_summary: string | null;
}

export interface DerivedHealth {
  status: HealthStatus;
  last_run_at: string | null;
  last_error_summary: string | null;
  recent_executions: RecentExecutionOutput[];
}

const RECENT_CAP = 20;
const STATUS_WINDOW = 10;
const ERROR_SUMMARY_MAX = 200;

function normalizeStatus(raw: string): RecentExecutionOutput["status"] {
  const s = raw.toLowerCase();
  if (s === "success" || s === "succeeded") return "success";
  if (s === "running" || s === "waiting" || s === "new") return "running";
  if (s === "canceled" || s === "cancelled" || s === "aborted") return "canceled";
  return "failure";
}

function extractErrorSummary(error: unknown): string | null {
  if (!error) return null;
  let raw: string;
  if (typeof error === "string") {
    raw = error;
  } else if (typeof error === "object" && error !== null && "message" in error) {
    raw = String((error as { message: unknown }).message);
  } else {
    try {
      raw = JSON.stringify(error);
    } catch {
      raw = String(error);
    }
  }
  const cleaned = raw.trim().replace(/\s+/g, " ");
  return cleaned.slice(0, ERROR_SUMMARY_MAX);
}

function durationMs(startedAt: string | null, stoppedAt: string | null): number | null {
  if (!startedAt || !stoppedAt) return null;
  const start = Date.parse(startedAt);
  const stop = Date.parse(stoppedAt);
  if (Number.isNaN(start) || Number.isNaN(stop)) return null;
  return Math.max(0, stop - start);
}

export function deriveWorkflowHealth(
  executionsMostRecentFirst: ExecutionInput[]
): DerivedHealth {
  if (executionsMostRecentFirst.length === 0) {
    return {
      status: "unknown",
      last_run_at: null,
      last_error_summary: null,
      recent_executions: []
    };
  }

  const recent = executionsMostRecentFirst.slice(0, RECENT_CAP).map<RecentExecutionOutput>(
    (e) => ({
      execution_id: e.id,
      status: normalizeStatus(e.status),
      started_at: e.startedAt,
      duration_ms: durationMs(e.startedAt, e.stoppedAt),
      error_summary: extractErrorSummary(e.error)
    })
  );

  const window = recent.slice(0, STATUS_WINDOW);
  const mostRecent = window[0];
  const hasFailureInWindow = window.some((e) => e.status === "failure");

  let status: HealthStatus;
  if (mostRecent.status === "failure") {
    status = "failing";
  } else if (hasFailureInWindow) {
    status = "degraded";
  } else {
    status = "healthy";
  }

  return {
    status,
    last_run_at: mostRecent.started_at,
    last_error_summary: window.find((e) => e.status === "failure")?.error_summary ?? null,
    recent_executions: recent
  };
}
```

- [ ] **Step 4: Run the test — expect pass**

```bash
bun test src/modules/monitoring/health-derive.test.ts
```

Expected: `7 pass, 0 fail`.

- [ ] **Step 5: Commit**

```bash
git add src/modules/monitoring/health-derive.ts src/modules/monitoring/health-derive.test.ts
git commit -m "feat(monitoring): add pure health-derive helper with TDD coverage"
```

---

### Task 5: Write the service-routes handler

**Files:**
- Create: `src/modules/monitoring/service-routes.ts`

The handler integrates auth → load project → load owner credentials → set request context → call n8n via the existing client → derive → return.

- [ ] **Step 1: Inspect existing patterns before writing**

Read these files in full first — the handler must mirror their structure:
- `src/modules/auth/auth-middleware.ts` — pattern for `runWithRequestContext` setup with decrypted credentials
- `src/modules/projects/project-repository.ts` — confirm `getProjectById` and `ProjectRecord` shape
- `src/modules/auth/user-repository.ts` — confirm `getUserById` and field names (`n8n_base_url`, `n8n_api_key_encrypted`)
- `src/modules/n8n/n8n-client.ts` — confirm `listN8nExecutions` and `getN8nWorkflowById` signatures
- `src/modules/workflows/workflow-repository.ts` — find the function that lists workflows for a project with their n8n_workflow_id
- `src/lib/crypto.ts` — confirm `decryptSecret` signature
- `src/lib/request-context.ts` — confirm `runWithRequestContext` parameter shape

- [ ] **Step 2: Create the file**

Create `src/modules/monitoring/service-routes.ts`. Adjust imports to match what your inspection in Step 1 actually exports:

```ts
import { Hono } from "hono";
import { AppError } from "../../lib/errors";
import { decryptSecret } from "../../lib/crypto";
import { runWithRequestContext, type RequestContext } from "../../lib/request-context";
import { getProjectById } from "../projects/project-repository";
import { getUserById } from "../auth/user-repository";
import { listWorkflowsWithN8nWorkflowId } from "../workflows/workflow-repository";
import { listN8nExecutions, getN8nWorkflowById } from "../n8n/n8n-client";
import { requireServiceAuth } from "./service-auth-middleware";
import { deriveWorkflowHealth, type ExecutionInput } from "./health-derive";

const serviceRoutes = new Hono();
serviceRoutes.use("*", requireServiceAuth);

interface WorkflowHealthEntry {
  workflow_id: string;
  name: string;
  status: "healthy" | "degraded" | "failing" | "unknown";
  last_run_at: string | null;
  last_error_summary: string | null;
  open_alerts_count: number;
  recent_executions: Array<{
    execution_id: string;
    status: "success" | "failure" | "running" | "canceled";
    started_at: string | null;
    duration_ms: number | null;
    error_summary: string | null;
  }>;
}

interface WorkflowHealthListResponse {
  project_id: string;
  workflows: WorkflowHealthEntry[];
}

serviceRoutes.get("/projects/:projectId/workflows/health", async (c) => {
  const projectId = c.req.param("projectId");
  if (!projectId) {
    throw new AppError(400, "BAD_REQUEST", "projectId is required.");
  }

  const project = await getProjectById(projectId);
  if (!project || !project.user_id) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found.");
  }

  const user = await getUserById(project.user_id);
  if (!user) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found.");
  }

  if (!user.n8n_base_url || !user.n8n_api_key_encrypted) {
    return c.json<WorkflowHealthListResponse>({
      project_id: projectId,
      workflows: []
    });
  }

  const n8nApiKey = decryptSecret(user.n8n_api_key_encrypted);
  if (!n8nApiKey) {
    throw new AppError(500, "N8N_DECRYPT_FAILED", "Could not decrypt the owner's n8n key.");
  }

  const ctx: RequestContext = {
    userId: user.id,
    email: user.email,
    n8nBaseUrl: user.n8n_base_url,
    n8nApiKey,
    anthropicApiKey: null,
    canUseRagAgent: false,
    isAdmin: false
  };

  return runWithRequestContext(ctx, async () => {
    const projectWorkflows = await listWorkflowsWithN8nWorkflowId(projectId);

    const entries: WorkflowHealthEntry[] = await Promise.all(
      projectWorkflows.map(async (wf): Promise<WorkflowHealthEntry> => {
        if (!wf.n8n_workflow_id) {
          return {
            workflow_id: wf.id,
            name: wf.name ?? "Unnamed workflow",
            status: "unknown",
            last_run_at: null,
            last_error_summary: null,
            open_alerts_count: 0,
            recent_executions: []
          };
        }

        let displayName = wf.name ?? "Unnamed workflow";
        try {
          const n8nWf = await getN8nWorkflowById(wf.n8n_workflow_id);
          if (n8nWf.name) displayName = n8nWf.name;
        } catch {
          // n8n 404 / network error: keep the chatv2-side name.
        }

        let executionsRaw: ExecutionInput[] = [];
        try {
          const summaries = await listN8nExecutions({
            workflowId: wf.n8n_workflow_id,
            limit: 20
          });
          executionsRaw = summaries.map((e) => ({
            id: e.id,
            status: e.status,
            startedAt: e.startedAt,
            stoppedAt: e.stoppedAt,
            finished: e.finished,
            error: e.error
          }));
        } catch {
          // Treat n8n outage as "unknown" for this workflow rather than failing
          // the whole response — other workflows might still be reachable.
        }

        const derived = deriveWorkflowHealth(executionsRaw);
        return {
          workflow_id: wf.id,
          name: displayName,
          status: derived.status,
          last_run_at: derived.last_run_at,
          last_error_summary: derived.last_error_summary,
          open_alerts_count: derived.recent_executions.filter((e) => e.status === "failure").length,
          recent_executions: derived.recent_executions
        };
      })
    );

    return c.json<WorkflowHealthListResponse>({
      project_id: projectId,
      workflows: entries
    });
  });
});

export default serviceRoutes;
```

NOTE: if any imported function name doesn't exist exactly, adapt to whatever the repository module actually exports. Behavior is what matters: list workflows for a project that have an n8n_workflow_id.

- [ ] **Step 3: Type-check**

```bash
bun run typecheck
```

Expected: 0 errors. If there are import errors, fix the import names to match the actual exports. Do NOT add `// @ts-ignore`.

- [ ] **Step 4: Commit**

```bash
git add src/modules/monitoring/service-routes.ts
git commit -m "feat(monitoring): add /service/projects/:id/workflows/health live-fetch endpoint"
```

---

### Task 6: Mount service routes in server.ts

**Files:**
- Modify: `src/server.ts`

- [ ] **Step 1: Add the import**

Open `src/server.ts`. Below the existing `import workflowRoutes from "./modules/workflows/workflow-routes";` line, add:

```ts
import serviceRoutes from "./modules/monitoring/service-routes";
```

- [ ] **Step 2: Mount the routes**

Find where other route groups are mounted (look for `app.route("/workflows", workflowRoutes)` or similar). Add the new mount alongside the others:

```ts
app.route("/service", serviceRoutes);
```

If the file uses a different mounting style, match that style.

- [ ] **Step 3: Type-check**

```bash
bun run typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Smoke test locally**

Start chatv2 dev server in a separate terminal:

```bash
bun run dev
```

Then from another terminal hit the endpoint with a fake project ID — it should return 404, proving auth middleware passed and the handler is wired:

```bash
SERVICE_KEY="<the value you put in .env in Task 2 Step 4>"
curl -sS -i \
  -H "Authorization: Bearer $SERVICE_KEY" \
  http://localhost:3000/service/projects/00000000-0000-0000-0000-000000000000/workflows/health
```

Expected: HTTP/1.1 404 with JSON `"code":"PROJECT_NOT_FOUND"`.

Confirm the 401 path:

```bash
curl -sS -i http://localhost:3000/service/projects/00000000-0000-0000-0000-000000000000/workflows/health
```

Expected: HTTP/1.1 401.

- [ ] **Step 5: Commit**

```bash
git add src/server.ts
git commit -m "feat(server): mount /service route group"
```

---

### Task 7: Push and deploy chatv2

**Files:** none (deployment)

- [ ] **Step 1: Push the feature branch**

```bash
git push -u origin feat/workflow-health-service
```

- [ ] **Step 2: Merge into chatv2 branch (fast-forward)**

```bash
git checkout chatv2
git merge --ff-only feat/workflow-health-service
git push origin chatv2
```

- [ ] **Step 3: Set the production CHATV2_SERVICE_API_KEY in Vercel**

Add the env var in the chatv2 Vercel project's Production environment BEFORE the deployment finishes — Vercel won't pick it up otherwise. Use a fresh strong key (not the dev one).

- [ ] **Step 4: Confirm deployment**

Wait for Vercel to finish deploying (1-3 min), then verify:

```bash
PROD_KEY="<production service key from Vercel env>"
curl -sS -i \
  -H "Authorization: Bearer $PROD_KEY" \
  https://opstest.atta.codes/service/projects/00000000-0000-0000-0000-000000000000/workflows/health
```

Expected: HTTP/1.1 404 (project not found is fine — proves auth + routing in prod).

---

## Phase 2 — opsradar data layer

### Task 8: Create opsradar feature branch

**Files:** none (git only)

- [ ] **Step 1: Switch to opsradar repo and verify clean state**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git status --short | grep -v "^??"
```

Expected: empty. If anything is unstaged, surface to user before continuing.

- [ ] **Step 2: Pull latest main**

```bash
git checkout main
git pull origin main
```

- [ ] **Step 3: Create the feature branch**

```bash
git checkout -b feat/workflow-health-page
git branch --show-current
```

Expected: `feat/workflow-health-page`.

---

### Task 9: Supabase migration — add chatv2_project_id

**Files:**
- Create: `supabase/migrations/20260511_client_n8n_config_chatv2_project_id.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260511_client_n8n_config_chatv2_project_id.sql`:

```sql
-- Add the chatv2 project ID mapping for the Workflow Health page.
-- One chatv2 project per OpsRadar customer; populated manually by the team
-- after creating the project in chatv2 admin at opstest.atta.codes.
alter table public.client_n8n_config
  add column if not exists chatv2_project_id text;

comment on column public.client_n8n_config.chatv2_project_id is
  'chatv2 project UUID (from opstest.atta.codes) that owns this customers
   n8n monitoring. Set manually by the team during onboarding. Null = workflow
   health is not yet enabled for this customer.';
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push --linked
```

Expected: migration applies cleanly. If you get a connection error, check `npx supabase login` and the project link.

- [ ] **Step 3: Regenerate TypeScript types**

```bash
npm run types:supabase
```

Verify the column appears:

```bash
grep -A2 "chatv2_project_id" src/lib/database.types.ts | head -10
```

Expected: shows `chatv2_project_id: string | null` in Row / Insert / Update positions.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260511_client_n8n_config_chatv2_project_id.sql src/lib/database.types.ts
git commit -m "feat(db): add chatv2_project_id column to client_n8n_config"
```

---

### Task 10: Add env vars

**Files:**
- Modify: `.env.local` (gitignored)

- [ ] **Step 1: Append the new vars**

Open `.env.local` and add at the end:

```
# Workflow Health page — opsradar talks to chatv2 server-to-server.
CHATV2_API_URL=https://opstest.atta.codes
CHATV2_SERVICE_API_KEY=<paste-the-same-key-you-set-on-chatv2-Vercel>
```

For local dev: point at `http://localhost:3000` and use the dev service key from chatv2 Task 2 Step 4.

- [ ] **Step 2: No commit (file is gitignored).**

---

## Phase 3 — opsradar API

### Task 11: Route Handler — /api/dashboard/workflow-health

**Files:**
- Create: `src/app/api/dashboard/workflow-health/route.ts`

- [ ] **Step 1: Inspect existing route conventions**

Read `src/app/api/integrations/route.ts` (38 lines) for the project's pattern: `getCurrentUserId`, `getServerSupabaseClient`, error shape, `dynamic = 'force-dynamic'`, `runtime = 'nodejs'`.

- [ ] **Step 2: Write the handler**

Create `src/app/api/dashboard/workflow-health/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type WorkflowHealthEntry = {
  workflow_id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'failing' | 'unknown';
  last_run_at: string | null;
  last_error_summary: string | null;
  open_alerts_count: number;
  recent_executions: Array<{
    execution_id: string;
    status: 'success' | 'failure' | 'running' | 'canceled';
    started_at: string | null;
    duration_ms: number | null;
    error_summary: string | null;
  }>;
};

type WorkflowHealthResponse =
  | { status: 'not_enrolled' }
  | { status: 'ok'; workflows: WorkflowHealthEntry[] }
  | { status: 'unavailable'; message: string };

export async function GET(_req: NextRequest): Promise<NextResponse<WorkflowHealthResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { status: 'unavailable', message: 'unauthorized' },
      { status: 401 }
    );
  }

  const apiUrl = process.env.CHATV2_API_URL;
  const serviceKey = process.env.CHATV2_SERVICE_API_KEY;
  if (!apiUrl || !serviceKey) {
    console.error('[workflow-health] CHATV2_API_URL or CHATV2_SERVICE_API_KEY missing');
    return NextResponse.json(
      { status: 'unavailable', message: 'integration_not_configured' },
      { status: 500 }
    );
  }

  const supabase = getServerSupabaseClient();
  const { data: mapping, error: mappingError } = await supabase
    .from('client_n8n_config')
    .select('chatv2_project_id')
    .eq('client_id', userId)
    .maybeSingle();

  if (mappingError) {
    console.error('[workflow-health] mapping lookup failed:', mappingError.message);
    return NextResponse.json(
      { status: 'unavailable', message: 'mapping_lookup_failed' },
      { status: 500 }
    );
  }

  if (!mapping?.chatv2_project_id) {
    return NextResponse.json({ status: 'not_enrolled' });
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${apiUrl}/service/projects/${encodeURIComponent(mapping.chatv2_project_id)}/workflows/health`,
      {
        headers: { Authorization: `Bearer ${serviceKey}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      }
    );
  } catch (err) {
    console.error('[workflow-health] upstream fetch threw:', err);
    return NextResponse.json(
      { status: 'unavailable', message: 'upstream_unreachable' },
      { status: 502 }
    );
  }

  if (upstream.status === 404) {
    return NextResponse.json({ status: 'not_enrolled' });
  }

  if (!upstream.ok) {
    console.error(`[workflow-health] upstream ${upstream.status}`);
    return NextResponse.json(
      { status: 'unavailable', message: `upstream_${upstream.status}` },
      { status: 502 }
    );
  }

  const body = (await upstream.json()) as {
    project_id: string;
    workflows: WorkflowHealthEntry[];
  };

  return NextResponse.json({ status: 'ok', workflows: body.workflows });
}
```

- [ ] **Step 3: Smoke test the route**

Start the opsradar dev server (if not running):

```bash
npm run dev
```

In your browser (logged in so the Supabase cookie is set), navigate to:

```
http://localhost:3000/api/dashboard/workflow-health
```

Expected:
- No `client_n8n_config` row for your user: 200 with `{"status":"not_enrolled"}`
- Row exists with no `chatv2_project_id`: 200 with `{"status":"not_enrolled"}`
- Row exists with a valid `chatv2_project_id`: 200 with `{"status":"ok","workflows":[...]}`

For test data: in Supabase Studio insert a row in `client_n8n_config` with your user's id, dummy n8n config, and a `chatv2_project_id` matching a real project in chatv2's database.

- [ ] **Step 4: Type-check and lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/dashboard/workflow-health/route.ts
git commit -m "feat(api): add /api/dashboard/workflow-health Route Handler"
```

---

## Phase 4 — opsradar UI

### Task 12: Workflow Health page component

**Files:**
- Create: `src/app/dashboard/workflow-health/page.tsx`

- [ ] **Step 1: Inspect dashboard patterns**

Read `src/app/dashboard/page.tsx` and one subroute (e.g. `src/app/dashboard/clients/page.tsx`) to confirm: client/server component split, state hook patterns (SWR vs useEffect), and the Phase 0 theme token names.

- [ ] **Step 2: Write the page**

Create `src/app/dashboard/workflow-health/page.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '<npm>/lib/utils';

type ExecStatus = 'success' | 'failure' | 'running' | 'canceled';
type HealthStatus = 'healthy' | 'degraded' | 'failing' | 'unknown';

interface RecentExecution {
  execution_id: string;
  status: ExecStatus;
  started_at: string | null;
  duration_ms: number | null;
  error_summary: string | null;
}

interface WorkflowHealthEntry {
  workflow_id: string;
  name: string;
  status: HealthStatus;
  last_run_at: string | null;
  last_error_summary: string | null;
  open_alerts_count: number;
  recent_executions: RecentExecution[];
}

type ApiResponse =
  | { status: 'not_enrolled' }
  | { status: 'ok'; workflows: WorkflowHealthEntry[] }
  | { status: 'unavailable'; message: string };

type PageState =
  | { kind: 'loading' }
  | { kind: 'not_enrolled' }
  | { kind: 'unavailable' }
  | { kind: 'ok'; workflows: WorkflowHealthEntry[]; lastFetchedAt: Date };

const POLL_MS = 30_000;
const STATUS_DOT: Record<HealthStatus, string> = {
  healthy:  'bg-[var(--color-success)]',
  degraded: 'bg-[var(--color-warning)]',
  failing:  'bg-[var(--color-danger)]',
  unknown:  'bg-[var(--color-fg-subtle)]',
};

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms)) return '—';
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export default function WorkflowHealthPage() {
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const inFlight = useRef(false);

  const fetchOnce = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch('/api/dashboard/workflow-health', { cache: 'no-store' });
      const body = (await res.json()) as ApiResponse;
      if (body.status === 'not_enrolled') setState({ kind: 'not_enrolled' });
      else if (body.status === 'ok') setState({ kind: 'ok', workflows: body.workflows, lastFetchedAt: new Date() });
      else setState({ kind: 'unavailable' });
    } catch {
      setState({ kind: 'unavailable' });
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    fetchOnce();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchOnce();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchOnce();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchOnce]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="mb-1.5 font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
            Workflow Health
          </h1>
          <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
            Live status of the automations OpsRadar runs for you. Updated every 30 seconds.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchOnce}
          className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[12.5px] text-[var(--color-fg)] hover:bg-[var(--color-surface-sunken)]"
        >
          ↻ Refresh
        </button>
      </div>

      {state.kind === 'loading' && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-8 text-center text-[var(--color-fg-muted)]">
          Loading…
        </div>
      )}

      {state.kind === 'not_enrolled' && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-8 text-center">
          <p className="text-body text-[var(--color-fg)]">Workflow monitoring is not enabled for your account yet.</p>
          <p className="mt-2 text-[12.5px] text-[var(--color-fg-muted)]">Contact your OpsRadar account team to get set up.</p>
        </div>
      )}

      {state.kind === 'unavailable' && (
        <div className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-5 py-4 text-[var(--color-danger)]">
          Workflow data is temporarily unavailable. We are retrying automatically.
        </div>
      )}

      {state.kind === 'ok' && state.workflows.length === 0 && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-8 text-center text-[var(--color-fg-muted)]">
          No workflows are being monitored yet.
        </div>
      )}

      {state.kind === 'ok' && state.workflows.length > 0 && (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="grid grid-cols-[36px_1fr_140px_80px_90px_28px] items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 py-2.5 text-[11px] uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">
            <div></div>
            <div>Workflow</div>
            <div>Last run</div>
            <div>Errors</div>
            <div>Alerts</div>
            <div></div>
          </div>
          {state.workflows.map((wf) => {
            const open = expanded.has(wf.workflow_id);
            return (
              <div key={wf.workflow_id} className="border-b border-[var(--color-border)] last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggle(wf.workflow_id)}
                  className="grid w-full grid-cols-[36px_1fr_140px_80px_90px_28px] items-center gap-2 px-4 py-3 text-left hover:bg-[var(--color-surface-sunken)]"
                >
                  <span className={cn('inline-block h-2.5 w-2.5 rounded-full', STATUS_DOT[wf.status])} />
                  <span className="truncate text-body text-[var(--color-fg)]">{wf.name}</span>
                  <span className="text-[12.5px] text-[var(--color-fg-muted)]">{timeAgo(wf.last_run_at)}</span>
                  <span className="text-[12.5px] text-[var(--color-fg-muted)]">
                    {wf.last_error_summary ? 'Yes' : '—'}
                  </span>
                  <span className="text-[12.5px] text-[var(--color-fg-muted)]">{wf.open_alerts_count}</span>
                  <span className="text-[var(--color-fg-subtle)]">{open ? '▾' : '▸'}</span>
                </button>
                {open && (
                  <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 py-3">
                    {wf.recent_executions.length === 0 ? (
                      <p className="text-[12.5px] text-[var(--color-fg-muted)]">No recent executions.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {wf.recent_executions.map((e) => (
                          <div key={e.execution_id} className="flex items-center gap-3 text-[12.5px]">
                            <span className={cn('inline-block h-1.5 w-1.5 rounded-full', e.status === 'success' ? 'bg-[var(--color-success)]' : e.status === 'failure' ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-fg-subtle)]')} />
                            <span className="w-[160px] text-[var(--color-fg-muted)]">{timeAgo(e.started_at)}</span>
                            <span className="w-[100px] text-[var(--color-fg-subtle)]">{e.duration_ms != null ? `${e.duration_ms}ms` : '—'}</span>
                            <span className="flex-1 truncate text-[var(--color-fg-muted)]">{e.error_summary ?? ''}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 py-2 text-right text-[10.5px] text-[var(--color-fg-subtle)]">
            Last synced {timeAgo(state.lastFetchedAt.toISOString())}
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Type-check and lint**

```bash
npx tsc --noEmit
npm run lint -- src/app/dashboard/workflow-health
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/workflow-health/page.tsx
git commit -m "feat(dashboard): add /dashboard/workflow-health page (table + row expand + 30s poll)"
```

---

### Task 13: Add GUARD section to sidebar

**Files:**
- Modify: `src/app/dashboard/_components/sidebar.tsx`

- [ ] **Step 1: Add the ShieldCheck import**

Open `src/app/dashboard/_components/sidebar.tsx`. Find the lucide-react import block and add `ShieldCheck`:

```ts
import {
  // ... existing imports ...
  ShieldCheck,
} from 'lucide-react';
```

- [ ] **Step 2: Insert the GUARD section**

In the `navSections` array, insert a new section between the existing `OBSERVE` and `WORKSPACE` sections:

```ts
  {
    tag: 'OBSERVE',
    items: [
      { label: 'Financials', href: '/dashboard/financials', icon: TrendingUp },
      { label: 'Clients',    href: '/dashboard/clients',    icon: Users      },
    ],
  },
  {
    tag: 'GUARD',
    items: [
      { label: 'Workflow Health', href: '/dashboard/workflow-health', icon: ShieldCheck },
    ],
  },
  {
    tag: 'WORKSPACE',
    items: [
      { label: 'Team',         href: '/dashboard/team',                  icon: UsersRound },
      // ... rest unchanged ...
    ],
  },
```

- [ ] **Step 3: Type-check and lint**

```bash
npx tsc --noEmit
npm run lint -- src/app/dashboard/_components
```

Expected: clean.

- [ ] **Step 4: Manual browser smoke**

Open `http://localhost:3000/dashboard`. Confirm:
- Sidebar shows a `GUARD` section with "Workflow Health" between OBSERVE and WORKSPACE
- Click the item → navigates to `/dashboard/workflow-health`
- Page renders one of: Loading → Not enrolled / OK / Unavailable depending on local test data

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/_components/sidebar.tsx
git commit -m "feat(dashboard): add GUARD sidebar section with Workflow Health link"
```

---

## Phase 5 — Wrap-up

### Task 14: Full verification on opsradar

**Files:** none (verification only)

- [ ] **Step 1: Type-check the whole app**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Lint the whole app**

```bash
npm run lint
```

Expected: no NEW warnings beyond the existing baseline.

- [ ] **Step 3: Production build**

```bash
npm run build
```

Expected: build completes successfully.

- [ ] **Step 4: End-to-end smoke (manual)**

With chatv2 running (locally OR via opstest.atta.codes) AND opsradar dev running, with a populated `client_n8n_config` row mapping your test user to a real chatv2 project:

- Log in as that user in opsradar
- Navigate to `/dashboard/workflow-health`
- Confirm: table renders with real workflow data, status dots correct, row expand shows recent executions, Refresh button triggers immediate re-fetch, page polls every 30s when visible, stops polling when tab hidden (verify in DevTools Network panel)
- Force `not_enrolled` state: temporarily NULL `chatv2_project_id` → reload → see empty state
- Force `unavailable` state: stop chatv2 (or point CHATV2_API_URL at an unreachable host) → reload → see error banner

---

### Task 15: Push opsradar and bump the outer submodule

**Files:**
- Modify: outer my-startup repo's `opsradar` submodule pointer

- [ ] **Step 1: Push opsradar feature branch**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git push -u origin feat/workflow-health-page
```

- [ ] **Step 2: Merge to main (fast-forward)**

```bash
git checkout main
git merge --ff-only feat/workflow-health-page
git push origin main
```

- [ ] **Step 3: Bump the outer submodule pointer**

```bash
cd /home/lawand/Desktop/my-startup
git add opsradar
git commit -m "$(cat <<'EOF'
feat: update opsradar submodule — workflow-health page

Customer-facing /dashboard/workflow-health page sourced live from chatv2.
Adds chatv2_project_id mapping column, Route Handler, page UI with 30s
auto-refresh, and a new GUARD sidebar section.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

The outer repo has no remote (local-only by design per `project_outer_repo_local_only` memory). No push needed.

- [ ] **Step 4: Verify final state**

```bash
git -C /home/lawand/Desktop/my-startup/opsradar log --oneline -5
git -C /home/lawand/Desktop/my-startup log --oneline -3
```

Expected: shows new commits on both repos.

---

## Self-review

| Spec section | Coverage |
|---|---|
| Integration model (Model A) | Task 9 (mapping column); Task 8 onboarding inferred from existing admin flow |
| Storage rule | Tasks 5, 11 — neither chatv2 handler nor opsradar Route Handler writes any customer data |
| Three planes diagram | Tasks 5 (chatv2 service handler), 11 (opsradar Route Handler), 12 (UI) |
| Onboarding flow | Tasks 9 (column), 13 (sidebar); team uses Supabase Studio to set chatv2_project_id |
| chatv2 changes | Tasks 2 (env), 3 (middleware), 4 (helper), 5 (routes), 6 (mount), 7 (deploy) |
| Live-fetch model | Task 5 — handler reads via n8n-client, never workflow_health_repository |
| Service endpoint response shape | Task 5 — matches `WorkflowHealthListResponse` in the spec |
| opsradar Route Handler | Task 11 |
| Page UI: compact table + row expand + 30s refresh + manual button | Task 12 |
| GUARD sidebar | Task 13 |
| Failure modes (no mapping, unreachable, 401, 404, n8n down) | Task 11 — explicit branches |
| chatv2 origin invisible | Tasks 11/12 — server-side proxy only, no chatv2 hostnames in client-rendered text |

**Placeholders / TODOs:** none.

**Type consistency:** `WorkflowHealthListResponse` in Task 5 (chatv2) and `WorkflowHealthEntry` in Task 12 (opsradar) are identical. Field names match (workflow_id, status, last_run_at, last_error_summary, open_alerts_count, recent_executions).

**Scope:** plan focused on Workflow Health only. Stripe integration framework is a separate spec/plan.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-11-workflow-health-page.md`.

**Per the user's saved preference (`feedback_codex_for_reviews.md`), execution dispatches `codex:codex-rescue` for review after each task instead of the default review subagent.**

Two execution options:

1. **Subagent-Driven (recommended)** — Dispatch a fresh subagent per task. After each task completes, dispatch `codex:codex-rescue` for review. Fast iteration with clean context per task.

2. **Inline Execution** — Execute tasks in this session via `superpowers:executing-plans`. Slower context growth, every step visible.

Which approach?
