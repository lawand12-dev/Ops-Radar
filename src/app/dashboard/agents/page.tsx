'use client'

import { useCallback, useEffect, useState } from 'react'
import { AgentCard, type AgentState } from './_components/agent-card'

type AgentRow = {
  slug: string
  displayName: string
  description: string
  model: string
  requiredTier: 'starter' | 'growth' | 'pro'
  requiredIntegrations: string[]
  optionalIntegrations: string[]
  cronSchedule: string
  state: AgentState
  missingIntegrations: string[]
  isEnabled: boolean
  lastRunAt: string | null
  lastRunStatus: 'success' | 'failed' | 'skipped' | null
  lastRunSummary: string | null
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [plan, setPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/agents', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to load')
        return
      }
      setAgents(data.agents ?? [])
      setPlan(data.plan ?? null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleToggle = useCallback(
    async (slug: string, next: boolean) => {
      const res = await fetch(`/api/dashboard/agents/${slug}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: next }),
      })
      if (res.ok) {
        await load()
      }
    },
    [load],
  )

  const counts = agents.reduce<Record<AgentState, number>>(
    (acc, a) => {
      acc[a.state] = (acc[a.state] ?? 0) + 1
      return acc
    },
    { active: 0, paused: 0, ready: 0, locked: 0 },
  )

  return (
    <>
      <div className="mb-7">
        <h1 className="mb-1.5 font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          AI Ops Team
        </h1>
        <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
          Ten specialist agents running on their own schedules — each pulls live data, writes findings to your Notion Brain, and queues actions for your approval.
        </p>
      </div>

      {!loading && agents.length > 0 && (
        <div className="mb-5 flex items-center gap-4 text-[12px] text-[var(--color-fg-muted)]">
          <span>
            <strong className="text-[var(--color-fg)]">{counts.active}</strong> active
          </span>
          <span>
            <strong className="text-[var(--color-fg)]">{counts.ready}</strong> ready to connect
          </span>
          <span>
            <strong className="text-[var(--color-fg)]">{counts.locked}</strong> on upgrade
          </span>
          {plan && (
            <span className="ml-auto rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] px-2 py-[3px] text-[11px] text-[var(--color-fg-subtle)]">
              Your plan: {plan}
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-3 py-2.5 text-[12.5px] text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-[12.5px] text-[var(--color-fg-subtle)]">Loading agents…</div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {agents.map((a) => (
          <AgentCard
            key={a.slug}
            slug={a.slug}
            displayName={a.displayName}
            description={a.description}
            model={a.model}
            requiredTier={a.requiredTier}
            state={a.state}
            missingIntegrations={a.missingIntegrations}
            isEnabled={a.isEnabled}
            cronSchedule={a.cronSchedule}
            lastRunAt={a.lastRunAt}
            lastRunStatus={a.lastRunStatus}
            lastRunSummary={a.lastRunSummary}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </>
  )
}
