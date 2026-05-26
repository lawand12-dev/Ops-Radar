'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Nango from '@nangohq/frontend';
import { IntegrationCard } from '<npm>/components/dashboard/integration-card';
import { NotionConnectModal } from './_components/notion-connect-modal';

type Connection = {
  tool: string;
  connected_at: string;
  status: 'connected' | 'requires_reconnect' | 'revoked';
  external_account_id: string | null;
  last_synced_at: string | null;
};

type NangoConnection = {
  tool_slug: string;
  connected_at: string | null;
  is_active: boolean;
};

type ToolDef = {
  key: string;
  label: string;
  blurb: string;
  cardKey: string;
  enabled: boolean;
};

const TOOL_CATALOG: ToolDef[] = [
  // Finance & Accounting
  { key: 'stripe',      label: 'Stripe',      blurb: 'Invoiced, paid, overdue',                          cardKey: 'Finance',    enabled: true },
  { key: 'quickbooks',  label: 'QuickBooks',  blurb: 'Real P&L, payroll, contractor costs',              cardKey: 'Finance',    enabled: true },
  { key: 'xero',        label: 'Xero',        blurb: 'Real P&L, payroll, contractor costs (alt to QB)',  cardKey: 'Finance',    enabled: true },

  // Sales / CRM
  { key: 'hubspot',     label: 'HubSpot',     blurb: 'CRM — pipeline value, leads, won deals',           cardKey: 'Sales',      enabled: true },
  { key: 'pipedrive',   label: 'Pipedrive',   blurb: 'CRM — pipeline, deals, stages',                    cardKey: 'Sales',      enabled: true },

  // Marketing / Outbound
  { key: 'apollo',      label: 'Apollo',      blurb: 'Cold outreach — emails sent, opens, replies',      cardKey: 'Marketing',  enabled: true },
  { key: 'calendly',    label: 'Calendly',    blurb: 'Meetings booked from outreach',                    cardKey: 'Marketing',  enabled: true },
  { key: 'google_analytics', label: 'Google Analytics', blurb: 'Web traffic, conversions, channels',     cardKey: 'Marketing',  enabled: true },

  // Ads
  { key: 'google_ads',  label: 'Google Ads',  blurb: 'Ad spend, ROAS, conversions',                      cardKey: 'Ads',        enabled: true },
  { key: 'facebook_ads',label: 'Meta Ads',    blurb: 'Facebook + Instagram ad performance',              cardKey: 'Ads',        enabled: true },
  { key: 'linkedin',    label: 'LinkedIn',    blurb: 'Organic reach, content performance, ad ROAS',      cardKey: 'Ads',        enabled: true },

  // Delivery / PM
  { key: 'clickup',     label: 'ClickUp',     blurb: 'Projects, tasks, deadlines',                       cardKey: 'Delivery',   enabled: true },
  { key: 'asana',       label: 'Asana',       blurb: 'Projects, tasks, deadlines',                       cardKey: 'Delivery',   enabled: true },
  { key: 'monday',      label: 'Monday.com',  blurb: 'Boards, items, deadlines',                         cardKey: 'Delivery',   enabled: true },

  // Time tracking
  { key: 'toggl',       label: 'Toggl',       blurb: 'Hours tracked, utilization',                       cardKey: 'Time',       enabled: true },
  { key: 'harvest',     label: 'Harvest',     blurb: 'Hours tracked, utilization, project billing',      cardKey: 'Time',       enabled: true },

  // Comms & Calendar
  { key: 'gmail',       label: 'Gmail',       blurb: 'Send drafts, read threads, briefings inbox',       cardKey: 'Comms',      enabled: true },
  { key: 'slack',       label: 'Slack',       blurb: 'Team comms, after-hours signals, burnout',         cardKey: 'Comms',      enabled: true },
  { key: 'google_calendar', label: 'Google Calendar', blurb: 'Meeting load, deep-work blocks',           cardKey: 'Comms',      enabled: true },

  // HR & Payroll
  { key: 'bamboo_hr',   label: 'BambooHR',    blurb: 'Team roster, time off, headcount',                 cardKey: 'HR',         enabled: true },
  { key: 'gusto',       label: 'Gusto',       blurb: 'Payroll costs, contractor payments',               cardKey: 'HR',         enabled: true },

  // Contracts & Forms
  { key: 'docusign',    label: 'DocuSign',    blurb: 'Contract renewals, expiry dates, signed deals',    cardKey: 'Contracts',  enabled: true },
  { key: 'typeform',    label: 'Typeform',    blurb: 'Lead capture forms, NPS surveys',                  cardKey: 'Contracts',  enabled: true },

  // Support
  { key: 'intercom',    label: 'Intercom',    blurb: 'Customer support tickets, response times',         cardKey: 'Support',    enabled: true },
  { key: 'zendesk',     label: 'Zendesk',     blurb: 'Customer support tickets, CSAT, SLA',              cardKey: 'Support',    enabled: true },

  // The Brain
  { key: 'notion',      label: 'Notion',      blurb: 'Your AI Ops Brain — agents write findings here',   cardKey: 'Brain',      enabled: true },
];

const CATEGORY_ORDER = [
  'Brain',
  'Finance',
  'Sales',
  'Marketing',
  'Ads',
  'Delivery',
  'Time',
  'Comms',
  'HR',
  'Contracts',
  'Support',
] as const;

export default function IntegrationsSettingsPage() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [nangoConnections, setNangoConnections] = useState<NangoConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [legacyRes, nangoRes] = await Promise.all([
        fetch('/api/integrations', { cache: 'no-store' }),
        fetch('/api/nango/connections', { cache: 'no-store' }),
      ]);
      const legacyData = await legacyRes.json();
      if (!legacyRes.ok) {
        setError(legacyData.error ?? 'Failed to load integrations');
        return;
      }
      setConnections(legacyData.connected ?? []);

      if (nangoRes.ok) {
        const d = await nangoRes.json();
        setNangoConnections(d.connections ?? []);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Surface legacy OAuth callback result. Nango OAuth doesn't redirect —
  // it pops a popup and fires onEvent('connect') in startNangoOAuth — so
  // we only handle ?failed= (manual-link override) and ?connected= (a few
  // legacy bookmarks). After Nango migration, this becomes vestigial.
  useEffect(() => {
    const connected = searchParams.get('connected');
    const failed = searchParams.get('failed');
    if (connected) {
      const label = connected.charAt(0).toUpperCase() + connected.slice(1);
      if (connected === 'notion') {
        setBanner({
          kind: 'ok',
          text: 'Notion connected. Your Company Brain is provisioning in the background — open setup to watch progress.',
        });
      } else {
        setBanner({ kind: 'ok', text: `${label} connected via OAuth.` });
      }
      void load();
    } else if (failed) {
      setBanner({ kind: 'err', text: `${failed} OAuth failed. Please try again.` });
    }
  }, [searchParams, load]);

  async function startNangoOAuth(toolSlug: string, label: string) {
    try {
      // 1) Ask the backend for a short-lived Connect Session token bound
      //    to the current user + this one integration.
      const res = await fetch('/api/nango/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_slug: toolSlug }),
      });
      const data = await res.json();
      if (!res.ok || !data.sessionToken) {
        setBanner({
          kind: 'err',
          text: data.message ?? `Could not start ${label} OAuth.`,
        });
        return;
      }

      // 2) Open Nango's hosted Connect UI in a popup. The frontend SDK
      //    handles the OAuth dance and fires events back to us.
      const nango = new Nango({ connectSessionToken: data.sessionToken });
      const connect = nango.openConnectUI({
        sessionToken: data.sessionToken,
        onEvent: (event) => {
          if (event.type === 'connect') {
            setBanner({ kind: 'ok', text: `${label} connected.` });
            void load();
          } else if (event.type === 'close') {
            // User closed the popup. No-op — they may have completed or bailed.
          }
        },
      });
      void connect;
    } catch (err) {
      setBanner({
        kind: 'err',
        text: `Failed to start ${label} OAuth: ${err instanceof Error ? err.message : 'network error'}`,
      });
    }
  }

  async function disconnect(tool: string) {
    if (!confirm(`Disconnect ${tool}? Your dashboard will stop reading from ${tool}.`)) return;

    const res = await fetch('/api/nango/disconnect', {
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
    // Surface Nango connections under the shared Connection shape so the card stays simple.
    const oauth = nangoConnections.find((c) => c.tool_slug === tool && c.is_active);
    if (oauth) {
      return {
        tool,
        connected_at: oauth.connected_at ?? new Date().toISOString(),
        status: 'connected',
        external_account_id: null,
        last_synced_at: null,
      };
    }
    // Legacy integrations table connections (pre-Nango customers) — read-only.
    return connections.find((c) => c.tool === tool);
  }

  // Notion gets a pre-flight modal so customers know to create a dedicated
  // top-level page first (avoids granting access to their whole workspace
  // and ensures the Brain provision lands somewhere clean).
  const [notionModalOpen, setNotionModalOpen] = useState(false);
  const [pendingNotionTool, setPendingNotionTool] = useState<ToolDef | null>(null);

  function handleConnect(tool: ToolDef) {
    if (tool.key === 'notion') {
      setPendingNotionTool(tool);
      setNotionModalOpen(true);
      return;
    }
    void startNangoOAuth(tool.key, tool.label);
  }

  function handleNotionContinue() {
    setNotionModalOpen(false);
    if (pendingNotionTool) {
      void startNangoOAuth(pendingNotionTool.key, pendingNotionTool.label);
      setPendingNotionTool(null);
    }
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
              ? 'mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_8%,transparent)] px-3 py-2.5 text-[12.5px] text-[var(--color-success)]'
              : 'mb-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-warn)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-warn)_8%,transparent)] px-3 py-2.5 text-[12.5px] text-[var(--color-warn)]'
          }
        >
          <span>{banner.text}</span>
          {banner.kind === 'ok' && searchParams.get('connected') === 'notion' && (
            <a
              href="/dashboard/integrations/setup"
              className="rounded-[var(--radius)] border border-[var(--color-success)] px-2.5 py-1 text-[12.5px] font-medium hover:bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)]"
            >
              View setup
            </a>
          )}
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

      <NotionConnectModal
        open={notionModalOpen}
        onClose={() => {
          setNotionModalOpen(false);
          setPendingNotionTool(null);
        }}
        onContinue={handleNotionContinue}
      />
    </>
  );
}
