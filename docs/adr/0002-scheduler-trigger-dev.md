# Scheduler & background-job platform decision — Trigger.dev (May 2026)

> Compiled: 2026-05-25 · Purpose: capture the research that picked the durable-workflow platform for CP-34+ (AI Employees). Updates the prior guidance in [`composio-vs-n8n-decision-2026.md`](./0001-composio-broker.md) and [`automations-architecture-2026.md`](../specs/automations.md) which listed *"Inngest or Trigger.dev"* as both viable. The May 2026 verified data picks Trigger.dev.

---

## The decision

**Trigger.dev** is the scheduler + durable-workflow platform for OpsRadar.

Not Vercel Cron (capability ceiling), not Inngest (7.5× more expensive at first paid tier), not n8n (severed in CP-15 per `composio-vs-n8n-decision-2026.md`).

**Composio is unchanged.** It is the SaaS API broker (OAuth + tool catalog for 500+ integrations). Trigger.dev is the scheduler. They solve different problems and both stay.

---

## The architecture

```
┌─────────────────────────────────────────┐
│ Customer browser → /dashboard           │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ Vercel Functions (Next.js API routes)    │   short-lived HTTP work
│ - /api/dashboard/coo, /actions, etc.    │   (< 5 min, request/response)
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ Trigger.dev (managed workers)            │   scheduling + durability:
│ - cron triggers (every minute capable)   │   - per-employee schedules
│ - event triggers (Composio webhooks)     │   - retries on failure
│ - wait-for-event primitives              │   - 2-hour task budget
│ - step.run() checkpoints                 │   - learn-from-rejection events
│ - human-in-loop approval gates           │   - delegation wait-for-event
└────────────┬────────────────────────────┘
             │
             ▼ uses
┌─────────────────────────────────────────┐
│ Composio (OAuth + SaaS API broker)       │   actual SaaS calls:
│ tools.execute('STRIPE_LIST_CHARGES')    │   - Stripe, HubSpot, Harvest,
│ tools.execute('GMAIL_SEND_EMAIL')       │     ClickUp, Gmail, Notion, …
│ → 500+ integrations, OAuth handled       │   - tokens, rate limits managed
└─────────────────────────────────────────┘
```

**Two distinct layers. Neither replaces the other.**

---

## Why Trigger.dev wins (May 2026 verified data)

### 1. Pricing — 7.5× cheaper at first paid tier

Verified directly from each vendor's pricing page on 2026-05-25:

| Tier | Trigger.dev | Inngest |
|---|---|---|
| Free | $5 monthly usage included, unlimited tasks, 20 concurrent runs | 50K executions/mo, 100K events/mo |
| First paid | **Hobby — $10/mo** (50 concurrent, $10 usage included) | **Pro — $75/mo** (1M executions, 5M events) |
| Self-host | ✅ Free, unlimited, Apache 2.0 | ❌ Not available — proprietary cloud only |

For our beta projection (~12,400 events/month for 10 paying customers):
- **Trigger.dev**: free tier covers us comfortably; Hobby $10/mo if we want headroom
- **Inngest**: free tier covers us, but first paid tier is **$75/mo** — 7.5× more expensive

### 2. AI-agent ergonomics — "explicit AI-task helpers slightly more polished"

Three independent 2026 comparisons converged:

> *"Both host AI background work well, with Trigger.dev's explicit AI-task helpers slightly more polished as of mid-2026."* — [PromptsToProduct, May 2026](https://www.promptstoproduct.com/inngest-vs-trigger-dev)

> *"For a typical solo SaaS in 2026, Trigger.dev is the lower-risk default."* — [PkgPulse 2026 comparison](https://www.pkgpulse.com/blog/hatchet-vs-trigger-dev-v3-vs-inngest-durable-workflows-2026)

> *"Trigger.dev — the agentic workflow platform that replaces n8n for code-first teams."* — [MindStudio, 2026](https://www.mindstudio.ai/blog/what-is-trigger-dev-agentic-workflow-platform)

Trigger.dev's own [product page](https://trigger.dev/) leads with: *"Build and deploy fully-managed AI agents and workflows."* They pivoted hard to AI-first positioning in 2026 (Inngest is more general "any background job").

### 3. Long-running tasks — 2 hours native

Trigger.dev tasks run up to **2 hours** natively. Inngest's model requires chaining steps to extend past their per-step limit. For OpsRadar's backfill orchestrator (`backfillHistory()`, CP-31) and large-customer agent runs, the 2-hour budget is the right shape.

### 4. Self-host escape valve — Apache 2.0

Trigger.dev is **open-source under Apache 2.0**. We can self-host on AWS / Hetzner / Fly.io for $0 if:
- A YC partner asks *"what if Trigger.dev 10× the price?"* (answer: we self-host, $0/mo)
- A customer demands EU data residency
- Pricing ever bites at scale

Inngest is proprietary cloud-only. No escape valve.

### 5. Code-first SDK, TypeScript-native

Both have good TypeScript SDKs. Trigger.dev's `task()` abstraction reads more cleanly for the "named long-running work" pattern that AI employees fit:

```ts
export const sarahDailyRun = task({
  id: 'employee-sarah-daily',
  maxDuration: 600,
  retry: { maxAttempts: 3 },
  run: async (payload: { userId: string }) => {
    await step.run('load-employee-spec', async () => { … })
    await step.run('execute-run-loop', async () => { … })
    await step.run('persist-results', async () => { … })
  },
})
```

This is **direct invocation** semantics — closer to a remote function call. Inngest's event-pub-sub model is fine for fan-out but feels indirect for "Sarah runs at 8am" use cases.

---

## Why we DIDN'T pick Inngest

Inngest is a fine product. Specifically where Inngest wins:

| Inngest is better when… | Applies to OpsRadar? |
|---|---|
| Pure event-driven fan-out (one event → many handlers) | ❌ Most of our work is scheduled + chat-triggered |
| Already using Inngest in another product | ❌ Greenfield |
| You stay forever in the free tier | ❌ Free tier cliff at 50K (one viral customer hits this in a week) |
| Free tier of 100K events vs Trigger's $5 usage | ❌ Cliff drop matters more than ceiling height |

Final blocker: **Inngest's $75/mo first paid tier is just too steep for a multi-tenant SaaS launching with 10 beta customers.** $10/mo Trigger.dev is barely above noise.

---

## Why we DIDN'T pick Vercel Cron

We've been using Vercel Cron for all 45 cron rows today (28 agents + 7 system jobs + custom-employees dispatcher). It still works for the existing 28 built-in agents. But it cannot do what CP-34+ needs:

| Need | Vercel Cron | Trigger.dev |
|---|---|---|
| Hobby plan cron frequency | **Daily cap** | Per-second |
| Function timeout | **300s hard** | 2 hours native |
| Event triggers (Composio webhook → run agent) | ❌ | ✅ |
| Wait-for-event ("wait 7 days, then check") | ❌ | ✅ |
| Automatic retries on failure | ❌ Manual | ✅ Built-in |
| Per-step observability | Basic logs | Full UI + traces |
| Step checkpointing past 300s timeout | ❌ | ✅ `step.run()` |

**Plan**: keep the 28 built-in agents on Vercel Cron (already works, no reason to touch). Move CP-34 custom-employees + CP-35 Apprentice events + CP-37 delegation to Trigger.dev.

---

## Why we DIDN'T pick n8n / Make / Zapier / Temporal

- **n8n** — severed in CP-15, see [`composio-vs-n8n-decision-2026.md`](./0001-composio-broker.md). Self-hosted JavaScript runtime fork, brittle at scale.
- **Make / Zapier** — visual workflow builders aimed at end-users, not the substrate for a multi-tenant SaaS backend.
- **Temporal** — enterprise-grade but heavyweight. Requires running Temporal Server. Overkill for our scale. (Could become relevant if we reach 1000+ customers.)
- **Hatchet** — fine-grained parallelism for high-concurrency AI workloads. We're not concurrency-bound; the Trigger.dev pricing wins matters more.

---

## Composio is NOT replaced — common confusion

**Trigger.dev does not replace Composio.** They solve completely different problems:

| Problem | Solution |
|---|---|
| "I need to call Stripe's API, but writing OAuth + token refresh + rate limits + 500 API wrappers is painful" | **Composio** — the SaaS API broker |
| "I need to run a function on a cron, retry on failure, wait 7 days, then fire another step" | **Trigger.dev** — the scheduler + durable runner |

When Sarah-the-Bookkeeper runs at 8am, she uses BOTH:

| Step | Who does it |
|---|---|
| Cron fires at 8am | **Trigger.dev** |
| Sarah's run loop loads her spec from Supabase | OpsRadar code |
| Sarah calls `tools.execute('STRIPE_LIST_BALANCE_TRANSACTIONS')` | **Composio** (talks to Stripe) |
| Sarah loops through, categorizes via LLM | OpsRadar code |
| Sarah calls `tools.execute('NOTION_CREATE_PAGE')` for summary | **Composio** (talks to Notion) |
| Sarah needs the COO's advice — `consult_coo()` call takes 30s | OpsRadar code, runs in Trigger.dev's step.run() |
| If run hits 5min, Trigger.dev checkpoints → resumes from same step | **Trigger.dev** |

Both stay. They are orthogonal.

---

## Where Trigger.dev gets used in the CP-34→37 roadmap

| CP | Trigger.dev usage |
|---|---|
| CP-34 — AI Employees | Custom-employee cron dispatcher → `task({ cron: row.schedule_cron })` per customer-defined schedule. Per-second granularity unlocks "every 4 hours" employees Vercel Hobby can't do. |
| CP-35 — Apprentice Mode | Event-triggered: customer rejects an action in `/dashboard/actions` → fires `learnFromRejection.trigger({ employeeSlug, actionId, originalProposal, rejectionReason })`. Trigger.dev runs the rule-extraction in background and persists to the employee's brain memory. |
| CP-36 — Live Workforce View | Trigger.dev's `realtime` SDK lets us stream "Sarah is running step 3 of 5" updates to `/dashboard` without our own SSE/WebSocket plumbing. |
| CP-37 — Org Chart Delegation | `step.waitForEvent('alice.task.complete')` is built in. Marcus the PM head delegates to Alice, Trigger.dev pauses Marcus's run, Alice runs, fires the event, Marcus resumes from the same step with Alice's result. No polling. |

**Without Trigger.dev**, CP-35 and CP-37 are 2-3× more work to build correctly with cron polling.

---

## Migration path

We don't need a big-bang migration. The plan:

| Phase | Scope | Effort |
|---|---|---|
| **Phase 1 (CP-34)** | Add Trigger.dev SDK, define `customEmployeeDispatcher` task, point new custom-employees cron at it. Keep all 28 built-in agents on Vercel Cron. | ~1 day |
| **Phase 2 (CP-35)** | Add `learnFromRejection` event-triggered task. Fire it from the approval-gate webhook. | ~0.5 day |
| **Phase 3 (CP-37)** | Add delegation primitives. Marcus → Alice flow uses `step.waitForEvent`. | ~1 day |
| **Phase 4 (optional, later)** | Migrate the 28 built-in agent cron routes to Trigger.dev for consistency. Not urgent — Vercel Cron handles them fine today. | ~2 days when we're ready |

---

## Costs, projected honestly

| Stage | Customers | Events/mo | Trigger.dev cost |
|---|---|---|---|
| Today | 0 paying | < 1K | $0 (free tier) |
| Beta (10 customers) | 10 | ~12K | $0 (free tier still covers) |
| Early growth (50 customers) | 50 | ~60K | $10/mo Hobby |
| At PMF (500 customers) | 500 | ~600K | ~$50/mo (Pro tier) |
| If pricing bites at 5K customers | 5,000 | ~6M | self-host on a $40/mo VPS, $40 forever |

**Trigger.dev is operationally invisible at every stage of our growth curve.**

---

## What we update in other docs

This decision supersedes the *"Inngest or Trigger.dev"* coupling in:

| Doc | Update |
|---|---|
| [`composio-vs-n8n-decision-2026.md`](./0001-composio-broker.md) | Note that the May 2026 follow-up research picked Trigger.dev specifically. |
| [`automations-architecture-2026.md`](../specs/automations.md) §11 "What NOT to build" → mentions deferring to Inngest/Trigger.dev for Phase 7. | Should say "Trigger.dev" specifically. |
| [`ai-employees-architecture-2026.md`](../specs/ai-employees.md) | Add Trigger.dev as the scheduler substrate in the Architecture section. |
| [`CLAUDE.md`](../../CLAUDE.md) §CP-15 mention | Update *"Inngest or Trigger.dev"* → *"Trigger.dev (verified pick, see scheduler-decision-2026.md)"*. |

---

## Sources

- [Inngest pricing page (verified 2026-05-25)](https://www.inngest.com/pricing)
- [Trigger.dev pricing page (verified 2026-05-25)](https://trigger.dev/pricing)
- [Trigger.dev product positioning](https://trigger.dev/)
- [comparetiers.com — Inngest vs Trigger.dev Pricing 2026](https://comparetiers.com/compare/inngest-vs-trigger-dev)
- [PkgPulse — Hatchet vs Trigger.dev vs Inngest 2026](https://www.pkgpulse.com/blog/hatchet-vs-trigger-dev-v3-vs-inngest-durable-workflows-2026)
- [PromptsToProduct — Inngest vs Trigger.dev which fits your SaaS](https://www.promptstoproduct.com/inngest-vs-trigger-dev)
- [MindStudio — What Is Trigger.dev](https://www.mindstudio.ai/blog/what-is-trigger-dev-agentic-workflow-platform)
- [Trigger.dev open-source repo (Apache 2.0)](https://github.com/triggerdotdev/trigger.dev)
- [Trigger.dev self-hosting guide](https://trigger.dev/docs/open-source-self-hosting)
- Internal: [`composio-vs-n8n-decision-2026.md`](./0001-composio-broker.md), [`automations-architecture-2026.md`](../specs/automations.md), [`ai-employees-architecture-2026.md`](../specs/ai-employees.md)
