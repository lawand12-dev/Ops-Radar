# OpsRadar — CTO Briefing

**For:** Atta
**From:** Lawand
**Date:** 2026-05-22
**Read time:** ~15 minutes

> One doc, top-to-bottom: where the company is, what we're telling YC, the 4 categories and how our code maps to them, what depends on you specifically. By the end you should be able to walk into a YC interview and tell the same story I would.

---

## TL;DR

We're applying to YC Summer 2026 (deadline May 25 — three days). We're claiming 4 of YC's RFS categories simultaneously: **#2 AI-Native Service, #4 Company Brain, #12 Software for Agents (MCP), #15 AI OS for Companies**. The pitch: *"the AI COO for marketing agencies — what costs $10K/month from a fractional COO, we deliver from $750/month, 24/7, and it actually executes the actions through automation."*

Code-wise we're ~85% there. The architecture composes — Brain → patterns → COO chat → Actions → outcomes is a real loop, not 4 disconnected features. The MCP server is the strongest moat. The Brain pipeline is shipped but only manual-upload works end-to-end (Slack/Gmail OAuth blocked on platform verification).

Customer-wise: zero paying. That's the gap that matters more than any code. YC will ask "how many agencies use this today" — we need an honest answer ready.

You own the chatv2 backend. Five concrete asks at the bottom (§8) — none blocking the YC application itself, all blocking the post-acceptance scale story.

---

## 1. The strategy in 3 lines

1. **The market is real and timed.** 21.5% of marketing agencies are losing money in 2026, up from 13% in 2025 (Planable). They can't afford a $400K/year Chief AI Officer. 76% of *large* enterprises have one; mid-market agencies have nothing. The fractional COO market is $9.4B and growing.

2. **The product is a vertical AI service, not a horizontal tool.** Toast did this for restaurants. ServiceTitan for home services. Veeva for pharma. Clio for legal. **OpsRadar is the AI COO for marketing agencies** — connect HubSpot/ClickUp/Harvest/Stripe, we watch in real time and tell you (before it costs you) when a client is going unprofitable, when the team's about to burn out, when cash flow is about to hit a wall. And then we actually execute the action.

3. **The moat is sequencing + integration depth + the execution layer.** Competitors who ship a smart dashboard stop at *observation*. We close the loop with n8n on each customer's own instance — generated from chat, deployed by chatv2, owned by the customer forever. They can leave OpsRadar tomorrow and their workflows keep running. That's why the AI COO claim is defensible against ClickUp Super Agents, Scoro, Kantata, Linear Agent, and every wrapper-startup that will appear in the next 12 months.

Deeper version of the strategy is in [`docs/strategy/path-a-strategy-2026.md`](../strategy/path-a-strategy-2026.md) and [`docs/strategy/moats-and-friction-2026.md`](../strategy/moats-and-friction-2026.md). You don't need to read those for the YC story; the three lines above are the whole pitch.

---

## 2. The YC angle in 3 lines

1. **YC partners reject ~99.5% of applications.** The written application IS the test. They look for *first-principles thinkers who have a real "discovery"* and *founders who can build with deep technology*. Our discovery: the 60-percentage-point gap between agencies that *say* they "use AI" (68%) and agencies that have AI in *production* (8.8%) — Federal Reserve FEDS Notes, April 2026. The gap is bigger than any single product can solve, but it's exactly the wedge for an AI COO.

2. **The 4 RFS categories aren't a hedge — they're one product.** YC publishes a "Requests for Startups" list. We hit 4 of them with the *same codebase*, not 4 different products. That's a signal of architectural maturity, not scope creep. The pitch frames it as: *"the same engine satisfies all four because the agency operations problem requires all four — observation (Brain), reasoning (COO agent), execution (Actions + n8n), and openness (MCP)."*

3. **The interview is 10 minutes with 2-3 partners.** They'll grill on three things: *what's your unique insight, what have you shipped, how fast can you grow?* The first two we own. The third is honest: we have 233 cold emails sent, 8 replies, 1 qualified deal that left (Sean). We're not pretending we have traction. The story is "shipping speed + architectural moat + identified beachhead ICP" — not "we have customers."

Source docs: [`docs/yc/what-yc-wants.md`](./what-yc-wants.md), [`docs/yc/founder-profile.md`](./founder-profile.md), [`docs/yc/traction-evidence.md`](./traction-evidence.md).

---

## 3. The 4 categories — honest grades

The full mapping with code citations is in [`docs/yc/four-categories-build.md`](./four-categories-build.md). Honest read:

| # | YC framing | What we built | Code-shipped | Customer-using | YC story strength |
|---|---|---|---|---|---|
| **#2** | AI-Native Service (replace a professional service) | The COO agent itself — replaces the $10K/mo fractional COO function | Positioning, not a feature in itself | None | Story-only; strength depends on #4, #12, #15 actually landing |
| **#4** | Company Brain (institutional memory) | Diorization pipeline: ingestion → breadcrumbs → pattern cards → living briefs | **~75%** — pipeline real, pgvector live, manual upload works | None — Slack/Gmail OAuth blocked on platform verification ($15-75K for Gmail's audit) | Medium — engine is real but no live ingestion path |
| **#12** | Software for Agents (MCP) | OpsRadar's own MCP server — 10 tools, OAuth 2.1 + Bearer JWT, audit log | **~90%** — `src/app/api/mcp/route.ts`, install UI at `/dashboard/settings/mcp` | None | **Strongest** — real engineering moat, no shortcut |
| **#15** | AI OS for Companies (event-driven supervisor + workers) | COO agent + 11 action evaluators + 7 cron jobs + outcome memory loop | **~85%** — `src/lib/actions/evaluators/`, `src/lib/coo/`, full SSE streaming | None | Medium — works, but no humans grading outputs yet |

### Why #12 (MCP) is the strongest

MCP is the protocol that lets Claude Desktop (and eventually ChatGPT) call into external tools. Most "AI agents" startups don't ship one — they build a chat UI on top of an API. We did both:

- The COO chat uses OpenAI function-calling internally (one model orchestrating 10 tools).
- The MCP server exposes the *same* 10 tools so a customer can paste their token into Claude Desktop and ask Claude *"how did we do this month?"* — Claude calls our endpoints, gets the data, replies inside Claude's UI.

That's not marketing copy. It's `mcp_invocations` rows in Supabase if anyone tries it. The tools are: `opsradar.get_finance`, `get_sales`, `get_profitability`, `get_capacity`, `get_scope`, `get_outbound`, `get_meetings`, `search_kb`, `generate_workflow`, `propose_action`.

### Why #4 (Brain) is the weakest

The pipeline is real — `src/lib/diorization/` has synthesizer, pattern-detector, living-brief generator, runner, manual-upload adapter. The 3am `diorize` cron exists. pgvector is enabled. `search_brain` is wired into the COO agent.

What it can't do today: ingest from Slack/Gmail without the customer pre-exporting and pasting in. The OAuth flows are blocked on external app verification (Google Workspace charges $15K-$75K for sensitive-scope verification because we'd be reading personal email). Slack is cheaper but still requires app review.

For YC: we frame this as *"the architecture is shipped; the data sources roll out as we add verified OAuth integrations, starting with the customer's manual export today."*

### Why #2 (AI-Native Service) is positioning, not code

#2 isn't a *feature* — it's the business model claim that the COO agent **replaces** the fractional COO instead of augmenting them. We earn this claim by having #4, #12, #15 actually work. If those land, #2 lands by definition. If they don't, no amount of "AI-native" branding saves it.

### Why #15 (AI OS) needs usage data

We have 11 evaluators running on cron (margin alert, invoice reminder, retainer overage, scope creep, capacity drift, cash flow, workflow failure, pattern alert, etc.). They generate proposed actions; the customer confirms/dismisses; the outcome lands in `coo_outcomes` for the next eval to learn from.

Architecturally this is the loop YC asks for in #15. The gap: zero customers means zero real outcomes. We can show the pipeline, not the dataset.

---

## 4. What's shipped on `main` (your reference for the YC story)

This is what's running on Vercel right now. You don't own this code but you should know what's there because the YC interview will probe it:

| Area | Status |
|---|---|
| Customer auth (Supabase SSR, email + password) | ✅ live |
| Tier enforcement (Starter / Growth / Pro / FO) | ✅ live |
| 10 integration adapters (Stripe, HubSpot, ClickUp, Harvest, Apollo, Calendly, Asana, Monday, Pipedrive, Toggl) | ✅ live, AES-256-GCM encrypted keys, never persist client data |
| Dashboard cockpit (KPI strip, alerts, narrative, activity, integration health) | ✅ live, IA reorganized today into 7 sidebar sections |
| COO chat agent (10 tools, SSE streaming, session persistence, sidebar history) | ✅ live |
| Company Brain UI (`/dashboard/brain` — living brief, pattern cards, breadcrumb upload) | ✅ live |
| MCP server + token issuance UI | ✅ live |
| 11 action evaluators + queue + confirmation flow | ✅ live |
| 7 cron jobs (actions, briefings, KPI snapshots, alerts, diorize, follow-ups, benchmarks) | ✅ live |
| 5 supabase migrations covering MCP audit, KB embeddings, diorization, outcome memory, chat sessions | ✅ applied to prod |
| Performance page (Health + Peers tabs) + Briefings page | ✅ live (shipped today) |

Total since 2026-05-19: **37 commits ahead of the GitHub default before today's push**, now all pushed to `main`.

---

## 5. What chatv2 owns vs what main owns

Most of this you know but it's worth a clean restatement for YC framing:

| Concern | Owned by | Why |
|---|---|---|
| Customer identity & auth | **main** (Supabase) | Customer-facing surface, RLS-scoped |
| Customer business state (retainers, alert rules, action queue, briefings, brain) | **main** (Supabase) | Customer sees and manages this |
| Live integration data (Stripe charges, HubSpot deals, Harvest hours) | Neither persists it — live-fetch per request | Hard architectural rule, no client data in Supabase |
| n8n workflow management (per-customer instances, encrypted API keys) | **chatv2** (MySQL) | You own the workflow generation + deployment |
| AI workflow generation (chat-to-workflow) | **chatv2** (Claude 4.5 via DigitalOcean) | Your domain |
| Workflow health monitoring + execution ingestion | **chatv2** | Your domain |
| AI interactions audit log | **chatv2** | Cross-tenant observability |
| MCP server (the YC #12 surface) | **main** | Customer-facing OAuth flow, lives on Vercel |
| COO chat agent (the YC #15 surface) | **main** (OpenAI direct) | Was planned to swap to chatv2 RAG eventually (Phase G) |
| Diorization / Brain | **main** (Supabase + pgvector) | Customer-owned ingested data |

**The two integration points** (the only places main calls chatv2 today):

| Main route | chatv2 endpoint | Powers |
|---|---|---|
| `/api/dashboard/workflow-health/` | `GET /service/projects/:projectId/workflows/health` | Workflow health strip on dashboard |
| `/api/dashboard/automation-roi/` | `GET /service/projects/:projectId/analytics` | Time-saved / ROI card |

That's the entire customer-facing surface area of chatv2 today.

---

## 6. The 4 categories — how they compose into one product

This is the part YC will ask about. It's also the part most "4-category" startups can't answer because their categories are actually 4 different products.

```
                                  CUSTOMER OPS PROBLEM
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              │                           │                           │
        OBSERVATION                    REASONING                  EXECUTION
              │                           │                           │
        ┌─────┴─────┐               ┌─────┴─────┐               ┌─────┴─────┐
        │           │               │           │               │           │
   Live data    Persistent       COO chat    Pattern         Action       Workflow
   adapters      memory          agent       detection       queue        execution
   (10 tools)   (Brain)          (10 tools)  (evaluators)    (HITL)       (n8n)
        │           │               │           │               │           │
        └───────────┴───────────────┴───────────┴───────────────┴───────────┘
                                          │
                                          ▼
                                  OPENNESS — MCP
                          (every observation + action exposed
                           to Claude Desktop / ChatGPT / any
                           agent that speaks the protocol)
```

YC's 4 categories map onto the 5 columns:

- **OBSERVATION + REASONING + EXECUTION** as one closed loop = **#15 AI OS for Companies**
- **persistent memory** (Brain) = **#4 Company Brain**
- **openness via MCP** = **#12 Software for Agents**
- **the whole thing replaces a professional service** = **#2 AI-Native Service**

If we delete any one column, two YC categories fall over. That's why the architecture isn't 4 features stapled together — it's the minimum coherent thing that satisfies all 4.

---

## 7. What's missing for actual YC defensibility (the gap that matters)

The code gap is small. The **customer gap** is the real one:

1. **Zero paying customers.** Code without usage is theater for YC. They will ask. The honest answer: "We're applying to YC because we need the network and the urgency to get to 10 customers fast; here's the system that's ready when they arrive."
2. **No demoable end-to-end flow with real data.** The brain has no breadcrumbs ingested. Evaluators have no production runs to point at. Outcomes table is empty.
3. **No Claude Desktop screen recording of the MCP server.** This is single highest-leverage missing asset for #12. 30 minutes to record. **I think we should record one before the application closes.**
4. **Gmail/Slack OAuth not registered.** Brain stays manual-upload-only until we pay the platform fees + go through verification.

The first two we cannot fix in 3 days. The last two we can, if we want.

---

## 8. What I need from you (the chatv2-side asks)

**None of these block the YC application.** They unlock the *post-acceptance scale story* — i.e., what we say to YC partners about "what we'll build in the YC batch." The full list of 5 is in [`docs/dev/plans/2026-05-19-chatv2-integration-architecture.md §6`](../dev/plans/2026-05-19-chatv2-integration-architecture.md) (the doc I sent you today). Reproduced here so you have it in this brief:

1. **Confirm `/` returns health JSON** (or expose `/health`) — main has a `/api/internal/chatv2-ping` route that pings it.
2. **AI/RAG endpoint contract** — confirm `POST /service/projects/:id/chat` accepts `{ messages: [...] }` and returns `{ reply, interaction_id, citations? }`. This is what lets us swap COO chat from OpenAI-direct to chatv2-RAG (Phase G). For YC: this is how we tell the story of *"we already have a working RAG backbone the customer's COO chat will swap to."*
3. **Workflow analytics endpoint stability** — `/service/projects/:id/analytics` + `/service/projects/:id/workflows/health` shapes must not break. Already covered today; this is "don't drift."
4. **Future: `GET /service/users/:supabaseUserId/projects`** — needed for the FO (Fractional Operator) multi-client dashboard, which is the natural up-sell from solo agency owners.
5. **Future: `agency_integrations` storage on chatv2 projects** — per-agency Stripe/Harvest/ClickUp keys for the FO white-label flow.

There's also the user-UUID refactor in [`docs/dev/chatv2/service-api-spec.md`](../dev/chatv2/service-api-spec.md) v1.1 — using Supabase UUID as tenant key instead of generated project IDs + mapping table. **That's the bigger ask.** The current architecture works; the refactor makes it simpler. It's not blocking but it'd help.

---

## 9. The interview rehearsal — what I'd say to a YC partner

If a partner asks *"what's your unique insight?"* — the 60-point gap between "uses AI" and "has AI in production" for SMBs, plus the agency-specific observation that 21.5% are losing money up from 13% in one year because the AI productivity transition is creating losers, not just winners.

If a partner asks *"why won't OpenAI build this?"* — they won't, because the integration depth (10 adapters, customer-specific n8n deployment, per-tenant credentials, OAuth flow, MCP server, HITL action queue) is not on their roadmap. Cursor isn't going to build vertical agency ops. The Razorpay pattern: horizontal incumbents avoid vertical depth precisely because it doesn't scale. We win by being the deepest in one vertical first.

If a partner asks *"what have you shipped?"* — show the MCP server, the dashboard, the COO chat with sidebar history (just shipped today), the Brain UI, the action queue. Note that we have 7 cron jobs running, 5 migrations applied, 10 integrations live. Don't oversell the customer side.

If a partner asks *"why are you the team?"* — Lawand: 5 years of agency operations (age 13-17), then self-taught the agentic stack. Atta: 20-year-old CTO, ships infrastructure (the chatv2 backend exists because of you, not because we wrote a spec). Cofounder bond goes back to Halabja. Halabja-founded YC company is itself a signal — most YC companies don't come from the IIT/Stanford pipeline this batch will be drawing from.

If a partner asks *"how fast can you grow?"* — honestly: we have product, we have ICP, we have positioning. We don't have go-to-market velocity yet. The 233 emails / 8 replies / 1 qualified deal is the floor, not the ceiling. YC's network + the urgency of the batch is the unlock.

---

## 10. What I'm asking you to do with this doc

- **Read it once.** 15 minutes. Push back on anything that feels wrong — better to argue now than mid-interview.
- **Ack the §8 list.** If any of those are harder than I think, tell me now so I don't promise them in the application.
- **Optional: record the 60-sec MCP demo with me before May 25.** I think it's the single most leveraged thing we can ship before the deadline. I can drive Claude Desktop while you record screen + audio explaining what's happening. 30 minutes of your time.

That's it. The full strategy docs are in [`docs/strategy/`](../strategy/) and [`docs/yc/`](.) if you want to go deeper, but this doc has everything you need to be aligned for the YC interview.
