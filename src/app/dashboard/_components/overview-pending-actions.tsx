'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Zap, ChevronRight } from 'lucide-react';

export function OverviewPendingActions() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/actions?status=pending&limit=1')
      .then((r) => r.json())
      .then((d: { pending_count?: number }) => setCount(d.pending_count ?? 0))
      .catch(() => setCount(0));
  }, []);

  if (count === null) return null;
  if (count === 0) {
    return (
      <Link
        href="/dashboard/actions"
        className="block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 no-underline transition-colors hover:bg-[var(--color-surface-sunken)]"
      >
        <div className="flex items-center gap-3">
          <Zap size={16} className="text-[var(--color-fg-subtle)]" />
          <span className="flex-1 text-body-sm text-[var(--color-fg-muted)]">
            No actions waiting on you.
          </span>
          <ChevronRight size={14} className="text-[var(--color-fg-faint)]" />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href="/dashboard/actions"
      className="block rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--color-primary)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_5%,var(--color-surface))] px-4 py-3 no-underline transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))]"
    >
      <div className="flex items-center gap-3">
        <Zap size={16} className="text-[var(--color-primary)]" />
        <span className="flex-1 text-body-sm font-semibold text-[var(--color-fg)]">
          {count} {count === 1 ? 'action' : 'actions'} waiting on you
        </span>
        <span className="text-body-sm text-[var(--color-primary)]">Review →</span>
      </div>
    </Link>
  );
}
