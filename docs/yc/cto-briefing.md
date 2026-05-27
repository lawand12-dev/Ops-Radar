# OpsRadar — CTO Briefing

**For:** Atta
**From:** Lawand
**Date:** 2026-05-22
**Read time:** ~15 minutes

> **Updated 2026-05-27:** this briefing predated the CP-15 chatv2 sever + the 2026-05-26 Composio→Nango pivot. References to chatv2/n8n as live infrastructure are corrected inline or flagged historical. Current reality: OpsRadar is a single Next.js app on Vercel + Supabase; the integration broker is **Nango** (`src/lib/nango.ts`); execution is the agent loop (Vercel AI SDK) + approval gate → `/dashboard/actions` → broker. There is no second backend, no n8n, no workflow generator. The customer-facing surfaces have since collapsed into `/dashboard/hire`.

> One doc, top-to-bottom: where the company is, what we're telling YC, the 4 categories and how our code maps to them, what depends on you specifically. By the end you should be able to walk into a YC interview and tell the same story I would.

---

## TL;DR

We're applying to YC Summer 2026 (deadline May 25 — three days). We're claiming 4 of YC's RFS categories simultaneously: **#2 AI-Native Service, #4 Company Brain, #12 Software for Agents (MCP), #15 AI OS for Companies**. The pitch: *"the AI COO for marketing agencies — what costs $10K/month from a fractional COO, we deliver from $750/month, 24/7, and it actually executes the actions through automation."*

Code-wise we're ~85% there. The architecture composes — Brain → patterns → COO chat → Actions → outcomes is a real loop, not 4 disconnected features. The MCP server is the strongest moat. The Brain pipeline is shipped but only manual-upload works end-to-end (Slack/Gmail OAuth blocked on platform verification).

Customer-wise: zero paying. That's the gap that matters more than any code. YC will ask "how many agencies use this today" — we need an honest answer ready.

You own the agent compute layer (originally the standalone chatv2 backend, severed into the main app in CP-15). Five concrete asks at the bottom (§8) — none blocking the YC application itself, all blocking the post-acceptance scale story.

---

## 1. The strategy in 3 lines

1. **The market is real and timed.** 21.5% of marketing agencies are losing money in 2026, up from 13% in 2025 (Planable). They can't afford a $400K/year Chief AI Officer. 76% of *large* enterprises have one; mid-market agencies have nothing. The fractional COO market is $9.4B and growing.

2. **The product is a vertical AI service, not a horizontal tool.** Toast did this for restaurants. ServiceTitan for home services. Veeva for pharma. Clio for legal. **OpsRadar is the AI COO for marketing agencies** — connect HubSpot/ClickUp/Harvest/Stripe, we watch in real time and tell you (before it costs you) when a client is going unprofitable, when the team's about to burn out, when cash flow is about to hit a wall. And then we actually execute the action.

3. **The moat is sequencing + integration depth + the execution layer.** Competitors who ship a smart dashboard stop at *observation*. We close the loop: the agent loop proposes actions, the approval gate routes every write to `/dashboard/actions`, and on confirmation the Nango broker executes against the customer's own connected tools. The customer-owned-forever asset is their Notion brain — 20 databases + strategic pages that stay standalone-useful even if they leave OpsRadar tomorrow. That's why the AI COO claim is defensible against ClickUp Super Agents, Scoro, Kantata, Linear Agent, and every wrapper-startup that will appear in the next 12 months.

(Deeper strategy + moats docs that this briefing once linked have since moved/retired; the three lines above are the whole pitch and you don't need anything else for the YC story.)

---

## 2. The YC angle in 3 lines

1. **YC partners reject ~99.5% of applications.** The written application IS the test. They look for *first-principles thinkers who have a real "discovery"* and *founders who can build with deep technology*. Our discovery: the 60-percentage-point gap between agencies that *say* they "use AI" (68%) and agencies that have AI in *production* (8.8%) — Federal Reserve FEDS Notes, April 2026. The gap is bigger than any single product can solve, but it's exactly the wedge for an AI COO.

2. **The 4 RFS categories aren't a hedge — they're one product.** YC publishes a "Requests for Startups" list. We hit 4 of them with the *same codebase*, not 4 different products. That's a signal of architectural maturity, not scope creep. The pitch frames it as: *"the same engine satisfies all four because the agency operations problem requires all four — observation (Brain), reasoning (COO agent), execution (the approval gate + Nango broker), and openness (MCP)."*

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

That's not marketing copy. It's `mcp_invocations` rows in Supabase if anyone tries it. The tools are: `opsradar.get_finance`, `get_sales`, `get_profitability`, `get_capacity`, `get_scope`, `get_outbound`, `get_meetings`, `search_kb`, `propose_action`. (The old `generate_workflow` tool died with the n8n sever; the customer now describes automations in plain English to the COO and the agent loop executes them through the approval gate.)

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

## 5. Who owns what (single-app ownership map)

> **Historical note (2026-05-27):** the original version of this section split ownership between a separate "chatv2" backend and "main." chatv2 was severed in CP-15 — there is now **one** Next.js app. The table below is restated for that reality; the cofounder ownership split (Lawand = customer surface, Atta = agent compute layer) survives intact, just inside one codebase.

| Concern | Owned by | Why |
|---|---|---|
| Customer identity & auth | **Lawand's surface** (Supabase) | Customer-facing surface, RLS-scoped |
| Customer business state (retainers, alert rules, action queue, briefings, brain) | **Lawand's surface** (Supabase) | Customer sees and manages this |
| Live integration data (Stripe charges, HubSpot deals, Harvest hours) | Live-fetched per request via the Nango broker | Hard architectural rule, no client data in Supabase |
| Integration brokerage (OAuth, per-tenant connections, action execution) | **Atta's agent compute layer** — Nango (`src/lib/nango.ts`) | Replaces the old per-customer n8n + encrypted-key model |
| Automations (chat → typed spec → fire on events) | **Atta's agent compute layer** | The agent loop compiles + runs them; no separate workflow generator |
| Agent run history + execution ingestion | **Atta's agent compute layer** (Supabase) | Observability lives in-app now |
| AI interactions audit log | **Atta's agent compute layer** (Supabase) | Cross-tenant observability |
| MCP server (the YC #12 surface) | **Lawand's surface** | Customer-facing OAuth flow, lives on Vercel |
| COO chat agent (the YC #15 surface) | **Atta's agent compute layer** (Vercel AI SDK) | Originally planned to swap onto chatv2 RAG; instead the agent loop + Agent Skills + Notion brain absorbed that role in-app |
| Notion brain | **Lawand's surface** (Supabase metadata + customer-owned Notion) | Customer-owned knowledge layer |

There are **no cross-service integration points anymore** — the old `main → chatv2` calls (`/api/dashboard/workflow-health/`, `/api/dashboard/automation-roi/`) were removed in CP-15. Workflow-health and ROI signals are now derived from in-app agent run history. *(Both routes are gone; if a marketing CTA still references "automation ROI," it reads from `automation_runs` in Supabase.)*

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
   Live data    Persistent       COO chat    Pattern         Action       Broker
   (Nango)       memory          agent       detection       queue        execution
   (10 tools)   (Brain)          (10 tools)  (evaluators)    (HITL)       (Nango)
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

## 8. What I need from you (the agent-compute-layer asks)

> **Historical note (2026-05-27):** the original §8 framed these as cross-service asks against a separate chatv2 backend with `/service/projects/...` endpoints. After CP-15 there's no second service — these are now in-app workstreams you own on the agent compute layer. The *intent* of each ask survives; the endpoint mechanics are gone.

**None of these block the YC application.** They unlock the *post-acceptance scale story* — i.e., what we say to YC partners about "what we'll build in the YC batch." Reframed for the single-app reality:

1. **Health surface** — keep an in-app health/ready check for the agent loop + Nango broker so the dashboard can show integration status. (The old standalone `/health` + `chatv2-ping` route is retired.)
2. **RAG / knowledge-backed chat** — the original ask was to swap COO chat onto a chatv2 RAG backbone. That's now delivered in-app: 47 Anthropic Agent Skills (`SKILL.md`, progressively disclosed via `load_skill`) + the customer-owned Notion brain. For YC: *"the knowledge layer is shipped — Agent Skills in git, not a vector-DB bolt-on."*
3. **Run-history stability** — `automation_runs` + agent run history shapes must not drift; the dashboard's run views and the ROI signal read from them.
4. **Future: FO multi-client aggregation** — the Fractional Operator dashboard (`/dashboard/fo`) needs to roll up multiple customers' agent runs + brains. Natural up-sell from solo agency owners.
5. **Future: per-agency connection scoping in Nango** — per-agency Stripe/Harvest/ClickUp connections for the FO white-label flow (Nango connection-per-tenant, replacing the old per-agency encrypted-key model).

There was also a user-UUID refactor (use the Supabase UUID as tenant key instead of generated project IDs + a mapping table). With the single-app collapse that's largely moot — there's one tenant key everywhere now — but it's worth confirming nothing still threads a legacy project ID.

---

## 9. The interview rehearsal — what I'd say to a YC partner

If a partner asks *"what's your unique insight?"* — the 60-point gap between "uses AI" and "has AI in production" for SMBs, plus the agency-specific observation that 21.5% are losing money up from 13% in one year because the AI productivity transition is creating losers, not just winners.

If a partner asks *"why won't OpenAI build this?"* — they won't, because the integration depth (20+ integrations via the Nango broker, per-tenant OAuth connections, the agent loop + approval gate, MCP server, HITL action queue) is not on their roadmap. Cursor isn't going to build vertical agency ops. The Razorpay pattern: horizontal incumbents avoid vertical depth precisely because it doesn't scale. We win by being the deepest in one vertical first.

If a partner asks *"what have you shipped?"* — show the MCP server, the dashboard, the COO chat with sidebar history (just shipped today), the Brain UI, the action queue. Note that we have 7 cron jobs running, 5 migrations applied, 10 integrations live. Don't oversell the customer side.

If a partner asks *"why are you the team?"* — Lawand: 5 years of agency operations (age 13-17), then self-taught the agentic stack. Atta: 20-year-old CTO, ships infrastructure (the agent compute layer — agent loop, approval gate, broker — exists because of you; you first built it as a standalone backend, then folded it into the app). Cofounder bond goes back to Halabja. Halabja-founded YC company is itself a signal — most YC companies don't come from the IIT/Stanford pipeline this batch will be drawing from.

If a partner asks *"how fast can you grow?"* — honestly: we have product, we have ICP, we have positioning. We don't have go-to-market velocity yet. The 233 emails / 8 replies / 1 qualified deal is the floor, not the ceiling. YC's network + the urgency of the batch is the unlock.

---

## 10. What I'm asking you to do with this doc

- **Read it once.** 15 minutes. Push back on anything that feels wrong — better to argue now than mid-interview.
- **Ack the §8 list.** If any of those are harder than I think, tell me now so I don't promise them in the application.
- **Optional: record the 60-sec MCP demo with me before May 25.** I think it's the single most leveraged thing we can ship before the deadline. I can drive Claude Desktop while you record screen + audio explaining what's happening. 30 minutes of your time.

That's it. The rest of the YC track docs are in [`docs/yc/`](.) if you want to go deeper, but this doc has everything you need to be aligned for the YC interview.
