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
      className="block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 no-underline shadow-[var(--shadow-xs)] transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_30%,var(--color-border))]"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-h4 font-medium text-[var(--color-fg)]">{title}</h2>
        <span className="text-label text-[var(--color-primary)]">
          {persona}
        </span>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {stats.map((s, i) => (
          <div key={i}>
            <div className="text-h4 font-medium text-[var(--color-fg)]">{s.value}</div>
            <div className="text-label text-[var(--color-fg-subtle)]">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 text-body-sm font-medium text-[var(--color-primary)]">
        <span>{cta}</span>
        <ArrowUpRight size={11} strokeWidth={2} />
      </div>
    </Link>
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
