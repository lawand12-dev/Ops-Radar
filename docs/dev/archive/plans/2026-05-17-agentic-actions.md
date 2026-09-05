# Agentic Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI action engine that detects operational triggers (overdue invoices, low margins, budget overruns, n8n failures, new HubSpot contacts), queues GPT-4o-drafted actions, auto-executes safe actions, and presents approval-required actions in a `/dashboard/actions` queue.

**Architecture:** A daily cron job calls `evaluateActionsForUser()` which runs five evaluators in parallel. Results are deduplicated against recent `agent_actions` Supabase rows. Auto actions (invoice reminder, workflow failure, HubSpot→Harvest sync) execute immediately and get a 30-minute undo window. Approval-required actions (margin alert, hours budget) sit as pending drafts. A dashboard page shows both queues. The session-scoped RLS client is used for all user-facing API routes; service-role for the cron.

**Tech Stack:** Next.js 16 App Router, Supabase (service-role + RLS), GPT-4o (`response_format: json_object`), Resend, Stripe SDK, Harvest REST API, n8n REST API, HubSpot SDK (`@hubspot/api-client`), Tailwind CSS v4

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/actions/types.ts` | ActionType, ActionStatus, all payload types, AgentAction |
| Create | `src/lib/actions/dedup.ts` | Prevent duplicate actions within lookback window |
| Create | `src/lib/actions/evaluators/invoice-reminder.ts` | Stripe: overdue > 7d → payment reminder email draft |
| Create | `src/lib/actions/evaluators/margin-alert.ts` | Profitability: margin < 15% → repricing email draft |
| Create | `src/lib/actions/evaluators/hours-budget.ts` | Harvest: project hours > budget → scope email draft |
| Create | `src/lib/actions/evaluators/workflow-failure.ts` | n8n: failures in 24h → alert action |
| Create | `src/lib/actions/evaluators/hubspot-harvest.ts` | HubSpot: new contacts → Harvest client creation |
| Create | `src/lib/actions/evaluator.ts` | Orchestrates all evaluators for a user |
| Create | `src/lib/actions/executor.ts` | Dispatches to per-type execution (Resend, Harvest API) |
| Create | `src/app/api/dashboard/actions/route.ts` | GET (list actions), PATCH (approve/dismiss/undo) |
| Create | `src/app/api/cron/actions/route.ts` | Daily cron: evaluate + auto-execute for all users |
| Create | `src/app/dashboard/actions/page.tsx` | Server component wrapper |
| Create | `src/app/dashboard/actions/_components/actions-feed.tsx` | Client: two-tab feed (Pending / History) |
| Create | `src/app/dashboard/actions/_components/action-card.tsx` | Single action card with draft + approve/dismiss/undo |
| Modify | `src/app/dashboard/_components/sidebar.tsx` | Add "Actions" nav item with pending badge |
| Modify | `src/lib/rate-limit.ts` | Add 'dashboard-actions' entry |
| Modify | `src/lib/database.types.ts` | Regenerated after migration |
| Modify | `vercel.json` | Add daily cron for actions evaluation |

---

## Task 1: Database migration + types

**Files:**
- Run SQL via Supabase MCP
- Create: `src/lib/actions/types.ts`
- Modify: `src/lib/database.types.ts`

- [ ] **Step 1: Apply migration**

Use `mcp__claude_ai_Supabase__apply_migration` on project `nbdcrmepvwbfbcjqfubr`:

```sql
CREATE TABLE agent_actions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  action_type     text NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  payload         jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  approved_at     timestamptz,
  executed_at     timestamptz,
  undone_at       timestamptz,
  undo_deadline   timestamptz
);

CREATE INDEX agent_actions_user_status_idx  ON agent_actions (user_id, status);
CREATE INDEX agent_actions_user_created_idx ON agent_actions (user_id, created_at DESC);

ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can access own actions" ON agent_actions
  FOR ALL
  USING (auth.uid() = user_id);
```

- [ ] **Step 2: Verify**

Use `mcp__claude_ai_Supabase__execute_sql` on project `nbdcrmepvwbfbcjqfubr`:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'agent_actions'
ORDER BY ordinal_position;
```

Expected: 10 rows (id, user_id, action_type, status, payload, created_at, approved_at, executed_at, undone_at, undo_deadline).

- [ ] **Step 3: Regenerate types and write `src/lib/database.types.ts`**

Use `mcp__claude_ai_Supabase__generate_typescript_types` on project `nbdcrmepvwbfbcjqfubr` and overwrite `src/lib/database.types.ts` with the full output (must Read the file first).

Verify the `agent_actions` Row type is present:
```typescript
agent_actions: {
  Row: {
    id: string; user_id: string; action_type: string; status: string;
    payload: Json; created_at: string;
    approved_at: string | null; executed_at: string | null;
    undone_at: string | null; undo_deadline: string | null;
  }
  // Insert and Update with appropriate optional fields
}
```

- [ ] **Step 4: Create `src/lib/actions/types.ts`**

```typescript
export type ActionType =
  | 'invoice_reminder'
  | 'margin_alert'
  | 'hours_budget_exceeded'
  | 'workflow_failure'
  | 'hubspot_harvest_sync'

export type ActionStatus =
  | 'pending'    // queued, awaiting approval (or just inserted before auto-execute)
  | 'executed'   // completed
  | 'dismissed'  // user dismissed
  | 'undone'     // executed then undone within 30-min window
  | 'failed'     // execution threw an error

export type ActionRisk = 'auto' | 'approval'

export const ACTION_RISK: Record<ActionType, ActionRisk> = {
  invoice_reminder:     'auto',
  margin_alert:         'approval',
  hours_budget_exceeded: 'approval',
  workflow_failure:     'auto',
  hubspot_harvest_sync: 'auto',
}

export const ACTION_LABELS: Record<ActionType, string> = {
  invoice_reminder:     'Payment reminder sent',
  margin_alert:         'Repricing email ready',
  hours_budget_exceeded: 'Scope conversation ready',
  workflow_failure:     'Workflow failure alert sent',
  hubspot_harvest_sync: 'New client synced to Harvest',
}

// ─── Payload types ────────────────────────────────────────────────────────────

export type InvoiceReminderPayload = {
  stripe_customer_id: string
  invoice_id: string
  client_name: string
  amount_due: number
  days_overdue: number
  recipient_email: string
  draft_subject: string
  draft_body: string
  resend_email_id?: string
}

export type MarginAlertPayload = {
  stripe_customer_id: string
  client_name: string
  margin_pct: number
  margin_prior_pct: number | null
  revenue_mtd: number
  cost_mtd: number
  draft_subject: string
  draft_body: string
}

export type HoursBudgetPayload = {
  client_name: string
  project_name: string
  harvest_project_id: string
  hours_logged: number
  budget_hours: number
  overage_pct: number
  draft_subject: string
  draft_body: string
}

export type WorkflowFailurePayload = {
  n8n_workflow_id: string
  workflow_name: string
  failure_count: number
  last_failed_at: string
  n8n_base_url: string
  resend_email_id?: string
}

export type HubSpotHarvestPayload = {
  hubspot_contact_id: string
  hubspot_company_name: string
  client_email: string | null
  harvest_client_id?: string
}

export type ActionPayload =
  | InvoiceReminderPayload
  | MarginAlertPayload
  | HoursBudgetPayload
  | WorkflowFailurePayload
  | HubSpotHarvestPayload

export type NewAction = {
  action_type: ActionType
  payload: ActionPayload
}

export type AgentAction = {
  id: string
  user_id: string
  action_type: ActionType
  status: ActionStatus
  payload: ActionPayload
  created_at: string
  approved_at: string | null
  executed_at: string | null
  undone_at: string | null
  undo_deadline: string | null
}

export type UserContext = {
  userId: string
  email: string
  companyName: string
  blendedRate: number
}
```

- [ ] **Step 5: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/lib/actions/types.ts src/lib/database.types.ts
git commit -m "feat(actions): agent_actions table + core types"
```

---

## Task 2: Dedup utility

**Files:**
- Create: `src/lib/actions/dedup.ts`

- [ ] **Step 1: Create `src/lib/actions/dedup.ts`**

```typescript
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import type { ActionType } from './types';

const LOOKBACK_MS: Record<ActionType, number> = {
  invoice_reminder:     7  * 24 * 60 * 60 * 1000,
  margin_alert:         7  * 24 * 60 * 60 * 1000,
  hours_budget_exceeded: 7  * 24 * 60 * 60 * 1000,
  workflow_failure:     24 *      60 * 60 * 1000,
  hubspot_harvest_sync: 30 * 24 * 60 * 60 * 1000,
};

/**
 * Returns true if an action of this type with the same payload identity
 * already exists for this user within the lookback window and is not
 * dismissed or undone (i.e. it's still active or already executed).
 *
 * identityKey: the key in the payload to match on (e.g. 'invoice_id')
 * identityValue: the string value to match
 */
export async function isDuplicate(
  userId: string,
  actionType: ActionType,
  identityKey: string,
  identityValue: string,
): Promise<boolean> {
  const supabase = getServerSupabaseClient();
  const cutoff = new Date(Date.now() - LOOKBACK_MS[actionType]).toISOString();

  const { data } = await supabase
    .from('agent_actions')
    .select('id, payload')
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .in('status', ['pending', 'executed'])
    .gte('created_at', cutoff);

  return (data ?? []).some((row) => {
    const p = (row.payload ?? {}) as Record<string, unknown>;
    return String(p[identityKey] ?? '') === identityValue;
  });
}
```

- [ ] **Step 2: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/dedup.ts
git commit -m "feat(actions): dedup utility for agent actions"
```

---

## Task 3: Invoice reminder evaluator

**Files:**
- Create: `src/lib/actions/evaluators/invoice-reminder.ts`

- [ ] **Step 1: Create `src/lib/actions/evaluators/invoice-reminder.ts`**

```typescript
import Stripe from 'stripe';
import { openai } from '<npm>/lib/openai';
import { isDuplicate } from '../dedup';
import type { NewAction, InvoiceReminderPayload, UserContext } from '../types';

const OVERDUE_DAYS = 7;

function unix(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

async function draftReminderEmail(
  ctx: UserContext,
  clientName: string,
  amountDue: number,
  daysOverdue: number,
): Promise<{ subject: string; body: string }> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a professional email assistant. Output strict JSON only.',
      },
      {
        role: 'user',
        content: `Write a polite but firm payment reminder email.

Sender agency: ${ctx.companyName || 'our agency'}
Client name: ${clientName}
Amount overdue: $${amountDue.toFixed(2)} USD
Days overdue: ${daysOverdue}

Return JSON: { "subject": "...", "body": "..." }
Rules:
- subject: professional, mentions amount, 1 line
- body: 3-4 short paragraphs, professional tone, no markdown, no emojis
- Include a request to arrange payment or contact us to discuss
- Sign off as "${ctx.companyName || 'the team'}"`,
      },
    ],
    temperature: 0.3,
  });
  const raw = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as { subject?: string; body?: string };
  return {
    subject: parsed.subject ?? `Payment reminder: $${amountDue.toFixed(2)} overdue`,
    body: parsed.body ?? `Hi ${clientName},\n\nThis is a reminder that your invoice of $${amountDue.toFixed(2)} is ${daysOverdue} days overdue.\n\nPlease arrange payment at your earliest convenience.\n\nThank you,\n${ctx.companyName}`,
  };
}

export async function evalInvoiceReminders(
  ctx: UserContext,
  stripeApiKey: string,
): Promise<NewAction[]> {
  const stripe = new Stripe(stripeApiKey, { typescript: true, maxNetworkRetries: 2 });
  const now = new Date();
  const cutoff = new Date(now.getTime() - OVERDUE_DAYS * 24 * 60 * 60 * 1000);

  let invoices: Stripe.Invoice[];
  try {
    const resp = await stripe.invoices.list({
      status: 'open',
      due_date: { lt: unix(cutoff) },
      limit: 20,
      expand: ['data.customer'],
    });
    invoices = resp.data;
  } catch (err) {
    console.warn('[evalInvoiceReminders] Stripe fetch failed:', err);
    return [];
  }

  const actions: NewAction[] = [];

  for (const inv of invoices) {
    const custId =
      typeof inv.customer === 'object' && inv.customer !== null
        ? (inv.customer as Stripe.Customer).id
        : String(inv.customer ?? 'unknown');

    const clientName =
      typeof inv.customer === 'object' && inv.customer !== null
        ? ((inv.customer as Stripe.Customer).name ?? 'Unknown')
        : 'Unknown';

    const recipientEmail =
      typeof inv.customer === 'object' && inv.customer !== null
        ? ((inv.customer as Stripe.Customer).email ?? null)
        : (inv.customer_email ?? null);

    if (!recipientEmail) continue;
    if (!inv.due_date) continue;

    const daysOverdue = Math.floor((unix(now) - inv.due_date) / 86400);
    const amountDue = (inv.amount_due ?? 0) / 100;
    const invoiceId = inv.id;

    const dup = await isDuplicate(ctx.userId, 'invoice_reminder', 'invoice_id', invoiceId);
    if (dup) continue;

    let draft: { subject: string; body: string };
    try {
      draft = await draftReminderEmail(ctx, clientName, amountDue, daysOverdue);
    } catch {
      draft = {
        subject: `Payment reminder: $${amountDue.toFixed(2)} overdue`,
        body: `Hi ${clientName},\n\nYour invoice of $${amountDue.toFixed(2)} is ${daysOverdue} days overdue. Please arrange payment.\n\n${ctx.companyName}`,
      };
    }

    const payload: InvoiceReminderPayload = {
      stripe_customer_id: custId,
      invoice_id: invoiceId,
      client_name: clientName,
      amount_due: amountDue,
      days_overdue: daysOverdue,
      recipient_email: recipientEmail,
      draft_subject: draft.subject,
      draft_body: draft.body,
    };
    actions.push({ action_type: 'invoice_reminder', payload });
  }

  return actions;
}
```

- [ ] **Step 2: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/evaluators/invoice-reminder.ts
git commit -m "feat(actions): invoice reminder evaluator"
```

---

## Task 4: Margin alert + hours budget evaluators

**Files:**
- Create: `src/lib/actions/evaluators/margin-alert.ts`
- Create: `src/lib/actions/evaluators/hours-budget.ts`

- [ ] **Step 1: Create `src/lib/actions/evaluators/margin-alert.ts`**

```typescript
import { openai } from '<npm>/lib/openai';
import { fetchStripePerClientRevenue } from '<npm>/lib/integrations/stripe/profitability-adapter';
import { fetchHarvestPerClientHours } from '<npm>/lib/integrations/harvest/profitability-adapter';
import { computeClientProfitability } from '<npm>/lib/profitability';
import { isDuplicate } from '../dedup';
import type { NewAction, MarginAlertPayload, UserContext } from '../types';

const MARGIN_THRESHOLD = 15;

async function draftRepricingEmail(
  ctx: UserContext,
  clientName: string,
  marginPct: number,
  revenueMtd: number,
  costMtd: number,
): Promise<{ subject: string; body: string }> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a professional business advisor. Output strict JSON only.' },
      {
        role: 'user',
        content: `Write a professional repricing conversation email to a client.

Agency: ${ctx.companyName || 'our agency'}
Client: ${clientName}
Current margin: ${marginPct.toFixed(1)}%
Revenue this month: $${revenueMtd.toFixed(0)}
Cost this month: $${costMtd.toFixed(0)}

Return JSON: { "subject": "...", "body": "..." }
Rules:
- subject: professional, does not mention "margin" or specific numbers
- body: 3-4 paragraphs, warm tone, explains service scope has grown, proposes a conversation about pricing
- Do NOT mention exact margin percentage to the client
- Sign off as "${ctx.companyName || 'the team'}"`,
      },
    ],
    temperature: 0.4,
  });
  const raw = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as { subject?: string; body?: string };
  return {
    subject: parsed.subject ?? `Let's talk about our engagement — ${clientName}`,
    body: parsed.body ?? `Hi ${clientName},\n\nI wanted to reach out to discuss our engagement and ensure it continues to deliver great value for both sides.\n\nLet's find time to chat.\n\n${ctx.companyName}`,
  };
}

export async function evalMarginAlerts(
  ctx: UserContext,
  stripeApiKey: string,
  harvestApiKey: string,
): Promise<NewAction[]> {
  let stripeData, harvestData;
  try {
    [stripeData, harvestData] = await Promise.all([
      fetchStripePerClientRevenue(stripeApiKey),
      fetchHarvestPerClientHours(harvestApiKey),
    ]);
  } catch (err) {
    console.warn('[evalMarginAlerts] data fetch failed:', err);
    return [];
  }

  const result = computeClientProfitability(stripeData, harvestData, ctx.blendedRate);
  const actions: NewAction[] = [];

  for (const client of result.clients) {
    if (client.margin_pct >= MARGIN_THRESHOLD) continue;
    if (client.revenue_mtd < 500) continue; // skip tiny clients

    const dup = await isDuplicate(ctx.userId, 'margin_alert', 'stripe_customer_id', client.stripe_customer_id ?? client.id);
    if (dup) continue;

    let draft: { subject: string; body: string };
    try {
      draft = await draftRepricingEmail(ctx, client.name, client.margin_pct, client.revenue_mtd, client.cost_mtd);
    } catch {
      draft = {
        subject: `Let's talk about our engagement — ${client.name}`,
        body: `Hi ${client.name},\n\nI wanted to reach out to discuss our current engagement and ensure the pricing reflects the scope of work we're delivering.\n\nWould you be open to a quick call this week?\n\n${ctx.companyName}`,
      };
    }

    const payload: MarginAlertPayload = {
      stripe_customer_id: client.stripe_customer_id ?? client.id,
      client_name: client.name,
      margin_pct: client.margin_pct,
      margin_prior_pct: client.margin_prior_pct,
      revenue_mtd: client.revenue_mtd,
      cost_mtd: client.cost_mtd,
      draft_subject: draft.subject,
      draft_body: draft.body,
    };
    actions.push({ action_type: 'margin_alert', payload });
  }

  return actions;
}
```

- [ ] **Step 2: Create `src/lib/actions/evaluators/hours-budget.ts`**

```typescript
import { openai } from '<npm>/lib/openai';
import { isDuplicate } from '../dedup';
import type { NewAction, HoursBudgetPayload, UserContext } from '../types';

const HARVEST_BASE = 'https://api.harvestapp.com/v2';
const UA = 'OpsRadar (https://opsradar.app)';

function parseCombined(combined: string): { accountId: string; token: string } | null {
  const idx = combined.indexOf(':');
  if (idx <= 0 || idx === combined.length - 1) return null;
  return { accountId: combined.slice(0, idx).trim(), token: combined.slice(idx + 1).trim() };
}

type HarvestProject = {
  id: number;
  name: string;
  budget: number | null;
  budget_by: string;
  is_active: boolean;
  client: { id: number; name: string } | null;
};

type HarvestTimeEntry = { hours: number };

async function fetchProjects(accountId: string, token: string): Promise<HarvestProject[]> {
  const h = {
    Authorization: `Bearer ${token}`,
    'Harvest-Account-Id': accountId,
    'User-Agent': UA,
  };
  const res = await fetch(`${HARVEST_BASE}/projects?is_active=true&per_page=50`, { headers: h });
  if (!res.ok) throw new Error(`Harvest projects fetch failed: ${res.status}`);
  const body = (await res.json()) as { projects?: HarvestProject[] };
  return body.projects ?? [];
}

async function sumProjectHoursThisMonth(accountId: string, token: string, projectId: number): Promise<number> {
  const h = {
    Authorization: `Bearer ${token}`,
    'Harvest-Account-Id': accountId,
    'User-Agent': UA,
  };
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  const params = new URLSearchParams({ project_id: String(projectId), from, to, per_page: '100' });
  const res = await fetch(`${HARVEST_BASE}/time_entries?${params}`, { headers: h });
  if (!res.ok) return 0;
  const body = (await res.json()) as { time_entries?: HarvestTimeEntry[] };
  return (body.time_entries ?? []).reduce((s, e) => s + (Number(e.hours) || 0), 0);
}

async function draftScopeEmail(
  ctx: UserContext,
  clientName: string,
  projectName: string,
  hoursLogged: number,
  budgetHours: number,
): Promise<{ subject: string; body: string }> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a professional project manager. Output strict JSON only.' },
      {
        role: 'user',
        content: `Write a scope conversation email to a client.

Agency: ${ctx.companyName || 'our agency'}
Client: ${clientName}
Project: ${projectName}
Hours used: ${hoursLogged.toFixed(1)} / ${budgetHours} budgeted (${Math.round((hoursLogged / budgetHours) * 100)}% used)

Return JSON: { "subject": "...", "body": "..." }
Rules:
- subject: mentions the project name, professional
- body: 3 paragraphs, explains budget status, proposes options (scope adjustment or additional budget), warm tone
- Sign off as "${ctx.companyName || 'the team'}"`,
      },
    ],
    temperature: 0.4,
  });
  const raw = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as { subject?: string; body?: string };
  return {
    subject: parsed.subject ?? `${projectName} — hours update`,
    body: parsed.body ?? `Hi ${clientName},\n\nI wanted to flag that we've reached the budgeted hours for ${projectName}. Let's discuss how to proceed.\n\n${ctx.companyName}`,
  };
}

export async function evalHoursBudget(
  ctx: UserContext,
  harvestApiKey: string,
): Promise<NewAction[]> {
  const parsed = parseCombined(harvestApiKey);
  if (!parsed) return [];

  let projects: HarvestProject[];
  try {
    projects = await fetchProjects(parsed.accountId, parsed.token);
  } catch (err) {
    console.warn('[evalHoursBudget] projects fetch failed:', err);
    return [];
  }

  // Only projects with hours-based budgets
  const budgetedProjects = projects.filter(
    (p) => p.budget_by === 'project' && typeof p.budget === 'number' && p.budget > 0,
  );

  const actions: NewAction[] = [];

  for (const project of budgetedProjects.slice(0, 20)) {
    const budget = project.budget as number;
    let hoursLogged: number;
    try {
      hoursLogged = await sumProjectHoursThisMonth(parsed.accountId, parsed.token, project.id);
    } catch {
      continue;
    }
    if (hoursLogged <= budget) continue;

    const projectIdStr = String(project.id);
    const dup = await isDuplicate(ctx.userId, 'hours_budget_exceeded', 'harvest_project_id', projectIdStr);
    if (dup) continue;

    const clientName = project.client?.name ?? 'Unknown client';
    const overage = Math.round(((hoursLogged - budget) / budget) * 100);

    let draft: { subject: string; body: string };
    try {
      draft = await draftScopeEmail(ctx, clientName, project.name, hoursLogged, budget);
    } catch {
      draft = {
        subject: `${project.name} — hours update`,
        body: `Hi ${clientName},\n\nWe've used ${hoursLogged.toFixed(1)} of the ${budget} budgeted hours for ${project.name}. Let's connect to discuss next steps.\n\n${ctx.companyName}`,
      };
    }

    const payload: HoursBudgetPayload = {
      client_name: clientName,
      project_name: project.name,
      harvest_project_id: projectIdStr,
      hours_logged: Math.round(hoursLogged * 10) / 10,
      budget_hours: budget,
      overage_pct: overage,
      draft_subject: draft.subject,
      draft_body: draft.body,
    };
    actions.push({ action_type: 'hours_budget_exceeded', payload });
  }

  return actions;
}
```

- [ ] **Step 3: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/evaluators/margin-alert.ts src/lib/actions/evaluators/hours-budget.ts
git commit -m "feat(actions): margin alert + hours budget evaluators"
```

---

## Task 5: Workflow failure + HubSpot→Harvest evaluators

**Files:**
- Create: `src/lib/actions/evaluators/workflow-failure.ts`
- Create: `src/lib/actions/evaluators/hubspot-harvest.ts`

- [ ] **Step 1: Create `src/lib/actions/evaluators/workflow-failure.ts`**

```typescript
import { isDuplicate } from '../dedup';
import type { ClientN8nConfig } from '<npm>/lib/client-n8n';
import type { NewAction, WorkflowFailurePayload, UserContext } from '../types';

const FAILURE_THRESHOLD = 3;

type N8nExecution = {
  id: string;
  workflowId: string;
  workflowData?: { name?: string };
  startedAt?: string;
  stoppedAt?: string;
};

type N8nExecutionListResponse = {
  data?: N8nExecution[];
};

export async function evalWorkflowFailures(
  ctx: UserContext,
  n8nConfig: ClientN8nConfig,
): Promise<NewAction[]> {
  if (!n8nConfig.n8nApiKey) return [];

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let executions: N8nExecution[];
  try {
    const res = await fetch(
      `${n8nConfig.n8nBaseUrl}/api/v1/executions?status=error&limit=100`,
      {
        headers: {
          'X-N8N-API-KEY': n8nConfig.n8nApiKey,
          'Content-Type': 'application/json',
        },
      },
    );
    if (!res.ok) return [];
    const body = (await res.json()) as N8nExecutionListResponse;
    executions = (body.data ?? []).filter(
      (e) => e.startedAt && e.startedAt >= since,
    );
  } catch (err) {
    console.warn('[evalWorkflowFailures] n8n fetch failed:', err);
    return [];
  }

  // Group by workflowId
  const byWorkflow = new Map<string, { name: string; count: number; lastAt: string }>();
  for (const ex of executions) {
    const id = ex.workflowId;
    if (!id) continue;
    const name = ex.workflowData?.name ?? 'Unnamed workflow';
    const startedAt = ex.startedAt ?? new Date().toISOString();
    const cur = byWorkflow.get(id) ?? { name, count: 0, lastAt: startedAt };
    cur.count += 1;
    if (startedAt > cur.lastAt) cur.lastAt = startedAt;
    byWorkflow.set(id, cur);
  }

  const actions: NewAction[] = [];

  for (const [workflowId, info] of byWorkflow) {
    if (info.count < FAILURE_THRESHOLD) continue;

    const dup = await isDuplicate(ctx.userId, 'workflow_failure', 'n8n_workflow_id', workflowId);
    if (dup) continue;

    const payload: WorkflowFailurePayload = {
      n8n_workflow_id: workflowId,
      workflow_name: info.name,
      failure_count: info.count,
      last_failed_at: info.lastAt,
      n8n_base_url: n8nConfig.n8nBaseUrl,
    };
    actions.push({ action_type: 'workflow_failure', payload });
  }

  return actions;
}
```

- [ ] **Step 2: Create `src/lib/actions/evaluators/hubspot-harvest.ts`**

```typescript
import { Client as HubspotClient } from '@hubspot/api-client';
import { isDuplicate } from '../dedup';
import type { NewAction, HubSpotHarvestPayload, UserContext } from '../types';

const LOOKBACK_DAYS = 7;

export async function evalHubSpotHarvest(
  ctx: UserContext,
  hubspotApiKey: string,
): Promise<NewAction[]> {
  const hs = new HubspotClient({ accessToken: hubspotApiKey });
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  let contacts: Array<{ id: string; properties: Record<string, string | null> }>;
  try {
    const resp = await hs.crm.contacts.basicApi.getPage(
      100,
      undefined,
      ['createdate', 'email', 'firstname', 'lastname', 'company'],
      undefined,
      undefined,
      false,
    );
    contacts = resp.results.filter((c) => {
      const created = c.properties?.createdate;
      return created && new Date(created) >= since;
    });
  } catch (err) {
    console.warn('[evalHubSpotHarvest] HubSpot fetch failed:', err);
    return [];
  }

  const actions: NewAction[] = [];

  for (const contact of contacts) {
    const companyName = contact.properties?.company;
    if (!companyName) continue; // skip contacts without a company

    const contactId = contact.id;
    const dup = await isDuplicate(ctx.userId, 'hubspot_harvest_sync', 'hubspot_contact_id', contactId);
    if (dup) continue;

    const payload: HubSpotHarvestPayload = {
      hubspot_contact_id: contactId,
      hubspot_company_name: companyName,
      client_email: contact.properties?.email ?? null,
    };
    actions.push({ action_type: 'hubspot_harvest_sync', payload });
  }

  return actions;
}
```

- [ ] **Step 3: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/evaluators/workflow-failure.ts src/lib/actions/evaluators/hubspot-harvest.ts
git commit -m "feat(actions): workflow failure + HubSpot→Harvest evaluators"
```

---

## Task 6: Main evaluator + executor

**Files:**
- Create: `src/lib/actions/evaluator.ts`
- Create: `src/lib/actions/executor.ts`

- [ ] **Step 1: Create `src/lib/actions/evaluator.ts`**

```typescript
import { Resend } from 'resend';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { getClientN8nConfig } from '<npm>/lib/client-n8n';
import { evalInvoiceReminders } from './evaluators/invoice-reminder';
import { evalMarginAlerts } from './evaluators/margin-alert';
import { evalHoursBudget } from './evaluators/hours-budget';
import { evalWorkflowFailures } from './evaluators/workflow-failure';
import { evalHubSpotHarvest } from './evaluators/hubspot-harvest';
import { executeAction } from './executor';
import { ACTION_RISK } from './types';
import type { NewAction, AgentAction, UserContext } from './types';

const DEFAULT_BLENDED_RATE = 85;

async function insertAction(userId: string, action: NewAction): Promise<AgentAction | null> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('agent_actions')
    .insert({
      user_id: userId,
      action_type: action.action_type,
      status: 'pending',
      payload: action.payload as Record<string, unknown>,
    })
    .select()
    .single();
  if (error || !data) {
    console.error('[insertAction] failed:', error);
    return null;
  }
  return data as AgentAction;
}

export async function evaluateActionsForUser(userId: string): Promise<void> {
  const supabase = getServerSupabaseClient();

  // Fetch user metadata for context
  const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(userId);
  if (userErr || !user) return;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const ctx: UserContext = {
    userId,
    email: user.email ?? '',
    companyName: (meta.company_name as string | undefined) ?? '',
    blendedRate: typeof meta.blended_hourly_rate_usd === 'number'
      ? meta.blended_hourly_rate_usd
      : DEFAULT_BLENDED_RATE,
  };

  // Fetch connected integrations
  const { data: rows } = await supabase
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .eq('status', 'connected');

  const getKey = (tool: string): string | null => {
    const row = (rows ?? []).find((r: { tool: string }) => r.tool === tool);
    try { return row ? decryptApiKey(row) : null; } catch { return null; }
  };

  const stripeKey   = getKey('stripe');
  const harvestKey  = getKey('harvest');
  const hubspotKey  = getKey('hubspot');
  const n8nConfig   = await getClientN8nConfig(userId);

  // Run all evaluators in parallel, silencing individual failures
  const results = await Promise.allSettled([
    stripeKey ? evalInvoiceReminders(ctx, stripeKey) : Promise.resolve([]),
    stripeKey && harvestKey ? evalMarginAlerts(ctx, stripeKey, harvestKey) : Promise.resolve([]),
    harvestKey ? evalHoursBudget(ctx, harvestKey) : Promise.resolve([]),
    n8nConfig ? evalWorkflowFailures(ctx, n8nConfig) : Promise.resolve([]),
    hubspotKey ? evalHubSpotHarvest(ctx, hubspotKey) : Promise.resolve([]),
  ]);

  const proposed: NewAction[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') proposed.push(...r.value);
  }

  // Insert + auto-execute
  for (const action of proposed) {
    const inserted = await insertAction(userId, action);
    if (!inserted) continue;

    if (ACTION_RISK[action.action_type] === 'auto') {
      await executeAction(inserted);
    }
  }
}
```

- [ ] **Step 2: Create `src/lib/actions/executor.ts`**

```typescript
import { Resend } from 'resend';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import type { AgentAction, InvoiceReminderPayload, WorkflowFailurePayload, HubSpotHarvestPayload } from './types';

const resend = new Resend(process.env.RESEND_API_KEY);
const HARVEST_BASE = 'https://api.harvestapp.com/v2';
const UA = 'OpsRadar (https://opsradar.app)';
const UNDO_WINDOW_MS = 30 * 60 * 1000;

export async function executeAction(action: AgentAction): Promise<void> {
  const supabase = getServerSupabaseClient();
  const updatedPayload = { ...(action.payload as Record<string, unknown>) };

  try {
    switch (action.action_type) {
      case 'invoice_reminder': {
        const p = action.payload as InvoiceReminderPayload;
        const { data: emailResult } = await resend.emails.send({
          from: 'OpsRadar Billing <notifications@opsradar.co>',
          to: p.recipient_email,
          subject: p.draft_subject,
          html: `<p style="font-family:sans-serif;line-height:1.6">${p.draft_body.replace(/\n/g, '<br>')}</p>`,
        });
        if (emailResult?.id) updatedPayload.resend_email_id = emailResult.id;
        break;
      }

      case 'workflow_failure': {
        const p = action.payload as WorkflowFailurePayload;
        const { data: { user } } = await supabase.auth.admin.getUserById(action.user_id);
        const founderEmail = user?.email;
        if (founderEmail) {
          const { data: emailResult } = await resend.emails.send({
            from: 'OpsRadar Alerts <notifications@opsradar.co>',
            to: founderEmail,
            subject: `⚠️ Workflow "${p.workflow_name}" failed ${p.failure_count}× in 24h`,
            html: `<p style="font-family:sans-serif;line-height:1.6">
              Your n8n workflow <strong>${p.workflow_name}</strong> has failed
              <strong>${p.failure_count} times</strong> in the last 24 hours.<br><br>
              Last failure: ${new Date(p.last_failed_at).toLocaleString()}<br><br>
              <a href="${p.n8n_base_url}">Open n8n dashboard to investigate →</a>
            </p>`,
          });
          if (emailResult?.id) updatedPayload.resend_email_id = emailResult.id;
        }
        break;
      }

      case 'hubspot_harvest_sync': {
        const p = action.payload as HubSpotHarvestPayload;
        const { data: rows } = await supabase
          .from('integrations')
          .select('tool, encrypted_token, iv, auth_tag, status')
          .eq('client_id', action.user_id)
          .eq('tool', 'harvest')
          .eq('status', 'connected')
          .limit(1);
        const harvestRow = rows?.[0];
        if (!harvestRow) break;
        const combined = decryptApiKey(harvestRow);
        const colonIdx = combined.indexOf(':');
        if (colonIdx <= 0) break;
        const accountId = combined.slice(0, colonIdx);
        const token = combined.slice(colonIdx + 1);
        const res = await fetch(`${HARVEST_BASE}/clients`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Harvest-Account-Id': accountId,
            'User-Agent': UA,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: p.hubspot_company_name }),
        });
        if (res.ok) {
          const body = (await res.json()) as { id?: number };
          if (body.id) updatedPayload.harvest_client_id = String(body.id);
        }
        break;
      }

      // margin_alert + hours_budget_exceeded: no external side effect
      case 'margin_alert':
      case 'hours_budget_exceeded':
        break;
    }

    await supabase
      .from('agent_actions')
      .update({
        status: 'executed',
        executed_at: new Date().toISOString(),
        undo_deadline: new Date(Date.now() + UNDO_WINDOW_MS).toISOString(),
        payload: updatedPayload,
      })
      .eq('id', action.id);

  } catch (err) {
    console.error('[executeAction] failed for', action.action_type, err);
    await supabase
      .from('agent_actions')
      .update({ status: 'failed' })
      .eq('id', action.id);
  }
}
```

- [ ] **Step 3: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/evaluator.ts src/lib/actions/executor.ts
git commit -m "feat(actions): main evaluator orchestrator + executor"
```

---

## Task 7: API route

**Files:**
- Create: `src/app/api/dashboard/actions/route.ts`
- Modify: `src/lib/rate-limit.ts` (add 'dashboard-actions')

- [ ] **Step 1: Add rate limit entry in `src/lib/rate-limit.ts`**

Open `src/lib/rate-limit.ts`. In the `RateLimitName` type (around line 4), add `'dashboard-actions'`. In the `RATE_LIMITS` object (around line 21), add:

```typescript
'dashboard-actions': { limit: 120, window: '1 h' },
```

- [ ] **Step 2: Create `src/app/api/dashboard/actions/route.ts`**

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { executeAction } from '<npm>/lib/actions/executor';
import type { AgentAction } from '<npm>/lib/actions/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/dashboard/actions?status=pending&limit=50
export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status'); // 'pending' | null (all)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 100);

  const supabase = await getSessionSupabaseClient();

  let query = supabase
    .from('agent_actions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (statusFilter) query = query.eq('status', statusFilter);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 });

  // Also return pending count
  const { count } = await supabase
    .from('agent_actions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  return NextResponse.json({ actions: data ?? [], pending_count: count ?? 0 });
}

// PATCH /api/dashboard/actions — approve | dismiss | undo a single action
// Body: { action: 'approve' | 'dismiss' | 'undo', id: string }
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { action?: string; id?: string };
  try {
    body = await request.json() as { action?: string; id?: string };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { action: op, id } = body;
  if (!id || !['approve', 'dismiss', 'undo'].includes(op ?? '')) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }

  // Fetch the action row — use session client so RLS ensures ownership
  const supabase = await getSessionSupabaseClient();
  const { data: row, error: fetchErr } = await supabase
    .from('agent_actions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const agentAction = row as AgentAction;

  if (op === 'dismiss') {
    if (!['pending', 'executed'].includes(agentAction.status)) {
      return NextResponse.json({ error: 'cannot_dismiss' }, { status: 409 });
    }
    await supabase
      .from('agent_actions')
      .update({ status: 'dismissed' })
      .eq('id', id);
    return NextResponse.json({ ok: true });
  }

  if (op === 'undo') {
    if (agentAction.status !== 'executed') {
      return NextResponse.json({ error: 'not_executed' }, { status: 409 });
    }
    if (agentAction.undo_deadline && new Date(agentAction.undo_deadline) < new Date()) {
      return NextResponse.json({ error: 'undo_window_expired' }, { status: 409 });
    }
    await supabase
      .from('agent_actions')
      .update({ status: 'undone', undone_at: new Date().toISOString() })
      .eq('id', id);
    return NextResponse.json({ ok: true });
  }

  if (op === 'approve') {
    if (agentAction.status !== 'pending') {
      return NextResponse.json({ error: 'not_pending' }, { status: 409 });
    }
    await supabase
      .from('agent_actions')
      .update({ status: 'pending', approved_at: new Date().toISOString() })
      .eq('id', id);

    // Execute using service-role client (executor needs admin access)
    const serviceSupabase = getServerSupabaseClient();
    const { data: freshRow } = await serviceSupabase
      .from('agent_actions')
      .select('*')
      .eq('id', id)
      .single();
    if (freshRow) await executeAction(freshRow as AgentAction);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown_op' }, { status: 400 });
}
```

- [ ] **Step 3: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/dashboard/actions/route.ts src/lib/rate-limit.ts
git commit -m "feat(actions): GET/PATCH /api/dashboard/actions route"
```

---

## Task 8: Cron route + vercel.json

**Files:**
- Create: `src/app/api/cron/actions/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Create `src/app/api/cron/actions/route.ts`**

```typescript
import { getServerSupabaseClient, hasServerSupabaseClient } from '<npm>/lib/supabase-server';
import { serverErrorResponse } from '<npm>/lib/security';
import { evaluateActionsForUser } from '<npm>/lib/actions/evaluator';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET) {
    console.error('[actions cron] missing CRON_SECRET');
    return serverErrorResponse();
  }
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasServerSupabaseClient()) return serverErrorResponse();
  const supabase = getServerSupabaseClient();

  // Find distinct users with at least one connected integration
  const { data: rows } = await supabase
    .from('integrations')
    .select('client_id')
    .eq('status', 'connected')
    .not('encrypted_token', 'is', null);

  const userIds = [...new Set((rows ?? []).map((r: { client_id: string }) => r.client_id))];

  const stats = { evaluated: 0, errors: 0 };

  for (const userId of userIds) {
    try {
      await evaluateActionsForUser(userId);
      stats.evaluated++;
    } catch (err) {
      console.error('[actions cron] error for', userId, err);
      stats.errors++;
    }
  }

  console.log('[actions cron] done', stats);
  return Response.json({ ok: true, stats });
}
```

- [ ] **Step 2: Update `vercel.json`**

Read the file first, then add the new cron. The final `vercel.json` should be:

```json
{
  "crons": [
    {
      "path": "/api/cron/followups",
      "schedule": "0 10 * * *"
    },
    {
      "path": "/api/cron/weekly-briefing",
      "schedule": "0 8 * * 1"
    },
    {
      "path": "/api/cron/actions",
      "schedule": "0 9 * * *"
    }
  ]
}
```

- [ ] **Step 3: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/actions/route.ts vercel.json
git commit -m "feat(actions): daily cron to evaluate + auto-execute actions"
```

---

## Task 9: Dashboard UI + sidebar nav

**Files:**
- Create: `src/app/dashboard/actions/page.tsx`
- Create: `src/app/dashboard/actions/_components/actions-feed.tsx`
- Create: `src/app/dashboard/actions/_components/action-card.tsx`
- Modify: `src/app/dashboard/_components/sidebar.tsx`

- [ ] **Step 1: Create `src/app/dashboard/actions/_components/action-card.tsx`**

```typescript
'use client';

import { useState } from 'react';
import type { AgentAction, ActionPayload, InvoiceReminderPayload, MarginAlertPayload, HoursBudgetPayload, WorkflowFailurePayload, HubSpotHarvestPayload } from '<npm>/lib/actions/types';
import { ACTION_LABELS } from '<npm>/lib/actions/types';

type Props = {
  action: AgentAction;
  onUpdate: () => void;
};

function fmtMoney(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

function Summary({ action }: { action: AgentAction }) {
  const p = action.payload as Record<string, unknown>;
  switch (action.action_type) {
    case 'invoice_reminder': {
      const pp = p as InvoiceReminderPayload;
      return <span>{pp.client_name} — {fmtMoney(pp.amount_due)} overdue {pp.days_overdue}d</span>;
    }
    case 'margin_alert': {
      const pp = p as MarginAlertPayload;
      return <span>{pp.client_name} — margin {pp.margin_pct.toFixed(0)}% this month</span>;
    }
    case 'hours_budget_exceeded': {
      const pp = p as HoursBudgetPayload;
      return <span>{pp.client_name} — {pp.project_name}: {pp.hours_logged}h / {pp.budget_hours}h ({pp.overage_pct}% over)</span>;
    }
    case 'workflow_failure': {
      const pp = p as WorkflowFailurePayload;
      return <span>"{pp.workflow_name}" failed {pp.failure_count}× in 24h</span>;
    }
    case 'hubspot_harvest_sync': {
      const pp = p as HubSpotHarvestPayload;
      return <span>{pp.hubspot_company_name} → Harvest</span>;
    }
    default:
      return null;
  }
}

function DraftEmail({ payload }: { payload: ActionPayload }) {
  const p = payload as Record<string, unknown>;
  const subject = p.draft_subject as string | undefined;
  const body = p.draft_body as string | undefined;
  if (!subject && !body) return null;

  return (
    <div className="mt-3 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-3">
      {subject && (
        <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-fg-muted)]">
          Subject: {subject}
        </div>
      )}
      {body && (
        <div className="whitespace-pre-wrap text-[12px] leading-[1.5] text-[var(--color-fg-subtle)]">
          {body}
        </div>
      )}
    </div>
  );
}

export function ActionCard({ action, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasDraft = 'draft_subject' in (action.payload as Record<string, unknown>) ||
    'draft_body' in (action.payload as Record<string, unknown>);

  const canUndo =
    action.status === 'executed' &&
    action.undo_deadline !== null &&
    new Date(action.undo_deadline) > new Date();

  async function patch(op: 'approve' | 'dismiss' | 'undo') {
    setLoading(true);
    try {
      await fetch('/api/dashboard/actions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: op, id: action.id }),
      });
      onUpdate();
    } finally {
      setLoading(false);
    }
  }

  const statusBadge: Record<string, string> = {
    pending:   'bg-amber-500/10 text-amber-400',
    executed:  'bg-emerald-500/10 text-emerald-400',
    dismissed: 'bg-[var(--color-surface-sunken)] text-[var(--color-fg-subtle)]',
    undone:    'bg-[var(--color-surface-sunken)] text-[var(--color-fg-subtle)]',
    failed:    'bg-red-500/10 text-red-400',
  };

  return (
    <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-0.5 flex items-center gap-2">
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge[action.status] ?? ''}`}>
              {action.status}
            </span>
            <span className="text-[12px] font-semibold text-[var(--color-fg)]">
              {ACTION_LABELS[action.action_type]}
            </span>
          </div>
          <div className="text-[12px] text-[var(--color-fg-muted)]">
            <Summary action={action} />
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--color-fg-faint)]">
            {new Date(action.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {action.status === 'pending' && (
            <>
              <button
                onClick={() => void patch('approve')}
                disabled={loading}
                className="rounded-[6px] bg-[var(--color-primary)] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => void patch('dismiss')}
                disabled={loading}
                className="rounded-[6px] border border-[var(--color-border)] px-3 py-1.5 text-[11.5px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] disabled:opacity-50"
              >
                Dismiss
              </button>
            </>
          )}
          {canUndo && (
            <button
              onClick={() => void patch('undo')}
              disabled={loading}
              className="rounded-[6px] border border-[var(--color-border)] px-3 py-1.5 text-[11.5px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] disabled:opacity-50"
            >
              Undo
            </button>
          )}
          {hasDraft && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="rounded-[6px] border border-[var(--color-border)] px-2.5 py-1.5 text-[11.5px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            >
              {expanded ? 'Hide' : 'Draft'}
            </button>
          )}
        </div>
      </div>

      {expanded && hasDraft && <DraftEmail payload={action.payload} />}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/dashboard/actions/_components/actions-feed.tsx`**

```typescript
'use client';

import { useCallback, useEffect, useState } from 'react';
import { ActionCard } from './action-card';
import type { AgentAction } from '<npm>/lib/actions/types';

type Tab = 'pending' | 'history';

export function ActionsFeed() {
  const [tab, setTab] = useState<Tab>('pending');
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = tab === 'pending' ? '?status=pending&limit=50' : '?limit=50';
      const res = await fetch(`/api/dashboard/actions${params}`);
      const data = await res.json() as { actions?: AgentAction[]; pending_count?: number };
      setActions(data.actions ?? []);
      if (data.pending_count != null) setPendingCount(data.pending_count);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      {/* Tabs */}
      <div className="mb-5 flex gap-1 border-b border-[var(--color-border)]">
        {(['pending', 'history'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 pb-2.5 text-[13px] font-medium capitalize transition-colors ${
              tab === t
                ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
            }`}
          >
            {t === 'pending' ? `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` : 'History'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-[12.5px] text-[var(--color-fg-subtle)]">Loading…</div>
      ) : actions.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-[var(--color-border)] px-6 py-10 text-center">
          <div className="mb-1 text-[14px] font-semibold text-[var(--color-fg)]">
            {tab === 'pending' ? 'No actions pending' : 'No actions yet'}
          </div>
          <p className="text-[12.5px] text-[var(--color-fg-subtle)]">
            {tab === 'pending'
              ? 'OpsRadar will surface actions here when it detects something that needs attention.'
              : 'Completed and dismissed actions will appear here.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {actions.map((a) => (
            <ActionCard key={a.id} action={a} onUpdate={() => void load()} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/app/dashboard/actions/page.tsx`**

```typescript
import { ActionsFeed } from './_components/actions-feed';

export default function ActionsPage() {
  return (
    <>
      <div className="mb-7">
        <h1 className="mb-1.5 font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Actions
        </h1>
        <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
          AI-detected triggers that need your attention or approval. Auto-actions execute immediately with a 30-minute undo window.
        </p>
      </div>
      <ActionsFeed />
    </>
  );
}
```

- [ ] **Step 4: Update sidebar — add "Actions" nav item**

In `src/app/dashboard/_components/sidebar.tsx`, modify the `navSections` array to add an Actions nav item and add a `pendingActions` state.

Replace the `navSections` const and the component with:

```typescript
// In imports, add: { Zap } to the lucide-react import
import {
  LayoutDashboard,
  Activity,
  TrendingUp,
  DollarSign,
  Plug,
  Settings,
  ChevronRight,
  Zap,
} from 'lucide-react';

// Replace navSections:
const navSections: NavSection[] = [
  {
    tag: null,
    items: [
      { label: 'Overview',        href: '/dashboard',                    icon: LayoutDashboard },
      { label: 'Automations',     href: '/dashboard/automations',        icon: Activity        },
      { label: 'Business',        href: '/dashboard/business',           icon: TrendingUp      },
      { label: 'Profitability',   href: '/dashboard/profitability',      icon: DollarSign      },
      { label: 'Actions',         href: '/dashboard/actions',            icon: Zap             },
    ],
  },
  {
    tag: 'WORKSPACE',
    items: [
      { label: 'Integrations', href: '/dashboard/integrations', icon: Plug },
      { label: 'Settings',     href: '/dashboard/settings',     icon: Settings },
    ],
  },
];
```

In the `Sidebar` component body, add state for `pendingActions` and a useEffect to fetch it:

```typescript
const [pendingActions, setPendingActions] = useState(0);

useEffect(() => {
  fetch('/api/dashboard/actions?status=pending&limit=1')
    .then((r) => r.json())
    .then((d: { pending_count?: number }) => setPendingActions(d.pending_count ?? 0))
    .catch(() => {});
}, []);
```

In the Link render for nav items, update the badge logic to also handle `/dashboard/actions`:

```typescript
{href === '/dashboard' && unreadBriefings > 0 && (
  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
)}
{href === '/dashboard/actions' && pendingActions > 0 && (
  <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[9px] font-bold text-white">
    {pendingActions}
  </span>
)}
```

- [ ] **Step 5: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/actions/ src/app/dashboard/_components/sidebar.tsx
git commit -m "feat(actions): dashboard page, action cards, sidebar nav badge"
```

---

## Task 10: Build verify

- [ ] **Step 1: Run production build**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` with `/dashboard/actions` in the route list.

- [ ] **Step 2: Verify routes compiled**

```bash
npm run build 2>&1 | grep -E "actions"
```

Expected: lines for `/dashboard/actions` and `/api/dashboard/actions` and `/api/cron/actions`.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(actions): Phase 4 Agentic Actions — evaluate, queue, approve, auto-execute" --allow-empty
```

---

## Self-Review

**Spec coverage:**
- ✅ Action catalog — invoice_reminder, margin_alert, hours_budget_exceeded, workflow_failure, hubspot_harvest_sync
- ✅ Auto risk level — invoice_reminder, workflow_failure, hubspot_harvest_sync execute immediately
- ✅ Approval required — margin_alert, hours_budget_exceeded sit in pending queue
- ✅ 30-minute undo window — undo_deadline set on all executed actions
- ✅ `agent_actions` Supabase table — Task 1 migration
- ✅ `/dashboard/actions` page — pending queue + history tabs
- ✅ One-click approve / dismiss — action-card.tsx
- ✅ Shows what will happen before execution — draft email displayed via DraftEmail component
- ✅ Activity feed — History tab shows all statuses
- ✅ Dedup — isDuplicate prevents re-queuing within lookback window
- ✅ Daily cron — `/api/cron/actions` runs at 9am UTC
- ✅ Sidebar badge — pending count shown on Actions nav item
- ✅ RLS — `agent_actions` table has row-level security by user_id

**Placeholder scan:** None. All tasks contain complete code.

**Type consistency:**
- `AgentAction.action_type` is `ActionType` — used consistently across evaluators, executor, and UI
- `ACTION_LABELS[action.action_type]` — all 5 action types have entries in ACTION_LABELS
- `isDuplicate(userId, actionType, identityKey, identityValue)` — called with consistent identity keys in each evaluator: invoice_reminder→'invoice_id', margin_alert→'stripe_customer_id', hours_budget_exceeded→'harvest_project_id', workflow_failure→'n8n_workflow_id', hubspot_harvest_sync→'hubspot_contact_id'
- `UserContext` is created in `evaluator.ts` and passed to all sub-evaluators
