# Research — Shared multi-agent knowledge layer (2026 state of the art)

> **Research run date**: 2026-05-26
> **Question**: How do production multi-agent systems share a single, growing company-knowledge layer across N specialist agents in 2026 — so every agent gets smarter as all the others learn? Is OpsRadar's "28 agents read/write one brain" actually a moat or table stakes?
> **Status**: raw research output — the verdict it drove is in `docs/positioning/identity.md` (sharpened moat phrasing) and ADR 0009 (read-before-act discipline + lightweight references + consolidation dedup).
> **Subagent run id**: `afb25bc37fa087ff1`

---

I have enough citation-backed evidence to deliver a rigorous answer. Compiling the final response now.

---

# Shared Multi-Agent Memory: 2026 State-of-the-Art

## Q1 — Canonical 2026 pattern for shared multi-agent knowledge

**There is no single canonical pattern. The field is openly split into two camps:**

- **Anthropic camp (orchestrator + shared filesystem):** Lead agent saves plan to memory; subagents run in parallel, **write findings to a shared filesystem, return only lightweight references**; orchestrator pulls details on demand. Outperforms single-agent Opus 4 by **90.2%** on research evals. [How we built our multi-agent research system — Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system)
- **Cognition camp ("Don't Build Multi-Agents"):** Parallel agents making independent decisions produce inconsistent results because "actions carry implicit decisions." Their recommendation is **single-threaded agents with context compression**; if you must parallelize, pass the **whole conversation history trace** to every sub-agent. [Don't Build Multi-Agents (HN discussion)](https://news.ycombinator.com/item?id=45096962) · [Cognition vs Anthropic comparison](https://news.smol.ai/issues/25-06-13-cognition-vs-anthropic)
- **Revived blackboard pattern:** arXiv 2510.01285 (Sep 2025, updated Jan 2026) — central agent posts requests to a shared blackboard; subordinate agents volunteer to respond. Explicitly designed as an alternative to "rigid master-slave" orchestration. [arXiv 2510.01285](https://arxiv.org/abs/2510.01285)
- **Skills-as-prompt-overlay** (OpsRadar's current pattern) is Anthropic's published spec, orthogonal to memory — see system prompt section of multi-agent system blog.

## Q2 — What production products actually ship shared knowledge

| Product | Shared knowledge across agents? | Mechanism |
|---|---|---|
| **Anthropic Claude Research** | Yes | Subagents write to shared filesystem; orchestrator reads pointers. [src](https://www.anthropic.com/engineering/multi-agent-research-system) |
| **Cognition Devin Managed Devins** | **No state sharing during run** — each Managed Devin gets a "clean slate, narrow focus." But the orchestrator **reads full trajectories after they finish** and uses that to improve next decomposition. [src](https://cognition.ai/blog/devin-can-now-manage-devins) |
| **OpenAI Agents SDK handoffs** | Yes by default — receiving agent sees **entire prior conversation history**. Configurable via `input_filter` or `nest_handoff_history`. [Handoffs docs](https://openai.github.io/openai-agents-python/handoffs/) |
| **LangGraph supervisor** | Yes — all nodes share a single `StateGraph` state object; recommendation is nested TypedDicts with clear per-agent ownership. PostgresSaver for prod. [src](https://eastondev.com/blog/en/posts/ai/20260424-langgraph-agent-architecture/) |
| **CrewAI** | Yes — "all agents in the crew share the crew's memory unless an agent has its own"; LLM-driven extraction, consolidation_threshold=0.85 dedup. [Memory docs](https://docs.crewai.com/en/concepts/memory) |
| **Lindy 3.0 "Talk with Other Lindy"** | Message-passing only via `Agent Message Received` trigger; no native shared memory store — agents communicate as if they were external systems. [src](https://docs.lindy.ai/skills/by-lindy/talk-with-other-lindy) |
| **Notion 3.0 Custom Agents** | Yes — "Agent has memory stored as pages and properties... a state-of-the-art memory system (using Notion pages and databases)." Agents share workspace pages. [Custom Agents](https://www.notion.com/help/custom-agents) · [Notion 3.0 launch](https://www.notion.com/releases/2025-09-18) |
| **Glean Enterprise Graph** | Yes — single per-customer knowledge graph; all agents query it. $200M ARR / $7.2B valuation explicitly built on this. [Glean knowledge graph](https://www.glean.com/resources/guides/glean-knowledge-graph) · [Futurum](https://futurumgroup.com/insights/glean-doubles-arr-to-200m-can-its-knowledge-graph-beat-copilot/) |

**Verdict: shared cross-agent knowledge is now table stakes in 2026, not a moat.** Glean, Notion, CrewAI, LangGraph, OpenAI SDK, and Anthropic all ship it.

## Q3 — Is OpsRadar's "28 agents read/write one brain" the right architecture, or a known failure mode?

**Mixed — the pattern is correct but has documented scale failures:**

- **Definition conflicts** are the #1 documented multi-agent-memory failure in production: "two agents derived from different definitions of 'revenue,' held in two isolated memory stores" — but the inverse (one store, ambiguous schema) produces the same conflict. [Cogent failure playbook](https://cogentinfo.com/resources/when-ai-agents-collide-multi-agent-orchestration-failure-playbook-for-2026)
- **14 documented failure modes** across spec/design, inter-agent misalignment, task verification. Memory-related failures were the **most-reported reliability issue** in 2025–2026 production deployments. [Mem0 State of Agent Memory 2026](https://mem0.ai/blog/state-of-ai-agent-memory-2026)
- Cognition's specific warning applies directly: "**sub-agents have no context of each other's work**" is the failure mode — OpsRadar's pattern (every agent reads brain before acting) is exactly the prescribed fix, **provided** the receiving agent actually queries the brain on every meaningful turn.

**Riley-reads-Cole's-payment-notes is architecturally correct**, matching Anthropic's shared-filesystem + Notion's pages-as-memory + Glean's KG pattern. The failure mode is **not the architecture; it's the discipline**: schema drift, stale entries, and conflicting writes at 1.4M interactions.

## Q4 — "Every agent knows the company through the shared brain" — verifiable claim or hand-waving?

**Hand-waving as stated.** The claim is true of:
- Notion 3.0 Custom Agents (same workspace, native) — [src](https://www.notion.com/help/custom-agents)
- Glean (single Enterprise Graph) — [src](https://www.glean.com/product/enterprise-graph)
- CrewAI crews (shared memory by default) — [src](https://docs.crewai.com/en/concepts/memory)
- Anthropic Research (shared filesystem) — [src](https://www.anthropic.com/engineering/multi-agent-research-system)

**What IS defensible and OpsRadar-specific:** *vertical-tuned* schema (Notion DBs structured for agency-COO judgment), *signed-by-author-agent* provenance (most competitors lack this), versioning, and the **28-agent specialization × shared brain combination**. Verifiable phrasing: "Penny (profitability) cites Cole's (collections) entries when projecting cash — and you can see the citation."

## Q5 — Two patterns to steal from production winners

1. **Anthropic's "lightweight references, not full payloads":** Subagents write full findings to filesystem and return only **pointers**. Orchestrator pulls on demand. This is the difference between 200k-token context blowouts and clean composition. Apply to OpsRadar by having tool agents return Notion page IDs + a 1-line summary, not the synthesized findings inline. [src](https://www.anthropic.com/engineering/multi-agent-research-system)
2. **CrewAI's consolidation_threshold=0.85 + LLM-arbitrated dedup:** Before any agent writes to the brain, check semantic similarity to existing entries; if >0.85, LLM decides merge vs supersede vs new. Directly addresses the 1.4M-interaction definition-conflict failure mode. [src](https://docs.crewai.com/en/concepts/memory)

**Bonus (GEPA, ICLR 2026 Oral):** Reflective prompt evolution outperforms RL fine-tuning by up to 19pp with **35x fewer rollouts** — applicable to compound systems and multi-agent. Use to evolve each of the 28 agents' system prompts based on real brain interactions. [arXiv 2507.19457](https://arxiv.org/abs/2507.19457)

---

## Bottom-line for OpsRadar

The shared-brain architecture is **correct in shape** but **not novel in 2026** — Notion, Glean, CrewAI, LangGraph, Anthropic, OpenAI SDK all ship it. The honest moat is not "we have a shared brain" but **"28 agency-specialist agents, signed provenance, agency-vertical schema, customer-owned Notion mirror."** The Cognition warning (sub-agents lack peer context) is real and OpsRadar's pattern is the prescribed fix — but only if the read-before-act discipline is enforced in every prompt, not just stated in marketing.

Not found: direct Reddit/G2 quotes complaining "my Lindy doesn't remember other Lindys" (search returned only general Lindy reviews, no specific cross-agent memory complaints).
