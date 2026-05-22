# OpsRadar Docs — Index

*Last updated: 2026-05-21*

This folder is the operating system for OpsRadar's go-to-market, copy, design, product, and capital raise. Every document is action-shaped — opened the moment you need to do the thing it describes.

---

## Folder Map

```
docs/
├── strategy/        ← master strategy, market research, pricing, ICP
├── yc/              ← YC Summer 2026 application track
├── fundraising/     ← VC research, investor outreach guide
├── go-to-market/    ← outbound playbooks, partner program, community plan
├── competitive/     ← 10 SaaS teardowns + competitor battle cards
├── copy/            ← finalized copy for every marketing page
├── design/          ← design language, audit findings, redesign specs
├── operations/      ← business operations research (payments, infra)
└── dev/
    ├── branch-organization.md   ← domain ownership: main vs chatv2
    ├── plans/                   ← active implementation plans
    ├── specs/                   ← active design specs
    ├── proposals/               ← reliability/KPI proposals (shipped)
    ├── chatv2/                  ← chatv2 service API spec + OpenAPI
    └── archive/                 ← historical plans + specs (Apr 30 – May 18)
```

---

## Strategy & Market

| Document | What it is | When to read |
|----------|------------|--------------|
| [`strategy/path-a-strategy-2026.md`](./strategy/path-a-strategy-2026.md) | The master strategy. AI COO for agencies thesis, 27-competitor gap, 4-tier pricing, YC #15 fit, 90-day execution plan | Always. This is the working document |
| [`strategy/icp-customer-research.md`](./strategy/icp-customer-research.md) | 3 personas, 10 buying triggers, disqualifier list, JTBD map, 15-channel sourcing, 10 qualifying questions | Before any cold-prospecting batch |
| [`strategy/pricing-depth.md`](./strategy/pricing-depth.md) | Van Westendorp + WTP + competitive anchor. Tiers: $750 / $1,500 / $3,000 / $1,200+$300 | Before any pricing conversation or tier change |
| [`strategy/ai-market-research-2026.md`](./strategy/ai-market-research-2026.md) | $2.52T AI spend / 8.8% actual production adoption gap / CAIO trend data | Before investor conversations |
| [`strategy/agency-tools-research-2026.md`](./strategy/agency-tools-research-2026.md) | Deep research on agency tool fragmentation — HubSpot/Pipedrive/ClickUp/Harvest adoption patterns, 59-65% cite fragmentation, 20% can't report margins | Before ICP calls or product prioritization |
| [`strategy/vs-pages.md`](./strategy/vs-pages.md) | 3 launch-ready SEO landing pages: `/vs/productive`, `/vs/scoro`, `/vs/float` | When ready for SEO landing pages |
| [`strategy/ai-data-revolution-2026.md`](./strategy/ai-data-revolution-2026.md) | Cloud→AI wave shift applied to agencies: 80/20 unstructured data split, 3 AI agent capabilities mapped to OpsRadar product, strategic-vs-necessary task table ($143–182K/year of agent-absorbable work per agency), outcome bundle pricing model, 3-year window countdown | Before YC application or pricing change |

---

## YC Summer 2026

| Document | What it gives you | When to open it |
|----------|-------------------|-----------------|
| [`yc/research-addendum.md`](./yc/research-addendum.md) | Fresh May 2026 data for the 4 YC categories OpsRadar fits (#2 AI-Native Services, #4 Company Brain, #12 Software for Agents, #15 AI OS) — MCP adoption, agentic ROI, agency profit gaps. **🚨 S26 deadline EXTENDED to May 25 + $2M OpenAI tokens grant.** | Before YC application or any investor conversation |
| [`yc/build-architecture.md`](./yc/build-architecture.md) | The sophisticated build blueprint across all 4 categories — Vercel AI SDK v6, Inngest, hybrid GraphRAG, OAuth-secured MCP server, event-driven supervisor/worker, Langfuse observability. Includes sprint sequencing | Before any net-new product work |

---

## Theory & Methodology (May 2026 — YC synthesis stack)

These four docs are the canonical engineering + philosophy stack synthesised from May 2026 YC briefings. Read in this order:

| Document | What it is |
|----------|------------|
| [`software-3-engineering-2026.md`](./software-3-engineering-2026.md) | **The theory** — Karpathy's Software 1.0/2.0/3.0 framework, the 20/80 inversion, jagged intelligence, Program MD as the soul of the org, Claws, Auto-Research loop. Why engineering itself has changed. |
| [`build-methodology-2026.md`](./build-methodology-2026.md) | **The day-to-day playbook** — GStack adapted for OpsRadar. 4 phases (CEO plan → ASCII grounding → Conductor velocity → 90% Playwright QA). Tokenmaxxing metrics, founder's daily operating loop, anti-patterns to reject. |
| [`ai-native-company-2026.md`](./ai-native-company-2026.md) | **The 5 recursive loops** — Autonomous Engineering / Diorization / Disposable Software (Permanent Data) / Token-Maxing Culture / Human at the Edge. The cultural blueprint for the AI-native agency that OpsRadar enables (and IS). |
| [`architecture-2026.md`](./architecture-2026.md) | **The chatv2 technical plan** — 5 strengthening priorities (multi-pass agent, GraphRAG, envelope encryption, Langfuse, MCP-native), cloud infra patterns (chatv2 as Sovereign-style control plane), Loop modules mapped to migrations, 8-sprint sequence. |

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
| [`design/vibe-coded-trap.md`](./design/vibe-coded-trap.md) | Anti-AI-uniform design checklist + audit of opsradar.com (avoided 4/5 vibe-coded tells; at-risk on Google-palette dashboards + Shadcn hover defaults). 5 candidate distinctive design moves with scores; recommended install: cyan-as-liveness rule (`#00D4FF` reserved exclusively for live elements) + live margin ticker + serif-italic founder byline | Before any new page ships |

---

## Operations

| Document | What it is |
|----------|------------|
| [`operations/payments-iraq-research.md`](./operations/payments-iraq-research.md) | Payment infrastructure research for Iraq-based founder (Stripe Connect blocked by country; alternatives) |

---

## Dev — Active

| Document | What it is |
|----------|------------|
| [`dev/branch-organization.md`](./dev/branch-organization.md) | Domain ownership matrix: what lives on `main` (Supabase) vs `chatv2` (MySQL). Read this before any new feature. |
| [`dev/plans/2026-05-19-chatv2-integration-architecture.md`](./dev/plans/2026-05-19-chatv2-integration-architecture.md) | chatv2 typed client, project mapping, service-key auth pattern |
| [`dev/plans/2026-05-19-backend-gap-closure.md`](./dev/plans/2026-05-19-backend-gap-closure.md) | Tier enforcement, retainer, FO dashboard, action limits, webhooks |
| [`dev/plans/2026-05-21-coo-agent.md`](./dev/plans/2026-05-21-coo-agent.md) | COO agent v1 — tool use, SSE streaming, 5 read tools + queue_action |
| [`dev/specs/2026-05-21-coo-agent-design.md`](./dev/specs/2026-05-21-coo-agent-design.md) | COO agent architecture: agent loop, SSE protocol, tool definitions |
| [`dev/specs/2026-05-21-kb-upgrade-design.md`](./dev/specs/2026-05-21-kb-upgrade-design.md) | KB frontmatter + ranking + `coo_kb_gaps` capture + admin view |
| [`dev/proposals/dashboard-reliability-fixes.md`](./dev/proposals/dashboard-reliability-fixes.md) | 6 reliability fixes + KPI snapshots — all shipped 2026-05-21 |
| [`dev/chatv2/service-api-spec.md`](./dev/chatv2/service-api-spec.md) | chatv2 service-key REST API spec (user-centric, no project_id) |
| [`dev/chatv2/openapi-v1.yaml`](./dev/chatv2/openapi-v1.yaml) | chatv2 OpenAPI v1 schema |

Historical plans and specs are in [`dev/archive/`](./dev/archive/).

---

## Quick Reference

**The bet in 10 minutes:** [`strategy/path-a-strategy-2026.md`](./strategy/path-a-strategy-2026.md) — Parts 1, 3, 5, and 8.

**YC Summer 2026 fit:** Category #15 "AI Operating System for Companies" (primary), #2 "AI-Native Service Companies" (secondary), #4 "Company Brain" + #12 "Software for Agents" (also strong). See [`yc/research-addendum.md`](./yc/research-addendum.md).

**Build the YC product:** [`yc/build-architecture.md`](./yc/build-architecture.md) — Vercel AI SDK v6 + Inngest + pgvector + Langfuse + OAuth-secured MCP.

**Current prices:** Starter $750/mo · Growth $1,500/mo · Pro $3,000/mo · Fractional Operator $1,200/mo + $300/agency

**Domain rule:** Customer state → Supabase (`main`). Platform compute/AI/n8n → chatv2 (MySQL, CTO-managed).

---

## Voice Rules (Apply to Everything in This Folder)

- **Use:** AI COO, intelligence layer, ops brain, real-time, before it costs you, recommendations, what to do next, agency-specific, margin, utilization, scope creep, fractional COO replacement
- **Avoid:** dashboard (as commodity), platform, holistic, enterprise-grade, AI assistant (generic), automation (alone), efficiency (without a $ amount), specific feature counts
- **Never surface internally:** n8n, Claude, specific model providers — implementation details, not product surface
- **Direct, founder-to-founder.** Dollar amounts over adjectives. Active voice. Short sentences.
