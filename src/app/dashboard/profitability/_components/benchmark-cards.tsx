'use client';

import { useEffect, useState } from 'react';
import {
  METRIC_LABELS,
  type BenchmarkMetric,
  type UserComparison,
  type TeamSizeBucket,
} from '<npm>/lib/benchmarks/types';

type ApiResp = {
  bucket: TeamSizeBucket | null;
  comparisons: UserComparison[];
};

function fmt(metric: BenchmarkMetric, v: number | null): string {
  if (v === null) return '—';
  switch (metric) {
    case 'median_client_margin_pct':    return `${v.toFixed(0)}%`;
    case 'median_invoice_days_overdue': return `${v.toFixed(0)}d`;
    case 'hours_per_10k_revenue':       return `${v.toFixed(1)}h`;
    case 'active_client_count':         return `${Math.round(v)}`;
  }
}

function positionCopy(c: UserComparison): { text: string; tone: 'good' | 'ok' | 'bad' | 'neutral' } {
  if (c.position === 'no_data')   return { text: 'Not enough data yet', tone: 'neutral' };
  if (c.position === 'top_25')    return { text: 'Top 25% for your size', tone: 'good' };
  if (c.position === 'above')     return { text: 'Above median', tone: 'good' };
  if (c.position === 'below')     return { text: 'Below median', tone: 'bad' };
  if (c.position === 'bottom_25') return { text: 'Bottom 25%', tone: 'bad' };
  return { text: '', tone: 'neutral' };
}

function toneClass(tone: 'good' | 'ok' | 'bad' | 'neutral'): string {
  if (tone === 'good') return 'text-emerald-400';
  if (tone === 'bad')  return 'text-amber-400';
  return 'text-[var(--color-fg-subtle)]';
}

type State =
  | { kind: 'loading' }
  | { kind: 'no_team' }
  | { kind: 'ok'; data: ApiResp }
  | { kind: 'err' };

export function BenchmarkCards() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/benchmarks')
      .then((r) => r.json() as Promise<ApiResp | { error: string }>)
      .then((j) => {
        if (cancelled) return;
        if ('error' in j) { setState({ kind: 'err' }); return; }
        if (!j.bucket)    { setState({ kind: 'no_team' }); return; }
        setState({ kind: 'ok', data: j });
      })
      .catch(() => { if (!cancelled) setState({ kind: 'err' }); });
    return () => { cancelled = true; };
  }, []);

  if (state.kind === 'loading' || state.kind === 'err') return null;

  if (state.kind === 'no_team') {
    return (
      <div className="mb-3.5 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[12.5px] text-[var(--color-fg-muted)]">
        Set your team size in <a href="/dashboard/settings" className="text-[var(--color-primary)] underline">Settings</a> to see how you compare to agencies your size.
      </div>
    );
  }

  const { comparisons, bucket } = state.data;

  return (
    <div className="mb-3.5">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
        How you compare — agencies {bucket}
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {comparisons.map((c) => {
          const pos = positionCopy(c);
          return (
            <div
              key={c.metric}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 shadow-[var(--shadow-xs)]"
            >
              <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-fg-subtle)]">
                {METRIC_LABELS[c.metric]}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[20px] font-semibold text-[var(--color-fg)]">
                  {fmt(c.metric, c.user_value)}
                </span>
                {c.benchmark && (
                  <span className="text-[11px] text-[var(--color-fg-subtle)]">
                    vs {fmt(c.metric, c.benchmark.p50)} median
                  </span>
                )}
              </div>
              <div className={`mt-1 text-[11px] font-medium ${toneClass(pos.tone)}`}>
                {pos.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
