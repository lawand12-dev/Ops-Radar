# Spec: Agents + Notion + Composio Design

**Created:** 2026-05-23
**Companion to:** [`plans/2026-05-23-agents-notion-composio-build.md`](../plans/2026-05-23-agents-notion-composio-build.md)
**Architecture:** [`agents-notion-architecture-2026.md`](../agents-notion-architecture-2026.md)
**Notion schema:** [`notion-brain-schema-2026.md`](../notion-brain-schema-2026.md)

The detailed technical design. Every schema, every API contract, every agent prompt. Implement from this.

---

## 1. Database Schemas (Supabase)

### 1.1 `composio_connections`

```sql
create table composio_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_slug text not null,                    -- 'stripe', 'hubspot', 'gmail', etc.
  composio_connection_id text not null,
  connected_at timestamptz not null default now(),
  last_used_at timestamptz,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, tool_slug)
);

create index on composio_connections (user_id);
create index on composio_connections (user_id, is_active) where is_active = true;

alter table composio_connections enable row level security;
create policy "users own composio" on composio_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### 1.2 `notion_workspaces`

```sql
create table notion_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace_id text not null,
  workspace_name text,
  bot_id text,
  access_token_encrypted text not null,
  parent_page_id text not null,               -- the "OpsRadar Brain" page id
  databases jsonb not null default '{}'::jsonb, -- { clients: 'db_id', kpi_snapshots: 'db_id', ... }
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  backfill_status text not null default 'pending'
    check (backfill_status in ('pending', 'phase1', 'phase2', 'phase3', 'complete', 'failed')),
  backfill_error text
);

alter table notion_workspaces enable row level security;
create policy "users own notion workspace" on notion_workspaces
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### 1.3 `agent_config`

```sql
create table agent_config (
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_slug text not null,
  is_enabled boolean not null default true,
  last_run_at timestamptz,
  last_run_status text,                       -- 'success' | 'failed' | 'skipped'
  custom_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, agent_slug)
);

alter table agent_config enable row level security;
create policy "users own agent config" on agent_config
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### 1.4 `agent_runs`

```sql
create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_slug text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'success', 'failed', 'skipped')),
  summary text,
  actions_taken int not null default 0,
  patterns_detected int not null default 0,
  risks_flagged int not null default 0,
  notion_writes int not null default 0,
  tokens_used int,
  cost_cents int,
  error_message text
);

create index on agent_runs (user_id, started_at desc);
create index on agent_runs (agent_slug, started_at desc);

alter table agent_runs enable row level security;
create policy "users read own agent runs" on agent_runs
  for select using (auth.uid() = user_id);
```

---

## 2. Composio Integration Design

### 2.1 Tool Slugs (canonical)

```typescript
export const COMPOSIO_TOOLS = {
  stripe: 'STRIPE',
  hubspot: 'HUBSPOT',
  pipedrive: 'PIPEDRIVE',
  clickup: 'CLICKUP',
  asana: 'ASANA',
  monday: 'MONDAY',
  harvest: 'HARVEST',
  toggl: 'TOGGL',
  apollo: 'APOLLO',
  calendly: 'CALENDLY',
  gmail: 'GMAIL',
  slack: 'SLACK',
  google_calendar: 'GOOGLECALENDAR',
  google_analytics: 'GOOGLEANALYTICS',
  google_ads: 'GOOGLEADS',
  facebook_ads: 'FACEBOOKADS',
  quickbooks: 'QUICKBOOKS',
  xero: 'XERO',
  bamboo_hr: 'BAMBOOHR',
  gusto: 'GUSTO',
  docusign: 'DOCUSIGN',
  typeform: 'TYPEFORM',
  linkedin: 'LINKEDIN',
  intercom: 'INTERCOM',
  zendesk: 'ZENDESK',
} as const

export type ToolSlug = keyof typeof COMPOSIO_TOOLS
```

### 2.2 Connection Initiation API

`POST /api/composio/connect`
```typescript
// Request
{ tool_slug: ToolSlug }

// Response
{ oauth_url: string, connection_id: string }
```

Implementation:
```typescript
import { Composio } from 'composio-core'

const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY })

const conn = await composio.connectedAccounts.initiate({
  appName: COMPOSIO_TOOLS[tool_slug],
  userId: userId,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?connected=${tool_slug}`,
})

// Save pending connection to Supabase
await supabase.from('composio_connections').upsert({
  user_id: userId,
  tool_slug,
  composio_connection_id: conn.connectedAccountId,
  is_active: false,  // becomes true when webhook confirms
})

return { oauth_url: conn.redirectUrl, connection_id: conn.connectedAccountId }
```

### 2.3 Webhook Handler

`POST /api/composio/webhook` — Composio calls this when connection completes:

```typescript
// Composio sends:
{
  event: 'connection.created' | 'connection.failed',
  connectedAccountId: string,
  userId: string,
  appName: string,
}
```

Handler updates `is_active = true` on success.

### 2.4 Tool Call Pattern

When an agent needs to fetch data:
```typescript
import { OpenAIToolset } from 'composio-core'

const toolset = new OpenAIToolset({ apiKey: process.env.COMPOSIO_API_KEY })

const tools = await toolset.getTools({
  apps: ['stripe', 'quickbooks'],
  userId: customerId,
})

// Pass to OpenAI as tools[]
const completion = await openai.chat.completions.create({
  model: 'gpt-5.5',
  messages: [...],
  tools,
})

// Execute tool calls via Composio
const results = await toolset.handleToolCall(completion, customerId)
```

---

## 3. Notion Integration Design

### 3.1 OAuth Flow

`GET /api/notion/connect`:
```typescript
const url = new URL('https://api.notion.com/v1/oauth/authorize')
url.searchParams.set('client_id', process.env.NOTION_OAUTH_CLIENT_ID)
url.searchParams.set('redirect_uri', process.env.NOTION_OAUTH_REDIRECT_URI)
url.searchParams.set('response_type', 'code')
url.searchParams.set('owner', 'user')
url.searchParams.set('state', generateCSRFToken(userId))

return NextResponse.redirect(url)
```

`GET /api/notion/callback?code=...&state=...`:
```typescript
const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
  method: 'POST',
  headers: {
    Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.NOTION_OAUTH_REDIRECT_URI,
  }),
})

const { access_token, workspace_id, workspace_name, bot_id, owner } = await tokenRes.json()

// Encrypt access_token using existing crypto.ts pattern
const encrypted = encrypt(access_token)

// Create parent page "OpsRadar Brain"
const notion = new Client({ auth: access_token })
const parentPage = await notion.pages.create({
  parent: { type: 'workspace', workspace: true },
  properties: {
    title: { title: [{ text: { content: 'OpsRadar Brain' } }] },
  },
})

// Create all 20 databases
const databases = await createAllDatabases(notion, parentPage.id)

// Save to Supabase
await supabase.from('notion_workspaces').insert({
  user_id: userId,
  workspace_id,
  workspace_name,
  bot_id,
  access_token_encrypted: encrypted,
  parent_page_id: parentPage.id,
  databases,
})

// Trigger backfill
await inngest.send({ name: 'notion/connected', data: { userId } })

return NextResponse.redirect('/dashboard/integrations?notion=connected')
```

### 3.2 Database Creation — Exact Schema Per Database

All 20 databases must be created with the EXACT schema from [`notion-brain-schema-2026.md`](../notion-brain-schema-2026.md). Below are the 5 most important ones (others follow the same pattern):

#### `Clients` database
```typescript
{
  parent: { type: 'page_id', page_id: parentPageId },
  icon: { type: 'emoji', emoji: '🏢' },
  title: [{ text: { content: 'Clients' } }],
  properties: {
    'Client name': { title: {} },
    'Status': { select: { options: [
      { name: 'Active', color: 'green' },
      { name: 'At-risk', color: 'yellow' },
      { name: 'Churned', color: 'red' },
      { name: 'Prospect', color: 'blue' },
    ]}},
    'Monthly retainer value': { number: { format: 'dollar' } },
    'Contract start date': { date: {} },
    'Contract end date': { date: {} },
    'Service type': { multi_select: { options: [
      { name: 'SEO' }, { name: 'Paid' }, { name: 'Social' },
      { name: 'Web' }, { name: 'PR' },
    ]}},
    'Monthly hours budget': { number: {} },
    'Avg hours logged/mo': { number: {} },
    'Actual margin %': { number: { format: 'percent' } },
    'Margin status': { select: { options: [
      { name: 'Healthy', color: 'green' },
      { name: 'Warning', color: 'yellow' },
      { name: 'Critical', color: 'red' },
    ]}},
    'Payment behaviour': { select: { options: [
      { name: 'Always on time', color: 'green' },
      { name: 'Sometimes late', color: 'yellow' },
      { name: 'Chronic', color: 'red' },
    ]}},
    'Avg days to pay': { number: {} },
    'Scope creep incidents (6mo)': { number: {} },
    'Churn risk score': { number: {} },
    'Lifetime value': { number: { format: 'dollar' } },
    'Difficulty score': { number: {} },
    'NPS score': { number: {} },
    'Days since last contact': { number: {} },
    'Ghost risk': { checkbox: {} },
    'Last COO review': { date: {} },
    'Notes': { rich_text: {} },
  },
}
```

#### `Weekly KPI Snapshots` database
```typescript
{
  parent: { type: 'page_id', page_id: parentPageId },
  icon: { type: 'emoji', emoji: '📈' },
  title: [{ text: { content: 'Weekly KPI Snapshots' } }],
  properties: {
    'Week ending': { title: {} },             // date as text title for sort
    'MRR': { number: { format: 'dollar' } },
    'Cash collected MTD': { number: { format: 'dollar' } },
    'Outstanding invoices': { number: { format: 'dollar' } },
    'Overdue invoices (30d+)': { number: { format: 'dollar' } },
    'Total clients': { number: {} },
    'Active clients': { number: {} },
    'Avg margin %': { number: { format: 'percent' } },
    'Team utilization %': { number: { format: 'percent' } },
    'Hours logged total': { number: {} },
    'Billable hours %': { number: { format: 'percent' } },
    'New deals closed': { number: {} },
    'Pipeline value': { number: { format: 'dollar' } },
    'Churn this week': { number: {} },
    'Net revenue change': { number: { format: 'dollar' } },
    'Net margin %': { number: { format: 'percent' } },
    'Gross profit': { number: { format: 'dollar' } },
    'Agent summary': { rich_text: {} },
  },
}
```

#### `Pattern Cards` database
```typescript
{
  parent: { type: 'page_id', page_id: parentPageId },
  icon: { type: 'emoji', emoji: '🔍' },
  title: [{ text: { content: 'Pattern Cards' } }],
  properties: {
    'Pattern title': { title: {} },
    'Category': { select: { options: [
      { name: 'Revenue' }, { name: 'Delivery' }, { name: 'Client' },
      { name: 'Team' }, { name: 'Sales' }, { name: 'Growth' },
    ]}},
    'Description': { rich_text: {} },
    'First observed': { date: {} },
    'Confidence': { number: { format: 'percent' } },
    'Status': { select: { options: [
      { name: 'Active', color: 'green' },
      { name: 'Watching', color: 'yellow' },
      { name: 'Resolved', color: 'gray' },
    ]}},
    'Recommended action': { rich_text: {} },
    'Times confirmed': { number: {} },
  },
}
```

#### `Risk Register` database
```typescript
{
  parent: { type: 'page_id', page_id: parentPageId },
  icon: { type: 'emoji', emoji: '⚠️' },
  title: [{ text: { content: 'Risk Register' } }],
  properties: {
    'Risk title': { title: {} },
    'Type': { select: { options: [
      { name: 'Revenue' }, { name: 'Delivery' }, { name: 'Team' },
      { name: 'Client' }, { name: 'Cash flow' }, { name: 'Legal' },
    ]}},
    'Severity': { select: { options: [
      { name: 'Low', color: 'gray' },
      { name: 'Medium', color: 'yellow' },
      { name: 'High', color: 'orange' },
      { name: 'Critical', color: 'red' },
    ]}},
    'Description': { rich_text: {} },
    'Financial exposure': { number: { format: 'dollar' } },
    'Date flagged': { date: {} },
    'Status': { select: { options: [
      { name: 'Open', color: 'red' },
      { name: 'Mitigating', color: 'yellow' },
      { name: 'Resolved', color: 'green' },
    ]}},
    'Deadline to act': { date: {} },
    'Agent recommendation': { rich_text: {} },
    'Owner': { rich_text: {} },
  },
}
```

#### `Agent Action Log` database
```typescript
{
  parent: { type: 'page_id', page_id: parentPageId },
  icon: { type: 'emoji', emoji: '✅' },
  title: [{ text: { content: 'Agent Action Log' } }],
  properties: {
    'Action': { title: {} },
    'Agent': { select: { options: [
      { name: 'Revenue' }, { name: 'Collections' }, { name: 'Scope' },
      { name: 'Delivery' }, { name: 'Briefing' }, { name: 'Profitability' },
      { name: 'Team' }, { name: 'Growth' }, { name: 'Renewal' },
      { name: 'Stack' }, { name: 'COO' },
    ]}},
    'Date': { date: {} },
    'Trigger': { rich_text: {} },
    'Action taken': { rich_text: {} },
    'Outcome': { select: { options: [
      { name: 'Resolved', color: 'green' },
      { name: 'Pending', color: 'yellow' },
      { name: 'Escalated', color: 'orange' },
      { name: 'No action', color: 'gray' },
    ]}},
    'Value recovered / saved': { number: { format: 'dollar' } },
    'Human override': { checkbox: {} },
    'Override reason': { rich_text: {} },
  },
}
```

**For the other 15 databases — implement exactly as specified in [`notion-brain-schema-2026.md`](../notion-brain-schema-2026.md).** All column names, types, and select options must match.

### 3.3 Notion Helper Library

`src/lib/notion/helpers.ts` — typed helpers per database:

```typescript
export async function getWorkspace(userId: string): Promise<NotionWorkspace | null>
export async function getNotionClient(userId: string): Promise<Client>

// One helper per write operation
export async function upsertClient(userId: string, client: ClientUpsert): Promise<void>
export async function appendKpiSnapshot(userId: string, snapshot: KpiSnapshot): Promise<void>
export async function appendPatternCard(userId: string, pattern: PatternCard): Promise<void>
export async function appendRiskEntry(userId: string, risk: RiskEntry): Promise<void>
export async function appendActionLog(userId: string, action: ActionLog): Promise<void>
export async function appendProject(userId: string, project: Project): Promise<void>
// ... one per database (15 more)

// Read helpers
export async function readRecentKpiSnapshots(userId: string, weeks: number): Promise<KpiSnapshot[]>
export async function readOpenRisks(userId: string): Promise<RiskEntry[]>
export async function readActivePatterns(userId: string): Promise<PatternCard[]>
export async function readAllClients(userId: string): Promise<Client[]>
```

Each helper:
- Reads `notion_workspaces.databases[db_slug]` for the target db_id
- Calls Notion SDK with proper retry/throttling (3 req/sec per integration)
- Returns typed result

---

## 4. Agent Loop Design

### 4.1 Agent Loop Helper

`src/lib/agents/loop.ts`:

```typescript
import { openai } from '<npm>/lib/openai'
import { OpenAIToolset } from 'composio-core'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'

export type AgentSpec = {
  slug: string
  displayName: string
  model: 'gpt-5.5' | 'o3-mini'
  composioApps: string[]                 // which Composio apps to load
  systemPrompt: string
  maxSteps: number
  requiredTier: 'starter' | 'growth' | 'pro'
  requiredIntegrations: string[]         // tool slugs that must be connected
  cronSchedule: string                   // for documentation
}

export async function runAgent(spec: AgentSpec, userId: string): Promise<AgentRunResult> {
  // 1. Tier check
  const tier = await getUserTier(userId)
  if (!tierAllows(tier, spec.requiredTier)) {
    return logSkip(userId, spec.slug, 'tier')
  }

  // 2. Integrations check
  const connected = await getConnectedTools(userId)
  const missing = spec.requiredIntegrations.filter((t) => !connected.includes(t))
  if (missing.length > 0) {
    return logSkip(userId, spec.slug, `missing: ${missing.join(',')}`)
  }

  // 3. Start run
  const runId = await startAgentRun(userId, spec.slug)

  try {
    // 4. Load Composio tools
    const toolset = new OpenAIToolset({ apiKey: process.env.COMPOSIO_API_KEY! })
    const tools = await toolset.getTools({
      apps: spec.composioApps,
      userId,
    })

    // 5. Add Notion write tools
    const notionTools = await buildNotionWriteTools(userId)

    // 6. Run multi-step loop
    let messages = [
      { role: 'system' as const, content: spec.systemPrompt },
      { role: 'user' as const, content: `Run your analysis. Today: ${new Date().toISOString()}` },
    ]

    let steps = 0
    let actionsTaken = 0
    let notionWrites = 0

    while (steps < spec.maxSteps) {
      const completion = await openai.chat.completions.create({
        model: spec.model,
        messages,
        tools: [...tools, ...notionTools],
        tool_choice: 'auto',
      })

      const msg = completion.choices[0].message
      messages.push(msg)

      if (!msg.tool_calls || msg.tool_calls.length === 0) break

      // Execute tool calls
      for (const call of msg.tool_calls) {
        const result = call.function.name.startsWith('NOTION_')
          ? await executeNotionTool(userId, call)
          : await toolset.handleToolCall(completion, userId)

        if (call.function.name.startsWith('NOTION_')) notionWrites++
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        })
      }

      steps++
    }

    // 7. Complete run
    return completeAgentRun(runId, {
      status: 'success',
      actionsTaken,
      notionWrites,
      summary: messages[messages.length - 1].content,
    })
  } catch (err) {
    return failAgentRun(runId, err)
  }
}
```

### 4.2 Tier Gate

`src/lib/agents/tier-gate.ts`:

```typescript
export const TIER_AGENTS = {
  starter:  ['revenue', 'collections', 'briefing'] as const,
  growth:   ['revenue', 'collections', 'briefing', 'scope', 'delivery'] as const,
  pro:      ['revenue', 'collections', 'briefing', 'scope', 'delivery',
             'profitability', 'team', 'growth', 'renewal', 'stack'] as const,
} as const

export function tierAllows(userTier: keyof typeof TIER_AGENTS, agentSlug: string): boolean {
  return (TIER_AGENTS[userTier] as readonly string[]).includes(agentSlug)
}
```

---

## 5. The 10 Agent Specs

### 5.1 Revenue Agent

```typescript
// src/lib/agents/revenue/index.ts
export const REVENUE_AGENT: AgentSpec = {
  slug: 'revenue',
  displayName: 'Revenue Agent',
  model: 'gpt-5.5',
  composioApps: ['stripe', 'hubspot', 'pipedrive', 'quickbooks', 'xero'],
  requiredTier: 'starter',
  requiredIntegrations: ['stripe'],
  cronSchedule: '0 7 * * *',
  maxSteps: 8,
  systemPrompt: `You are the Revenue Agent for an agency.
Your job: each morning, check the agency's revenue health and update the Notion Brain.

Tasks:
1. Pull current MRR, today's cash collected, outstanding invoices from Stripe
2. Pull this week's new deals closed and pipeline value from HubSpot/Pipedrive
3. Compute net margin if QuickBooks/Xero connected
4. Compare to last week's KPI snapshot in Notion — flag deltas > 5%
5. Update Notion:
   - Append new row to "Weekly KPI Snapshots" if it's Monday
   - Update each client's "Monthly retainer value" and "Lifetime value" in "Clients"
   - If churn risk detected, append to "Risk Register"
   - If a new revenue pattern detected, append to "Pattern Cards"
6. Log every action to "Agent Action Log"

Be specific. Use real numbers. Never invent data. If a tool returns nothing, write "no data" and continue.`,
}
```

### 5.2 Collections Agent

```typescript
export const COLLECTIONS_AGENT: AgentSpec = {
  slug: 'collections',
  displayName: 'Collections Agent',
  model: 'o3-mini',
  composioApps: ['stripe', 'gmail'],
  requiredTier: 'starter',
  requiredIntegrations: ['stripe', 'gmail'],
  cronSchedule: '0 8 * * *',
  maxSteps: 10,
  systemPrompt: `You are the Collections Agent for an agency.
Your job: each morning, find overdue invoices and send polite follow-up emails.

Tasks:
1. Pull all unpaid invoices from Stripe
2. For each invoice 7+ days overdue, check Notion "Invoice Tracker" for follow-up count
3. If follow-up count < 3 and last follow-up > 7 days ago:
   - Draft a polite payment reminder via Gmail (don't send — queue for owner approval)
   - Tone scales with days overdue: friendly @ 7d, firm @ 14d, urgent @ 30d
4. Update Notion "Invoice Tracker" with: status, days overdue, follow-up count, last follow-up date
5. Update each affected client's "Payment behaviour" in "Clients" db based on history
6. If client has chronic late pattern → append to "Pattern Cards"
7. Log every email queued to "Agent Action Log"

Never send emails directly — always queue for owner approval via the action queue.
Never make up amounts — always use Stripe's actual data.`,
}
```

### 5.3 Scope Agent

```typescript
export const SCOPE_AGENT: AgentSpec = {
  slug: 'scope',
  displayName: 'Scope Agent',
  model: 'o3-mini',
  composioApps: ['clickup', 'asana', 'monday', 'harvest', 'toggl'],
  requiredTier: 'growth',
  requiredIntegrations: ['harvest'],  // need at least one time tracking
  cronSchedule: '0 9 * * 0',           // Sunday 9AM
  maxSteps: 12,
  systemPrompt: `You are the Scope Agent for an agency.
Your job: each Sunday, detect scope creep across all active projects and clients.

Tasks:
1. For each client in Notion "Clients" db:
   - Pull hours logged this month from Harvest/Toggl
   - Pull active project tasks + status from ClickUp/Asana/Monday
   - Compare hours logged vs "Monthly hours budget"
   - If logged > budget × 1.1 → SCOPE CREEP DETECTED
2. For each scope creep instance:
   - Append to Notion "Risk Register" with severity, financial exposure
   - Update client's "Scope creep incidents (6mo)" count
   - Update client's "Difficulty score" if pattern persists
3. For each project in Notion "Projects" db:
   - Update hours logged, scope change count, profitability
   - Flag at-risk projects
4. Detect new patterns ("Client X scope-creeps every Q2") → append to "Pattern Cards"
5. Log everything to "Agent Action Log"

Be specific about which task or sprint caused the overrun.`,
}
```

### 5.4 Delivery Agent

```typescript
export const DELIVERY_AGENT: AgentSpec = {
  slug: 'delivery',
  displayName: 'Delivery Agent',
  model: 'o3-mini',
  composioApps: ['clickup', 'asana', 'monday'],
  requiredTier: 'growth',
  requiredIntegrations: [],  // any of clickup/asana/monday works
  cronSchedule: '0 7 * * 1',  // Monday 7AM
  maxSteps: 10,
  systemPrompt: `You are the Delivery Agent for an agency.
Your job: each Monday morning, assess project delivery health.

Tasks:
1. Pull all active projects from ClickUp/Asana/Monday
2. For each project:
   - Calculate days to deadline, % complete
   - Compare to similar past projects in Notion "Projects" db
   - Flag if predicted slip > 0 days
3. Update Notion "Projects" db with current status, hours, days overdue
4. For at-risk projects, append to "Risk Register" with severity
5. Detect delivery patterns ("Web projects always slip 2 weeks") → "Pattern Cards"
6. Log to "Agent Action Log"

Use historical project data in Notion to make better predictions.`,
}
```

### 5.5 Briefing Agent

```typescript
export const BRIEFING_AGENT: AgentSpec = {
  slug: 'briefing',
  displayName: 'Briefing Agent',
  model: 'gpt-5.5',
  composioApps: ['gmail'],
  requiredTier: 'starter',
  requiredIntegrations: [],  // reads from Notion
  cronSchedule: '0 6 * * 1',  // Monday 6AM
  maxSteps: 6,
  systemPrompt: `You are the Briefing Agent for an agency.
Your job: each Monday at 6AM, synthesize the past week into a one-page briefing.

Tasks:
1. Read from Notion:
   - Last 12 weeks of "Weekly KPI Snapshots" (trends)
   - All open entries in "Risk Register"
   - Active patterns from "Pattern Cards"
   - All actions taken last week from "Agent Action Log"
2. Compose a Monday Brief with sections:
   - Headline: one-sentence state of business
   - Revenue: MRR change, cash collected, overdue
   - Clients: who needs attention, who is healthy
   - Delivery: what shipped, what's at risk
   - Team: utilization, burnout signals
   - Top 3 actions for the owner this week
3. Append the briefing to Notion "Weekly Briefings" db
4. Send the briefing as a Gmail draft to the owner (don't auto-send)
5. Log to "Agent Action Log"

Write like a chief of staff — concise, specific, action-oriented. No fluff.
Use real numbers. If trends are flat, say so. Never invent.`,
}
```

### 5.6 Profitability Agent (Pro)

```typescript
export const PROFITABILITY_AGENT: AgentSpec = {
  slug: 'profitability',
  displayName: 'Profitability Agent',
  model: 'gpt-5.5',
  composioApps: ['stripe', 'quickbooks', 'xero', 'harvest', 'gusto', 'deel'],
  requiredTier: 'pro',
  requiredIntegrations: ['stripe'],  // QB/Xero unlock deeper analysis
  cronSchedule: '0 9 * * 0',
  maxSteps: 15,
  systemPrompt: `You are the Profitability Agent for an agency.
Your job: each Sunday, compute real per-client P&L using accounting data.

Tasks:
1. Pull revenue per client from Stripe (12 months)
2. Pull costs from QuickBooks/Xero: payroll, contractor payments, software, overhead
3. Pull hours per client from Harvest
4. Compute true margin per client = (revenue) - (hours × blended cost rate) - (allocated overhead)
5. Update each client's "Actual margin %" and "Margin status" in Notion
6. Append monthly P&L row to Notion "Real P&L" db
7. Flag any client with margin < 20% → "Risk Register"
8. Detect patterns ("Service line X has 45% margin, Service Y has 12%") → "Pattern Cards"
9. Append insights to "Service Line Performance" db
10. Log to "Agent Action Log"

Be brutally honest about money-losing clients. Recommend specific actions: reprice, descope, fire.`,
}
```

### 5.7 Team Agent (Pro)

```typescript
export const TEAM_AGENT: AgentSpec = {
  slug: 'team',
  displayName: 'Team Agent',
  model: 'o3-mini',
  composioApps: ['slack', 'google_calendar', 'harvest', 'bamboo_hr', 'gusto'],
  requiredTier: 'pro',
  requiredIntegrations: ['harvest'],
  cronSchedule: '0 18 * * *',  // Daily 6PM
  maxSteps: 10,
  systemPrompt: `You are the Team Agent for an agency.
Your job: each evening, check team capacity, utilization, and burnout signals.

Tasks:
1. For each team member in Notion "Team" db:
   - Pull hours logged today + this month from Harvest
   - Pull Slack messages sent (especially after-hours %) from Slack
   - Pull meeting count today from Google Calendar
   - Compute utilization vs capacity
2. Flag burnout risk:
   - >100% utilization for 2+ weeks
   - >30% after-hours Slack
   - <2hr deep work blocks per day
3. Update Notion "Team" db with current state
4. Append to "Team Communication & Culture" db
5. Append to "Meeting Load" db
6. If utilization > 95% → "Risk Register" (hiring needed)
7. Log to "Agent Action Log"

Watch for sudden behavior changes (someone who used to send 0 after-hours messages now sending many).`,
}
```

### 5.8 Growth Agent (Pro)

```typescript
export const GROWTH_AGENT: AgentSpec = {
  slug: 'growth',
  displayName: 'Growth Agent',
  model: 'gpt-5.5',
  composioApps: ['hubspot', 'pipedrive', 'apollo', 'google_analytics', 'google_ads', 'facebook_ads', 'linkedin'],
  requiredTier: 'pro',
  requiredIntegrations: [],  // any growth tool
  cronSchedule: '0 9 * * 5',  // Friday 9AM
  maxSteps: 12,
  systemPrompt: `You are the Growth Agent for an agency.
Your job: each Friday, assess pipeline health and channel ROI.

Tasks:
1. Pull deals from HubSpot/Pipedrive — stage, value, age, source
2. Pull website traffic from Google Analytics
3. Pull ad spend + ROAS from Google Ads / Meta Ads
4. Pull LinkedIn metrics (organic reach, content performance)
5. Update Notion "Sales Pipeline" db with current state
6. Update "Marketing Performance" db with weekly metrics
7. Update "Growth & Referrals" db with monthly aggregates
8. Detect channel patterns ("Referrals close 3× better than cold") → "Pattern Cards"
9. Flag stale deals (no activity 7d+) → "Risk Register"
10. Log to "Agent Action Log"

Identify which channel deserves more investment and which to cut.`,
}
```

### 5.9 Renewal Agent (Pro)

```typescript
export const RENEWAL_AGENT: AgentSpec = {
  slug: 'renewal',
  displayName: 'Renewal Agent',
  model: 'o3-mini',
  composioApps: ['docusign', 'hubspot', 'pipedrive', 'gmail'],
  requiredTier: 'pro',
  requiredIntegrations: ['docusign'],
  cronSchedule: '0 9 * * *',  // Daily
  maxSteps: 8,
  systemPrompt: `You are the Renewal Agent for an agency.
Your job: each morning, monitor contract renewals and prevent surprise churn.

Tasks:
1. Pull all active contracts from DocuSign
2. For each contract with end date < 90 days:
   - Update Notion "Contracts & Legal" db
   - Compute renewal risk based on client's:
     - Margin status (from Clients db)
     - NPS score (from Clients db)
     - Communication health (from Communication db)
     - Recent scope creep
   - If renewal risk HIGH and days < 60 → "Risk Register" (severity Critical)
3. Draft renewal reminder emails for owner (Gmail draft, never auto-send)
4. Log to "Agent Action Log"

A contract expiring in 30 days with no renewal conversation is an emergency.`,
}
```

### 5.10 Stack Agent (Pro)

```typescript
export const STACK_AGENT: AgentSpec = {
  slug: 'stack',
  displayName: 'Stack Agent',
  model: 'o3-mini',
  composioApps: ['quickbooks', 'xero'],
  requiredTier: 'pro',
  requiredIntegrations: ['quickbooks'],  // or xero
  cronSchedule: '0 9 1 * *',  // Monthly 1st
  maxSteps: 8,
  systemPrompt: `You are the Stack Agent for an agency.
Your job: once a month, audit the tool stack for waste.

Tasks:
1. Pull all software subscription expenses from QuickBooks/Xero
2. For each tool in "Tool Stack & Software Costs" db:
   - Compare cost to active users
   - Flag low utilization (< 30%)
   - Identify redundant tools (e.g., paying for both Asana and ClickUp)
3. Update Notion "Tool Stack" db with current state + waste detection
4. Compute total annual waste
5. If waste > $1000/year → "Risk Register"
6. Suggest consolidation in agent action log
7. Log to "Agent Action Log"

Be specific: "$120/mo for Tool X, only 1 user — recommend cancel."`,
}
```

### 5.11 Agent Registry

```typescript
// src/lib/agents/registry.ts
import { REVENUE_AGENT } from './revenue'
import { COLLECTIONS_AGENT } from './collections'
// ... etc

export const AGENTS: Record<string, AgentSpec> = {
  revenue: REVENUE_AGENT,
  collections: COLLECTIONS_AGENT,
  scope: SCOPE_AGENT,
  delivery: DELIVERY_AGENT,
  briefing: BRIEFING_AGENT,
  profitability: PROFITABILITY_AGENT,
  team: TEAM_AGENT,
  growth: GROWTH_AGENT,
  renewal: RENEWAL_AGENT,
  stack: STACK_AGENT,
} as const
```

---

## 6. API Contracts

### 6.1 Composio Routes
- `POST /api/composio/connect` → initiates OAuth, returns `oauth_url`
- `POST /api/composio/webhook` → Composio callback (verifies signature)
- `DELETE /api/composio/disconnect` → revoke a tool

### 6.2 Notion Routes
- `GET /api/notion/connect` → redirects to Notion OAuth
- `GET /api/notion/callback` → handles code, creates Brain, triggers backfill
- `POST /api/notion/disconnect` → revoke (keeps customer's Notion data intact)

### 6.3 Agent Routes
- `GET /api/dashboard/agents` → list user's agents with state
- `POST /api/dashboard/agents/:slug/toggle` → enable/disable
- `POST /api/dashboard/agents/:slug/run` → manual trigger (Pro tier)
- `GET /api/dashboard/agents/:slug/runs` → run history

### 6.4 Cron Routes
- `POST /api/cron/agents/:slug` (one per agent, 10 total)

---

## 7. UI Components

### 7.1 `/dashboard/agents/page.tsx`

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {AGENT_SLUGS.map((slug) => (
    <AgentCard key={slug} userId={userId} agentSlug={slug} />
  ))}
</div>
```

### 7.2 `AgentCard` component

Shows state: 🟢 Active / 🔵 Ready / ⚫ Locked. Includes:
- Agent name + icon
- Description
- Last run timestamp + outcome summary
- Toggle (if Active or Ready)
- Required integrations list
- Upgrade CTA (if Locked)

State logic:
```typescript
function getAgentState(spec: AgentSpec, userTier, connectedTools, isEnabled): AgentState {
  if (!tierAllows(userTier, spec.requiredTier)) return 'locked'
  const missing = spec.requiredIntegrations.filter(t => !connectedTools.includes(t))
  if (missing.length > 0) return 'ready'  // tier OK, just need integration
  return isEnabled ? 'active' : 'paused'
}
```

---

## 8. Backfill Workflow

### 8.1 Inngest Function

```typescript
// src/lib/backfill/orchestrator.ts
import { inngest } from '<npm>/lib/inngest'

export const onNotionConnected = inngest.createFunction(
  { id: 'backfill-on-notion-connected', retries: 3 },
  { event: 'notion/connected' },
  async ({ event, step }) => {
    const { userId } = event.data

    // Phase 1: Current state (<30s)
    await step.run('phase-1-current', async () => {
      await backfillCurrentState(userId)
      await updateBackfillStatus(userId, 'phase1')
    })

    // Phase 2: 90 days
    await step.run('phase-2-90d', async () => {
      await backfill90Days(userId)
      await updateBackfillStatus(userId, 'phase2')
    })

    // Phase 3: 12 months + patterns
    await step.run('phase-3-12mo', async () => {
      await backfill12Months(userId)
      await updateBackfillStatus(userId, 'phase3')
    })

    // Phase 4: Notify customer
    await step.run('notify', async () => {
      await sendBackfillCompleteEmail(userId)
      await updateBackfillStatus(userId, 'complete')
    })
  }
)
```

### 8.2 Phase Implementations

Each backfill phase:
- Loops through connected tools
- Pulls history with throttling (Composio handles rate limits)
- Aggregates raw data → writes summary rows to Notion
- Discards raw data after writing

---

## 9. Migration Strategy

### 9.1 Coexistence Period

Old adapters and Composio coexist behind a feature flag:
```typescript
const USE_COMPOSIO = process.env.USE_COMPOSIO === 'true'

if (USE_COMPOSIO) {
  return composioStripe.fetchMRR(userId)
} else {
  return legacyStripe.fetchMRR(userId)  // existing code
}
```

### 9.2 Per-Tool Cutover

1. Wire Composio tool
2. Add feature flag check in routes
3. Test in staging with real account
4. Enable flag in production for one customer
5. Verify, then enable for all
6. Delete legacy adapter

### 9.3 COO Chat Cutover

The existing COO chat at `src/app/api/dashboard/coo/route.ts` will need:
- Replace `decryptApiKey` flow with Composio tool loading
- Replace direct OpenAI tool calls with Composio toolset
- Add Notion read for memory context
- Keep streaming protocol identical (frontend doesn't change)

### 9.4 Diorization Replacement

`src/lib/diorization/` becomes obsolete — Notion is the new memory. After verifying agents write patterns correctly to Notion:
- Disable diorization cron
- Migrate any high-confidence existing patterns from `pattern_cards` table → Notion's `Pattern Cards` db
- Drop tables: `breadcrumbs`, `pattern_cards`, `living_briefs`

---

## 10. Acceptance Tests

Each agent must pass these tests before launch:

```typescript
describe('Revenue Agent', () => {
  it('runs successfully with only Stripe connected', async () => {
    await connectStripeForTestUser()
    const result = await runAgent(REVENUE_AGENT, TEST_USER_ID)
    expect(result.status).toBe('success')
  })

  it('writes a KPI snapshot to Notion on Monday', async () => {
    mockDate('2026-06-01')  // Monday
    await runAgent(REVENUE_AGENT, TEST_USER_ID)
    const snapshots = await readRecentKpiSnapshots(TEST_USER_ID, 1)
    expect(snapshots).toHaveLength(1)
    expect(snapshots[0].MRR).toBeGreaterThan(0)
  })

  it('skips with tier=null', async () => {
    const result = await runAgent(REVENUE_AGENT, FREE_USER_ID)
    expect(result.status).toBe('skipped')
    expect(result.reason).toBe('tier')
  })

  it('does not duplicate snapshots on same day', async () => { ... })
  it('handles Stripe rate limits gracefully', async () => { ... })
})
```

Similar test suite per agent (10 total).

---

## 11. Definition of Done

The build is complete when ALL of these are true:

- [ ] All 4 SQL migrations applied to production Supabase
- [ ] All 25 Composio tool slugs connect via OAuth and persist
- [ ] Customer can connect Notion → 20 databases created with exact schemas
- [ ] All 10 agents have files in `src/lib/agents/[slug]/index.ts`
- [ ] Each agent runs on its cron schedule via `/api/cron/agents/[slug]`
- [ ] Tier gating enforced at every entry point
- [ ] `/dashboard/agents` shows correct state per agent per customer
- [ ] Backfill workflow completes within 2 hours
- [ ] COO chat reads from Notion as memory context
- [ ] No client raw data persisted in OpsRadar's Supabase
- [ ] All old adapter files deleted
- [ ] Diorization tables dropped
- [ ] Documentation updated in CLAUDE.md
- [ ] Test suite passes for all 10 agents

---

**This is the spec. Read it, the plan, the architecture, and the schema — then build.**
