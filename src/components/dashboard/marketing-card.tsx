'use client';

import { useEffect, useState } from 'react';
import { cn } from '<npm>/lib/utils';

type WidgetData = {
  emails_sent: number | null;
  open_rate_pct: number | null;
  reply_rate_pct: number | null;
  reply_sparkline: number[] | null;
  meetings_booked: number | null;
  meeting_conversion_pct: number | null;
  apollo_connected: boolean;
  calendly_connected: boolean;
  period_label: string;
};

type ApiResponse =
  | { status: 'ok'; data: WidgetData; fromCache: boolean }
  | { status: 'error'; message: string; staleData?: WidgetData; staleAgeMs?: number }
  | { error: string };

const N8N_MANAGE_URL = 'https://opsradar.app.n8n.cloud/home/credentials';

const fmtNumber = (n: number | null) =>
  n == null ? '—' : n.toLocaleString('en-US', { maximumFractionDigits: 0 });

const fmtPct = (n: number | null) =>
  n == null ? '—' : `${n.toFixed(1)}%`;

export function MarketingCard() {
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/marketing', { cache: 'no-store' });
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

  const neitherConnected = okData && !okData.apollo_connected && !okData.calendly_connected;

  return (
    <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 pb-4 pt-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[14px] font-semibold text-[var(--color-fg)]">Marketing / Outreach</div>
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

      {!loading && response && 'error' in response && response.error === 'unauthorized' && (
        <div className="text-[12px] text-[var(--color-fg-muted)]">Sign in to see marketing data.</div>
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

function Content({ data }: { data: WidgetData }) {
  const allEmpty =
    (data.emails_sent ?? 0) === 0 &&
    (data.meetings_booked ?? 0) === 0 &&
    data.apollo_connected &&
    data.calendly_connected;

  if (allEmpty) {
    return (
      <div className="text-[12.5px] text-[var(--color-fg-muted)]">
        No outreach activity in the last 14 days.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-[32px] font-bold leading-none tracking-[-0.5px] text-[var(--color-fg)]">
        {fmtNumber(data.meetings_booked)} meetings booked
      </div>
      <div className="mb-1.5 text-[13px] text-[var(--color-fg-muted)]">
        {data.calendly_connected ? 'via Calendly' : 'Calendly not connected — set it up in n8n'}
      </div>
      <Row label="Emails sent" value={fmtNumber(data.emails_sent)} fade={!data.apollo_connected} />
      <Row label="Open rate" value={fmtPct(data.open_rate_pct)} fade={!data.apollo_connected} />
      <Row label="Reply rate" value={fmtPct(data.reply_rate_pct)} fade={!data.apollo_connected} />
      <Row
        label="Meeting conversion"
        value={fmtPct(data.meeting_conversion_pct)}
        fade={!(data.apollo_connected && data.calendly_connected)}
      />
      {(!data.apollo_connected || !data.calendly_connected) && (
        <a
          href={N8N_MANAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 self-start rounded-[var(--radius)] bg-[var(--color-primary)] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
        >
          {!data.apollo_connected && !data.calendly_connected
            ? 'Manage in n8n →'
            : !data.apollo_connected
              ? 'Connect Apollo in n8n →'
              : 'Connect Calendly in n8n →'}
        </a>
      )}
      {data.apollo_connected && data.reply_sparkline && data.reply_sparkline.length > 0 && (
        <Sparkline values={data.reply_sparkline} />
      )}
    </div>
  );
}

function Row({ label, value, fade }: { label: string; value: string; fade: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between', fade && 'opacity-40')}>
      <span className="text-[12px] text-[var(--color-fg-muted)]">{label}</span>
      <span className="text-[13.5px] font-semibold text-[var(--color-fg)]">{value}</span>
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
        Apollo and Calendly aren&apos;t connected to your automations yet. Set them up in n8n to see
        your outreach funnel — emails sent, replies, and meetings booked.
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
  staleData?: WidgetData;
  staleAgeMs?: number;
  onRetry: () => void;
}) {
  const minutes = staleAgeMs ? Math.round(staleAgeMs / 60_000) : null;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-2.5 py-2 text-[12px] text-[var(--color-danger)]">
        Outreach data temporarily unreachable.
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
