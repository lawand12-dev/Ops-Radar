'use client';

import { useCallback, useEffect, useState } from 'react';
import { RetainerTable } from './_components/retainer-table';
import { PlanGate } from '../_components/plan-gate';
import type { RetainerConfig, RetainerHealth, RetainerSummary } from '<npm>/lib/retainer';

type ApiResp =
  | ({ status: 'ok'; from_cache: boolean } & RetainerSummary)
  | { status: 'no_configs'; configs: [] }
  | { status: 'harvest_not_connected'; configs: RetainerConfig[] }
  | { status: 'upgrade_required'; required_plan: string; required_plan_label: string; required_plan_price: string }
  | { status: 'unavailable'; message: string };

type PageState =
  | { kind: 'loading' }
  | { kind: 'ok'; retainers: RetainerHealth[]; total: number; at_risk: number; over: number }
  | { kind: 'empty' }
  | { kind: 'harvest_not_connected' }
  | { kind: 'upgrade_required' }
  | { kind: 'error' };

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function RetainerPage() {
  const [state, setState] = useState<PageState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const r = await fetch('/api/dashboard/retainer');
      const resp = (await r.json()) as ApiResp;

      if (resp.status === 'ok') {
        setState({
          kind: 'ok',
          retainers: resp.retainers,
          total: resp.total_monthly_arr_usd,
          at_risk: resp.at_risk_count,
          over: resp.over_budget_count,
        });
      } else if (resp.status === 'no_configs') {
        setState({ kind: 'empty' });
      } else if (resp.status === 'harvest_not_connected') {
        setState({ kind: 'harvest_not_connected' });
      } else if (resp.status === 'upgrade_required') {
        setState({ kind: 'upgrade_required' });
      } else {
        setState({ kind: 'error' });
      }
    } catch {
      setState({ kind: 'error' });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleAdd(data: { client_name: string; monthly_amount_usd: number; included_hours: number }) {
    await fetch('/api/dashboard/retainer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await load();
  }

  async function handleDelete(config: RetainerConfig) {
    await fetch(`/api/dashboard/retainer?id=${encodeURIComponent(config.id)}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="border-b border-[var(--color-border)] pb-3 text-body-sm text-[var(--color-fg-muted)]">
        Dashboard / <span className="font-semibold text-[var(--color-fg)]">Retainers</span>
      </div>

      <div className="mb-1">
        <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Retainer Health
        </h1>
        <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
          Fixed-fee clients tracked against included monthly hours. Catch overage before the month ends.
        </p>
      </div>

      {state.kind === 'upgrade_required' && (
        <PlanGate feature="Retainer tracking" requiredPlan="pro" />
      )}

      {state.kind === 'loading' && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-[var(--radius,6px)] bg-[var(--color-surface-sunken)]" />
          ))}
        </div>
      )}

      {state.kind === 'harvest_not_connected' && (
        <p className="text-body-sm text-[var(--color-warn)]">
          Connect Harvest to track retainer hours.{' '}
          <a href="/dashboard/integrations" className="underline">Go to integrations →</a>
        </p>
      )}

      {state.kind === 'error' && (
        <p className="text-body-sm text-[var(--color-danger)]">Failed to load retainer data.</p>
      )}

      {(state.kind === 'empty' || state.kind === 'ok') && (
        <>
          {state.kind === 'ok' && (
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Monthly ARR', value: fmtMoney(state.total) },
                { label: 'At risk', value: String(state.at_risk) },
                { label: 'Over budget', value: String(state.over) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[var(--radius-lg,8px)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                >
                  <p className="text-label text-[var(--color-fg-muted)]">{stat.label}</p>
                  <p className="mt-0.5 text-[22px] font-semibold tabular-nums text-[var(--color-fg)]">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="rounded-[var(--radius-lg,8px)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <RetainerTable
              retainers={state.kind === 'ok' ? state.retainers : []}
              onAdd={handleAdd}
              onDelete={handleDelete}
            />
          </div>
        </>
      )}
    </div>
  );
}
