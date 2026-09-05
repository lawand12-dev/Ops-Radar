# Full Integration Expansion Design
_Date: 2026-05-16_

## Overview

Enable five new integrations (Apollo, Calendly, ClickUp, Asana, Toggl) using the existing Model C pattern (customer pastes API key → AES-256-GCM encrypted in Supabase → live-fetched on dashboard load → Redis 1h cache). Simultaneously fill in row-level data for the two already-live integrations (Stripe, HubSpot). Reorganise the integrations settings page from a flat list into category-grouped sections.

---

## 1. Integrations Settings Page — Category Groups

### Current state
Flat list of 7 tools in `src/app/dashboard/integrations/page.tsx`, `TOOL_CATALOG` array. `cardKey` field already encodes the category but is unused for grouping.

### New layout
Group cards under visual category headers. Render the list by iterating unique `cardKey` values, then render cards within each group.

**Categories and tools:**

| Category | Tools |
|----------|-------|
| Finance | Stripe |
| Sales | HubSpot |
| Marketing | Apollo, Calendly |
| Delivery | ClickUp, Asana |
| Time tracking | Toggl |

### Changes required
- `src/app/dashboard/integrations/page.tsx`: replace flat `map` with category-grouped render. Group by `cardKey`, render a `<CategoryGroup>` wrapper with a label, then cards within.
- Enable all five new tools: set `enabled: true`, fill `instructions` and `createKeyDocsUrl`.
- No changes to `IntegrationCard` component itself.

---

## 2. Five New Adapters (Model C)

Each adapter lives at `src/lib/integrations/<tool>/adapter.ts` and exports:
- `validate<Tool>Key(apiKey): Promise<AdapterValidation>` — called by `/api/integrations/[tool]/connect`
- `fetch<Tool>Data(apiKey): Promise<ToolData>` — called by the dashboard API route

### 2a. Apollo (`src/lib/integrations/apollo/adapter.ts`)

**Validation:** `GET https://api.apollo.io/api/v1/auth/health` with header `X-Api-Key: <key>`. Returns `{ is_logged_in: true }` on success. 401 → `invalid_key`. Network error → `network`.

**Data shape (`ApolloMarketingData`):**
```ts
type ApolloMarketingData = {
  emails_sent: number;           // total sent across all active sequences, last 30 days
  open_rate_pct: number;         // weighted average open rate %
  reply_rate_pct: number;        // weighted average reply rate %
  reply_sparkline: number[];     // daily reply counts, last 30 days (index 0 = oldest)
  sequences: Array<{
    id: string;
    name: string;
    contacts_enrolled: number;
    emails_sent: number;
    open_rate_pct: number;
    reply_rate_pct: number;
  }>;
  period_label: string;          // e.g. "Last 30 days"
};
```

**Fetch:** `POST https://api.apollo.io/api/v1/emailer_campaigns/search` with `{ per_page: 25, status: "active" }`. Header `X-Api-Key: <key>`. Map campaign stats to the shape above. `externalAccountId` for validation = `user.id` from `GET /api/v1/users/me`.

### 2b. Calendly (`src/lib/integrations/calendly/adapter.ts`)

**Validation:** `GET https://api.calendly.com/users/me` with header `Authorization: Bearer <token>`. Returns `{ resource: { uri, name, ... } }`. 401 → `invalid_key`. 403 → `permission`.

**Data shape (`CalendlyBookingsData`):**
```ts
type CalendlyBookingsData = {
  meetings_booked: number;           // scheduled events in last 7 days
  meeting_conversion_pct: number | null;
  period_label: string;
  upcoming: Array<{
    name: string;                    // event type name
    invitee_name: string;
    invitee_email: string;
    start_time: string;              // ISO
  }>;
};
```

**Fetch:** `GET https://api.calendly.com/scheduled_events` with params `{ user: <userUri>, min_start_time: <7dAgo>, max_start_time: <now+7d>, status: active, count: 25 }`. For each event fetch invitees via `GET /scheduled_events/<uuid>/invitees`. `externalAccountId` = user URI slug.

### 2c. ClickUp (`src/lib/integrations/clickup/adapter.ts`)

**Validation:** `GET https://api.clickup.com/api/v2/user` with header `Authorization: <token>`. Returns `{ user: { id, ... } }`. 401 → `invalid_key`.

**Data shape (`ClickupDeliveryData`):**
```ts
type ClickupDeliveryData = {
  active_projects: number;
  overdue_tasks: number;
  tasks: Array<{
    id: string;
    name: string;
    status: string;
    due_date: string | null;
    overdue: boolean;
    list_name: string;
  }>;
  source: 'clickup';
};
```

**Fetch:** `GET /api/v2/team` → get workspace teams → for first team `GET /api/v2/team/<id>/task?subtasks=true&include_closed=false&due_date_lt=<nowMs>&page=0`. Map to shape. `externalAccountId` = `user.id`.

### 2d. Asana (`src/lib/integrations/asana/adapter.ts`)

**Validation:** `GET https://app.asana.com/api/1.0/users/me` with header `Authorization: Bearer <token>`. Returns `{ data: { gid, name, ... } }`. 401 → `invalid_key`. 403 → `permission`.

**Data shape (`AsanaDeliveryData`):**
```ts
type AsanaDeliveryData = {
  active_projects: number;
  overdue_tasks: number;
  tasks: Array<{
    gid: string;
    name: string;
    completed: boolean;
    due_on: string | null;
    overdue: boolean;
    project_name: string;
  }>;
  source: 'asana';
};
```

**Fetch:** `GET /api/1.0/workspaces` → first workspace → `GET /api/1.0/tasks?workspace=<gid>&assignee=me&completed_since=now&opt_fields=name,due_on,completed,projects`. Map tasks; overdue = `due_on < today`. `externalAccountId` = user `gid`.

### 2e. Toggl (`src/lib/integrations/toggl/adapter.ts`)

**Validation:** `GET https://api.track.toggl.com/api/v9/me` with Basic auth using `<api_token>:api_token`. Returns `{ data: { id, ... } }`. 403 → `invalid_key`.

**Data shape (`TogglTimeData`):**
```ts
type TogglTimeData = {
  hours_tracked: number;             // total hours this week
  utilization_pct: number | null;    // hours / (5 * 8h work week) * 100
  by_project: Array<{
    project_name: string;
    hours: number;
    color: string;
  }>;
  period_label: string;              // e.g. "This week"
};
```

**Fetch:** `GET /api/v9/me/time_entries?start_date=<weekStart>&end_date=<now>` → group by `project_id` → `GET /api/v9/workspaces/<wid>/projects/<pid>` for names. `externalAccountId` = `data.id`.

---

## 3. Registry Updates

`src/lib/integrations/registry.ts`: add entries for all five tools with `displayName`, `createKeyDocsUrl`, `instructions`, and `validate` pointing to their adapter validators.

| Tool | Key source URL |
|------|---------------|
| Apollo | `https://developer.apollo.io/keys/` |
| Calendly | `https://calendly.com/integrations/api_webhooks` |
| ClickUp | `https://app.clickup.com/settings/apps` |
| Asana | `https://app.asana.com/0/my-apps` |
| Toggl | `https://track.toggl.com/profile` (API token at bottom) |

---

## 4. API Routes

### 4a. `/api/dashboard/marketing` — replace n8n with direct adapters

Drop the `fetchDashboardWidget` / n8n call. Instead:
1. Read Apollo integration row from Supabase for the current user.
2. Read Calendly integration row.
3. If Apollo connected: decrypt key, call `fetchApolloMarketingData`. If not: return `apollo_connected: false`.
4. If Calendly connected: decrypt key, call `fetchCalendlyBookingsData`. If not: return `calendly_connected: false`.
5. Merge both results into `MarketingWidgetData` (existing shape, unchanged — backward compatible).
6. Redis cache key `dash:marketing:<userId>`, TTL 1h.

Response shape stays identical to what `cockpit-kpi-strip.tsx` and `business/page.tsx` already consume — no frontend changes needed for the KPI cards.

### 4b. `/api/dashboard/delivery` — new route

`src/app/api/dashboard/delivery/route.ts`:
1. Read ClickUp row — if connected, decrypt + call `fetchClickupDeliveryData`.
2. Read Asana row — if connected, decrypt + call `fetchAsanaDeliveryData`.
3. If both connected: merge (concatenate task arrays, sum counts).
4. If neither: return `{ status: 'not_connected' }`.
5. Redis cache key `dash:delivery:<userId>`, TTL 1h.

Response: `{ status: 'ok', data: DeliveryData }` where `DeliveryData` is a unified shape:
```ts
type DeliveryTask = {
  id: string; name: string; status: string;
  due_date: string | null; overdue: boolean;
  project_name: string; source: 'clickup' | 'asana';
};
type DeliveryData = {
  active_projects: number; overdue_tasks: number; tasks: DeliveryTask[];
};
```
Each task carries its own `source` tag. When both tools are connected, tasks from both are merged into one array — no top-level `source` field needed.

### 4c. `/api/dashboard/time-tracking` — new route

`src/app/api/dashboard/time-tracking/route.ts`:
1. Read Toggl row — if not connected: `{ status: 'not_connected' }`.
2. Decrypt key, call `fetchTogglTimeData`.
3. Redis cache key `dash:time:<userId>`, TTL 1h.

### 4d. `/api/dashboard/finance` — add rows

`StripeFinanceData` is declared in two places: `src/lib/integrations/stripe/adapter.ts` (source of truth) and `src/app/dashboard/business/page.tsx` (local redeclaration). Both must be updated.

Extend `StripeFinanceData` (in adapter) with:
```ts
rows: Array<{ id: string; customer_name: string; amount: number; due_date: string; days_overdue: number }>;
```
Populate from the already-fetched invoices list (filter `status === 'open'` + `due_date < now`, top 5 sorted by days overdue desc). No new API call needed.

### 4e. `/api/dashboard/sales-live` — add rows

`HubspotSalesData` is similarly redeclared locally in `src/app/dashboard/business/page.tsx`. Both the adapter type and the local type must be updated.

Extend `HubspotSalesData` (in adapter) with:
```ts
rows: Array<{ id: string; name: string; amount: number; stage: string; close_date: string | null }>;
```
Populate from the already-fetched deals list (filter open, sort by `amount` desc, top 5). No new API call.

---

## 5. Business Page — Row Sections

`src/app/dashboard/business/page.tsx`:

### Existing sections — fill row tables
- **RevenueSection (Stripe):** render a `<RowTable>` of overdue invoices. Columns: Customer, Amount, Due date, Days overdue.
- **PipelineSection (HubSpot):** render top open deals. Columns: Deal name, Value, Stage, Close date.
- **ProspectsSection (Apollo):** render active sequences. Columns: Sequence, Enrolled, Sent, Open %, Reply %.
- **BookingsSection (Calendly):** render upcoming calls. Columns: Event, Invitee, Date/Time.

### New sections — add below existing
- **DeliverySection:** call `/api/dashboard/delivery`. Show KPIs (active projects, overdue tasks) + task rows: Task name, Project/List, Due date, Status.
- **TimeSection:** call `/api/dashboard/time-tracking`. Show KPIs (hours tracked, utilization %) + project rows: Project, Hours, % of total.

Both new sections use the existing `ToolSection` / `EmptyStateConnect` pattern for graceful not-connected states.

---

## 6. `ToolName` type — no changes needed

All five new tools already exist in the `ToolName` union in `src/lib/integrations.ts`. No Supabase migration required — the DB CHECK constraint already includes them.

---

## 7. Error handling & edge cases

- **Partial data:** if Apollo or Calendly fetch fails independently, the marketing route returns the successful one with a `null` for the other — never a full failure.
- **Both ClickUp and Asana connected:** delivery route merges both; `source` field omitted (or set to `'both'`).
- **Toggl rate limit:** Toggl API has a 1 req/sec limit; the fetch is a single call with aggregation server-side, well within limits.
- **Apollo pagination:** `per_page: 25` is the max without pagination. Cap at 25 sequences; set a `truncated` flag if `pagination.total_entries > 25`.
- **Calendly invitee fetch:** invitees require a second API call per event. Cap events at 10 for the upcoming list to stay under 10 extra calls per dashboard load.
- **Redis unavailable:** all routes have a `try/catch` around Redis; if Redis is down, fall through to live fetch (same pattern as finance/sales-live).

---

## 8. Implementation order (for parallel agents)

Tasks are independent — assign one agent per group:

| Agent | Tasks |
|-------|-------|
| 1 | Apollo adapter + registry entry + enable in TOOL_CATALOG |
| 2 | Calendly adapter + registry entry + enable in TOOL_CATALOG |
| 3 | ClickUp adapter + registry entry + enable in TOOL_CATALOG |
| 4 | Asana adapter + registry entry + enable in TOOL_CATALOG |
| 5 | Toggl adapter + registry entry + enable in TOOL_CATALOG |
| 6 | Update `/api/dashboard/marketing` (drop n8n, use Apollo + Calendly adapters) |
| 7 | New `/api/dashboard/delivery` route (ClickUp + Asana) |
| 8 | New `/api/dashboard/time-tracking` route (Toggl) |
| 9 | Extend Stripe adapter + finance route with invoice rows |
| 10 | Extend HubSpot adapter + sales-live route with deal rows |
| 11 | Integrations page: category grouping + enable all 5 tools |
| 12 | Business page: fill row tables + add Delivery + Time sections |

Agents 6–8 depend on agents 1–5 (adapters must exist first). Agents 9–10 are fully independent. Agent 11 is independent. Agent 12 depends on 6–10 (routes must exist).

Sequential constraint: run agents 1–5 and 9–11 first (all independent), then agents 6–8 and 12.
