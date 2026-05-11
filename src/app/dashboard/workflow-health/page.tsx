'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '<npm>/lib/utils';

type ExecStatus = 'success' | 'failure' | 'running' | 'canceled';
type HealthStatus = 'healthy' | 'degraded' | 'failing' | 'unknown';

interface RecentExecution {
  execution_id: string;
  status: ExecStatus;
  started_at: string | null;
  duration_ms: number | null;
  error_summary: string | null;
}

interface WorkflowHealthEntry {
  workflow_id: string;
  name: string;
  status: HealthStatus;
  last_run_at: string | null;
  last_error_summary: string | null;
  open_alerts_count: number;
  recent_executions: RecentExecution[];
}

type ApiResponse =
  | { status: 'not_enrolled' }
  | { status: 'ok'; workflows: WorkflowHealthEntry[] }
  | { status: 'unavailable'; message: string };

type PageState =
  | { kind: 'loading' }
  | { kind: 'not_enrolled' }
  | { kind: 'unavailable' }
  | { kind: 'ok'; workflows: WorkflowHealthEntry[]; lastFetchedAt: Date };

const POLL_MS = 30_000;
const STATUS_DOT: Record<HealthStatus, string> = {
  healthy:  'bg-[var(--color-success)]',
  degraded: 'bg-[var(--color-warn)]',
  failing:  'bg-[var(--color-danger)]',
  unknown:  'bg-[var(--color-fg-subtle)]',
};

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms)) return '—';
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export default function WorkflowHealthPage() {
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const inFlight = useRef(false);

  const fetchOnce = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch('/api/dashboard/workflow-health', { cache: 'no-store' });
      const body = (await res.json()) as ApiResponse;
      if (body.status === 'not_enrolled') setState({ kind: 'not_enrolled' });
      else if (body.status === 'ok') setState({ kind: 'ok', workflows: body.workflows, lastFetchedAt: new Date() });
      else setState({ kind: 'unavailable' });
    } catch {
      setState({ kind: 'unavailable' });
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    fetchOnce();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchOnce();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchOnce();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchOnce]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="mb-1.5 font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
            Workflow Health
          </h1>
          <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
            Live status of the automations OpsRadar runs for you. Updated every 30 seconds.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchOnce}
          className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[12.5px] text-[var(--color-fg)] hover:bg-[var(--color-surface-sunken)]"
        >
          ↻ Refresh
        </button>
      </div>

      {state.kind === 'loading' && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-8 text-center text-[var(--color-fg-muted)]">
          Loading…
        </div>
      )}

      {state.kind === 'not_enrolled' && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-8 text-center">
          <p className="text-body text-[var(--color-fg)]">Workflow monitoring is not enabled for your account yet.</p>
          <p className="mt-2 text-[12.5px] text-[var(--color-fg-muted)]">Contact your OpsRadar account team to get set up.</p>
        </div>
      )}

      {state.kind === 'unavailable' && (
        <div className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-5 py-4 text-[var(--color-danger)]">
          Workflow data is temporarily unavailable. We are retrying automatically.
        </div>
      )}

      {state.kind === 'ok' && state.workflows.length === 0 && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-8 text-center text-[var(--color-fg-muted)]">
          No workflows are being monitored yet.
        </div>
      )}

      {state.kind === 'ok' && state.workflows.length > 0 && (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="grid grid-cols-[36px_1fr_140px_80px_90px_28px] items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 py-2.5 text-[11px] uppercase tracking-[0.06em] text-[var(--color-fg-subtle)]">
            <div></div>
            <div>Workflow</div>
            <div>Last run</div>
            <div>Errors</div>
            <div>Alerts</div>
            <div></div>
          </div>
          {state.workflows.map((wf) => {
            const open = expanded.has(wf.workflow_id);
            return (
              <div key={wf.workflow_id} className="border-b border-[var(--color-border)] last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggle(wf.workflow_id)}
                  className="grid w-full grid-cols-[36px_1fr_140px_80px_90px_28px] items-center gap-2 px-4 py-3 text-left hover:bg-[var(--color-surface-sunken)]"
                >
                  <span className={cn('inline-block h-2.5 w-2.5 rounded-full', STATUS_DOT[wf.status])} />
                  <span className="truncate text-body text-[var(--color-fg)]">{wf.name}</span>
                  <span className="text-[12.5px] text-[var(--color-fg-muted)]">{timeAgo(wf.last_run_at)}</span>
                  <span className="text-[12.5px] text-[var(--color-fg-muted)]">
                    {wf.last_error_summary ? 'Yes' : '—'}
                  </span>
                  <span className="text-[12.5px] text-[var(--color-fg-muted)]">{wf.open_alerts_count}</span>
                  <span className="text-[var(--color-fg-subtle)]">{open ? '▾' : '▸'}</span>
                </button>
                {open && (
                  <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 py-3">
                    {wf.recent_executions.length === 0 ? (
                      <p className="text-[12.5px] text-[var(--color-fg-muted)]">No recent executions.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {wf.recent_executions.map((e) => (
                          <div key={e.execution_id} className="flex items-center gap-3 text-[12.5px]">
                            <span className={cn('inline-block h-1.5 w-1.5 rounded-full', e.status === 'success' ? 'bg-[var(--color-success)]' : e.status === 'failure' ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-fg-subtle)]')} />
                            <span className="w-[160px] text-[var(--color-fg-muted)]">{timeAgo(e.started_at)}</span>
                            <span className="w-[100px] text-[var(--color-fg-subtle)]">{e.duration_ms != null ? `${e.duration_ms}ms` : '—'}</span>
                            <span className="flex-1 truncate text-[var(--color-fg-muted)]">{e.error_summary ?? ''}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 py-2 text-right text-[10.5px] text-[var(--color-fg-subtle)]">
            Last synced {timeAgo(state.lastFetchedAt.toISOString())}
          </div>
        </div>
      )}
    </>
  );
}
