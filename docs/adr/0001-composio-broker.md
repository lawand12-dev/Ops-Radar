# Composio vs n8n / chatv2 — The Architecture Decision

> Compiled: 2026-05-23 · Purpose: capture the research that led to deprecating chatv2 and committing fully to Composio + Vercel AI SDK as the agent infrastructure. Decision artifact, not a roadmap.

---

## The decision

**Kill chatv2 permanently.** OpsRadar's v1 (and the foreseeable agency segment) does not need n8n, therefore does not need chatv2. If the 5–10% technical gap ever materializes (multi-day waits, high-volume triggers), solve with Inngest or Trigger.dev — not by reviving chatv2.

---

## Why this question even came up

OpsRadar had two parallel systems:
- **OpsRadar (this repo)** — Next.js customer UI, Supabase, integrations, COO chat, 10 cron agents
- **chatv2 (CTO's separate Hono.js service on opstest.atta.codes)** — generates n8n workflows from chat, deploys to customer n8n instances, monitors workflow health

The CP-14 work (approval gate + COO sub-agents + autonomy toggle) made it possible to do "everything chatv2 was for" inside OpsRadar via Composio. The question became: do we still need chatv2 for the future?

---

## Two parallel research dives

### Lens A — Market evidence: do agencies actually use n8n / workflow builders?

**Finding: no.** Digital agencies (5–50 employees, $500K–$5M revenue) use **Zapier**, not n8n. Self-hosted n8n is a non-starter for non-technical owners — Linux/Docker/reverse-proxy fluency required. The "agentic agency" thought-leadership crowd recommending n8n + Claude + MCP admits **only 35% of marketers have deployed agentic workflows.**

Lindy — the closest analog to OpsRadar — **explicitly ships without a visual workflow canvas** and reviewers describe this as a positioning win ("intuitive point-and-click UI that requires zero coding"). 79% of Lindy's reviewers are <50-employee companies. Same ICP as us. They don't have a workflow builder.

Decagon, Sierra (enterprise customer support) skip the agency segment entirely — their customers are Fortune 500.

The canonical $500K–$2M agency stack (101 Agencies, 2026): **HubSpot + ClickUp/Monday + Slack + QuickBooks + Harvest + ActiveCampaign + Zapier.** n8n not in the list.

Buyer expectation at $750–$3K/mo: **a hire, not a tool.** "I now own a workflow IDE" is not the value prop. "Outcomes and judgment" is.

### Lens B — Technical evidence: can Composio + AI agents replace n8n?

**Finding: 80–90% yes, 10–20% gap that doesn't matter for the agency segment.**

The two dimensions Composio is measured on:

| Dimension | Composio | n8n | Zapier |
|---|---|---|---|
| **Actions** (do things) | ~15,000+ actions across 500+ toolkits | ~15,000 across 400 apps | ~30,000+ but shallower per app |
| **Triggers** (notify when something happens) | ~2–7 per toolkit (thin) | Hundreds + webhook node | ~5,000+ |

**The "10–20%" finding is about TRIGGERS only — not capability.** On actions, Composio is comparable to or wider than n8n. ClickUp on Composio: **162 actions** vs n8n's ~30. The missing 80% of triggers are niche events (Stripe tax-ID-updated, Trello card moved, Shopify order shipped) that agency ops don't use.

Real triggers that matter for agencies — HubSpot deal_stage_updated, Stripe invoice_payment_succeeded, Gmail polling (15-min latency) — all covered.

**The four real technical gaps:**

| Gap | When it matters | Mitigation |
|---|---|---|
| High-volume routine workflows (>1K runs/mo) | Customer with 10K-runs/day | Doesn't apply to agencies; if it ever does, add Inngest |
| Long-running waits (>10 min) | "Wait 7 days then if unpaid follow up" | Workaround: schedule future agent run via cron (works for agency frequency) |
| Sub-15-min event latency | Real-time customer support replies | Doesn't apply to agency ops |
| Customer-owned execution | Enterprise IT mandates | Doesn't apply at SMB price point |

---

## What chatv2 contains that we'd lose

| chatv2 capability | Status after CP-14 |
|---|---|
| Chat-to-workflow generation | ✅ Replaced — COO chat + Composio sub-agents (conversational, gated, context-aware) |
| Per-tool execution | ✅ Replaced — Composio's 25 toolkits |
| Workflow scheduling | ✅ Replaced — Vercel cron + agent_runs |
| Event-triggered workflows | ✅ Replaceable — Composio Triggers + ~1 day of glue for the 20% gap |
| Audit trail | ✅ Replaced — `agent_runs` + `agent_actions` tables + `/dashboard/runs` view |
| HITL approval | ✅ Replaced — approval gate + inline cards + `/dashboard/actions` |
| Per-user encrypted keys | ✅ Replaced (and improved) — Composio holds OAuth tokens, we never see them |
| Multi-tenant isolation | ✅ Replaced — Supabase RLS scopes everything to `user_id` |
| Admin console for our team | ⚠️ Not yet — useful for us but not customer-facing; rebuild in OpsRadar if/when we need it |
| AI interactions audit log | ⚠️ Not yet — easy 1-day build into Supabase |

---

## Why "kill" not "freeze"

1. **Maintenance burden compounds.** A frozen chatv2 still costs in deployment surface, dependency drift, mental load
2. **Insurance is cheap to rebuild.** If we ever need durable workflow primitives, Inngest or Trigger.dev is a 1-day integration into our existing stack — much faster than reviving a stale n8n service
3. **The market signal is loud.** Lindy doesn't have it. Devin's "task system" isn't customer-facing workflow building. Successful YC AI-agent products in 2025–26 converge on "agent + read-only history view + approval gate"
4. **Pitch clarity.** "We're the AI Chief of Staff" beats "we're the AI Chief of Staff + workflow builder + n8n integration platform." Buyers don't fund products with mixed identities

---

## What to tell the CTO

Don't say "your work was wrong." Say:

> *"The market signal came in clearer than we expected. Agencies want agent intelligence, not workflow building — Lindy's success proves this exactly. chatv2 was the right bet for what we thought we were building 6 months ago, but the architecture we shipped last week obviates it. I want to redirect your skills to [admin tooling / observability / fundraising-infra] where we genuinely need an owner. Let's archive chatv2 — not because the work was bad, but because the destination changed."*

If pushback: the evidence is in Lindy's customer logos. 79% sub-50-employee. Same ICP as us. They don't have what chatv2 builds. They're the company shape we want to copy.

---

## Cleanup checklist (deferred until CTO conversation)

- [ ] Remove `/dashboard/automations` from sidebar
- [ ] Remove `/api/workflow-health` proxy route
- [ ] Remove `/api/automation-roi` proxy route
- [ ] Remove `src/lib/chatv2/` directory if no consumers remain
- [ ] Drop "+ workflow builder" framing from YC pitch + pricing page
- [ ] Add `docs/adr/0001-composio-broker.md` (this doc) reference to `docs/architecture-2026.md`
- [ ] Archive (don't delete) chatv2 repo after 30-day cooldown

---

## When we'd revisit

These customer signals would force a re-evaluation:

1. A paying enterprise customer demands self-hosted compute
2. Multiple agencies asking for >1K-runs/day data shuffling
3. A YC partner pushes back hard that "without a workflow builder, you're just a chatbot"
4. A high-volume vertical pivot (e.g., e-commerce instead of agencies) where data-pipeline ops are core

None of these are likely in the next 12 months for the marketing-agency ICP.

---

## Sources (consolidated)

Agency tool stack evidence:
- [101 Agencies, Agency Tech Stack 2026](https://101agencies.com/insights/blog/agency-tech-stack-2026-essential-tools)
- [Workamajig all-in-one agency software 2026](https://www.workamajig.com/blog/all-in-one-agency-software)
- [AgencyAnalytics, agency operations checklist](https://agencyanalytics.com/blog/agency-operations)
- [Refresh Agent, agentic marketing agency guide](https://refreshagent.com/resources/how-to-use-ai-agents-marketing-agency)
- [Zapier blog, automation for small business](https://zapier.com/blog/automation-small-business/)
- [OptimizeSmart, top reasons not to self-host n8n](https://optimizesmart.com/blog/top-reasons-for-not-using-self-hosting-n8n/)

Lindy as the proof case:
- [Lindy case study, Tiddle influencer agency](https://www.lindy.ai/case-study/tiddle-transformed-their-influencer-agency)
- [Dupple Lindy review 2026](https://dupple.com/tools/lindy)
- [Lindy AI Email Responder (Review & Send)](https://www.lindy.ai/tools/ai-email-responder)
- [Lindy vs n8n](https://www.lindy.ai/lindy-vs-n8n)

Composio coverage truth:
- [Composio HubSpot toolkit](https://composio.dev/toolkits/hubspot)
- [Composio Stripe toolkit](https://composio.dev/toolkits/stripe)
- [Composio ClickUp toolkit](https://composio.dev/toolkits/clickup)
- [Composio Triggers docs](https://docs.composio.dev/docs/triggers)
- [Composio Series A blog](https://composio.dev/blog/series-a)
- [Composio incident report April 28](https://composio.dev/blog/incident-report-april-28)

Cost reality:
- [OpenAI API pricing](https://openai.com/api/pricing/)
- [Stanford — How AI agents spend tokens](https://digitaleconomy.stanford.edu/news/how-are-ai-agents-spending-your-tokens/)
- [Hyperleap, SMB pricing per conversation](https://hyperleap.ai/blog/openai-api-pricing-smb-per-conversation)

n8n / Vercel AI SDK momentum:
- [n8n Series C](https://blog.n8n.io/series-c/)
- [Sacra — n8n](https://sacra.com/c/n8n/)
- [Vercel AI SDK 6 launch](https://vercel.com/blog/ai-sdk-6)
- [Vercel AI Gateway production index](https://vercel.com/blog/ai-gateway-production-index)

Long-running agent state (the durable execution angle):
- [Brightlume — long-running AI agents](https://brightlume.ai/blog/long-running-ai-agents-scheduling-durability-recovery)
- [LangGraph interrupts docs](https://docs.langchain.com/oss/python/langgraph/interrupts)
- [Google ADK long-running agents](https://developers.googleblog.com/build-long-running-ai-agents-that-pause-resume-and-never-lose-context-with-adk/)

Pure-agent vs hybrid reality:
- [Sacra: Decagon vs Sierra](https://sacra.com/research/decagon-vs-sierra/)
- [Devin 2.0 architecture](https://cognition.ai/blog/devin-2)
- [Neura analysis — AI workflow automation platforms](https://blog.meetneura.ai/ai-workflow-automation-platforms/)
