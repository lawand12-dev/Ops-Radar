import { openai } from '../../../lib/openai'
import { checkRateLimit } from '../../../lib/rate-limit'

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = { role: 'user' | 'assistant'; content: string; timestamp?: string }

// ── System prompt ─────────────────────────────────────────────────────────────

const CHAT_SYSTEM_PROMPT = `You are the OpsRadar AI assistant. You work for OpsRadar — a done-for-you \
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

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const {
      messages,
      shouldAskContact,
      visitor_id,
    }: {
      messages:        Message[]
      shouldAskContact?: boolean
      visitor_id?:   string | null
    } = await request.json()

    if (!messages?.length) {
      return Response.json({ error: 'Messages required' }, { status: 400 })
    }

    const ip = request.headers.get("x-forwarded-for") || "anonymous"
    if (visitor_id && !checkRateLimit(visitor_id, 30, 60 * 60 * 1000)) { // 30 messages per hour per visitor_id
      return Response.json({ error: "Rate limit exceeded" }, { status: 429 })
    }
    if (!visitor_id && !checkRateLimit(ip, 30, 60 * 60 * 1000)) { // Fallback for no visitor_id
      return Response.json({ error: "Rate limit exceeded" }, { status: 429 })
    }

    // Build system prompt — extend with context-specific instructions
    let systemPrompt = CHAT_SYSTEM_PROMPT

    if (visitor_id) {
      systemPrompt += `\n\nThe visitor is associated with ID (${visitor_id}).`
    }

    if (shouldAskContact) {
      systemPrompt += `\n\nIMPORTANT: After answering the visitor's question, naturally and warmly ask for their name and email in one or two casual sentences — something like "By the way, what's your name? Drop me your email too and I can save our conversation so you won't have to start from scratch next time." Keep it brief and conversational, not formal.`
    }

    // Strip client-side timestamps before forwarding to OpenAI
    const cleanMessages = messages.map(m => ({ role: m.role, content: m.content }))

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...cleanMessages,
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
    return Response.json({ error: 'Failed to respond' }, { status: 500 })
  }
}
