# Software 3.0 — The Engineering Theory (OpsRadar)

> **📜 Read as theory, not architecture (banner updated 2026-05-27).** This doc was authored (2026-05-22) when OpsRadar had a separate **chatv2** backend and used **n8n** for execution. **Both were severed in CP-15**, and the integration broker (then Composio) was later replaced by **Nango** (2026-05-26, see [`adr/0010-nango-broker.md`](./adr/0010-nango-broker.md)). Every `chatv2` / `n8n` reference below is **historical illustration** — mentally substitute: chatv2 → the single Next.js app; "n8n execution" → the agent loop + approval gate executing through the Nango broker; the MCP server is real and lives at `/dashboard/settings/mcp`. **The Karpathy Software-3.0 theory itself is timeless and still governs** — that's why this doc is kept. For current architecture see [`README.md`](./README.md) "Architecture (current truth)" + the ADRs.

*Written 2026-05-22. The canonical Karpathy-grade framework for how engineering itself has changed. Synthesised from two YC May 2026 briefings — "Engineering Transformation Strategy: The Shift to Agentic Software 3.0" and "Engineering the Agentic Era: A Strategic Roadmap for Macro-Action Workflows." This is the theory; [`build-methodology-2026.md`](./build-methodology-2026.md) is the tactical playbook; [`ai-native-company-2026.md`](./ai-native-company-2026.md) is the cultural blueprint.*

---

## The thesis in one line

> *Coding is no longer the verb. Manifesting will is.*

The constraint that has limited software since Pascal isn't compute anymore — it's the human's ability to provide high-quality intent fast enough to keep agents saturated. The OpsRadar/chatv2 team must operate as if this is already true, because it is.

---

# Part 1 — The Three Eras of Software

Per Karpathy, software has now gone through three regime changes:

| Feature | Software 1.0 | Software 2.0 | Software 3.0 |
|---------|-------------|-------------|--------------|
| **Primary programming method** | Writing explicit code/rules | Arranging datasets + objectives | Agentic prompting + context |
| **Core lever of control** | Logic statements (if/then) | Training data + neural architecture | **The context window** |
| **Role of the human** | Implementer / coder | Data curator | **Director / architect of context** |
| **Where the program runs** | CPU (deterministic) | GPU + weights (probabilistic) | LLM-as-the-computer (agentic) |
| **What "the computer" is** | Hardware | Hardware + weights | A neural host process |

### What this means for chatv2

chatv2 is built in the Software 1.0 register (TypeScript modules, MySQL, deterministic routing) but its **core product** is a Software 3.0 system: it takes context (user intent + KB + integrations state) and uses an LLM as the actual computer to produce a workflow.

So chatv2 is a **bridge platform**:
- The bottom of the stack stays Software 1.0 — Hono routes, MySQL persistence, n8n execution. These need to be *boring and correct.*
- The middle layer is Software 2.0 — the embedding models, the trained classifiers, the LLMs themselves.
- The top of the stack is Software 3.0 — the agent loop, the prompts as code, the context window as the programmable surface.

**The architectural rule:** every chatv2 module must be honest about which era it lives in. Software 1.0 modules use Zod schemas and unit tests. Software 3.0 modules use prompts, golden-set evals, and Langfuse traces. Don't mix the disciplines.

---

# Part 2 — The 20/80 Inversion

> *The legacy model is being superseded by a regime of high-level agent delegation. Human contribution compresses to 20% — restricted to intent, architectural boundary-setting, and oversight. Autonomous agents execute the remaining 80%.*

For OpsRadar's solo-or-pair team, this isn't aspirational. It's the operating model.

### Where human time goes (the 20%)

1. **Intent manifestation** — writing the spec, the 10⭐ ladder, the Markdown blueprint
2. **Architectural boundary-setting** — kill switches, escalation rules, security perimeters
3. **Oversight** — reviewing agent output for taste, systemic logic errors, the things that catch silent failure
4. **Taste decisions** — UI copy, error message tone, pricing presentation, the soul of the product

### Where agent time goes (the 80%)

1. **Implementation** — turning spec into code
2. **Testing** — generating + running Playwright suites
3. **Refactoring** — applying mechanical changes across the codebase
4. **Documentation** — keeping docs in sync with code
5. **Bug triage and fix** — for issues with deterministic reproducers

### The strategic KPI shift

| Old metric | New metric |
|-----------|-----------|
| Engineers headcount | Token throughput per engineer |
| Lines of code shipped/week | Macro-actions verified/week |
| Time to "PR merged" | Time from intent to verified commit |
| Code review backlog | Untrusted-pool verification queue depth |
| Onboarding time | Time to first independent macro-action |

**The new failure mode is "token waste."** If the founder isn't saturating their available token capacity — keeping a "Claw" busy on a 20-minute macro-instruction in parallel with another Claw and another — that's an unforced strategic error. A high-tier lab doesn't tolerate idle GPUs; OpsRadar can't tolerate idle tokens.

---

# Part 3 — Jagged Intelligence (and Why It Demands Discipline)

> *Models can refactor a 100,000-line codebase or find zero-day vulnerabilities, yet fail at simple spatial logic, like advising you to walk to a car wash 50 meters away. This is jaggedness. Being "suspicious" of the output is now a core engineering competency.*

### The mechanism

LLMs reach "escape velocity" in verifiable domains (math, code, chess once OpenAI injected datasets) because there's a clean reward signal. They stay weak in non-verifiable reasoning (humour, common sense, spatial logic, irreducibly social judgments) because RL can't grade those.

### What this means for chatv2's design

| Task type | Verifiability | Who handles it |
|-----------|---------------|----------------|
| Generate n8n workflow JSON (schema validates) | High | Agent — full autonomy after guardrails |
| Diagnose why a workflow failed | High (failure events are explicit) | Agent |
| Decide which Stripe customer to message about a margin alert | Medium | Agent proposes, human confirms (Loop 5) |
| Decide WHETHER to drop a difficult agency client | Low (irreducibly relational) | Human only |
| Compose tone of a margin-alert email to a friendly client | Low (taste) | Human writes the template; agent personalises within bounds |
| Spatial reasoning about UI layout coherence | Low | Human |

**The rule:** every agent capability in chatv2 must declare its verifiability tier in the typed code (not in prompts). The escalation rules from [`ai-native-company-2026.md`](./ai-native-company-2026.md) Loop 5 enforce this.

### Karpathy's framing: agents are "summoned ghosts"

Not animals with intrinsic motivation. **Statistical simulation circuits.** The implication for chatv2:
- Don't anthropomorphise the agent. It doesn't "want" to help. It's predicting the next token under your context.
- Therefore: the only lever is context quality. Better context > better model > better prompt > better wrapper code.
- A "summoned ghost" has no persistent loyalty. Every session starts cold. The Program MD (Part 5 below) is the only continuity.

---

# Part 4 — Agent-Native Infrastructure

Our current internet is built for the human bottleneck. Software 3.0 demands a rewrite.

### The "Copy-Paste to Agent" install pattern

Per the briefing: *"Modern tools like OpenClaw are increasingly installed via Agent-Native Skills — blocks of text designed for an agent to interpret, debug, and execute in real-time based on the specific computer environment it finds."*

**For OpsRadar/chatv2:** every install/setup/onboarding instruction should come in two flavors:

1. **Human-facing**: `npm install opsradar-coo`
2. **Agent-facing**: a Markdown block the customer's own agent (Claude Desktop, Cursor, OpenClaw) can paste and execute. Includes: environment detection logic, fallback paths, verification steps.

This is the future of distribution: customers don't install OpsRadar themselves — their agent does, given a self-contained Markdown skill.

### The Death of the UI

The briefing: *"While Software 1.0 MenuGen required OCR + image gen + Vercel deploys, Software 3.0 MenuGen is a photo + a tool like Nanobanana that overlays pixels directly. The app itself shouldn't exist."*

**For OpsRadar:** the long-term implication is that the dashboard UI is not the product. The product is the agent + the data. The dashboard exists today because:
- Humans are still in the loop for high-stakes decisions
- Trust is built through visible interfaces
- The agentic web isn't dominant yet — most agencies don't have their own agents calling chatv2

But in 18-36 months, OpsRadar must be MCP-addressable (per `architecture-2026.md` Priority 5) and the dashboard must be regenerable from prompt (per `ai-native-company-2026.md` Loop 3). The UI becomes ephemeral; the data + the agent are eternal.

### Sensors and Actuators

The new infrastructure stack:

| Layer | What | OpsRadar example |
|-------|------|------------------|
| **Sensors** | Agent-legible data structures (machine-first, human-secondary) | n8n event payloads, integration adapters that return typed objects not HTML |
| **Actuators** | Universal interfaces for agents to act on services | OpsRadar MCP server, n8n credential-bindings API, queue_action endpoint |
| **Friction surfaces** | DNS settings, toggle menus, OAuth flows that require human clicks | These must shrink toward zero; if your customer needs to click 3 times to onboard, you've failed Software 3.0 |

The chatv2 `/n8n/credentials` API is already an actuator. The MCP server (Priority 5) is the canonical actuator OpsRadar must publish.

---

# Part 5 — Program MD: The Soul of the Organisation

This is the most operational insight from the second briefing. Read it slowly.

> *"In this paradigm, the Program MD file — the Markdown-based instruction set — is the 'soul' of the organisation. A research lab or engineering department is, in essence, a set of Markdown files that describe roles, connectivity, and the desired trajectory of the swarm. Organisations must now compete on the quality of their Program MD files."*

### What this means for OpsRadar/chatv2

If chatv2's behavior is determined by the agent loop in `src/modules/chat/chat-service.ts` + the prompts it executes, then **the prompts ARE the codebase that matters.**

Failure is no longer "the model isn't good enough." It's a "Skill Issue" — the human didn't write a good enough instruction.

### The Program MD requirements

Per the briefing, every Program MD in chatv2 must include:

1. **Objective + metric definition** — explicit end-state + the exact measurable success criterion (e.g., "workflow validates against schema with zero unsafe nodes" — not vague "workflow is good")

2. **Boundary + sandbox constraints** — the rails. What architectures to avoid. Which patterns to prefer. What "safety" means in this context.

3. **Role speciation** — assign highly specific personas. Not "code"; not even "a senior engineer"; rather: *"a senior systems programmer who has shipped n8n workflows for paid-media agencies and has been burned three times by missing Stripe webhook signature verification."* The specificity primes the latent space.

4. **Instructional meta-optimization** — every 10 iterations, the agent critiques and suggests improvements to the Program MD file itself. This is recursive improvement of the instruction layer.

### chatv2's existing Program MD surface

| File | What it programs | Maturity |
|------|------------------|----------|
| `src/modules/chat/chat-service.ts` system prompt | Workflow generation | Inline today; should be in versioned Markdown |
| `src/modules/audit/...` failure analyzer prompt | Failure diagnosis | Inline; should move |
| `knowledge-base/patterns/*.md` | Pattern library | Already Markdown ✓ (Loop 2 will embed) |
| **NEW**: `prompts/` directory | All system prompts, semver-versioned | To create — see `architecture-2026.md` Loop 3 |
| **NEW**: `prompts/meta/critique.md` | The meta-prompt that critiques other prompts | To create — implements instructional meta-optimization |

### The cultural shift this drives

Every engineer (or pair-of-engineer-with-agent) at OpsRadar should be evaluated by:
- Does their Program MD have clear objectives + metrics?
- Have they specced the role and the rails?
- Are they meta-optimizing their instructions over time?

If no Program MD exists for a feature, the feature isn't real yet. **If it isn't in the Markdown, it doesn't exist to the agent.**

---

# Part 6 — Claws and Persistent Orchestration

> *Move beyond single-session interaction. A "Claw" is a persistent, looping agent layer — maintains its own persistence, executes long-running tasks, operates on the engineer's behalf even when they're not monitoring the terminal.*

### The Peter Steinberg configuration

The benchmark: **10+ simultaneous repository checkouts + agent sessions per engineer**. Prompts are 20-minute macro-instructions. This is not "chatting" — it's high-effort, high-latency parallel orchestration.

### What a Claw looks like in OpsRadar's day

```
Claw 1: refactor chat-service.ts into pipeline stages (60-min task)
Claw 2: embed knowledge-base/patterns into pgvector (45-min task)
Claw 3: write Playwright suite for /dashboard/coo (30-min task)
Claw 4: prototype OAuth 2.1 flow for the MCP server (45-min task)
Claw 5: audit current credential-binding code for envelope encryption readiness (20-min task)
Claw 6: research current 2026 status of Iraqi-founder banking options (15-min task)

While they run:
  Founder writes the next 3 Program MDs
  Reviews the previous batch of agent PRs for taste
  Takes one customer escalation call
```

The labor isn't the typing. The labor is the **orchestration**.

### Memory Compaction

A single session's context window is insufficient for macro-tasks. The Claw must self-compress:
- After every N tokens, summarise the work-so-far into a structured handoff document
- Discard the verbose intermediate reasoning
- Continue with the compacted state + the next instruction

Claude Code already does this. The discipline is: design Program MDs that anticipate compaction — they should be re-loadable from a checkpoint, not assume linear conversation flow.

### "Earned Praise" — the psychology angle

The briefing notes that Claude has a "tuned level of psychopathy" — it offers validation only when something is technically sound. This is a feature, not a bug:
- Codex (described as dry) just implements without context-aware validation
- Claude (described as offering earned praise) creates a feedback loop that catches more errors

**Practical:** use Claude Code for tasks where the agent's own judgment is part of the value. Use Codex (or its successors) for tasks where you want raw implementation with zero conversational overhead. Match the tool to the surface area.

---

# Part 7 — The Auto-Research Loop (Asymmetry of Search vs. Verification)

> *Search is expensive (swarm of agents trying 10,000 commits). Verification is cheap (does this commit lower the validation loss? does it pass the test?). The economic engine of agentic engineering is this asymmetry.*

### The Untrusted Pool of Workers model

```
[Untrusted swarm] — N agents propose code commits in parallel
       ↓ submit commits as blocks
[Trusted verifier] — runs each candidate against the test suite + benchmark
       ↓ if metric improves, merge to main
[Recursive improvement] — the merged commit becomes the new baseline
                          the swarm tries to improve from that baseline
```

This is blockchain-shaped: the "Proof of Work" is the experimentation; the reward is the recursive product improvement.

### Where this applies in chatv2

1. **Prompt optimisation** — swarm tries 100 variants of the workflow-generation system prompt; verifier runs each against the golden-set (from `architecture-2026.md` Priority 4); best variant wins
2. **Pattern library expansion** — swarm proposes new pattern files; reviewer agent + safety scorer + golden-set replay verify; promoted patterns merge to `knowledge-base/`
3. **Hyperparameter search** — temperature, max_tokens, top_p combinations swept against golden-set; winning combo deployed
4. **Repair-loop strategy** — variants of how the repair stage frames its prompts; verified by repair success rate

### Why this is the natural endpoint of Loop 1

[`ai-native-company-2026.md`](./ai-native-company-2026.md) Loop 1 (Autonomous Engineering) is exactly this pattern, scoped to the KB + patterns layer. The Untrusted Pool model is the formal description of what Loop 1 implements.

The boundary stays the same: the swarm can experiment on **the knowledge layer**, not on the kernel. The trusted verifier is always the schema + safety + golden-set + (optionally) the human reviewer.

---

# Part 8 — The Director's Mindset (Why Understanding Is the Bottleneck)

> *You can outsource thinking. You can't outsource understanding. A director must still grok the fundamentals — even if they never write the underlying C++ or PyTorch code.*

### The OpsRadar-specific example

The briefing's example of a model that incorrectly used email addresses as primary keys to link Stripe + Google accounts — failing to realize that users change emails — is exactly the kind of failure mode chatv2 must guard against.

The founder/director must understand:
- The integration shapes (Stripe customer IDs vs HubSpot deal IDs vs Harvest contact IDs are all different)
- The data lifecycle (what changes? what's stable? what's user-mutable?)
- The trust boundaries (which API keys can the agent see? which never?)
- The cost surfaces (which LLM calls compound? which are bounded?)

If the founder can't answer these from memory, no Program MD can save the product from systemic errors. **Understanding is the only thing that can't be delegated.**

### What this means for OpsRadar's hiring + scaling story

When OpsRadar hires (post-YC, post-seed), the bar is:
- Can this person hold the whole system in their head?
- Can they spot the email-as-primary-key bug class without prompting?
- Can they direct 10 Claws and not get lost?

The old bar (can they code?) is now table stakes — agents code. The new bar (do they understand?) is what separates a force multiplier from someone who burns tokens making things worse.

### Agent-Native recruitment (per the briefing)

Traditional coding puzzles are obsolete (any candidate solves them with an LLM in 30 seconds). The new interview:

1. **The Big Project mandate** — "build a Twitter clone using your agentic tools, including a complete chatv2-style backend with multi-tenant auth and an n8n-style automation layer"
2. **Agentic red-teaming** — give the candidate's submission to a frontier LLM and try to break it. The candidate is judged by the security + robustness of what they directed.
3. **Whiteboard the failure modes** — given a description of OpsRadar, can the candidate name the 5 silent-failure classes most likely to bite the product in production?

These three together replace the entire leetcode regime.

---

# Part 9 — AI Psychosis: Navigating the Infinite Search Space

> *Adopting this roadmap triggers "AI Psychosis" — a psychological nervousness from the realisation that the search space is now infinite, and the only limit is the engineer's ability to string tools together.*

This is real. Three coping patterns:

### 1. The Spec is the Anchor

When the search space is infinite, you orient by *what you're trying to manifest.* The Program MD + the 10⭐ spec from [`build-methodology-2026.md`](./build-methodology-2026.md) are not optional artifacts — they are the only thing standing between you and analysis paralysis.

### 2. Verifiable Rails Before Soft Domains

The briefing's guidance: *"Ensure agents stay on the verifiable rails while humans manage the soft nuance."*

Translation for OpsRadar:
- Let agents go wild on workflow JSON generation, schema validation, test suite generation, refactors with green CI as the reward signal
- Don't let agents make brand voice decisions, pricing calls, customer relationship calls
- The escalation rules in Loop 5 are the structural enforcement

### 3. Ephemeral Software / Agentic Web

Per the briefing: *"Dobby the Elf — Karpathy's home-automation agent — didn't need a smart-home app; it hacked the local network, reverse-engineered Sonos and HVAC endpoints, and created its own dashboard. This is the future of Ephemeral Software."*

For OpsRadar, the long-term picture: agencies don't need to learn OpsRadar's UI. Their agent does. Their agent queries OpsRadar via MCP, gets data, surfaces it in whatever interface the user already prefers (Slack message, ChatGPT thread, Cursor sidebar).

This is why the MCP server (live at `/dashboard/settings/mcp`) is the most strategic surface — it's how OpsRadar participates in the Agentic Web. The dashboard is short-term necessary, long-term obsolete.

---

# Part 10 — What This Means for the OpsRadar/chatv2 Roadmap

The three philosophy docs on this branch ([this doc] + [`ai-native-company-2026.md`](./ai-native-company-2026.md) + [`build-methodology-2026.md`](./build-methodology-2026.md)) plus the current-architecture truth ([`README.md`](./README.md) + ADRs 0005–0012) form a coherent stack:

| Doc | Question it answers |
|-----|---------------------|
| `software-3-engineering-2026.md` (this) | What is the *theory* of how engineering itself has changed? |
| `build-methodology-2026.md` | How does *one engineer* actually work day-to-day under that theory? |
| `ai-native-company-2026.md` | How does the *company* compound under that theory? |
| current architecture (`README.md` + ADRs 0005-0012) | What *modules and migrations* implement all of the above in the live app? *(the old `architecture-2026.md`, a chatv2 sprint plan, was deleted with the CP-15 sever)* |

The mapping to the historical chatv2 4-sprint roadmap (preserved as illustration; the live equivalents are the agent loop + approval gate + Notion brain + MCP server):

- **Sprint 1** (multi-pass agent + Langfuse) = the foundational *verifiable rails* the Auto-Research loop needs
- **Sprint 2** (envelope encryption + vector RAG) = the tenant + memory primitives the Program MD layer requires
- **Sprint 3** (failures tier + golden set) = the search/verification asymmetry made concrete
- **Sprint 4** (MCP server + reliability) = participation in the Agentic Web
- **Sprint 5+** (Loops 1-5 from `ai-native-company-2026.md`) = the recursive improvement layer that compounds everything

By the end of Sprint 8, chatv2 isn't just "a YC-grade agentic compute layer." It's a **Software 3.0 native system** — context-driven, Program-MD-governed, Claw-orchestrated, Untrusted-Pool-improved.

---

# What this rejects (the heresies)

The Software 3.0 framing isn't compatible with several common patterns. Reject them in chatv2:

| Pattern | Why reject |
|---------|-----------|
| Prompts hardcoded inline in service files | Prompts are versioned Program MDs, not strings |
| "Just retry with a different prompt" as a debugging strategy | This is treating the agent as a slot machine, not a programmable system |
| Adding more model calls when failures happen | Add better context, not more invocations |
| Treating the model as "the AI" (singular, anthropomorphised) | It's a summoned ghost — a statistical circuit. No memory. No loyalty. No intent. |
| Hiring junior engineers to "write more code" | The right hire writes more Program MDs and orchestrates more Claws |
| Measuring eng productivity by PR count of human-typed code | Measure macro-actions verified per token spent |
| Adding a UI for every new capability | The UI is ephemeral. Add an API/MCP tool first, UI second. |

---

# Sources

- Karpathy on the Three Eras of Software (Software 1.0/2.0/3.0 framework) — referenced in YC May 2026 "Engineering Transformation Strategy" briefing
- YC May 2026 "Engineering Transformation Strategy: The Shift to Agentic Software 3.0" — Parts 1-4, 8 of this doc
- YC May 2026 "Engineering the Agentic Era: Macro-Action Workflows Roadmap" — Parts 2, 5, 6, 7, 9 of this doc
- Companion docs on this branch:
  - [`README.md`](./README.md) + ADRs 0005–0012 — current architecture *(replaced the deleted `architecture-2026.md`)*
  - [`build-methodology-2026.md`](./build-methodology-2026.md)
  - [`ai-native-company-2026.md`](./ai-native-company-2026.md)

---

*"The 'neural host' is taking over. Our role is no longer to write the code, but to provide the taste, judgment, and architectural oversight to ensure these ghosts build systems that are secure, efficient, and elegant."*
