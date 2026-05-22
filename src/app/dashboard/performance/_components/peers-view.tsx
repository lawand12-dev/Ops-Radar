'use client';

import { useCallback, useEffect, useState } from 'react';
import { PlanGate } from '../../_components/plan-gate';
import {
  METRIC_LABELS,
  SERVICE_MIX_BUCKETS,
  SERVICE_MIX_LABELS,
  TEAM_SIZE_BUCKETS,
  type BenchmarkMetric,
  type BenchmarkRow,
  type ServiceMixBucket,
  type TeamSizeBucket,
} from '<npm>/lib/benchmarks/types';

type UserMetrics = Partial<Record<BenchmarkMetric, number>>;

type ApiResp =
  | {
      user_team_size: TeamSizeBucket | null;
      user_service_mix: ServiceMixBucket | null;
      user_metrics: UserMetrics;
      benchmarks: BenchmarkRow[];
    }
  | { status: 'upgrade_required'; required_plan: string };

type PageState =
  | { kind: 'loading' }
  | { kind: 'upgrade_required' }
  | {
      kind: 'ok';
      userTeam: TeamSizeBucket | null;
      userMix: ServiceMixBucket | null;
      userMetrics: UserMetrics;
      benchmarks: BenchmarkRow[];
    }
  | { kind: 'error' };

const TEAM_FILTERS: Array<TeamSizeBucket | 'all'> = ['all', ...TEAM_SIZE_BUCKETS];

function fmtMetricValue(metric: BenchmarkMetric, v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  switch (metric) {
    case 'median_client_margin_pct': return `${Math.round(v)}%`;
    case 'median_invoice_days_overdue': return `${v.toFixed(1)} days`;
    case 'hours_per_10k_revenue': return `${v.toFixed(1)} h`;
    case 'active_client_count': return String(Math.round(v));
  }
}

export function PeersView() {
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [teamFilter, setTeamFilter] = useState<TeamSizeBucket | 'all'>('all');
  const [mixFilter, setMixFilter] = useState<ServiceMixBucket | 'all'>('all');

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const params = new URLSearchParams();
      if (teamFilter !== 'all') params.set('team_size', teamFilter);
      if (mixFilter !== 'all') params.set('service_mix', mixFilter);
      const r = await fetch(`/api/dashboard/benchmarks/cohorts?${params}`);
      const resp = (await r.json()) as ApiResp;
      if ('status' in resp && resp.status === 'upgrade_required') {
        setState({ kind: 'upgrade_required' });
      } else if ('benchmarks' in resp) {
        setState({
          kind: 'ok',
          userTeam: resp.user_team_size,
          userMix: resp.user_service_mix,
          userMetrics: resp.user_metrics,
          benchmarks: resp.benchmarks,
        });
      } else {
        setState({ kind: 'error' });
      }
    } catch {
      setState({ kind: 'error' });
    }
  }, [teamFilter, mixFilter]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-body-sm text-[var(--color-fg-muted)]">
        Drill into peer agency cohorts by team size and service mix. Numbers are anonymized aggregates from opted-in agencies. Sample size must be ≥ 5 for a cohort to appear.
      </p>

      {state.kind === 'upgrade_required' && (
        <PlanGate feature="OpsRadar Index" requiredPlan="growth" />
      )}

      {state.kind === 'loading' && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-[var(--radius,6px)] bg-[var(--color-surface-sunken)]" />
          ))}
        </div>
      )}

      {state.kind === 'error' && (
        <p className="text-body-sm text-[var(--color-danger)]">Failed to load index data.</p>
      )}

      {state.kind === 'ok' && (
        <>
          <div className="flex flex-wrap items-end gap-3 rounded-[var(--radius-lg,8px)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div>
              <label className="block text-label text-[var(--color-fg-muted)]">Team size</label>
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value as TeamSizeBucket | 'all')}
                className="mt-1 h-8 rounded-[var(--radius,6px)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 text-body-sm text-[var(--color-fg)]"
              >
                {TEAM_FILTERS.map((b) => (
                  <option key={b} value={b}>{b === 'all' ? 'All sizes' : b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-label text-[var(--color-fg-muted)]">Service mix</label>
              <select
                value={mixFilter}
                onChange={(e) => setMixFilter(e.target.value as ServiceMixBucket | 'all')}
                className="mt-1 h-8 rounded-[var(--radius,6px)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 text-body-sm text-[var(--color-fg)]"
              >
                <option value="all">All mixes</option>
                {SERVICE_MIX_BUCKETS.filter((m) => m !== 'all').map((m) => (
                  <option key={m} value={m}>{SERVICE_MIX_LABELS[m]}</option>
                ))}
              </select>
            </div>
            {state.userTeam && (
              <p className="ml-auto text-label text-[var(--color-fg-subtle)]">
                Your cohort: {state.userTeam}
                {state.userMix && state.userMix !== 'all' && <> · {SERVICE_MIX_LABELS[state.userMix]}</>}
              </p>
            )}
          </div>

          {state.benchmarks.length === 0 ? (
            <div className="rounded-[var(--radius-lg,8px)] border border-dashed border-[var(--color-border)] p-8 text-center">
              <p className="font-medium text-[var(--color-fg)]">No cohorts found for this filter</p>
              <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
                Each cohort needs at least 5 opted-in agencies before we show numbers.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius-lg,8px)] border border-[var(--color-border)] bg-[var(--color-surface)]">
              <table className="w-full border-collapse text-body-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="px-4 py-2.5 text-left font-medium text-[var(--color-fg-muted)]">Metric</th>
                    <th className="px-4 py-2.5 text-left font-medium text-[var(--color-fg-muted)]">Team size</th>
                    <th className="px-4 py-2.5 text-left font-medium text-[var(--color-fg-muted)]">Service mix</th>
                    <th className="px-4 py-2.5 text-right font-medium text-[var(--color-fg-muted)]">p25</th>
                    <th className="px-4 py-2.5 text-right font-medium text-[var(--color-fg-muted)]">p50</th>
                    <th className="px-4 py-2.5 text-right font-medium text-[var(--color-fg-muted)]">p75</th>
                    <th className="px-4 py-2.5 text-right font-medium text-[var(--color-fg-muted)]">n</th>
                    <th className="px-4 py-2.5 text-right font-medium text-[var(--color-primary)]">You</th>
                  </tr>
                </thead>
                <tbody>
                  {state.benchmarks.map((b) => {
                    const metric = b.metric as BenchmarkMetric;
                    const isUserCohort = b.team_size_bucket === state.userTeam &&
                      (b.service_mix_bucket === (state.userMix ?? 'all'));
                    return (
                      <tr
                        key={`${b.metric}-${b.team_size_bucket}-${b.service_mix_bucket}`}
                        className={`border-b border-[var(--color-border)] last:border-0 ${isUserCohort ? 'bg-[color-mix(in_srgb,var(--color-primary)_3%,transparent)]' : ''}`}
                      >
                        <td className="px-4 py-2.5 font-medium text-[var(--color-fg)]">{METRIC_LABELS[metric]}</td>
                        <td className="px-4 py-2.5 text-[var(--color-fg-muted)]">{b.team_size_bucket}</td>
                        <td className="px-4 py-2.5 text-[var(--color-fg-muted)]">
                          {SERVICE_MIX_LABELS[b.service_mix_bucket as ServiceMixBucket] ?? b.service_mix_bucket}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-fg-muted)]">
                          {fmtMetricValue(metric, b.p25)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-fg)]">
                          {fmtMetricValue(metric, b.p50)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-fg-muted)]">
                          {fmtMetricValue(metric, b.p75)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-fg-subtle)]">{b.sample_size}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-primary)] font-medium">
                          {isUserCohort ? fmtMetricValue(metric, state.userMetrics[metric]) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
