# OpsRadar Docs — Index

*Last updated: 2026-05-21*

This folder is the operating system for OpsRadar's go-to-market, copy, design, and product development. Every document is action-shaped — opened the moment you need to do the thing it describes.

---

## Folder Map

```
docs/
├── strategy/          ← master strategy, market research, pricing, ICP
├── go-to-market/      ← outbound playbooks, partner program, community plan
├── competitive/       ← 10 SaaS teardowns + competitor battle cards
├── copy/              ← finalized copy for every marketing page
├── design/            ← design language, audit findings
└── dev/
    ├── branch-organization.md   ← domain ownership: what goes on main vs chatv2
    ├── plans/                   ← active implementation plans (May 19+)
    ├── proposals/               ← shipped reliability + KPI snapshots (May 21)
    └── archive/                 ← all plans + specs from Apr 30 – May 18
```

---

## Strategy & Market

| Document | What it is | When to read |
|----------|------------|--------------|
| [`strategy/path-a-strategy-2026.md`](./strategy/path-a-strategy-2026.md) | The master strategy. AI COO for agencies thesis, 27-competitor gap, 4-tier pricing, YC #15 fit, 90-day execution plan | Always. This is the working document |
| [`strategy/agency-tools-research-2026.md`](./strategy/agency-tools-research-2026.md) | Deep research on agency tool fragmentation — HubSpot/Pipedrive/ClickUp/Harvest adoption patterns, 59-65% cite fragmentation, 20% can't report margins | Before ICP calls or product prioritization |
| [`strategy/ai-market-research-2026.md`](./strategy/ai-market-research-2026.md) | $2.52T AI spend / 8.8% actual production adoption gap / CAIO trend data | Before investor conversations |
| [`strategy/icp-customer-research.md`](./strategy/icp-customer-research.md) | 3 personas, 10 buying triggers, disqualifier list, JTBD map, 15-channel sourcing, 10 qualifying questions | Before any cold-prospecting batch |
| [`strategy/pricing-depth.md`](./strategy/pricing-depth.md) | Van Westendorp + WTP + competitive anchor. Tiers: $750 / $1,500 / $3,000 / $1,200+$300 | Before any pricing conversation or tier change |
| [`strategy/vs-pages.md`](./strategy/vs-pages.md) | 3 launch-ready SEO landing pages: `/vs/productive`, `/vs/scoro`, `/vs/float` | When ready for SEO landing pages |

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

---

## Dev — Active

| Document | What it is |
|----------|------------|
| [`dev/branch-organization.md`](./dev/branch-organization.md) | Domain ownership matrix: what lives on `main` (Supabase) vs `chatv2` (MySQL). Read this before any new feature. |
| [`dev/plans/2026-05-19-chatv2-integration-architecture.md`](./dev/plans/2026-05-19-chatv2-integration-architecture.md) | chatv2 typed client, project mapping, service-key auth pattern |
| [`dev/plans/2026-05-19-backend-gap-closure.md`](./dev/plans/2026-05-19-backend-gap-closure.md) | Tier enforcement, retainer, FO dashboard, action limits, webhooks |
| [`dev/proposals/dashboard-reliability-fixes.md`](./dev/proposals/dashboard-reliability-fixes.md) | 6 reliability fixes + KPI snapshots — all shipped 2026-05-21 |

Historical plans and specs are in [`dev/archive/`](./dev/archive/).

---

## Quick Reference

**The bet in 10 minutes:** [`strategy/path-a-strategy-2026.md`](./strategy/path-a-strategy-2026.md) — Parts 1, 3, 5, and 8.

**YC Summer 2026 fit:** Category #15 "AI Operating System for Companies" (primary), #2 "AI-Native Service Companies" (secondary).

**Current prices:** Starter $750/mo · Growth $1,500/mo · Pro $3,000/mo · Fractional Operator $1,200/mo + $300/agency

**Domain rule:** Customer state → Supabase (`main`). Platform compute/AI/n8n → chatv2 (MySQL, CTO-managed).

---

## Voice Rules (Apply to Everything in This Folder)

- **Use:** AI COO, intelligence layer, ops brain, real-time, before it costs you, recommendations, what to do next, agency-specific, margin, utilization, scope creep, fractional COO replacement
- **Avoid:** dashboard (as commodity), platform, holistic, enterprise-grade, AI assistant (generic), automation (alone), efficiency (without a $ amount), specific feature counts
- **Never surface internally:** n8n, Claude, specific model providers — implementation details, not product surface
- **Direct, founder-to-founder.** Dollar amounts over adjectives. Active voice. Short sentences.
