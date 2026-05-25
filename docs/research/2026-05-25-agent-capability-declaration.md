# Research — Agent capability declaration patterns (Anthropic Skills, A2A, Copilot Studio, CrewAI, Notion, MCP)

> **Research run date**: 2026-05-25
> **Question**: CP-39 — how do production agent systems declare allowed tools / charters?
> **Status**: raw research output — informs the positioning brief in `docs/positioning/`.
> **Subagent run id**: `a6d5052b79328c192` (preserved for audit; transcript at `~/.claude/projects/.../subagents/agent-a6d5052b79328c192.jsonl`).

---

I have enough. Let me synthesize the findings.

---

# How production AI agent systems declare capabilities (2025-2026)

## Per-product findings

**1. Anthropic Agent Skills** — Identity and capabilities are declared in the **same file**: `SKILL.md` with YAML frontmatter. Required fields are only `name` and `description`; the body holds identity, workflows, anti-patterns. An **experimental `allowed-tools` field** restricts which tools the agent can call when the skill is active — "useful for read-only skills or restricted access scenarios" (e.g. `allowed-tools: Read, Grep, Glob`). Format: Markdown + YAML frontmatter on disk. Progressive disclosure: only metadata (`~100 tokens per Skill`) is always loaded; full body loads on trigger. Customer-visible (uploaded via Settings, API, or filesystem). Source: [Anthropic Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview).

**2. Google A2A Agent Card** — Identity AND skills are co-located in a single JSON document at `/.well-known/agent-card.json`. The spec defines it as "a JSON metadata document published by an A2A Server, describing its identity, capabilities, skills, service endpoint, and authentication requirements." Skills are declared as `AgentSkill` objects (Section 4.4.5); identity, `capabilities`, `securitySchemes` are sibling fields. There is **no explicit "allowed-tools" list** — capabilities are declared positively via `AgentSkill`. Format: JSON (Protobuf-backed). Contributed to Linux Foundation June 2025; 150+ orgs in production per April 2026 status report. Source: [A2A Protocol Specification](https://a2a-protocol.org/latest/specification/), [Google A2A announcement](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/).

**3. Microsoft 365 Copilot Declarative Agent Manifest** — Single JSON/YAML file. **Required fields**: `version`, `name`, `description`, `instructions` (max 8,000 chars). **`capabilities`** is an explicit array of typed objects (WebSearch, OneDriveAndSharePoint, GraphConnectors, GraphicArt, CodeInterpreter), and **`actions`** is an explicit allow-list of plugin manifests referenced by file path. Web search even supports a `sites` sub-array — explicit positive scoping. Both customer- and dev-visible. Source: [Declarative agent schema 1.2](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/declarative-agent-manifest-1.2).

**4. OpenAI Agents SDK** — Inline code only. `Agent(name=..., instructions=..., model=..., tools=[get_weather])`. No manifest file. Tools are a Python list passed at construction. Dev-only; no customer-facing manifest. Source: [OpenAI Agents Python docs](https://openai.github.io/openai-agents-python/agents/).

**5. CrewAI** — Hybrid: **YAML config recommended** (`config/agents.yaml` with `role`, `goal`, `backstory` per agent; "We strongly recommend using this approach"). Tools are attached in Python code keyed by matching method names. Identity in YAML, tool binding in code. Source: [CrewAI Agents](https://docs.crewai.com/concepts/agents).

**6. Notion Custom Agents** — UI-driven; no manifest file exposed. Per-agent fields: Instructions, Triggers, "Tools and access" (page/database/MCP scoping), Model. "Each Custom Agent gets its own permissions, just like a teammate, and you decide what it can read and write." Customer-visible only. Source: [Notion Custom Agents help](https://www.notion.com/help/custom-agents), [Notion 3.3 release notes](https://www.notion.com/releases/2026-02-24).

**7. MCP `tools/list` + scoping** — The protocol itself returns all tools, but clients (OpenAI SDK, Claude Code, Anthropic SDK) implement **`allowed_tools` filters** at construction. Best practice per the MCP security community: "Agents should see only the tools they're permitted to use, not just be blocked from calling the ones they shouldn't… suppress the tool surface at the discovery layer." Source: [OpenAI MCP docs](https://openai.github.io/openai-agents-python/mcp/), [Cerbos MCP permissions](https://www.cerbos.dev/blog/mcp-permissions-securing-ai-agent-access-to-tools).

**8. Lindy 3.0** — Not found. Public docs emphasize "vibe coding" agents from prompts; no exposed manifest format. Skills auto-attach by tool selection. Source: [Lindy 3.0 announcement](https://www.lindy.ai/blog/lindy-3-0).

**9. Cognition Managed Devin** — Not found. Blog states "each managed Devin gets a clean slate, a narrow focus, its own shell," but the declaration mechanism is undocumented publicly. Source: [Cognition blog](https://cognition.ai/blog/devin-can-now-manage-devins).

## Synthesis

**Q1 — Dominant pattern**: **(B) standalone manifest/charter file**. 5 of 7 verified systems (Anthropic, Google A2A, Microsoft, CrewAI, Notion-as-DB-row) declare identity + capabilities in a dedicated artifact. Only OpenAI Agents SDK is pure inline-code. None dump everything.

**Q2 — Convergence point**: Anthropic's `SKILL.md` (Markdown + frontmatter) and Google A2A's `agent-card.json` (JSON) are the two open standards. The "Agent Skills Open Standard" is reportedly adopted across Claude Code, Codex, Cursor and 32 tools per the [Paperclipped 2026 explainer](https://www.paperclipped.de/en/blog/agent-skills-open-standard-interoperability/). A2A focuses on inter-agent discovery; Skills focus on intra-agent capability — they're complementary, not competing.

**Q3 — For OpsRadar**: Pattern **(B) charter files** matches consensus and scales. With 28 built-ins × 500+ Composio actions, a per-agent `CHARTER.md` with `allowed_actions` frontmatter mirrors Anthropic Skills (already used in your `knowledge-base/skills/`), gives progressive disclosure, and supports customer-hired employees as just-another-charter. Customer-visible (good for trust per Notion's pattern) and dev-editable.

**Q4 — Steelman against charters**: (a) **Drift**: Composio adds new actions; manual `allowed_actions` lists rot — Microsoft mitigates with `actions: [{file: plugin.json}]` indirection rather than inline slugs. (b) **OpenAI Agents SDK proves inline-in-code works** for dev-only systems and avoids two-file synchronization. (c) Anthropic itself marks `allowed-tools` as **experimental** — even they haven't committed to per-skill tool restriction as load-bearing. (d) For agents whose tool set is genuinely all-of-toolkit (Gmail agent should have all Gmail actions), the charter degenerates into a wildcard and adds ceremony without scoping benefit.

## Sources

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
