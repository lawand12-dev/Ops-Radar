'use client'

// Activity tab — per-employee runs feed.
//
// Pulls /api/dashboard/runs?agent=<slug>&limit=50 and renders a vertical list
// of runs with status badge + relative time + summary preview. Clicking a row
// expands an inline drawer that hits /api/dashboard/runs/[id] to load
// tool_calls + cost + tokens.

import { useEffect, useState } from 'react'
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  CircleSlash,
  ChevronRight,
} from 'lucide-react'

type RunStatus = 'success' | 'failed' | 'skipped' | 'running'

type RunRow = {
  id: string
  agent_slug: string
  status: RunStatus | string
  started_at: string | null
  ended_at: string | null
  summary: string | null
  actions_taken: number | null
  patterns_detected: number | null
  risks_flagged: number | null
  notion_writes: number | null
  tokens_used: number | null
  cost_cents: number | null
  error_message: string | null
}

type RunDetailAction = {
  id: string
  action_type: string
  status: string
  created_at: string
}

type RunDetailResponse = {
  run: RunRow
  actions: RunDetailAction[]
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return '—'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(mo / 12)}y ago`
}

export function ActivityTab({ slug }: { slug: string }) {
  const [runs, setRuns] = useState<RunRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/dashboard/runs?agent=${encodeURIComponent(slug)}&limit=50`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load_failed'))))
      .then((data: { runs: RunRow[] }) => {
        if (cancelled) return
        setRuns(data.runs ?? [])
      })
      .catch(() => {
        if (cancelled) return
        setError('Failed to load runs.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-body-sm text-[var(--color-fg-muted)]">
        <Loader2 size={14} className="animate-spin" />
        Loading activity…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-body-sm text-[var(--color-fg-muted)]">
        {error}
      </div>
    )
  }

  if (!runs || runs.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        <p className="text-body-sm text-[var(--color-fg-muted)]">
          No runs yet — this employee hasn&apos;t been run.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-4 py-2.5">
        <span className="text-caption font-mono uppercase tracking-wider text-[var(--color-fg-subtle)]">
          Recent runs · {runs.length}
        </span>
      </div>
      <ul className="divide-y divide-[var(--color-border)]">
        {runs.map((run) => (
          <RunListItem
            key={run.id}
            run={run}
            expanded={expandedId === run.id}
            onToggle={() =>
              setExpandedId((cur) => (cur === run.id ? null : run.id))
            }
          />
        ))}
      </ul>
    </div>
  )
}

function StatusBadge({ status }: { status: RunRow['status'] }) {
  const cfg: Record<string, { bg: string; fg: string; Icon: typeof CheckCircle; label: string }> = {
    success: {
      bg: 'rgba(16,185,129,0.12)',
      fg: 'rgb(110,231,183)',
      Icon: CheckCircle,
      label: 'Success',
    },
    failed: {
      bg: 'rgba(239,68,68,0.12)',
      fg: 'rgb(252,165,165)',
      Icon: XCircle,
      label: 'Failed',
    },
    skipped: {
      bg: 'var(--color-surface-sunken)',
      fg: 'var(--color-fg-subtle)',
      Icon: CircleSlash,
      label: 'Skipped',
    },
    running: {
      bg: 'rgba(59,130,246,0.12)',
      fg: 'rgb(147,197,253)',
      Icon: Loader2,
      label: 'Running',
    },
  }
  const c = cfg[status] ?? {
    bg: 'var(--color-surface-sunken)',
    fg: 'var(--color-fg-subtle)',
    Icon: AlertCircle,
    label: String(status),
  }
  const Icon = c.Icon
  const animate = status === 'running' ? 'animate-spin' : ''
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      <Icon size={10} className={animate} />
      {c.label}
    </span>
  )
}

function RunListItem({
  run,
  expanded,
  onToggle,
}: {
  run: RunRow
  expanded: boolean
  onToggle: () => void
}) {
  const summary =
    (run.summary ?? run.error_message ?? '')
      .toString()
      .slice(0, 200)
      .trim() || '—'

  return (
    <li>
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-sunken)]"
      >
        <ChevronRight
          size={14}
          className={`mt-0.5 shrink-0 text-[var(--color-fg-subtle)] transition-transform ${
            expanded ? 'rotate-90' : ''
          }`}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={run.status} />
            <span className="text-caption text-[var(--color-fg-subtle)]">
              {timeAgo(run.started_at)}
            </span>
            <span className="text-caption text-[var(--color-fg-faint)]">
              · {run.actions_taken ?? 0}{' '}
              {run.actions_taken === 1 ? 'action' : 'actions'}
            </span>
          </div>
          <p className="line-clamp-2 text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
            {summary}
          </p>
        </div>
      </button>
      {expanded && <RunDrawer runId={run.id} />}
    </li>
  )
}

function RunDrawer({ runId }: { runId: string }) {
  const [detail, setDetail] = useState<RunDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/dashboard/runs/${runId}`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error('detail_failed')),
      )
      .then((data: RunDetailResponse) => {
        if (cancelled) return
        setDetail(data)
      })
      .catch(() => {
        if (cancelled) return
        setError('Failed to load run detail.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [runId])

  return (
    <div className="border-t border-dashed border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 py-3 text-body-sm">
      {loading && (
        <div className="flex items-center gap-2 text-[var(--color-fg-muted)]">
          <Loader2 size={12} className="animate-spin" /> Loading detail…
        </div>
      )}
      {error && <div className="text-[var(--color-fg-muted)]">{error}</div>}
      {detail && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-caption sm:grid-cols-4">
            <Stat label="Tokens" value={fmtNum(detail.run.tokens_used)} />
            <Stat label="Cost" value={fmtCost(detail.run.cost_cents)} />
            <Stat
              label="Patterns"
              value={fmtNum(detail.run.patterns_detected)}
            />
            <Stat label="Risks" value={fmtNum(detail.run.risks_flagged)} />
          </div>
          <div>
            <div className="mb-1.5 text-caption font-mono uppercase tracking-wider text-[var(--color-fg-subtle)]">
              Actions queued · {detail.actions.length}
            </div>
            {detail.actions.length === 0 ? (
              <p className="text-body-sm text-[var(--color-fg-faint)]">
                No actions queued during this run.
              </p>
            ) : (
              <ul className="space-y-1">
                {detail.actions.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5"
                  >
                    <span className="truncate font-mono text-[12px] text-[var(--color-fg)]">
                      {a.action_type}
                    </span>
                    <span className="text-caption text-[var(--color-fg-subtle)]">
                      {a.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {detail.run.error_message && (
            <pre className="overflow-x-auto rounded-[var(--radius)] bg-[var(--color-surface)] p-2 text-[11.5px] text-[var(--color-fg-muted)]">
              {detail.run.error_message}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10.5px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
        {label}
      </span>
      <span className="text-body-sm font-medium text-[var(--color-fg)]">
        {value}
      </span>
    </div>
  )
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString()
}

function fmtCost(cents: number | null | undefined): string {
  if (cents == null) return '—'
  return `$${(cents / 100).toFixed(2)}`
}
