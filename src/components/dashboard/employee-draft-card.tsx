'use client'

/**
 * Inline draft card for the COO chat's propose_custom_employee tool (CP-34b).
 *
 * Renders the typed CustomEmployeeDraft returned by propose_custom_employee
 * as a hireable preview. Mirrors src/components/dashboard/automation-draft-card.tsx
 * so the UX feels consistent between automation creation and employee hiring.
 *
 * Customer actions:
 *   - Hire — calls onConfirm(draft); parent typically invokes
 *     install_custom_employee via the chat tool layer
 *   - Edit — let the customer tweak the description and re-propose
 *   - Discard — close the card without persisting
 */

import { useState } from 'react'
import { Check, X, Pencil, Clock, Wrench, BookOpenText, Sparkles } from 'lucide-react'

export type EmployeeDraftLike = {
  slug: string
  name: string
  role: string
  emoji: string
  persona_summary: string
  schedule_human: string
  schedule_cron: string | null
  scoped_toolkits: string[]
  scoped_brain_prefixes: string[]
  model_slug: string
  max_steps: number
  system_prompt: string
  first_task: string
  unsupported: { reason: string } | null
}

type Props = {
  draft: EmployeeDraftLike
  onConfirm: (draft: EmployeeDraftLike) => void | Promise<void>
  onEdit?: (draft: EmployeeDraftLike) => void
  onDiscard?: () => void
  busy?: boolean
}

export function EmployeeDraftCard({
  draft,
  onConfirm,
  onEdit,
  onDiscard,
  busy = false,
}: Props) {
  const [localBusy, setLocalBusy] = useState(false)
  const isBusy = busy || localBusy

  async function handleConfirm() {
    setLocalBusy(true)
    try {
      await onConfirm(draft)
    } finally {
      setLocalBusy(false)
    }
  }

  // Unsupported employees — surface gracefully, no Hire button.
  if (draft.unsupported) {
    return (
      <div className="rounded-[10px] border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="mb-1 text-[12px] font-semibold text-amber-300">
          Can&apos;t hire this employee yet
        </div>
        <div className="text-[12px] leading-[1.5] text-[var(--color-fg-muted)]">
          {draft.unsupported.reason}
        </div>
        {onDiscard && (
          <div className="mt-3">
            <button
              onClick={onDiscard}
              className="rounded-[6px] border border-[var(--color-border)] px-3 py-1.5 text-[11.5px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      {/* Header: avatar + name + role + model badge */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-[18px]"
          >
            {draft.emoji}
          </span>
          <div className="min-w-0">
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-faint)]">
              Hire AI Employee · draft
            </div>
            <div className="text-[14px] font-semibold text-[var(--color-fg)]">
              {draft.name} <span className="text-[var(--color-fg-muted)]">· {draft.role}</span>
            </div>
            <div className="mt-0.5 text-[12px] leading-[1.45] text-[var(--color-fg-muted)]">
              {draft.persona_summary}
            </div>
          </div>
        </div>
        <span className="inline-block shrink-0 rounded-full bg-[var(--color-surface-sunken)] px-2 py-0.5 text-[10px] font-mono font-semibold text-[var(--color-fg-subtle)]">
          {draft.model_slug}
        </span>
      </div>

      {/* Specs grid */}
      <div className="grid gap-1.5 sm:grid-cols-2">
        <SpecRow
          icon={<Clock className="h-3.5 w-3.5" />}
          tag="SCHEDULE"
          label={draft.schedule_human}
          detail={draft.schedule_cron ?? undefined}
        />
        <SpecRow
          icon={<Wrench className="h-3.5 w-3.5" />}
          tag="TOOLS"
          label={
            draft.scoped_toolkits.length > 0
              ? draft.scoped_toolkits.join(', ')
              : 'No external tools (chat + brain only)'
          }
        />
        <SpecRow
          icon={<BookOpenText className="h-3.5 w-3.5" />}
          tag="BRAIN SCOPE"
          label={
            draft.scoped_brain_prefixes.length > 0
              ? draft.scoped_brain_prefixes.join(', ')
              : 'employees/' + draft.slug + '/'
          }
        />
        <SpecRow
          icon={<Sparkles className="h-3.5 w-3.5" />}
          tag="FIRST TASK"
          label={draft.first_task}
        />
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-1.5">
        <button
          onClick={() => void handleConfirm()}
          disabled={isBusy}
          className="inline-flex items-center gap-1.5 rounded-[6px] bg-[var(--color-primary)] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          Hire {draft.name}
        </button>
        {onEdit && (
          <button
            onClick={() => onEdit(draft)}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--color-border)] px-3 py-1.5 text-[11.5px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] disabled:opacity-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
        {onDiscard && (
          <button
            onClick={onDiscard}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--color-border)] px-3 py-1.5 text-[11.5px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            Discard
          </button>
        )}
      </div>
    </div>
  )
}

function SpecRow({
  icon,
  tag,
  label,
  detail,
}: {
  icon?: React.ReactNode
  tag: string
  label: string
  detail?: string
}) {
  return (
    <div className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2">
      <div className="mb-0.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-fg-faint)]">
        {icon}
        <span>{tag}</span>
      </div>
      <div className="text-[12px] leading-[1.4] text-[var(--color-fg)]">{label}</div>
      {detail && (
        <div className="mt-0.5 font-mono text-[10.5px] text-[var(--color-fg-subtle)]">
          {detail}
        </div>
      )}
    </div>
  )
}
