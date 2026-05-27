# Research — Competitive refresh (post-breach, late May 2026)

> **Research run date**: 2026-05-27
> **Question**: What's moved in the "AI Chief of Staff / AI ops for services" space since the mid-May research? Funding, products, pricing, the new integration-security axis, fresh customer gripes, and where the agency/services wedge stands.
> **Status**: refresh layer on top of the 2026-05-25/26 competitive set. Adds NEW signal only — does not restate `2026-05-25-competitor-pain-points.md`, `2026-05-competitive-landscape.md`, or `2026-05-25-revenue-momentum-signals.md`.
> **Method**: WebSearch + WebFetch, prioritizing the most recent 2026 sources.

---

## TL;DR

The single biggest shift in the last two weeks is **integration security becoming a competitive axis**, triggered by the Composio breach disclosure (May 2026). Brokers are now selling token custody, self-hosting, and "runs in your infra" the way they used to sell connector counts. Funding/ARR for the headline players is largely unchanged since the 25th (most rounds predate the window), so the live story is **product + security posture**, not new money. One genuinely net-new adjacent entrant surfaced — **Jootle**, an "AI-native operations platform" with a playbook engine and approval gate — and it is the closest thing yet to the OpsRadar shape, though it targets generic ops, not services verticals.

---

## 1. Competitor moves since mid-May 2026

**No major new rounds inside the window** — the headline raises (Sierra $950M May 4, Decagon $250M Jan, Glean $150M Series F Jun '25 / $200M ARR Dec '25) all predate this refresh and are already captured in `2026-05-25-revenue-momentum-signals.md`. What's new is product cadence:

- **Glean** shipped the **Enterprise Agent Development Lifecycle (ADLC)** in **May 2026** — a governance framework + platform capability for how enterprises "build, govern, and measure" agents, plus an "auto mode" agent builder in public beta. Glean Agents is now "powering more than 100 million agent actions annually" ([Glean press](https://www.glean.com/press/glean-introduces-the-enterprise-agent-development-lifecycle-codifying-how-enterprises-build-govern-and-measure-ai-agents) · [Reworked](https://www.reworked.co/knowledge-findability/glean-introduces-autonomous-enterprise-agents-and-work-ai-institute/)). Read: Glean is moving from search → governed autonomous agents, i.e. up the exact "agents that DO things, governed" lane OpsRadar plays in — but at $100K–$500K enterprise ACV, not services-SMB.
- **Cognition / Devin** is in early talks for a **~$25B valuation** as of April 2026 (up from $10.2B Sep '25); enterprise ARR up 30% in the seven weeks post-Windsurf; Windsurf ranked #1 in LogRocket's AI dev-tool rankings Feb 2026, ahead of Cursor and Copilot ([VentureBeat](https://venturebeat.com/programming-development/cognition-follows-windsurf-acquisition-with-usd400m-fundraise-showing-strong) · [TFN](https://techfundingnews.com/cognition-ai-25b-valuation-funding-talks-devin-software-engineer/)). The reliability narrative from earlier research has flipped to momentum — but strictly in coding, a different vertical.
- **BOND** ("Donna") — still **$3M seed**, founded 2025, ~3 employees, **invite-only limited pilot** as of Feb–Mar 2026 ([Crunchbase](https://www.crunchbase.com/organization/bond-37a1) · [hiretop](https://hiretop.com/blog4/ai-chief-of-staff-for-ceos-bond-donna/)). No funding or GA news in the window. The closest horizontal competitor remains pre-scale and unvalidated.
- **Lindy** — current public pricing: **Plus ~$49.99, Pro ~$99.99, Max ~$199.99**, still credit-metered (5,000 task credits on Pro; 1 credit basic / 5–10 credits for AI-heavy steps) ([CloudTalk](https://www.cloudtalk.io/blog/lindy-ai-pricing/) · [ringg.ai](https://www.ringg.ai/blogs/lindy-ai-pricing)). No model change — the credit-anxiety surface from the 25th is intact and arguably worse (see §3).
- **11x.ai** — the AI-SDR collapse story hardened: ZoomInfo publicly said 11x "performed significantly worse than their SDR employees" and threatened legal action over logo misuse; broader AI-SDR churn is now cited at **50–70% annual, only ~2% of deployments stick**, and survivors (Artisan, 11x) have repositioned as **hybrid human copilots** rather than autonomous replacements ([Naoma](https://www.naoma.ai/articles/what-is-an-ai-sdr)). This is the canonical "autonomous-no-oversight = death" cautionary tale — now with a market-wide retreat to human-in-the-loop, validating OpsRadar's control-first thesis externally.

**New entrant worth flagging — Jootle** (launched 2026, on Product Hunt): "AI-native operations platform" — a private AI instance that "manages your projects, monitors your inbox, sends messages, runs playbooks, and builds tools," executing against **60+ seeded playbooks** (HR, finance, marketing, dev, ops). Its playbook engine **self-heals** on failure and **escalates to a human approval gate when work crosses a sensitivity threshold**; each customer gets a **dedicated private VPS** ([Product Hunt](https://www.producthunt.com/products/jootle)). This is the first adjacent product that combines (a) cross-tool action, (b) approval gates, and (c) per-customer isolation — the OpsRadar pattern — but it's **horizontal/generic ops, not services-vertical**, and has no operator judgment, benchmarks, or customer-owned brain. Closest structural lookalike to date; not a vertical threat yet. Other ProductHunt "AI Chief of Staff" entries (Fellow, Littlebird, Martin, Espa, Cleo) are all **individual-exec productivity** (meetings, inbox, scheduling) — **none target service businesses or team ops** ([Product Hunt category](https://www.producthunt.com/categories/ai-chief-of-staff)).

## 2. Integration security is now a competitive axis (the post-breach story)

This is the headline shift. The **Composio May 2026 incident** is the proximate cause and is directly relevant to OpsRadar (we migrated off Composio to Nango on 2026-05-26 for this exact reason).

Breach facts, from Composio's own bulletin:
- Attacker used **LLM-generated exploit patterns** to brute-force an internal monitoring tool, escalated privileges, registered malicious tool definitions, and achieved **arbitrary code execution in the tool-execution sandbox** ([Composio bulletin](https://composio.dev/blog/composio-may-2026-security-incident)).
- **~0.3% of active connections** compromised: **5,001 GitHub tokens** (by far the largest), 12 Gmail, 1–5 each across Strava, Jira, HubSpot, Linear, Notion, Slack, Google Calendar.
- **5,241 API keys** were stored in an auxiliary cache accessed during the breach. **All API keys created before 22 May 2026 11pm PST were deleted**; mandatory rotation by 23 May ([Composio bulletin](https://composio.dev/blog/composio-may-2026-security-incident)).

Competitors are now positioning on token custody:
- **Nango** leans into **SOC 2 Type II, GDPR, HIPAA, and self-hosting "for teams that need full data isolation"**, storing refresh tokens **in your own database**; both Nango and Composio are pass-through and "do not store payload data unless you explicitly enable detailed logging" ([Nango blog](https://nango.dev/blog/composio-vs-nango/)). MarkTechPost's May 25 2026 buyer's guide to "Authentication Platforms for AI Agents and MCP Servers" explicitly frames the Composio incident (~5,242 connections) as a selection criterion ([MarkTechPost](https://www.marktechpost.com/2026/05/25/best-authentication-platforms-for-ai-agents-and-mcp-servers-in-2026/)).
- The "agent integration middleware war" framing (Composio vs Nango vs Workato) is now public: credential management is called a **"fundamental deployment blocker,"** Composio sells **managed OAuth scoped to exactly what the agent needs + SOC 2/ISO 27001**, Workato differentiates on **auditable workflows / governance**, Nango on **code-first + observability + self-host** ([AgentMarketCap](https://agentmarketcap.ai/blog/2026/04/07/agent-integration-middleware-war-composio-nango-workato-mcp)).
- **BOND** already markets that it **runs inside customer infrastructure (not BOND's cloud)** and is SOC 2 (via Probo) ([hiretop](https://hiretop.com/blog4/ai-chief-of-staff-for-ceos-bond-donna/)). Jootle's **per-customer private VPS** is the same "your data stays in your boundary" pitch ([Product Hunt](https://www.producthunt.com/products/jootle)).

**Read:** "Where do my OAuth tokens live and who can reach them" has moved from a compliance footnote to a front-of-pitch buying criterion in <30 days. Every serious player now has a security posture line. OpsRadar's "Composio holds OAuth tokens; we never store customer API keys" claim in CLAUDE.md is now **stale and adversarial** — Composio is the breach vendor we left. The defensible new line is the Nango posture (pass-through, no payload storage, self-host option) plus the existing approval gate.

## 3. Customer pain refresh (net-new since May 25)

- **Lindy** got materially worse in public sentiment: **Trustpilot 2.4/5 ("Poor")**, with reports of **charges after cancellation, unauthorized charges, refund difficulty** (one user: a $350 charge they didn't authorize), and an agent **"burning through over 2,000 paid credits just to decide it wasn't right and delete everything"** ([Dialora](https://www.dialora.ai/blog/lindy-ai-reviews) · [prospeo](https://prospeo.io/s/lindy-pricing-reviews-pros-and-cons)). New gripe vs the 25th: **billing-trust** complaints, not just "expensive." Also flagged: **Google-ecosystem permission depth** ("users grant extensive permissions before seeing the product") and Feb 2026 reports of the platform being **"super laggy," responses taking hours, IP-blocked from many sites** ([Dialora](https://www.dialora.ai/blog/lindy-ai-reviews)). Credit anxiety + billing distrust + over-permissioning is a clean three-way contrast with OpsRadar's flat tiers + quota caps + scoped OAuth.
- **Notion AI** — the structural gap persists and is now explicitly dated: **cross-app workflows had still not shipped as of April 2026**; "a desktop AI agent provides the cross-application automation that Notion AI's workspace boundary prevents" ([Fazm timeline](https://fazm.ai/blog/notion-ai-updates-2025-2026)). Notion AI is becoming a more programmable in-workspace agent but **still cannot act across the customer's other tools** — exactly the seam OpsRadar fills (write across Stripe/HubSpot/ClickUp/Gmail, with Notion as the brain not the cage).
- **AI-SDR category-wide** distrust ("buyers recognize AI-generated outreach, reply rates collapse, black-box per-seat pricing didn't deliver attributable pipeline" — [Naoma](https://www.naoma.ai/articles/what-is-an-ai-sdr)) is now a buyer reflex that bleeds onto ALL autonomous-agent pitches. Lead with control, not autonomy.

## 4. The "AI COO for services" wedge — still open, edges narrowing

- **Demand-side validation strengthened.** Emergence Capital's **"AI-Native Services" playbook** (Spring 2026, pub. Mar 30) names the services-disruption thesis as **"a defining business model of the AI era,"** projecting **5–10x speed/throughput at 50%+ gross margins** across vertical services markets ([Emergence](https://www.emcap.com/thoughts/the-ai-native-services-playbook)). And "AI Chief of Staff" demand is real on the labor side — a $200K–$350K human role concentrated in **professional-services firms (consulting, legal, finance)** where "knowledge-work leverage is enormous" ([Value Add VC](https://valueaddvc.com/blog/ai-chief-of-staff-what-the-role-looks-like-and-which-companies-are-hiring)). The buyer exists.
- **Supply-side still empty at the vertical.** No product surfaced that explicitly targets **agencies/consultancies/dev-shops with an AI ops/COO layer**. The "AI Chief of Staff" products are either (a) individual-exec assistants (BOND, Martin, Fellow, Espa) or (b) horizontal ops platforms (Jootle, Glean). **No operator judgment, no per-client profitability/scope/utilization intelligence, no services benchmarks, no customer-owned brain** in any of them.
- **Edge that narrowed:** Jootle now occupies the structural pattern (cross-tool + approval gate + isolation) and Glean now sells governed autonomous agents to enterprises. The whitespace is no longer "nobody does cross-tool governed agents" — it's specifically **"nobody does cross-tool governed agents WITH services-operator judgment + a customer-owned brain, priced for SMB-mid agencies."**

---

## Battle-card synthesis (deltas only)

| Player | New since 5/25 | Implication for OpsRadar |
|---|---|---|
| **Composio** | Breach disclosed: arbitrary code exec, 5,001 GitHub tokens, 5,241 keys at risk; mass key deletion | Vindicates the Nango migration. Update stale "Composio holds tokens" claim → Nango posture. |
| **Nango** | Pushing SOC 2 Type II + self-host + tokens-in-your-DB as the anti-Composio pitch | Our broker now has a security story we can borrow verbatim. |
| **Glean** | ADLC governance framework + auto-mode builder (May '26); 100M agent actions/yr | Up our lane but enterprise-only ($100K–$500K). Validates "governed agents," not services. |
| **Cognition/Devin** | ~$25B valuation talks; reliability narrative flipped to momentum | Different vertical (coding). Removes "autonomous = always unreliable" talking point. |
| **BOND** | Still $3M seed, invite-only pilot; markets "runs in your infra" + SOC 2 | Closest horizontal comp still pre-scale + unvalidated. Adopting our security framing. |
| **Lindy** | Trustpilot 2.4; billing-trust complaints; laggy/over-permissioned | Sharper contrast: flat pricing + scoped OAuth + control. |
| **11x.ai / AI-SDR** | Category-wide retreat to human-in-the-loop copilots; 50–70% churn | External proof that control-first beats autonomous. Use in pitch. |
| **Jootle** (new) | AI-native ops platform: 60+ playbooks, self-heal, approval gate, private VPS | First structural lookalike. Horizontal/generic — beat it on services depth + brain. |

## So what for OpsRadar

1. **Reposition security as a feature, immediately.** Integration-token custody is now a front-of-pitch buying criterion (Composio breach + Nango/BOND/Jootle all leading with it). Replace the stale "Composio holds your tokens" line in CLAUDE.md and positioning with the Nango posture: pass-through auth, no payload storage, scoped OAuth, customer can self-host the broker. This is now table stakes, not a nice-to-have.
2. **Lead with control-first; the market just proved it.** The AI-SDR collapse and the survivors' retreat to "human copilot" is external, citable validation that approval-gated > autonomous. This is no longer just our opinion — it's the category's hard-won lesson.
3. **The wedge is intact but the description must sharpen.** Whitespace is no longer "governed cross-tool agents" (Jootle + Glean now exist there) — it's **services-vertical operator judgment + customer-owned brain + SMB-mid pricing**, none of which any surfaced competitor has. Update positioning to claim the narrower, defensible lane.
4. **Demand-side is freshly validated, supply-side is still empty.** Emergence's AI-Native-Services thesis + the human-AI-CoS hiring boom in professional services confirm the buyer. No vertical product is serving them. The 12–18 month window from the May landscape doc still holds — but Jootle/Glean shrank it at the structural edges, so vertical depth + brain ownership is the moat to press, not "we have an approval gate" (everyone has one now).

---

## Sources

Funding / product moves:
- [Glean ADLC announcement](https://www.glean.com/press/glean-introduces-the-enterprise-agent-development-lifecycle-codifying-how-enterprises-build-govern-and-measure-ai-agents) · [Glean autonomous agents — Reworked](https://www.reworked.co/knowledge-findability/glean-introduces-autonomous-enterprise-agents-and-work-ai-institute/) · [Glean $200M ARR — Futurum](https://futurumgroup.com/insights/glean-doubles-arr-to-200m-can-its-knowledge-graph-beat-copilot/)
- [Cognition $400M / $25B talks — VentureBeat](https://venturebeat.com/programming-development/cognition-follows-windsurf-acquisition-with-usd400m-fundraise-showing-strong) · [Cognition $25B — TFN](https://techfundingnews.com/cognition-ai-25b-valuation-funding-talks-devin-software-engineer/)
- [BOND — Crunchbase](https://www.crunchbase.com/organization/bond-37a1) · [BOND/Donna — hiretop](https://hiretop.com/blog4/ai-chief-of-staff-for-ceos-bond-donna/) · [BOND YC launch](https://www.ycombinator.com/launches/Ncl-bond-ai-chief-of-staff-for-ceos-and-busy-execs)
- [Lindy pricing — CloudTalk](https://www.cloudtalk.io/blog/lindy-ai-pricing/) · [Lindy pricing — ringg.ai](https://www.ringg.ai/blogs/lindy-ai-pricing)
- [AI-SDR collapse — Naoma](https://www.naoma.ai/articles/what-is-an-ai-sdr)
- [Jootle — Product Hunt](https://www.producthunt.com/products/jootle) · [AI Chief of Staff category — Product Hunt](https://www.producthunt.com/categories/ai-chief-of-staff)

Integration security:
- [Composio May 2026 security incident](https://composio.dev/blog/composio-may-2026-security-incident)
- [Composio vs Nango — Nango blog](https://nango.dev/blog/composio-vs-nango/)
- [Auth platforms for AI agents & MCP 2026 — MarkTechPost](https://www.marktechpost.com/2026/05/25/best-authentication-platforms-for-ai-agents-and-mcp-servers-in-2026/)
- [Agent integration middleware war — AgentMarketCap](https://agentmarketcap.ai/blog/2026/04/07/agent-integration-middleware-war-composio-nango-workato-mcp)

Pain points:
- [Lindy review — Dialora](https://www.dialora.ai/blog/lindy-ai-reviews) · [Lindy review — prospeo](https://prospeo.io/s/lindy-pricing-reviews-pros-and-cons)
- [Notion AI timeline — Fazm](https://fazm.ai/blog/notion-ai-updates-2025-2026)

Services wedge:
- [AI-Native Services playbook — Emergence Capital](https://www.emcap.com/thoughts/the-ai-native-services-playbook)
- [AI Chief of Staff role / hiring — Value Add VC](https://valueaddvc.com/blog/ai-chief-of-staff-what-the-role-looks-like-and-which-companies-are-hiring)
