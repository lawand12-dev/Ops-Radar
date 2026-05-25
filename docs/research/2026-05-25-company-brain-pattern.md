# Research — Company brain technical pattern (Glean, Karpathy LLM Wiki, Mem0/Letta/Zep, YC RFS #4)

> **Research run date**: 2026-05-25
> **Question**: What is the canonical 2026 technical pattern for a company brain that knows everything?
> **Status**: raw research output — informs the verdict in `docs/positioning/identity.md`.
> **Subagent run id**: `abcd8f9781b0c03f3` (preserved for audit).

---

I have enough evidence. Let me synthesize the findings.

---

# Research Findings: Canonical 2026 "Company Brain" Architecture

## 1. Glean's architecture (hybrid: KG + vector + lexical)

Glean ($270M ARR, 100M+ agent actions/yr) runs a **three-part hybrid**: lexical search + vector embeddings + a per-customer knowledge graph that weighs entity relationships from 100+ connectors. RAG is layered on top of the KG, not the primary substrate. The KG handles normalization, synonymy, entity mining, and permissioning across Slack/Salesforce/Drive/Confluence. See [Glean's hybrid vs RAG post](https://www.glean.com/blog/hybrid-vs-rag-vector), [Glean knowledge graph guide](https://www.glean.com/resources/guides/glean-knowledge-graph), and [Futurum on Glean's $200M ARR / $7.2B valuation](https://futurumgroup.com/insights/glean-doubles-arr-to-200m-can-its-knowledge-graph-beat-copilot/).

## 2. Karpathy's LLM Wiki (April 3, 2026)

**Plain-text markdown wiki, git-versioned, LLM-maintained at ingest time, not query time.** Karpathy's own wiki is ~100 docs / 400k words. Pattern: clean split of `Raw / Wiki / Schema`; the LLM updates entity pages, revises summaries, flags contradictions on each ingest. Explicitly *not* RAG — the synthesis happens before the query, not during. See [Karpathy's gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) and [MindStudio explainer](https://www.mindstudio.ai/blog/andrej-karpathys-llm-wiki-knowledge-base-claude-code).

## 3. Agent-memory infra (Mem0 / Letta / Zep / LangMem)

On the LongMemEval benchmark: **Zep 63.8% vs Mem0 49.0%** (GPT-4o). Zep's Graphiti is graph-first with `valid_at`/`invalid_at` temporal edges; Mem0 is extraction-first into a vector store with optional graph promotion; Letta = MemGPT in prod with pluggable backends; LangMem = LangChain default. Mem0 has the biggest community ($24M Series A, 48k stars); Zep wins on temporal/relational queries. See [AgentMarketCap landscape](https://agentmarketcap.ai/blog/2026/04/10/agent-memory-vendor-landscape-2026-letta-zep-mem0-langmem), [Mem0 vs Zep on Vectorize](https://vectorize.io/articles/mem0-vs-zep), [Mem0's State of Agent Memory 2026](https://mem0.ai/blog/state-of-ai-agent-memory-2026).

## 4. Notion Custom Agents (1M+ shipped since Feb 2026)

**Strict least-privilege architecture** — agents only see explicitly-granted DBs/pages. Notion explicitly states: "an AI agent is only as intelligent as the data structure it sits on top of." Notion's own messaging: a clean relational system lets agents retrieve deterministically; a messy workspace forces wide search and burns credits. See [TechCrunch on Notion 3.0](https://techcrunch.com/2026/05/13/notion-just-turned-its-workspace-into-a-hub-for-ai-agents/) and [Notioner's deep dive](https://notioners.com/blogdb-1/a-deep-dive-into-notion-custom-agents-welcome-to-the-era-of-autonomous-work).

## 5. MCP-as-company-brain

The most-requested missing MCP integration in 2026 is **native knowledge-base access**. Cognee MCP exposes a Graph-RAG brain; Obsidian, Notion, and Jean Ibarz's KB MCP are the canonical implementations. No published "company-brain MCP spec" yet — but the pattern (memory MCP that gives agents a persistent structured brain) is emerging fast. See [MCP ecosystem 2026](https://codeongrass.com/blog/mcp-server-ecosystem-integration-layer-ai-agents-2026/), [awesome-mcp-servers KB list](https://github.com/TensorBlock/awesome-mcp-servers/blob/main/docs/knowledge-management--memory.md).

## 6 + 7. YC RFS #4 "Company Brain" + the four-builder convergence

Tom Blomfield (YC) named the pattern in S26 RFS: a system that pulls knowledge from Slack/email/tickets/heads, **structures it, keeps it current, turns it into an executable skills file for agents**. Crucially: he says **build it vertically first** (support teams first, then expand) — *not* "company brain for everyone." See [YC RFS](https://www.ycombinator.com/rfs) and [The Founders Corner breakdown](https://www.the-founders-corner.com/p/yc-just-told-you-exactly-where-to).

Karpathy + Garry Tan (GBrain) + Hannah Stulberg + Ramp's Glass + YC RFS #4 all landed on the **same five-pattern stack**: markdown in git, RESOLVER.md routing, skills as version-controlled units, write-back discipline (answers refile to wiki), context-compute separation (substrate stable; model swappable). Explicitly rejects "chat-on-top-of-documents" (Notion/Confluence-style RAG). See [Lockey's "four builders, one architecture"](https://www.alexlockey.com/writing/the-company-brain-four-builders-one-architecture/) and [Cognition's writeup](https://www.cognitionus.com/blog/what-is-the-karpathy-llm-wiki-pattern).

## Vertical vs horizontal evidence (Q3)

**Vertical wins on revenue velocity:** Harvey $11B / $190M ARR (legal), Sierra $150M ARR (CX), Decagon $4.5B / ~$35M ARR (CX), Abridge $5.3B (clinical). Horizontal: Glean $270M ARR, Notion's 1M custom agents — but Glean is enterprise *search*, not "workforce." BOND is the closest horizontal "AI Chief of Staff" comp with no published ARR. The 2026 consensus from multiple analysts: "vertical specialization wins" and **enterprises are consolidating AI vendors at 2% IT-budget growth**. See [The AI Insider on vertical GTM 2026](https://theaiinsider.tech/2026/01/17/guest-post-three-gtm-challenges-killing-vertical-ai-startups-in-2026-and-why-market-shaping-gtm-solves-all-of-them/) and [Harvey playbook](https://www.startupriders.com/p/harvey-ai-growth-playbook).

---

## Synthesis

**Q1 — 2026 consensus architecture for "company brain that knows everything":**
Markdown-in-git as the substrate + ingest-time LLM synthesis (not query-time RAG) + RESOLVER.md routing + skills as units + write-back loop. RAG/vector/graph layers are *optional retrieval accelerators* for scale, not the brain itself. Glean's KG+hybrid is the *enterprise-search* shape; Karpathy/Ramp/YC RFS is the *agent-executable brain* shape. They are different problems.

**Q2 — Does OpsRadar's path hold?**
**Yes, on the hot path.** Versioned markdown in Postgres + Notion mirror with hand-shaped paths (pattern-cards/, decision-log/) maps exactly to Karpathy + YC RFS #4 + Ramp's Glass. The Anthropic Skills layer (already shipped in CP-17) is the executable-skills-file half. **Trigger to add retrieval:** when a single agent prompt blows the context window — Karpathy's own wiki sits at ~100 docs / 400k words with no retrieval, so 100 documents is *not* the trigger. Add a thin BM25/keyword index over the brain at ~500 docs or ~2M words, not embeddings; jump to Zep/Graphiti-style temporal graph only if cross-tool temporal reasoning becomes the bottleneck.

**Q3 — Horizontal vs vertical:**
**Evidence strongly favors vertical or vertical-shaped-horizontal.** The pure-horizontal $100M+ ARR examples (Glean, Notion AI) are *search/workspace primitives*, not workforce replacement. The $100M+ ARR "AI workforce" examples are all vertical (Harvey, Sierra, Decagon, Abridge). Blomfield himself says "build it vertically first." OpsRadar's "marketing agencies / services firms" wedge is the *correct* shape.

**Q4 — Shape of a winning "horizontal-ish" play:**
(a) Pick one industry vertical as wedge with **deep operator judgment baked in** (the CP-21 senior-COO playbook is the moat); (b) breadth across **~20-30 tools** (Glean has 100+ but that's enterprise scale; for SMB-services 30 is enough); (c) usage-based or seat+usage pricing — not pure seat (Sierra's $150M ARR is conversation-priced); (d) distribution via **agency networks / fractional-COO referrals**, not paid search. The brain (Notion-owned + git-versioned) is the **churn-protection moat**, not the wedge — customer keeps the brain even if they leave, which earns the trust to expand.
