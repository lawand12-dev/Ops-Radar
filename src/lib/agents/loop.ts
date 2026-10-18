/**
 * Agent loop — drives one execution of an employee (built-in or custom).
 *
 * Architecture (Vercel AI SDK v6 production pattern):
 *
 *   1. Inject the relevant brain context + skills catalog into the system
 *      prompt at run start.
 *   2. `load_skill` meta-tool lets the model pull in an operator playbook
 *      from the skills library on demand.
 *   3. External tool calls (once an integrations layer is wired again)
 *      are classified via the per-toolkit Ask/Auto/Off policy — the gate
 *      hooks live in ./hooks.ts (classifyToolCall / enqueueAction).
 *   4. Run history is logged at start + end via agent_runs.
 *   5. On success, commit a markdown summary to the brain for cross-run
 *      memory.
 */

import { streamText, stepCountIs, type ToolSet } from 'ai'
import {
  generateTextWithFallback,
  streamTextWithFallback,
} from '<npm>/lib/ai/model-provider'
import * as Sentry from '@sentry/nextjs'

import type { AgentSpec, AgentRunResult } from './types'
import {
  startRun,
  finishRun,
  loadBrainContext,
  writeBrainSummary,
} from './hooks'
import { loadSkillCatalog, buildSkillsSystemBlock } from '<npm>/lib/skills'
import { buildLoadSkillMeta } from './load-skill'
import { checkQuota, recordUsage } from '<npm>/lib/usage/track'
import type { Provider } from '<npm>/lib/usage/types'

export type RunAgentOptions = {
  /** Brain prefixes scoped to this employee. Defaults to global signals. */
  scopedBrainPrefixes?: ReadonlyArray<string>
}

// ─── Non-streaming variant ─────────────────────────────────────────────────

export async function runAgent(
  spec: AgentSpec,
  userId: string,
  options: RunAgentOptions = {},
): Promise<AgentRunResult> {
  // Pre-flight quota check: if the customer is over their monthly LLM cap,
  // skip the run entirely. Recording the eventual usage after the run is
  // too late — we'd have already burned the tokens. Fails open if the
  // quota check itself errors so we don't accidentally pause a paying
  // customer because of a Supabase blip.
  const provider = inferLlmProvider(spec.model)
  const preflight = await checkQuota({ userId, provider })
  if (!preflight.allowed) {
    console.warn(
      `[runAgent] ${spec.slug} skipped — ${provider} quota exhausted (${preflight.used}/${preflight.cap}, resets ${preflight.resetsAt.toISOString()})`,
    )
    return {
      status: 'skipped',
      reason: `${provider}-quota-exhausted`,
      summary: `Monthly ${provider} cap reached (${preflight.used.toLocaleString()}/${preflight.cap.toLocaleString()}). Resets ${preflight.resetsAt.toISOString().slice(0, 10)}.`,
    }
  }

  const ctx = await prepareRunContext(spec, userId, options)
  const startedAt = Date.now()

  try {
    const result = await generateTextWithFallback({
      model: spec.model || 'gpt-5.5',
      system: ctx.systemPrompt,
      prompt: defaultRunPrompt(),
      tools: ctx.tools,
      stopWhen: stepCountIs(spec.maxSteps ?? 12),
    })

    const elapsedMs = Date.now() - startedAt
    const actionsTaken = result.steps.reduce(
      (n, step) => n + (step.toolCalls?.length ?? 0),
      0,
    )

    const tokensUsed = result.usage?.totalTokens ?? 0

    // Record LLM token usage against the per-customer monthly cap.
    // Fire-and-forget — a logging blip never breaks the run.
    void recordUsage({
      userId,
      provider,
      operation: 'agent_cron_run',
      tokens: tokensUsed,
      metadata: { agent_slug: spec.slug, run_id: ctx.runId, actions_taken: actionsTaken },
    }).catch(() => {})

    console.info(
      `[runAgent] ${spec.slug} ok — ${actionsTaken} calls, ${tokensUsed} tokens, ${elapsedMs}ms`,
    )

    const summary = result.text || `(no narrative — ${actionsTaken} tool calls)`

    await finishRun({
      runId: ctx.runId,
      status: 'success',
      summary,
      actionsTaken,
      tokensUsed,
    })

    await writeBrainSummary({
      userId,
      agentSlug: spec.slug,
      runId: ctx.runId,
      summary,
      actionsTaken,
    })

    return {
      status: 'success',
      summary,
      actionsTaken,
      tokensUsed,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[runAgent] ${spec.slug} failed:`, message)
    // Capture in Sentry with rich agent context so production failures
    // are visible without log-spelunking. Tags let us slice errors by
    // agent + customer in the Sentry dashboard.
    Sentry.captureException(err, {
      tags: {
        agent_slug: spec.slug,
        run_source: 'cron-agent',
      },
      contexts: {
        agent: {
          user_id: userId,
          run_id: ctx.runId ?? 'unknown',
          model: spec.model,
        },
      },
    })
    await finishRun({ runId: ctx.runId, status: 'failed', errorMessage: message })
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
  // Same pre-flight quota check as runAgent. We throw here instead of
  // returning a {status: 'skipped'} object because streamText expects to
  // produce a stream — the caller (employee chat route, run-now button)
  // catches and surfaces the error to the UI as a clear "out of quota"
  // message.
  const provider = inferLlmProvider(spec.model)
  const preflight = await checkQuota({ userId, provider })
  if (!preflight.allowed) {
    throw new Error(
      `Monthly ${provider} cap reached (${preflight.used.toLocaleString()}/${preflight.cap.toLocaleString()} tokens). Resets ${preflight.resetsAt.toISOString().slice(0, 10)}.`,
    )
  }

  const ctx = await prepareRunContext(spec, userId, options)

  return await streamTextWithFallback({
    model: spec.model || 'gpt-5.5',
    system: ctx.systemPrompt,
    prompt: defaultRunPrompt(),
    tools: ctx.tools,
    stopWhen: stepCountIs(spec.maxSteps ?? 12),
    onError: ({ error }) => {
      // Stream errors don't bubble to a try/catch — they arrive via the
      // onError callback. Capture in Sentry with the same agent context
      // so chat failures are visible alongside cron failures.
      const err = error instanceof Error ? error : new Error(String(error))
      console.error(`[runAgentStream] ${spec.slug} stream error:`, err.message)
      Sentry.captureException(err, {
        tags: { agent_slug: spec.slug, run_source: 'employee-chat' },
        contexts: {
          agent: {
            user_id: userId,
            run_id: ctx.runId ?? 'unknown',
            model: spec.model,
          },
        },
      })
    },
    onFinish: async ({ text, steps, usage }) => {
      const actionsTaken = steps.reduce(
        (n, step) => n + (step.toolCalls?.length ?? 0),
        0,
      )
      const tokensUsed = usage?.totalTokens ?? 0
      const summary = text || `(no narrative — ${actionsTaken} tool calls)`

      // Record LLM token usage so chat sessions count against the cap too,
      // not just cron runs.
      void recordUsage({
        userId,
        provider,
        operation: 'agent_chat',
        tokens: tokensUsed,
        metadata: { agent_slug: spec.slug, run_id: ctx.runId, actions_taken: actionsTaken },
      }).catch(() => {})

      await finishRun({
        runId: ctx.runId,
        status: 'success',
        summary,
        actionsTaken,
        tokensUsed,
      })
      await writeBrainSummary({
        userId,
        agentSlug: spec.slug,
        runId: ctx.runId,
        summary,
        actionsTaken,
      })
    },
  })
}

// ─── Shared run setup ──────────────────────────────────────────────────────

async function prepareRunContext(
  spec: AgentSpec,
  userId: string,
  options: RunAgentOptions,
) {
  // Tier 1: log run start
  const runId = await startRun({ userId, agentSlug: spec.slug })

  // Tier 2: load brain context to seed the prompt
  const brainContext = await loadBrainContext({
    userId,
    scopedPrefixes: options.scopedBrainPrefixes,
  })

  // Skills catalog (Anthropic Agent Skills — 46 operator playbooks)
  const skillCatalog = await loadSkillCatalog()
  const skillsBlock = buildSkillsSystemBlock(skillCatalog)
  const loadSkillMeta = buildLoadSkillMeta()

  const initialTools: ToolSet = {
    load_skill: loadSkillMeta,
  }

  // Compose the final system prompt
  const systemPrompt = [
    spec.systemPrompt,
    brainContext,
    skillsBlock,
  ]
    .filter(Boolean)
    .join('\n\n---\n\n')

  return {
    runId,
    systemPrompt,
    tools: initialTools,
  }
}

function defaultRunPrompt(): string {
  return `It's ${new Date().toISOString()}. Run your scheduled job. Use the tools you've been given. Be deliberate — pick the highest-leverage thing to do today.`
}

/**
 * NOTE: the approval-gate wrapper (`wrapToolsWithGate`), the tool-call
 * summarizer, and the per-toolkit kill-switch filter were removed together
 * with the integration toolkits. When toolkits return, wire their tools to
 * `classifyToolCall` + `enqueueAction` in ./hooks.ts — same contract as
 * before: reads auto-fire, writes queue for approval.
 */

/**
 * Map a model slug to the Provider key in our quota table. Today every
 * built-in employee runs on OpenAI; Anthropic support lands when we wire
 * Claude models. Defaults to 'openai' since the loop's default model is
 * gpt-5.5.
 */
function inferLlmProvider(model: string | undefined): Provider {
  if (model && model.startsWith('claude')) return 'anthropic'
  return 'openai'
}
