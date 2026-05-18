// src/app/dashboard/scope/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ScopeTable, ScopeNotConnected } from './_components/scope-table';
import type { ScopeCreepResult } from '<npm>/lib/scope-creep';

type ApiResp =
  | { status: 'ok'; data: ScopeCreepResult; last_synced_at: string }
  | { status: 'not_connected'; missing: ('clickup' | 'harvest')[] }
  | { status: 'unavailable'; message: string };

type PageState =
  | { kind: 'loading' }
  | { kind: 'not_connected'; missing: ('clickup' | 'harvest')[] }
  | { kind: 'error' }
  | { kind: 'ok'; data: ScopeCreepResult; last_synced_at: string };

export default function ScopePage() {
  const [state, setState] = useState<PageState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/scope')
      .then((r) => r.json())
      .then((resp: ApiResp) => {
        if (cancelled) return;
        if (resp.status === 'not_connected') {
          setState({ kind: 'not_connected', missing: resp.missing });
        } else if (resp.status === 'ok') {
          setState({ kind: 'ok', data: resp.data, last_synced_at: resp.last_synced_at });
        } else {
          setState({ kind: 'error' });
        }
      })
      .catch(() => { if (!cancelled) setState({ kind: 'error' }); });
    return () => { cancelled = true; };
  }, []);

  const atRisk =
    state.kind === 'ok'
      ? state.data.projects.filter((p) => p.status === 'at_risk' || p.status === 'over_budget').length
      : 0;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="text-body-sm text-[var(--color-fg-muted)]">
          Dashboard /{' '}
          <span className="font-semibold text-[var(--color-fg)]">Scope Tracker</span>
        </div>
        {state.kind === 'ok' && (
          <span className="text-label text-[var(--color-fg-subtle)]">
            Synced {new Date(state.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      <div className="mb-1">
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
            Scope Tracker
          </h1>
          {atRisk > 0 && (
            <span className="inline-block rounded-[3px] bg-[color-mix(in_srgb,var(--color-warn)_14%,transparent)] px-1.5 py-0.5 text-label font-medium text-[var(--color-warn)]">
              {atRisk} at risk
            </span>
          )}
        </div>
        <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
          ClickUp time budgets vs Harvest hours this month — catch scope creep before it costs you.
        </p>
      </div>

      {state.kind === 'loading' && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-[var(--radius)] bg-[var(--color-surface-sunken)]" />
          ))}
        </div>
      )}

      {state.kind === 'not_connected' && (
        <ScopeNotConnected missing={state.missing} />
      )}

      {state.kind === 'error' && (
        <p className="text-body-sm text-[var(--color-danger)]">
          Failed to load scope data. Check your ClickUp and Harvest connections.
        </p>
      )}

      {state.kind === 'ok' && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <ScopeTable projects={state.data.projects} />
        </div>
      )}
    </div>
  );
}
