# OpsRadar Agents + Notion Brain — Full Architecture (May 2026)

## The Big Picture

```
Customer's Tools (500+ via Composio)
        ↓
   Composio Layer  ←──────────────────────────────────┐
        ↓                                              │
   OpsRadar Agents (5 background + COO chat)          │
        ↓                    ↓                         │
  Notion Brain          Action Engine              Supabase
  (customer-owned)      (emails, alerts)          (auth + config)
        ↓
  Customer reads,
  edits, owns forever
```

---

## Layer 1: Data Sources — Composio

Every customer connects their tools once through Composio OAuth.
Composio handles token storage, refresh, and unified API calls.

- Customer goes to `/dashboard/integrations`
- Clicks "Connect" on any tool
- Composio OAuth flow — customer authorizes in 30 seconds
- OpsRadar stores only the Composio `connection_id` in Supabase (never the token)
- Composio holds the token, handles refresh automatically

**What OpsRadar stores in Supabase per customer:**
```
user_integrations table:
- user_id
- tool_name (e.g. "stripe", "hubspot", "gmail")
- composio_connection_id
- connected_at
- is_active
```

That's it. No API keys. No OAuth tokens. No refresh logic to maintain.

---

## Layer 2: The Agent Loop

Every agent runs on a Vercel Cron Job. When it fires:

```
1. PERCEIVE   → Pull fresh data via Composio tools
2. REASON     → GPT-5.5 or o3-mini reasons over the data
3. DECIDE     → What needs action? What's changed? What's a pattern?
4. WRITE      → Update Notion Brain via Notion External Agents API
5. ACT        → If action needed: send email, create alert, queue action
6. REMEMBER   → Log to agent_runs in Supabase (lightweight)
```

### The 10 Agents — Mapped to Pricing Tiers

Each agent owns ONE clear job. Agents auto-activate based on which integrations the customer has connected. The pricing tier controls which agents the customer can run.

| # | Agent | Cron | Model | Min integrations | **Tier** |
|---|-------|------|-------|------------------|----------|
| 1 | **Revenue Agent** | Daily 7AM | gpt-5.5 | Stripe | Starter |
| 2 | **Collections Agent** | Daily 8AM | o3-mini | Stripe + Gmail | Starter |
| 3 | **Briefing Agent** | Monday 6AM | gpt-5.5 | (Reads from all active agents) | Starter |
| 4 | **Scope Agent** | Sunday 9AM | o3-mini | ClickUp/Asana + Harvest/Toggl | Growth |
| 5 | **Delivery Agent** | Monday 7AM | o3-mini | ClickUp/Asana | Growth |
| 6 | **Profitability Agent** | Weekly Sunday | gpt-5.5 | QuickBooks/Xero + Stripe + Harvest | Pro |
| 7 | **Team Agent** | Daily 6PM | o3-mini | Slack + Calendar + Harvest | Pro |
| 8 | **Growth Agent** | Weekly Friday | gpt-5.5 | HubSpot/Pipedrive + GA + Apollo | Pro |
| 9 | **Renewal Agent** | Daily 9AM | o3-mini | DocuSign + CRM | Pro |
| 10 | **Stack Agent** | Monthly 1st | o3-mini | QuickBooks/Xero | Pro |

### The COO Chat Agent (reactive, always available)
- Fires when customer sends a message
- Reads from Notion Brain as memory context
- Uses Composio tools to pull live data on demand
- Writes new patterns/findings back to Notion
- **Included in: Growth + Pro** (Starter has briefing-only)

---

### Tier → Agent Mapping (Customer-Facing Story)

#### **Starter — $750/mo · 3 agents**

| Agent | What it does |
|-------|-------------|
| Revenue Agent | Tracks MRR, churn signals, revenue health daily |
| Collections Agent | Watches overdue invoices, sends payment follow-ups |
| Briefing Agent | Monday morning summary of the week's business state |

*The minimum viable AI ops team. Solo founders, small agencies, anyone with Stripe + Gmail.*

---

#### **Growth — $1,500/mo · 5 agents + COO chat**

Everything in Starter, **plus:**

| Agent | What it does |
|-------|-------------|
| Scope Agent | Detects scope creep, flags retainer overruns weekly |
| Delivery Agent | Tracks project deadlines, alerts on late tasks |
| **COO Chat** | Ask questions, get real answers — "which client is at risk?" |

*Standard agency setup. Add ClickUp/Asana + Harvest to unlock.*

---

#### **Pro — $3,000/mo · all 10 agents + COO chat + agentic actions*

Everything in Growth, **plus:**

| Agent | What it does |
|-------|-------------|
| Profitability Agent | Real per-client P&L — actual margin after salaries/tools/overhead |
| Team Agent | Utilization, burnout signals, capacity planning |
| Growth Agent | Pipeline health, channel ROI, win/loss patterns |
| Renewal Agent | Contract expiration tracking, renewal risk scoring |
| Stack Agent | Tool waste detection, redundant software flagging |

*Plus **Agentic Actions** — agents don't just alert, they act: send the invoice, draft the renewal email, send the PM nudge. 30-min undo. 5-evaluator safety net.*

*Mature agencies. Full stack connected: QuickBooks + Slack + Calendar + HubSpot + DocuSign.*

---

#### **Fractional Operator — $1,200/mo + $300/agency · For Partners**

Each managed agency gets **Growth-level agents (5 + COO chat)** — partner sees them aggregated across their book of business.

---

### Auto-Activation Rule

Agents only activate when their required integrations are connected. No empty agents, no confusion.

```
Customer signs up for Starter
  → Connects Stripe                    → Revenue Agent activates
  → Connects Gmail                     → Collections Agent activates
  → (Briefing Agent always on)

Customer upgrades to Growth
  → Connects ClickUp + Harvest         → Scope + Delivery Agents activate
  → COO Chat becomes available

Customer upgrades to Pro
  → Connects QuickBooks                → Profitability + Stack Agents activate
  → Connects Slack + Calendar          → Team Agent activates
  → Connects HubSpot                   → Growth Agent activates
  → Connects DocuSign                  → Renewal Agent activates
```

Each agent card on `/dashboard/agents` shows:
- **Active** (green) — running, has data
- **Ready** (blue) — tier allows it, but missing integration
- **Locked** (grey) — requires tier upgrade

---

## Layer 3: Notion Brain (Customer-Owned)

### Setup Flow (one-time, on customer onboarding)

```
1. Customer clicks "Connect Notion" on OpsRadar
2. Notion OAuth — customer authorizes OpsRadar integration
3. OpsRadar creates "OpsRadar Brain" workspace in their Notion
4. Creates all 20 databases with correct schema
5. Done — agents start writing on next cron run
```

### How Agents Write to Notion

Using Notion's External Agents API (launched May 13 2026):

```typescript
// Agent writes a client health update
await notion.databases.query({ database_id: clientsDbId, ... })
await notion.pages.update({
  page_id: clientPageId,
  properties: {
    'Churn risk score': { number: 78 },
    'Margin status': { select: { name: 'Critical' } },
    'Last COO review': { date: { start: new Date().toISOString() } }
  }
})
```

### How COO Chat Reads from Notion

When customer sends a message, COO chat:
1. Queries relevant Notion databases (Clients, KPI Snapshots, Risk Register, Patterns)
2. Formats as context in the system prompt
3. Responds with full business awareness

```typescript
// COO reads the brain before answering
const [clients, kpis, risks, patterns] = await Promise.all([
  notion.databases.query({ database_id: clientsDbId }),
  notion.databases.query({ database_id: kpiDbId, page_size: 12 }), // last 12 weeks
  notion.databases.query({ database_id: risksDbId, filter: { status: 'Open' } }),
  notion.databases.query({ database_id: patternsDbId })
])
// Inject as COO system prompt context
```

---

## Layer 4: Action Engine

When agents decide to act (not just observe), they go through the Action Engine:

```
Agent decision → Action queue (Supabase) → Human review (optional) → Execute
```

### Actions agents can take:
| Action | How | Auth |
|--------|-----|------|
| Send collection email | Gmail via Composio | Auto (within rules) |
| Send scope alert to PM | Slack via Composio | Auto |
| Create Notion risk entry | Notion API | Auto |
| Flag for owner review | OpsRadar action queue | Always |
| Schedule client meeting | Calendly via Composio | Owner approval |
| Draft contract renewal email | Gmail draft via Composio | Owner approval |

**Human-in-the-loop rule:** Destructive or customer-facing actions require owner approval. Internal writes (Notion, Slack to team) are automatic.

---

## Layer 5: Supabase (Auth + Config Only)

Supabase stays lean — it never touches business data:

```
Tables:
- users                    (auth)
- user_integrations        (composio_connection_id per tool)
- agent_config             (which agents enabled, cron settings)
- agent_runs               (lightweight: agent, timestamp, status, summary)
- notion_config            (workspace_id, database_ids per customer)
- action_queue             (pending human-approval actions)
- alert_rules              (custom thresholds per customer)
- chat_sessions            (COO chat history)
```

Business data lives in Notion (customer-owned) and source tools (Stripe etc).
OpsRadar never stores it.

---

## The Full Data Flow

```
Monday 6:00AM — Briefing Agent fires
│
├── Composio pulls: Stripe (MRR, invoices), HubSpot (pipeline),
│   ClickUp (project status), Harvest (utilization), Gmail (last contact dates)
│
├── gpt-5.5 reasons over full business state
│
├── Writes to Notion:
│   ├── Updates `Weekly KPI Snapshots` (new row)
│   ├── Updates `Clients` (churn risk scores, margin status)
│   ├── Updates `Risk Register` (new/resolved risks)
│   └── Creates `Weekly Briefings` entry
│
├── Sends Monday morning email to owner (Resend)
│
└── Logs run to Supabase agent_runs

Monday 9:00AM — Owner opens email, clicks through to Notion
│
└── Sees full business state in their own workspace
    ├── Client X flagged red (churn risk 84)
    ├── New pattern detected: "Project Y always slips"
    ├── $12,400 overdue — Collections agent already sent 2 reminders
    └── Team at 94% utilization — hiring needed
```

---

## Why This Architecture Wins

| Problem | Solution |
|---------|---------|
| Maintaining 10+ API adapters | Composio handles all 500+ tools |
| Storing sensitive client data | Never stored — Notion is customer's, source stays in Stripe/HubSpot |
| Vendor lock-in | Customer owns Notion Brain forever |
| Adding new integrations | Composio connection, no new adapter code |
| Agent memory | Notion Brain IS the memory — persists, grows, compounds |
| COO context | Reads Notion before every answer — full business awareness |
| Customer transparency | They see everything the agent did, can edit or override |
| Accounting (P&L) | QuickBooks/Xero via Composio — unlocked immediately |

---

## Build Sequence

### Week 1: Foundation
- [ ] Wire Composio SDK into OpsRadar
- [ ] Replace existing adapters with Composio tool calls
- [ ] Add Notion OAuth to integrations page
- [ ] Build Notion Brain setup (create 20 databases on connect)

### Week 2: Agents
- [ ] Revenue Agent → reads Stripe/QB via Composio, writes to Notion
- [ ] Collections Agent → reads Stripe, sends Gmail via Composio
- [ ] Scope Agent → reads ClickUp/Harvest, writes to Notion
- [ ] Delivery Agent → reads ClickUp, writes to Notion
- [ ] Briefing Agent → reads all Notion DBs, writes briefing, sends email

### Week 3: COO Chat upgrade
- [ ] Wire COO chat to read Notion Brain as memory
- [ ] Wire COO chat to use Composio tools for live lookups
- [ ] Test full loop: agent writes → customer reads → COO chat answers

### Week 4: Polish
- [ ] Add new integrations: Gmail, Slack, Google Calendar, QuickBooks/Xero
- [ ] Human-in-the-loop approval UI for sensitive actions
- [ ] Customer can configure which agents are active
- [ ] Customer can see agent action log in dashboard
