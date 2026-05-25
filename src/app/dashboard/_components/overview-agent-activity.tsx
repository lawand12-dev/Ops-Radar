'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot, ChevronRight, AlertCircle, Activity } from 'lucide-react';

type Summary = {
  total_24h: number;
  failed_24h: number;
  running_24h: number;
};

export function OverviewAgentActivity() {
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/runs/summary')
      .then((r) => r.json())
      .then((d: Summary) => setS(d))
      .catch(() => setS({ total_24h: 0, failed_24h: 0, running_24h: 0 }));
  }, []);

  if (!s) {
    return (
      <Card>
        <span className="text-body-sm text-[var(--color-fg-subtle)]">Loading agent activity…</span>
      </Card>
    );
  }

  return (
    <Link
      href="/dashboard/runs"
      className="block no-underline transition-colors hover:bg-[var(--color-surface-sunken)]"
    >
      <Card>
        <div className="flex items-center gap-3">
          <Bot size={16} className="text-[var(--color-fg-subtle)]" />
          <div className="flex flex-1 items-center gap-3 text-body-sm">
            <span className="font-semibold text-[var(--color-fg)]">
              {s.total_24h} {s.total_24h === 1 ? 'run' : 'runs'} today
            </span>
            {s.running_24h > 0 && (
              <span className="inline-flex items-center gap-1 text-[var(--color-fg-muted)]">
                <Activity size={12} className="text-[var(--color-success)]" />
                {s.running_24h} running
              </span>
            )}
            {s.failed_24h > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-[var(--color-danger)]">
                <AlertCircle size={12} />
                {s.failed_24h} failed
              </span>
            )}
            {s.total_24h === 0 && (
              <span className="text-[var(--color-fg-subtle)]">
                Agents will run on schedule once tools are connected.
              </span>
            )}
          </div>
          <span className="text-body-sm text-[var(--color-fg-subtle)]">View runs</span>
          <ChevronRight size={14} className="text-[var(--color-fg-faint)]" />
        </div>
      </Card>
    </Link>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      {children}
    </div>
  );
}
