# Automations layer — Lindy-style, agent-aware, approval-gated (May 2026)

> **⚠️ Broker note (2026-05-27).** This spec and the shipped `20260524_customer_automations.sql` migration were built on **Composio** — the `composio_trigger_id` column, `trigger_kind = 'composio_event'`, and the `/api/automations/webhook/composio` route below all still exist in code *as written here*. Composio was removed on 2026-05-26 (broker is now **Nango** — see [`../adr/0010-nango-broker.md`](../adr/0010-nango-broker.md)), so **this surface is offline pending its Nango rebuild**. The spec is left intact (it matches the current schema) — when the automations layer is rebuilt on Nango, the `composio_*` trigger plumbing becomes the Nango equivalent (`nango_trigger_id`, Nango webhook ingress). Treat the *design* as current and the *broker specifics* as the rebuild target.

**Status**: research complete, NOT yet implemented.
**Trigger**: post-CP-19, customer needs a way to say "every time HubSpot deal closes won, Slack the PM and create a Notion page" — and have the AI COO build it, run it, and every other agent be aware of it.

This is the design doc for the **automations layer** (CP-20+). The pattern is Lindy's app-architecture lessons, adapted to OpsRadar's identity (approval-gated, Notion-Brain-backed, customer-owned).

---

## 1. Lindy 2026 architecture — verbatim vocabulary + lessons

From [docs.lindy.ai/llms.txt](https://docs.lindy.ai/llms.txt) and the [Latent Space podcast with Flo Crivello](https://www.latent.space/p/lindy):

| Lindy term | What it is | OpsRadar parallel |
|---|---|---|
| **"Lindy"** | The agent. ("AI employee.") | One row in `customer_automations` |
| **"Workflow"** | The DAG inside a Lindy | The `spec` JSON of an automation |
| **"Trigger"** | Entry point — time / chat / event | `customer_automations.trigger_*` columns |
| **"Action"** | Operation the agent performs | `spec.steps[].kind = 'composio_action'` |
| **"Agent Step" (AI Agent)** | Model picks tools dynamically — has Prompt, Model, Skills, Exit Conditions | `spec.steps[].kind = 'agent_step'` — the escape hatch |
| **"Skill"** | A single capability/tool | Already implemented (CP-17 — `knowledge-base/skills/*`) |
| **"Condition"** | Branch — "Go down this path if…" | `spec.steps[].kind = 'condition'` |
| **"Loop"** | Process list in parallel, Max Cycles / Max Concurrent / Output | `spec.steps[].kind = 'loop'` |
| **"Memory"** | Key-value persistent across runs | Per-automation row + `customer_automation_memory` table |
| **"Task"** | One execution of a Lindy's workflow | One row in `automation_runs` |
| **"Template"** | Pre-built Lindy a user can clone | Future feature — `automation_templates` table |

### The Lindy 1.0 → 2.0 lesson (this IS the design principle)

> "The more you can put your agent on Rails, one, the more reliable it's going to be… and two, it's also going to be easier to use for the user." — Flo Crivello

Lindy 1.0 = "LLM-maximalist" — giant prompt field, model figures it out. **Failed in production.**
Lindy 2.0 = explicit DAG. The Agent Step is the escape hatch, used "only when the next steps are truly uncertain" because they're "more expensive and potentially less reliable than standard actions."

→ **OpsRadar's automations must be DAGs with typed JSON between steps**, not free-form prompts. Every step has a structured output schema. The "AI agent" step exists but is the exception, not the rule.

### Append-only ledger execution

Every node appends to a shared ledger the next node inherits. Anthropic prompt caching re-triggered every X thousand nodes. **Steps pass typed JSON, not natural language.** This is how reliability scales.

---

## 2. Cross-agent awareness — THE key piece

The question: when a customer asks the AI COO "what's running?", or when a cron agent is about to propose an action, the system must know what automations already exist so it doesn't duplicate or contradict them.

### Lindy's gap

Lindy does NOT publish a registry UX. Awareness is implicit — each Lindy is invoked by name via `Talk with Other Lindy`. **This is a weakness for OpsRadar's use case** because the COO is the central agent and has to know what else is running.

### 2026 industry pattern (synthesized)

- AWS Agent Registry (Apr 2026): "a private, governed catalog and discovery layer for agents, tools, skills, MCP servers."
- Salesforce MuleSoft Agent Fabric (Jan 2026 GA): cross-platform agent discovery.
- Anthropic Agent Skills standard (Dec 2025): progressive disclosure of frontmatter + on-demand bodies.

### The canonical pattern for OpsRadar (mirror the Agent Skills pattern)

**Three-tier disclosure of the automations catalog**, mirroring our existing Skills loader:

1. **At boot** — every agent (cron + COO) gets a concatenated catalog of `name + one-line description` of all enabled automations for that customer, dropped into the system prompt.
2. **On demand** — agents call `list_automations` to filter ("which automations involve Slack?") or `inspect_automation` to read the full spec.
3. **Live** — agents call `find_automation_for_trigger(event_signature)` to ask "is there already an automation that handles this?" — duplicate-prevention.

**Mental model**: automations are runtime-mutable skills. Skills are author-curated; automations are customer-curated. Same disclosure shape, different storage.

---

## 3. Storage schema — four tables

### Table 1: `customer_automations` (the definition)

```sql
create table customer_automations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  slug            text not null,                       -- e.g. 'notify-pm-on-closed-won'
  name            text not null,                       -- "Notify PM when HubSpot deal closes won"
  description     text not null,                       -- one-liner injected into every agent prompt
  status          text not null default 'active',      -- 'active' | 'paused' | 'archived'
  -- Trigger config (denormalized for fast routing)
  trigger_kind    text not null,                       -- 'composio_event' | 'schedule' | 'manual' | 'webhook' | 'chat'
  trigger_toolkit text,                                -- 'hubspot' (null for non-event)
  trigger_slug    text,                                -- 'HUBSPOT_DEAL_STAGE_UPDATED_TRIGGER'
  trigger_filter  jsonb not null default '{}'::jsonb,  -- {"deal_stage": "closedwon", "amount_gte": 5000}
  -- The executable plan
  spec            jsonb not null,
  spec_version    int not null default 1,
  autonomy        text not null default 'ask',         -- 'ask' | 'auto' | 'off' (per-automation override)
  -- Metadata
  source          text not null default 'coo-chat',    -- 'coo-chat' | 'template' | 'manual'
  source_session  uuid,                                -- coo_chat_sessions.id if from chat
  created_by      text not null default 'customer',
  last_run_at     timestamptz,
  last_run_status text,
  run_count       int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(user_id, slug)
);

create index on customer_automations (user_id, status);
-- THE critical index: answers "does any automation fire on this event?"
create index on customer_automations (user_id, trigger_kind, trigger_toolkit, trigger_slug)
  where status = 'active';
```

### Table 2: `automation_trigger_instances` (Composio ti_* → automation map)

```sql
create table automation_trigger_instances (
  id                    uuid primary key default gen_random_uuid(),
  automation_id         uuid not null references customer_automations(id) on delete cascade,
  user_id               uuid not null,
  composio_trigger_id   text not null,                  -- 'ti_xxxxx' from Composio
  trigger_slug          text not null,
  connected_account_id  text not null,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  unique(composio_trigger_id)
);
```

### Table 3: `automation_runs` (one row per fired execution)

```sql
create table automation_runs (
  id              uuid primary key default gen_random_uuid(),
  automation_id   uuid not null references customer_automations(id) on delete cascade,
  user_id         uuid not null,
  trigger_event   jsonb not null,                       -- the Composio payload or schedule ctx
  status          text not null default 'running',      -- 'running' | 'succeeded' | 'failed' | 'awaiting_approval'
  result          jsonb,
  error           text,
  steps           jsonb not null default '[]'::jsonb,   -- compact step trace
  queued_action_ids uuid[] not null default '{}',       -- cross-link to agent_actions
  started_at      timestamptz not null default now(),
  finished_at     timestamptz
);
```

### Table 4: `automation_event_idempotency` (dedupe Composio retries)

```sql
create table automation_event_idempotency (
  webhook_id      text primary key,                     -- Composio's webhook-id header
  received_at     timestamptz not null default now(),
  automation_ids  uuid[] not null
);
-- TTL prune > 7 days
```

### The `spec` JSON shape (the IR)

```ts
type AutomationSpec = {
  version: 1
  steps: AutomationStep[]
}

type AutomationStep =
  | { kind: 'composio_action'; toolkit: string; action_slug: string; arguments: Json; ref?: string }
  | { kind: 'notion_write'; database_slug: string; properties: Json; ref?: string }
  | { kind: 'agent_step'; prompt: string; allowed_tools: string[]; exit_when: string; ref?: string }
  | { kind: 'condition'; branches: Array<{ when: string; steps: AutomationStep[] }> }
  | { kind: 'loop'; over: string; max_concurrent?: number; max_cycles?: number; steps: AutomationStep[]; output: string }
  | { kind: 'wait'; for: 'duration' | 'token' | 'event'; value: string }
  | { kind: 'set'; key: string; value: string }
  | { kind: 'queue_action'; action_type: ActionType; payload_template: Json }
```

---

## 4. Composio triggers — what actually exists

Audited via per-toolkit docs at [docs.composio.dev](https://docs.composio.dev/docs/triggers):

| Toolkit | # Triggers | Mechanism | Status |
|---|---|---|---|
| HubSpot | 2 | webhook | `HUBSPOT_CONTACT_CREATED_TRIGGER`, `HUBSPOT_DEAL_STAGE_UPDATED_TRIGGER` |
| Stripe | 7 | webhook | invoice paid, charge failed, subscription updated, etc. |
| Gmail | 2 | **polling — 15 min minimum after Apr 15, 2026** | `GMAIL_NEW_GMAIL_MESSAGE`, `GMAIL_EMAIL_SENT_TRIGGER` |
| Slack | 8 | webhook | message received, DM received, reaction, channel created |
| Notion | 13 | webhook | page created, properties updated, comment, etc. |
| Calendly | **0** | — | Must register Calendly-native webhook via `CALENDLY_CREATE_WEBHOOKS` action |
| ClickUp | **0** | — | Same — `CLICKUP_CREATE_WEBHOOK` action, receive at OpsRadar endpoint |
| Harvest | likely 0 | — | Cron poll |

### Webhook delivery (Composio v3)

- Headers: `webhook-id`, `webhook-timestamp`, `webhook-signature`
- HMAC-SHA256 signature over `{id}.{timestamp}.{raw_body}`, base64-encoded
- 300-second replay window
- Payload shape: `metadata.trigger_slug`, `metadata.log_id`, `metadata.connected_account_id`, `data` blob

### Implications

1. **Build a polling adapter** for Calendly / ClickUp / Harvest (15 min cron, since-cursor pagination) OR register provider-native webhooks via Composio actions and accept them at an OpsRadar endpoint. **Recommend the latter** — keeps latency real-time.
2. **Add a schedule-based trigger** for "every Friday 9am" automations — reuse existing Vercel cron.
3. **Composio v3 webhook verification** — copy the HMAC code we already have in `/api/composio/webhook/route.ts` to the new `/api/automations/webhook/composio/route.ts`.

---

## 5. Durable execution — Vercel Workflows (GA April 2026)

### When you DON'T need durable execution

Roughly 80% of customer automations:
- Single-shot: event in → 1-3 Composio calls out
- Branching but synchronous (LLM picks one branch, completes in < 60s)
- Cron-triggered, all in-process

**These can run inline inside the webhook handler.** Bounded to specs without `wait_*` steps.

### When you DO need durable execution

- `wait` > 60s ("send follow-up 3 days after closed-won")
- `wait_for_event` ("send reminder, wait for Slack reply, then escalate")
- Multi-day approval flows
- Loops over > 50 items with per-item LLM reasoning
- Retry windows > minutes

### 2026 verdict — Vercel Workflows

We're on Vercel. **Vercel Workflows went GA April 2026** with `"use workflow"` / `"use step"` directives, `step.sleep`, hooks, durable streams, and native integration with AI SDK v7's `DurableAgent`. **Strictly better than Inngest/Trigger.dev for a Vercel app** because there's no separate worker fleet — steps run as Fluid Compute invocations against an event log.

### Phasing

| Phase | When | Stack |
|---|---|---|
| Phase 1 (now) | Synchronous executor inside webhook handler. No `wait_*` steps allowed in spec. | Pure Vercel function |
| Phase 2 (when first wait > 60s lands) | Migrate executor to Vercel Workflows | `"use workflow"` / `"use step"` |

**DO NOT bring in Inngest or Trigger.dev.** Would be a redundant scheduler. Vercel Workflows is code-as-config and built on Vercel Queues.

---

## 6. Natural-language compilation flow

Two phases: **extract → confirm → install**.

### Phase A: COO drafts the spec

```ts
const proposeAutomation = tool({
  description: "Compile the user's described automation into a runnable draft. Returns for confirmation.",
  inputSchema: z.object({ user_request: z.string() }),
  execute: async ({ user_request }, { messages }) => {
    const { object: draft } = await generateObject({
      model: 'anthropic/claude-sonnet-4.7',
      schema: AutomationDraftSchema,
      prompt: buildAutomationCompilationPrompt({
        user_request,
        prior_context: messages,
        available_triggers: ALLOWED_TRIGGERS_FOR_USER,
        available_actions: AVAILABLE_ACTIONS_FOR_USER,
        existing_automations: await listAutomations(userId),
      }),
    })
    return { kind: 'automation_draft', draft }
  },
})
```

The model picks from an enumerable catalog (Composio triggers + connected toolkits' actions) — it does NOT invent slugs. This is the [Vercel json-render](https://www.infoq.com/news/2026/03/vercel-json-render/) pattern.

### Phase B: Customer confirms

Show the draft inline in chat as a Lindy-style card:

```
TRIGGER: HubSpot deal moved to "Closed Won"
   ↳ filter: amount ≥ $5,000

THEN: Send Slack DM to assigned PM
THEN: Create Notion page in "Active Clients" database
THEN: Queue a 7-day kick-off email reminder

Autonomy: Ask before each step  [change]
[Confirm & install]  [Edit]  [Discard]
```

Reuse the existing `/dashboard/actions` approval-card component.

### Phase C: Install

`installAutomation` tool fires:
1. Insert row in `customer_automations`.
2. Register Composio trigger instance (`composio.triggers.create`).
3. Return first-run preview.

### Pre-flight duplicates check

Before showing the draft, the COO passes existing automations to the compiler. If `duplicates_of` is non-empty, the COO message is: *"You already have an automation for this. Want me to (a) update the existing one, (b) add another, or (c) ignore?"*

---

## 7. Customer mental model — four surfaces

| Surface | What goes here |
|---|---|
| **COO chat** (`/dashboard/coo`) | Conversational creation, edit, pause/resume. The canonical interface. |
| **Inline draft card in chat** | The proposed automation, shown as trigger → steps with Confirm/Edit/Discard. |
| **`/dashboard/automations`** (NEW) | Registry view. Sorted list of every automation. Click → detail page. |
| **`/dashboard/automations/[id]`** (NEW) | Spec graph (read-only), recent runs, pause/resume/delete, autonomy toggle. |
| **`/dashboard/runs`** (existing) | Run history. Add "Automation" filter chip. Automation-triggered runs get a "TRIGGERED BY" badge. |

### Sidebar IA

```
OPERATIONS group:
  /dashboard/runs            (existing — agent + automation runs)
  /dashboard/automations     (NEW — registry)
  /dashboard/actions         (existing — approval queue)
```

Automations sits above Actions because Actions are the *output* of Automations.

---

## 8. Cron agent vs event automation — decision rule

| Question | → cron agent | → event automation |
|---|---|---|
| Run on a clock regardless of external event? | ✓ | |
| Summarize / synthesize across many records? | ✓ | |
| Propose actions for customer to approve? | ✓ | |
| Discrete inbound event triggers it? | | ✓ |
| Needs to fire in real-time (< 5 min)? | | ✓ |
| Input is one record, not the whole dataset? | | ✓ |

**Examples:**
- `briefing` (daily 6am cross-data summary) → cron, stays
- "When HubSpot deal moves to closed-won, create kick-off Notion page" → automation
- `collections` (daily survey of overdue invoices) → cron
- "When Stripe invoice goes 7 days overdue, send the standard reminder" → automation

### Overlap is OK

Cron = synthesis pass. Automation = reflex pass. The cron-agent's awareness of the automation prevents double-recommendation. This is where §2's three-tier disclosure earns its keep.

---

## 9. Approval-gate integration

Reuse the existing `wrapToolsWithApprovalGate` exactly as-is. Add to the source union:

```ts
// src/lib/agents/approval-gate.ts
export type ApprovalSource = 'cron-agent' | 'coo-chat' | 'automation'

export type ApprovalGateOptions = {
  userId: string
  source: ApprovalSource
  agentSlug?: string
  automationId?: string       // NEW
  automationRunId?: string    // NEW
  policies?: ToolPolicyMap
}
```

### Resolution order

1. Automation `autonomy === 'off'` → block before tool call.
2. Automation `autonomy === 'auto'` → fire immediately (log to `agent_actions` for audit).
3. Automation `autonomy === 'ask'` → fall through to per-tool `tool_policies`.

### Default = Ask

Matches Lindy, Zapier HITL, Devin, and Anthropic's "Building Effective Agents" — *"Agents can pause for human feedback at checkpoints or when encountering blockers."*

---

## 10. What NOT to build (n8n / Zapier / Make critique)

1. **No visual node-graph editor.** Customer never drags nodes. Conversation → spec → read-only graph view for confirmation.
2. **No expression language.** No `{{ $json.body.contacts[0].email }}`. The COO compiles JSONPath at draft time.
3. **No separate "AI nodes."** Every step is potentially an LLM call. `agent_step` is the dynamic case, `composio_action` the deterministic — same surface.
4. **Don't compete on integration count.** Composio is already 500+ wide. Win on depth + cross-agent awareness.
5. **No free-form prompts inside the spec.** Every prompt field has a typed output schema. This is Flo's "every field is a mini-prompt" insight.
6. **Don't store per-execution data in the definition.** Definitions are stable; per-run blobs go in `automation_runs`.
7. **Don't bury automations on one page.** Sidebar route + chat + actions surface all reference them.

---

## 11. Concrete build plan — 8 phases

| Phase | What ships | Effort |
|---|---|---|
| **0. Naming + IA** | "Automations" customer-facing. Sidebar entry under OPERATIONS. | 1 commit |
| **1. Schema + registry** | 4 tables + `loadAutomations(userId)` + `findAutomationsForEvent()`. Inject catalog into every agent prompt (mirrors Skills loader). | 1 PR |
| **2. Webhook ingress** | `POST /api/automations/webhook/composio` — verify HMAC, dedupe, route. | 1 PR |
| **3. Synchronous executor** | `src/lib/automations/execute.ts` — walks spec, calls Composio via approval gate. Specs without `wait_*` only. | 1 PR |
| **4. COO compilation flow** | `proposeAutomation` / `installAutomation` / `listAutomations` / `inspectAutomation` / `pauseAutomation` tools. Inline draft card. | 1 PR |
| **5. `/dashboard/automations` UI** | List + detail pages. Read-only spec graph. Pause/resume/delete. Autonomy toggle. | 1 PR |
| **6. Composio trigger registration** | On install: create `ti_*` via SDK, write to `automation_trigger_instances`. Calendly/ClickUp: register provider-native webhooks via Composio actions. | 1 PR |
| **7. Durable execution** | When first `wait > 60s` spec lands: migrate executor to Vercel Workflows. | later |
| **8. Cross-agent awareness everywhere** | Cron agents call `find_automation_for_trigger` before proposing. Briefing mentions fired automations. | later |

---

## Key sources

**Lindy:**
- [Lindy docs index](https://docs.lindy.ai/llms.txt) + [triggers](https://docs.lindy.ai/fundamentals/lindy-101/triggers) / [actions](https://docs.lindy.ai/fundamentals/lindy-101/actions) / [AI Agents](https://docs.lindy.ai/fundamentals/lindy-101/ai-agents) / [conditions](https://docs.lindy.ai/fundamentals/lindy-101/conditions) / [looping](https://docs.lindy.ai/fundamentals/lindy-101/looping) / [memory](https://docs.lindy.ai/fundamentals/lindy-101/memory) / [tasks](https://docs.lindy.ai/fundamentals/lindy-101/tasks)
- [Latent Space — Flo Crivello interview](https://www.latent.space/p/lindy)
- [ZenML — Lindy evolution to guided workflows](https://www.zenml.io/llmops-database/evolution-from-open-ended-llm-agents-to-guided-workflows)
- [Lindy blog — AI Agent Architecture 2026](https://www.lindy.ai/blog/ai-agent-architecture)

**Composio:**
- [Triggers overview](https://docs.composio.dev/docs/triggers) + [creating](https://docs.composio.dev/docs/setting-up-triggers/creating-triggers) + [webhook verification](https://docs.composio.dev/docs/webhook-verification)
- [Polling interval changes Mar 2026](https://docs.composio.dev/docs/changelog/2026/03/11)

**Durable execution:**
- [Vercel — A new programming model for durable execution](https://vercel.com/blog/a-new-programming-model-for-durable-execution)
- [Vercel Workflows docs](https://vercel.com/docs/workflows)
- [Vercel Queues docs](https://vercel.com/docs/queues)
- [Temporal — Building durable agents with Temporal + AI SDK by Vercel](https://temporal.io/blog/building-durable-agents-with-temporal-and-ai-sdk-by-vercel)
- [PkgPulse — Hatchet vs Trigger.dev vs Inngest 2026](https://www.pkgpulse.com/blog/hatchet-vs-trigger-dev-v3-vs-inngest-durable-workflows-2026)

**Anthropic / agent patterns:**
- [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [Agent Skills standard (Dec 2025)](https://www.anthropic.com/news/agent-skills)
- [Claude API structured outputs](https://docs.claude.com/en/docs/build-with-claude/structured-outputs)

**Agent registries:**
- [AWS Agent Registry (Apr 2026)](https://aws.amazon.com/about-aws/whats-new/2026/04/aws-agent-registry-in-agentcore-preview/)
- [Salesforce MuleSoft Agent Fabric](https://www.salesforce.com/news/stories/mulesoft-agent-fabric-automated-agent-discovery/)

**UX:**
- [Smashing — Designing agentic AI UX patterns](https://www.smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/)
- [InfoQ — Vercel json-render](https://www.infoq.com/news/2026/03/vercel-json-render/)

**n8n / Zapier critique:**
- [Viasocket — Top Zapier alternatives 2026 / Why linear automation is dead](https://viasocket.com/blog/top-10-best-zapier-alternatives-in-2026-why-linear-automation-is-dead-2)
- [DEV — n8n 8 months honest verdict 2026](https://dev.to/nova_gg/n8n-review-2026-i-used-it-for-8-months-to-build-ai-agents-honest-verdict-kif)
- [Dust — n8n alternatives 2026](https://dust.tt/blog/n8n-alternatives-workflow-automation)
