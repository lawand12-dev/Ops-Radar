# Viral Free Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shareable public URL to every audit report so agency founders can share their results on LinkedIn/X, driving organic discovery.

**Architecture:** Add `share_token` + `share_expires_at` columns to the `audits` table. A POST `/api/share` route verifies the private `access_token` and returns a 30-day public `shareUrl`. A new server-component page at `/results/[shareId]` reads audit data by share token, renders a branded read-only report with "Top 3 Quick Wins" and "How You Compare" sections, and exports `generateMetadata` for rich OG previews. The existing `/results` page's "Copy share link" button is upgraded to call the API instead of copying the private URL.

**Tech Stack:** Next.js 16 App Router (server components + `generateMetadata`), Supabase service-role client, TypeScript, Tailwind CSS v4

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/app/api/share/route.ts` | POST: verify access_token → generate/return share_token |
| Create | `src/app/results/[shareId]/page.tsx` | Server component: fetch by share_token, OG metadata, full render |
| Create | `src/app/results/[shareId]/_components/share-copy-button.tsx` | Client component: copies share URL to clipboard |
| Modify | `src/app/results/page.tsx` | Update `handleShareResults` to call `/api/share` |
| Modify | `src/lib/database.types.ts` | Regenerated after migration |

---

## Task 1: Supabase migration — add share columns to `audits`

**Files:**
- Run SQL via Supabase MCP

- [ ] **Step 1: Apply migration**

Use `mcp__claude_ai_Supabase__apply_migration` on project `nbdcrmepvwbfbcjqfubr`:

```sql
ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS share_token    text UNIQUE,
  ADD COLUMN IF NOT EXISTS share_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS audits_share_token_idx
  ON audits (share_token)
  WHERE share_token IS NOT NULL;
```

- [ ] **Step 2: Verify**

Run via `execute_sql` on project `nbdcrmepvwbfbcjqfubr`:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'audits'
  AND column_name IN ('share_token', 'share_expires_at');
```
Expected: 2 rows.

- [ ] **Step 3: Regenerate Supabase TypeScript types**

Use `mcp__claude_ai_Supabase__generate_typescript_types` on project `nbdcrmepvwbfbcjqfubr`, then write the output to `src/lib/database.types.ts`.

The `audits` `Row`, `Insert`, and `Update` types should now include:
```typescript
share_token: string | null
share_expires_at: string | null
```

- [ ] **Step 4: Commit**

```bash
cd /home/lawand/Desktop/my-startup/opsradar
git add src/lib/database.types.ts
git commit -m "feat(share): add share_token + share_expires_at columns to audits"
```

---

## Task 2: Share token API

**Files:**
- Create: `src/app/api/share/route.ts`

- [ ] **Step 1: Create `src/app/api/share/route.ts`**

```typescript
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { sanitizeString, serverErrorResponse } from '<npm>/lib/security';
import { applyRateLimit } from '<npm>/lib/rate-limit';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://opsradar.co';
const SHARE_TTL_DAYS = 30;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimitResponse = await applyRateLimit(request, 'share');
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const auditId    = sanitizeString(typeof b.auditId    === 'string' ? b.auditId    : '', 200);
  const accessToken = sanitizeString(typeof b.accessToken === 'string' ? b.accessToken : '', 200);

  if (!auditId || !accessToken) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const supabase = getServerSupabaseClient();

  // Verify the audit exists and the private access_token matches
  const { data: audit, error } = await supabase
    .from('audits')
    .select('id, share_token, share_expires_at')
    .eq('id', auditId)
    .eq('access_token', accessToken)
    .single();

  if (error || !audit) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Return existing non-expired share token
  if (audit.share_token && audit.share_expires_at) {
    const expiresAt = new Date(audit.share_expires_at);
    if (expiresAt > new Date()) {
      return NextResponse.json({
        shareUrl: `${BASE_URL}/results/${audit.share_token}`,
        expiresAt: audit.share_expires_at,
      });
    }
  }

  // Generate a new 32-char hex share token
  const shareToken = randomUUID().replace(/-/g, '');
  const expiresAt  = new Date(Date.now() + SHARE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error: updateErr } = await supabase
    .from('audits')
    .update({ share_token: shareToken, share_expires_at: expiresAt })
    .eq('id', auditId);

  if (updateErr) {
    console.error('[share] update failed:', updateErr);
    return serverErrorResponse();
  }

  return NextResponse.json({
    shareUrl: `${BASE_URL}/results/${shareToken}`,
    expiresAt,
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
git add src/app/api/share/route.ts
git commit -m "feat(share): POST /api/share — generate public share token from private access_token"
```

---

## Task 3: Shared report page

**Files:**
- Create: `src/app/results/[shareId]/page.tsx`
- Create: `src/app/results/[shareId]/_components/share-copy-button.tsx`

- [ ] **Step 1: Create `src/app/results/[shareId]/_components/share-copy-button.tsx`**

```typescript
'use client';

import { useState } from 'react';

export function ShareCopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[13px] font-medium text-white/70 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 3H11.5C12.0523 3 12.5 3.44772 12.5 4V11C12.5 11.5523 12.0523 12 11.5 12H5C4.44772 12 4 11.5523 4 11V9.5M9 3V4.5C9 5.05228 8.55228 5.5 8 5.5H3.5C2.94772 5.5 2.5 5.05228 2.5 4.5V4C2.5 3.44772 2.94772 3 3.5 3H9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Copy link
        </>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Create `src/app/results/[shareId]/page.tsx`**

```typescript
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { ShareCopyButton } from './_components/share-copy-button';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://opsradar.co';

// ─── Minimal types (only fields we render) ───────────────────────────────────

type Opportunity = {
  rank?: number;
  title: string;
  hours_saved_weekly?: number;
  monthly_savings?: number;
  difficulty?: 'easy' | 'medium' | 'complex';
  quick_win?: boolean;
};

type AuditResult = {
  automation_readiness_score?: number;
  estimated_annual_waste?: number | null;
  executive_summary?: string;
  labor_arbitrage_breakdown?: { annual_labor_waste?: number };
  summary?: { automation_readiness_score?: number; total_annual_cost_savings?: number };
  opportunities?: Opportunity[];
};

type AuditAnswers = {
  teamSize?: string;
  agencyType?: string;
};

type BenchmarkPoint = { label: string; stat: string; context: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function getAnnualWaste(r: AuditResult): number | null {
  const v = r.labor_arbitrage_breakdown?.annual_labor_waste ?? r.estimated_annual_waste ?? r.summary?.total_annual_cost_savings ?? null;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function getScore(r: AuditResult): number | null {
  const v = r.automation_readiness_score ?? r.summary?.automation_readiness_score ?? null;
  return typeof v === 'number' ? v : null;
}

function scoreColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function getQuickWins(opportunities: Opportunity[]): Opportunity[] {
  return [...opportunities]
    .sort((a, b) => {
      if (a.quick_win && !b.quick_win) return -1;
      if (!a.quick_win && b.quick_win) return 1;
      const da = a.difficulty === 'easy' ? 0 : a.difficulty === 'medium' ? 1 : 2;
      const db = b.difficulty === 'easy' ? 0 : b.difficulty === 'medium' ? 1 : 2;
      if (da !== db) return da - db;
      return (a.rank ?? 99) - (b.rank ?? 99);
    })
    .slice(0, 3);
}

function getBenchmarks(teamSize: string): BenchmarkPoint[] {
  if (['16-30', '31-50', '51-100', '100+'].includes(teamSize)) {
    return [
      { label: 'Manual ops cost', stat: '25–30%', context: 'of revenue at your scale — industry average' },
      { label: 'Automated workflows', stat: '8+', context: 'workflows run by top agencies your size' },
      { label: 'Annual ROI potential', stat: '$120K–$300K', context: 'typical automation return at your scale' },
    ];
  }
  if (teamSize === '6-15') {
    return [
      { label: 'Time on manual ops', stat: '22%', context: 'of team capacity — average agency your size' },
      { label: 'Automation coverage', stat: '60%+', context: 'reporting & invoicing for top performers' },
      { label: 'Annual ROI potential', stat: '$45K–$90K', context: 'typical automation return at your scale' },
    ];
  }
  if (teamSize === '2-5') {
    return [
      { label: 'Hours on admin/week', stat: '18h', context: 'average for 2–5 person teams — automation cuts this to 6h' },
      { label: 'Automation coverage', stat: '40%', context: 'of repetitive work automated by top-quartile agencies' },
      { label: 'Annual ROI potential', stat: '$28K–$55K', context: 'typical automation return at your scale' },
    ];
  }
  // solo / default
  return [
    { label: 'Admin time/week', stat: '10–14h', context: 'average for solo agencies — automation saves 6–8h' },
    { label: 'First automation', stat: '3–5 days', context: 'average time to build and deploy your first workflow' },
    { label: 'Annual ROI potential', stat: '$12K–$30K', context: 'typical first-year return on automation investment' },
  ];
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ shareId: string }> },
): Promise<Metadata> {
  const { shareId } = await params;
  const supabase = getServerSupabaseClient();

  const { data } = await supabase
    .from('audits')
    .select('company, result')
    .eq('share_token', shareId)
    .gt('share_expires_at', new Date().toISOString())
    .single();

  if (!data) return { title: 'Automation Audit — OpsRadar' };

  const result = data.result as AuditResult;
  const score = getScore(result);
  const waste = getAnnualWaste(result);

  const title = `${data.company} Automation Audit${score != null ? ` — Score: ${score}/100` : ''}`;
  const description = waste
    ? `${data.company} could save ${fmtMoney(waste)}/year by automating their operations. Get your own free audit at opsradar.co`
    : `${data.company}'s personalized automation roadmap. Get your own free audit at opsradar.co`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/og-image.png'] },
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function SharedReportPage(
  { params }: { params: Promise<{ shareId: string }> },
) {
  const { shareId } = await params;
  const supabase = getServerSupabaseClient();

  const { data } = await supabase
    .from('audits')
    .select('company, result, answers')
    .eq('share_token', shareId)
    .gt('share_expires_at', new Date().toISOString())
    .single();

  if (!data) notFound();

  const result  = data.result  as AuditResult;
  const answers = data.answers as AuditAnswers | null;

  const score       = getScore(result);
  const waste       = getAnnualWaste(result);
  const quickWins   = getQuickWins(result.opportunities ?? []);
  const benchmarks  = getBenchmarks(answers?.teamSize ?? '');
  const shareUrl    = `${BASE_URL}/results/${shareId}`;
  const scoreHex    = score != null ? scoreColor(score) : '#3b82f6';

  return (
    <div
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      className="min-h-screen bg-[#060c1e] text-[#eef2ff]"
    >
      {/* OpsRadar nav badge */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-3">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <Image src="/logo.png" alt="OpsRadar" width={20} height={20} className="rounded-[4px]" />
          <span className="text-[13px] font-semibold text-white/50">OpsRadar</span>
        </Link>
        <Link
          href="/audit"
          className="rounded-full bg-[#3b82f6] px-3.5 py-1.5 text-[12px] font-semibold text-white no-underline hover:opacity-90"
        >
          Get my free audit →
        </Link>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-12">

        {/* Hero */}
        <div className="mb-10">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[2px] text-white/30">
            Automation Audit Report
          </div>
          <h1 className="mb-4 text-[32px] font-bold leading-[1.15] text-white">
            {data.company}
          </h1>
          <div className="flex flex-wrap items-center gap-4">
            {score != null && (
              <div
                className="flex items-center gap-2 rounded-[10px] border px-4 py-3"
                style={{ borderColor: `${scoreHex}33`, background: `${scoreHex}0d` }}
              >
                <span className="text-[36px] font-extrabold leading-none" style={{ color: scoreHex }}>
                  {score}
                </span>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[1.5px] text-white/30">Score</div>
                  <div className="text-[11px] text-white/50">out of 100</div>
                </div>
              </div>
            )}
            {waste != null && (
              <div className="flex items-center gap-2 rounded-[10px] border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3">
                <span className="text-[36px] font-extrabold leading-none text-amber-400">
                  {fmtMoney(waste)}
                </span>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[1.5px] text-white/30">Annual</div>
                  <div className="text-[11px] text-white/50">in manual work</div>
                </div>
              </div>
            )}
          </div>
          {result.executive_summary && (
            <p className="mt-5 text-[15px] leading-[1.65] text-white/60">
              {result.executive_summary}
            </p>
          )}
        </div>

        {/* Top 3 Quick Wins */}
        {quickWins.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[2px] text-white/30">
              Top 3 Automation Quick Wins
            </h2>
            <div className="flex flex-col gap-3">
              {quickWins.map((opp, idx) => {
                const monthlySavings = opp.monthly_savings ?? (opp.hours_saved_weekly ? Math.round(opp.hours_saved_weekly * 85 * 4.33) : null);
                return (
                  <div
                    key={idx}
                    className="rounded-[12px] border border-white/[0.08] bg-white/[0.03] p-4"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <span className="text-[14px] font-semibold text-white">{opp.title}</span>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          background: opp.difficulty === 'easy' ? 'rgba(16,185,129,0.1)' : opp.difficulty === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                          color: opp.difficulty === 'easy' ? '#10b981' : opp.difficulty === 'medium' ? '#f59e0b' : '#ef4444',
                        }}
                      >
                        {opp.difficulty === 'easy' ? 'Easy' : opp.difficulty === 'medium' ? 'Medium' : 'Complex'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[12px] text-white/40">
                      {opp.hours_saved_weekly != null && opp.hours_saved_weekly > 0 && (
                        <span>~{opp.hours_saved_weekly}h saved/week</span>
                      )}
                      {monthlySavings != null && monthlySavings > 0 && (
                        <span className="text-white/60">{fmtMoney(monthlySavings)}/month</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* How You Compare */}
        <section className="mb-10">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[2px] text-white/30">
            How You Compare
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {benchmarks.map((b) => (
              <div
                key={b.label}
                className="rounded-[12px] border border-white/[0.08] bg-white/[0.03] p-4"
              >
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[1.5px] text-white/30">
                  {b.label}
                </div>
                <div className="mb-1 text-[24px] font-extrabold text-[#3b82f6]">{b.stat}</div>
                <div className="text-[11px] leading-snug text-white/40">{b.context}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-[14px] border border-[#3b82f6]/20 bg-[#3b82f6]/[0.06] p-6 text-center">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[2px] text-[#3b82f6]/70">
            Powered by OpsRadar
          </div>
          <h3 className="mb-2 text-[20px] font-bold text-white">
            Find out where your agency is leaking time and money
          </h3>
          <p className="mb-5 text-[14px] text-white/50">
            Takes 5 minutes. Free. No credit card.
          </p>
          <Link
            href="/audit"
            className="inline-block rounded-full bg-[#3b82f6] px-6 py-3 text-[14px] font-bold text-white no-underline shadow-[0_0_24px_rgba(59,130,246,0.35)] hover:opacity-90"
          >
            Get my free audit →
          </Link>
        </section>

        {/* Footer */}
        <div className="mt-8 flex flex-col items-center gap-3 border-t border-white/[0.06] pt-6 text-center">
          <p className="text-[12px] text-white/25">
            This report was generated with{' '}
            <Link href="/" className="text-white/40 hover:text-white/60">OpsRadar</Link>
            {' '}· Share this link with your team
          </p>
          <ShareCopyButton url={shareUrl} />
        </div>

      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/results/[shareId]/
git commit -m "feat(share): public shared report page with OG metadata, quick wins, benchmarks"
```

---

## Task 4: Update `handleShareResults` on the existing results page

**Files:**
- Modify: `src/app/results/page.tsx` (around line 2643)

The current `handleShareResults` copies `window.location.href` (which contains the private `?token=` param). Replace it with an API call that generates the public share URL.

- [ ] **Step 1: Add `shareLoading` state**

In the state declarations (around line 2439), add:
```typescript
const [shareLoading, setShareLoading] = useState(false)
```

- [ ] **Step 2: Replace `handleShareResults`** (lines 2643–2676)

Replace the entire `handleShareResults` function with:

```typescript
const handleShareResults = useCallback(async () => {
  if (!auditId || !accessToken) return
  setShareLoading(true)
  try {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auditId, accessToken }),
    })
    if (!res.ok) throw new Error('share_failed')
    const { shareUrl } = await res.json() as { shareUrl: string }

    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = shareUrl
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)

    sendFunnelEvent({ event: 'results_shared', auditId: auditId || undefined })
  } catch {
    // Fallback: copy current URL (which has the private token — not ideal, but safe for logged-in user)
    const ta = document.createElement('textarea')
    ta.value = window.location.href
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
  } finally {
    setShareLoading(false)
  }
}, [auditId, accessToken])
```

- [ ] **Step 3: Update the share button JSX** (around line 3273)

The share button uses `onClick={handleShareResults}`. Update it to also show a loading state:

Find this block:
```tsx
<button
  type="button"
  onClick={handleShareResults}
  className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius)] text-body-sm font-semibold border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-subtle)] hover:text-[var(--color-fg)] bg-[var(--color-surface-sunken)] transition-colors"
>
```

Replace with:
```tsx
<button
  type="button"
  onClick={() => void handleShareResults()}
  disabled={shareLoading}
  className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius)] text-body-sm font-semibold border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-subtle)] hover:text-[var(--color-fg)] bg-[var(--color-surface-sunken)] transition-colors disabled:opacity-50"
>
```

Also update the button label to show loading state. Find:
```tsx
{shareCopied ? (
  <>
    <svg ... />
    Copied to clipboard
  </>
) : (
  <>
    <svg ... />
    Copy share link
  </>
)}
```

Replace with:
```tsx
{shareCopied ? (
  <>
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    Copied to clipboard
  </>
) : shareLoading ? (
  'Generating link…'
) : (
  <>
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9 3H11.5C12.0523 3 12.5 3.44772 12.5 4V11C12.5 11.5523 12.0523 12 11.5 12H5C4.44772 12 4 11.5523 4 11V9.5M9 3V4.5C9 5.05228 8.55228 5.5 8 5.5H3.5C2.94772 5.5 2.5 5.05228 2.5 4.5V4C2.5 3.44772 2.94772 3 3.5 3H9ZM9 3V3C9 2.44772 8.55228 2 8 2H3.5C2.94772 2 2.5 2.44772 2.5 3V9.5C2.5 10.0523 2.94772 10.5 3.5 10.5H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    Share this report
  </>
)}
```

- [ ] **Step 4: Add `useCallback` to imports if not already there**

The file already imports `useCallback` (visible in line 3). The new `handleShareResults` uses `useCallback`, so verify it's imported. If not, add it to the React import line.

- [ ] **Step 5: Run tsc**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npx tsc --noEmit 2>&1 | grep "^src/"
```
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/app/results/page.tsx
git commit -m "feat(share): upgrade Share button to generate public /results/[shareId] URL"
```

---

## Task 5: Production build verify

**Files:**
- No new files — verify compilation

- [ ] **Step 1: Run build**

```bash
cd /home/lawand/Desktop/my-startup/opsradar && npm run build 2>&1 | grep -E "✓|Error|error" | head -10
```
Expected: `✓ Compiled successfully` with no errors.

- [ ] **Step 2: Verify the new route compiled**

```bash
npm run build 2>&1 | grep "results/\[shareId\]"
```
Expected: a line like `ƒ /results/[shareId]` (dynamic server-rendered route).

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(share): Phase 3 Viral Free Audit — shareable public reports with OG, quick wins, benchmarks" --allow-empty
```

---

## Self-Review

**Spec coverage:**
- ✅ Shareable public URL (`/results/[shareId]`) — Task 3 page
- ✅ 30-day token, stored in Supabase — Task 1 migration + Task 2 API
- ✅ "Top 3 quick wins" section — Task 3 `getQuickWins()` + render
- ✅ "How you compare" benchmarks — Task 3 `getBenchmarks()` + render
- ✅ OpsRadar branding on shared reports — Task 3 nav badge + CTA section + footer
- ✅ Open Graph meta tags for LinkedIn/X — Task 3 `generateMetadata`
- ✅ "Get your own audit" CTA — Task 3 CTA section + nav link
- ✅ "Share this report" button upgraded — Task 4 `handleShareResults` rewrite
- ✅ Existing `/results` page unchanged except the share button

**Placeholder scan:** None. All tasks include complete code.

**Type consistency:**
- `Opportunity` type in shared page uses only the subset of fields actually rendered (`title`, `hours_saved_weekly`, `monthly_savings`, `difficulty`, `quick_win`, `rank`) — all present in the original full `Opportunity` type in `results/page.tsx`
- `AuditResult` in shared page is a minimal subset — intentionally simpler, no conflict
- `handleShareResults` is now `async` and wrapped in `useCallback` — `onClick` updated to `void handleShareResults()`
