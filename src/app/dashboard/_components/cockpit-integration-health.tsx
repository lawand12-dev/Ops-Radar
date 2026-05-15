'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Integration = {
  tool: string;
  slug: string;
  status: 'healthy' | 'errors' | 'not_connected';
  last_synced_at?: string | null;
};

const SLOTS: Array<{ tool: string; slug: string }> = [
  { tool: 'Stripe',     slug: 'stripe'     },
  { tool: 'HubSpot',   slug: 'hubspot'    },
  { tool: 'Apollo',    slug: 'apollo'     },
  { tool: 'Calendly',  slug: 'calendly'   },
  { tool: 'n8n',       slug: 'n8n'        },
  { tool: 'QuickBooks', slug: 'quickbooks' },
];

// /api/integrations returns { connected: ConnectedTool[] }
// status: 'connected' | 'requires_reconnect' | 'revoked'
type ApiRow = {
  tool: string;
  status: 'connected' | 'requires_reconnect' | 'revoked';
  last_synced_at: string | null;
};

function toIntegrationStatus(s: ApiRow['status']): Integration['status'] {
  if (s === 'connected') return 'healthy';
  if (s === 'requires_reconnect') return 'errors';
  // 'revoked' → treat as not connected
  return 'not_connected';
}

export function CockpitIntegrationHealth() {
  const [data, setData] = useState<Integration[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/integrations')
      .then((r) => r.json())
      .then((json: { connected?: ApiRow[] }) => {
        if (cancelled) return;
        const bySlug = new Map<string, Integration>();
        for (const row of json.connected ?? []) {
          if (!row.tool) continue;
          const slug = row.tool.toLowerCase();
          const canonicalTool = SLOTS.find((s) => s.slug === slug)?.tool ?? row.tool;
          bySlug.set(slug, {
            tool: canonicalTool,
            slug,
            status: toIntegrationStatus(row.status),
            last_synced_at: row.last_synced_at ?? null,
          });
        }
        // Always render all 6 canonical slots; fill unknowns as not_connected
        const result = SLOTS.map(
          (s) => bySlug.get(s.slug) ?? { tool: s.tool, slug: s.slug, status: 'not_connected' as const },
        );
        setData(result);
      })
      .catch(() => { if (!cancelled) setData([]); });
    return () => { cancelled = true; };
  }, []);

  if (data === null) {
    return (
      <div
        className="grid grid-cols-6 gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
        aria-hidden
      >
        {SLOTS.map((s) => (
          <div key={s.slug} className="h-6 animate-pulse rounded bg-[var(--color-surface-sunken)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-6 gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      {data.map((i) => (
        <Cell key={i.slug} integration={i} />
      ))}
    </div>
  );
}

function Cell({ integration: i }: { integration: Integration }) {
  const dotClass =
    i.status === 'healthy'
      ? 'bg-[var(--color-success)] shadow-[0_0_6px_rgba(74,222,128,0.55)]'
      : i.status === 'errors'
      ? 'bg-[var(--color-warn)]'
      : 'bg-[var(--color-fg-faint)]';

  const right =
    i.status === 'not_connected' ? (
      <Link
        href={`/dashboard/integrations?tool=${i.slug}`}
        className="text-[10px] text-[var(--color-primary)] no-underline hover:underline"
      >
        connect →
      </Link>
    ) : (
      <span className="text-[10px] text-[var(--color-fg-subtle)]">{humanizeSince(i.last_synced_at)}</span>
    );

  return (
    <div className="flex items-center gap-2">
      <span className={`block size-2 shrink-0 rounded-full ${dotClass}`} />
      <span
        className={`text-[12.5px] font-medium ${
          i.status === 'not_connected' ? 'text-[var(--color-fg-subtle)]' : 'text-[var(--color-fg)]'
        }`}
      >
        {i.tool}
      </span>
      <span className="ml-auto">{right}</span>
    </div>
  );
}

function humanizeSince(iso: string | null | undefined): string {
  if (!iso) return '—';
  const sec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${Math.round(sec)}s`;
  const min = sec / 60;
  if (min < 60) return `${Math.round(min)}m`;
  const hrs = min / 60;
  if (hrs < 24) return `${Math.round(hrs)}h`;
  return `${Math.round(hrs / 24)}d`;
}
