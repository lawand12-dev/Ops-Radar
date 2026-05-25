# Research — Agent code + strategy-doc organization patterns (Anthropic / OpenAI / CrewAI / LangGraph + ADR survey)

> **Research run date**: 2026-05-25
> **Question**: How should the agent codebase + docs/ be laid out for a 2026 AI agent product?
> **Status**: raw research output — informs the positioning brief in `docs/positioning/`.
> **Subagent run id**: `ab3bcca3db2fc1353` (preserved for audit; transcript at `~/.claude/projects/.../subagents/agent-ab3bcca3db2fc1353.jsonl`).

---

I have sufficient research. Composing the final answer.

## Part A — Agent code organization

Anthropic's canonical Agent Skills repo (`github.com/anthropics/skills`) puts each skill in **its own folder** containing a `SKILL.md` plus optional assets, grouped under domain subdirectories like `document-skills/`, with a sibling `spec/` and `template/` folder at the top level — not flat files ([anthropics/skills](https://github.com/anthropics/skills)). OpenAI's `openai-agents-python` examples follow the same "folder-per-agent-system" rule: multi-agent demos like `financial_research_agent/`, `customer_service/`, `research_bot/` get their own directories, while one-shot demos stay as flat `*.py` files ([openai-agents-python/examples](https://github.com/openai/openai-agents-python)). CrewAI's CLI scaffold formalizes the split between **code and declarative agent config**: code in `src/<project>/crew.py` + `tools/`, agent + task definitions in YAML under `src/<project>/config/agents.yaml` and `tasks.yaml` ([CrewAI Quickstart](https://docs.crewai.com/en/quickstart)). LangGraph's reference repos `langgraph-supervisor-py` and `langgraph-swarm-py` keep orchestrator wiring separate from worker agents and explicitly distinguish the **supervisor pattern** (central orchestrator hides sub-agents from the user) from the **swarm pattern** (peer handoffs) ([LangGraph Multi-Agent docs](https://reference.langchain.com/python/langgraph-swarm), [LangGraph multi-agent patterns](https://dev.to/focused_dot_io/multi-agent-orchestration-in-langgraph-supervisor-vs-swarm-tradeoffs-and-architecture-1b7e)). OpenAI's own docs name the "agents as tools / manager pattern" as the correct shape when a specialist should help with a bounded subtask but **not** take over the user-facing conversation — exactly the visible-orchestrator-vs-opaque-worker split this codebase needs ([OpenAI Agent orchestration](https://openai.github.io/openai-agents-python/multi_agent/)). The Vercel AI Chatbot reference template keeps agent runtime under `lib/ai/` (models, tools, prompts) while session/UI code lives elsewhere — a clean code/knowledge split ([vercel/ai-chatbot lib/ai](https://github.com/vercel/ai-chatbot/tree/main/lib/ai)). 2026 context-engineering consensus is to keep an **instruction layer** (system prompts, charters) separate from a **knowledge layer** (long-lived reference material like `SKILL.md` files) ([Faros: Context Engineering for Developers](https://www.faros.ai/blog/context-engineering-for-developers)).

## Part B — Strategy docs organization

The Nygard ADR format (Title, Status, Context, Decision, Consequences) is still the lightweight default in 2026, but MADR (Markdown ADR) is the more structured option recommended on `adr.github.io` ([ADR home](https://adr.github.io/), [Nygard template](https://github.com/joelparkerhenderson/architecture-decision-record/blob/main/locales/en/templates/decision-record-template-by-michael-nygard/index.md)). The settled folder convention is **`docs/adr/NNNN-slug.md`** with 4-digit zero-padded sequential prefixes so they sort chronologically — explicitly the pattern adr-tools generates ([ADR numbering convention](https://understandlegacycode.com/blog/earn-maintainers-esteem-with-adrs/), [Structurizr ADRs](https://docs.structurizr.com/dsl/adrs)). The Pragmatic Engineer's survey of Stripe, Uber, Google, Spotify, LinkedIn, HashiCorp, Klarna, Peloton, Sourcegraph, Stedi and Incident.io shows a stable taxonomy: **RFCs/Design Docs are forward-looking proposals seeking input** (Sourcegraph + Couchbase keep them in GitHub), **ADRs are short post-hoc records of decisions**, and several teams (Klarna, Peloton) use both — RFCs for cross-cutting/proposal work, ADRs for "we picked X" ([Pragmatic Engineer: RFCs and Design Docs](https://blog.pragmaticengineer.com/rfcs-and-design-docs/), [Pragmatic Engineer RFC examples](https://newsletter.pragmaticengineer.com/p/software-engineering-rfc-and-design)). Research notes, competitive landscapes, and market briefs are **not** ADRs — they're inputs that feed ADRs, and the convention is to keep them in a sibling folder so the decision log stays scannable ([Engineering Planning with RFCs / ADRs](https://newsletter.pragmaticengineer.com/p/rfcs-and-design-docs)). Numbered prefixes on ADRs are universally recommended; dated prefixes on research/brief docs are common but not standardized (not found as a hard convention).

## Recommendations (the synthesis)

### Agent code layout

```
src/lib/agents/
  loop.ts                     # generic runner (shared)
  registry.ts                 # surfaces only the 10 visible orchestrators
  approval-gate.ts            # shared
  tool-policies.ts            # shared
  tier-gate.ts
  types.ts
  orchestrators/              # 10 customer-visible domain agents
    revenue/{spec.ts,prompt.ts,charter.md}
    collections/...
    ...
  workers/                    # 17 opaque tool agents (hidden from /dashboard/agents)
    stripe/{spec.ts,prompt.ts}
    hubspot/...
    ...
  evaluator/{spec.ts,prompt.ts}
  custom/                     # DB-driven custom employees (loader, not specs)
knowledge-base/
  skills/                     # already canonical (Anthropic shape)
  charters/                   # optional: long-form charter .md per agent if prompts get heavy
```

Per-agent folder (not flat file) for any agent whose prompt > ~80 lines or that has companion assets — matches `anthropics/skills` and `openai-agents-python/examples`. Visible/opaque split is enforced by **folder location**, not flags: `orchestrators/` shows up in the registry passed to `/dashboard/agents`, `workers/` does not (matches OpenAI "agents-as-tools" pattern).

### Strategy docs layout

```
docs/
  adr/                        # short, numbered, decided
    0001-composio-vs-n8n.md
    0002-scheduler-trigger-dev.md
    0003-skills-over-rag.md
    ...
  rfc/                        # forward-looking proposals (optional, use when seeking input)
  research/                   # syntheses, market scans, competitive landscapes
    2026-05-competitive-landscape.md
    2026-04-ai-market.md
  specs/                      # implementation specs (automations-architecture, three-tier-memory…)
  positioning/                # pricing-depth, path-a-strategy, GTM
  README.md                   # index pointing into the four buckets
```

Retroactively rename existing decision-flavored files in `docs/strategy/` (e.g. `composio-vs-n8n-decision-2026.md`, `scheduler-decision-2026.md`) to `docs/adr/0001-…md`, move research syntheses to `docs/research/`, leave architecture specs in `docs/specs/`, leave pricing/positioning in `docs/positioning/`. Use the 4-digit prefix only on ADRs; date-prefix research files (`YYYY-MM-…`) since they're snapshots, not decisions.

Sources:
- [anthropics/skills repo](https://github.com/anthropics/skills)
- [openai/openai-agents-python](https://github.com/openai/openai-agents-python)
- [OpenAI Agent orchestration patterns](https://openai.github.io/openai-agents-python/multi_agent/)
- [CrewAI Quickstart project layout](https://docs.crewai.com/en/quickstart)
- [LangGraph Swarm docs](https://reference.langchain.com/python/langgraph-swarm)
- [LangGraph supervisor vs swarm tradeoffs](https://dev.to/focused_dot_io/multi-agent-orchestration-in-langgraph-supervisor-vs-swarm-tradeoffs-and-architecture-1b7e)
- [vercel/ai-chatbot lib/ai](https://github.com/vercel/ai-chatbot/tree/main/lib/ai)
- [Faros: Context Engineering for Developers](https://www.faros.ai/blog/context-engineering-for-developers)
- [adr.github.io homepage](https://adr.github.io/)
- [Nygard ADR template](https://github.com/joelparkerhenderson/architecture-decision-record/blob/main/locales/en/templates/decision-record-template-by-michael-nygard/index.md)
- [Understand Legacy Code: simple ADRs / numbering](https://understandlegacycode.com/blog/earn-maintainers-esteem-with-adrs/)
- [Structurizr ADRs](https://docs.structurizr.com/dsl/adrs)
- [Pragmatic Engineer: RFCs and Design Docs survey](https://blog.pragmaticengineer.com/rfcs-and-design-docs/)
- [Pragmatic Engineer: RFC + Design Doc examples](https://newsletter.pragmaticengineer.com/p/software-engineering-rfc-and-design)
- [Pragmatic Engineer: Engineering Planning with RFCs & ADRs](https://newsletter.pragmaticengineer.com/p/rfcs-and-design-docs)
