'use client';

import { useEffect, useState } from 'react';
import { cn } from '<npm>/lib/utils';

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
      <div className="mb-7">
        <h1 className="mb-1.5 font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Connected systems
        </h1>
        <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
          These are the tools your dashboard reads from. Your OpsRadar account team manages
          credentials and connections — reach out if you want to add or change anything.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-3 py-2.5 text-[12.5px] text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {TOOL_CATALOG.map((t) => {
          const conn = isConnected(t.key);
          const isAvailable = t.status === 'available';

          return (
            <div
              key={t.key}
              className={cn(
                'flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4',
                !isAvailable && 'opacity-55',
              )}
            >
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2.5">
                  <span className="text-body font-semibold text-[var(--color-fg)]">{t.label}</span>
                  <span className="rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] px-1.5 py-[2px] text-[10.5px] tracking-[0.04em] text-[var(--color-fg-subtle)]">
                    {t.cardKey} card
                  </span>
                </div>
                <div className="text-[12.5px] leading-[1.4] text-[var(--color-fg-muted)]">{t.blurb}</div>
                {conn && (
                  <div className="mt-1 text-[11px] text-[var(--color-fg-subtle)]">
                    Tracking since {fmtDate(conn.connected_at)}
                  </div>
                )}
              </div>

              <div className="shrink-0">
                {!isAvailable && (
                  <span className="text-caption italic text-[var(--color-fg-subtle)]">Coming soon</span>
                )}
                {isAvailable && !loading && (
                  <span
                    className={cn(
                      'rounded-[var(--radius-sm)] px-2.5 py-1 text-[11px] font-semibold',
                      conn
                        ? 'bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]'
                        : 'bg-[var(--color-surface-sunken)] text-[var(--color-fg-subtle)]',
                    )}
                  >
                    {conn ? 'Tracking' : 'Not yet tracking'}
                  </span>
                )}
                {loading && <span className="text-caption text-[var(--color-fg-subtle)]">Loading…</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
