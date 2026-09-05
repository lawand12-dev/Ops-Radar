'use client'

import { useState } from 'react'
import { Plus, Trash2, MessageSquarePlus, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

export type ChatSession = {
  id: string
  title: string
  message_count: number
  last_message_at: string
  created_at: string
}

type Props = {
  sessions: ChatSession[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  loading: boolean
  collapsed: boolean
  onToggle: () => void
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function SessionsSidebar({
  sessions,
  activeId,
  onSelect,
  onNew,
  onDelete,
  loading,
  collapsed,
  onToggle,
}: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  // ── Collapsed: thin icon rail ───────────────────────────────────────────
  if (collapsed) {
    return (
      <aside className="flex h-full w-[52px] shrink-0 flex-col items-center gap-1.5 border-r border-[var(--color-border)] bg-[var(--color-bg)] py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label="Show chat history"
          title="Show chat history"
          className="flex size-9 items-center justify-center rounded-[var(--radius)] text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-fg)]"
        >
          <PanelLeftOpen size={17} />
        </button>
        <button
          type="button"
          onClick={onNew}
          aria-label="New hire"
          title="New hire"
          className="flex size-9 items-center justify-center rounded-[var(--radius)] bg-[var(--color-primary)] text-white transition-opacity hover:opacity-90"
        >
          <Plus size={17} />
        </button>
      </aside>
    )
  }

  // ── Expanded: full history rail ─────────────────────────────────────────
  return (
    <aside className="flex h-full w-[264px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] p-2.5">
        <button
          type="button"
          onClick={onNew}
          className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12.5px] font-medium text-[var(--color-fg)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          <Plus size={14} /> New hire
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Hide chat history"
          title="Hide chat history"
          className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] text-[var(--color-fg-subtle)] transition-colors hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-fg)]"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-1.5 py-2">
        {loading && sessions.length === 0 && (
          <p className="px-3 py-2 text-[11.5px] text-[var(--color-fg-subtle)]">Loading…</p>
        )}

        {!loading && sessions.length === 0 && (
          <div className="flex flex-col items-center gap-1.5 px-3 py-8 text-center">
            <MessageSquarePlus size={18} className="text-[var(--color-fg-subtle)]" />
            <p className="text-[11.5px] leading-[1.5] text-[var(--color-fg-subtle)]">
              No hires yet.<br />Start your first one.
            </p>
          </div>
        )}

        <ul className="space-y-0.5">
          {sessions.map((s) => {
            const isActive = s.id === activeId
            const isHover = hoverId === s.id
            const isConfirming = confirmId === s.id
            return (
              <li
                key={s.id}
                onMouseEnter={() => setHoverId(s.id)}
                onMouseLeave={() => {
                  setHoverId(null)
                  if (isConfirming) setConfirmId(null)
                }}
                className={`group relative flex items-start gap-2 rounded-[var(--radius)] px-2.5 py-2 cursor-pointer ${
                  isActive
                    ? 'bg-[var(--color-surface-sunken)] text-[var(--color-fg)]'
                    : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-fg)]'
                }`}
                onClick={() => onSelect(s.id)}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[var(--color-primary)]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] leading-tight">{s.title}</p>
                  <p className="mt-0.5 text-[10.5px] text-[var(--color-fg-subtle)]">
                    {relativeTime(s.last_message_at)} · {s.message_count} msg{s.message_count === 1 ? '' : 's'}
                  </p>
                </div>

                {(isHover || isConfirming) && (
                  <button
                    type="button"
                    aria-label={isConfirming ? 'Confirm delete' : 'Delete chat'}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isConfirming) {
                        onDelete(s.id)
                        setConfirmId(null)
                      } else {
                        setConfirmId(s.id)
                      }
                    }}
                    className={`shrink-0 rounded p-1 ${
                      isConfirming
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'text-[var(--color-fg-subtle)] hover:bg-[var(--color-surface)] hover:text-red-400'
                    }`}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}
