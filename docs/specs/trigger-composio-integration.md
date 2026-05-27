# Trigger.dev + Composio integration patterns (May 2026)

> **⚠️ SUPERSEDED for the broker half by [`./nango-broker.md`](./nango-broker.md) (2026-05-27).** Composio was removed after the 2026-05-21 breach; the SaaS broker is now **Nango**. The **Trigger.dev** half of this doc (durable scheduling, webhook handling, the durable-execution patterns) is still accurate — only swap "Composio broker call" for `nangoProxy()` from `src/lib/nango.ts`. Read this for the Trigger.dev patterns; read `nango-broker.md` for the current broker.

> Compiled: 2026-05-25 · Purpose: capture the verified integration patterns between Trigger.dev (our scheduler — see [`../adr/0002-scheduler-trigger-dev.md`](../adr/0002-scheduler-trigger-dev.md)) and Composio (our SaaS API broker). They are complementary, not competing. This doc shows the exact code patterns OpsRadar uses to combine them in CP-34+ (AI Employees).

---

## The core insight

**Composio and Trigger.dev solve completely different problems.**

| Concern | Solved by |
|---|---|
| OAuth flows for 500+ SaaS apps (Stripe, Gmail, Notion, HubSpot, etc.) | **Composio** |
| Inbound webhooks from SaaS events (`STRIPE_CHARGE_FAILED`, etc.) | **Composio** (delivery), **Trigger.dev** (durable handling) |
| Sending API calls TO SaaS apps (`GMAIL_SEND_EMAIL`, etc.) | **Composio** |
| Cron scheduling ("run Sarah at 8am") | **Trigger.dev** |
| Retries with backoff on failure | **Trigger.dev** |
| Wait-for-event between agent steps | **Trigger.dev** |
| Long-running tasks (> 5 min) | **Trigger.dev** |
| Per-run observability dashboard for your code | **Trigger.dev** |

**Composio's own published cookbook confirms this** ([Background Agent cookbook](https://docs.composio.dev/cookbooks/background-agent)):

> *"The agent runs once and exits, which makes it perfect for cron jobs."*

Their example uses crontab as the scheduler. We use Trigger.dev as a more capable replacement for crontab.

---

## The two-layer mental model

```
                  ┌──────────────────────────────────┐
                  │  External SaaS (Stripe, Gmail…)  │
                  └────┬───────────────────────▲─────┘
                       │                       │
            (1) event fires                    │ (4) API call made
                       │                       │
                       ▼                       │
       ┌──────────────────────┐                │
       │  COMPOSIO Triggers   │                │
       │  (Composio LISTENS)  │                │
       └────┬─────────────────┘                │
            │                                  │
   (2) webhook POST                            │
   to our /api/automations/webhook            │
            │                                  │
            ▼                                  │
   ┌──────────────────────────────────────────┴──┐
   │  OPSRADAR                                    │
   │                                              │
   │  ┌─────────────────────────────────────┐     │
   │  │ Trigger.dev (the SCHEDULER)         │     │
   │  │                                     │     │
   │  │ • cron triggers                      │     │
   │  │ • event triggers                     │     │
   │  │ • step.waitForEvent (delegation)     │     │
   │  │ • retries + observability            │     │
   │  └────────────────┬────────────────────┘     │
   │                   │                          │
   │                   │ (3) calls                │
   │                   ▼                          │
   │  ┌─────────────────────────────────────┐     │
   │  │ runAgent loop (our code)            │     │
   │  │                                     │     │
   │  │ Inside the task body:               │     │
   │  │   const composio = new Composio()   │     │
   │  │   const tools = await session...    │     │
   │  │   await generateText({ tools, … })  │ ────┘
   │  │   ↑ Composio handles SaaS API calls │
   │  └─────────────────────────────────────┘     │
   └─────────────────────────────────────────────┘
```

**Reading this diagram:**

1. SaaS event fires (e.g. customer's Stripe charge fails) → Composio's listener catches it
2. Composio POSTs the event to our `/api/automations/webhook/composio` ingress
3. We verify signature + hand the event to Trigger.dev for durable handling
4. Trigger.dev runs the handler task; inside the task, our code uses Composio to call SaaS APIs back

---

## Three integration patterns (verified code)

### Pattern 1 — Scheduled task: Trigger.dev cron + Composio tools inside

This is the canonical "AI employee runs daily" pattern. Used by CP-34 for both built-in agents and custom employees.

```typescript
// trigger/employees/employee-daily-run.ts
import { schedules } from "@trigger.dev/sdk"
import { Composio } from "@composio/core"
import { VercelProvider } from "@composio/vercel"
import { generateText, stepCountIs } from "ai"
import { openai } from "@ai-sdk/openai"

export const employeeDailyRun = schedules.task({
  id: "employee-daily-run",
  maxDuration: 600,                     // 10 min — Trigger.dev supports up to 2 hours
  retry: { maxAttempts: 3, factor: 2 }, // automatic retry with backoff

  run: async (payload, { ctx }) => {
    const { userId, employeeSlug } = JSON.parse(payload.externalId ?? "{}")

    // (1) Composio session — one per task invocation, stateless
    const composio = new Composio({ provider: new VercelProvider() })
    const session = await composio.create(userId)

    // (2) Load tools scoped to what this employee can touch
    const employee = await loadEmployee(userId, employeeSlug)
    const tools = await session.tools.get({
      apps: employee.scoped_toolkits as ToolkitSlug[],
    })

    // (3) Run the agent loop — Composio executes every tool call internally
    const { text } = await generateText({
      model: openai(employee.model_slug),
      system: employee.system_prompt,
      tools,
      stopWhen: stepCountIs(employee.max_steps),
      prompt: payload.timestamp.toISOString(),  // or a richer brief
    })

    // (4) Persist results (brain commit, agent_runs row, etc.)
    await commitBrainChanges({ /* ... */ })

    return { summary: text }
  },
})
```

**Why this works:**
- Composio session is created fresh inside `run()` — stateless, perfect for serverless
- Trigger.dev provides cron scheduling that Vercel Hobby can't (per-second, not daily-only)
- Trigger.dev's retry handles transient SaaS API failures (Composio rate limits, Stripe 503s, etc.)
- `stepCountIs(15)` lets the LLM chain multiple Composio tool calls inside one task

**Source:** [Composio Background Agent cookbook](https://docs.composio.dev/cookbooks/background-agent) — *"generateText with stopWhen: stepCountIs(15) lets the model call as many tools as it needs"*

---

### Pattern 2 — Event-driven: Composio webhook → Trigger.dev event handler

Used by CP-20 automations and CP-35 Apprentice Mode. Composio listens for SaaS events; Trigger.dev runs the durable handler.

```typescript
// /api/automations/webhook/composio/route.ts (we already have this)
import { tasks } from "@trigger.dev/sdk"
import type { handleComposioEvent } from "@/trigger/automations/handle-composio-event"

export async function POST(req: NextRequest) {
  // (1) Composio sends HMAC-SHA256 signed payload — verify before acting
  if (!verifyComposioSignature(req)) {
    return Response.json({ error: "invalid_signature" }, { status: 401 })
  }

  const event = await req.json() as ComposioWebhookEvent
  // event.metadata.trigger_slug → 'STRIPE_CHARGE_FAILED' etc.
  // event.user_id → customer in our system
  // event.payload → the SaaS event payload (charge object, deal object, etc.)

  // (2) Hand off to Trigger.dev — ack immediately, work happens in background
  await tasks.trigger<typeof handleComposioEvent>(
    "handle-composio-event",
    {
      userId: event.user_id,
      toolkit: event.toolkit_slug,
      triggerSlug: event.metadata.trigger_slug,
      payload: event.payload,
    }
  )

  // (3) Ack so Composio doesn't retry on its end (we own retry inside Trigger.dev)
  return Response.json({ ok: true })
}
```

```typescript
// trigger/automations/handle-composio-event.ts
import { task } from "@trigger.dev/sdk"

export const handleComposioEvent = task({
  id: "handle-composio-event",
  retry: { maxAttempts: 5, factor: 2 },   // exponential backoff on failure
  maxDuration: 600,

  run: async (input: HandleEventInput, { step }) => {
    // Find which automations or employees should react
    const matches = await step.run("find-matches", async () => {
      return await findAutomationsForEvent(input.userId, input.toolkit, input.triggerSlug)
    })

    // For each match, run a durable subtask
    for (const auto of matches) {
      await step.run(`fire-automation-${auto.id}`, async () => {
        // This is where the agent runs the automation spec, which inside
        // calls composio.tools.execute('GMAIL_SEND_EMAIL', ...) etc.
        await executeAutomation(auto, input.payload, input.userId)
      })
    }
  },
})
```

**Why this two-step is better than handling inline:**
- Composio's webhook ack must return in < 5s; durable work can take minutes
- If our handler crashes, Trigger.dev retries; Composio doesn't have to re-deliver
- Each downstream automation gets its own step.run() — individually retryable

**Source:** [Composio docs on triggers](https://docs.composio.dev/docs/using-triggers) — *"Events are delivered as structured payloads to your webhook endpoint"*

---

### Pattern 3 — Delegation: `step.waitForEvent` (CP-37 org chart)

This is what Vercel Cron literally cannot do. Used by CP-37 for one employee to delegate work to another and wait for the result.

```typescript
// trigger/employees/marcus-pm-daily.ts
import { schedules, task } from "@trigger.dev/sdk"

export const marcusDailyRun = schedules.task({
  id: "employee-marcus-pm-daily",
  cron: "0 9 * * *",
  maxDuration: 3600, // 1 hour — accommodates waiting for Alice

  run: async (payload, { step, ctx }) => {
    const userId = payload.externalId!

    // Step 1: Marcus loads his context
    const clients = await step.run("load-clients", async () => {
      const composio = new Composio({ provider: new VercelProvider() })
      const session = await composio.create(userId)
      return await session.tools.execute('CLICKUP_LIST_TASKS', { /* ... */ })
    })

    // Step 2: Marcus delegates to Alice (a different employee)
    await step.run("delegate-to-alice", async () => {
      await tasks.trigger("employee-alice-research", {
        userId,
        clients,
        parentRunId: ctx.run.id,    // so Alice can fire the right event back
      })
    })

    // Step 3: Marcus pauses until Alice finishes — Trigger.dev primitive
    const aliceResult = await step.waitForEvent({
      id: "wait-alice",
      name: `alice.complete.${ctx.run.id}`,
      timeout: "1h",
    })

    // Step 4: Marcus synthesizes Alice's output + posts to Slack
    await step.run("synthesize-and-post", async () => {
      const composio = new Composio({ provider: new VercelProvider() })
      const session = await composio.create(userId)
      // Use Alice's result + Composio to talk to Slack
      await session.tools.execute('SLACK_POST_MESSAGE', {
        text: synthesize(aliceResult),
      })
    })
  },
})
```

```typescript
// trigger/employees/alice-research.ts
export const aliceResearch = task({
  id: "employee-alice-research",
  run: async (input, { ctx }) => {
    // Alice does her work using Composio tools
    const composio = new Composio({ provider: new VercelProvider() })
    const session = await composio.create(input.userId)
    const result = await runAliceLoop(session, input.clients)

    // Fire the event Marcus is waiting for
    await events.send({
      name: `alice.complete.${input.parentRunId}`,
      payload: result,
    })
  },
})
```

**Why this matters for OpsRadar specifically:**
- A 10-person agency thinks in org charts. Marcus the PM head manages Alice + Beth juniors.
- CP-37 makes that hierarchy real in our system.
- Trigger.dev's `step.waitForEvent` is the only thing that makes this NOT-fragile (vs polling).

**Source:** [Trigger.dev scheduled tasks docs](https://trigger.dev/docs/tasks/scheduled) + [Trigger.dev waitForEvent docs](https://trigger.dev/docs/wait)

---

## Composio session lifecycle inside Trigger.dev

**Rule:** create one Composio session per Trigger.dev task invocation. Don't share sessions across tasks; don't keep them in module scope.

```typescript
// ✅ Correct
export const goodTask = task({
  id: "good-task",
  run: async (input) => {
    const composio = new Composio({ provider: new VercelProvider() })
    const session = await composio.create(input.userId)
    // use session here
  },
})

// ❌ Wrong — module-scoped session leaks state across invocations
const sharedComposio = new Composio({ /* ... */ })
export const badTask = task({
  id: "bad-task",
  run: async (input) => {
    const session = await sharedComposio.create(input.userId)
    // shared composio instance can pick up stale config between cold starts
  },
})
```

Composio sessions are **lightweight and stateless** — creating a fresh one is the right pattern (this is how their own cookbook does it).

---

## Webhook signature verification: keep doing it

Composio webhooks (Pattern 2) come with HMAC-SHA256 / Ed25519 signatures + replay protection. **We already verify in `/api/automations/webhook/composio/route.ts` (CP-20).** Don't skip this when adding Trigger.dev — the trigger step happens AFTER signature verification:

```typescript
// Order matters:
const ok = await verifySignature(...)  // (1) verify
if (!ok) return 401                    // (2) reject bad signatures
await tasks.trigger(...)               // (3) only then hand off to Trigger.dev
```

**Don't reverse this order.** Verifying signature inside the Trigger.dev task means a forged webhook still incurs a Trigger.dev run (cost + observability noise + retry storms).

---

## Multi-tenant patterns

Every Trigger.dev task in our codebase should be invoked **per-customer** (userId in the payload), not bulk-scanned. This matches our existing CP-14 architecture where every agent run is scoped per user.

**For "all customers" tasks** (like the master cron that fans out to all 28 agents × all customers), use one of:

```typescript
// Option A — Fan-out from a master task
export const dailyFanOut = schedules.task({
  id: "daily-fan-out",
  cron: "0 7 * * *",
  run: async () => {
    const userIds = await getActiveUserIds()
    await tasks.batchTrigger("revenue-agent-run",
      userIds.map(u => ({ payload: { userId: u } }))
    )
  },
})

// Option B — One Trigger.dev schedule per (user, agent)
// Created via SDK when a customer onboards:
await schedules.create({
  task: "revenue-agent-run",
  cron: "0 7 * * *",
  externalId: userId,           // so Trigger.dev knows which customer this is for
})
```

Option B has better observability (per-customer dashboard) but requires schedule lifecycle management (create on signup, delete on churn). Option A is simpler for v1.

---

## Pricing impact: Composio + Trigger.dev together

Verified pricing as of 2026-05-25:

| Service | Free tier | First paid | At 50 customers |
|---|---|---|---|
| **Composio** | 500K API calls/mo (covers us through 500+ customers) | $99/mo Growth tier | ~$0/mo (free tier holds) |
| **Trigger.dev** | $5 monthly usage included, unlimited tasks | $10/mo Hobby | $10–20/mo |
| **Total** | $0 | $99 once Composio kicks in | ~$10/mo |

Both stay cheap at our scale. Composio's free tier is the more generous of the two; Trigger.dev's paid tier comes earlier but at a much lower price point. The combination beats running our own infra by a wide margin.

---

## Migration plan for OpsRadar

| Phase | Today | After |
|---|---|---|
| Built-in 28 agents | Vercel Cron via `vercel.json` | KEEP on Vercel Cron — works today, no reason to touch |
| Custom AI Employees (CP-34) | `/api/cron/custom-employees` route on Vercel Cron Hobby (daily cap) | Migrate to Trigger.dev `schedules.task()` for per-customer cron |
| CP-20 automations | Composio webhook → inline handler in `/api/automations/webhook/composio` | Trigger.dev event handler via `tasks.trigger(...)` for durability |
| CP-35 Apprentice Mode | Not built yet | Trigger.dev event-triggered task (rejection → learn-rule extraction) |
| CP-37 Org chart delegation | Not built yet | Trigger.dev `step.waitForEvent` between employees |

**Build order:** add Trigger.dev SDK, migrate custom-employees dispatcher first (smallest, validates the pattern), then move CP-20 webhook handler, then build CP-35 + CP-37 on top.

---

## Sources

### Primary product docs
- [Composio Background Agent cookbook](https://docs.composio.dev/cookbooks/background-agent) — the canonical "Composio in a cron job" pattern
- [Composio Triggers — Using Triggers](https://docs.composio.dev/docs/using-triggers)
- [Composio Triggers — overview](https://docs.composio.dev/docs/triggers)
- [Trigger.dev Scheduled Tasks](https://trigger.dev/docs/tasks/scheduled)
- [Trigger.dev SDK reference](https://trigger.dev/docs/sdk-reference)
- [Composio MCP / quickstart](https://docs.composio.dev/introduction/intro/quickstart-triggers)

### Architectural references
- [Composio: From Auth to Action — Complete Guide to Secure AI Agent Infrastructure 2026](https://composio.dev/blog/secure-ai-agent-infrastructure-guide)
- [Composio: APIs for AI Agents — 5 Integration Patterns 2026](https://composio.dev/content/apis-ai-agents-integration-patterns)
- [Trigger.dev as the n8n replacement for code-first teams](https://www.mindstudio.ai/blog/what-is-trigger-dev-agentic-workflow-platform)

### Internal cross-references
- [`../adr/0002-scheduler-trigger-dev.md`](../adr/0002-scheduler-trigger-dev.md) — why we picked Trigger.dev over Inngest
- [`../adr/0010-nango-broker.md`](../adr/0010-nango-broker.md) — the broker (Nango replaced Composio, which replaced n8n)
- [`./automations.md`](./automations.md) — CP-20 webhook handler that becomes a Trigger.dev task
- [`./ai-employees.md`](./ai-employees.md) — CP-34 employees that use the patterns above
