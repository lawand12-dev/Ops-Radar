# AI-Native Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform OpsRadar from a data dashboard into a true AI-native COO — where the AI detects problems before they happen, explains the business in plain English, and generates a shareable proof of value.

**Architecture:** Three waves building on each other: Wave A adds new insight signals (scope risk, health scores, onboarding aha-moment); Wave B wires all data into a conversational COO interface backed by real-time context injection; Wave C computes an agency-wide scorecard with a viral share link. All new data is computed live — no client business data persisted in Supabase (hard rule). Score snapshots are the only new DB table and store only derived scores, never raw client data.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Supabase Auth (user_metadata), GPT-4o (`response_format: json_object`), Stripe SDK, Harvest API, Upstash Redis (rate limiting), `<npm>/*` path alias.

---

## File Map

### Wave A — Insight Engine
| Action | File |
|--------|------|
| Modify | `src/lib/actions/types.ts` — add `scope_approaching` ActionType + payload |
| Modify | `src/lib/actions/dedup.ts` — add lookback for new type |
| Create | `src/lib/actions/evaluators/scope-approaching.ts` — 75–99% budget evaluator |
| Modify | `src/lib/actions/evaluator.ts` — wire scope-approaching evaluator |
| Modify | `src/lib/profitability.ts` — add `health_score` to `ClientProfitability` |
| Modify | `src/app/dashboard/_components/profitability-table.tsx` — add health score column |
| Modify | `src/lib/rate-limit.ts` — add `dashboard-health-report` name |
| Create | `src/lib/health-report.ts` — GPT-4o findings generator |
| Create | `src/app/api/dashboard/health-report/route.ts` — GET endpoint |
| Create | `src/app/dashboard/_components/health-report-banner.tsx` — dismissable banner |
| Modify | `src/app/dashboard/page.tsx` — mount banner |

### Wave B — COO Chat
| Action | File |
|--------|------|
| Modify | `src/lib/rate-limit.ts` — add `dashboard-coo` name |
| Create | `src/lib/coo/context.ts` — fetch all live agency context (overview, cash flow, capacity, rate advice) |
| Create | `src/app/api/dashboard/coo/route.ts` — POST endpoint, injects context into GPT-4o |
| Create | `src/app/dashboard/coo/page.tsx` — chat page |
| Create | `src/app/dashboard/coo/_components/coo-chat.tsx` — 'use client' chat UI |
| Modify | `src/app/dashboard/_components/sidebar.tsx` — add COO nav item |

### Wave C — Agency Score
| Action | File |
|--------|------|
| Modify | `src/lib/rate-limit.ts` — add `dashboard-score` name |
| Modify | `src/lib/database.types.ts` — add `score_snapshots` table types |
| Create | `src/lib/agency-score.ts` — score computation (5 dimensions, A–F) |
| Create | `src/app/api/dashboard/score/route.ts` — GET (compute) + POST (generate share link) |
| Create | `src/app/dashboard/score/page.tsx` — scorecard page |
| Modify | `src/app/dashboard/_components/sidebar.tsx` — add Score nav item |
| Create | `src/app/share/score/[token]/page.tsx` — public share page (server component) |

---

## Task 1: Scope Approaching Evaluator

Adds a new `scope_approaching` action type that fires when a Harvest project reaches 75–99% of its hours budget — before it overflows. Distinct from the existing `hours_budget_exceeded` evaluator (>100%).

**Files:**
- Modify: `src/lib/actions/types.ts`
- Modify: `src/lib/actions/dedup.ts`
- Create: `src/lib/actions/evaluators/scope-approaching.ts`
- Modify: `src/lib/actions/evaluator.ts`

- [ ] **Step 1: Update ActionType, payload, labels, and risk in `src/lib/actions/types.ts`**

Replace the `ActionType` union and associated records. Add `ScopeApproachingPayload` to the payload union. Full new file:

```typescript
export type ActionType =
  | 'invoice_reminder'
  | 'margin_alert'
  | 'hours_budget_exceeded'
  | 'scope_approaching'
  | 'workflow_failure'
  | 'hubspot_harvest_sync'

export type ActionStatus =
  | 'pending'
  | 'executed'
  | 'dismissed'
  | 'undone'
  | 'failed'

export type ActionRisk = 'auto' | 'approval'

export const ACTION_RISK: Record<ActionType, ActionRisk> = {
  invoice_reminder:      'auto',
  margin_alert:          'approval',
  hours_budget_exceeded: 'approval',
  scope_approaching:     'approval',
  workflow_failure:      'auto',
  hubspot_harvest_sync:  'auto',
}

export const ACTION_LABELS: Record<ActionType, string> = {
  invoice_reminder:      'Payment reminder sent',
  margin_alert:          'Repricing email ready',
  hours_budget_exceeded: 'Scope conversation ready',
  scope_approaching:     'Scope warning — approaching budget',
  workflow_failure:      'Workflow failure alert sent',
  hubspot_harvest_sync:  'New client synced to Harvest',
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

export type ScopeApproachingPayload = {
  client_name: string
  project_name: string
  harvest_project_id: string
  hours_logged: number
  budget_hours: number
  used_pct: number
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
  | ScopeApproachingPayload
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

- [ ] **Step 2: Add `scope_approaching` lookback to `src/lib/actions/dedup.ts`**

Add the new type to `LOOKBACK_MS`:

```typescript
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import type { ActionType } from './types';

const LOOKBACK_MS: Record<ActionType, number> = {
  invoice_reminder:      7  * 24 * 60 * 60 * 1000,
  margin_alert:          7  * 24 * 60 * 60 * 1000,
  hours_budget_exceeded: 7  * 24 * 60 * 60 * 1000,
  scope_approaching:     7  * 24 * 60 * 60 * 1000,
  workflow_failure:      24 *      60 * 60 * 1000,
  hubspot_harvest_sync:  30 * 24 * 60 * 60 * 1000,
};

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

- [ ] **Step 3: Create `src/lib/actions/evaluators/scope-approaching.ts`**

```typescript
import { openai } from '<npm>/lib/openai';
import { isDuplicate } from '../dedup';
import type { NewAction, ScopeApproachingPayload, UserContext } from '../types';

const HARVEST_BASE = 'https://api.harvestapp.com/v2';
const UA = 'OpsRadar (https://opsradar.app)';
const APPROACHING_THRESHOLD = 0.75; // fire at 75%+

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

async function draftHeadsUpEmail(
  ctx: UserContext,
  clientName: string,
  projectName: string,
  hoursLogged: number,
  budgetHours: number,
): Promise<{ subject: string; body: string }> {
  const usedPct = Math.round((hoursLogged / budgetHours) * 100);
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a professional project manager. Output strict JSON only.' },
      {
        role: 'user',
        content: `Write a proactive heads-up email to a client about approaching their project hours budget.

Agency: ${ctx.companyName || 'our agency'}
Client: ${clientName}
Project: ${projectName}
Hours used: ${hoursLogged.toFixed(1)} of ${budgetHours} budgeted (${usedPct}% used)

Return JSON: { "subject": "...", "body": "..." }
Rules:
- subject: mentions the project, professional, not alarming
- body: 2-3 short paragraphs, proactive and constructive tone, proposes a check-in call to review remaining scope
- Do NOT say the budget is exceeded — say it is approaching
- Sign off as "${ctx.companyName || 'the team'}"`,
      },
    ],
    temperature: 0.4,
  });
  const raw = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as { subject?: string; body?: string };
  return {
    subject: parsed.subject ?? `${projectName} — hours update`,
    body: parsed.body ?? `Hi ${clientName},\n\nWe wanted to flag that ${projectName} has used ${usedPct}% of its hours budget. Let's schedule a quick check-in to review remaining scope.\n\n${ctx.companyName}`,
  };
}

export async function evalScopeApproaching(
  ctx: UserContext,
  harvestApiKey: string,
): Promise<NewAction[]> {
  const parsed = parseCombined(harvestApiKey);
  if (!parsed) return [];

  let projects: HarvestProject[];
  try {
    projects = await fetchProjects(parsed.accountId, parsed.token);
  } catch (err) {
    console.warn('[evalScopeApproaching] projects fetch failed:', err);
    return [];
  }

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

    const usedPct = hoursLogged / budget;
    // Only fire for approaching (75-99%) — hours_budget_exceeded handles >100%
    if (usedPct < APPROACHING_THRESHOLD || usedPct >= 1.0) continue;

    const projectIdStr = String(project.id);
    const dup = await isDuplicate(ctx.userId, 'scope_approaching', 'harvest_project_id', projectIdStr);
    if (dup) continue;

    const clientName = project.client?.name ?? 'Unknown client';
    const usedPctInt = Math.round(usedPct * 100);

    let draft: { subject: string; body: string };
    try {
      draft = await draftHeadsUpEmail(ctx, clientName, project.name, hoursLogged, budget);
    } catch {
      draft = {
        subject: `${project.name} — hours update`,
        body: `Hi ${clientName},\n\nWe wanted to flag that ${project.name} has used ${usedPctInt}% of its hours budget. Let's connect to review next steps.\n\n${ctx.companyName}`,
      };
    }

    const payload: ScopeApproachingPayload = {
      client_name: clientName,
      project_name: project.name,
      harvest_project_id: projectIdStr,
      hours_logged: Math.round(hoursLogged * 10) / 10,
      budget_hours: budget,
      used_pct: usedPctInt,
      draft_subject: draft.subject,
      draft_body: draft.body,
    };
    actions.push({ action_type: 'scope_approaching', payload });
  }

  return actions;
}
```

- [ ] **Step 4: Wire scope-approaching into `src/lib/actions/evaluator.ts`**

Add the import and the evaluator call. The relevant section to change is the `Promise.allSettled` block and the imports:

```typescript
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { getClientN8nConfig } from '<npm>/lib/client-n8n';
import { evalInvoiceReminders } from './evaluators/invoice-reminder';
import { evalMarginAlerts } from './evaluators/margin-alert';
import { evalHoursBudget } from './evaluators/hours-budget';
import { evalScopeApproaching } from './evaluators/scope-approaching';
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
      payload: action.payload as unknown as import('<npm>/lib/database.types').Json,
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

  const { data: rows } = await supabase
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .eq('status', 'connected');

  const getKey = (tool: string): string | null => {
    const row = (rows ?? []).find((r: { tool: string }) => r.tool === tool);
    try { return row ? decryptApiKey(row) : null; } catch { return null; }
  };

  const stripeKey  = getKey('stripe');
  const harvestKey = getKey('harvest');
  const hubspotKey = getKey('hubspot');
  const n8nConfig  = await getClientN8nConfig(userId);

  const results = await Promise.allSettled([
    stripeKey ? evalInvoiceReminders(ctx, stripeKey) : Promise.resolve([]),
    stripeKey && harvestKey ? evalMarginAlerts(ctx, stripeKey, harvestKey) : Promise.resolve([]),
    harvestKey ? evalHoursBudget(ctx, harvestKey) : Promise.resolve([]),
    harvestKey ? evalScopeApproaching(ctx, harvestKey) : Promise.resolve([]),
    n8nConfig ? evalWorkflowFailures(ctx, n8nConfig) : Promise.resolve([]),
    hubspotKey ? evalHubSpotHarvest(ctx, hubspotKey) : Promise.resolve([]),
  ]);

  const proposed: NewAction[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') proposed.push(...r.value);
  }

  for (const action of proposed) {
    const inserted = await insertAction(userId, action);
    if (!inserted) continue;

    if (ACTION_RISK[action.action_type] === 'auto') {
      await executeAction(inserted);
    }
  }
}
```

- [ ] **Step 5: Type-check**

Run from `opsradar/`:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions/types.ts src/lib/actions/dedup.ts src/lib/actions/evaluators/scope-approaching.ts src/lib/actions/evaluator.ts
git commit -m "feat(actions): scope_approaching evaluator — fires at 75-99% hours budget"
```

---

## Task 2: Client Health Score

Adds a `health_score` (0–100) to each `ClientProfitability` record. Computed from payment behaviour (40%), margin level (35%), and margin trend (25%). Shown as a colored pill in the profitability table.

**Files:**
- Modify: `src/lib/profitability.ts`
- Modify: `src/app/dashboard/_components/profitability-table.tsx`

- [ ] **Step 1: Add `health_score` to `ClientProfitability` in `src/lib/profitability.ts`**

Add the field to the type and compute it inside `computeClientProfitability`. First, add the field to the type:

In `src/lib/profitability.ts`, update `ClientProfitability`:

```typescript
export type ClientProfitability = {
  id: string;
  name: string;
  revenue_mtd: number;
  revenue_prior: number;
  hours_mtd: number;
  hours_prior: number;
  blended_rate_usd: number;
  cost_mtd: number;
  margin_pct: number;
  margin_prior_pct: number | null;
  trend: 'up' | 'down' | 'flat';
  payment_status: 'on_time' | 'overdue' | 'unknown';
  days_overdue: number | null;
  health_score: number;
  stripe_customer_id: string | null;
  matched: boolean;
};
```

Then add the helper function `computeHealthScore` inside `profitability.ts` (add it after `computeTrend`):

```typescript
function computeHealthScore(
  paymentStatus: 'on_time' | 'overdue' | 'unknown',
  daysOverdue: number | null,
  marginPct: number,
  trend: 'up' | 'down' | 'flat',
): number {
  // Payment component (40 pts)
  let payment = 40;
  if (paymentStatus === 'overdue') {
    const days = daysOverdue ?? 0;
    payment = days > 30 ? 0 : days > 14 ? 10 : 25;
  } else if (paymentStatus === 'unknown') {
    payment = 30;
  }

  // Margin component (35 pts)
  let margin = 0;
  if (marginPct >= 30) margin = 35;
  else if (marginPct >= 20) margin = 28;
  else if (marginPct >= 10) margin = 18;
  else if (marginPct >= 0) margin = 8;

  // Trend component (25 pts)
  const trendScore = trend === 'up' ? 25 : trend === 'flat' ? 15 : 5;

  return payment + margin + trendScore;
}
```

Then wire it into the client assembly loop in `computeClientProfitability`. Find the place where each `ClientProfitability` object is constructed and add `health_score: computeHealthScore(paymentStatus, daysOverdue, marginPct, trend)` to the object literal. The exact location depends on the existing code — search for where `margin_prior_pct` is set and add `health_score` after `trend`.

- [ ] **Step 2: Add health score column to profitability table**

In `src/app/dashboard/_components/profitability-table.tsx`, add the column header in the `<thead>` section and a `HealthBadge` component. 

Add after the `"Trend"` th:

In the `thead` row, after the Trend `<th>`:
```tsx
<th className="pb-2 text-left text-label font-normal text-[var(--color-fg-subtle)]">Health</th>
```

Add this component at the bottom of the file:

```tsx
function HealthBadge({ score }: { score: number }) {
  const label = score >= 80 ? 'Strong' : score >= 60 ? 'Good' : score >= 40 ? 'At risk' : 'Critical';
  const color =
    score >= 80 ? 'text-emerald-400 bg-emerald-400/10' :
    score >= 60 ? 'text-[var(--color-fg-muted)] bg-[var(--color-surface-sunken)]' :
    score >= 40 ? 'text-amber-400 bg-amber-400/10' :
    'text-[var(--color-error)] bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-label font-medium ${color}`}>
      {label}
    </span>
  );
}
```

In `ClientRow`, add a new `<td>` after the Trend `<td>`:
```tsx
<td className="py-3">
  <HealthBadge score={c.health_score} />
</td>
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors. If TypeScript complains that `health_score` is missing from a construction site in `profitability.ts`, add it there.

- [ ] **Step 4: Commit**

```bash
git add src/lib/profitability.ts src/app/dashboard/_components/profitability-table.tsx
git commit -m "feat(profitability): client health score column — 0-100 composite score"
```

---

## Task 3: Instant Health Report

A dismissable banner on the dashboard home page that appears once after a user connects integrations. Fetches 3 AI-generated findings specific to their real numbers. Dismissed state stored in `localStorage`.

**Files:**
- Modify: `src/lib/rate-limit.ts`
- Create: `src/lib/health-report.ts`
- Create: `src/app/api/dashboard/health-report/route.ts`
- Create: `src/app/dashboard/_components/health-report-banner.tsx`
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Add rate limit name to `src/lib/rate-limit.ts`**

Add `'dashboard-health-report'` to the `RateLimitName` union and the `RATE_LIMITS` record:

In the union type:
```typescript
  | 'dashboard-health-report'
```

In `RATE_LIMITS`:
```typescript
  'dashboard-health-report': { limit: 20, window: '1 h' },
```

- [ ] **Step 2: Create `src/lib/health-report.ts`**

```typescript
import Stripe from 'stripe'
import { openai } from '<npm>/lib/openai'
import { computeClientProfitability } from '<npm>/lib/profitability'
import { fetchStripePerClientRevenue } from '<npm>/lib/integrations/stripe/profitability-adapter'
import { fetchHarvestPerClientHours } from '<npm>/lib/integrations/harvest/profitability-adapter'

export type HealthFinding = {
  title: string
  insight: string
  severity: 'good' | 'warn' | 'bad'
}

export type HealthReport = {
  findings: HealthFinding[]
  generated_at: string
}

async function getOverdueStats(stripeApiKey: string): Promise<{ count: number; total: number }> {
  try {
    const stripe = new Stripe(stripeApiKey, { typescript: true, maxNetworkRetries: 2 })
    const resp = await stripe.invoices.list({ status: 'open', limit: 50 })
    const now = Math.floor(Date.now() / 1000)
    const overdue = resp.data.filter((inv) => inv.due_date && inv.due_date < now)
    const total = overdue.reduce((s, inv) => s + (inv.amount_due ?? 0) / 100, 0)
    return { count: overdue.length, total }
  } catch {
    return { count: 0, total: 0 }
  }
}

export async function generateHealthReport(opts: {
  stripeApiKey: string | null
  harvestApiKey: string | null
  blendedRate: number
  companyName: string
}): Promise<HealthReport> {
  const { stripeApiKey, harvestApiKey, blendedRate, companyName } = opts

  let profitabilitySummary = 'No profitability data available.'
  let overdueStr = 'No overdue invoice data available.'
  let clientCount = 0
  let belowBreakeven = 0

  if (stripeApiKey && harvestApiKey) {
    try {
      const [stripeData, harvestData] = await Promise.all([
        fetchStripePerClientRevenue(stripeApiKey),
        fetchHarvestPerClientHours(harvestApiKey),
      ])
      const result = computeClientProfitability(stripeData, harvestData, blendedRate)
      clientCount = result.clients.length
      belowBreakeven = result.clients.filter((c) => c.margin_pct < 0).length
      const margins = result.clients.map((c) => c.margin_pct).filter(Number.isFinite)
      const medianMargin = margins.length
        ? margins.sort((a, b) => a - b)[Math.floor(margins.length / 2)]!
        : null
      const topClient = [...result.clients].sort((a, b) => b.revenue_mtd - a.revenue_mtd)[0]
      const topRevenue = result.clients.reduce((s, c) => s + c.revenue_mtd, 0)
      const topConcentration = topClient && topRevenue > 0
        ? Math.round((topClient.revenue_mtd / topRevenue) * 100)
        : null

      profitabilitySummary = [
        `Active clients: ${clientCount}`,
        medianMargin !== null ? `Median margin: ${medianMargin.toFixed(1)}%` : null,
        belowBreakeven > 0 ? `Clients below break-even: ${belowBreakeven}` : null,
        topConcentration !== null ? `Top client concentration: ${topConcentration}% of revenue` : null,
      ].filter(Boolean).join('; ')
    } catch {
      profitabilitySummary = 'Profitability data temporarily unavailable.'
    }
  }

  if (stripeApiKey) {
    const { count, total } = await getOverdueStats(stripeApiKey)
    if (count > 0) {
      overdueStr = `${count} overdue invoice${count > 1 ? 's' : ''} totalling $${total.toFixed(0)}`
    } else {
      overdueStr = 'No overdue invoices — all payments current'
    }
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are an expert agency CFO. Generate a concise agency health report as strict JSON only.',
      },
      {
        role: 'user',
        content: `Generate exactly 3 health findings for this agency.

Agency: ${companyName || 'this agency'}
${profitabilitySummary}
Invoice status: ${overdueStr}

Return JSON: { "findings": [ { "title": "...", "insight": "...", "severity": "good"|"warn"|"bad" }, ... ] }
Rules:
- Each finding must reference a specific number from the data above
- title: 3-5 words, punchy (e.g. "2 clients losing money")
- insight: 1 sentence, specific, actionable
- severity: "good" for positives, "bad" for urgent problems, "warn" for things to watch
- Do NOT invent numbers not in the data above
- Prioritise the most financially impactful findings`,
      },
    ],
    temperature: 0.3,
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'
  let findings: HealthFinding[] = []
  try {
    const parsed = JSON.parse(raw) as { findings?: HealthFinding[] }
    findings = (parsed.findings ?? []).slice(0, 3)
  } catch {
    findings = [{
      title: 'Agency data loaded',
      insight: 'Your integrations are connected and data is flowing in.',
      severity: 'good',
    }]
  }

  return { findings, generated_at: new Date().toISOString() }
}
```

- [ ] **Step 3: Create `src/app/api/dashboard/health-report/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { decryptApiKey } from '<npm>/lib/integrations/crypto'
import { generateHealthReport } from '<npm>/lib/health-report'
import { applyRateLimit } from '<npm>/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await applyRateLimit(request, 'dashboard-health-report', userId)
  if (limited) return limited as NextResponse

  const service = getServerSupabaseClient()
  const { data: { user }, error: userErr } = await service.auth.admin.getUserById(userId)
  if (userErr || !user) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const blendedRate = typeof meta.blended_hourly_rate_usd === 'number'
    ? meta.blended_hourly_rate_usd
    : 85
  const companyName = typeof meta.company_name === 'string' ? meta.company_name : ''

  const session = await getSessionSupabaseClient()
  const { data: keyRows } = await session
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .eq('status', 'connected')

  const getKey = (tool: string): string | null => {
    const row = (keyRows ?? []).find((r) => r.tool === tool)
    try { return row ? decryptApiKey(row) : null } catch { return null }
  }

  const stripeApiKey = getKey('stripe')
  const harvestApiKey = getKey('harvest')

  if (!stripeApiKey && !harvestApiKey) {
    return NextResponse.json({ report: null, reason: 'no_integrations' })
  }

  try {
    const report = await generateHealthReport({ stripeApiKey, harvestApiKey, blendedRate, companyName })
    return NextResponse.json({ report })
  } catch (err) {
    console.error('[health-report] generation failed:', err)
    return NextResponse.json({ error: 'generation_failed' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Create `src/app/dashboard/_components/health-report-banner.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { X, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import type { HealthFinding, HealthReport } from '<npm>/lib/health-report';

const DISMISSED_KEY = 'opsradar_health_report_dismissed';

function SeverityIcon({ severity }: { severity: HealthFinding['severity'] }) {
  if (severity === 'good') return <CheckCircle size={14} className="shrink-0 text-emerald-400" />;
  if (severity === 'bad')  return <AlertTriangle size={14} className="shrink-0 text-[var(--color-error)]" />;
  return <TrendingUp size={14} className="shrink-0 text-amber-400" />;
}

function severityColor(s: HealthFinding['severity']): string {
  if (s === 'good') return 'text-emerald-400';
  if (s === 'bad')  return 'text-[var(--color-error)]';
  return 'text-amber-400';
}

type State =
  | { kind: 'hidden' }
  | { kind: 'loading' }
  | { kind: 'ok'; report: HealthReport }
  | { kind: 'err' };

export function HealthReportBanner() {
  const [state, setState] = useState<State>({ kind: 'hidden' });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    setState({ kind: 'loading' });
    fetch('/api/dashboard/health-report')
      .then((r) => r.json())
      .then((j: { report?: HealthReport | null; reason?: string; error?: string }) => {
        if (j.report) {
          setState({ kind: 'ok', report: j.report });
        } else {
          setState({ kind: 'hidden' });
        }
      })
      .catch(() => setState({ kind: 'err' }));
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setState({ kind: 'hidden' });
  }

  if (state.kind === 'hidden' || state.kind === 'err') return null;

  if (state.kind === 'loading') {
    return (
      <div className="animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="h-3 w-48 rounded bg-[var(--color-surface-sunken)]" />
        <div className="mt-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-3 w-full rounded bg-[var(--color-surface-sunken)]" />
          ))}
        </div>
      </div>
    );
  }

  const { findings } = state.report;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-xs)]">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
          Agency Health Report
        </span>
        <button onClick={dismiss} className="text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)]">
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {findings.map((f, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <SeverityIcon severity={f.severity} />
              <span className={`text-[12.5px] font-semibold ${severityColor(f.severity)}`}>
                {f.title}
              </span>
            </div>
            <p className="text-[12px] leading-[1.5] text-[var(--color-fg-muted)]">{f.insight}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Mount banner in `src/app/dashboard/page.tsx`**

Add the import at the top:
```typescript
import { HealthReportBanner } from './_components/health-report-banner';
```

Add `<HealthReportBanner />` as the first element inside the outer `<div className="flex flex-col gap-3.5">`, before `<Topbar />`:
```tsx
<div className="flex flex-col gap-3.5">
  <HealthReportBanner />
  <Topbar />
  ...
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/rate-limit.ts src/lib/health-report.ts src/app/api/dashboard/health-report/route.ts src/app/dashboard/_components/health-report-banner.tsx src/app/dashboard/page.tsx
git commit -m "feat(dashboard): instant health report banner — 3 AI findings on first visit"
```

---

## Task 4: COO Chat Context Engine

All the live data-fetching functions the COO chat injects into GPT-4o's system prompt. These are pure server-side helpers — no UI yet.

**Files:**
- Create: `src/lib/coo/context.ts`

- [ ] **Step 1: Create `src/lib/coo/context.ts`**

```typescript
import Stripe from 'stripe'
import { computeClientProfitability } from '<npm>/lib/profitability'
import { fetchStripePerClientRevenue } from '<npm>/lib/integrations/stripe/profitability-adapter'
import { fetchHarvestPerClientHours } from '<npm>/lib/integrations/harvest/profitability-adapter'
import { collectUserMetrics } from '<npm>/lib/benchmarks/collect'
import { bucketForTeamSize } from '<npm>/lib/benchmarks/buckets'

export type AgencyOverview = {
  company_name: string
  active_clients: number
  total_revenue_mtd: number
  median_margin_pct: number | null
  clients_below_breakeven: number
  overdue_invoices: { count: number; total_usd: number }
  connected_tools: string[]
}

export type CashFlowOutlook = {
  open_invoices_total_usd: number
  open_invoices_due_next_30d_usd: number
  avg_days_to_pay: number | null
}

export type CapacityStatus = {
  team_size_raw: string
  estimated_monthly_capacity_hours: number | null
  hours_tracked_this_month: number | null
  utilization_pct: number | null
  available_hours: number | null
}

export type RateAdvice = {
  current_blended_rate_usd: number
  median_client_margin_pct: number | null
  suggested_rate_usd: number | null
  annual_impact_usd: number | null
  clients_to_reprice: Array<{ name: string; margin_pct: number }>
}

export type CooContext = {
  overview: AgencyOverview
  cash_flow: CashFlowOutlook
  capacity: CapacityStatus
  rate_advice: RateAdvice
  pending_actions_count: number
}

function teamSizeMin(raw: string): number | null {
  if (!raw) return null
  if (raw === '1') return 1
  const m = raw.match(/^(\d+)/)
  return m ? parseInt(m[1]!) : null
}

async function fetchOverview(
  stripeApiKey: string | null,
  harvestApiKey: string | null,
  blendedRate: number,
  companyName: string,
  connectedTools: string[],
): Promise<AgencyOverview> {
  let activeClients = 0
  let totalRevenue = 0
  let medianMargin: number | null = null
  let belowBreakeven = 0
  let overdueCount = 0
  let overdueTotal = 0

  if (stripeApiKey && harvestApiKey) {
    try {
      const [sd, hd] = await Promise.all([
        fetchStripePerClientRevenue(stripeApiKey),
        fetchHarvestPerClientHours(harvestApiKey),
      ])
      const result = computeClientProfitability(sd, hd, blendedRate)
      activeClients = result.clients.length
      totalRevenue = result.clients.reduce((s, c) => s + c.revenue_mtd, 0)
      belowBreakeven = result.clients.filter((c) => c.margin_pct < 0).length
      const margins = result.clients.map((c) => c.margin_pct).filter(Number.isFinite).sort((a, b) => a - b)
      if (margins.length) medianMargin = margins[Math.floor(margins.length / 2)]!
    } catch { /* best effort */ }
  }

  if (stripeApiKey) {
    try {
      const stripe = new Stripe(stripeApiKey, { typescript: true, maxNetworkRetries: 2 })
      const now = Math.floor(Date.now() / 1000)
      const resp = await stripe.invoices.list({ status: 'open', limit: 50 })
      const overdue = resp.data.filter((inv) => inv.due_date && inv.due_date < now)
      overdueCount = overdue.length
      overdueTotal = overdue.reduce((s, inv) => s + (inv.amount_due ?? 0) / 100, 0)
    } catch { /* best effort */ }
  }

  return {
    company_name: companyName,
    active_clients: activeClients,
    total_revenue_mtd: totalRevenue,
    median_margin_pct: medianMargin,
    clients_below_breakeven: belowBreakeven,
    overdue_invoices: { count: overdueCount, total_usd: overdueTotal },
    connected_tools: connectedTools,
  }
}

async function fetchCashFlow(stripeApiKey: string | null): Promise<CashFlowOutlook> {
  if (!stripeApiKey) {
    return { open_invoices_total_usd: 0, open_invoices_due_next_30d_usd: 0, avg_days_to_pay: null }
  }
  try {
    const stripe = new Stripe(stripeApiKey, { typescript: true, maxNetworkRetries: 2 })
    const now = Math.floor(Date.now() / 1000)
    const in30d = now + 30 * 24 * 60 * 60

    const [openResp, paidResp] = await Promise.all([
      stripe.invoices.list({ status: 'open', limit: 50 }),
      stripe.invoices.list({ status: 'paid', created: { gte: now - 90 * 24 * 60 * 60 }, limit: 100 }),
    ])

    const openTotal = openResp.data.reduce((s, inv) => s + (inv.amount_due ?? 0) / 100, 0)
    const dueSoon = openResp.data
      .filter((inv) => inv.due_date && inv.due_date <= in30d)
      .reduce((s, inv) => s + (inv.amount_due ?? 0) / 100, 0)

    const daysToPay: number[] = []
    for (const inv of paidResp.data) {
      const paidAt = inv.status_transitions?.paid_at
      if (inv.created && typeof paidAt === 'number') {
        daysToPay.push((paidAt - inv.created) / 86400)
      }
    }
    const avgDays = daysToPay.length
      ? Math.round(daysToPay.reduce((s, d) => s + d, 0) / daysToPay.length)
      : null

    return {
      open_invoices_total_usd: openTotal,
      open_invoices_due_next_30d_usd: dueSoon,
      avg_days_to_pay: avgDays,
    }
  } catch {
    return { open_invoices_total_usd: 0, open_invoices_due_next_30d_usd: 0, avg_days_to_pay: null }
  }
}

function computeCapacity(harvestApiKey: string | null, teamSizeRaw: string): CapacityStatus {
  // Harvest hours are fetched per-client in the profitability adapter.
  // For capacity we need total hours — use the per-client hours we already have.
  // We return what we know from metadata; actual hours will be null if no harvest key.
  const minSize = teamSizeMin(teamSizeRaw)
  const capacityHours = minSize ? minSize * 160 : null

  return {
    team_size_raw: teamSizeRaw || 'not set',
    estimated_monthly_capacity_hours: capacityHours,
    hours_tracked_this_month: null, // populated separately below when harvest data is available
    utilization_pct: null,
    available_hours: null,
  }
}

async function fetchCapacity(
  harvestApiKey: string | null,
  teamSizeRaw: string,
): Promise<CapacityStatus> {
  const base = computeCapacity(harvestApiKey, teamSizeRaw)
  if (!harvestApiKey || !base.estimated_monthly_capacity_hours) return base

  try {
    const harvestData = await fetchHarvestPerClientHours(harvestApiKey)
    const totalHours = harvestData.clients.reduce((s, c) => s + c.hours_current, 0)
    const util = Math.round((totalHours / base.estimated_monthly_capacity_hours) * 100)
    return {
      ...base,
      hours_tracked_this_month: Math.round(totalHours * 10) / 10,
      utilization_pct: util,
      available_hours: Math.round(base.estimated_monthly_capacity_hours - totalHours),
    }
  } catch {
    return base
  }
}

async function fetchRateAdvice(
  stripeApiKey: string | null,
  harvestApiKey: string | null,
  blendedRate: number,
  teamSizeRaw: string,
): Promise<RateAdvice> {
  const bucket = bucketForTeamSize(teamSizeRaw)
  let medianMargin: number | null = null
  let clientsToReprice: Array<{ name: string; margin_pct: number }> = []
  let totalHours = 0

  if (stripeApiKey && harvestApiKey) {
    try {
      const [sd, hd] = await Promise.all([
        fetchStripePerClientRevenue(stripeApiKey),
        fetchHarvestPerClientHours(harvestApiKey),
      ])
      const result = computeClientProfitability(sd, hd, blendedRate)
      totalHours = result.clients.reduce((s, c) => s + c.hours_mtd, 0)
      clientsToReprice = result.clients
        .filter((c) => c.margin_pct < 20 && c.revenue_mtd > 0)
        .map((c) => ({ name: c.name, margin_pct: Math.round(c.margin_pct) }))
        .sort((a, b) => a.margin_pct - b.margin_pct)
        .slice(0, 5)
      const margins = result.clients.map((c) => c.margin_pct).filter(Number.isFinite).sort((a, b) => a - b)
      if (margins.length) medianMargin = margins[Math.floor(margins.length / 2)]!
    } catch { /* best effort */ }
  }

  // Suggest a rate increase if median margin < 25%
  let suggestedRate: number | null = null
  let annualImpact: number | null = null
  if (medianMargin !== null && medianMargin < 25) {
    const targetMargin = 0.30
    const currentCostRate = blendedRate * (1 - medianMargin / 100)
    suggestedRate = Math.ceil(currentCostRate / (1 - targetMargin) / 5) * 5
    if (totalHours > 0) {
      annualImpact = Math.round((suggestedRate - blendedRate) * totalHours * 12)
    }
  }

  return {
    current_blended_rate_usd: blendedRate,
    median_client_margin_pct: medianMargin !== null ? Math.round(medianMargin) : null,
    suggested_rate_usd: suggestedRate,
    annual_impact_usd: annualImpact,
    clients_to_reprice: clientsToReprice,
  }
}

export async function buildCooContext(opts: {
  stripeApiKey: string | null
  harvestApiKey: string | null
  blendedRate: number
  companyName: string
  teamSizeRaw: string
  connectedTools: string[]
  pendingActionsCount: number
}): Promise<CooContext> {
  const { stripeApiKey, harvestApiKey, blendedRate, companyName, teamSizeRaw, connectedTools, pendingActionsCount } = opts

  const [overview, cashFlow, capacity, rateAdvice] = await Promise.all([
    fetchOverview(stripeApiKey, harvestApiKey, blendedRate, companyName, connectedTools),
    fetchCashFlow(stripeApiKey),
    fetchCapacity(harvestApiKey, teamSizeRaw),
    fetchRateAdvice(stripeApiKey, harvestApiKey, blendedRate, teamSizeRaw),
  ])

  return { overview, cash_flow: cashFlow, capacity, rate_advice: rateAdvice, pending_actions_count: pendingActionsCount }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/coo/context.ts
git commit -m "feat(coo): live context engine — overview, cash flow, capacity, rate advice"
```

---

## Task 5: COO Chat API + Rate Limit

The POST endpoint that accepts the conversation history, fetches live context, builds a GPT-4o system prompt with all the data, and returns a response. Non-streaming — returns the full message as JSON. The COO knows real numbers, never makes up data.

**Files:**
- Modify: `src/lib/rate-limit.ts`
- Create: `src/app/api/dashboard/coo/route.ts`

- [ ] **Step 1: Add `dashboard-coo` to `src/lib/rate-limit.ts`**

Add to the union:
```typescript
  | 'dashboard-coo'
```

Add to `RATE_LIMITS`:
```typescript
  'dashboard-coo': { limit: 30, window: '1 h' },
```

- [ ] **Step 2: Create `src/app/api/dashboard/coo/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { decryptApiKey } from '<npm>/lib/integrations/crypto'
import { applyRateLimit } from '<npm>/lib/rate-limit'
import { openai } from '<npm>/lib/openai'
import { buildCooContext } from '<npm>/lib/coo/context'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Message = { role: 'user' | 'assistant'; content: string }

const SUGGESTED_QUESTIONS = [
  'How did we do this month?',
  'Which clients should I worry about?',
  'Will I make payroll next month?',
  'Which clients should I reprice?',
  'How close are we to capacity?',
  'What are the most important things to do today?',
]

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ suggested_questions: SUGGESTED_QUESTIONS })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await applyRateLimit(request, 'dashboard-coo', userId)
  if (limited) return limited as NextResponse

  const body = (await request.json().catch(() => ({}))) as { messages?: Message[] }
  const messages = (body.messages ?? []).slice(-10) // keep last 10 turns for context

  if (!messages.length || messages[messages.length - 1]?.role !== 'user') {
    return NextResponse.json({ error: 'invalid_messages' }, { status: 400 })
  }

  const service = getServerSupabaseClient()
  const { data: { user }, error: userErr } = await service.auth.admin.getUserById(userId)
  if (userErr || !user) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const blendedRate = typeof meta.blended_hourly_rate_usd === 'number'
    ? meta.blended_hourly_rate_usd
    : 85
  const companyName = typeof meta.company_name === 'string' ? meta.company_name : 'your agency'
  const teamSizeRaw = typeof meta.team_size === 'string' ? meta.team_size : ''

  const session = await getSessionSupabaseClient()
  const { data: keyRows } = await session
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .eq('status', 'connected')

  const connectedTools = (keyRows ?? []).map((r) => r.tool as string)
  const getKey = (tool: string): string | null => {
    const row = (keyRows ?? []).find((r) => r.tool === tool)
    try { return row ? decryptApiKey(row) : null } catch { return null }
  }

  const { data: pendingRows } = await session
    .from('agent_actions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'pending')

  const pendingActionsCount = (pendingRows ?? []).length

  let ctx
  try {
    ctx = await buildCooContext({
      stripeApiKey: getKey('stripe'),
      harvestApiKey: getKey('harvest'),
      blendedRate,
      companyName,
      teamSizeRaw,
      connectedTools,
      pendingActionsCount,
    })
  } catch (err) {
    console.error('[coo] context build failed:', err)
    return NextResponse.json({ error: 'context_failed' }, { status: 500 })
  }

  const systemPrompt = `You are the COO of ${companyName}. You have access to today's live agency data below. Answer questions based ONLY on this data — never guess or invent numbers. Be concise and direct. Always suggest a specific action when you identify a problem. Format responses as clear prose (no markdown headers, no bullet overload).

## Today's Agency Data

### Overview
- Company: ${ctx.overview.company_name}
- Active clients this month: ${ctx.overview.active_clients}
- Total revenue MTD: $${ctx.overview.total_revenue_mtd.toFixed(0)}
- Median client margin: ${ctx.overview.median_margin_pct !== null ? `${ctx.overview.median_margin_pct.toFixed(1)}%` : 'N/A'}
- Clients below break-even: ${ctx.overview.clients_below_breakeven}
- Overdue invoices: ${ctx.overview.overdue_invoices.count} totalling $${ctx.overview.overdue_invoices.total_usd.toFixed(0)}
- Connected tools: ${ctx.overview.connected_tools.join(', ') || 'none'}

### Cash Flow (next 30 days)
- Open invoices total: $${ctx.cash_flow.open_invoices_total_usd.toFixed(0)}
- Due in next 30 days: $${ctx.cash_flow.open_invoices_due_next_30d_usd.toFixed(0)}
- Average days to pay: ${ctx.cash_flow.avg_days_to_pay !== null ? `${ctx.cash_flow.avg_days_to_pay}d` : 'N/A'}

### Team Capacity
- Team size: ${ctx.capacity.team_size_raw}
- Estimated monthly capacity: ${ctx.capacity.estimated_monthly_capacity_hours !== null ? `${ctx.capacity.estimated_monthly_capacity_hours}h` : 'N/A'}
- Hours tracked this month: ${ctx.capacity.hours_tracked_this_month !== null ? `${ctx.capacity.hours_tracked_this_month}h` : 'N/A'}
- Utilization: ${ctx.capacity.utilization_pct !== null ? `${ctx.capacity.utilization_pct}%` : 'N/A'}
- Available hours: ${ctx.capacity.available_hours !== null ? `${ctx.capacity.available_hours}h` : 'N/A'}

### Rate & Repricing
- Current blended rate: $${ctx.rate_advice.current_blended_rate_usd}/hr
- Suggested rate: ${ctx.rate_advice.suggested_rate_usd !== null ? `$${ctx.rate_advice.suggested_rate_usd}/hr` : 'current rate looks healthy'}
- Annual impact of rate increase: ${ctx.rate_advice.annual_impact_usd !== null ? `+$${ctx.rate_advice.annual_impact_usd.toLocaleString()}` : 'N/A'}
- Clients to reprice (below 20% margin): ${ctx.rate_advice.clients_to_reprice.length > 0 ? ctx.rate_advice.clients_to_reprice.map((c) => `${c.name} (${c.margin_pct}%)`).join(', ') : 'none'}

### Actions
- Pending agent actions awaiting your approval: ${ctx.pending_actions_count}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.4,
      max_tokens: 600,
    })

    const reply = completion.choices[0]?.message?.content ?? 'I couldn\'t generate a response. Please try again.'
    return NextResponse.json({ message: reply })
  } catch (err) {
    console.error('[coo] GPT-4o call failed:', err)
    return NextResponse.json({ error: 'generation_failed' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/rate-limit.ts src/app/api/dashboard/coo/route.ts
git commit -m "feat(coo): COO chat API — GPT-4o with live agency context injection"
```

---

## Task 6: COO Chat UI + Sidebar Nav

The `/dashboard/coo` page with a clean chat interface. Shows suggested starter questions when empty. The sidebar gets a new "COO" nav item.

**Files:**
- Create: `src/app/dashboard/coo/page.tsx`
- Create: `src/app/dashboard/coo/_components/coo-chat.tsx`
- Modify: `src/app/dashboard/_components/sidebar.tsx`

- [ ] **Step 1: Create `src/app/dashboard/coo/_components/coo-chat.tsx`**

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string };

const SUGGESTED: string[] = [
  'How did we do this month?',
  'Which clients should I worry about?',
  'Will I make payroll next month?',
  'Which clients should I reprice?',
  'How close are we to capacity?',
  'What should I do today?',
];

export function CooChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Message[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/coo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json() as { message?: string; error?: string };
      setMessages([...next, {
        role: 'assistant',
        content: data.message ?? 'Something went wrong. Please try again.',
      }]);
    } catch {
      setMessages([...next, {
        role: 'assistant',
        content: 'Connection error. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Message area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="pt-2">
            <p className="mb-4 text-[13px] text-[var(--color-fg-muted)]">
              Ask me anything about your agency — I have access to your live data.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => void send(q)}
                  className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-left text-[12.5px] text-[var(--color-fg-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-fg)] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-[var(--radius-lg)] px-4 py-3 text-[13px] leading-[1.6] ${
                m.role === 'user'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)]'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
              <Loader2 size={14} className="animate-spin text-[var(--color-fg-subtle)]" />
              <span className="text-[12.5px] text-[var(--color-fg-subtle)]">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--color-border)] pt-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask your COO anything…"
            rows={1}
            className="flex-1 resize-none rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[13px] text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)] placeholder:text-[var(--color-fg-subtle)]"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
          <button
            onClick={() => void send(input)}
            disabled={loading || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--color-fg-subtle)]">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/dashboard/coo/page.tsx`**

```tsx
import { CooChat } from './_components/coo-chat';

export default function CooPage() {
  return (
    <div className="flex h-[calc(100vh-120px)] flex-col gap-3.5">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="text-body-sm text-[var(--color-fg-muted)]">
          Dashboard /{' '}
          <span className="font-semibold text-[var(--color-fg)]">COO</span>
        </div>
      </div>

      <div className="mb-1">
        <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Your AI COO
        </h1>
        <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
          Ask anything about your agency — answered with your live data.
        </p>
      </div>

      <div className="min-h-0 flex-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-xs)]">
        <CooChat />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add COO to sidebar in `src/app/dashboard/_components/sidebar.tsx`**

Find the `navSections` array and add COO after Actions. Import `BrainCircuit` from lucide-react in the import line. The existing import is:

```typescript
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
```

Change to:
```typescript
import {
  LayoutDashboard,
  Activity,
  TrendingUp,
  DollarSign,
  Plug,
  Settings,
  ChevronRight,
  Zap,
  BrainCircuit,
  BarChart2,
} from 'lucide-react';
```

Update `navSections` to add both COO and Score:
```typescript
const navSections: NavSection[] = [
  {
    tag: null,
    items: [
      { label: 'Overview',      href: '/dashboard',              icon: LayoutDashboard },
      { label: 'Automations',   href: '/dashboard/automations',  icon: Activity        },
      { label: 'Business',      href: '/dashboard/business',     icon: TrendingUp      },
      { label: 'Profitability', href: '/dashboard/profitability', icon: DollarSign     },
      { label: 'Actions',       href: '/dashboard/actions',      icon: Zap             },
      { label: 'COO',           href: '/dashboard/coo',          icon: BrainCircuit    },
      { label: 'Score',         href: '/dashboard/score',        icon: BarChart2       },
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

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/coo/page.tsx src/app/dashboard/coo/_components/coo-chat.tsx src/app/dashboard/_components/sidebar.tsx
git commit -m "feat(coo): COO chat UI — conversational interface with live agency context"
```

---

## Task 7: score_snapshots DB Migration

Creates the `score_snapshots` table that stores public share snapshots. Only derived scores (no raw client data) are stored. The share page reads via service role so no public RLS is needed.

**Files:**
- Modify: `src/lib/database.types.ts`

- [ ] **Step 1: Run migration via Supabase MCP**

Use the Supabase MCP tool `apply_migration` with this SQL:

```sql
CREATE TABLE IF NOT EXISTS score_snapshots (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token   TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  company_name  TEXT        NOT NULL DEFAULT '',
  scores        JSONB       NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE score_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON score_snapshots
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

Migration name: `add_score_snapshots`

- [ ] **Step 2: Add score_snapshots types to `src/lib/database.types.ts`**

Open `database.types.ts` and find the `Tables` section. Add `score_snapshots` in alphabetical order (between `results` and any table starting with `t`). The shape to insert:

```typescript
      score_snapshots: {
        Row: {
          id: string
          user_id: string
          share_token: string
          company_name: string
          scores: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          share_token?: string
          company_name?: string
          scores: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          share_token?: string
          company_name?: string
          scores?: Json
          created_at?: string
        }
        Relationships: []
      }
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/database.types.ts
git commit -m "feat(score): score_snapshots migration + DB types"
```

---

## Task 8: Agency Score Computation + API

Computes an A–F scorecard across 5 dimensions from live data. Exposes a GET (compute) and POST (generate share link) endpoint.

**Files:**
- Modify: `src/lib/rate-limit.ts`
- Create: `src/lib/agency-score.ts`
- Create: `src/app/api/dashboard/score/route.ts`

- [ ] **Step 1: Add `dashboard-score` to `src/lib/rate-limit.ts`**

Union:
```typescript
  | 'dashboard-score'
```

Record:
```typescript
  'dashboard-score': { limit: 30, window: '1 h' },
```

- [ ] **Step 2: Create `src/lib/agency-score.ts`**

```typescript
import { computeClientProfitability } from '<npm>/lib/profitability'
import { fetchStripePerClientRevenue } from '<npm>/lib/integrations/stripe/profitability-adapter'
import { fetchHarvestPerClientHours } from '<npm>/lib/integrations/harvest/profitability-adapter'
import { collectUserMetrics } from '<npm>/lib/benchmarks/collect'
import { bucketForTeamSize } from '<npm>/lib/benchmarks/buckets'
import type { BenchmarkRow, BenchmarkMetric } from '<npm>/lib/benchmarks/types'

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F'

export type ScoreDimension = {
  score: number
  grade: Grade
  label: string
  detail: string
}

export type AgencyScore = {
  dimensions: {
    margins: ScoreDimension
    collection_speed: ScoreDimension
    client_concentration: ScoreDimension
    utilization: ScoreDimension
    benchmark_position: ScoreDimension
  }
  overall_score: number
  overall_grade: Grade
  computed_at: string
  company_name: string
}

function toGrade(score: number): Grade {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

function marginsDimension(medianMarginPct: number | null): ScoreDimension {
  if (medianMarginPct === null) {
    return { score: 50, grade: 'C', label: 'Margins', detail: 'No data — connect Stripe + Harvest' }
  }
  const score =
    medianMarginPct >= 40 ? 100 :
    medianMarginPct >= 30 ? 85 :
    medianMarginPct >= 20 ? 70 :
    medianMarginPct >= 10 ? 45 :
    medianMarginPct >= 0  ? 20 : 0
  return {
    score,
    grade: toGrade(score),
    label: 'Margins',
    detail: `Median client margin: ${medianMarginPct.toFixed(0)}%`,
  }
}

function collectionDimension(avgDaysOverdue: number | null): ScoreDimension {
  if (avgDaysOverdue === null) {
    return { score: 50, grade: 'C', label: 'Collections', detail: 'No invoice data — connect Stripe' }
  }
  const score =
    avgDaysOverdue <= 2  ? 100 :
    avgDaysOverdue <= 7  ? 85 :
    avgDaysOverdue <= 14 ? 65 :
    avgDaysOverdue <= 30 ? 40 : 15
  return {
    score,
    grade: toGrade(score),
    label: 'Collections',
    detail: `Median days overdue: ${avgDaysOverdue.toFixed(0)}d`,
  }
}

function concentrationDimension(
  clients: Array<{ revenue_mtd: number }>,
): ScoreDimension {
  if (clients.length === 0) {
    return { score: 50, grade: 'C', label: 'Client Mix', detail: 'No client data available' }
  }
  const totalRevenue = clients.reduce((s, c) => s + c.revenue_mtd, 0)
  if (totalRevenue === 0) {
    return { score: 50, grade: 'C', label: 'Client Mix', detail: 'No revenue data this month' }
  }
  const topRevenue = Math.max(...clients.map((c) => c.revenue_mtd))
  const concentration = topRevenue / totalRevenue
  const pct = Math.round(concentration * 100)
  const score =
    concentration < 0.20 ? 100 :
    concentration < 0.30 ? 85 :
    concentration < 0.40 ? 70 :
    concentration < 0.50 ? 55 :
    concentration < 0.70 ? 35 : 10
  return {
    score,
    grade: toGrade(score),
    label: 'Client Mix',
    detail: `Top client is ${pct}% of revenue`,
  }
}

function utilizationDimension(
  hoursTracked: number | null,
  teamSizeRaw: string,
): ScoreDimension {
  const minSize = (() => {
    if (!teamSizeRaw) return null
    if (teamSizeRaw === '1') return 1
    const m = teamSizeRaw.match(/^(\d+)/)
    return m ? parseInt(m[1]!) : null
  })()

  if (hoursTracked === null || minSize === null) {
    return { score: 50, grade: 'C', label: 'Utilization', detail: 'Set team size in Settings to unlock' }
  }

  const capacity = minSize * 160
  const utilPct = (hoursTracked / capacity) * 100
  const rounded = Math.round(utilPct)
  const score =
    utilPct >= 80 && utilPct <= 95 ? 100 :
    utilPct >= 65 && utilPct < 80  ? 85 :
    utilPct >= 50 && utilPct < 65  ? 65 :
    utilPct > 95                   ? 55 : // overloaded
    utilPct >= 35                  ? 40 : 20
  return {
    score,
    grade: toGrade(score),
    label: 'Utilization',
    detail: `${rounded}% utilization (${hoursTracked.toFixed(0)}h of ~${capacity}h capacity)`,
  }
}

function benchmarkDimension(
  positions: Array<'top_25' | 'above' | 'below' | 'bottom_25' | 'no_data'>,
): ScoreDimension {
  if (positions.length === 0 || positions.every((p) => p === 'no_data')) {
    return { score: 50, grade: 'C', label: 'Industry Rank', detail: 'Not enough benchmark data yet' }
  }
  const positionScore = (p: string) => {
    if (p === 'top_25') return 100
    if (p === 'above')  return 75
    if (p === 'below')  return 40
    if (p === 'bottom_25') return 15
    return 50
  }
  const ranked = positions.filter((p) => p !== 'no_data')
  const avg = Math.round(ranked.reduce((s, p) => s + positionScore(p), 0) / ranked.length)
  return {
    score: avg,
    grade: toGrade(avg),
    label: 'Industry Rank',
    detail: `Compared to ${ranked.length} benchmark metric${ranked.length > 1 ? 's' : ''} for your size`,
  }
}

export async function computeAgencyScore(opts: {
  stripeApiKey: string | null
  harvestApiKey: string | null
  blendedRate: number
  teamSizeRaw: string
  companyName: string
  benchmarkRows: BenchmarkRow[]
}): Promise<AgencyScore> {
  const { stripeApiKey, harvestApiKey, blendedRate, teamSizeRaw, companyName, benchmarkRows } = opts

  let medianMarginPct: number | null = null
  let avgDaysOverdue: number | null = null
  let clientsData: Array<{ revenue_mtd: number }> = []
  let hoursTracked: number | null = null
  const benchmarkPositions: Array<'top_25' | 'above' | 'below' | 'bottom_25' | 'no_data'> = []

  if (stripeApiKey && harvestApiKey) {
    try {
      const [sd, hd] = await Promise.all([
        fetchStripePerClientRevenue(stripeApiKey),
        fetchHarvestPerClientHours(harvestApiKey),
      ])
      const result = computeClientProfitability(sd, hd, blendedRate)
      clientsData = result.clients
      const margins = result.clients.map((c) => c.margin_pct).filter(Number.isFinite).sort((a, b) => a - b)
      if (margins.length) medianMarginPct = Math.round(margins[Math.floor(margins.length / 2)]!)
      hoursTracked = result.clients.reduce((s, c) => s + c.hours_mtd, 0)
    } catch { /* best effort */ }
  }

  if (stripeApiKey) {
    try {
      const metrics = await collectUserMetrics({ stripeApiKey, harvestApiKey, blendedRate })
      if (metrics.median_invoice_days_overdue !== undefined) {
        avgDaysOverdue = metrics.median_invoice_days_overdue
      }
      // Compute benchmark positions from rows
      const benchmarkMap = new Map<BenchmarkMetric, BenchmarkRow>()
      for (const row of benchmarkRows) {
        benchmarkMap.set(row.metric as BenchmarkMetric, row)
      }
      const metricKeys: BenchmarkMetric[] = [
        'median_client_margin_pct',
        'median_invoice_days_overdue',
        'hours_per_10k_revenue',
        'active_client_count',
      ]
      for (const metric of metricKeys) {
        const userValue = metrics[metric] ?? null
        const row = benchmarkMap.get(metric) ?? null
        if (userValue === null || row === null) {
          benchmarkPositions.push('no_data')
          continue
        }
        const isLowerBetter = metric === 'median_invoice_days_overdue' || metric === 'hours_per_10k_revenue'
        if (isLowerBetter) {
          benchmarkPositions.push(
            userValue <= row.p25 ? 'top_25' :
            userValue <= row.p50 ? 'above' :
            userValue <= row.p75 ? 'below' : 'bottom_25'
          )
        } else {
          benchmarkPositions.push(
            userValue >= row.p75 ? 'top_25' :
            userValue >= row.p50 ? 'above' :
            userValue >= row.p25 ? 'below' : 'bottom_25'
          )
        }
      }
    } catch { /* best effort */ }
  }

  const margins = marginsDimension(medianMarginPct)
  const collections = collectionDimension(avgDaysOverdue)
  const concentration = concentrationDimension(clientsData)
  const utilization = utilizationDimension(hoursTracked, teamSizeRaw)
  const benchmark = benchmarkDimension(benchmarkPositions)

  const overallScore = Math.round(
    (margins.score + collections.score + concentration.score + utilization.score + benchmark.score) / 5
  )

  return {
    dimensions: {
      margins,
      collection_speed: collections,
      client_concentration: concentration,
      utilization,
      benchmark_position: benchmark,
    },
    overall_score: overallScore,
    overall_grade: toGrade(overallScore),
    computed_at: new Date().toISOString(),
    company_name: companyName,
  }
}
```

- [ ] **Step 3: Create `src/app/api/dashboard/score/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { decryptApiKey } from '<npm>/lib/integrations/crypto'
import { applyRateLimit } from '<npm>/lib/rate-limit'
import { computeAgencyScore } from '<npm>/lib/agency-score'
import { bucketForTeamSize } from '<npm>/lib/benchmarks/buckets'
import type { BenchmarkRow } from '<npm>/lib/benchmarks/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await applyRateLimit(request, 'dashboard-score', userId)
  if (limited) return limited as NextResponse

  const service = getServerSupabaseClient()
  const { data: { user }, error: userErr } = await service.auth.admin.getUserById(userId)
  if (userErr || !user) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const blendedRate = typeof meta.blended_hourly_rate_usd === 'number'
    ? meta.blended_hourly_rate_usd
    : 85
  const companyName = typeof meta.company_name === 'string' ? meta.company_name : ''
  const teamSizeRaw = typeof meta.team_size === 'string' ? meta.team_size : ''

  const bucket = bucketForTeamSize(teamSizeRaw)
  const session = await getSessionSupabaseClient()

  const [keyResult, benchmarkResult] = await Promise.all([
    session
      .from('integrations')
      .select('tool, encrypted_token, iv, auth_tag, status')
      .eq('client_id', userId)
      .eq('status', 'connected'),
    bucket
      ? session.from('benchmarks').select('*').eq('team_size_bucket', bucket)
      : Promise.resolve({ data: [] }),
  ])

  const getKey = (tool: string): string | null => {
    const row = (keyResult.data ?? []).find((r) => r.tool === tool)
    try { return row ? decryptApiKey(row) : null } catch { return null }
  }

  const score = await computeAgencyScore({
    stripeApiKey: getKey('stripe'),
    harvestApiKey: getKey('harvest'),
    blendedRate,
    teamSizeRaw,
    companyName,
    benchmarkRows: (benchmarkResult.data ?? []) as BenchmarkRow[],
  })

  return NextResponse.json({ score })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await applyRateLimit(request, 'dashboard-score', userId)
  if (limited) return limited as NextResponse

  const service = getServerSupabaseClient()
  const { data: { user }, error: userErr } = await service.auth.admin.getUserById(userId)
  if (userErr || !user) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const blendedRate = typeof meta.blended_hourly_rate_usd === 'number'
    ? meta.blended_hourly_rate_usd
    : 85
  const companyName = typeof meta.company_name === 'string' ? meta.company_name : ''
  const teamSizeRaw = typeof meta.team_size === 'string' ? meta.team_size : ''
  const bucket = bucketForTeamSize(teamSizeRaw)

  const session = await getSessionSupabaseClient()

  const [keyResult, benchmarkResult] = await Promise.all([
    session
      .from('integrations')
      .select('tool, encrypted_token, iv, auth_tag, status')
      .eq('client_id', userId)
      .eq('status', 'connected'),
    bucket
      ? session.from('benchmarks').select('*').eq('team_size_bucket', bucket)
      : Promise.resolve({ data: [] }),
  ])

  const getKey = (tool: string): string | null => {
    const row = (keyResult.data ?? []).find((r) => r.tool === tool)
    try { return row ? decryptApiKey(row) : null } catch { return null }
  }

  const score = await computeAgencyScore({
    stripeApiKey: getKey('stripe'),
    harvestApiKey: getKey('harvest'),
    blendedRate,
    teamSizeRaw,
    companyName,
    benchmarkRows: (benchmarkResult.data ?? []) as BenchmarkRow[],
  })

  const { data: snapshot, error: snapshotErr } = await session
    .from('score_snapshots')
    .insert({
      user_id: userId,
      company_name: companyName,
      scores: score as unknown as import('<npm>/lib/database.types').Json,
    })
    .select('share_token')
    .single()

  if (snapshotErr || !snapshot) {
    console.error('[score] snapshot insert failed:', snapshotErr)
    return NextResponse.json({ error: 'snapshot_failed' }, { status: 500 })
  }

  return NextResponse.json({ share_token: snapshot.share_token, score })
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rate-limit.ts src/lib/agency-score.ts src/app/api/dashboard/score/route.ts
git commit -m "feat(score): agency score computation — A-F across 5 dimensions + share link API"
```

---

## Task 9: Agency Score Dashboard Page

The `/dashboard/score` page shows the scorecard and a "Share" button that generates a public link.

**Files:**
- Create: `src/app/dashboard/score/page.tsx`

- [ ] **Step 1: Create `src/app/dashboard/score/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import type { AgencyScore, Grade } from '<npm>/lib/agency-score';

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; score: AgencyScore }
  | { kind: 'err' };

type ShareState = 'idle' | 'generating' | { token: string };

function gradeColor(g: Grade): string {
  if (g === 'A') return 'text-emerald-400';
  if (g === 'B') return 'text-emerald-300';
  if (g === 'C') return 'text-amber-400';
  if (g === 'D') return 'text-orange-400';
  return 'text-[var(--color-error)]';
}

function gradeLabel(g: Grade): string {
  if (g === 'A') return 'Excellent';
  if (g === 'B') return 'Good';
  if (g === 'C') return 'Fair';
  if (g === 'D') return 'Needs work';
  return 'Critical';
}

function DimensionCard({ title, dimension }: { title: string; dimension: AgencyScore['dimensions'][keyof AgencyScore['dimensions']] }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 shadow-[var(--shadow-xs)]">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-fg-subtle)]">
        {title}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-[28px] font-bold ${gradeColor(dimension.grade)}`}>
          {dimension.grade}
        </span>
        <span className="text-[12.5px] text-[var(--color-fg-muted)]">{gradeLabel(dimension.grade)}</span>
      </div>
      <p className="mt-1 text-[11px] text-[var(--color-fg-subtle)]">{dimension.detail}</p>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
        <div
          className="h-full rounded-full bg-[var(--color-primary)]"
          style={{ width: `${dimension.score}%` }}
        />
      </div>
    </div>
  );
}

export default function ScorePage() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [shareState, setShareState] = useState<ShareState>('idle');

  useEffect(() => {
    fetch('/api/dashboard/score')
      .then((r) => r.json())
      .then((j: { score?: AgencyScore; error?: string }) => {
        if (j.score) setState({ kind: 'ok', score: j.score });
        else setState({ kind: 'err' });
      })
      .catch(() => setState({ kind: 'err' }));
  }, []);

  async function generateShareLink() {
    setShareState('generating');
    try {
      const res = await fetch('/api/dashboard/score', { method: 'POST' });
      const data = await res.json() as { share_token?: string };
      if (data.share_token) {
        setShareState({ token: data.share_token });
      } else {
        setShareState('idle');
      }
    } catch {
      setShareState('idle');
    }
  }

  const shareUrl = typeof shareState === 'object'
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/score/${shareState.token}`
    : null;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="text-body-sm text-[var(--color-fg-muted)]">
          Dashboard /{' '}
          <span className="font-semibold text-[var(--color-fg)]">Score</span>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
            Agency Score
          </h1>
          <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
            Your agency rated across 5 dimensions — compared to industry.
          </p>
        </div>
        {state.kind === 'ok' && (
          <button
            onClick={() => void generateShareLink()}
            disabled={shareState === 'generating'}
            className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-[12.5px] font-medium text-[var(--color-fg)] hover:border-[var(--color-primary)] disabled:opacity-50"
          >
            {shareState === 'generating' ? 'Generating…' : 'Share scorecard'}
          </button>
        )}
      </div>

      {shareUrl && (
        <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
          <p className="mb-1 text-[11.5px] font-medium text-[var(--color-fg)]">Public share link</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-[var(--color-surface-sunken)] px-2 py-1 text-[11.5px] text-[var(--color-fg-muted)]">
              {shareUrl}
            </code>
            <button
              onClick={() => void navigator.clipboard.writeText(shareUrl)}
              className="shrink-0 rounded-[var(--radius)] bg-[var(--color-primary)] px-3 py-1 text-[12px] font-medium text-white hover:opacity-90"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {state.kind === 'loading' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface)]" />
          ))}
        </div>
      )}

      {state.kind === 'err' && (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">
          Couldn&apos;t load score. Connect Stripe and Harvest for a full picture.
        </p>
      )}

      {state.kind === 'ok' && (
        <>
          <div className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 shadow-[var(--shadow-xs)]">
            <span className={`text-[56px] font-bold leading-none ${gradeColor(state.score.overall_grade)}`}>
              {state.score.overall_grade}
            </span>
            <div>
              <p className="text-[15px] font-semibold text-[var(--color-fg)]">
                {gradeLabel(state.score.overall_grade)} · {state.score.overall_score}/100
              </p>
              <p className="text-body-sm text-[var(--color-fg-muted)]">
                {state.score.company_name || 'Your agency'} · Computed just now
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DimensionCard title="Margins" dimension={state.score.dimensions.margins} />
            <DimensionCard title="Collections" dimension={state.score.dimensions.collection_speed} />
            <DimensionCard title="Client Mix" dimension={state.score.dimensions.client_concentration} />
            <DimensionCard title="Utilization" dimension={state.score.dimensions.utilization} />
            <DimensionCard title="Industry Rank" dimension={state.score.dimensions.benchmark_position} />
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/score/page.tsx
git commit -m "feat(score): agency score dashboard page — A-F scorecard with share button"
```

---

## Task 10: Public Share Page + Build Verify

The public `/share/score/[token]` page — a server component that fetches the snapshot by token using the service role. No auth required. Then a final build to verify the whole project compiles cleanly.

**Files:**
- Create: `src/app/share/score/[token]/page.tsx`

- [ ] **Step 1: Create `src/app/share/score/[token]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import type { AgencyScore, Grade } from '<npm>/lib/agency-score';

export const dynamic = 'force-dynamic';

function gradeColor(g: Grade): string {
  if (g === 'A') return 'text-emerald-400';
  if (g === 'B') return 'text-emerald-300';
  if (g === 'C') return 'text-amber-400';
  if (g === 'D') return 'text-orange-400';
  return 'text-red-400';
}

function gradeLabel(g: Grade): string {
  if (g === 'A') return 'Excellent';
  if (g === 'B') return 'Good';
  if (g === 'C') return 'Fair';
  if (g === 'D') return 'Needs work';
  return 'Critical';
}

type Props = { params: Promise<{ token: string }> };

export default async function PublicScorePage({ params }: Props) {
  const { token } = await params;
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from('score_snapshots')
    .select('scores, company_name, created_at')
    .eq('share_token', token)
    .single();

  if (error || !data) notFound();

  const score = data.scores as unknown as AgencyScore;
  const companyName = data.company_name || score.company_name || 'Agency';
  const computedAt = new Date(data.created_at).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const dimensions = [
    { key: 'margins',              label: 'Margins' },
    { key: 'collection_speed',     label: 'Collections' },
    { key: 'client_concentration', label: 'Client Mix' },
    { key: 'utilization',          label: 'Utilization' },
    { key: 'benchmark_position',   label: 'Industry Rank' },
  ] as const;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-10">
      <div className="mx-auto max-w-[640px]">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
            OpsRadar Agency Score
          </p>
          <h1 className="font-serif text-[28px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
            {companyName}
          </h1>
          <p className="mt-1 text-body-sm text-[var(--color-fg-subtle)]">Computed {computedAt}</p>
        </div>

        {/* Overall */}
        <div className="mb-6 flex items-center gap-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-5">
          <span className={`text-[64px] font-bold leading-none ${gradeColor(score.overall_grade)}`}>
            {score.overall_grade}
          </span>
          <div>
            <p className="text-[16px] font-semibold text-[var(--color-fg)]">
              {gradeLabel(score.overall_grade)} · {score.overall_score}/100
            </p>
            <p className="text-body-sm text-[var(--color-fg-muted)]">Overall agency health score</p>
          </div>
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {dimensions.map(({ key, label }) => {
            const dim = score.dimensions[key];
            return (
              <div
                key={key}
                className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5"
              >
                <div className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-fg-subtle)]">
                  {label}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-[24px] font-bold ${gradeColor(dim.grade)}`}>{dim.grade}</span>
                  <span className="text-[12px] text-[var(--color-fg-muted)]">{dim.detail}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="mt-8 text-center">
          <p className="mb-2 text-[12.5px] text-[var(--color-fg-subtle)]">
            Want to see your own agency score?
          </p>
          <a
            href="https://opsradar.app"
            className="inline-flex items-center rounded-[var(--radius)] bg-[var(--color-primary)] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90"
          >
            Get your score at OpsRadar →
          </a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Production build**

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```
Expected: exits 0. All 10 new routes appear in the build output:
- `/api/dashboard/health-report`
- `/api/dashboard/coo`
- `/api/dashboard/score`
- `/dashboard/coo`
- `/dashboard/score`
- `/share/score/[token]`

If any TS error surfaces here that wasn't caught by `tsc --noEmit`, fix it and re-run.

- [ ] **Step 4: Commit**

```bash
git add src/app/share/score/[token]/page.tsx
git commit -m "feat(score): public share page — /share/score/[token] for viral scorecard sharing"
```

- [ ] **Step 5: Final commit message for the wave**

```bash
git log --oneline -10
```

Verify all 10 feature commits are present, then push:

```bash
git push origin main
```

---

## Self-Review

### Spec Coverage

| Feature | Task |
|---------|------|
| Scope creep detector | Task 1 |
| Client health score | Task 2 |
| Instant health report | Task 3 |
| COO chat context engine | Task 4 |
| COO chat API + rate limit | Task 5 |
| COO chat UI + sidebar | Task 6 |
| score_snapshots DB migration | Task 7 |
| Agency score computation + API | Task 8 |
| Agency score dashboard page | Task 9 |
| Public share page | Task 10 |
| Rate renegotiation recommendations | ✓ Part of Task 4 (`getRateAdvice`) + surfaced in COO chat context (Task 5) |
| Capacity planning | ✓ Part of Task 4 (`fetchCapacity`) + surfaced in COO chat context (Task 5) |

All 7 features covered. No gaps.

### Architecture Rules Verified
- No client business data persisted in Supabase — all profitability/hours data is fetched live and never stored. Only `score_snapshots` is stored, and it contains only derived scores (numbers and grades), never raw client records.
- All user-facing API routes use `getSessionSupabaseClient()` + `getCurrentUserId()`.
- All routes have `force-dynamic` + `runtime = 'nodejs'`.
- Rate limits added for every new route.
- `decryptApiKey` pattern used consistently for integration keys.
- Integration table queried with `client_id` (not `user_id`).
