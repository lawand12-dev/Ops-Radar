# OpsRadar Docs — Index

*Last updated: 2026-05-19*

This folder is the operating system for OpsRadar's go-to-market, copy, design, and product development. Every document is action-shaped — opened the moment you need to do the thing it describes.

---

## Folder Map

```
docs/
├── strategy/          ← why this bet, market research, pricing framework
├── go-to-market/      ← outbound playbooks, partner program, community plan
├── competitive/       ← 10 SaaS teardowns + competitor battle cards
├── copy/              ← finalized copy for every marketing page
├── design/            ← design language, audit findings, redesign specs
└── dev/
    ├── plans/         ← shipped implementation plans (dated)
    └── specs/         ← architecture specs for each plan
```

---

## Strategy & Market

| Document | What it is | When to read |
|----------|------------|--------------|
| [`strategy/ai-market-research-2026.md`](./strategy/ai-market-research-2026.md) | 10-section market research with 30+ sources. The $2.52T AI spend / 95% zero ROI / IBM 61-point gap data | Before any investor conversation or category-level positioning decision |
| [`strategy/path-a-strategy-2026.md`](./strategy/path-a-strategy-2026.md) | The master strategy. Why AI COO for agencies wins, 27-competitor gap analysis, 4-tier pricing, 90-day execution plan, Section 11 settled decisions | Always. This is the working document |
| [`strategy/pricing-depth.md`](./strategy/pricing-depth.md) | Van Westendorp + WTP + competitive anchor + value-based pricing. Tiers: $750 / $1,500 / $3,000 / $1,200+$300. Expansion triggers ranked, full objection bank | Before any pricing conversation or tier change |
| [`strategy/icp-customer-research.md`](./strategy/icp-customer-research.md) | 3 detailed personas, 10 ranked buying triggers, disqualifier list, JTBD map, 15-channel sourcing playbook, 10 qualifying questions | Before any cold-prospecting batch |
| [`strategy/vs-pages.md`](./strategy/vs-pages.md) | 3 launch-ready landing pages: `/vs/productive`, `/vs/scoro`, `/vs/float` + dev implementation notes | When the marketing site is ready for SEO landing pages |

---

## Go-to-Market

| Document | What it gives you | When to open it |
|----------|-------------------|-----------------|
| [`go-to-market/cold-email-playbook.md`](./go-to-market/cold-email-playbook.md) | 5-touch sequence, 15 subject line templates, 6 hook frameworks, reply handlers | This Monday. Rewrite the next 30 sends |
| [`go-to-market/fractional-coo-partner-program.md`](./go-to-market/fractional-coo-partner-program.md) | Full program spec — 25% lifetime commission, multi-client dashboard PRD, partner tier criteria, 90-day partner onboarding, recruitment plan for first 25 partners | Before posting in Fractionals United |
| [`go-to-market/community-90-day-plan.md`](./go-to-market/community-90-day-plan.md) | 8 communities mapped + ranked, 30+ specific post drafts, influencer outreach plan, conference list, 90-day targets | This week. Pick Online Geniuses and start answering questions |

---

## Competitive

| Document | What it gives you | When to open it |
|----------|-------------------|-----------------|
| [`competitive/competitor-teardowns.md`](./competitive/competitor-teardowns.md) | 10 deep competitor profiles (Productive, Scoro, Kantata, Accelo, Float, Resource Guru, AgencyAnalytics, ClickUp, ZenPilot, Parakeeto) + battle-card matrix + sales lines | Before any sales call where a prospect mentions a competitor |
| `competitive/*-teardown.md` | Individual teardowns for Cursor, Linear, Lovable, Mercury, Notion, PostHog, Ramp, Stripe, Vercel — design and positioning lessons | Design and copy reference |

---

## Copy (Live Page Drafts)

Finalized copy for every marketing page. These are the source of truth for what's on the live site — update here when copy changes.

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
| [`design/design-audit-live-site.md`](./design/design-audit-live-site.md) | Findings from the May 2026 live-site design audit vs 10 SaaS benchmarks |
| [`design/design-redesign-specs.md`](./design/design-redesign-specs.md) | Redesign spec: light mode, Mercury spacing, sans headline cascade, radar-blue tokens |

---

## Dev — Plans & Specs

Dated implementation plans and architecture specs. These are reference documents — the code is the source of truth once a plan is shipped.

**Recent plans** (most relevant for context on shipped features):

| Plan | What shipped |
|------|-------------|
| [`dev/plans/2026-05-18-ai-coo-intelligence-engine.md`](./dev/plans/2026-05-18-ai-coo-intelligence-engine.md) | AI COO intelligence engine |
| [`dev/plans/2026-05-17-agentic-actions.md`](./dev/plans/2026-05-17-agentic-actions.md) | Agentic actions with 30-min undo + 5 evaluators |
| [`dev/plans/2026-05-17-ai-coo-briefings.md`](./dev/plans/2026-05-17-ai-coo-briefings.md) | Weekly AI COO briefings |
| [`dev/plans/2026-05-16-full-integration-expansion.md`](./dev/plans/2026-05-16-full-integration-expansion.md) | 10 live integrations |
| [`dev/plans/2026-05-15-dashboard-redesign.md`](./dev/plans/2026-05-15-dashboard-redesign.md) | Dashboard redesign |
| [`dev/plans/2026-05-12-api-key-integrations-framework.md`](./dev/plans/2026-05-12-api-key-integrations-framework.md) | Model C customer API-key framework |

Older plans in [`dev/plans/`](./dev/plans/) and specs in [`dev/specs/`](./dev/specs/).

---

## Start Here

**The bet in 10 minutes:** [`strategy/path-a-strategy-2026.md`](./strategy/path-a-strategy-2026.md) sections 1, 5, 9, and 11.

**What to do this week:** `path-a-strategy-2026.md` section 12.1.

**Current prices:** Starter $750/mo · Growth $1,500/mo · Pro $3,000/mo · Fractional Operator $1,200/mo + $300/agency

---

## Voice Rules (Apply to Everything in This Folder)

- **Use:** AI COO, intelligence layer, ops brain, real-time, before it costs you, recommendations, what to do next, agency-specific, vertical, margin, utilization, scope creep, fractional COO replacement
- **Avoid:** dashboard (as commodity), platform, holistic, enterprise-grade, AI assistant (generic), ChatGPT-powered, automation (alone), efficiency (without a $ amount), specific feature counts, specific delivery times
- **Never reference internally:** n8n, Claude, specific model providers — implementation details, not product surface
- **Direct, founder-to-founder.** Dollar amounts over adjectives. Active voice. Short sentences.
