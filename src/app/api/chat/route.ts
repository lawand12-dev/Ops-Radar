import { openai } from '../../../lib/openai'
import { applyRateLimit } from '../../../lib/rate-limit'
import {
  containsPromptInjectionAttempt,
  OPSRADAR_REDIRECT_MESSAGE,
  OPSRADAR_SYSTEM_PROMPT_PREFIX,
  sanitizeString,
  serverErrorResponse,
} from '../../../lib/security'

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = { role: 'user' | 'assistant'; content: string; timestamp?: string }

// ── System prompt ─────────────────────────────────────────────────────────────

const CHAT_SYSTEM_PROMPT = `${OPSRADAR_SYSTEM_PROMPT_PREFIX}

You are the OpsRadar AI assistant. You work for OpsRadar — a done-for-you \
automation service that builds, hosts, and maintains n8n workflows for agencies.

Your job: answer questions, understand the visitor's business problems, \
and guide them toward either starting a free audit or booking a strategy call.

What you know:
- OpsRadar builds custom n8n automations for agencies (marketing, recruiting, \
design, creative agencies)
- We handle everything: scoping, building, hosting, monitoring, maintenance
- Free audit takes 3 minutes and shows exactly what to automate
- Strategy calls are free, 20 minutes, no pitch
- Common automations: lead qualification, client reporting, onboarding, \
follow-ups, invoicing, data sync between tools
- We use n8n (open-source, self-hosted, no per-task fees)
- Pricing depends on complexity — typically $1,500-$5,000 for a build, \
$500-$3,000/month for managed service

Your tone: confident, specific, helpful. Like a senior consultant, not a \
chatbot. Never say 'I'm just an AI.' Be direct and knowledgeable.

If the visitor describes a problem, explain briefly how you'd solve it with \
automation, then suggest they start the free audit or book a call.

Never make up case studies or fake client names. If asked about past work, \
say 'I can show you the types of systems we build — start a free audit to \
see a blueprint specific to your business.'`

function isValidMessage(value: unknown): value is Message {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const message = value as Record<string, unknown>
  return (
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string'
  )
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const rateLimitResponse = applyRateLimit(request, 'chat')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const {
      messages,
      shouldAskContact,
      visitor_id,
    }: {
      messages?: unknown
      shouldAskContact?: boolean
      visitor_id?: string | null
    } = body

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'Messages required' }, { status: 400 })
    }

    if (messages.length > 20) {
      return Response.json({ error: 'Conversation history is too long.' }, { status: 400 })
    }

    if (!messages.every(isValidMessage)) {
      return Response.json({ error: 'Invalid message format.' }, { status: 400 })
    }

    if (messages.some((message) => message.role === 'user' && message.content.length > 500)) {
      return Response.json({ error: 'Messages must be 500 characters or fewer.' }, { status: 400 })
    }

    const sanitizedMessages = messages.map((message) => ({
      role: message.role,
      content: sanitizeString(message.content, 500),
    }))

    if (sanitizedMessages.some((message) => message.role === 'user' && containsPromptInjectionAttempt(message.content))) {
      return new Response(OPSRADAR_REDIRECT_MESSAGE, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-store',
        },
      })
    }

    let systemPrompt = CHAT_SYSTEM_PROMPT

    const sanitizedVisitorId = typeof visitor_id === 'string' ? sanitizeString(visitor_id, 200) : ''
    if (sanitizedVisitorId) {
      systemPrompt += `\n\nThe visitor is associated with ID (${sanitizedVisitorId}).`
    }

    if (shouldAskContact) {
      systemPrompt += `\n\nIMPORTANT: After answering the visitor's question, naturally and warmly ask for their name and email in one or two casual sentences — something like "By the way, what's your name? Drop me your email too and I can save our conversation so you won't have to start from scratch next time." Keep it brief and conversational, not formal.`
    }

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...sanitizedMessages,
      ],
      stream:      true,
      temperature: 0.7,
      max_tokens:  500,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) controller.enqueue(encoder.encode(text))
          }
        } finally {
          controller.close()
        }
      },
      cancel() {
        stream.controller.abort()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type':    'text/plain; charset=utf-8',
        'Cache-Control':   'no-cache, no-store',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('[chat] error:', err)
    return serverErrorResponse()
  }
}
