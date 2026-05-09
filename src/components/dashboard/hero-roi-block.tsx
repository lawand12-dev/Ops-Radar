'use client';

import { useEffect, useState } from 'react';

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

const C = {
  card: '#0F1923',
  border: 'rgba(0,194,255,0.1)',
  accent: '#00C2FF',
  text: '#E0F0FF',
  muted: '#4A6280',
  green: '#22C55E',
  amber: '#F59E0B',
  red: '#FF4D4D',
};

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
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '28px 28px 24px',
        marginBottom: 14,
      }}
    >
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ height: 56, background: 'rgba(0,194,255,0.05)', borderRadius: 6, width: '40%' }} />
      <div style={{ height: 14, background: 'rgba(0,194,255,0.05)', borderRadius: 4, width: '55%' }} />
      <div style={{ height: 28, background: 'rgba(0,194,255,0.05)', borderRadius: 6, width: '70%', marginTop: 4 }} />
    </div>
  );
}

function Content({ data }: { data: WidgetData }) {
  if (data.total_workflows === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>No automations yet</div>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
          Once your first workflow runs, your saved hours and dollars will show up here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 56, fontWeight: 700, color: C.text, lineHeight: 1, letterSpacing: '-1.5px' }}>
        {fmtCurrency(data.dollars_saved)} saved
      </div>
      <div style={{ fontSize: 13.5, color: C.muted }}>
        based on {fmtNumber(data.actions_automated)} actions automated
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        <Chip label={`${data.hours_saved.toFixed(1)}h saved`} tone="accent" />
        <Chip label={`${fmtNumber(data.total_workflows)} workflows`} tone="muted" />
        <Chip
          label={`${fmtNumber(data.open_alerts)} alerts open`}
          tone={data.open_alerts > 0 ? 'amber' : 'muted'}
        />
        <Chip
          label={`${data.success_rate_pct.toFixed(1)}% success rate`}
          tone={data.success_rate_pct >= 90 ? 'green' : data.success_rate_pct >= 50 ? 'amber' : 'red'}
        />
      </div>
    </div>
  );
}

function Chip({ label, tone }: { label: string; tone: 'accent' | 'muted' | 'amber' | 'red' | 'green' }) {
  const colors: Record<typeof tone, { fg: string; bg: string }> = {
    accent: { fg: C.accent, bg: 'rgba(0,194,255,0.1)' },
    muted: { fg: C.muted, bg: 'rgba(74,98,128,0.12)' },
    amber: { fg: C.amber, bg: 'rgba(245,158,11,0.14)' },
    red: { fg: C.red, bg: 'rgba(255,77,77,0.14)' },
    green: { fg: C.green, bg: 'rgba(34,197,94,0.14)' },
  };
  const { fg, bg } = colors[tone];
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: fg,
        background: bg,
        padding: '4px 10px',
        borderRadius: 999,
      }}
    >
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          background: 'rgba(255,77,77,0.08)',
          border: `1px solid rgba(255,77,77,0.3)`,
          borderRadius: 8,
          padding: '10px 12px',
          fontSize: 12.5,
          color: C.red,
        }}
      >
        Automation system temporarily unreachable.
        {minutes !== null && (
          <span style={{ color: C.muted, marginLeft: 6 }}>
            Last good fetch: {minutes}m ago
          </span>
        )}
      </div>
      {staleData && <Content data={staleData} />}
      <button
        onClick={onRetry}
        style={{
          alignSelf: 'flex-start',
          fontSize: 12,
          color: C.accent,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        Retry →
      </button>
    </div>
  );
}
