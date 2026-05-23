'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '<npm>/lib/utils'

export type AgentState = 'active' | 'paused' | 'ready' | 'locked'

export type AgentCardProps = {
  slug: string
  displayName: string
  description: string
  model: string
  requiredTier: 'starter' | 'growth' | 'pro'
  state: AgentState
  missingIntegrations: string[]
  isEnabled: boolean
  cronSchedule: string
  lastRunAt: string | null
  lastRunStatus: 'success' | 'failed' | 'skipped' | null
  lastRunSummary: string | null
  onToggle: (slug: string, next: boolean) => Promise<void>
}

const STATE_STYLES: Record<AgentState, { dot: string; label: string; text: string }> = {
  active: { dot: 'bg-[var(--color-success)]', label: 'Active', text: 'text-[var(--color-success)]' },
  paused: { dot: 'bg-[var(--color-fg-subtle)]', label: 'Paused', text: 'text-[var(--color-fg-subtle)]' },
  ready: { dot: 'bg-[var(--color-warn)]', label: 'Ready', text: 'text-[var(--color-warn)]' },
  locked: { dot: 'bg-[var(--color-fg-subtle)]', label: 'Locked', text: 'text-[var(--color-fg-subtle)]' },
}

const TIER_LABEL: Record<AgentCardProps['requiredTier'], string> = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
}

function fmtRelative(iso: string | null): string {
  if (!iso) return 'never run'
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.round(diffH / 24)
  return `${diffD}d ago`
}

export function AgentCard(props: AgentCardProps) {
  const {
    slug,
    displayName,
    description,
    model,
    requiredTier,
    state,
    missingIntegrations,
    isEnabled,
    lastRunAt,
    lastRunStatus,
    onToggle,
  } = props
  const [pending, setPending] = useState(false)
  const stateStyle = STATE_STYLES[state]
  const canToggle = state === 'active' || state === 'paused'

  async function handleToggle() {
    setPending(true)
    try {
      await onToggle(slug, !isEnabled)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="text-body font-semibold text-[var(--color-fg)]">{displayName}</h3>
            <span className="rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] px-1.5 py-[2px] text-[10.5px] tracking-[0.04em] text-[var(--color-fg-subtle)]">
              {model}
            </span>
          </div>
          <p className="text-body-sm text-[var(--color-fg-muted)]">{description}</p>
        </div>
        <span className={cn('flex shrink-0 items-center gap-1.5 text-[11.5px]', stateStyle.text)}>
          <span className={cn('size-1.5 rounded-full', stateStyle.dot)} />
          {stateStyle.label}
        </span>
      </div>

      {state === 'ready' && missingIntegrations.length > 0 && (
        <div className="rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--color-warn)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-warn)_8%,transparent)] px-2.5 py-2 text-[11.5px] text-[var(--color-warn)]">
          Connect {missingIntegrations.join(', ')} to activate.{' '}
          <Link href="/dashboard/integrations" className="underline">
            Go to integrations
          </Link>
        </div>
      )}

      {state === 'locked' && (
        <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 py-2 text-[11.5px] text-[var(--color-fg-subtle)]">
          Requires {TIER_LABEL[requiredTier]} plan.{' '}
          <Link href="/pricing" className="text-[var(--color-primary)] underline">
            Upgrade
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="text-[11.5px] text-[var(--color-fg-subtle)]">
          {lastRunStatus === 'success' && <>Last run {fmtRelative(lastRunAt)}</>}
          {lastRunStatus === 'failed' && (
            <span className="text-[var(--color-danger)]">Last run failed {fmtRelative(lastRunAt)}</span>
          )}
          {lastRunStatus === 'skipped' && <>Skipped {fmtRelative(lastRunAt)}</>}
          {!lastRunStatus && <>Has not run yet</>}
        </div>
        {canToggle && (
          <button
            type="button"
            onClick={handleToggle}
            disabled={pending}
            className={cn(
              'rounded-[var(--radius)] border px-2.5 py-1 text-[11.5px] transition-colors',
              isEnabled
                ? 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-sunken)]'
                : 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white hover:opacity-90',
              pending && 'opacity-50',
            )}
          >
            {pending ? '...' : isEnabled ? 'Pause' : 'Enable'}
          </button>
        )}
      </div>
    </div>
  )
}
