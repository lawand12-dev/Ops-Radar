# Research — Public revenue / momentum signals (Sierra, Cognition, Glean, Decagon, BOND, Lindy, 11x.ai)

> **Research run date**: 2026-05-25
> **Question**: Who is scaling vs stalling in AI ops / agents / COO products in 2025-2026?
> **Status**: raw research output — informs the positioning brief in `docs/positioning/`.
> **Subagent run id**: `a56b4e5e1c07b8f4b` (preserved for audit; transcript at `~/.claude/projects/.../subagents/agent-a56b4e5e1c07b8f4b.jsonl`).

---

I have strong signal across the category. Let me synthesize the answer.

---

# AI Ops/Agent/COO Category — Public Signals 2025-2026

## Per-Company Numbers (all cited)

| Company | ARR / Funding | Customers | Source |
|---|---|---|---|
| **BOND** (YC X25, AI CoS) | $3M seed (Dec 2025) | Not found | TechCrunch/SignalBase |
| **Lindy** | $5.1M ARR (April 2025); $54M total raised | Not found | getlatka |
| **Cognition (Devin)** | $1M → $73M ARR (Sep 2024 → Jun 2025); ~$150M combined ARR post-Windsurf; $400M raise @ $10.2B (Sep 2025) | Goldman, Citi, Dell, Ramp, Palantir | CNBC, Sacra |
| **Glean** | $200M ARR (Dec 2025, doubled in 9 months); $150M Series F @ $7.2B (Jun 2025) | Fortune 500, $100-500K ACVs | Fortune, TechCrunch |
| **Sierra** | $150M ARR (Q1 2026); $950M raise @ $15.8B (May 2026) | 40% of Fortune 50; ADT, Cigna, SiriusXM, Ramp | TechCrunch, Bloomberg |
| **Decagon** | ~$35M ARR (Oct 2025); $250M Series D @ $4.5B (Jan 2026) | 100+ enterprise (Avis, Mercado Libre, Deutsche Telekom) | BusinessWire, Decagon blog |
| **Notion** | $600M+ ARR (>50% AI-tied); 1M+ Custom Agents in beta; Ramp runs 300+ daily | Ramp, Remote case studies | CNBC, Reworked |
| **Cresta** | $100M ARR (Apr 2026), 4x in 2 years; $125M Series D | Contact-center enterprise | Axios, Cresta press |
| **Composio** | ~$1M ARR (Jul 2025); $25M Series A | 200+ paying, 100K devs (Glean, YC startups) | PRNewswire, SiliconAngle |
| **Trigger.dev** | $2.7M revenue 2024; $16M Series A (Dec 2025) | 30K+ developers | Trigger.dev blog, Latka |
| **11x.ai** | Claimed $14M ARR, actual ~$3M; <50% gross retention; 70-80% churn | a16z/Benchmark backed, customer-list fraud allegations | TechCrunch, GTM AI Podcast |

Onyx/Danswer, AI21, Mosaic, Crew — not found at meaningful detail.

## Q1: Fastest scaling (3)

1. **Sierra** — $0 → $150M ARR in 8 quarters, 40% of Fortune 50 ([TechCrunch](https://techcrunch.com/2025/11/21/bret-taylors-sierra-reaches-100m-arr-in-under-two-years/))
2. **Cognition** — $1M → $73M ARR in 9 months ([CNBC](https://www.cnbc.com/2025/09/08/cognition-valued-at-10point2-billion-two-months-after-windsurf-.html))
3. **Glean** — $100M → $200M ARR in 9 months ([Fortune](https://fortune.com/2025/12/08/exclusive-glean-hits-200-million-arr-up-from-100-million-nine-months-back/))

## Q2: Stalled / dying (3)

1. **11x.ai** — claimed $14M ARR was ~$3M actual; 70-80% churn at 3-month mark. Killing factor: **horizontal AI SDR with autonomous sends, no approval gate, hallucinations + deliverability collapse** ([TechCrunch](https://techcrunch.com/2025/03/24/a16z-and-benchmark-backed-11x-has-been-claiming-customers-it-doesnt-have/))
2. **AI SDR category broadly** — 50-70% cancellation inside 90 days ([LeadGen Economy](https://www.leadgen-economy.com/blog/ai-sdr-cancellation-wave-failure-forensics/))
3. **Lindy** — only $5.1M ARR three years post-Series A ($54M raised). Stall factor: horizontal "build any automation" positioning, no vertical depth ([getlatka](https://getlatka.com/companies/lindyai))

## Q3: Shape of a winning company

- **Vertical or function-deep**, not horizontal (Sierra=CX, Cognition=coding, Cresta=contact center, Glean=enterprise search)
- **$100K-$500K ACV enterprise**, not SMB (Glean explicit; Sierra/Decagon Fortune 500)
- **Human-in-the-loop / approval-gated** wins over autonomous (Sierra "human-centric"; Cresta "human + virtual agents"; 11x failed on autonomy)
- **Outcome pricing or seat-replacement pricing**, not flat SaaS
- **Months not years** to traction — Sierra/Cognition/Glean all hit $100M ARR in <2 years

## Q4: "AI for agencies" specifically

**Not found.** No vertical-AI-for-marketing-agencies company surfaced in public funding/ARR reporting. Closest adjacents: Cresta (contact center), Sierra (CX). The agency vertical is **publicly empty above seed stage** — no evidence of either a scaling winner or a documented failure. BOND ($3M seed) is the closest horizontal analog targeting "busy execs."

## Q5: Would investors fund OpsRadar today?

**Yes, but the pitch must explicitly contrast against the 11x failure and the BOND ambiguity.** The scaling winners (Sierra, Cognition, Glean, Cresta, Decagon) share four traits OpsRadar matches: vertical depth, approval-gated (not autonomous), enterprise-style ACV in a defined segment, customer-owned data substrate (Glean's knowledge graph ≈ Notion brain). The $750-$3K ACV is below where Glean/Sierra play but above where Lindy/horizontal-Lindy stalls — defensible as agency-segment SMB-mid. The 25+ integration count maps to Glean's connector strategy, which Sacra explicitly credits for $200M ARR. **Risk investors will press on**: agency TAM size vs Fortune-500 TAM; ARR-inflation scrutiny ([TechCrunch May 2026](https://techcrunch.com/2026/05/22/how-vcs-and-founders-use-inflated-arr-to-kingmake-ai-startups/)); proof that "control-first" approval gate isn't just slower autonomy. The empty agency-vertical above seed is **simultaneously the opportunity and the bear case**.

Sources:
- [BOND $3M seed](https://www.trysignalbase.com/news/funding/bond-ai-chief-of-staff-for-ceos-secures-3-million-seed-funding)
- [Lindy revenue Latka](https://getlatka.com/companies/lindyai)
- [Cognition $10.2B CNBC](https://www.cnbc.com/2025/09/08/cognition-valued-at-10point2-billion-two-months-after-windsurf-.html)
- [Glean $200M ARR Fortune](https://fortune.com/2025/12/08/exclusive-glean-hits-200-million-arr-up-from-100-million-nine-months-back/)
- [Sierra $100M ARR TechCrunch](https://techcrunch.com/2025/11/21/bret-taylors-sierra-reaches-100m-arr-in-under-two-years/)
- [Sierra $950M TechCrunch](https://techcrunch.com/2026/05/04/sierra-raises-950m-as-the-race-to-own-enterprise-ai-gets-serious/)
- [Decagon $1.5B BusinessWire](https://www.businesswire.com/news/home/20250623894798/en/Decagon-Raises-$131M-at-$1.5B-Valuation-to-Deliver-Concierge-Customer-Experience-with-AI-Agents)
- [Notion $500M ARR CNBC](https://www.cnbc.com/2025/09/18/notion-launches-ai-agent-as-it-crosses-500-million-in-annual-revenue.html)
- [Cresta $100M ARR Axios](https://www.axios.com/pro/enterprise-software-deals/2026/04/30/a16z-sequoia-ai-startup-cresta-100-million-arr)
- [Composio Series A PRNewswire](https://www.prnewswire.com/news-releases/composio-raises-29m-to-solve-ais-learning-problem-building-skills-that-actually-improve-over-time-302510684.html)
- [Trigger.dev Series A](https://trigger.dev/blog/series-a)
- [11x.ai customer claims TechCrunch](https://techcrunch.com/2025/03/24/a16z-and-benchmark-backed-11x-has-been-claiming-customers-it-doesnt-have/)
- [AI SDR cancellation wave](https://www.leadgen-economy.com/blog/ai-sdr-cancellation-wave-failure-forensics/)
- [ARR inflation TechCrunch May 2026](https://techcrunch.com/2026/05/22/how-vcs-and-founders-use-inflated-arr-to-kingmake-ai-startups/)
