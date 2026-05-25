'use client'

import { useEffect, useState } from 'react'
import { GitCommit, Bot, User, Sparkles } from 'lucide-react'

type Commit = {
  id: string
  message: string | null
  author_type: string
  created_at: string
  paths: string[]
  paths_count: number
}

export function BrainCommitsFeed() {
  const [commits, setCommits] = useState<Commit[] | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/brain/commits?limit=15')
      .then((r) => r.json())
      .then((d: { commits: Commit[] }) => setCommits(d.commits ?? []))
      .catch(() => setCommits([]))
  }, [])

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-body font-medium text-[var(--color-fg)]">Recent activity</h2>
        <span className="text-caption text-[var(--color-fg-subtle)]">
          Append-only ledger · newest first
        </span>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        {commits === null && <Empty>Loading…</Empty>}
        {commits?.length === 0 && (
          <Empty>
            No brain writes yet. Connect tools — the first agent run will land here.
          </Empty>
        )}
        {commits?.map((c, i) => (
          <div
            key={c.id}
            className={`flex items-start gap-3 px-4 py-3 ${i === 0 ? '' : 'border-t border-[var(--color-border)]'}`}
          >
            <AuthorIcon authorType={c.author_type} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-body-sm font-semibold text-[var(--color-fg)]">
                  {prettyAuthor(c.author_type)}
                </span>
                <span className="text-caption text-[var(--color-fg-subtle)]">
                  · {relativeTime(c.created_at)}
                </span>
                <span className="text-caption text-[var(--color-fg-faint)]">
                  · {c.paths_count} {c.paths_count === 1 ? 'file' : 'files'}
                </span>
              </div>
              {c.message && (
                <div className="mt-0.5 text-body-sm text-[var(--color-fg-muted)]">{c.message}</div>
              )}
              {c.paths.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {c.paths.slice(0, 4).map((p) => (
                    <span
                      key={p}
                      className="rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] px-1.5 py-0.5 font-mono text-caption text-[var(--color-fg-muted)]"
                    >
                      {p}
                    </span>
                  ))}
                  {c.paths.length > 4 && (
                    <span className="text-caption text-[var(--color-fg-faint)]">
                      +{c.paths.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-6 text-center text-body-sm text-[var(--color-fg-subtle)]">{children}</div>
}

function AuthorIcon({ authorType }: { authorType: string }) {
  if (authorType.startsWith('agent:')) {
    return <Bot size={14} className="mt-1 shrink-0 text-[var(--color-primary)]" />
  }
  if (authorType === 'coo') {
    return <Sparkles size={14} className="mt-1 shrink-0 text-[var(--color-primary)]" />
  }
  if (authorType === 'customer') {
    return <User size={14} className="mt-1 shrink-0 text-[var(--color-fg-subtle)]" />
  }
  return <GitCommit size={14} className="mt-1 shrink-0 text-[var(--color-fg-subtle)]" />
}

function prettyAuthor(authorType: string): string {
  if (authorType.startsWith('agent:')) {
    return `${authorType.slice(6)} agent`
  }
  if (authorType === 'coo') return 'AI COO'
  if (authorType === 'customer') return 'You'
  return authorType
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.round(ms / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.round(hr / 24)
  return `${d}d ago`
}
