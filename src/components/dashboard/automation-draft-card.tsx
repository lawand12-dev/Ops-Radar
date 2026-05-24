'use client'

import { useState } from 'react'
import { Zap, ArrowDown, Check, X, Pencil, Bell } from 'lucide-react'
import type { AutomationDraft } from '<npm>/lib/automations/draft-schema'

type Props = {
  draft: AutomationDraft
  onConfirm: (draft: AutomationDraft) => void | Promise<void>
  onEdit?: (draft: AutomationDraft) => void
  onDiscard?: () => void
  busy?: boolean
}

function triggerLine(draft: AutomationDraft): string {
  const t = draft.trigger
  if (t.kind === 'composio_event' && t.toolkit && t.slug) {
    return `${t.toolkit}: ${humanize(t.slug)}`
  }
  if (t.kind === 'schedule') {
    return `Schedule: ${t.schedule_cron ?? '—'}`
  }
  if (t.kind === 'manual') return 'Manual trigger'
  if (t.kind === 'webhook') return 'Incoming webhook'
  return t.kind
}

function humanize(slug: string): string {
  return slug
    .replace(/_TRIGGER$/i, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function stepLabel(
  step: AutomationDraft['spec']['steps'][number],
): { label: string; detail?: string } {
  switch (step.kind) {
    case 'composio_action':
      return {
        label: `${step.toolkit}: ${humanize(step.action_slug)}`,
        detail: argsPreview(step.arguments),
      }
    case 'notion_write':
      return {
        label: `Notion: write to ${step.database_slug}`,
        detail: argsPreview(step.properties),
      }
    case 'condition':
      return {
        label: 'Branch on condition',
        detail: step.branches.map((b) => b.when).join(' | '),
      }
    case 'set':
      return { label: `Set ${step.key}`, detail: step.value }
    case 'queue_action':
      return {
        label: `Queue action: ${step.action_type}`,
      }
  }
}

function argsPreview(obj: Record<string, unknown>): string | undefined {
  const keys = Object.keys(obj)
  if (keys.length === 0) return undefined
  return keys.slice(0, 4).join(', ') + (keys.length > 4 ? `, +${keys.length - 4} more` : '')
}

export function AutomationDraftCard({
  draft,
  onConfirm,
  onEdit,
  onDiscard,
  busy = false,
}: Props) {
  const [localBusy, setLocalBusy] = useState(false)
  const isBusy = busy || localBusy

  const unsupported =
    draft.name === 'unsupported' || draft.spec.steps.length === 0

  const hasDuplicates = draft.duplicates_of.length > 0

  async function handleConfirm() {
    setLocalBusy(true)
    try {
      await onConfirm(draft)
    } finally {
      setLocalBusy(false)
    }
  }

  if (unsupported) {
    return (
      <div className="rounded-[10px] border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="mb-1 text-[12px] font-semibold text-amber-300">
          Can&apos;t build this yet
        </div>
        <div className="text-[12px] leading-[1.5] text-[var(--color-fg-muted)]">
          {draft.description}
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
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-faint)]">
            Automation draft
          </div>
          <div className="text-[13px] font-semibold text-[var(--color-fg)]">
            {draft.name}
          </div>
          <div className="mt-0.5 text-[12px] leading-[1.45] text-[var(--color-fg-muted)]">
            {draft.description}
          </div>
        </div>
        <span className="inline-block shrink-0 rounded-full bg-[var(--color-surface-sunken)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-fg-subtle)]">
          autonomy: {draft.autonomy}
        </span>
      </div>

      {hasDuplicates && (
        <div className="mb-3 flex items-start gap-2 rounded-[8px] border border-amber-500/30 bg-amber-500/5 p-2.5">
          <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <div className="text-[11.5px] leading-[1.45] text-amber-200">
            Looks like this overlaps with: {draft.duplicates_of.join(', ')}. Confirm only
            if you want both running.
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <StepRow
          icon={<Zap className="h-3.5 w-3.5" />}
          tag="TRIGGER"
          label={triggerLine(draft)}
          detail={
            Object.keys(draft.trigger.filter ?? {}).length > 0
              ? `filter: ${argsPreview(draft.trigger.filter ?? {}) ?? ''}`
              : undefined
          }
        />
        {draft.spec.steps.map((step, i) => {
          const { label, detail } = stepLabel(step)
          return (
            <div key={i}>
              <div className="flex justify-center py-0.5">
                <ArrowDown className="h-3 w-3 text-[var(--color-fg-faint)]" />
              </div>
              <StepRow tag="THEN" label={label} detail={detail} />
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        <button
          onClick={() => void handleConfirm()}
          disabled={isBusy}
          className="inline-flex items-center gap-1.5 rounded-[6px] bg-[var(--color-primary)] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          Confirm &amp; install
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

function StepRow({
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
    <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-2.5">
      <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-faint)]">
        {icon}
        {tag}
      </div>
      <div className="text-[12px] font-medium text-[var(--color-fg)]">{label}</div>
      {detail && (
        <div className="mt-0.5 text-[11px] text-[var(--color-fg-subtle)]">{detail}</div>
      )}
    </div>
  )
}
