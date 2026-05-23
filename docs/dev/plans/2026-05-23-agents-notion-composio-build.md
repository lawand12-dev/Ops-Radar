# Plan: Agents + Notion + Composio Build

**Created:** 2026-05-23
**Status:** Ready to execute
**Estimated:** 4 weeks (1 week per phase)

This is the executable spec for rebuilding OpsRadar as a customer-owned, Composio-powered, 10-agent platform. Hand this to a new session or to Atta — it should execute without ambiguity.

Read these companion docs first:
- [`docs/dev/agents-notion-architecture-2026.md`](../agents-notion-architecture-2026.md) — architecture
- [`docs/dev/notion-brain-schema-2026.md`](../notion-brain-schema-2026.md) — full 20-database schema
- [`docs/dev/agents-architecture-2026.md`](../agents-architecture-2026.md) — agent research

---

## 0. Prerequisites (Manual Setup — Day 0)

Before any code is written, set up the external accounts:

### 0.1 Composio Account
- Sign up at [composio.dev](https://composio.dev)
- Start on **free tier** (20K tool calls/month)
- Create a project for OpsRadar
- Note the API key → add to `.env.local` as `COMPOSIO_API_KEY`
- Enable these toolkits in Composio dashboard:
  - Stripe, HubSpot, Pipedrive, ClickUp, Asana, Harvest, Toggl, Apollo, Calendly
  - Gmail, Slack, Google Calendar, Google Analytics
  - QuickBooks, Xero, BambooHR, Gusto
  - DocuSign, Typeform, LinkedIn, Notion

### 0.2 Notion Integration
- Go to [notion.so/profile/integrations](https://notion.so/profile/integrations)
- Click "New integration" → "Public integration" (for customer OAuth)
- Name: "OpsRadar Brain"
- Capabilities: Read content, Update content, Insert content, Read user info
- Note: integration token (internal) + OAuth client ID/secret (public)
- Add to `.env.local`:
  - `NOTION_OAUTH_CLIENT_ID`
  - `NOTION_OAUTH_CLIENT_SECRET`
  - `NOTION_OAUTH_REDIRECT_URI=https://opsradar.com/api/notion/callback`

### 0.3 Vercel Queues (or Inngest)
- Enable Vercel Queues in the OpsRadar project
- OR sign up at [inngest.com](https://inngest.com) free tier
- Note keys → add to `.env.local`

### 0.4 Environment Variables Summary

Add to `.env.local` and `.env.example`:
```bash
# Composio
COMPOSIO_API_KEY=

# Notion
NOTION_OAUTH_CLIENT_ID=
NOTION_OAUTH_CLIENT_SECRET=
NOTION_OAUTH_REDIRECT_URI=

# Inngest (or Vercel Queues — pick one)
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

---

## Phase 1: Composio Migration (Week 1)

**Goal:** Replace 10 direct API adapters with one Composio client. Customer state moves from "API keys in Supabase" to "Composio connection IDs in Supabase."

### 1.1 Install Composio SDK

⚠ **`composio-core` is deprecated** (npm marks it "Package no longer supported"). Install the new packages:

```bash
npm install @composio/core @composio/vercel ai @ai-sdk/openai
```

Why all four:
- `@composio/core` — the new client SDK
- `@composio/vercel` — exposes a `VercelProvider` so Composio tools work natively with the Vercel AI SDK's `generateText` / `streamText`
- `ai` — Vercel AI SDK (matches our stated stack)
- `@ai-sdk/openai` — model adapter (swap for `@ai-sdk/anthropic` per-agent if needed)

### 1.2 Create `src/lib/composio.ts`
Lazy singleton paired with the Vercel provider:

```typescript
import { Composio } from '@composio/core'
import { VercelProvider } from '@composio/vercel'

let _composio: Composio<VercelProvider> | null = null

export function getComposio() {
  if (_composio) return _composio
  const apiKey = (process.env.COMPOSIO_API_KEY ?? '').trim()
  if (!apiKey) throw new Error('COMPOSIO_API_KEY is not set')
  _composio = new Composio({ apiKey, provider: new VercelProvider() })
  return _composio
}
```

API surface changed from the deprecated SDK — note the renamed methods:
- `toolkits.list()` → `toolkits.getToolkits()`
- `OpenAIToolset.getTools()` → `composio.tools.get(userId, { toolkits })`
- Tool slugs are now **lowercase** (`'stripe'`, not `'STRIPE'`)

### 1.3 New Supabase Table: `composio_connections`
```sql
create table composio_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  tool_slug text not null,           -- e.g. 'stripe', 'hubspot', 'gmail'
  composio_connection_id text not null,
  connected_at timestamptz default now(),
  is_active boolean default true,
  unique (user_id, tool_slug)
);

create index on composio_connections (user_id);

alter table composio_connections enable row level security;
create policy "users read own connections" on composio_connections
  for select using (auth.uid() = user_id);
```

### 1.4 OAuth Flow Per Tool

For each tool the customer wants to connect:
1. Customer clicks "Connect Stripe" on `/dashboard/integrations`
2. Backend calls `composio.connectedAccounts.initiate({ appName: 'stripe', userId })`
3. Composio returns OAuth URL → redirect customer
4. Customer authorizes
5. Composio webhook fires `connection.created`
6. Webhook handler at `/api/composio/webhook/route.ts` saves `composio_connection_id` to Supabase

### 1.5 Migrate `src/lib/integrations/` → Composio Helpers

For each existing integration (stripe, hubspot, clickup, harvest, pipedrive, apollo, asana, monday, toggl, calendly):

Replace `validate*Key()` + `fetch*Data()` with Composio tool calls. Pattern:
```typescript
// src/lib/integrations/composio-stripe.ts
import { composio } from '<npm>/lib/composio'

export async function fetchStripeMRR(userId: string) {
  const tools = await composio.getTools({
    userId,
    appNames: ['stripe'],
    actions: ['STRIPE_LIST_SUBSCRIPTIONS', 'STRIPE_LIST_INVOICES'],
  })
  // agent calls these tools via the SDK
}
```

### 1.6 Update Dashboard API Routes

Each route in `src/app/api/dashboard/` that calls a direct adapter (`finance/`, `sales/`, `time-tracking/`, `delivery/`, etc.) gets updated to use the Composio helper.

**Critical:** Keep the existing endpoint contracts unchanged. The dashboard frontend should not need updating.

### 1.7 Update Integrations Page UI

`/dashboard/integrations` page:
- Show all 21 supported tools (was 10)
- Each tool card shows: connect / connected / reconnect states
- "Connect" button → triggers Composio OAuth flow
- Remove the old "paste API key" inputs

### 1.8 Delete Old Adapter Files

After verifying Composio works for each tool, delete:
- `src/lib/integrations/stripe/`
- `src/lib/integrations/hubspot/`
- `src/lib/integrations/clickup/`
- `src/lib/integrations/harvest/`
- `src/lib/integrations/pipedrive/`
- `src/lib/integrations/apollo/`
- `src/lib/integrations/asana/`
- `src/lib/integrations/monday/`
- `src/lib/integrations/toggl/`
- `src/lib/integrations/calendly/`
- `src/lib/integrations/crypto.ts` (no more API key encryption needed)

---

## Phase 2: Notion Brain Setup (Week 2)

**Goal:** Customer connects Notion. OpsRadar creates the 20 databases inside their workspace.

### 2.1 Install Notion SDK
```bash
npm install @notionhq/client
```

### 2.2 New Supabase Table: `notion_workspaces`
```sql
create table notion_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace_id text not null,
  workspace_name text,
  access_token text not null,        -- encrypted via existing crypto.ts pattern
  bot_id text,
  parent_page_id text not null,      -- the "OpsRadar Brain" page
  connected_at timestamptz default now(),
  databases jsonb not null default '{}'::jsonb  -- { clients_db_id: '...', kpi_db_id: '...', ... }
);

alter table notion_workspaces enable row level security;
create policy "users read own workspace" on notion_workspaces
  for select using (auth.uid() = user_id);
```

### 2.3 Notion OAuth Flow

New routes:
- `GET /api/notion/connect` — redirect to Notion OAuth
- `GET /api/notion/callback` — exchange code for token, save to Supabase, trigger database creation

### 2.4 Database Creator: `src/lib/notion/create-brain.ts`

On first connect, create 20 databases under a parent "OpsRadar Brain" page. Schema is defined in [`docs/dev/notion-brain-schema-2026.md`](../notion-brain-schema-2026.md) — implement EXACTLY as specified there.

Pattern per database:
```typescript
async function createClientsDatabase(notion: Client, parentPageId: string) {
  return notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    title: [{ text: { content: '🏢 Clients' } }],
    properties: {
      'Client name': { title: {} },
      'Status': { select: { options: [
        { name: 'Active', color: 'green' },
        { name: 'At-risk', color: 'yellow' },
        { name: 'Churned', color: 'red' },
        { name: 'Prospect', color: 'blue' },
      ]}},
      'Monthly retainer value': { number: { format: 'dollar' } },
      // ... all columns from schema doc
    },
  })
}
```

Create all 20 databases sequentially. Save each returned `database.id` to the `databases` JSONB column.

### 2.5 Notion Read/Write Helpers: `src/lib/notion/helpers.ts`

```typescript
export async function appendKpiSnapshot(userId: string, snapshot: {...}) { ... }
export async function upsertClient(userId: string, client: {...}) { ... }
export async function appendPatternCard(userId: string, pattern: {...}) { ... }
export async function appendRiskRegister(userId: string, risk: {...}) { ... }
export async function appendActionLog(userId: string, action: {...}) { ... }
// ... one helper per database
```

Each helper handles: get database_id from Supabase → call Notion API → handle rate limits.

### 2.6 Notion in Integrations Page

`/dashboard/integrations` — add Notion as the **first** integration, marked "Required for AI COO."

---

## Phase 3: Agent Rebuild (Week 3)

**Goal:** 10 agents. Each runs on cron. Each writes to Notion. Tier-gated.

### 3.1 New Supabase Tables

```sql
create table agent_config (
  user_id uuid references auth.users(id) on delete cascade,
  agent_slug text not null,    -- 'revenue', 'collections', 'scope', ...
  is_enabled boolean default true,
  last_run_at timestamptz,
  last_run_status text,        -- 'success' | 'failed' | 'skipped'
  custom_config jsonb,
  primary key (user_id, agent_slug)
);

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  agent_slug text not null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  status text not null,
  summary text,
  actions_taken int default 0,
  patterns_detected int default 0,
  risks_flagged int default 0,
  tokens_used int,
  error_message text
);

create index on agent_runs (user_id, started_at desc);

alter table agent_config enable row level security;
alter table agent_runs enable row level security;
-- standard "users read own" policies
```

### 3.2 Agent Loop Helper: `src/lib/agents/loop.ts`

Reusable agent runner. Each agent imports this:
```typescript
export async function runAgent(opts: {
  userId: string
  agentSlug: string
  systemPrompt: string
  model: 'gpt-5.5' | 'o3-mini'
  composioApps: string[]      // which tools the agent needs
  maxSteps: number
  onComplete: (result) => Promise<void>  // writes to Notion
}) {
  // 1. Check tier allows this agent (read from user's subscription)
  // 2. Check required integrations connected (read composio_connections)
  // 3. Pull Composio tools for the agent
  // 4. Run generateText() with tools + maxSteps
  // 5. Write outcome to agent_runs in Supabase
  // 6. Call onComplete → writes results to Notion
}
```

### 3.3 Build Each Agent

Create `src/lib/agents/[agent-name]/index.ts` for each of the 10 agents. Use the mapping from [`agents-notion-architecture-2026.md`](../agents-notion-architecture-2026.md):

| Agent | File | Cron schedule | Model |
|-------|------|--------------|-------|
| Revenue | `src/lib/agents/revenue/index.ts` | `0 7 * * *` | gpt-5.5 |
| Collections | `src/lib/agents/collections/index.ts` | `0 8 * * *` | o3-mini |
| Scope | `src/lib/agents/scope/index.ts` | `0 9 * * 0` | o3-mini |
| Delivery | `src/lib/agents/delivery/index.ts` | `0 7 * * 1` | o3-mini |
| Briefing | `src/lib/agents/briefing/index.ts` | `0 6 * * 1` | gpt-5.5 |
| Profitability | `src/lib/agents/profitability/index.ts` | `0 9 * * 0` | gpt-5.5 |
| Team | `src/lib/agents/team/index.ts` | `0 18 * * *` | o3-mini |
| Growth | `src/lib/agents/growth/index.ts` | `0 9 * * 5` | gpt-5.5 |
| Renewal | `src/lib/agents/renewal/index.ts` | `0 9 * * *` | o3-mini |
| Stack | `src/lib/agents/stack/index.ts` | `0 9 1 * *` | o3-mini |

### 3.4 Cron Endpoint Per Agent

`src/app/api/cron/agents/[agent]/route.ts` — Vercel Cron calls each. Each endpoint:
1. Lists all users where `agent_config.is_enabled = true` for this agent
2. For each user → calls `runAgent()` with that agent's spec
3. Logs to `agent_runs`

Add cron jobs to `vercel.json` (or `vercel.ts`):
```typescript
crons: [
  { path: '/api/cron/agents/revenue', schedule: '0 7 * * *' },
  { path: '/api/cron/agents/collections', schedule: '0 8 * * *' },
  // ... etc
]
```

### 3.5 Tier Gating

`src/lib/agents/tier-gate.ts`:
```typescript
const TIER_AGENTS = {
  starter:  ['revenue', 'collections', 'briefing'],
  growth:   ['revenue', 'collections', 'briefing', 'scope', 'delivery'],
  pro:      ['revenue', 'collections', 'briefing', 'scope', 'delivery',
             'profitability', 'team', 'growth', 'renewal', 'stack'],
} as const

export async function isAgentAllowed(userId: string, agentSlug: string) {
  // read user's tier from existing subscription table
  // return tier in TIER_AGENTS map includes agentSlug
}
```

### 3.6 COO Chat Upgrade

`src/app/api/dashboard/coo/route.ts` — update to:
1. Read from Notion Brain (last 12 weeks KPIs, all clients, open risks, active patterns)
2. Pass as system prompt context
3. Use Composio tools for live lookups (instead of direct API calls)
4. Write new patterns/risks back to Notion via the helpers

---

## Phase 4: UI + Tier Gating (Week 4)

### 4.1 New Page: `/dashboard/agents`

`src/app/dashboard/agents/page.tsx` + `_components/agent-card.tsx`:

Grid of 10 cards. Each shows:
- Icon + agent name
- One-line description (what it watches)
- State badge: 🟢 Active / 🔵 Ready (missing integration) / ⚫ Locked (tier)
- Last run timestamp + outcome
- Toggle enable/disable
- Required integrations list

### 4.2 Agent Detail Page

`/dashboard/agents/[slug]` — full history of runs, configuration, override options.

### 4.3 Backfill Workflow (Inngest or Vercel Queues)

When customer connects an integration for the first time, trigger backfill:

```typescript
// src/lib/backfill/orchestrator.ts
export const backfillIntegration = inngest.createFunction(
  { id: 'backfill-integration', retries: 3 },
  { event: 'integration/connected' },
  async ({ event, step }) => {
    // Step 1: pull current state (< 30s)
    await step.run('pull-current', () => pullCurrent(event.data))

    // Step 2: pull 90 days (5-10 min)
    await step.run('pull-90d', () => pull90Days(event.data))

    // Step 3: pull 12 months + pattern detection (30 min - 2hr)
    await step.run('pull-12mo', () => pull12Months(event.data))

    // Step 4: notify customer
    await step.run('notify', () => sendBackfillCompleteEmail(event.data))
  }
)
```

### 4.4 Tier Gate in Sidebar

Update `src/app/dashboard/_components/` sidebar — agents page shows locked agents for upgrade prompts.

---

## Phase 5: Polish + Launch (Final)

### 5.1 Migrate Existing Action Evaluators

The 7 existing action evaluators in `src/lib/actions/evaluators/` get absorbed into the new agents:
- `invoice-reminder.ts` → Collections Agent
- `margin-alert.ts` → Profitability Agent
- `scope-approaching.ts` + `hours-budget.ts` → Scope Agent
- `cash-flow.ts` → Revenue Agent
- `capacity-drift.ts` → Team Agent
- `pattern-alert.ts` → Pattern detection (cross-agent)

Delete evaluator files once their logic moves into the agents.

### 5.2 Update Pricing Page

`src/app/pricing/page.tsx` — update tier descriptions to mention the 3 / 5 / 10 agents.

### 5.3 Update Marketing Copy

`/`, `/product`, `/how-it-works` — update language to "Your AI Ops Team" with the 10 agents framing.

### 5.4 Update `docs/copy/pricing.md`

Reflect the agent-count split.

### 5.5 Final Cleanup

- Delete `src/lib/coo/semantic-retrieval.ts` (knowledge moves into Notion)
- Delete `src/lib/diorization/` (Notion replaces diorization)
- Delete `src/lib/briefing.ts` standalone (becomes Briefing Agent)
- Update CLAUDE.md to reflect the new architecture

---

## Files to Create (Summary)

| Path | Purpose |
|------|---------|
| `src/lib/composio.ts` | Composio client |
| `src/lib/integrations/composio-*.ts` (x21) | Per-tool Composio helpers |
| `src/lib/notion/client.ts` | Notion SDK wrapper |
| `src/lib/notion/create-brain.ts` | Creates 20 databases on connect |
| `src/lib/notion/helpers.ts` | Read/write helpers per database |
| `src/lib/agents/loop.ts` | Shared agent runner |
| `src/lib/agents/[10 agents]/index.ts` | One file per agent |
| `src/lib/agents/tier-gate.ts` | Tier → agent mapping enforcement |
| `src/lib/backfill/orchestrator.ts` | Durable backfill workflow |
| `src/app/api/composio/webhook/route.ts` | Composio webhook handler |
| `src/app/api/notion/connect/route.ts` | Notion OAuth init |
| `src/app/api/notion/callback/route.ts` | Notion OAuth callback |
| `src/app/api/cron/agents/[agent]/route.ts` (x10) | Cron endpoint per agent |
| `src/app/dashboard/agents/page.tsx` | Agent management UI |
| `src/app/dashboard/agents/[slug]/page.tsx` | Agent detail page |
| `src/app/dashboard/agents/_components/agent-card.tsx` | Reusable agent card |

## Files to Delete (Summary)

| Path | Replaced by |
|------|-------------|
| `src/lib/integrations/{stripe,hubspot,clickup,harvest,pipedrive,apollo,asana,monday,toggl,calendly}/` | Composio |
| `src/lib/integrations/crypto.ts` | No longer needed (Composio holds tokens) |
| `src/lib/coo/semantic-retrieval.ts` | Notion as memory |
| `src/lib/coo/brain-search.ts` | Notion as memory |
| `src/lib/diorization/*` | Notion as memory |
| `src/lib/briefing.ts` | Briefing Agent |
| `src/lib/actions/evaluators/*` | Absorbed into agents |

## Database Migrations

```sql
-- New tables
composio_connections
notion_workspaces
agent_config
agent_runs

-- Tables to drop (after migration verified)
user_integrations (replaced by composio_connections)
breadcrumbs (replaced by Notion)
pattern_cards (replaced by Notion Patterns DB)
```

---

## Testing Approach

### Unit
- Each Notion helper has a test using Notion SDK mocks
- Agent loop has a test with mock Composio + mock OpenAI

### Integration
- Test each agent end-to-end with a sandbox Composio account + test Notion workspace
- Verify backfill runs and writes correct row counts

### Manual QA
- Connect Stripe → confirm Revenue Agent runs → confirm Notion row appears
- Connect Notion → confirm 20 databases created
- Test tier gating: downgrade to Starter, confirm Scope Agent stops running

---

## Rollback Strategy

Each phase is independently revertable:

- **Phase 1 rollback:** keep old `src/lib/integrations/` until Phase 1 verified. Toggle via env flag `USE_COMPOSIO=true`.
- **Phase 2 rollback:** Notion is additive — if it fails, customer just doesn't have a brain yet.
- **Phase 3 rollback:** New agents live alongside old action evaluators initially. Cut over per-agent.
- **Phase 4 rollback:** UI changes are isolated to `/dashboard/agents` route.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Composio rate limits during backfill | Use Inngest with built-in throttling + retry |
| Notion API rate limits (3 req/sec per integration) | Queue Notion writes through Inngest with throttling |
| Customer's Notion workspace deleted | Detect via Notion webhook, send re-connect email |
| Composio outage breaks all dashboard data | Cache last successful fetch in Redis (existing pattern) |
| LLM costs explode | Token tracking per agent_run, alert at 90% of monthly budget |

---

## Success Criteria

- [ ] All 21 supported tools connect via Composio OAuth
- [ ] Customer can connect Notion and see all 20 databases created
- [ ] 5 launch agents run on cron and write to Notion (Starter + Growth tier)
- [ ] 5 expansion agents run when their tier + integrations met
- [ ] COO Chat reads from Notion as memory
- [ ] Backfill workflow completes within 2 hours for 12 months of data
- [ ] No client raw data persisted in OpsRadar's Supabase
- [ ] `/dashboard/agents` shows correct state per agent per customer
- [ ] Pricing tiers enforce agent access correctly

---

## Hand-off Notes

When you start the new session to execute this:

1. **Read this plan + the 3 companion docs first** before writing any code
2. **Set up Composio + Notion accounts (Phase 0)** before touching any code
3. **Phase 1 first** — Composio migration. Without this, the agents have nothing to call.
4. **Don't skip the rollback flags** — they're what let you ship incrementally without breaking the demo
5. **Update CLAUDE.md** at the end so future sessions know the new architecture

---

**The strategy is locked. The architecture is documented. The build is sequenced. Time to execute.**
