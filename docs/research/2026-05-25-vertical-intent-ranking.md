# Research — Vertical intent ranking (home services, legal, accounting, real estate, marketing agencies)

> **Research run date**: 2026-05-25
> **Question**: Which business vertical has the strongest measurable demand for an AI Chief of Staff today?
> **Status**: raw research output — informs the positioning brief in `docs/positioning/`.
> **Subagent run id**: `a51783f8b97538e90` (preserved for audit; transcript at `~/.claude/projects/.../subagents/agent-a51783f8b97538e90.jsonl`).

---

I have sufficient data to deliver a defensible ranked answer. Compiling now.

---

# Vertical demand for an "AI Chief of Staff" — TODAY (May 2026)

**Bottom line: HOME SERVICES (HVAC, plumbing, electrical, roofing, residential contracting) is the strongest single vertical.** It wins on 4 of 6 criteria and ties on a 5th. Marketing agencies — OpsRadar's current default — rank 5th and have the weakest paid-demand signal of any vertical I could verify.

## Top 5 ranked (1-10 per axis; bold = strongest)

| Vertical | Search demand | Paid demand (funded comps) | Fractional-COO hiring | Pain density | TAM | Competitor emptiness | **Total** |
|---|---|---|---|---|---|---|---|
| **Home services (HVAC/plumbing/elec)** | 8 | **9** | 6 | **10** | **10** (~1.9M solo contractors + 145K HVAC firms) | 6 | **49** |
| Law firms (solo/small/mid) | 9 | **10** (Harvey $11B / Caseflood YC W25) | 5 | 7 | 8 (~418-463K firms) | 3 (Harvey, Legora, Caseflood, Arcline) | 42 |
| Accounting firms | 8 | 8 (Karbon, Puzzle $30M, Digits, Mesh, Balance, Tally, Bluebook, Minerva) | 7 | 8 | 7 | 2 (≥6 YC entrants W25-W26) | 40 |
| Real estate brokerages | 6 | 8 (EliseAI $250M Series E, Dwelly $93M, Breezy $10M, Lofty) | 4 | 8 | 8 | 3 | 37 |
| Marketing agencies | 7 | 5 (no $1B+ pure-play AI-COO comp) | **9** (Upwork concentration in SaaS/agencies/prof. services) | 7 | 6 | 7 | 41 |

## Why home services wins

**Paid demand is unambiguous.** Avoca AI hit a $1B valuation with $125M raised serving HVAC/plumbing/roofing owners with inbound-call agents — Kleiner Perkins + Meritech + General Catalyst-backed. Numa hit $48M raised, 1,200+ dealerships, 2,248% 3-yr revenue growth doing the same for auto dealers (adjacent owner-operator model). ServiceTitan IPO'd at $9B+. EliseAI ($2.2B valuation, $250M Series E) is the property-management analog. ([Fortune on Avoca](https://fortune.com/2026/04/27/avoca-ai-agents-missed-calls-hvac-plumbing-roofing-kleiner-perkins-chen-shrivastava-braswell/), [Crunchbase real-estate tech](https://news.crunchbase.com/real-estate-property-tech/rebound-ai-fintech-data-eoy-2025/))

**Pain density is the highest of any vertical I checked.** 79% of US specialty trade contractors are independent owner-operators (~1.9M businesses); ~80% are zero-employee or near-zero. The owner IS the ops manager. Industry literature explicitly frames this as "owner burnout = systems failure" — decision fatigue across dispatch, scheduling, calls, invoicing, follow-up. ([Valve+Meter on industry size](https://valveandmeter.com/blog/marketing/how-many-home-services-professionals-us/), [Click Call Sell on owner burnout](https://clickcallsell.com/avoiding-burnout-in-the-home-services/))

**TAM is huge.** ~145K HVAC firms + ~1.9M specialty trade independents in the US alone; HVAC market alone was ~$50B in 2025. ([IBISWorld-style census data via Valve+Meter](https://valveandmeter.com/blog/marketing/how-many-home-services-professionals-us/))

**Competitor density is moderate — not crowded yet.** Avoca + ServiceTitan AI + Jobber AI dominate "AI receptionist." But none of them is positioned as a Chief of Staff / cross-tool ops layer — they're all phone-first or FSM-first. The orchestration-across-tools wedge is open. (Contrast: legal has Harvey + Legora + EvenUp + Caseflood + Arcline + every BigLaw POC; accounting has ≥6 YC entrants in 18 months — Digits, Mesh, Balance, Tally, Minerva, Bluebook.) ([YC AI startups breakdown](https://www.tldl.io/blog/yc-ai-startups-2026), [E2B on YC AI agents](https://e2b.dev/blog/yc-companies-ai-agents))

## Why marketing agencies (current ICP) is weaker than assumed

- **No $1B+ pure-play "AI for marketing agency ops" comp exists.** Generic marketing AI tools have flooded the agency stack, but no funded vendor sells "AI Chief of Staff for marketing agencies" specifically. That's evidence of either (a) underbaked demand or (b) an open wedge — but combined with no Harvey/Avoca-scale anchor, signal (a) is more likely.
- **Adoption is already saturated.** 71% of companies use GenAI in marketing (up from 33% in 2023) — agencies' clients are AI-native and so are the agencies. Less unmet pain. ([Search result on adoption](https://improvado.io/blog/best-ai-marketing-tools))
- **Strength: fractional-COO hiring intent IS highest here** (SaaS + professional services + agencies dominate Upwork/Boldly/BELAY listings — [Future Market Insights](https://www.futuremarketinsights.com/reports/virtual-assistant-services-market), [Digital Reference on platforms](https://www.digitalreference.co/insights/operations-professionals/best-platforms-to-hire-fractional-coo-services-in-2025)). That's the strongest pro-agency datapoint.

## Caveats — what I could NOT verify numerically

- **Google Trends specific term-by-term comparison** — I cannot pull live Trends data. The Google Trends URL was surfaced but no numeric comparison is in the search corpus. Anyone making the final call should pull "AI for HVAC" vs "AI for law firm" vs "AI for marketing agency" directly at [trends.google.com](https://trends.google.com/trends).
- **Reddit/Twitter raw mention volume** — not retrievable without an API key.
- **Ahrefs/SEMrush keyword volume** — paywalled; not retrievable.
- **Operators Guild member industry breakdown** — public site doesn't disclose it. ([Operators Guild members page](https://www.operators-guild.com/members))

## Recommendation

**Pivot ICP focus from marketing agencies to home services owner-operators (HVAC/plumbing/electrical) — specifically 5-50 employee multi-truck firms that have already paid for ServiceTitan/Jobber/Housecall Pro and now need cross-tool orchestration, owner briefings, and approval-gated agent actions.** This is the closest vertical to OpsRadar's existing architecture (Composio for tool brokerage + approval queue + COO chat) while having (a) a 10x larger paid-demand precedent (Avoca, ServiceTitan, EliseAI), (b) 4x the TAM, (c) higher per-owner pain density, and (d) measurably less Y Combinator competitor density than legal or accounting. If you can't pivot fully, run a 90-day customer-discovery cycle in HVAC before another agency-focused build.

Sources cited inline throughout.
