'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { StoredBriefing } from '<npm>/lib/briefing-types';

type State =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'ok'; briefing: StoredBriefing };

export function OverviewBriefingCard() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    fetch('/api/dashboard/briefing?limit=1')
      .then((r) => r.json())
      .then((d: { briefings?: StoredBriefing[] }) => {
        const b = d.briefings?.[0];
        setState(b ? { kind: 'ok', briefing: b } : { kind: 'empty' });
      })
      .catch(() => setState({ kind: 'empty' }));
  }, []);

  if (state.kind === 'loading') {
    return <Card>Loading today&apos;s briefing…</Card>;
  }

  if (state.kind === 'empty') {
    return (
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-body-sm font-semibold text-[var(--color-fg)]">No briefing yet</div>
            <div className="text-caption text-[var(--color-fg-subtle)]">
              The Briefing Agent runs daily at 6am. Connect tools to start.
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const { briefing } = state;
  const topAttention = [...briefing.attention].sort((a, b) => a.priority - b.priority)[0];

  return (
    <Link
      href="/dashboard/brain"
      className="block no-underline transition-colors hover:bg-[var(--color-surface-sunken)]"
    >
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-caption font-mono uppercase tracking-wider text-[var(--color-fg-subtle)]">
                Today&apos;s briefing
              </span>
              <span className="text-caption text-[var(--color-fg-faint)]">
                · Health {briefing.health_score}/100
              </span>
            </div>
            <div className="mt-1 text-body font-medium text-[var(--color-fg)]">
              {topAttention?.text ?? briefing.win ?? briefing.recommendation}
            </div>
            {briefing.recommendation && topAttention && (
              <div className="mt-1 truncate text-body-sm text-[var(--color-fg-muted)]">
                {briefing.recommendation}
              </div>
            )}
          </div>
          <ChevronRight size={16} className="mt-1 shrink-0 text-[var(--color-fg-faint)]" />
        </div>
      </Card>
    </Link>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      {children}
    </div>
  );
}
