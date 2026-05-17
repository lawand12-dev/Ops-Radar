'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { EmptyStateConnect } from './empty-state-connect';
import type { ClientProfitability, ProfitabilityResult } from '<npm>/lib/profitability';

type SortKey = 'name' | 'revenue_mtd' | 'hours_mtd' | 'margin_pct';
type SortDir = 'asc' | 'desc';

type Props = {
  state:
    | { kind: 'loading' }
    | { kind: 'not_connected'; missing: ('stripe' | 'harvest')[] }
    | { kind: 'error' }
    | { kind: 'ok'; data: ProfitabilityResult; blended_rate_usd: number };
};

export function ProfitabilityTable({ state }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('margin_pct');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  if (state.kind === 'loading') {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-[var(--color-surface-sunken)]" />
        ))}
      </div>
    );
  }

  if (state.kind === 'not_connected') {
    const { missing } = state;
    if (missing.length === 2) {
      return (
        <div className="flex gap-3">
          <EmptyStateConnect tool="Stripe" toolSlug="stripe" description="Connect Stripe for revenue data." />
          <EmptyStateConnect tool="Harvest" toolSlug="harvest" description="Connect Harvest for hours data." />
        </div>
      );
    }
    const tool = missing[0] === 'stripe' ? 'Stripe' : 'Harvest';
    const slug = missing[0];
    return <EmptyStateConnect tool={tool} toolSlug={slug} description={`Connect ${tool} to complete your profitability picture.`} />;
  }

  if (state.kind === 'error') {
    return (
      <p className="text-body-sm text-[var(--color-fg-subtle)]">
        Couldn&apos;t load profitability data. We&apos;ll retry shortly.
      </p>
    );
  }

  const { data, blended_rate_usd } = state;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'margin_pct' ? 'asc' : 'desc');
    }
  }

  const sorted = [...data.clients].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  if (sorted.length === 0 && data.unmatched_stripe.length === 0 && data.unmatched_harvest.length === 0) {
    return (
      <p className="text-body-sm text-[var(--color-fg-subtle)]">
        No client data yet this month. Data will appear once Stripe invoices or Harvest time entries exist.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {sorted.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {(['name', 'revenue_mtd', 'hours_mtd', 'margin_pct'] as SortKey[]).map((key) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="cursor-pointer pb-2 pr-4 text-left text-label font-normal text-[var(--color-fg-subtle)] last:pr-0 hover:text-[var(--color-fg)]"
                  >
                    {colLabel(key)}
                    {sortKey === key && (
                      <span className="ml-1 text-[var(--color-primary)]">
                        {sortDir === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                ))}
                <th className="pb-2 pr-4 text-left text-label font-normal text-[var(--color-fg-subtle)]">Payment</th>
                <th className="pb-2 pr-4 text-left text-label font-normal text-[var(--color-fg-subtle)]">Trend</th>
                <th className="pb-2 text-left text-label font-normal text-[var(--color-fg-subtle)]">Health</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <ClientRow key={c.id} client={c} blendedRate={blended_rate_usd} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(data.unmatched_stripe.length > 0 || data.unmatched_harvest.length > 0) && (
        <UnmatchedSection
          unmatchedStripe={data.unmatched_stripe}
          unmatchedHarvest={data.unmatched_harvest}
        />
      )}

      <p className="text-label text-[var(--color-fg-subtle)]">
        Margin calculated at ${blended_rate_usd}/hr blended rate.{' '}
        <a href="/dashboard/settings" className="underline hover:text-[var(--color-fg)]">
          Adjust rate →
        </a>
      </p>
    </div>
  );
}

function colLabel(key: SortKey): string {
  switch (key) {
    case 'name': return 'Client';
    case 'revenue_mtd': return 'Revenue · MTD';
    case 'hours_mtd': return 'Hours · MTD';
    case 'margin_pct': return 'Margin';
  }
}

function ClientRow({ client: c, blendedRate }: { client: ClientProfitability; blendedRate: number }) {
  return (
    <tr className="border-b border-[var(--color-border)] last:border-b-0">
      <td className="py-3 pr-4 font-medium text-[var(--color-fg)]">{c.name}</td>
      <td className="py-3 pr-4 text-[var(--color-fg-muted)]">{fmtMoney(c.revenue_mtd)}</td>
      <td className="py-3 pr-4 text-[var(--color-fg-muted)]">
        {c.hours_mtd > 0 ? `${c.hours_mtd}h` : <span className="text-[var(--color-fg-subtle)]">—</span>}
        {c.hours_mtd > 0 && (
          <span className="ml-1.5 text-label text-[var(--color-fg-subtle)]">
            ({fmtMoney(c.hours_mtd * blendedRate)} cost)
          </span>
        )}
      </td>
      <td className="py-3 pr-4">
        <MarginBadge pct={c.margin_pct} />
      </td>
      <td className="py-3 pr-4">
        <PaymentBadge status={c.payment_status} daysOverdue={c.days_overdue} />
      </td>
      <td className="py-3 pr-4">
        <TrendIcon trend={c.trend} />
      </td>
      <td className="py-3">
        <HealthBadge score={c.health_score} />
      </td>
    </tr>
  );
}

function MarginBadge({ pct }: { pct: number }) {
  const rounded = Math.round(pct);
  const color =
    pct < 0
      ? 'text-[var(--color-error)] bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]'
      : pct < 20
      ? 'text-[var(--color-warn)] bg-[color-mix(in_srgb,var(--color-warn)_10%,transparent)]'
      : 'text-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)]';

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-label font-semibold ${color}`}>
      {rounded}%
    </span>
  );
}

function PaymentBadge({
  status,
  daysOverdue,
}: {
  status: ClientProfitability['payment_status'];
  daysOverdue: number | null;
}) {
  if (status === 'overdue') {
    return (
      <span className="text-label text-[var(--color-error)]">
        Overdue {daysOverdue !== null ? `${daysOverdue}d` : ''}
      </span>
    );
  }
  if (status === 'on_time') {
    return <span className="text-label text-[var(--color-success)]">On time</span>;
  }
  return <span className="text-label text-[var(--color-fg-subtle)]">—</span>;
}

function TrendIcon({ trend }: { trend: ClientProfitability['trend'] }) {
  if (trend === 'up') return <ArrowUp size={14} className="text-[var(--color-success)]" />;
  if (trend === 'down') return <ArrowDown size={14} className="text-[var(--color-error)]" />;
  return <Minus size={14} className="text-[var(--color-fg-subtle)]" />;
}

function UnmatchedSection({
  unmatchedStripe,
  unmatchedHarvest,
}: {
  unmatchedStripe: ProfitabilityResult['unmatched_stripe'];
  unmatchedHarvest: ProfitabilityResult['unmatched_harvest'];
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4">
      <p className="mb-2 text-label font-semibold text-[var(--color-fg-muted)]">
        Unmatched clients — names differ between Stripe and Harvest
      </p>
      {unmatchedStripe.length > 0 && (
        <div className="mb-2">
          <p className="text-label text-[var(--color-fg-subtle)]">In Stripe only (no hours tracked):</p>
          <ul className="mt-1 space-y-0.5">
            {unmatchedStripe.map((c) => (
              <li key={c.id} className="text-body-sm text-[var(--color-fg-muted)]">
                {c.name} — {fmtMoney(c.revenue_mtd)} revenue, hours unknown
              </li>
            ))}
          </ul>
        </div>
      )}
      {unmatchedHarvest.length > 0 && (
        <div>
          <p className="text-label text-[var(--color-fg-subtle)]">In Harvest only (no invoices found):</p>
          <ul className="mt-1 space-y-0.5">
            {unmatchedHarvest.map((c) => (
              <li key={c.name} className="text-body-sm text-[var(--color-fg-muted)]">
                {c.name} — {c.hours_mtd}h tracked, no Stripe customer found
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}

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
