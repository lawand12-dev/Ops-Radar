'use client';

import { useEffect, useState } from 'react';

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

const C = {
  card: '#0F1923',
  border: 'rgba(0,194,255,0.1)',
  accent: '#00C2FF',
  text: '#E0F0FF',
  muted: '#4A6280',
  red: '#FF4D4D',
};

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

  const neitherConnected =
    okData && !okData.apollo_connected && !okData.calendly_connected;

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
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Marketing / Outreach</div>
        {okData && <span style={{ fontSize: 11, color: C.muted }}>{okData.period_label}</span>}
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
        <div style={{ fontSize: 12, color: C.muted }}>Sign in to see marketing data.</div>
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

function Content({ data }: { data: WidgetData }) {
  const allEmpty =
    (data.emails_sent ?? 0) === 0 &&
    (data.meetings_booked ?? 0) === 0 &&
    data.apollo_connected &&
    data.calendly_connected;

  if (allEmpty) {
    return <div style={{ fontSize: 12.5, color: C.muted }}>No outreach activity in the last 14 days.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: C.text, lineHeight: 1, letterSpacing: '-0.5px' }}>
        {fmtNumber(data.meetings_booked)} meetings booked
      </div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>
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
          style={{
            alignSelf: 'flex-start',
            background: C.accent,
            color: '#0D1117',
            border: 'none',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: 4,
            textDecoration: 'none',
          }}
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
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        opacity: fade ? 0.4 : 1,
      }}
    >
      <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{value}</span>
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
        Apollo and Calendly aren&apos;t connected to your automations yet. Set them up in n8n
        to see your outreach funnel — emails sent, replies, and meetings booked.
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
  staleData?: WidgetData;
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
        Outreach data temporarily unreachable.
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
