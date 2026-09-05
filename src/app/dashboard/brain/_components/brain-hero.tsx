'use client'

import { useEffect, useState } from 'react'

type Summary = {
  documents: number
  commits_7d: number
  last_commit_at: string | null
}

export function BrainHero() {
  const [s, setS] = useState<Summary | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/brain/summary')
      .then((r) => r.json())
      .then((d: Summary) => setS(d))
      .catch(() => setS({ documents: 0, commits_7d: 0, last_commit_at: null }))
  }, [])

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <h1 className="font-serif text-[24px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
        Your Company Brain
      </h1>
      <p className="mt-1.5 max-w-[64ch] text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
        Owned by you, built by your AI team. Stored as versioned markdown
        (Karpathy-style append-only ledger), mirrored daily to your Notion
        workspace, exported weekly as a portable zip.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Tile label="Documents" value={s ? s.documents : '—'} hint="Markdown files agents have written" />
        <Tile label="Commits this week" value={s ? s.commits_7d : '—'} hint="Brain writes in the last 7 days" />
        <Tile
          label="Last write"
          value={s?.last_commit_at ? relativeTime(s.last_commit_at) : 'Never'}
          hint="Any agent, COO, or you"
        />
      </div>
    </section>
  )
}

function Tile({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-3.5">
      <div className="text-caption font-mono uppercase tracking-wider text-[var(--color-fg-subtle)]">
        {label}
      </div>
      <div className="mt-1 font-serif text-[22px] font-normal text-[var(--color-fg)]">{value}</div>
      <div className="mt-0.5 text-caption text-[var(--color-fg-faint)]">{hint}</div>
    </div>
  )
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
