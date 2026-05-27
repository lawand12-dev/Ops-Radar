# How One System Earns 4 YC Categories — The Brain, the Fleet, the Gate, the Fabric

*Written 2026-05-22. Rewritten 2026-05-27 — the original "n8n is the body, chatv2 is the spinal cord" execution-thread framing was severed in CP-15 (chatv2 + n8n killed; see [`../adr/0001-composio-broker.md`](../adr/0001-composio-broker.md)), and the broker was swapped Composio→Nango on 2026-05-26 ([`../adr/0010-nango-broker.md`](../adr/0010-nango-broker.md)). This version maps the four YC RFS categories onto the architecture that actually exists now: a Nango tool-fabric, the agent loop + approval gate, a customer-owned Notion brain backed by `SKILL.md` files, the Hire surface, and a customer-facing MCP server. Companion to [`build-architecture.md`](./build-architecture.md) and the ADR set.*

> **The unifying insight survives the pivot:** we do not pick a YC category. The *same* system earns all four — because the four categories are four views of one nervous system. The **customer-owned Notion brain + `SKILL.md` files** are the executable Company Brain (#4). The **agent fleet + approval gate** are the service company that does the work (#2). The **MCP server** makes that system a first-class citizen for other agents (#12). The **Nango tool-fabric + agent loop** are the closed-loop OS that observes, decides, and acts (#15). Build the system; the categories fall out by construction.

---

## What changed, and why the old framing is dead

The first version of this doc routed every category through n8n ("the body") and chatv2's chat-to-workflow generator ("the spinal cord"). **Both are gone.** CP-15 severed chatv2 and ruled out a workflow generator entirely; the durable-primitive answer, if ever needed, is Trigger.dev / Vercel cron, not a generator. The 2026-05-21 Composio breach then forced a wholesale broker swap to Nango on 2026-05-26.

So the execution story is no longer "the COO proposes → chatv2 generates an n8n workflow → it runs on the customer's n8n." It is now, end to end:

```
agent loop (Vercel AI SDK) proposes an action, with reasoning + confidence
        ↓
approval gate (Ask / Auto / Off, per-tool autonomy)   src/lib/agents/approval-gate.ts
        ↓
broker (Nango) executes the action AS the customer      src/lib/nango.ts  (nangoProxy)
        ↓
outcome recorded → /dashboard/actions + outcome tracking → the brain learns
```

No generator. No second backend. No customer-run n8n instance. The customer owns their **brain** (the Notion workspace + the skills that describe how their business runs), not a pile of workflow JSON.

### Internal language vs external language

| Internal (eng, architecture) | External (customer copy, application) |
|---|---|
| Nango | "OAuth-secured connections; tokens never touch our servers" |
| `nangoProxy` / agent loop | "the AI does the work" / "agentic actions" |
| approval gate (Ask/Auto/Off) | "you approve before anything happens" |
| `SKILL.md` files + Notion brain | "your company brain — an executable record of how you run" |
| MCP server | "OpsRadar is usable by your other AI tools too" |

Per [CLAUDE.md](../../CLAUDE.md) voice rules: keep the vendor name out of customer copy (decided in [`../adr/0010-nango-broker.md`](../adr/0010-nango-broker.md) — copy describes the *capability*, not the broker, so it survives the next swap). A YC partner who asks "what's your execution layer?" gets the credible answer: *"the agent loop proposes, the approval gate enforces who-can-do-what, and a broker executes the action as the customer over short-lived OAuth session tokens — the customer never hands us a key, and we never store one."*

---

# #2 — AI-Native Service Companies (Gustaf Alströmer)

**YC framing:** *"Services at software margins"* — don't sell software, do the work; target already-outsourced functions.

## What we replace
The fractional-COO function — hours a week of pattern recognition across Stripe + HubSpot + Harvest + ClickUp, surfacing a handful of decisions and then *acting on them*. OpsRadar runs that loop continuously and, on approval, executes the decision. The difference from every dashboard product is the last clause: it acts.

## The code that delivers it
- `src/app/dashboard/hire/` — **the** surface. One chat where the customer hires and directs AI workers (the COO chat, the agent fleet, and standing automations all collapsed here — [`../adr/0011-hire-surface-collapse.md`](../adr/0011-hire-surface-collapse.md)).
- `src/lib/agents/loop.ts` — the agent loop (Vercel AI SDK `generateText`/`streamText`).
- `src/lib/agents/approval-gate.ts` — write classifier + per-tool autonomy (Ask/Auto/Off); the control-first layer that makes "the AI does the work" safe ([`../adr/0005-control-first-approval-gate.md`](../adr/0005-control-first-approval-gate.md)).
- `src/lib/nango.ts` — `nangoProxy` executes the approved action as the customer.
- `/dashboard/actions` — the approval-gate landing; every proposed write queues here.

## The execution thread (no generator)
When a worker surfaces *"Send invoice reminder to Client B — $4,200, 35 days overdue"*: the agent loop proposes it with reasoning and a confidence score → the approval gate resolves autonomy (the owner clicks Confirm, or it auto-fires if that tool is set to Auto) → `nangoProxy` calls Stripe + sends the email **as the customer**, over a short-lived Nango session token → the outcome is recorded and feeds outcome tracking. Advisory without that last leg; a service company with it.

## Demo-day proof
Live screen-share in Hire: a worker surfaces a margin/overdue-cash alert, the owner approves inline, the action executes through Nango on the customer's connected tools, the outcome logs back. The control-first approval gate is also the antidote to the "remove-the-human" 11x backlash — lean into it on camera.

---

# #4 — Company Brain (Tom Blomfield)

**YC framing:** not search, not a chatbot over docs — an **"executable skills file,"** a living map of how a company actually works. *"The biggest blocker to AI automation isn't the models — it's the domain knowledge."* Build it **vertical first**.

## What we build — the brain is literal here
Two pieces, and they are exactly the thing Blomfield's RFS asks for:

1. **`SKILL.md` files** — 47 of them across 9 domains in `knowledge-base/skills/`, progressively disclosed via the `load_skill` tool (three-tier disclosure: catalog at boot, full body on demand). This *is* the executable skills file. See [`../adr/0003-skills-over-rag.md`](../adr/0003-skills-over-rag.md) — we migrated off RAG to land on exactly the canonical post-RAG pattern.
2. **The customer-owned Notion brain** — 20 databases + strategic pages per customer, provisioned via `src/lib/notion/*`. The customer owns it forever; it is standalone-useful even with our agents switched off. The agents *enrich* the brain; they don't gate it.

## Garry Tan's pattern, productized for the customer
This maps near-exactly onto the build pattern the YC president has published (deep-dive §7.1): **SOUL.md / USER.md / AGENTS.md** ("who the agent is / who you are / operational rules"). OpsRadar ships that triad *for the customer*: the `SKILL.md` catalog is the operational rulebook, the Notion brain is the deep model of the business, and the per-agent prompts carry the operator judgment. Tan's *"do it, skillify it, add to cron, evals"* loop is literally our loop — skills + cron agents + outcome tracking. We're not echoing his words; we shipped the thing.

## How the brain *learns* (not just stores)
The agent fleet writes findings back to the brain (Notion rows), and confirmed/rejected actions feed outcome tracking — so the brain reflects what actually happened, not just what was fetched. The orchestrator-worker pattern ([`../adr/0006-orchestrator-worker-pattern.md`](../adr/0006-orchestrator-worker-pattern.md)) has domain agents read the brain *first*, then fill gaps with live tool calls, then write higher-level synthesis back.

## Demo-day proof
A customer's brain showing a pattern the system extracted from their own operations — *"Client B expands scope every Q4; current trajectory matches; flag now"* — with provenance back to the agent runs and the skills that produced it. Horizontal brains (e.g. Memory Store, the closest funded comp) can't produce this: they're a wiki; ours is a byproduct of agents doing real vertical ops work.

---

# #12 — Software for Agents (Aaron Epstein)

**YC framing:** *"Make Something Agents Want"* — machine-readable interfaces; agents as first-class users.

## What we ship
A customer-facing **MCP server** — token + install snippet live at `/dashboard/settings/mcp`. The customer's *other* AI tools (Claude Desktop, ChatGPT, partner agents) can query and act on their OpsRadar instance directly. OpsRadar isn't just a surface a human opens; it's a system another agent can use.

## What the MCP server exposes
The same capabilities the Hire chat uses, exposed machine-readably: read the brain, query finance/profitability/capacity/scope, and **propose actions** — which still route through the *same approval gate*. An external agent can ask OpsRadar to do something; it cannot bypass the human-in-the-loop control surface. (There is deliberately **no** "generate a workflow" tool — that was the dead chatv2 capability; the agent-loop + approval-gate path replaces it.)

## Security posture
Per-tenant scoped tokens, audit-logged invocations, per-tenant rate limits (Upstash Redis), and the approval gate as the hard backstop on every write. The credible claim to a partner: most MCP servers in 2026 ship with no auth and no gate; ours treats an external agent exactly like an internal one — scoped, logged, and approval-gated.

## Demo-day proof
A live Claude Desktop session during the interview: install OpsRadar from the customer's MCP snippet → ask *"What's my profitability on Client B this month?"* → Claude queries OpsRadar via MCP and answers with reasoning → ask it to draft an overdue-invoice nudge → the proposal lands in `/dashboard/actions` for approval. Same gate, different caller. No PSA tool demonstrates this.

---

# #15 — AI OS for Companies (Diana Hu)

**YC framing:** *"Closed-loop intelligence"* across operations; the connective layer that makes a company legible to AI by default. **Explicitly "Not another dashboard."**

## Heed the warning: lead with brain + agent, not the dashboard
Hu's "not another dashboard" is a direct instruction. So in the application and the demo, the dashboard is plumbing, not the pitch. The pitch is: a brain that knows how the business runs + a fleet that acts on it. The `/dashboard/*` routes are where a human peeks in; they are not the product.

## What the OS actually is
- **The tool-fabric** — Nango brokers ~20 integrations (Stripe, HubSpot, ClickUp, Harvest, Gmail, Notion, …) behind one interface (`src/lib/nango.ts`). This is the "connective layer" Hu describes: the thing that makes the company legible to AI.
- **The agent loop + cron fleet** — observe (read tools + brain) → decide (orchestrator-worker) → act (approval gate → Nango) → learn (outcome tracking → brain). That's the closed loop.
- **Durable scheduling** — Trigger.dev / Vercel cron ([`../adr/0002-scheduler-trigger-dev.md`](../adr/0002-scheduler-trigger-dev.md)). The cron fleet is what runs the boring stuff on a clock.
- **Resilience** — the model-fallback chain (OpenAI → Groq → DigitalOcean Gradient, [`../adr/0012-model-fallback-stack.md`](../adr/0012-model-fallback-stack.md)) and the broker swap itself are the OS staying up when a dependency fails.

## The cron fleet is the cerebellum (Tan's frame)
Garry Tan, May 2026 (deep-dive §7.1): *"Everyone building AI agents is focusing on the prefrontal cortex — planning, reasoning. There's value in building the cerebellum: offloading boring tasks into reflex… The winners will nail the boring stuff first."* That is exactly what the cron fleet is — collections, scope, delivery, briefing: the boring, must-be-done ops that run on a schedule without a committee. **Frame the fleet this way in the application: we built the cerebellum, not just the chat.** (The fleet is mid-rebuild on Nango — 1 agent live today, was 28 pre-pivot, restored one at a time. That's a velocity story, not a gap: "one `git restore` of the spec + one registry line" per agent.)

## Demo-day proof
A timelapse of one closed loop: a cron worker detects a margin alert overnight → proposes a reprice with reasoning → owner approves in the morning → Nango executes on the customer's tools → outcome logs → the brain updates. One loop, no human in the boring middle, human at the decision edge.

---

# The unified sequence — earning all 4 categories on the real architecture

The column that used to read "n8n element" now reads **real architecture**: which of the four load-bearing pieces (broker action / brain write / MCP surface / approval gate) each step exercises. The eight-step shape from the original holds; the mechanics are current.

| Step | Ship | YC category | Real-architecture element |
|---|---|---|---|
| **1** | Agent loop + approval gate proven on one live integration (Gmail on Nango) | **#2** ✓ | approval gate → `nangoProxy` executes the action |
| **2** | `SKILL.md` catalog + `load_skill` wired into Hire + cron agents | **#4** (skills file) | brain write — the executable skills layer |
| **3** | Notion brain provisioning + agents writing findings back | **#4** ✓ | brain write — customer-owned, agent-enriched |
| **4** | Customer MCP server (`/dashboard/settings/mcp`), scoped + audit-logged | **#12** ✓ | MCP surface — external agents propose through the same gate |
| **5** | Cron fleet rebuilt on Nango (collections / scope / delivery / briefing) | **#15** (cerebellum) | broker action on a schedule — the boring stuff, automated |
| **6** | Orchestrator-worker: domain agents read brain → fill gaps → synthesize | **#4** + **#15** | brain write + broker action — closed loop |
| **7** | Outcome tracking → brain learning loop across all agents | **#15** (closed loop) | brain write — the loop compounds, not plateaus |
| **8** | Model-fallback + resilience hardening across the whole fleet | **#15** ✓ (full) | the OS stays up when a dependency fails |

**By step 4 there's evidence for all four categories. By step 8 the closed loop is running across a rebuilt fleet.**

---

# The single architectural rule

> Every shipped feature must serve **more than one YC category** or it doesn't ship.

The MCP server isn't only #12 — it's how the brain (#4) is reachable by external agents and how those agents trigger approval-gated actions (#2 + #15). The `SKILL.md` layer isn't only #4 — it's the operator judgment the agent loop (#2) loads mid-task and the reflex library the cron fleet (#15) runs on. The Hire chat isn't only #2 — it's the brain's query surface (#4), an MCP consumer's mirror (#12), and the human-at-the-edge control point for the closed loop (#15).

**One coherent system. Four YC categories. The brain + fleet + gate + fabric — not an execution thread bolted on.**

---

# The single sentence that ties it together

> **The Notion brain + `SKILL.md` files are how the company is legible to AI; the agent fleet + approval gate are how the work gets done; the MCP server is how other agents use it; the Nango fabric + agent loop close the loop. OpsRadar is the nervous system for a service business — observing, reasoning, acting on approval, and learning from every action.**

That's what we're building. The four YC categories converge instead of conflicting because they're four views of one system — and the part that makes every category land is the closed loop (observe → decide → approve → act → learn), not any single tool behind it.

---

# Cross-references

- [`build-architecture.md`](./build-architecture.md) — technical build plan
- [`research-addendum.md`](./research-addendum.md) — market validation for the 4 categories
- [`what-yc-wants.md`](./what-yc-wants.md) — application drafting guide
- [`founder-profile.md`](./founder-profile.md) — team profile
- [`traction-evidence.md`](./traction-evidence.md) — customer + investor pipeline
- [`mcp-registry-submission.md`](./mcp-registry-submission.md) — the #12 MCP surface, submission detail
- [`../research/2026-05-27-yc-deep-dive-application.md`](../research/2026-05-27-yc-deep-dive-application.md) — RFS categories + authors, partner-thesis echoes (§3, §7)
- [`../adr/0010-nango-broker.md`](../adr/0010-nango-broker.md) — broker = Nango
- [`../adr/0011-hire-surface-collapse.md`](../adr/0011-hire-surface-collapse.md) — surfaces collapsed into `/dashboard/hire`
- [`../adr/0012-model-fallback-stack.md`](../adr/0012-model-fallback-stack.md) — model resilience
- [`../adr/0003-skills-over-rag.md`](../adr/0003-skills-over-rag.md) — the executable skills layer
- [`../adr/0005-control-first-approval-gate.md`](../adr/0005-control-first-approval-gate.md) — the approval gate
- [`../ai-native-company-2026.md`](../ai-native-company-2026.md) — the recursive loops
- [`../software-3-engineering-2026.md`](../software-3-engineering-2026.md) — Karpathy framework

---

*Rewritten 2026-05-27. The build plan, mapped onto the current Nango + Hire + Skills + MCP architecture. No n8n. No chatv2. One closed loop.*
