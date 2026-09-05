'use client';

import { useEffect, useState } from 'react';

type SalesData = {
  hubspot_connected: boolean;
  pipeline_value: number | null;
  new_leads: number | null;
  auto_leads: number | null;
  sparkline: number[] | null;
  period_label: string;
};

type ApiResponse =
  | { status: 'ok'; data: SalesData; fromCache: boolean }
  | { status: 'error'; message: string; staleData?: SalesData; staleAgeMs?: number }
  | { error: string };

const N8N_MANAGE_URL = 'https://opsradar.app.n8n.cloud/home/credentials';

export function SalesCard() {
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/sales', { cache: 'no-store' });
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

  return (
    <div className="flex min-h-[200px] flex-1 flex-col rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 pb-4 pt-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[14px] font-semibold text-[var(--color-fg)]">Sales / CRM</div>
        {okData && <span className="text-[11px] text-[var(--color-fg-muted)]">{okData.period_label}</span>}
      </div>

      {loading && <SkeletonState />}

      {!loading && okData && okData.hubspot_connected && <DataState data={okData} />}

      {!loading && okData && !okData.hubspot_connected && <NotConnectedState />}

      {!loading && response && 'status' in response && response.status === 'error' && (
        <ErrorState
          staleData={response.staleData}
          staleAgeMs={response.staleAgeMs}
          onRetry={load}
        />
      )}

      {!loading && response && 'error' in response && response.error === 'unauthorized' && (
        <div className="text-[12px] text-[var(--color-fg-muted)]">Sign in to see sales data.</div>
      )}
    </div>
  );
}

function SkeletonState() {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="h-7 rounded bg-[var(--color-surface-sunken)]" />
      <div className="h-4 w-3/5 rounded bg-[var(--color-surface-sunken)]" />
      <div className="h-4 w-2/5 rounded bg-[var(--color-surface-sunken)]" />
      <div className="mt-3 h-10 rounded bg-[var(--color-surface-sunken)]" />
    </div>
  );
}

function DataState({ data }: { data: SalesData }) {
  const fmtCurrency = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  const pipeline = data.pipeline_value ?? 0;
  const newLeads = data.new_leads ?? 0;
  const autoLeads = data.auto_leads ?? 0;
  const sparkline = data.sparkline ?? [];

  if (pipeline === 0 && newLeads === 0) {
    return (
      <div className="text-[12.5px] text-[var(--color-fg-muted)]">
        No deals or new leads in the last 14 days.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2.5">
      <Row label="Pipeline" value={fmtCurrency(pipeline)} tone="strong" />
      <Row label="New leads" value={newLeads.toString()} tone="accent" />
      <Row label="Auto-created" value={`${autoLeads} of ${newLeads}`} tone="muted" />
      <Sparkline values={sparkline} />
    </div>
  );
}

const ROW_TONE = {
  strong: 'text-[var(--color-fg)]',
  accent: 'text-[var(--color-primary)]',
  muted:  'text-[var(--color-fg-muted)]',
} as const;

function Row({ label, value, tone }: { label: string; value: string; tone: keyof typeof ROW_TONE }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[12px] text-[var(--color-fg-muted)]">{label}</span>
      <span className={`text-[14px] font-semibold ${ROW_TONE[tone]}`}>{value}</span>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  return (
    <div className="mt-2 flex h-9 items-end gap-px">
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

function NotConnectedState() {
  return (
    <div className="flex flex-col items-start gap-2.5">
      <div className="text-[12.5px] leading-[1.5] text-[var(--color-fg-muted)]">
        HubSpot isn&apos;t connected to your automations yet. Set it up in n8n to see your pipeline,
        new leads, and which were auto-created by your workflows.
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
  staleData?: SalesData;
  staleAgeMs?: number;
  onRetry: () => void;
}) {
  const minutes = staleAgeMs ? Math.round(staleAgeMs / 60_000) : null;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-2.5 py-2 text-[12px] text-[var(--color-danger)]">
        HubSpot is temporarily unreachable.
        {minutes !== null && (
          <span className="ml-1.5 text-[var(--color-fg-muted)]">
            Last good fetch: {minutes}m ago
          </span>
        )}
      </div>
      {staleData && staleData.hubspot_connected && <DataState data={staleData} />}
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
