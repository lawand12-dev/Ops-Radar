'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type BrainStatusResponse = {
  status: 'not_started' | 'provisioning' | 'ready' | 'failed';
  databases_created: number;
  brain_home_ready: boolean;
  parent_page_id: string | null;
  workspace_name: string | null;
  error: string | null;
  connected_at: string | null;
  backfill_status?: string;
};

type Checkpoint = {
  label: string;
  done: boolean;
  active: boolean;
};

const POLL_INTERVAL_MS = 3000;
const TARGET_DB_COUNT = 20;

export function BrainSetupProgress() {
  const [status, setStatus] = useState<BrainStatusResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      try {
        const res = await fetch('/api/dashboard/brain-status', {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = (await res.json()) as BrainStatusResponse;
        if (cancelled) return;
        setStatus(payload);
        setLoadError(null);

        if (payload.status !== 'ready' && payload.status !== 'failed') {
          timer = setTimeout(tick, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'load failed');
        // Back off slightly on transient errors.
        timer = setTimeout(tick, POLL_INTERVAL_MS * 2);
      }
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!status && !loadError) {
    return (
      <div className="text-body-sm text-[var(--color-fg-muted)]">
        Loading…
      </div>
    );
  }

  if (loadError && !status) {
    return (
      <div className="rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-4 text-body-sm text-[var(--color-danger)]">
        Couldn&apos;t load setup status: {loadError}
      </div>
    );
  }

  if (!status) return null;

  // Not connected yet — show CTA.
  if (status.status === 'not_started') {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="mb-3 font-medium text-[var(--color-fg)]">Notion isn&apos;t connected yet</div>
        <p className="mb-4 text-body-sm text-[var(--color-fg-muted)]">
          Head back to integrations and click <strong>Connect Notion</strong>.
        </p>
        <Link
          href="/dashboard/integrations"
          className="inline-block rounded-[var(--radius)] bg-[var(--color-accent)] px-4 py-2 text-body-sm font-medium text-[var(--color-bg)] hover:opacity-90"
        >
          Go to integrations
        </Link>
      </div>
    );
  }

  // Failed — show retry path.
  if (status.status === 'failed') {
    return (
      <div className="space-y-4">
        <div className="rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-4">
          <div className="mb-2 font-medium text-[var(--color-danger)]">Setup failed</div>
          <p className="text-body-sm text-[var(--color-fg-muted)]">
            {status.error ??
              'We hit an error provisioning your Brain. The most common cause is that the page you granted Notion access to isn\'t at the top level of your workspace, or access was too narrow.'}
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="mb-2 font-medium text-[var(--color-fg)]">How to fix it</div>
          <ol className="ml-5 list-decimal space-y-1.5 text-body-sm text-[var(--color-fg-muted)]">
            <li>Open Notion and create a new <strong>top-level</strong> page (not nested under another).</li>
            <li>Come back here and disconnect + reconnect Notion.</li>
            <li>On Notion&apos;s permission screen, select that new top-level page.</li>
          </ol>
          <Link
            href="/dashboard/integrations"
            className="mt-4 inline-block rounded-[var(--radius)] bg-[var(--color-accent)] px-4 py-2 text-body-sm font-medium text-[var(--color-bg)] hover:opacity-90"
          >
            Reconnect Notion
          </Link>
        </div>
      </div>
    );
  }

  const dbsDone = status.databases_created >= TARGET_DB_COUNT;
  const homeDone = status.brain_home_ready;

  const checkpoints: Checkpoint[] = [
    {
      label: `Connection established${status.workspace_name ? ` (${status.workspace_name})` : ''}`,
      done: true,
      active: false,
    },
    {
      label: `Creating ${TARGET_DB_COUNT} databases in your Notion${
        status.databases_created > 0
          ? ` (${Math.min(status.databases_created, TARGET_DB_COUNT)} / ${TARGET_DB_COUNT})`
          : ''
      }`,
      done: dbsDone,
      active: !dbsDone,
    },
    {
      label: 'Generating your Brain Home summary page',
      done: homeDone,
      active: dbsDone && !homeDone,
    },
    {
      label: 'Ready to use',
      done: status.status === 'ready',
      active: false,
    },
  ];

  const isReady = status.status === 'ready';

  return (
    <div className="space-y-5">
      <ol className="space-y-3">
        {checkpoints.map((c, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
          >
            <span
              className={
                c.done
                  ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-success)] text-body-xs font-semibold text-[var(--color-bg)]'
                  : c.active
                    ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-accent)] text-body-xs font-semibold text-[var(--color-accent)]'
                    : 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-border)] text-body-xs text-[var(--color-fg-muted)]'
              }
              aria-hidden
            >
              {c.done ? '✓' : c.active ? '•' : ''}
            </span>
            <span
              className={
                c.done
                  ? 'text-body-sm text-[var(--color-fg)]'
                  : c.active
                    ? 'text-body-sm font-medium text-[var(--color-fg)]'
                    : 'text-body-sm text-[var(--color-fg-muted)]'
              }
            >
              {c.label}
              {c.active && (
                <span className="ml-2 inline-block animate-pulse text-body-xs text-[var(--color-fg-muted)]">
                  in progress…
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      {!isReady && (
        <div className="rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)] p-3 text-body-xs leading-[1.5] text-[var(--color-fg-muted)]">
          You can leave this page. We&apos;ll keep working in the background and send you an email when your Brain is ready.
        </div>
      )}

      {isReady && (
        <div className="rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_8%,transparent)] p-5">
          <div className="mb-2 font-medium text-[var(--color-fg)]">Your Brain is ready ✓</div>
          <p className="mb-4 text-body-sm text-[var(--color-fg-muted)]">
            20 databases provisioned + your first Brain Home page generated. Have a look.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {status.parent_page_id && (
              <a
                href={`https://www.notion.so/${status.parent_page_id.replace(/-/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-[var(--radius)] bg-[var(--color-accent)] px-4 py-2 text-body-sm font-medium text-[var(--color-bg)] hover:opacity-90"
              >
                Open Brain in Notion
              </a>
            )}
            <Link
              href="/dashboard/brain"
              className="rounded-[var(--radius)] border border-[var(--color-border)] px-4 py-2 text-body-sm text-[var(--color-fg)] hover:bg-[var(--color-border)]"
            >
              View in OpsRadar
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
