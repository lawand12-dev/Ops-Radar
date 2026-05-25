# Research — Horizontal SMB-mid AI workforce pricing (Zapier, Make, n8n, Gumloop, Relevance AI, MS Copilot SMB, HubSpot Breeze)

> **Research run date**: 2026-05-25
> **Question**: What pricing model wins for a horizontal AI workforce at SMB-mid scale in 2026?
> **Status**: raw research output — informs the verdict in `docs/positioning/identity.md`.
> **Subagent run id**: `a4869fd43e3c1b34c` (preserved for audit).

---

I have sufficient data. Let me synthesize the research.

# Horizontal AI Workforce Pricing — 2026 Evidence

## Data points (each $ figure cites a source URL)

**Zapier Agents** — credit/activity model. Pro Agent add-on $33.33/mo for 1,500 activities; Free 400 activities. Hidden cost: every tool call burns activity. ([Zapier pricing analysis](https://www.lindy.ai/blog/zapier-pricing))

**Make.com** — operations/credits model. Free 1,000 ops, Core $10.59/mo (10K ops), Pro $18.82/mo, Teams $34.12/mo per user. Switched terminology from "Operations" to "Credits" in 2026. ([Make.com pricing](https://www.miniloop.ai/blog/make-com-pricing-2026))

**n8n Cloud** — execution-based. Starter $24/mo (2,500 executions), Pro $60/mo (10K), Business $800/mo (50K). Early 2026 added hard AI credit caps with overage packs (50–1,000 AI credits depending on tier). ([n8n pricing 2026](https://instapods.com/blog/n8n-pricing/), [n8n.io/pricing](https://n8n.io/pricing/))

**Gumloop** — credit model. Free 2K credits/mo, Solo $37/mo (10K credits, recently bumped to 20K), Team $244/mo (60K). Standard AI calls = 2 credits, advanced LLMs (GPT-4/Claude) = 20 credits, enrichment = 60 credits. ([Gumloop pricing](https://www.lindy.ai/blog/gumloop-pricing))

**Relevance AI** — restructured Sep 2025 into seat+credits hybrid. Free $0 (200 actions), Pro $19/mo, Team $234/mo, Enterprise custom. **Unlimited agents** — usage drives cost, not agent count. ([Relevance AI pricing](https://relevanceai.com/pricing), [Relevance breakdown](https://costbench.com/software/ai-agent-platforms/relevance-ai/))

**Microsoft 365 Copilot Business** (SMB ≤300 seats) — flat per-seat. $18/user/mo annual through June 30, 2026 → $21/user/mo after. ([Microsoft 365 Copilot pricing](https://www.microsoft.com/en-us/microsoft-365-copilot/pricing), [Pax8 SMB bundles](https://www.pax8.com/blog/microsoft-365-copilot-business-smb-bundles/))

**HubSpot Breeze** — switched to pure outcome April 14, 2026. Customer Agent $0.50/resolved conversation (down from $1.00), Prospecting Agent $1/qualified lead. ([HubSpot announcement](https://www.hubspot.com/company-news/hubspots-customer-agent-and-prospecting-agent-now-you-pay-when-the-task-is-complete), [MarTech](https://martech.org/hubspot-moves-to-outcome-based-pricing-for-some-breeze-ai-agents/))

**Lindy** — credit failure mode confirmed. "Expensive" is the #1 complaint (42 mentions); premium model use (GPT-4o/Claude Opus) spikes credit burn; "Premium Action" multipliers on integrations; **Gartner 2025: 40% of enterprises abandon agentic AI due to unforeseen variable costs**. Search interest peaked Aug 2025, dropped late 2025. ([Lindy review/pricing](https://prospeo.io/s/lindy-pricing-reviews-pros-and-cons), [Lindy pricing guide](https://www.ringg.ai/blogs/lindy-ai-pricing))

**Glean** — enterprise-only. ~$40-50/user/mo + $15/user/mo Work AI add-on, ~100-user minimum, $50K-$60K minimum ACV. No SMB tier exists. ([Glean pricing](https://www.gosearch.ai/blog/glean-pricing-explained/), [Glean SMB data](https://checkthat.ai/brands/glean/pricing))

**Bessemer / Monetizely 2026 benchmark**: ~65% of AI SaaS introduced hybrid (seats + usage meter); **zero moved to pure usage or pure outcome**. ([Bessemer playbook](https://www.bvp.com/atlas/the-ai-pricing-and-monetization-playbook), [Monetizely 2026 guide](https://www.getmonetizely.com/blogs/the-2026-guide-to-saas-ai-and-agentic-pricing-models))

## Synthesis

**Q1 — Strongest model:** **Hybrid base + metered usage** (seats/flat + a single visible meter). This is what Relevance AI and Microsoft Copilot landed on, and what Bessemer/Monetizely document as ~65% of the market. Pure outcome (HubSpot Breeze) only works when the outcome is unambiguous and attribution is clean — OpsRadar can't cleanly attribute "MRR saved." Pure credits (Lindy/Gumloop/Zapier Agents) is the documented failure mode.

**Q2 — Anchor metric:** **Per approved action executed** is the right horizontal metric. It's the unit the customer sees on `/dashboard/actions`, it's the unit Composio bills underneath, and it's bounded (approval gate caps runaway). Reject: per-integration (no usage signal), per-agent (Relevance proved unlimited agents wins), per-token (Lindy's failure mode — opaque), per-saved-hour (unmeasurable), per AI employee (CP-34 hire model is the seat metaphor, fine for base).

**Q3 — Horizontal failure mode:** Lindy's stall is **credits, not horizontal positioning**. The credit model creates three killers: (1) unpredictable bills (Gartner: 40% abandon agentic AI for this reason), (2) premium model penalty (customer pays more for smarter agent — wrong incentive), (3) "Premium Action" markups on integrations break trust. Horizontal works (Zapier/Make are billion-dollar horizontal companies) — opaque credit pricing doesn't.

**Q4 — Proposed OpsRadar tier structure:**

- **Starter — $99/mo:** 1 seat, up to 5 integrations, 500 approved actions/mo, all 28 agents read-only + briefing. Anchors against Make Core ($10.59) and Zapier Pro Agent ($33.33) as "AI COO + agents, not just plumbing."
- **Growth — $499/mo:** 5 seats, unlimited integrations, 5,000 approved actions/mo, custom employee hiring (CP-34), automations (CP-20). Anchors against Relevance Team ($234) and n8n Pro ($60) by bundling agents + brain + actions.
- **Pro — $1,499/mo:** 20 seats, 25,000 approved actions/mo, Notion Brain provisioning, priority models. Lands in the $500–$3,000 SMB-mid band Bessemer documents.
- **FO (Fractional Operator) — $2,999/mo:** multi-client aggregate, white-label, unlimited seats within the FO org, 100K actions/mo pooled.
- **Overage meter (not a separate tier):** $0.05 per approved action beyond cap. Visible on `/dashboard/settings/usage` (CP-23 already wires this). One meter, one unit, no premium multipliers — the explicit anti-Lindy choice.

Sources:
- [Zapier pricing analysis (Lindy)](https://www.lindy.ai/blog/zapier-pricing)
- [Make.com pricing (Miniloop)](https://www.miniloop.ai/blog/make-com-pricing-2026)
- [n8n pricing 2026 (Instapods)](https://instapods.com/blog/n8n-pricing/)
- [n8n.io/pricing](https://n8n.io/pricing/)
- [Gumloop pricing (Lindy)](https://www.lindy.ai/blog/gumloop-pricing)
- [Relevance AI pricing](https://relevanceai.com/pricing)
- [Relevance AI pricing breakdown (Costbench)](https://costbench.com/software/ai-agent-platforms/relevance-ai/)
- [Microsoft 365 Copilot pricing](https://www.microsoft.com/en-us/microsoft-365-copilot/pricing)
- [Pax8 Copilot SMB bundles](https://www.pax8.com/blog/microsoft-365-copilot-business-smb-bundles/)
- [HubSpot Breeze outcome pricing announcement](https://www.hubspot.com/company-news/hubspots-customer-agent-and-prospecting-agent-now-you-pay-when-the-task-is-complete)
- [MarTech on HubSpot outcome pricing](https://martech.org/hubspot-moves-to-outcome-based-pricing-for-some-breeze-ai-agents/)
- [Lindy pricing review (Prospeo)](https://prospeo.io/s/lindy-pricing-reviews-pros-and-cons)
- [Lindy pricing guide (Ringg)](https://www.ringg.ai/blogs/lindy-ai-pricing)
- [Glean pricing explained (GoSearch)](https://www.gosearch.ai/blog/glean-pricing-explained/)
- [Glean SMB data (Checkthat)](https://checkthat.ai/brands/glean/pricing)
- [Bessemer AI pricing playbook](https://www.bvp.com/atlas/the-ai-pricing-and-monetization-playbook)
- [Monetizely 2026 guide](https://www.getmonetizely.com/blogs/the-2026-guide-to-saas-ai-and-agentic-pricing-models)
