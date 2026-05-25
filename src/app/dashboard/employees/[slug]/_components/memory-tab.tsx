'use client'

// Memory tab — brain commits authored by this specific employee.
//
// Author-type convention (see lib/employees/types.ts `brainAuthorTypeFor`):
//   built-in employees  → 'agent:<slug>'
//   custom employees    → 'employee:<slug>'
//
// We fetch /api/dashboard/brain/commits then filter client-side by the
// expected author_type. The endpoint doesn't currently accept a filter
// param; if we later add one we can push the filter to the server.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ChevronRight,
  Loader2,
  ExternalLink,
  FileText,
} from 'lucide-react'

type Commit = {
  id: string
  message: string | null
  author_type: string
  created_at: string
  paths: string[]
  paths_count: number
}

function timeAgo(iso: string): string {
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

export function MemoryTab({
  slug,
  origin,
}: {
  slug: string
  origin: 'built_in' | 'custom'
}) {
  const [commits, setCommits] = useState<Commit[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const expectedAuthorType =
    origin === 'built_in' ? `agent:${slug}` : `employee:${slug}`

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/dashboard/brain/commits?limit=100`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error('load_failed')),
      )
      .then((data: { commits: Commit[] }) => {
        if (cancelled) return
        const mine = (data.commits ?? []).filter(
          (c) => c.author_type === expectedAuthorType,
        )
        setCommits(mine)
      })
      .catch(() => {
        if (cancelled) return
        setError('Failed to load brain commits.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [expectedAuthorType])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div>
          <h2 className="text-body font-medium text-[var(--color-fg)]">
            This employee&apos;s brain writes
          </h2>
          <p className="mt-0.5 text-caption text-[var(--color-fg-muted)]">
            Every Pattern Card, Risk Register entry, KPI Snapshot, and note
            committed by this teammate.
          </p>
        </div>
        <Link
          href="/dashboard/brain"
          className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-1.5 text-caption text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-fg)]"
        >
          Browse full brain
          <ExternalLink size={11} />
        </Link>
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-body-sm text-[var(--color-fg-muted)]">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      )}

      {error && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-body-sm text-[var(--color-fg-muted)]">
          {error}
        </div>
      )}

      {!loading && !error && commits && commits.length === 0 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
          <p className="text-body-sm text-[var(--color-fg-muted)]">
            No brain writes yet.
          </p>
        </div>
      )}

      {!loading && commits && commits.length > 0 && (
        <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          {commits.map((c) => (
            <CommitRow
              key={c.id}
              commit={c}
              expanded={expandedId === c.id}
              onToggle={() =>
                setExpandedId((cur) => (cur === c.id ? null : c.id))
              }
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function CommitRow({
  commit,
  expanded,
  onToggle,
}: {
  commit: Commit
  expanded: boolean
  onToggle: () => void
}) {
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
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-body-sm text-[var(--color-fg)]">
              {commit.message ?? '(no message)'}
            </span>
            <span className="text-caption text-[var(--color-fg-subtle)]">
              · {commit.paths_count}{' '}
              {commit.paths_count === 1 ? 'file' : 'files'}
            </span>
          </div>
          <span className="text-caption text-[var(--color-fg-faint)]">
            {timeAgo(commit.created_at)}
          </span>
        </div>
      </button>
      {expanded && (
        <ul className="border-t border-dashed border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 py-2.5">
          {commit.paths.map((p) => (
            <li
              key={p}
              className="flex items-center gap-2 py-1 font-mono text-[12px] text-[var(--color-fg-muted)]"
            >
              <FileText size={11} className="shrink-0" />
              {p}
            </li>
          ))}
          {commit.paths.length === 0 && (
            <li className="py-1 text-caption text-[var(--color-fg-faint)]">
              No file paths recorded for this commit.
            </li>
          )}
        </ul>
      )}
    </li>
  )
}
