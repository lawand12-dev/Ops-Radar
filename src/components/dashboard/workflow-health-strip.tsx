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

export function WorkflowHealthStrip() {
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/dashboard/automation-roi', { cache: 'no-store' });
        const data = (await res.json()) as ApiResponse;
        if (!cancelled) setResponse(data);
      } catch (err) {
        if (!cancelled) {
          setResponse({
            status: 'error',
            message: err instanceof Error ? err.message : 'Network error',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const data: WidgetData | undefined =
    response?.status === 'ok' ? response.data : response?.staleData;

  const failingTone = (data?.failing_count ?? 0) > 0;

  return (
    <div
      className={cn(
        'mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-md)] border px-5 py-3.5',
        failingTone
          ? 'border-[color-mix(in_srgb,var(--color-danger)_18%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_5%,transparent)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)]',
      )}
    >
      {loading && <div className="h-[18px] w-[320px] rounded-[4px] bg-[var(--color-surface-sunken)]" />}
      {!loading && data && (
        <div className="flex flex-wrap items-center gap-4">
          <Pill tone="success" label={`${data.healthy_count} healthy`} />
          <Pill tone={data.failing_count > 0 ? 'danger' : 'muted'} label={`${data.failing_count} failing`} />
          <Pill tone={data.open_alerts > 0 ? 'warn' : 'muted'} label={`${data.open_alerts} alerts`} />
        </div>
      )}
      {!loading && !data && response?.status === 'error' && (
        <span className="text-[12.5px] text-[var(--color-danger)]">
          Automation status unavailable — {response.message}
        </span>
      )}
      <a
        href={data?.monitor_url ?? 'https://opstest.atta.codes/#/projects'}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[12.5px] font-medium text-[var(--color-primary)] hover:underline"
      >
        Open monitor →
      </a>
    </div>
  );
}

const DOT_TONE: Record<'success' | 'danger' | 'warn' | 'muted', string> = {
  success: 'bg-[var(--color-success)]',
  danger:  'bg-[var(--color-danger)]',
  warn:    'bg-[var(--color-warn)]',
  muted:   'bg-[var(--color-fg-subtle)]',
};

function Pill({ tone, label }: { tone: keyof typeof DOT_TONE; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--color-fg)]">
      <span className={cn('size-2 shrink-0 rounded-full', DOT_TONE[tone])} />
      {label}
    </span>
  );
}
