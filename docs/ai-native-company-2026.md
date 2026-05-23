<!-- DEPRECATION NOTICE (2026-05-23): this doc was authored when OpsRadar had a separate chatv2 backend. That backend was severed in CP-15 — see docs/strategy/composio-vs-n8n-decision-2026.md. References to chatv2 below are historical. The broader theory still applies to OpsRadar as a single-system app. -->

# The AI-Native Company — Blueprint for chatv2 + OpsRadar

*Written 2026-05-22. Synthesised from the YC "How to build an AI-native company" guidance (May 2026) and translated into concrete patterns chatv2 must implement for OpsRadar to be a true AI-native product — and to enable agencies running on top of it to become AI-native themselves.*

---

## The shift

Most companies "use AI." A handful are AI-native. The difference is not how many LLM calls they make — it's the **shape of the loops** that connect data, code, decisions, and learning.

YC's working definition (May 2026):

> "If you were building a company from scratch today, you wouldn't build a hierarchy; you would build a **set of recursive loops** designed to capture every piece of data and turn it into a self-improving skill."

This document is the blueprint for those loops — for chatv2 (the platform) and for the agencies that use OpsRadar.

---

## The five recursive loops

| # | Loop | What it does | Where it lives in chatv2 |
|---|------|--------------|---------------------------|
| 1 | **Autonomous Engineering** | Failure → diagnose → write code → review → deploy | Workflow generation + repair pipeline |
| 2 | **Diorization** | Raw conversations/events → structured breadcrumbs → living brain | KB ingestion + RAG layer |
| 3 | **Disposable Software, Permanent Data** | Regenerate UIs/workflows from prompts; preserve raw data forever | Workflow versioning + KB archives |
| 4 | **Token-Maxing Culture** | Measure revenue/employee and tokens/outcome, not headcount | Analytics + per-user observability |
| 5 | **Human at the Edge** | AI handles the middle; humans handle high-stakes, novel, physical | HITL gates + escalation paths |

---

# Loop 1 — Autonomous Engineering

## The YC framing

> "The monitoring agent doesn't just flag errors; it diagnoses structural needs. If a query fails because the data is poorly indexed or a 'skill file' is missing, the agent independently writes the code, submits a merge request, and has another agent review and deploy it. The company's technical capabilities literally expand while the staff is asleep."

This is the most aggressive of the five concepts and the one that distinguishes "AI-native" from "AI-augmented."

## What this looks like in chatv2

### The current state
- A user prompts chatv2 to generate a workflow.
- chatv2 produces JSON. If it fails validation, the user sees an error.
- A human engineer reads the error, looks at the prompt, edits the prompt or the validator, ships a fix.

### The autonomous-engineering state

```
n8n workflow fails in production
    ↓
Event posted to /event
    ↓
[Diagnose agent] reads the failure + the workflow + the run history
    ↓
Decides: is this a (a) workflow design bug, (b) credential issue,
         (c) missing pattern in the KB, or (d) chatv2 system limitation?
    ↓
IF (c) "missing pattern in KB":
    [Author agent] writes a new pattern file to knowledge-base/patterns/
    Opens a PR with: the pattern, the test workflow, the failure context
    [Reviewer agent] checks: does the pattern violate any safety rules?
                              does it duplicate an existing pattern?
                              does the test workflow pass validation?
    IF approved: merged + deployed; new pattern embeddings regenerated
    IF rejected: PR commented with reason; human notified only if escalation threshold hit
    ↓
The next user with a similar request gets a workflow that includes
the newly-discovered pattern — without any human in the loop.
```

### Why this is the right move for chatv2

The OpsRadar customer base will use chatv2 to generate thousands of different workflows. Every failure is a learning opportunity that, today, is wasted. Autonomous engineering captures that learning **structurally**.

### Implementation primitives needed

| Component | Description |
|-----------|-------------|
| **Diagnose agent** | New module `src/modules/learning/diagnose-agent.ts`; consumes failure events + workflow JSON + KB context |
| **Author agent** | New module `src/modules/learning/author-agent.ts`; produces structured pattern files in markdown with YAML frontmatter |
| **Reviewer agent** | New module `src/modules/learning/reviewer-agent.ts`; rule-based + LLM-based safety checks |
| **PR pipeline** | A Git integration (GitHub API) that creates branches, opens PRs, comments, merges |
| **Approval thresholds** | Config flag: auto-merge if safety score > 0.9 AND no human pattern conflict; otherwise queue for human review |
| **Audit log** | Every autonomous action logged to `autonomous_actions` table — who proposed (agent name + model + version), who reviewed, what merged, what shipped |
| **Kill switch** | One env var (`AUTONOMOUS_LEARNING_ENABLED`) that turns the entire loop off |

### What this is NOT

- Not "AI writes production code that runs the chat pipeline" — that's too risky.
- Not "AI deploys without review" — there's always an automated reviewer + a human escalation path.
- Not "AI edits the chatv2 source code" — only the KB and the pattern library are autonomous-editable.

The boundary is clear: **autonomous engineering acts on the knowledge layer, not the kernel.**

---

# Loop 2 — Diorization

## The YC framing

> "You cannot simply pump in 100,000 hours of recordings into an AI context window; it's too much data. To make a company 'legible,' the raw data (Slack, emails, recorded meetings) must be diorized — categorised and synthesised into 'breadcrumbs' or structured summaries. YC proved this by taking 2,000 hours of recent office hour recordings and 'one-shotting' a 150-page user manual in a single weekend. This manual is now a 'living brain' that updates every month, comparing new advice against old and discarding what is no longer relevant."

## What this looks like for OpsRadar's agency customers

Every agency owner's most valuable knowledge is locked in:
- 4 years of Slack conversations
- 1,000+ client emails per month
- Recorded sales calls + delivery kickoffs
- Notion docs from past employees who left
- Spreadsheets of past project pricing

A fractional COO would spend 6-12 months understanding all of this. chatv2 should do it in a weekend.

## The diorization pipeline

```
Raw Source                          Diorization                       Living Brain
─────────                          ────────────                       ────────────
Slack export (zip)        →    Per-channel chunking          →    "Client X complained 4 times
Gmail export (mbox)       →    Conversation threading        →     about response time in March;
Meeting recordings        →    Speaker diarization +              followed by margin drop of 12%"
Notion export             →    summary per meeting
Past invoices             →    Structured extraction         →    "Average overrun on social-only
Past project briefs       →    Pattern matching across deals      retainers is 23%; pure paid media
                                                                    runs to budget 89% of the time"
                          ↓
                   [Embedding model]
                          ↓
                   MySQL VECTOR + structured summary cards
                          ↓
                   [Monthly synthesis job]
                          ↓
                   Discards stale advice (e.g., 2023 LinkedIn Ads strategy)
                   Promotes patterns that recurred in last 90 days
                          ↓
                   The agency's "living brain" — queryable by the COO agent
```

### What gets stored where

| Layer | Content | Retention |
|-------|---------|-----------|
| **Raw archive** | Original Slack/email/meeting files — preserved as markdown, never modified | Forever |
| **Breadcrumbs** | One-paragraph synthesised summaries per conversation/thread/meeting | Forever |
| **Pattern cards** | Recurring patterns extracted across breadcrumbs (e.g., "Client X has a pattern of expanding scope in Q4") | Refreshed monthly; old versions archived |
| **Living brief** | Current 5-10 page agency context the COO agent always has loaded | Refreshed monthly |

### Why this matters for the YC pitch

This is what makes OpsRadar fundamentally different from a generic agency PSA tool:

- Productive/Scoro/Kantata store what an agency **does** (projects, hours, invoices).
- OpsRadar stores what an agency **knows** (patterns, context, lessons, history).

That's the Company Brain. That's YC RFS #4.

### Implementation primitives needed

| Component | Description |
|-----------|-------------|
| **Ingestion adapters** | One per source: `src/modules/ingestion/slack.ts`, `gmail.ts`, `notion.ts`, `zoom-transcript.ts` |
| **Diorization service** | `src/modules/diorization/synthesizer.ts` — LLM-based summarisation with deduplication |
| **Pattern detector** | `src/modules/diorization/pattern-detector.ts` — looks for recurring themes across breadcrumbs |
| **Monthly refresh job** | Cron that re-runs synthesis on the last 90 days; discards stale guidance |
| **Brain API** | `GET /brain/:user_id/living-brief` returns the agency's current state-of-knowledge |

### The hard part

Privacy + permissions. Every ingestion source has its own ACL model. Slack DMs ≠ public channels. Email has BCC. Recordings have unconsenting third parties. Diorization must respect source-level permissions when serving retrieval.

**Decision rule:** if a fact can only be derived from a private DM that contains a third party who didn't consent to recording, it does NOT enter the agency brain. Even if it would be useful.

---

# Loop 3 — Disposable Software, Permanent Data

## The YC framing

> "Most internal dashboards and operations software should be treated as entirely disposable. If a new model comes out in two months that is significantly smarter, you should not 'update' your old software — you should throw it away and regenerate a better version from scratch using your original instructions. While code is temporary, data is permanent. The recommendation is to 'preciously store' every raw interaction because that raw data is the 'domain knowledge' that the AI uses to regenerate your software and intelligence."

## What this looks like in chatv2

### The pattern

```
User: "Build me a dashboard that shows this month's client margin"
    ↓
chatv2 generates the dashboard JSON/code → deploys it
    ↓
(2 months pass; Claude Opus 5 ships)
    ↓
chatv2 detects: this user's dashboard is from prompt-version-2.1
    ↓
Re-generates the same dashboard using the same prompt + the new model
    ↓
Diffs the output: "The new version adds drill-down by service line"
    ↓
Offers the user: "Your margin dashboard has a smarter version. Replace? [Yes/No/Compare]"
    ↓
If accepted: old version archived; new version deployed.
The user's PROMPTS and DATA are preserved; the GENERATED CODE is replaced.
```

### What's preserved (forever)

- Every user prompt (`chat_messages` table — already exists)
- Every workflow JSON ever deployed (`workflows` table with full version history)
- Every AI interaction (`ai_interactions` table — already exists, migration 010)
- Every raw event ingested (`workflow_events` table — already exists)
- The diorized breadcrumbs (Loop 2)

### What's disposable

- Generated dashboard UIs (regenerate from prompt + data)
- Workflow node configurations (re-derive from intent + current n8n version)
- Pattern files in the KB (regenerate from breadcrumbs)
- Even chatv2's own system prompts (preserved as a prompt-versioned asset, regenerate from a meta-prompt that describes what the system should do)

### Why this matters

Today, chatv2's value compounds linearly with engineering effort. With this loop, **chatv2's value compounds with model progress** — every Claude/GPT release auto-upgrades every customer's tools without any engineer touching the code.

### Implementation primitives needed

| Component | Description |
|-----------|-------------|
| **Prompt versioning** | All system prompts stored in `system_prompts` table with semver-style versions; never inline strings in code |
| **Model version tracking** | Every artifact (workflow, dashboard, pattern) tagged with `generated_by_model + generated_by_prompt_version` |
| **Regeneration scheduler** | When a new model is set as default, queue regeneration jobs for affected artifacts (with cost budget cap) |
| **Diff + offer flow** | Compare old vs new; surface user-visible diffs (added nodes, changed thresholds); offer one-click swap |
| **Rollback** | Any swap is one click reversible because the old artifact is archived, not deleted |

### The architectural rule

> Data is sacred. Code is liquid. The customer paid for the data; the code is whatever shape best serves the data today.

---

# Loop 4 — Token-Maxing Culture

## The YC framing

> "Companies are now reaching demo days with 5x more revenue per employee than just 18 months ago. Leadership is encouraged to identify who in the organisation is 'token maxing' — effectively leveraging AI tokens to scale their output. Middle management is viewed as a coordination problem that AI can solve. This leaves only Individual Contributors (ICs) who build/operate and Directly Responsible Individuals (DRIs) who own specific outcomes."

## What this looks like for OpsRadar customers

Most agencies measure success by:
- Headcount
- Hours billed
- Number of clients

AI-native agencies will measure success by:
- Revenue per FTE
- Tokens per delivered outcome (the new "cost per unit produced")
- DRI:IC ratio (low = healthy, high = bureaucracy creep)
- Time from prompt-to-deployed-workflow (the chatv2 north-star metric)

OpsRadar should expose these metrics as first-class dashboard widgets — they're what the next generation of agency operators will be hired against.

## What this looks like for chatv2 itself

| Metric | Why it matters | Where to surface |
|--------|---------------|------------------|
| **Tokens per generated workflow** | Cost per unit of value produced | Per-user analytics |
| **Cost per repair iteration** | Tells you if Priority 1's repair loop is paying off or burning money | Pipeline events table |
| **Revenue per token** ($ collected / tokens consumed) | The single highest-signal economic metric | CFO dashboard for OpsRadar HQ |
| **Time to first successful deployment** (per user signup) | Activation metric | Onboarding funnel |
| **% of generations that needed zero repair** | Quality north star | Weekly board metric |
| **Patterns auto-merged by autonomous engineering** | Loop 1 health | Engineering dashboard |
| **Diorization recall** (% of brain queries that hit useful breadcrumbs) | Loop 2 health | KB dashboard |

### Implementation primitives needed

| Component | Description |
|-----------|-------------|
| **Cost-per-action tracker** | Every AI call writes `cost_usd` to `ai_interactions` (currently logs tokens but not cost) |
| **Outcome attribution** | Connect each AI call to the workflow/feature it produced (already partial via `chat_session_id`) |
| **Customer-facing metrics export** | API endpoint that lets OpsRadar customers see their own revenue-per-token math |
| **Cost alerts** | Per-user threshold breach (e.g., "$50 of AI in one day") triggers a Slack notification + soft rate-limit |

---

# Loop 5 — Human at the Edge

## The YC framing

> "The Company Brain handles the logic, data, and routine coordination, while humans are pushed to the 'edge' where intelligence meets the physical and emotional world. Humans are reserved for high-stakes, high-emotion moments such as co-founder disputes or complex ethical considerations. Humans handle novel situations where the AI has no recorded pattern to follow, as well as high-touch sales where a physical human presence is still expected."

## What this looks like in chatv2's HITL gates

Every action in chatv2 falls into one of three buckets:

| Bucket | Examples | Human role |
|--------|----------|------------|
| **Routine** | Generate a workflow that matches a known pattern; deploy a validated workflow; refresh embeddings | Zero — fully autonomous |
| **Novel** | Generate a workflow with no matching pattern in the KB; encounter a new n8n node type | AI tries; if confidence < 0.7 OR no matching pattern, escalate to human |
| **High-stakes** | Workflow touches payment infrastructure; touches > $X of value; involves PII deletion; first-time deployment for a new customer | Always human; AI prepares but does not act |

### Codifying the escalation rules

```typescript
// src/lib/escalation-rules.ts
export const ESCALATION_RULES = {
  AUTO: {
    confidence_threshold: 0.85,
    must_match_pattern: true,
    max_workflow_value_usd: 1000,
  },
  REVIEW_REQUIRED: {
    confidence_threshold: 0.7,
    no_pattern_match_allowed: true,
    max_workflow_value_usd: 10000,
  },
  HUMAN_ONLY: {
    touches_payments: true,
    touches_pii_deletion: true,
    first_customer_deployment: true,
    max_workflow_value_usd: Infinity,
  },
};
```

### Why the rules go in code

If escalation thresholds are in config or prompts, they drift. If they're in versioned typed code, they're enforceable and auditable. Every escalation decision writes a row to `escalation_log` with the rule that fired.

### Human-edge work for OpsRadar HQ itself

- **First customer deployment** for any new customer: founder personally walks through the dashboard
- **Pricing exceptions**: AI never approves discounts; always escalates to founder
- **Co-founder/team conflicts** at customer agencies: COO agent does not give advice on people problems; surfaces "this might need a human conversation"
- **High-touch enterprise sales** (>$3K MRR deals): founder-led, not AI-prepared
- **Strategic positioning calls** (e.g., "should we add a new vertical"): humans only

---

# How the five loops compose

```
                    ┌─────────────────────────────────────┐
                    │     OPSRADAR CUSTOMER (Agency)      │
                    └──────────────────┬──────────────────┘
                                       │
                       interacts → chatv2 → emits → learns
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
       ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
       │   LOOP 1     │         │   LOOP 2     │         │   LOOP 5     │
       │ Autonomous   │         │ Diorization  │         │ Human Edge   │
       │ Engineering  │         │  pipeline    │         │  escalation  │
       └──────┬───────┘         └──────┬───────┘         └──────┬───────┘
              │                        │                        │
              ▼                        ▼                        ▼
       ┌────────────────────────────────────────────────────────┐
       │              LIVING BRAIN (per-tenant)                 │
       │  Patterns + Breadcrumbs + Living brief + Outcomes      │
       │     (LOOP 3: data preserved, code regenerated)         │
       └────────────────────┬───────────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │     LOOP 4       │
                  │  Token-maxing    │
                  │  measurement     │
                  └──────────────────┘
                            │
                            ▼
                  Customer renews; OpsRadar margin compounds;
                  agency owner's revenue/employee triples
```

The loops aren't a sequence — they're a flywheel. Loop 1's new patterns improve Loop 2's brain. Loop 2's brain improves Loop 5's escalation accuracy. Loop 5's human decisions inform Loop 4's metrics. Loop 4's cost data informs Loop 3's regeneration economics. Loop 3's preserved data makes Loop 1 possible.

---

# What this changes about OpsRadar's product story

### Before this blueprint
OpsRadar = an AI COO that watches your agency's metrics and tells you what to do.

### After this blueprint
OpsRadar = the **system that turns your agency into an AI-native company**. The COO is just one of the loops. The deeper product is the company brain that grows every day from your conversations, your failures, your wins — and regenerates itself as models improve.

### The new one-sentence pitch

> OpsRadar makes your agency AI-native — your company brain captures every conversation and outcome, your tools regenerate themselves as models improve, and your team's revenue per employee triples while you stay focused on the high-stakes calls only humans can make.

This is the YC RFS #4 (Company Brain) + #15 (AI OS) pitch in a single sentence.

---

# What goes on the roadmap (impact-ordered)

| Order | Loop | Ship | Why this order |
|-------|------|------|---------------|
| 1 | Loop 2 (Diorization) | Slack + email ingestion → embeddings → brain queries | Without the brain, no other loop has substrate |
| 2 | Loop 5 (Human Edge) | Escalation rules in code + escalation_log table | Cheap to ship; safety-critical foundation for Loop 1 |
| 3 | Loop 4 (Token-Maxing) | Cost-per-action + revenue-per-token dashboards | Tells you whether to invest more in Loops 1/3 |
| 4 | Loop 3 (Disposable Software) | Prompt versioning + regeneration scheduler | Pays off once you have 1+ model upgrade cycle |
| 5 | Loop 1 (Autonomous Engineering) | Diagnose → author → reviewer agents + PR pipeline | Highest reward, highest risk; ship last when guardrails proven |

This is a 6-12 month roadmap. The technical primitives for each loop are detailed in [`architecture-2026.md`](./architecture-2026.md) — that doc is the engineering plan; this doc is the strategic north star.

---

# What this blueprint deliberately rejects

- **No "AI replaces humans" pitch.** The whole loop architecture is built around humans at the edge.
- **No "fully autonomous agency" claim.** Loop 5 explicitly preserves human-only decisions.
- **No "scrape everything customer touches" data grab.** Loop 2 respects source-level permissions including third-party consent.
- **No "lock-in by depth" model.** Loop 3 says data is exportable forever. The customer can take their brain with them.
- **No "raise headcount to scale" path.** Loop 4 measures the opposite.

These rejections are themselves positioning. They differentiate OpsRadar from horizontal AI products that will eventually face the trust/regulatory wall.

---

# Sources

This blueprint synthesises:

- YC "How to build an AI-native company" (May 2026) — the five concepts (autonomous engineering, diorization, disposable software, token-maxing, human edge)
- [arXiv 2406.01297 — Self-Correction of LLMs Survey](https://arxiv.org/pdf/2406.01297) — basis for Loop 1's diagnose-author-reviewer pattern
- [Awssome — Multi-Tenant SaaS Encryption FAQs](https://www.awssome.io/blog/multi-tenant-saas-security-encryption-faqs) — envelope encryption for Loop 2's tenant brain isolation
- [Laminar — Top 6 Agent Observability Platforms 2026](https://laminar.sh/article/2026-04-23-top-6-agent-observability-platforms) — Loop 4 cost tracking + drift detection
- [n8n Blog — Best practices for deploying AI agents](https://blog.n8n.io/best-practices-for-deploying-ai-agents-in-production/) — Loop 1's deployment + rollback boundaries
- Companion technical spec: [`architecture-2026.md`](./architecture-2026.md)
- OpsRadar main-branch references: `docs/yc/research-addendum.md`, `docs/yc/build-architecture.md`, `docs/strategy/path-a-strategy-2026.md`
