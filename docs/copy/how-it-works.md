# How It Works v4 — Named agents + earned autonomy

*Owner: Lawand · Date: 2026-05-26 (revised same day) · Replaces: how-it-works.md v3*
*Route: `/how-it-works`*
*v4 changes: Step 2 names the 11 domain agents (Riley/Cole/Scott/Devon/Brian/Penny/Tia/Grace/Renee/Sam/Evan); Step 4 reframes around earned autonomy.*

---

## Meta

- **Title:** `How OpsRadar works — AI Operating System`
- **Description (155 chars):** `Connect 5 tools. Hire your first AI employee. Watch the company brain build itself. Approve actions. Four steps to your AI workforce.`

---

## Hero

**Eyebrow:** `HOW IT WORKS`

**H1:** `Four steps. Twenty minutes. You have an AI workforce.`

**Subhead (24 words):**
`No setup calls. No onboarding sales. Connect, hire, approve, watch the brain compound. The product is the demo. Start the trial.`

---

## Step 1 — Connect (5 minutes)

**Step number / icon area:** `01 · CONNECT`

**H2:** `Connect the tools you already use.`

**Body (44 words):**
`Sign in. You see the integrations page. Click Stripe → OAuth in 4 clicks. Click HubSpot → OAuth in 4 clicks. Click ClickUp, Harvest, Gmail, Notion, Slack — whatever stack your business runs on. Composio handles the OAuth. We never see your API keys.`

**Receipt bullets:**
- `25 integrations live today, growing toward Composio's full 500+ catalog`
- `Common stack: Stripe + HubSpot + ClickUp + Harvest + Gmail + Notion + Slack`
- `Composio holds the OAuth tokens; OpsRadar never stores customer business data — every request live-fetches from source`

---

## Step 2 — Meet your built-in workforce (instant)

**Step number / icon area:** `02 · MEET YOUR WORKFORCE`

**H2:** `28 named AI employees already work for you. They started the moment you signed in.`

**Body (62 words):**
`💰 Riley already has access to your Stripe. 📐 Scott already has access to your Harvest. 📨 Cole already has access to your overdue invoices. None of them have done anything yet — they ship daily and weekly schedules. You can also run any of them on demand from the COO chat. Each has their own emoji, their own bio, their own page.`

**Subsection: "The 11 named domain agents (plus Evan the Evaluator)"**

- 💰 **Riley** — Revenue Analyst. Watches MRR, cash collected, and overdue invoices every morning.
- 📨 **Cole** — Collections Lead. Chases overdue invoices with the right nudge at the right time.
- 📐 **Scott** — Scope Watchdog. Flags scope creep before it eats a client retainer.
- 🚚 **Devon** — Delivery Manager. Tracks project health and surfaces stuck work daily.
- 📰 **Brian** — Daily Briefer. Writes your morning COO briefing of what changed overnight.
- 📊 **Penny** — Profitability Analyst. Calculates per-client margin and flags money-losing accounts.
- 👥 **Tia** — Team Lead. Monitors burnout, utilization, and capacity across the team.
- 📈 **Grace** — Growth Strategist. Tracks pipeline and marketing funnel health every Monday.
- 🔁 **Renee** — Renewals Lead. Watches contract expiries and flags renewals at risk.
- 🧰 **Sam** — Stack Auditor. Audits your software stack monthly for waste and overlap.
- 🧐 **Evan** — Quality Evaluator. Reviews every other agent's proposed actions for quality daily.

**Subsection: "17 toolkit specialists underneath them"**

`Each one watches one app deeply: Stripe Specialist, HubSpot Specialist, ClickUp Specialist, Harvest Specialist, Gmail Specialist, Slack Specialist, Notion Specialist, Calendly Specialist, Pipedrive Specialist, Apollo Specialist, QuickBooks Specialist, Google Calendar / Analytics / Ads Specialists, LinkedIn Specialist, BambooHR + Gusto + Typeform + Intercom + Zendesk + Asana + Monday + Toggl Specialists. They feed findings up to the 11 named domain agents. The orchestrator-worker pattern (CP-19).`

---

## Step 3 — Hire a custom AI employee (4 minutes)

**Step number / icon area:** `03 · HIRE`

**H2:** `Describe a role. Sign the offer. They start tomorrow.`

**Body (38 words):**
`Open the Hire chat at /dashboard/hire. Tell us who you want: "I want a Bookkeeper named Sarah, every day at 8 AM, she pulls yesterday's Stripe charges and flags anything over $5,000 for my approval." We compile the spec.`

**Subsection: "What the spec contains" (the inline draft card shown in the chat)**

```
👤 Sarah · Bookkeeper
   Schedule: Every day at 8 AM
   Tools: Stripe, Notion
   Scope: Real P&L brain · Sarah's own memory
   First task on hire: Categorize yesterday's Stripe charges
   System prompt: [auto-generated, 30-50 lines, you can edit before hiring]

   [Hire Sarah]  [Edit]  [Discard]
```

**Subsection: "What happens after you click Hire"**

`1. Row inserted in custom_employees. Cron registered with Trigger.dev.`
`2. New "Sarah · Bookkeeper" entry appears in your sidebar under YOUR TEAM.`
`3. Click Sarah → her own chat page opens. She greets you.`
`4. Tomorrow at 8 AM, she runs her first scheduled task.`

---

## Step 4 — Approve, reject, watch the brain compound (forever)

**Step number / icon area:** `04 · APPROVE + LEARN + GRADUATE`

**H2:** `Earned autonomy. The workforce starts cautious. Graduates to fast as you build trust.`

**Body (78 words):**
`Every time an employee wants to do something — send an email, create an invoice, update a deal, post in Slack — the first 30 times that action type fires, it shows up in your approval queue at /dashboard/actions. You read it, see exactly what it'll do, approve or reject. Reject something? OpsRadar learns the rule (Apprentice Mode). After 30+ approvals at >90% rate on a routine action type, that action graduates to Auto-with-notification. Your time stops being burned on the obvious yeses.`

**Subsection: "Three risk tiers"**

- **HIGH RISK (always Ask, regardless of confidence)** — Firing a client. Sending invoices to billing. Mass email. Anything irreversible or customer-facing-and-financial. These NEVER auto-fire, even at 99% confidence. You set the floor.
- **MEDIUM RISK (Auto with notification after earned trust)** — Drafting a Slack reply, scheduling a meeting, queuing an internal note. Starts as Ask. Graduates to Auto-with-notification at 90%+ approval rate over 30 actions.
- **LOW RISK (silent Auto by default)** — Notion writes, brain commits, internal log updates. Fire-and-forget. You can flip them to Ask if you're risk-averse.

**Subsection: "What the brain looks like after week 1, week 4, week 12"**

- **Week 1:** Sarah has written 14 Pattern Cards to Real P&L. Marcus the SDR has logged 8 Decision Log entries. Your Risk Register has 3 open items.
- **Week 4:** ~80 Pattern Cards, ~40 Decision Logs, ~12 Risks. Apprentice Mode has applied 22 of your rejections as permanent learned rules. Ask the COO "what should I worry about?" and it answers from real data.
- **Week 12:** The brain knows your business. Every employee sounds like a member of your team, not like ChatGPT. The first hire you make after this is a comparison — you'll measure them against the brain.

**Subsection: "The approval queue, as a discipline"**

`Three things have to align in the same moment: the agent has to propose it, you have to see it, you have to click Approve. The product is structurally incapable of acting without you. The horror stories you've heard about AI agents going rogue can't happen here.`

---

## Section 5 — The architecture, in one diagram

**Section eyebrow:** `WHAT'S RUNNING UNDERNEATH`

**Diagram (ASCII for the copy doc; real diagram in JSX):**

```
You ──→ COO chat / Hire chat / per-employee chat
                           │
                           ▼
                    streamText loop
                           │
                           ▼
                  Composio tool call
                           │
                           ▼
                   Approval gate
                  (Ask / Auto / Off)
                           │
                           ▼
                   ┌───────┴───────┐
                   │               │
                Stripe        HubSpot   (and 23 more)
                  │               │
                  ▼               ▼
              [response]      [response]
                  │               │
                  └───────┬───────┘
                          │
                          ▼
                  Agent writes finding
                  to your company brain
                          │
                          ▼
                  ┌───────┴───────┐
                  │               │
        OpsRadar Postgres   Your Notion
            (versioned)       (mirror)
```

**Caption:** `Every read live-fetches from the source. Every write routes through the approval gate. Every finding is signed by the agent and written to two places — Postgres (versioned) and your Notion (yours).`

---

## Section 6 — The trial in 4 minutes

**H2:** `Start the trial. The first 4 minutes look like this.`

**Step list:**

1. `Sign up — email + password. No credit card.` *(15 seconds)*
2. `Connect Stripe — OAuth, 4 clicks.` *(45 seconds)*
3. `Connect HubSpot — OAuth, 4 clicks.` *(45 seconds)*
4. `Open /dashboard/hire. Describe your first AI employee in plain English.` *(60 seconds)*
5. `Read the spec card. Click Hire.` *(15 seconds)*
6. `Click their name in the sidebar. Chat with them. They greet you.` *(30 seconds)*
7. `That's it. They start working on their cron tomorrow.` *(0 seconds)*

**Total time: 3 minutes 30 seconds.** `Most customers spend the next 10 minutes hiring two more employees.`

---

## Final CTA

**H2:** `Start the 4-minute path. 14 days free. No card.`
**Primary CTA:** `Start free trial`
**Secondary CTA:** `See a recorded demo (5 min) →`

---

## What changed from v2

- Old how-it-works was 5 steps centered on "the COO chat surfaces alerts." New version is 4 steps centered on "hire a workforce + watch the brain compound."
- New Step 2 (meet the built-in workforce) is brand new — v2 didn't mention that 28 agents ship Day 1.
- New Step 3 (hire flow) shows the actual inline draft card, copy-pasted from the real UI.
- New Step 4 explicitly names Apprentice Mode and the brain-compounding-over-time effect with concrete week 1/4/12 milestones.
- ASCII architecture diagram added — engineering-reader trust signal.
- Footer "4 minutes" trial walkthrough is new — concrete time + concrete clicks beat abstract "easy onboarding" copy.
