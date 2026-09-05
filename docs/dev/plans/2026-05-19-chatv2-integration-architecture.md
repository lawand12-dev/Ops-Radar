# OpsRadar ↔ chatv2 Integration Architecture (Revised)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Revision note (2026-05-19):** the original draft of this plan proposed a per-user JWT identity bridge with a shared `JWT_SECRET`. After auditing main, **the chatv2 bridge already exists** using a fundamentally simpler model: a single shared service API key plus per-customer `chatv2_project_id` mapping. This document is the corrected architecture grounded in what actually ships today.

**Goal:** Centralize, harden, and extend the existing main↔chatv2 bridge so every chatv2 integration uses one typed client, one error model, one timeout policy, one auth pattern — and so new features (COO chat via chatv2 AI, FO multi-client dashboard) can plug in with a 5-line API route instead of a duplicated 80-line fetch block.

**Architecture:** Federated topology. Supabase remains canonical for customer identity and customer-owned feature data. chatv2 owns AI/RAG, n8n workflow monitoring, projects, audit/events. Main authenticates to chatv2 with a single `CHATV2_SERVICE_API_KEY` bearer; tenancy is scoped per-call by passing the customer's `chatv2_project_id` (looked up from Supabase `client_n8n_config`) in the URL path. All chatv2 traffic is server-side from Next.js API routes — browsers never touch opstest.atta.codes.

**Tech Stack:** Next.js 16 (Node runtime), Supabase Postgres + auth (already wired), chatv2 Hono backend on opstest.atta.codes (CTO-deployed), Upstash Redis (caching), plain `fetch` (no JWT library needed).

**Path alias:** All Next.js imports use `<npm>/...` → `./src/...`.

---

## 0. What's Already Shipped (don't rebuild)

Two API routes already proxy to chatv2 today. They use a duplicated fetch pattern that this plan will centralize, not replace:

| Next.js route | chatv2 endpoint | Purpose |
|---|---|---|
| `/api/dashboard/automation-roi` | `GET /service/projects/:projectId/analytics` | Automation ROI card on dashboard |
| `/api/dashboard/workflow-health` | `GET /service/projects/:projectId/workflows/health` | Workflow health strip |

**Existing env vars:**
- `CHATV2_API_URL` — base URL, e.g. `https://opstest.atta.codes`
- `CHATV2_SERVICE_API_KEY` — service bearer token

**Existing tenant mapping:**
- Supabase table `client_n8n_config`, column `chatv2_project_id`
- Populated by admin during onboarding at `/admin/onboard-customer`
- If a customer has no `chatv2_project_id`, the route returns `{ status: 'not_enrolled' }`

**Existing pattern (duplicated across both routes):**
```typescript
const apiUrl = process.env.CHATV2_API_URL;
const serviceKey = process.env.CHATV2_SERVICE_API_KEY;
if (!apiUrl || !serviceKey) return /* 500 */;

const { data: mapping } = await supabase
  .from('client_n8n_config').select('chatv2_project_id')
  .eq('client_id', userId).maybeSingle();
if (!mapping?.chatv2_project_id) return /* not_enrolled */;

const upstream = await fetch(
  `${apiUrl}/service/projects/${mapping.chatv2_project_id}/...`,
  { headers: { Authorization: `Bearer ${serviceKey}` },
    signal: AbortSignal.timeout(10_000) },
);
// ...handle 404, !ok, parse, return
```

This block appears almost verbatim in both routes — perfect candidate for extraction.

---

## 1. Architectural Decisions (invariants)

These constraints govern every future chatv2 integration.

### 1.1 Service-key trust, not per-user identity

Main authenticates to chatv2 with a single shared `CHATV2_SERVICE_API_KEY` (HTTP Bearer). chatv2 trusts main as a service. **Main is responsible for tenant-scoping the call** by passing the correct `chatv2_project_id` in the URL.

Implication: there is no per-customer auth checking on chatv2's service routes. If main passes the wrong project_id, chatv2 will happily serve the wrong customer's data. **Therefore every Next.js route that calls chatv2 must:**
1. Resolve the Supabase user_id from the session
2. Look up that user's `chatv2_project_id`
3. Reject the request (`not_enrolled`) if no mapping exists

No exceptions. The `chatv2_project_id` is never accepted from the browser or from a query parameter.

### 1.2 Domain ownership (no overlap)

| Concern | Owner |
|---|---|
| Customer auth + session | Supabase |
| Customer Model C integration keys (Stripe/Harvest/ClickUp/…) | Supabase `integrations` |
| Briefings, profitability snapshots, scope data cache, retainer configs, agent actions, agency_submissions, alert_notifications | Supabase |
| **AI / RAG / chat completions** | **chatv2** |
| **n8n workflow monitoring + analytics** | **chatv2** (already shipped) |
| **Multi-tenant projects (FO use case)** | **chatv2** `projects` table |
| **Audit / events log** | **chatv2** `events` |

### 1.3 Customer-invisible proxying (mandatory)

- Browser never makes a request to `opstest.atta.codes`.
- Every chatv2 call originates from a Next.js API route in the Node runtime.
- No customer-facing copy, link, footer, or doc may mention chatv2 / opstest.atta.codes / atta.codes.
- chatv2's team-facing UI at opstest.atta.codes stays behind the CTO's existing access controls.

### 1.4 Failure & degradation

- 10-second hard timeout on every chatv2 call (default; overridable for AI calls).
- chatv2 down ≠ OpsRadar down. Routes return `{ status: 'unavailable' }` (or stale Redis cache when available) — never bubble a 500.
- One retry on network/timeout errors. No retry on 4xx (deterministic).

### 1.5 Configuration

- `CHATV2_API_URL` and `CHATV2_SERVICE_API_KEY` are set in Vercel env (already configured per `.env.local`).
- Rotating the service key requires coordinated rollout: deploy chatv2 first (accepting both old + new), then update Vercel, then chatv2 drops the old.

---

## 2. The Connection Layer

Three new files, two refactored files, one new internal route. After this section ships, every existing chatv2 integration uses the shared client and every future one is a 5-line addition.

### File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/lib/chatv2/errors.ts` | `ChatV2Error` class with `isUnavailable()` / `isNotFound()` |
| Create | `src/lib/chatv2/client.ts` | `chatV2Fetch<T>()` — service-key auth, timeout, auto project-path prefix, error mapping |
| Create | `src/lib/chatv2/project-mapping.ts` | `getChatV2ProjectId(userId)` — Supabase lookup |
| Modify | `src/app/api/dashboard/automation-roi/route.ts` | Use `chatV2Fetch` |
| Modify | `src/app/api/dashboard/workflow-health/route.ts` | Use `chatV2Fetch` |
| Create | `src/app/api/internal/chatv2-ping/route.ts` | Health check, gated behind `ADMIN_PASSWORD` |

---

### Task 1: Errors module

**Files:**
- Create: `src/lib/chatv2/errors.ts`

- [ ] **Step 1: Create `src/lib/chatv2/errors.ts`**

```typescript
// src/lib/chatv2/errors.ts

/**
 * Unified error for all chatv2 calls. Thrown by `chatV2Fetch` on any failure.
 * Status 0 = network/timeout (no HTTP response received).
 */
export class ChatV2Error extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ChatV2Error';
  }

  /** True for transient errors where stale cache or "unavailable" UX is appropriate. */
  isUnavailable(): boolean {
    return this.status === 0 || this.status >= 500;
  }

  isNotFound(): boolean {
    return this.status === 404;
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/lib/chatv2/errors.ts
git commit -m "feat(chatv2): ChatV2Error class for unified error handling"
```

---

### Task 2: Typed HTTP client

**Files:**
- Create: `src/lib/chatv2/client.ts`

- [ ] **Step 1: Create `src/lib/chatv2/client.ts`**

```typescript
// src/lib/chatv2/client.ts
// Server-side HTTP client for chatv2.
// All call sites must originate from a Next.js API route (Node runtime).
// Never imported by client components — the service key would leak to the browser.

import { ChatV2Error } from './errors';

const DEFAULT_TIMEOUT_MS = 10_000;
const USER_AGENT = 'OpsRadar-Next/1.0 (+server)';

export type ChatV2FetchOpts = {
  /** If set, path is rewritten to `/service/projects/:projectId{path}`. */
  projectId?: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
  /** Optional abort signal merged with the timeout. */
  signal?: AbortSignal;
};

type ChatV2Config = {
  apiUrl: string;
  serviceKey: string;
};

function loadConfig(): ChatV2Config {
  const apiUrl = process.env.CHATV2_API_URL;
  const serviceKey = process.env.CHATV2_SERVICE_API_KEY;
  if (!apiUrl || !serviceKey) {
    throw new ChatV2Error(
      500,
      'NOT_CONFIGURED',
      'CHATV2_API_URL or CHATV2_SERVICE_API_KEY is not set',
    );
  }
  return { apiUrl: apiUrl.replace(/\/+$/, ''), serviceKey };
}

function buildUrl(base: string, path: string, projectId: string | undefined): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (projectId) {
    return `${base}/service/projects/${encodeURIComponent(projectId)}${cleanPath}`;
  }
  return `${base}${cleanPath}`;
}

/**
 * Makes an authenticated request to chatv2.
 * - Returns parsed JSON on 2xx.
 * - Throws ChatV2Error on any failure (network, timeout, non-2xx).
 * - Returns undefined for 204 No Content.
 */
export async function chatV2Fetch<T = unknown>(
  path: string,
  opts: ChatV2FetchOpts = {},
): Promise<T> {
  const { apiUrl, serviceKey } = loadConfig();
  const {
    projectId,
    method = 'GET',
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: externalSignal,
  } = opts;

  const url = buildUrl(apiUrl, path, projectId);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const signal = externalSignal
    ? anySignal([externalSignal, controller.signal])
    : controller.signal;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ChatV2Error(0, 'TIMEOUT', `chatv2 timed out after ${timeoutMs}ms`, err);
    }
    throw new ChatV2Error(
      0,
      'NETWORK',
      err instanceof Error ? err.message : 'network error',
      err,
    );
  }
  clearTimeout(timer);

  if (response.status === 204) return undefined as unknown as T;

  if (!response.ok) {
    let bodyText = '';
    try {
      bodyText = await response.text();
    } catch {
      // fall through with empty body
    }
    let parsed: { code?: string; message?: string } = {};
    try {
      parsed = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      // non-JSON error body — keep raw text
    }
    throw new ChatV2Error(
      response.status,
      parsed.code ?? `HTTP_${response.status}`,
      parsed.message ?? bodyText.slice(0, 200) ?? `chatv2 returned ${response.status}`,
    );
  }

  try {
    return (await response.json()) as T;
  } catch (err) {
    throw new ChatV2Error(
      response.status,
      'BAD_JSON',
      'chatv2 returned non-JSON success body',
      err,
    );
  }
}

/** Merges multiple AbortSignals into one. Aborts when any source aborts. */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  for (const sig of signals) {
    if (sig.aborted) {
      controller.abort();
      break;
    }
    sig.addEventListener('abort', onAbort, { once: true });
  }
  return controller.signal;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/chatv2/client.ts
git commit -m "feat(chatv2): typed fetch client — service-key auth, timeout, project-path prefix, error mapping"
```

---

### Task 3: Project-mapping helper

**Files:**
- Create: `src/lib/chatv2/project-mapping.ts`

- [ ] **Step 1: Create `src/lib/chatv2/project-mapping.ts`**

```typescript
// src/lib/chatv2/project-mapping.ts
// Resolves a Supabase user_id to their chatv2 project_id.
// The mapping is populated by admin onboarding at /admin/onboard-customer.

import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

/**
 * Returns the chatv2 project_id for the given Supabase user, or null if the
 * user has no mapping (not enrolled in the chatv2 integration).
 *
 * Throws on Supabase errors — callers should let those bubble to a 500.
 */
export async function getChatV2ProjectId(userId: string): Promise<string | null> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('client_n8n_config')
    .select('chatv2_project_id')
    .eq('client_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`chatv2 project mapping lookup failed: ${error.message}`);
  }

  return data?.chatv2_project_id ?? null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/chatv2/project-mapping.ts
git commit -m "feat(chatv2): getChatV2ProjectId helper — Supabase user_id → chatv2 project_id"
```

---

### Task 4: Refactor `workflow-health` route

**Files:**
- Modify: `src/app/api/dashboard/workflow-health/route.ts`

- [ ] **Step 1: Rewrite the route using the new client**

Replace the entire file content with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { chatV2Fetch } from '<npm>/lib/chatv2/client';
import { ChatV2Error } from '<npm>/lib/chatv2/errors';
import { getChatV2ProjectId } from '<npm>/lib/chatv2/project-mapping';

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
      { status: 401 },
    );
  }

  let projectId: string | null;
  try {
    projectId = await getChatV2ProjectId(userId);
  } catch (err) {
    console.error('[workflow-health] mapping lookup failed:', err);
    return NextResponse.json(
      { status: 'unavailable', message: 'mapping_lookup_failed' },
      { status: 500 },
    );
  }

  if (!projectId) {
    return NextResponse.json({ status: 'not_enrolled' });
  }

  try {
    const body = await chatV2Fetch<{ project_id: string; workflows: WorkflowHealthEntry[] }>(
      '/workflows/health',
      { projectId },
    );
    return NextResponse.json({ status: 'ok', workflows: body.workflows });
  } catch (err) {
    if (err instanceof ChatV2Error) {
      if (err.isNotFound()) {
        return NextResponse.json({ status: 'not_enrolled' });
      }
      console.error(`[workflow-health] chatv2 ${err.status} ${err.code}: ${err.message}`);
      return NextResponse.json(
        { status: 'unavailable', message: `upstream_${err.status || 'error'}` },
        { status: 502 },
      );
    }
    console.error('[workflow-health] unexpected error:', err);
    return NextResponse.json(
      { status: 'unavailable', message: 'internal_error' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run build 2>&1 | grep -E "error TS" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/workflow-health/route.ts
git commit -m "refactor(workflow-health): use shared chatV2Fetch client — same behavior, half the LOC"
```

---

### Task 5: Refactor `automation-roi` route

**Files:**
- Modify: `src/app/api/dashboard/automation-roi/route.ts`

- [ ] **Step 1: Read the current file to understand caching + ROI shape**

```bash
cat src/app/api/dashboard/automation-roi/route.ts | head -100
```

Note the Redis fresh/stale cache pattern, the `AutomationRoiWidget` shape, and the upstream `CtoAnalyticsResponse` mapping. These must be preserved exactly.

- [ ] **Step 2: Replace the chatv2 fetch block with `chatV2Fetch`**

Locate the block starting at line ~158 (`let response: Response; try { response = await fetch(...)`) through the `(await response.json()) as CtoAnalyticsResponse` assignment. Replace with:

```typescript
let raw: CtoAnalyticsResponse;
try {
  raw = await chatV2Fetch<CtoAnalyticsResponse>('/analytics', { projectId });
  if (!raw?.overview || typeof raw.overview.total_runs !== 'number') {
    throw new Error('unexpected shape');
  }
} catch (err) {
  const stale = await safeRedisGet<{ data: AutomationRoiWidget; ts: number }>(keys.stale);
  if (err instanceof ChatV2Error) {
    if (err.isNotFound()) {
      return NextResponse.json({ status: 'not_enrolled' });
    }
    return NextResponse.json({
      status: 'error',
      message: err.isUnavailable() ? 'chatv2 unreachable' : `chatv2 returned ${err.status}`,
      ...(stale && { staleData: stale.data, staleAgeMs: Date.now() - stale.ts }),
    });
  }
  return NextResponse.json({
    status: 'error',
    message: 'chatv2 returned unexpected shape',
    ...(stale && { staleData: stale.data, staleAgeMs: Date.now() - stale.ts }),
  });
}
```

Also:
- Replace the `mapping?.chatv2_project_id` lookup block (lines ~141–156) with a call to `getChatV2ProjectId(userId)` (use the same `not_enrolled` branching).
- Remove the now-unused `apiUrl`/`serviceKey` env var reads at the top.
- Add imports: `chatV2Fetch`, `ChatV2Error`, `getChatV2ProjectId`.

- [ ] **Step 3: Verify TypeScript compiles + behavior preserved**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run build 2>&1 | grep -E "error TS" | head -10
```

Manual sanity check: the route should still return the same response shapes:
- `{ status: 'not_enrolled' }` when no mapping
- `{ status: 'ok', data, fromCache: boolean }` on success
- `{ status: 'error', message, staleData?, staleAgeMs? }` on chatv2 failure

- [ ] **Step 4: Commit**

```bash
git add src/app/api/dashboard/automation-roi/route.ts
git commit -m "refactor(automation-roi): use shared chatV2Fetch client — preserves Redis fresh/stale caching"
```

---

### Task 6: Health-check endpoint

**Files:**
- Create: `src/app/api/internal/chatv2-ping/route.ts`

- [ ] **Step 1: Create the ping route**

```typescript
// src/app/api/internal/chatv2-ping/route.ts
// Internal-only: verifies the chatv2 connection works end-to-end.
// Auth: ADMIN_PASSWORD bearer. Not customer-facing.
import { NextResponse, type NextRequest } from 'next/server';
import { chatV2Fetch } from '<npm>/lib/chatv2/client';
import { ChatV2Error } from '<npm>/lib/chatv2/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ChatV2HealthBody = {
  status?: string;
  service?: string;
  timestamp?: string;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${adminPassword}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await chatV2Fetch<ChatV2HealthBody>('/', { timeoutMs: 5_000 });
    return NextResponse.json({ connected: true, chatv2: body });
  } catch (err) {
    if (err instanceof ChatV2Error) {
      return NextResponse.json({
        connected: false,
        status: err.status,
        code: err.code,
        message: err.message,
      });
    }
    return NextResponse.json(
      { connected: false, message: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run build 2>&1 | grep -E "error TS" | head -10
```

- [ ] **Step 3: Manual smoke test (optional, requires dev server + secret)**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
npm run dev &
sleep 5
ADMIN_PASSWORD=$(grep '^ADMIN_PASSWORD=' .env.local | cut -d= -f2)
curl -s http://localhost:3000/api/internal/chatv2-ping \
  -H "Authorization: Bearer ${ADMIN_PASSWORD}" | head -100
```

Expected: `{ "connected": true, "chatv2": { ... } }` or `{ "connected": false, "code": "...", ... }` (which is still a successful test of the wire — it just means chatv2 is unreachable or doesn't have a `/` health response yet).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/internal/chatv2-ping/route.ts
git commit -m "feat(chatv2): /api/internal/chatv2-ping — admin-gated health check via shared client"
```

---

## 3. First New Feature: COO Chat → chatv2 AI (next session)

Once the connection layer above is in place, routing the COO chat through chatv2's RAG agent is a thin Next.js change:

```typescript
// src/lib/chatv2/ai.ts (new)
import { chatV2Fetch } from './client';

export type AiMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export async function chatV2Ai(projectId: string, messages: AiMessage[]) {
  return await chatV2Fetch<{ reply: string; interaction_id: string }>(
    '/chat',
    { projectId, method: 'POST', body: { messages }, timeoutMs: 30_000 },
  );
}
```

Then the existing `/api/dashboard/coo/route.ts` swaps its OpenAI call for `chatV2Ai(projectId, messages)`, with the same `getChatV2ProjectId` lookup and `not_enrolled` handling.

**Blockers before executing:**
- Confirm the exact chatv2 AI endpoint path under `/service/projects/:id/...`. The chatv2 git branch shows a `/chat` route module — needs CTO confirmation that the deployed `/service/...` namespace exposes it.
- Confirm the request/response shape matches what main needs.

---

## 4. FO Multi-Client Dashboard via chatv2 Projects (later)

The current pattern is **one Supabase user → one chatv2 project** (via `client_n8n_config.chatv2_project_id`). For the FO tier, we need **one Supabase user → N chatv2 projects**, with each project being one managed agency.

Three architectures to choose from:

| Option | Shape | Pros | Cons |
|---|---|---|---|
| A | New Supabase table `fo_chatv2_mappings(fo_user_id, chatv2_project_id, agency_name)` | No chatv2 change; reuses existing fetch patterns | Two mapping tables (existing + FO) |
| B | Change `client_n8n_config.chatv2_project_id` to a JSON array | Single mapping table | Breaks existing single-project assumption everywhere; risky |
| C | chatv2 owns the FO→projects relationship via its existing `projects.user_id` FK + new endpoint `GET /service/users/:supabaseUserId/projects` | Single source of truth, leverages chatv2's existing multi-tenancy | Requires chatv2-side endpoint + storing Supabase user_id on chatv2 projects |

**Recommended:** Option A for v1 (ships without CTO blocking), evolve to Option C once chatv2 exposes the user→projects index endpoint.

This phase will be a separate plan once we have data on FO demand.

---

## 5. Roadmap Beyond the Bridge

| Order | Feature | What moves where |
|---|---|---|
| 1 | (this plan) Centralize existing bridge | Done after Task 6 |
| 2 | COO chat → chatv2 AI | §3 above |
| 3 | FO multi-client dashboard | §4 above |
| 4 | Audit log → admin tools | `chatV2Fetch('/events', { projectId })` |
| 5 | Customer activity feed (subset of audit) | Same endpoint, filtered |

Things that stay on Supabase:
- Customer auth & session
- Customer Model C integration keys (Stripe/Harvest/ClickUp/…)
- Briefings, profitability snapshots, retainer configs, alert_notifications, agent_actions

---

## 6. CTO Coordination Checklist

The Next.js work in Tasks 1–6 ships **with zero chatv2-side changes** because we're using endpoints that already exist. The following items unlock future phases:

- [ ] **Confirm `/` root returns a health JSON** (e.g., `{ status: 'ok', service: 'ai-automation-builder', ... }`) — used by `/api/internal/chatv2-ping`. If not, expose a `/health` endpoint.
- [ ] **AI/RAG endpoint contract** — confirm `POST /service/projects/:id/chat` (or wherever it's mounted) accepts `{ messages: [...] }` and returns `{ reply, interaction_id, citations? }`.
- [ ] **Workflow analytics endpoint stability** — `/service/projects/:id/analytics` and `/service/projects/:id/workflows/health` shapes must not break — covered by main's existing routes today.
- [ ] **Future: `GET /service/users/:supabaseUserId/projects`** for FO multi-client (Option C in §4).
- [ ] **Future: agency_integrations storage on chatv2 projects** for FO's per-agency Stripe/Harvest/ClickUp keys.

---

## Self-Review

### Spec coverage

| Goal | Addressed |
|---|---|
| One typed client for all chatv2 calls | ✅ Task 2 |
| Centralize duplicated fetch logic | ✅ Tasks 4, 5 |
| Unified error model with graceful degradation | ✅ Task 1 + isUnavailable/isNotFound pattern in refactors |
| Project-mapping abstraction | ✅ Task 3 |
| End-to-end smoke test | ✅ Task 6 |
| Roadmap for next features | ✅ §3, §4, §5 |
| Reflects actual deployed architecture | ✅ §0 documents current state; whole plan grounded in it |

### Type consistency

- `ChatV2Error` exported from `errors.ts`, imported in `client.ts`, `workflow-health/route.ts`, `automation-roi/route.ts`, `chatv2-ping/route.ts` — consistent.
- `ChatV2FetchOpts` defined in `client.ts`, used internally — single source of truth.
- `getChatV2ProjectId` returns `string | null`, both consumers handle the `null` branch as `not_enrolled` — consistent.

### What changed from the original draft

| Original (wrong) | Revised (correct) |
|---|---|
| `JWT_SECRET` + per-user JWT minting via `jose` | `CHATV2_SERVICE_API_KEY` shared bearer |
| `CHATV2_BASE_URL` | `CHATV2_API_URL` (existing var) |
| Identity bridge: Supabase user_id = chatv2 user_id | Tenant scoping: per-customer `chatv2_project_id` in URL |
| Build new bridge from scratch | Centralize what already ships |

### No placeholders

All code blocks are complete and runnable. The only TBDs are in §6 (CTO checklist) which are explicitly future-phase items.
