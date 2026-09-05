# CP-33b → CP-37 — AI Employees master plan + spec (May 2026)

> Compiled: 2026-05-25 · Owner: founder · Status: ready to build · Estimated total effort: **3-4 weeks of focused work**.
>
> This is the master implementation spec covering the AI Employees architecture (CP-34→37) plus the production-safety stack (Sentry / Langfuse / Statsig flags) and the scheduler migration (Trigger.dev). It is the single document the next engineer (or me, in the next session) reads to know exactly what to build, in what order, with what verification.

---

## 0. Reading order for context

Before touching code, read these strategy docs (they explain WHY each decision):

1. [`docs/specs/ai-employees.md`](../../strategy/ai-employees-architecture-2026.md) — what AI Employees are + the 5 primitives
2. [`docs/specs/architecture-audit.md`](../../strategy/architecture-audit-2026.md) — competitive audit vs Notion/Lindy/BOND
3. [`docs/adr/0002-scheduler-trigger-dev.md`](../../strategy/scheduler-decision-2026.md) — Trigger.dev pick + rationale
4. [`docs/specs/trigger-composio-integration.md`](../../strategy/trigger-composio-integration-2026.md) — Trigger.dev + Composio integration patterns
5. [`docs/adr/0008-observability-sentry-statsig-langfuse.md`](../../strategy/observability-stack-2026.md) — Sentry + Langfuse + Statsig flags + pgvector sequencing
6. [`docs/adr/0004-three-tier-memory.md`](../../strategy/three-tier-memory-architecture-2026.md) — brain (CP-25/27) architecture inherited here
7. [`docs/adr/0005-control-first-approval-gate.md`](../../strategy/control-surface-research-2026.md) — approval gate (CP-14) inherited here
8. [`docs/specs/automations.md`](../../strategy/automations-architecture-2026.md) — CP-20 events inherited here

---

## 1. North star

**One product idea:** OpsRadar lets the customer build their own AI workforce.

- Pre-hired team: 28 built-in named employees (Riley, Sarah, etc.) — included with the tier.
- Custom hires: the customer talks to the COO and says *"I want a Bookkeeper named Sarah"* — Sarah appears as a real teammate with her own chat thread, scoped tools, persistent memory, schedule, and learned rules.
- **Architecture pattern**: hierarchical (COO supervises all employees) + scoped tools + per-employee Postgres-backed brain memory + Karpathy-style versioned markdown + Trigger.dev for scheduling/durability + Composio for SaaS API access.

**The two YC-grade moats we lock in with this plan:**

| Moat | Built by which CP |
|---|---|
| Per-employee Postgres-as-git brain + weekly markdown export (Karpathy safety valve) | Already shipped (CP-26/27/28/29). CP-34 extends it per-employee. |
| Org chart with `step.waitForEvent` delegation (impossible on Vercel Cron, Lindy, Notion) | CP-37 |

---

## 2. Goals + non-goals

### Goals (must ship)

| # | Goal | Why |
|---|---|---|
| 1 | 28 built-in agents promoted to named employees with chat tabs | Match Notion's "Onboarding Eddie" pattern. Customers feel like they have teammates. |
| 2 | Custom employee creation via COO chat | The Lindy 3.0 "AI Employee" pattern, vertical-agency depth. |
| 3 | Per-employee chat thread + memory | Each employee feels distinct, owns its corner of the brain. |
| 4 | Option C escalation (`consult_coo`) | Employees aren't isolated — the COO is the single advisor for cross-cutting context. |
| 5 | Apprentice Mode — employees learn from rejections | Compound value over weeks. No competitor has this. |
| 6 | Live workforce view | BOND-style "what's happening right now" — but per-employee, not just KPIs. |
| 7 | Org chart with delegation | Real agency org-mirror; impossible without durable wait. |
| 8 | Production-safety stack (Sentry + Langfuse + Statsig flags) | Pre-launch insurance against AI misbehavior. |
| 9 | Trigger.dev migration for new dispatcher | Per-second cron, retries, event triggers, step waits. |

### Non-goals (defer to later CPs)

- SMS/iMessage chat per employee (CP-38 future)
- Public agent template marketplace (CP-39 future)
- Real-time voice (CP-40 future)
- Multi-agent debate / consensus (academic, skip)
- Migrating the 28 built-in agents OFF Vercel Cron (they work fine there)
- Switching from OpenAI to Claude (locked decision: stay on OpenAI)
- Multi-tier model selection per employee in v1 UI (default gpt-5.4)

---

## 3. The complete dependency graph

```
        ┌────────────────────────────────────────┐
        │ CP-34a-FOUNDATION (already started)    │
        │ - schema + naming + types + registry   │  ← 60% done in current session
        │ - custom-employees dispatcher (Vercel)  │  ← shipped, will migrate to TD
        │ - consult_coo escalation tool           │  ← shipped
        └────────────────┬───────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────┐
        │ CP-PROD-SAFETY (insurance)             │  ← MUST ship before CP-34b
        │ - Sentry                                │
        │ - Statsig + @vercel/flags               │
        │ - Langfuse instrumentation             │
        └────────────────┬───────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────┐
        │ CP-TRIGGER-DEV (scheduler upgrade)     │
        │ - Migrate custom-employees dispatcher  │
        │ - Migrate CP-20 webhook handler        │
        │ - Wrap event-handler in step.run       │
        └────────────────┬───────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────┐
        │ CP-34b (chat-driven creation)          │
        │ - propose_custom_employee tool         │
        │ - install_custom_employee tool         │
        │ - list/inspect/pause/archive tools     │
        └────────────────┬───────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────┐
        │ CP-34c (UI surfaces)                   │
        │ - /dashboard/employees (grid)          │
        │ - /dashboard/employees/[slug] 5 tabs   │
        │ - Sidebar YOUR TEAM section            │
        │ - Per-employee chat backend            │
        └────────────────┬───────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────┐
        │ CP-35 (Apprentice Mode)                │
        │ - pgvector on selected paths           │
        │ - Trigger.dev event on rejection       │
        │ - Per-employee learned-rules.md        │
        └────────────────┬───────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────┐
        │ CP-36 (Live workforce view)            │
        │ - Trigger.dev realtime SDK             │
        │ - /dashboard "Team Live" widget        │
        └────────────────┬───────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────┐
        │ CP-37 (Org chart + delegation)         │
        │ - parent_employee_id (already in DB)   │
        │ - step.waitForEvent primitives         │
        │ - delegate_to_employee chat tool       │
        │ - Org chart visualization              │
        └────────────────────────────────────────┘
```

---

## 4. CP-by-CP detailed spec

### CP-34a — Foundation (status: ~60% complete this session)

| Item | Status |
|---|---|
| Migration `20260525_custom_employees.sql` applied to Supabase | ✅ Done |
| `src/lib/agents/employee-metadata.ts` (28 names + bios + emojis) | ✅ Done |
| Type stubs in `src/lib/database.types.ts` | ✅ Done |
| `src/lib/employees/types.ts` + `src/lib/employees/registry.ts` (unified) | ✅ Done |
| `/api/cron/custom-employees` Vercel Cron route | ✅ Done (will be migrated to Trigger.dev in CP-TRIGGER-DEV) |
| `consult_coo` escalation tool wired into `runAgent` loop | ✅ Done |
| `src/lib/employees/consult-coo.ts` | ✅ Done |
| **Build verifies (`npm run build`)** | 🔜 Pending — must pass before commit |
| **Commit** | 🔜 Pending |

**Acceptance criteria for closing CP-34a:**
- `npm run build` passes
- Migration applied (verified in Supabase dashboard)
- Manually invoking `loadFullWorkforce(testUserId)` returns 28 built-in + 0 custom = 28 employees
- Manually invoking `resolveEmployee(testUserId, 'revenue')` returns Riley
- Manually invoking `consultCoo({ userId, callerSlug: 'revenue', question: 'test' })` returns a valid JSON answer

---

### CP-PROD-SAFETY — Insurance before features (~1.5 days)

#### Step 1: Sentry (30 min)

```bash
npx @sentry/wizard@latest -i nextjs
# Follow prompts, paste DSN into .env.local + Vercel env
```

Wizard creates:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- Adds `next.config.ts` wrapper

**Verify:** trigger a deliberate error in a test API route, confirm it appears in Sentry dashboard within 1 minute.

**Acceptance:** any uncaught exception in any Vercel function or React component appears in Sentry.

---

#### Step 2: Statsig + `@vercel/flags` (2 hours)

```bash
npm install @vercel/flags @statsig/feature-flags
```

Create Statsig account, get server SDK key.

```ts
// src/lib/flags/index.ts
import { unstable_flag } from "@vercel/flags/next"
import { statsigAdapter } from "@vercel/flags/providers/statsig"

export const customEmployeesEnabled = unstable_flag<boolean>({
  key: "custom-employees-enabled",
  adapter: statsigAdapter,
  defaultValue: false,
})

export const consultCooEnabled = unstable_flag<boolean>({
  key: "consult-coo-enabled",
  adapter: statsigAdapter,
  defaultValue: true,
})

export const apprenticeModeEnabled = unstable_flag<boolean>({
  key: "apprentice-mode-enabled",
  adapter: statsigAdapter,
  defaultValue: false,
})

export const liveWorkforceViewEnabled = unstable_flag<boolean>({
  key: "live-workforce-view-enabled",
  adapter: statsigAdapter,
  defaultValue: false,
})
```

Wire kill-switch checks at entry points:
- `/dashboard/employees` → checks `customEmployeesEnabled`
- `consult_coo` tool → checks `consultCooEnabled`
- Apprentice Mode handler → checks `apprenticeModeEnabled`

**Acceptance:** flipping a Statsig flag in their dashboard changes behavior in production within 30 seconds without redeploying.

---

#### Step 3: Langfuse (1 day)

```bash
npm install langfuse @langfuse/vercel-ai-sdk
```

Create Langfuse Cloud account (free tier) OR set up self-hosted on Fly.io / Railway.

```ts
// src/lib/observability/langfuse.ts
import { Langfuse } from "langfuse"

export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com",
})

export function observeForRun(opts: {
  userId: string
  agentSlug: string
  runId: string
  tier?: string
}) {
  return {
    sessionId: opts.runId,
    userId: opts.userId,
    metadata: { agentSlug: opts.agentSlug, tier: opts.tier },
    tags: [`agent:${opts.agentSlug}`, opts.tier ? `tier:${opts.tier}` : ""].filter(Boolean),
  }
}
```

Wrap every `generateText` / `streamText` call in `src/lib/agents/loop.ts` + `src/lib/coo/route.ts`:

```ts
import { observeOpenAI } from "@langfuse/vercel-ai-sdk"

const traced = observeOpenAI(openai(spec.model), observeForRun({ userId, agentSlug: spec.slug, runId }))

const result = await generateText({
  model: traced,
  tools, system, prompt,
  stopWhen: stepCountIs(spec.maxSteps),
})
```

**Acceptance:**
- Every cron agent run produces a Langfuse trace with all tool calls visible
- Every COO chat message produces a Langfuse trace
- Filter by `userId` works in Langfuse dashboard
- Per-tenant trace isolation verified (UserA's traces don't appear under UserB's filter)

---

### CP-TRIGGER-DEV — Scheduler migration (~1 day)

#### Step 1: Install + configure (30 min)

```bash
npx trigger.dev@latest init --runtime=node
```

Wizard creates `trigger.config.ts`. Set up Trigger.dev cloud project, paste keys into `.env.local`:

```
TRIGGER_PROJECT_ID=proj_xxx
TRIGGER_SECRET_KEY=tr_dev_xxx (dev) / tr_prod_xxx (prod)
```

#### Step 2: Migrate custom-employees dispatcher (3 hours)

Replace `src/app/api/cron/custom-employees/route.ts` with:

```ts
// trigger/employees/custom-employee-dispatcher.ts
import { schedules } from "@trigger.dev/sdk"
import { runEmployee } from "<npm>/lib/employees/run"  // new wrapper

export const customEmployeeDispatcher = schedules.task({
  id: "custom-employee-dispatcher",
  cron: "0 * * * *",  // every hour, per-second possible
  maxDuration: 600,
  run: async (payload) => {
    const rows = await loadSchedulableCustomEmployees() // all users
    for (const row of rows) {
      if (!isCronDueThisHour(row.schedule_cron, payload.timestamp)) continue
      // Fan out: each employee run is its own subtask, observable independently
      await tasks.trigger("run-custom-employee", { employeeId: row.id, userId: row.user_id })
    }
  },
})

// trigger/employees/run-custom-employee.ts
export const runCustomEmployee = task({
  id: "run-custom-employee",
  retry: { maxAttempts: 3, factor: 2 },
  maxDuration: 600,
  run: async ({ employeeId, userId }) => {
    const row = await loadCustomEmployeeById(employeeId)
    if (!row) return { skipped: "not-found" }
    return await runEmployee(row, userId) // wraps existing runAgent loop
  },
})
```

Delete `src/app/api/cron/custom-employees/route.ts` and the corresponding `vercel.json` entry.

#### Step 3: Migrate Composio webhook handler (3 hours)

Update `src/app/api/automations/webhook/composio/route.ts`:

```ts
import { tasks } from "@trigger.dev/sdk"

export async function POST(req: NextRequest) {
  // verify signature (unchanged)
  const event = await req.json()

  // hand off to Trigger.dev for durable handling
  await tasks.trigger("handle-composio-event", {
    userId: event.user_id,
    toolkit: event.toolkit_slug,
    triggerSlug: event.metadata.trigger_slug,
    payload: event.payload,
  })

  return Response.json({ ok: true })
}
```

```ts
// trigger/automations/handle-composio-event.ts
export const handleComposioEvent = task({
  id: "handle-composio-event",
  retry: { maxAttempts: 5, factor: 2 },
  run: async ({ userId, toolkit, triggerSlug, payload }, { step }) => {
    const matches = await step.run("find-matches", () =>
      findAutomationsForEvent(userId, toolkit, triggerSlug)
    )
    for (const auto of matches) {
      await step.run(`fire-${auto.id}`, () =>
        executeAutomation(auto, payload, userId)
      )
    }
  },
})
```

**Acceptance:**
- Manually invoke a Composio test trigger → event lands in Trigger.dev dashboard → handler completes → automation row updates as expected
- Force a failure in the handler → Trigger.dev retries 5x with backoff
- Custom employee scheduled at `0 9 * * *` actually fires at 9am via Trigger.dev (not Vercel Cron)

---

### CP-34b — Chat-driven employee creation (~2 days)

#### Step 1: Compiler library (`src/lib/employees/compile.ts`) (4 hours)

Mirrors `src/lib/automations/compile.ts` pattern. Takes natural-language description, returns typed `EmployeeDraft` via `generateObject`.

```ts
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

export const EmployeeDraftSchema = z.object({
  slug: z.string().regex(/^[a-z][a-z0-9-]*$/),  // kebab-case
  name: z.string().min(1).max(30),
  role: z.string().min(3).max(60),
  emoji: z.string().min(1).max(4),
  persona_summary: z.string().min(20).max(500),
  schedule_human: z.string().describe("'Every day at 8am' or 'No schedule (chat-only)'"),
  schedule_cron: z.string().nullable(),
  scoped_toolkits: z.array(z.string()).min(0).max(10),
  system_prompt: z.string().min(100).max(8000),
  first_task: z.string().min(10).max(200),
})

export type EmployeeDraft = z.infer<typeof EmployeeDraftSchema>

export async function compileEmployeeDraft(input: {
  description: string
  userId: string
  availableToolkits: string[]
}): Promise<EmployeeDraft> {
  const { object } = await generateObject({
    model: openai("gpt-5.4"),
    schema: EmployeeDraftSchema,
    system: COMPILE_SYSTEM_PROMPT,
    prompt: `Customer wants this AI employee: ${input.description}\n\nAvailable toolkits: ${input.availableToolkits.join(", ")}`,
  })
  return object
}
```

#### Step 2: 6 new COO chat tools in `src/lib/coo/ai-sdk-tools.ts` (4 hours)

| Tool | What it does |
|---|---|
| `propose_custom_employee(description)` | Compile description → return draft card data |
| `install_custom_employee(spec)` | Insert into `custom_employees`, register Trigger.dev schedule if cron, return slug |
| `list_custom_employees(status?)` | Return rows for `/dashboard/employees` |
| `inspect_custom_employee(slug)` | Full spec + last 10 runs |
| `pause_custom_employee(slug)` / `unpause` | Flip `status` field |
| `archive_custom_employee(slug)` | Soft-delete: status='archived', unregister Trigger.dev schedule |

#### Step 3: Inline draft card component for chat (4 hours)

`src/components/dashboard/employee-draft-card.tsx` — mirrors `automation-draft-card.tsx` exactly:

```tsx
<EmployeeDraftCard
  draft={draft}
  onConfirm={() => handleHire(draft)}
  onEdit={() => setEditMode(true)}
  onCancel={() => discardDraft()}
/>
```

Shows: emoji + name + role · schedule · tools · first task · 3 buttons.

#### Step 4: Schedule registration with Trigger.dev (2 hours)

When `install_custom_employee` fires, also register the cron with Trigger.dev:

```ts
import { schedules } from "@trigger.dev/sdk"

await schedules.create({
  task: "run-custom-employee",
  cron: spec.schedule_cron,
  externalId: `${userId}:${slug}`,  // for per-employee dashboard filtering
  deduplicationKey: `${userId}:${slug}`,  // idempotent re-install
})
```

On archive, deactivate:
```ts
await schedules.deactivate({ scheduleId: previouslyStoredScheduleId })
```

**Acceptance:**
- Customer types in COO chat: *"I want a Bookkeeper named Sarah, every day at 8am, checks Stripe"* → COO compiles → returns inline draft card → customer clicks Hire → row created → Sarah appears in sidebar
- Customer types *"pause Sarah"* → status flips to paused → Trigger.dev schedule deactivated
- All 6 tools logged in Langfuse with per-tool latency + cost

---

### CP-34c — UI surfaces (~3 days)

#### Step 1: `/dashboard/employees` grid page (1 day)

```tsx
// src/app/dashboard/employees/page.tsx
export default async function EmployeesPage() {
  const userId = await getCurrentUserId()
  const team = await loadFullWorkforce(userId)
  // Render two sections: "Pre-hired" (28 built-in) + "Your hires" (custom)
}
```

Components:
- `EmployeeCard` — emoji + name + role + status dot + last-run-ago
- `HireEmployeeCard` — "+ Hire new" CTA that opens a chat-with-COO modal pre-filled

#### Step 2: `/dashboard/employees/[slug]` 5-tab detail page (1.5 days)

```
┌──────────────────────────────────────────────┐
│ 💰 Riley · Revenue Analyst             ●     │
│ ───────────────────────────────────          │
│ [Chat] [Activity] [Memory] [Skills] [Settings]│
└──────────────────────────────────────────────┘
```

Tabs:
- **Chat**: dedicated thread with this employee. Past threads in left rail. Inline approval cards. Same `streamText` SSE backend as `/dashboard/coo` but scoped to this employee's persona + tools.
- **Activity**: runs feed (filter `agent_runs.agent_slug = employee.slug`). Drill-in drawer reused from `/dashboard/runs/[id]`.
- **Memory**: paths under `employees/<slug>/` from brain. Click → renders markdown.
- **Skills**: scoped toolkits + scoped brain prefixes (editable for custom; read-only for built-in).
- **Settings**: name, role, emoji, persona, system prompt, schedule, model, autonomy. Archive button. Built-in employees: only autonomy + schedule are editable.

#### Step 3: Per-employee chat backend (8 hours)

```ts
// src/app/api/dashboard/employees/[slug]/chat/route.ts
export async function POST(req: NextRequest, { params }) {
  const { slug } = await params
  const userId = await getCurrentUserId()
  const employee = await resolveEmployee(userId, slug)
  if (!employee) return new Response("not_found", { status: 404 })

  // Create or resume a thread
  const thread = await getOrCreateThread(userId, slug)

  // Build the employee's runtime — same shape as runAgent but for chat
  const result = await streamText({
    model: openai(employee.runtime.model),
    system: employee.runtime.systemPrompt,
    tools: await loadScopedTools(userId, employee.runtime.composioApps),
    // ... persist messages to custom_employee_messages
  })
  return result.toDataStreamResponse()
}
```

#### Step 4: Sidebar "YOUR TEAM" section (4 hours)

Update `src/app/dashboard/_components/sidebar.tsx`:

```tsx
{
  tag: 'YOUR TEAM',
  items: [
    { label: '+ Hire AI Employee', href: '/dashboard/employees?new=true', icon: Plus },
    ...team.map(e => ({
      label: `${e.display.emoji} ${e.display.name} · ${e.display.role}`,
      href: `/dashboard/employees/${e.slug}`,
      icon: () => null,
      statusDot: e.status === 'active' ? 'green' : 'gray',
    })),
  ],
}
```

Keep it under 8 items visible — show the rest under a "View all team →" link if more than 8.

**Acceptance:**
- Customer visits `/dashboard/employees` and sees 28 pre-hired + N custom hires in two sections
- Click Sarah → her 5-tab page opens
- Type in her Chat tab → SSE stream responds in Sarah's voice using her scoped tools
- Activity tab shows Sarah's last 50 runs with status badges
- Memory tab shows files under `employees/sarah/` in the brain
- Sidebar shows the team with green status dots; clicking jumps to detail pages

---

### CP-35 — Apprentice Mode (~3 days)

#### Step 1: pgvector enablement (4 hours)

```sql
-- Migration: 20260526_brain_embeddings.sql
create extension if not exists vector;

alter table brain_documents
  add column embedding vector(1536),
  add column embedding_model text default 'text-embedding-3-small';

-- Index ONLY on the curated set (per three-tier-memory-architecture-2026.md §Adjustment 2)
create index idx_brain_documents_embedding on brain_documents
  using hnsw (embedding vector_cosine_ops)
  where path ~ '^(pattern-cards/|decision-log/|risk-register/|employees/[^/]+/learned-rules)';
```

#### Step 2: Embed-on-commit (4 hours)

Update `commitBrainChanges` in `src/lib/brain/store.ts`:

```ts
const EMBED_PREFIXES = ['pattern-cards/', 'decision-log/', 'risk-register/', /^employees\/[^/]+\/learned-rules\//]

async function maybeEmbed(path: string, content: string): Promise<{ embedding: number[]; model: string } | null> {
  if (!EMBED_PREFIXES.some(p => typeof p === 'string' ? path.startsWith(p) : p.test(path))) return null
  const { data } = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: content.slice(0, 8000),
  })
  return { embedding: data[0].embedding, model: 'text-embedding-3-small' }
}
```

#### Step 3: Trigger.dev event-handler for rejections (1 day)

```ts
// trigger/employees/learn-from-rejection.ts
export const learnFromRejection = task({
  id: "learn-from-rejection",
  retry: { maxAttempts: 3 },
  run: async ({ userId, employeeSlug, actionId, originalProposal, rejectionReason, edits }) => {
    // 1. Find similar past rejections for this employee (semantic search)
    const similar = await semanticSearchBrain(userId, {
      prefix: `employees/${employeeSlug}/learned-rules/`,
      query: originalProposal + " " + rejectionReason,
      limit: 5,
    })

    // 2. Ask LLM to derive a generalizable rule
    const { rule } = await generateObject({
      model: openai("gpt-5.4"),
      schema: z.object({ rule: z.string().min(10) }),
      system: LEARN_RULE_SYSTEM_PROMPT,
      prompt: `Original proposal: ${originalProposal}\nRejection: ${rejectionReason}\nEdits: ${edits}\nSimilar past rules: ${similar.map(s => s.content).join('\n')}`,
    })

    // 3. Write to employee's learned-rules.md (versioned brain commit)
    await commitBrainChanges({
      userId,
      authorType: `system:apprentice-mode`,
      message: `Learned rule for ${employeeSlug} from action ${actionId}`,
      changes: [{ path: `employees/${employeeSlug}/learned-rules/${actionId}.md`, content: `# Rule\n\n${rule}\n\n## Context\nOriginal proposal: ${originalProposal}\nReason for rejection: ${rejectionReason}` }],
    })

    return { rule }
  },
})
```

#### Step 4: Fire event on approval-gate rejection (2 hours)

Hook in `src/lib/agents/approval-gate.ts`:

```ts
// When customer rejects an action via /dashboard/actions
if (decision === 'rejected' && apprenticeModeEnabled) {
  await tasks.trigger("learn-from-rejection", {
    userId, employeeSlug: action.agent_slug, actionId: action.id,
    originalProposal: action.payload, rejectionReason: feedback,
  })
}
```

#### Step 5: Employee reads its own rules on every run (1 hour)

In `src/lib/agents/loop.ts` system prompt enrichment:

```ts
const learnedRules = await loadBrainDocuments({
  userId,
  prefixes: [`employees/${spec.slug}/learned-rules/`],
  limit: 50,
})
if (learnedRules.length > 0) {
  enrichments.push(
    `# Your learned rules (apply these — they're from past corrections)\n${learnedRules.map(r => r.content).join('\n---\n')}`
  )
}
```

**Acceptance:**
- Customer rejects a Sarah-proposed action with feedback "wrong category — figma is software not office"
- Within 2 minutes, `employees/sarah/learned-rules/<actionId>.md` appears in brain with the rule extracted
- Next morning's Sarah run includes the rule in her system prompt
- Same misclassification doesn't recur in subsequent runs (verifiable in Langfuse trace comparison)

---

### CP-36 — Live workforce view (~2 days)

#### Step 1: Trigger.dev realtime SDK wiring (4 hours)

```bash
npm install @trigger.dev/react-hooks
```

In task definitions, set `realtime: true`:

```ts
export const runCustomEmployee = task({
  id: "run-custom-employee",
  realtime: true,
  run: async ({ employeeId, userId }, { ctx }) => {
    await ctx.metadata.set({ employee_slug: slug, user_id: userId })
    // Each step.run is observable in real-time on the client
  },
})
```

#### Step 2: Team Live widget on `/dashboard` (1 day)

```tsx
// src/app/dashboard/_components/team-live-widget.tsx
'use client'
import { useRealtimeRunsWithStreams } from "@trigger.dev/react-hooks"

export function TeamLiveWidget({ userId }: { userId: string }) {
  const { runs } = useRealtimeRunsWithStreams({
    tag: `user:${userId}`,
    onlyActive: true,
  })

  return (
    <div>
      <h2>Team Live</h2>
      {runs.map(r => (
        <div key={r.id}>
          {r.metadata.employee_slug} · {r.status} · step {r.currentStep}
        </div>
      ))}
    </div>
  )
}
```

#### Step 3: Filter access by user (2 hours)

Each Trigger.dev run is tagged with `user:${userId}` so the realtime SDK can filter to only that customer's workforce.

**Acceptance:**
- Customer opens `/dashboard` at 8am while Sarah is running
- Team Live widget shows: "💰 Sarah · running · step 3 of 5 · 12s elapsed"
- When Sarah finishes, widget updates: "💰 Sarah · success · 1 action queued"
- Other customers' Sarah runs are NOT visible (per-user isolation via tag filter)

---

### CP-37 — Org chart + delegation (~3 days)

#### Step 1: Org-chart graph queries (4 hours)

`parent_employee_id` column already exists from CP-34a migration. Add resolution helpers:

```ts
// src/lib/employees/hierarchy.ts
export async function loadEmployeeWithReports(userId: string, slug: string): Promise<{ employee: Employee; reports: Employee[] }> {
  const employee = await resolveEmployee(userId, slug)
  if (!employee?.customEmployeeId) return { employee, reports: [] }
  const reports = await supabase.from('custom_employees')
    .select('*')
    .eq('user_id', userId)
    .eq('parent_employee_id', employee.customEmployeeId)
  return { employee, reports: reports.data.map(customRowToEmployee) }
}
```

#### Step 2: `delegate_to_employee` tool in loop (4 hours)

Add to `src/lib/agents/loop.ts`:

```ts
delegate_to_employee: aiTool({
  description: "Delegate a discrete task to one of your reports. Returns when the report finishes (or 1h timeout).",
  inputSchema: z.object({
    report_slug: z.string(),
    task_description: z.string(),
    task_payload: z.record(z.unknown()).optional(),
  }),
  execute: async (args) => {
    // Only employees with reports can delegate
    const { reports } = await loadEmployeeWithReports(userId, spec.slug)
    const report = reports.find(r => r.slug === args.report_slug)
    if (!report) return { success: false, error: 'not a direct report' }

    // Fire a Trigger.dev task for the report, wait for completion event
    const handle = await tasks.trigger("run-custom-employee", {
      employeeId: report.customEmployeeId,
      userId,
      delegatedFrom: spec.slug,
      taskDescription: args.task_description,
      taskPayload: args.task_payload,
    })

    // Use Trigger.dev's runs API to wait — see https://trigger.dev/docs/wait
    const completed = await runs.waitForRun(handle.id, { timeout: 3600 })
    return { success: true, report_summary: completed.output?.summary }
  },
}),
```

#### Step 3: Hierarchy visualization on `/dashboard/employees` (1 day)

Render a tree view showing manager → reports relationships. Use simple HTML/CSS (no graph lib needed for v1).

#### Step 4: COO chat tool: `set_employee_manager` (4 hours)

```ts
set_employee_manager: aiTool({
  description: "Set a manager for one of your AI employees (only custom employees can have managers in v1).",
  inputSchema: z.object({
    employee_slug: z.string(),
    manager_slug: z.string().nullable(),
  }),
  execute: async (args) => {
    // Update parent_employee_id; reject cycles
    // ...
  },
}),
```

**Acceptance:**
- Customer creates Marcus (PM Coordinator) and Alice (PM Junior)
- Customer says in COO chat: "make Marcus the manager of Alice"
- `parent_employee_id` updated
- Marcus's next run calls `delegate_to_employee('alice', 'research client X')` → Alice runs in parallel → Marcus pauses → Alice finishes → Marcus resumes with Alice's output → Marcus synthesizes and posts to Slack
- `/dashboard/employees` shows Marcus with Alice indented underneath

---

## 5. Database migrations summary

| Migration | When | What |
|---|---|---|
| `20260525_custom_employees.sql` | CP-34a (✅ applied) | 3 tables (custom_employees + threads + messages) |
| `20260526_brain_embeddings.sql` | CP-35 | pgvector on selected brain_documents paths |

---

## 6. Environment variables needed

To add to `.env.local` + Vercel project:

```
# Sentry (CP-PROD-SAFETY step 1)
SENTRY_DSN=https://...
SENTRY_AUTH_TOKEN=...
SENTRY_ORG=opsradar
SENTRY_PROJECT=opsradar-app

# Statsig (CP-PROD-SAFETY step 2)
STATSIG_SERVER_SECRET=secret-...

# Langfuse (CP-PROD-SAFETY step 3)
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com

# Trigger.dev (CP-TRIGGER-DEV step 1)
TRIGGER_PROJECT_ID=proj_...
TRIGGER_SECRET_KEY=tr_prod_...
```

---

## 7. New dependencies

```bash
npm install @sentry/nextjs
npm install @vercel/flags @statsig/feature-flags
npm install langfuse @langfuse/vercel-ai-sdk
npm install @trigger.dev/sdk @trigger.dev/react-hooks
```

Already installed: `@composio/core`, `@composio/vercel`, `ai`, `@ai-sdk/openai`, `@supabase/ssr`, all UI deps.

---

## 8. Build verification gates

Before merging each CP, all of these must pass:

| Gate | Command | Required |
|---|---|---|
| TypeScript compile clean | `npx tsc --noEmit` | ✅ |
| Next.js build clean | `npm run build` | ✅ |
| ESLint clean | `npm run lint` | ✅ |
| Manual smoke test | Hit the relevant route in `localhost:3000` | ✅ |
| Trigger.dev tasks deploy | `npx trigger.dev@latest deploy` | ✅ (post-CP-TRIGGER-DEV) |

---

## 9. Pricing — what this all costs at three growth stages

| Stage | Trigger.dev | Sentry | Langfuse | Statsig | Composio | OpenAI | TOTAL |
|---|---|---|---|---|---|---|---|
| Beta (10 customers) | $0 | $0 | $0 | $0 | $0 | ~$50/mo | **~$50/mo** |
| Growth (50 customers) | $10/mo | $0 | $0 | $0 | $0 | ~$250/mo | **~$260/mo** |
| Post-PMF (200 customers) | $50/mo | $26/mo | $59/mo | $0 | $99/mo | ~$1K/mo | **~$1.2K/mo** |
| Scale (1000 customers) | self-host ~$40/mo | $52/mo | self-host ~$40/mo | $150/mo | $499/mo | ~$5K/mo | **~$5.8K/mo** |

OpenAI is the only line item that scales with revenue. Everything else stays near-flat. **Margins compound massively past PMF.**

---

## 10. Timeline (3-4 weeks of focused work)

| Week | Days | Scope |
|---|---|---|
| **Week 1** | Mon–Tue | CP-34a wrap-up (build verify + commit), CP-PROD-SAFETY (Sentry + Statsig + Langfuse) |
| Week 1 | Wed–Fri | CP-TRIGGER-DEV (install + migrate dispatcher + webhook handler) |
| **Week 2** | Mon–Wed | CP-34b (compiler + 6 chat tools + draft card component) |
| Week 2 | Thu–Fri | CP-34c day 1-2 (employees grid + detail page scaffolding) |
| **Week 3** | Mon–Tue | CP-34c day 3 (per-employee chat backend + sidebar update + sidebar) |
| Week 3 | Wed–Fri | CP-35 (pgvector + apprentice mode handler + event wiring) |
| **Week 4** | Mon–Tue | CP-36 (live workforce widget + realtime SDK) |
| Week 4 | Wed–Fri | CP-37 (delegation + org chart + manager-setter tool) |

**Buffer days:** 2–3 days end of Week 4 for end-to-end testing + bug fixes + docs polish.

---

## 11. Risk register

| Risk | Mitigation |
|---|---|
| Vercel function 300s timeout hit during long employee runs | Trigger.dev step.run with own timeout; long runs already moved out of Vercel Functions |
| OpenAI rate limits at scale | Vercel AI Gateway is already in place; routes via gateway with retry |
| Composio outages (we saw one in May 2026) | Already handled by approval-gate degraded-mode UI (CP-23) |
| pgvector index build slow on first deploy | HNSW index builds incrementally; OK for our row count (< 100K) |
| Trigger.dev outage | Built-in 28 agents stay on Vercel Cron — partial degraded mode |
| Customer's employee misbehaves and emails their client by mistake | (a) Approval gate per-tool default Ask. (b) Statsig kill switch per-customer. (c) Sentry alert. (d) Langfuse trace for forensics. |
| Customer thinks 28 built-in agents cost extra | Sidebar visually separates "Pre-hired" (free with tier) vs "Your hires" (extra slots) — clear visual + label |
| Build crosses 1-day boundary | Document checkpoint state in this spec; the next session can pick up at the last checked-off acceptance gate |

---

## 12. What "done" looks like

When all of CP-34→37 ships, a typical first-time customer journey is:

1. Customer signs up Monday morning
2. By Monday 10am, 28 pre-hired employees have run their first cron passes — brain has ~30 commits, dashboard shows "47 runs today · 0 failures"
3. Monday afternoon, customer opens Ask COO and says *"I want a Bookkeeper named Sarah"* — Sarah appears in YOUR TEAM sidebar within 30 seconds
4. Tuesday morning at 8am, Sarah runs her first task — categorizes 23 Stripe charges, flags 1 for approval
5. Customer rejects the flag with feedback "this is a software expense not office"
6. By Tuesday lunchtime, Sarah's `learned-rules` brain has the new rule
7. Wednesday morning, Sarah classifies a similar charge correctly without flagging
8. Two weeks in, customer has 3 custom employees + 28 built-in, brain has 150+ commits, dashboard shows live activity, Marcus (PM head) is delegating research tasks to Alice (PM junior) automatically.

**That's the YC-grade story.** Per-employee identity + scoped tools + persistent learning + hierarchical delegation + observability — all running on Vercel + Composio + Trigger.dev + Postgres-brain.

---

## 13. Open questions (decisions deferred to discussion)

| # | Question | Tentative answer |
|---|---|---|
| 1 | Show 28 built-in employees AS-IS, or hide some by default? | Show all 28. Customers can pause unwanted ones. Discovery > clutter avoidance. |
| 2 | Allow custom employees to manage built-in ones (parent_id) v1? | No. Built-in employees are top-level only in v1. Custom-to-custom hierarchy only. |
| 3 | Per-employee chat: archive old threads or keep forever? | Keep forever. Soft cap at 100 threads per employee with auto-archive of oldest after that. |
| 4 | Trigger.dev: cloud or self-host from day 1? | Cloud (free tier covers us through beta). Self-host as escape valve documented but not built. |
| 5 | If customer creates Sarah and same week the customer also installs Composio's Stripe trigger that fires `STRIPE_CHARGE_FAILED`, who runs first — Sarah on cron 8am OR an automation Cole responds to the event? | Both. They write to different brain prefixes (`employees/sarah/` vs `pattern-cards/`) so no conflict. The COO synthesizes both perspectives on the next briefing. |

---

## 14. Sources

All architecture decisions in this spec are backed by:

- [`docs/specs/ai-employees.md`](../../strategy/ai-employees-architecture-2026.md)
- [`docs/specs/architecture-audit.md`](../../strategy/architecture-audit-2026.md)
- [`docs/adr/0002-scheduler-trigger-dev.md`](../../strategy/scheduler-decision-2026.md)
- [`docs/specs/trigger-composio-integration.md`](../../strategy/trigger-composio-integration-2026.md)
- [`docs/adr/0008-observability-sentry-statsig-langfuse.md`](../../strategy/observability-stack-2026.md)
- [`docs/adr/0004-three-tier-memory.md`](../../strategy/three-tier-memory-architecture-2026.md)
- [`docs/adr/0005-control-first-approval-gate.md`](../../strategy/control-surface-research-2026.md)
- [`docs/specs/automations.md`](../../strategy/automations-architecture-2026.md)
- [`docs/adr/0007-senior-coo-playbook.md`](../../strategy/senior-coo-playbook-2026.md)
- [`docs/positioning/moats.md`](../../strategy/moats-and-friction-2026.md)
- [`docs/positioning/path-a-strategy.md`](../../strategy/path-a-strategy-2026.md)
