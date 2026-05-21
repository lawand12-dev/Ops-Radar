# Marketing Card (Apollo + Calendly) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Marketing card to `/dashboard` showing the agency's cold-outreach funnel (emails → opens → replies → meetings) sourced from Apollo + Calendly via n8n.

**Architecture:** Same pattern as the Sales widget. New API route at `/api/dashboard/marketing` uses the existing `dashboard-fetch.ts` helper (Redis cache → n8n webhook → Apollo + Calendly APIs). Connect modals for both tools, both tokens stored encrypted in the existing `integrations` table. The card UI gracefully degrades when only one tool is connected.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (Postgres + integrations table), Upstash Redis, n8n cloud (`opsradar.app.n8n.cloud`), Apollo REST API, Calendly REST API.

**Source spec:** [docs/superpowers/specs/2026-05-09-dashboard-marketing-card-design.md](../specs/2026-05-09-dashboard-marketing-card-design.md)

**Project conventions:**
- Path alias: `<npm>/*` → `./src/*` (NOT `@/`)
- Branch: `feat/dashboard-marketing-card` off `main`
- Don't restart the dev server — running on port 3000
- TypeScript clean via `npx tsc --noEmit`; lint via `npm run lint -- <file>`; build via `npm run build`
- No test runner — verification = tsc + lint + build + manual smoke
- Currently on the same auth pattern as the Sales widget: `DEV_CLIENT_ID` env-var fallback, `integrations.ts` uses publishable key directly. Codex is migrating this on a parallel branch (`feat/customer-signin`); when that PR lands, the Marketing routes will be migrated alongside Sales as a follow-up commit. Don't anticipate the migration in this plan.

**Existing reference files to mirror (patterns are stable):**
- `src/lib/dashboard-fetch.ts` — already implements cache + n8n call
- `src/lib/integrations.ts` — already implements `getIntegrationToken/setIntegrationToken/deleteIntegration/isIntegrationConnected`
- `src/app/api/dashboard/sales/route.ts` — auth + connection check pattern
- `src/app/api/integrations/hubspot/route.ts` — connect/disconnect pattern
- `src/components/dashboard/connect-hubspot-modal.tsx` — modal pattern
- `src/components/dashboard/sales-card.tsx` — card UI with 5 widget states + sparkline

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Migration | Supabase | Add `apollo` to `integrations.tool` enum |
| Create | `src/app/api/integrations/apollo/route.ts` | POST/DELETE Apollo API key |
| Create | `src/app/api/integrations/calendly/route.ts` | POST/DELETE Calendly PAT |
| Create | `src/components/dashboard/connect-apollo-modal.tsx` | API key entry modal |
| Create | `src/components/dashboard/connect-calendly-modal.tsx` | PAT entry modal |
| External | n8n cloud | New workflow `dashboard-marketing-apollo-calendly` |
| Create | `src/app/api/dashboard/marketing/route.ts` | Widget API endpoint |
| Create | `src/components/dashboard/marketing-card.tsx` | UI with 7 states (loading/both-connected/apollo-only/calendly-only/neither/empty/error) |
| Modify | `src/app/dashboard/page.tsx` | Insert `<MarketingCard />` between WorkflowHealthStrip and the static stat cards |

---

## Task 1: Branch + add `apollo` to integrations tool enum

**Files:**
- Migration: Supabase project `nbdcrmepvwbfbcjqfubr`

- [ ] **Step 1: Create branch**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && git checkout main && git checkout -b feat/dashboard-marketing-card && git branch --show-current
```

Expected: `feat/dashboard-marketing-card`

- [ ] **Step 2: Apply Supabase migration**

Use the Supabase MCP `apply_migration` tool with name `add_apollo_to_integrations_enum` and this SQL:

```sql
alter table public.integrations drop constraint integrations_tool_check;
alter table public.integrations add constraint integrations_tool_check
  check (tool in ('stripe','hubspot','clickup','asana','toggl','harvest',
                  'google_ads','meta_ads','calendly','quickbooks','pipedrive',
                  'salesforce','monday','apollo'));
```

- [ ] **Step 3: Regenerate Supabase types**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run types:supabase
```

Expected: no errors. The check constraint is reflected in the generated types only as a string union for the `tool` column — verify by:

```bash
grep -A 3 "tool:" src/lib/database.types.ts | grep -i apollo
```

If `apollo` doesn't show up, that's OK — Supabase doesn't always inline check constraints into the type. The runtime check is what matters.

- [ ] **Step 4: Update `src/lib/integrations.ts` ToolName union to include `apollo`**

Open `src/lib/integrations.ts` and change the `ToolName` type to:

```ts
export type ToolName =
  | 'stripe' | 'hubspot' | 'clickup' | 'asana' | 'toggl' | 'harvest'
  | 'google_ads' | 'meta_ads' | 'calendly' | 'quickbooks' | 'pipedrive'
  | 'salesforce' | 'monday' | 'apollo';
```

(Add `'apollo'` to the union — single-character change.)

- [ ] **Step 5: TypeScript check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -10
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/lib/database.types.ts src/lib/integrations.ts
git commit -m "feat(integrations): add apollo to tool enum"
```

---

## Task 2: Connect-Apollo API route

**Files:**
- Create: `src/app/api/integrations/apollo/route.ts`

- [ ] **Step 1: Create the route file**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { setIntegrationToken, deleteIntegration } from '<npm>/lib/integrations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  const clientId = userData.user?.id ?? process.env.DEV_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const apiKey = typeof body?.api_key === 'string' ? body.api_key.trim() : '';

  if (apiKey.length < 8) {
    return NextResponse.json({ error: 'API key is required' }, { status: 400 });
  }

  // Validate against Apollo before storing
  const probe = await fetch('https://api.apollo.io/api/v1/auth/health', {
    headers: { 'X-Api-Key': apiKey, accept: 'application/json' },
  });
  if (!probe.ok) {
    return NextResponse.json(
      { error: `Apollo rejected the key (HTTP ${probe.status})` },
      { status: 400 }
    );
  }

  await setIntegrationToken(clientId, 'apollo', apiKey);
  return NextResponse.json({ status: 'connected' });
}

export async function DELETE(_req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  const clientId = userData.user?.id ?? process.env.DEV_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  await deleteIntegration(clientId, 'apollo');
  return NextResponse.json({ status: 'disconnected' });
}
```

- [ ] **Step 2: TypeScript + smoke check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -5 && curl -s -X POST http://localhost:3000/api/integrations/apollo -H "content-type: application/json" -d '{"api_key":"x"}'
```

Expected: tsc clean. curl returns `{"error":"API key is required"}` (because "x" is < 8 chars). That confirms the route loads and validation fires.

- [ ] **Step 3: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/app/api/integrations/apollo/route.ts
git commit -m "feat(integrations): add Apollo connect/disconnect API"
```

---

## Task 3: Connect-Calendly API route

**Files:**
- Create: `src/app/api/integrations/calendly/route.ts`

- [ ] **Step 1: Create the route file**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { setIntegrationToken, deleteIntegration } from '<npm>/lib/integrations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  const clientId = userData.user?.id ?? process.env.DEV_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const accessToken = typeof body?.access_token === 'string' ? body.access_token.trim() : '';

  if (accessToken.length < 8) {
    return NextResponse.json({ error: 'access token is required' }, { status: 400 });
  }

  // Validate against Calendly before storing
  const probe = await fetch('https://api.calendly.com/users/me', {
    headers: { Authorization: `Bearer ${accessToken}`, accept: 'application/json' },
  });
  if (!probe.ok) {
    return NextResponse.json(
      { error: `Calendly rejected the token (HTTP ${probe.status})` },
      { status: 400 }
    );
  }

  await setIntegrationToken(clientId, 'calendly', accessToken);
  return NextResponse.json({ status: 'connected' });
}

export async function DELETE(_req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  const clientId = userData.user?.id ?? process.env.DEV_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  await deleteIntegration(clientId, 'calendly');
  return NextResponse.json({ status: 'disconnected' });
}
```

- [ ] **Step 2: TypeScript + smoke check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -5 && curl -s -X POST http://localhost:3000/api/integrations/calendly -H "content-type: application/json" -d '{"access_token":"x"}'
```

Expected: tsc clean. curl returns `{"error":"access token is required"}`.

- [ ] **Step 3: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/app/api/integrations/calendly/route.ts
git commit -m "feat(integrations): add Calendly connect/disconnect API"
```

---

## Task 4: ConnectApolloModal component

**Files:**
- Create: `src/components/dashboard/connect-apollo-modal.tsx`

- [ ] **Step 1: Create the component file**

```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '<npm>/components/ui/dialog';
import { Button } from '<npm>/components/ui/button';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
};

export function ConnectApolloModal({ open, onOpenChange, onConnected }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/apollo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Connection failed');
        return;
      }
      onConnected();
      onOpenChange(false);
      setApiKey('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Apollo</DialogTitle>
        </DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
          <p style={{ fontSize: 13, color: '#4A6280', lineHeight: 1.5 }}>
            Paste your Apollo <strong>API key</strong>. Generate one in
            Apollo: <strong>Settings → Integrations → API → Generate</strong>.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="paste your Apollo API key"
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid rgba(0,194,255,0.2)',
              background: '#0F1923',
              color: '#E0F0FF',
              fontSize: 13,
              fontFamily: 'monospace',
            }}
            disabled={submitting}
          />
          {error && <div style={{ fontSize: 12, color: '#FF4D4D' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting || apiKey.length < 8}>
              {submitting ? 'Connecting…' : 'Connect'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: TypeScript + lint check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -5 && npm run lint -- src/components/dashboard/connect-apollo-modal.tsx 2>&1 | tail -5
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/components/dashboard/connect-apollo-modal.tsx
git commit -m "feat(dashboard): add Apollo connect modal"
```

---

## Task 5: ConnectCalendlyModal component

**Files:**
- Create: `src/components/dashboard/connect-calendly-modal.tsx`

- [ ] **Step 1: Create the component file**

```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '<npm>/components/ui/dialog';
import { Button } from '<npm>/components/ui/button';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
};

export function ConnectCalendlyModal({ open, onOpenChange, onConnected }: Props) {
  const [accessToken, setAccessToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/calendly', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Connection failed');
        return;
      }
      onConnected();
      onOpenChange(false);
      setAccessToken('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Calendly</DialogTitle>
        </DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
          <p style={{ fontSize: 13, color: '#4A6280', lineHeight: 1.5 }}>
            Paste your Calendly <strong>Personal Access Token</strong>. Generate one in
            Calendly: <strong>Integrations → API & Webhooks → Personal Access Tokens</strong>.
          </p>
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="paste your Calendly PAT"
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid rgba(0,194,255,0.2)',
              background: '#0F1923',
              color: '#E0F0FF',
              fontSize: 13,
              fontFamily: 'monospace',
            }}
            disabled={submitting}
          />
          {error && <div style={{ fontSize: 12, color: '#FF4D4D' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting || accessToken.length < 8}>
              {submitting ? 'Connecting…' : 'Connect'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: TypeScript + lint check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -5 && npm run lint -- src/components/dashboard/connect-calendly-modal.tsx 2>&1 | tail -5
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/components/dashboard/connect-calendly-modal.tsx
git commit -m "feat(dashboard): add Calendly connect modal"
```

---

## Task 6: n8n workflow `dashboard-marketing-apollo-calendly`

This is done via the n8n MCP (preferred) OR via the n8n REST API at `https://opsradar.app.n8n.cloud/api/v1/workflows`.

**Workflow shape:**

1. **Webhook trigger** — POST `dashboard-marketing-apollo-calendly`
2. **IF node**: Apollo connected? (`{{ $json.body.apollo_token !== null && $json.body.apollo_token !== '' }}`)
   - True branch: HTTP Request → Apollo API for emailer campaign stats
   - False branch: Set node returning Apollo nulls
3. **IF node**: Calendly connected? (`{{ $json.body.calendly_token !== null && $json.body.calendly_token !== '' }}`)
   - True branch: 2-step Calendly call (`/users/me` then `/scheduled_events`)
   - False branch: Set node returning Calendly null
4. **Merge node**: combine both branches
5. **Code node**: shape into widget contract:

```js
const apollo = $('ApolloBranch').first()?.json ?? {};
const calendly = $('CalendlyBranch').first()?.json ?? {};

const emailsSent = apollo.num_sent ?? null;
const numOpens = apollo.num_opens ?? null;
const numReplies = apollo.num_replies ?? null;
const replySparkline = apollo.daily_replies ?? null;
const meetingsBooked = calendly.meetings_count ?? null;

const openRate = (emailsSent && emailsSent > 0 && numOpens != null)
  ? (numOpens / emailsSent) * 100 : null;
const replyRate = (emailsSent && emailsSent > 0 && numReplies != null)
  ? (numReplies / emailsSent) * 100 : null;
const meetingConversion = (emailsSent && emailsSent > 0 && meetingsBooked != null)
  ? (meetingsBooked / emailsSent) * 100 : null;

return [{
  json: {
    emails_sent: emailsSent,
    open_rate_pct: openRate,
    reply_rate_pct: replyRate,
    reply_sparkline: replySparkline,
    meetings_booked: meetingsBooked,
    meeting_conversion_pct: meetingConversion,
    apollo_connected: $json.body.apollo_token != null && $json.body.apollo_token !== '',
    calendly_connected: $json.body.calendly_token != null && $json.body.calendly_token !== '',
    period_label: 'Last 14 days',
  },
}];
```

6. **Respond to Webhook**: returns the Code node JSON.

- [ ] **Step 1: Build the workflow via n8n MCP**

If the n8n MCP is available (tools like `mcp__claude_ai_n8n__create_workflow_from_code`), use it. Pass the workflow code following the SDK pattern. Reference `get_sdk_reference` first if unsure.

If MCP isn't available, fall back to the REST API. Save the workflow JSON as `docs/integrations/n8n-dashboard-marketing-apollo-calendly.workflow.json` and POST it via curl using `N8N_API_KEY` from the outer-repo `.env` file.

- [ ] **Step 2: Activate the workflow**

```bash
N8N_API_KEY="$(grep '^N8N_API_KEY' /home/lawand/Desktop/my-startup/.env | cut -d= -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
curl -s -X POST "https://opsradar.app.n8n.cloud/api/v1/workflows/<NEW_WORKFLOW_ID>/activate" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

- [ ] **Step 3: Smoke-test the webhook (no tokens)**

```bash
SECRET=$(grep N8N_WEBHOOK_SECRET /home/lawand/Desktop/my-startup/opsradar/.env.local | cut -d= -f2)
curl -s -X POST "https://opsradar.app.n8n.cloud/webhook/dashboard-marketing-apollo-calendly" \
  -H "x-opsradar-secret: $SECRET" \
  -H "content-type: application/json" \
  -d '{"apollo_token":"","calendly_token":"","client_id":"smoke-test"}'
```

Expected: JSON with all-null Apollo + Calendly fields, `apollo_connected: false`, `calendly_connected: false`.

- [ ] **Step 4: Document the workflow**

Create `docs/integrations/n8n-dashboard-marketing-apollo-calendly.md` with the workflow ID, the Apollo + Calendly endpoints used, and the auth headers — following the same shape as `docs/integrations/n8n-dashboard-sales-hubspot.md`.

- [ ] **Step 5: Commit docs**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add docs/integrations/n8n-dashboard-marketing-apollo-calendly*
git commit -m "docs(integrations): document n8n dashboard-marketing-apollo-calendly workflow"
```

---

## Task 7: API route `/api/dashboard/marketing`

**Files:**
- Create: `src/app/api/dashboard/marketing/route.ts`

- [ ] **Step 1: Create the route file**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { fetchDashboardWidget } from '<npm>/lib/dashboard-fetch';
import { getIntegrationToken, isIntegrationConnected } from '<npm>/lib/integrations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
};

export async function GET(req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  const clientId = userData.user?.id ?? process.env.DEV_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [apolloConnected, calendlyConnected] = await Promise.all([
    isIntegrationConnected(clientId, 'apollo'),
    isIntegrationConnected(clientId, 'calendly'),
  ]);

  if (!apolloConnected && !calendlyConnected) {
    return NextResponse.json({
      status: 'not_connected',
      apollo_connected: false,
      calendly_connected: false,
    });
  }

  const [apolloToken, calendlyToken] = await Promise.all([
    apolloConnected ? getIntegrationToken(clientId, 'apollo') : Promise.resolve(null),
    calendlyConnected ? getIntegrationToken(clientId, 'calendly') : Promise.resolve(null),
  ]);

  const fresh = req.nextUrl.searchParams.get('fresh') === '1';

  const result = await fetchDashboardWidget<MarketingWidgetData>({
    widget: 'marketing',
    clientId,
    n8nWorkflow: 'dashboard-marketing-apollo-calendly',
    payload: {
      apollo_token: apolloToken ?? '',
      calendly_token: calendlyToken ?? '',
      client_id: clientId,
    },
    fresh,
  });

  return NextResponse.json(result);
}
```

- [ ] **Step 2: TypeScript + smoke check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -5 && curl -s http://localhost:3000/api/dashboard/marketing | head -c 200
```

Expected: tsc clean. curl returns `{"status":"not_connected","apollo_connected":false,"calendly_connected":false}` (because no tokens stored yet).

- [ ] **Step 3: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/app/api/dashboard/marketing/route.ts
git commit -m "feat(dashboard): add /api/dashboard/marketing live-fetch route"
```

---

## Task 8: MarketingCard component

**Files:**
- Create: `src/components/dashboard/marketing-card.tsx`

- [ ] **Step 1: Create the component file**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { ConnectApolloModal } from './connect-apollo-modal';
import { ConnectCalendlyModal } from './connect-calendly-modal';

type WidgetData = {
  emails_sent: number | null;
  open_rate_pct: number | null;
  reply_rate_pct: number | null;
  reply_sparkline: number[] | null;
  meetings_booked: number | null;
  meeting_conversion_pct: number | null;
  apollo_connected: boolean;
  calendly_connected: boolean;
  period_label: string;
};

type ApiResponse =
  | { status: 'ok'; data: WidgetData; fromCache: boolean }
  | { status: 'not_connected'; apollo_connected: false; calendly_connected: false }
  | { status: 'error'; message: string; staleData?: WidgetData; staleAgeMs?: number }
  | { error: string };

const C = {
  card: '#0F1923',
  border: 'rgba(0,194,255,0.1)',
  accent: '#00C2FF',
  text: '#E0F0FF',
  muted: '#4A6280',
  red: '#FF4D4D',
};

const fmtNumber = (n: number | null) =>
  n == null ? '—' : n.toLocaleString('en-US', { maximumFractionDigits: 0 });

const fmtPct = (n: number | null) =>
  n == null ? '—' : `${n.toFixed(1)}%`;

export function MarketingCard() {
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [apolloOpen, setApolloOpen] = useState(false);
  const [calendlyOpen, setCalendlyOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/marketing', { cache: 'no-store' });
      const data = (await res.json()) as ApiResponse;
      setResponse(data);
    } catch (err) {
      setResponse({
        status: 'error',
        message: err instanceof Error ? err.message : 'Network error',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '20px 20px 16px',
        marginBottom: 18,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Marketing / Outreach</div>
        {response && 'status' in response && response.status === 'ok' && (
          <span style={{ fontSize: 11, color: C.muted }}>{response.data.period_label}</span>
        )}
      </div>

      {loading && <Skeleton />}

      {!loading && response && 'status' in response && response.status === 'ok' && (
        <Content
          data={response.data}
          onConnectApollo={() => setApolloOpen(true)}
          onConnectCalendly={() => setCalendlyOpen(true)}
        />
      )}

      {!loading && response && 'status' in response && response.status === 'not_connected' && (
        <NeitherConnected
          onConnectApollo={() => setApolloOpen(true)}
          onConnectCalendly={() => setCalendlyOpen(true)}
        />
      )}

      {!loading && response && 'status' in response && response.status === 'error' && (
        <ErrorState
          staleData={response.staleData}
          staleAgeMs={response.staleAgeMs}
          onRetry={load}
          onConnectApollo={() => setApolloOpen(true)}
          onConnectCalendly={() => setCalendlyOpen(true)}
        />
      )}

      {!loading && response && 'error' in response && response.error === 'unauthorized' && (
        <div style={{ fontSize: 12, color: C.muted }}>Sign in to see marketing data.</div>
      )}

      <ConnectApolloModal open={apolloOpen} onOpenChange={setApolloOpen} onConnected={load} />
      <ConnectCalendlyModal open={calendlyOpen} onOpenChange={setCalendlyOpen} onConnected={load} />
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ height: 28, background: 'rgba(0,194,255,0.05)', borderRadius: 4, width: '60%' }} />
      <div style={{ height: 16, background: 'rgba(0,194,255,0.05)', borderRadius: 4, width: '40%' }} />
      <div style={{ height: 16, background: 'rgba(0,194,255,0.05)', borderRadius: 4, width: '50%' }} />
      <div style={{ height: 36, background: 'rgba(0,194,255,0.05)', borderRadius: 4, marginTop: 8 }} />
    </div>
  );
}

function Content({
  data,
  onConnectApollo,
  onConnectCalendly,
}: {
  data: WidgetData;
  onConnectApollo: () => void;
  onConnectCalendly: () => void;
}) {
  const allEmpty =
    (data.emails_sent ?? 0) === 0 &&
    (data.meetings_booked ?? 0) === 0 &&
    data.apollo_connected &&
    data.calendly_connected;

  if (allEmpty) {
    return <div style={{ fontSize: 12.5, color: C.muted }}>No outreach activity in the last 14 days.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: C.text, lineHeight: 1, letterSpacing: '-0.5px' }}>
        {fmtNumber(data.meetings_booked)} meetings booked
      </div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>
        {data.calendly_connected ? 'via Calendly' : 'Connect Calendly to see meetings →'}
      </div>
      <Row label="Emails sent" value={fmtNumber(data.emails_sent)} fade={!data.apollo_connected} />
      <Row label="Open rate" value={fmtPct(data.open_rate_pct)} fade={!data.apollo_connected} />
      <Row label="Reply rate" value={fmtPct(data.reply_rate_pct)} fade={!data.apollo_connected} />
      <Row
        label="Meeting conversion"
        value={fmtPct(data.meeting_conversion_pct)}
        fade={!(data.apollo_connected && data.calendly_connected)}
      />
      {!data.apollo_connected && (
        <button
          onClick={onConnectApollo}
          style={{
            alignSelf: 'flex-start',
            background: C.accent,
            color: '#0D1117',
            border: 'none',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: 4,
          }}
        >
          Connect Apollo →
        </button>
      )}
      {!data.calendly_connected && data.apollo_connected && (
        <button
          onClick={onConnectCalendly}
          style={{
            alignSelf: 'flex-start',
            background: C.accent,
            color: '#0D1117',
            border: 'none',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: 4,
          }}
        >
          Connect Calendly →
        </button>
      )}
      {data.apollo_connected && data.reply_sparkline && data.reply_sparkline.length > 0 && (
        <Sparkline values={data.reply_sparkline} />
      )}
    </div>
  );
}

function Row({ label, value, fade }: { label: string; value: string; fade: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        opacity: fade ? 0.4 : 1,
      }}
    >
      <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{value}</span>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 36, marginTop: 6 }}>
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(v / max) * 100}%`,
            background: C.accent,
            opacity: 0.6,
            borderRadius: 1,
            minHeight: 1,
          }}
        />
      ))}
    </div>
  );
}

function NeitherConnected({
  onConnectApollo,
  onConnectCalendly,
}: {
  onConnectApollo: () => void;
  onConnectCalendly: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
        Connect Apollo and Calendly to see your outreach funnel — emails sent, replies, and meetings booked.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onConnectApollo}
          style={{
            background: C.accent,
            color: '#0D1117',
            border: 'none',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Connect Apollo →
        </button>
        <button
          onClick={onConnectCalendly}
          style={{
            background: 'transparent',
            color: C.accent,
            border: `1px solid ${C.accent}`,
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Connect Calendly →
        </button>
      </div>
    </div>
  );
}

function ErrorState({
  staleData,
  staleAgeMs,
  onRetry,
  onConnectApollo,
  onConnectCalendly,
}: {
  staleData?: WidgetData;
  staleAgeMs?: number;
  onRetry: () => void;
  onConnectApollo: () => void;
  onConnectCalendly: () => void;
}) {
  const minutes = staleAgeMs ? Math.round(staleAgeMs / 60_000) : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          background: 'rgba(255,77,77,0.08)',
          border: `1px solid rgba(255,77,77,0.3)`,
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 12,
          color: C.red,
        }}
      >
        Outreach data temporarily unreachable.
        {minutes !== null && (
          <span style={{ color: C.muted, marginLeft: 6 }}>
            Last good fetch: {minutes}m ago
          </span>
        )}
      </div>
      {staleData && (
        <Content
          data={staleData}
          onConnectApollo={onConnectApollo}
          onConnectCalendly={onConnectCalendly}
        />
      )}
      <button
        onClick={onRetry}
        style={{
          fontSize: 12,
          color: C.accent,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
        }}
      >
        Retry →
      </button>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript + lint check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -5 && npm run lint -- src/components/dashboard/marketing-card.tsx 2>&1 | tail -5
```

Expected: clean. If lint flags any unused parameter, prefix with underscore.

- [ ] **Step 3: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/components/dashboard/marketing-card.tsx
git commit -m "feat(dashboard): add MarketingCard with apollo+calendly funnel and graceful partial-connect"
```

---

## Task 9: Wire MarketingCard into the page

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Add the import**

In `src/app/dashboard/page.tsx`, find the existing imports for HeroRoiBlock / WorkflowHealthStrip / SalesCard. Add a new line alongside them:

```tsx
import { MarketingCard } from '<npm>/components/dashboard/marketing-card';
```

- [ ] **Step 2: Insert `<MarketingCard />` between WorkflowHealthStrip and the static stat-cards row**

In the JSX, find the lines:

```tsx
      <HeroRoiBlock />
      <WorkflowHealthStrip />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {metrics.map((m) => <StatCard key={m.label} {...m} />)}
      </div>
```

Insert `<MarketingCard />` between the strip and the stat-cards grid:

```tsx
      <HeroRoiBlock />
      <WorkflowHealthStrip />

      <MarketingCard />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {metrics.map((m) => <StatCard key={m.label} {...m} />)}
      </div>
```

- [ ] **Step 3: tsc + lint + build + smoke check**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | head -5 && npm run lint -- src/app/dashboard/page.tsx 2>&1 | tail -5 && npm run build 2>&1 | tail -10 && curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/dashboard
```

Expected: tsc clean, lint clean, build successful, HTTP 200.

- [ ] **Step 4: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/app/dashboard/page.tsx
git commit -m "feat(dashboard): wire MarketingCard into overview"
```

---

## Task 10: End-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Open `/dashboard` in a browser**

Visit http://localhost:3000/dashboard. The Marketing card should appear between the Workflow Health strip and the static stat cards, in the "neither connected" state with two buttons (Connect Apollo, Connect Calendly).

- [ ] **Step 2: Connect Apollo only**

Click **Connect Apollo →**. Paste an Apollo API key (Apollo → Settings → Integrations → API). Click Connect.

Expected: modal closes, the card re-fetches. Funnel rows (Emails sent, Open rate, Reply rate) populate with real numbers. Meetings booked row says "—" or "Connect Calendly to see meetings". Meeting conversion row is faded.

- [ ] **Step 3: Connect Calendly**

Click **Connect Calendly →**. Paste a Calendly Personal Access Token (Calendly → Integrations → API & Webhooks → Personal Access Tokens). Click Connect.

Expected: card now shows full funnel. Hero number = meetings booked from your Calendly. Meeting conversion % computed.

- [ ] **Step 4: Verify cache works**

Reload the page. Network tab should show `GET /api/dashboard/marketing` returning `"fromCache": true`.

- [ ] **Step 5: Verify error fallback**

Temporarily change `N8N_BASE_URL` in `.env.local` to a bad URL (e.g. `https://opsradar.invalid.n8n.cloud`). Hit `http://localhost:3000/api/dashboard/marketing?fresh=1` to bypass cache.

Expected: card shows red banner "Outreach data temporarily unreachable" + stale data if cached.

Restore the env var.

- [ ] **Step 6: Verify token is encrypted at rest**

Use Supabase MCP `execute_sql`:

```sql
select tool, substring(encrypted_token, 1, 30) as token_prefix
from public.integrations where tool in ('apollo', 'calendly');
```

Expected: 2 rows, `token_prefix` is base64-looking ciphertext (NOT the raw API key / PAT).

- [ ] **Step 7: Verify disconnect works**

In browser devtools console:

```js
await fetch('/api/integrations/apollo', { method: 'DELETE' })
await fetch('/api/integrations/calendly', { method: 'DELETE' })
```

Reload `/dashboard`. Card returns to "neither connected" state.

- [ ] **Step 8: Done**

If anything failed, fix and commit. Otherwise, this verification is complete.

---

## Self-Review Against Spec

| Spec section | Plan task | Notes |
|---|---|---|
| Hero metric: meetings booked (Calendly) | Task 8 (Content render) | Big number at top |
| Funnel sub-stats: sent / open / reply / conversion | Task 8 (Row components) | All rendered, faded when not connected |
| Sparkline of replies/day | Task 6 (n8n shape), Task 8 (Sparkline component) | 14-day reply count |
| Apollo + Calendly sources | Tasks 2, 3, 6 | Both connect APIs + n8n branches |
| 7 widget states | Task 8 | loading/both/apollo-only/calendly-only/neither/empty/error |
| Never show misleading zero | Task 8 (`fmtNumber`/`fmtPct` use `—` for null) | Plus fade for not-connected rows |
| Cache 180s + 24h stale | reuses `dashboard-fetch.ts` (existing) | No new code needed |
| Tokens encrypted at rest | reuses `integrations.ts` (existing) | Storage already encrypted |
| Add `apollo` to enum | Task 1 step 2 | Migration via MCP |
| Position above stat cards | Task 9 | Between Workflow Health strip and stat cards |
| Customer sign-in not blocking | Task 2/3/7 use DEV_CLIENT_ID fallback (current pattern) | Migrates with Sales when Codex's branch lands |

**Placeholder scan:** No "TBD" / "implement later" / "similar to Task N." Every step has full code or full commands. Task 6's n8n workflow points to MCP-or-REST as fallback; this is intentional flexibility, not a placeholder.

**Type consistency:** `MarketingWidgetData` shape in Task 7 matches `WidgetData` in Task 8. `apollo_connected` / `calendly_connected` boolean fields appear consistently in API response, n8n shape, and component props. The connect modal `onConnected` signature `() => void` matches between modals and `MarketingCard.load()`.
