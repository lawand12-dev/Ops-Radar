# AI COO Briefings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Weekly AI-generated COO briefing delivered to each user via email on Monday mornings, plus an in-app BriefingInbox component on the dashboard that shows the last 4 briefings with unread indicators.

**Architecture:** A `briefings` Supabase table stores generated briefings per user. A `generateBriefingForUser()` server-side function builds a data snapshot from the user's connected Stripe/Harvest credentials, calls GPT-4o for structured output, stores the result, and optionally sends a Resend email. The Monday cron calls this for all users with connected integrations. The on-demand API lets the dashboard trigger fresh generation. The `BriefingInbox` component fetches stored briefings from the DB and renders them with expand/collapse.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (service-role + RLS), GPT-4o JSON mode, Resend, Redis (read-through cache from profitability), Vercel Cron

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/briefing.ts` | Types, GPT-4o prompt, snapshot builder, `generateBriefingForUser` |
| Create | `src/lib/emails/weekly-briefing-email.ts` | Dark HTML email builder for briefing |
| Create | `src/app/api/dashboard/briefing/route.ts` | GET list + POST generate + PATCH mark-read |
| Create | `src/app/api/dashboard/alerts-rules/route.ts` | Deterministic rule evaluator against profitability data |
| Create | `src/app/api/cron/weekly-briefing/route.ts` | Monday 8am cron — loops users, generates + emails |
| Create | `src/app/dashboard/_components/briefing-inbox.tsx` | BriefingInbox client component |
| Modify | `src/app/dashboard/page.tsx` | Add `<BriefingInbox />` |
| Modify | `src/app/dashboard/_components/sidebar.tsx` | Add unread dot on Overview nav item |
| Modify | `src/app/dashboard/settings/page.tsx` | Add "Weekly briefing email" toggle |
| Modify | `vercel.json` | Add weekly-briefing cron schedule |

---

## Task 1: Supabase — Create `briefings` Table

**Files:**
- Run SQL in Supabase

- [ ] **Step 1: Run migration via Supabase MCP `apply_migration`**

Use the `mcp__claude_ai_Supabase__apply_migration` tool with project `nbdcrmepvwbfbcjqfubr` and this SQL:

```sql
CREATE TABLE IF NOT EXISTS briefings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind           text NOT NULL DEFAULT 'weekly',
  health_score   smallint,
  attention      jsonb,
  win            text,
  recommendation text,
  email_sent     boolean NOT NULL DEFAULT false,
  read_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "briefings_owner" ON briefings
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS briefings_user_created_at
  ON briefings (user_id, created_at DESC);
```

- [ ] **Step 2: Verify the table exists**

Run in Supabase SQL Editor or via `execute_sql`:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'briefings' ORDER BY ordinal_position;
```
Expected: 10 rows (id, user_id, kind, health_score, attention, win, recommendation, email_sent, read_at, created_at).

- [ ] **Step 3: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add -A
git commit -m "feat(briefings): add briefings table with RLS"
```

---

## Task 2: Core briefing library

**Files:**
- Create: `src/lib/briefing.ts`

- [ ] **Step 1: Write `src/lib/briefing.ts`**

```typescript
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { openai } from '<npm>/lib/openai';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { fetchStripePerClientRevenue } from '<npm>/lib/integrations/stripe/profitability-adapter';
import { fetchHarvestPerClientHours } from '<npm>/lib/integrations/harvest/profitability-adapter';
import { computeClientProfitability } from '<npm>/lib/profitability';

export type AttentionItem = {
  priority: 1 | 2 | 3;
  text: string;
  kind: 'alert' | 'warning' | 'info';
};

export type BriefingContent = {
  health_score: number;
  attention: AttentionItem[];
  win: string;
  recommendation: string;
};

export type StoredBriefing = BriefingContent & {
  id: string;
  user_id: string;
  kind: 'weekly' | 'manual';
  email_sent: boolean;
  read_at: string | null;
  created_at: string;
};

function buildPrompt(snapshot: Record<string, unknown>): string {
  return `You are the COO of a marketing/AI agency. Based on this week's operational data, generate an executive briefing.

Return STRICT JSON with this exact shape:
{
  "health_score": <0-100 integer>,
  "attention": [
    { "priority": 1, "text": "<max 2 sentences>", "kind": "<alert|warning|info>" },
    { "priority": 2, "text": "<max 2 sentences>", "kind": "<alert|warning|info>" },
    { "priority": 3, "text": "<max 2 sentences>", "kind": "<alert|warning|info>" }
  ],
  "win": "<1 sentence positive signal from this week>",
  "recommendation": "<1 specific action to take today, completable in under 30 minutes>"
}

Rules:
- health_score: 100 = everything green, 0 = everything on fire. Heavily weight overdue invoices, negative margins, and workflow failures.
- attention: sorted urgency-first (alert > warning > info). Never invent numbers not present in the data.
- win: name the single most positive signal. If nothing is clearly positive, name the most stable area.
- recommendation: name specific clients or workflows when the data supports it.
- Style: direct English, no jargon, no emojis, no markdown.

DATA (this week):
${JSON.stringify(snapshot, null, 2)}`;
}

async function buildSnapshotForUser(
  userId: string,
  blendedRate: number,
): Promise<Record<string, unknown>> {
  const supabase = getServerSupabaseClient();
  const { data: rows } = await supabase
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .in('tool', ['stripe', 'harvest']);

  const stripe = (rows ?? []).find(r => r.tool === 'stripe' && r.status === 'connected');
  const harvest = (rows ?? []).find(r => r.tool === 'harvest' && r.status === 'connected');
  const snapshot: Record<string, unknown> = {};

  try {
    if (stripe && harvest) {
      const [stripeData, harvestData] = await Promise.all([
        fetchStripePerClientRevenue(decryptApiKey(stripe)),
        fetchHarvestPerClientHours(decryptApiKey(harvest)),
      ]);
      snapshot.profitability = computeClientProfitability(stripeData, harvestData, blendedRate);
    } else if (stripe) {
      snapshot.stripe_revenue = await fetchStripePerClientRevenue(decryptApiKey(stripe));
    } else if (harvest) {
      snapshot.harvest_hours = await fetchHarvestPerClientHours(decryptApiKey(harvest));
    }
  } catch (err) {
    console.warn('[briefing] snapshot partial failure:', err);
  }

  return snapshot;
}

export async function generateBriefingForUser(
  userId: string,
  blendedRate: number,
  kind: 'weekly' | 'manual',
): Promise<StoredBriefing | null> {
  const snapshot = await buildSnapshotForUser(userId, blendedRate);
  if (Object.keys(snapshot).length === 0) return null;

  let content: BriefingContent;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are an executive briefing assistant. Output strict JSON only.' },
        { role: 'user',   content: buildPrompt(snapshot) },
      ],
      temperature: 0.3,
    });
    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.health_score !== 'number' ||
      !Array.isArray(parsed.attention) ||
      typeof parsed.win !== 'string' ||
      typeof parsed.recommendation !== 'string'
    ) {
      throw new Error('malformed briefing shape');
    }
    content = parsed as BriefingContent;
  } catch (err) {
    console.warn('[briefing] GPT-4o failed for', userId, err);
    return null;
  }

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('briefings')
    .insert({
      user_id: userId,
      kind,
      health_score: content.health_score,
      attention: content.attention,
      win: content.win,
      recommendation: content.recommendation,
      email_sent: false,
    })
    .select()
    .single();

  if (error || !data) {
    console.warn('[briefing] DB insert failed for', userId, error);
    return null;
  }

  return data as StoredBriefing;
}
```

- [ ] **Step 2: Run tsc to verify zero errors**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```
Expected: no output (zero errors in source files).

- [ ] **Step 3: Commit**

```bash
git add src/lib/briefing.ts
git commit -m "feat(briefings): core briefing library with GPT-4o and snapshot builder"
```

---

## Task 3: Weekly briefing email builder

**Files:**
- Create: `src/lib/emails/weekly-briefing-email.ts`

- [ ] **Step 1: Write `src/lib/emails/weekly-briefing-email.ts`**

```typescript
import type { StoredBriefing, AttentionItem } from '<npm>/lib/briefing';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://opsradar.co';

function kindColor(kind: AttentionItem['kind']): string {
  if (kind === 'alert')   return '#ef4444';
  if (kind === 'warning') return '#f59e0b';
  return '#60a5fa';
}

function healthColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function attentionRow(item: AttentionItem): string {
  const dot = `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${kindColor(item.kind)};margin-right:10px;flex-shrink:0;margin-top:6px;"></span>`;
  return `<div style="display:flex;align-items:flex-start;margin-bottom:12px;">${dot}<p style="margin:0;font-size:14px;color:rgba(255,255,255,0.7);line-height:1.6;">${item.text}</p></div>`;
}

export function buildBriefingEmail(
  briefing: StoredBriefing,
  firstName: string,
): { subject: string; html: string } {
  const date = new Date(briefing.created_at).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  const score = briefing.health_score ?? 0;
  const color = healthColor(score);

  const subject = `${firstName ? firstName + ', your' : 'Your'} weekly ops briefing — ${date}`;

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#060c1e;color:#eef2ff;border-radius:14px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#0f1e45,#060c1e);padding:32px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.07);">
    <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.3);">OpsRadar · Weekly Briefing</p>
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#eef2ff;">Your ops snapshot${firstName ? ', ' + firstName : ''}</h1>
    <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.35);">${date}</p>
  </div>

  <div style="padding:28px 32px;">
    <!-- Health score -->
    <div style="background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.15);border-radius:12px;padding:20px;margin-bottom:24px;display:flex;align-items:center;gap:20px;">
      <div style="text-align:center;min-width:72px;">
        <p style="margin:0;font-size:42px;font-weight:800;color:${color};line-height:1;">${score}</p>
        <p style="margin:2px 0 0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.3);">Health</p>
      </div>
      <div style="flex:1;border-left:1px solid rgba(255,255,255,0.08);padding-left:20px;">
        <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.65);line-height:1.55;">${briefing.win}</p>
      </div>
    </div>

    <!-- Attention items -->
    <p style="margin:0 0 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.3);">3 Things to Watch</p>
    ${(briefing.attention ?? []).map(attentionRow).join('')}

    <!-- Recommendation -->
    <div style="background:rgba(59,130,246,0.07);border:1px solid rgba(59,130,246,0.2);border-left:3px solid #3b82f6;border-radius:0 10px 10px 0;padding:16px;margin:20px 0 24px;">
      <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.3);">Do This One Thing</p>
      <p style="margin:0;font-size:14px;color:#eef2ff;line-height:1.55;">${briefing.recommendation}</p>
    </div>

    <a href="${BASE_URL}/dashboard" style="display:block;text-align:center;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:16px;border-radius:12px;box-shadow:0 0 24px rgba(59,130,246,0.3);">View Full Dashboard →</a>
  </div>

  <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
    <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.15);">OpsRadar · <a href="${BASE_URL}" style="color:rgba(255,255,255,0.2);">opsradar.co</a></p>
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.12);">Manage email preferences in <a href="${BASE_URL}/dashboard/settings" style="color:rgba(255,255,255,0.2);">Dashboard Settings</a></p>
  </div>
</div>`;

  return { subject, html };
}
```

- [ ] **Step 2: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/emails/weekly-briefing-email.ts
git commit -m "feat(briefings): weekly briefing email HTML builder"
```

---

## Task 4: On-demand briefing API route

**Files:**
- Create: `src/app/api/dashboard/briefing/route.ts`

- [ ] **Step 1: Write `src/app/api/dashboard/briefing/route.ts`**

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { generateBriefingForUser, type StoredBriefing } from '<npm>/lib/briefing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_BLENDED_RATE = 85;
const MIN_REGEN_HOURS = 6;

// GET /api/dashboard/briefing?limit=4&unread_only=true
export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get('unread_only') === 'true';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '4'), 20);

  // Use session client — RLS ensures user only sees their own rows
  const supabase = await getSessionSupabaseClient();
  let query = supabase
    .from('briefings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.is('read_at', null);
    const { count, error } = await (supabase
      .from('briefings')
      .select('*', { count: 'exact', head: true })
      .is('read_at', null) as unknown as Promise<{ count: number | null; error: unknown }>);
    if (!error) return NextResponse.json({ count: count ?? 0 });
    return NextResponse.json({ count: 0 });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 });

  return NextResponse.json({ briefings: data ?? [] });
}

// POST /api/dashboard/briefing — generate a new briefing (throttled to 1 per 6h)
export async function POST(): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = getServerSupabaseClient();

  // Throttle: check if a briefing was generated in the last MIN_REGEN_HOURS
  const threshold = new Date(Date.now() - MIN_REGEN_HOURS * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from('briefings')
    .select('id, created_at')
    .eq('user_id', userId)
    .gte('created_at', threshold)
    .limit(1);

  if (recent && recent.length > 0) {
    return NextResponse.json({ error: 'too_soon', next_allowed_at: recent[0].created_at }, { status: 429 });
  }

  // Get blended rate from user metadata
  const sessionSupabase = await getSessionSupabaseClient();
  const { data: userData } = await sessionSupabase.auth.getUser();
  const meta = (userData?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const blendedRate = typeof meta.blended_hourly_rate_usd === 'number'
    ? meta.blended_hourly_rate_usd
    : DEFAULT_BLENDED_RATE;

  const briefing = await generateBriefingForUser(userId, blendedRate, 'manual');
  if (!briefing) {
    return NextResponse.json({ error: 'generation_failed' }, { status: 503 });
  }

  return NextResponse.json({ briefing });
}

// PATCH /api/dashboard/briefing — mark briefing(s) as read
// Body: { ids: string[] }
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let ids: string[];
  try {
    const body = await request.json() as { ids?: unknown };
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: 'ids required' }, { status: 400 });
    }
    ids = body.ids as string[];
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  // Use session client — RLS ensures user can only update their own rows
  const supabase = await getSessionSupabaseClient();
  const { error } = await supabase
    .from('briefings')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('id', ids)
    .is('read_at', null);

  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/briefing/route.ts
git commit -m "feat(briefings): on-demand briefing API (GET/POST/PATCH)"
```

---

## Task 5: Alert rules evaluator API

**Files:**
- Create: `src/app/api/dashboard/alerts-rules/route.ts`

- [ ] **Step 1: Write `src/app/api/dashboard/alerts-rules/route.ts`**

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import type { ProfitabilityResult } from '<npm>/lib/profitability';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export type Alert = {
  kind: 'overdue_invoice' | 'negative_margin' | 'thin_margin' | 'workflow_failures';
  severity: 'alert' | 'warning';
  message: string;
  client?: string;
};

type AlertsResponse =
  | { status: 'ok'; alerts: Alert[] }
  | { status: 'unavailable'; message: string };

export async function GET(request: NextRequest): Promise<NextResponse<AlertsResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ status: 'unavailable', message: 'unauthorized' }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const cookieHeader = request.headers.get('cookie') ?? '';

  // Fetch profitability data (uses Redis cache if available)
  let profData: { status: string; data?: ProfitabilityResult } | null = null;
  try {
    const r = await fetch(`${origin}/api/dashboard/profitability`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });
    profData = await r.json() as { status: string; data?: ProfitabilityResult };
  } catch {
    // If profitability fetch fails, return empty alerts (not an error state)
  }

  const alerts: Alert[] = [];

  if (profData?.status === 'ok' && profData.data) {
    for (const client of profData.data.clients) {
      // Rule 1: Overdue invoice > 14 days AND revenue > $2,000
      if (
        client.payment_status === 'overdue' &&
        (client.days_overdue ?? 0) > 14 &&
        client.revenue_mtd > 2000
      ) {
        alerts.push({
          kind: 'overdue_invoice',
          severity: 'alert',
          message: `${client.name} has an invoice ${client.days_overdue} days overdue (${fmtMoney(client.revenue_mtd)}).`,
          client: client.name,
        });
      }

      // Rule 2: Negative margin (losing money on this client)
      if (client.hours_mtd > 0 && client.margin_pct < 0) {
        alerts.push({
          kind: 'negative_margin',
          severity: 'alert',
          message: `${client.name} is unprofitable this month: ${Math.round(client.margin_pct)}% margin.`,
          client: client.name,
        });
      }

      // Rule 3: Thin margin (<15%) on a significant client (>$1,000 revenue)
      if (client.hours_mtd > 0 && client.margin_pct >= 0 && client.margin_pct < 15 && client.revenue_mtd > 1000) {
        alerts.push({
          kind: 'thin_margin',
          severity: 'warning',
          message: `${client.name} margin is only ${Math.round(client.margin_pct)}% — consider reviewing scope or rate.`,
          client: client.name,
        });
      }
    }
  }

  return NextResponse.json({ status: 'ok', alerts });
}

function fmtMoney(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}
```

- [ ] **Step 2: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/alerts-rules/route.ts
git commit -m "feat(briefings): alert rules evaluator API"
```

---

## Task 6: Weekly briefing cron

**Files:**
- Create: `src/app/api/cron/weekly-briefing/route.ts`

- [ ] **Step 1: Write `src/app/api/cron/weekly-briefing/route.ts`**

```typescript
import { Resend } from 'resend';
import { getServerSupabaseClient, hasServerSupabaseClient } from '<npm>/lib/supabase-server';
import { serverErrorResponse } from '<npm>/lib/security';
import { generateBriefingForUser } from '<npm>/lib/briefing';
import { buildBriefingEmail } from '<npm>/lib/emails/weekly-briefing-email';

const resend = new Resend(process.env.RESEND_API_KEY);
const CRON_SECRET = process.env.CRON_SECRET;
const DEFAULT_BLENDED_RATE = 85;

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET) {
    console.error('[weekly-briefing cron] missing CRON_SECRET');
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

  const stats = { sent: 0, skipped: 0, errors: 0 };

  for (const userId of userIds) {
    try {
      const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(userId);
      if (userErr || !user?.email) { stats.skipped++; continue; }

      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

      // Respect opt-out (default: enabled)
      if (meta.weekly_briefing_enabled === false) { stats.skipped++; continue; }

      const blendedRate = typeof meta.blended_hourly_rate_usd === 'number'
        ? meta.blended_hourly_rate_usd
        : DEFAULT_BLENDED_RATE;

      const briefing = await generateBriefingForUser(userId, blendedRate, 'weekly');
      if (!briefing) { stats.skipped++; continue; }

      const firstName = (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? '';
      const { subject, html } = buildBriefingEmail(briefing, firstName);

      const { error: emailErr } = await resend.emails.send({
        from: 'OpsRadar <notifications@opsradar.co>',
        to: user.email,
        subject,
        html,
      });

      if (emailErr) {
        console.error('[weekly-briefing cron] email error for', userId, emailErr);
        stats.errors++;
        continue;
      }

      // Mark email as sent
      await supabase.from('briefings').update({ email_sent: true }).eq('id', briefing.id);
      stats.sent++;
    } catch (err) {
      console.error('[weekly-briefing cron] error for', userId, err);
      stats.errors++;
    }
  }

  console.log('[weekly-briefing cron] done', stats);
  return Response.json({ ok: true, stats });
}
```

- [ ] **Step 2: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/weekly-briefing/route.ts
git commit -m "feat(briefings): weekly briefing cron with Resend email delivery"
```

---

## Task 7: BriefingInbox component

**Files:**
- Create: `src/app/dashboard/_components/briefing-inbox.tsx`

- [ ] **Step 1: Write `src/app/dashboard/_components/briefing-inbox.tsx`**

```typescript
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { cn } from '<npm>/lib/utils';
import type { StoredBriefing, AttentionItem } from '<npm>/lib/briefing';

type FetchState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'ok'; briefings: StoredBriefing[]; unreadIds: string[] }
  | { kind: 'error' };

export function BriefingInbox() {
  const [state, setState] = useState<FetchState>({ kind: 'loading' });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const markedRead = useRef(false);

  const load = useCallback(() => {
    setState({ kind: 'loading' });
    markedRead.current = false;
    fetch('/api/dashboard/briefing?limit=4')
      .then(r => r.json())
      .then((data: { briefings?: StoredBriefing[] }) => {
        const briefings = data.briefings ?? [];
        if (briefings.length === 0) {
          setState({ kind: 'empty' });
        } else {
          const unreadIds = briefings.filter(b => !b.read_at).map(b => b.id);
          setState({ kind: 'ok', briefings, unreadIds });
          setExpandedIds(new Set([briefings[0].id]));
        }
      })
      .catch(() => setState({ kind: 'error' }));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Mark visible briefings as read after 2s
  useEffect(() => {
    if (state.kind !== 'ok' || state.unreadIds.length === 0 || markedRead.current) return;
    const timer = setTimeout(() => {
      markedRead.current = true;
      fetch('/api/dashboard/briefing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: state.unreadIds }),
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [state]);

  function toggle(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generate() {
    setGenerating(true);
    try {
      const r = await fetch('/api/dashboard/briefing', { method: 'POST' });
      if (r.ok) load();
      else if (r.status === 429) {
        // already generated recently — just reload to show latest
        load();
      }
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-xs)]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-label text-[var(--color-fg-muted)]">COO Briefings</h3>
          {state.kind === 'ok' && state.unreadIds.length > 0 && (
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-[var(--radius)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-1.5 py-0.5 text-label text-[var(--color-primary)]">
            <Sparkles size={9} strokeWidth={2} />
            AI · weekly
          </span>
          <button
            onClick={generate}
            disabled={generating}
            aria-label="Generate briefing"
            className="rounded-[var(--radius)] p-1 text-[var(--color-fg-subtle)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-fg)] disabled:opacity-40"
          >
            <RefreshCw size={13} className={generating ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {state.kind === 'loading' && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-[var(--color-surface-sunken)]" />
          ))}
        </div>
      )}

      {state.kind === 'error' && (
        <p className="text-body-sm italic text-[var(--color-fg-subtle)]">
          Briefings temporarily unavailable.
        </p>
      )}

      {state.kind === 'empty' && (
        <div className="text-center py-4">
          <p className="text-body-sm text-[var(--color-fg-subtle)]">
            No briefings yet. Connect Stripe or Harvest and click refresh to generate your first.
          </p>
          <button
            onClick={generate}
            disabled={generating}
            className="mt-3 rounded-[var(--radius)] bg-[var(--color-primary)] px-3 py-1.5 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {generating ? 'Generating…' : 'Generate Briefing'}
          </button>
        </div>
      )}

      {state.kind === 'ok' && (
        <div className="flex flex-col gap-2">
          {state.briefings.map((b, idx) => (
            <BriefingRow
              key={b.id}
              briefing={b}
              expanded={expandedIds.has(b.id)}
              isLatest={idx === 0}
              onToggle={() => toggle(b.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BriefingRow({
  briefing: b,
  expanded,
  isLatest,
  onToggle,
}: {
  briefing: StoredBriefing;
  expanded: boolean;
  isLatest: boolean;
  onToggle: () => void;
}) {
  const score = b.health_score ?? 0;
  const scoreColor =
    score >= 70
      ? 'text-[var(--color-success)]'
      : score >= 40
      ? 'text-[var(--color-warn)]'
      : 'text-[var(--color-error)]';
  const date = new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const isUnread = !b.read_at;

  return (
    <div className={cn(
      'rounded-[var(--radius-md)] border',
      isLatest
        ? 'border-[var(--color-border)] bg-[var(--color-surface-sunken)]'
        : 'border-[var(--color-border-subtle)] bg-transparent',
    )}>
      {/* Row header — always visible */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
      >
        {isUnread && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
        )}
        <span className={cn('text-[13px] font-semibold tabular-nums', scoreColor)}>
          {score}
        </span>
        <span className="flex-1 truncate text-body-sm text-[var(--color-fg-muted)]">
          {b.win ?? 'Weekly briefing'}
        </span>
        <span className="shrink-0 text-label text-[var(--color-fg-faint)]">{date}</span>
        {expanded
          ? <ChevronUp size={13} className="shrink-0 text-[var(--color-fg-subtle)]" />
          : <ChevronDown size={13} className="shrink-0 text-[var(--color-fg-subtle)]" />}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[var(--color-border-subtle)] px-3.5 pb-3.5 pt-3">
          {/* Attention items */}
          {(b.attention ?? []).length > 0 && (
            <div className="mb-3 space-y-2">
              {(b.attention as AttentionItem[]).map((item, i) => (
                <AttentionRow key={i} item={item} />
              ))}
            </div>
          )}

          {/* Recommendation */}
          {b.recommendation && (
            <div className="rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_5%,transparent)] px-3 py-2.5">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">Do This</p>
              <p className="text-body-sm text-[var(--color-fg)]">{b.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const dotColor =
    item.kind === 'alert'
      ? 'bg-[var(--color-error)]'
      : item.kind === 'warning'
      ? 'bg-[var(--color-warn)]'
      : 'bg-[var(--color-fg-subtle)]';

  return (
    <div className="flex items-start gap-2.5">
      <span className={cn('mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full', dotColor)} />
      <p className="text-body-sm leading-snug text-[var(--color-fg-muted)]">{item.text}</p>
    </div>
  );
}
```

- [ ] **Step 2: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/_components/briefing-inbox.tsx
git commit -m "feat(briefings): BriefingInbox component with expand/collapse and unread indicators"
```

---

## Task 8: Wiring — dashboard page, sidebar badge, settings toggle, vercel.json, build

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/_components/sidebar.tsx`
- Modify: `src/app/dashboard/settings/page.tsx`
- Modify: `vercel.json`

### 8a: Add BriefingInbox to dashboard page

- [ ] **Step 1: Edit `src/app/dashboard/page.tsx`**

Add the import after the existing imports:
```typescript
import { BriefingInbox } from './_components/briefing-inbox';
```

Add `<BriefingInbox />` after `<CockpitHeroNarrative />` in the JSX:
```tsx
<CockpitHeroNarrative />
<BriefingInbox />
<CockpitIntegrationHealth />
```

### 8b: Add unread dot to sidebar

- [ ] **Step 2: Edit `src/app/dashboard/_components/sidebar.tsx`**

Add `useEffect, useState` to the React import:
```typescript
import { useEffect, useState } from 'react';
```

Add inside the `Sidebar` component body (after `const pathname = usePathname()`):
```typescript
const [unreadBriefings, setUnreadBriefings] = useState(0);
useEffect(() => {
  fetch('/api/dashboard/briefing?unread_only=true')
    .then(r => r.json())
    .then((d: { count?: number }) => setUnreadBriefings(d.count ?? 0))
    .catch(() => {});
}, []);
```

In the nav link render, replace the `<Icon>` + `<span>` content for the `/dashboard` route to add the unread dot:
```tsx
<Icon size={16} strokeWidth={active ? 2 : 1.6} />
<span className={cn('text-[13.5px]', active ? 'font-semibold' : 'font-normal')}>
  {label}
</span>
{href === '/dashboard' && unreadBriefings > 0 && (
  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
)}
```

### 8c: Add weekly briefing toggle to settings

- [ ] **Step 3: Edit `src/app/dashboard/settings/page.tsx`**

Add to the `Profile` type:
```typescript
weekly_briefing_enabled: boolean;
```

Add state after `blendedRate` state:
```typescript
const [weeklyBriefing, setWeeklyBriefing] = useState(true);
```

In the `useEffect` where profile fields are set:
```typescript
setWeeklyBriefing(j.profile.weekly_briefing_enabled !== false);
```

Add to the PATCH body JSON:
```typescript
weekly_briefing_enabled: weeklyBriefing,
```

Add a field in the form, after the Blended hourly rate field:

```tsx
<Field label="Weekly briefing email">
  <label className="flex cursor-pointer items-center gap-2.5">
    <div
      onClick={() => setWeeklyBriefing(v => !v)}
      className={cn(
        'relative h-5 w-9 rounded-full transition-colors duration-150',
        weeklyBriefing ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-150',
          weeklyBriefing ? 'translate-x-4' : 'translate-x-0.5',
        )}
      />
    </div>
    <span className="text-[13px] text-[var(--color-fg-muted)]">
      Receive weekly COO briefing every Monday
    </span>
  </label>
</Field>
```

Also update the profile API to save `weekly_briefing_enabled`. In `src/app/api/profile/route.ts`:

In the `PatchBody` type, add:
```typescript
weekly_briefing_enabled?: unknown;
```

In the patch handler, after the `blended_hourly_rate_usd` block, add:
```typescript
if ('weekly_briefing_enabled' in body && typeof body.weekly_briefing_enabled === 'boolean') {
  updates.weekly_briefing_enabled = body.weekly_briefing_enabled;
}
```

Note: `updates` type already accepts `string | number` — extend it to `string | number | boolean`:
```typescript
const updates: Record<string, string | number | boolean> = {};
```

### 8d: Update vercel.json

- [ ] **Step 4: Edit `vercel.json`**

Add the weekly-briefing cron to the existing crons array:
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
    }
  ]
}
```

### 8e: Run tsc and build

- [ ] **Step 5: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```
Expected: no output.

- [ ] **Step 6: Run production build**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run build 2>&1 | tail -20
```
Expected: `✓ Compiled successfully` or similar. Zero type errors.

- [ ] **Step 7: Commit everything**

```bash
git add \
  src/app/dashboard/page.tsx \
  src/app/dashboard/_components/sidebar.tsx \
  src/app/dashboard/settings/page.tsx \
  src/app/api/profile/route.ts \
  vercel.json
git commit -m "feat(briefings): wire BriefingInbox to dashboard, sidebar badge, settings toggle, vercel cron"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Weekly digest (Monday 8am UTC) via Resend — Task 6 cron
- ✅ In-app notification center with last 4 briefings — Task 7 BriefingInbox
- ✅ Unread indicator on sidebar nav — Task 8b
- ✅ Health score 0–100 — in GPT-4o prompt and BriefingInbox rendering
- ✅ Top 3 things that need attention — `attention` array in BriefingContent
- ✅ Top win — `win` field
- ✅ One specific recommendation — `recommendation` field
- ✅ Alert rules: overdue invoice >14d/>$2k, negative margin, thin margin — Task 5
- ✅ Briefing generation extends narrative pattern — same GPT-4o + JSON mode architecture
- ✅ BriefingInbox replaces/augments NarrativeCard — added alongside it in dashboard
- ✅ User opt-out — `weekly_briefing_enabled` toggle in settings
- ✅ Persistent storage — `briefings` Supabase table with RLS

**Placeholder scan:** None. All tasks include complete code.

**Type consistency:**
- `StoredBriefing` defined in `src/lib/briefing.ts`, imported by `briefing-inbox.tsx` and `weekly-briefing-email.ts`
- `AttentionItem` defined in `src/lib/briefing.ts`, used in `briefing-inbox.tsx`
- `Alert` defined in `alerts-rules/route.ts` (local — not used in other files)
- `weekly_briefing_enabled` added to both `Profile` type in settings and `PatchBody` in profile API
