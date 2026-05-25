# Agent capability declaration — research basis (May 2026)

> Research-backed reference for **CP-39** (per-agent CHARTER.md files) and any
> future work on how OpsRadar agents declare their identity, allowed tools,
> allowed triggers, escalation rules, and write authority.
>
> Status: **decision locked** — Pattern (B) charter files, with Option (C)
> applied to the layer split (tool agents hidden as internal sub-agents;
> charters only for the 10 domain agents + custom employees).

## TL;DR

**5 of 7 verified production agent systems in 2025-2026 declare identity +
capabilities in a dedicated charter/manifest file**, not inline-in-code, not
dump-everything. The two open standards converging are **Anthropic Agent
Skills** (`SKILL.md` with YAML frontmatter — same pattern we already use for
the operational skill catalog) and **Google A2A Agent Card** (`/.well-known/agent-card.json`).
These are **complementary**: Skills handles intra-agent capability; A2A
handles inter-agent discovery.

For OpsRadar this means each customer-visible agent gets a `CHARTER.md`
that declares: name, role, allowed_actions (or `"all"`), allowed_triggers,
write_authority, escalates_to. Tool agents stay as opaque internal
sub-agents (no charter, no sidebar entry).

---

## Verified findings — per product

### 1. Anthropic Agent Skills

**Identity + capability in the same file.** `SKILL.md` with YAML frontmatter.
Required fields: `name` + `description`. Body holds identity, workflows,
anti-patterns. An **experimental `allowed-tools` field** restricts which
tools the agent can call when the skill is active — *"useful for read-only
skills or restricted access scenarios"* (e.g. `allowed-tools: Read, Grep, Glob`).

- Format: Markdown + YAML frontmatter on disk
- Progressive disclosure: only metadata (~100 tokens per Skill) is always
  loaded; full body loads on trigger
- Customer-visible (uploaded via Settings, API, or filesystem)

**Source:** [Anthropic Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview), [github.com/anthropics/skills](https://github.com/anthropics/skills)

### 2. Google A2A Agent Card

**Identity + skills co-located in one JSON document** at
`/.well-known/agent-card.json`. The spec defines it as *"a JSON metadata
document published by an A2A Server, describing its identity, capabilities,
skills, service endpoint, and authentication requirements."* Skills are
declared as `AgentSkill` objects (§4.4.5); identity, `capabilities`,
`securitySchemes` are sibling fields. **No explicit "allowed-tools" list** —
capabilities are declared positively via `AgentSkill`.

- Format: JSON (Protobuf-backed)
- Contributed to Linux Foundation June 2025
- 150+ orgs in production per April 2026 status report

**Source:** [A2A Protocol Specification](https://a2a-protocol.org/latest/specification/), [Google A2A announcement](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)

### 3. Microsoft 365 Copilot — Declarative Agent Manifest

**Single JSON/YAML manifest** with required fields `version`, `name`,
`description`, `instructions` (max 8,000 chars). **`capabilities`** is an
**explicit array of typed objects** (WebSearch, OneDriveAndSharePoint,
GraphConnectors, GraphicArt, CodeInterpreter). **`actions`** is an
**explicit allow-list of plugin manifests** referenced by file path. Web
search even supports a `sites` sub-array — explicit positive scoping. Both
customer- and dev-visible.

**Source:** [Declarative agent schema 1.2](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/declarative-agent-manifest-1.2)

### 4. OpenAI Agents SDK — the outlier

**Inline code only.** `Agent(name=..., instructions=..., model=..., tools=[get_weather])`.
No manifest file. Tools are a Python list passed at construction. Dev-only;
no customer-facing manifest.

**Source:** [OpenAI Agents Python docs](https://openai.github.io/openai-agents-python/agents/)

### 5. CrewAI

**Hybrid: YAML config recommended.** `config/agents.yaml` with `role`, `goal`,
`backstory` per agent — *"We strongly recommend using this approach."* Tools
are attached in Python code keyed by matching method names. Identity in YAML,
tool binding in code.

**Source:** [CrewAI Agents](https://docs.crewai.com/concepts/agents)

### 6. Notion 3.3 Custom Agents

**UI-driven; no manifest file exposed publicly.** Per-agent fields:
Instructions, Triggers, "Tools and access" (page/database/MCP scoping),
Model. *"Each Custom Agent gets its own permissions, just like a teammate,
and you decide what it can read and write."* Customer-visible only; no
file format leaked.

**Source:** [Notion Custom Agents help](https://www.notion.com/help/custom-agents), [Notion 3.3 release notes](https://www.notion.com/releases/2026-02-24)

### 7. MCP `tools/list` + scoping

Protocol returns **all** tools, but clients (OpenAI SDK, Claude Code,
Anthropic SDK) implement **`allowed_tools` filters at construction**. Best
practice per the MCP security community: *"Agents should see only the tools
they're permitted to use, not just be blocked from calling the ones they
shouldn't… suppress the tool surface at the discovery layer."*

**Source:** [OpenAI MCP docs](https://openai.github.io/openai-agents-python/mcp/), [Cerbos MCP permissions](https://www.cerbos.dev/blog/mcp-permissions-securing-ai-agent-access-to-tools)

### 8. Lindy 3.0 / 9. Cognition Devin

**Not publicly documented.** Lindy emphasizes prompt-driven "vibe coding";
Devin states each managed instance has a "narrow focus" but the declaration
mechanism is undocumented.

---

## Synthesis

### Q1: Dominant pattern across the verified set

**(B) standalone manifest/charter file** — 5 of 7 (Anthropic, Google A2A,
Microsoft, CrewAI, Notion-as-DB-row). Only OpenAI Agents SDK is pure
inline-code. None dump everything.

### Q2: Where is the convergence in 2026?

Two open standards becoming the de-facto choice, **complementary** not
competing:

- **Anthropic SKILL.md** — intra-agent capability (Markdown + frontmatter,
  reportedly adopted across Claude Code, Codex, Cursor, and 32 other tools
  per the [Paperclipped explainer](https://www.paperclipped.de/en/blog/agent-skills-open-standard-interoperability/))
- **Google A2A Agent Card** — inter-agent discovery (JSON, Linux Foundation
  governance)

### Q3: For OpsRadar specifically

A per-agent `CHARTER.md` with `allowed_actions` frontmatter:

- Mirrors Anthropic Skills (already our pattern for `knowledge-base/skills/`)
- Gives progressive disclosure (frontmatter cheap to load, body loads on demand)
- Supports customer-hired employees as just-another-charter
- Customer-visible (good for trust, per Notion's pattern)
- Dev-editable in git

### Q4: Steelman against charters

- **Drift.** Composio adds new actions; manual `allowed_actions` lists rot.
  *Microsoft mitigates with `actions: [{file: plugin.json}]` indirection
  rather than inline slugs.* Our mitigation: support `allowed_actions: "all"`
  for genuinely toolkit-wide agents.
- **OpenAI Agents SDK proves inline-in-code works** for dev-only systems and
  avoids two-file synchronization.
- **Anthropic itself marks `allowed-tools` as experimental** — even they
  haven't committed to per-skill tool restriction as load-bearing.
- **Wildcard degeneration.** For agents whose tool set is genuinely
  all-of-toolkit (a Gmail agent should have every Gmail action), the
  charter degenerates into a wildcard and adds ceremony without scoping
  benefit. *Our answer: charters are only for customer-visible agents
  (10 domain agents + custom employees). Tool agents stay code-only.*

---

## Decision (locked)

### Layer split

| Layer | Charter? | Customer-visible? |
|---|---|---|
| 10 domain agents (revenue / collections / scope / delivery / briefing / profitability / team / growth / renewal / stack) | **Yes** — `knowledge-base/agents/<slug>/CHARTER.md` | Yes — `/dashboard/agents/<slug>` reads the charter |
| Custom employees (Sarah, Marcus, …) | **Yes** — generated by `compileCustomEmployee` + stored as draft + persisted alongside the row | Yes — `/dashboard/employees/<slug>` reads the charter |
| 17 tool agents (`tool-stripe`, `tool-hubspot`, …) | **No** — lean YAML in `src/lib/agents/tools/<slug>/charter.yaml` | **No** — internal sub-agents, dropped from sidebar and `/dashboard/agents` |
| Evaluator | **No** — internal meta-agent | No |

This matches the Anthropic Multi-Agent Research orchestrator-worker pattern:
**visible orchestrators** with charters, **opaque sub-agents** without.

### Charter frontmatter schema (proposed)

```yaml
---
name: tool-stripe           # the agent slug
display: Stripe Agent       # the customer-visible name
role: One-sentence summary of the agent's job.
schedule_cron: "0 7 * * *"  # nullable for chat-only agents
allowed_actions: "all"      # OR explicit list of Composio action slugs
allowed_triggers: []        # explicit list of Composio trigger slugs
write_authority: read-only  # read-only | gated-writes | full
escalates_to: revenue       # another agent slug, or null
max_writes_per_run: 0       # 0 = read-only enforcement floor
---
```

### Loader

`src/lib/agents/charter.ts` — mirror of `src/lib/skills.ts`:

- `loadCharterFrontmatter(slug)` — cheap, parses only YAML, used at boot
- `loadCharterBody(slug)` — lazy, loads full markdown when needed
- `loadCharterCatalog()` — all visible charters' frontmatter for the catalog

### Wiring in `runAgent` (src/lib/agents/loop.ts)

After loading Composio tools, if the spec has a charter with
`allowed_actions !== "all"`, filter the tool dictionary down to the listed
slugs **before** passing to `streamText`. This keeps the noise out of the
prompt and gives the agent a self-aware capability envelope.

---

## Sources (full list)

- [Anthropic Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Anthropic Skills GitHub](https://github.com/anthropics/skills)
- [A2A Protocol Specification](https://a2a-protocol.org/latest/specification/)
- [Google A2A announcement](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)
- [Microsoft Declarative agent schema 1.2](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/declarative-agent-manifest-1.2)
- [OpenAI Agents Python docs](https://openai.github.io/openai-agents-python/agents/)
- [OpenAI MCP docs](https://openai.github.io/openai-agents-python/mcp/)
- [CrewAI Agents](https://docs.crewai.com/concepts/agents)
- [Notion Custom Agents help](https://www.notion.com/help/custom-agents)
- [Notion 3.3 release notes](https://www.notion.com/releases/2026-02-24)
- [Cerbos MCP permissions](https://www.cerbos.dev/blog/mcp-permissions-securing-ai-agent-access-to-tools)
- [Agent Skills Open Standard explainer](https://www.paperclipped.de/en/blog/agent-skills-open-standard-interoperability/)
- [Lindy 3.0 announcement](https://www.lindy.ai/blog/lindy-3-0)
- [Cognition Managed Devin blog](https://cognition.ai/blog/devin-can-now-manage-devins)
- [Anthropic Multi-Agent Research](https://www.anthropic.com/engineering/multi-agent-research-system)
