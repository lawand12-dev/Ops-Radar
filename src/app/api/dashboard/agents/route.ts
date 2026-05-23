import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { getUserPlan, type Plan } from '<npm>/lib/tier'
import { AGENTS, AGENT_SLUGS } from '<npm>/lib/agents/registry'
import { PLAN_AGENTS } from '<npm>/lib/agents/tier-gate'
import type { AgentSlug } from '<npm>/lib/agents/types'
import { COMPOSIO_TOOLS, type ToolSlug } from '<npm>/lib/composio'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AgentState = 'active' | 'paused' | 'ready' | 'locked'

type AgentRow = {
  slug: AgentSlug
  displayName: string
  description: string
  model: string
  requiredTier: 'starter' | 'growth' | 'pro'
  requiredIntegrations: ToolSlug[]
  optionalIntegrations: ToolSlug[]
  cronSchedule: string
  state: AgentState
  missingIntegrations: ToolSlug[]
  isEnabled: boolean
  lastRunAt: string | null
  lastRunStatus: 'success' | 'failed' | 'skipped' | null
  lastRunSummary: string | null
}

function computeState(opts: {
  plan: Plan
  slug: AgentSlug
  missingIntegrations: ToolSlug[]
  isEnabled: boolean
}): AgentState {
  if (!PLAN_AGENTS[opts.plan].includes(opts.slug)) return 'locked'
  if (opts.missingIntegrations.length > 0) return 'ready'
  return opts.isEnabled ? 'active' : 'paused'
}

export async function GET(_req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Read the user's plan from session (RLS-scoped) — same pattern as the rest
  // of the dashboard. The cron path uses service-role; here we don't need it.
  const session = await getSessionSupabaseClient()
  const { data: userData } = await session.auth.getUser()
  const plan = getUserPlan(userData?.user?.user_metadata ?? {})

  const supabase = getServerSupabaseClient()

  // Read connected tools (composio_connections + legacy integrations)
  const [{ data: composioConns }, { data: legacyConns }, { data: configRows }, { data: runRows }] =
    await Promise.all([
      supabase
        .from('composio_connections')
        .select('tool_slug')
        .eq('user_id', userId)
        .eq('is_active', true),
      supabase
        .from('integrations')
        .select('tool, status')
        .eq('client_id', userId),
      supabase
        .from('agent_config')
        .select('agent_slug, is_enabled')
        .eq('user_id', userId),
      // Latest run per agent — use a subquery via rpc would be cleaner but a
      // simple "fetch last 50 then dedupe in code" is fine for 10 agents.
      supabase
        .from('agent_runs')
        .select('agent_slug, started_at, ended_at, status, summary')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(50),
    ])

  const connectedToolSlugs = new Set<string>()
  for (const row of composioConns ?? []) connectedToolSlugs.add(row.tool_slug)
  for (const row of legacyConns ?? []) {
    if (row.status === 'connected') connectedToolSlugs.add(row.tool)
  }

  const enabledMap = new Map<string, boolean>()
  for (const row of configRows ?? []) enabledMap.set(row.agent_slug, row.is_enabled)

  const lastRunMap = new Map<string, NonNullable<typeof runRows>[number]>()
  for (const row of runRows ?? []) {
    if (!lastRunMap.has(row.agent_slug)) lastRunMap.set(row.agent_slug, row)
  }

  const agents: AgentRow[] = AGENT_SLUGS.map((slug) => {
    const spec = AGENTS[slug]
    const required = spec.requiredIntegrations
    const optional = spec.composioApps.filter((t) => !required.includes(t))
    const missing = required.filter((t) => !connectedToolSlugs.has(t))
    const isEnabled = enabledMap.get(slug) ?? true
    const state = computeState({ plan, slug, missingIntegrations: missing, isEnabled })
    const lastRun = lastRunMap.get(slug)

    return {
      slug,
      displayName: spec.displayName,
      description: spec.description,
      model: spec.model,
      requiredTier: spec.requiredTier,
      requiredIntegrations: required,
      optionalIntegrations: optional,
      cronSchedule: spec.cronSchedule,
      state,
      missingIntegrations: missing,
      isEnabled,
      lastRunAt: lastRun?.started_at ?? null,
      lastRunStatus: (lastRun?.status as AgentRow['lastRunStatus']) ?? null,
      lastRunSummary: lastRun?.summary ?? null,
    }
  })

  return NextResponse.json({ plan, agents })
}
