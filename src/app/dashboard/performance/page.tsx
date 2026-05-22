'use client';

import { useState } from 'react';
import { HealthView } from './_components/health-view';
import { PeersView } from './_components/peers-view';

type Tab = 'health' | 'peers';

const TABS: Array<{ id: Tab; label: string; sub: string }> = [
  { id: 'health', label: 'Health',  sub: 'Your agency rated across 5 dimensions' },
  { id: 'peers',  label: 'Peers',   sub: 'Industry cohort benchmarks' },
];

export default function PerformancePage() {
  const [tab, setTab] = useState<Tab>('health');
  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="text-body-sm text-[var(--color-fg-muted)]">
          Dashboard /{' '}
          <span className="font-semibold text-[var(--color-fg)]">Performance</span>
        </div>
      </div>

      <div>
        <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Performance
        </h1>
        <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
          {current.sub}.
        </p>
      </div>

      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-3 py-2 text-[13px] font-medium transition-colors ${
                active
                  ? 'text-[var(--color-fg)]'
                  : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
              }`}
            >
              {t.label}
              {active && (
                <span className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--color-primary)]" />
              )}
            </button>
          );
        })}
      </div>

      {tab === 'health' ? <HealthView /> : <PeersView />}
    </div>
  );
}
