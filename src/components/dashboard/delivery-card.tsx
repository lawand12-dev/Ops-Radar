'use client';

import { useEffect, useState } from 'react';
import { cn } from '<npm>/lib/utils';

type MetricsData = {
  revenue: { total: number; weekly: number[] };
  invoiced: { total: number; paid: number; overdue: number };
  hours_tracked: { total: number; weekly: number[] };
  active_projects: { count: number };
  tasks: { completed: number; in_progress: number; todo: number };
  profit_margin_pct: number | null;
  period_label: string;
  sources_connected: string[];
  backfill_pending: boolean;
};

type ApiResponse =
  | { status: 'ok'; data: MetricsData; fromCache: boolean }
  | { status: 'error'; message: string; staleData?: MetricsData; staleAgeMs?: number }
  | { error: string };

const N8N_MANAGE_URL = 'https://opsradar.app.n8n.cloud/home/credentials';

export function DeliveryCard() {
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/metrics', { cache: 'no-store' });
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

  const okData =
    response && 'status' in response && response.status === 'ok' ? response.data : undefined;

  const neitherConnected =
    okData &&
    !okData.sources_connected.includes('toggl') &&
    !okData.sources_connected.includes('clickup');

  return (
    <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 pb-4 pt-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[14px] font-semibold text-[var(--color-fg)]">Delivery</div>
        {okData && <span className="text-[11px] text-[var(--color-fg-muted)]">{okData.period_label}</span>}
      </div>

      {loading && <Skeleton />}

      {!loading && okData && !neitherConnected && <Content data={okData} />}

      {!loading && neitherConnected && <NeitherConnected />}

      {!loading && response && 'status' in response && response.status === 'error' && (
        <ErrorState
          staleData={response.staleData}
          staleAgeMs={response.staleAgeMs}
          onRetry={load}
        />
      )}

      {!loading && response && 'error' in response && (response as { error: string }).error === 'unauthorized' && (
        <div className="text-[12px] text-[var(--color-fg-muted)]">Sign in to see delivery data.</div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="h-7 w-3/5 rounded bg-[var(--color-surface-sunken)]" />
      <div className="h-4 w-2/5 rounded bg-[var(--color-surface-sunken)]" />
      <div className="h-4 w-1/2 rounded bg-[var(--color-surface-sunken)]" />
      <div className="mt-2 h-9 rounded bg-[var(--color-surface-sunken)]" />
    </div>
  );
}

function Content({ data }: { data: MetricsData }) {
  const hasToggl = data.sources_connected.includes('toggl');
  const hasClickup = data.sources_connected.includes('clickup');
  const hasNeither = !hasToggl && !hasClickup;

  return (
    <div className="flex flex-col gap-2.5">
      {data.backfill_pending && (
        <div className="text-[12px] italic text-[var(--color-fg-muted)]">
          Historical import in progress — showing recent data only
        </div>
      )}
      <div
        className={cn(
          'text-[28px] font-bold leading-none tracking-[-0.5px] text-[var(--color-fg)]',
          !hasToggl && 'opacity-40',
        )}
      >
        {data.hours_tracked.total.toFixed(1)}h tracked
      </div>
      <Row label="Active projects" value={data.active_projects.count.toString()} fade={!hasClickup} />
      <Row
        label="Tasks completed"
        value={data.tasks.completed.toString()}
        tone="accent"
        fade={!hasClickup}
      />
      <Row label="In progress" value={data.tasks.in_progress.toString()} fade={!hasClickup} />
      <Row label="To do" value={data.tasks.todo.toString()} fade={!hasClickup} />
      {!hasNeither && (!hasToggl || !hasClickup) && (
        <div className="mt-1 flex flex-wrap gap-2">
          {!hasToggl && (
            <a
              href={N8N_MANAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[var(--radius)] bg-[var(--color-primary)] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
            >
              Connect Toggl in n8n →
            </a>
          )}
          {!hasClickup && (
            <a
              href={N8N_MANAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[var(--radius)] bg-[var(--color-primary)] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
            >
              Connect ClickUp in n8n →
            </a>
          )}
        </div>
      )}
      {hasToggl && data.hours_tracked.weekly.length > 0 && (
        <Sparkline values={data.hours_tracked.weekly} />
      )}
    </div>
  );
}

const ROW_TONE = {
  default: 'text-[var(--color-fg)]',
  accent:  'text-[var(--color-primary)]',
} as const;

function Row({
  label,
  value,
  tone,
  fade,
}: {
  label: string;
  value: string;
  tone?: keyof typeof ROW_TONE;
  fade: boolean;
}) {
  return (
    <div className={cn('flex items-baseline justify-between', fade && 'opacity-40')}>
      <span className="text-[12px] text-[var(--color-fg-muted)]">{label}</span>
      <span className={cn('text-[13.5px] font-semibold', ROW_TONE[tone ?? 'default'])}>{value}</span>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="mt-1.5 flex h-9 items-end gap-px">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-[1px] bg-[var(--color-primary)] opacity-60"
          style={{ height: `${(v / max) * 100}%`, minHeight: 1 }}
        />
      ))}
    </div>
  );
}

function NeitherConnected() {
  return (
    <div className="flex flex-col items-start gap-2.5">
      <div className="text-[12.5px] leading-[1.5] text-[var(--color-fg-muted)]">
        Toggl and ClickUp aren&apos;t connected yet. Set them up in n8n to see hours tracked, active
        projects, and task progress.
      </div>
      <a
        href={N8N_MANAGE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-[var(--radius)] bg-[var(--color-primary)] px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
      >
        Manage in n8n →
      </a>
    </div>
  );
}

function ErrorState({
  staleData,
  staleAgeMs,
  onRetry,
}: {
  staleData?: MetricsData;
  staleAgeMs?: number;
  onRetry: () => void;
}) {
  const minutes = staleAgeMs ? Math.round(staleAgeMs / 60_000) : null;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-2.5 py-2 text-[12px] text-[var(--color-danger)]">
        Delivery data temporarily unreachable.
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
        className="cursor-pointer border-none bg-transparent p-0 text-left text-[12px] text-[var(--color-primary)] hover:underline"
      >
        Retry →
      </button>
    </div>
  );
}
