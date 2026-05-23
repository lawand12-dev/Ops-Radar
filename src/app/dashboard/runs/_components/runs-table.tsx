'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, MinusCircle, Loader2, X as CloseIcon, RefreshCw } from 'lucide-react';

type Run = {
  id: string;
  agent_slug: string;
  status: 'success' | 'failed' | 'skipped' | 'running';
  started_at: string | null;
  ended_at: string | null;
  summary: string | null;
  actions_taken: number | null;
  patterns_detected: number | null;
  risks_flagged: number | null;
  notion_writes: number | null;
  tokens_used: number | null;
  cost_cents: number | null;
  error_message: string | null;
};

type QueuedAction = {
  id: string;
  action_type: string;
  status: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  executed_at: string | null;
  rejected_at: string | null;
};

type RunDetail = { run: Run; actions: QueuedAction[] };

const STATUSES: Array<Run['status'] | 'all'> = ['all', 'success', 'failed', 'skipped', 'running'];

const AGENT_LABEL: Record<string, string> = {
  revenue: 'Revenue',
  collections: 'Collections',
  scope: 'Scope',
  delivery: 'Delivery',
  briefing: 'Briefing',
  profitability: 'Profitability',
  team: 'Team',
  growth: 'Growth',
  renewal: 'Renewal',
  stack: 'Stack',
};

function statusIcon(s: Run['status']) {
  if (s === 'success') return <CheckCircle2 size={13} className="text-emerald-400" />;
  if (s === 'failed') return <XCircle size={13} className="text-red-400" />;
  if (s === 'skipped') return <MinusCircle size={13} className="text-[var(--color-fg-subtle)]" />;
  return <Loader2 size={13} className="animate-spin text-[var(--color-primary)]" />;
}

function durationMs(r: Run): number | null {
  if (!r.started_at || !r.ended_at) return null;
  return new Date(r.ended_at).getTime() - new Date(r.started_at).getTime();
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function formatCost(cents: number | null): string {
  if (!cents) return '—';
  if (cents < 100) return `${cents}¢`;
  return `$${(cents / 100).toFixed(2)}`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso).getTime();
  const diffMs = Date.now() - d;
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  return `${days}d ago`;
}

export function RunsTable() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<typeof STATUSES[number]>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: '50' });
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (agentFilter !== 'all') params.set('agent', agentFilter);
        const res = await fetch(`/api/dashboard/runs?${params}`, { signal: ac.signal });
        const data = (await res.json()) as { runs?: Run[] };
        setRuns(data.runs ?? []);
      } catch (err) {
        if (ac.signal.aborted) return;
        console.error('[runs-table] load failed:', err);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [statusFilter, agentFilter]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    const ac = new AbortController();
    void (async () => {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/dashboard/runs/${selectedId}`, { signal: ac.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as RunDetail;
        setDetail(data);
      } catch (err) {
        if (ac.signal.aborted) return;
        console.error('[runs-table] detail failed:', err);
        setDetail(null);
      } finally {
        if (!ac.signal.aborted) setDetailLoading(false);
      }
    })();
    return () => ac.abort();
  }, [selectedId]);

  const agentSlugs = useMemo(() => {
    const set = new Set<string>();
    for (const r of runs) set.add(r.agent_slug);
    return ['all', ...Array.from(set).sort()];
  }, [runs]);

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-fg-subtle)]">Status</span>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-2.5 py-0.5 text-[11.5px] transition-colors ${
                statusFilter === s
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-fg-subtle)]">Agent</span>
          {agentSlugs.map((a) => (
            <button
              key={a}
              onClick={() => setAgentFilter(a)}
              className={`rounded-full border px-2.5 py-0.5 text-[11.5px] transition-colors ${
                agentFilter === a
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
              }`}
            >
              {a === 'all' ? 'all' : (AGENT_LABEL[a] ?? a)}
            </button>
          ))}
        </div>
      </div>

      {/* Runs table */}
      {loading ? (
        <div className="flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-10 text-[12.5px] text-[var(--color-fg-muted)]">
          <Loader2 size={14} className="mr-2 animate-spin" /> Loading runs…
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-10 text-center text-[12.5px] text-[var(--color-fg-muted)]">
          No runs yet. Your AI Ops Team runs on a schedule — the first runs appear after the next cron tick.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full text-[12.5px]">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/30 text-left">
              <tr className="text-[11px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Agent</th>
                <th className="px-4 py-2.5 font-medium">Started</th>
                <th className="px-4 py-2.5 font-medium">Duration</th>
                <th className="px-4 py-2.5 font-medium">Actions</th>
                <th className="px-4 py-2.5 font-medium">Notion writes</th>
                <th className="px-4 py-2.5 font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`cursor-pointer border-t border-[var(--color-border)] transition-colors ${
                    selectedId === r.id ? 'bg-[var(--color-surface-2)]' : 'hover:bg-[var(--color-surface-2)]/40'
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-[12px] capitalize text-[var(--color-fg)]">
                      {statusIcon(r.status)} {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--color-fg)]">{AGENT_LABEL[r.agent_slug] ?? r.agent_slug}</td>
                  <td className="px-4 py-2.5 text-[var(--color-fg-muted)]">{relativeTime(r.started_at)}</td>
                  <td className="px-4 py-2.5 text-[var(--color-fg-muted)]">{formatDuration(durationMs(r))}</td>
                  <td className="px-4 py-2.5 text-[var(--color-fg-muted)]">{r.actions_taken ?? 0}</td>
                  <td className="px-4 py-2.5 text-[var(--color-fg-muted)]">{r.notion_writes ?? 0}</td>
                  <td className="px-4 py-2.5 text-[var(--color-fg-muted)]">{formatCost(r.cost_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer */}
      {selectedId && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedId(null)}
          aria-hidden
        />
      )}
      <aside
        className={`fixed right-0 top-0 z-50 h-screen w-full max-w-[560px] overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl transition-transform ${
          selectedId ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!selectedId}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            {detail?.run && statusIcon(detail.run.status)}
            <h2 className="text-[14px] font-semibold text-[var(--color-fg)]">
              {detail?.run ? (AGENT_LABEL[detail.run.agent_slug] ?? detail.run.agent_slug) + ' run' : 'Run detail'}
            </h2>
          </div>
          <button
            onClick={() => setSelectedId(null)}
            aria-label="Close drawer"
            className="rounded-md p-1 text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          {detailLoading ? (
            <div className="flex items-center text-[12.5px] text-[var(--color-fg-muted)]">
              <Loader2 size={14} className="mr-2 animate-spin" /> Loading detail…
            </div>
          ) : !detail ? (
            <p className="text-[12.5px] text-[var(--color-fg-muted)]">Couldn&rsquo;t load this run.</p>
          ) : (
            <>
              <section>
                <h3 className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">Metrics</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                  <dt className="text-[var(--color-fg-muted)]">Status</dt>
                  <dd className="capitalize text-[var(--color-fg)]">{detail.run.status}</dd>
                  <dt className="text-[var(--color-fg-muted)]">Duration</dt>
                  <dd className="text-[var(--color-fg)]">{formatDuration(durationMs(detail.run))}</dd>
                  <dt className="text-[var(--color-fg-muted)]">Tokens</dt>
                  <dd className="text-[var(--color-fg)]">{detail.run.tokens_used?.toLocaleString() ?? '—'}</dd>
                  <dt className="text-[var(--color-fg-muted)]">Cost</dt>
                  <dd className="text-[var(--color-fg)]">{formatCost(detail.run.cost_cents)}</dd>
                  <dt className="text-[var(--color-fg-muted)]">Actions taken</dt>
                  <dd className="text-[var(--color-fg)]">{detail.run.actions_taken ?? 0}</dd>
                  <dt className="text-[var(--color-fg-muted)]">Patterns detected</dt>
                  <dd className="text-[var(--color-fg)]">{detail.run.patterns_detected ?? 0}</dd>
                  <dt className="text-[var(--color-fg-muted)]">Risks flagged</dt>
                  <dd className="text-[var(--color-fg)]">{detail.run.risks_flagged ?? 0}</dd>
                  <dt className="text-[var(--color-fg-muted)]">Notion writes</dt>
                  <dd className="text-[var(--color-fg)]">{detail.run.notion_writes ?? 0}</dd>
                </dl>
              </section>

              {detail.run.summary && (
                <section>
                  <h3 className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">Summary</h3>
                  <div className="whitespace-pre-wrap rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[12.5px] leading-[1.55] text-[var(--color-fg)]">
                    {detail.run.summary}
                  </div>
                </section>
              )}

              {detail.run.error_message && (
                <section>
                  <h3 className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-red-400">Error</h3>
                  <div className="rounded-[var(--radius)] border border-red-500/30 bg-red-950/20 p-3 text-[12px] text-red-300">
                    {detail.run.error_message}
                  </div>
                </section>
              )}

              <section>
                <h3 className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
                  Actions queued ({detail.actions.length})
                </h3>
                {detail.actions.length === 0 ? (
                  <p className="text-[12px] text-[var(--color-fg-muted)]">No actions queued during this run.</p>
                ) : (
                  <ul className="space-y-2">
                    {detail.actions.map((a) => {
                      const composioSummary =
                        a.action_type === 'composio_action' && a.payload && typeof a.payload === 'object'
                          ? ((a.payload as { summary?: string }).summary ?? null)
                          : null;
                      return (
                        <li
                          key={a.id}
                          className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
                        >
                          <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
                            <span className="font-medium text-[var(--color-fg)]">
                              {a.action_type === 'composio_action'
                                ? (composioSummary ?? 'Composio action')
                                : a.action_type}
                            </span>
                            <span
                              className={`shrink-0 rounded-full px-2 py-[1px] text-[10.5px] capitalize ${
                                a.status === 'executed'
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : a.status === 'pending'
                                    ? 'bg-amber-500/15 text-amber-300'
                                    : a.status === 'rejected' || a.status === 'dismissed'
                                      ? 'bg-[var(--color-surface-2)] text-[var(--color-fg-subtle)]'
                                      : 'bg-red-500/15 text-red-300'
                              }`}
                            >
                              {a.status}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-[var(--color-fg-muted)]">
                            Queued {relativeTime(a.created_at)}
                            {a.executed_at && ` · executed ${relativeTime(a.executed_at)}`}
                            {a.rejected_at && ` · rejected ${relativeTime(a.rejected_at)}`}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="border-t border-[var(--color-border)] pt-4">
                <a
                  href="/dashboard/actions"
                  className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-primary)] hover:underline"
                >
                  <RefreshCw size={12} /> Review actions in queue
                </a>
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
