# Inversion 2 — Is approval-gate-by-default the right LONG-TERM stance?

> **Research run date**: 2026-05-26
> **Purpose**: out-of-the-box inversion research — test whether OpsRadar is wrong about its core bet on this dimension.
> **Status**: raw research output — the verdict it drove is in `docs/positioning/inversions.md` + `docs/positioning/identity.md` updates.
> **Subagent run id**: `a599e7071880654a8`

---

I have enough evidence. Writing the inversion brief now.

---

# Inversion Brief: Is approval-gate-by-default a phase OpsRadar will outgrow?

## Q1: Are the 2026 scaling winners more autonomous than OpsRadar today?

**Yes, materially — but not as cleanly as the inversion thesis suggests.**

- **Sierra**: resolves ~40% of inquiries autonomously across chat/email/voice/WhatsApp, up to 90% on transactional workflows. The customer never approves anything per-action; pricing is **outcome-based** (you pay when Sierra closes the ticket). [Sierra AI pricing/features 2026](https://www.featurebase.app/blog/sierra-ai-pricing) | [Sierra resolution rates](https://serviceagent.ai/blogs/sierra-ai-review/)
- **Decagon**: autonomy is **tiered, not pre-approval per action**. Refunds up to $X auto, larger amounts → human review. Co-pilot mode only kicks in when conversations route to a human. [Decagon platform guide](https://decagon.ai/resources/ai-agent-assistance)
- **Cresta**: explicitly **human-on-the-loop**, not human-in-the-loop. Supervisors get "real-time visibility and instant intervention tools" and can "immediately halt the AI's autonomous flow" — i.e. the AI fires by default; humans stop it if needed. [Cresta Agent Operations Center](https://cresta.com/agent-operations-center) | [Cresta announcement](https://cresta.com/blog/introducing-crestas-agent-operations-center-a-unified-command-center-for-human-and-ai-agents)
- **Harvey**: outputs require lawyer review by professional-responsibility duty, but review is **per artifact (memo/contract analysis)**, not per agent action. Not directly comparable to OpsRadar's per-write gate. [Harvey + A&O](https://www.harvey.ai/) | [Legal review duty](https://www.intelacia.com/2026/05/05/harveys-11b-valuation-how-legal-ai-is-reshaping-modern-legal-workflows/)

**Verdict**: the winners are **human-on-the-loop with bounded autonomy thresholds**, not the per-action-Ask pattern OpsRadar ships by default. Anthropic's HITL/HOTL distinction is the operative frame. [Anthropic-aligned HITL vs HOTL](https://www.waxell.ai/blog/human-in-the-loop-vs-human-on-the-loop-ai-agents)

## Q2: Is approval-gate-by-default a 2026 phase or durable?

**It's a phase — but a justified one, and the industry literature is converging on the migration path you need.**

- **Approval fatigue is now a named industry problem.** "After the tenth approval pop-up, teams click Approve without reading… security teams that deployed AI agents six months ago all started with strict approval policies, but within weeks they loosened them because they couldn't get work done." [Molten.Bot on approval fatigue](https://molten.bot/blog/agent-approval-fatigue/) | [Developers Digest](https://www.developersdigest.tech/blog/approval-fatigue-agent-security-bug)
- **Frequent AI users are 45% more likely to experience high burnout** — approval cadence compounds this. [aipatternbook.com](https://aipatternbook.com/approval-fatigue)
- **The published consensus is "progressive autonomy"** — start narrow, expand based on accuracy, override rates, and confidence scores. "Routine items with confidence above 97% process autonomously." [MindStudio progressive autonomy](https://www.mindstudio.ai/blog/progressive-autonomy-ai-agents-safe-deployment) | [MightyBot](https://www.mightybot.ai/blog/what-is-progressive-autonomy) | [CSA Agentic Trust Framework](https://cloudsecurityalliance.org/blog/2026/02/02/the-agentic-trust-framework-zero-trust-governance-for-ai-agents)
- **a16z's Big Ideas 2026 frames the agentic shift as "from ask to do."** "AI becoming something that does rather than something you ask." [a16z Big Ideas 2026](https://a16z.com/podcast/big-ideas-2026-the-agentic-interface/) | [a16z agentic interface](https://a16z.com/newsletter/big-ideas-2026-part-1/)

The direction of travel is unambiguous: **toward more autonomy over time, gated by confidence and risk, not toward per-write Ask as a steady state.**

## Q3: Right autonomy model for OpsRadar in 18 months

**Evolve to confidence-based autonomy. Do not stay at "Ask by default forever," do not jump to mostly-autonomous.**

Concrete target architecture (well-precedented in the cited research):

1. **Risk tier the action set.** Irreversible/high-blast (firing a client, sending invoice to billing, mass email) → **always Ask**. Reversible/medium (drafting a Slack reply, scheduling a meeting) → **Auto with notification**. Low (Notion writes, internal log updates) → **silent Auto**. [Risk-calibration pattern](https://medium.com/@shreya_edulakanti/approval-fatigue-is-breaking-ai-agents-execution-boundaries-fix-it-6c46c6d512dd)
2. **Per-tool confidence scoring + outcome learning.** CP-14 already has confidence scoring (CP-18) and outcome tracking (CP-19). Promote a tool's default from Ask → Auto once it crosses a per-agency-tuned approval rate (e.g. 90%+ approve over 30 actions). [Progressive autonomy spec](https://www.mindstudio.ai/blog/progressive-autonomy-ai-agents-safe-deployment)
3. **Keep customer override.** "Always Ask" must remain a setting for risk-averse owners. This is where OpsRadar wins vs Sierra/Decagon — agencies have founder-level liability for client relationships in a way ecomm support tickets don't.

## Q4: Would changing autonomy posture cost OpsRadar more than it gains?

**Honest answer: the current Ask-by-default is a correct opening position but will become a real drag inside 12 months. Net the change is +EV.**

What it costs:
- The "anti-11x / anti-Devin" pitch loses some force. Mitigation: reframe as **"earned autonomy"** — still anti-Devin (Devin had zero confidence gating), still pro-control (customer sets the graduation thresholds), but no longer single-frame.
- Engineering: confidence-graduation logic, per-tool stats dashboards. Already 70% built (CP-18 confidence + CP-19 outcome tracking).

What it gains:
- Removes the structural ceiling on actions/customer/week. Today an OpsRadar agency owner approving 200 actions a week is doing the work of an inbox — that is the failure mode the industry is documenting. [Approval fatigue → loosened policies in weeks](https://molten.bot/blog/agent-approval-fatigue/)
- Aligns with where Sequoia/a16z money is flowing in 2026 (autonomous agents acting end-to-end on operational data). [a16z 2026 thesis](https://a16z.com/newsletter/big-ideas-2026-part-1/)
- Earns the same control narrative without the velocity tax.

**Things I could not verify** (flagging per the rules):
- Specific G2/Reddit quotes from customers asking for less oversight 12 months in: **not found.**
- Lindy / BOND / Copilot Studio published Ask-vs-Auto adoption rates: **not found** — Copilot has overall adoption data (15M paid M365 seats, 35.8% workplace conversion) but no Ask/Auto split. [Microsoft Copilot adoption](https://www.stackmatix.com/blog/copilot-market-adoption-trends)
- A named 2026 product that lost funding specifically for being too approval-heavy: **not found.** The visible failures (11x, Devin) all leaned too autonomous, not too cautious.
- Anthropic publishing tenure-vs-autonomy data: **not found** (the HITL/HOTL distinction is published, the longitudinal tenure curve is not).

**Bottom line**: Ask-by-default is right for month 0–3 of a customer relationship. It is wrong as a permanent architectural stance. Ship confidence-based graduation in the next 1–2 control-plane cycles; the scaffolding from CP-14/18/19 already supports it.
