// src/app/api/dashboard/hire/route.ts
//
// Hire chat SSE backend (CP-38).
//
// This is the dedicated hiring surface — a focused chat for the customer
// to build their AI workforce. It does NOT answer business questions or
// take real-world actions (the COO chat does that).
//
// Public SSE event shape (matches COO contract so the chat UI can share
// rendering code):
//   - session         — session id + title resolved
//   - tool_call       — model just called a tool
//   - tool_done       — tool returned
//   - text_delta      — streamed text chunk
//   - draft_proposed  — propose_custom_employee returned a draft → render card
//   - employee_hired  — install_custom_employee succeeded → show success line
//   - done | error    — terminal events

import { type NextRequest, NextResponse } from 'next/server'
import { streamText, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { makeTelemetry, flushLangfuse } from '<npm>/lib/observability/langfuse'
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { applyRateLimit } from '<npm>/lib/rate-limit'
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier'
import { checkQuota, recordUsage } from '<npm>/lib/usage/track'
import { buildHireTools } from '<npm>/lib/hire/ai-sdk-tools'
import { buildHireSystemPrompt, PROMPT_VERSION } from '<npm>/lib/hire/system-prompt'
import { getConnectedToolSlugs } from '<npm>/lib/composio'
import { loadCustomEmployees } from '<npm>/lib/employees/registry'
import type { Json } from '<npm>/lib/database.types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

type UserMessage = { role: 'user'; content: string }
type AssistantMessage = { role: 'assistant'; content: string }
type IncomingMessage = UserMessage | AssistantMessage

// Labels for the inline "tool steps" UI. Keep them human, short, and
// distinguishable so the customer can see the funnel at a glance.
const HIRE_TOOL_LABELS: Record<string, string> = {
  propose_custom_employee: 'Drafting the spec…',
  install_custom_employee: 'Installing employee…',
  list_custom_employees: 'Listing your team…',
  inspect_custom_employee: 'Reading the spec…',
  pause_custom_employee: 'Pausing employee…',
  archive_custom_employee: 'Archiving employee…',
  set_employee_manager: 'Updating org chart…',
  web_search: 'Searching the web…',
  list_skills: 'Browsing skills…',
}

// Full draft shape — matches the EmployeeDraftLike component prop. Stored
// verbatim in hire_chat_messages.draft_card so a session reload re-renders
// the same Hire/Edit/Discard card.
type DraftCard = {
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

type HireAgentEvent =
  | { type: 'session'; session_id: string; title: string }
  | { type: 'tool_call'; name: string; label: string }
  | { type: 'tool_done'; name: string }
  | { type: 'text_delta'; delta: string }
  | { type: 'draft_proposed'; draft: DraftCard }
  | { type: 'employee_hired'; slug: string; url: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

type FinalAssistantMessage = {
  content: string
  toolSteps: Array<{ name: string; label: string; done: boolean }>
  draftCard: DraftCard | null
}

export async function POST(request: NextRequest): Promise<Response> {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await applyRateLimit(request, 'dashboard-hire', userId)
  if (limited) return limited as Response

  const body = (await request.json().catch(() => ({}))) as {
    messages?: IncomingMessage[]
    session_id?: string
  }
  const messages = (body.messages ?? []).slice(-10)
  const incomingSessionId =
    typeof body.session_id === 'string' && body.session_id ? body.session_id : null

  if (!messages.length || messages[messages.length - 1]?.role !== 'user') {
    return NextResponse.json({ error: 'invalid_messages' }, { status: 400 })
  }

  const service = getServerSupabaseClient()
  const { data: { user }, error: userErr } = await service.auth.admin.getUserById(userId)
  if (userErr || !user) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const plan = getUserPlan(meta)
  if (!canAccess(plan, 'hire_chat')) {
    return NextResponse.json(upgradeRequiredBody('growth'), { status: 402 })
  }

  // Monthly OpenAI quota gate. Don't start an expensive stream if the
  // customer has already hit their cap.
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

  const companyName =
    typeof meta.company_name === 'string' ? meta.company_name : 'your agency'

  // Pull context for the system prompt so the assistant knows what tools the
  // customer can scope a new employee to + who's already on the team.
  let connectedToolkits: string[] = []
  let existingTeam: Array<{ slug: string; name: string; role: string; status: string }> = []
  try {
    const [tk, team] = await Promise.all([
      getConnectedToolSlugs(userId),
      loadCustomEmployees(userId),
    ])
    connectedToolkits = tk as unknown as string[]
    existingTeam = team.map((e) => ({
      slug: e.slug,
      name: e.display.name,
      role: e.display.role,
      status: e.status,
    }))
  } catch (err) {
    console.warn('[hire-agent] context load failed', err)
  }

  const isFirstHire = existingTeam.length === 0
  const systemPrompt = buildHireSystemPrompt({
    companyName,
    connectedToolkits,
    existingTeam,
    isFirstHire,
  })

  const lastUserQuestion =
    [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''

  const tools = buildHireTools({ userId })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      function emit(event: HireAgentEvent) {
        if (closed) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      function close() {
        if (closed) return
        closed = true
        controller.close()
        flushLangfuse().catch(() => {})
      }

      // Resolve session — reuse if the client passed one + it belongs to
      // this user, otherwise create a new one with the first user message
      // as the seed title.
      let sessionId = incomingSessionId
      let sessionTitle = 'New hire'
      try {
        if (sessionId) {
          const { data: existing } = await service
            .from('hire_chat_sessions')
            .select('id, title, user_id')
            .eq('id', sessionId)
            .maybeSingle()
          if (!existing || existing.user_id !== userId) {
            sessionId = null
          } else {
            sessionTitle = existing.title
          }
        }
        if (!sessionId) {
          const firstUserMsg = lastUserQuestion.slice(0, 60).trim() || 'New hire'
          const { data: created } = await service
            .from('hire_chat_sessions')
            .insert({ user_id: userId, title: firstUserMsg })
            .select('id, title')
            .single()
          if (created) {
            sessionId = created.id
            sessionTitle = created.title
          }
        } else if (sessionTitle === 'New hire' && lastUserQuestion.trim()) {
          const candidate = lastUserQuestion.slice(0, 60).trim()
          if (candidate) {
            await service
              .from('hire_chat_sessions')
              .update({ title: candidate })
              .eq('id', sessionId)
              .eq('user_id', userId)
            sessionTitle = candidate
          }
        }
      } catch (err) {
        console.error('[hire-agent] session resolve failed', err)
      }

      // Persist the user message immediately so a mid-flight abort doesn't
      // lose their input.
      if (sessionId && messages.length > 0) {
        const lastUser = messages[messages.length - 1]
        try {
          await service.from('hire_chat_messages').insert({
            session_id: sessionId,
            user_id: userId,
            role: 'user',
            content: lastUser.content,
          })
        } catch (err) {
          console.error('[hire-agent] user message persist failed', err)
        }
      }

      if (sessionId) {
        emit({ type: 'session', session_id: sessionId, title: sessionTitle })
      }

      const finalAssistant: FinalAssistantMessage = {
        content: '',
        toolSteps: [],
        draftCard: null,
      }
      const persistAssistant = async (): Promise<void> => {
        if (!sessionId) return
        if (
          !finalAssistant.content &&
          finalAssistant.toolSteps.length === 0 &&
          !finalAssistant.draftCard
        )
          return
        try {
          await service.from('hire_chat_messages').insert({
            session_id: sessionId,
            user_id: userId,
            role: 'assistant',
            content: finalAssistant.content,
            tool_steps: finalAssistant.toolSteps as unknown as Json,
            draft_card: finalAssistant.draftCard as unknown as Json,
          })
        } catch (err) {
          console.error('[hire-agent] assistant message persist failed', err)
        }
      }

      console.log('[hire-agent] prompt version:', PROMPT_VERSION, '· isFirstHire:', isFirstHire)

      try {
        const result = streamText({
          model: openai('gpt-5.4'),
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          tools,
          stopWhen: stepCountIs(5),
          temperature: 0.2,
          experimental_telemetry: makeTelemetry({
            userId,
            sessionId: sessionId ?? undefined,
            source: 'hire-chat',
          }),
        })

        for await (const chunk of result.fullStream) {
          switch (chunk.type) {
            case 'text-delta': {
              const delta = chunk.text
              if (delta && delta.length > 0) {
                finalAssistant.content += delta
                emit({ type: 'text_delta', delta })
              }
              break
            }

            case 'tool-call': {
              const name = chunk.toolName
              const label = HIRE_TOOL_LABELS[name] ?? `Running ${name}…`
              finalAssistant.toolSteps.push({ name, label, done: false })
              emit({ type: 'tool_call', name, label })
              break
            }

            case 'tool-result': {
              const name = chunk.toolName
              const step = finalAssistant.toolSteps.find(
                (s) => s.name === name && !s.done,
              )
              if (step) step.done = true
              emit({ type: 'tool_done', name })

              // propose_custom_employee returns the typed draft — render an
              // inline card in the chat UI.
              if (name === 'propose_custom_employee') {
                const out = chunk.output as
                  | { success?: boolean; draft?: DraftCard }
                  | undefined
                if (out?.success && out.draft) {
                  finalAssistant.draftCard = out.draft
                  emit({ type: 'draft_proposed', draft: out.draft })
                }
              }

              // install_custom_employee returns { success, slug, url } —
              // surface a hired event so the UI can show a success state +
              // link to the new employee's page.
              if (name === 'install_custom_employee') {
                const out = chunk.output as
                  | { success?: boolean; slug?: string; url?: string }
                  | undefined
                if (out?.success && out.slug && out.url) {
                  emit({ type: 'employee_hired', slug: out.slug, url: out.url })
                }
              }
              break
            }

            case 'tool-error': {
              const name = chunk.toolName
              const step = finalAssistant.toolSteps.find(
                (s) => s.name === name && !s.done,
              )
              if (step) step.done = true
              emit({ type: 'tool_done', name })
              console.error('[hire-agent] tool-error', {
                tool: name,
                error: chunk.error,
              })
              break
            }

            case 'error': {
              console.error('[hire-agent] stream-error', chunk.error)
              await persistAssistant()
              emit({
                type: 'error',
                message: 'Something went wrong. Please try again.',
              })
              close()
              return
            }

            case 'finish': {
              const totalUsage = (
                chunk as { totalUsage?: { inputTokens?: number; outputTokens?: number } }
              ).totalUsage
              const tokens =
                (totalUsage?.inputTokens ?? 0) + (totalUsage?.outputTokens ?? 0)
              if (tokens > 0) {
                await recordUsage({
                  userId,
                  provider: 'openai',
                  operation: 'hire_chat',
                  tokens,
                  metadata: { session_id: sessionId ?? null },
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

        // Stream ended without an explicit finish chunk — finalize defensively.
        await persistAssistant()
        emit({ type: 'done' })
        close()
      } catch (err) {
        console.error('[hire-agent] fatal', err)
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
