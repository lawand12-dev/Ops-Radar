# OpsRadar Docs — Index

*Last updated: 2026-05-27*

> **⚠️ 2026-05-26 pivot — read before trusting older docs.** Three things changed that pre-2026-05-26 docs still describe the old way:
> 1. **Broker: Composio → Nango.** Composio was removed after the 2026-05-21 breach (5,024 OAuth tokens compromised). The broker is now **Nango** (`src/lib/nango.ts`). See [`adr/0010-nango-broker.md`](./adr/0010-nango-broker.md). Any doc that names Composio as live is either superseded (ADRs carry a banner) or a dated historical snapshot.
> 2. **Surfaces collapsed into Hire.** `/dashboard/coo`, `/dashboard/agents`, `/dashboard/automations` are gone; they're now one surface, `/dashboard/hire`. See [`adr/0011-hire-surface-collapse.md`](./adr/0011-hire-surface-collapse.md).
> 3. **Framing broadened.** "Marketing agencies" → "service businesses / agencies / consultancies broadly."
> Research snapshots (`research/*`) are dated and preserved as-is — they're history, not current truth.

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
    ├── plans/                   ← dated implementation plans (some pre-pivot)
    ├── specs/                   ← dated design specs (some pre-pivot)
    └── archive/                 ← historical plans + specs
```

*(The former `superpowers/` folder was folded into `dev/` on 2026-05-27.)*

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
| [`adr/0001-composio-broker.md`](./adr/0001-composio-broker.md) | ~~Composio over n8n~~ **Superseded by 0010.** The "no workflow builder, kill chatv2" half still holds | Before "should we add a workflow builder?" |
| [`adr/0002-scheduler-trigger-dev.md`](./adr/0002-scheduler-trigger-dev.md) | Trigger.dev for durable scheduling | Before adding a new cron / durable workflow |
| [`adr/0003-skills-over-rag.md`](./adr/0003-skills-over-rag.md) | Anthropic Agent Skills > RAG | Before writing a new SKILL.md or "should we add RAG?" |
| [`adr/0004-three-tier-memory.md`](./adr/0004-three-tier-memory.md) | Brain = Supabase warehouse + Notion mirror + broker live (Nango) | Before any memory change |
| [`adr/0005-control-first-approval-gate.md`](./adr/0005-control-first-approval-gate.md) | Approval-gate every write action (CP-14 spec) | Before adding a new agent surface |
| [`adr/0006-orchestrator-worker-pattern.md`](./adr/0006-orchestrator-worker-pattern.md) | 10 domain orchestrators read 17 tool workers (CP-19) | Before new agent design |
| [`adr/0007-senior-coo-playbook.md`](./adr/0007-senior-coo-playbook.md) | Embed operator judgment in every agent prompt (CP-21) | Before any prompt rewrite |
| [`adr/0008-observability-sentry-statsig-langfuse.md`](./adr/0008-observability-sentry-statsig-langfuse.md) | Sentry + Statsig + Langfuse stack | Before adding a new observability vendor |
| [`adr/0009-engineering-stack-2026-05.md`](./adr/0009-engineering-stack-2026-05.md) | **Engineering stack stress-test (2026-05-26)** — 4-layer 2026-consensus audit. 81% aligned, 8 concrete upgrades ranked by impact/effort. Re-evaluate every 90 days. *(Tools-layer verdict closed by the Nango migration — see post-script + 0010)* | Before any architectural change. Sibling to `positioning/identity.md` |
| [`adr/0010-nango-broker.md`](./adr/0010-nango-broker.md) | **Composio → Nango (2026-05-27)** — broker migration after the 2026-05-21 breach. Connect Session token model, Supabase mapping. Supersedes 0001 | Before any integration / OAuth / broker work |
| [`adr/0011-hire-surface-collapse.md`](./adr/0011-hire-surface-collapse.md) | **Surface collapse (2026-05-27)** — coo/agents/automations → one `/dashboard/hire` surface | Before any dashboard-surface change |
| [`adr/0012-model-fallback-stack.md`](./adr/0012-model-fallback-stack.md) | **Model fallback (2026-05-27)** — OpenAI primary → Groq → DigitalOcean Gradient backup | Before changing any model wiring |

## Positioning

| Document | What it is | When to read |
|----------|------------|--------------|
| [`positioning/identity.md`](./positioning/identity.md) | **The triangulated identity verdict (2026-05-25, updated 2026-05-26/27)** — two-pillar identity, the sharpened "stacking" moat, the three demand-validated differentiators. Supersedes fragments in path-a/moats. Sibling to ADR 0009 | **Open this first** before any positioning, pricing, ICP, or YC change |
| [`positioning/path-a-strategy.md`](./positioning/path-a-strategy.md) | The master strategy. Competitor gap, 4-tier pricing, YC fit, 90-day execution plan. *(Category broadened 2026-05-27 to service businesses that bill for client time — agencies kept as the named beachhead)* | Always. The working document |
| [`positioning/inversions.md`](./positioning/inversions.md) | **The 3 out-of-box inversions tested 2026-05-26** — drove narrative reframes (brain-led hero, earned autonomy, fractional-COO leverage layer) + flagged the tier-enforcement code gap | After any positioning conversation; before any "should we pivot" decision |
| [`positioning/pricing-depth.md`](./positioning/pricing-depth.md) | Van Westendorp + WTP + competitive anchor. Current tiers + their reasoning | Before any pricing conversation or tier change |
| [`positioning/moats.md`](./positioning/moats.md) | Razorpay's 6 provocations on moats applied to OpsRadar | Before YC interview, before any "let's add an easy feature" decision |
| [`positioning/vs-pages.md`](./positioning/vs-pages.md) | 3 launch-ready SEO landing pages: `/vs/productive`, `/vs/scoro`, `/vs/float` | When ready for SEO landing pages |

## Research

Evidence snapshots — every claim cited, no decisions inside. Read these to back up a claim or update a positioning doc. **Snapshots are dated and frozen — they are history, not current truth.**

**Newest (2026-05-27 — post-pivot):**

| Document | What it answers |
|----------|-----------------|
| [`research/2026-05-27-nango-broker-best-practices.md`](./research/2026-05-27-nango-broker-best-practices.md) | Nango architecture + security, the post-breach broker landscape (Nango vs Composio/Pica/Arcade), migrating off a breached broker, OpenAI→Groq→Gradient fallback patterns. Backs ADR 0010 + 0012 |
| [`research/2026-05-27-competitive-refresh.md`](./research/2026-05-27-competitive-refresh.md) | Competitor moves since mid-May (Glean, Cognition, BOND, Lindy, 11x retreat, new entrants); integration-token custody as a new front-of-pitch buying criterion; fresh customer gripes |
| [`research/2026-05-27-yc-fundraising-refresh.md`](./research/2026-05-27-yc-fundraising-refresh.md) | YC Summer 2026 RFS specifics (3 partner-authored categories OpsRadar hits); the "de-risked under fire" breach-recovery narrative; solo/international founder angle |
| [`research/2026-05-27-yc-deep-dive-application.md`](./research/2026-05-27-yc-deep-dive-application.md) | **The S26 application mechanics** — verbatim form fields + what each probes, the 10-min interview run-of-show + first-hand accounts, full RFS authorship, funded-comp roster, attributed partner quotes, honest odds + SF-relocation reality, rejection anti-patterns, a 10-move playbook. The "how to actually fill the form" companion to `yc/what-yc-wants.md` |
| [`research/2026-05-27-post-pivot-positioning-validation.md`](./research/2026-05-27-post-pivot-positioning-validation.md) | Validates broadening to "service businesses that bill for client time." **Verdict: HYBRID — build broad, sell narrow.** SPI/Deltek shared-pain benchmark; consulting/accounting as stronger beachheads than saturated agencies |

**Fresh (2026-05-25):**

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
| [`research/2026-05-26-inversion-1-brain-as-product.md`](./research/2026-05-26-inversion-1-brain-as-product.md) | **Inversion 1** — is brain the actual product? Verdict: invert the narrative, not the pricing. Anchor on agency-exit math (8-12× vs 5-9× EBITDA multiples) |
| [`research/2026-05-26-inversion-2-approval-gate-long-term.md`](./research/2026-05-26-inversion-2-approval-gate-long-term.md) | **Inversion 2** — approval-gate forever? Verdict: it's a phase. Evolve to confidence-gated "earned autonomy" within 12 months |
| [`research/2026-05-26-inversion-3-wrong-buyer.md`](./research/2026-05-26-inversion-3-wrong-buyer.md) | **Inversion 3** — wrong buyer? Verdict: no pivot. Add fractional-COO as multi-tenant leverage on existing agency wedge |
| [`research/2026-05-25-company-brain-pattern.md`](./research/2026-05-25-company-brain-pattern.md) | The "Company Brain" pattern — how production teams build the persistent knowledge layer (YC RFS #4 basis) |
| [`research/2026-05-25-horizontal-pricing.md`](./research/2026-05-25-horizontal-pricing.md) | Horizontal AI-workforce pricing evidence (companion to `pricing-deep-dive`; informs `positioning/pricing-depth.md`) |
| [`research/2026-05-25-horizontal-workforce-comps.md`](./research/2026-05-25-horizontal-workforce-comps.md) | Horizontal-at-SMB probability comps — the data behind the "broker breadth is the moat, not the wedge" verdict |

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
| [`specs/nango-broker.md`](./specs/nango-broker.md) | **How the Nango broker works (2026-05-27)** — Connect Sessions, `nangoProxy()`, connection resolution, token model. Companion to ADR 0010 |
| [`specs/ai-employees.md`](./specs/ai-employees.md) | CP-34 — custom AI employees architecture (hireable, scheduled, scoped). *Note: agent registry is mid-rebuild on Nango — see ADR 0010/0011* |
| [`specs/automations.md`](./specs/automations.md) | CP-20 — customer-built event-triggered automations |
| [`specs/architecture-audit.md`](./specs/architecture-audit.md) | Cross-app architecture audit vs Notion / Lindy / BOND |
| [`specs/trigger-composio-integration.md`](./specs/trigger-composio-integration.md) | Trigger.dev patterns (still valid). **Broker half superseded by `nango-broker.md`** |
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
| [`yc/four-categories-build.md`](./yc/four-categories-build.md) | Build mapping across the 4 YC categories OpsRadar fits | Alongside `build-architecture.md` |
| [`yc/cto-briefing.md`](./yc/cto-briefing.md) | The CTO briefing — technical narrative + division of labor for the application | Before any cofounder/CTO conversation about the application |
| [`yc/mcp-registry-submission.md`](./yc/mcp-registry-submission.md) | MCP registry submission (YC #12 "Software for Agents" proof) | Before submitting OpsRadar's MCP server to the registry |

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
| `competitive/cursor-teardown/` | Screenshot evidence (PNGs + snapshot) backing the Cursor teardown — the only teardown with a media subfolder |

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
| [`copy/for-fractional-coo.md`](./copy/for-fractional-coo.md) | `/for/fractional-coo` |
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

| Document | What it is | When to read |
|----------|------------|--------------|
| [`dev/stack-reference.md`](./dev/stack-reference.md) | **Exact-version API truth for the whole stack (2026-05-27)** — Next 16 / React 19 / Tailwind v4 / AI SDK v6 / Nango / Supabase-ssr / Trigger v4 / Sentry 10 / Notion 5, etc. Flags the "my training says X but vNow does Y" deltas + 4 live repo footguns. Verified via Context7 | **Before writing code against any stack library** |

> **Dated implementation artifacts.** The plans/specs below are point-in-time (2026-05-19 → 2026-05-25), like research snapshots — frozen at their date. **Several predate the 2026-05-26 pivot and reference Composio / the 28-agent stack / separate COO+agents surfaces as live.** Read them as a record of what was being built then; for current truth see the ADRs (esp. 0010/0011) and the "Architecture (current truth)" section below. Folders: `dev/plans/` (intent), `dev/specs/` (design).

| Document | What it is |
|----------|------------|
| [`dev/plans/2026-05-19-backend-gap-closure.md`](./dev/plans/2026-05-19-backend-gap-closure.md) | Tier enforcement, retainer, FO dashboard, action limits, webhooks |
| [`dev/plans/2026-05-19-chatv2-integration-architecture.md`](./dev/plans/2026-05-19-chatv2-integration-architecture.md) | chatv2 integration (pre-CP-15 sever) — historical |
| [`dev/plans/2026-05-21-coo-agent.md`](./dev/plans/2026-05-21-coo-agent.md) | COO agent v1 — tool use, SSE streaming, 5 read tools + queue_action |
| [`dev/plans/2026-05-23-agents-notion-composio-build.md`](./dev/plans/2026-05-23-agents-notion-composio-build.md) | Agents + Notion brain build (pre-pivot, Composio-based) — historical |
| [`dev/plans/2026-05-24-notion-brain-backfill-plan.md`](./dev/plans/2026-05-24-notion-brain-backfill-plan.md) | Notion brain backfill plan (moved from `superpowers/`; Composio-based — historical) |
| [`dev/specs/2026-05-21-coo-agent-design.md`](./dev/specs/2026-05-21-coo-agent-design.md) | COO agent architecture: agent loop, SSE protocol, tool definitions |
| [`dev/specs/2026-05-21-kb-upgrade-design.md`](./dev/specs/2026-05-21-kb-upgrade-design.md) | KB frontmatter + ranking + `coo_kb_gaps` capture + admin view |
| [`dev/specs/2026-05-23-agents-notion-composio-design.md`](./dev/specs/2026-05-23-agents-notion-composio-design.md) | Agents + Notion brain design (pre-pivot, Composio-based) — historical |
| [`dev/specs/2026-05-24-notion-brain-backfill-design.md`](./dev/specs/2026-05-24-notion-brain-backfill-design.md) | Notion brain backfill design (moved from `superpowers/`; Composio-based — historical) |
| [`dev/specs/2026-05-25-ai-employees-master-plan.md`](./dev/specs/2026-05-25-ai-employees-master-plan.md) | AI employees master plan (pre-pivot) — see `specs/ai-employees.md` for current |

Historical plans and specs are in [`dev/archive/`](./dev/archive/) (incl. the archived Composio action catalog + the two former `dev/` root orphans).

---

## Architecture (current truth)

**Single-system architecture.** OpsRadar is one Next.js 16 app on Vercel + Supabase. There is no second backend, no workflow generator, no n8n integration. The decision to sever the previously separate `chatv2` service is documented in [`adr/0001-composio-broker.md`](./adr/0001-composio-broker.md) (the chatv2/n8n half of that ADR still holds).

**Broker = Nango (2026-05-27).** OAuth for ~20 tools (Stripe, HubSpot, Gmail, ClickUp, Notion, etc.) is brokered by **Nango** (`src/lib/nango.ts`), which replaced Composio after the 2026-05-21 breach. Tokens live in Nango's infra behind short-lived Connect Session tokens; Supabase's `integrations` table stores only the `userId → connectionId` mapping (never the tokens). Decision in [`adr/0010-nango-broker.md`](./adr/0010-nango-broker.md); mechanics in [`specs/nango-broker.md`](./specs/nango-broker.md).

**Surfaces collapsed into Hire (2026-05-27).** The separate `/dashboard/coo`, `/dashboard/agents`, `/dashboard/automations` routes are gone — collapsed into one `/dashboard/hire` surface. Current dashboard routes: `actions`, `brain`, `employees`, `fo`, `hire`, `integrations`, `runs`, `settings`, `webhooks`. See [`adr/0011-hire-surface-collapse.md`](./adr/0011-hire-surface-collapse.md).

**Agent stack mid-rebuild.** The 28-agent stack (10 domain + 17 tool + 1 evaluator) was torn down with Composio; `src/lib/agents/registry.ts` currently holds **one** agent (Gmail), rebuilding on Nango one at a time. Docs describing "28 agents" describe the pre-pivot or target state, not what's live today.

**Model fallback (2026-05-27).** OpenAI primary (gpt-5.4/5.5) → Groq backup (llama-4-scout for chat/tool-calling, gpt-oss-120b for structured output) → DigitalOcean Gradient. Source: `src/lib/ai/model-provider.ts`. See [`adr/0012-model-fallback-stack.md`](./adr/0012-model-fallback-stack.md).

**Knowledge base = Anthropic Agent Skills (CP-17).** 47 SKILL.md files in `knowledge-base/skills/<domain>/<name>/SKILL.md`, loaded into every agent's system prompt as `name + description` pairs, fetched in full via the `load_skill` tool on demand. No RAG on the hot path. Spec in [`adr/0003-skills-over-rag.md`](./adr/0003-skills-over-rag.md); authoring rules in [`knowledge-base/skills/INDEX.md`](../knowledge-base/skills/INDEX.md).

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
