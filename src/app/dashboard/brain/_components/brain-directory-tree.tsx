'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, Folder, FileText } from 'lucide-react'

type Dir = {
  name: string
  count: number
  files: string[]
}

const PRETTY_DIR_NAMES: Record<string, string> = {
  'pattern-cards': 'Pattern Cards',
  'risk-register': 'Risk Register',
  'decision-log': 'Decision Log',
  'kpi-snapshots': 'KPI Snapshots',
  'real-pl': 'Real P&L',
  clients: 'Clients',
  'quarterly-memory': 'Quarterly Memory',
  projects: 'Projects',
  'service-lines': 'Service Lines',
  team: 'Team',
  'tool-stack': 'Tool Stack',
  contracts: 'Contracts',
  pages: 'Pages',
  'agent-runs': 'Agent Runs',
  _root: 'Root',
}

export function BrainDirectoryTree() {
  const [dirs, setDirs] = useState<Dir[] | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/dashboard/brain/tree')
      .then((r) => r.json())
      .then((d: { directories: Dir[] }) => setDirs(d.directories ?? []))
      .catch(() => setDirs([]))
  }, [])

  function toggle(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <section>
      <h2 className="mb-3 text-body font-medium text-[var(--color-fg)]">Browse the brain</h2>

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        {dirs === null && <Empty>Loading…</Empty>}
        {dirs?.length === 0 && (
          <Empty>The brain is empty. Agents will start writing once tools are connected.</Empty>
        )}
        {dirs?.map((d, i) => (
          <div key={d.name} className={i === 0 ? '' : 'border-t border-[var(--color-border)]'}>
            <button
              type="button"
              onClick={() => toggle(d.name)}
              disabled={d.count === 0}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-[var(--color-surface-sunken)] disabled:cursor-default disabled:hover:bg-transparent"
            >
              <ChevronRight
                size={12}
                className={`text-[var(--color-fg-faint)] transition-transform ${expanded.has(d.name) ? 'rotate-90' : ''} ${d.count === 0 ? 'invisible' : ''}`}
              />
              <Folder size={14} className="text-[var(--color-fg-subtle)]" />
              <span className="flex-1 text-body-sm font-medium text-[var(--color-fg)]">
                {PRETTY_DIR_NAMES[d.name] ?? d.name}
              </span>
              <span className="text-caption text-[var(--color-fg-subtle)]">
                {d.count} {d.count === 1 ? 'file' : 'files'}
              </span>
            </button>
            {expanded.has(d.name) && d.files.length > 0 && (
              <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 py-2">
                {d.files.map((p) => (
                  <div key={p} className="flex items-center gap-2 py-1">
                    <FileText size={11} className="text-[var(--color-fg-faint)]" />
                    <span className="font-mono text-caption text-[var(--color-fg-muted)]">{p}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-6 text-center text-body-sm text-[var(--color-fg-subtle)]">{children}</div>
}
