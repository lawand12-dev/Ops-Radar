'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DashboardAlert } from '<npm>/lib/dashboard-alert-rules';

const SEVERITY_STYLES: Record<DashboardAlert['severity'], { border: string; tagBg: string; tagFg: string }> = {
  'needs-you': {
    border: 'border-l-[var(--color-danger)]',
    tagBg:  'bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)]',
    tagFg:  'text-[var(--color-danger)]',
  },
  'watch': {
    border: 'border-l-[var(--color-warn)]',
    tagBg:  'bg-[color-mix(in_srgb,var(--color-warn)_14%,transparent)]',
    tagFg:  'text-[var(--color-warn)]',
  },
  'heads-up': {
    border: 'border-l-[var(--color-primary)]',
    tagBg:  'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]',
    tagFg:  'text-[var(--color-primary)]',
  },
};

export function CockpitAlertsRibbon() {
  const [alerts, setAlerts] = useState<DashboardAlert[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/alerts')
      .then((r) => r.json())
      .then((json: { status: string; alerts?: DashboardAlert[] }) => {
        if (cancelled) return;
        setAlerts(json.status === 'ok' ? (json.alerts ?? []) : []);
      })
      .catch(() => { if (!cancelled) setAlerts([]); });
    return () => { cancelled = true; };
  }, []);

  if (alerts === null) {
    // Render skeleton so the layout doesn&apos;t jump
    return <div className="grid grid-cols-3 gap-2" aria-hidden>
      {[0, 1, 2].map((i) => <div key={i} className="h-[60px] animate-pulse rounded-[var(--radius)] bg-[var(--color-surface-sunken)]" />)}
    </div>;
  }

  if (alerts.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {alerts.map((a) => {
        const s = SEVERITY_STYLES[a.severity];
        return (
          <Link
            key={a.id}
            href={a.href}
            className={`flex flex-col gap-1 rounded-[var(--radius)] border border-[var(--color-border)] border-l-2 ${s.border} bg-[var(--color-surface)] p-3 no-underline transition-colors hover:bg-[var(--color-surface-sunken)]`}
          >
            <span className={`inline-block w-fit rounded-[3px] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${s.tagBg} ${s.tagFg}`}>
              {a.label}
            </span>
            <span className="text-[12.5px] leading-snug text-[var(--color-fg-muted)]">{a.message}</span>
          </Link>
        );
      })}
    </div>
  );
}
