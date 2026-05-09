'use client';

import { useEffect, useState } from 'react';
import { ConnectHubSpotModal } from '<npm>/components/dashboard/connect-hubspot-modal';
import { ConnectApolloModal } from '<npm>/components/dashboard/connect-apollo-modal';
import { ConnectCalendlyModal } from '<npm>/components/dashboard/connect-calendly-modal';

type ConnectedTool = { tool: string; connected_at: string };

type ToolDef = {
  key: string;
  label: string;
  blurb: string;
  cardKey: string; // which dashboard card consumes it
  status: 'available' | 'coming_soon';
};

const TOOL_CATALOG: ToolDef[] = [
  { key: 'hubspot',  label: 'HubSpot',  blurb: 'CRM — pipeline value, leads, auto-created deals', cardKey: 'Sales',     status: 'available' },
  { key: 'apollo',   label: 'Apollo',   blurb: 'Cold outreach — emails sent, opens, replies',     cardKey: 'Marketing', status: 'available' },
  { key: 'calendly', label: 'Calendly', blurb: 'Meetings booked from outreach',                   cardKey: 'Marketing', status: 'available' },
  { key: 'clickup',  label: 'ClickUp',  blurb: 'Projects, tasks, deadlines',                      cardKey: 'Delivery',  status: 'coming_soon' },
  { key: 'asana',    label: 'Asana',    blurb: 'Projects, tasks, deadlines',                      cardKey: 'Delivery',  status: 'coming_soon' },
  { key: 'toggl',    label: 'Toggl',    blurb: 'Hours tracked, utilization',                      cardKey: 'Delivery',  status: 'coming_soon' },
  { key: 'stripe',   label: 'Stripe',   blurb: 'Invoiced, paid, overdue',                         cardKey: 'Finance',   status: 'coming_soon' },
];

const C = {
  bg: '#080C14',
  card: '#0F1923',
  border: 'rgba(0,194,255,0.1)',
  accent: '#00C2FF',
  text: '#E0F0FF',
  muted: '#4A6280',
  green: '#22C55E',
  red: '#FF4D4D',
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function IntegrationsSettingsPage() {
  const [connected, setConnected] = useState<ConnectedTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hubspotOpen, setHubspotOpen] = useState(false);
  const [apolloOpen, setApolloOpen] = useState(false);
  const [calendlyOpen, setCalendlyOpen] = useState(false);
  const [busyTool, setBusyTool] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to load');
        setConnected([]);
        return;
      }
      setConnected(data.connected ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function isConnected(tool: string): ConnectedTool | undefined {
    return connected.find((c) => c.tool === tool);
  }

  async function disconnect(tool: string) {
    setBusyTool(tool);
    try {
      await fetch(`/api/integrations/${tool}`, { method: 'DELETE' });
      await load();
    } finally {
      setBusyTool(null);
    }
  }

  function openConnect(tool: string) {
    if (tool === 'hubspot') setHubspotOpen(true);
    else if (tool === 'apollo') setApolloOpen(true);
    else if (tool === 'calendly') setCalendlyOpen(true);
  }

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6 }}>Integrations</h1>
        <p style={{ fontSize: 13.5, color: C.muted }}>
          Connect your tools so the dashboard can show live data. Tokens are encrypted at rest and never shared.
        </p>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(255,77,77,0.08)',
            border: `1px solid rgba(255,77,77,0.3)`,
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 12.5,
            color: C.red,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {TOOL_CATALOG.map((t) => {
          const conn = isConnected(t.key);
          const isAvailable = t.status === 'available';
          const isBusy = busyTool === t.key;

          return (
            <div
              key={t.key}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                opacity: isAvailable ? 1 : 0.55,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{t.label}</span>
                  <span
                    style={{
                      fontSize: 10.5,
                      color: C.muted,
                      background: 'rgba(74,98,128,0.15)',
                      borderRadius: 4,
                      padding: '2px 6px',
                      letterSpacing: '0.3px',
                    }}
                  >
                    {t.cardKey} card
                  </span>
                  {conn && (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: C.green,
                        background: 'rgba(34,197,94,0.12)',
                        borderRadius: 4,
                        padding: '2px 8px',
                      }}
                    >
                      Connected
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.4 }}>{t.blurb}</div>
                {conn && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                    Connected on {fmtDate(conn.connected_at)}
                  </div>
                )}
              </div>

              <div style={{ flexShrink: 0 }}>
                {!isAvailable && (
                  <span style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>Coming soon</span>
                )}
                {isAvailable && !conn && !loading && (
                  <button
                    onClick={() => openConnect(t.key)}
                    style={{
                      background: C.accent,
                      color: '#0D1117',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Connect
                  </button>
                )}
                {isAvailable && conn && !loading && (
                  <button
                    onClick={() => disconnect(t.key)}
                    disabled={isBusy}
                    style={{
                      background: 'transparent',
                      color: C.red,
                      border: `1px solid rgba(255,77,77,0.4)`,
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 12.5,
                      fontWeight: 500,
                      cursor: isBusy ? 'wait' : 'pointer',
                      opacity: isBusy ? 0.6 : 1,
                    }}
                  >
                    {isBusy ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                )}
                {loading && (
                  <span style={{ fontSize: 12, color: C.muted }}>Loading…</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConnectHubSpotModal  open={hubspotOpen}  onOpenChange={setHubspotOpen}  onConnected={load} />
      <ConnectApolloModal   open={apolloOpen}   onOpenChange={setApolloOpen}   onConnected={load} />
      <ConnectCalendlyModal open={calendlyOpen} onOpenChange={setCalendlyOpen} onConnected={load} />
    </>
  );
}
