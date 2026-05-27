# YC Build Architecture — How to Build the 4 Categories the Sophisticated Way

*Compiled 2026-05-21. The architecture blueprint to ship a YC-grade product across YC RFS #2, #4, #12, #15.*

---

## Why this document exists

The [YC research addendum](./research-addendum.md) proves the market is there. This document answers the harder question: **how do we build each of the 4 categories at the sophistication level that wins a YC Summer 2026 batch slot?**

Every recommendation here is grounded in:
- **OpsRadar's current stack** — single Next.js 16 / React 19 app on Vercel + Supabase, agent loop (Vercel AI SDK) + approval gate, Nango as the integration broker (`src/lib/nango.ts`). *(Historical note: an earlier draft referenced a separate "chatv2" backend; it was severed in CP-15 and its function now lives in this one app — there is no second backend.)*
- **2026 production patterns** — what Klarna, Uber, LinkedIn, Bravi, and the YC W26/S25 batch are actually shipping
- **The hard architectural constraint** — no client data persisted in Supabase (live-fetch only). This rules out some patterns and demands cleverness in others.

---

## The 4 Build Specs — Stack at a Glance

| Category | Core Pattern | Primary Stack | Status |
|----------|--------------|---------------|--------|
| **#2 AI-Native Service** | Vertical agent with HITL gates | Vercel AI SDK v6 + GPT-4o tool use + Inngest for durability | Partial — COO agent spec exists, not shipped |
| **#4 Company Brain** | Hybrid GraphRAG (live-fetch + cached KG + frontmatter) | Supabase pgvector + custom KG over live integration data + gray-matter | Not started |
| **#12 Software for Agents** | Public OAuth-secured MCP server | Hono on Vercel Fluid Compute + Supabase OAuth issuer + per-tenant scopes | Not started |
| **#15 AI OS** | Event-driven supervisor/worker with observability | Inngest event bus + Langfuse traces + supervisor agent pattern | Not started |

---

# Category #2 — AI-Native Service Company

**Goal:** Replace what a fractional COO does — diagnose, recommend, and queue actions — with software that's faster, cheaper, and consistent.

## Core architectural pattern: Vertical Agent with HITL gates

The dominant 2026 pattern for AI-native service replacement (per [Ampersand](https://www.withampersand.com/blog/why-ai-agent-companies-building-vertical-saa-s-need-native-product-integrations)) is **vertical agents with native integrations + HITL gates**. Generic horizontal agents lose to vertical specialists in every industry where domain knowledge matters. Agencies are one of those industries.

### Why ReAct + HITL (not full autonomy)

> At a 5% per-action failure rate, an agent that takes 20 actions will fail often enough to be unusable without guardrails. Fully autonomous agents usually require well below 1% end-to-end failure to be usable.

OpsRadar is making **financial decisions** (reprice clients, fire clients, send margin alerts). A wrong autonomous action burns a customer relationship. Therefore:
- Agent **reasons + proposes** autonomously
- Agent **acts** only through queued actions that require explicit owner confirmation
- This matches the COO agent spec already written ([`coo-agent-design.md`](../dev/specs/2026-05-21-coo-agent-design.md))

### The exact agent loop pattern

```
USER MESSAGE
    ↓
[Supervisor agent] receives + decides plan
    ↓
[Tool execution layer] runs read-only tools in parallel
   • get_finance, get_sales, get_profitability, get_capacity, get_scope
    ↓
[Reasoning] synthesizes data + KB context
    ↓
[Action proposer] — never executes, only queues
   • queue_action(type, payload, reasoning, confidence)
    ↓
[Stream to UI] — visible tool calls + inline action card
    ↓
[Owner clicks Confirm] → action runs server-side
    ↓
[Outcome tracker] logs result back into KB for future agent reasoning
```

The last step — **outcome tracking** — is what makes this YC-grade. The agent must learn whether its past proposals were accepted, rejected, or partially executed, and surface that in future reasoning ("Last time I proposed raising Client X's retainer 30%, you rejected it because they're a referral source — I'll propose 15% this time").

## Framework choice: Vercel AI SDK v6 (with selective Mastra patterns)

Per [Speakeasy's comparison](https://www.speakeasy.com/blog/ai-agent-framework-comparison), the framework choice for OpsRadar is clear:

| Framework | Verdict |
|-----------|---------|
| **Vercel AI SDK v6** | ✅ Best for streaming React UI on Vercel — typed hooks, generative UI primitives, SSE handling built-in |
| **Mastra** | Strong runner-up — TypeScript-first, serverless-ready, 22k+ GitHub stars, hit 1.0 Jan 2026. Worth using its **memory module pattern** even if not the framework itself |
| **LangGraph** | Best in class for stateful agent graphs, but doesn't run on Vercel Fluid Compute (LangGraph Platform isn't serverless). Wrong for OpsRadar |
| **CrewAI / AutoGen / OpenAI Agents SDK** | Python-only or provider-locked — wrong stack |

**Decision: Build on Vercel AI SDK v6 directly, borrow Mastra's memory compression pattern (auto-compresses at 30k tokens), use the AI Gateway for provider flexibility.**

## Durability layer: Inngest

Agent runs aren't request-response. They:
- Can take 30s to 3 minutes
- Make multiple LLM calls
- Need retries with backoff on tool failures
- Need to resume if a Vercel function times out

Per [PkgPulse](https://www.pkgpulse.com/guides/inngest-vs-trigger-dev-v3-vs-restate-2026): for the fastest path from existing app code to durable workflows, **Inngest wins**. It's Vercel-native, TypeScript-first, and ships agent-friendly primitives (event-driven workflow steps, durable resumes from tool calls, HITL gates).

Pattern:
```typescript
// src/inngest/coo-agent.ts
export const cooAgentRun = inngest.createFunction(
  { id: "coo-agent-run", retries: 2 },
  { event: "coo/message.received" },
  async ({ event, step }) => {
    const plan = await step.ai.wrap("plan", () => planMove(event.data))
    const toolResults = await step.run("execute-tools", () => runTools(plan))
    const proposals = await step.ai.wrap("propose", () => proposeActions(toolResults))
    // Optional HITL gate — waitForEvent('action.confirmed')
    return proposals
  }
)
```

## Native integration architecture

Per [Ampersand](https://www.withampersand.com/blog/why-ai-agent-companies-building-vertical-saa-s-need-native-product-integrations):
> Neither traditional embedded iPaaS nor unified APIs were built for the real-time, field-level depth that AI agents require. AI agent vertical SaaS companies need Native Product Integrations: defined in code (YAML, not UI), version-controlled, and deployed via CI/CD.

OpsRadar already does this — `src/lib/integrations/*` is YAML-spirit (adapter pattern, version-controlled, no UI). What's missing is **bi-directional, field-level depth** for actions: the COO agent needs to not just read Stripe data but also (when confirmed) update Stripe invoices, send Stripe email reminders, etc.

**Roadmap addition: every read-only integration needs a paired action surface.**

| Integration | Read tool | Action tool (new) |
|-------------|-----------|------------------|
| Stripe | `get_finance()` | `send_invoice_reminder()`, `update_invoice_amount()` |
| HubSpot | `get_sales()` | `add_deal_note()`, `update_deal_stage()` |
| ClickUp | `get_delivery()` | `add_task_comment()`, `move_task_status()` |
| Harvest | `get_capacity()` | `add_time_entry()` (rarely), `flag_over_budget()` |

---

# Category #4 — Company Brain

**Goal:** A persistent intelligence layer that knows everything about the agency — clients, margins, capacity, history, peer benchmarks — and turns that knowledge into agent-executable context.

## Core pattern: Hybrid GraphRAG (not naive vector RAG)

Per [NStarX](https://nstarxinc.com/blog/the-next-frontier-of-rag-how-enterprise-knowledge-systems-will-evolve-2026-2030/):
> The initial approach to RAG using simple vector embeddings has revealed significant limitations when handling complex, multi-hop queries that require understanding relationships between entities. GraphRAG has emerged as the next evolution in enterprise AI infrastructure.

Production systems in 2026 maintain **three layers simultaneously**:
1. **Vector embeddings** for semantic search ("find similar past situations")
2. **Knowledge graph** for relationship reasoning ("which clients share an account manager who's over capacity?")
3. **Hierarchical indexes** (frontmatter / metadata) for categorical navigation ("playbook for margin alerts")

OpsRadar already has #3 (the KB upgrade spec) — but the company brain needs all three.

## The OpsRadar-specific company brain architecture

Because OpsRadar **cannot persist client data**, the company brain has a unique 3-tier design:

### Tier 1: Static knowledge (Supabase) — what the agency *should* know
- Playbooks, benchmarks, frameworks, case studies
- Frontmatter-ranked (the KB upgrade spec)
- Vector embeddings via Supabase pgvector
- **Use Supabase pgvector**, not Pinecone — already in stack, no new infra, sufficient for 10K+ docs

### Tier 2: Live knowledge graph (in-memory, per-request) — what the agency *is*
- Built fresh from live integration fetches on every request
- Nodes: clients, projects, deals, invoices, retainers, team members
- Edges: "client X has retainer Y", "project Z is over budget Y%", "deal A is in stage B for N days"
- Lives in agent context for the duration of one request
- **Not persisted** — respects the architectural rule

### Tier 3: Outcome memory (Supabase) — what the agency *learned*
- Every confirmed/rejected action is logged with reasoning
- Every margin alert acknowledged is logged
- Every COO chat that surfaced a gap is logged ([`coo_kb_gaps`](../dev/specs/2026-05-21-kb-upgrade-design.md))
- This is what makes the brain *learn* — without storing customer business data

### The query flow
```
USER QUESTION: "Should I fire Client B?"
    ↓
[Tier 2] Live-fetch profitability, capacity, scope for Client B
    ↓
[Tier 1] Vector search KB for "fire client" playbooks (cosine sim > 0.7)
    ↓
[Tier 3] Memory lookup: "Did owner previously consider firing Client B?"
    ↓
[Knowledge graph build] Construct Client B's full graph: deals, hours, scope, history
    ↓
[GPT-4o reasoning] Synthesize all three tiers into a recommendation
    ↓
[Outcome log] When owner acts, append result to Tier 3
```

This 3-tier hybrid is **the architectural moat** — generic company brains (Hyper, Glean) can't replicate this because they don't have agency-specific live integrations or the outcome feedback loop.

## Implementation sequencing

1. **Now (this session):** ship the KB frontmatter + ranking spec already designed
2. **Next sprint:** add Supabase pgvector + ingest existing KB into embeddings
3. **Sprint +1:** add the `coo_kb_gaps` table + outcome memory table (`coo_outcomes`)
4. **Sprint +2:** build the live knowledge graph builder (`src/lib/coo/graph-builder.ts`) that runs per-request

---

# Category #12 — Software for Agents

**Goal:** Become MCP-native so other agents (Claude Desktop, ChatGPT, internal agency agents, even competitor products) can plug into OpsRadar as a data source. This is the YC #12 unlock — and the YC bar in 2026.

## Why MCP and why now

The numbers from the [research addendum](./research-addendum.md):
- 1,200 → 9,400 MCP servers in 13 months (+18% MoM)
- 78% of enterprise AI teams have at least one MCP-backed agent in production
- 97M+ monthly SDK downloads
- Anthropic donated to Linux Foundation alongside Block, OpenAI, AWS, Google, Microsoft, Salesforce, Snowflake
- 41% of MCP servers still lack any authentication — **the bar is low and OpsRadar can lead on security**

## OpsRadar's MCP server architecture

The OpsRadar MCP server exposes agency operational data to external AI agents. It is a **separate deployable** from the main Next.js app — runs on Vercel Fluid Compute, written in TypeScript with Hono.

### Tools to expose

| Tool | Scope | Purpose |
|------|-------|---------|
| `opsradar.get_finance` | `finance:read` | MRR, paid MTD, overdue |
| `opsradar.get_profitability` | `profitability:read` | Per-client margins |
| `opsradar.get_capacity` | `capacity:read` | Utilization %, available hours |
| `opsradar.get_scope` | `scope:read` | Scope creep signals |
| `opsradar.get_benchmarks` | `benchmarks:read` | Peer benchmarks |
| `opsradar.search_kb` | `kb:read` | Search the playbook KB |
| `opsradar.propose_action` | `actions:write` | Queue an action for owner approval (never executes — only proposes) |

### Authentication: OAuth 2.1 with per-tenant scoped tokens

Per [Descope](https://www.descope.com/blog/post/mcp-server-security-best-practices):
> Modern MCP implementations standardize on OAuth 2.1 for HTTP-based transports. Each tenant should get scoped tokens with custom claims (tenant_id, allowed_tools, data_scope) validated on every tool invocation. Zero-trust means re-authenticating on each tool call.

OpsRadar already runs Supabase Auth. The Supabase Auth GoTrue server can act as the OAuth 2.1 issuer for MCP. Pattern:

```
External agent (e.g., Claude Desktop)
    ↓ OAuth 2.1 flow
[Supabase Auth] issues access token w/ custom claims:
    { tenant_id: "user-123", scopes: ["finance:read", "profitability:read"], exp: 1h }
    ↓ Token included in MCP requests
[OpsRadar MCP server (Vercel)]
    1. Validates JWT signature
    2. Checks scope for requested tool
    3. Loads tenant's integration keys from encrypted Supabase
    4. Live-fetches from Stripe/HubSpot/Harvest with those keys
    5. Returns structured response
    6. Logs invocation for audit
```

### Security layers (must-have for YC application)

1. **OAuth 2.1, not API keys** — per-tenant tokens with 1h expiry, refresh rotation
2. **Per-tool scopes** — `finance:read`, `actions:write` are distinct grants
3. **Rate limits** — per-tenant + per-tool buckets in Upstash Redis (already in stack)
4. **Audit log** — every MCP invocation logged to `mcp_invocations` Supabase table
5. **Prompt injection defense** — tool descriptions and responses sanitized; never echo user input as tool args
6. **Tenant isolation** — tokens can never read another tenant's data

### Distribution

- Publish to the public MCP registry (10,000+ servers, where Claude Desktop discovers tools)
- Ship a one-click Claude Desktop install link from `/dashboard/integrations/mcp`
- README on a public GitHub repo demonstrating safe usage from Claude / ChatGPT

This is the **YC #12 deliverable** in concrete form.

---

# Category #15 — AI OS for Companies

**Goal:** Turn OpsRadar from a dashboard into a continuously-running operating system — agents react to events, propose actions, and the owner stays in control through a single interface.

## Core pattern: Event-driven supervisor / worker

Per [Atlan](https://atlan.com/know/event-driven-architecture-for-ai-agents/):
> Event-driven architecture reduces latency by 70-90% because agents react instantly when events arrive, and reduces connection complexity from O(N²) to O(N) by routing all communication through a central event bus.

Per [Indium](https://www.indium.tech/blog/multi-agent-orchestration-2026/):
> The Supervisor Model: a primary orchestrator agent receives the user prompt and delegates sub-tasks to specialized worker agents.

### The OpsRadar AI OS architecture

```
                   ┌──────────────────────────────────────┐
                   │       INNGEST EVENT BUS              │
                   │  (events: integration.synced,        │
                   │   metric.threshold-crossed,          │
                   │   action.confirmed, kb.gap-detected) │
                   └──┬──────────┬──────────┬─────────────┘
                      │          │          │
              ┌───────▼───┐ ┌────▼─────┐ ┌──▼───────────┐
              │ Supervisor│ │  Worker  │ │  Worker      │
              │  COO Agent│ │ Margin   │ │ Scope        │
              │           │ │ Watcher  │ │ Watcher      │
              └─────┬─────┘ └────┬─────┘ └──┬───────────┘
                    │            │          │
                    └────────────┼──────────┘
                                 ▼
                  ┌──────────────────────────┐
                  │  Action Queue (Supabase) │
                  │  + Confirmation UI       │
                  └──────────────────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────┐
                  │   Outcome Log → KB       │
                  └──────────────────────────┘
```

### Agent roles

| Agent | Trigger | Purpose | Output |
|-------|---------|---------|--------|
| **Supervisor (COO)** | User chat message | Plan + delegate + synthesize | Streamed answer + queued actions |
| **Margin Watcher** | Cron (hourly) or `integration.synced` event | Detect margin alerts, propose reprice | Queued action |
| **Scope Watcher** | Cron (hourly) or `integration.synced` event | Detect scope creep, propose client conversation | Queued action |
| **Cash Flow Watcher** | Cron (daily) or `invoice.overdue` event | Detect cash crunch, propose collections sequence | Queued action |
| **KB Gap Watcher** | `kb.gap-detected` event | Cluster gaps, propose content briefs to founder | Content brief in `/admin/kb-gaps` |

All workers run as Inngest functions. The supervisor runs inside the chat route.

### Observability (table stakes for YC)

Per [Laminar](https://laminar.sh/article/2026-04-23-top-6-agent-observability-platforms):
> Agent observability is the 2026 production-deployment necessity that most teams underestimated. Workflows that worked in dev fail in prod for reasons traditional APM doesn't surface — model drift, tool-call retry loops, prompt regressions, cost spikes from runaway loops.

**Decision: Use Langfuse (open source, self-hostable, framework-agnostic).** Why not LangSmith: deepest integration with LangChain ecosystem which OpsRadar isn't using. Why not Braintrust: eval-first but tracing is bolted on; OpsRadar needs tracing-first.

Wire Langfuse into:
- Every COO chat session (full trace: tool calls, tokens, latency, cost)
- Every Inngest agent worker run
- Every MCP invocation

### Human-in-the-loop enforcement

Every agent write action **must** gate through:
1. Insert to `agent_actions` table with `status: 'pending'`
2. Inline confirmation card in chat or notification in `/dashboard/actions`
3. Owner clicks Confirm → status flips to `executing` → action runs server-side
4. On success → status `executed`, log to outcome table
5. On failure → status `failed`, log to outcome table, surface error to owner

The Gartner warning ([May 2026](https://www.gartner.com/en/newsroom/press-releases/2026-05-05-gartner-says-autonomous-business-and-artificial-intelligence-layoffs-may-create-budget-room-but-do-not-deliver-returns)) is the positioning angle:

> "Organizations that improve ROI are not those that eliminate the need for people, but those that amplify them by aggressively investing more in skills, roles and operating models that allow humans to guide and scale autonomous systems."

OpsRadar's HITL gates are the *product*, not a limitation.

---

# Unified Architecture — How the 4 Connect

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CUSTOMER (Owner / FO)                       │
│                                                                     │
│   /dashboard ──► Reads outcomes, confirms actions, chats with COO   │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    OPSRADAR NEXT.JS APP (Vercel)                    │
│                                                                     │
│  Routes:           ┌────────────────┐  ┌─────────────────┐          │
│  /dashboard/*      │ Vercel AI SDK  │  │ Server actions  │          │
│  /api/dashboard/*  │ v6 streaming   │  │ for confirm     │          │
│                    └────────────────┘  └─────────────────┘          │
└────────┬─────────────────────────────────────────────┬──────────────┘
         │ events                                      │ live-fetch
         ▼                                             ▼
┌──────────────────────┐    ┌─────────────────────────────────────────┐
│  INNGEST EVENT BUS   │    │  INTEGRATIONS (Stripe / HubSpot /       │
│                      │    │   ClickUp / Harvest / Pipedrive)        │
│  Supervisor + 4      │    │                                         │
│  worker agents       │    │  Adapter pattern, AES-256 encrypted     │
│  GPT-4o tool use     │    │  keys, server-side only                 │
│  Langfuse traces     │    └─────────────────────────────────────────┘
└──────┬───────────────┘
       │                    ┌─────────────────────────────────────────┐
       │                    │  SUPABASE                               │
       │     read/write     │  • Auth + OAuth 2.1 issuer              │
       └────────────────────┤  • pgvector for KB embeddings           │
                            │  • agent_actions, coo_kb_gaps,          │
                            │    coo_outcomes, mcp_invocations        │
                            │  • RLS per tenant                       │
                            └─────────────────────────────────────────┘
                                            ▲
                                            │ scoped OAuth 2.1 tokens
                                            │
                            ┌───────────────┴─────────────────────────┐
                            │  OPSRADAR MCP SERVER (Vercel, separate) │
                            │                                         │
                            │  Tools: get_finance, get_profitability, │
                            │  get_capacity, get_scope, search_kb,    │
                            │  propose_action (HITL gate enforced)    │
                            └───────────────┬─────────────────────────┘
                                            │ MCP protocol
                                            ▼
                            ┌─────────────────────────────────────────┐
                            │  External agents: Claude Desktop,       │
                            │  ChatGPT, partner products, agency      │
                            │  internal agents                        │
                            └─────────────────────────────────────────┘
```

This single architecture **simultaneously satisfies all 4 YC categories**:
- **#2 (AI-Native Service):** the COO agent loop replaces the fractional COO function
- **#4 (Company Brain):** the 3-tier hybrid GraphRAG is the brain
- **#12 (Software for Agents):** the MCP server is the external API for agents
- **#15 (AI OS):** the event bus + supervisor/worker + HITL gates are the OS

---

# Build Sequencing — What to Ship in What Order

| Sprint | Ships | YC Category Earned |
|--------|-------|--------------------|
| **Sprint 1 (now)** | COO agent v1 (tool use + SSE streaming + 5 read tools + queue_action) — per existing [`coo-agent.md`](../dev/plans/2026-05-21-coo-agent.md) | #2 (foundation) |
| **Sprint 1** | KB upgrade with frontmatter + gap logging — per existing [`kb-upgrade-design.md`](../dev/specs/2026-05-21-kb-upgrade-design.md) | #4 (foundation) |
| **Sprint 2** | Langfuse integration on every agent run + COO chat | #15 (observability) |
| **Sprint 2** | Inngest event bus + Margin Watcher worker | #15 (events) |
| **Sprint 3** | Supabase pgvector for KB embeddings + hybrid retrieval | #4 (vector tier) |
| **Sprint 3** | Outcome memory table + agent reads from it | #4 (memory tier) |
| **Sprint 4** | OpsRadar MCP server v1 (5 read tools, OAuth 2.1, per-tenant scopes) | #12 (foundation) |
| **Sprint 4** | Scope Watcher + Cash Flow Watcher Inngest workers | #15 (more agents) |
| **Sprint 5** | MCP server published to public registry + Claude Desktop install link | #12 (distribution) |
| **Sprint 5** | Action tools for Stripe / HubSpot (send_invoice_reminder, update_deal_stage) | #2 (bi-directional) |
| **Sprint 6** | Knowledge graph builder + multi-hop reasoning in COO agent | #4 (graph tier) |

**By end of Sprint 4 OpsRadar has a defensible YC application across all 4 categories.**

---

# What Stays Out (YAGNI for YC App)

- **Custom LLM fine-tuning** — GPT-4o + good prompts + good context beats fine-tuned models at this stage
- **Multi-LLM routing** — pick one model (GPT-4o or Claude Sonnet 4.5), do it well, add Vercel AI Gateway for provider flexibility later
- **A2A protocol support** — MCP is enough; A2A trails at 23% adoption
- **Multi-modal (voice / video) inputs** — text-first, mobile-friendly is enough
- **Pinecone or Weaviate** — Supabase pgvector handles 10K docs at this scale
- **LangGraph / Mastra** — Vercel AI SDK is the right tool given the stack
- **Self-hosted Langfuse** — managed Langfuse Cloud is enough until 10K customers

---

# What This Architecture Forces Us to Build (Net-New Tables)

| Supabase table | Purpose |
|----------------|---------|
| `agent_actions` | Already exists — extend with `confidence`, `reasoning`, `proposed_by_agent` columns |
| `coo_kb_gaps` | Per KB upgrade spec — unanswered chat questions |
| `coo_outcomes` | Action confirmed/rejected + outcome — feedback loop for agent learning |
| `mcp_invocations` | Audit log: which external agent called which tool, when, with what scope |
| `agent_runs` | Per Inngest run: start, end, status, cost, tokens, trace_id |
| `kb_embeddings` (pgvector) | Vector embeddings of KB chunks for semantic search |
| `mcp_oauth_clients` | Registered OAuth clients (Claude Desktop, ChatGPT, partners) |

No client business data — every table is metadata. Architectural rule respected.

---

# Talent / Skill Gap

Per [Thinking Company](https://thinking.inc/en/pillar-pages/ai-native-product-building/):
> An Agentic Engineer is a hybrid role combining software engineering with applied AI who designs prompt architectures, builds orchestration logic, and optimizes inference pipelines. In 2026, these hybrid profiles are the most sought-after roles in the market.

OpsRadar's founder + Claude Code = one agentic engineer team. That's the current advantage. Hiring needs to scale this when the YC slot opens.

---

# Closing — Why This Is YC-Grade

1. **It's vertical** — agency-specific tools, agency-specific KB, agency-specific benchmarks. Horizontal company brain plays cannot replicate this.
2. **It's MCP-native from day one** — most YC S26 applicants will ship MCP as an afterthought; OpsRadar ships it as the API surface.
3. **It's outcome-loop closed** — the agent learns from confirmed/rejected actions, the KB grows from chat gaps, the model gets better as the customer uses it.
4. **It respects the hard constraint** — no client data persisted, ever. This is the security story that wins enterprise upmarket motion later.
5. **It uses 2026 best practices** — Vercel AI SDK v6 + Inngest + pgvector + Langfuse + OAuth 2.1 MCP. Every choice defensible against a YC partner who asks "why this and not X."

Now is the build.

---

*Sources: [Ampersand on vertical AI SaaS](https://www.withampersand.com/blog/why-ai-agent-companies-building-vertical-saa-s-need-native-product-integrations) · [Redis on agent architecture](https://redis.io/blog/ai-agent-architecture/) · [NStarX on GraphRAG](https://nstarxinc.com/blog/the-next-frontier-of-rag-how-enterprise-knowledge-systems-will-evolve-2026-2030/) · [Descope on MCP security](https://www.descope.com/blog/post/mcp-server-security-best-practices) · [Atlan on event-driven agents](https://atlan.com/know/event-driven-architecture-for-ai-agents/) · [Speakeasy on agent frameworks](https://www.speakeasy.com/blog/ai-agent-framework-comparison) · [Laminar on agent observability](https://laminar.sh/article/2026-04-23-top-6-agent-observability-platforms) · [PkgPulse on Inngest/Trigger/Restate](https://www.pkgpulse.com/guides/inngest-vs-trigger-dev-v3-vs-restate-2026) · [Indium on multi-agent orchestration](https://www.indium.tech/blog/multi-agent-orchestration-2026/)*
