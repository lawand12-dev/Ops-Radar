# OpsRadar Identity — Triangulated Verdict (2026-05-25)

> **Status**: working positioning document. Replaces fragments scattered across
> `path-a-strategy.md`, `moats.md`, and the marketing site copy. Built from
> 13 research reports run on 2026-05-25 — see `docs/research/2026-05-25-*.md`.
> Re-open this doc before any positioning, pricing, ICP, or YC application
> change.

---

## The two-pillar identity (locked)

OpsRadar is **two products fused into one purchase**:

1. **AI employees** — named, persistent, scheduled, scoped, hireable AI teammates that run on the customer's existing SaaS stack. Today there are 28 built-in (Revenue, Collections, Scope, etc.) + a chat-driven flow to hire custom ones (Sarah the Bookkeeper, Marcus the SDR, etc.).
2. **A company brain that knows everything** — a versioned markdown wiki, owned by the customer, mirrored to their Notion, exportable as a zip. Every employee writes findings into it. Every employee reads from it. Ask the brain any question, it answers because it has read across every tool + every agent finding + every decision.

These two pillars are co-equal. The pitch isn't "AI Chief of Staff." The pitch is:

> **Hire your AI workforce. Build a company brain you own forever. Fire us tomorrow — you keep both.**

Two artifacts. Two moats. One promise.

---

## Why this identity wins (evidence triangulation)

### The brain pillar maps to YC RFS #4 directly

Tom Blomfield (YC) named the "company brain" as one of YC's S26 Requests For Startups: a system that pulls knowledge from Slack/email/tickets/heads, structures it, keeps it current, turns it into an executable skills file for agents. (`docs/research/2026-05-25-company-brain-pattern.md` §6, citing the [YC RFS](https://www.ycombinator.com/rfs)).

Five independent builders — **Karpathy + Garry Tan (GBrain) + Hannah Stulberg + Ramp's Glass + YC RFS #4** — converged on the same five-pattern stack:

1. Markdown in git as substrate
2. RESOLVER.md routing
3. Skills as version-controlled units
4. Write-back discipline (answers refile to the wiki)
5. Context-compute separation (substrate stable; model swappable)

OpsRadar has been building exactly this since CP-25/27/28. **The brain pattern doesn't need a redesign.**

### The employees pillar maps to Bessemer's "Year of the Agent Employee"

Bessemer Venture Partners' 2026 State of AI thesis frames the market shift:

> *"Vertical AI represents a fundamentally larger opportunity than vertical SaaS ever did, because it taps directly into the labor line of a P&L (~13% of US GDP) rather than IT (~1%)."*

Their proof points are all "Agent Employee"-shaped: Sierra ($150M ARR, $15.8B), Decagon ($35M ARR, $4.5B), Cresta ($100M ARR), Harvey ($11B, $190M ARR). (`docs/research/2026-05-25-investor-2026-theses.md`).

OpsRadar's named-hireable-AI-employee surface (CP-34/CP-38) is the literal instantiation of Bessemer's "Agent Employee" thesis.

### Both pillars together neutralize the top 5 customer pains

From the competitor-review research (`docs/research/2026-05-25-competitor-pain-points.md`):

| Pain (ranked by mention frequency) | OpsRadar answer |
|---|---|
| Unpredictable credit/usage pricing (Lindy: $50 quietly becomes $100+) | Flat tier + ONE visible meter ($0.05/approved action over cap) — the only thing that bills above the floor is something the customer literally clicked Approve on |
| Hallucinations / confidently wrong outputs | Brain stores **citable** facts; agents must reference brain paths in queue_action; approval gate makes consequence of any hallucination zero |
| Agents that can only read, not act | Composio gives writes across 25→500+ tools; approval gate makes writes safe |
| Missing / shallow integrations | Composio breadth is our durable moat (Lindy bolted on Pipedream to fight this — we have it natively from day one) |
| Autonomous agents go off the rails (Devin's "spent days pursuing impossible solutions") | Per-tool autonomy (Ask/Auto/Off) + approval gate + step caps |

**Every top-5 pain has a structural OpsRadar answer.** Not a feature claim — a structural answer.

---

## The hard truth: vertical wins, but the brain travels

The horizontal-comps research (`docs/research/2026-05-25-horizontal-workforce-comps.md`) was sobering:

- **Only ONE horizontal "AI workforce + brain" company at $10M+ ARR exists today: Glean ($200M ARR).** And Glean charges $60K floor + 100-seat minimum — enterprise-only.
- **Every $10M+ "AI workforce" winner is vertical**: Harvey (legal, $190M ARR), Sierra (CX, $150M), Decagon (CX, $35M), Cresta (CX, $100M), Abridge (clinical, $5.3B val).
- **Lindy is the cautionary tale**: explicitly horizontal SMB "AI employees" — stalled at $5M ARR after $50M raised and 3 years. Founder publicly repositioned to escape it.
- **YC funded vertical in W26**: 41.5% agent infra, dominant shape "AI [role] for [vertical]" or "Full-stack AI [profession]" (`docs/research/2026-05-25-yc-acceptance-pattern.md`).

The investor-thesis report was unambiguous (`docs/research/2026-05-25-investor-2026-theses.md`):

> Bessemer: "highly specialized vertical experts, NOT generalists."
> a16z Phase 3: "domain-specific interfaces, data, and integrations."
> Blomfield: "build [the company brain] vertically first."

**Empirical conclusion**: horizontal-at-SMB has a 3-8% probability of reaching $10M ARR in 18 months (`docs/research/2026-05-25-horizontal-workforce-comps.md` Q4). Vertical-at-SMB has a 30-50% probability based on the funded comparables.

This is the hardest finding to absorb because it contradicts the "Composio breadth" instinct. The honest read: **Composio breadth is the moat, not the wedge.** You wedge in with one vertical, you keep customers forever because the brain travels with them as they expand.

---

## The shape of the play (locked)

### Positioning sentence

> **OpsRadar: hire your AI workforce, build a company brain you own forever.**

That's the homepage hero. Two pillars in 12 words. No "Chief of Staff" (BOND owns that). No "for [vertical]" (because the brain is universal even though the wedge isn't).

### ICP — vertical wedge (open question)

Two candidates from the research, both defensible:

**Option A — Marketing & creative agencies, $2-10M revenue, retainer-shaped.**
- **Pros**: zero education tax (they already buy AI tools), pre-built integrations (every Composio tool we wire matches their stack), fractional-COO spend is $3-10K/mo (confirmed Upwork demand), substitution-readiness highest of any vertical (`docs/research/2026-05-25-fractional-coo-labor-gap.md`).
- **Cons**: smaller ceiling, no $1B+ pure-play AI-COO-for-agencies comp exists (signal of weak demand at scale, or unattacked wedge — unclear).
- **YC fit**: matches the "AI [role] for [vertical]" template; Rankai (X25) is closest precedent.

**Option B — Home services owner-operators, 5-50 employees (HVAC, plumbing, electrical).**
- **Pros**: massive paid-demand precedents (Avoca AI $1B, ServiceTitan $9B, EliseAI $2.2B), 10x bigger TAM, highest pain density (79% are solo owner-operators), brain pillar lands hardest here (they have ZERO docs of their business today) (`docs/research/2026-05-25-vertical-intent-ranking.md`).
- **Cons**: requires rewriting CP-21 senior-COO playbook for HVAC operator judgment, new integrations (ServiceTitan, Housecall Pro, CallRail), high education tax (plumbers don't speak SaaS).

**Recommendation**: **agencies as the 90-day wedge, home services as the 18-month expansion.** Agencies get us to 10 paying customers + 3 case studies fast (lowest education tax). Then port the architecture to home services for scale (biggest TAM + paid precedents).

For the YC application: **lead with home services** — it's the more impressive wedge to investors because the comparables are bigger. Use the agency cohort as traction proof.

### Pricing (research-locked)

From `docs/research/2026-05-25-horizontal-pricing.md`:

> Gartner 2025: 40% of enterprises abandon agentic AI due to unforeseen variable costs. Lindy's stall is credits, not horizontal positioning. Hybrid base + ONE visible meter wins.

| Tier | Price | Includes | Outcome meter |
|---|---|---|---|
| **Starter** | $99/mo | 1 seat, up to 5 integrations, 500 approved actions/mo, all 28 agents read-only + briefing | none |
| **Growth** | $499/mo | 5 seats, unlimited integrations, 5,000 approved actions/mo, custom employee hiring, automations | $0.05 per approved action over cap |
| **Pro** | $1,499/mo | 20 seats, 25,000 approved actions/mo, Notion brain provisioning, priority models | $0.05/action overage |
| **Fractional Operator** | $2,999/mo | multi-client white-label, unlimited seats, 100K actions pooled | $0.05/action overage |

**Three explicit pricing rules** (the anti-Lindy guardrails):

1. **NEVER meter AI tokens.** The customer never sees an OpenAI token line item. We absorb that cost inside the tier.
2. **NEVER use credits with premium-model multipliers.** No "this action burns 60 credits because it used GPT-5.4." One unit, one price.
3. **Outcome meter is opt-in, visible, and bounded by the approval gate.** The customer literally clicks Approve on every billable action. Three things have to align in the same moment. No mystery bill.

Current `/pricing` ($750/$1,500/$3,000) is **wrong in two directions**: floor is too high ($99 anchors against Make Core $10 and Zapier Pro Agent $33 — $750 prices us out of the SMB-mid sweet spot); ceiling is too low ($3,000 leaves money on the table for FO multi-client buyers). Update both.

### Product bets — next 90 days

Filtered through "what compounds the two pillars":

**Bet 1 — Make the two pillars visible on `/dashboard`.**
The dashboard today shows briefings + pending actions + KPIs + agent activity. It does NOT lead with "Your Workforce" + "Your Brain." That's the brand miss. Two top-of-page panels:
- **Your AI Workforce** — emoji + name of every active employee + live status (uses CP-36 Team Live widget)
- **Your Company Brain** — commit count this week + 3 most-recent insights + "Download zip" button (using existing brain download endpoint)

**Bet 2 — Customer-facing charter for every employee (CP-39, reframed).**
Every visible agent + every hired employee gets a public `CHARTER.md` the customer reads before turning them on. Anthropic Skills pattern (proven). Charter naming the role, responsibilities, allowed actions, escalation rules. **The trust signal BOND/Lindy/Notion don't have.** Architecture already designed (`docs/research/2026-05-25-agent-capability-declaration.md`); 10 charter files + loader is ~2 days of work.

**Bet 3 — The "$ saved this month" widget.**
Public-by-default on `/dashboard`. Totals: approved automations × estimated time saved + recovered AR (where measurable) + meetings booked. This is what 11x.ai faked. We make it real using `external_api_usage` + `agent_actions` already logged. The proof the outcome-pricing pitch isn't vapor.

### What to NOT build in the next 90 days

- A horizontal-only marketing rewrite. (Vertical wedge first; horizontal positioning at homepage.)
- Autonomous mode without approval. (11x's grave.)
- An agent marketplace. (Notion has 1M+; can't out-volume them.)
- More agents beyond 28. (Feature bloat, not a wedge.)
- pgvector retrieval on the brain. (Per the company-brain research: Karpathy's wiki is 400k words with no retrieval. The trigger is ~500 docs or 2M words. We're nowhere near it.)
- A second backend / workflow generator. (CP-15 settled this; reopening is regression.)

---

## The YC application paragraph (ready to use)

> *"OpsRadar gives every business an AI workforce and a company brain they own forever. We hire AI employees — Bookkeeper, SDR, Project Coordinator, Account Manager — that read every tool you connect through Composio (25+ today, growing toward Composio's full 500+ catalog), take action only with your approval, and write everything they learn into a versioned brain mirrored to your Notion. Fire us tomorrow, you still keep the brain. We're the anti-11x: control-first, labor-priced ($0.05 per approved action), wedge-in via marketing agencies in 2026 then expanding to home services on the proven Avoca/ServiceTitan paid-demand precedent. YC RFS #4 ('every company will need a company brain') matches our second pillar verbatim. Bessemer's 'Year of the Agent Employee' thesis matches our first."*

That paragraph triangulates: **Bessemer Agent Employee + YC RFS #4 + anti-11x positioning + concrete pricing model + named wedge + named expansion path + integration breadth as moat.** Every clause cites an evidence anchor from the research files.

---

## What's still open (honest)

1. **Agencies vs home services as Tier 1 wedge.** Both defensible. Decision should be made with founder gut + Iraq-based-founder constraints (sales motion you can actually run from Iraq + your network). Research can't answer this — only you can.
2. **Whether Notion Brain mirror should become OPTIONAL or REMAIN mandatory.** Today it's tightly coupled. Some customers may not want Notion. Worth exploring "brain in our Postgres only, no Notion" tier.
3. **Should the customer-visible "AI workforce" sidebar entry rename from `YOUR TEAM` → `YOUR WORKFORCE`?** Wording question; matters for marketing alignment.
4. **Does the homepage hero replace "Operator-grade AI ops" with "Hire your AI workforce. Build your company brain"?** That's a marketing-copy migration (~10 pages of /copy/*.md updates). Hold until ICP wedge is locked.

---

## Evidence trail

Every claim above traces to:

- `docs/research/2026-05-25-yc-acceptance-pattern.md`
- `docs/research/2026-05-25-competitor-pain-points.md`
- `docs/research/2026-05-25-investor-2026-theses.md`
- `docs/research/2026-05-25-revenue-momentum-signals.md`
- `docs/research/2026-05-25-vertical-intent-ranking.md`
- `docs/research/2026-05-25-fractional-coo-labor-gap.md`
- `docs/research/2026-05-25-pricing-deep-dive.md`
- `docs/research/2026-05-25-company-brain-pattern.md`
- `docs/research/2026-05-25-horizontal-pricing.md`
- `docs/research/2026-05-25-horizontal-workforce-comps.md`

Plus the architecture decisions in `docs/adr/0001-0008-*.md`.

Re-read those before reopening any conclusion in this doc.
