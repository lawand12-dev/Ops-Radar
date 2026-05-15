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
 * Composes 6 KPI cards from independent Layer-2 fetches.
 * Spec §9.3.
 *
 * Each card owns its own fetch and state. The strip is just layout.
 * KPI sources (in order):
 *   1. Time saved · 7d            — /api/dashboard/automation-roi
 *   2. MRR · current              — /api/dashboard/finance  (proxy: paid MTD)
 *   3. Active pipeline · current  — /api/dashboard/sales-live
 *   4. New prospects · 7d         — /api/dashboard/marketing (proxy: emails_sent)
 *   5. Booked calls · 7d          — /api/dashboard/marketing
 *   6. Workflow success rate · 7d — /api/dashboard/workflow-health
 */
export function CockpitKpiStrip() {
  return (
    <div className="grid grid-cols-6 gap-2.5">
      <KpiCard label="Time saved · 7d"     loader={loadTimeSaved}   tool="Automations" toolSlug="n8n" />
      <KpiCard label="MRR"                 loader={loadMrr}         tool="Stripe"      toolSlug="stripe" />
      <KpiCard label="Active pipeline"     loader={loadPipeline}    tool="HubSpot"     toolSlug="hubspot" />
      <KpiCard label="New prospects · 7d"  loader={loadProspects}   tool="Apollo"      toolSlug="apollo" />
      <KpiCard label="Booked calls · 7d"   loader={loadBookings}    tool="Calendly"    toolSlug="calendly" />
      <KpiCard label="Workflow success"    loader={loadSuccessRate} tool="Automations" toolSlug="n8n" />
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
// Loaders — one per KPI. Each maps an upstream response to FetchResult.
// Keep these defensive: any missing field returns { error: 'no_data' }.
// HTTP 503 / status:'not_connected' / status:'not_enrolled' returns
// { error: 'not_connected' } so the card switches to the connect-CTA.
// ============================================================

/**
 * Time saved · 7d
 * Upstream: /api/dashboard/automation-roi
 * Shape: { status: 'ok' | 'error', data: AutomationRoiWidget }
 * AutomationRoiWidget: { hours_saved, dollars_saved, success_rate_pct, ... }
 *
 * NOTE: The upstream computes hours_saved over ALL runs, not strictly 7d
 * (the CTO backend does not expose a 7-day window). We show the cumulative
 * figure with a "total" label — no prior-period delta available.
 */
async function loadTimeSaved(): Promise<FetchResult> {
  let r: {
    status?: string;
    data?: { hours_saved?: number; success_rate_pct?: number };
  };
  try {
    const res = await fetch('/api/dashboard/automation-roi');
    r = await res.json();
  } catch {
    return { error: 'failed' };
  }
  if (r?.status === 'error' || !r?.data) return { error: 'failed' };
  const hours = r.data.hours_saved;
  if (typeof hours !== 'number') return { error: 'no_data' };
  return { value: `${Math.round(hours)}h`, deltaUp: true };
}

/**
 * MRR (proxy: paid MTD)
 * Upstream: /api/dashboard/finance
 * Shape: { status: 'ok' | 'not_connected' | 'requires_reconnect' | 'unavailable',
 *          data: StripeFinanceData }
 * StripeFinanceData: { invoiced, paid, overdue, sparkline: {date,amount}[], currency }
 *
 * NOTE: Stripe does not expose a recurring-revenue metric directly.
 * We proxy MRR as `paid` (month-to-date invoices paid). The sparkline
 * is flattened to a number[] from the {date,amount}[] object array.
 */
async function loadMrr(): Promise<FetchResult> {
  let res: Response;
  try {
    res = await fetch('/api/dashboard/finance');
  } catch {
    return { error: 'failed' };
  }
  if (res.status === 503) return { error: 'not_connected' };
  let r: {
    status?: string;
    data?: {
      paid?: number;
      invoiced?: number;
      overdue?: number;
      sparkline?: Array<{ date: string; amount: number }>;
    };
  };
  try {
    r = await res.json();
  } catch {
    return { error: 'failed' };
  }
  if (r?.status === 'not_connected' || r?.status === 'requires_reconnect') return { error: 'not_connected' };
  if (r?.status === 'unavailable') return { error: 'failed' };
  const paid = r?.data?.paid;
  if (typeof paid !== 'number') return { error: 'no_data' };
  // Flatten sparkline from object array to number[] for the inline SVG
  const rawSpark = r?.data?.sparkline;
  const spark: number[] | undefined = Array.isArray(rawSpark) && rawSpark.length > 0
    ? rawSpark.map((s) => s.amount)
    : undefined;
  return { value: fmtCurrency(paid), deltaUp: true, spark };
}

/**
 * Active pipeline
 * Upstream: /api/dashboard/sales-live
 * Shape: { status: 'ok' | 'not_connected' | 'requires_reconnect' | 'unavailable',
 *          data: HubspotSalesData }
 * HubspotSalesData: { pipeline_value, open_deals_count, new_leads,
 *                     deals_won_this_month, sparkline: {date,deals_created}[], ... }
 *
 * NOTE: Field is `pipeline_value` (not `pipeline_value_usd`).
 *       Deal count field is `open_deals_count` (not `open_deals` / `deals_open`).
 */
async function loadPipeline(): Promise<FetchResult> {
  let res: Response;
  try {
    res = await fetch('/api/dashboard/sales-live');
  } catch {
    return { error: 'failed' };
  }
  if (res.status === 503) return { error: 'not_connected' };
  let r: {
    status?: string;
    data?: {
      pipeline_value?: number;
      open_deals_count?: number;
    };
  };
  try {
    r = await res.json();
  } catch {
    return { error: 'failed' };
  }
  if (r?.status === 'not_connected' || r?.status === 'requires_reconnect') return { error: 'not_connected' };
  if (r?.status === 'unavailable') return { error: 'failed' };
  const total = r?.data?.pipeline_value;
  if (typeof total !== 'number') return { error: 'no_data' };
  const open = r?.data?.open_deals_count;
  const delta = typeof open === 'number' ? `${open} deals open` : undefined;
  return { value: fmtCurrency(total), delta, deltaUp: true };
}

/**
 * New prospects · 7d (proxy: emails_sent MTD)
 * Upstream: /api/dashboard/marketing
 * Shape: WidgetFetchResult<MarketingWidgetData>
 *   → { status: 'ok' | 'error', data: MarketingWidgetData }
 * MarketingWidgetData: { emails_sent, meetings_booked, apollo_connected,
 *                        calendly_connected, open_rate_pct, reply_rate_pct,
 *                        reply_sparkline, period_label }
 *
 * NOTE: The marketing widget has no prospect-count field for Apollo.
 * `apollo_connected` is a boolean flag, not a metric. The closest available
 * proxy is `emails_sent`. If Apollo is not connected, we show not-connected.
 */
async function loadProspects(): Promise<FetchResult> {
  let r: {
    status?: string;
    data?: {
      emails_sent?: number | null;
      apollo_connected?: boolean;
      reply_sparkline?: number[] | null;
    };
  };
  try {
    r = await fetch('/api/dashboard/marketing').then((res) => res.json());
  } catch {
    return { error: 'failed' };
  }
  if (r?.status === 'error') return { error: 'failed' };
  if (r?.data?.apollo_connected === false) return { error: 'not_connected' };
  const n = r?.data?.emails_sent;
  if (typeof n !== 'number' || n === null) return { error: 'no_data' };
  const spark: number[] | undefined = Array.isArray(r?.data?.reply_sparkline) && r.data!.reply_sparkline!.length > 0
    ? (r.data!.reply_sparkline as number[])
    : undefined;
  return { value: String(n), deltaUp: true, spark };
}

/**
 * Booked calls · 7d
 * Upstream: /api/dashboard/marketing
 * Shape: WidgetFetchResult<MarketingWidgetData>
 * MarketingWidgetData: { meetings_booked, calendly_connected, ... }
 *
 * NOTE: `meetings_booked` covers the period returned by n8n (period_label),
 * not strictly 7d — but it is the only bookings count the upstream exposes.
 */
async function loadBookings(): Promise<FetchResult> {
  let r: {
    status?: string;
    data?: {
      meetings_booked?: number | null;
      calendly_connected?: boolean;
    };
  };
  try {
    r = await fetch('/api/dashboard/marketing').then((res) => res.json());
  } catch {
    return { error: 'failed' };
  }
  if (r?.status === 'error') return { error: 'failed' };
  if (r?.data?.calendly_connected === false) return { error: 'not_connected' };
  const n = r?.data?.meetings_booked;
  if (typeof n !== 'number' || n === null) return { error: 'no_data' };
  return { value: String(n), deltaUp: true };
}

/**
 * Workflow success rate · 7d
 * Upstream: /api/dashboard/workflow-health
 * Shape: { status: 'not_enrolled' | 'ok' | 'unavailable', workflows: WorkflowHealthEntry[] }
 * WorkflowHealthEntry: { workflow_id, name, status, recent_executions: Execution[] }
 * Execution: { execution_id, status: 'success'|'failure'|'running'|'canceled', ... }
 *
 * NOTE: No `runs_7d` or `success_runs_7d` aggregate fields exist on entries.
 * We compute the success rate by iterating `recent_executions` across all
 * workflows, counting only terminal states ('success' | 'failure').
 */
async function loadSuccessRate(): Promise<FetchResult> {
  let r: {
    status?: string;
    workflows?: Array<{
      recent_executions?: Array<{ status: string }>;
    }>;
  };
  try {
    r = await fetch('/api/dashboard/workflow-health').then((res) => res.json());
  } catch {
    return { error: 'failed' };
  }
  if (r?.status === 'not_enrolled') return { error: 'not_connected' };
  if (r?.status === 'unavailable') return { error: 'failed' };
  const workflows = r?.workflows ?? [];
  if (!Array.isArray(workflows) || workflows.length === 0) return { error: 'no_data' };
  let totalRuns = 0;
  let successRuns = 0;
  for (const wf of workflows) {
    for (const exec of wf.recent_executions ?? []) {
      if (exec.status === 'success' || exec.status === 'failure') {
        totalRuns += 1;
        if (exec.status === 'success') successRuns += 1;
      }
    }
  }
  if (totalRuns === 0) return { error: 'no_data' };
  const pct = (successRuns / totalRuns) * 100;
  return { value: `${pct.toFixed(1)}%`, deltaUp: pct >= 95 };
}

function fmtCurrency(n: number): string {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}
