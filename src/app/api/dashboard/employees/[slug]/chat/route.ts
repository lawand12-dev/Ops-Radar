/**
 * POST /api/dashboard/employees/[slug]/chat — per-employee chat surface.
 *
 * Streams an employee's response as Server-Sent Events using a small
 * custom event protocol that the chat-tab UI understands:
 *
 *   { type: 'thread', thread_id, title }
 *   { type: 'tool_call', name, label }
 *   { type: 'tool_done', name }
 *   { type: 'text_delta', delta }
 *   { type: 'done' }
 *   { type: 'error', message }
 *
 * Pipeline:
 *   - Look up the spec from AGENT_REGISTRY (built-in) or custom_employees row.
 *   - Build a one-shot AgentSpec with the customer's prompt injected.
 *   - Call runAgentStream() so the agent loop's full power (brain, skills,
 *     approval gate, Langfuse, kill switches) applies.
 *   - Bridge the AI SDK's text stream + tool-call events into our SSE shape.
 *
 * Body: { thread_id?: string, message: string }
 */

import type { NextRequest } from 'next/server'
import { getCurrentUserId } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { runAgentStream } from '<npm>/lib/agents/loop'
import { AGENT_REGISTRY } from '<npm>/lib/agents/registry'
import type { AgentSpec } from '<npm>/lib/agents/types'
import type { Database } from '<npm>/lib/database.types'
import { applyRateLimit } from '<npm>/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

type CustomEmployeeRow = Database['public']['Tables']['custom_employees']['Row']

type Body = {
  thread_id?: string
  message?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const userId = await getCurrentUserId()
  if (!userId) return jsonError('unauthorized', 401)

  // Per-customer rate limit: 60 employee-chat turns/hour. Burns OpenAI
  // tokens + tool-execution quota, so we'd rather throttle a runaway loop
  // than discover the cap was blown after the fact.
  const limited = await applyRateLimit(request, 'dashboard-employee-chat', userId)
  if (limited) return limited

  const { slug } = await params
  const body = (await request.json().catch(() => null)) as Body | null
  const message = body?.message?.trim()
  if (!message) return jsonError('missing_message', 400, 'No message provided.')

  // Resolve which employee — built-in via registry, otherwise custom_employees row.
  const spec = await resolveSpec(slug, userId, message)
  if (!spec) return jsonError('employee_not_found', 404, `No employee with slug "${slug}".`)

  // Stream the agent run as SSE in our custom event protocol.
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      // Surface a thread id (no DB write today — UI just uses it as a client-side group key).
      const threadId = body?.thread_id ?? `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      send({ type: 'thread', thread_id: threadId, title: spec.displayName })

      try {
        const result = await runAgentStream(spec, userId)

        // Bridge AI SDK events → our custom SSE events
        for await (const part of result.fullStream) {
          if (part.type === 'text-delta') {
            send({ type: 'text_delta', delta: part.text })
          } else if (part.type === 'tool-call') {
            send({
              type: 'tool_call',
              name: part.toolName,
              label: humanizeToolName(part.toolName),
            })
          } else if (part.type === 'tool-result') {
            send({ type: 'tool_done', name: part.toolName })
          } else if (part.type === 'error') {
            const msg = part.error instanceof Error ? part.error.message : String(part.error)
            send({ type: 'error', message: msg })
          }
        }

        send({ type: 'done' })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[employees/${slug}/chat] stream failed:`, msg)
        send({ type: 'error', message: msg })
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

// ─── Helpers ───────────────────────────────────────────────────────────────

function jsonError(error: string, status: number, message?: string): Response {
  return new Response(JSON.stringify({ error, ...(message ? { message } : {}) }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function resolveSpec(
  slug: string,
  userId: string,
  userMessage: string,
): Promise<AgentSpec | null> {
  // 1. Built-in
  const builtIn = AGENT_REGISTRY[slug]
  if (builtIn) {
    return {
      ...builtIn,
      // For interactive chat, override the cron-style system framing with
      // a chat one. We append the customer's message as the prompt seed
      // (runAgentStream's defaultRunPrompt is replaced by message context).
      systemPrompt: `${builtIn.systemPrompt}\n\n---\n\n## Conversation\n\nThe customer just asked you: ${userMessage}\n\nRespond conversationally. Use your tools when it helps. Be specific and useful.`,
    }
  }

  // 2. Custom employee
  const supabase = getServerSupabaseClient()
  const { data, error } = await supabase
    .from('custom_employees')
    .select('*')
    .eq('user_id', userId)
    .eq('slug', slug)
    .maybeSingle()
  if (error || !data) return null

  const row = data as CustomEmployeeRow
  return {
    slug: `custom:${row.slug}`,
    displayName: `${row.name} · ${row.role}`,
    description: row.persona_summary?.slice(0, 200) ?? row.role,
    model: row.model_slug ?? 'gpt-5.4',
    scopedToolkits: row.scoped_toolkits as string[],
    requiredTier: 'starter',
    requiredIntegrations: [],
    cronSchedule: row.schedule_cron ?? '0 0 * * *',
    maxSteps: row.max_steps ?? 10,
    systemPrompt: `${row.system_prompt}\n\n---\n\n## Conversation\n\nThe customer just asked you: ${userMessage}\n\nRespond conversationally. Use your tools when it helps. Be specific and useful.`,
  }
}

/** Pretty-printed tool name for the UI ("gmail_send" → "Sending email"). */
function humanizeToolName(toolName: string): string {
  const map: Record<string, string> = {
    gmail_send: 'Sending email',
    gmail_reply: 'Replying',
    gmail_create_draft: 'Drafting email',
    gmail_list_messages: 'Searching inbox',
    gmail_get_message: 'Reading email',
    gmail_get_thread: 'Reading conversation',
    gmail_modify_message: 'Updating labels',
    gmail_trash_message: 'Moving to trash',
    gmail_list_threads: 'Searching conversations',
    gmail_list_drafts: 'Listing drafts',
    gmail_send_draft: 'Sending draft',
    gmail_update_draft: 'Updating draft',
    gmail_list_labels: 'Loading labels',
    gmail_create_label: 'Creating label',
    load_tool: 'Loading advanced tool',
    load_skill: 'Reading playbook',
  }
  return map[toolName] ?? toolName.replace(/_/g, ' ')
}
