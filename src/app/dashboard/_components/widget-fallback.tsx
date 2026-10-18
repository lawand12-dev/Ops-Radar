'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

export type WidgetFallbackProps = {
  /** Tool/source label — e.g. "HubSpot". Used in the message. */
  source: string;
  /** Optional retry handler. If omitted, the retry button is hidden. */
  onRetry?: () => void;
  /** If a cached value exists and is being displayed, show "Last synced …" badge. */
  stale?: { lastSyncedAt: string };
  className?: string;
};

/**
 * Soft error / stale-cache surface for a widget whose upstream failed.
 * Spec §13 — fallback behavior.
 *
 * Two states wrapped in one component:
 *   - With `stale` prop → renders a small "Last synced Nh ago · retrying"
 *     badge meant to be placed *below* a widget that's rendering its
 *     cached value.
 *   - Without `stale` → renders a full-card soft error: ⚠ icon, message,
 *     retry button. Use when there's no cache to fall back on.
 */
export function WidgetFallback({ source, onRetry, stale, className = '' }: WidgetFallbackProps) {
  if (stale) {
    const elapsed = humanizeSince(new Date(stale.lastSyncedAt));
    return (
      <div className={`mt-2 inline-flex items-center gap-1.5 text-body-sm text-[var(--color-fg-subtle)] ${className}`}>
        <RefreshCw size={10} strokeWidth={1.6} className="animate-spin-slow" />
        <span>Last synced {elapsed} ago · retrying</span>
      </div>
    );
  }
  return (
    <div
      className={`flex flex-col items-start gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)]/40 p-4 ${className}`}
    >
      <div className="flex items-center gap-2 text-[var(--color-warn)]">
        <AlertTriangle size={14} strokeWidth={1.8} />
        <span className="text-label text-[var(--color-warn)]">
          Temporary issue
        </span>
      </div>
      <p className="text-body-sm text-[var(--color-fg-muted)]">
        Couldn&apos;t reach {source}. We&apos;ll retry shortly.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-body-sm font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--color-surface-sunken)]"
        >
          <RefreshCw size={11} strokeWidth={1.8} />
          Retry now
        </button>
      )}
    </div>
  );
}

function humanizeSince(d: Date): string {
  const sec = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${Math.round(sec)}s`;
  const min = sec / 60;
  if (min < 60) return `${Math.round(min)}m`;
  const hrs = min / 60;
  if (hrs < 24) return `${Math.round(hrs)}h`;
  return `${Math.round(hrs / 24)}d`;
}
