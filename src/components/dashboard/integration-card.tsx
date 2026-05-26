'use client';

import { cn } from '<npm>/lib/utils';

export type IntegrationCardProps = {
  tool: string;
  label: string;
  blurb: string;
  cardKey: string;
  connection?: {
    connected_at: string;
    status: 'connected' | 'requires_reconnect' | 'revoked';
    external_account_id: string | null;
    last_synced_at: string | null;
  };
  enabled: boolean;
  onConnect?: () => void;
  onDisconnect?: () => Promise<void> | void;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const fmtRelative = (iso: string | null) => {
  if (!iso) return '—';
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return fmtDate(iso);
};

export function IntegrationCard(props: IntegrationCardProps) {
  const { label, blurb, cardKey, connection, enabled, onConnect, onDisconnect } = props;
  const isConnected = connection?.status === 'connected';
  const needsReconnect = connection?.status === 'requires_reconnect';

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4',
        !enabled && 'opacity-55',
      )}
    >
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2.5">
          <span className="text-body font-semibold text-[var(--color-fg)]">{label}</span>
          <span className="rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] px-1.5 py-[2px] text-[10.5px] tracking-[0.04em] text-[var(--color-fg-subtle)]">
            {cardKey} card
          </span>
          {isConnected && (
            <span className="flex items-center gap-1 text-[11.5px] text-[var(--color-success)]">
              <span className="size-1.5 rounded-full bg-[var(--color-success)]" /> Connected since {fmtDate(connection!.connected_at)}
            </span>
          )}
          {needsReconnect && (
            <span className="flex items-center gap-1 text-[11.5px] text-[var(--color-warn)]">
              <span className="size-1.5 rounded-full bg-[var(--color-warn)]" /> Key rejected — reconnect
            </span>
          )}
        </div>
        <div className="text-body-sm text-[var(--color-fg-muted)]">{blurb}</div>
        {isConnected && (
          <div className="mt-1 text-[11.5px] text-[var(--color-fg-subtle)]">
            Last synced {fmtRelative(connection!.last_synced_at)}
          </div>
        )}
      </div>

      <div className="shrink-0">
        {!enabled ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--color-warn)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-warn)_10%,transparent)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--color-warn)]"
            title="This integration is on the roadmap. Gmail and Notion are live today."
          >
            <span className="size-1.5 rounded-full bg-[var(--color-warn)]" />
            Coming soon
          </span>
        ) : isConnected ? (
          <button
            type="button"
            onClick={() => onDisconnect?.()}
            className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[12.5px] text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-fg)]"
          >
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onConnect?.()}
            className={cn(
              'rounded-[var(--radius)] px-3 py-1.5 text-[12.5px] font-medium text-white no-underline hover:opacity-90',
              needsReconnect ? 'bg-[var(--color-warn)]' : 'bg-[var(--color-primary)]',
            )}
          >
            {needsReconnect ? 'Reconnect' : `Connect ${label}`}
          </button>
        )}
      </div>
    </div>
  );
}
