# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the partially-live 11-page dashboard with a 4-route auth-gated cockpit that shows only real per-customer data, surfaces automation outcomes alongside business outcomes, and ships with AI-generated narrative cards as a first-class primitive.

**Architecture:** Single middleware gates `/dashboard/:path*`. New cockpit composed from a small set of focused presentation components (KPI strip, alerts ribbon, hero+narrative, integration health, activity feed, pillar CTAs), each consuming one Layer-2 API. Two new pillar pages (`/automations`, `/business`) absorb the deleted single-purpose routes. AI narrative and cross-pillar activity feed are new APIs on the same Layer-2 pattern.

**Tech Stack:** Next.js 16 App Router + React 19 + React Compiler · TypeScript · Tailwind v4 · `@supabase/ssr` · OpenAI SDK (existing `<npm>/lib/openai.ts`) · Upstash Redis (existing `<npm>/lib/rate-limit.ts` patterns) · lucide-react icons · Chart.js (already in use).

**Spec:** [docs/superpowers/specs/2026-05-15-dashboard-redesign-design.md](../specs/2026-05-15-dashboard-redesign-design.md)

**Verification:** No test runner is configured. Each task's verification step is one or more of:
- `npm run build` — type-checks the whole tree and produces a production build (run from `opsradar/`)
- `npm run lint` — ESLint pass
- Manual browser check against `npm run dev` at `http://localhost:3000`

Commit message convention follows the repo: `type(scope): subject` (e.g., `feat(dashboard): add cockpit KPI strip`). Each task ends with a commit.

---

## Task 1: Auth gate — middleware

**Spec reference:** §8.

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Confirm `@supabase/ssr` is installed**

Run: `cd /home/lawand/Desktop/my-startup/opsradar && grep '"@supabase/ssr"' package.json`
Expected: a `"@supabase/ssr":` line. (It is — already used by [src/lib/supabase-ssr.ts](../../src/lib/supabase-ssr.ts).)

- [ ] **Step 2: Create `src/middleware.ts`**

Write the file with this exact content:

```ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export const config = {
  matcher: ['/dashboard/:path*'],
};

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail-closed if env is missing — never let a request through unauthed.
  if (!url || !key) {
    console.error('[middleware] missing Supabase env, redirecting to /login');
    return redirectToLogin(request);
  }

  const response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        });
      },
    },
  });

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return redirectToLogin(request);
    }
  } catch (err) {
    console.warn('[middleware] auth check threw, fail-closed:', err);
    return redirectToLogin(request);
  }

  return response;
}

function redirectToLogin(request: NextRequest) {
  const redirectUrl = new URL('/login', request.url);
  redirectUrl.searchParams.set(
    'redirectTo',
    request.nextUrl.pathname + request.nextUrl.search,
  );
  return NextResponse.redirect(redirectUrl);
}
```

- [ ] **Step 3: Verify build + lint pass**

Run: `cd /home/lawand/Desktop/my-startup/opsradar && npm run lint && npm run build`
Expected: no errors. Build emits `.next/` output.

- [ ] **Step 4: Manual verification (logged-out → redirect)**

In a separate terminal, run `npm run dev`. Open an incognito browser to `http://localhost:3000/dashboard`.
Expected: 302 to `http://localhost:3000/login?redirectTo=%2Fdashboard`.

Then visit `http://localhost:3000/dashboard/financials?x=1`.
Expected: 302 to `http://localhost:3000/login?redirectTo=%2Fdashboard%2Ffinancials%3Fx%3D1`.

Then visit `http://localhost:3000/`, `http://localhost:3000/audit`, `http://localhost:3000/pricing`.
Expected: all load normally (matcher excludes them).

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(auth): gate /dashboard/* via Supabase SSR middleware

Fail-closed redirect to /login?redirectTo=<original> on any auth
failure or env-misconfig. Uses getUser() (not getSession) so forged
cookies are rejected. /api/* and marketing pages unaffected.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Delete the 8 dead dashboard routes

**Spec reference:** §7.

**Files (all DELETE):**
- `src/app/dashboard/clients/`
- `src/app/dashboard/financials/`
- `src/app/dashboard/projects/`
- `src/app/dashboard/reports/`
- `src/app/dashboard/tasks/`
- `src/app/dashboard/team/`
- `src/app/dashboard/time-tracking/`
- `src/app/dashboard/settings/page.tsx` (the profile/notifications page — `settings/integrations/` stays for now, moves in Task 4)
- `src/app/dashboard/workflow-health/page.tsx` (content folds into `/automations` later)

- [ ] **Step 1: Delete the 7 standalone route directories**

Run:
```bash
cd /home/lawand/Desktop/my-startup/opsradar
rm -rf src/app/dashboard/clients
rm -rf src/app/dashboard/financials
rm -rf src/app/dashboard/projects
rm -rf src/app/dashboard/reports
rm -rf src/app/dashboard/tasks
rm -rf src/app/dashboard/team
rm -rf src/app/dashboard/time-tracking
```

- [ ] **Step 2: Delete the settings profile page (keep settings/integrations for now)**

Run:
```bash
rm src/app/dashboard/settings/page.tsx
```

(Don't delete `src/app/dashboard/settings/` yet — `integrations/` subdir still lives there and will be moved in Task 4.)

- [ ] **Step 3: Delete the workflow-health page**

Run:
```bash
rm -rf src/app/dashboard/workflow-health
```

- [ ] **Step 4: Verify no remaining imports from the deleted paths**

Run:
```bash
grep -rn "dashboard/clients\|dashboard/financials\|dashboard/projects\|dashboard/reports\|dashboard/tasks\|dashboard/team\|dashboard/time-tracking\|dashboard/workflow-health" src/ --include="*.ts" --include="*.tsx"
```
Expected output: lines from the sidebar (`_components/sidebar.tsx`) referencing these routes. These will be cleaned up in Task 3. No other matches.

If anything else shows up (a component referencing one of these paths), investigate and either drop the reference or move the code.

- [ ] **Step 5: Verify build still passes** (sidebar links will 404 at runtime but TypeScript is fine)

Run: `npm run build`
Expected: build succeeds with no TypeScript errors. (Sidebar still has stale links but they aren't a compile error.)

- [ ] **Step 6: Commit**

```bash
git add -A src/app/dashboard
git commit -m "feat(dashboard): delete 8 dead hardcoded routes

clients/, financials/, projects/, reports/, tasks/, team/,
time-tracking/, settings/page.tsx, workflow-health/page.tsx —
all hardcoded JSX with no real data source. Content folds into
forthcoming /automations and /business pillar pages.

Sidebar still references these; cleaned up in next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Sidebar — 4 nav items

**Spec reference:** §7, §9.1.

**Files:**
- Modify: `src/app/dashboard/_components/sidebar.tsx`

- [ ] **Step 1: Replace the nav config with 4 items**

Open [src/app/dashboard/_components/sidebar.tsx](../../src/app/dashboard/_components/sidebar.tsx).

Replace lines 5–18 (the `lucide-react` import block) with:

```ts
import {
  LayoutDashboard,
  Activity,
  TrendingUp,
  Plug,
  ChevronDown,
} from 'lucide-react';
```

Replace lines 26–63 (the `navSections` array) with:

```ts
const navSections: NavSection[] = [
  {
    tag: null,
    items: [
      { label: 'Overview',     href: '/dashboard',             icon: LayoutDashboard },
      { label: 'Automations',  href: '/dashboard/automations', icon: Activity        },
      { label: 'Business',     href: '/dashboard/business',    icon: TrendingUp      },
    ],
  },
  {
    tag: 'WORKSPACE',
    items: [
      { label: 'Integrations', href: '/dashboard/integrations', icon: Plug },
    ],
  },
];
```

(Note the `/dashboard/integrations` path — the URL changes in Task 4. Doing both in one commit keeps the tree consistent.)

- [ ] **Step 2: Verify the sidebar still type-checks**

Run: `npm run lint`
Expected: no errors. (Removed icon imports `FolderKanban`, `CheckSquare`, `Clock`, `Users`, `BarChart3`, `UsersRound`, `Settings`, `ShieldCheck` are now unused — but the import block was rewritten, so they're gone.)

- [ ] **Step 3: Manual verification**

Run `npm run dev`. Log in as a test user. Visit `/dashboard`.
Expected: sidebar shows exactly 4 nav items: Overview · Automations · Business · WORKSPACE › Integrations. No "BRAIN/OPERATE/OBSERVE/GUARD" section tags. Brand mark and user footer unchanged.

(Clicking Automations/Business will 404 — pages don't exist yet. Clicking Integrations will also 404 until Task 4. That's expected at this stage.)

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/_components/sidebar.tsx
git commit -m "feat(dashboard): reduce sidebar to 4 nav items

Overview · Automations · Business · Integrations.
Pillar tags (BRAIN/OPERATE/OBSERVE/GUARD) removed — the new IA
maps the two-pillar split directly into top-level nav.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Move `settings/integrations/` → `integrations/`

**Spec reference:** §7.

**Files:**
- Move: `src/app/dashboard/settings/integrations/` → `src/app/dashboard/integrations/`
- Delete: `src/app/dashboard/settings/` (now empty)

- [ ] **Step 1: Move the directory**

Run:
```bash
cd /home/lawand/Desktop/my-startup/opsradar
git mv src/app/dashboard/settings/integrations src/app/dashboard/integrations
```

(Using `git mv` preserves history.)

- [ ] **Step 2: Remove the now-empty `settings/` directory**

Run:
```bash
rmdir src/app/dashboard/settings
```
Expected: directory removed cleanly (it should be empty now that integrations/ moved and page.tsx was deleted in Task 2).

If `rmdir` complains it's not empty, list what's inside (`ls src/app/dashboard/settings`) and remove any stragglers.

- [ ] **Step 3: Search for any in-app references to the old URL**

Run:
```bash
grep -rn "dashboard/settings/integrations" src/ --include="*.ts" --include="*.tsx"
```
For each match, update the path to `/dashboard/integrations`.

(Common spots: connect-key-dialog redirects, sidebar (already done in Task 3), any "Connect X" CTAs in existing dashboard components.)

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: passes. Build will pick up the new route automatically.

- [ ] **Step 5: Manual verification**

Run `npm run dev`. Visit `/dashboard/integrations` while logged in.
Expected: integrations page renders (same content as before, new URL).

Visit `/dashboard/settings/integrations` (old URL).
Expected: 404. (Optional: we add a 301 redirect in Task 20.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(dashboard): move /settings/integrations → /integrations

Old URL 404s. Settings/ parent dir removed (profile page was
deleted in the prior commit). 301 redirect for old URL added
in the final cleanup task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Lib — `dashboard-alert-rules.ts`

**Spec reference:** §9.4, §11.2.

**Files:**
- Create: `src/lib/dashboard-alert-rules.ts`

- [ ] **Step 1: Create the file**

Write `src/lib/dashboard-alert-rules.ts`:

```ts
/**
 * Deterministic rule-based alert generation for the dashboard cockpit
 * and pillar pages. NOT AI-generated — alerts must be predictable and
 * actionable. AI narrative happens separately in /api/dashboard/narrative.
 *
 * Each rule reads from Layer-2 API outputs (already fetched by the
 * caller) and may emit zero or one alert. The caller deduplicates and
 * sorts by severity.
 */

export type AlertSeverity = 'needs-you' | 'watch' | 'heads-up';

export type DashboardAlert = {
  id: string;            // stable id for keying / dedup
  severity: AlertSeverity;
  label: string;         // short uppercase tag, e.g. "Needs you"
  message: string;       // single sentence, names a real entity
  href: string;          // deep-link to action
};

/** Operator hourly rate used to convert hours-saved → $-saved. */
export const OPERATOR_RATE_USD_PER_HOUR = 50;

/** Stuck-deal threshold: deals in same stage longer than this AND
 * worth more than STUCK_DEAL_MIN_VALUE_USD fire an alert. */
export const STUCK_DEAL_DAYS = 14;
export const STUCK_DEAL_MIN_VALUE_USD = 5000;

/** Max alerts surfaced on the cockpit ribbon. */
export const MAX_COCKPIT_ALERTS = 3;

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  'needs-you': 3,
  'watch': 2,
  'heads-up': 1,
};

export function sortAlertsBySeverity(alerts: DashboardAlert[]): DashboardAlert[] {
  return [...alerts].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
}

export function severityLabel(severity: AlertSeverity): string {
  switch (severity) {
    case 'needs-you': return 'Needs you';
    case 'watch':     return 'Watch';
    case 'heads-up':  return 'Heads-up';
  }
}

// ============================================================
// Rules — each function takes a narrow input and returns 0 or 1 alert.
// Keep these pure: no fetching, no logging, no side effects.
// ============================================================

/** Stripe integration returned an auth/permission error. */
export function stripeAuthErrorRule(input: {
  hasError: boolean;
  errorCode?: string | null;
}): DashboardAlert | null {
  if (!input.hasError) return null;
  const isAuthError = !input.errorCode
    || ['unauthorized', 'permission_denied', 'api_key_invalid'].includes(input.errorCode);
  if (!isAuthError) return null;
  return {
    id: 'stripe-auth',
    severity: 'needs-you',
    label: severityLabel('needs-you'),
    message: 'Stripe re-auth required — your API key was rejected.',
    href: '/dashboard/integrations?tool=stripe',
  };
}

/** Any integration with elevated error rate (>5 errors in 24h). */
export function elevatedErrorRateRule(input: {
  tool: string;
  errors24h: number;
}): DashboardAlert | null {
  if (input.errors24h <= 5) return null;
  return {
    id: `errors-${input.tool}`,
    severity: 'watch',
    label: severityLabel('watch'),
    message: `${input.tool} elevated error rate — ${input.errors24h} errors in 24h.`,
    href: '/dashboard/automations',
  };
}

/** HubSpot deal stuck in same stage longer than threshold. */
export function stuckDealRule(input: {
  dealName: string;
  daysInStage: number;
  valueUsd: number;
}): DashboardAlert | null {
  if (input.daysInStage < STUCK_DEAL_DAYS) return null;
  if (input.valueUsd < STUCK_DEAL_MIN_VALUE_USD) return null;
  return {
    id: `stuck-${input.dealName}`,
    severity: 'heads-up',
    label: severityLabel('heads-up'),
    message: `Deal "${input.dealName}" stuck ${input.daysInStage} days in stage.`,
    href: '/dashboard/business',
  };
}

/** n8n workflow failed and did not auto-recover within 30 minutes. */
export function failingWorkflowRule(input: {
  workflowName: string;
  failedAt: Date;
  recoveredAt: Date | null;
  now: Date;
}): DashboardAlert | null {
  if (input.recoveredAt) return null;
  const elapsedMin = (input.now.getTime() - input.failedAt.getTime()) / 60_000;
  if (elapsedMin < 30) return null;
  return {
    id: `failing-${input.workflowName}`,
    severity: 'needs-you',
    label: severityLabel('needs-you'),
    message: `Workflow "${input.workflowName}" failing for ${Math.round(elapsedMin)}m — not auto-recovered.`,
    href: '/dashboard/automations',
  };
}

/** No Calendly bookings this week despite open pipeline. */
export function emptyCalendarRule(input: {
  bookings7d: number;
  pipelineValueUsd: number;
}): DashboardAlert | null {
  if (input.bookings7d > 0) return null;
  if (input.pipelineValueUsd <= 0) return null;
  return {
    id: 'empty-calendar',
    severity: 'heads-up',
    label: severityLabel('heads-up'),
    message: 'No calls booked this week despite active pipeline.',
    href: '/dashboard/business',
  };
}
```

- [ ] **Step 2: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/dashboard-alert-rules.ts
git commit -m "feat(dashboard): add deterministic alert rule engine

Pure functions consuming Layer-2 outputs. Each returns 0 or 1
DashboardAlert. Constants (operator rate, stuck-deal thresholds,
max alerts) live in this file. AI narrative remains separate
in /api/dashboard/narrative.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: New API — `/api/dashboard/narrative`

**Spec reference:** §13.1, §6 principle 2.

**Files:**
- Create: `src/app/api/dashboard/narrative/route.ts`

- [ ] **Step 1: Inspect existing openai client + rate-limit helpers**

Run:
```bash
cat src/lib/openai.ts
ls src/lib/rate-limit.ts 2>/dev/null && head -40 src/lib/rate-limit.ts
```

You'll use the existing OpenAI client (don't re-import the SDK directly) and the existing Redis cache pattern (if there's a helper). If there's no shared cache helper, follow the inline Redis usage pattern in [src/app/api/dashboard/finance/route.ts](../../src/app/api/dashboard/finance/route.ts) or [src/app/api/dashboard/sales-live/route.ts](../../src/app/api/dashboard/sales-live/route.ts).

- [ ] **Step 2: Create the route**

Write `src/app/api/dashboard/narrative/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getOpenAIClient } from '<npm>/lib/openai';
import { Redis } from '@upstash/redis';

type Persona = 'ceo' | 'coo' | 'both';

const CACHE_TTL_SECONDS = 60 * 60; // 1h per spec

type NarrativeResponse = {
  status: 'ok' | 'unavailable';
  hero?: string;
  sections?: { automations: string; business: string };
  generated_at?: string;
  message?: string;
};

function buildPrompt(persona: Persona, snapshot: Record<string, unknown>): string {
  const personaBlurb = persona === 'ceo'
    ? 'Audience: CEO of a marketing/AI agency. Lead with revenue, growth, risk.'
    : persona === 'coo'
    ? 'Audience: COO of a marketing/AI agency. Lead with operations, what ran, what broke.'
    : 'Audience: CEO + COO of a marketing/AI agency. Cover both business and operations.';

  return `${personaBlurb}

Return STRICT JSON with this exact shape:
{
  "hero": "1-2 sentence headline summarizing the week.",
  "sections": {
    "automations": "2-3 sentences on automation health, top performer, errors. Mention real workflow names and numbers if present.",
    "business": "2-3 sentences on revenue, pipeline, prospects, bookings. Mention real entity names and numbers if present."
  }
}

Style: plain English, no jargon, no emojis. Never invent numbers. Use only the data below.

DATA (this customer, last 7 days):
${JSON.stringify(snapshot, null, 2)}`;
}

async function fetchSnapshot(request: NextRequest): Promise<Record<string, unknown>> {
  const origin = new URL(request.url).origin;
  // Parallel server-side fetch of Layer-2 endpoints.
  const cookieHeader = request.headers.get('cookie') ?? '';
  const headers = { cookie: cookieHeader };

  const endpoints = [
    'automation-roi',
    'workflow-health',
    'finance',
    'sales-live',
    'marketing',
  ];

  const results = await Promise.allSettled(
    endpoints.map((ep) =>
      fetch(`${origin}/api/dashboard/${ep}`, { headers, cache: 'no-store' })
        .then((r) => r.json())
        .then((data) => [ep, data] as const),
    ),
  );

  const snapshot: Record<string, unknown> = {};
  for (const r of results) {
    if (r.status === 'fulfilled') {
      const [ep, data] = r.value;
      snapshot[ep] = data;
    }
  }
  return snapshot;
}

export async function GET(request: NextRequest): Promise<NextResponse<NarrativeResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  const persona = (new URL(request.url).searchParams.get('persona') ?? 'both') as Persona;
  if (!['ceo', 'coo', 'both'].includes(persona)) {
    return NextResponse.json({ status: 'unavailable', message: 'bad persona' }, { status: 400 });
  }

  const redis = Redis.fromEnv();
  const cacheKey = `dashboard:narrative:${userId}:${persona}`;

  const cached = await redis.get<NarrativeResponse>(cacheKey);
  if (cached?.status === 'ok') {
    return NextResponse.json(cached);
  }

  let snapshot: Record<string, unknown>;
  try {
    snapshot = await fetchSnapshot(request);
  } catch (err) {
    console.warn('[narrative] snapshot fetch failed:', err);
    return NextResponse.json({ status: 'unavailable', message: 'snapshot_failed' });
  }

  const openai = getOpenAIClient();
  let parsed: { hero: string; sections: { automations: string; business: string } };
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are an executive briefing assistant. Output strict JSON only.' },
        { role: 'user',   content: buildPrompt(persona, snapshot) },
      ],
      temperature: 0.3,
    });
    const raw = completion.choices[0]?.message?.content ?? '{}';
    parsed = JSON.parse(raw);
    if (!parsed?.hero || !parsed.sections?.automations || !parsed.sections?.business) {
      throw new Error('malformed narrative shape');
    }
  } catch (err) {
    console.warn('[narrative] OpenAI failed:', err);
    return NextResponse.json({ status: 'unavailable', message: 'llm_failed' });
  }

  const body: NarrativeResponse = {
    status: 'ok',
    hero: parsed.hero,
    sections: parsed.sections,
    generated_at: new Date().toISOString(),
  };

  await redis.set(cacheKey, body, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(body);
}
```

If `getOpenAIClient` doesn't exist in `<npm>/lib/openai`, check the actual export name (likely `openai` or `client`) and adjust the import. If there's no factory at all, instantiate the client inline using the existing env var (likely `OPENAI_API_KEY`).

- [ ] **Step 3: Verify build**

Run: `npm run lint && npm run build`
Expected: passes. (You may need to fix the OpenAI import name depending on the existing helper.)

- [ ] **Step 4: Manual smoke test**

Run `npm run dev`. Log in as a test user. Visit `http://localhost:3000/api/dashboard/narrative` in the browser.
Expected: JSON response with `status: "ok"` and three string fields. The first call will take a few seconds (OpenAI roundtrip); reload and the second call should be instant (cache hit).

If `status` is `unavailable`, check the server console for `[narrative]` warnings to see which Layer-2 endpoint or OpenAI call failed.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/dashboard/narrative/route.ts
git commit -m "feat(api): add /api/dashboard/narrative (OpenAI persona briefings)

Aggregates Layer-2 outputs (automation-roi, workflow-health,
finance, sales-live, marketing) in parallel, sends to GPT-4o
with persona-tuned prompt, returns strict-JSON briefing.
Redis cached 1h per (user_id, persona). Returns 'unavailable'
status (HTTP 200) on any failure so the caller can render
fallback copy.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: New API — `/api/dashboard/activity`

**Spec reference:** §13.2, §9.7.

**Files:**
- Create: `src/app/api/dashboard/activity/route.ts`

- [ ] **Step 1: Create the route**

Write `src/app/api/dashboard/activity/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { Redis } from '@upstash/redis';

const CACHE_TTL_SECONDS = 60;
const MAX_EVENTS = 10;

type ActivityEventType =
  | 'stripe_charge'
  | 'hubspot_deal'
  | 'workflow_run'
  | 'calendly_booking'
  | 'integration_incident';

type ActivityEvent = {
  type: ActivityEventType;
  icon: string;          // single-char hint for the UI
  entity_label: string;  // bold-able real name
  message: string;       // single sentence
  source: 'stripe' | 'hubspot' | 'n8n' | 'calendly' | 'opsradar';
  timestamp: string;     // ISO8601
};

type ActivityResponse = {
  status: 'ok' | 'unavailable';
  events?: ActivityEvent[];
  generated_at?: string;
  message?: string;
};

async function fetchUpstream(
  request: NextRequest,
  endpoint: string,
): Promise<unknown> {
  const origin = new URL(request.url).origin;
  const cookie = request.headers.get('cookie') ?? '';
  const res = await fetch(`${origin}/api/dashboard/${endpoint}`, {
    headers: { cookie },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${endpoint} ${res.status}`);
  return res.json();
}

// Each adapter reads upstream shape and emits 0–5 events.
// Adapters MUST be defensive — any missing field is silently skipped.
function adaptStripe(data: unknown): ActivityEvent[] {
  const charges = (data as { data?: { recent_charges?: Array<{ amount?: number; customer?: string; created?: string | number }> } })
    ?.data?.recent_charges ?? [];
  return charges.slice(0, 5).flatMap((c) => {
    if (typeof c.amount !== 'number' || !c.customer || !c.created) return [];
    return [{
      type: 'stripe_charge' as const,
      icon: '$',
      entity_label: c.customer,
      message: `Stripe charge $${c.amount.toLocaleString()}`,
      source: 'stripe' as const,
      timestamp: typeof c.created === 'string' ? c.created : new Date(c.created * 1000).toISOString(),
    }];
  });
}

function adaptHubspot(data: unknown): ActivityEvent[] {
  const deals = (data as { data?: { recent_transitions?: Array<{ name?: string; stage?: string; updated_at?: string }> } })
    ?.data?.recent_transitions ?? [];
  return deals.slice(0, 5).flatMap((d) => {
    if (!d.name || !d.stage || !d.updated_at) return [];
    return [{
      type: 'hubspot_deal' as const,
      icon: '▦',
      entity_label: d.name,
      message: `Deal moved to ${d.stage}`,
      source: 'hubspot' as const,
      timestamp: d.updated_at,
    }];
  });
}

function adaptWorkflows(data: unknown): ActivityEvent[] {
  const workflows = (data as { workflows?: Array<{ name?: string; last_run_at?: string; last_run_status?: string }> })
    ?.workflows ?? [];
  return workflows.slice(0, 5).flatMap((w) => {
    if (!w.name || !w.last_run_at) return [];
    return [{
      type: 'workflow_run' as const,
      icon: '▶',
      entity_label: w.name,
      message: `Workflow ran · ${w.last_run_status ?? 'ok'}`,
      source: 'n8n' as const,
      timestamp: w.last_run_at,
    }];
  });
}

function adaptMarketing(data: unknown): ActivityEvent[] {
  const bookings = (data as { data?: { recent_bookings?: Array<{ invitee?: string; start_time?: string }> } })
    ?.data?.recent_bookings ?? [];
  return bookings.slice(0, 5).flatMap((b) => {
    if (!b.invitee || !b.start_time) return [];
    return [{
      type: 'calendly_booking' as const,
      icon: '📞',
      entity_label: b.invitee,
      message: 'Call booked',
      source: 'calendly' as const,
      timestamp: b.start_time,
    }];
  });
}

export async function GET(request: NextRequest): Promise<NextResponse<ActivityResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  const redis = Redis.fromEnv();
  const cacheKey = `dashboard:activity:${userId}`;
  const cached = await redis.get<ActivityResponse>(cacheKey);
  if (cached?.status === 'ok') return NextResponse.json(cached);

  const settled = await Promise.allSettled([
    fetchUpstream(request, 'finance').then(adaptStripe),
    fetchUpstream(request, 'sales-live').then(adaptHubspot),
    fetchUpstream(request, 'workflow-health').then(adaptWorkflows),
    fetchUpstream(request, 'marketing').then(adaptMarketing),
  ]);

  const events: ActivityEvent[] = [];
  for (const s of settled) {
    if (s.status === 'fulfilled') events.push(...s.value);
  }

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const top = events.slice(0, MAX_EVENTS);

  const body: ActivityResponse = {
    status: 'ok',
    events: top,
    generated_at: new Date().toISOString(),
  };

  await redis.set(cacheKey, body, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(body);
}
```

**Adapter caveat:** the field names in `adaptStripe`/`adaptHubspot`/etc. above are the assumed shapes. Before this task ships, verify against the actual upstream response from each `/api/dashboard/*` endpoint — the existing routes' types are the source of truth. Open each route file ([finance/route.ts](../../src/app/api/dashboard/finance/route.ts), [sales-live/route.ts](../../src/app/api/dashboard/sales-live/route.ts), [workflow-health/route.ts](../../src/app/api/dashboard/workflow-health/route.ts), [marketing/route.ts](../../src/app/api/dashboard/marketing/route.ts)) and update the adapter field paths to match. Adapters silently skip events with missing fields, so partial mismatches degrade gracefully but you want at least one field path per source working.

- [ ] **Step 2: Verify upstream shapes and patch adapters as needed**

Open each of the four upstream routes and confirm the field paths used in the adapters above match. Patch any field name mismatches inline.

- [ ] **Step 3: Verify build**

Run: `npm run lint && npm run build`
Expected: passes.

- [ ] **Step 4: Manual smoke test**

Run `npm run dev`. Visit `http://localhost:3000/api/dashboard/activity`.
Expected: JSON with `status: "ok"`, `events: [...]` sorted descending by timestamp, max 10. Reload — second call instant (60s cache).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/dashboard/activity/route.ts
git commit -m "feat(api): add /api/dashboard/activity (cross-pillar feed)

Parallel fetches from finance, sales-live, workflow-health,
marketing. Adapter functions normalize each upstream shape into
a unified ActivityEvent and silently skip events with missing
fields. Sorted descending, top-10 returned. Redis cached 60s.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Primitive — `empty-state-connect.tsx`

**Spec reference:** §12.

**Files:**
- Create: `src/app/dashboard/_components/empty-state-connect.tsx`

- [ ] **Step 1: Create the component**

Write the file:

```tsx
import Link from 'next/link';
import { Plug } from 'lucide-react';

export type EmptyStateConnectProps = {
  tool: string;                 // e.g. "Stripe", "HubSpot"
  toolSlug: string;             // url-safe slug for ?tool=… param
  description?: string;         // override default copy
  className?: string;
};

/**
 * The single source of truth for "not connected" widget state.
 * Spec §12 — three-state pattern. State 3: not connected.
 *
 * Dim card with the tool name, a single sentence, and a primary
 * button deep-linking to /dashboard/integrations?tool=<slug>.
 *
 * Use this for the entire widget body when an integration is not
 * connected. Do NOT compose multiple of these in one widget.
 */
export function EmptyStateConnect({
  tool,
  toolSlug,
  description,
  className = '',
}: EmptyStateConnectProps) {
  const copy = description ?? `Connect ${tool} to see your data here.`;
  return (
    <div
      className={`flex flex-col items-start gap-3 rounded-[var(--radius)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-sunken)]/40 p-5 ${className}`}
    >
      <div className="flex items-center gap-2 text-[var(--color-fg-muted)]">
        <Plug size={14} strokeWidth={1.6} />
        <span className="text-[11px] font-medium uppercase tracking-[0.06em]">
          Not connected
        </span>
      </div>
      <p className="text-body-sm text-[var(--color-fg-muted)]">{copy}</p>
      <Link
        href={`/dashboard/integrations?tool=${toolSlug}`}
        className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--color-primary)] px-3 py-1.5 text-[12.5px] font-semibold text-white no-underline transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary)_85%,black)]"
      >
        Connect {tool}
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/_components/empty-state-connect.tsx
git commit -m "feat(dashboard): add EmptyStateConnect primitive

Single source of truth for 'not connected' widget state.
Spec §12 — three-state pattern, state 3. Used by every cockpit
KPI card and per-tool business section that fronts an
integration credential.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Primitive — `widget-fallback.tsx`

**Spec reference:** §13.

**Files:**
- Create: `src/app/dashboard/_components/widget-fallback.tsx`

- [ ] **Step 1: Create the component**

Write the file:

```tsx
'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

export type WidgetFallbackProps = {
  /** Tool/source label — e.g. "Stripe". Used in the message. */
  source: string;
  /** Optional retry handler. If omitted, the retry button is hidden. */
  onRetry?: () => void;
  /** If a cached value exists and is being displayed, show "Last synced …" badge. */
  stale?: { lastSyncedAt: string };
  className?: string;
};

/**
 * Soft error / stale-cache surface for a widget whose upstream failed.
 * Spec §13 — fallback behavior.
 *
 * Two states wrapped in one component:
 *   - With `stale` prop → renders a small "Last synced Nh ago · retrying"
 *     badge meant to be placed *below* a widget that's rendering its
 *     cached value.
 *   - Without `stale` → renders a full-card soft error: ⚠ icon, message,
 *     retry button. Use when there's no cache to fall back on.
 */
export function WidgetFallback({ source, onRetry, stale, className = '' }: WidgetFallbackProps) {
  if (stale) {
    const elapsed = humanizeSince(new Date(stale.lastSyncedAt));
    return (
      <div className={`mt-2 inline-flex items-center gap-1.5 text-[10.5px] text-[var(--color-fg-subtle)] ${className}`}>
        <RefreshCw size={10} strokeWidth={1.6} className="animate-spin-slow" />
        <span>Last synced {elapsed} ago · retrying</span>
      </div>
    );
  }
  return (
    <div
      className={`flex flex-col items-start gap-2.5 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)]/40 p-4 ${className}`}
    >
      <div className="flex items-center gap-2 text-[var(--color-warn)]">
        <AlertTriangle size={14} strokeWidth={1.8} />
        <span className="text-[11px] font-medium uppercase tracking-[0.06em]">
          Temporary issue
        </span>
      </div>
      <p className="text-body-sm text-[var(--color-fg-muted)]">
        Couldn't reach {source}. We'll retry shortly.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--color-surface-sunken)]"
        >
          <RefreshCw size={11} strokeWidth={1.8} />
          Retry now
        </button>
      )}
    </div>
  );
}

function humanizeSince(d: Date): string {
  const sec = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${Math.round(sec)}s`;
  const min = sec / 60;
  if (min < 60) return `${Math.round(min)}m`;
  const hrs = min / 60;
  if (hrs < 24) return `${Math.round(hrs)}h`;
  return `${Math.round(hrs / 24)}d`;
}
```

- [ ] **Step 2: Verify lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/_components/widget-fallback.tsx
git commit -m "feat(dashboard): add WidgetFallback primitive

Two states in one component: stale-cache badge (placed under a
widget rendering cached data) and full-card soft error (when
no cache exists). Spec §13.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Primitive — `narrative-card.tsx`

**Spec reference:** §6 principle 2, §9.5, §10.2, §11.2.

**Files:**
- Create: `src/app/dashboard/_components/narrative-card.tsx`

- [ ] **Step 1: Create the component**

Write the file:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

type Persona = 'ceo' | 'coo' | 'both';
type Section = 'hero' | 'automations' | 'business';

export type NarrativeCardProps = {
  /** Which slice of the narrative response to render. */
  section: Section;
  /** Persona prompt sent to the narrative API. */
  persona?: Persona;
  /** Card title shown above the prose. */
  title: string;
  className?: string;
};

type NarrativeResponse = {
  status: 'ok' | 'unavailable';
  hero?: string;
  sections?: { automations: string; business: string };
  generated_at?: string;
  message?: string;
};

/**
 * AI-generated English briefing. Spec §6.2 — non-optional primitive.
 *
 * Calls /api/dashboard/narrative once (cached server-side 1h per
 * user+persona). Renders fallback copy on any failure — never blocks
 * the rest of the page.
 */
export function NarrativeCard({ section, persona = 'both', title, className = '' }: NarrativeCardProps) {
  const [data, setData] = useState<NarrativeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/dashboard/narrative?persona=${persona}`)
      .then((r) => r.json())
      .then((json: NarrativeResponse) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData({ status: 'unavailable' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [persona]);

  const body = pickBody(data, section);

  return (
    <div
      className={`rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 ${className}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--color-fg-muted)]">
          {title}
        </h3>
        <span className="inline-flex items-center gap-1 rounded-[var(--radius)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">
          <Sparkles size={9} strokeWidth={2} />
          AI · hourly
        </span>
      </div>
      {loading ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">Generating briefing…</p>
      ) : body ? (
        <p className="whitespace-pre-line text-[13.5px] leading-[1.55] text-[var(--color-fg-muted)]">
          {body}
        </p>
      ) : (
        <p className="text-body-sm italic text-[var(--color-fg-subtle)]">
          Briefing temporarily unavailable.
        </p>
      )}
    </div>
  );
}

function pickBody(data: NarrativeResponse | null, section: Section): string | null {
  if (!data || data.status !== 'ok') return null;
  if (section === 'hero') return data.hero ?? null;
  return data.sections?.[section] ?? null;
}
```

- [ ] **Step 2: Verify lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/_components/narrative-card.tsx
git commit -m "feat(dashboard): add NarrativeCard primitive

Renders one slice (hero | automations | business) of the
/api/dashboard/narrative response. Spec §6 principle 2 makes
this non-optional — every major section ships with one.
Failure mode: 'Briefing temporarily unavailable' inline string.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Cockpit component — KPI strip

**Spec reference:** §9.3.

**Files:**
- Create: `src/app/dashboard/_components/cockpit-kpi-strip.tsx`

- [ ] **Step 1: Sketch the KPI card subcomponent and the strip**

Write `src/app/dashboard/_components/cockpit-kpi-strip.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { EmptyStateConnect } from './empty-state-connect';

type KpiState =
  | { kind: 'loading' }
  | { kind: 'value';   label: string; value: string; delta?: string; deltaUp?: boolean; spark?: number[] }
  | { kind: 'no-data'; label: string }
  | { kind: 'not-connected'; tool: string; toolSlug: string }
  | { kind: 'error'; label: string; source: string };

type FetchResult = Omit<Extract<KpiState, { kind: 'value' }>, 'kind'> | { error: 'not_connected' | 'no_data' | 'failed' };

/**
 * Composes 6 KPI cards from independent Layer-2 fetches.
 * Spec §9.3.
 *
 * Each card owns its own fetch and state. The strip is just layout.
 * KPI sources (in order):
 *   1. Time saved · 7d            — /api/dashboard/automation-roi
 *   2. MRR · current              — /api/dashboard/finance
 *   3. Active pipeline · current  — /api/dashboard/sales-live
 *   4. New prospects · 7d         — /api/dashboard/marketing
 *   5. Booked calls · 7d          — /api/dashboard/marketing
 *   6. Workflow success rate · 7d — /api/dashboard/workflow-health
 */
export function CockpitKpiStrip() {
  return (
    <div className="grid grid-cols-6 gap-2.5">
      <KpiCard label="Time saved · 7d"     loader={loadTimeSaved}   tool="Automations" toolSlug="n8n" />
      <KpiCard label="MRR"                 loader={loadMrr}         tool="Stripe"      toolSlug="stripe" />
      <KpiCard label="Active pipeline"     loader={loadPipeline}    tool="HubSpot"     toolSlug="hubspot" />
      <KpiCard label="New prospects · 7d"  loader={loadProspects}   tool="Apollo"      toolSlug="apollo" />
      <KpiCard label="Booked calls · 7d"   loader={loadBookings}    tool="Calendly"    toolSlug="calendly" />
      <KpiCard label="Workflow success"    loader={loadSuccessRate} tool="Automations" toolSlug="n8n" />
    </div>
  );
}

type Loader = () => Promise<FetchResult>;

function KpiCard({ label, loader, tool, toolSlug }: {
  label: string;
  loader: Loader;
  tool: string;
  toolSlug: string;
}) {
  const [state, setState] = useState<KpiState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loader()
      .then((r) => {
        if (cancelled) return;
        if ('error' in r) {
          if (r.error === 'not_connected') return setState({ kind: 'not-connected', tool, toolSlug });
          if (r.error === 'no_data') return setState({ kind: 'no-data', label });
          return setState({ kind: 'error', label, source: tool });
        }
        setState({ kind: 'value', label, ...r });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error', label, source: tool });
      });
    return () => { cancelled = true; };
  }, [loader, label, tool, toolSlug]);

  if (state.kind === 'not-connected') {
    return <EmptyStateConnect tool={state.tool} toolSlug={state.toolSlug} description={`Connect ${state.tool} for ${label.toLowerCase()}.`} />;
  }

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
      <div className="mb-1.5 text-[9.5px] font-medium uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">
        {label}
      </div>
      {state.kind === 'loading' ? (
        <div className="h-6 w-16 animate-pulse rounded bg-[var(--color-surface-sunken)]" />
      ) : state.kind === 'no-data' ? (
        <div className="text-body-sm text-[var(--color-fg-subtle)]">No activity yet</div>
      ) : state.kind === 'error' ? (
        <div className="text-body-sm text-[var(--color-fg-subtle)]">Couldn't reach {state.source}</div>
      ) : (
        <>
          <div className="text-[20px] font-bold leading-none tracking-[-0.02em] text-[var(--color-fg)]">
            {state.value}
          </div>
          {state.delta && (
            <div className={`mt-1.5 text-[10.5px] ${state.deltaUp ? 'text-[var(--color-success)]' : 'text-[var(--color-warn)]'}`}>
              {state.delta}
            </div>
          )}
          {state.spark && state.spark.length > 1 && <Sparkline values={state.spark} up={state.deltaUp ?? true} />}
        </>
      )}
    </div>
  );
}

function Sparkline({ values, up }: { values: number[]; up: boolean }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);
  const w = 100;
  const h = 18;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const stroke = up ? 'var(--color-success)' : 'var(--color-warn)';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-1.5 h-[18px] w-full">
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth={1.5} />
    </svg>
  );
}

// ============================================================
// Loaders — one per KPI. Each maps an upstream response to FetchResult.
// Keep these defensive: any missing field returns { error: 'no_data' }.
// HTTP 503 / status:'not_configured' / status:'not_enrolled' returns
// { error: 'not_connected' } so the card switches to the connect-CTA.
// ============================================================

async function loadTimeSaved(): Promise<FetchResult> {
  const r = await fetch('/api/dashboard/automation-roi').then((res) => res.json());
  if (r?.status === 'error' || !r?.data?.overview) return { error: 'failed' };
  const hours = r.data.overview.hours_saved_7d ?? r.data.overview.total_hours_saved;
  const prior = r.data.overview.hours_saved_prior_7d;
  if (typeof hours !== 'number') return { error: 'no_data' };
  const delta = (typeof prior === 'number' && prior > 0)
    ? `${((hours - prior) / prior * 100).toFixed(0)}% vs prior`
    : undefined;
  const spark: number[] | undefined = r.data.overview.weekly_hours_saved;
  return { value: `${Math.round(hours)}h`, delta, deltaUp: !!delta && hours >= (prior ?? 0), spark };
}

async function loadMrr(): Promise<FetchResult> {
  const res = await fetch('/api/dashboard/finance');
  if (res.status === 503) return { error: 'not_connected' };
  const r = await res.json();
  if (r?.status === 'not_configured') return { error: 'not_connected' };
  if (r?.status === 'error') return { error: 'failed' };
  const mrr = r?.data?.mrr_usd ?? r?.data?.mrr;
  if (typeof mrr !== 'number') return { error: 'no_data' };
  const prior = r?.data?.mrr_prior_month;
  const delta = (typeof prior === 'number' && prior > 0)
    ? `${((mrr - prior) / prior * 100).toFixed(0)}% MoM`
    : undefined;
  const spark: number[] | undefined = r?.data?.weekly_mrr;
  return { value: fmtCurrency(mrr), delta, deltaUp: mrr >= (prior ?? 0), spark };
}

async function loadPipeline(): Promise<FetchResult> {
  const res = await fetch('/api/dashboard/sales-live');
  if (res.status === 503) return { error: 'not_connected' };
  const r = await res.json();
  if (r?.status === 'not_configured') return { error: 'not_connected' };
  if (r?.status === 'error') return { error: 'failed' };
  const total = r?.data?.pipeline_value_usd ?? r?.data?.open_pipeline_value;
  if (typeof total !== 'number') return { error: 'no_data' };
  const open = r?.data?.open_deals ?? r?.data?.deals_open;
  const delta = typeof open === 'number' ? `${open} deals open` : undefined;
  return { value: fmtCurrency(total), delta, deltaUp: true };
}

async function loadProspects(): Promise<FetchResult> {
  const r = await fetch('/api/dashboard/marketing').then((res) => res.json());
  if (r?.status === 'not_configured') return { error: 'not_connected' };
  if (r?.status === 'error') return { error: 'failed' };
  const n = r?.data?.apollo?.prospects_7d ?? r?.data?.prospects_added_7d;
  if (typeof n !== 'number') return { error: 'no_data' };
  return { value: String(n), deltaUp: true };
}

async function loadBookings(): Promise<FetchResult> {
  const r = await fetch('/api/dashboard/marketing').then((res) => res.json());
  if (r?.status === 'not_configured') return { error: 'not_connected' };
  if (r?.status === 'error') return { error: 'failed' };
  const n = r?.data?.calendly?.bookings_7d ?? r?.data?.bookings_7d;
  if (typeof n !== 'number') return { error: 'no_data' };
  return { value: String(n), deltaUp: true };
}

async function loadSuccessRate(): Promise<FetchResult> {
  const r = await fetch('/api/dashboard/workflow-health').then((res) => res.json());
  if (r?.status === 'not_enrolled') return { error: 'not_connected' };
  if (r?.status === 'unavailable') return { error: 'failed' };
  const workflows = r?.workflows ?? [];
  if (!Array.isArray(workflows) || workflows.length === 0) return { error: 'no_data' };
  const totalRuns = workflows.reduce((sum: number, w: { runs_7d?: number }) => sum + (w.runs_7d ?? 0), 0);
  const totalSuccess = workflows.reduce((sum: number, w: { success_runs_7d?: number }) => sum + (w.success_runs_7d ?? 0), 0);
  if (totalRuns === 0) return { error: 'no_data' };
  const pct = (totalSuccess / totalRuns) * 100;
  return { value: `${pct.toFixed(1)}%`, deltaUp: pct >= 95 };
}

function fmtCurrency(n: number): string {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}
```

**Field-name caveat:** the loaders above use *probable* field names against existing API shapes. Before this task ships, open the four upstream routes (`finance`, `sales-live`, `marketing`, `workflow-health`, `automation-roi`) and patch each loader's field paths to match the actual response. The loaders are defensive — every loader returns `no_data` if its fields are missing — so partial mismatches won't crash, but you want at least one path per loader returning a real value.

- [ ] **Step 2: Patch loader field names against actual upstream responses**

For each loader, open its corresponding `/api/dashboard/<ep>/route.ts` and verify the field paths.

- [ ] **Step 3: Verify build + lint**

Run: `npm run lint && npm run build`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/_components/cockpit-kpi-strip.tsx
git commit -m "feat(dashboard): add CockpitKpiStrip with 6 KPI cards

Each card owns its own fetch + state machine (loading / value /
no-data / not-connected / error). Strip is pure layout. Sparkline
is inline SVG. Spec §9.3.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Cockpit component — Alerts ribbon

**Spec reference:** §9.4.

**Files:**
- Create: `src/app/dashboard/_components/cockpit-alerts-ribbon.tsx`
- Create: `src/app/api/dashboard/alerts/route.ts` (new endpoint that runs the rule engine server-side and returns top-N alerts)

- [ ] **Step 1: Create the alerts API**

Write `src/app/api/dashboard/alerts/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { Redis } from '@upstash/redis';
import {
  stripeAuthErrorRule,
  elevatedErrorRateRule,
  stuckDealRule,
  failingWorkflowRule,
  emptyCalendarRule,
  sortAlertsBySeverity,
  MAX_COCKPIT_ALERTS,
  type DashboardAlert,
} from '<npm>/lib/dashboard-alert-rules';

const CACHE_TTL_SECONDS = 5 * 60; // 5 minutes per spec

type AlertsResponse = { status: 'ok' | 'unavailable'; alerts?: DashboardAlert[]; message?: string };

async function fetchJson(request: NextRequest, ep: string): Promise<unknown> {
  const origin = new URL(request.url).origin;
  const res = await fetch(`${origin}/api/dashboard/${ep}`, {
    headers: { cookie: request.headers.get('cookie') ?? '' },
    cache: 'no-store',
  });
  if (!res.ok && res.status !== 503) throw new Error(`${ep} ${res.status}`);
  return res.json();
}

export async function GET(request: NextRequest): Promise<NextResponse<AlertsResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });

  const redis = Redis.fromEnv();
  const key = `dashboard:alerts:${userId}`;
  const cached = await redis.get<AlertsResponse>(key);
  if (cached?.status === 'ok') return NextResponse.json(cached);

  const settled = await Promise.allSettled([
    fetchJson(request, 'finance'),
    fetchJson(request, 'sales-live'),
    fetchJson(request, 'workflow-health'),
    fetchJson(request, 'marketing'),
  ]);
  const [finance, sales, workflows, marketing] = settled.map((s) => (s.status === 'fulfilled' ? s.value : null));

  const candidates: (DashboardAlert | null)[] = [];

  // Stripe auth
  const financeStatus = (finance as { status?: string })?.status;
  candidates.push(stripeAuthErrorRule({
    hasError: financeStatus === 'error',
    errorCode: (finance as { error_code?: string })?.error_code ?? null,
  }));

  // Elevated error rates per integration
  for (const [tool, data] of [['Stripe', finance], ['HubSpot', sales], ['Apollo', marketing], ['Calendly', marketing]] as const) {
    const errors24h = (data as { data?: { errors_24h?: number } })?.data?.errors_24h ?? 0;
    candidates.push(elevatedErrorRateRule({ tool, errors24h }));
  }

  // Stuck deals
  const deals = (sales as { data?: { open_deals_detail?: Array<{ name?: string; days_in_stage?: number; amount_usd?: number }> } })?.data?.open_deals_detail ?? [];
  for (const d of deals) {
    if (!d.name || typeof d.days_in_stage !== 'number' || typeof d.amount_usd !== 'number') continue;
    candidates.push(stuckDealRule({ dealName: d.name, daysInStage: d.days_in_stage, valueUsd: d.amount_usd }));
  }

  // Failing workflows
  const workflowsList = (workflows as { workflows?: Array<{ name?: string; last_failure_at?: string; last_recovery_at?: string | null }> })?.workflows ?? [];
  const now = new Date();
  for (const w of workflowsList) {
    if (!w.name || !w.last_failure_at) continue;
    candidates.push(failingWorkflowRule({
      workflowName: w.name,
      failedAt: new Date(w.last_failure_at),
      recoveredAt: w.last_recovery_at ? new Date(w.last_recovery_at) : null,
      now,
    }));
  }

  // Empty calendar
  const bookings7d = (marketing as { data?: { calendly?: { bookings_7d?: number } } })?.data?.calendly?.bookings_7d ?? 0;
  const pipelineValueUsd = (sales as { data?: { pipeline_value_usd?: number } })?.data?.pipeline_value_usd ?? 0;
  candidates.push(emptyCalendarRule({ bookings7d, pipelineValueUsd }));

  const alerts = sortAlertsBySeverity(candidates.filter((a): a is DashboardAlert => a !== null)).slice(0, MAX_COCKPIT_ALERTS);

  const body: AlertsResponse = { status: 'ok', alerts };
  await redis.set(key, body, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(body);
}
```

- [ ] **Step 2: Create the ribbon component**

Write `src/app/dashboard/_components/cockpit-alerts-ribbon.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DashboardAlert } from '<npm>/lib/dashboard-alert-rules';

const SEVERITY_STYLES: Record<DashboardAlert['severity'], { border: string; tagBg: string; tagFg: string }> = {
  'needs-you': {
    border: 'border-l-[var(--color-danger)]',
    tagBg:  'bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)]',
    tagFg:  'text-[var(--color-danger)]',
  },
  'watch': {
    border: 'border-l-[var(--color-warn)]',
    tagBg:  'bg-[color-mix(in_srgb,var(--color-warn)_14%,transparent)]',
    tagFg:  'text-[var(--color-warn)]',
  },
  'heads-up': {
    border: 'border-l-[var(--color-primary)]',
    tagBg:  'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]',
    tagFg:  'text-[var(--color-primary)]',
  },
};

export function CockpitAlertsRibbon() {
  const [alerts, setAlerts] = useState<DashboardAlert[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/alerts')
      .then((r) => r.json())
      .then((json: { status: string; alerts?: DashboardAlert[] }) => {
        if (cancelled) return;
        setAlerts(json.status === 'ok' ? (json.alerts ?? []) : []);
      })
      .catch(() => { if (!cancelled) setAlerts([]); });
    return () => { cancelled = true; };
  }, []);

  if (alerts === null) {
    // Render skeleton so the layout doesn't jump
    return <div className="grid grid-cols-3 gap-2" aria-hidden>
      {[0, 1, 2].map((i) => <div key={i} className="h-[60px] animate-pulse rounded-[var(--radius)] bg-[var(--color-surface-sunken)]" />)}
    </div>;
  }

  if (alerts.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {alerts.map((a) => {
        const s = SEVERITY_STYLES[a.severity];
        return (
          <Link
            key={a.id}
            href={a.href}
            className={`flex flex-col gap-1 rounded-[var(--radius)] border border-[var(--color-border)] border-l-2 ${s.border} bg-[var(--color-surface)] p-3 no-underline transition-colors hover:bg-[var(--color-surface-sunken)]`}
          >
            <span className={`inline-block w-fit rounded-[3px] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${s.tagBg} ${s.tagFg}`}>
              {a.label}
            </span>
            <span className="text-[12.5px] leading-snug text-[var(--color-fg-muted)]">{a.message}</span>
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run lint && npm run build`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/dashboard/alerts/route.ts src/app/dashboard/_components/cockpit-alerts-ribbon.tsx
git commit -m "feat(dashboard): add CockpitAlertsRibbon and /api/dashboard/alerts

API runs the deterministic rule engine over Layer-2 outputs and
returns top-3 alerts by severity. Component renders up to 3
cards in a 3-col grid; each is a deep-link to the action.
Spec §9.4.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Cockpit component — Hero + narrative

**Spec reference:** §9.5.

**Files:**
- Create: `src/app/dashboard/_components/cockpit-hero-narrative.tsx`

- [ ] **Step 1: Create the component**

Write `src/app/dashboard/_components/cockpit-hero-narrative.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { NarrativeCard } from './narrative-card';
import { OPERATOR_RATE_USD_PER_HOUR } from '<npm>/lib/dashboard-alert-rules';

type RoiResp = {
  status: 'ok' | 'error' | string;
  data?: {
    overview?: {
      hours_saved_7d?: number;
      total_hours_saved?: number;
      weekly_hours_saved?: number[];
      hours_saved_prior_7d?: number;
    };
  };
};

export function CockpitHeroNarrative() {
  return (
    <div className="grid grid-cols-[3fr_2fr] gap-3">
      <HeroCard />
      <NarrativeCard section="hero" title="This week's briefing" />
    </div>
  );
}

function HeroCard() {
  const [data, setData] = useState<RoiResp | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/automation-roi')
      .then((r) => r.json())
      .then((r: RoiResp) => { if (!cancelled) setData(r); })
      .catch(() => { if (!cancelled) setData({ status: 'error' }); });
    return () => { cancelled = true; };
  }, []);

  const hours = data?.data?.overview?.hours_saved_7d ?? data?.data?.overview?.total_hours_saved;
  const prior = data?.data?.overview?.hours_saved_prior_7d;
  const weekly = data?.data?.overview?.weekly_hours_saved ?? [];

  const usd = typeof hours === 'number' ? hours * OPERATOR_RATE_USD_PER_HOUR : null;
  const deltaPct = (typeof hours === 'number' && typeof prior === 'number' && prior > 0)
    ? ((hours - prior) / prior) * 100
    : null;

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-sunken)] p-5">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-fg-subtle)]">
        Estimated savings · 7d
      </div>
      {usd === null ? (
        <div className="mt-2 text-body-sm text-[var(--color-fg-subtle)]">No automation data yet — connect n8n via your account manager.</div>
      ) : (
        <>
          <div className="mt-2 text-[48px] font-bold leading-none tracking-[-0.03em] text-[var(--color-fg)]">
            ${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="mt-2 text-[12.5px] text-[var(--color-success)]">
            {Math.round(hours ?? 0)} hours · automations carrying their weight
            {deltaPct !== null && ` · ${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(0)}% vs prior week`}
          </div>
        </>
      )}
      {weekly.length > 1 && <Sparkbar values={weekly} />}
    </div>
  );
}

function Sparkbar({ values }: { values: number[] }) {
  const max = Math.max(...values);
  if (max <= 0) return null;
  return (
    <div className="mt-4 flex h-12 items-end gap-1">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm bg-[var(--color-success)]/70"
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run lint && npm run build`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/_components/cockpit-hero-narrative.tsx
git commit -m "feat(dashboard): add CockpitHeroNarrative

3fr/2fr grid: hero savings card (Time Saved hero metric per
spec §6 principle 3) + NarrativeCard section='hero'.
Sparkbar shows 8 weeks of hours-saved.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Cockpit component — Integration health strip

**Spec reference:** §9.6.

**Files:**
- Create: `src/app/dashboard/_components/cockpit-integration-health.tsx`

- [ ] **Step 1: Inspect what the existing /api/integrations endpoint returns**

Run:
```bash
cat src/app/api/integrations/route.ts | head -80
```

Note the shape — typically returns `{integrations: [{tool, status, last_synced_at, errors_24h}]}`. Patch the component below to match if the field names differ.

- [ ] **Step 2: Create the component**

Write `src/app/dashboard/_components/cockpit-integration-health.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Integration = {
  tool: string;
  slug: string;
  status: 'healthy' | 'errors' | 'not_connected';
  last_synced_at?: string | null;
};

const SLOTS: Array<{ tool: string; slug: string }> = [
  { tool: 'Stripe',     slug: 'stripe'    },
  { tool: 'HubSpot',    slug: 'hubspot'   },
  { tool: 'Apollo',     slug: 'apollo'    },
  { tool: 'Calendly',   slug: 'calendly'  },
  { tool: 'n8n',        slug: 'n8n'       },
  { tool: 'QuickBooks', slug: 'quickbooks' },
];

export function CockpitIntegrationHealth() {
  const [data, setData] = useState<Integration[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/integrations')
      .then((r) => r.json())
      .then((json: { integrations?: Array<{ tool?: string; status?: string; last_synced_at?: string | null; errors_24h?: number }> }) => {
        if (cancelled) return;
        const byTool = new Map<string, Integration>();
        for (const i of json.integrations ?? []) {
          if (!i.tool) continue;
          const slug = i.tool.toLowerCase();
          const status: Integration['status'] = i.status === 'connected'
            ? ((i.errors_24h ?? 0) > 5 ? 'errors' : 'healthy')
            : 'not_connected';
          byTool.set(slug, { tool: i.tool, slug, status, last_synced_at: i.last_synced_at ?? null });
        }
        // Merge with the canonical SLOTS list so the strip always shows 6 cells.
        const result = SLOTS.map((s) =>
          byTool.get(s.slug) ?? { tool: s.tool, slug: s.slug, status: 'not_connected' as const },
        );
        setData(result);
      })
      .catch(() => { if (!cancelled) setData([]); });
    return () => { cancelled = true; };
  }, []);

  if (data === null) {
    return <div className="grid grid-cols-6 gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3" aria-hidden>
      {SLOTS.map((s) => <div key={s.slug} className="h-6 animate-pulse rounded bg-[var(--color-surface-sunken)]" />)}
    </div>;
  }

  return (
    <div className="grid grid-cols-6 gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      {data.map((i) => <Cell key={i.slug} integration={i} />)}
    </div>
  );
}

function Cell({ integration: i }: { integration: Integration }) {
  const dotClass = i.status === 'healthy'
    ? 'bg-[var(--color-success)] shadow-[0_0_6px_rgba(74,222,128,0.55)]'
    : i.status === 'errors'
    ? 'bg-[var(--color-warn)]'
    : 'bg-[var(--color-fg-faint)]';

  const right = i.status === 'not_connected'
    ? <Link href={`/dashboard/integrations?tool=${i.slug}`} className="text-[10px] text-[var(--color-primary)] no-underline hover:underline">connect →</Link>
    : <span className="text-[10px] text-[var(--color-fg-subtle)]">{humanizeSince(i.last_synced_at)}</span>;

  return (
    <div className="flex items-center gap-2">
      <span className={`block size-2 rounded-full ${dotClass}`} />
      <span className={`text-[12.5px] font-medium ${i.status === 'not_connected' ? 'text-[var(--color-fg-subtle)]' : 'text-[var(--color-fg)]'}`}>
        {i.tool}
      </span>
      <span className="ml-auto">{right}</span>
    </div>
  );
}

function humanizeSince(iso: string | null | undefined): string {
  if (!iso) return '—';
  const sec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${Math.round(sec)}s`;
  const min = sec / 60;
  if (min < 60) return `${Math.round(min)}m`;
  const hrs = min / 60;
  if (hrs < 24) return `${Math.round(hrs)}h`;
  return `${Math.round(hrs / 24)}d`;
}
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run lint && npm run build`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/_components/cockpit-integration-health.tsx
git commit -m "feat(dashboard): add CockpitIntegrationHealth strip

6-cell single-row strip. Always renders 6 canonical slots
(Stripe, HubSpot, Apollo, Calendly, n8n, QuickBooks) — the
QuickBooks placeholder hints the integration list grows.
Spec §9.6.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Cockpit component — Cross-pillar activity feed

**Spec reference:** §9.7.

**Files:**
- Create: `src/app/dashboard/_components/cockpit-activity-feed.tsx`

- [ ] **Step 1: Create the component**

Write `src/app/dashboard/_components/cockpit-activity-feed.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';

type Event = {
  type: 'stripe_charge' | 'hubspot_deal' | 'workflow_run' | 'calendly_booking' | 'integration_incident';
  icon: string;
  entity_label: string;
  message: string;
  source: string;
  timestamp: string;
};

export function CockpitActivityFeed() {
  const [events, setEvents] = useState<Event[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/activity')
      .then((r) => r.json())
      .then((json: { status: string; events?: Event[] }) => {
        if (!cancelled) setEvents(json.status === 'ok' ? (json.events ?? []) : []);
      })
      .catch(() => { if (!cancelled) setEvents([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--color-fg-muted)]">
        Recent activity · cross-pillar
      </h3>
      {events === null ? (
        <FeedSkeleton />
      ) : events.length === 0 ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">No recent activity in the last 24 hours.</p>
      ) : (
        <ul className="space-y-1.5">
          {events.map((e, i) => <li key={`${e.type}-${e.timestamp}-${i}`} className="flex items-center gap-3 border-b border-[var(--color-border)] py-2 last:border-b-0">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-[11px] text-[var(--color-fg-muted)]">
              {e.icon}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--color-fg-muted)]">
              <strong className="font-semibold text-[var(--color-fg)]">{e.entity_label}</strong>
              <span className="ml-1.5 text-[var(--color-fg-muted)]">· {e.message}</span>
            </span>
            <span className="shrink-0 text-[10.5px] text-[var(--color-fg-subtle)]">{humanizeSince(e.timestamp)}</span>
          </li>)}
        </ul>
      )}
    </div>
  );
}

function FeedSkeleton() {
  return <ul className="space-y-2" aria-hidden>
    {[0, 1, 2, 3, 4].map((i) => <li key={i} className="h-8 animate-pulse rounded bg-[var(--color-surface-sunken)]" />)}
  </ul>;
}

function humanizeSince(iso: string): string {
  const sec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${Math.round(sec)}s`;
  const min = sec / 60;
  if (min < 60) return `${Math.round(min)}m`;
  const hrs = min / 60;
  if (hrs < 24) return `${Math.round(hrs)}h`;
  return `${Math.round(hrs / 24)}d`;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run lint && npm run build`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/_components/cockpit-activity-feed.tsx
git commit -m "feat(dashboard): add CockpitActivityFeed

Renders /api/dashboard/activity output as a chronological list.
Bold entity name + relative timestamp. Skeleton while loading,
empty-state copy when 0 events. Spec §9.7.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: Cockpit component — Pillar CTA cards

**Spec reference:** §9.7.

**Files:**
- Create: `src/app/dashboard/_components/pillar-cta-card.tsx`

- [ ] **Step 1: Create the component**

Write `src/app/dashboard/_components/pillar-cta-card.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export type PillarCtaCardProps = {
  title: string;          // "Automations" | "Business"
  persona: string;        // "COO view" | "CEO view"
  href: string;
  /** Up to 3 mini-stats. Render — let the loader fill them. */
  stats: { value: string; label: string }[];
  cta: string;            // e.g. "View leaderboard, incidents, ROI →"
};

export function PillarCtaCard({ title, persona, href, stats, cta }: PillarCtaCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 no-underline transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_30%,var(--color-border))]"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[13.5px] font-semibold text-[var(--color-fg)]">{title}</h2>
        <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">{persona}</span>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {stats.map((s, i) => (
          <div key={i}>
            <div className="text-[15px] font-semibold text-[var(--color-fg)]">{s.value}</div>
            <div className="text-[9px] uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-primary)]">
        <span>{cta}</span>
        <ArrowUpRight size={11} strokeWidth={2} />
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Create the data-loaded wrappers**

Append a second component file or extend the same file so `/dashboard/page.tsx` doesn't need its own fetching logic. Add at the bottom of `pillar-cta-card.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';

export function AutomationsCtaCard() {
  const [stats, setStats] = useState<{ value: string; label: string }[]>([
    { value: '—', label: 'Runs · 7d' },
    { value: '—', label: 'Success'    },
    { value: '—', label: 'Caught'     },
  ]);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/dashboard/workflow-health').then((r) => r.json()).catch(() => null),
      fetch('/api/dashboard/automation-roi').then((r) => r.json()).catch(() => null),
    ]).then(([wh, roi]) => {
      if (cancelled) return;
      const workflows = (wh as { workflows?: Array<{ runs_7d?: number; success_runs_7d?: number }> })?.workflows ?? [];
      const runs = workflows.reduce((s, w) => s + (w.runs_7d ?? 0), 0);
      const success = workflows.reduce((s, w) => s + (w.success_runs_7d ?? 0), 0);
      const successPct = runs > 0 ? `${((success / runs) * 100).toFixed(1)}%` : '—';
      const caught = (roi as { data?: { overview?: { incidents_caught_7d?: number } } })?.data?.overview?.incidents_caught_7d ?? 0;
      setStats([
        { value: runs.toLocaleString(), label: 'Runs · 7d' },
        { value: successPct,            label: 'Success'    },
        { value: String(caught),        label: 'Caught'     },
      ]);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <PillarCtaCard
      title="Automations"
      persona="COO view"
      href="/dashboard/automations"
      stats={stats}
      cta="View leaderboard, incidents, ROI"
    />
  );
}

export function BusinessCtaCard() {
  const [stats, setStats] = useState<{ value: string; label: string }[]>([
    { value: '—', label: 'MRR'      },
    { value: '—', label: 'Pipeline' },
    { value: '—', label: 'Calls'    },
  ]);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/dashboard/finance').then((r) => r.json()).catch(() => null),
      fetch('/api/dashboard/sales-live').then((r) => r.json()).catch(() => null),
      fetch('/api/dashboard/marketing').then((r) => r.json()).catch(() => null),
    ]).then(([fin, sales, mkt]) => {
      if (cancelled) return;
      const mrr = (fin as { data?: { mrr_usd?: number } })?.data?.mrr_usd;
      const pipeline = (sales as { data?: { pipeline_value_usd?: number } })?.data?.pipeline_value_usd;
      const calls = (mkt as { data?: { calendly?: { bookings_7d?: number } } })?.data?.calendly?.bookings_7d;
      setStats([
        { value: typeof mrr === 'number'      ? fmtMoney(mrr)      : '—', label: 'MRR'      },
        { value: typeof pipeline === 'number' ? fmtMoney(pipeline) : '—', label: 'Pipeline' },
        { value: typeof calls === 'number'    ? String(calls)      : '—', label: 'Calls'    },
      ]);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <PillarCtaCard
      title="Business"
      persona="CEO view"
      href="/dashboard/business"
      stats={stats}
      cta="View revenue, sales, marketing detail"
    />
  );
}

function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}
```

(Heads-up: the file has two `'use client'` directives. Next.js only requires one at the top of the file. **Remove the second one** before saving.)

- [ ] **Step 3: Verify build + lint**

Run: `npm run lint && npm run build`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/_components/pillar-cta-card.tsx
git commit -m "feat(dashboard): add PillarCtaCard + Automations/Business variants

Bare card primitive plus two preloaded wrappers
(AutomationsCtaCard, BusinessCtaCard) that fetch their own
3 mini-stats. Spec §9.7.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 17: Rewrite `/dashboard/page.tsx` — cockpit composition

**Spec reference:** §9 (all subsections), §6 principle 7 (remove FALLBACK_METRICS), §15.

**Files:**
- Rewrite: `src/app/dashboard/page.tsx` (currently 492 lines; new file ~100 lines)

- [ ] **Step 1: Snapshot the current page for reference** (so the engineer can pull greeting copy and date logic if needed)

The current file is at [src/app/dashboard/page.tsx](../../src/app/dashboard/page.tsx) — read it once before overwriting. Not all of it survives.

- [ ] **Step 2: Replace the entire file**

Overwrite `src/app/dashboard/page.tsx` with this content:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { CockpitKpiStrip } from './_components/cockpit-kpi-strip';
import { CockpitAlertsRibbon } from './_components/cockpit-alerts-ribbon';
import { CockpitHeroNarrative } from './_components/cockpit-hero-narrative';
import { CockpitIntegrationHealth } from './_components/cockpit-integration-health';
import { CockpitActivityFeed } from './_components/cockpit-activity-feed';
import { AutomationsCtaCard, BusinessCtaCard } from './_components/pillar-cta-card';

export default function DashboardPage() {
  const greeting = useGreeting();

  return (
    <div className="flex flex-col gap-3.5">
      <Topbar />
      <Greeting greeting={greeting} />
      <CockpitKpiStrip />
      <CockpitAlertsRibbon />
      <CockpitHeroNarrative />
      <CockpitIntegrationHealth />
      <div className="grid grid-cols-[3fr_2fr] gap-3">
        <CockpitActivityFeed />
        <div className="flex flex-col gap-2.5">
          <AutomationsCtaCard />
          <BusinessCtaCard />
        </div>
      </div>
    </div>
  );
}

function Topbar() {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
      <h1 className="text-[14px] font-medium text-[var(--color-fg)]">Overview</h1>
      <LiveIndicator />
    </div>
  );
}

function LiveIndicator() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  // The actual "synced Nm ago" comes from individual widgets' last_synced_at.
  // This indicator is just the cockpit heartbeat.
  void tick;
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] text-[var(--color-fg-subtle)]">
      <span className="block size-1.5 rounded-full bg-[var(--color-success)] shadow-[0_0_5px_rgba(74,222,128,0.7)]" />
      Live
    </span>
  );
}

function Greeting({ greeting }: { greeting: string }) {
  const today = new Date();
  const dateStr = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const week = isoWeek(today);
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="font-serif text-[22px] tracking-[-0.01em] text-[var(--color-fg)]">{greeting}</h2>
      <span className="text-[12px] text-[var(--color-fg-subtle)]">{dateStr} · Week {week}</span>
    </div>
  );
}

function useGreeting(): string {
  const [g, setG] = useState('Welcome back');
  useEffect(() => {
    const hr = new Date().getHours();
    setG(hr < 12 ? 'Good morning.' : hr < 18 ? 'Good afternoon.' : 'Good evening.');
  }, []);
  return g;
}

function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
```

- [ ] **Step 3: Grep for `FALLBACK_METRICS` to confirm it's gone**

Run: `grep -rn "FALLBACK_METRICS" src/`
Expected: no matches.

- [ ] **Step 4: Verify build + lint**

Run: `npm run lint && npm run build`
Expected: passes. Any leftover imports of `BrainAskBox`, `HeroRoiBlock`, `WorkflowHealthStrip`, `MarketingCard`, `SalesCard`, `SalesLiveCard`, `FinancialsCard`, `FinanceCard`, `DeliveryCard`, `GuardIncidentFeed`, `PageHeader`, `StatCard`, `PillarTag`, `Card`, `PrimaryButton`, `SecondaryButton` from the old page are no longer referenced from `dashboard/page.tsx`. They may still be referenced by other files — do NOT delete the component files in this task.

- [ ] **Step 5: Manual verification — the cockpit renders**

Run `npm run dev`. Log in. Visit `/dashboard`.
Expected:
- Greeting + date + week number at the top.
- 6 KPI cards in a row (some real values, some "Connect X" dim cards depending on which integrations the test user has).
- Up to 3 alerts (or nothing if no alerts).
- Hero card with $ savings + AI narrative panel to the right.
- 6-cell integration health strip.
- Activity feed + 2 pillar CTA cards.

No fake numbers anywhere. If a widget fails, only that widget's card is affected.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat(dashboard): rewrite /dashboard as the cockpit

Replaces the 492-line partially-live hub with a 100-line
composition of 6 new cockpit components. FALLBACK_METRICS,
RevenueChart, TasksChart, ProjectsTable, ActivityFeed (the
old local hardcoded versions), and the 7 hardcoded data
constants are all gone. Spec §9.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 18: New page — `/dashboard/automations`

**Spec reference:** §10.

**Files:**
- Create: `src/app/dashboard/automations/page.tsx`

The /automations page reuses the same primitives as the cockpit plus a new workflow-leaderboard table. The leaderboard goes inline in the page file (only used here, no reuse value).

- [ ] **Step 1: Create the page**

Write `src/app/dashboard/automations/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { NarrativeCard } from '../_components/narrative-card';
import { OPERATOR_RATE_USD_PER_HOUR } from '<npm>/lib/dashboard-alert-rules';
import { EmptyStateConnect } from '../_components/empty-state-connect';

type WorkflowRow = {
  name: string;
  runs_7d: number;
  success_pct: number;
  hours_saved_7d: number;
  status: 'healthy' | 'elevated' | 'failing';
};

type WorkflowHealthResp = {
  status: 'ok' | 'not_enrolled' | 'unavailable' | string;
  workflows?: Array<{
    name?: string;
    runs_7d?: number;
    success_runs_7d?: number;
    hours_saved_7d?: number;
    error_rate_7d?: number;
    last_run_status?: string;
  }>;
};

type RoiResp = {
  status?: string;
  data?: { overview?: { hours_saved_7d?: number; executions_7d?: number; success_rate_7d?: number; incidents_caught_7d?: number } };
};

export default function AutomationsPage() {
  return (
    <div className="flex flex-col gap-3.5">
      <Topbar />
      <Kpis />
      <div className="grid grid-cols-[3fr_2fr] gap-3">
        <NarrativeCard section="automations" persona="coo" title="This week, at a glance" />
        <IncidentsPanel />
      </div>
      <Leaderboard />
    </div>
  );
}

function Topbar() {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
      <div className="text-[12.5px] text-[var(--color-fg-muted)]">Dashboard / <span className="font-semibold text-[var(--color-fg)]">Automations</span></div>
      <span className="inline-flex items-center gap-1.5 text-[10.5px] text-[var(--color-fg-subtle)]">
        <span className="block size-1.5 rounded-full bg-[var(--color-success)] shadow-[0_0_5px_rgba(74,222,128,0.7)]" />
        Live
      </span>
    </div>
  );
}

function Kpis() {
  const [roi, setRoi] = useState<RoiResp | null>(null);
  useEffect(() => {
    fetch('/api/dashboard/automation-roi').then((r) => r.json()).then(setRoi).catch(() => setRoi({ status: 'error' }));
  }, []);
  const ov = roi?.data?.overview;
  return (
    <div className="grid grid-cols-4 gap-2.5">
      <Kpi label="Time saved · 7d"   value={ov?.hours_saved_7d   != null ? `${Math.round(ov.hours_saved_7d)}h` : '—'} />
      <Kpi label="Executions · 7d"   value={ov?.executions_7d    != null ? ov.executions_7d.toLocaleString()   : '—'} />
      <Kpi label="Success rate · 7d" value={ov?.success_rate_7d  != null ? `${ov.success_rate_7d.toFixed(1)}%` : '—'} />
      <Kpi label="Caught · 7d"       value={ov?.incidents_caught_7d != null ? String(ov.incidents_caught_7d)    : '—'} />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
      <div className="mb-1.5 text-[9.5px] font-medium uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">{label}</div>
      <div className="text-[20px] font-bold leading-none tracking-[-0.02em] text-[var(--color-fg)]">{value}</div>
    </div>
  );
}

type Incident = { when: string; message: string; recovered: boolean };

function IncidentsPanel() {
  const [items, setItems] = useState<Incident[] | null>(null);
  useEffect(() => {
    fetch('/api/dashboard/workflow-health').then((r) => r.json()).then((j: WorkflowHealthResp) => {
      if (!j.workflows) return setItems([]);
      const out: Incident[] = [];
      // Synthesize incidents from workflow last_run_status. Sites can expand later.
      for (const w of j.workflows) {
        if (w.last_run_status && w.last_run_status !== 'ok' && w.name) {
          out.push({ when: new Date().toISOString(), message: `${w.name} · ${w.last_run_status}`, recovered: false });
        }
      }
      setItems(out.slice(0, 5));
    }).catch(() => setItems([]));
  }, []);

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--color-fg-muted)]">Recent incidents</h3>
      {items === null ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">No incidents in the last 24 hours.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((i, idx) => (
            <li key={idx} className="flex items-center gap-3 border-b border-[var(--color-border)] py-1.5 last:border-b-0">
              <span className="text-[12.5px] text-[var(--color-fg-muted)] flex-1">{i.message}</span>
              <span className={`rounded-[3px] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${i.recovered ? 'bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)]' : 'bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)] text-[var(--color-danger)]'}`}>
                {i.recovered ? 'recovered' : 'needs you'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Leaderboard() {
  const [rows, setRows] = useState<WorkflowRow[] | null>(null);
  const [notEnrolled, setNotEnrolled] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard/workflow-health').then((r) => r.json()).then((j: WorkflowHealthResp) => {
      if (j.status === 'not_enrolled') {
        setNotEnrolled(true);
        return;
      }
      const out: WorkflowRow[] = (j.workflows ?? []).flatMap((w) => {
        if (!w.name || typeof w.runs_7d !== 'number') return [];
        const successPct = (w.runs_7d > 0 && typeof w.success_runs_7d === 'number')
          ? (w.success_runs_7d / w.runs_7d) * 100
          : 0;
        const errRate = w.error_rate_7d ?? (100 - successPct);
        const status: WorkflowRow['status'] = errRate >= 10 ? 'failing' : errRate >= 2 ? 'elevated' : 'healthy';
        return [{
          name: w.name,
          runs_7d: w.runs_7d,
          success_pct: successPct,
          hours_saved_7d: w.hours_saved_7d ?? 0,
          status,
        }];
      });
      out.sort((a, b) => b.hours_saved_7d - a.hours_saved_7d);
      setRows(out);
    }).catch(() => setRows([]));
  }, []);

  if (notEnrolled) {
    return <EmptyStateConnect tool="Automations" toolSlug="n8n" description="Your automations aren't enrolled in OpsRadar yet. Contact your account manager to get connected." />;
  }

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--color-fg-muted)]">Workflow leaderboard · last 7d</h3>
      {rows === null ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">No workflow data yet.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Workflow', 'Runs', 'Success', 'Hours saved', '$ saved', 'Status'].map((h) => (
                <th key={h} className="border-b border-[var(--color-border)] pb-2 text-left text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const dollars = r.hours_saved_7d * OPERATOR_RATE_USD_PER_HOUR;
              const pillCls = r.status === 'healthy'
                ? 'bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)]'
                : r.status === 'elevated'
                ? 'bg-[color-mix(in_srgb,var(--color-warn)_14%,transparent)] text-[var(--color-warn)]'
                : 'bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)] text-[var(--color-danger)]';
              return (
                <tr key={r.name} className="border-b border-[var(--color-border)] last:border-b-0">
                  <td className="py-2 text-body-sm font-medium text-[var(--color-fg)]">{r.name}</td>
                  <td className="py-2 text-[12.5px] text-[var(--color-fg-muted)]">{r.runs_7d.toLocaleString()}</td>
                  <td className="py-2 text-[12.5px] text-[var(--color-fg-muted)]">{r.success_pct.toFixed(1)}%</td>
                  <td className="py-2 text-[12.5px] text-[var(--color-fg-muted)]">{r.hours_saved_7d.toFixed(1)}h</td>
                  <td className="py-2 text-[12.5px] font-semibold text-[var(--color-fg)]">${Math.round(dollars).toLocaleString()}</td>
                  <td className="py-2">
                    <span className={`rounded-[3px] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${pillCls}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run lint && npm run build`
Expected: passes.

- [ ] **Step 3: Manual verification**

Run `npm run dev`. Visit `/dashboard/automations`.
Expected:
- Breadcrumb "Dashboard / Automations" at top.
- 4 KPI cards.
- Narrative card (left) + incidents panel (right).
- Workflow leaderboard table OR not-enrolled empty state.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/automations/page.tsx
git commit -m "feat(dashboard): add /dashboard/automations COO deep-dive

KPI row (Time saved / Executions / Success / Caught) + COO-tuned
NarrativeCard + Recent incidents panel + Workflow leaderboard
sorted by hours-saved descending. Renders not-enrolled empty
state when chatv2 mapping is absent. Spec §10.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 19: New page — `/dashboard/business`

**Spec reference:** §11.

**Files:**
- Create: `src/app/dashboard/business/page.tsx`

- [ ] **Step 1: Create the page**

Write `src/app/dashboard/business/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { NarrativeCard } from '../_components/narrative-card';
import { EmptyStateConnect } from '../_components/empty-state-connect';

type AlertsResp = { status: string; alerts?: Array<{ id: string; severity: 'needs-you' | 'watch' | 'heads-up'; label: string; message: string; href: string }> };

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
    </div>
  );
}

function Topbar() {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
      <div className="text-[12.5px] text-[var(--color-fg-muted)]">Dashboard / <span className="font-semibold text-[var(--color-fg)]">Business</span></div>
      <span className="inline-flex items-center gap-1.5 text-[10.5px] text-[var(--color-fg-subtle)]">
        <span className="block size-1.5 rounded-full bg-[var(--color-success)] shadow-[0_0_5px_rgba(74,222,128,0.7)]" />
        Live
      </span>
    </div>
  );
}

function Kpis() {
  const [fin, setFin] = useState<unknown>(null);
  const [sales, setSales] = useState<unknown>(null);
  const [mkt, setMkt] = useState<unknown>(null);

  useEffect(() => {
    fetch('/api/dashboard/finance').then((r) => r.json()).then(setFin).catch(() => {});
    fetch('/api/dashboard/sales-live').then((r) => r.json()).then(setSales).catch(() => {});
    fetch('/api/dashboard/marketing').then((r) => r.json()).then(setMkt).catch(() => {});
  }, []);

  const mrr      = (fin   as { data?: { mrr_usd?: number } })?.data?.mrr_usd;
  const pipeline = (sales as { data?: { pipeline_value_usd?: number } })?.data?.pipeline_value_usd;
  const prospects = (mkt  as { data?: { apollo?: { prospects_7d?: number } } })?.data?.apollo?.prospects_7d;
  const calls    = (mkt   as { data?: { calendly?: { bookings_7d?: number } } })?.data?.calendly?.bookings_7d;

  return (
    <div className="grid grid-cols-4 gap-2.5">
      <Kpi label="MRR"                value={typeof mrr === 'number'       ? fmtMoney(mrr)      : '—'} />
      <Kpi label="Active pipeline"    value={typeof pipeline === 'number'  ? fmtMoney(pipeline) : '—'} />
      <Kpi label="New prospects · 7d" value={typeof prospects === 'number' ? String(prospects)  : '—'} />
      <Kpi label="Booked calls · 7d"  value={typeof calls === 'number'     ? String(calls)      : '—'} />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
      <div className="mb-1.5 text-[9.5px] font-medium uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">{label}</div>
      <div className="text-[20px] font-bold leading-none tracking-[-0.02em] text-[var(--color-fg)]">{value}</div>
    </div>
  );
}

function BusinessAlerts() {
  const [resp, setResp] = useState<AlertsResp | null>(null);
  useEffect(() => {
    fetch('/api/dashboard/alerts').then((r) => r.json()).then(setResp).catch(() => setResp({ status: 'unavailable' }));
  }, []);
  // Filter to business-side alerts only — alerts whose href starts with /dashboard/business
  // OR /dashboard/integrations?tool=stripe|hubspot (auth issues for biz tools).
  const all = resp?.alerts ?? [];
  const items = all.filter((a) => a.href.startsWith('/dashboard/business') || /tool=(stripe|hubspot|apollo|calendly)/.test(a.href)).slice(0, 5);
  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--color-fg-muted)]">Current alerts</h3>
      {resp === null ? <p className="text-body-sm text-[var(--color-fg-subtle)]">Loading…</p>
       : items.length === 0 ? <p className="text-body-sm text-[var(--color-fg-subtle)]">All clear.</p>
       : <ul className="space-y-1.5">
           {items.map((a) => <li key={a.id} className="border-b border-[var(--color-border)] py-1.5 last:border-b-0 text-[12.5px] text-[var(--color-fg-muted)]"><span className="font-semibold text-[var(--color-fg)]">{a.label}:</span> {a.message}</li>)}
         </ul>}
    </div>
  );
}

// ============================================================
// Per-tool sections. Each calls one upstream and degrades to
// EmptyStateConnect when not connected.
// ============================================================

function RevenueSection() {
  return <ToolSection
    title="Revenue (Stripe)"
    endpoint="/api/dashboard/finance"
    tool="Stripe"
    toolSlug="stripe"
    renderConnected={(data) => {
      const d = data as { data?: { mrr_usd?: number; last_30d_gross_usd?: number; top_customer?: string; churn_this_month?: number; recent_charges?: Array<{ customer?: string; amount?: number; created?: string }> } };
      return (
        <>
          <div className="mb-3 grid grid-cols-4 gap-2">
            <StatMini label="MRR"           value={fmtMoney(d.data?.mrr_usd ?? 0)} />
            <StatMini label="Last 30d"      value={fmtMoney(d.data?.last_30d_gross_usd ?? 0)} />
            <StatMini label="Top customer"  value={d.data?.top_customer ?? '—'} />
            <StatMini label="Churn / mo"    value={d.data?.churn_this_month != null ? String(d.data.churn_this_month) : '—'} />
          </div>
          <DrillTable cols={['Customer', 'Amount', 'Date']} rows={(d.data?.recent_charges ?? []).slice(0, 10).map((c) => [c.customer ?? '—', c.amount != null ? fmtMoney(c.amount) : '—', c.created ?? '—'])} />
        </>
      );
    }}
  />;
}

function PipelineSection() {
  return <ToolSection
    title="Sales pipeline (HubSpot)"
    endpoint="/api/dashboard/sales-live"
    tool="HubSpot"
    toolSlug="hubspot"
    renderConnected={(data) => {
      const d = data as { data?: { open_deals?: number; pipeline_value_usd?: number; win_rate_pct?: number; stuck_deals?: number; open_deals_detail?: Array<{ name?: string; stage?: string; amount_usd?: number; days_in_stage?: number }> } };
      return (
        <>
          <div className="mb-3 grid grid-cols-4 gap-2">
            <StatMini label="Open deals"  value={d.data?.open_deals != null ? String(d.data.open_deals) : '—'} />
            <StatMini label="Pipeline $"  value={fmtMoney(d.data?.pipeline_value_usd ?? 0)} />
            <StatMini label="Win rate"    value={d.data?.win_rate_pct != null ? `${d.data.win_rate_pct.toFixed(1)}%` : '—'} />
            <StatMini label="Stuck deals" value={d.data?.stuck_deals != null ? String(d.data.stuck_deals) : '—'} />
          </div>
          <DrillTable cols={['Deal', 'Stage', 'Value', 'Days stuck']} rows={(d.data?.open_deals_detail ?? []).slice(0, 10).map((dl) => [dl.name ?? '—', dl.stage ?? '—', dl.amount_usd != null ? fmtMoney(dl.amount_usd) : '—', dl.days_in_stage != null ? `${dl.days_in_stage}d` : '—'])} />
        </>
      );
    }}
  />;
}

function ProspectsSection() {
  return <ToolSection
    title="Prospects (Apollo)"
    endpoint="/api/dashboard/marketing"
    tool="Apollo"
    toolSlug="apollo"
    statusKey="apollo"
    renderConnected={(data) => {
      const d = (data as { data?: { apollo?: { prospects_7d?: number; enriched_7d?: number; replied_7d?: number; recent_prospects?: Array<{ name?: string; company?: string; status?: string }> } } })?.data?.apollo;
      return (
        <>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <StatMini label="Added · 7d"    value={d?.prospects_7d != null ? String(d.prospects_7d) : '—'} />
            <StatMini label="Enriched · 7d" value={d?.enriched_7d  != null ? String(d.enriched_7d)  : '—'} />
            <StatMini label="Replied · 7d"  value={d?.replied_7d   != null ? String(d.replied_7d)   : '—'} />
          </div>
          <DrillTable cols={['Name', 'Company', 'Status']} rows={(d?.recent_prospects ?? []).slice(0, 10).map((p) => [p.name ?? '—', p.company ?? '—', p.status ?? '—'])} />
        </>
      );
    }}
  />;
}

function BookingsSection() {
  return <ToolSection
    title="Bookings (Calendly)"
    endpoint="/api/dashboard/marketing"
    tool="Calendly"
    toolSlug="calendly"
    statusKey="calendly"
    renderConnected={(data) => {
      const d = (data as { data?: { calendly?: { bookings_7d?: number; no_shows_7d?: number; upcoming_7d?: number; conversion_pct?: number; recent_bookings?: Array<{ invitee?: string; start_time?: string; source?: string }> } } })?.data?.calendly;
      return (
        <>
          <div className="mb-3 grid grid-cols-4 gap-2">
            <StatMini label="Booked · 7d"   value={d?.bookings_7d   != null ? String(d.bookings_7d)   : '—'} />
            <StatMini label="No-shows · 7d" value={d?.no_shows_7d   != null ? String(d.no_shows_7d)   : '—'} />
            <StatMini label="Upcoming · 7d" value={d?.upcoming_7d   != null ? String(d.upcoming_7d)   : '—'} />
            <StatMini label="Conversion"    value={d?.conversion_pct != null ? `${d.conversion_pct.toFixed(1)}%` : '—'} />
          </div>
          <DrillTable cols={['Invitee', 'Time', 'Source']} rows={(d?.recent_bookings ?? []).slice(0, 10).map((b) => [b.invitee ?? '—', b.start_time ?? '—', b.source ?? '—'])} />
        </>
      );
    }}
  />;
}

type ToolSectionProps = {
  title: string;
  endpoint: string;
  tool: string;
  toolSlug: string;
  /** When endpoint returns a unified marketing payload, key into data[statusKey] to detect presence. */
  statusKey?: 'apollo' | 'calendly';
  renderConnected: (data: unknown) => React.ReactNode;
};

function ToolSection({ title, endpoint, tool, toolSlug, statusKey, renderConnected }: ToolSectionProps) {
  const [state, setState] = useState<'loading' | 'connected' | 'not-connected' | 'error'>('loading');
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(endpoint).then((res) => {
      if (res.status === 503) { if (!cancelled) setState('not-connected'); return null; }
      return res.json();
    }).then((j) => {
      if (cancelled || j === null) return;
      const status = (j as { status?: string })?.status;
      if (status === 'not_configured' || status === 'not_enrolled') return setState('not-connected');
      if (status === 'error') return setState('error');
      if (statusKey) {
        const sub = (j as { data?: Record<string, unknown> })?.data?.[statusKey];
        if (!sub) return setState('not-connected');
      }
      setData(j);
      setState('connected');
    }).catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [endpoint, statusKey]);

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--color-fg-muted)]">{title}</h3>
      {state === 'loading'      ? <p className="text-body-sm text-[var(--color-fg-subtle)]">Loading…</p>
       : state === 'not-connected' ? <EmptyStateConnect tool={tool} toolSlug={toolSlug} />
       : state === 'error'      ? <p className="text-body-sm text-[var(--color-fg-subtle)]">Couldn't reach {tool}. We'll retry shortly.</p>
       : renderConnected(data)}
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[15px] font-semibold text-[var(--color-fg)]">{value}</div>
      <div className="text-[9px] uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">{label}</div>
    </div>
  );
}

function DrillTable({ cols, rows }: { cols: string[]; rows: string[][] }) {
  if (rows.length === 0) return <p className="text-body-sm text-[var(--color-fg-subtle)]">No rows yet.</p>;
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>{cols.map((c) => <th key={c} className="border-b border-[var(--color-border)] pb-2 text-left text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">{c}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => <tr key={i} className="border-b border-[var(--color-border)] last:border-b-0">
          {r.map((cell, j) => <td key={j} className="py-2 text-[12.5px] text-[var(--color-fg-muted)]">{cell}</td>)}
        </tr>)}
      </tbody>
    </table>
  );
}

function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run lint && npm run build`
Expected: passes.

- [ ] **Step 3: Manual verification**

Run `npm run dev`. Visit `/dashboard/business`.
Expected:
- Breadcrumb "Dashboard / Business".
- 4 KPI cards.
- CEO narrative card (left) + business alerts panel (right).
- 4 per-tool sections stacked: Revenue / Pipeline / Prospects / Bookings.
- Each section either shows real data or an EmptyStateConnect card.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/business/page.tsx
git commit -m "feat(dashboard): add /dashboard/business CEO deep-dive

KPI row + CEO-tuned NarrativeCard + business alerts panel
(filtered subset of /api/dashboard/alerts) + 4 per-tool sections
(Stripe, HubSpot, Apollo, Calendly). Each section renders either
its connected payload or an inline EmptyStateConnect. Spec §11.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 20: Final cleanup, redirects, and full verification

**Files:**
- Modify (optional): `next.config.ts` — add 301 redirects for deleted/moved URLs

- [ ] **Step 1: Search for lingering references to deleted/moved routes**

Run:
```bash
cd /home/lawand/Desktop/my-startup/opsradar
grep -rn "dashboard/settings/integrations\|dashboard/workflow-health\|dashboard/clients\|dashboard/financials\|dashboard/projects\|dashboard/reports\|dashboard/tasks\|dashboard/team\|dashboard/time-tracking" src/ --include="*.ts" --include="*.tsx"
```
Expected: no results. (Sidebar was already cleaned; any stragglers in components, emails, dialogs should now be updated to the new paths.)

If matches remain, patch each and recompile.

- [ ] **Step 2: Add 301 redirects for old URLs**

Open `next.config.ts`. Look for an existing `redirects()` async function. If one exists, append; if not, add it. The shape:

```ts
async redirects() {
  return [
    { source: '/dashboard/settings/integrations', destination: '/dashboard/integrations', permanent: true },
    { source: '/dashboard/workflow-health',       destination: '/dashboard/automations',  permanent: true },
    { source: '/dashboard/clients',               destination: '/dashboard',              permanent: true },
    { source: '/dashboard/financials',            destination: '/dashboard/business',     permanent: true },
    { source: '/dashboard/projects',              destination: '/dashboard',              permanent: true },
    { source: '/dashboard/reports',               destination: '/dashboard',              permanent: true },
    { source: '/dashboard/tasks',                 destination: '/dashboard',              permanent: true },
    { source: '/dashboard/team',                  destination: '/dashboard',              permanent: true },
    { source: '/dashboard/time-tracking',         destination: '/dashboard',              permanent: true },
    { source: '/dashboard/settings',              destination: '/dashboard/integrations', permanent: true },
  ];
},
```

- [ ] **Step 3: Verify the full build passes**

Run: `npm run lint && npm run build`
Expected: passes with zero warnings about unused imports from the old page.tsx. (The unused `<npm>/components/dashboard/*` files are still in the tree — leave them; they may still be used by other surfaces or can be cleaned up in a separate sweep.)

- [ ] **Step 4: Run the full test plan from spec §16**

Manually run all 14 steps from the spec's test plan. Note any failures.

- [ ] **Step 5: Commit cleanup**

```bash
git add -A
git commit -m "chore(dashboard): 301 redirects for deleted/moved routes

Old URLs (settings/integrations, workflow-health, clients, etc.)
now permanent-redirect to their new homes. Any straggling code
references swept.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 6: Final summary commit (optional)**

If anything else was touched during the test-plan run, commit it now. Otherwise the redesign is done.

---

## Done

When all 20 tasks above are committed, the dashboard redesign is complete. The 4-route auth-gated cockpit is live, the 8 dead routes are gone, FALLBACK_METRICS is deleted, AI narrative + cross-pillar activity + integration health + alerts ribbon are all real. No fake data renders to any logged-in customer.

Per spec §17, the highest-likelihood post-ship risk is that a customer with zero integrations connected experiences a "Connect X" cockpit — the three-state empty-state pattern is what turns that into guided onboarding rather than a sad first impression.

## Self-review notes

1. **Spec coverage:** Every section of the spec is implemented somewhere — §6 design principles enforced via the 7 deletions and the absence of customization affordances; §7 routes match the 4-route tree built in Tasks 3, 4, 17, 18, 19; §8 auth gate is Task 1; §9 cockpit covered by Tasks 11–17; §10 automations is Task 18; §11 business is Task 19; §12 empty states is Task 8 (primitive) used in Tasks 11, 17, 18, 19; §13 fallback behavior is Task 9 (primitive — note: the cockpit components mostly render inline soft-error copy rather than calling WidgetFallback directly; that's an intentional simplification — a follow-up task could wire WidgetFallback into KPI/section cards uniformly if the inline copy proves insufficient); §13.1–13.2 new APIs are Tasks 6, 7; §15 file inventory matches Tasks 1–19; §16 test plan is run in Task 20.

2. **Placeholder scan:** No TBDs, no "implement later", no "similar to Task N" — every step has concrete code. Adapter field-name caveats in Tasks 7 and 11 are flagged explicitly so the implementer audits upstream shapes (not a placeholder; it's a required verification step against existing routes whose internals are stable but uninspected during plan-writing).

3. **Type consistency:** `DashboardAlert`, `AlertSeverity`, `OPERATOR_RATE_USD_PER_HOUR`, `STUCK_DEAL_DAYS`, `STUCK_DEAL_MIN_VALUE_USD`, `MAX_COCKPIT_ALERTS`, and the rule function signatures are defined in Task 5 and referenced consistently in Tasks 12, 13, 18, 19. The cockpit/KPI component prop shapes (`KpiState`, `FetchResult`) are local to Task 11. `NarrativeResponse` is used consistently between Tasks 6 and 10.

4. **Scope check:** This is one cohesive change — replacing the dashboard. It's at the upper end of what a single plan should cover (20 tasks, ~2 days of focused work for one engineer), but every task is independently shippable and reviewable, and decomposing further would force premature integration points. Acceptable scope.
