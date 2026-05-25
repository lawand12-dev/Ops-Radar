<!-- DEPRECATION NOTICE (2026-05-23): this doc was authored when OpsRadar had a separate chatv2 backend. That backend was severed in CP-15 — see docs/adr/0001-composio-broker.md. References to chatv2 below are historical. The broader theory still applies to OpsRadar as a single-system app. -->

# Build Methodology — GStack Adapted for OpsRadar + chatv2

*Written 2026-05-22. The personal operating system for how a 1-2 person team ships at the pace of a 50-person engineering org. Synthesised from the GStack methodology (YC May 2026) and adapted to OpsRadar's reality.*

---

## The thesis

You will not out-hire competitors. You will not out-fund them. You will out-**token-max** them.

GStack's core claim: the constraint that used to limit a builder was *labor*. The constraint that limits you now is *taste* — the capacity to direct compute at the right problem and judge the output. The builder who masters the agentic stack outputs at 400x their historical rate. The builder who doesn't is "below the API guideline."

This doc is the operating manual.

---

## The four phases of every feature

| Phase | Purpose | Tool / Persona | Output |
|-------|---------|----------------|--------|
| **I — Strategic Plan** | Force the feature into its Platonic ideal before building | CEO persona + Brian Chesky 10-star framework | A "10x for 2x effort" spec |
| **II — Architectural Grounding** | Load the system into the model's latent space | ASCII art mandate + Markdown-as-code | Visual diagrams + structured spec |
| **III — Development Loop** | Ship at velocity with a Conductor instance | Claude Code (default) or CodeX (deep rigor) | 10-15+ PRs / 48h |
| **IV — Rigorous QA** | Refuse to ship without a real test harness | Playwright "Browse" daemon, 90% coverage target | Mutation-tested, browser-tested feature |

The discipline is to **never skip a phase**. The temptation in a vibe-coded world is to jump straight to Phase III. That produces "AI slop" — code that feels right and collapses under real data. Phase I and Phase II are the difference between vibe-coding and engineering.

---

# Phase I — The CEO Persona and the 10-Star Plan

## The meta-prompt

Before building anything, run the feature through the Chesky framework:

```
You are Brian Chesky reviewing this feature for OpsRadar.
A 5-star experience is baseline utility (it works).
Describe what the 7, 8, and 10-star versions of this feature look like.
For each star level, name:
  - What the user feels when they use it
  - What it would take to build (effort)
  - What it would save the user (value in $)

Then identify the single change that moves from 5-star to 10-star
for the lowest effort increase. This is the "10x for 2x" insight.
Force the project out of its latent space into its Platonic ideal.
```

## OpsRadar example: the COO chat 10-star ladder

| Stars | What it is | Effort | $ Value/yr |
|-------|------------|--------|------------|
| 5 ⭐ | Chat that answers questions using injected context | Already shipped | $0–500 (replaces a Slack message to the team) |
| 7 ⭐ | Chat with tool use — fetches live data from Stripe/HubSpot mid-conversation | Sprint 1 of COO agent plan | $5K (replaces a weekly analytics review) |
| 8 ⭐ | Chat that surfaces actions inline ("Reprice Client B: confirm?") with audit trail | Sprint 2 | $20K (replaces decision latency that costs deals) |
| 10 ⭐ | Chat that watches your business 24/7, surfaces actions to your phone before you ask, and acts on the ones with high confidence after configurable HITL | Sprint 4–6 | $120K (the fractional COO replacement that makes OpsRadar a $10K MRR product per customer) |

The 10x-for-2x insight in this ladder: the jump from 7⭐ to 8⭐ (inline actions with confirmation cards) is the single highest-leverage step. That insight goes straight to the top of the build queue.

## The "10x check" rule

For every feature, write down the 10⭐ version. If the build cost to get there is more than 2x the 5⭐ build cost, the feature is wrong-shaped. Either find a smaller wedge or skip the feature.

---

# Phase II — Architectural Grounding (Markdown is Code)

## The ASCII art mandate

Before any code, the agent must produce ASCII diagrams that prove architectural comprehension:

```
1. Data Flow State Machine
   Shows how data moves through the feature start to end.

2. Dependency Graph
   Shows which modules depend on which; flags circular dependencies.

3. Processing Pipeline
   Shows the sequence of transformations applied to data.

4. Decision Tree
   Shows the branching logic at every if/else / switch boundary.
```

A diagram you can't write isn't a system you can build. If the agent can't produce a sensible diagram, the spec is wrong — fix the spec before writing code.

## Markdown as the compiled blueprint

GStack: *"Markdown is Code. It is a 'compiled' blueprint that directs agentic behavior. If it isn't in the Markdown, it doesn't exist to the agent."*

For OpsRadar/chatv2 this means:

- Every feature has a spec in `docs/dev/specs/YYYY-MM-DD-<feature>-design.md` BEFORE any code
- Every spec has the 4 ASCII diagrams above
- Every spec follows the same structure: Goal, Scope, Out-of-scope, Architecture, Data model changes, API surface, HITL gates, Acceptance criteria, Files changed
- Every implementation plan in `docs/dev/plans/` references the spec it implements

The "Wedding Planner Checklist" pattern: list every step in plain English. The agent handles the deterministic execution. The human reviews the *intent*, not the syntax.

## Why this is non-negotiable for chatv2

chatv2's `ai-service.ts` is 1,897 lines. That file got there because someone shipped code without a spec, then added to it without a spec, then added again. Markdown-first discipline is the only thing that prevents the next `ai-service.ts`-equivalent.

---

# Phase III — The Development Loop

## Tool selection (the harness)

| Tool | Use for | Why |
|------|---------|-----|
| **Claude Code** | Default development. Rapid PR shipping, file-level edits, multi-file refactors | Built for shipping velocity; the "ADHD CEO" workflow |
| **CodeX (Codex CLI)** | Deep bug hunts, repo-wide analyses, complex architectural questions | The "200 IQ friend" you call when Claude Code BSes an answer |
| **Vercel Sandbox** | Test untrusted code or one-off experiments without polluting the workspace | Isolated execution environment |
| **Background agents** (Wave 1 of this session) | Parallel work on independent files | Fan-out for breadth, not for any one deep task |

## The Conductor pattern

A Conductor instance manages a queue of multiple PRs in flight. Sample weekly cadence:

```
Monday    → PR1 (feature spec + first cut)
            PR2 (tests for last week's PR)
            PR3 (docs update for shipped feature)
Tuesday   → PR4 (bugfix from PR1 review)
            PR5 (next feature spec)
            PR6 (refactor surfaced by PR1)
...
Friday    → 13+ PRs landed in the week
```

**The benchmark:** 13+ PRs in 48 hours is what an agentic engineer ships. Anyone shipping at the old "1 feature per week" pace is below the API guideline.

## The "Ask User Question" discipline

The agent makes labor decisions; the human makes **taste** decisions. Concretely: any choice that affects the product's *feel* (UI copy, animation timing, error message tone, pricing presentation) is escalated to the human. Any choice that is purely *mechanical* (which library to import, how to name an internal helper, how to structure the test) is the agent's.

---

# Phase IV — QA: The 90% Coverage Mandate

## The shift

Vibe-coding ships features. Engineering ships **systems**. The line between them is a real test harness.

| Vibe-coding | Engineering |
|-------------|-------------|
| "It works on my machine." | Playwright in CI runs every user journey before merge. |
| Tests written after shipping. | Tests defined in the spec before the first code line. |
| Coverage = whatever happened. | Coverage target: **80–90%**, mandatory. |
| QA = the user finds bugs. | QA = the agent finds bugs before the user can. |

## The Playwright "Browse" daemon pattern

A long-lived HTTP daemon with ~70 specialised browser commands. Workflow for every feature PR:

```
1. Analyze branch context → what changed?
2. Identify mutations → every UI/data mutation this PR introduces
3. Execute browser testing → daemon interacts with each mutation
4. Report → any failure is immediately fixed by the Conductor; loop until clean
```

For OpsRadar specifically, this means every PR that touches `src/app/dashboard/*` or `src/app/api/*` runs through a Playwright suite that:
- Logs in as a real test user
- Navigates the affected pages
- Asserts that key data renders, KPIs populate, integrations connect
- Tests the empty/error/loading states the spec defined

## What 90% coverage actually buys

Per GStack: *"100% coverage is often diminishing returns; 80–90% is the professional standard required to prevent the system from falling over when real users touch the data."*

Translation: 90% means the system **survives a hostile production environment**. The other 10% is the long tail of edge cases that you fix on contact. Below 80% means you ship knowing you'll get paged.

---

# The Token-Max Culture in Practice

GStack: *"Companies are reaching demo days with 5x more revenue per employee than 18 months ago. Identify who in your org is token-maxxing — leveraging AI tokens to scale their output."*

For a 1-2 person team, the metrics that matter:

| Metric | Healthy target (2026) | Why |
|--------|------------------------|-----|
| PRs / week | 13+ | The agentic engineer baseline |
| Revenue per FTE | $500K+ ARR | The new vertical AI baseline (per Bessemer) |
| Tokens / feature shipped | Tracked but uncapped | High token spend on quality is correct |
| Cost / repair iteration | Trending down month-over-month | Loop 2 (KB) is working |
| % of generations that needed zero repair | Trending up | Loop 1 (autonomous learning) is working |
| DRI : IC ratio | 0:N (no middle managers) | Coordination is AI's job, not a person's |

## The OpsRadar founder's daily operating loop

```
06:00 — Read the night's autonomous-engineering PRs (Loop 1 outputs)
        Approve / reject; reasoning logged for the reviewer agent
06:30 — Customer escalation queue (Loop 5 high-stakes items)
07:00 — Spec writing for today's features (Phase I + II for each)
08:00 — Conductor session: dispatch agents, queue PRs
        (founder's role = taste decisions, not code writing)
14:00 — Review: Playwright runs, customer evidence, model cost dashboards
16:00 — One human-touch interaction (founder-led sales call, customer
        success deep-dive, or community post — Loop 5 reality interfacing)
20:00 — Strategic reflection: did anything that happened today change
        the 10⭐ version of where OpsRadar is going?
```

The point isn't the literal schedule. The point is the *shape* — the founder operates at the **edge** of the system (taste, escalation, strategy) while the agents operate at the **middle** (code, tests, docs, generation).

---

# What to NOT do

| Anti-pattern | Why it kills you |
|--------------|------------------|
| Skipping Phase I (no 10⭐ plan) | You build features nobody wanted to a quality nobody noticed |
| Skipping Phase II (no Markdown spec) | You produce 1,897-line files nobody can safely modify |
| Hiring people to do what tokens can do | You burn cash on coordination overhead and stop being able to pivot |
| Mocking integrations instead of using sandbox runs | Mocks pass; prod breaks; trust dies |
| Writing prompts inline in code | Prompts are versioned assets (see Loop 3 in `ai-native-company-2026.md`) |
| Letting one person hold the only Markdown spec in their head | The spec is the system. If it isn't in the file, it doesn't exist. |

---

# What to ship next under this methodology

For the OpsRadar/chatv2 stack specifically, the methodology says:

1. Every Sprint plan in `architecture-2026.md` becomes a Phase I → IV cycle
2. The first PR of every sprint is the **spec** (Phase I + II artifacts: 10⭐ plan, ASCII diagrams, Markdown spec)
3. Subsequent PRs implement the spec, each individually small enough to land in 24-48h
4. The last PR of every sprint is the **Playwright suite** that locks in the behavior

The 4-sprint plan in `architecture-2026.md` should be ~80 PRs total at this cadence. A solo founder + Conductor can ship that in 4-6 weeks.

---

# Sources

- YC "GStack Methodology" talk (May 2026) — Phase I-IV structure, ASCII art mandate, Markdown-as-code, Tokenmaxxing, 90% coverage rule, "Ferrari with wrench" framing
- Brian Chesky 10-star framework — Phase I 5⭐→10⭐ ladder
- Companion docs:
  - [`architecture-2026.md`](./architecture-2026.md) — what to build with this methodology
  - [`ai-native-company-2026.md`](./ai-native-company-2026.md) — why the loops you build with this methodology compound

---

*"You are no longer writing code; you are directing agents to execute a vision. The machine handles the labor; you hold the wrench."* — GStack, May 2026
