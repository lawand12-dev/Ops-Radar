'use client';

import { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import type { HealthFinding, HealthReport } from '<npm>/lib/health-report';

const DISMISSED_KEY = 'opsradar_health_report_dismissed';

type State =
  | { kind: 'hidden' }
  | { kind: 'loading' }
  | { kind: 'ok'; report: HealthReport }
  | { kind: 'err' };

function hasDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, '1');
  } catch {
    // If storage is unavailable, still let the user hide it for this render.
  }
}

function SeverityIcon({ severity }: { severity: HealthFinding['severity'] }) {
  if (severity === 'good') {
    return <CheckCircle size={14} className="shrink-0 text-[var(--color-success)]" />;
  }
  if (severity === 'bad') {
    return <AlertTriangle size={14} className="shrink-0 text-[var(--color-danger)]" />;
  }
  return <TrendingUp size={14} className="shrink-0 text-[var(--color-warn)]" />;
}

function severityColor(s: HealthFinding['severity']): string {
  if (s === 'good') return 'text-[var(--color-success)]';
  if (s === 'bad') return 'text-[var(--color-danger)]';
  return 'text-[var(--color-warn)]';
}

export function HealthReportBanner() {
  const [state, setState] = useState<State>({ kind: 'hidden' });

  useEffect(() => {
    if (hasDismissed()) return;

    let cancelled = false;
    setState({ kind: 'loading' });

    fetch('/api/dashboard/health-report', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`health report failed: ${r.status}`);
        return r.json() as Promise<{ report?: HealthReport | null; reason?: string; error?: string }>;
      })
      .then((j) => {
        if (cancelled) return;
        if (j.report) {
          setState({ kind: 'ok', report: j.report });
        } else {
          setState({ kind: 'hidden' });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'err' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    markDismissed();
    setState({ kind: 'hidden' });
  }

  if (state.kind === 'hidden' || state.kind === 'err') return null;

  if (state.kind === 'loading') {
    return (
      <div className="animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="h-3 w-48 max-w-full rounded bg-[var(--color-surface-sunken)]" />
        <div className="mt-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-3 w-full rounded bg-[var(--color-surface-sunken)]" />
          ))}
        </div>
      </div>
    );
  }

  const { findings } = state.report;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-xs)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase text-[var(--color-fg-subtle)]">
          Agency Health Report
        </span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss health report"
          className="rounded-[var(--radius)] p-1 text-[var(--color-fg-subtle)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-fg)]"
        >
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {findings.slice(0, 3).map((f, i) => (
          <div key={i} className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <SeverityIcon severity={f.severity} />
              <span className={`min-w-0 text-[12.5px] font-semibold ${severityColor(f.severity)}`}>
                {f.title}
              </span>
            </div>
            <p className="text-[12px] leading-[1.5] text-[var(--color-fg-muted)]">{f.insight}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
