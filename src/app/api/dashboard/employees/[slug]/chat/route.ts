// src/app/api/dashboard/employees/[slug]/chat/route.ts
//
// CP-34c — Per-employee chat backend.
//
// Each AI employee (built-in or custom) gets their own chat thread. The
// customer talks to a specific employee using HER persona, HER scoped tools,
// HER system prompt — not the generic COO. This mirrors the Notion 3.3 /
// Lindy "Chat" tab pattern.
//
// Mirrors the /api/dashboard/coo/route.ts SSE contract (text_delta, tool_call,
// tool_done, done) so the chat UI components can be largely shared. The two
// differences vs COO chat:
//   1. The model + system prompt + tool surface come from the resolved
//      Employee object (employee.runtime.*), not from a global COO prompt.
//   2. Persistence lives in `custom_employee_chat_threads` +
//      `custom_employee_messages` (not `coo_chat_sessions`/`coo_chat_messages`).
//
// We deliberately SKIP the heavy system-prompt enrichments used by the cron
// loop (howWeWork, decision-log, approval-patterns, skill-catalog,
// automation-catalog). This is a chat, not a cron synthesis — keep the prompt
// tight to leave room for tool results in context.

import { type NextRequest, NextResponse } from 'next/server'
import { streamText, stepCountIs, tool as aiTool } from 'ai'
import { z } from 'zod'
import { openai } from '@ai-sdk/openai'
import { getCurrentUserId } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { applyRateLimit } from '<npm>/lib/rate-limit'
import { resolveEmployee } from '<npm>/lib/employees/registry'
import {
  COMPOSIO_TOOLS,
  getComposioToolsForUser,
  type ToolSlug,
} from '<npm>/lib/composio'
import { wrapToolsWithApprovalGate } from '<npm>/lib/agents/approval-gate'
import { loadSkillBody } from '<npm>/lib/skills'
import { commitBrainChanges, listBrainPaths } from '<npm>/lib/brain/store'
import { BRAIN_DIRECTORIES } from '<npm>/lib/brain/paths'
import type { BrainAuthorType } from '<npm>/lib/brain/types'
import { queryEvents, aggregateByMonth } from '<npm>/lib/warehouse/query'
import type { EventSource } from '<npm>/lib/warehouse/types'
import { makeTelemetry, flushLangfuse } from '<npm>/lib/observability/langfuse'
import { TOOL_LABELS } from '<npm>/lib/coo/tools'
import { checkQuota, recordUsage } from '<npm>/lib/usage/track'
import type { Json } from '<npm>/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const VALID_SLUGS = new Set(Object.keys(COMPOSIO_TOOLS) as ToolSlug[])
const isToolSlug = (v: string): v is ToolSlug => VALID_SLUGS.has(v as ToolSlug)

type ChatEvent =
  | { type: 'thread'; thread_id: string; title: string }
  | { type: 'tool_call'; name: string; label: string }
  | { type: 'tool_done'; name: string }
  | { type: 'text_delta'; delta: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

type StoredMessageRole = 'user' | 'employee'

type IncomingBody = {
  thread_id?: string
  message?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params

  // 1. Auth
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const limited = await applyRateLimit(request, 'dashboard-employee-chat', userId)
  if (limited) return limited as Response

  // 2. Resolve employee (built-in or custom).
  const employee = await resolveEmployee(userId, slug)
  if (!employee) {
    return NextResponse.json({ error: 'employee_not_found' }, { status: 404 })
  }

  const body = (await request.json().catch(() => ({}))) as IncomingBody
  const userMessageText = typeof body.message === 'string' ? body.message.trim() : ''
  if (!userMessageText) {
    return NextResponse.json({ error: 'invalid_message' }, { status: 400 })
  }
  const incomingThreadId = typeof body.thread_id === 'string' ? body.thread_id : null

  // OpenAI quota gate — fail fast before opening the stream.
  const openaiQuota = await checkQuota({ userId, provider: 'openai' })
  if (!openaiQuota.allowed) {
    return NextResponse.json(
      {
        error: 'quota_exceeded',
        provider: 'openai',
        used: openaiQuota.used,
        cap: openaiQuota.cap,
        resets_at: openaiQuota.resetsAt.toISOString(),
        message: `Monthly AI compute cap reached (${openaiQuota.used.toLocaleString()} / ${openaiQuota.cap.toLocaleString()} tokens). Resets ${openaiQuota.resetsAt.toISOString().slice(0, 10)}.`,
      },
      { status: 429 },
    )
  }

  const service = getServerSupabaseClient()

  // 3. Load or create thread.
  //
  // employee_id: for custom employees, the custom_employees.id; null for
  // built-ins (they aren't rows in custom_employees). employee_slug always
  // captures the resolution key so the UI can filter without the FK.
  const customEmployeeId = employee.customEmployeeId ?? null
  let threadId: string | null = null
  let threadTitle = userMessageText.slice(0, 60).trim() || `Chat with ${employee.display.name}`

  try {
    if (incomingThreadId) {
      const { data: existing } = await service
        .from('custom_employee_chat_threads')
        .select('id, title, user_id, employee_slug')
        .eq('id', incomingThreadId)
        .maybeSingle()
      if (existing && existing.user_id === userId && existing.employee_slug === slug) {
        threadId = existing.id
        threadTitle = existing.title ?? threadTitle
      }
    }

    if (!threadId) {
      const { data: created, error: createErr } = await service
        .from('custom_employee_chat_threads')
        .insert({
          user_id: userId,
          employee_id: customEmployeeId,
          employee_slug: slug,
          title: threadTitle,
        })
        .select('id, title')
        .single()
      if (createErr || !created) {
        console.error('[employee-chat] thread create failed:', createErr)
        return NextResponse.json({ error: 'thread_create_failed' }, { status: 500 })
      }
      threadId = created.id
      threadTitle = created.title ?? threadTitle
    } else {
      // Refresh title only if the existing one is still the default-style.
      // Keep customer edits intact otherwise.
      if (
        threadTitle.startsWith('Chat with ') ||
        threadTitle === '' ||
        threadTitle.toLowerCase() === 'new chat'
      ) {
        const candidate = userMessageText.slice(0, 60).trim()
        if (candidate) {
          await service
            .from('custom_employee_chat_threads')
            .update({ title: candidate, last_message_at: new Date().toISOString() })
            .eq('id', threadId)
          threadTitle = candidate
        }
      } else {
        await service
          .from('custom_employee_chat_threads')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', threadId)
      }
    }
  } catch (err) {
    console.error('[employee-chat] thread resolve failed:', err)
    return NextResponse.json({ error: 'thread_resolve_failed' }, { status: 500 })
  }

  // 4. Persist the user's message immediately so it survives mid-flight abort.
  try {
    await service.from('custom_employee_messages').insert({
      thread_id: threadId,
      user_id: userId,
      role: 'user' satisfies StoredMessageRole,
      content: userMessageText,
    })
  } catch (err) {
    console.error('[employee-chat] user message persist failed:', err)
  }

  // 5. Build the conversation history — last 50 messages on this thread,
  // chronological. Gives the model memory across turns without ballooning
  // context on long threads.
  let history: { role: 'user' | 'assistant'; content: string }[] = []
  try {
    const { data: pastMessages } = await service
      .from('custom_employee_messages')
      .select('role, content, created_at')
      .eq('thread_id', threadId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(50)
    history = (pastMessages ?? []).map((m) => ({
      // Stored role 'employee' → 'assistant' for the model API.
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content ?? '',
    }))
  } catch (err) {
    console.error('[employee-chat] history load failed:', err)
  }
  // Ensure the just-saved user message is included even if the SELECT raced
  // the INSERT.
  if (history.length === 0 || history[history.length - 1]?.role !== 'user') {
    history.push({ role: 'user', content: userMessageText })
  }

  // 6. Build the employee's tool surface.
  //
  // a. Composio tools scoped to employee.runtime.composioApps — intersected
  //    with what the customer has actually connected to avoid noisy
  //    "tool not connected" errors.
  // b. Wrap writes in the approval gate (source: 'employee-chat').
  // c. Add the shared helpers: load_skill, write_brain_document,
  //    list_brain_paths, query_historical, consult_coo.
  const connected = await getConnectedTools(userId)
  const wantedToolkits = (employee.runtime.composioApps ?? []).filter(
    (t): t is ToolSlug => isToolSlug(t) && connected.has(t as ToolSlug),
  )

  let composioTools: Awaited<ReturnType<typeof getComposioToolsForUser>> = {}
  if (wantedToolkits.length > 0) {
    try {
      const rawTools = await getComposioToolsForUser(
        userId,
        wantedToolkits.map((t) => COMPOSIO_TOOLS[t]),
      )
      composioTools = await wrapToolsWithApprovalGate(rawTools, {
        userId,
        source: 'employee-chat',
        agentSlug: slug,
      })
    } catch (err) {
      // Degrade gracefully — chat should still work without Composio.
      console.warn('[employee-chat] composio tool load failed:', err)
    }
  }

  // Author type for brain commits — built-in employees keep the legacy
  // `agent:<slug>` prefix; custom employees use `employee:<slug>`.
  const brainAuthorType: BrainAuthorType =
    employee.origin === 'built_in'
      ? (`agent:${slug}` as BrainAuthorType)
      : (`employee:${slug}` as BrainAuthorType)

  const helperTools = {
    load_skill: aiTool({
      description:
        'Load the full SKILL.md body for a named skill (Anthropic Agent Skills pattern). Only call when a skill clearly applies to your current task.',
      inputSchema: z.object({
        name: z.string().describe('The skill name (kebab-case).'),
      }),
      execute: async (args: { name: string }) => {
        try {
          return { success: true, name: args.name, body: await loadSkillBody(args.name) }
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : 'load failed' }
        }
      },
    }),
    write_brain_document: aiTool({
      description:
        "Write a markdown document to the customer's brain (their portable, exportable knowledge base). Use this to log Pattern Cards, Risk Register entries, KPI Snapshots, Decision Log entries, client updates, etc. Path conventions:\n" +
        BRAIN_DIRECTORIES.map((d) => `  ${d}/<slug>.md`).join('\n'),
      inputSchema: z.object({
        path: z
          .string()
          .min(3)
          .describe(
            "Brain-relative path, e.g. 'pattern-cards/chronic-late-payers.md'. Use kebab-case slugs and one of the allowed top-level directories.",
          ),
        content: z
          .string()
          .min(20)
          .describe('Full markdown content. Should start with a # heading.'),
        commit_message: z
          .string()
          .optional()
          .describe('Optional one-line description of the change.'),
      }),
      execute: async (args) => {
        try {
          const result = await commitBrainChanges({
            userId,
            authorType: brainAuthorType,
            message: args.commit_message ?? `${slug} updated ${args.path}`,
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
    list_brain_paths: aiTool({
      description:
        "List the paths of markdown documents in the customer's brain. Optional prefix filter (e.g. 'clients/').",
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
    query_historical: aiTool({
      description:
        "Query the customer's full raw history across connected tools (Stripe transactions, HubSpot deals, Harvest hours, etc.) for trend questions or drill-downs. Set aggregate=true for monthly buckets, aggregate=false for raw rows.",
      inputSchema: z.object({
        source: z
          .string()
          .describe("Source slug: 'stripe', 'hubspot', 'harvest', 'clickup', etc."),
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
    consult_coo: aiTool({
      description:
        'Escalate a question to the AI Chief of Staff (the supervisor). Use when you need cross-employee context — e.g. "How did Marcus classify the BigCo deal?" or "Is this customer on retainer or project terms?".',
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
          callerSlug: slug,
          question: args.question,
          context: args.context,
        })
      },
    }),
  }

  const tools = {
    ...composioTools,
    ...helperTools,
  }

  // 7. System prompt — straight from the employee. No enrichments (skills
  // catalog, automation catalog, howWeWork, decision-log, approval-patterns)
  // because chat context is precious and the customer expects this employee's
  // voice unfiltered.
  const systemPrompt = employee.runtime.systemPrompt

  const encoder = new TextEncoder()

  // Final assistant capture for persistence.
  type ToolStep = { name: string; label: string; done: boolean }
  type ToolCallRecord = { name: string; args: unknown }
  type ToolResultRecord = { name: string; output: unknown }
  let finalContent = ''
  const toolSteps: ToolStep[] = []
  const toolCalls: ToolCallRecord[] = []
  const toolResults: ToolResultRecord[] = []

  const stableThreadId = threadId

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      function emit(event: ChatEvent) {
        if (closed) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      function close() {
        if (closed) return
        closed = true
        controller.close()
        // Flush Langfuse fire-and-forget before the Vercel function freezes.
        flushLangfuse().catch(() => {})
      }

      const persistAssistant = async (): Promise<void> => {
        if (!stableThreadId) return
        if (!finalContent && toolSteps.length === 0) return
        try {
          await service.from('custom_employee_messages').insert({
            thread_id: stableThreadId,
            user_id: userId,
            role: 'employee' satisfies StoredMessageRole,
            content: finalContent,
            tool_calls: toolCalls as unknown as Json,
            tool_results: toolResults as unknown as Json,
          })
          await service
            .from('custom_employee_chat_threads')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', stableThreadId)
        } catch (err) {
          console.error('[employee-chat] assistant message persist failed:', err)
        }
      }

      // Announce the resolved thread up front so the client can switch URL
      // without waiting for the first text delta.
      emit({ type: 'thread', thread_id: stableThreadId, title: threadTitle })

      try {
        const result = streamText({
          model: openai(employee.runtime.model),
          system: systemPrompt,
          messages: history,
          tools,
          stopWhen: stepCountIs(employee.runtime.maxSteps),
          temperature: 0.3,
          experimental_telemetry: makeTelemetry({
            userId,
            agentSlug: slug,
            sessionId: stableThreadId,
            source: 'employee-chat',
          }),
        })

        for await (const chunk of result.fullStream) {
          switch (chunk.type) {
            case 'text-delta': {
              const delta = chunk.text
              if (delta && delta.length > 0) {
                finalContent += delta
                emit({ type: 'text_delta', delta })
              }
              break
            }

            case 'tool-call': {
              const name = chunk.toolName
              const label = TOOL_LABELS[name] ?? `Running ${name}...`
              toolSteps.push({ name, label, done: false })
              toolCalls.push({ name, args: chunk.input })
              emit({ type: 'tool_call', name, label })
              break
            }

            case 'tool-result': {
              const name = chunk.toolName
              const step = toolSteps.find((s) => s.name === name && !s.done)
              if (step) step.done = true
              toolResults.push({ name, output: chunk.output })
              emit({ type: 'tool_done', name })
              break
            }

            case 'tool-error': {
              const name = chunk.toolName
              const step = toolSteps.find((s) => s.name === name && !s.done)
              if (step) step.done = true
              const toolErr = chunk.error
              console.error('[employee-chat] tool-error', {
                slug,
                tool: name,
                message: toolErr instanceof Error ? toolErr.message : String(toolErr),
              })
              emit({ type: 'tool_done', name })
              break
            }

            case 'error': {
              const err = chunk.error
              console.error('[employee-chat] stream-error', {
                slug,
                message: err instanceof Error ? err.message : String(err),
              })
              await persistAssistant()
              emit({ type: 'error', message: 'Something went wrong. Please try again.' })
              close()
              return
            }

            case 'finish': {
              const totalUsage = (chunk as { totalUsage?: { inputTokens?: number; outputTokens?: number } }).totalUsage
              const tokens = (totalUsage?.inputTokens ?? 0) + (totalUsage?.outputTokens ?? 0)
              if (tokens > 0) {
                await recordUsage({
                  userId,
                  provider: 'openai',
                  operation: 'employee_chat',
                  tokens,
                  metadata: {
                    employee_slug: slug,
                    model: employee.runtime.model,
                    thread_id: stableThreadId,
                  },
                })
              }
              await persistAssistant()
              emit({ type: 'done' })
              close()
              return
            }

            default:
              break
          }
        }

        // Stream ended without an explicit finish — finalize defensively.
        await persistAssistant()
        emit({ type: 'done' })
        close()
      } catch (err) {
        console.error('[employee-chat] fatal-catch', {
          slug,
          message: err instanceof Error ? err.message : String(err),
        })
        await persistAssistant()
        emit({ type: 'error', message: 'Something went wrong. Please try again.' })
        close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}

// ---------- Helpers ----------

/** Set of toolkits this user has actively connected via Composio OAuth. */
async function getConnectedTools(userId: string): Promise<Set<ToolSlug>> {
  const supabase = getServerSupabaseClient()
  const { data, error } = await supabase
    .from('composio_connections')
    .select('tool_slug')
    .eq('user_id', userId)
    .eq('is_active', true)
  if (error) {
    console.error('[employee-chat] getConnectedTools failed:', error)
    return new Set()
  }
  const out = new Set<ToolSlug>()
  for (const row of data ?? []) {
    if (isToolSlug(row.tool_slug)) out.add(row.tool_slug)
  }
  return out
}
