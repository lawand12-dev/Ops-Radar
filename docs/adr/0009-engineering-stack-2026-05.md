# ADR 0009 — Engineering Stack Stress-Test (2026-05-26)

> **Status**: accepted (provisional verdict). Re-evaluate every 90 days.
> **Supersedes**: nothing. **Augments** ADRs 0001-0008 with a 2026 evidence-based stress-test.
> **Source research**: `docs/research/2026-05-26-engineering-{runtime,agent-arch,brain,tools}.md`
> **Sibling**: `docs/positioning/identity.md` is the positioning verdict; this doc is the engineering verdict.

---

## TL;DR

OpsRadar's engineering stack is **~81% aligned with 2026 consensus** (avg across 4 layers). No layer needs a rebuild. **8 concrete changes** across the 4 layers would close the gap.

| Layer | Alignment | Top change |
|---|---|---|
| Runtime + orchestration | **85%** | Add composable stop conditions + a `finish` tool |
| Agent architecture | **80%** | A2A Agent Card export + GEPA-style weekly prompt distillation |
| Brain / memory | **90%** *(highest-aligned)* | `brain-compactor` agent before 300+ docs/customer |
| Tools + integrations | **70%** *(lowest-aligned)* | Lazy tool-schema loading + Composio resilience |

**The brain pillar is your strongest engineering moat.** 90% alignment + git-style commit-graph versioning is called out by the research as "real moat, not ceremony."

**The tools layer is the weakest.** Composio is still defensibly the right choice on breadth, but the May 2026 Composio security incident flipped the calculus from "obvious default" to "fine if you own the OAuth apps + have a fallback."

---

## Layer 1 — Runtime + orchestration (85% aligned)

**Source**: `docs/research/2026-05-26-engineering-runtime.md`

### What holds
- **Vercel AI SDK v6** — still the right choice for streaming agent UIs from Next.js. Anthropic's Claude Agent SDK wins for Claude-specific work; OpenAI Agents SDK wins for production multi-agent handoffs. Our use case fits Vercel AI SDK exactly. ([vercel.com/blog/ai-sdk-6](https://vercel.com/blog/ai-sdk-6))
- **Trigger.dev v3** — dedicated long-lived Bun workers, no serverless timeout. `tasks.triggerAndWait` (CP-37 delegation) is the canonical 2026 shape.
- **Fluid Compute, Node 24 LTS, 300s default (15min Pro)** — aligned.
- **Edge runtime** — correctly avoided. Vercel itself recommends migrating Edge → Node for AI workloads.

### What drifted

#### 1. Step caps without composable stop conditions
Today: `stopWhen: stepCountIs(N)` in `src/lib/agents/loop.ts`.
2026 best: `stopWhen: [stepCountIs(N), hasToolCall('finish')]` + a `finish` tool the agent calls when it's actually done.
Impact: every agent run today wastes steps even when the model is done. Cuts token spend.
Effort: ~half day.

#### 2. Two cron systems
Today: Vercel Cron for 28 built-in agents (daily/weekly) + Trigger.dev for hourly custom-employee dispatcher.
2026 best: consolidate. With Trigger.dev already paid for, run **all** crons there — single retry/observability/scheduling surface.
Impact: removes the Vercel-Hobby-daily-cap workaround as architectural debt.
Effort: ~1 day.

### Watch (no action yet)
- **Vercel Workflow** — went public beta May 2026. Eventually likely the boring default; revisit when 15-min Pro cap lifts.

---

## Layer 2 — Agent architecture (80% aligned)

**Source**: `docs/research/2026-05-26-engineering-agent-arch.md`

### What holds
- **Orchestrator-worker (CP-19)** — exact 2026 consensus shape. Cognition's "Don't Build Multi-Agents" only rejects *parallel uncoordinated* sub-agents, not hierarchical delegation.
- **`delegate_to_employee` over `triggerAndWait` (CP-37)** — canonical durable-delegation pattern.
- **Custom employees with chat threads (CP-34)** — exact Notion 3.3 / Lindy 3.0 shape.
- **Approval gates (CP-14)** — aligned. Make Ask the **default** for writes, Auto for reads only ("autonomy earned, not granted").

### What drifted

#### 3. Charter system should compile to A2A Agent Card
Today: CP-39 designed as `CHARTER.md` per agent.
2026 best: keep CHARTER.md as the human-edited source, but **compile to A2A Agent Card JSON** at `/.well-known/agent-card.json` per employee. 150+ orgs including Google, Microsoft, AWS, Salesforce, ServiceNow have adopted the A2A standard ([agent2agent.info](https://agent2agent.info/docs/concepts/agentcard/)).
Impact: free interop with Copilot Studio / Salesforce Agentforce / ServiceNow Now Assist.
Effort: near-zero (generate JSON from existing CHARTER.md frontmatter).

#### 4. System prompts should be versioned files, not template functions
Today: `buildCooSystemPrompt(...)` template functions in code.
2026 best: move static spine to `prompts/<slug>/v<n>.md` files in git, keep template functions as **interpolators**, log the prompt file's git SHA into every Langfuse trace.
Impact: unblocks safe prompt experimentation + rollback.
Effort: ~half day per agent, ~3-4 days total.

#### 5. Apprentice Mode needs GEPA-style distillation
Today: `learn-from-rejection` Trigger.dev task writes a rule to `employees/<slug>/learned-rules/<id>.md` per rejection. **Rules accumulate.**
2026 best: GEPA (ICLR 2026 Oral) — reflective prompt evolution that compiles accumulated rules into a new prompt version, beats RL with ~35× fewer rollouts ([arxiv.org/pdf/2507.19457](https://arxiv.org/pdf/2507.19457)).
Impact: **biggest architectural upgrade in this report.** Moves OpsRadar from "thicker rulebook" to "actually smarter agents." Directly compounds the #1-demand-validated moat (Apprentice Mode).
Effort: ~3-4 days for a weekly Trigger.dev `apprentice-distill` task.

### Pair with HITL waitpoint token for delegate-and-wait flows
Minor enhancement: pair every `triggerAndWait` with a human-releasable waitpoint token so a stuck delegate can be unstuck without killing the parent run.

---

## Layer 3 — Brain / memory layer (90% aligned, highest)

**Source**: `docs/research/2026-05-26-engineering-brain.md`

### What holds (almost everything)
- **3-table Postgres schema (CP-27)** — exact 2026 consensus (Karpathy + Blomfield + Ramp Glass + Anthropic Skills converged on markdown-as-substrate).
- **HNSW partial index on curated paths (CP-35)** — 2026 default; IVFFlat correctly avoided.
- **`text-embedding-3-small`** — safe default; Voyage-3-large is better but switch only if a customer reports a miss.
- **Notion mirror** — correct for non-technical buyers (agencies). Add an optional GitHub-mirror toggle later for technical FO customers.
- **Git-style commit-graph + `author_type` + `agent_run_id`** — **real moat, not ceremony** (matches arXiv 2603.15566 "Lore" spec).
- **No third-party agent-memory infra (Mem0/Letta/Zep)** — correct hold. These are *conversation memory*, orthogonal to a customer-owned knowledge brain.
- **Citation / provenance** — lightweight `author_type` is sufficient outside regulated/scientific workflows.

### What drifted

#### 6. Brain compaction at scale
Today: no compaction layer.
2026 best: hierarchical summary DAG (Factory's 36k-message pattern; ACON 26-54% memory reduction at 95%+ accuracy; Anthropic's `compact-2026-01-12` API).
**This is the single biggest scaling risk in the brain layer.** Architecture silently degrades past ~300-500 docs per customer.
Impact: protects the moat from breaking at the scale we need to reach.
Effort: ~2-3 days for a nightly `brain-compactor` Trigger.dev task that maintains `brain-index.md`.

### Pre-stage (no action yet)
- **Expand embedding coverage to `briefings/` + `agents/<slug>/findings/`** when median customer crosses 200 docs. Cheap, reversible.
- **Voyage-3-large migration** — pre-stage dual-write column. Switch the day a customer reports a missed retrieval. 200M free tokens/account makes the cutover cheap.

---

## Layer 4 — Tools + integrations (70% aligned, lowest)

**Source**: `docs/research/2026-05-26-engineering-tools.md`

This is the layer with the most active risk. Three changes are not nice-to-have — they protect the product.

### What drifted

#### 7. Lazy tool-schema loading
Today: full Composio tool catalog (~60-100 actions × ~200 tokens each) injected into every agent prompt. Token budget kills us at 3+ toolkits.
2026 best: mirror the `load_skill` pattern — inject tool **names + descriptions** only; add a `load_tool_schema(slug)` tool the agent calls on demand. 85-90% token reduction.
Impact: **single biggest token/cost win in the entire stack.** Unlocks "every agent sees every tool" without exploding prompts.
Effort: ~1 day.

#### 8. Composio resilience + own-the-OAuth-apps
Today: Composio owns the OAuth apps; single broker dependency.
2026 reality: **Composio had a material security incident May 21-23, 2026** — unauthorized internal access, pre-22 May API keys deleted, GitHub tokens compromised for a subset, ~100 toolkits' access tokens revoked. Plus auth/CLI/MCP outages May 24-25.
2026 best:
- Register **OpsRadar-owned OAuth apps** with each provider (Stripe, HubSpot, etc.) and configure Composio to use them — preserves "we don't store keys" posture but eliminates re-consent risk on a broker switch
- Add a **circuit-breaker** around `composio.tools.execute` with graceful "broker down — re-queued" UX
- Keep a **Composio-independent fallback** for the 3-4 highest-volume integrations (direct OAuth + raw API to Stripe / HubSpot / Slack)
- Subscribe to `status.composio.dev` webhook → auto-pause automations
- Add a **nightly smoke test per active toolkit** that pages on failure

Impact: protects the product from a single-vendor outage that already happened once this year.
Effort: ~3-5 days for the full resilience pack; ~1 day for the smoke tests + circuit breaker alone.

#### 9. Compensating-action rollback (saga pattern)
Today: if an agent does 3 writes (HubSpot + Slack + Notion) and the second fails, **no rollback**.
2026 best: SagaLLM pattern (arXiv 2503.11951) — record a `compensating_action` per write; on failure run reverse-order compensations.
Impact: silent cross-tool state corruption is a churn time-bomb. Trigger.dev orchestration fits this naturally.
Effort: ~2-3 days in `actions/executor.ts` + `automations/execute.ts`.

### What holds
- **Composio as the broker** — still defensibly the right choice on breadth + Skills-friendly ergonomics, *if* points 7-9 are addressed.
- **CP-39 charter `allowed-tools`** — mirror Anthropic Skills, not Microsoft Copilot Studio's `actions`.
- **OpsRadar-brain-MCP** — keep `/dashboard/settings/mcp` as the customer-facing MCP surface. Don't re-MCP every Composio integration.

---

## The 8 prioritized changes (full list)

Ranked by impact × effort ratio:

| # | Change | Layer | Impact | Effort |
|---|---|---|---|---|
| 1 | **Lazy tool-schema loading** (`load_tool_schema`) | Tools | High | 1 day |
| 2 | **Composable stop conditions** + `finish` tool | Runtime | High | 0.5 day |
| 3 | **A2A Agent Card** auto-generated per employee | Agent arch | High | 0.5 day |
| 4 | **Composio circuit-breaker + smoke tests** | Tools | High | 1 day |
| 5 | **`brain-compactor` agent** (hierarchical `brain-index.md`) | Brain | Medium | 2-3 days |
| 6 | **Consolidate crons to Trigger.dev** | Runtime | Medium | 1 day |
| 7 | **GEPA weekly distillation** (Apprentice Mode v2) | Agent arch | Very High* | 3-4 days |
| 8 | **Compensating-action saga executor** | Tools | Medium | 2-3 days |

*GEPA has the highest **long-term** impact because it compounds the #1-demand-validated moat. Lower urgency than #1-4 because the current Apprentice Mode is already working at low volume.

**Suggested sequence**:
- **CP-40a (1-2 days)**: changes #1, #2, #3 — easy wins, high impact
- **CP-40b (2-3 days)**: change #4 — Composio resilience hardening
- **CP-40c (3-4 days)**: change #5 — `brain-compactor`
- **CP-40d (1 day)**: change #6 — cron consolidation
- **CP-41 (3-4 days)**: change #7 — GEPA distillation (the Apprentice Mode upgrade)
- **CP-42 (2-3 days)**: change #8 — saga executor

Total: ~12-17 engineering days across 6 changepoints. Not a rewrite. Surgical upgrades to a stack that's already 81% right.

---

## What's NOT changing

To prevent scope creep, these were stress-tested and held:

- Vercel AI SDK v6 (vs Claude Agent SDK / OpenAI Agents SDK)
- Trigger.dev v3 (vs Vercel Queues / Inngest — Vercel Workflow GA is the future watch, not a now switch)
- Fluid Compute + Node 24 LTS (vs Edge runtime)
- Orchestrator-worker pattern (CP-19)
- Custom employee shape (CP-34 — chat threads, schedule, scoped tools, scoped brain prefix)
- 3-table Postgres brain schema (CP-27)
- pgvector + HNSW partial index (CP-35)
- `text-embedding-3-small` model (until a real customer miss)
- No third-party agent-memory infra (Mem0/Letta/Zep are conversation memory, not knowledge brain)
- Notion mirror (correct for non-technical buyers)
- Lightweight `author_type` provenance (W3C PROV-AGENT is overkill outside regulated workflows)
- Composio as the broker (with resilience changes above)
- Anthropic Skills `allowed-tools` format for charters

---

## Re-evaluation triggers

Open this doc and re-run the four research streams when **any** of these happens:

1. **A customer reports a brain-retrieval miss** → triggers Voyage-3-large migration
2. **Median customer crosses 200 brain docs** → triggers expanded embedding coverage
3. **Median customer crosses 500 brain docs** → triggers full re-eval (compaction must be live by then)
4. **Composio has another security incident** → re-evaluate broker choice + Pica/Arcade head-to-head
5. **Vercel Workflow Pro 15-min cap is lifted** → re-evaluate Trigger.dev vs Workflow
6. **An A2A-native customer (Salesforce Agentforce / Copilot Studio) inbound** → ship A2A export immediately
7. **90 days from this doc's date** (next: 2026-08-26) — periodic refresh regardless

---

## Evidence trail

- `docs/research/2026-05-26-engineering-runtime.md` — runtime + orchestration (85% aligned)
- `docs/research/2026-05-26-engineering-agent-arch.md` — agent architecture (80% aligned)
- `docs/research/2026-05-26-engineering-brain.md` — brain/memory (90% aligned)
- `docs/research/2026-05-26-engineering-tools.md` — tools/integrations (70% aligned)

Plus the existing decision record:
- `docs/adr/0001-composio-broker.md` through `docs/adr/0008-observability-sentry-statsig-langfuse.md`

Every claim above traces to one of those files.
