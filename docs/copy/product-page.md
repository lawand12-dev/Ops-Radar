# Product Page Copy v4 — Brain-as-asset framing

*Owner: Lawand · Date: 2026-05-26 (revised same day) · Replaces: product-page.md v3*
*Hero shift v3 → v4: brain-led ("the asset you exit on"), workforce as the engine that builds it.*
*Control shift v3 → v4: earned autonomy throughout, no more "every action approved, always."*
*Source: `docs/positioning/identity.md` + `docs/positioning/inversions.md`*
*Route: `/product`*

---

## Meta

- **Title:** `Product — OpsRadar AI Operating System`
- **Description (155 chars):** `AI employees + company brain in your Notion + every integration you use. One workspace replaces 10 AI tools. Apprentice Mode learns from every "no".`

---

## Hero

**Eyebrow:** `THE PRODUCT`

**H1:** `Your AI workforce builds the company brain you exit on.`

**Subhead (38 words):**
`28 named specialists run on your stack. They write what they learn into a versioned brain mirrored to your Notion. Documented agencies sell at 8-12× EBITDA — that's the asset. Approval-gated by default, earned-autonomy as trust accumulates.`

**CTA:** `Start free trial` · `See pricing →`

---

## Section 1 — The two pillars (in depth)

**Section eyebrow:** `THE TWO ARTIFACTS`

### Pillar A: The company brain (the asset)

**H2:** `A second brain for your business — written by your AI workforce, owned by you forever.`

**Body (62 words):**
`Every AI employee writes findings to a shared, versioned brain — Pattern Cards (what's normal for client X), Decision Log (what we decided and why), Risk Register (what could hurt us next quarter), Real P&L, KPI Snapshots, Client Profiles. Every entry is signed by the agent that wrote it, with a timestamp and a commit message. The whole brain is mirrored to your Notion workspace.`

**Subsection: "Why the brain is the asset (not the workforce)"**

`Documented agencies sell at 8-12× EBITDA. Undocumented agencies sell at 5-9×. For a $2M-EBITDA agency, that's $6M of extra exit value. The agents commoditize — OpenAI Agents SDK lets any competent dev rebuild "28 agents" in a sprint. What they CAN'T rebuild is two years of your accumulated, signed-author, git-versioned brain. That's the moat. That's the artifact you sell when you exit.`

**Subsection: "Where the brain lives"**

`At OpsRadar: 3-table versioned Postgres (documents, immutable versions, commits). Curated paths get pgvector embeddings so the COO can semantic-search across them. Everything else stays markdown-only.`

`In your Notion: every brain write is mirrored to a corresponding Notion page in your workspace. You can read it on Notion mobile at 3 AM with no OpsRadar login.`

`At /dashboard/brain/download: the full versioned brain, exportable as a markdown zip, any time, on any tier.`

### Pillar B: The AI workforce (the engine that builds it)

**H2:** `28 named specialists. Hire more in plain English.`

**Body (72 words):**
`Every OpsRadar customer starts with 28 named built-in AI employees the moment they sign in — 💰 Riley (Revenue Analyst), 📨 Cole (Collections Lead), 📐 Scott (Scope Watchdog), 🚚 Devon (Delivery Manager), 📰 Brian (Daily Briefer), 📊 Penny (Profitability Analyst), 👥 Tia (Team Lead), 📈 Grace (Growth Strategist), 🔁 Renee (Renewals Lead), 🧰 Sam (Stack Auditor), 🧐 Evan (Evaluator), plus 17 toolkit specialists — all shipped with senior-COO operator judgment baked into their prompts. Hire custom ones in plain English: "I want a Bookkeeper named Sarah."`

**Subsection: "How a custom hire works"**

`1. Open /dashboard/hire and describe the role. Plain English.`
`2. We compile the spec — name, role, schedule, scoped tools, system prompt, first task. You read it as a card.`
`3. Click Hire. Sarah starts running tomorrow at 8 AM.`
`4. Sarah has her own chat page at /dashboard/employees/sarah. Talk to her like a teammate. She remembers.`

**Subsection: "Built on the senior-COO playbook"**

`The 28 built-in agents don't just call APIs. Their prompts contain operator judgment distilled from agency-operator publications — signals + thresholds, decision trees, verbatim conversation scripts. Cole (Collections Lead) doesn't just say "this invoice is overdue." He says: at $X days late, send Y; at $Z days late, queue a margin-alert action with this draft email. Penny (Profitability Analyst) flags clients trending toward unprofitable in week 2, not at quarterly review.`

**Subsection: "What the brain knows about your business after 30 days"**

- `Every Stripe transaction Riley has looked at, with the margin context she derived`
- `Every overdue invoice and Cole's notes on the customer payment pattern`
- `Every scope risk Scott flagged, with the Harvest hours that triggered it`
- `Every decision YOU made in the COO chat — recorded as a Decision Log entry, signed by you`
- `Every rejection you gave an AI employee — recorded as a Pattern Card and applied permanently (see: Apprentice Mode)`

---

## Section 2 — Cross-tool synthesis (the COO chat)

**Section eyebrow:** `ASK ABOUT YOUR BUSINESS`

**H2:** `One COO. Seventeen specialist agents underneath. The one answer that matters.`

**Body (60 words):**
`When you ask the COO chat "which clients should I worry about?", it doesn't make up an answer. It reads what Riley (Revenue), Penny (Profitability), and Cole (Collections) have written to the brain in the last 30 days. Synthesizes across them. Cites the entries by author + date. Then answers — with a clickable trail back to the source brain entries.`

**Subsection: "The orchestrator-worker pattern"**

`Tool specialists (17) watch one app each — Stripe Specialist, HubSpot Specialist, Harvest Specialist, ClickUp Specialist, and so on. They go deep on their toolkit.`

`Domain agents (10) read what the tool agents wrote — Revenue, Collections, Scope, Delivery, Briefing — and synthesize across multiple tools. The Revenue Agent reads what Stripe + HubSpot + QuickBooks Agents wrote and produces the actual revenue health summary.`

`The COO chat reads the domain agents and writes the daily briefing. You read one thing, not seventeen.`

---

## Section 3 — The three differentiators

**Section eyebrow:** `WHY OPSRADAR IS NOT A CHATBOT`

### Differentiator 1 — Apprentice Mode

**H3:** `Your AI workforce gets smarter every time you say "no."`

**Body (45 words):**
`Every time you reject an action, OpsRadar derives a generalizable rule from your reason and writes it to that employee's permanent learned-rules brain prefix. The next time Sarah is about to do the thing you didn't want, she reads the rule and doesn't.`

**Concrete example (verbatim):**
`Day 1: Sarah drafts a follow-up email to an international Stripe customer. You reject it: "We don't auto-follow-up international customers — they're on a different cadence."`
`Day 2 onwards: Sarah never drafts a follow-up to an international Stripe customer again. The rule is in her brain, signed by you, dated, reversible if you ever change your mind.`

### Differentiator 2 — Approval-history personalization

**H3:** `After 30 approvals it drafts like you. After 100, your team can't tell the difference.`

**Body (42 words):**
`Every approve / reject / edit you make on an action feeds into every agent's next prompt as a "your past decisions" block. The system literally reads your decision history before drafting anything for you. The voice converges on yours.`

### Differentiator 3 — Cross-agent synthesis

**H3:** `One COO that reads 17 specialist agents and tells you the one thing that matters today.`

**Body (38 words):**
`You don't get 10 separate AI reports to read. You get one daily briefing, synthesized across every agent's findings, ranked by what's actually at stake. The other 9 reports stay one click away if you want to drill in.`

---

## Section 4 — Three more durable moats (the credibility receipts)

**Section eyebrow:** `WHAT'S UNDER THE HOOD`

### Receipt 1 — Versioned commit-graph brain (git-style)

`Every brain entry has an immutable version row. Every commit has a message and an author (the agent that wrote it). You can diff what changed between two versions. You can roll back any agent edit. It's the only AI-knowledge-base architecture in the category that gives you git-style operations on your company's memory.`

### Receipt 2 — Agent-as-author attribution

`Every fact in your brain is signed by the agent that wrote it, the timestamp, and the agent_run_id that produced it. When your COO chat tells you something, you can click through to see which agent learned it, when, and from what data.`

### Receipt 3 — Earned autonomy (risk-tiered + confidence-graduated)

`Three autonomy tiers, set per tool. High-risk actions (firing a client, sending invoices, mass email) stay Ask forever. Medium-risk actions (drafting replies, scheduling meetings) auto-fire with notification once they've earned 30+ approvals at >90% rate. Low-risk actions (Notion writes, internal logs) fire silently. The agents earn their autonomy. They don't get it on day one. You can always override the tier per tool: Ask, Auto, Off.`

---

## Section 5 — Customer-built automations (Lindy-style)

**Section eyebrow:** `WHEN X HAPPENS, DO Y`

**H2:** `Automations the way you'd describe them out loud.`

**Body (52 words):**
`"When a HubSpot deal moves to closed-won, post in #ops Slack and create a Notion kickoff page" — that's an automation. You describe it to the COO chat in plain English. We compile it to a typed spec, show it to you as a card, you click Install. It runs forever.`

**Receipts:**
- `Built on Composio Triggers — 20+ webhook events across HubSpot, Stripe, ClickUp, Gmail, Calendly, and more`
- `Executed durably on Trigger.dev — retries 5 times with exponential backoff if something fails`
- `Every action still routes through the approval gate by default — automation doesn't mean autonomy`

---

## Section 6 — Org chart + delegation (CP-37, shipped)

**Section eyebrow:** `YOUR AI WORKFORCE HAS HIERARCHY`

**H2:** `An org chart your AI workforce actually follows.`

**Body (48 words):**
`Custom AI employees can have managers and direct reports. When Marcus the Account Manager needs a Stripe lookup, he delegates to Sarah the Bookkeeper — pauses his run, waits for her to finish, reads her summary, and continues. Real hierarchy, real delegation, real durable wait.`

**Receipts:**
- `Built on Trigger.dev's tasks.triggerAndWait pattern — the manager pauses, the report runs, the manager resumes with the result`
- `Cycle-detection prevents infinite loops (managers can't report up the chain to themselves)`
- `Visible at /dashboard/employees as an indented org tree`

---

## Section 7 — Tech stack (the receipts for engineers reading)

**Section eyebrow:** `STACK`

**H2:** `Built on what 2026 actually ships.`

**Stack list:**
- **Frontend:** Next.js 16 · React 19 · Tailwind v4 · shadcn/Radix · Framer Motion
- **Backend:** Vercel Fluid Compute · Vercel AI SDK v6 · Vercel AI Gateway
- **Database:** Supabase Postgres · pgvector · row-level security · multi-tenant
- **Durable workflows:** Trigger.dev v3 (per-employee execution, delegation, automation runner)
- **Scheduled cron:** Vercel Cron (28 built-in agents)
- **AI models:** OpenAI GPT-5.5 / 5.4 / 4o / 4.1-nano · text-embedding-3-small · Anthropic Claude (scaffolded)
- **Tool brokerage:** Composio (25 live integrations, growing to 500+)
- **Web search:** Tavily
- **Knowledge layer:** Anthropic Agent Skills (46 SKILL.md files across 9 domains)
- **Observability:** Sentry · Statsig · Langfuse
- **Rate limiting + cache:** Upstash Redis
- **Email:** Resend
- **MCP server:** OpsRadar's own brain is queryable as MCP by external agents

---

## Final CTA

**H2:** `One workspace. Replaces 10 AI tools. Starts at $99.`
**Body (24 words):** `Connect Stripe or HubSpot. Open the Hire chat. Describe your first AI employee. We do the rest. Two-week trial. No credit card.`

**Primary CTA:** `Start free trial`
**Secondary CTA:** `See pricing →`

---

## Brand-voice rules carried over from home.md

| Use | Avoid |
|---|---|
| AI Operating System, AI workforce, AI employee, company brain | AI COO as the *category* label, "assistant," "copilot," "platform" |
| Verbatim research citations | Made-up testimonials |
| Concrete mechanics ("Trigger.dev triggerAndWait," "pgvector HNSW") | Hand-wave technobabble |
| Approval gate / brain ownership as guarantees | "AI you can trust" |

## What changed from v2

- Old page led with "AI COO replacing fractional COO at 5%." That framing moves to home.md Section 5 as a use-case, not the lead.
- New lead: the two-pillar architecture (AI workforce + company brain), then the three demand-validated differentiators, then receipts (cross-synthesis, org chart, automations).
- Tech stack section added — engineers reading the product page get the same answer as YC's tech-stack question.
- Section 6 (org chart) is brand new — CP-37 was shipped after v2 was written.

## What changed in v4 (2026-05-26 inversions update)

- Hero rewritten to lead with the brain-as-asset framing: `Your AI workforce builds the company brain you exit on.`
- Pillar order flipped — brain first (the asset), workforce second (the engine).
- Brain pillar gained the "why it's the asset" subsection with the 8-12× EBITDA agency-exit math anchor.
- Workforce pillar names the 11 named domain agents (Riley, Cole, Scott, Devon, Brian, Penny, Tia, Grace, Renee, Sam, Evan) — the marketing harvest of `employee-metadata.ts`.
- COO chat synthesis section uses named agents (Riley/Penny/Cole) instead of generic role labels.
- Receipt 3 (autonomy) rewrites from "Per-tool autonomy: Ask / Auto / Off" → "Earned autonomy: risk-tiered + confidence-graduated. Agents earn autonomy after 30+ approvals at >90% rate."
- Senior-COO playbook subsection updates examples to reference Cole + Penny by name.
