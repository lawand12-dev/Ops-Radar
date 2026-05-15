'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Primitive card component
// ---------------------------------------------------------------------------

export type PillarCtaCardProps = {
  title: string;         // "Automations" | "Business"
  persona: string;       // "COO view" | "CEO view"
  href: string;
  /** Up to 3 mini-stats. Render — let the loader fill them. */
  stats: { value: string; label: string }[];
  cta: string;           // e.g. "View leaderboard, incidents, ROI →"
};

export function PillarCtaCard({ title, persona, href, stats, cta }: PillarCtaCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 no-underline transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_30%,var(--color-border))]"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[13.5px] font-semibold text-[var(--color-fg)]">{title}</h2>
        <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">
          {persona}
        </span>
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

// ---------------------------------------------------------------------------
// AutomationsCtaCard — fetches workflow-health + automation-roi
// ---------------------------------------------------------------------------

type WorkflowExecution = {
  status: 'success' | 'failure' | 'running' | 'canceled';
};

type WorkflowEntry = {
  name?: string;
  status?: string;
  recent_executions?: WorkflowExecution[];
};

type WorkflowHealthResp =
  | { status: 'ok'; workflows: WorkflowEntry[] }
  | { status: string; workflows?: WorkflowEntry[] };

type AutomationRoiResp = {
  status: string;
  data?: {
    hours_saved?: number;
    // incidents_caught_7d not exposed — derived from failures
  };
};

export function AutomationsCtaCard() {
  const [stats, setStats] = useState<{ value: string; label: string }[]>([
    { value: '—', label: 'Runs · total' },
    { value: '—', label: 'Success'       },
    { value: '—', label: 'Incidents'     },
  ]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/dashboard/workflow-health').then((r) => r.json() as Promise<WorkflowHealthResp>).catch(() => null),
      fetch('/api/dashboard/automation-roi').then((r) => r.json() as Promise<AutomationRoiResp>).catch(() => null),
    ]).then(([wh, _roi]) => {
      if (cancelled) return;

      const workflows: WorkflowEntry[] =
        (wh?.status === 'ok' ? wh.workflows : wh?.workflows) ?? [];

      // Derive run counts from recent_executions[] since runs_7d / success_runs_7d
      // are not in the WorkflowHealthEntry shape.
      let totalRuns = 0;
      let successRuns = 0;
      let failures = 0;

      for (const w of workflows) {
        for (const exec of w.recent_executions ?? []) {
          totalRuns++;
          if (exec.status === 'success') successRuns++;
          if (exec.status === 'failure') failures++;
        }
      }

      const successPct =
        totalRuns > 0 ? `${((successRuns / totalRuns) * 100).toFixed(1)}%` : '—';

      setStats([
        { value: totalRuns > 0 ? totalRuns.toLocaleString() : '—', label: 'Runs · total' },
        { value: successPct,                                         label: 'Success'       },
        { value: failures > 0 ? String(failures) : '0',             label: 'Incidents'     },
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

// ---------------------------------------------------------------------------
// BusinessCtaCard — fetches finance + sales-live + marketing
// ---------------------------------------------------------------------------

type FinanceResp = {
  status: string;
  data?: {
    paid?: number;
    invoiced?: number;
    overdue?: number;
  };
};

type SalesResp = {
  status: string;
  data?: {
    pipeline_value?: number;
    open_deals_count?: number;
  };
};

type MarketingResp = {
  status?: string;
  error?: string;
  data?: {
    meetings_booked?: number | null;
    emails_sent?: number | null;
  };
};

export function BusinessCtaCard() {
  const [stats, setStats] = useState<{ value: string; label: string }[]>([
    { value: '—', label: 'Revenue MTD' },
    { value: '—', label: 'Pipeline'    },
    { value: '—', label: 'Calls'       },
  ]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/dashboard/finance').then((r) => r.json() as Promise<FinanceResp>).catch(() => null),
      fetch('/api/dashboard/sales-live').then((r) => r.json() as Promise<SalesResp>).catch(() => null),
      fetch('/api/dashboard/marketing').then((r) => r.json() as Promise<MarketingResp>).catch(() => null),
    ]).then(([fin, sales, mkt]) => {
      if (cancelled) return;

      // finance.data.paid = USD paid this month-to-date (closest proxy to MRR)
      const paid = fin?.status === 'ok' ? (fin.data?.paid ?? null) : null;
      // sales.data.pipeline_value = sum of open deal amounts
      const pipeline = sales?.status === 'ok' ? (sales.data?.pipeline_value ?? null) : null;
      // marketing.data.meetings_booked = calendly bookings (flat field, no nesting)
      const calls =
        mkt && !('error' in mkt) ? (mkt.data?.meetings_booked ?? null) : null;

      setStats([
        { value: typeof paid     === 'number' ? fmtMoney(paid)     : '—', label: 'Revenue MTD' },
        { value: typeof pipeline === 'number' ? fmtMoney(pipeline) : '—', label: 'Pipeline'    },
        { value: typeof calls    === 'number' ? String(calls)       : '—', label: 'Calls'       },
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}
