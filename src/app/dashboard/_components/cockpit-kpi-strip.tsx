'use client';

import { useEffect, useState } from 'react';
import { EmptyStateConnect } from './empty-state-connect';

type KpiState =
  | { kind: 'loading' }
  | { kind: 'value';   label: string; value: string; delta?: string; deltaUp?: boolean; spark?: number[] }
  | { kind: 'no-data'; label: string }
  | { kind: 'not-connected'; tool: string; toolSlug: string }
  | { kind: 'error'; label: string; source: string };

type FetchResult = Omit<Extract<KpiState, { kind: 'value' }>, 'kind' | 'label'> | { error: 'not_connected' | 'no_data' | 'failed' };

/**
 * Composes 3 KPI cards.
 *
 * The cards are connect-CTA surfaces — Layer-2 data endpoints were removed
 * with the demolished integration engine, so each card currently renders
 * its no-data state ("No activity yet") exactly as the old stub endpoints
 * did. Future tiles should pull from agent_runs / agent_actions.
 */
export function CockpitKpiStrip() {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      <KpiCard label="Active pipeline"     loader={loadPipeline}    tool="HubSpot"     toolSlug="hubspot" />
      <KpiCard label="New prospects · 7d"  loader={loadProspects}   tool="Apollo"      toolSlug="apollo" />
      <KpiCard label="Booked calls · 7d"   loader={loadBookings}    tool="Calendly"    toolSlug="calendly" />
    </div>
  );
}

type Loader = () => Promise<FetchResult>;

function KpiCard({ label, loader, tool, toolSlug }: {
  label: string;
  loader: Loader;
  tool: string;
  toolSlug: string;
}) {
  const [state, setState] = useState<KpiState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loader()
      .then((r) => {
        if (cancelled) return;
        if ('error' in r) {
          if (r.error === 'not_connected') return setState({ kind: 'not-connected', tool, toolSlug });
          if (r.error === 'no_data') return setState({ kind: 'no-data', label });
          return setState({ kind: 'error', label, source: tool });
        }
        setState({ kind: 'value', label, ...r });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error', label, source: tool });
      });
    return () => { cancelled = true; };
  }, [loader, label, tool, toolSlug]);

  if (state.kind === 'not-connected') {
    return <EmptyStateConnect tool={state.tool} toolSlug={state.toolSlug} description={`Connect ${state.tool} for ${label.toLowerCase()}.`} />;
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
      <div className="mb-1.5 text-label text-[var(--color-fg-subtle)]">
        {label}
      </div>
      {state.kind === 'loading' ? (
        <div className="h-6 w-16 animate-pulse rounded bg-[var(--color-surface-sunken)]" />
      ) : state.kind === 'no-data' ? (
        <div className="text-body-sm text-[var(--color-fg-subtle)]">No activity yet</div>
      ) : state.kind === 'error' ? (
        <div className="text-body-sm text-[var(--color-fg-subtle)]">Couldn&apos;t reach {state.source}</div>
      ) : (
        <>
          <div className="text-h3 font-serif leading-none text-[var(--color-fg)]">
            {state.value}
          </div>
          {state.delta && (
            <div className={`mt-1.5 text-body-sm ${state.deltaUp ? 'text-[var(--color-success)]' : 'text-[var(--color-warn)]'}`}>
              {state.delta}
            </div>
          )}
          {state.spark && state.spark.length > 1 && <Sparkline values={state.spark} up={state.deltaUp ?? true} />}
        </>
      )}
    </div>
  );
}

function Sparkline({ values, up }: { values: number[]; up: boolean }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);
  const w = 100;
  const h = 18;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const stroke = up ? 'var(--color-success)' : 'var(--color-warn)';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-1.5 h-[18px] w-full">
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth={1.5} />
    </svg>
  );
}

// ============================================================
// Loaders — one per KPI. The upstream Layer-2 endpoints were stubs
// (2026-06 demolition) and are gone now; each loader resolves to
// 'no_data' so the card keeps rendering its "No activity yet" state.
// ============================================================

/** Active pipeline — shows "No activity yet". */
async function loadPipeline(): Promise<FetchResult> {
  return { error: 'no_data' };
}

/** New prospects · 7d — shows "No activity yet". */
async function loadProspects(): Promise<FetchResult> {
  return { error: 'no_data' };
}

/** Booked calls · 7d — shows "No activity yet". */
async function loadBookings(): Promise<FetchResult> {
  return { error: 'no_data' };
}
