# OpsRadar Docs — Index

*Last updated: 2026-05-25*

This folder is the operating system for OpsRadar's go-to-market, copy, design, product, and capital raise. Every document is action-shaped — opened the moment you need to do the thing it describes.

---

## Folder Map

```
docs/
├── adr/             ← architecture decisions (numbered, dated, short, post-hoc)
├── research/        ← raw research snapshots (dated, no decisions inside)
├── specs/           ← implementation specs (the "how it actually works" docs)
├── positioning/     ← pricing, moats, GTM strategy, vs-pages
├── yc/              ← YC Summer 2026 application track
├── fundraising/     ← VC research, investor outreach guide
├── go-to-market/    ← outbound playbooks, partner program, community plan
├── competitive/     ← 10 SaaS teardowns + competitor battle cards
├── copy/            ← finalized copy for every marketing page
├── design/          ← design language, audit findings, redesign specs
├── operations/      ← business operations research (payments, infra)
└── dev/
    ├── plans/                   ← active implementation plans
    ├── specs/                   ← active design specs
    └── archive/                 ← historical plans + specs
```

**Restructured on 2026-05-25** (the old `strategy/` folder was split into the four buckets above). Rule of thumb:

| Bucket | What goes here | Naming |
|---|---|---|
| `adr/` | "We picked X. Status: accepted." | `NNNN-slug.md` (zero-padded sequential) |
| `research/` | "Here's what the world looks like as of date Y." | `YYYY-MM-DD-slug.md` |
| `specs/` | "Here's how the implemented thing works." | `slug.md` |
| `positioning/` | "Here's who we are / who we sell to / how we price." | `slug.md` |

Convention follows Nygard / Pragmatic Engineer 2026 — see [`research/2026-05-25-agent-code-doc-organization.md`](./research/2026-05-25-agent-code-doc-organization.md).

---

## Architecture Decisions (ADRs)

Short, numbered, decided. Open these to answer "why is the system shaped this way?"

| # | Decision | When to read |
|---|----------|--------------|
| [`adr/0001-composio-broker.md`](./adr/0001-composio-broker.md) | Composio over n8n for tool brokerage | Before "should we add a workflow builder?" |
| [`adr/0002-scheduler-trigger-dev.md`](./adr/0002-scheduler-trigger-dev.md) | Trigger.dev for durable scheduling | Before adding a new cron / durable workflow |
| [`adr/0003-skills-over-rag.md`](./adr/0003-skills-over-rag.md) | Anthropic Agent Skills > RAG | Before writing a new SKILL.md or "should we add RAG?" |
| [`adr/0004-three-tier-memory.md`](./adr/0004-three-tier-memory.md) | Brain = Supabase warehouse + Notion mirror + Composio live | Before any memory change |
| [`adr/0005-control-first-approval-gate.md`](./adr/0005-control-first-approval-gate.md) | Approval-gate every write action (CP-14 spec) | Before adding a new agent surface |
| [`adr/0006-orchestrator-worker-pattern.md`](./adr/0006-orchestrator-worker-pattern.md) | 10 domain orchestrators read 17 tool workers (CP-19) | Before new agent design |
| [`adr/0007-senior-coo-playbook.md`](./adr/0007-senior-coo-playbook.md) | Embed operator judgment in every agent prompt (CP-21) | Before any prompt rewrite |
| [`adr/0008-observability-sentry-statsig-langfuse.md`](./adr/0008-observability-sentry-statsig-langfuse.md) | Sentry + Statsig + Langfuse stack | Before adding a new observability vendor |
| [`adr/0009-engineering-stack-2026-05.md`](./adr/0009-engineering-stack-2026-05.md) | **Engineering stack stress-test (2026-05-26)** — 4-layer 2026-consensus audit. 81% aligned, 8 concrete upgrades ranked by impact/effort. Re-evaluate every 90 days | Before any architectural change. Sibling to `positioning/identity.md` |

## Positioning

| Document | What it is | When to read |
|----------|------------|--------------|
| [`positioning/path-a-strategy.md`](./positioning/path-a-strategy.md) | The master strategy. 27-competitor gap, 4-tier pricing, YC #15 fit, 90-day execution plan | Always. The working document |
| [`positioning/pricing-depth.md`](./positioning/pricing-depth.md) | Van Westendorp + WTP + competitive anchor. Current tiers + their reasoning | Before any pricing conversation or tier change |
| [`positioning/moats.md`](./positioning/moats.md) | Razorpay's 6 provocations on moats applied to OpsRadar | Before YC interview, before any "let's add an easy feature" decision |
| [`positioning/vs-pages.md`](./positioning/vs-pages.md) | 3 launch-ready SEO landing pages: `/vs/productive`, `/vs/scoro`, `/vs/float` | When ready for SEO landing pages |

## Research

Evidence snapshots — every claim cited, no decisions inside. Read these to back up a claim or update a positioning doc.

**Fresh (this session — 2026-05-25):**

| Document | What it answers |
|----------|-----------------|
| [`research/2026-05-25-yc-acceptance-pattern.md`](./research/2026-05-25-yc-acceptance-pattern.md) | What YC actually funded in W25 / S25 / W26 in the AI-ops / agent / COO space, the pitch shapes they accept |
| [`research/2026-05-25-competitor-pain-points.md`](./research/2026-05-25-competitor-pain-points.md) | What real customers complain about in Lindy / Notion AI / BOND / Devin / Glean / Copilot Studio |
| [`research/2026-05-25-investor-2026-theses.md`](./research/2026-05-25-investor-2026-theses.md) | a16z / Sequoia / Bessemer / Pragmatic Engineer 2026 essays on where vertical AI / agents are going |
| [`research/2026-05-25-revenue-momentum-signals.md`](./research/2026-05-25-revenue-momentum-signals.md) | Public ARR / funding / customer-count signals (Sierra, Cognition, Glean, Decagon, BOND, Lindy, 11x.ai) |
| [`research/2026-05-25-vertical-intent-ranking.md`](./research/2026-05-25-vertical-intent-ranking.md) | Which business vertical has the strongest measurable demand for an AI Chief of Staff |
| [`research/2026-05-25-fractional-coo-labor-gap.md`](./research/2026-05-25-fractional-coo-labor-gap.md) | Where the human fractional-COO market is densest and most substitutable by AI |
| [`research/2026-05-25-pricing-deep-dive.md`](./research/2026-05-25-pricing-deep-dive.md) | Pricing model evidence for SMB-mid AI workforce — what wins, what kills (11x post-mortem) |
| [`research/2026-05-25-split-vs-unified-chat.md`](./research/2026-05-25-split-vs-unified-chat.md) | Q&A chat vs builder chat — Notion / Lindy / Devin / Copilot Studio patterns (informs CP-38) |
| [`research/2026-05-25-agent-capability-declaration.md`](./research/2026-05-25-agent-capability-declaration.md) | How production agent systems declare allowed tools / charters (informs CP-39) |
| [`research/2026-05-25-agent-code-doc-organization.md`](./research/2026-05-25-agent-code-doc-organization.md) | Best 2026 layout for agent codebase + strategy docs (the basis for this restructure) |
| [`research/2026-05-25-subsection-demand-validation.md`](./research/2026-05-25-subsection-demand-validation.md) | Verified customer demand for 7 OpsRadar moats; ranks the 3 that should headline marketing |
| [`research/2026-05-26-engineering-runtime.md`](./research/2026-05-26-engineering-runtime.md) | **Engineering stress-test 1/4 — Runtime + orchestration** (Vercel AI SDK, Trigger.dev, scheduling). 85% aligned |
| [`research/2026-05-26-engineering-agent-arch.md`](./research/2026-05-26-engineering-agent-arch.md) | **Engineering stress-test 2/4 — Agent architecture** (orchestrator-worker, charters, HITL, GEPA). 80% aligned |
| [`research/2026-05-26-engineering-brain.md`](./research/2026-05-26-engineering-brain.md) | **Engineering stress-test 3/4 — Brain / memory** (Postgres, embeddings, Mem0/Letta/Zep). 90% aligned — highest |
| [`research/2026-05-26-engineering-tools.md`](./research/2026-05-26-engineering-tools.md) | **Engineering stress-test 4/4 — Tools + integrations** (Composio vs Pica/Arcade, MCP, OAuth, saga). 70% aligned — lowest |
| [`research/2026-05-26-shared-knowledge-layer.md`](./research/2026-05-26-shared-knowledge-layer.md) | **Shared multi-agent knowledge layer** — shared brain is table stakes in 2026; what IS defensible is the stacking. Drove the moat sharpening in `positioning/identity.md` |

**Older snapshots:**

| Document | What it answers |
|----------|-----------------|
| [`research/2026-05-icp-customer.md`](./research/2026-05-icp-customer.md) | 3 personas, 10 buying triggers, disqualifier list, JTBD map, 15-channel sourcing |
| [`research/2026-05-ai-market.md`](./research/2026-05-ai-market.md) | $2.52T AI spend / 8.8% production adoption gap / CAIO trend data |
| [`research/2026-05-competitive-landscape.md`](./research/2026-05-competitive-landscape.md) | Who's winning by category. 18-month probability spread. Differentiation matrix |
| [`research/2026-05-agency-tools.md`](./research/2026-05-agency-tools.md) | Agency tool fragmentation — HubSpot/Pipedrive/ClickUp/Harvest adoption patterns |
| [`research/2026-05-ai-data-revolution.md`](./research/2026-05-ai-data-revolution.md) | Cloud→AI wave shift |
| [`research/2026-05-agent-capability-survey.md`](./research/2026-05-agent-capability-survey.md) | Earlier survey on Anthropic Skills / A2A / MCP capability declaration |

## Specs (current implementation)

| Document | What it is |
|----------|------------|
| [`specs/ai-employees.md`](./specs/ai-employees.md) | CP-34 — custom AI employees architecture (hireable, scheduled, scoped) |
| [`specs/automations.md`](./specs/automations.md) | CP-20 — customer-built event-triggered automations |
| [`specs/architecture-audit.md`](./specs/architecture-audit.md) | Cross-app architecture audit vs Notion / Lindy / BOND |
| [`specs/trigger-composio-integration.md`](./specs/trigger-composio-integration.md) | Three integration patterns between Trigger.dev and Composio |
| [`specs/cp-30-31-32-verification.md`](./specs/cp-30-31-32-verification.md) | Verification checklist for CP-30/31/32 implementation |

---

## YC Summer 2026

| Document | What it gives you | When to open it |
|----------|-------------------|-----------------|
| [`yc/research-addendum.md`](./yc/research-addendum.md) | Fresh May 2026 data for the 4 YC categories OpsRadar fits — MCP adoption, agentic ROI, agency profit gaps | Before YC application or any investor conversation |
| [`yc/build-architecture.md`](./yc/build-architecture.md) | The build blueprint across all 4 categories — Vercel AI SDK v6, Inngest, hybrid GraphRAG, OAuth-secured MCP server, event-driven supervisor/worker, Langfuse observability | Before any net-new product work |
| [`yc/what-yc-wants.md`](./yc/what-yc-wants.md) | What YC partners look for + OpsRadar scored against the rubric + drop-in drafts for 8 application questions + interview pattern + 3-day action plan | Before drafting or submitting |
| [`yc/founder-profile.md`](./yc/founder-profile.md) | The team-profile companion. Both cofounders' full data + per-founder Q4 drafts + interview script | Before drafting Q3/Q4 of the application |
| [`yc/traction-evidence.md`](./yc/traction-evidence.md) | The traction artifact for Q5. Cold-email batch + Reddit threads + partnership offer + VP-level conversation | Before drafting Q5 + this week's outreach replies |

---

## Theory & Methodology

| Document | What it is |
|----------|------------|
| [`software-3-engineering-2026.md`](./software-3-engineering-2026.md) | **The theory** — Karpathy's Software 1.0/2.0/3.0 framework, the 20/80 inversion, jagged intelligence, Program MD as the soul of the org, Claws, Auto-Research loop. |
| [`build-methodology-2026.md`](./build-methodology-2026.md) | **The day-to-day playbook** — GStack adapted for OpsRadar. 4 phases (CEO plan → ASCII grounding → Conductor velocity → 90% Playwright QA). |
| [`ai-native-company-2026.md`](./ai-native-company-2026.md) | **The 5 recursive loops** — Autonomous Engineering / Diorization / Disposable Software / Token-Maxing Culture / Human at the Edge. |

---

## Fundraising

| Document | What it is |
|----------|------------|
| [`fundraising/vc-deep-research.md`](./fundraising/vc-deep-research.md) | Deep research on investor landscape, target firms, and capital strategy |
| [`fundraising/vc-guide.md`](./fundraising/vc-guide.md) | Practical guide for VC outreach and engagement |

---

## Go-to-Market

| Document | What it gives you | When to open it |
|----------|-------------------|-----------------|
| [`go-to-market/cold-email-playbook.md`](./go-to-market/cold-email-playbook.md) | 5-touch sequence, 15 subject line templates, 6 hook frameworks, reply handlers | Rewrite the next 30 sends |
| [`go-to-market/fractional-coo-partner-program.md`](./go-to-market/fractional-coo-partner-program.md) | Full program spec — 25% lifetime commission, multi-client dashboard PRD, partner tier criteria, 90-day onboarding, recruitment plan for first 25 partners | Before posting in Fractionals United |
| [`go-to-market/community-90-day-plan.md`](./go-to-market/community-90-day-plan.md) | 8 communities mapped + ranked, 30+ post drafts, influencer outreach, conference list, 90-day targets | This week |

---

## Competitive

| Document | What it gives you |
|----------|-------------------|
| [`competitive/competitor-teardowns.md`](./competitive/competitor-teardowns.md) | 10 deep profiles (Productive, Scoro, Kantata, Accelo, Float, Resource Guru, AgencyAnalytics, ClickUp, ZenPilot, Parakeeto) + battle-card matrix + sales lines |
| `competitive/*-teardown.md` | Individual teardowns for Cursor, Linear, Lovable, Mercury, Notion, PostHog, Ramp, Stripe, Vercel — design and positioning lessons |

---

## Copy (Live Page Drafts)

Finalized copy for every marketing page. Update here when copy changes.

| Document | Page |
|----------|------|
| [`copy/home.md`](./copy/home.md) | `/` |
| [`copy/pricing.md`](./copy/pricing.md) | `/pricing` |
| [`copy/product-page.md`](./copy/product-page.md) | `/product` |
| [`copy/how-it-works.md`](./copy/how-it-works.md) | `/how-it-works` |
| [`copy/about.md`](./copy/about.md) | `/about` |
| [`copy/faq.md`](./copy/faq.md) | `/faq` |
| [`copy/audit-funnel.md`](./copy/audit-funnel.md) | `/audit` |
| [`copy/for-paid-media.md`](./copy/for-paid-media.md) | `/for/paid-media` |
| [`copy/for-seo.md`](./copy/for-seo.md) | `/for/seo` |
| [`copy/for-vertical-template.md`](./copy/for-vertical-template.md) | Template for new `/for/*` pages |

---

## Design

| Document | What it is |
|----------|------------|
| [`design/design-language-opsradar.md`](./design/design-language-opsradar.md) | Design token system, typography scale, color palette, spacing rules |
| [`design/design-audit-live-site.md`](./design/design-audit-live-site.md) | May 2026 live-site design audit findings vs 10 SaaS benchmarks |
| [`design/design-redesign-specs.md`](./design/design-redesign-specs.md) | 10-page redesign specs + site-wide design fixes |
| [`design/vibe-coded-trap.md`](./design/vibe-coded-trap.md) | Anti-AI-uniform design checklist + audit of opsradar.com | Before any new page ships |

---

## Operations

| Document | What it is |
|----------|------------|
| [`operations/payments-iraq-research.md`](./operations/payments-iraq-research.md) | Payment infrastructure research for Iraq-based founder (Stripe Connect blocked by country; alternatives) |

---

## Dev — Active

| Document | What it is |
|----------|------------|
| [`dev/plans/2026-05-19-backend-gap-closure.md`](./dev/plans/2026-05-19-backend-gap-closure.md) | Tier enforcement, retainer, FO dashboard, action limits, webhooks |
| [`dev/plans/2026-05-21-coo-agent.md`](./dev/plans/2026-05-21-coo-agent.md) | COO agent v1 — tool use, SSE streaming, 5 read tools + queue_action |
| [`dev/specs/2026-05-21-coo-agent-design.md`](./dev/specs/2026-05-21-coo-agent-design.md) | COO agent architecture: agent loop, SSE protocol, tool definitions |
| [`dev/specs/2026-05-21-kb-upgrade-design.md`](./dev/specs/2026-05-21-kb-upgrade-design.md) | KB frontmatter + ranking + `coo_kb_gaps` capture + admin view |

Historical plans and specs are in [`dev/archive/`](./dev/archive/).

---

## Architecture (current truth)

**Single-system architecture.** OpsRadar is one Next.js 16 app on Vercel + Supabase. There is no second backend, no workflow generator, no n8n integration. The decision to sever the previously separate `chatv2` service is documented in [`adr/0001-composio-broker.md`](./adr/0001-composio-broker.md).

**Knowledge base = Anthropic Agent Skills (CP-17).** 46 SKILL.md files in `knowledge-base/skills/<domain>/<name>/SKILL.md`, loaded into every agent's system prompt as `name + description` pairs, fetched in full via the `load_skill` tool on demand. No RAG on the hot path. Spec in [`adr/0003-skills-over-rag.md`](./adr/0003-skills-over-rag.md); authoring rules in [`knowledge-base/skills/INDEX.md`](../knowledge-base/skills/INDEX.md).

**Audit funnel retired (CP-16).** `/audit` is a "Coming soon: live demo" placeholder. `/results` and `/share/[id]` are deleted. Marketing CTAs still resolve.

Read [`CLAUDE.md`](../CLAUDE.md) for the technical map (routes, libs, services). Read [`adr/0005-control-first-approval-gate.md`](./adr/0005-control-first-approval-gate.md) for the CP-14 control-surface decisions. Read [`adr/0003-skills-over-rag.md`](./adr/0003-skills-over-rag.md) for the KB architecture.

---

## Quick Reference

**The bet in 10 minutes:** [`positioning/path-a-strategy.md`](./positioning/path-a-strategy.md) — Parts 1, 3, 5, and 8.

**YC Summer 2026 fit:** Category #15 "AI Operating System for Companies" (primary), #2 "AI-Native Service Companies" (secondary), #4 "Company Brain" + #12 "Software for Agents" (also strong). See [`yc/research-addendum.md`](./yc/research-addendum.md).

**Build the YC product:** [`yc/build-architecture.md`](./yc/build-architecture.md) — Vercel AI SDK v6 + Inngest + pgvector + Langfuse + OAuth-secured MCP.

**Current prices:** Starter $750/mo · Growth $1,500/mo · Pro $3,000/mo · Fractional Operator $1,200/mo + $300/agency

---

## Voice Rules (Apply to Everything in This Folder)

- **Use:** AI COO, intelligence layer, ops brain, real-time, before it costs you, recommendations, what to do next, agency-specific, margin, utilization, scope creep, fractional COO replacement
- **Avoid:** dashboard (as commodity), platform, holistic, enterprise-grade, AI assistant (generic), automation (alone), efficiency (without a $ amount), specific feature counts
- **Direct, founder-to-founder.** Dollar amounts over adjectives. Active voice. Short sentences.
