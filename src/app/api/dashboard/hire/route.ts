/**
 * POST /api/dashboard/hire — the Hiring assistant chat (CP-38).
 *
 * Streams the Hire assistant's response as Server-Sent Events in the event
 * protocol the chat UI (hire-chat.tsx) understands:
 *
 *   { type: 'session', session_id, title }
 *   { type: 'tool_call', name, label }
 *   { type: 'tool_done', name }
 *   { type: 'text_delta', delta }
 *   { type: 'draft_proposed', draft }       ← from propose_custom_employee
 *   { type: 'employee_hired', slug, url }    ← from install_custom_employee
 *   { type: 'done' }
 *   { type: 'error', message }
 *
 * Pipeline:
 *   - Auth + per-customer rate limit.
 *   - Pre-flight OpenAI quota check (429 with reset date if blown).
 *   - Resolve/create the hire_chat_sessions row + persist the user turn.
 *   - Build the 9 hire tools (compile/install/lifecycle + web_search/list_skills).
 *   - streamText with the versioned hire system prompt.
 *   - Bridge the AI SDK fullStream → our SSE protocol, sniffing tool results
 *     for draft + hire cards.
 *   - Persist the assistant turn (content + tool_steps + draft_card) and bump
 *     the session counters.
 *
 * GET — load the most recent session's transcript (the sidebar drives session
 * switching via /sessions; this is the "open the page" convenience read).
 *
 * Body (POST): { session_id?: string, messages: { role, content }[] }
 */

import type { NextRequest } from 'next/server'
import { stepCountIs, type ModelMessage } from 'ai'
import { streamTextWithFallback, isFallbackWorthy } from '<npm>/lib/ai/model-provider'
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr'
import { applyRateLimit } from '<npm>/lib/rate-limit'
import { buildHireTools } from '<npm>/lib/hire/ai-sdk-tools'
import { buildHireSystemPrompt } from '<npm>/lib/hire/system-prompt'
import { checkQuota, recordUsage } from '<npm>/lib/usage/track'
import type { Json } from '<npm>/lib/database.types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

const HIRE_MODEL = 'gpt-5.5'

type IncomingMessage = { role: 'user' | 'assistant'; content: string }
// `install_draft` is the EXACT draft object from the inline card. When the
// customer clicks Hire, the UI sends it so we install deterministically
// (server-side) instead of asking the model to reconstruct the spec from
// chat history — which it can't do faithfully (the draft lives in UI state,
// not in the message text the model sees).
type Body = {
  session_id?: string | null
  messages?: IncomingMessage[]
  install_draft?: unknown
}

// ─── GET — convenience load of the latest session ──────────────────────────

export async function GET(): Promise<Response> {
  const userId = await getCurrentUserId()
  if (!userId) return json({ error: 'unauthorized' }, 401)

  const supabase = await getSessionSupabaseClient()
  const { data: latest, error: latestErr } = await supabase
    .from('hire_chat_sessions')
    .select('id')
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Distinguish a real DB failure from "no sessions yet" — otherwise a
  // transient/RLS error masquerades as an empty history and looks like the
  // customer's chats vanished.
  if (latestErr) {
    console.error('[api/dashboard/hire GET] session lookup failed:', latestErr.message)
    return json({ error: 'db_error', message: "Couldn't load your hire history — refresh in a moment." }, 500)
  }
  if (!latest) return json({ sessions: [], messages: [] }, 200)

  const { data: messages, error: msgErr } = await supabase
    .from('hire_chat_messages')
    .select('id, role, content, tool_steps, draft_card, created_at')
    .eq('session_id', latest.id)
    .order('created_at', { ascending: true })

  if (msgErr) {
    console.error('[api/dashboard/hire GET] message load failed:', msgErr.message)
    return json({ error: 'db_error', message: "Couldn't load this conversation — refresh in a moment." }, 500)
  }

  return json({ session_id: latest.id, messages: messages ?? [] }, 200)
}

// ─── POST — the streaming hire turn ────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  const userId = await getCurrentUserId()
  if (!userId) return json({ error: 'unauthorized' }, 401)

  // Per-customer rate limit: 30 hire turns/hour. Each turn can run a
  // generateObject compile + web search, so we throttle a runaway loop
  // rather than discover the cap was blown after the fact.
  const limited = await applyRateLimit(request, 'dashboard-hire', userId)
  if (limited) return limited

  // Pre-flight OpenAI quota — fail loudly with a reset date the UI shows.
  const quota = await checkQuota({ userId, provider: 'openai' })
  if (!quota.allowed) {
    return json(
      {
        error: 'quota_exceeded',
        message: `You've hit this month's AI compute cap. Resets ${quota.resetsAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`,
      },
      429,
    )
  }

  const body = (await request.json().catch(() => null)) as Body | null
  const incoming = (body?.messages ?? []).filter(
    (m): m is IncomingMessage =>
      !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
  )
  const lastUser = [...incoming].reverse().find((m) => m.role === 'user')
  if (!lastUser?.content.trim()) {
    return json({ error: 'missing_message', message: 'No message provided.' }, 400)
  }

  const supabase = await getSessionSupabaseClient()

  // Resolve or create the session, then persist the user turn.
  let sessionId = body?.session_id ?? null
  let sessionTitle = ''
  let isFirstHire = true
  if (!sessionId) {
    const title = lastUser.content.trim().slice(0, 60)
    const { data: created, error } = await supabase
      .from('hire_chat_sessions')
      .insert({ user_id: userId, title: title || 'New hire' })
      .select('id, title')
      .single()
    if (error || !created) {
      return json({ error: 'session_create_failed', message: 'Could not start a chat.' }, 500)
    }
    sessionId = created.id
    sessionTitle = created.title
  } else {
    const { data: existing } = await supabase
      .from('hire_chat_sessions')
      .select('title')
      .eq('id', sessionId)
      .maybeSingle()
    sessionTitle = existing?.title ?? 'Hire'
  }

  await supabase.from('hire_chat_messages').insert({
    session_id: sessionId,
    user_id: userId,
    role: 'user',
    content: lastUser.content.trim(),
  })

  // An install turn short-circuits the model entirely (see the stream below),
  // so skip the integrations lookup + prompt/tools assembly it doesn't need.
  const isInstall = !!body?.install_draft && typeof body.install_draft === 'object'

  let systemPrompt = ''
  let tools: ReturnType<typeof buildHireTools> = {}
  let history: ModelMessage[] = []

  if (!isInstall) {
    // Build the system prompt with live context (roster). Connected toolkits
    // require an integrations layer — none is wired, so pass [].
    const { loadCustomEmployees } = await import('<npm>/lib/employees/registry')
    const team = await loadCustomEmployees(userId)
    isFirstHire = team.length === 0
    systemPrompt = buildHireSystemPrompt({
      companyName: 'your company',
      connectedToolkits: [],
      existingTeam: team.map((e) => ({
        slug: e.slug,
        name: e.display.name,
        role: e.display.role,
        status: e.status,
      })),
      isFirstHire,
    })

    tools = buildHireTools({ userId })

    // Build the model message history (cap to the last 20 turns to keep the
    // context tight — hiring is short, not a 200-message thread).
    history = incoming.slice(-20).map((m) => ({ role: m.role, content: m.content }))
  }

  const encoder = new TextEncoder()
  const resolvedSessionId = sessionId

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      send({ type: 'session', session_id: resolvedSessionId, title: sessionTitle })

      // Accumulate the assistant turn so we can persist it after the stream.
      let assistantText = ''
      const toolSteps: Array<{ name: string; label: string }> = []
      let draftCard: unknown = null
      let hired: { slug: string; url: string } | null = null

      // ── Deterministic install path ──────────────────────────────────────
      // If the Hire button sent the exact draft, persist it directly — no
      // model round-trip. The draft only lives in UI state, so the model
      // could not reconstruct it from chat history.
      if (body?.install_draft && typeof body.install_draft === 'object') {
        try {
          send({ type: 'tool_call', name: 'install_custom_employee', label: 'Hiring' })
          const { installCustomEmployee } = await import('<npm>/lib/employees/install')
          const installResult = await installCustomEmployee({
            userId,
            draft: body.install_draft as Parameters<typeof installCustomEmployee>[0]['draft'],
          })
          send({ type: 'tool_done', name: 'install_custom_employee' })

          if (installResult.success) {
            hired = { slug: installResult.slug, url: installResult.url }
            assistantText = `${installResult.slug} is hired and will start on schedule. Open their page to chat or trigger the first task.`
            send({ type: 'employee_hired', slug: hired.slug, url: hired.url })
            send({ type: 'text_delta', delta: assistantText })
          } else {
            assistantText = `I couldn't complete the hire: ${installResult.error}`
            send({ type: 'text_delta', delta: assistantText })
          }

          await persistAssistantTurn({
            supabase,
            sessionId: resolvedSessionId,
            userId,
            content: assistantText,
            toolSteps: [{ name: 'install_custom_employee', label: 'Hiring' }],
            draftCard: null,
            hired,
          })
          send({ type: 'done' })
        } catch (err) {
          console.error(
            '[api/dashboard/hire] direct install failed:',
            err instanceof Error ? err.message : err,
          )
          send({ type: 'error', message: 'The hire could not be saved. Try clicking Hire again.' })
        } finally {
          controller.close()
        }
        return
      }

      try {
        const result = await streamTextWithFallback({
          model: HIRE_MODEL,
          system: systemPrompt,
          messages: history,
          tools,
          // stepCountIs(3) is a hard ceiling on tool-call rounds: propose runs
          // in step 1, the model summarizes in step 2 (3 leaves slack). Weaker
          // backup models (Llama/Scout on Groq) tend to re-call propose in a
          // loop; this caps it. The decisive guard is `draftDone` below — once
          // a draft is produced we abort the stream immediately so no loop can
          // form regardless of the model's discipline.
          stopWhen: stepCountIs(3),
        })

        // Once propose/install produces its card, the turn's job is done. We
        // stop consuming the stream so a chatty/looping model can't re-call the
        // tool. The draft card IS the deliverable — extra model chatter after
        // it adds nothing and risks the loop the user hit in prod.
        let terminalCardSent = false

        streamLoop: for await (const part of result.fullStream) {
          if (part.type === 'text-delta') {
            assistantText += part.text
            send({ type: 'text_delta', delta: part.text })
          } else if (part.type === 'tool-call') {
            // Suppress duplicate tool-call pills after we already have a card.
            if (terminalCardSent) continue
            const label = humanizeHireTool(part.toolName)
            toolSteps.push({ name: part.toolName, label })
            send({ type: 'tool_call', name: part.toolName, label })
          } else if (part.type === 'tool-result') {
            if (terminalCardSent) continue
            send({ type: 'tool_done', name: part.toolName })
            // Sniff results for the inline cards the UI renders.
            const out = part.output as Record<string, unknown> | undefined
            if (
              part.toolName === 'propose_custom_employee' &&
              out?.success === true &&
              out.draft
            ) {
              draftCard = out.draft
              send({ type: 'draft_proposed', draft: out.draft })
              // If the compiler marked the draft un-installable, say so plainly
              // instead of inviting the customer to click Hire on a dead-end.
              // The draft card itself also self-disables its Hire button when
              // `unsupported` is set, so this is belt-and-suspenders.
              const unsupported = (out.draft as { unsupported?: { reason: string } | null })
                ?.unsupported
              if (!assistantText.trim()) {
                const caption = unsupported
                  ? `I can't set this one up as described: ${unsupported.reason}`
                  : "Here's the draft — review it and click Hire when you're ready."
                assistantText = caption
                send({ type: 'text_delta', delta: caption })
              }
              terminalCardSent = true
              break streamLoop
            } else if (
              part.toolName === 'install_custom_employee' &&
              out?.success === true &&
              typeof out.slug === 'string'
            ) {
              hired = {
                slug: out.slug,
                url: typeof out.url === 'string' ? out.url : `/dashboard/employees/${out.slug}`,
              }
              send({ type: 'employee_hired', slug: hired.slug, url: hired.url })
              terminalCardSent = true
              break streamLoop
            }
          } else if (part.type === 'error') {
            // Log the full error server-side (incl. raw provider/billing detail
            // for Sentry), but NEVER forward raw provider/billing JSON to the
            // customer. Send a sanitized, customer-safe message: a capacity note
            // for quota/billing/rate-limit/auth failures, generic otherwise.
            console.error('[api/dashboard/hire] stream error part:', part.error)
            const customerMessage = isFallbackWorthy(part.error)
              ? 'The hiring assistant is temporarily at capacity. Please try again in a moment.'
              : 'Something went wrong on our side. Try again in a moment.'
            send({ type: 'error', message: customerMessage })
          }
        }

        // Record token usage against the customer's monthly quota. When we
        // break out of the stream early (a draft was produced), result.usage
        // may never resolve because the underlying generation was abandoned —
        // so race it against a short timeout and skip recording if it doesn't
        // settle. Better to under-count usage than to hang the `done` event.
        try {
          const usage = await Promise.race([
            result.usage,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
          ])
          if (usage?.totalTokens) {
            await recordUsage({
              userId,
              provider: 'openai',
              operation: 'agent_chat',
              tokens: usage.totalTokens,
              metadata: { feature: 'hire_chat', model: HIRE_MODEL },
            })
          }
        } catch {
          // usage resolution can reject if the stream errored — non-fatal.
        }

        // Persist the assistant turn + bump session counters (best-effort).
        await persistAssistantTurn({
          supabase,
          sessionId: resolvedSessionId,
          userId,
          content: assistantText,
          toolSteps,
          draftCard,
          hired,
        })

        send({ type: 'done' })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[api/dashboard/hire] stream failed:', msg)
        send({ type: 'error', message: 'Something went wrong on our side. Try again in a moment.' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function json(payload: object, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type SupabaseClient = Awaited<ReturnType<typeof getSessionSupabaseClient>>

async function persistAssistantTurn(input: {
  supabase: SupabaseClient
  sessionId: string
  userId: string
  content: string
  toolSteps: Array<{ name: string; label: string }>
  draftCard: unknown
  hired: { slug: string; url: string } | null
}): Promise<void> {
  const { supabase, sessionId, userId, content, toolSteps, draftCard } = input
  try {
    await supabase.from('hire_chat_messages').insert({
      session_id: sessionId,
      user_id: userId,
      role: 'assistant',
      content,
      tool_steps: toolSteps.length ? (toolSteps as unknown as Json) : null,
      draft_card: (draftCard ?? null) as Json,
    })
    // Bump the session: count its messages + stamp last_message_at so the
    // sidebar orders correctly. A trigger could do this, but an explicit
    // update keeps the migration dependency-free.
    const { count } = await supabase
      .from('hire_chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
    await supabase
      .from('hire_chat_sessions')
      .update({
        message_count: count ?? 0,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
  } catch (err) {
    console.warn(
      '[api/dashboard/hire] persistAssistantTurn failed:',
      err instanceof Error ? err.message : err,
    )
  }
}

/** Pretty step labels for the hire tools, shown in the chat's tool-step pills. */
function humanizeHireTool(name: string): string {
  const map: Record<string, string> = {
    propose_custom_employee: 'Drafting the spec',
    install_custom_employee: 'Hiring',
    list_custom_employees: 'Checking your team',
    inspect_custom_employee: 'Reading the spec',
    pause_custom_employee: 'Updating status',
    archive_custom_employee: 'Archiving',
    set_employee_manager: 'Setting reporting line',
    web_search: 'Researching the role',
    list_skills: 'Reviewing playbooks',
  }
  return map[name] ?? name.replace(/_/g, ' ')
}
