'use client';

import { useEffect, useState } from 'react';

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

const C = {
  card: '#0F1923',
  border: 'rgba(0,194,255,0.1)',
  accent: '#00C2FF',
  text: '#E0F0FF',
  muted: '#4A6280',
  red: '#FF4D4D',
};

const N8N_MANAGE_URL = 'https://opsradar.app.n8n.cloud/home/credentials';

const fmtCurrency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtNumber = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 0 });

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
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '20px 20px 16px',
        marginBottom: 18,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Delivery</div>
        {okData && <span style={{ fontSize: 11, color: C.muted }}>{okData.period_label}</span>}
      </div>

      {loading && <Skeleton />}

      {!loading && okData && !neitherConnected && <Content data={okData} onRetry={load} />}

      {!loading && neitherConnected && <NeitherConnected />}

      {!loading && response && 'status' in response && response.status === 'error' && (
        <ErrorState
          staleData={response.staleData}
          staleAgeMs={response.staleAgeMs}
          onRetry={load}
        />
      )}

      {!loading && response && 'error' in response && (response as { error: string }).error === 'unauthorized' && (
        <div style={{ fontSize: 12, color: C.muted }}>Sign in to see delivery data.</div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ height: 28, background: 'rgba(0,194,255,0.05)', borderRadius: 4, width: '60%' }} />
      <div style={{ height: 16, background: 'rgba(0,194,255,0.05)', borderRadius: 4, width: '40%' }} />
      <div style={{ height: 16, background: 'rgba(0,194,255,0.05)', borderRadius: 4, width: '50%' }} />
      <div style={{ height: 36, background: 'rgba(0,194,255,0.05)', borderRadius: 4, marginTop: 8 }} />
    </div>
  );
}

function Content({ data, onRetry: _onRetry }: { data: MetricsData; onRetry: () => void }) {
  const hasToggl = data.sources_connected.includes('toggl');
  const hasClickup = data.sources_connected.includes('clickup');
  const hasNeither = !hasToggl && !hasClickup;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.backfill_pending && (
        <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
          Historical import in progress — showing recent data only
        </div>
      )}
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: C.text,
          lineHeight: 1,
          letterSpacing: '-0.5px',
          opacity: !hasToggl ? 0.4 : 1,
        }}
      >
        {data.hours_tracked.total.toFixed(1)}h tracked
      </div>
      <Row label="Active projects" value={data.active_projects.count.toString()} fade={!hasClickup} />
      <Row
        label="Tasks completed"
        value={data.tasks.completed.toString()}
        color={C.accent}
        fade={!hasClickup}
      />
      <Row label="In progress" value={data.tasks.in_progress.toString()} fade={!hasClickup} />
      <Row label="To do" value={data.tasks.todo.toString()} fade={!hasClickup} />
      {!hasNeither && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          {!hasToggl && (
            <a
              href={N8N_MANAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: C.accent,
                color: '#0D1117',
                border: 'none',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              Connect Toggl in n8n →
            </a>
          )}
          {!hasClickup && (
            <a
              href={N8N_MANAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: C.accent,
                color: '#0D1117',
                border: 'none',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'none',
              }}
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

function Row({
  label,
  value,
  color,
  fade,
}: {
  label: string;
  value: string;
  color?: string;
  fade: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        opacity: fade ? 0.4 : 1,
      }}
    >
      <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: color ?? C.text }}>{value}</span>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 36, marginTop: 6 }}>
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(v / max) * 100}%`,
            background: C.accent,
            opacity: 0.6,
            borderRadius: 1,
            minHeight: 1,
          }}
        />
      ))}
    </div>
  );
}

function NeitherConnected() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
        Toggl and ClickUp aren&apos;t connected yet. Set them up in n8n to see hours tracked, active projects, and task progress.
      </div>
      <a
        href={N8N_MANAGE_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: C.accent,
          color: '#0D1117',
          border: 'none',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer',
          textDecoration: 'none',
        }}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          background: 'rgba(255,77,77,0.08)',
          border: `1px solid rgba(255,77,77,0.3)`,
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 12,
          color: C.red,
        }}
      >
        Delivery data temporarily unreachable.
        {minutes !== null && (
          <span style={{ color: C.muted, marginLeft: 6 }}>
            Last good fetch: {minutes}m ago
          </span>
        )}
      </div>
      {staleData && <Content data={staleData} onRetry={onRetry} />}
      <button
        onClick={onRetry}
        style={{
          fontSize: 12,
          color: C.accent,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
        }}
      >
        Retry →
      </button>
    </div>
  );
}

// suppress unused imports — available for future Row values
void fmtCurrency;
void fmtNumber;
