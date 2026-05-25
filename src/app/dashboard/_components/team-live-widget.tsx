'use client';

/**
 * TeamLiveWidget (CP-36) — the realtime Team Live overview block.
 *
 * Subscribes to every Trigger.dev run tagged `user:<currentUserId>` via
 * `useRealtimeRunsWithTag` and renders the currently-executing or queued
 * runs as employee status cards: emoji + name + status + elapsed seconds.
 *
 * BOND ships a static "Live Dashboard". We can do better because we already
 * use Trigger.dev for the custom-employee dispatcher — every fan-out subrun
 * is tagged with the customer's user_id and ships metadata that lets the
 * client render identity without a DB round-trip.
 *
 * Token lifecycle:
 *   - On mount, fetch a 5-minute scoped public token from
 *     /api/dashboard/employees/live-token.
 *   - Re-fetch every 4 minutes (1-minute overlap before expiry).
 *   - If the fetch fails the widget stays empty — graceful degrade, no
 *     dashboard breakage.
 *
 * Hook name: `useRealtimeRunsWithTag` is the Trigger.dev v4.4.x react-hooks
 * export. (`useRealtimeRuns` / `useRealtimeBatch` exist but accept different
 * filters — see node_modules/@trigger.dev/react-hooks/dist/esm/index.d.ts.)
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRealtimeRunsWithTag } from '@trigger.dev/react-hooks';

type TokenResponse = {
  token: string;
  expires_at: string;
};

// Re-mint the public token every 4 minutes so the hook always has a fresh
// token before the 5-minute expiry kicks in. Trigger.dev's hook will pick
// up the new accessToken on next render.
const TOKEN_REFRESH_MS = 4 * 60 * 1000;

export function TeamLiveWidget({ userId }: { userId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  // Fetch token on mount + refresh every 4 min.
  useEffect(() => {
    let cancelled = false;

    async function fetchToken() {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const res = await fetch('/api/dashboard/employees/live-token', {
          cache: 'no-store',
        });
        if (!res.ok) {
          if (!cancelled) setToken(null);
          return;
        }
        const data = (await res.json()) as TokenResponse;
        if (!cancelled) setToken(data.token);
      } catch {
        if (!cancelled) setToken(null);
      } finally {
        fetchingRef.current = false;
      }
    }

    fetchToken();
    const interval = setInterval(fetchToken, TOKEN_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Don't subscribe until we have a token. The hook handles `enabled: false`
  // by simply not opening a stream.
  const { runs, error } = useRealtimeRunsWithTag(`user:${userId}`, {
    accessToken: token ?? undefined,
    enabled: !!token,
    // Surface only the last hour of runs — anything older is stale for a
    // "what's running right now" widget.
    createdAt: '1h',
  });

  // Render only runs the customer cares about live: actively executing or
  // queued waiting to start. Completed/failed runs belong on /dashboard/runs.
  const liveRuns = useMemo(() => {
    return runs.filter(
      (r) => r.status === 'EXECUTING' || r.status === 'QUEUED',
    );
  }, [runs]);

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-body-sm font-semibold text-[var(--color-fg)]">
          Team Live
        </h2>
        <span className="inline-flex items-center gap-1.5 text-body-xs text-[var(--color-fg-subtle)]">
          <span className="block size-1.5 animate-pulse rounded-full bg-[var(--color-success)] shadow-[0_0_5px_rgba(74,222,128,0.7)]" />
          Updated live
        </span>
      </div>

      {!token && !error ? null : error ? null : liveRuns.length === 0 ? (
        <p className="text-body-sm text-[var(--color-fg-subtle)]">
          All agents idle.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {liveRuns.map((run) => (
            <LiveRunRow key={run.id} run={run} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function LiveRunRow({
  run,
}: {
  run: {
    id: string;
    status: string;
    createdAt: Date;
    startedAt?: Date;
    metadata?: Record<string, unknown>;
    tags: string[];
  };
}) {
  const md = (run.metadata ?? {}) as {
    employee_emoji?: string | null;
    employee_name?: string | null;
    employee_slug?: string | null;
    current_step?: number;
    total_steps?: number;
  };

  // Fallback identity: pull the employee slug from the tags (the dispatcher
  // tags every subrun with `employee:<slug>`) when metadata hasn't flushed
  // yet (race in the first 100ms of a new run).
  const slugFromTag = run.tags
    .find((t) => t.startsWith('employee:'))
    ?.slice('employee:'.length);

  const emoji = md.employee_emoji ?? '🤖';
  const name = md.employee_name ?? slugFromTag ?? 'Employee';
  const statusLabel = run.status === 'EXECUTING' ? 'running' : 'queued';
  const elapsed = useElapsedSeconds(run.startedAt ?? run.createdAt);
  const step = md.current_step;
  const total = md.total_steps;

  return (
    <li className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-body-sm">
      <span aria-hidden className="text-base leading-none">
        {emoji}
      </span>
      <span className="font-medium text-[var(--color-fg)]">{name}</span>
      <span className="text-[var(--color-fg-subtle)]">·</span>
      <span
        className={
          run.status === 'EXECUTING'
            ? 'text-[var(--color-success)]'
            : 'text-[var(--color-fg-muted)]'
        }
      >
        {statusLabel}
      </span>
      {typeof step === 'number' && typeof total === 'number' ? (
        <>
          <span className="text-[var(--color-fg-subtle)]">·</span>
          <span className="text-[var(--color-fg-muted)]">
            step {step} of {total}
          </span>
        </>
      ) : null}
      <span className="text-[var(--color-fg-subtle)]">·</span>
      <span className="text-[var(--color-fg-subtle)]">{elapsed}s elapsed</span>
    </li>
  );
}

// Live elapsed-seconds counter — ticks every 1s while the row is mounted.
function useElapsedSeconds(startedAt: Date | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!startedAt) return 0;
  const startMs = startedAt instanceof Date ? startedAt.getTime() : new Date(startedAt).getTime();
  return Math.max(0, Math.floor((now - startMs) / 1000));
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      {children}
    </div>
  );
}
