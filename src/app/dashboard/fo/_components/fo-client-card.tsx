'use client';

import Link from 'next/link';
import { AlertTriangle, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { FoClientHealth } from '<npm>/lib/fo';

function MarginBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <span className="text-label text-[var(--color-fg-subtle)]">No billing data</span>;
  }
  const color = pct >= 20 ? 'var(--color-success)' : pct >= 0 ? 'var(--color-warn)' : 'var(--color-danger)';
  const Icon = pct >= 0 ? (pct >= 20 ? TrendingUp : Minus) : TrendingDown;
  return (
    <span className="flex items-center gap-1 text-body-sm font-medium" style={{ color }}>
      <Icon className="h-3.5 w-3.5" />
      {Math.round(pct)}% margin
    </span>
  );
}

export function FoClientCard({ health }: { health: FoClientHealth }) {
  return (
    <Link
      href={`/dashboard/fo/clients/${health.client.id}`}
      className="block rounded-[var(--radius-lg,8px)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 no-underline transition-colors hover:border-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_4%,var(--color-surface))]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[var(--color-fg)]">{health.client.agency_name}</p>
          {health.client.team_size && (
            <p className="text-label text-[var(--color-fg-subtle)]">{health.client.team_size}</p>
          )}
        </div>
        {health.at_risk_projects > 0 && (
          <span className="flex items-center gap-1 rounded-[3px] bg-[color-mix(in_srgb,var(--color-warn)_14%,transparent)] px-1.5 py-0.5 text-label font-medium text-[var(--color-warn)]">
            <AlertTriangle className="h-3 w-3" />
            {health.at_risk_projects} scope risk
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        <MarginBadge pct={health.margin_pct} />
        <span className="text-label text-[var(--color-fg-subtle)]">
          {health.integrations_connected.length} integration{health.integrations_connected.length !== 1 ? 's' : ''}
        </span>
      </div>
    </Link>
  );
}
