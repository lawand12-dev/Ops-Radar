# How We Build the 4 YC Categories — With Automation/n8n as the Execution Thread

*Written 2026-05-22. The unified engineering plan that simultaneously delivers all four YC RFS categories OpsRadar targets (#2 AI-Native Service Companies, #4 Company Brain, #12 Software for Agents, #15 AI OS for Companies). Companion to [`build-architecture.md`](./build-architecture.md) — that doc is the chatv2 technical plan; this doc is the YC-category mapping with n8n surfaced as the execution thread.*

> **The unifying insight:** the same 8-sprint engineering sequence delivers all 4 YC categories. We don't pick categories — we build one coherent system that simultaneously satisfies all four. **n8n is the body. The COO agent is the brain. chatv2's chat-to-workflow generation is the spinal cord. OpsRadar is the entire nervous system for an agency.**

---

## Why n8n is central, not incidental

The COO agent **observes and reasons** (the brain). Automation **acts** (the limbs). Without an execution layer, OpsRadar is a smart dashboard that tells you what's wrong. With n8n, it's a fractional COO that actually executes — sends the invoice reminder, updates the deal stage, adjusts the retainer, fires the margin alert email.

This is the entire point of replacing a $10K/month fractional COO. A human COO doesn't just *notice* problems — they *act on them*. The automation layer is what makes OpsRadar's "AI COO" claim defensible vs every dashboard product on the market.

**Architectural rule:** each customer runs their own n8n instance (per-user encrypted API key). chatv2 generates + deploys workflows to it. The customer **owns their workflows forever**, even if they leave OpsRadar. This is a moat and a trust differentiator vs ClickUp Super Agents (locked to ClickUp's workspace).

### Internal language vs external language

| Internal (this doc, eng, architecture) | External (customer copy, marketing, application) |
|----------------------------------------|-------------------------------------------------|
| n8n | "your workflow engine" or just "actions" |
| automation | "what to do next" or "agentic actions" |
| chatv2 | nothing — never surfaced |
| chat-to-automation generation | "describe what you need; OpsRadar builds it" |
| workflow JSON | "a custom workflow we built for your agency" |

Per [CLAUDE.md](../../CLAUDE.md) voice rules: **never surface n8n in customer copy.** The implementation detail is invisible — exactly like Stripe is invisible behind your checkout flow. YC partners are sophisticated enough to ask "what's your execution layer?" — the credible answer is *"n8n on each customer's own infrastructure; we generate and deploy workflows to it; they own them forever."*

---

# #2 — AI-Native Service Companies

**YC framing:** *"Replace an entire professional service with software + AI."*

## What we replace
The $10K/month fractional COO function — 4 hours/week of pattern recognition over Stripe + HubSpot + Harvest + ClickUp data, surfacing 3-5 decisions per week. OpsRadar does the same thing 24/7 at $750-$3,000/month with strictly tighter cycle time **and** actually executes the decisions through n8n.

## The code that delivers it

- `src/lib/coo/tools.ts` — 5 read tools (`get_finance`, `get_sales`, `get_profitability`, `get_capacity`, `get_scope`) + `queue_action` (the bridge to n8n)
- `src/lib/coo/executor.ts` — multi-pass agent loop (PLAN → CRITIQUE → GENERATE → VALIDATE → REPAIR)
- `src/app/api/dashboard/coo/route.ts` — SSE streaming, max 5 tool iterations, temperature 0.2
- `src/app/dashboard/coo/_components/coo-chat.tsx` — streaming UI + inline action confirmation cards
- HITL escalation rules in **typed code** (per Loop 5) — never in prompts

## The automation thread

When the COO agent surfaces an action like *"Send invoice reminder to Client B for $4,200 overdue (35 days)"*:

```
Agent proposes (with reasoning + confidence)
        ↓
Owner clicks Confirm in the inline card
        ↓
chatv2 dispatches to the customer's own n8n instance
(per-user encrypted API key, no cross-tenant access)
        ↓
n8n workflow executes (Stripe API call + email send via the customer's
own configured provider)
        ↓
Outcome event posted back to chatv2 → workflow_events table
        ↓
COO Brain learns: "Owner confirmed, action took 4s, invoice paid 3 days later"
```

Without the n8n leg, the agent is advisory. With it, OpsRadar replaces the fractional COO function end-to-end.

## Sprint
**Sprint 1** — already specced in `docs/dev/specs/2026-05-21-coo-agent-design.md`

## Demo-day proof
Sean Horton (Swish Advertising) paying $750-$3K/month for what was previously a fractional COO function. Live screen-share of the COO agent surfacing a margin alert, the owner confirming, the n8n workflow executing on Swish Ad's own infrastructure, the outcome logged in the OpsRadar brain.

---

# #4 — Company Brain

**YC framing:** *"A persistent knowledge layer that pulls from every tool and keeps itself current."*

## What we build — the 3-tier hybrid GraphRAG

```
Tier 1 — STATIC KNOWLEDGE (Supabase pgvector)
   Playbooks, benchmarks, frameworks, agency-vertical patterns
   → "What does a typical scope-creep playbook look like?"
   → Refreshed when knowledge-base/ changes (rare)

Tier 2 — LIVE KNOWLEDGE GRAPH (in-memory, per request)
   Built from live integration fetches every request
   Nodes: clients, projects, deals, invoices, retainers, team members
   Edges: "client X has retainer Y", "project Z over budget Y%"
   NEVER persisted — respects the no-client-data architectural rule
   → "Which clients share an account manager who's over capacity?"

Tier 3 — OUTCOME + DIORIZATION MEMORY (Supabase, per-tenant)
   - Every confirmed/rejected action logged with reasoning + n8n outcome
   - Diorized breadcrumbs from Slack/email/meeting ingestion
   - Pattern cards extracted from breadcrumbs (refreshed monthly)
   - Living brief — the agency's queryable state-of-knowledge
   → "Last time owner X considered firing client Y, what happened?"
```

## The automation thread

The Brain isn't just data — it's **outcomes**. Outcomes come from n8n executions that actually fired. Every n8n run posts an event back to chatv2, which feeds into the per-tenant memory tier. That's how the Brain *learns* vs just storing.

Additionally: **diorization runs ON n8n** — the Slack/email/meeting ingestion workflows are scheduled n8n jobs on the customer's own infrastructure. Customer data is processed on customer-controlled compute; only the synthesized breadcrumbs come back to OpsRadar.

## The code that delivers it

- `src/lib/knowledge-retrieval.ts` — vector retrieval replacing today's file walker
- `src/lib/coo/graph-builder.ts` — NEW, builds live KG per request
- `chatv2/src/modules/diorization/{slack,gmail,zoom-transcript}.ts` — ingestion adapters (deployed as n8n workflows on customer infra)
- `chatv2/src/modules/diorization/synthesizer.ts` — LLM-based breadcrumbs + dedup
- Migrations: `015_kb_embeddings`, `016_coo_outcomes`, `017_breadcrumbs`, `018_pattern_cards`, `019_living_brief`

## Sprint
**Sprints 2-3 + 6** (vector tier, outcome memory tier, diorization tier in that order)

## Demo-day proof
A customer agency's **living brief** rendered in their dashboard, showing patterns the system extracted from their actual operational data: *"Client B has a pattern of Q4 scope expansion (3 of last 3 years); current Q4 trajectory matches; flag now."* Generic company brains can't produce this — they have no agency context. Plus: every pattern card cites the n8n executions and Slack breadcrumbs it was derived from (full provenance, customer-auditable).

---

# #12 — Software for Agents

**YC framing:** *"Infrastructure for AI agents: MCP servers, tool registries, orchestration."*

## What we ship

A **separately-deployed, OAuth 2.1-secured MCP server** at `mcp.opsradar.com` that exposes OpsRadar's capabilities to external agents (Claude Desktop, ChatGPT, partner agency agents).

## The MCP tools — including the killer feature

| Tool | Scope | What it does |
|------|-------|--------------|
| `opsradar.get_finance` | `finance:read` | Live Stripe fetch |
| `opsradar.get_profitability` | `profitability:read` | Per-client margins |
| `opsradar.get_capacity` | `capacity:read` | Utilization % |
| `opsradar.get_scope` | `scope:read` | Scope creep signals |
| `opsradar.search_kb` | `kb:read` | Query the Company Brain |
| `opsradar.propose_action` | `actions:write` | HITL-gated; never auto-executes; triggers an n8n workflow on owner confirmation |
| **`opsradar.generate_workflow`** | **`workflows:write`** | **External agents DESCRIBE a workflow in natural language; chatv2 generates the n8n JSON, validates, and deploys to the customer's own n8n on owner confirmation** |

**The killer tool is the last one.** chatv2 already has chat-to-automation generation (Atta built it; Sean Horton has the "Noise-Cancelling Recruitment Supply Chain" workflow live in his n8n right now). When that's MCP-exposed, **OpsRadar isn't just queryable by external agents — it's programmable by external agents.**

No PSA tool in 2026 can do this. ClickUp Super Agents is closest, but locked to ClickUp's workspace. OpsRadar deploys to the **customer's own n8n** — they own the workflows forever.

## Security architecture (the 41% gap)

41% of MCP servers in 2026 ship with NO authentication. OpsRadar leads on this:
- **OAuth 2.1**, per-tenant scoped tokens, 1h expiry, refresh rotation
- Zero-trust: re-validate JWT signature + scope on every tool call
- Audit log: every invocation → `mcp_invocations` table with caller + scope + tenant + result
- Per-tool scopes (not blanket access)
- Rate limits per-tenant per-tool in Upstash Redis
- **`generate_workflow` includes the existing workflow validator** — blocks unsafe node types (command execution / file write / ssh / code nodes) even when initiated by an external agent

## The code that delivers it

- **Separate Vercel deployment** (`apps/mcp-server/`) — Hono on Fluid Compute
- Supabase Auth (GoTrue) as the OAuth 2.1 issuer
- chatv2 backend reused as the `generate_workflow` engine
- Migrations: `020_mcp_oauth_clients`, `021_mcp_invocations`

## Sprint
**Sprint 4** — after the multi-pass agent (Sprint 1), tenant isolation (Sprint 2), and event bus (Sprint 3) are proven

## Demo-day proof
**Live Claude Desktop session** during the YC interview:
1. Install OpsRadar from the public MCP registry
2. Ask Claude *"What's my profitability on Client B this month?"* → Claude queries OpsRadar via MCP, returns the answer with reasoning
3. Ask Claude *"Build me a workflow that posts to #revenue when any Stripe invoice goes overdue 14+ days"* → Claude calls `opsradar.generate_workflow`, OpsRadar shows the proposed n8n workflow JSON in the dashboard, owner confirms, workflow deploys to their own n8n

**No competitor in 2026 can demonstrate this end-to-end flow.**

---

# #15 — AI OS for Companies

**YC framing:** *"Continuously updated intelligence layer that recommends and acts."*

## What we build — event-driven supervisor/worker architecture

```
               INNGEST EVENT BUS
       events: integration.synced,
               metric.threshold-crossed,
               action.confirmed,
               n8n.execution.completed,
               kb.gap-detected
                      ↓
       ┌──────────────┼──────────────┬───────────────┐
       ▼              ▼              ▼               ▼
 [Supervisor]   [Margin Watcher] [Scope Watcher] [Cash Flow Watcher]
 (chat input)   (cron + events)  (cron + events) (cron + events)
       │              │              │               │
       └──────────────┴──────────────┴───────────────┘
                            ↓
              Action Queue (Supabase agent_actions)
                            ↓
                    HITL confirmation
                            ↓
              n8n workflow execution on customer infra
                            ↓
                    Outcome event posted back
                            ↓
                  COO Brain learns (Loop 3 feedback)
```

## The 5 recursive loops on top

Per [`../ai-native-company-2026.md`](../ai-native-company-2026.md), 5 loops make the AI OS *compound* rather than *plateau*:

1. **Autonomous engineering** — diagnose/author/reviewer agents that ship PRs to the KB **and to the n8n workflow template library** (never the kernel)
2. **Diorization** — feeds the Company Brain (#4) via n8n scheduled ingestion workflows on customer infra
3. **Disposable software, permanent data** — regenerate n8n workflows when models improve; preserve the original natural-language prompt forever
4. **Token-maxing metrics** — revenue per token, cost per repair, n8n executions per outcome
5. **Human at the edge** — typed escalation rules; routine n8n executions → AI auto-fires, novel → AI + review, high-stakes → human only

## The automation thread (this is where n8n is most load-bearing)

Every recursive loop in the AI OS terminates in an n8n execution. The Brain proposes; n8n acts; outcomes feed back; the Brain learns.

**The disposable software loop is the most interesting application of n8n.** When Claude Sonnet 5 ships in (e.g.) August 2026, OpsRadar can regenerate every customer's deployed n8n workflows from the original natural-language prompts — better generated JSON, same intent, no engineering effort. Each customer gets a "Your margin alert workflow has a smarter version. Replace? [Compare] [Yes] [No]" notification. **The customer's value compounds with model progress, not engineering effort.** No PSA tool offers this.

## The code that delivers it
- `src/inngest/*.ts` — supervisor + worker functions
- `src/lib/escalation-rules.ts` — typed escalation thresholds (not prompts!)
- Langfuse middleware on every agent call
- Migrations for `agent_runs`, `escalation_log`, `autonomous_actions`

## Sprint
**Sprint 1 foundation (Langfuse + Inngest) → Sprints 5-8 (the 5 loops layered on)**

## Demo-day proof
A **24-hour timelapse** showing OpsRadar autonomously: detecting a margin alert at 3am → proposing the reprice action with reasoning → owner confirms at 9am → n8n workflow on the customer's infra executes the reprice → outcome logged → the Brain learns. Plus: the autonomous engineering loop having shipped 3 new n8n workflow templates to the pattern library overnight without human intervention.

---

# The unified 8-sprint sequence — earning all 4 categories with n8n threaded through

| Sprint | Ship | YC category earned | n8n element |
|--------|------|---------------------|-------------|
| **1** | Multi-pass COO agent (PLAN→CRITIQUE→GENERATE→VALIDATE→REPAIR) + Langfuse | **#2** ✓ | `queue_action()` fires n8n workflows on owner confirmation |
| **2** | KB embeddings (pgvector) + envelope encryption + tenant isolation tests in CI | **#4** (tier 1) | Per-tenant n8n API keys upgraded to envelope encryption (KEK/DEK pattern) |
| **3** | Outcome memory tier + golden-set regression suite + Inngest event bus | **#15** (foundation) | n8n execution events fed back into outcome memory loop |
| **4** | OpsRadar MCP server + OAuth 2.1 + `generate_workflow` tool | **#12** ✓ | **External agents can deploy n8n workflows via OpsRadar through MCP** |
| **5** | Margin/Scope/Cash Flow watcher Inngest workers + typed escalation rules | **#15** (workers) | Workers trigger pre-built n8n templates (no LLM call for known patterns) |
| **6** | Diorization pipeline (Slack + email + meeting ingestion → breadcrumbs → living brief) | **#4** ✓ | Diorization runs ON n8n on customer infra (data never leaves customer compute) |
| **7** | Prompt versioning + model tracker + regeneration offer flow (disposable software loop) | **#15** (loop 3) | **When models improve, regenerate the customer's n8n workflows from the original NL prompt** |
| **8** | Autonomous engineering loop — diagnose/author/reviewer agents shipping PRs to KB | **#15** ✓ (full) | Diagnose agent generates new n8n workflow templates for the pattern library |

**By Sprint 4 we have evidence for all 4 categories. By Sprint 8 we have all 4 fully delivered + the 5 compounding loops running in production.**

---

# The single architectural rule

> Every shipped feature must serve **more than one YC category** or it doesn't ship.

The MCP server isn't just for #12 — it's the API surface the Brain (#4) exposes to external agents and the way external agents trigger n8n workflows (#2 + #15). The diorization pipeline isn't just for #4 — it's n8n schedules on customer infra (#15 actuator) and the data substrate the autonomous engineering loop (#15 loop 1) trains on. The COO agent isn't just for #2 — it's the demo consumer for #4 (Brain query), #12 (MCP target), and #15 (event-bus supervisor).

**One coherent system. Four YC categories. n8n as the execution thread. Eight sprints.**

---

# The single sentence that ties it together

> **n8n is the body. The COO agent is the brain. chatv2's chat-to-workflow generation is the spinal cord. OpsRadar is the entire nervous system for an agency — observing, reasoning, acting, and learning from every action it takes.**

That's what we're building. That's why the 4 YC categories converge instead of conflicting. The execution layer (n8n) is what makes every other category land.

---

# Cross-references

- [`build-architecture.md`](./build-architecture.md) — chatv2 technical strengthening plan
- [`research-addendum.md`](./research-addendum.md) — market validation for the 4 categories
- [`what-yc-wants.md`](./what-yc-wants.md) — application drafting guide
- [`founder-profile.md`](./founder-profile.md) — team profile
- [`traction-evidence.md`](./traction-evidence.md) — real customer + investor pipeline
- [`../architecture-2026.md`](../architecture-2026.md) — full chatv2 sprint plan
- [`../ai-native-company-2026.md`](../ai-native-company-2026.md) — the 5 recursive loops
- [`../software-3-engineering-2026.md`](../software-3-engineering-2026.md) — Karpathy framework + Program MD
- [`../build-methodology-2026.md`](../build-methodology-2026.md) — GStack for OpsRadar
- [`../strategy/path-a-strategy-2026.md`](../strategy/path-a-strategy-2026.md) — master strategy

---

*Locked 2026-05-22. The build plan. n8n threaded through every category.*
