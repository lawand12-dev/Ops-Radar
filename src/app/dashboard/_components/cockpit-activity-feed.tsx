'use client';

import { useEffect, useState } from 'react';

type ActivityEvent = {
  type: 'stripe_charge' | 'hubspot_deal' | 'workflow_run' | 'calendly_booking' | 'integration_incident';
  icon: string;
  entity_label: string;
  message: string;
  source: string;
  timestamp: string;
};

export function CockpitActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/activity')
      .then((r) => r.json())
      .then((json: { status: string; events?: ActivityEvent[] }) => {
        if (!cancelled) setEvents(json.status === 'ok' ? (json.events ?? []) : []);
      })
      .catch(() => { if (!cancelled) setEvents([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--color-fg-muted)]">
        Recent activity · cross-pillar
      </h3>
      {events === null ? (
        <FeedSkeleton />
      ) : events.length === 0 ? (
        <p className="text-[13px] text-[var(--color-fg-subtle)]">
          No recent activity in the last 24 hours.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {events.map((e, i) => (
            <li
              key={`${e.type}-${e.timestamp}-${i}`}
              className="flex items-center gap-3 border-b border-[var(--color-border)] py-2 last:border-b-0"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-[11px] text-[var(--color-fg-muted)]">
                {e.icon}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--color-fg-muted)]">
                <strong className="font-semibold text-[var(--color-fg)]">{e.entity_label}</strong>
                <span className="ml-1.5 text-[var(--color-fg-muted)]">&middot; {e.message}</span>
              </span>
              <span className="shrink-0 text-[10.5px] text-[var(--color-fg-subtle)]">
                {humanizeSince(e.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <ul className="space-y-2" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <li key={i} className="h-8 animate-pulse rounded bg-[var(--color-surface-sunken)]" />
      ))}
    </ul>
  );
}

function humanizeSince(iso: string): string {
  const sec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${Math.round(sec)}s`;
  const min = sec / 60;
  if (min < 60) return `${Math.round(min)}m`;
  const hrs = min / 60;
  if (hrs < 24) return `${Math.round(hrs)}h`;
  return `${Math.round(hrs / 24)}d`;
}
