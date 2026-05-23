'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { IntegrationCard } from '<npm>/components/dashboard/integration-card';

type Connection = {
  tool: string;
  connected_at: string;
  status: 'connected' | 'requires_reconnect' | 'revoked';
  external_account_id: string | null;
  last_synced_at: string | null;
};

type ComposioConnection = {
  tool_slug: string;
  connected_at: string;
  is_active: boolean;
  last_used_at: string | null;
};

type ToolDef = {
  key: string;
  label: string;
  blurb: string;
  cardKey: string;
  enabled: boolean;
};

const TOOL_CATALOG: ToolDef[] = [
  {
    key: 'stripe',
    label: 'Stripe',
    blurb: 'Invoiced, paid, overdue',
    cardKey: 'Finance',
    enabled: true,
  },
  {
    key: 'hubspot',
    label: 'HubSpot',
    blurb: 'CRM — pipeline value, leads, won deals',
    cardKey: 'Sales',
    enabled: true,
  },
  {
    key: 'pipedrive',
    label: 'Pipedrive',
    blurb: 'CRM — pipeline, deals, stages',
    cardKey: 'Sales',
    enabled: true,
  },
  {
    key: 'apollo',
    label: 'Apollo',
    blurb: 'Cold outreach — emails sent, opens, replies',
    cardKey: 'Marketing',
    enabled: true,
  },
  {
    key: 'calendly',
    label: 'Calendly',
    blurb: 'Meetings booked from outreach',
    cardKey: 'Marketing',
    enabled: true,
  },
  {
    key: 'clickup',
    label: 'ClickUp',
    blurb: 'Projects, tasks, deadlines',
    cardKey: 'Delivery',
    enabled: true,
  },
  {
    key: 'asana',
    label: 'Asana',
    blurb: 'Projects, tasks, deadlines',
    cardKey: 'Delivery',
    enabled: true,
  },
  {
    key: 'monday',
    label: 'Monday.com',
    blurb: 'Boards, items, deadlines',
    cardKey: 'Delivery',
    enabled: true,
  },
  {
    key: 'toggl',
    label: 'Toggl',
    blurb: 'Hours tracked, utilization',
    cardKey: 'Time tracking',
    enabled: true,
  },
  {
    key: 'harvest',
    label: 'Harvest',
    blurb: 'Hours tracked, utilization',
    cardKey: 'Time tracking',
    enabled: true,
  },
];

const CATEGORY_ORDER = ['Finance', 'Sales', 'Marketing', 'Delivery', 'Time tracking'] as const;

export default function IntegrationsSettingsPage() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [composioConnections, setComposioConnections] = useState<ComposioConnection[]>([]);
  const [composioAvailable, setComposioAvailable] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [legacyRes, composioConnsRes, composioAvailRes] = await Promise.all([
        fetch('/api/integrations', { cache: 'no-store' }),
        fetch('/api/composio/connections', { cache: 'no-store' }),
        fetch('/api/composio/available', { cache: 'no-store' }),
      ]);
      const legacyData = await legacyRes.json();
      if (!legacyRes.ok) {
        setError(legacyData.error ?? 'Failed to load integrations');
        return;
      }
      setConnections(legacyData.connected ?? []);

      if (composioConnsRes.ok) {
        const d = await composioConnsRes.json();
        setComposioConnections(d.connections ?? []);
      }
      if (composioAvailRes.ok) {
        const d = await composioAvailRes.json();
        setComposioAvailable(new Set(d.available ?? []));
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Surface OAuth callback result
  useEffect(() => {
    const connected = searchParams.get('connected');
    const failed = searchParams.get('failed');
    if (connected) {
      setBanner({ kind: 'ok', text: `${connected[0].toUpperCase() + connected.slice(1)} connected via OAuth.` });
    } else if (failed) {
      setBanner({ kind: 'err', text: `${failed} OAuth failed. Please try again.` });
    }
  }, [searchParams]);

  async function startComposioOAuth(toolSlug: string, label: string) {
    try {
      const res = await fetch('/api/composio/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_slug: toolSlug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({
          kind: 'err',
          text: data.message ?? `Could not start ${label} OAuth.`,
        });
        return;
      }
      if (data.oauth_url) {
        window.location.href = data.oauth_url;
      }
    } catch (err) {
      setBanner({
        kind: 'err',
        text: `Failed to start ${label} OAuth: ${err instanceof Error ? err.message : 'network error'}`,
      });
    }
  }

  async function disconnect(tool: string) {
    if (!confirm(`Disconnect ${tool}? Your dashboard will stop reading from ${tool}.`)) return;

    const res = await fetch('/api/composio/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_slug: tool }),
    });
    if (res.ok) {
      setBanner({ kind: 'ok', text: `${tool[0].toUpperCase() + tool.slice(1)} disconnected.` });
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setBanner({ kind: 'err', text: data.message ?? data.error ?? 'Disconnect failed.' });
    }
  }

  function connectionFor(tool: string): Connection | undefined {
    // Surface Composio connections under the same Connection shape so the card stays simple.
    const oauth = composioConnections.find((c) => c.tool_slug === tool && c.is_active);
    if (oauth) {
      return {
        tool,
        connected_at: oauth.connected_at,
        status: 'connected',
        external_account_id: null,
        last_synced_at: oauth.last_used_at,
      };
    }
    // Legacy integrations table connections (pre-Composio customers) — read-only.
    return connections.find((c) => c.tool === tool);
  }

  function handleConnect(tool: ToolDef) {
    void startComposioOAuth(tool.key, tool.label);
  }

  return (
    <>
      <div className="mb-7">
        <h1 className="mb-1.5 font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Connected systems
        </h1>
        <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
          Connect the tools you use with one click. Your data stays in your tools — we read it live when your dashboard opens.
        </p>
      </div>

      {banner && (
        <div
          className={
            banner.kind === 'ok'
              ? 'mb-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_8%,transparent)] px-3 py-2.5 text-[12.5px] text-[var(--color-success)]'
              : 'mb-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-warn)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-warn)_8%,transparent)] px-3 py-2.5 text-[12.5px] text-[var(--color-warn)]'
          }
        >
          {banner.text}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-3 py-2.5 text-[12.5px] text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {loading && !connections.length && (
        <div className="text-[12.5px] text-[var(--color-fg-subtle)]">Loading…</div>
      )}

      <div className="flex flex-col gap-6">
        {CATEGORY_ORDER.map((category) => {
          const tools = TOOL_CATALOG.filter((t) => t.cardKey === category);
          if (tools.length === 0) return null;
          return (
            <div key={category}>
              <h2 className="mb-2.5 text-label font-medium uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">
                {category}
              </h2>
              <div className="flex flex-col gap-2.5">
                {tools.map((t) => (
                  <IntegrationCard
                    key={t.key}
                    tool={t.key}
                    label={t.label}
                    blurb={t.blurb}
                    cardKey={t.cardKey}
                    enabled={t.enabled}
                    connection={connectionFor(t.key)}
                    onConnect={() => handleConnect(t)}
                    onDisconnect={() => disconnect(t.key)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

    </>
  );
}
