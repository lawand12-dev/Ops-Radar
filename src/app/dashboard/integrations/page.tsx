'use client';

import { useEffect, useState, useCallback } from 'react';
import { IntegrationCard } from '<npm>/components/dashboard/integration-card';
import { ConnectKeyDialog } from '<npm>/components/dashboard/connect-key-dialog';

type Connection = {
  tool: string;
  connected_at: string;
  status: 'connected' | 'requires_reconnect' | 'revoked';
  external_account_id: string | null;
  last_synced_at: string | null;
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
];

const CATEGORY_ORDER = ['Finance', 'Sales', 'Marketing', 'Delivery', 'Time tracking'] as const;

export default function IntegrationsSettingsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [dialogTool, setDialogTool] = useState<ToolDef | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to load');
        return;
      }
      setConnections(data.connected ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function disconnect(tool: string) {
    if (!confirm(`Disconnect ${tool}? Your dashboard will stop reading from ${tool}.`)) return;
    const res = await fetch(`/api/integrations/${tool}/disconnect`, { method: 'POST' });
    if (res.ok) {
      setBanner({ kind: 'ok', text: `${tool[0].toUpperCase() + tool.slice(1)} disconnected.` });
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setBanner({ kind: 'err', text: data.message ?? data.error ?? 'Disconnect failed.' });
    }
  }

  function connectionFor(tool: string): Connection | undefined {
    return connections.find((c) => c.tool === tool);
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
                    onConnect={() => setDialogTool(t)}
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
