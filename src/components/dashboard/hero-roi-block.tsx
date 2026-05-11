'use client';

import { useEffect, useState } from 'react';
import { cn } from '<npm>/lib/utils';

type WidgetData = {
  dollars_saved: number;
  hours_saved: number;
  actions_automated: number;
  success_rate_pct: number;
  total_workflows: number;
  open_alerts: number;
  healthy_count: number;
  failing_count: number;
  monitor_url: string;
};

type ApiResponse =
  | { status: 'ok'; data: WidgetData; fromCache: boolean }
  | { status: 'error'; message: string; staleData?: WidgetData; staleAgeMs?: number };

const fmtCurrency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtNumber = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 0 });

export function HeroRoiBlock() {
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/automation-roi', { cache: 'no-store' });
      const data = (await res.json()) as ApiResponse;
      setResponse(data);
    } catch (err) {
      setResponse({
        status: 'error',
        message: err instanceof Error ? err.message : 'Network error',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mb-3.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-7 pb-6 pt-7">
      {loading && <Skeleton />}
      {!loading && response?.status === 'ok' && <Content data={response.data} />}
      {!loading && response?.status === 'error' && (
        <ErrorContent
          staleData={response.staleData}
          staleAgeMs={response.staleAgeMs}
          onRetry={load}
        />
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-14 w-2/5 rounded-md bg-[var(--color-surface-sunken)]" />
      <div className="h-3.5 w-[55%] rounded bg-[var(--color-surface-sunken)]" />
      <div className="mt-1 h-7 w-[70%] rounded-md bg-[var(--color-surface-sunken)]" />
    </div>
  );
}

function Content({ data }: { data: WidgetData }) {
  if (data.total_workflows === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-[22px] font-bold text-[var(--color-fg)]">No automations yet</div>
        <div className="text-[13px] leading-[1.5] text-[var(--color-fg-muted)]">
          Once your first workflow runs, your saved hours and dollars will show up here.
        </div>
      </div>
    );
  }

  const successTone: ChipTone =
    data.success_rate_pct >= 90 ? 'green' : data.success_rate_pct >= 50 ? 'amber' : 'red';

  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-[56px] font-bold leading-none tracking-[-1.5px] text-[var(--color-fg)]">
        {fmtCurrency(data.dollars_saved)} saved
      </div>
      <div className="text-[13.5px] text-[var(--color-fg-muted)]">
        based on {fmtNumber(data.actions_automated)} actions automated
      </div>
      <div className="mt-2 flex flex-wrap gap-2.5">
        <Chip label={`${data.hours_saved.toFixed(1)}h saved`} tone="accent" />
        <Chip label={`${fmtNumber(data.total_workflows)} workflows`} tone="muted" />
        <Chip
          label={`${fmtNumber(data.open_alerts)} alerts open`}
          tone={data.open_alerts > 0 ? 'amber' : 'muted'}
        />
        <Chip label={`${data.success_rate_pct.toFixed(1)}% success rate`} tone={successTone} />
      </div>
    </div>
  );
}

type ChipTone = 'accent' | 'muted' | 'amber' | 'red' | 'green';

const CHIP_TONE: Record<ChipTone, string> = {
  accent: 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]',
  muted:  'bg-[var(--color-surface-sunken)] text-[var(--color-fg-muted)]',
  amber:  'bg-[color-mix(in_srgb,var(--color-warn)_14%,transparent)] text-[var(--color-warn)]',
  red:    'bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)] text-[var(--color-danger)]',
  green:  'bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)]',
};

function Chip({ label, tone }: { label: string; tone: ChipTone }) {
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-[12px] font-semibold', CHIP_TONE[tone])}>
      {label}
    </span>
  );
}

function ErrorContent({
  staleData,
  staleAgeMs,
  onRetry,
}: {
  staleData?: WidgetData;
  staleAgeMs?: number;
  onRetry: () => void;
}) {
  const minutes = staleAgeMs ? Math.round(staleAgeMs / 60_000) : null;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-3 py-2.5 text-[12.5px] text-[var(--color-danger)]">
        Automation system temporarily unreachable.
        {minutes !== null && (
          <span className="ml-1.5 text-[var(--color-fg-muted)]">
            Last good fetch: {minutes}m ago
          </span>
        )}
      </div>
      {staleData && <Content data={staleData} />}
      <button
        type="button"
        onClick={onRetry}
        className="cursor-pointer self-start border-none bg-transparent p-0 text-[12px] text-[var(--color-primary)] hover:underline"
      >
        Retry →
      </button>
    </div>
  );
}
