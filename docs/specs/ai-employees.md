# AI Employees architecture — named, persona-bearing, per-chat AI teammates (May 2026)

> **⚠️ Reconcile with current reality (2026-05-27).** This design predates the 2026-05-26 pivot. Two things changed under it: (1) the broker is now **Nango**, not Composio — every "scoped Composio tools" reference means scoped *broker* tools via `nangoProxy()` (see ADR 0010); (2) the "28 built-in agents" this spec builds on were torn down with Composio and are rebuilding one at a time (`src/lib/agents/registry.ts` holds one — Gmail — today; see ADR 0011). The AI-Employees *architecture* below is still the intended design; read the broker/agent-count specifics as pre-pivot.

**Status**: research complete, NOT yet implemented.
**Trigger**: post-CP-33, customer needs the ability to create custom AI employees — each with their own name, role, persona, dedicated chat thread, scoped tools, and persistent memory — going beyond the 28 pre-built agents and the event-triggered automations layer (CP-20).

This is the design doc for the **AI Employees layer** (CP-34+). The pattern is Notion 3.3 Custom Agents (Feb 2026, the canonical reference) + Lindy 3.0 "AI Employee" framing + Microsoft Copilot named role-agents (Analyst, Researcher) + Cognition Managed Devins, adapted to OpsRadar's identity (Notion-Brain-backed, approval-gated, vertical-agency-deep).

> *"Lindy 3.0: Meet Your First AI Employee."* — [Lindy](https://www.lindy.ai/blog/lindy-3-0)
>
> *"Custom Agents mark a shift in how teams work with AI. Not just getting help when you ask, but having AI teammates that handle entire workflows autonomously."* — [Notion co-founder, Feb 2026](https://www.notion.com/blog/introducing-custom-agents)
>
> *"We now have more agents than employees."* — Notion, on their own internal usage before public launch

---

## 1. The category-winning pattern (verbatim)

Every winning agentic product in H1 2026 converged on the same mental model — and they all use the same vocabulary: **"AI teammate" / "AI employee" / "AI specialist"**. The era of unnamed "agents" is ending.

### 1.1 Notion 3.3 Custom Agents — the canonical UI reference

Notion shipped this on **2026-02-24**. By May 2026, **21,000+ Custom Agents had been built in beta**. Their architecture is the most polished public reference today:

| Surface | What goes there |
|---|---|
| **Sidebar Agents section** | Each named agent is its own sidebar row (e.g. "Onboarding Eddie," "IT Hero," "Sales Detective," "Product Oracle") |
| **3 tabs per agent** | **Chat** — 1:1 conversation with that specific agent. **Activity** — log of every run with trigger/actions/errors. **Settings** — instructions, triggers, scoped pages/databases, model selection. |
| **Creation flow** | (a) "Create with AI chat" — describe intent in natural language, system compiles instructions/triggers/access (b) Pre-built templates (Q&A, Task Routing, Status Update) (c) Blank canvas |
| **Scoped tools** | Each agent gets explicitly granted access to specific pages/databases/apps — *"agents do not have automatic access to your workspace"* |
| **Edit isolation** | *"You can't cross-edit multiple agents in the same AI chat session"* — each agent is its own edit session, like an HR file |
| **Memory architecture** | Uses Notion pages/databases as long-term memory substrate — *"Your memory in Notion doesn't change even when models continue to change"* |

**Triggers** (per Notion docs): Schedule (daily/weekly/monthly/yearly w/ timezone) · Notion events (comments, DB changes, @mentions) · Slack events (channel messages, reactions, thread starts).

**Direct quote on the value framing**:
> *"Teams spend as much time aligning, updating, and routing work as they do actually doing it… Agents monitor channels, route tasks, compile updates, and answer questions. They scale with your needs — the more workflows you automate, the more valuable they become."*

### 1.2 Lindy 3.0 — "Meet Your First AI Employee"

Lindy explicitly rebranded from "agent" to **"AI employee"** in their 3.0 release ([Lindy 3.0 launch](https://www.lindy.ai/blog/lindy-3-0)). The platform vocabulary as documented in [docs.lindy.ai/llms.txt](https://docs.lindy.ai/llms.txt):

| Lindy term | Meaning |
|---|---|
| **"Lindy"** | A single AI employee — one row in their `lindies` table |
| **"Chat with Lindy"** | First-class primitive — each Lindy has its own chat as both trigger AND surface |
| **"Talk with Other Lindy"** | First-class primitive — Lindies invoke each other ("multi-agent workflows via message triggers and actions") |
| **"Memory"** | Per-Lindy snippets — *"persist across all future task runs… automatically included in every AI call"* |
| **"Skill"** | A single capability/tool a Lindy can use |

**Key quote**:
> *"You create agents ("Lindies") by describing what you want them to do in natural language. No flowcharts, no code. 'Triage my inbox, label urgent emails, draft replies to meeting requests, and forward invoices to accounting' becomes a working agent in minutes."*

**Multi-channel chat**: each Lindy can be reached via iMessage/SMS, email, the Lindy app, or Slack — *"Just text it and it's done… It has full context from your email, calendar, and every prior conversation, so it acts like a real assistant, not a chatbot."*

### 1.3 Microsoft Copilot Studio + named Analyst/Researcher agents

Microsoft 365 Copilot shipped **named, role-scoped agents** in their 2026 release — **Analyst** and **Researcher** are first-class entities. Per [Microsoft Inside Track on becoming a Frontier Firm](https://www.microsoft.com/insidetrack/blog/becoming-a-frontier-firm-a-guide-for-deploying-ai-agents-based-on-our-experience-at-microsoft/): the company shifted from "one Copilot per user" to *"targeted, role-based agents — AI entities grounded in enterprise data, trained for domain-specific outcomes, and governed like any other digital asset."*

Copilot Studio is the low-code builder where customers create custom named agents. **Each named agent appears in Teams, has its own conversation thread, and is invoked by name** — exactly the pattern Notion shipped.

### 1.4 Cognition Devin — "Managed Devins" parallel named sessions

[Cognition shipped "Managed Devins" in March 2026](https://cognition.ai/blog/devin-can-now-manage-devins). The architecture:

- Main Devin = **coordinator** that scopes work and assigns to subordinate Devins
- Each Managed Devin = **its own isolated VM, own terminal, own browser, own session link**
- Each subordinate Devin has *"a clean slate, a narrow focus, its own shell, and its own test runner"*
- Reasoning quote: *"When one agent tries to handle too many things in a single session, context accumulates and focus degrades."*

This validates the architectural rule: **per-employee context isolation matters at scale**. Beyond ~5 agents, sharing one chat thread degrades quality.

### 1.5 ServiceNow Autonomous Workforce + Salesforce Agentforce — enterprise scale

Both shipped 2026 platforms organized as **suites of named role-based AI specialists**:

- **ServiceNow Autonomous Workforce** (May 2026 launch at Knowledge): *"AI 'specialists' that don't just assist human workers but complete entire business processes from start to finish, without human intervention. The new AI specialists span IT operations, customer relationship management, HR, finance, legal, procurement, as well as security and risk."*
- **Salesforce Agentforce**: similar framing — *"AI agents for business processes,"* sold as agent specialists per role.

Salesforce explicitly markets this as **"the agentic enterprise"** — and prices Agentforce per-conversation ($2/conversation), abandoning per-seat.

---

## 2. The market vocabulary shift — why "AI employees" beats "agents"

Forrester's 2026 enterprise software predictions ([source](https://www.forrester.com/blogs/predictions-2026-ai-agents-changing-business-models-and-workplace-culture-impact-enterprise-software/)) and Microsoft's Frontier Firm guide name the trend explicitly:

| Old vocabulary (2024–early 2025) | New vocabulary (2026) |
|---|---|
| "AI agent" | "AI employee," "AI teammate," "AI specialist" |
| "Automation" | "Digital workforce" |
| "Copilot" (one per user) | "Role-based agents" (one per job function) |
| "Bot" | Named entity ("Sarah," "Eddie," "Donna") |
| "Workflow" | "Job," "role," "responsibility" |
| User dispatches "tasks" | User is the "agent boss" — provides guidance, makes high-stakes decisions |

The why: **naming creates accountability** in the customer's mind. "The bookkeeping agent failed" is forgivable. "Sarah missed the categorization on the Stripe charge" is the same scrutiny they'd apply to a real bookkeeper. Customers WANT to apply that scrutiny because it's how they think about delegation.

NN/G's State of UX 2026 ([source](https://www.nngroup.com/articles/state-of-ux-2026/)) names this **"Delegative UI"** — *"UX is shifting from Conversational UI (asking an AI a question) to Delegative UI (assigning an AI a goal)."* Named employees are the visible substrate for delegation.

---

## 3. The architectural primitives every winning system shares

Distilling Notion + Lindy + Microsoft + Devin + Anthropic Multi-Agent Research:

### 3.1 The 5 required primitives for an AI employee

| # | Primitive | Why it matters | Notion analog | Lindy analog |
|---|---|---|---|---|
| 1 | **Stable identity** (name + role + avatar + system_prompt) | Customer mental model. Trust. Memory anchor. | Custom Agent row | A "Lindy" |
| 2 | **Dedicated chat thread** scoped to this employee | Context isolation. Per-employee history. No cross-contamination of personas. | Chat tab | Per-Lindy chat in iMessage/app |
| 3 | **Scoped tool access** (explicit grant, not workspace-wide) | Security. Predictability. Customer doesn't worry about Sarah touching marketing data. | Tools & access in Settings | Per-Lindy skills |
| 4 | **Persistent memory** scoped to this employee | Sarah remembers what categories she uses. Eddie remembers the onboarding playbook. | Notion pages + DBs as memory substrate | Per-Lindy memory snippets |
| 5 | **Trigger options** — schedule, event, chat, @mention | One employee, many activation modes. Cron + reactive in one entity. | Schedule / Notion event / Slack | Time / Chat / Event |

### 3.2 The supervisor-worker org-chart pattern (Anthropic / Devin / Notion)

For more than ~5 employees, every system converges on a **hierarchical chain of command**. Per the [Hierarchical Multi-Agent Systems taxonomy paper (Aug 2025)](https://arxiv.org/html/2508.12683):

> *"Hierarchical multi-agent systems organize agents in a tree-like structure with clear authority relationships, with a supervisor or coordinator agent sitting at the top, delegating tasks to subordinate agents and synthesizing their results."*

And from IBM's enterprise agent research:
> *"For enterprise-scale deployments with 50+ agents across multiple business domains, hierarchical is typically the only viable option."*

**The OpsRadar mapping** (already half-built):

```
                    AI COO (orchestrator, owns full context)
                          /          |           \
       Custom AI Employees    28 Built-in Agents    Customer Automations
      (Sarah, Eddie, etc.)     (revenue, scope, …)        (CP-20 reflexes)
              |                       |                        |
          ─── scoped Composio tools + scoped brain reads/writes ───
```

**The COO is the supervisor**, custom employees + built-in agents + automations are the workers. This matches Devin's "Manage Devins" coordinator pattern exactly.

### 3.3 Context isolation — the "single coherent context" rule

[Cognition's Walden Yan in "Don't Build Multi-Agents"](https://cognition.ai/blog/dont-build-multi-agents) argues for **a single coherent context** — but then Cognition themselves shipped Managed Devins because at scale context degrades. The synthesis: **isolated contexts per worker, but the supervisor maintains one coherent task-level context.**

Anthropic confirms ([Multi-Agent Research blog](https://www.anthropic.com/engineering/multi-agent-research-system)):
> *"By using sub-agents with their own separate context windows, Claude can effectively remember and process 15x more information than a single-threaded AI could handle before getting confused."*

**The architectural rule for OpsRadar**: each custom AI Employee gets its own fresh context window per run. The COO (supervisor) holds the cross-employee narrative. Per-employee chat threads provide the persistent memory.

---

## 4. Pricing model implications — why this kills per-seat

This is the part that most architecture docs miss. The "AI employee" framing changes how you price.

### 4.1 The 2026 SaaS pricing collapse

From [MindStudio's analysis](https://www.mindstudio.ai/blog/saas-pricing-ai-agent-era) and corroborated by [getmonetizely 2026 guide](https://www.getmonetizely.com/blogs/the-2026-guide-to-saas-ai-and-agentic-pricing-models):

> *"Per-seat pricing assumed the unit of software consumption was a human user. AI agents break that assumption by executing work at scale without creating a user footprint. **Seat-based pricing fell from 21% to 15% of SaaS companies in just 12 months**, while hybrid models surged from 27% to 41%."*

### 4.2 The four pricing models for AI employees

| Model | Example | What you charge for |
|---|---|---|
| **Per-conversation** | Salesforce Agentforce ($2/conversation) | Each user turn the agent handles |
| **Outcome-based** | Intercom Fin ($0.99/resolved conversation) | Closed loops — customer doesn't return |
| **Credit-based** | Microsoft Copilot Studio ($0.01/credit or $200/25K credits) | Internal compute units that abstract away cost |
| **Agent-as-employee** | "$2,000/mo AI SDR replacing $90K human SDR" | The fraction of a human salary the employee replaces |

**For OpsRadar specifically**, the "agent-as-employee" model is the right pitch because the customer mental model becomes:

> *"Your AI bookkeeper costs $300/mo. A human one is $4K/mo. You save $44K/year per role. Hire 5 AI employees on the platform for $1,500/mo — you've replaced $240K of annual hiring."*

This is **massively more compelling than "$3K/mo for our AI platform."** The unit economics tell themselves.

### 4.3 Hybrid is the winning shape

Per the same MindStudio analysis:
> *"Hybrid pricing — a base subscription combined with usage and/or outcome components — is used by 43% of SaaS firms and growing fast. Companies using hybrid pricing report 38% higher revenue growth and 38% higher net revenue retention compared to pure subscription firms."*

**OpsRadar's likely model**: base tier (includes 28 built-in agents) + per-custom-employee fee ($150–$300/mo each) + usage caps via CP-23 quota system.

---

## 5. The OpsRadar custom-employee architecture (CP-34+ design)

### 5.1 Data model

Four new tables, all RLS-scoped to `user_id`:

```sql
custom_employees
  id uuid primary key
  user_id uuid not null
  name text not null                         -- "Sarah"
  role text not null                         -- "Bookkeeper"
  avatar_url text                            -- generated or uploaded
  emoji text                                 -- fallback to avatar
  persona_summary text                       -- 1-paragraph "who is Sarah"
  system_prompt text not null                -- the actual prompt
  schedule_cron text                         -- optional, can be null for chat-only
  status text not null                       -- 'active' | 'paused' | 'archived'
  autonomy text not null default 'ask'       -- 'ask' | 'auto' | 'off' (mirrors CP-14)
  model_slug text default 'gpt-5.4'          -- per-employee model choice
  max_steps int default 25
  scoped_toolkits text[] not null default '{}'  -- ['stripe', 'notion', 'gmail']
  scoped_brain_prefixes text[] not null default '{}' -- ['employees/sarah/', 'kpi-snapshots/']
  created_at timestamptz default now()
  updated_at timestamptz default now()

custom_employee_chat_threads
  id uuid primary key
  employee_id uuid not null references custom_employees(id) on delete cascade
  user_id uuid not null
  title text                                 -- auto-generated from first user msg
  created_at timestamptz default now()
  last_message_at timestamptz default now()

custom_employee_messages
  id uuid primary key
  thread_id uuid not null references custom_employee_chat_threads(id) on delete cascade
  user_id uuid not null
  role text not null                         -- 'user' | 'employee' | 'tool'
  content text not null
  tool_calls jsonb
  created_at timestamptz default now()

custom_employee_memory
  -- Reuses the brain_documents table with author_type = 'employee:<name>'.
  -- No new table needed. Brain commits show author "Sarah (Bookkeeper)" instead of
  -- "agent:revenue". Per-employee paths under employees/<slug>/...
```

### 5.2 The 5-tab employee page (matches Notion exactly)

For each `/dashboard/employees/[slug]` route:

| Tab | What it shows |
|---|---|
| **Chat** | Dedicated thread with this employee. Past threads in left rail (like ChatGPT's history). Inline approval cards. |
| **Activity** | Run history for this employee — every cron run + every chat task. Filterable. Drill-in drawer with tool calls. |
| **Memory** | What this employee has written to the brain. Path-prefixed view of their corner of the Postgres brain. |
| **Skills** | Scoped toolkits + scoped brain paths + skills they can call. Edit access here. |
| **Settings** | Name, role, avatar, persona, system prompt, schedule, model, autonomy, archive |

### 5.3 The creation flow (Lindy + Notion pattern)

**> CP-38 UPDATE (May 2026):** the creation flow lives on the dedicated
> `/dashboard/hire` surface, not inside the COO chat. This matches Notion 3.3
> Custom Agents, Lindy 3.0 (`New Lindy` button), and Microsoft Copilot Studio
> (separate from Agent Builder) — every major 2026 reference ships a
> dedicated builder route. Mixing hiring into the COO Q&A chat confuses
> tool-selection and the customer's mental model of "ask vs build."

**Customer in `/dashboard/hire`:**
> *"I want a Bookkeeper named Sarah. Every day at 8am, pull yesterday's Stripe charges, categorize them by our chart of accounts, write to the Real P&L brain doc, flag anything over $5,000 for my approval."*

**The Hiring assistant calls `propose_custom_employee(description)` → returns a draft spec:**

```yaml
name: Sarah
role: Bookkeeper
persona_summary: Thorough, conservative on edge cases, asks before assuming.
schedule: "0 8 * * *"
scoped_toolkits: [stripe, notion]
scoped_brain_prefixes: [employees/sarah/, real-pl/]
system_prompt: |
  You are Sarah, the bookkeeper for {agency_name}. Your job is to...
  [generated 30-50 lines]
suggested_starter_task: "Categorize yesterday's Stripe charges"
```

**Inline draft card in chat** (Lindy-style):
```
👤 Sarah · Bookkeeper
   Schedule: Every day at 8am
   Tools: Stripe, Notion
   Scope: Real P&L brain · Sarah's own memory

   First task on hire:
   ↳ Categorize yesterday's Stripe charges

   [Hire Sarah]  [Edit]  [Cancel]
```

**Customer clicks Hire Sarah** → `install_custom_employee` → row inserted in `custom_employees`, cron registered, sidebar refreshes. New "Sarah · Bookkeeper" entry under "YOUR TEAM" in sidebar.

**Customer clicks Sarah in sidebar** → her dedicated chat tab opens. She greets:
> *"Hi, I'm Sarah. I'll handle your bookkeeping. I haven't run yet — want me to start by categorizing yesterday's Stripe charges?"*

### 5.4 Sidebar evolution

```
TODAY
  Overview
  Ask COO              ← the supervisor / front door

YOUR TEAM             ← NEW (CP-34) — the AI workforce
  Sarah · Bookkeeper      [● green dot = on shift]
  Marcus · PM Coordinator [● green]
  Diana · Marketing Analyst [○ paused]
  + Hire AI Employee

OPERATIONS
  Actions
  Automations
  Agents              ← the 28 pre-built (rename to "Built-in agents"?)
  Runs

BRAIN
  Company Brain

WORKSPACE
  Integrations
  Settings
```

**Naming distinction**:
- **Built-in agents** = the 28 we ship (revenue, scope, etc.) — included in tier
- **Your team** = custom employees the customer hired — priced per employee
- **Automations** = event reflexes (CP-20, unchanged)

### 5.5 Tool extensions to the COO

Five new COO chat tools (mirrors CP-20 automation tools exactly):

| Tool | Purpose |
|---|---|
| `propose_custom_employee` | Compile description → typed spec → return draft card |
| `install_custom_employee` | Confirm + persist + register cron + return sidebar slug |
| `list_custom_employees` | Show current team with status |
| `inspect_custom_employee` | Read full spec + recent runs for one employee |
| `pause_custom_employee` / `unpause` / `archive` | Lifecycle controls |

### 5.6 The brain integration (Karpathy way preserved)

Custom employees write to the SAME Postgres brain (CP-27) as the built-in agents. The distinction is in `brain_commits.author_type`:

| author_type | Who wrote |
|---|---|
| `agent:revenue` | Built-in revenue cron agent |
| `coo` | The AI COO chat |
| `customer` | The owner editing manually |
| `employee:sarah` | Custom employee Sarah |
| `automation:<id>` | A CP-20 automation step |

This means the recent-commits feed on `/dashboard/brain` automatically shows all writers — built-in agents, COO, customer, AND custom employees — without any changes. Sarah's writes appear inline.

Each custom employee also gets their own brain subdirectory: `employees/<slug>/` — for their private working notes that aren't shared with the wider organization brain. The customer can view these in the Memory tab on Sarah's page.

---

## 6. Why this is the right move for OpsRadar (vs alternatives)

### 6.1 The competitive context (vertical depth × employee diversity)

| Competitor | What they have | OpsRadar's edge |
|---|---|---|
| **BOND** (YC X25) | One chat (Donna), KPI dashboard, Pattern Radar | We'd have N named employees per role × vertical agency depth |
| **Lindy** (Series A) | Custom Lindies, but horizontal — no agency-specific playbooks | We ship with senior-COO playbook (CP-21) baked into every template |
| **Notion Custom Agents** | The closest equivalent — 21K+ built — but Notion is the workspace, not the operator | We connect 25+ external SaaS tools, not just Notion content |
| **Microsoft Copilot Studio** | Named role-agents, but requires Microsoft stack | We're cross-stack via Composio |
| **ServiceNow Autonomous Workforce** | Enterprise-only ($$$) | We're SMB-priced |

**The wedge**: Notion gives you custom agents that read Notion. Lindy gives you custom agents that read your inbox/calendar. **OpsRadar gives you custom AI employees that read your entire agency stack — Stripe, HubSpot, Harvest, ClickUp, Gmail, Notion — with built-in agency operator judgment.**

### 6.2 The YC category map (CP-33 mapping)

From `path-a-strategy-2026.md`:

| YC category | How CP-34 advances it |
|---|---|
| **#2 AI Chief of Staff** | The COO becomes the supervisor for the employee team — sharper hierarchy story |
| **#4 Company Brain** | Each employee writes to a named author_type — brain becomes the visible org's collective memory |
| **#12 MCP Server** | Each custom employee can be exposed as an MCP tool — *"summon Sarah from Claude Desktop"* |
| **#15 AI OS** | This is the headline — *"Build your AI team"* is the OS-level pitch, not just an app |

### 6.3 Pricing leverage

The "AI employee" framing unlocks **massively cleaner pricing**:

| Tier (revised) | Includes | Price |
|---|---|---|
| **Starter** | 28 built-in agents + COO chat + 1 custom employee | $750/mo |
| **Growth** | + 3 custom employees | $1,500/mo |
| **Pro** | + 8 custom employees | $3,000/mo |
| **FO** | + unlimited custom employees + multi-client view | $5,000/mo |

The "additional employee" upsell becomes obvious: $150–$300/mo per additional employee. A 10-person agency can easily justify 5 AI employees ($750–$1.5K) vs hiring 1 human ($75K+).

---

## 7. Anti-patterns (what NOT to build)

### 7.1 Don't make every custom employee a separate model

Notion uses **one model per agent** for clean experimentation, but the model choice is per-agent (in Settings). For OpsRadar, default to gpt-5.4 for all; allow override only for power users. Don't expose model choice in the primary creation flow.

### 7.2 Don't replicate workspace permissions inside our app

Composio already brokers OAuth. Per-employee tool scope is enforced at our layer (which Composio tools each employee can call). Don't try to re-implement Notion-style page-level permissions for the customer's connected tools — Composio is the source of truth there.

### 7.3 Don't let employees freely create other employees

Lindy allows "Lindy creates other Lindies." This sounds neat but creates an attack surface: a rogue prompt could spawn 100 employees. **In OpsRadar, only the COO (with explicit customer approval) can create employees.** The customer is always in the loop.

### 7.4 Don't allow free-form personas

Notion templates personas. Lindy lets users write anything. The middle ground: ship **5–10 role templates** (Bookkeeper, PM Coordinator, Sales Analyst, Marketing Analyst, HR Coordinator, etc.) with editable instructions. Free-form is allowed but template-suggested. This is the rails-vs-LLM-maximalist trade-off from CP-20.

### 7.5 Don't merge built-in agents and custom employees in one sidebar list

The mental model "your team" (custom, priced per-employee) must be visually separate from "built-in agents" (we ship them, free). Two sections. Different visual treatment.

---

## 8. Migration path (CP-34 → CP-34c)

Three commits, mirroring how CP-20 shipped:

| CP | Scope | Commits |
|---|---|---|
| **CP-34a** | Schema + dispatcher + dual-source registry (reads code-defined + DB-defined) | 1 PR, ~600 LOC |
| **CP-34b** | `propose_custom_employee` + `install_custom_employee` + 3 lifecycle tools wired into COO chat | 1 PR, ~400 LOC |
| **CP-34c** | `/dashboard/employees` (list) + `/dashboard/employees/[slug]` (5 tabs) + sidebar update | 1 PR, ~800 LOC |

**Total effort**: 1.5–2 weeks for production-ready.

**Dependencies**: none new — reuses runAgent loop, brain store, approval gate, sessions UI, Composio brokerage, CP-23 quota.

---

## 9. Open questions to resolve before shipping

| # | Question | Tentative answer |
|---|---|---|
| 1 | Do employees see other employees' brain commits? | YES — the brain is shared org knowledge. Private notes go in `employees/<slug>/` (their own subdirectory). |
| 2 | Can employees delegate to other employees? | NOT in v1. Only the COO can. v2 may add `delegate_to_employee` tool. |
| 3 | Are avatars AI-generated, uploaded, or emoji? | v1: emoji fallback + customer can paste an image URL. v2: AI-generated via DALL-E with name+role prompt. |
| 4 | Per-employee memory limits? | Soft cap at 500 memory snippets per employee (mirrors Lindy). Hard cap enforced via quota table (CP-23). |
| 5 | Can the customer manually trigger an employee chat session? | YES — that's the Chat tab. Schedule-triggered runs also write to that thread, so the customer can review them like reading messages from a teammate. |
| 6 | What happens on archive? | Spec preserved, brain memory preserved, cron deregistered, sidebar hidden, can be unarchived. Deletion is hard-deletion + 30-day grace. |
| 7 | Multi-tenant isolation guarantees? | Per-user RLS on all 3 tables. Composio connection scope is already per-user. Brain prefix scope enforced in `commitBrainChanges` (already CP-27 RLS). |

---

## 10. Sources

### Primary product references
- [Notion 3.3 Custom Agents launch (Feb 24, 2026)](https://www.notion.com/releases/2026-02-24)
- [Notion Custom Agents Help Center](https://www.notion.com/help/custom-agents)
- [Notion blog — Introducing Custom Agents](https://www.notion.com/blog/introducing-custom-agents)
- [Lindy 3.0 — Meet Your First AI Employee](https://www.lindy.ai/blog/lindy-3-0)
- [Lindy memory documentation](https://docs.lindy.ai/fundamentals/lindy-101/memory)
- [Lindy iMessage/SMS chat](https://docs.lindy.ai/features/imessage-sms)
- [Cognition — Devin can now Manage Devins (Mar 2026)](https://cognition.ai/blog/devin-can-now-manage-devins)
- [Microsoft — Becoming a Frontier Firm](https://www.microsoft.com/insidetrack/blog/becoming-a-frontier-firm-a-guide-for-deploying-ai-agents-based-on-our-experience-at-microsoft/)
- [ServiceNow Autonomous Workforce launch (May 2026)](https://www.servicenow.com/platform/autonomous-workforce.html)
- [Salesforce Agentic Enterprise](https://www.salesforce.com/agentforce/agentic-enterprise/)

### Architecture references
- [Anthropic — Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Cognition — Don't Build Multi-Agents (Walden Yan)](https://cognition.ai/blog/dont-build-multi-agents)
- [Hierarchical Multi-Agent Systems Taxonomy (arXiv 2508.12683)](https://arxiv.org/html/2508.12683)
- [Multi-Agent in Production 2026: 3 Patterns That Survived](https://niteagent.com/blog/multi-agent-production-2026/)
- [Anthropic — Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

### Pricing references
- [SaaS Pricing Is Breaking — MindStudio](https://www.mindstudio.ai/blog/saas-pricing-ai-agent-era)
- [2026 Guide to SaaS, AI, and Agentic Pricing Models — getmonetizely](https://www.getmonetizely.com/blogs/the-2026-guide-to-saas-ai-and-agentic-pricing-models)
- [The Great SaaS Unbundling — Taskade](https://www.taskade.com/blog/great-saas-unbundling)

### Market positioning references
- [Forrester Predictions 2026 — AI Agents Impact Enterprise Software](https://www.forrester.com/blogs/predictions-2026-ai-agents-changing-business-models-and-workplace-culture-impact-enterprise-software/)
- [NN/G — State of UX 2026](https://www.nngroup.com/articles/state-of-ux-2026/)
- [Notion Custom Agents — 21,000 built in beta (Y Build)](https://ybuild.ai/en/blog/notion-custom-agents-autonomous-ai-teammates-2026)

### Internal docs cross-referenced
- [`./automations.md`](./automations.md) — Lindy 2.0 lessons applied to CP-20
- [`../adr/0005-control-first-approval-gate.md`](../adr/0005-control-first-approval-gate.md) — approval gates and autonomy patterns
- [`../adr/0004-three-tier-memory.md`](../adr/0004-three-tier-memory.md) — brain storage (employees inherit this)
- [`../adr/0006-orchestrator-worker-pattern.md`](../adr/0006-orchestrator-worker-pattern.md) — supervisor-worker pattern, COO as orchestrator
- [`../adr/0007-senior-coo-playbook.md`](../adr/0007-senior-coo-playbook.md) — playbook each employee can be templated from
- [`../positioning/moats.md`](../positioning/moats.md) — moat construction; AI-employee surface is the YC #15 "AI OS" delivery vehicle
- [`../positioning/path-a-strategy.md`](../positioning/path-a-strategy.md) — YC category map (#2, #4, #12, #15)
