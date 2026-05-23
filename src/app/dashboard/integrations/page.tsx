'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { IntegrationCard } from '<npm>/components/dashboard/integration-card';
import { ConnectKeyDialog } from '<npm>/components/dashboard/connect-key-dialog';

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
  instructions: string;
  createKeyDocsUrl: string;
};

const TOOL_CATALOG: ToolDef[] = [
  {
    key: 'stripe',
    label: 'Stripe',
    blurb: 'Invoiced, paid, overdue',
    cardKey: 'Finance',
    enabled: true,
    instructions:
      'In Stripe, go to Developers → API keys → Create restricted key. Permissions: Read on Charges, Invoices, Account. Paste the key (rk_… or sk_…) below.',
    createKeyDocsUrl: 'https://dashboard.stripe.com/apikeys',
  },
  {
    key: 'hubspot',
    label: 'HubSpot',
    blurb: 'CRM — pipeline value, leads, won deals',
    cardKey: 'Sales',
    enabled: true,
    instructions:
      'In HubSpot, go to Settings → Integrations → Private Apps → Create a private app. Scopes: crm.objects.deals.read + crm.objects.contacts.read. Paste the Private App Token below.',
    createKeyDocsUrl: 'https://developers.hubspot.com/docs/api/private-apps#create-a-private-app',
  },
  {
    key: 'pipedrive',
    label: 'Pipedrive',
    blurb: 'CRM — pipeline, deals, stages',
    cardKey: 'Sales',
    enabled: true,
    instructions:
      'In Pipedrive, click your avatar → Personal preferences → API. Copy your personal API token and paste it below.',
    createKeyDocsUrl: 'https://app.pipedrive.com/settings/personal/api',
  },
  {
    key: 'apollo',
    label: 'Apollo',
    blurb: 'Cold outreach — emails sent, opens, replies',
    cardKey: 'Marketing',
    enabled: true,
    instructions:
      'In Apollo, go to Settings → Integrations → API → Create API Key. Copy the key and paste it below.',
    createKeyDocsUrl: 'https://developer.apollo.io/keys/',
  },
  {
    key: 'calendly',
    label: 'Calendly',
    blurb: 'Meetings booked from outreach',
    cardKey: 'Marketing',
    enabled: true,
    instructions:
      'In Calendly, go to Integrations & apps → API & Webhooks → Personal access tokens → Create new token. Paste the token below.',
    createKeyDocsUrl: 'https://calendly.com/integrations/api_webhooks',
  },
  {
    key: 'clickup',
    label: 'ClickUp',
    blurb: 'Projects, tasks, deadlines',
    cardKey: 'Delivery',
    enabled: true,
    instructions:
      'In ClickUp, go to Settings → Apps → API Token. Copy your personal API token and paste it below.',
    createKeyDocsUrl: 'https://app.clickup.com/settings/apps',
  },
  {
    key: 'asana',
    label: 'Asana',
    blurb: 'Projects, tasks, deadlines',
    cardKey: 'Delivery',
    enabled: true,
    instructions:
      'In Asana, go to My Profile Settings → Apps → Manage developer apps → Personal access token → Create new token. Paste it below.',
    createKeyDocsUrl: 'https://app.asana.com/0/my-apps',
  },
  {
    key: 'monday',
    label: 'Monday.com',
    blurb: 'Boards, items, deadlines',
    cardKey: 'Delivery',
    enabled: true,
    instructions:
      'In Monday, click your avatar → Developers → My Access Tokens. Copy your personal API token and paste it below.',
    createKeyDocsUrl: 'https://monday.com/developers/v2#authentication-section',
  },
  {
    key: 'toggl',
    label: 'Toggl',
    blurb: 'Hours tracked, utilization',
    cardKey: 'Time tracking',
    enabled: true,
    instructions:
      'In Toggl Track, click your avatar (bottom-left) → Profile Settings. Scroll to "API Token" at the bottom. Copy it and paste it below.',
    createKeyDocsUrl: 'https://track.toggl.com/profile',
  },
  {
    key: 'harvest',
    label: 'Harvest',
    blurb: 'Hours tracked, utilization',
    cardKey: 'Time tracking',
    enabled: true,
    instructions:
      'At id.getharvest.com/developers, create a Personal Access Token. Copy BOTH your Account ID and Token, then paste as <account_id>:<token> (e.g. 1234567:pat_abc...).',
    createKeyDocsUrl: 'https://id.getharvest.com/developers',
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
  const [dialogTool, setDialogTool] = useState<ToolDef | null>(null);

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
      setBanner({ kind: 'err', text: `${failed} OAuth failed. Please try again or paste an API key instead.` });
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
        if (data.error === 'auth_config_missing') {
          // Composio not set up for this tool — fall back to paste-key dialog
          const tool = TOOL_CATALOG.find((t) => t.key === toolSlug);
          if (tool) setDialogTool(tool);
          return;
        }
        setBanner({ kind: 'err', text: data.message ?? 'Could not start OAuth.' });
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

    // If connected via Composio, use that endpoint. Otherwise use legacy.
    const isComposio = composioConnections.some((c) => c.tool_slug === tool && c.is_active);
    const endpoint = isComposio
      ? '/api/composio/disconnect'
      : `/api/integrations/${tool}/disconnect`;
    const init: RequestInit = isComposio
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool_slug: tool }),
        }
      : { method: 'POST' };

    const res = await fetch(endpoint, init);
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
    return connections.find((c) => c.tool === tool);
  }

  function handleConnect(tool: ToolDef) {
    // Prefer Composio OAuth when an Auth Config exists for this tool.
    if (composioAvailable.has(tool.key)) {
      void startComposioOAuth(tool.key, tool.label);
    } else {
      setDialogTool(tool);
    }
  }

  return (
    <>
      <div className="mb-7">
        <h1 className="mb-1.5 font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Connected systems
        </h1>
        <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
          Connect the tools you use. We never store the data — we read it live from each tool when your dashboard opens.
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

      <ConnectKeyDialog
        open={dialogTool !== null}
        tool={dialogTool?.key ?? ''}
        displayName={dialogTool?.label ?? ''}
        instructions={dialogTool?.instructions ?? ''}
        createKeyDocsUrl={dialogTool?.createKeyDocsUrl ?? ''}
        onClose={() => setDialogTool(null)}
        onSuccess={() => {
          const label = dialogTool?.label;
          setDialogTool(null);
          setBanner({ kind: 'ok', text: `${label} connected.` });
          void load();
        }}
      />
    </>
  );
}
