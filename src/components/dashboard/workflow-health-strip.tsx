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
      style={{
        background: failingTone ? 'rgba(255,77,77,0.05)' : C.card,
        border: `1px solid ${failingTone ? 'rgba(255,77,77,0.18)' : C.border}`,
        borderRadius: 12,
        padding: '14px 20px',
        marginBottom: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      {loading && (
        <div
          style={{ height: 18, width: 320, background: 'rgba(0,194,255,0.05)', borderRadius: 4 }}
        />
      )}
      {!loading && data && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <Pill dotColor={C.green} label={`${data.healthy_count} healthy`} />
          <Pill
            dotColor={data.failing_count > 0 ? C.red : C.muted}
            label={`${data.failing_count} failing`}
          />
          <Pill
            dotColor={data.open_alerts > 0 ? C.amber : C.muted}
            label={`${data.open_alerts} alerts`}
          />
        </div>
      )}
      {!loading && !data && response?.status === 'error' && (
        <span style={{ fontSize: 12.5, color: C.red }}>
          Automation status unavailable — {response.message}
        </span>
      )}
      <a
        href={data?.monitor_url ?? 'https://opstest.atta.codes/#/projects'}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 12.5,
          fontWeight: 500,
          color: C.accent,
          textDecoration: 'none',
        }}
      >
        Open monitor →
      </a>
    </div>
  );
}

function Pill({ dotColor, label }: { dotColor: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.text }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
