# Full Integration Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Codex:** Dispatch codex:codex-rescue to review each completed task before moving to the next.

**Goal:** Enable Apollo, Calendly, ClickUp, Asana, and Toggl integrations (Model C — customer API key) with live dashboard data, fill in row-level data for Stripe and HubSpot, and reorganise the integrations settings page into category groups.

**Architecture:** Five new adapter files (validate + fetch per tool), three updated/new API routes, Stripe/HubSpot adapters extended with row data, business page filled in. All keys stored AES-256-GCM encrypted in Supabase; plaintext only in server memory during a request. Frontend never sees a key.

**Tech Stack:** Next.js 16 App Router, TypeScript, Stripe SDK, `@hubspot/api-client`, native `fetch` for all new adapters, `@upstash/redis` for 1h caching, `node:crypto` for AES-256-GCM. Path alias: `<npm>/` → `src/`.

---

## File Map

### New files
- `src/lib/integrations/delivery-types.ts` — shared `DeliveryTask` / `DeliveryData` types
- `src/lib/integrations/apollo/adapter.ts` — validate + fetch
- `src/lib/integrations/calendly/adapter.ts` — validate + fetch
- `src/lib/integrations/clickup/adapter.ts` — validate + fetch
- `src/lib/integrations/asana/adapter.ts` — validate + fetch
- `src/lib/integrations/toggl/adapter.ts` — validate + fetch
- `src/app/api/dashboard/delivery/route.ts` — new API route
- `src/app/api/dashboard/time-tracking/route.ts` — new API route

### Modified files
- `src/lib/integrations/registry.ts` — add 5 new tool entries
- `src/lib/integrations/stripe/adapter.ts` — add `rows` field to `StripeFinanceData`
- `src/lib/integrations/hubspot/adapter.ts` — add `rows` field to `HubspotSalesData`
- `src/app/api/dashboard/marketing/route.ts` — replace n8n with direct Apollo + Calendly adapters
- `src/app/api/dashboard/finance/route.ts` — pass overdue invoice rows through response
- `src/app/api/dashboard/sales-live/route.ts` — pass deal rows through response
- `src/app/dashboard/integrations/page.tsx` — category grouping + enable 5 tools
- `src/app/dashboard/business/page.tsx` — fill row tables + add Delivery + Time sections

---

## Execution order (sequential — one task at a time)

**Phase 1a — Task 1 first (creates `delivery-types.ts` needed by Tasks 3 & 4):**
Task 1

**Phase 1b — any order after Task 1:**
Tasks 2, 3, 4, 5, 6, 7, 8

**Phase 2 — any order, after all Phase 1 tasks:**
Tasks 9, 10, 11

**Phase 3 — last:**
Task 12

> Note: registry.ts is modified by Tasks 1–5. Each task appends its entry; since tasks run sequentially in the same working tree, there are no conflicts.

---

## Task 1: Shared delivery types + Apollo adapter

**Files:**
- Create: `src/lib/integrations/delivery-types.ts`
- Create: `src/lib/integrations/apollo/adapter.ts`
- Modify: `src/lib/integrations/registry.ts`

- [ ] **Step 1: Create shared delivery types**

Create `src/lib/integrations/delivery-types.ts`:

```typescript
export type DeliveryTask = {
  id: string;
  name: string;
  status: string;
  due_date: string | null;
  overdue: boolean;
  project_name: string;
  source: 'clickup' | 'asana';
};

export type DeliveryData = {
  active_projects: number;
  overdue_tasks: number;
  tasks: DeliveryTask[];
};
```

- [ ] **Step 2: Create Apollo adapter**

Create `src/lib/integrations/apollo/adapter.ts`:

```typescript
import { createHash } from 'node:crypto';

export type ApolloMarketingData = {
  emails_sent: number;
  open_rate_pct: number;
  reply_rate_pct: number;
  reply_sparkline: number[];
  sequences: Array<{
    id: string;
    name: string;
    contacts_enrolled: number;
    emails_sent: number;
    open_rate_pct: number;
    reply_rate_pct: number;
  }>;
  period_label: string;
};

export type AdapterValidation =
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string };

export async function validateApolloKey(apiKey: string): Promise<AdapterValidation> {
  try {
    const res = await fetch('https://api.apollo.io/api/v1/auth/health', {
      headers: { 'X-Api-Key': apiKey, 'Cache-Control': 'no-cache' },
    });
    if (res.status === 401) {
      return { ok: false, reason: 'invalid_key', message: 'The API key was rejected by Apollo.' };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      return { ok: false, reason: 'network', message: `Apollo returned ${res.status}: ${text}` };
    }
    const body = (await res.json()) as { is_logged_in?: boolean };
    if (!body.is_logged_in) {
      return { ok: false, reason: 'invalid_key', message: 'Apollo key is not authenticated.' };
    }
    // Apollo v1 has no /me endpoint — derive a stable ID from the key
    const externalAccountId = createHash('sha256').update(apiKey).digest('hex').substring(0, 24);
    return { ok: true, externalAccountId };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message: err instanceof Error ? err.message : 'Could not reach Apollo.',
    };
  }
}

type ApolloCampaign = {
  id: string;
  name: string;
  active_stats?: {
    num_contacts?: number;
    total_sent_emails_count?: number;
    open_rate?: number;
    reply_rate?: number;
  };
};

type ApolloCampaignsResponse = {
  emailer_campaigns: ApolloCampaign[];
  pagination?: { total_entries?: number };
};

export async function fetchApolloMarketingData(apiKey: string): Promise<ApolloMarketingData> {
  const res = await fetch('https://api.apollo.io/api/v1/emailer_campaigns/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify({ per_page: 25, status: 'active' }),
  });

  if (!res.ok) {
    throw new Error(`Apollo campaigns fetch failed: ${res.status}`);
  }

  const data = (await res.json()) as ApolloCampaignsResponse;
  const campaigns = data.emailer_campaigns ?? [];

  let totalSent = 0;
  let weightedOpen = 0;
  let weightedReply = 0;

  const sequences = campaigns.map((c) => {
    const sent = c.active_stats?.total_sent_emails_count ?? 0;
    const openRate = (c.active_stats?.open_rate ?? 0) * 100;
    const replyRate = (c.active_stats?.reply_rate ?? 0) * 100;
    totalSent += sent;
    weightedOpen += openRate * sent;
    weightedReply += replyRate * sent;
    return {
      id: c.id,
      name: c.name,
      contacts_enrolled: c.active_stats?.num_contacts ?? 0,
      emails_sent: sent,
      open_rate_pct: Math.round(openRate * 10) / 10,
      reply_rate_pct: Math.round(replyRate * 10) / 10,
    };
  });

  const open_rate_pct =
    totalSent > 0 ? Math.round((weightedOpen / totalSent) * 10) / 10 : 0;
  const reply_rate_pct =
    totalSent > 0 ? Math.round((weightedReply / totalSent) * 10) / 10 : 0;

  return {
    emails_sent: totalSent,
    open_rate_pct,
    reply_rate_pct,
    reply_sparkline: [], // Apollo v1 API does not expose daily time-series reply data
    sequences,
    period_label: 'Active sequences',
  };
}
```

- [ ] **Step 3: Add Apollo to registry**

Open `src/lib/integrations/registry.ts`. Add the import and registry entry:

```typescript
// Add at top with other imports:
import { validateApolloKey } from './apollo/adapter';

// Add inside REGISTRY (after hubspot entry):
  apollo: {
    tool: 'apollo',
    displayName: 'Apollo',
    createKeyDocsUrl: 'https://developer.apollo.io/keys/',
    instructions:
      'In Apollo, go to Settings → Integrations → API → Create API Key. ' +
      'Copy the key and paste it below.',
    validate: validateApolloKey,
  },
```

- [ ] **Step 4: Verify**

Run from `opsradar/`:
```bash
npm run lint && npm run build
```
Expected: no errors. Build output lists pages compiled.

- [ ] **Step 5: Commit**

```bash
git add src/lib/integrations/delivery-types.ts src/lib/integrations/apollo/adapter.ts src/lib/integrations/registry.ts
git commit -m "feat(integrations): add Apollo adapter and delivery shared types"
```

---

## Task 2: Calendly adapter

**Files:**
- Create: `src/lib/integrations/calendly/adapter.ts`
- Modify: `src/lib/integrations/registry.ts`

- [ ] **Step 1: Create Calendly adapter**

Create `src/lib/integrations/calendly/adapter.ts`:

```typescript
export type CalendlyBookingsData = {
  meetings_booked: number;
  meeting_conversion_pct: number | null;
  period_label: string;
  upcoming: Array<{
    name: string;
    invitee_name: string;
    invitee_email: string;
    start_time: string;
  }>;
};

export type AdapterValidation =
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string };

export async function validateCalendlyToken(token: string): Promise<AdapterValidation> {
  try {
    const res = await fetch('https://api.calendly.com/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      return { ok: false, reason: 'invalid_key', message: 'The token was rejected by Calendly.' };
    }
    if (res.status === 403) {
      return { ok: false, reason: 'permission', message: 'The token lacks required permissions.' };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      return { ok: false, reason: 'network', message: `Calendly returned ${res.status}: ${text}` };
    }
    const body = (await res.json()) as { resource?: { uri?: string } };
    const uri = body?.resource?.uri;
    if (!uri) {
      return { ok: false, reason: 'network', message: 'Calendly response missing user URI.' };
    }
    const externalAccountId = uri.split('/').pop() ?? uri;
    return { ok: true, externalAccountId };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message: err instanceof Error ? err.message : 'Could not reach Calendly.',
    };
  }
}

type CalendlyEvent = { uri: string; name: string; start_time: string; status: string };
type CalendlyInvitee = { name: string; email: string };

async function fetchInvitee(
  eventUri: string,
  token: string,
): Promise<CalendlyInvitee | null> {
  const eventUuid = eventUri.split('/').pop();
  if (!eventUuid) return null;
  try {
    const res = await fetch(
      `https://api.calendly.com/scheduled_events/${eventUuid}/invitees?count=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { collection?: CalendlyInvitee[] };
    return data.collection?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function fetchCalendlyBookingsData(token: string): Promise<CalendlyBookingsData> {
  const meRes = await fetch('https://api.calendly.com/users/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meRes.ok) throw new Error(`Calendly /me failed: ${meRes.status}`);
  const me = (await meRes.json()) as { resource?: { uri?: string } };
  const userUri = me.resource?.uri;
  if (!userUri) throw new Error('Calendly: missing user URI');

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    user: userUri,
    min_start_time: sevenDaysAgo.toISOString(),
    max_start_time: sevenDaysFromNow.toISOString(),
    status: 'active',
    count: '25',
  });

  const eventsRes = await fetch(`https://api.calendly.com/scheduled_events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!eventsRes.ok) throw new Error(`Calendly events fetch failed: ${eventsRes.status}`);
  const eventsData = (await eventsRes.json()) as { collection?: CalendlyEvent[] };
  const events = eventsData.collection ?? [];

  const past = events.filter((e) => new Date(e.start_time) < now);
  const upcomingEvents = events.filter((e) => new Date(e.start_time) >= now).slice(0, 10);

  const upcoming = await Promise.all(
    upcomingEvents.map(async (e) => {
      const invitee = await fetchInvitee(e.uri, token);
      return {
        name: e.name,
        invitee_name: invitee?.name ?? 'Unknown',
        invitee_email: invitee?.email ?? '',
        start_time: e.start_time,
      };
    }),
  );

  return {
    meetings_booked: past.length,
    meeting_conversion_pct: null,
    period_label: 'Last 7 days',
    upcoming,
  };
}
```

- [ ] **Step 2: Add Calendly to registry**

Open `src/lib/integrations/registry.ts`. Add:

```typescript
// Add at top with other imports:
import { validateCalendlyToken } from './calendly/adapter';

// Add inside REGISTRY (after apollo entry):
  calendly: {
    tool: 'calendly',
    displayName: 'Calendly',
    createKeyDocsUrl: 'https://calendly.com/integrations/api_webhooks',
    instructions:
      'In Calendly, go to Integrations & apps → API & Webhooks → Personal access tokens → ' +
      'Create new token. Paste the token below.',
    validate: validateCalendlyToken,
  },
```

- [ ] **Step 3: Verify**

```bash
npm run lint && npm run build
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/integrations/calendly/adapter.ts src/lib/integrations/registry.ts
git commit -m "feat(integrations): add Calendly adapter"
```

---

## Task 3: ClickUp adapter

**Files:**
- Create: `src/lib/integrations/clickup/adapter.ts`
- Modify: `src/lib/integrations/registry.ts`

- [ ] **Step 1: Create ClickUp adapter**

Create `src/lib/integrations/clickup/adapter.ts`:

```typescript
import type { DeliveryTask, DeliveryData } from '<npm>/lib/integrations/delivery-types';

export type { DeliveryTask, DeliveryData };

export type AdapterValidation =
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string };

export async function validateClickupKey(token: string): Promise<AdapterValidation> {
  try {
    const res = await fetch('https://api.clickup.com/api/v2/user', {
      headers: { Authorization: token },
    });
    if (res.status === 401) {
      return { ok: false, reason: 'invalid_key', message: 'The token was rejected by ClickUp.' };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      return { ok: false, reason: 'network', message: `ClickUp returned ${res.status}: ${text}` };
    }
    const body = (await res.json()) as { user?: { id?: number } };
    const userId = body?.user?.id;
    if (!userId) {
      return { ok: false, reason: 'network', message: 'ClickUp response missing user ID.' };
    }
    return { ok: true, externalAccountId: String(userId) };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message: err instanceof Error ? err.message : 'Could not reach ClickUp.',
    };
  }
}

type ClickupTeam = { id: string; name: string };
type ClickupTask = {
  id: string;
  name: string;
  status: { status: string };
  due_date: string | null;
  list?: { name?: string };
};

export async function fetchClickupDeliveryData(token: string): Promise<DeliveryData> {
  const headers = { Authorization: token };
  const now = Date.now();

  const teamsRes = await fetch('https://api.clickup.com/api/v2/team', { headers });
  if (!teamsRes.ok) throw new Error(`ClickUp teams fetch failed: ${teamsRes.status}`);
  const teamsData = (await teamsRes.json()) as { teams?: ClickupTeam[] };
  const teams = teamsData.teams ?? [];
  if (teams.length === 0) return { active_projects: 0, overdue_tasks: 0, tasks: [] };

  const teamId = teams[0].id;
  const tasksRes = await fetch(
    `https://api.clickup.com/api/v2/team/${teamId}/task?include_closed=false&subtasks=true&order_by=due_date&page=0`,
    { headers },
  );
  if (!tasksRes.ok) throw new Error(`ClickUp tasks fetch failed: ${tasksRes.status}`);
  const tasksData = (await tasksRes.json()) as { tasks?: ClickupTask[] };
  const rawTasks = tasksData.tasks ?? [];

  const tasks: DeliveryTask[] = rawTasks.slice(0, 50).map((t) => {
    const dueDateMs = t.due_date ? Number(t.due_date) : null;
    const overdue = dueDateMs !== null && dueDateMs < now;
    return {
      id: t.id,
      name: t.name,
      status: t.status?.status ?? 'open',
      due_date: dueDateMs ? new Date(dueDateMs).toISOString().slice(0, 10) : null,
      overdue,
      project_name: t.list?.name ?? 'No list',
      source: 'clickup' as const,
    };
  });

  const overdue_tasks = tasks.filter((t) => t.overdue).length;
  const active_projects = new Set(tasks.map((t) => t.project_name)).size;

  return { active_projects, overdue_tasks, tasks };
}
```

- [ ] **Step 2: Add ClickUp to registry**

Open `src/lib/integrations/registry.ts`. Add:

```typescript
// Add at top with other imports:
import { validateClickupKey } from './clickup/adapter';

// Add inside REGISTRY:
  clickup: {
    tool: 'clickup',
    displayName: 'ClickUp',
    createKeyDocsUrl: 'https://app.clickup.com/settings/apps',
    instructions:
      'In ClickUp, go to Settings → Apps → API Token. ' +
      'Copy your personal API token and paste it below.',
    validate: validateClickupKey,
  },
```

- [ ] **Step 3: Verify**

```bash
npm run lint && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/integrations/clickup/adapter.ts src/lib/integrations/registry.ts
git commit -m "feat(integrations): add ClickUp adapter"
```

---

## Task 4: Asana adapter

**Files:**
- Create: `src/lib/integrations/asana/adapter.ts`
- Modify: `src/lib/integrations/registry.ts`

- [ ] **Step 1: Create Asana adapter**

Create `src/lib/integrations/asana/adapter.ts`:

```typescript
import type { DeliveryTask, DeliveryData } from '<npm>/lib/integrations/delivery-types';

export type AdapterValidation =
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string };

export async function validateAsanaToken(token: string): Promise<AdapterValidation> {
  try {
    const res = await fetch('https://app.asana.com/api/1.0/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      return { ok: false, reason: 'invalid_key', message: 'The token was rejected by Asana.' };
    }
    if (res.status === 403) {
      return { ok: false, reason: 'permission', message: 'The token lacks required permissions.' };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      return { ok: false, reason: 'network', message: `Asana returned ${res.status}: ${text}` };
    }
    const body = (await res.json()) as { data?: { gid?: string } };
    const gid = body?.data?.gid;
    if (!gid) {
      return { ok: false, reason: 'network', message: 'Asana response missing user GID.' };
    }
    return { ok: true, externalAccountId: gid };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message: err instanceof Error ? err.message : 'Could not reach Asana.',
    };
  }
}

type AsanaWorkspace = { gid: string; name: string };
type AsanaTask = {
  gid: string;
  name: string;
  completed: boolean;
  due_on: string | null;
  memberships?: Array<{ project?: { name?: string } }>;
};

export async function fetchAsanaDeliveryData(token: string): Promise<DeliveryData> {
  const headers = { Authorization: `Bearer ${token}` };
  const today = new Date().toISOString().slice(0, 10);

  const wsRes = await fetch('https://app.asana.com/api/1.0/workspaces', { headers });
  if (!wsRes.ok) throw new Error(`Asana workspaces fetch failed: ${wsRes.status}`);
  const wsData = (await wsRes.json()) as { data?: AsanaWorkspace[] };
  const workspaces = wsData.data ?? [];
  if (workspaces.length === 0) return { active_projects: 0, overdue_tasks: 0, tasks: [] };

  const wsGid = workspaces[0].gid;
  const params = new URLSearchParams({
    workspace: wsGid,
    assignee: 'me',
    completed_since: 'now',
    opt_fields: 'name,completed,due_on,memberships.project.name',
    limit: '50',
  });
  const tasksRes = await fetch(`https://app.asana.com/api/1.0/tasks?${params}`, { headers });
  if (!tasksRes.ok) throw new Error(`Asana tasks fetch failed: ${tasksRes.status}`);
  const tasksData = (await tasksRes.json()) as { data?: AsanaTask[] };
  const rawTasks = tasksData.data ?? [];

  const tasks: DeliveryTask[] = rawTasks.map((t) => ({
    id: t.gid,
    name: t.name,
    status: t.completed ? 'complete' : 'incomplete',
    due_date: t.due_on,
    overdue: t.due_on !== null && t.due_on < today,
    project_name: t.memberships?.[0]?.project?.name ?? 'No project',
    source: 'asana' as const,
  }));

  const overdue_tasks = tasks.filter((t) => t.overdue).length;
  const active_projects = new Set(tasks.map((t) => t.project_name)).size;

  return { active_projects, overdue_tasks, tasks };
}
```

- [ ] **Step 2: Add Asana to registry**

Open `src/lib/integrations/registry.ts`. Add:

```typescript
// Add at top with other imports:
import { validateAsanaToken } from './asana/adapter';

// Add inside REGISTRY:
  asana: {
    tool: 'asana',
    displayName: 'Asana',
    createKeyDocsUrl: 'https://app.asana.com/0/my-apps',
    instructions:
      'In Asana, go to My Profile Settings → Apps → Manage developer apps → ' +
      'Personal access token → Create new token. Paste it below.',
    validate: validateAsanaToken,
  },
```

- [ ] **Step 3: Verify**

```bash
npm run lint && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/integrations/asana/adapter.ts src/lib/integrations/registry.ts
git commit -m "feat(integrations): add Asana adapter"
```

---

## Task 5: Toggl adapter

**Files:**
- Create: `src/lib/integrations/toggl/adapter.ts`
- Modify: `src/lib/integrations/registry.ts`

- [ ] **Step 1: Create Toggl adapter**

Create `src/lib/integrations/toggl/adapter.ts`:

```typescript
export type TogglTimeData = {
  hours_tracked: number;
  utilization_pct: number | null;
  by_project: Array<{
    project_name: string;
    hours: number;
    color: string;
  }>;
  period_label: string;
};

export type AdapterValidation =
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string };

function basicAuth(apiToken: string): string {
  return `Basic ${Buffer.from(`${apiToken}:api_token`).toString('base64')}`;
}

export async function validateTogglToken(apiToken: string): Promise<AdapterValidation> {
  try {
    const res = await fetch('https://api.track.toggl.com/api/v9/me', {
      headers: { Authorization: basicAuth(apiToken) },
    });
    if (res.status === 403) {
      return { ok: false, reason: 'invalid_key', message: 'The API token was rejected by Toggl.' };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      return { ok: false, reason: 'network', message: `Toggl returned ${res.status}: ${text}` };
    }
    const body = (await res.json()) as { id?: number };
    if (!body.id) {
      return { ok: false, reason: 'network', message: 'Toggl response missing user ID.' };
    }
    return { ok: true, externalAccountId: String(body.id) };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message: err instanceof Error ? err.message : 'Could not reach Toggl.',
    };
  }
}

type TogglTimeEntry = {
  workspace_id: number;
  project_id: number | null;
  duration: number;
};
type TogglProject = { id: number; name: string; color: string };
type TogglMe = { id?: number; default_workspace_id?: number };

export async function fetchTogglTimeData(apiToken: string): Promise<TogglTimeData> {
  const auth = basicAuth(apiToken);
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - daysFromMonday);
  weekStart.setUTCHours(0, 0, 0, 0);

  const params = new URLSearchParams({
    start_date: weekStart.toISOString().slice(0, 10),
    end_date: now.toISOString().slice(0, 10),
  });

  const [entriesRes, meRes] = await Promise.all([
    fetch(`https://api.track.toggl.com/api/v9/me/time_entries?${params}`, {
      headers: { Authorization: auth },
    }),
    fetch('https://api.track.toggl.com/api/v9/me', { headers: { Authorization: auth } }),
  ]);

  if (!entriesRes.ok) throw new Error(`Toggl time entries fetch failed: ${entriesRes.status}`);
  const entries = (await entriesRes.json()) as TogglTimeEntry[];
  const me = meRes.ok ? ((await meRes.json()) as TogglMe) : null;
  const workspaceId = me?.default_workspace_id;

  const completed = entries.filter((e) => e.duration > 0);
  const totalSeconds = completed.reduce((s, e) => s + e.duration, 0);
  const hours_tracked = Math.round((totalSeconds / 3600) * 10) / 10;
  const utilization_pct =
    hours_tracked > 0 ? Math.round((hours_tracked / 40) * 1000) / 10 : null;

  const byProjectId: Record<string, number> = {};
  for (const e of completed) {
    const key = e.project_id != null ? String(e.project_id) : '__none__';
    byProjectId[key] = (byProjectId[key] ?? 0) + e.duration;
  }

  let projects: TogglProject[] = [];
  if (workspaceId) {
    try {
      const projRes = await fetch(
        `https://api.track.toggl.com/api/v9/workspaces/${workspaceId}/projects?active=true`,
        { headers: { Authorization: auth } },
      );
      if (projRes.ok) projects = (await projRes.json()) as TogglProject[];
    } catch { /* skip — project names will fall back to ID */ }
  }
  const projectById = new Map(projects.map((p) => [String(p.id), p]));

  const by_project = Object.entries(byProjectId)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([pid, secs]) => {
      const proj = projectById.get(pid);
      return {
        project_name:
          proj?.name ?? (pid === '__none__' ? 'No project' : `Project ${pid}`),
        hours: Math.round((secs / 3600) * 10) / 10,
        color: proj?.color ?? '#6b7280',
      };
    });

  return { hours_tracked, utilization_pct, by_project, period_label: 'This week' };
}
```

- [ ] **Step 2: Add Toggl to registry**

Open `src/lib/integrations/registry.ts`. Add:

```typescript
// Add at top with other imports:
import { validateTogglToken } from './toggl/adapter';

// Add inside REGISTRY:
  toggl: {
    tool: 'toggl',
    displayName: 'Toggl',
    createKeyDocsUrl: 'https://track.toggl.com/profile',
    instructions:
      'In Toggl Track, click your avatar (bottom-left) → Profile Settings. ' +
      'Scroll to "API Token" at the bottom. Copy it and paste it below.',
    validate: validateTogglToken,
  },
```

- [ ] **Step 3: Verify**

```bash
npm run lint && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/integrations/toggl/adapter.ts src/lib/integrations/registry.ts
git commit -m "feat(integrations): add Toggl adapter"
```

---

## Task 6: Integrations page — category grouping + enable 5 tools

**Files:**
- Modify: `src/app/dashboard/integrations/page.tsx`

- [ ] **Step 1: Update TOOL_CATALOG and add category render**

Replace the entire file content of `src/app/dashboard/integrations/page.tsx` with:

```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';
import { IntegrationCard } from '<npm>/components/dashboard/integration-card';
import { ConnectKeyDialog } from '<npm>/components/dashboard/connect-key-dialog';

type Connection = {
  tool: string;
  connected_at: string;
  status: 'connected' | 'requires_reconnect' | 'revoked';
  external_account_id: string | null;
  last_synced_at: string | null;
};

type ToolDef = {
  key: string;
  label: string;
  blurb: string;
  cardKey: string;
  enabled: boolean;
  instructions: string;
  createKeyDocsUrl: string;
};

const TOOL_CATALOG: ToolDef[] = [
  {
    key: 'stripe',
    label: 'Stripe',
    blurb: 'Invoiced, paid, overdue',
    cardKey: 'Finance',
    enabled: true,
    instructions:
      'In Stripe, go to Developers → API keys → Create restricted key. Permissions: Read on Charges, Invoices, Account. Paste the key (rk_… or sk_…) below.',
    createKeyDocsUrl: 'https://dashboard.stripe.com/apikeys',
  },
  {
    key: 'hubspot',
    label: 'HubSpot',
    blurb: 'CRM — pipeline value, leads, won deals',
    cardKey: 'Sales',
    enabled: true,
    instructions:
      'In HubSpot, go to Settings → Integrations → Private Apps → Create a private app. Scopes: crm.objects.deals.read + crm.objects.contacts.read. Paste the Private App Token below.',
    createKeyDocsUrl: 'https://developers.hubspot.com/docs/api/private-apps#create-a-private-app',
  },
  {
    key: 'apollo',
    label: 'Apollo',
    blurb: 'Cold outreach — emails sent, opens, replies',
    cardKey: 'Marketing',
    enabled: true,
    instructions:
      'In Apollo, go to Settings → Integrations → API → Create API Key. Copy the key and paste it below.',
    createKeyDocsUrl: 'https://developer.apollo.io/keys/',
  },
  {
    key: 'calendly',
    label: 'Calendly',
    blurb: 'Meetings booked from outreach',
    cardKey: 'Marketing',
    enabled: true,
    instructions:
      'In Calendly, go to Integrations & apps → API & Webhooks → Personal access tokens → Create new token. Paste the token below.',
    createKeyDocsUrl: 'https://calendly.com/integrations/api_webhooks',
  },
  {
    key: 'clickup',
    label: 'ClickUp',
    blurb: 'Projects, tasks, deadlines',
    cardKey: 'Delivery',
    enabled: true,
    instructions:
      'In ClickUp, go to Settings → Apps → API Token. Copy your personal API token and paste it below.',
    createKeyDocsUrl: 'https://app.clickup.com/settings/apps',
  },
  {
    key: 'asana',
    label: 'Asana',
    blurb: 'Projects, tasks, deadlines',
    cardKey: 'Delivery',
    enabled: true,
    instructions:
      'In Asana, go to My Profile Settings → Apps → Manage developer apps → Personal access token → Create new token. Paste it below.',
    createKeyDocsUrl: 'https://app.asana.com/0/my-apps',
  },
  {
    key: 'toggl',
    label: 'Toggl',
    blurb: 'Hours tracked, utilization',
    cardKey: 'Time tracking',
    enabled: true,
    instructions:
      'In Toggl Track, click your avatar (bottom-left) → Profile Settings. Scroll to "API Token" at the bottom. Copy it and paste it below.',
    createKeyDocsUrl: 'https://track.toggl.com/profile',
  },
];

const CATEGORY_ORDER = ['Finance', 'Sales', 'Marketing', 'Delivery', 'Time tracking'] as const;

export default function IntegrationsSettingsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [dialogTool, setDialogTool] = useState<ToolDef | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to load');
        return;
      }
      setConnections(data.connected ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function disconnect(tool: string) {
    if (!confirm(`Disconnect ${tool}? Your dashboard will stop reading from ${tool}.`)) return;
    const res = await fetch(`/api/integrations/${tool}/disconnect`, { method: 'POST' });
    if (res.ok) {
      setBanner({ kind: 'ok', text: `${tool[0].toUpperCase() + tool.slice(1)} disconnected.` });
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setBanner({ kind: 'err', text: data.message ?? data.error ?? 'Disconnect failed.' });
    }
  }

  function connectionFor(tool: string): Connection | undefined {
    return connections.find((c) => c.tool === tool);
  }

  return (
    <>
      <div className="mb-7">
        <h1 className="mb-1.5 font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Connected systems
        </h1>
        <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
          Connect the tools you use. We never store the data — we read it live from each tool when your dashboard opens.
        </p>
      </div>

      {banner && (
        <div
          className={
            banner.kind === 'ok'
              ? 'mb-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_8%,transparent)] px-3 py-2.5 text-[12.5px] text-[var(--color-success)]'
              : 'mb-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-warn)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-warn)_8%,transparent)] px-3 py-2.5 text-[12.5px] text-[var(--color-warn)]'
          }
        >
          {banner.text}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-3 py-2.5 text-[12.5px] text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {loading && !connections.length && (
        <div className="text-[12.5px] text-[var(--color-fg-subtle)]">Loading…</div>
      )}

      <div className="flex flex-col gap-6">
        {CATEGORY_ORDER.map((category) => {
          const tools = TOOL_CATALOG.filter((t) => t.cardKey === category);
          if (tools.length === 0) return null;
          return (
            <div key={category}>
              <h2 className="mb-2.5 text-label font-medium uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">
                {category}
              </h2>
              <div className="flex flex-col gap-2.5">
                {tools.map((t) => (
                  <IntegrationCard
                    key={t.key}
                    tool={t.key}
                    label={t.label}
                    blurb={t.blurb}
                    cardKey={t.cardKey}
                    enabled={t.enabled}
                    connection={connectionFor(t.key)}
                    onConnect={() => setDialogTool(t)}
                    onDisconnect={() => disconnect(t.key)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <ConnectKeyDialog
        open={dialogTool !== null}
        tool={dialogTool?.key ?? ''}
        displayName={dialogTool?.label ?? ''}
        instructions={dialogTool?.instructions ?? ''}
        createKeyDocsUrl={dialogTool?.createKeyDocsUrl ?? ''}
        onClose={() => setDialogTool(null)}
        onSuccess={() => {
          const label = dialogTool?.label;
          setDialogTool(null);
          setBanner({ kind: 'ok', text: `${label} connected.` });
          void load();
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npm run lint && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/integrations/page.tsx
git commit -m "feat(dashboard): category-group integrations page, enable Apollo/Calendly/ClickUp/Asana/Toggl"
```

---

## Task 7: Stripe adapter — add overdue invoice rows

**Files:**
- Modify: `src/lib/integrations/stripe/adapter.ts`

- [ ] **Step 1: Add StripeInvoiceRow type and extend StripeFinanceData**

Open `src/lib/integrations/stripe/adapter.ts`. Make the following changes:

After the existing `StripeFinanceData` type definition, replace it with:

```typescript
export type StripeInvoiceRow = {
  id: string;
  customer_name: string;
  amount: number;      // USD
  due_date: string;    // YYYY-MM-DD
  days_overdue: number;
};

export type StripeFinanceData = {
  invoiced: number;
  paid: number;
  overdue: number;
  sparkline: Array<{ date: string; amount: number }>;
  currency: 'USD';
  rows: StripeInvoiceRow[];
};
```

- [ ] **Step 2: Add overdue invoice fetch and populate rows**

In `fetchStripeFinanceData`, add a fourth parallel fetch for overdue invoices. Replace the existing `Promise.all` call with:

```typescript
  const [charges, invoices, overdueInvoices] = await Promise.all([
    stripe.charges.list({ created: { gte: unix(thirtyDaysAgo) }, limit: 100 }),
    stripe.invoices.list({ created: { gte: unix(monthStart) }, limit: 100 }),
    stripe.invoices.list({
      status: 'open',
      due_date: { lt: unix(now) },
      limit: 5,
      expand: ['data.customer'],
    }),
  ]);
```

Then, before the `return` statement at the end of the function, add:

```typescript
  const rows: StripeInvoiceRow[] = overdueInvoices.data
    .filter((inv) => inv.due_date != null)
    .map((inv) => {
      const customer = inv.customer;
      const customerName =
        typeof customer === 'object' && customer !== null && 'name' in customer
          ? ((customer as { name?: string | null }).name ?? 'Unknown')
          : 'Unknown';
      const dueDate = inv.due_date!;
      const daysOverdue = Math.floor((unix(now) - dueDate) / 86400);
      return {
        id: inv.id,
        customer_name: customerName,
        amount: (inv.amount_remaining ?? 0) / 100,
        due_date: new Date(dueDate * 1000).toISOString().slice(0, 10),
        days_overdue: daysOverdue,
      };
    })
    .sort((a, b) => b.days_overdue - a.days_overdue);
```

Then update the return statement to include `rows`:

```typescript
  return { invoiced, paid, overdue, sparkline, currency: 'USD', rows };
```

- [ ] **Step 3: Verify**

```bash
npm run lint && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/integrations/stripe/adapter.ts
git commit -m "feat(integrations): add overdue invoice rows to Stripe adapter"
```

---

## Task 8: HubSpot adapter — add open deal rows

**Files:**
- Modify: `src/lib/integrations/hubspot/adapter.ts`

- [ ] **Step 1: Add HubspotDealRow type and extend HubspotSalesData**

Open `src/lib/integrations/hubspot/adapter.ts`. After the existing `HubspotSalesData` type, replace it with:

```typescript
export type HubspotDealRow = {
  id: string;
  name: string;
  amount: number;         // USD
  stage: string;
  close_date: string | null;  // YYYY-MM-DD or null
};

export type HubspotSalesData = {
  pipeline_value: number;
  open_deals_count: number;
  new_leads: number;
  deals_won_this_month: number;
  sparkline: Array<{ date: string; deals_created: number }>;
  currency: 'USD';
  truncated: boolean;
  rows: HubspotDealRow[];
};
```

- [ ] **Step 2: Add `dealname` to deal properties fetch**

In `fetchHubspotSalesData`, update the deals fetch to include `dealname`:

```typescript
    hs.crm.deals.basicApi.getPage(
      PAGE_LIMIT,
      undefined,
      ['amount', 'dealstage', 'dealname', 'createdate', 'closedate', 'hs_is_closed', 'hs_is_closed_won'],
      undefined,
      undefined,
      false,
    ),
```

- [ ] **Step 3: Populate rows in the return value**

After the existing loop that computes `pipelineValue`, `openDealsCount`, etc., add the rows computation before the `return` statement:

```typescript
  const rows: HubspotDealRow[] = dealsResp.results
    .filter((deal) => (deal.properties?.hs_is_closed ?? '').toString() !== 'true')
    .map((deal) => ({
      id: deal.id,
      name: deal.properties?.dealname ?? 'Untitled deal',
      amount: Number(deal.properties?.amount ?? 0) || 0,
      stage: deal.properties?.dealstage ?? 'unknown',
      close_date: deal.properties?.closedate
        ? new Date(deal.properties.closedate).toISOString().slice(0, 10)
        : null,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
```

Update the return statement:

```typescript
  return {
    pipeline_value: pipelineValue,
    open_deals_count: openDealsCount,
    new_leads: newLeads,
    deals_won_this_month: dealsWonThisMonth,
    sparkline,
    currency: 'USD',
    truncated,
    rows,
  };
```

- [ ] **Step 4: Verify**

```bash
npm run lint && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/integrations/hubspot/adapter.ts
git commit -m "feat(integrations): add open deal rows to HubSpot adapter"
```

---

## Task 9: Update /api/dashboard/marketing (requires Tasks 1 & 2)

**Files:**
- Modify: `src/app/api/dashboard/marketing/route.ts`

- [ ] **Step 1: Replace file with direct adapter implementation**

Replace the entire content of `src/app/api/dashboard/marketing/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import {
  fetchApolloMarketingData,
  type ApolloMarketingData,
} from '<npm>/lib/integrations/apollo/adapter';
import {
  fetchCalendlyBookingsData,
  type CalendlyBookingsData,
} from '<npm>/lib/integrations/calendly/adapter';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY = (userId: string) => `dash:marketing:${userId}`;

type MarketingData = {
  emails_sent: number | null;
  open_rate_pct: number | null;
  reply_rate_pct: number | null;
  reply_sparkline: number[] | null;
  meetings_booked: number | null;
  meeting_conversion_pct: number | null;
  apollo_connected: boolean;
  calendly_connected: boolean;
  period_label: string;
  sequences: ApolloMarketingData['sequences'];
  upcoming: CalendlyBookingsData['upcoming'];
};

type MarketingResponse =
  | { status: 'ok'; data: MarketingData }
  | { status: 'error'; message: string };

type IntegrationRow = {
  tool: string;
  encrypted_token: string;
  iv: string;
  auth_tag: string;
  status: string;
};

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'error', message: 'unauthorized' }, { status: 401 });
  }

  const fresh = req.nextUrl.searchParams.get('fresh') === '1';
  const redis = (() => {
    try { return Redis.fromEnv(); } catch { return null; }
  })();
  if (!fresh && redis) {
    const cached = await redis.get<MarketingResponse>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') return NextResponse.json(cached);
  }

  const supabase = getServerSupabaseClient();
  const { data: rows } = await supabase
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .in('tool', ['apollo', 'calendly']);

  const apolloRow = (rows ?? []).find(
    (r): r is IntegrationRow => r.tool === 'apollo' && r.status === 'connected',
  );
  const calendlyRow = (rows ?? []).find(
    (r): r is IntegrationRow => r.tool === 'calendly' && r.status === 'connected',
  );

  let apolloData: ApolloMarketingData | null = null;
  let apolloConnected = false;
  if (apolloRow?.encrypted_token) {
    try {
      const key = decryptApiKey({
        encrypted_token: apolloRow.encrypted_token,
        iv: apolloRow.iv,
        auth_tag: apolloRow.auth_tag,
      });
      apolloData = await fetchApolloMarketingData(key);
      apolloConnected = true;
    } catch (err) {
      console.error('[marketing] apollo fetch failed:', err);
    }
  }

  let calendlyData: CalendlyBookingsData | null = null;
  let calendlyConnected = false;
  if (calendlyRow?.encrypted_token) {
    try {
      const key = decryptApiKey({
        encrypted_token: calendlyRow.encrypted_token,
        iv: calendlyRow.iv,
        auth_tag: calendlyRow.auth_tag,
      });
      calendlyData = await fetchCalendlyBookingsData(key);
      calendlyConnected = true;
    } catch (err) {
      console.error('[marketing] calendly fetch failed:', err);
    }
  }

  const synced = [
    ...(apolloConnected ? ['apollo'] : []),
    ...(calendlyConnected ? ['calendly'] : []),
  ];
  if (synced.length > 0) {
    await supabase
      .from('integrations')
      .update({ last_synced_at: new Date().toISOString(), last_error: null })
      .eq('client_id', userId)
      .in('tool', synced);
  }

  const payload: MarketingResponse = {
    status: 'ok',
    data: {
      emails_sent: apolloData?.emails_sent ?? null,
      open_rate_pct: apolloData?.open_rate_pct ?? null,
      reply_rate_pct: apolloData?.reply_rate_pct ?? null,
      reply_sparkline: apolloData?.reply_sparkline ?? null,
      meetings_booked: calendlyData?.meetings_booked ?? null,
      meeting_conversion_pct: calendlyData?.meeting_conversion_pct ?? null,
      apollo_connected: apolloConnected,
      calendly_connected: calendlyConnected,
      period_label:
        apolloData?.period_label ?? calendlyData?.period_label ?? 'Last 30 days',
      sequences: apolloData?.sequences ?? [],
      upcoming: calendlyData?.upcoming ?? [],
    },
  };

  if (redis) await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(payload);
}
```

- [ ] **Step 2: Verify**

```bash
npm run lint && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/marketing/route.ts
git commit -m "feat(api): replace n8n marketing route with direct Apollo + Calendly adapters"
```

---

## Task 10: New /api/dashboard/delivery route (requires Tasks 3 & 4)

**Files:**
- Create: `src/app/api/dashboard/delivery/route.ts`

- [ ] **Step 1: Create delivery route**

Create `src/app/api/dashboard/delivery/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { fetchClickupDeliveryData } from '<npm>/lib/integrations/clickup/adapter';
import { fetchAsanaDeliveryData } from '<npm>/lib/integrations/asana/adapter';
import type { DeliveryData } from '<npm>/lib/integrations/delivery-types';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY = (userId: string) => `dash:delivery:${userId}`;

type DeliveryResponse =
  | { status: 'ok'; data: DeliveryData; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected' }
  | { status: 'unavailable'; message: string };

type IntegrationRow = {
  tool: string;
  encrypted_token: string;
  iv: string;
  auth_tag: string;
  status: string;
};

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { status: 'unavailable', message: 'unauthorized' },
      { status: 401 },
    );
  }

  const supabase = getServerSupabaseClient();
  const { data: rows } = await supabase
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .in('tool', ['clickup', 'asana']);

  const clickupRow = (rows ?? []).find(
    (r): r is IntegrationRow => r.tool === 'clickup' && r.status === 'connected',
  );
  const asanaRow = (rows ?? []).find(
    (r): r is IntegrationRow => r.tool === 'asana' && r.status === 'connected',
  );

  if (!clickupRow && !asanaRow) {
    return NextResponse.json({ status: 'not_connected' });
  }

  const redis = (() => {
    try { return Redis.fromEnv(); } catch { return null; }
  })();
  if (redis) {
    const cached = await redis.get<DeliveryResponse>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  const merged: DeliveryData = { active_projects: 0, overdue_tasks: 0, tasks: [] };
  const synced: string[] = [];

  if (clickupRow?.encrypted_token) {
    try {
      const key = decryptApiKey({
        encrypted_token: clickupRow.encrypted_token,
        iv: clickupRow.iv,
        auth_tag: clickupRow.auth_tag,
      });
      const d = await fetchClickupDeliveryData(key);
      merged.active_projects += d.active_projects;
      merged.overdue_tasks += d.overdue_tasks;
      merged.tasks.push(...d.tasks);
      synced.push('clickup');
    } catch (err) {
      console.error('[delivery] clickup fetch failed:', err);
    }
  }

  if (asanaRow?.encrypted_token) {
    try {
      const key = decryptApiKey({
        encrypted_token: asanaRow.encrypted_token,
        iv: asanaRow.iv,
        auth_tag: asanaRow.auth_tag,
      });
      const d = await fetchAsanaDeliveryData(key);
      merged.active_projects += d.active_projects;
      merged.overdue_tasks += d.overdue_tasks;
      merged.tasks.push(...d.tasks);
      synced.push('asana');
    } catch (err) {
      console.error('[delivery] asana fetch failed:', err);
    }
  }

  const lastSyncedAt = new Date().toISOString();
  if (synced.length > 0) {
    await supabase
      .from('integrations')
      .update({ last_synced_at: lastSyncedAt, last_error: null })
      .eq('client_id', userId)
      .in('tool', synced);
  }

  const payload: DeliveryResponse = {
    status: 'ok',
    data: merged,
    last_synced_at: lastSyncedAt,
    from_cache: false,
  };
  if (redis) await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(payload);
}
```

- [ ] **Step 2: Verify**

```bash
npm run lint && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/delivery/route.ts
git commit -m "feat(api): add delivery route for ClickUp + Asana"
```

---

## Task 11: New /api/dashboard/time-tracking route (requires Task 5)

**Files:**
- Create: `src/app/api/dashboard/time-tracking/route.ts`

- [ ] **Step 1: Create time-tracking route**

Create `src/app/api/dashboard/time-tracking/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import {
  fetchTogglTimeData,
  type TogglTimeData,
} from '<npm>/lib/integrations/toggl/adapter';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_KEY = (userId: string) => `dash:time:${userId}`;

type TimeResponse =
  | { status: 'ok'; data: TogglTimeData; last_synced_at: string; from_cache: boolean }
  | { status: 'not_connected' }
  | { status: 'unavailable'; message: string };

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { status: 'unavailable', message: 'unauthorized' },
      { status: 401 },
    );
  }

  const supabase = getServerSupabaseClient();
  const { data: row } = await supabase
    .from('integrations')
    .select('encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .eq('tool', 'toggl')
    .maybeSingle();

  if (!row?.encrypted_token || row.status !== 'connected') {
    return NextResponse.json({ status: 'not_connected' });
  }

  const redis = (() => {
    try { return Redis.fromEnv(); } catch { return null; }
  })();
  if (redis) {
    const cached = await redis.get<TimeResponse>(CACHE_KEY(userId));
    if (cached && cached.status === 'ok') {
      return NextResponse.json({ ...cached, from_cache: true });
    }
  }

  let data: TogglTimeData;
  try {
    const apiToken = decryptApiKey({
      encrypted_token: row.encrypted_token,
      iv: row.iv,
      auth_tag: row.auth_tag,
    });
    data = await fetchTogglTimeData(apiToken);
  } catch (err) {
    console.error('[time-tracking] toggl fetch failed:', err);
    return NextResponse.json({
      status: 'unavailable',
      message: err instanceof Error ? err.message : 'fetch_failed',
    });
  }

  const lastSyncedAt = new Date().toISOString();
  await supabase
    .from('integrations')
    .update({ last_synced_at: lastSyncedAt, last_error: null })
    .eq('client_id', userId)
    .eq('tool', 'toggl');

  const payload: TimeResponse = {
    status: 'ok',
    data,
    last_synced_at: lastSyncedAt,
    from_cache: false,
  };
  if (redis) await redis.set(CACHE_KEY(userId), payload, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(payload);
}
```

- [ ] **Step 2: Verify**

```bash
npm run lint && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/time-tracking/route.ts
git commit -m "feat(api): add time-tracking route for Toggl"
```

---

## Task 12: Business page — fill rows + Delivery + Time sections (requires Tasks 7–11)

**Files:**
- Modify: `src/app/dashboard/business/page.tsx`

- [ ] **Step 1: Replace the entire file**

Replace the entire content of `src/app/dashboard/business/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { NarrativeCard } from '../_components/narrative-card';
import { EmptyStateConnect } from '../_components/empty-state-connect';

type StripeInvoiceRow = {
  id: string;
  customer_name: string;
  amount: number;
  due_date: string;
  days_overdue: number;
};

type StripeFinanceData = {
  invoiced: number;
  paid: number;
  overdue: number;
  sparkline: Array<{ date: string; amount: number }>;
  currency: 'USD';
  rows: StripeInvoiceRow[];
};

type HubspotDealRow = {
  id: string;
  name: string;
  amount: number;
  stage: string;
  close_date: string | null;
};

type HubspotSalesData = {
  pipeline_value: number;
  open_deals_count: number;
  new_leads: number;
  deals_won_this_month: number;
  sparkline: Array<{ date: string; deals_created: number }>;
  currency: 'USD';
  truncated: boolean;
  rows: HubspotDealRow[];
};

type ApolloSequence = {
  id: string;
  name: string;
  contacts_enrolled: number;
  emails_sent: number;
  open_rate_pct: number;
  reply_rate_pct: number;
};

type CalendlyUpcoming = {
  name: string;
  invitee_name: string;
  invitee_email: string;
  start_time: string;
};

type MarketingWidgetData = {
  emails_sent: number | null;
  open_rate_pct: number | null;
  reply_rate_pct: number | null;
  reply_sparkline: number[] | null;
  meetings_booked: number | null;
  meeting_conversion_pct: number | null;
  apollo_connected: boolean;
  calendly_connected: boolean;
  period_label: string;
  sequences: ApolloSequence[];
  upcoming: CalendlyUpcoming[];
};

type DeliveryTask = {
  id: string;
  name: string;
  status: string;
  due_date: string | null;
  overdue: boolean;
  project_name: string;
  source: 'clickup' | 'asana';
};

type DeliveryData = {
  active_projects: number;
  overdue_tasks: number;
  tasks: DeliveryTask[];
};

type TogglProjectRow = { project_name: string; hours: number; color: string };

type TogglTimeData = {
  hours_tracked: number;
  utilization_pct: number | null;
  by_project: TogglProjectRow[];
  period_label: string;
};

type DashboardAlert = {
  id: string;
  severity: 'needs-you' | 'watch' | 'heads-up';
  label: string;
  message: string;
  href: string;
};

type AlertsResp = { status: string; alerts?: DashboardAlert[] };

export default function BusinessPage() {
  return (
    <div className="flex flex-col gap-3.5">
      <Topbar />
      <Kpis />
      <div className="grid grid-cols-[3fr_2fr] gap-3">
        <NarrativeCard section="business" persona="ceo" title="This week's business pulse" />
        <BusinessAlerts />
      </div>
      <RevenueSection />
      <PipelineSection />
      <ProspectsSection />
      <BookingsSection />
      <DeliverySection />
      <TimeSection />
    </div>
  );
}

function Topbar() {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
      <div className="text-body-sm text-[var(--color-fg-muted)]">
        Dashboard /{' '}
        <span className="font-semibold text-[var(--color-fg)]">Business</span>
      </div>
      <span className="inline-flex items-center gap-1.5 text-body-sm text-[var(--color-fg-subtle)]">
        <span className="block size-1.5 rounded-full bg-[var(--color-success)] shadow-[0_0_5px_rgba(74,222,128,0.7)]" />
        Live
      </span>
    </div>
  );
}

function Kpis() {
  const [fin, setFin] = useState<{ status: string; data?: StripeFinanceData } | null>(null);
  const [sales, setSales] = useState<{ status: string; data?: HubspotSalesData } | null>(null);
  const [mkt, setMkt] = useState<{ status?: string; data?: MarketingWidgetData } | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/finance').then((r) => r.json()).then(setFin).catch(() => {});
    fetch('/api/dashboard/sales-live').then((r) => r.json()).then(setSales).catch(() => {});
    fetch('/api/dashboard/marketing').then((r) => r.json()).then(setMkt).catch(() => {});
  }, []);

  const paid = fin?.data?.paid;
  const pipeline = sales?.data?.pipeline_value;
  const calls = mkt?.data?.meetings_booked;
  const emails = mkt?.data?.emails_sent;

  return (
    <div className="grid grid-cols-4 gap-2.5">
      <Kpi label="Revenue · MTD" value={typeof paid === 'number' ? fmtMoney(paid) : '—'} />
      <Kpi label="Active pipeline" value={typeof pipeline === 'number' ? fmtMoney(pipeline) : '—'} />
      <Kpi label="Emails sent" value={typeof emails === 'number' ? String(emails) : '—'} />
      <Kpi label="Booked calls · 7d" value={typeof calls === 'number' ? String(calls) : '—'} />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
      <div className="mb-1.5 text-label text-[var(--color-fg-subtle)]">{label}</div>
      <div className="text-h3 font-serif leading-none text-[var(--color-fg)]">{value}</div>
    </div>
  );
}

function BusinessAlerts() {
  const [resp, setResp] = useState<AlertsResp | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/alerts')
      .then((r) => r.json())
      .then(setResp)
      .catch(() => setResp({ status: 'unavailable' }));
  }, []);

  const all = resp?.alerts ?? [];
  const items = all
    .filter(
      (a) =>
        a.href.startsWith('/dashboard/business') ||
        /tool=(stripe|hubspot|apollo|calendly|clickup|asana|toggl)/.test(a.href),
    )
    .slice(0, 5);

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-xs)]">
      <h3 className="mb-3 text-label text-[var(--color-fg-muted)]">Current alerts</h3>
      {resp === null ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">All clear.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((a) => (
            <li
              key={a.id}
              className="border-b border-[var(--color-border)] py-1.5 text-body-sm text-[var(--color-fg-muted)] last:border-b-0"
            >
              <span className="font-semibold text-[var(--color-fg)]">{a.label}:</span>{' '}
              {a.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RevenueSection() {
  return (
    <ToolSection
      title="Revenue (Stripe)"
      endpoint="/api/dashboard/finance"
      tool="Stripe"
      toolSlug="stripe"
      renderConnected={(data) => {
        const fin = (data as { data?: StripeFinanceData }).data;
        return (
          <>
            <div className="mb-4 grid grid-cols-3 gap-2">
              <StatMini label="Invoiced · MTD" value={fin?.invoiced != null ? fmtMoney(fin.invoiced) : '—'} />
              <StatMini label="Paid · MTD" value={fin?.paid != null ? fmtMoney(fin.paid) : '—'} />
              <StatMini label="Overdue" value={fin?.overdue != null ? fmtMoney(fin.overdue) : '—'} />
            </div>
            {fin?.rows && fin.rows.length > 0 ? (
              <RowTable
                headers={['Customer', 'Amount', 'Due date', 'Days overdue']}
                rows={fin.rows.map((r) => [
                  r.customer_name,
                  fmtMoney(r.amount),
                  r.due_date,
                  `${r.days_overdue}d`,
                ])}
              />
            ) : (
              <p className="text-body-sm text-[var(--color-fg-subtle)]">No overdue invoices.</p>
            )}
          </>
        );
      }}
    />
  );
}

function PipelineSection() {
  return (
    <ToolSection
      title="Sales pipeline (HubSpot)"
      endpoint="/api/dashboard/sales-live"
      tool="HubSpot"
      toolSlug="hubspot"
      renderConnected={(data) => {
        const hs = (data as { data?: HubspotSalesData }).data;
        return (
          <>
            <div className="mb-4 grid grid-cols-4 gap-2">
              <StatMini label="Open deals" value={hs?.open_deals_count != null ? String(hs.open_deals_count) : '—'} />
              <StatMini label="Pipeline $" value={hs?.pipeline_value != null ? fmtMoney(hs.pipeline_value) : '—'} />
              <StatMini label="New leads · 30d" value={hs?.new_leads != null ? String(hs.new_leads) : '—'} />
              <StatMini label="Won · MTD" value={hs?.deals_won_this_month != null ? String(hs.deals_won_this_month) : '—'} />
            </div>
            {hs?.rows && hs.rows.length > 0 ? (
              <RowTable
                headers={['Deal', 'Value', 'Stage', 'Close date']}
                rows={hs.rows.map((r) => [
                  r.name,
                  fmtMoney(r.amount),
                  r.stage,
                  r.close_date ?? '—',
                ])}
              />
            ) : (
              <p className="text-body-sm text-[var(--color-fg-subtle)]">No open deals.</p>
            )}
          </>
        );
      }}
    />
  );
}

function ProspectsSection() {
  return (
    <ToolSection
      title="Prospects (Apollo)"
      endpoint="/api/dashboard/marketing"
      tool="Apollo"
      toolSlug="apollo"
      statusKey="apollo"
      renderConnected={(data) => {
        const mkt = (data as { data?: MarketingWidgetData }).data;
        return (
          <>
            <div className="mb-4 grid grid-cols-3 gap-2">
              <StatMini label="Emails sent" value={mkt?.emails_sent != null ? mkt.emails_sent.toLocaleString() : '—'} />
              <StatMini label="Open rate" value={mkt?.open_rate_pct != null ? `${mkt.open_rate_pct.toFixed(1)}%` : '—'} />
              <StatMini label="Reply rate" value={mkt?.reply_rate_pct != null ? `${mkt.reply_rate_pct.toFixed(1)}%` : '—'} />
            </div>
            {mkt?.sequences && mkt.sequences.length > 0 ? (
              <RowTable
                headers={['Sequence', 'Enrolled', 'Sent', 'Open %', 'Reply %']}
                rows={mkt.sequences.map((s) => [
                  s.name,
                  String(s.contacts_enrolled),
                  String(s.emails_sent),
                  `${s.open_rate_pct.toFixed(1)}%`,
                  `${s.reply_rate_pct.toFixed(1)}%`,
                ])}
              />
            ) : (
              <p className="text-body-sm text-[var(--color-fg-subtle)]">No active sequences.</p>
            )}
          </>
        );
      }}
    />
  );
}

function BookingsSection() {
  return (
    <ToolSection
      title="Bookings (Calendly)"
      endpoint="/api/dashboard/marketing"
      tool="Calendly"
      toolSlug="calendly"
      statusKey="calendly"
      renderConnected={(data) => {
        const mkt = (data as { data?: MarketingWidgetData }).data;
        return (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <StatMini label="Booked · last 7d" value={mkt?.meetings_booked != null ? String(mkt.meetings_booked) : '—'} />
              <StatMini label="Conversion" value={mkt?.meeting_conversion_pct != null ? `${mkt.meeting_conversion_pct.toFixed(1)}%` : '—'} />
            </div>
            {mkt?.upcoming && mkt.upcoming.length > 0 ? (
              <RowTable
                headers={['Event', 'Invitee', 'Date / Time']}
                rows={mkt.upcoming.map((u) => [
                  u.name,
                  u.invitee_name,
                  new Date(u.start_time).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                  }),
                ])}
              />
            ) : (
              <p className="text-body-sm text-[var(--color-fg-subtle)]">No upcoming bookings.</p>
            )}
          </>
        );
      }}
    />
  );
}

function DeliverySection() {
  return (
    <ToolSection
      title="Delivery (ClickUp / Asana)"
      endpoint="/api/dashboard/delivery"
      tool="ClickUp or Asana"
      toolSlug="clickup"
      renderConnected={(data) => {
        const delivery = (data as { data?: DeliveryData }).data;
        return (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <StatMini label="Active projects" value={delivery?.active_projects != null ? String(delivery.active_projects) : '—'} />
              <StatMini label="Overdue tasks" value={delivery?.overdue_tasks != null ? String(delivery.overdue_tasks) : '—'} />
            </div>
            {delivery?.tasks && delivery.tasks.length > 0 ? (
              <RowTable
                headers={['Task', 'Project', 'Due', 'Status']}
                rows={delivery.tasks.slice(0, 10).map((t) => [
                  t.name,
                  `${t.project_name} (${t.source})`,
                  t.due_date ?? '—',
                  t.overdue ? 'Overdue' : t.status,
                ])}
              />
            ) : (
              <p className="text-body-sm text-[var(--color-fg-subtle)]">No open tasks.</p>
            )}
          </>
        );
      }}
    />
  );
}

function TimeSection() {
  return (
    <ToolSection
      title="Time tracking (Toggl)"
      endpoint="/api/dashboard/time-tracking"
      tool="Toggl"
      toolSlug="toggl"
      renderConnected={(data) => {
        const time = (data as { data?: TogglTimeData }).data;
        return (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <StatMini label="Hours · this week" value={time?.hours_tracked != null ? `${time.hours_tracked}h` : '—'} />
              <StatMini label="Utilization" value={time?.utilization_pct != null ? `${time.utilization_pct.toFixed(1)}%` : '—'} />
            </div>
            {time?.by_project && time.by_project.length > 0 ? (
              <RowTable
                headers={['Project', 'Hours']}
                rows={time.by_project.map((p) => [p.project_name, `${p.hours}h`])}
              />
            ) : (
              <p className="text-body-sm text-[var(--color-fg-subtle)]">No time entries this week.</p>
            )}
          </>
        );
      }}
    />
  );
}

type ToolSectionProps = {
  title: string;
  endpoint: string;
  tool: string;
  toolSlug: string;
  statusKey?: 'apollo' | 'calendly';
  renderConnected: (data: unknown) => React.ReactNode;
};

function ToolSection({
  title,
  endpoint,
  tool,
  toolSlug,
  statusKey,
  renderConnected,
}: ToolSectionProps) {
  const [state, setState] = useState<'loading' | 'connected' | 'not-connected' | 'error'>(
    'loading',
  );
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(endpoint)
      .then((res) => {
        if (res.status === 503) {
          if (!cancelled) setState('not-connected');
          return null;
        }
        return res.json();
      })
      .then((j) => {
        if (cancelled || j === null) return;
        const status = (j as { status?: string })?.status;
        if (
          status === 'not_configured' ||
          status === 'not_enrolled' ||
          status === 'not_connected' ||
          status === 'requires_reconnect'
        ) {
          return setState('not-connected');
        }
        if (status === 'error') return setState('error');
        if (statusKey) {
          const connected = (j as { data?: Record<string, boolean> })?.data?.[
            `${statusKey}_connected`
          ];
          if (!connected) return setState('not-connected');
        }
        setData(j);
        setState('connected');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => { cancelled = true; };
  }, [endpoint, statusKey]);

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-xs)]">
      <h3 className="mb-4 text-label text-[var(--color-fg-muted)]">{title}</h3>
      {state === 'loading' ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">Loading…</p>
      ) : state === 'not-connected' ? (
        <EmptyStateConnect tool={tool} toolSlug={toolSlug} />
      ) : state === 'error' ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">
          Couldn&apos;t reach {tool}. We&apos;ll retry shortly.
        </p>
      ) : (
        renderConnected(data)
      )}
    </div>
  );
}

function RowTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            {headers.map((h) => (
              <th
                key={h}
                className="pb-2 pr-4 text-left text-label font-normal text-[var(--color-fg-subtle)] last:pr-0"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--color-border)] last:border-b-0">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="py-2.5 pr-4 text-[var(--color-fg-muted)] last:pr-0"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-h4 font-medium text-[var(--color-fg)]">{value}</div>
      <div className="text-label text-[var(--color-fg-subtle)]">{label}</div>
    </div>
  );
}

function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}
```

- [ ] **Step 2: Verify**

```bash
npm run lint && npm run build
```
Expected: clean compile, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/business/page.tsx
git commit -m "feat(dashboard): fill business page rows, add Delivery and Time sections"
```

---

## Final verification

- [ ] **Run full build from opsradar/**

```bash
npm run lint && npm run build
```
Expected: 0 errors, 0 warnings that weren't there before.

- [ ] **Check that all 8 new/modified files are in git**

```bash
git log --oneline -12
```
Expected: 12 commits from this feature visible in the log.
