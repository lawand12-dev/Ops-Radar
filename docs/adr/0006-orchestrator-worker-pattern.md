# Domain agent orchestration — research + fix plan (May 2026)

**Status**: research complete, fix not yet applied.
**Trigger**: post-CP-18 audit revealed the 10 domain agents (`revenue`, `collections`, `scope`, `delivery`, `briefing`, `profitability`, `team`, `growth`, `renewal`, `stack`) were written as **standalone synthesizers** — each one re-discovers data the new tool agents already pulled. That duplicates work, burns tokens, and (per Cognition's published failure mode) causes inconsistent decisions.

This doc captures the research and the proposed re-architecture so the change is defensible.

---

## 1. The current shape (post-CP-18, May 2026)

| Layer | Count | Examples | Role |
|---|---|---|---|
| Domain agents | 10 | revenue, collections, scope, delivery, briefing, profitability, team, growth, renewal, stack | Cross-tool synthesis — supposed to look at MRR + pipeline + delivery + team together |
| Tool agents | 17 | tool-stripe, tool-hubspot, tool-pipedrive, tool-gmail, tool-clickup, tool-harvest, tool-notion, tool-slack, … | One per integration — specialized, narrow, deep |
| Evaluator | 1 | evaluator | Quality audit of every other agent's proposed actions |

**Problem**: domain agent prompts say "Pull MRR from Stripe; pull deals from HubSpot; pull hours from Harvest" — but `tool-stripe`, `tool-hubspot`, `tool-harvest` already ran 1–6 hours earlier the same day and wrote their findings to Notion. The domain agent is doing the work again from scratch and has no awareness that the tool agents exist.

This is the canonical **Cognition "Flappy Bird" failure** described below.

---

## 2. What the field actually does (2025–2026)

### Anthropic — orchestrator-worker IS the published pattern

- **["Building Effective Agents"](https://www.anthropic.com/research/building-effective-agents)** — describes orchestrator-workers abstractly: a lead LLM "dynamically breaks down tasks, delegates them to worker LLMs, and synthesizes their results." Does not prescribe coordination via shared memory vs direct return.
- **["How we built our multi-agent research system"](https://www.anthropic.com/engineering/multi-agent-research-system)** — the production blueprint:
  - Subagents return findings to the LeadResearcher through conversation context.
  - The lead ALSO writes to external memory for durability: *"The LeadResearcher begins by thinking through the approach and saving its plan to Memory to persist the context"* (used when context exceeds 200k tokens).
  - Orchestrator+subagents (Opus 4 lead + Sonnet 4 workers) outperformed solo Opus 4 by **90.2%** on research tasks.
  - **#1 production failure mode**: duplicate work from underspecified subagent prompts. Fix: mandate 4 fields per subagent prompt — **objective, output format, source guidance, task boundaries**.

**Implication for OpsRadar**: domain agents should treat tool agents as their workers AND read Notion as their durable memory. Don't pick one — Anthropic does both.

### Cognition — "Don't Build Multi-Agents" (the other side)

- **["Don't Build Multi-Agents"](https://cognition.ai/blog/dont-build-multi-agents)** (Walden Yan, Cognition, June 2025) gives two non-negotiable principles:
  1. *"Share context, and share full agent traces, not just individual messages"*
  2. *"Actions carry implicit decisions, and conflicting decisions carry bad results"*
- The famous "Flappy Bird" failure: subagent A built a Mario background while subagent B built a non-game bird — neither had the other's context. ([HN discussion](https://news.ycombinator.com/item?id=45096962))

**Resolution**: Cognition is right that *parallel subagents without shared context fail*. Anthropic is right that *parallel subagents with disciplined context engineering succeed*. The bridge is **Notion-as-trace**: domain agents must READ recent tool-agent outputs from Notion before synthesis, not re-fetch.

### Blackboard pattern — now has a 2025 measurement

**["LLM-based Multi-Agent Blackboard System"](https://arxiv.org/html/2510.01285v1)** (arXiv, Oct 2025): agents post to a shared blackboard, self-select work. Measured **+13–57% over master-slave and RAG baselines**, +9% F1 on data discovery tasks. Best fit when "the central controller cannot maintain an accurate model of each agent's capabilities" — i.e. exactly OpsRadar's situation (we have 17 tool agents the domain agents don't fully model).

Production references: PC-Agent, MedAgents, CARE-AD all use blackboard-style shared state.

**Caveat for us**: we should NOT adopt the paper's *autonomous self-selection* aspect (where agents decide whether they're relevant). Our 27 agents have fixed cron-scheduled roles. We adopt the *shared memory* aspect only.

### Karpathy "LLM Wiki" pattern (April 2026)

[Summary write-up](https://gamgee.ai/blogs/karpathy-llm-wiki-memory-pattern/). The pattern: store agent findings as canonical pages, not as ephemeral context. Domain agents read those pages as their primary context. This is what makes long-running agent systems coherent across many runs.

OpsRadar already has the substrate for this: the Notion Brain (20 DBs + 7 strategic pages per customer). Tool agents already write findings there. We just need to make domain agents READ those pages first.

### Closed-loop outcome learning — Claude Code `/goals` + Anthropic Bloom

- **Claude Code `/goals`** ([VentureBeat](https://venturebeat.com/orchestration/claude-codes-goals-separates-the-agent-that-works-from-the-one-that-decides-its-done)) formally separates the executor model from a distinct **evaluator model** that runs after every step. This is exactly OpsRadar's `evaluator` agent + `check-outcomes` cron pattern.
- **Anthropic Bloom** ([release](https://www.marktechpost.com/2025/12/21/anthropic-ai-releases-bloom-an-open-source-agentic-framework-for-automated-behavioral-evaluations-of-frontier-ai-models/)) — open-source agentic framework for behavioral evaluations. The 2026 canonical pattern.
- **Zapier** ([AI Agent Evaluation guide](https://zapier.com/blog/ai-agent-evaluation/)) — outcome-level checks: success rate, accuracy, relevance, LLM-as-judge for fuzzy cases.
- **Lindy** ([architecture guide](https://www.lindy.ai/blog/ai-agent-architecture)) — *"agent receives input, recalls context, plans an action, executes it, and learns from the outcome"* + mandatory HITL for payments/contracts.

**Implication for OpsRadar**: our `check-outcomes` daily cron + `approval-patterns.ts` + evaluator agent ARE the canonically correct pattern. The gap is that only `collections` and `renewal` currently emit the `entity_type/entity_id/entity_tool_slug/expected_outcome` fields needed to close the loop. **Every domain agent that queues an action should do this.**

### Context engineering > clever architectures

- Karpathy: *"the LLM is the CPU, the context window is the RAM"*.
- LangChain — [context engineering for agents](https://www.langchain.com/blog/context-engineering-for-agents): write / select / compress / isolate.
- 2026 consensus: orchestrator-worker + durable shared memory + separate evaluator + progressive disclosure (skills). No grand new architecture has displaced this.

### State of top labs in production

| System | Pattern |
|---|---|
| Claude Code | Orchestrator + subagents + skills + `/goals` evaluator |
| Devin (Cognition) | Single-threaded with full-trace context |
| ChatGPT agent mode | Single agent with long-context tools |
| Gemini Deep Research | Orchestrator with parallel research subagents (closest to Anthropic's pattern) |

References: [Flocker comparison Anthropic vs OpenAI 2026](https://flocker.md/blog/anthropic-openai-agent-orchestration/), [ByteByteGo deep dive](https://blog.bytebytego.com/p/how-anthropic-built-a-multi-agent).

---

## 3. What the 10 domain agents actually need

### Six concrete defects in the current prompts

1. **No awareness of tool agents.** Every domain agent prompt says "Pull from Stripe / HubSpot / …" with no acknowledgement that `tool-stripe`, `tool-hubspot`, etc. exist and already wrote findings to Notion the same morning. → **Cognition Flappy Bird failure.**

2. **Outcome tracking is missing on 8 of 10.** Only `collections` and `renewal` currently emit `entity_type`/`entity_id`/`entity_tool_slug`/`expected_outcome`. Without these, the `check-outcomes` cron can't attribute recovered value to specific agent actions → the "proof your work pays for itself" narrative breaks for revenue, scope, delivery, profitability, team, growth, stack, briefing.

3. **No skill discovery.** `loop.ts` already injects the skill catalog into the system prompt, but the domain agent prompts don't say "before proposing a strategic action like firing a client or repricing, consult `load_skill('firing-a-client')` / `load_skill('raising-retainer-prices')`." Skills exist; agents don't know they should reach for them.

4. **Stale integration references.**
   - `growth` lists `facebook_ads` in `composioApps` (excluded per user 2026-05-24).
   - `renewal` has `requiredIntegrations: ['docusign']` — meaning the agent skips entirely if DocuSign isn't connected. But renewals could be tracked from Notion's `Contracts & Legal` DB even without DocuSign. **This is too hard a gate.**
   - `team` references `bamboo_hr` (snake_case) but the Composio slug is likely `bamboo-hr` — needs verification.

5. **No 4-field subagent prompt contract.** Anthropic's #1 production failure mode is underspecified subagent prompts. The current prompts have task lists but no formal objective/output-format/source-guidance/boundaries block. Easy to fix; high leverage.

6. **No explicit Brain-read step.** Every domain agent should start with: *"Read these Notion pages first to see what tool agents already discovered today."* Right now no agent does this — they all start by hitting Composio tools.

### Specific fix per agent (proposed)

Each domain agent should become a **synthesizer that reads first, then fills gaps, then writes higher-level insights** — not a from-scratch discoverer.

| Agent | Read these Notion pages first | Then call tools only if … | Outcome tracking |
|---|---|---|---|
| revenue | Today's `tool-stripe` notes, `tool-hubspot`/`tool-pipedrive`/`tool-quickbooks` rows in `Agent Action Log` | Tool agents haven't run yet (cron failure) | Track `entity_type='invoice'`, expected=`paid` for any recovery-class actions |
| collections | `Invoice Tracker`, `tool-stripe` latest run | Need fresh Stripe invoice data only if Tracker stale (>4h) | Already has tracking — keep |
| scope | `tool-clickup`/`tool-asana`/`tool-monday`/`tool-harvest`/`tool-toggl` latest entries | Need fresh hours-vs-budget only if any tool agent skipped | Track `entity_type='project'`, expected=`scope_locked` |
| delivery | `tool-clickup`/`tool-asana`/`tool-monday` latest entries, `Projects` DB | Need fresh status only if PM tool agent skipped | Track `entity_type='project'`, expected=`shipped_on_time` |
| briefing | Last 12 weeks `Weekly KPI Snapshots`, `Risk Register`, `Pattern Cards`, **every domain agent's output from this week** | Never (briefing is pure synthesis) | Track `entity_type='briefing'`, expected=`owner_read` |
| profitability | `tool-stripe`, `tool-quickbooks`/`tool-harvest`/`tool-gusto` latest entries | Need fresh margin math only if any input agent skipped | Track `entity_type='client'`, expected=`margin_improved` |
| team | `tool-slack`, `tool-harvest`/`tool-toggl`, `tool-google-calendar`, `tool-bamboo-hr`/`tool-gusto` latest entries | Need fresh capacity only if input agent skipped | Track `entity_type='person'`, expected=`utilization_normal` |
| growth | `tool-hubspot`/`tool-pipedrive`, `tool-apollo`, `tool-google-analytics`/`tool-google-ads`, `tool-linkedin` latest entries | Need fresh pipeline only if input agent skipped | Track `entity_type='deal'`, expected=`progressed_stage` |
| renewal | `Contracts & Legal` DB, `tool-hubspot`/`tool-pipedrive` latest, `Clients` DB margin/NPS/comms | DocuSign optional — use Notion `Contracts & Legal` as primary source | Already has tracking — keep |
| stack | `tool-quickbooks`/`tool-stripe` latest subscription data, `Tool Stack` DB | Monthly only — fresh data fine to fetch | Track `entity_type='subscription'`, expected=`canceled_or_kept` |

### Required structural changes per prompt

Adopt Anthropic's 4-field subagent contract for every domain agent:

```
## Objective
<one paragraph — what success looks like>

## Output format
<what gets written to Notion, what the final summary text looks like>

## Source priority
1. Read first from Notion (specific page names)
2. Only call live tools if Notion data is stale or absent
3. Never re-fetch what a tool agent already wrote in the last 6h

## Boundaries
- Don't propose actions outside your domain
- Don't queue more than N actions per run (specific cap per agent)
- Don't make assumptions about clients not in the Brain
- For strategic moves (fire client, reprice, layoff), call load_skill() first
```

Plus the existing two blocks (approval-gate behavior, outcome-tracking fields) standardized as boilerplate at the top so future agents stay consistent.

---

## 4. Proposed implementation order

1. **Pilot on 1 agent first** — pick `revenue` (most tool dependencies, highest signal). Rewrite to the new shape. Run locally. Verify it actually reads Notion before hitting Stripe.
2. **Roll the pattern to the other 9** in one PR — same template, agent-specific reads.
3. **Add a `read_notion_findings(tool_agent_slug, since_hours)` helper** to `loop.ts` so domain agents have a uniform way to ask "what did `tool-stripe` discover today?" instead of crafting Composio queries by hand.
4. **Update `evaluator` prompt** to also score whether domain agents successfully read tool-agent context vs duplicated work — this is the empirical feedback loop on whether the refactor actually worked.

---

## 5. What we explicitly do NOT change

- Number of agents (28 stays 28).
- Cron schedule per agent (already staggered correctly — tool agents run 6–8am, domain agents 7am+).
- Approval-gate / autonomy policy (CP-14).
- Notion Brain schema (CP-15/16).
- Agent Skills loader (CP-17).
- Outcome tracker (CP-13 / c8f3a30).

This is a **prompt + light helper** change, not an architecture rewrite.

---

## Sources (live links)

- Anthropic — Building Effective Agents: https://www.anthropic.com/research/building-effective-agents
- Anthropic — Multi-Agent Research System engineering post: https://www.anthropic.com/engineering/multi-agent-research-system
- Cognition — Don't Build Multi-Agents: https://cognition.ai/blog/dont-build-multi-agents
- HN discussion of the Cognition piece: https://news.ycombinator.com/item?id=45096962
- arXiv 2510.01285 — LLM-based Multi-Agent Blackboard System: https://arxiv.org/html/2510.01285v1
- Karpathy LLM Wiki pattern summary: https://gamgee.ai/blogs/karpathy-llm-wiki-memory-pattern/
- VentureBeat — Claude Code `/goals` separates worker from evaluator: https://venturebeat.com/orchestration/claude-codes-goals-separates-the-agent-that-works-from-the-one-that-decides-its-done
- MarkTechPost — Anthropic Bloom release: https://www.marktechpost.com/2025/12/21/anthropic-ai-releases-bloom-an-open-source-agentic-framework-for-automated-behavioral-evaluations-of-frontier-ai-models/
- Zapier — AI Agent Evaluation: https://zapier.com/blog/ai-agent-evaluation/
- Lindy — AI Agent Architecture: https://www.lindy.ai/blog/ai-agent-architecture
- LangChain — Context Engineering for Agents: https://www.langchain.com/blog/context-engineering-for-agents
- Flocker — Anthropic vs OpenAI agent orchestration: https://flocker.md/blog/anthropic-openai-agent-orchestration/
- ByteByteGo — How Anthropic built a multi-agent system: https://blog.bytebytego.com/p/how-anthropic-built-a-multi-agent
