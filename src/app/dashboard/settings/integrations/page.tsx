'use client';

import { useEffect, useState } from 'react';

type ConnectedTool = { tool: string; connected_at: string };

type ToolDef = {
  key: string;
  label: string;
  blurb: string;
  cardKey: string;
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

const N8N_MANAGE_URL = 'https://opsradar.app.n8n.cloud/home/credentials';

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function IntegrationsSettingsPage() {
  const [connected, setConnected] = useState<ConnectedTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/integrations', { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? 'Failed to load');
          setConnected([]);
          return;
        }
        setConnected(data.connected ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Network error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function isConnected(tool: string): ConnectedTool | undefined {
    return connected.find((c) => c.tool === tool);
  }

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6 }}>Integrations</h1>
        <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.5 }}>
          Tools are connected once in n8n (the workflow engine that runs your automations) and the
          dashboard reads from them via webhooks. Use the button below to manage credentials in n8n.
        </p>
        <a
          href={N8N_MANAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            marginTop: 14,
            background: C.accent,
            color: '#0D1117',
            border: 'none',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 12.5,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Manage credentials in n8n →
        </a>
      </div>

      <N8nConnectionSection />

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

      <h2 style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 10 }}>Tool catalog</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {TOOL_CATALOG.map((t) => {
          const conn = isConnected(t.key);
          const isAvailable = t.status === 'available';

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
                {isAvailable && !loading && (
                  <a
                    href={N8N_MANAGE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: 'transparent',
                      color: C.accent,
                      border: `1px solid ${C.accent}`,
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 12.5,
                      fontWeight: 500,
                      textDecoration: 'none',
                    }}
                  >
                    {conn ? 'Manage in n8n →' : 'Connect in n8n →'}
                  </a>
                )}
                {loading && (
                  <span style={{ fontSize: 12, color: C.muted }}>Loading…</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

type N8nConfigState =
  | { status: 'loading' }
  | { status: 'unconfigured' }
  | { status: 'configured'; n8nBaseUrl: string; backfillCompletedAt: string | null; updatedAt: string }
  | { status: 'error'; message: string };

function N8nConnectionSection() {
  const [state, setState] = useState<N8nConfigState>({ status: 'loading' });
  const [editing, setEditing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function load() {
    setState({ status: 'loading' });
    try {
      const res = await fetch('/api/integrations/n8n-connection', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setState({ status: 'error', message: data.error ?? 'Failed to load' });
        return;
      }
      if (!data.configured) {
        setState({ status: 'unconfigured' });
        setEditing(true);
        return;
      }
      setState({
        status: 'configured',
        n8nBaseUrl: data.n8nBaseUrl,
        backfillCompletedAt: data.backfillCompletedAt,
        updatedAt: data.updatedAt,
      });
      setUrlInput(data.n8nBaseUrl);
      setEditing(false);
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Network error' });
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/integrations/n8n-connection', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ n8nBaseUrl: urlInput, n8nWebhookSecret: secretInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? 'Failed to save');
        return;
      }
      setSecretInput('');
      await load();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '18px 20px',
        marginBottom: 22,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>Your n8n instance</h2>
        {state.status === 'configured' && (
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
      <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, margin: '0 0 14px' }}>
        OpsRadar reads your live metrics by calling a webhook on your n8n instance. Provide the base URL
        and the shared secret you set on the webhook node.
      </p>

      {state.status === 'loading' && (
        <span style={{ fontSize: 12.5, color: C.muted }}>Loading…</span>
      )}

      {state.status === 'error' && (
        <div
          style={{
            background: 'rgba(255,77,77,0.08)',
            border: `1px solid rgba(255,77,77,0.3)`,
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 12.5,
            color: C.red,
          }}
        >
          {state.message}
        </div>
      )}

      {state.status === 'configured' && !editing && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Base URL:</span>
            <span style={{ fontSize: 13, color: C.text, fontFamily: 'monospace' }}>{state.n8nBaseUrl}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Webhook secret:</span>
            <span style={{ fontSize: 13, color: C.muted, fontFamily: 'monospace' }}>•••••••• (set)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Backfill:</span>
            <span style={{ fontSize: 12.5, color: state.backfillCompletedAt ? C.green : C.muted }}>
              {state.backfillCompletedAt
                ? `Completed ${fmtDate(state.backfillCompletedAt)}`
                : 'Pending — run the opsradar-backfill workflow on your n8n'}
            </span>
          </div>
          <button
            onClick={() => { setEditing(true); setSecretInput(''); }}
            style={{
              background: 'transparent',
              color: C.accent,
              border: `1px solid ${C.accent}`,
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Update connection
          </button>
        </div>
      )}

      {(state.status === 'unconfigured' || (state.status === 'configured' && editing)) && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11.5, color: C.muted, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
              n8n base URL
            </span>
            <input
              type="url"
              required
              placeholder="https://your-tenant.app.n8n.cloud"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              style={{
                background: '#080C14',
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 13,
                color: C.text,
                fontFamily: 'monospace',
                outline: 'none',
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11.5, color: C.muted, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
              Webhook secret
            </span>
            <input
              type="password"
              required
              placeholder="The secret your webhook node validates"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              style={{
                background: '#080C14',
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 13,
                color: C.text,
                fontFamily: 'monospace',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: 11, color: C.muted }}>
              Stored only as routing config. Never view-only after save — re-enter to update.
            </span>
          </label>

          {submitError && (
            <div
              style={{
                background: 'rgba(255,77,77,0.08)',
                border: `1px solid rgba(255,77,77,0.3)`,
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 12,
                color: C.red,
              }}
            >
              {submitError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: C.accent,
                color: '#0D1117',
                border: 'none',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Saving…' : state.status === 'configured' ? 'Save changes' : 'Connect n8n'}
            </button>
            {state.status === 'configured' && (
              <button
                type="button"
                onClick={() => { setEditing(false); setSubmitError(null); }}
                style={{
                  background: 'transparent',
                  color: C.muted,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
