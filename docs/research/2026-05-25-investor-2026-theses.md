# Research — Investor 2026 theses (a16z, Sequoia, Bessemer, Pragmatic Engineer, Packy McCormick)

> **Research run date**: 2026-05-25
> **Question**: Where do smart 2026 investors say the puck is going for vertical AI / agent platforms?
> **Status**: raw research output — informs the positioning brief in `docs/positioning/`.
> **Subagent run id**: `a80f8e0f1c80f5680` (preserved for audit; transcript at `~/.claude/projects/.../subagents/agent-a80f8e0f1c80f5680.jsonl`).

---

I have enough to synthesize. Let me deliver the report.

---

# 2026 Investor Theses on AI Ops / Vertical AI / Agent Platforms

## Major thesis captures

**a16z — "Services as Software" / Vertical AI Phase 3**
- Claim: "Software is eating labor" — total US software spend ($313bn) was 3% of US labor spend ($10.5T) in 2022; AI lets vendors target the labor line of the P&L, scaling revenue "as much as 10x." ([a16z](https://a16z.com/vsaas-vertical-saas-ai-opens-new-markets/))
- Category: Vertical AI / Services-as-Software. Phase 3 (2026) is "multiplayer mode" — domain-specific interfaces, data, and integrations win. ([a16z Big Ideas 2026](https://a16z.com/newsletter/big-ideas-2026-part-1/))
- Proof points: Hebbia (finance), Basis (accounting), EliseAI (housing), Toast, Mindbody.
- Won't win: SaaS-priced-per-seat for niche industries (CAC too high under old math).

**Sequoia — "2026: This is AGI" (Pat Grady, Sonya Huang, Konstantine Buhler)**
- Claim: "Long-horizon agents" capable of sustained multi-step work mark functional AGI; the opportunity is "roughly $10 trillion in services revenue that the software industry has never been able to address before." ([Sequoia](https://sequoiacap.com/article/2026-this-is-agi/))
- Category: Agent application layer / "agents that pursue a goal" vs. "respond to a prompt."
- Proof points: Claude Code, coding agents broadly.
- Won't win (implicit): pure model labs without an application/agent wrapper.

**Bessemer — "Year of the Agent Employee" / State of AI 2025-26**
- Claim: Vertical AI "represents a fundamentally larger opportunity than vertical SaaS ever did" because it "taps directly into the labor line of a P&L" (~13% of US GDP) rather than IT (~1%). ([Bessemer](https://www.bvp.com/atlas/the-state-of-ai-2025), [VC Cafe summary](https://www.vccafe.com/2026-ai-predictions-the-year-of-the-agent-employee/))
- Category: Vertical "Agent Employees" — "highly specialized vertical experts competing for labor dollars." Not generalist.
- Proof points: Decagon ($4.5B, Jan 2026), Sierra ($15.8B at $150M ARR, May 2026), Harvey ($11B, Mar 2026). ([TechCrunch](https://techcrunch.com/2026/03/04/decagon-completes-first-tender-offer-at-4-5b-valuation/), [CNBC](https://www.cnbc.com/2026/03/25/legal-ai-startup-harvey-raises-200-million-at-11-billion-valuation.html))
- Won't win: horizontal generalist agents.

**Pricing consensus (Bessemer Pricing Playbook + HighRadius + Chargebee)**
- Per-seat fell from 21% → 15% of SaaS in 12 months; ~$285B SaaS market cap repriced Feb 2026 on seat-compression fear. Per-seat is "structurally vulnerable." ([HighRadius](https://www.highradius.com/resources/Blog/outcome-based-pricing-ai/), [Bessemer pricing playbook](https://www.bvp.com/atlas/the-ai-pricing-and-monetization-playbook))
- Hybrid (subscription + outcome/usage) at 41% adoption is the new standard. Pure outcome-based seen in Intercom ($0.99/resolved convo), HubSpot ($0.50/resolved convo).

**Pragmatic Engineer (Gergely Orosz)**
- 90%+ AI tool adoption but real org impact is gated by enablement + DevEx, not tool access; monoliths block agents (context-window ceiling ~0.5–few M LOC). ([Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/the-impact-of-ai-on-software-engineers-2026))
- Implication: agents that ship with structured context (skills, brain, scoped tool inventories) beat raw tool access.

**Packy McCormick (Not Boring)** — calls out "Fiduciary Agents" — vendors with proprietary operational data recommending and then making decisions on customers' behalf. ([Not Boring — Ramp](https://www.notboring.co/p/ramp-and-the-ai-opportunity))

---

## Q1 — Three biggest converging 2026 theses

1. **Labor budget > IT budget.** a16z: "Software is eating labor… potential to scale revenue by as much as 10x." Bessemer: vertical AI is "a 10x larger opportunity than vertical SaaS." Sequoia: "$10 trillion in services revenue."
2. **Long-horizon, goal-pursuing agents are the unlock** (Sequoia "2026: This is AGI"), not chat. Phase 3 is "multiplayer mode" with cross-party orchestration (a16z).
3. **Per-seat is structurally broken; outcome/hybrid wins.** ($285B repricing event, Feb 2026.) ([HighRadius](https://www.highradius.com/resources/Blog/outcome-based-pricing-ai/))

## Q2 — Vertical vs. horizontal

Consensus is firmly **vertical**. Bessemer: Agent Employees "will not be a generalist; they will be highly specialized vertical experts." a16z Phase 3: vertical software wins via "domain-specific interfaces, data, and integrations." Independent data cited: "2.3x higher ROI" and "71% still generating value at 6 months (vs 32%) for vertical." ([VC Cafe Vertical AI 2026](https://www.vccafe.com/vertical-ai-in-2026-the-good-the-bad-and-the-ugly/), [Galen Growth](https://www.galengrowth.com/vertical-vs-horizontal-agentic-ai-digital-health/)) Horizontal platforms (Lindy/Notion AI-style) are not cited as winners in any 2026 a16z/Sequoia/Bessemer essay surfaced.

## Q3 — Winning pricing model

Hybrid (base subscription + outcome/usage component) — 41% adoption, the modal model. Pure outcome where outcomes are countable (resolved tickets, qualified leads, collected invoices). Per-employee-replaced framing is rising but Bessemer's pricing playbook stops short of endorsing pure "$/employee replaced" as durable. ([Bessemer](https://www.bvp.com/atlas/the-ai-pricing-and-monetization-playbook), [Chargebee](https://www.chargebee.com/blog/pricing-ai-agents-playbook/))

## Q4 — Which thesis backs OpsRadar

**Bessemer's "Agent Employee" thesis is the cleanest fit**, with a16z's Phase 3 "multiplayer vertical AI" as secondary backing. OpsRadar's structure maps line-by-line:

- **Vertical** (marketing agencies, not horizontal) — matches Bessemer's "highly specialized vertical experts."
- **Labor-budget pricing** ($750–$3K/mo replacing a fractional COO + ops analyst hours) — matches a16z "small fraction of labor cost."
- **28 specialized agents + custom-hireable employees** — literal "Agent Employee" instantiation.
- **Customer-owned Notion brain + Composio orchestration** — matches a16z Phase 3 "domain-specific interfaces, data, and integrations" and Packy's "Fiduciary Agent" pattern (proprietary operational data → decisions on behalf of).
- **Risk per these theses**: flat $/month is the part that's exposed — investors would push for a hybrid (base + outcome metric: $/automation run, $/COO action approved, or $/recovered AR dollar).

What would NOT get backed under 2026 theses: a horizontal generalist version of OpsRadar, a per-seat model, or a SaaS-priced retainer with no labor-replacement narrative.

Sources:
- [a16z Big Ideas 2026 Part 1](https://a16z.com/newsletter/big-ideas-2026-part-1/)
- [a16z — Vertical SaaS Now with AI Inside](https://a16z.com/vertical-saas-now-with-ai-inside/)
- [a16z — AI Opens New Markets for Vertical SaaS](https://a16z.com/vsaas-vertical-saas-ai-opens-new-markets/)
- [Sequoia — 2026: This is AGI](https://sequoiacap.com/article/2026-this-is-agi/)
- [Sequoia — AI Ascent 2026](https://sequoiacap.com/article/ai-ascent-2026/)
- [Bessemer — State of AI 2025](https://www.bvp.com/atlas/the-state-of-ai-2025)
- [Bessemer — AI Pricing Playbook](https://www.bvp.com/atlas/the-ai-pricing-and-monetization-playbook)
- [VC Cafe — Vertical AI 2026](https://www.vccafe.com/vertical-ai-in-2026-the-good-the-bad-and-the-ugly/)
- [VC Cafe — Year of the Agent Employee](https://www.vccafe.com/2026-ai-predictions-the-year-of-the-agent-employee/)
- [Pragmatic Engineer — Impact of AI on SWE 2026](https://newsletter.pragmaticengineer.com/p/the-impact-of-ai-on-software-engineers-2026)
- [Not Boring — Ramp and the AI Opportunity](https://www.notboring.co/p/ramp-and-the-ai-opportunity)
- [HighRadius — Outcome-Based Pricing](https://www.highradius.com/resources/Blog/outcome-based-pricing-ai/)
- [Chargebee — Pricing AI Agents 2026](https://www.chargebee.com/blog/pricing-ai-agents-playbook/)
- [TechCrunch — Decagon $4.5B](https://techcrunch.com/2026/03/04/decagon-completes-first-tender-offer-at-4-5b-valuation/)
- [CNBC — Harvey $11B](https://www.cnbc.com/2026/03/25/legal-ai-startup-harvey-raises-200-million-at-11-billion-valuation.html)

Not found: a public Founders Fund / Khosla / NEA / Greylock / First Round Review essay specifically dated 2025–2026 on AI ops / vertical agents; no direct Ben Thompson Stratechery or Doug O'Laughlin piece on the labor-budget thesis surfaced.
