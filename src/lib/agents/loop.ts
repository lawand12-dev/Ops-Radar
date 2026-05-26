/**
 * Agent loop — drives one execution of an employee (built-in or custom).
 *
 * Architecture (Vercel AI SDK v6 production pattern):
 *
 *   1. Bind userId by closure into per-toolkit factories. The model never
 *      sees the userId — only per-call inputs.
 *   2. Build the tool object from the employee's `requiredIntegrations`
 *      via src/lib/nango/registry.ts.
 *   3. Inject the advanced-tools catalog AND the relevant brain context
 *      into the system prompt at run start.
 *   4. `load_tool` meta-tool lets the model request an advanced tool;
 *      prepareStep merges its schema into the toolset for the next step.
 *   5. Each tool call is classified via the per-toolkit Ask/Auto/Off
 *      policy. Auto fires; approval enqueues with a confidence score;
 *      Off refuses outright.
 *   6. Run history is logged at start + end via agent_runs.
 *   7. On success, commit a markdown summary to the brain for cross-run
 *      memory.
 */

import { openai } from '@ai-sdk/openai'
import { generateText, streamText, stepCountIs, type ToolSet } from 'ai'

import type { AgentSpec, AgentRunResult } from './types'
import {
  buildToolsForEmployee,
  buildAdvancedToolsCatalog,
  TOOLKITS,
} from '<npm>/lib/nango/registry'
import {
  buildLoadToolMeta,
  createLoadedToolsTracker,
  resolveLoadedTools,
} from '<npm>/lib/nango/load-tool'
import {
  startRun,
  finishRun,
  loadBrainContext,
  classifyToolCall,
  enqueueAction,
  writeBrainSummary,
} from './hooks'
import { loadToolPolicies, type ToolPolicyMap } from './tool-policies'
import { loadSkillCatalog, buildSkillsSystemBlock } from '<npm>/lib/skills'
import { buildLoadSkillMeta } from './load-skill'
import { makeTelemetry, flushLangfuse } from '<npm>/lib/observability/langfuse'
import { agentLoopEnabled, gmailToolkitEnabled } from '<npm>/lib/flags'

export type RunAgentOptions = {
  /** Fallback when no per-toolkit row exists in tool_policies. */
  globalDefault?: 'ask' | 'auto' | 'off'
  /** Brain prefixes scoped to this employee. Defaults to global signals. */
  scopedBrainPrefixes?: ReadonlyArray<string>
}

// ─── Non-streaming variant ─────────────────────────────────────────────────

export async function runAgent(
  spec: AgentSpec,
  userId: string,
  options: RunAgentOptions = {},
): Promise<AgentRunResult> {
  if (!(await agentLoopEnabled())) {
    console.warn(`[runAgent] ${spec.slug} skipped — agent-loop-enabled flag is OFF`)
    return { status: 'skipped', reason: 'agent-loop-disabled-by-flag' }
  }
  const ctx = await prepareRunContext(spec, userId, options)
  const startedAt = Date.now()
  const telemetry = makeTelemetry({
    userId,
    agentSlug: spec.slug,
    agentRunId: ctx.runId ?? undefined,
    source: 'cron-agent',
  })

  try {
    const result = await generateText({
      model: openai(spec.model || 'gpt-5.5'),
      system: ctx.systemPrompt,
      prompt: defaultRunPrompt(),
      tools: ctx.tools,
      stopWhen: stepCountIs(spec.maxSteps ?? 12),
      prepareStep: ctx.prepareStep,
      experimental_telemetry: telemetry,
    })

    const elapsedMs = Date.now() - startedAt
    const actionsTaken = result.steps.reduce(
      (n, step) => n + (step.toolCalls?.length ?? 0),
      0,
    )

    const { queued, blocked } = countGateOutcomes(result.steps)

    console.info(
      `[runAgent] ${spec.slug} ok — ${actionsTaken} calls (${queued} queued, ${blocked} blocked), ${result.usage?.totalTokens ?? 0} tokens, ${elapsedMs}ms`,
    )

    const summary = result.text || `(no narrative — ${actionsTaken} tool calls)`

    await finishRun({
      runId: ctx.runId,
      status: 'success',
      summary,
      actionsTaken,
      tokensUsed: result.usage?.totalTokens ?? 0,
    })

    await writeBrainSummary({
      userId,
      agentSlug: spec.slug,
      runId: ctx.runId,
      summary,
      actionsTaken,
    })

    await flushLangfuse()

    return {
      status: 'success',
      summary,
      actionsTaken,
      tokensUsed: result.usage?.totalTokens ?? 0,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[runAgent] ${spec.slug} failed:`, message)
    await finishRun({ runId: ctx.runId, status: 'failed', errorMessage: message })
    await flushLangfuse()
    return { status: 'failed', errorMessage: message }
  }
}

// ─── Streaming variant (SSE-friendly, used by employee chat + "Run now") ──

/**
 * Streaming version of runAgent. Returns the streamText result directly so
 * the caller can pipe it to a NextResponse via toUIMessageStreamResponse()
 * or iterate its async iterables.
 *
 * Run history + brain writes happen on the `onFinish` callback so the loop's
 * lifecycle hooks fire even when consumed as a stream.
 */
export async function runAgentStream(
  spec: AgentSpec,
  userId: string,
  options: RunAgentOptions = {},
): Promise<ReturnType<typeof streamText>> {
  if (!(await agentLoopEnabled())) {
    throw new Error('Agent loop is disabled by the agent-loop-enabled flag. Re-enable in Statsig to resume.')
  }
  const ctx = await prepareRunContext(spec, userId, options)
  const telemetry = makeTelemetry({
    userId,
    agentSlug: spec.slug,
    agentRunId: ctx.runId ?? undefined,
    source: 'employee-chat',
  })

  return streamText({
    model: openai(spec.model || 'gpt-5.5'),
    system: ctx.systemPrompt,
    prompt: defaultRunPrompt(),
    tools: ctx.tools,
    stopWhen: stepCountIs(spec.maxSteps ?? 12),
    prepareStep: ctx.prepareStep,
    experimental_telemetry: telemetry,
    onFinish: async ({ text, steps, usage }) => {
      const actionsTaken = steps.reduce(
        (n, step) => n + (step.toolCalls?.length ?? 0),
        0,
      )
      const summary = text || `(no narrative — ${actionsTaken} tool calls)`
      await finishRun({
        runId: ctx.runId,
        status: 'success',
        summary,
        actionsTaken,
        tokensUsed: usage?.totalTokens ?? 0,
      })
      await writeBrainSummary({
        userId,
        agentSlug: spec.slug,
        runId: ctx.runId,
        summary,
        actionsTaken,
      })
      await flushLangfuse()
    },
  })
}

// ─── Shared run setup ──────────────────────────────────────────────────────

async function prepareRunContext(
  spec: AgentSpec,
  userId: string,
  options: RunAgentOptions,
) {
  const globalDefault = options.globalDefault ?? 'ask'
  let toolkitSlugs = spec.composioApps ?? spec.requiredIntegrations ?? []

  // Per-toolkit kill switches (Statsig flags). Today: Gmail.
  // Pattern: as new integrations land, add their gate here so a single flip
  // in Statsig can pause a toolkit globally without a deploy.
  if (toolkitSlugs.includes('gmail') && !(await gmailToolkitEnabled())) {
    console.warn(`[runAgent] ${spec.slug} — gmail toolkit disabled by flag, stripped from toolset`)
    toolkitSlugs = toolkitSlugs.filter((s) => s !== 'gmail')
  }

  // Tier 1: log run start
  const runId = await startRun({ userId, agentSlug: spec.slug })

  // Tier 2: load brain context to seed the prompt
  const brainContext = await loadBrainContext({
    userId,
    scopedPrefixes: options.scopedBrainPrefixes,
  })

  // Load per-toolkit policy map (cached for the duration of this run)
  const policies = await loadToolPolicies(userId)

  // load_tool meta-tool + tracker for on-demand schema expansion
  const tracker = createLoadedToolsTracker()
  const loadToolMeta = buildLoadToolMeta({ userId, toolkitSlugs, tracker })

  // Core tools (closure-bound to userId) wrapped with approval gate
  const coreTools = buildToolsForEmployee(toolkitSlugs, userId)
  const gatedCore = wrapToolsWithGate({
    rawTools: coreTools,
    userId,
    agentSlug: spec.slug,
    policies,
    globalDefault,
  })

  // Advanced tools — registered upfront so they're addressable, but
  // *not* exposed to the model unless it has called load_tool first.
  // Exposure is controlled by the activeTools array from prepareStep.
  const allAdvancedNames = new Set<string>()
  for (const slug of toolkitSlugs) {
    const entry = TOOLKITS[slug]
    if (!entry) continue
    for (const c of entry.advancedCatalog) allAdvancedNames.add(c.name)
  }
  const advancedTools = resolveLoadedTools({
    userId,
    toolkitSlugs,
    loadedNames: allAdvancedNames,
  })
  const gatedAdvanced = wrapToolsWithGate({
    rawTools: advancedTools,
    userId,
    agentSlug: spec.slug,
    policies,
    globalDefault,
  })

  // Skills catalog (Anthropic Agent Skills — 46 operator playbooks)
  const skillCatalog = await loadSkillCatalog()
  const skillsBlock = buildSkillsSystemBlock(skillCatalog)
  const loadSkillMeta = buildLoadSkillMeta()

  const initialTools: ToolSet = {
    ...gatedCore,
    ...gatedAdvanced,
    load_tool: loadToolMeta,
    load_skill: loadSkillMeta,
  }

  // Names always exposed to the model: every core tool + both meta-tools
  const baseActiveTools: string[] = [
    ...Object.keys(gatedCore),
    'load_tool',
    'load_skill',
  ]

  // Compose the final system prompt
  const advancedCatalog = buildAdvancedToolsCatalog(toolkitSlugs)
  const systemPrompt = [
    spec.systemPrompt,
    brainContext,
    skillsBlock,
    advancedCatalog
      ? `## Advanced tools available on demand\n\n${advancedCatalog}\n\nIf you need one, call \`load_tool({ name: "<tool_name>" })\` first. The tool becomes callable on the NEXT step.`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n---\n\n')

  /**
   * prepareStep — runs before each iteration. Activates any advanced tools
   * the model has requested via load_tool. Core tools stay always-active.
   */
  const prepareStep = () => {
    if (tracker.loaded.size === 0) return {}
    return {
      activeTools: [...baseActiveTools, ...tracker.loaded] as Array<keyof typeof initialTools>,
    }
  }

  return {
    runId,
    systemPrompt,
    tools: initialTools,
    prepareStep,
    baseActiveTools,
  }
}

function defaultRunPrompt(): string {
  return `It's ${new Date().toISOString()}. Run your scheduled job. Use the tools you've been given. Be deliberate — pick the highest-leverage thing to do today.`
}

function countGateOutcomes(steps: { toolResults?: Array<{ output?: unknown }> }[]) {
  let queued = 0
  let blocked = 0
  for (const step of steps) {
    for (const tr of step.toolResults ?? []) {
      const out = JSON.stringify(tr.output ?? '')
      if (out.includes('"_gate":"approval"')) queued++
      if (out.includes('"_gate":"blocked"')) blocked++
    }
  }
  return { queued, blocked }
}

// ─── Approval-gate wrapper ─────────────────────────────────────────────────

function wrapToolsWithGate({
  rawTools,
  userId,
  agentSlug,
  policies,
  globalDefault,
}: {
  rawTools: ToolSet
  userId: string
  agentSlug: string
  policies: ToolPolicyMap
  globalDefault: 'ask' | 'auto' | 'off'
}): ToolSet {
  const out: ToolSet = {}

  for (const [name, def] of Object.entries(rawTools)) {
    const originalExecute = def.execute
    out[name] = {
      ...def,
      execute: async (args: Record<string, unknown>, opts: Parameters<NonNullable<typeof originalExecute>>[1]) => {
        const decision = classifyToolCall({
          userId,
          agentSlug,
          toolName: name,
          args,
          policies,
          globalDefault,
        })

        if (decision.kind === 'blocked') {
          return {
            _gate: 'blocked',
            reason: decision.reason,
            message: 'Blocked by autonomy policy. Tell the user what you would have done instead.',
          }
        }

        if (decision.kind === 'approval') {
          const summary = summarizeArgs(name, args)
          const queued = await enqueueAction({
            userId,
            agentSlug,
            toolName: name,
            args,
            summary,
          })
          return {
            _gate: 'approval',
            reason: decision.reason,
            actionId: queued?.actionId ?? null,
            confidence: queued?.confidence ?? null,
            confidenceBand: queued?.band ?? null,
            message: 'Queued for approval at /dashboard/actions. Continue with read-only work or finish your turn.',
          }
        }

        // 'auto' — fall through
        if (!originalExecute) {
          return { _gate: 'auto', error: 'No executor for this tool.' }
        }
        return originalExecute(args, opts)
      },
    } as ToolSet[string]
  }

  return out
}

function summarizeArgs(toolName: string, args: Record<string, unknown>): string {
  if (toolName === 'gmail_send' && typeof args.to === 'string') {
    return `Send email to ${args.to}: "${String(args.subject ?? '').slice(0, 60)}"`
  }
  if (toolName === 'gmail_reply' && typeof args.to === 'string') {
    return `Reply to ${args.to}: "${String(args.subject ?? '').slice(0, 60)}"`
  }
  if (toolName === 'gmail_create_draft' && typeof args.to === 'string') {
    return `Draft email to ${args.to}`
  }
  if (toolName === 'gmail_trash_message') {
    return `Trash message ${String(args.messageId ?? '')}`
  }
  return `${toolName} (${Object.keys(args).join(', ')})`
}
