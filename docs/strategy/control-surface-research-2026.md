# Agent Control Surface — V1 Research Reference

> Compiled: 2026-05-23 · Purpose: capture the research that informed CP-14's v1 control surface (approval gate, COO migration, runs view, autonomy toggle). Reference doc when adding new agent surfaces.

---

## The question we needed to answer

"What's the smallest, most-copied 'control layer' pattern that production agentic products ship in v1?" — because we were drowning in options (plan-mode, approval gates, audit trails, undo windows, NEVER-AUTO lists, steerability hooks) and needed prescription, not a menu.

## The convergent answer

Every winning agentic product (Lindy, Devin v1, Claude Code launch, Cursor, Zapier HITL) shipped **the same 4 control primitives** in their first release. Anthropic's "Building Effective Agents" names these as canonical. Vercel AI SDK v6 ships them as first-class features.

| # | Feature | Mechanism | Inspired by |
|---|---|---|---|
| 1 | **Per-tool approval gate** | Vercel AI SDK v6 `needsApproval: true` flag; pauses tool loop, surfaces card | Lindy "Review & Send", Claude Code permission prompts |
| 2 | **Editable draft before send** | Approval card payload renders as `<textarea>`; edited value passed back via `addToolApprovalResponse` | Lindy draft view, Zapier "Change data before approving" |
| 3 | **Run history view** | Dedicated table of every agent run, drill-in drawer with per-step Data In/Out/Logs + Replay | Lindy task view, Devin sessions, Zapier Zap History |
| 4 | **Per-tool autonomy toggle** | Three-state: Ask every time / Auto-approve / Disabled — stored per (user, tool) | Claude Code's `acceptEdits` mode, Devin's "Agency on/off" |

**Total ship effort:** 4 days of focused work. Matches Lindy's launch surface.

---

## The 8-dimension control surface (full framework)

When evaluating whether a future feature is "control" or "capability," map it against these 8 dimensions:

| # | Dimension | Definition | Our v1 state |
|---|---|---|---|
| 1 | **Predictability** | Customer knows what will happen *before* it happens | 🟡 Partial — per-tool approval covers it; no plan-mode yet |
| 2 | **Authorization** | Customer decides what's auto vs ask | ✅ Done (autonomy toggle) |
| 3 | **Interruptibility** | Customer can stop / pause / redirect mid-flight | ❌ Deferred to v1.1 |
| 4 | **Reversibility** | Customer can undo what was done | 🟡 30-min undo window on email writes only |
| 5 | **Visibility** | Customer can see what's happening / happened | ✅ Done (runs view + drawer) |
| 6 | **Steerability** | Customer can teach the system their preferences | ✅ Done (How We Work + Decision Log + Approval Patterns) |
| 7 | **Boundedness** | Customer sets blast radius (cost, recipients, scope) | ❌ Deferred to v2 (pricing tiers handle approximation) |
| 8 | **Accountability** | Customer can answer "why did the agent do X?" | 🟡 agent_runs summary captures it; no per-action reasoning trace |

**Rule of thumb:** any new feature should advance at least one dimension. Features that add capability without advancing any control dimension are likely "wrong center of gravity" for this product cycle.

---

## What we explicitly skipped in v1 (and why it was safe)

| Skipped | Why safe to skip |
|---|---|
| **Plan-mode** (Devin's "approve the whole plan first") | Per-tool approval covers the same risk surface — every irreversible action still requires a click. **Lindy shipped without plan-mode and still does.** |
| **Policy DSL** ("auto-approve refunds under $50") | Premature. Three-state toggle (Ask/Auto/Off) covers 80% of demand. Layer rules after seeing real support tickets. |
| **Email/Slack approval delivery** | Tempting but doubles surface area. In-app + browser notification is enough for v1. Lindy added Slack later. |
| **Confidence-based auto-execute** (Devin 2.1) | Requires calibrated confidence data we don't have. Behavior-based auto-policy covers the same need. |
| **Auto-mode classifier** (Claude Code) | Anthropic shipped this in March 2026 after months of permission-prompt data. Can't leapfrog them. |
| **Stop button mid-flight** | Nice but rarely used in practice — most users just don't click Approve. Add in v1.1. |

---

## The killer insight that made this small

**Vercel AI SDK v6 ships `needsApproval` as a first-class tool flag.** The hardest part — pausing the agent loop, surfacing approval state to the UI, resuming after user click — is solved by the framework. We just flag tools as risky and the SDK does the rest.

Reference: [Vercel AI SDK Human-in-the-Loop cookbook](https://ai-sdk.dev/cookbook/next/human-in-the-loop). Copy that file. Add Supabase tables on top. Done in 4 days.

---

## UX patterns to copy (concrete spec)

Synthesized across Lindy, Devin, Cursor, Claude Code, Zapier, Manus.

### Plan preview
- Numbered checklist, **inline in chat**, **editable as text**, single primary "Approve / Run" button
- Trigger: customer command requires 2+ tool calls OR touches a write-scope
- Inspired by: Cursor Plan Mode + Devin Interactive Planning

### Approval card
- In-thread card: action summary, full payload preview, 3 buttons (Approve / Edit / Reject)
- Edit opens payload as editable fields in place
- Multi-channel delivery (in-app + email + Slack) is table stakes for v2
- Inspired by: Lindy Review & Send + Zapier HITL

### Runs view
- Paginated table — Run | Agent | Trigger | Status | Duration | Started
- Filters: status, agent, date range, integration touched
- Click row → drawer slides in from right with: timeline of steps, per-step Data In/Out/Logs tabs, Replay button
- Inspired by: Zapier Zap history + Devin's right-drawer-tabs visual model

### Stop / interrupt (v1.1)
- Persistent [Stop] button in chat header during active runs
- Typing a new message mid-run = soft interrupt (course correction)
- Stop fires cooperative cancel: current tool finishes, downstream steps cancelled, state preserved for resume
- Inspired by: Devin's top-right stop + Manus's pause-and-resume

### Standing orders / memory
- Two-layer: per-agent "Standing Orders" textarea + workspace-level "Company Rules" in Brain
- Rules concatenated into system prompt at run start with rule IDs so agents can cite ("Skipped — rule #7: no Friday sends")
- Inspired by: Claude Code's CLAUDE.md hierarchy (workspace → agent), repackaged as visual panel

---

## Failure semantics (cross-product convergence)

Dominant pattern is **hybrid retry + pause + escalate**:

1. **Transient / read failures** → auto-retry with backoff (LangGraph default, CrewAI Flows)
2. **Write failures** → halt downstream dependents but continue independent branches; report "what worked / what failed / what's next"
3. **Ambiguity** → pause, snapshot state, escalate to user (OpenAI Operator pause, Lindy HITL, LangGraph `interrupt()`)

**Tag every tool as `read` | `write-reversible` | `write-irreversible`.** Reads retry 2× with backoff. Writes halt-on-fail with summary report. Always idempotency keys on writes.

---

## NEVER-AUTO list (3-tier safety stack)

Universal pattern across Anthropic Computer Use, OpenAI Operator, Sierra, Decagon, Lindy, Salesforce Agentforce. **Adopt as the v2 enhancement to our autonomy toggle:**

| Tier | What | Friction |
|---|---|---|
| **1 — Auto-execute** | Reads, internal-only writes, reversible state changes with audit | None |
| **2 — Single-click approval** | External writes, refunds < $X (customer-configured ceiling), bulk ops 2–10 records | Current default — `policy='ask'` |
| **3 — Hard-friction** | Refunds > ceiling, bulk > 10 records, DELETE operations, payroll, contracts, legal-flagged content, sending to > 5 external recipients | Typed confirmation OR dual approval — **not yet shipped** |

Per-tenant config: customer can raise/lower Tier-2 thresholds, but Tier-3 categories are hard-coded — only the no-go list is editable by **raising** the threshold, never by removing.

**This is Sierra's "deterministic rules wrapping generative AI" pattern.** Most-copied design across the field for a reason.

---

## Sources (consolidated)

Vercel AI SDK + cookbook:
- [Vercel AI SDK Human-in-the-Loop cookbook](https://ai-sdk.dev/cookbook/next/human-in-the-loop)
- [Vercel AI SDK 6 launch](https://vercel.com/blog/ai-sdk-6)
- [chatbot.ai-sdk.dev — Tool Approval](https://chatbot.ai-sdk.dev/docs/customization/tool-approval)

Plan-mode patterns:
- [Devin Interactive Planning](https://docs.devin.ai/work-with-devin/interactive-planning)
- [Devin 2.1 (confidence-based approval)](https://cognition.ai/blog/devin-2-1)
- [Cursor Plan Mode docs](https://cursor.com/docs/agent/plan-mode)
- [Cursor "Introducing Plan Mode"](https://cursor.com/blog/plan-mode)
- [Claude Code Plan Mode (codewithmukesh)](https://codewithmukesh.com/blog/plan-mode-claude-code/)

Approval card / HITL:
- [Lindy Email Assistant docs](https://docs.lindy.ai/use-cases/popular-workflows/email-triage)
- [Lindy Human in the Loop docs](https://docs.lindy.ai/testing/human-in-the-loop)
- [Zapier Human in the Loop](https://help.zapier.com/hc/en-us/articles/38731463206029-Request-approval-to-keep-your-workflow-running-with-Human-in-the-Loop)
- [Zapier Replay Zap runs](https://help.zapier.com/hc/en-us/articles/8496241726989-Replay-Zap-runs)

Failure semantics:
- [LangGraph interrupts docs](https://docs.langchain.com/oss/python/langgraph/interrupts)
- [LangGraph error handling](https://machinelearningplus.com/gen-ai/langgraph-error-handling-retries-fallback-strategies/)
- [OpenAI Operator help](https://help.openai.com/en/articles/10421097)
- [OpenAI Operator System Card](https://openai.com/index/operator-system-card/)
- [CrewAI Flows tutorial](https://markaicode.com/crewai-flows-event-driven-agent-orchestration/)

Safety / NEVER-AUTO:
- [Anthropic Computer Use tool docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)
- [Anthropic — Trustworthy Agents](https://www.anthropic.com/research/trustworthy-agents)
- [Anthropic — Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [Sierra AI guide to agents](https://sierra.ai/blog/ai-agents-guide)
- [Decagon — Designing layered guardrails](https://decagon.ai/resources/designing-layered-guardrails-for-reliable-ai-agents)
- [Salesforce Agentforce — define guardrails](https://trailhead.salesforce.com/content/learn/modules/agentforce-agent-planning/define-the-agent-guardrails)
- [Microsoft Copilot Studio governance](https://learn.microsoft.com/en-us/microsoft-copilot-studio/security-and-governance)

Memory / preferences:
- [Claude Code memory docs](https://code.claude.com/docs/en/memory)
- [Lindy AI Agents docs](https://docs.lindy.ai/fundamentals/lindy-101/ai-agents)
