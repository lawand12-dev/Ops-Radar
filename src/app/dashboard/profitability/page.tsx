'use client';

import { useEffect, useState } from 'react';
import { ProfitabilityTable } from '../_components/profitability-table';
import { BenchmarkCards } from './_components/benchmark-cards';
import { PlanGate } from '../_components/plan-gate';
import type { ProfitabilityResult } from '<npm>/lib/profitability';

type ApiResp =
  | { status: 'ok'; data: ProfitabilityResult; blended_rate_usd: number }
  | { status: 'not_connected'; missing: ('stripe' | 'harvest')[] }
  | { status: 'upgrade_required'; required_plan: string; required_plan_label: string; required_plan_price: string }
  | { status: 'unavailable'; message: string };

type TableState =
  | { kind: 'loading' }
  | { kind: 'not_connected'; missing: ('stripe' | 'harvest')[] }
  | { kind: 'upgrade_required' }
  | { kind: 'error' }
  | { kind: 'ok'; data: ProfitabilityResult; blended_rate_usd: number };

export default function ProfitabilityPage() {
  const [tableState, setTableState] = useState<TableState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/profitability')
      .then((r) => r.json())
      .then((resp: ApiResp) => {
        if (cancelled) return;
        if (resp.status === 'not_connected') {
          setTableState({ kind: 'not_connected', missing: resp.missing });
        } else if (resp.status === 'ok') {
          setTableState({ kind: 'ok', data: resp.data, blended_rate_usd: resp.blended_rate_usd });
        } else if (resp.status === 'upgrade_required') {
          setTableState({ kind: 'upgrade_required' });
        } else {
          setTableState({ kind: 'error' });
        }
      })
      .catch(() => {
        if (!cancelled) setTableState({ kind: 'error' });
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="text-body-sm text-[var(--color-fg-muted)]">
          Dashboard /{' '}
          <span className="font-semibold text-[var(--color-fg)]">Profitability</span>
        </div>
      </div>

      <div className="mb-1">
        <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Client Profitability
        </h1>
        <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
          Revenue vs. hours worked — see which clients are making you money this month.
        </p>
      </div>

      {tableState.kind === 'upgrade_required' ? (
        <PlanGate feature="Per-client profitability" requiredPlan="growth" />
      ) : (
        <>
          <BenchmarkCards />
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-xs)]">
            <ProfitabilityTable state={tableState} />
          </div>
        </>
      )}
    </div>
  );
}
