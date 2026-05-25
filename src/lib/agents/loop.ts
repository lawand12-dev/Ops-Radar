/**
 * Shared agent runner. Every agent flows through this single loop.
 *
 * Flow:
 *   1. Tier gate (skip with reason='tier' if not allowed)
 *   2. Integration gate (skip with reason='missing-integration:X' if any required tool not connected)
 *   3. Insert a 'running' row in agent_runs
 *   4. Load Composio tools for this user across the agent's required toolkits
 *   5. Multi-step `generateText` loop with stepCountIs(spec.maxSteps)
 *   6. Update agent_runs row with status, summary, counters
 *
 * Proven pattern: scripts/smoke-revenue-agent.ts demonstrated this end-to-end.
 */

import { generateText, stepCountIs } from 'ai'
import { makeTelemetry, flushLangfuse } from '<npm>/lib/observability/langfuse'
import { openai } from '@ai-sdk/openai'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import {
  COMPOSIO_TOOLS,
  getComposioToolsForUser,
  type ToolSlug,
} from '<npm>/lib/composio'
import { readHowWeWork } from '<npm>/lib/notion/read-how-we-work'
import { readDecisionLog } from '<npm>/lib/notion/read-decision-log'
import { getApprovalPatterns } from '<npm>/lib/actions/approval-patterns'
import { wrapToolsWithApprovalGate } from './approval-gate'
import { loadSkillCatalog, buildSkillsSystemBlock, loadSkillBody } from '<npm>/lib/skills'
import {
  loadAutomationCatalog,
  buildAutomationsSystemBlock,
} from '<npm>/lib/automations/registry'
import { checkQuota, recordUsage } from '<npm>/lib/usage/track'
import { queryEvents, aggregateByMonth } from '<npm>/lib/warehouse/query'
import type { EventSource } from '<npm>/lib/warehouse/types'
import {
  commitBrainChanges,
  listBrainPaths,
  loadBrainDocuments,
} from '<npm>/lib/brain/store'
import { BRAIN_DIRECTORIES } from '<npm>/lib/brain/paths'
import { buildAgentBrainHintsBlock } from '<npm>/lib/brain/agent-hints'
import type { BrainAuthorType } from '<npm>/lib/brain/types'
import { tool as aiTool } from 'ai'
import { z } from 'zod'
import type { AgentRunResult, AgentSpec, AgentSlug } from './types'
import { getUserTier, tierAllows } from './tier-gate'
import { orgChartDelegationEnabled } from '<npm>/lib/flags'
import { loadEmployeeWithReports } from '<npm>/lib/employees/hierarchy'

const VALID_SLUGS = new Set(Object.keys(COMPOSIO_TOOLS) as ToolSlug[])
const isToolSlug = (v: string): v is ToolSlug => VALID_SLUGS.has(v as ToolSlug)

export async function runAgent(spec: AgentSpec, userId: string): Promise<AgentRunResult> {
  // 1. Tier gate. Built-in agents are tier-gated via PLAN_AGENTS;
  // custom employees (slug starts with `custom:`) are gated by the
  // customer having connected the tool + having an active row — they
  // bypass the built-in tier matrix entirely.
  const isCustom = spec.slug.startsWith('custom:')
  if (!isCustom) {
    const tier = await getUserTier(userId)
    if (!tier || !tierAllows(tier, spec.slug as AgentSlug)) {
      return logSkip(userId, spec.slug, 'tier')
    }
  }

  // 2. Integrations gate
  const connected = await getConnectedTools(userId)
  const missing = spec.requiredIntegrations.filter((t) => !connected.has(t))
  if (missing.length > 0) {
    return logSkip(userId, spec.slug, `missing-integration:${missing.join(',')}`)
  }

  // 2b. Quota gate — OpenAI is the dominant cost. Block if this customer
  // has already hit their monthly token cap for their tier.
  const quota = await checkQuota({ userId, provider: 'openai' })
  if (!quota.allowed) {
    return logSkip(
      userId,
      spec.slug,
      `quota-exceeded:openai (${quota.used}/${quota.cap})`,
    )
  }

  // 3. Start run
  const runId = await startAgentRun(userId, spec.slug)
  if (!runId) {
    return { status: 'failed', errorMessage: 'Could not insert agent_runs row' }
  }

  try {
    // 4. Load Composio tools. Filter to ones the user has actually connected to
    // avoid noisy "this tool isn't connected" errors from optional toolkits.
    const wantedToolkits = spec.composioApps.filter((t): t is ToolSlug =>
      isToolSlug(t) && connected.has(t as ToolSlug),
    )
    const rawTools = wantedToolkits.length > 0
      ? await getComposioToolsForUser(userId, wantedToolkits.map((t) => COMPOSIO_TOOLS[t]))
      : ({} as Awaited<ReturnType<typeof getComposioToolsForUser>>)

    // Approval gate: write actions queue to /dashboard/actions for customer
    // approval; reads + Notion writes pass through. Per-tool autonomy
    // policies ('ask'|'auto'|'off') are resolved inside the gate.
    const gatedTools = await wrapToolsWithApprovalGate(rawTools, {
      userId,
      source: 'cron-agent',
      agentSlug: spec.slug,
    })

    // Anthropic Agent Skills — progressive disclosure tier 2.
    // Add a single `load_skill` tool that returns the full SKILL.md body for
    // a skill named in the catalog (the catalog is injected into the system
    // prompt below at tier 1).
    const tools = {
      ...gatedTools,
      load_skill: aiTool({
        description:
          'Load the full SKILL.md body for a named skill (Anthropic Agent Skills pattern). The catalog of available skills is in your system prompt. Call this only when a skill clearly applies to your current task.',
        inputSchema: z.object({
          name: z.string().describe('The skill name (kebab-case) from the catalog.'),
        }),
        execute: async (args: { name: string }) => {
          try {
            return { success: true, name: args.name, body: await loadSkillBody(args.name) }
          } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'load failed' }
          }
        },
      }),
      // CP-28 — write structured markdown to the OpsRadar-hosted brain
      // (the "git-like" Postgres store). Every key finding the agent
      // produces should also be written here as a markdown document.
      // The brain becomes the customer's portable, exportable knowledge
      // base — synced to their Notion workspace for the UI.
      write_brain_document: aiTool({
        description:
          "Write a markdown document to the customer's brain (their portable, exportable knowledge base). Use this to log Pattern Cards, Risk Register entries, KPI Snapshots, Decision Log entries, client updates, etc. Path conventions:\n" +
          BRAIN_DIRECTORIES.map((d) => `  ${d}/<slug>.md`).join('\n') +
          "\nEvery time you'd write to Notion, ALSO call this with the same content rendered as markdown. The brain is the source of truth; Notion is a mirror.",
        inputSchema: z.object({
          path: z
            .string()
            .min(3)
            .describe(
              "Brain-relative path, e.g. 'pattern-cards/chronic-late-payers.md' or 'risk-register/q3-cash-runway.md'. Use kebab-case slugs. Use only the allowed top-level directories.",
            ),
          content: z
            .string()
            .min(20)
            .describe(
              'The full markdown content of the document. Should start with a # heading. Include all the structured data + narrative needed.',
            ),
          commit_message: z
            .string()
            .optional()
            .describe('Optional one-line description of what this change captures.'),
        }),
        execute: async (args) => {
          try {
            const result = await commitBrainChanges({
              userId,
              authorType: `agent:${spec.slug}` as BrainAuthorType,
              message: args.commit_message ?? `${spec.slug} updated ${args.path}`,
              changes: [{ path: args.path, content: args.content }],
            })
            return {
              success: true,
              commit_id: result.commitId,
              created: result.documentsCreated,
              updated: result.documentsUpdated,
            }
          } catch (err) {
            return {
              success: false,
              error: err instanceof Error ? err.message : 'commit failed',
            }
          }
        },
      }),
      // CP-28 — light read of the brain's directory (to know what already exists
      // before deciding to update vs create).
      list_brain_paths: aiTool({
        description:
          "List the paths of markdown documents in the customer's brain. Useful before deciding whether to update an existing document or create a new one. Optional prefix filter, e.g. prefix='clients/' to list all client docs.",
        inputSchema: z.object({
          prefix: z.string().optional(),
        }),
        execute: async ({ prefix }) => {
          try {
            const paths = await listBrainPaths({ userId, prefix })
            return { success: true, count: paths.length, paths }
          } catch (err) {
            return {
              success: false,
              error: err instanceof Error ? err.message : 'list failed',
            }
          }
        },
      }),
      // CP-25 — query the deep history warehouse for trend / drill-down questions.
      query_historical: aiTool({
        description:
          "Query the customer's full raw history across connected tools (Stripe transactions, HubSpot deals, Harvest hours, etc.) for trend questions or period drill-downs that the Notion brain can't answer at row granularity. Set aggregate=true for monthly buckets (preferred for trends), aggregate=false for raw rows (max 200).",
        inputSchema: z.object({
          source: z.string().describe(
            "Source slug: 'stripe', 'hubspot', 'harvest', 'clickup', etc.",
          ),
          event_type: z.string().optional(),
          client_external_id: z.string().optional(),
          occurred_after: z.string().optional().describe('ISO timestamp'),
          occurred_before: z.string().optional().describe('ISO timestamp'),
          aggregate: z.boolean().default(false),
        }),
        execute: async (args) => {
          if (args.aggregate) {
            const rows = await aggregateByMonth({
              userId,
              source: args.source as EventSource,
              eventType: args.event_type,
              clientExternalId: args.client_external_id,
              occurredAfter: args.occurred_after,
              occurredBefore: args.occurred_before,
            })
            return { success: true, mode: 'aggregate', rows }
          }
          const events = await queryEvents({
            userId,
            source: args.source as EventSource,
            eventType: args.event_type,
            clientExternalId: args.client_external_id,
            occurredAfter: args.occurred_after,
            occurredBefore: args.occurred_before,
            limit: 200,
          })
          return { success: true, mode: 'list', events }
        },
      }),
      // CP-34 — Option C escalation. Any employee mid-task can ask the COO
      // a cross-cutting question. The COO reads the full brain and answers
      // with cross-employee context. See docs/strategy/ai-employees-architecture-2026.md §3.2.
      consult_coo: aiTool({
        description:
          'Escalate a question to the AI Chief of Staff (the supervisor). Use this when you need cross-employee context you do not have access to — e.g. "How did Marcus classify the BigCo deal?" or "Is this customer on retainer or project terms?". Returns a direct answer plus optionally a reusable rule to remember.',
        inputSchema: z.object({
          question: z.string().min(5).describe('Your specific question. Be concrete.'),
          context: z
            .string()
            .optional()
            .describe(
              'Optional. Brief context the COO needs (the data you have in front of you right now).',
            ),
        }),
        execute: async (args) => {
          const { consultCoo } = await import('<npm>/lib/employees/consult-coo')
          return consultCoo({
            userId,
            callerSlug: spec.slug,
            question: args.question,
            context: args.context,
          })
        },
      }),
    }

    // CP-37 — `delegate_to_employee`. Only added for custom employees (slug
    // prefix 'custom:') with at least one direct report, AND only when the
    // org-chart-delegation flag is on. Uses Trigger.dev's `tasks.triggerAndWait`
    // to pause the manager's run, dispatch the report, then resume with the
    // report's output as the tool result.
    //
    // Why custom-only: built-in agents (slug NOT prefixed 'custom:') run on
    // Vercel Cron, not Trigger.dev. Their runs can't be paused. Delegation
    // only works from the Trigger.dev-hosted custom employee path.
    if (spec.slug.startsWith('custom:')) {
      const delegationOn = await orgChartDelegationEnabled()
      if (delegationOn) {
        const managerSlug = spec.slug.slice('custom:'.length)
        const { reports } = await loadEmployeeWithReports(userId, managerSlug)
        if (reports.length > 0) {
          const reportSlugList = reports
            .map((r) => `${r.slug} (${r.display.name} · ${r.display.role})`)
            .join(', ')
          ;(tools as Record<string, unknown>)['delegate_to_employee'] = aiTool({
            description:
              `Delegate a discrete task to ONE of your direct reports. You PAUSE while they run (up to 30 min) and resume with their summary. Use when YOUR responsibility is to coordinate multiple specialists rather than do the work directly. Your reports: ${reportSlugList}.`,
            inputSchema: z.object({
              report_slug: z
                .string()
                .describe('Slug of one of YOUR direct reports.'),
              task_description: z
                .string()
                .min(10)
                .describe('Plain-English task for the report to do.'),
            }),
            execute: async (args: { report_slug: string; task_description: string }) => {
              try {
                const report = reports.find((r) => r.slug === args.report_slug)
                if (!report || !report.customEmployeeId) {
                  return {
                    success: false as const,
                    error: `"${args.report_slug}" is not one of your direct reports. Your reports are: ${reports.map((r) => r.slug).join(', ')}.`,
                  }
                }
                // Lazy-import the Trigger.dev SDK + the task ref so the loop
                // module stays usable outside a Trigger.dev runtime (e.g. from
                // local scripts that import runAgent directly).
                const { tasks } = await import('@trigger.dev/sdk/v3')
                const { runCustomEmployee } = await import(
                  '<npm>/trigger/run-custom-employee'
                )
                // Bound the wait via the report task's own `maxDuration`
                // (600s on `runCustomEmployee`) — Trigger.dev kills the
                // run when it hits that limit, which causes triggerAndWait
                // to resolve with `ok: false`. The manager handles that
                // case below.
                const result = await tasks.triggerAndWait<typeof runCustomEmployee>(
                  'run-custom-employee',
                  {
                    employeeId: report.customEmployeeId,
                    userId,
                    delegatedFrom: managerSlug,
                    taskDescription: args.task_description,
                  },
                )
                if (!result.ok) {
                  // `result.error` is `unknown` — extract a string message
                  // properly (raw `?? 'unknown'` would coerce Error objects
                  // to "[object Object]" and leak garbage into the model).
                  const errMsg =
                    result.error instanceof Error
                      ? result.error.message
                      : typeof result.error === 'string'
                      ? result.error
                      : 'unknown error'
                  console.error('[delegate_to_employee] report failed', {
                    managerSlug,
                    reportSlug: report.slug,
                    error: errMsg,
                  })
                  return {
                    success: false as const,
                    error: `Report run failed: ${errMsg}`,
                  }
                }
                // result.output is the task's return value (typed via the import).
                const output = result.output as {
                  summary?: string
                  status?: string
                  reason?: string
                  actions_taken?: number
                  notion_writes?: number
                }
                return {
                  success: true as const,
                  report_slug: report.slug,
                  status: output?.status ?? 'success',
                  reason: output?.reason,
                  summary: output?.summary ?? '(no summary returned)',
                  actions_taken: output?.actions_taken ?? 0,
                  notion_writes: output?.notion_writes ?? 0,
                }
              } catch (err) {
                console.error('[delegate_to_employee] threw', {
                  managerSlug,
                  reportSlug: args.report_slug,
                  err,
                })
                return {
                  success: false as const,
                  error: err instanceof Error ? err.message : 'delegation failed',
                }
              }
            },
          })
        }
      }
    }

    // 5. Personalize the system prompt with three best-effort enrichments —
    // any of these returning null leaves the agent on its base behaviour:
    //   (a) "How We Work" — customer-authored rules from Notion
    //   (b) "Decision Log" — recent strategic decisions, so we don't
    //       re-suggest things they've already decided against
    //   (c) Approval patterns — aggregated approve / reject / edit feedback
    //       for this specific agent, so the model adjusts its style
    const [
      howWeWork,
      decisions,
      patterns,
      skillCatalog,
      automationCatalog,
      learnedRules,
    ] = await Promise.all([
      readHowWeWork(userId),
      readDecisionLog(userId),
      getApprovalPatterns(userId, spec.slug, 60),
      loadSkillCatalog(),
      loadAutomationCatalog(userId),
      // CP-35 — every employee reads its own learned rules (from rejections)
      // on every run. The path prefix uses spec.slug verbatim, so custom
      // employees (`custom:sarah`) and built-ins (`revenue`) both land in
      // distinct namespaces under `employees/<slug>/learned-rules/`.
      loadBrainDocuments({
        userId,
        prefixes: [`employees/${spec.slug}/learned-rules/`],
        limit: 50,
      }),
    ])

    const enrichments: string[] = []
    if (howWeWork) {
      enrichments.push(
        `# How this customer works (defer to these rules — they teach you their style)\n${howWeWork}`,
      )
    }
    if (decisions) {
      enrichments.push(
        `# Recent strategic decisions (don't re-suggest things already decided)\n${decisions}`,
      )
    }
    if (patterns) {
      enrichments.push(
        `# Your approval patterns with this customer (adjust your style accordingly)\n${patterns}`,
      )
    }
    // Anthropic Agent Skills — boot tier. The catalog is the same for every
    // agent; the model picks which (if any) to load_skill mid-run.
    const skillsBlock = buildSkillsSystemBlock(skillCatalog)
    if (skillsBlock) enrichments.push(skillsBlock)

    // Customer-built automations — boot tier. Same shape as skills, but
    // sourced from customer_automations rows so the agent knows what's
    // already running and doesn't propose duplicates (CP-20).
    const automationsBlock = buildAutomationsSystemBlock(automationCatalog)
    if (automationsBlock) enrichments.push(automationsBlock)

    // CP-35 — Apprentice Mode. Every employee reads its own learned rules
    // (derived from past customer rejections + edits) at the top of every
    // run. These are higher-priority than skills because they were authored
    // BY the customer's behaviour — they reflect what THIS specific customer
    // wants, not industry norms.
    if (learnedRules.length > 0) {
      enrichments.push(
        [
          '# Your learned rules (apply these — they come from past customer corrections)',
          '',
          learnedRules.map((r) => r.content).join('\n---\n'),
        ].join('\n'),
      )
    }

    // CP-29 — write to the brain as the PRIMARY structured-output target.
    // The brain (brain_documents in Postgres, git-like versioned) is the
    // source of truth. A daily sync engine renders the brain into the
    // customer's Notion workspace (under "OpsRadar Brain (synced)") so
    // the UI mirror stays current — you do NOT need to write to Notion
    // databases directly for narrative content (Pattern Cards, Risk
    // Register, KPI Snapshots, Decision Log entries, Quarterly Memory,
    // etc.). The sync handles it.
    enrichments.push(
      [
        '# Write to the brain — it is the source of truth',
        '',
        'For every structured narrative output you produce — Pattern Card, Risk Register entry, KPI Snapshot, Decision Log entry, client update, project status, etc. — call the `write_brain_document` tool with the content rendered as markdown.',
        '',
        'The brain (Postgres-backed, version-controlled, exportable as a markdown zip) is the customer-owned source of truth. A daily sync engine renders the brain into their Notion workspace under "OpsRadar Brain (synced)" so they have a clickable UI mirror — you do NOT need to also push these narrative outputs into Notion databases manually.',
        '',
        'Path conventions (use kebab-case slugs):',
        ...BRAIN_DIRECTORIES.map((d) => `  - ${d}/<slug>.md`),
        '',
        'Call `list_brain_paths` first if you need to know what already exists before deciding to update vs create.',
        '',
        'You MAY still use Composio Notion actions for cases where the customer expects direct DB row updates (e.g. flipping a status field on a Clients DB row they actively view) — but treat those as UI affordances, not as the source of truth. The brain is.',
      ].join('\n'),
    )

    // CP-30 — agent-specific brain path conventions. Tells THIS agent
    // exactly which paths it should typically write to (e.g. revenue
    // writes kpi-snapshots/<YYYY-Www>.md, scope writes
    // risk-register/<client-slug>-scope-creep.md). Reduces creative
    // path naming → consistent brain structure → cleaner Notion mirror.
    const agentHintsBlock = buildAgentBrainHintsBlock(spec.slug)
    if (agentHintsBlock) enrichments.push(agentHintsBlock)

    const systemPrompt =
      enrichments.length > 0
        ? `${spec.systemPrompt}\n\n${enrichments.join('\n\n')}`
        : spec.systemPrompt

    // 6. Run the multi-step loop with Langfuse tracing.
    // Trace identity: one trace per agent run, scoped to this customer.
    const result = await generateText({
      model: openai(spec.model),
      system: systemPrompt,
      prompt: `Run your analysis. Today is ${new Date().toISOString().slice(0, 10)}.`,
      tools,
      stopWhen: stepCountIs(spec.maxSteps),
      experimental_telemetry: makeTelemetry({
        userId,
        agentSlug: spec.slug,
        agentRunId: runId,
        source: 'cron-agent',
      }),
    })

    // 7. Mark connections used so we can show "last used" in the integrations UI
    if (wantedToolkits.length > 0) {
      await markConnectionsUsed(userId, wantedToolkits)
    }

    const tokensUsed = (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0)
    // Record OpenAI usage for cost attribution + quota enforcement.
    await recordUsage({
      userId,
      provider: 'openai',
      operation: 'agent_cron_run',
      tokens: tokensUsed,
      metadata: { agent_slug: spec.slug, model: spec.model, max_steps: spec.maxSteps },
    })

    const completed = await completeAgentRun(runId, {
      status: 'success',
      summary: result.text,
      tokensUsed,
    })
    // Flush Langfuse before the Vercel function freezes so traces ship out.
    await flushLangfuse()
    return completed
  } catch (err) {
    const failed = await failAgentRun(runId, err)
    await flushLangfuse()
    return failed
  }
}

// ---------- Helpers ----------

async function getConnectedTools(userId: string): Promise<Set<ToolSlug>> {
  const supabase = getServerSupabaseClient()
  const { data, error } = await supabase
    .from('composio_connections')
    .select('tool_slug')
    .eq('user_id', userId)
    .eq('is_active', true)
  if (error) {
    console.error('[agent-loop] getConnectedTools failed:', error)
    return new Set()
  }
  const out = new Set<ToolSlug>()
  for (const row of data ?? []) {
    if (isToolSlug(row.tool_slug)) out.add(row.tool_slug)
  }
  return out
}

async function markConnectionsUsed(userId: string, toolkits: ToolSlug[]): Promise<void> {
  const supabase = getServerSupabaseClient()
  await supabase
    .from('composio_connections')
    .update({ last_used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('tool_slug', toolkits)
}

async function startAgentRun(userId: string, slug: string): Promise<string | null> {
  const supabase = getServerSupabaseClient()
  const { data, error } = await supabase
    .from('agent_runs')
    .insert({ user_id: userId, agent_slug: slug, status: 'running' })
    .select('id')
    .single()
  if (error) {
    console.error('[agent-loop] startAgentRun failed:', error)
    return null
  }
  return data.id
}

async function completeAgentRun(
  runId: string,
  partial: Pick<AgentRunResult, 'status' | 'summary' | 'tokensUsed'> &
    Partial<AgentRunResult>,
): Promise<AgentRunResult> {
  const supabase = getServerSupabaseClient()
  await supabase
    .from('agent_runs')
    .update({
      ended_at: new Date().toISOString(),
      status: partial.status,
      summary: partial.summary,
      tokens_used: partial.tokensUsed,
      actions_taken: partial.actionsTaken ?? 0,
      patterns_detected: partial.patternsDetected ?? 0,
      risks_flagged: partial.risksFlagged ?? 0,
      notion_writes: partial.notionWrites ?? 0,
    })
    .eq('id', runId)
  return partial as AgentRunResult
}

async function failAgentRun(runId: string, err: unknown): Promise<AgentRunResult> {
  const message = err instanceof Error ? err.message : String(err)
  console.error('[agent-loop] run failed:', message)
  const supabase = getServerSupabaseClient()
  await supabase
    .from('agent_runs')
    .update({
      ended_at: new Date().toISOString(),
      status: 'failed',
      error_message: message,
    })
    .eq('id', runId)
  return { status: 'failed', errorMessage: message }
}

async function logSkip(
  userId: string,
  slug: string,
  reason: string,
): Promise<AgentRunResult> {
  const supabase = getServerSupabaseClient()
  await supabase.from('agent_runs').insert({
    user_id: userId,
    agent_slug: slug,
    status: 'skipped',
    summary: reason,
    ended_at: new Date().toISOString(),
  })
  return { status: 'skipped', reason }
}
