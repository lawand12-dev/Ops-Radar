# FAQ v4 — Earned-autonomy + brain-as-asset reframe

*Owner: Lawand · Date: 2026-05-26 (revised same day) · Replaces: faq.md v3*
*Route: `/faq`*
*v4 changes: Devin and 11x answers reframe around earned autonomy (not "every action approved, always"); added a new FAQ on brain-as-exit-value math; added FAQ on fractional COO multi-tenant motion.*

---

## Meta

- **Title:** `FAQ — OpsRadar`
- **Description (155 chars):** `Honest answers to the questions every AI ops customer asks. Pricing, lock-in, autonomy, security, hallucinations, vertical fit. No hand-waving.`

---

## Hero

**Eyebrow:** `FAQ`

**H1:** `The questions every customer asks. Honest answers.`

**Subhead:** `If a question isn't here, talk to the founder — 20 minutes, no slides.`

---

## Category 1: How is OpsRadar different from [X]?

### How is OpsRadar different from Lindy?

`Lindy is a no-code workflow builder where you chain AI steps together. It's powerful but it has three problems customers have publicly cited: credit pricing burns unpredictably, the workflows go autonomous without an approval layer, and there's no shared brain across your team's automations. OpsRadar is a workforce + a brain, not a workflow builder. We charge flat tiers with one outcome meter bounded by your approval. Every action approved by you. Every finding written to a brain that lives in your Notion.`

### How is OpsRadar different from Notion AI?

`Notion AI writes only inside Notion. We use Notion AS the brain, but our AI workforce writes to your Notion across 25 connected SaaS tools. The Revenue Agent reads Stripe live, makes a finding, and writes it to a Notion Pattern Card in your workspace. Notion AI can't do that — it has no Stripe API.`

### How is OpsRadar different from Zapier (or Zapier Central)?

`Zapier is plumbing. You build "when X happens in tool A, do Y in tool B." OpsRadar is an AI workforce — Sarah doesn't just connect Stripe to QuickBooks, she decides which charges to categorize where, learns from your corrections, and writes the reasoning to your brain. You can build automations in OpsRadar too, in plain English, but the workforce + brain is the headline.`

### How is OpsRadar different from BOND (Donna)?

`BOND is one chat for one person — the AI Chief of Staff. OpsRadar is a workforce: 28 built-in AI employees + custom hires + the brain that holds what they all know. BOND is going horizontal across executives; we wedge into one vertical at a time (marketing agencies first, home services next). Both pitches will end up serving different buyers.`

### How is OpsRadar different from Glean?

`Glean is enterprise AI search ($60K floor + 100-seat minimum). It reads your stack and answers questions. It can't take action and it's priced for Fortune 500. OpsRadar starts at $99/mo, takes action (with your approval), and hires you a workforce on top of the answering layer.`

### How is OpsRadar different from Devin (or any "autonomous AI agent")?

`Devin's most cited failure: it spent 6 hours pursuing a solution a human did in 36 minutes. That's the autonomous-from-day-one trap. OpsRadar runs on EARNED autonomy: high-risk actions (firing a client, sending invoices, mass email) stay Ask forever; medium-risk actions auto-fire only after you've approved them 30+ times at 90%+ rate; low-risk actions fire silently. Agents earn their autonomy. They don't get it for free.`

### How is OpsRadar different from 11x.ai?

`11x sold autonomous AI SDRs to anyone on day one, claimed $14M ARR (~$3M real), and hit 70-80% churn at 90 days because customers couldn't see what their AI had done. OpsRadar is the opposite architecture: the SDR you hire starts in Ask mode (you see every email before it sends), graduates to Auto only after earning your trust through 30+ approvals, and writes every outcome — approved, rejected, edited — to a brain you own. Our customer can't churn from "I don't know what my AI sent yesterday" because by structure they DO know.`

---

## Category 2: Pricing

### What counts as "an approved action"?

`Anything your AI workforce does on a connected tool: sending a Gmail draft, creating a Stripe invoice, updating a HubSpot deal, posting in Slack, creating a Notion page. Reads — fetching data, looking something up — never count. Only writes count. And only writes you clicked Approve on count toward your meter.`

### What if I never hit my action cap?

`Then you pay only the flat tier price. The outcome meter is opt-in upside on Pro+, not core pricing. Most agencies under 20 people stay within their tier cap forever.`

### Do you charge for AI tokens?

`Never. OpenAI tokens, Anthropic tokens, embedding tokens — all included in your tier. The 40% of customers Gartner says abandon agentic AI because of unforeseen variable costs? We made sure that's structurally impossible with us.`

### Do premium models cost more?

`No. We charge the same flat $0.05 per approved action whether your employee used GPT-5.5 or GPT-4.1-nano. The model is our choice, not your bill.`

### Can I downgrade or cancel?

`Yes, any time, end of month. No retention call. Click Settings → Billing → Switch plan. If you cancel, your workforce stops running, but your company brain stays in your Notion — it was always there, we just wrote to it. You can also download a full markdown zip of the brain at /dashboard/brain/download.`

### Is there a free trial?

`Yes. 14 days. No credit card. Full product — connect your tools, hire AI employees, the brain builds, the works.`

---

## Category 3: Security + privacy

### Where does my customer data live?

`Customer business data (Stripe transactions, HubSpot deals, ClickUp tasks, etc.) is NEVER stored in OpsRadar's database. Every request live-fetches from the source. We only persist computed metadata — agent run logs, your approval queue, the agent-written brain entries.`

### Where does the brain live?

`Two places, both yours. At OpsRadar in a versioned Postgres schema scoped to your user_id by row-level security. In your Notion workspace, mirrored from the OpsRadar copy. You can read it in either place; you own it in both.`

### Where are my OAuth tokens stored?

`At Composio, not at OpsRadar. We never see your Stripe/HubSpot/Notion API keys. Composio brokers every tool call — they hold the OAuth, we hold the agent logic.`

### Is my data multi-tenant?

`Yes. Every Postgres row is scoped to your user_id via Supabase row-level security. There's no shared table where customers' data could leak across.`

### What about hallucinations? Can the AI just make stuff up?

`Hallucinations are a model-level problem; every AI product is exposed. OpsRadar mitigates the *consequence*: every write is approval-gated, so a hallucinated email never sends, a hallucinated invoice never bills. The brain stores citable facts with the agent_run_id that wrote them — you can always trace back to where a fact came from.`

### Where is OpsRadar based?

`We're based in Iraq. Servers run on Vercel (US regions) + Supabase (US regions). Data residency questions for EU/UK customers — talk to the founder.`

---

## Category 4: Who is OpsRadar for?

### Who's the ideal customer today?

`10-50 person marketing and creative agencies running on retainers. You're the bullseye if you use HubSpot or Pipedrive for CRM, Stripe for billing, ClickUp or Asana for project management, Harvest or Toggl for time tracking, Gmail for outreach, Notion for knowledge. We've designed the 28 built-in agents around exactly your stack.`

### What if I'm not an agency?

`If you're a services business (consulting, accounting, dev shop, recruiting, PR, content studio) — we still fit, the 28 agents largely apply. If you're e-commerce or trades or healthcare — the architecture works but the operator-judgment playbook is shaped for agencies right now. Q3 2026 we ship a home-services version. Talk to the founder if you're somewhere else and we'll tell you honestly if it's a fit.`

### What if I'm a fractional COO running multiple clients?

`That's exactly what the Fractional Operator tier ($2,999/mo) is for. White-label, multi-client aggregate, your branding, your domain. You manage all your clients from /dashboard/fo. Each client agency gets its own AI workforce and brain, scoped to their tools — but you see the aggregate dashboard across all of them. See /for/fractional-coo for the full pitch.`

### What if I'm a solo founder?

`Start with Starter ($99/mo). One AI employee + the brain + 5 integrations. When you grow past it, you upgrade.`

### Do I need to be technical to use OpsRadar?

`No. The product is a chat. You describe what you want in plain English. We compile it to a spec, show you the spec, and run it on approval. No code anywhere customer-facing.`

---

## Category 5: How it actually works

### How long does setup take?

`3 minutes 30 seconds for the first AI employee, real time. Sign up (15s), connect Stripe (45s), connect HubSpot (45s), hire your first employee in the Hire chat (60s), read the spec card and click Hire (15s), greet them in their chat page (30s). Most customers spend the next 10 minutes hiring two more.`

### How do custom AI employees actually work?

`A row in custom_employees with a name, role, scheduled cron, scoped tool list, scoped brain prefix, and a system prompt the compiler generates from your plain-English description. They run on Trigger.dev. Each has their own chat page where you can talk to them like a teammate. They write to the company brain on every meaningful action.`

### Can my AI employees talk to each other?

`Yes. CP-37 shipped. You assign a manager to a custom employee. When the manager needs work done, they delegate to a direct report (using Trigger.dev's triggerAndWait — manager pauses, report runs, manager resumes with the summary). It's a real org chart, real durable wait.`

### What's "Apprentice Mode"?

`Every time you reject (or edit) an action your AI workforce proposed, we derive a generalizable rule from your reason and write it to that employee's permanent learned-rules brain prefix. Their next run reads the rule and doesn't repeat the mistake. After 30-100 corrections, they sound like a member of your team, not like ChatGPT.`

### What if I want to talk to OpsRadar via MCP?

`We ship an MCP server. External agents (Claude Code, Cursor, ChatGPT desktop with MCP support) can query your OpsRadar brain directly. Find the setup instructions at /dashboard/settings/mcp.`

---

## Category 6: YC + investor questions

### Are you raising?

`Yes. Talk to the founder.`

### What's the YC fit?

`YC Summer 2026 category #15 (AI Operating System for Companies) is the primary fit. The two-pillar architecture (workforce + brain) lines up with both Bessemer's "Year of the Agent Employee" thesis and YC RFS #4 ("every company will need a company brain"). The vertical wedge (marketing agencies first → home services next) matches the W26 batch's funded shape of "AI [role] for [vertical]." See /about for the full reasoning.`

### What's your moat?

`The honest moat is the STACKING of four things no competitor combines: 28 vertical-specialist agents with senior-COO playbook baked in; signed-by-author-agent provenance on every brain fact; git-style commit-graph versioning with diff/blame/rollback; customer-owned in their Notion. On top of that: 3 demand-validated differentiators (Apprentice Mode, cross-agent synthesis, approval-history personalization). The shared brain itself is table stakes in 2026 (Notion 3.0, Glean, CrewAI all ship it) — the COMBINATION is the moat.`

### Why does the brain matter so much — isn't it just docs?

`Documented agencies sell at 8-12× EBITDA. Undocumented agencies sell at 5-9× EBITDA. (First Page Sage / Wayfront M&A data.) On a $2M-EBITDA agency, that's $6M of extra exit value. The brain we help you build IS the operating IP a buyer pays a higher multiple for. The agents commoditize over time — anyone with the OpenAI Agents SDK can rebuild "28 agents" in a sprint. What they can't rebuild is two years of your accumulated, signed-by-agent, versioned brain. That's the asset.`

### What's your ARR / customer count?

`Talk to the founder. We share traction details one-to-one.`

---

## Final CTA

**H2:** `Question we didn't answer?`
**Primary CTA:** `Talk to the founder — 20 min, no slides`
**Secondary CTA:** `Start the free trial → see for yourself`

---

## What changed from v2

- Categories restructured: was 3 categories (Product / Pricing / About). Now 6 (Differentiation / Pricing / Security / Who-for / How-it-works / YC).
- "How is OpsRadar different from [X]?" expanded from 2 to 6 named competitors — every one is a competitor a customer or VC explicitly will ask about in 2026.
- Security category is new — was missing from v2 entirely, which is a real omission.
- YC + investor category is new — most public-facing FAQs don't have this, but our deal flow includes investors reading the site.
- Every answer ties back to a specific research-cited customer pain or a specific shipped feature. No hand-waving.

## What changed in v4 (2026-05-26 inversions update)

- Devin and 11x competitor answers reframed around earned autonomy (vs "every action approved, always"). Honest evolution of the anti-rogue-agent story.
- New FAQ: "Why does the brain matter so much — isn't it just docs?" — anchors on the agency-exit EBITDA-multiple math.
- "What's your moat?" rewrites from "3 differentiators + brain" to "STACKING of 4 things no competitor combines, plus 3 demand-validated differentiators on top." Sharper, more honest (per the shared-knowledge-layer research).
- Fractional-COO FAQ updated to reference `/for/fractional-coo` page.
