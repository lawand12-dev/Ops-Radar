# Agent Skills Architecture — Why & How

> Compiled: 2026-05-23 · Purpose: the architecture decision (and the research behind it) that took OpsRadar's knowledge base from RAG-shaped to Anthropic Agent Skills. Sibling to [`0001-composio-broker.md`](./0001-composio-broker.md) and [`0005-control-first-approval-gate.md`](./0005-control-first-approval-gate.md).

---

## The decision

**OpsRadar's knowledge base is implemented as Anthropic Agent Skills**, not RAG. `knowledge-base/skills/<domain>/<name>/SKILL.md` files in git, loaded into the agent's system prompt as `name + description` pairs at boot, fetched in full via the `load_skill` tool only when the model decides one applies. Three-tier progressive disclosure.

If we ever need vector retrieval again (cross-agency pattern synthesis, larger corpora), pgvector stays in the stack — but only on the cold path. Hot-path retrieval is dead.

---

## Why — the post-RAG canonical pattern

Three independent signals pointed to the same shape in 2025-26:

| Signal | What it said |
|---|---|
| **Anthropic's Agent Skills launch** (Oct 2025) | Markdown files with `name` + `description` frontmatter, progressively disclosed via a single `load_skill` tool. Spec: [anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills). |
| **Karpathy's "LLM Wiki" / Software 3.0 essay** | Claude reads markdown like an OS reads files. RAG is a workaround for context limits that no longer exist at 200K–1M tokens. |
| **Tom Blomfield (YC RFS #4 author)** | Company Brain is NOT RAG over Notion. It's executable skills files. Markdown in git. The bottleneck stopped being the model — it's the codified domain knowledge. |

Proof points in production: **Ramp Glass (350+ skills in their "Dojo" marketplace)**, **Block's `code-review` and related skills**, **Anthropic's `financial-services-plugins` repo (`morning-note`, `client-review`, `variance-commentary`, `kyc-rules`, `roll-forward`)**, **Claude Code, Cursor, Codex CLI, Gemini CLI, GitHub Copilot** all adopted the pattern.

The post-RAG pitch line: *"OpsRadar uses the post-RAG canonical stack Anthropic published in October 2025: Vercel AI SDK v6 for streaming + tool use, Claude/GPT through Vercel AI Gateway for reasoning, and Anthropic Agent Skills (SKILL.md files in git, progressively disclosed via tool calls) for procedural knowledge."*

---

## The shape of an OpsRadar skill

Frontmatter spec — only two fields are required, per Anthropic's published rules:

```yaml
---
name: detecting-scope-creep                 # required, kebab-case, matches folder
description: >                              # required, ≤1024 chars
  Detects scope creep on retainer/fixed-fee clients by comparing logged
  Harvest hours vs the contracted budget. Codifies the 1st-ask / 2nd-ask /
  3rd-invoice rule. Use when project hours > 115% of budget, when planning
  a scope conversation, or when reviewing client profitability.
  Triggers on "is this client over scope", "scope creep on Acme",
  "should I have the scope conversation", "they keep asking for more".
---
```

Body structure (the standard OpsRadar skill template):

```
# {Title Case Name}

*"{Customer-anxious question}"*

## When this triggers
- {literal signal}
- ...

## What to do
1. {verb + object + threshold + source}
2. ...

## Conversation script
> First touch: "..."
> Escalation: "..."

## What NOT to do
- ...

## Related skills
- `sibling-skill-a` — when X
- `sibling-skill-b` — when Y
```

**Hard rules** (validated in the 5-skill validation batch + applied across all skills — **47 as of 2026-05-27**):

- Body ≤ 250 lines (Anthropic guideline 500 — we run tighter)
- Open with the customer-anxious question in italics
- Every threshold has a citation (Parakeeto, Karl Sakas, Marcel Petitpas, Agency Analytics, SPI Research, or "ask the customer for their baseline")
- Never invent numbers, client names, or citations
- "What NOT to do" is non-negotiable — it's where the moat lives
- Skills cross-reference siblings (`sibling-name`) so the agent composes mid-turn

---

## The skills (CP-17 + 17b + 17c — 47 as of 2026-05-27)

```
knowledge-base/skills/
├── INDEX.md
├── agency-ops/          (4) notion-brain-schema, recovering-from-integration-failure,
│                            analyzing-retainer-vs-project-mix, identifying-burnout-risks
├── revenue/             (6) projecting-cash-runway, chasing-overdue-invoices,
│                            monitoring-client-health-score, spotting-upsell-windows,
│                            managing-retainer-invoicing, routing-leads-by-fit
├── profitability/       (5) calculating-effective-hourly-rate, flagging-margin-erosion,
│                            handling-cash-flow-crunch, tracking-team-capacity,
│                            tracking-billable-time
├── delivery/            (5) detecting-scope-creep, monitoring-project-status,
│                            preparing-status-calls, following-up-on-meetings,
│                            distributing-content
├── client-comms/        (7) firing-a-client, raising-retainer-prices,
│                            discussing-margin-with-client, discussing-scope-with-client,
│                            onboarding-new-clients, generating-proposals,
│                            diagnosing-difficult-clients
├── coo-briefings/       (4) composing-weekly-briefing, calculating-hiring-triggers,
│                            tuning-autonomy-policies, composing-slack-digest
├── agency-types/        (3) serving-marketing-agencies, serving-recruiting-agencies,
│                            serving-design-agencies
├── benchmarks/          (2) looking-up-cost-benchmarks, looking-up-time-benchmarks
└── integrations/       (10) using-{stripe, hubspot, clickup, asana, monday,
                              harvest, toggl, apollo, calendly, pipedrive}
```

---

## The composition chains that make skills powerful

Skills become more than the sum of their parts when they reference each other. Real composition paths an agent can walk mid-turn:

```
Margin alert detected
  ↓ flagging-margin-erosion
  ↓ calculating-effective-hourly-rate
  ↓ discussing-margin-with-client OR discussing-scope-with-client
  ↓ (if no resolution)
  ↓ diagnosing-difficult-clients
  ↓ (if path = fire)
  ↓ firing-a-client
```

```
Friday-payroll panic
  ↓ projecting-cash-runway
  ↓ (if < 3 months)
  ↓ handling-cash-flow-crunch
  ↓ Lever 1: AR
  ↓ chasing-overdue-invoices
```

```
New retainer signed
  ↓ onboarding-new-clients (30-day arc)
  ↓ detecting-scope-creep (week 1+ monitor)
  ↓ monitoring-client-health-score (month 3+)
  ↓ raising-retainer-prices (renewal anniversary)
```

This is the difference between "the agent has docs" and "the agent has a brain." Cross-references at the file level let one `load_skill` call seed the next.

---

## How the loader works (one paragraph)

`src/lib/skills.ts` walks `knowledge-base/skills/` once at module init. It reads **frontmatter only** (~80–120 tokens per skill) and exposes `loadSkillCatalog()` + `loadSkillBody(name)`. Both the COO route (`src/app/api/dashboard/coo/route.ts`) and the cron agent loop (`src/lib/agents/loop.ts`) inject `buildSkillsSystemBlock(catalog)` into the system prompt — a single list of `- name: description` lines — and expose a `load_skill` tool the model calls with a kebab-case name to fetch the full body. The full body never enters context unless the model explicitly asks for it. With prompt caching the ~5K-token catalog costs ~$0 after first request.

---

## What's archived (preserved in git, bundle-excluded)

`knowledge-base/_archive/n8n-build-time/` — 134 files of n8n node/API references and workflow build-time playbooks. These belonged in the (now-severed) chatv2 service, not in the AI Chief of Staff product. Available via `git log` if ever needed. `next.config.ts` `outputFileTracingExcludes` keeps them out of the serverless bundle.

---

## When NOT to add a skill

A skill must encode **judgment a senior person would charge for**. Symptoms of a non-skill:

- The "What to do" section is the same as the vendor's docs ("call the HubSpot API to fetch a deal")
- It describes a concept without saying when to act ("here's what scope creep is")
- It has no numeric threshold or conditional fallback ("monitor it carefully")
- It can't be expressed as "use when X, do Y"

If a skill ends up looking like a wiki page, archive it. The bar is decisional, not descriptive.

---

## Re-wire path if we ever need vector retrieval back

The infrastructure stays in place — `kb_embeddings` table + `coo_kb_gaps` table + `scripts/embed-kb.ts` regenerator are all dormant in Supabase. To revive:

1. Decide what corpus warrants embeddings (probably: cross-agency patterns synthesized from `agent_runs` summaries, not the skills themselves)
2. Run `embed-kb.ts` against that corpus
3. Add a new tool (e.g. `search_patterns`) that does semantic search and returns context

Critically: the agent skills remain the hot path. RAG only ever serves the cold-path synthesis layer that generates new skills.

---

## Sources

- [Equipping agents for the real world with Agent Skills — Anthropic](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Skill authoring best practices — Claude API Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [anthropics/skills GitHub repo](https://github.com/anthropics/skills)
- [anthropics/financial-services-plugins repo](https://github.com/anthropics/financial-services-plugins)
- [block/agent-skills repo](https://github.com/block/agent-skills)
- [Internal AI Workspaces: The Ramp Glass Playbook — AI Catchup](https://aicatchup.com/practices/internal-ai-workspaces-playbook)
- [3 Principles for Designing Agent Skills — Block Engineering](https://engineering.block.xyz/blog/3-principles-for-designing-agent-skills)
- [The Company Brain: How Karpathy, Tan, Stulberg, Ramp Landed in the Same Place — Alex Lockey](https://www.alexlockey.com/writing/the-company-brain-four-builders-one-architecture/)
- [Simon Willison on Claude Skills](https://simonwillison.net/2025/Oct/16/claude-skills/)
