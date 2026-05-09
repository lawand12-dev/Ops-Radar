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

const C = {
  card: '#0F1923',
  border: 'rgba(0,194,255,0.1)',
  accent: '#00C2FF',
  text: '#E0F0FF',
  muted: '#4A6280',
  red: '#FF4D4D',
};

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
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '20px 20px 16px',
        flex: 1,
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Sales / CRM</div>
        {okData && <span style={{ fontSize: 11, color: C.muted }}>{okData.period_label}</span>}
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
        <div style={{ fontSize: 12, color: C.muted }}>Sign in to see sales data.</div>
      )}
    </div>
  );
}

function SkeletonState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ height: 28, background: 'rgba(0,194,255,0.05)', borderRadius: 4 }} />
      <div style={{ height: 16, background: 'rgba(0,194,255,0.05)', borderRadius: 4, width: '60%' }} />
      <div style={{ height: 16, background: 'rgba(0,194,255,0.05)', borderRadius: 4, width: '40%' }} />
      <div style={{ height: 40, background: 'rgba(0,194,255,0.05)', borderRadius: 4, marginTop: 12 }} />
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

  const allEmpty = pipeline === 0 && newLeads === 0;

  if (allEmpty) {
    return (
      <div style={{ fontSize: 12.5, color: C.muted }}>No deals or new leads in the last 14 days.</div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
      <Row label="Pipeline" value={fmtCurrency(pipeline)} color={C.text} />
      <Row label="New leads" value={newLeads.toString()} color={C.accent} />
      <Row
        label="Auto-created"
        value={`${autoLeads} of ${newLeads}`}
        color={C.muted}
      />
      <Sparkline values={sparkline} />
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 36, marginTop: 8 }}>
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

function NotConnectedState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
        HubSpot isn&apos;t connected to your automations yet. Set it up in n8n to see your pipeline,
        new leads, and which were auto-created by your workflows.
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
  staleData?: SalesData;
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
        HubSpot is temporarily unreachable.
        {minutes !== null && (
          <span style={{ color: C.muted, marginLeft: 6 }}>
            Last good fetch: {minutes}m ago
          </span>
        )}
      </div>
      {staleData && staleData.hubspot_connected && <DataState data={staleData} />}
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
