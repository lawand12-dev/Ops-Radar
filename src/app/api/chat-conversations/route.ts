import { type NextRequest, NextResponse } from 'next/server'
import { applyRateLimit } from '../../../lib/rate-limit'
import {
  CHAT_WIDGET_SESSION_COOKIE,
  CHAT_WIDGET_SESSION_MAX_AGE,
  createChatWidgetSession,
  getChatWidgetSessionVisitorId,
  hasChatWidgetSessionSecret,
} from '../../../lib/chat-widget-session'
import { sanitizeString, serverErrorResponse } from '../../../lib/security'
import { getServerSupabaseClient, hasServerSupabaseClient } from '../../../lib/supabase-server'

type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

type ConversationRecord = {
  id: string
  created_at: string
  updated_at: string | null
  messages: Message[]
  visitor_email?: string | null
}

const JSON_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_HISTORY = 10

function isValidMessage(value: unknown): value is Message {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const message = value as Record<string, unknown>
  return (
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' &&
    typeof message.timestamp === 'string'
  )
}

function sanitizeMessages(messages: Message[]): Message[] {
  return messages.map((message) => ({
    role: message.role,
    content: sanitizeString(message.content, 1000),
    timestamp: (() => {
      const parsed = new Date(message.timestamp)
      return Number.isNaN(parsed.getTime())
        ? new Date().toISOString()
        : parsed.toISOString()
    })(),
  }))
}

function extractPreview(messages: Message[]): string {
  const firstUserMessage = messages.find((message) => message.role === 'user')
  if (!firstUserMessage) {
    return ''
  }

  const preview = sanitizeString(firstUserMessage.content, 52)
  return firstUserMessage.content.length > 52 ? `${preview}...` : preview
}

function toConversationSummary(row: ConversationRecord) {
  return {
    id: row.id,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
    preview: extractPreview(row.messages ?? []),
  }
}

function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: CHAT_WIDGET_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CHAT_WIDGET_SESSION_MAX_AGE,
  })
}

function getOrCreateSession(request: NextRequest): { visitorId: string; token?: string } {
  const existingVisitorId = getChatWidgetSessionVisitorId(
    request.cookies.get(CHAT_WIDGET_SESSION_COOKIE)?.value,
  )
  if (existingVisitorId) {
    return { visitorId: existingVisitorId }
  }

  return createChatWidgetSession()
}

function createJsonResponse(
  body: Record<string, unknown>,
  options: { sessionToken?: string; status?: number } = {},
) {
  const response = NextResponse.json(body, {
    status: options.status ?? 200,
    headers: JSON_HEADERS,
  })

  if (options.sessionToken) {
    setSessionCookie(response, options.sessionToken)
  }

  return response
}

function requireConversationStorage() {
  if (!hasChatWidgetSessionSecret() || !hasServerSupabaseClient()) {
    return Response.json(
      { error: 'Conversation storage is unavailable.' },
      { status: 503, headers: JSON_HEADERS },
    )
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await applyRateLimit(request, 'chat-conversations')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const unavailableResponse = requireConversationStorage()
    if (unavailableResponse) {
      return unavailableResponse
    }

    const { visitorId, token } = getOrCreateSession(request)
    const supabase = getServerSupabaseClient()
    const view = sanitizeString(request.nextUrl.searchParams.get('view') ?? 'initial', 32)
    const conversationId = sanitizeString(request.nextUrl.searchParams.get('id') ?? '', 200)

    if (conversationId) {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('id, created_at, updated_at, messages, visitor_email')
        .eq('id', conversationId)
        .eq('visitor_id', visitorId)
        .maybeSingle()

      if (error) {
        throw error
      }

      return createJsonResponse(
        {
          visitorId,
          conversation: data ?? null,
        },
        { sessionToken: token },
      )
    }

    const { data, error } = await supabase
      .from('chat_conversations')
      .select('id, created_at, updated_at, messages, visitor_email')
      .eq('visitor_id', visitorId)
      .order('updated_at', { ascending: false })
      .limit(MAX_HISTORY)

    if (error) {
      throw error
    }

    const conversations = (data ?? []) as ConversationRecord[]
    const summaries = conversations
      .map(toConversationSummary)
      .filter((summary) => Boolean(summary.preview))

    if (view === 'list') {
      return createJsonResponse(
        {
          visitorId,
          conversations: summaries,
        },
        { sessionToken: token },
      )
    }

    const latestConversation = conversations.find((conversation) => (
      Array.isArray(conversation.messages) &&
      conversation.messages.some((message) => message.role === 'user')
    )) ?? null

    return createJsonResponse(
      {
        visitorId,
        conversations: summaries,
        latestConversation,
      },
      { sessionToken: token },
    )
  } catch (error) {
    console.error('[chat-conversations] GET failed:', error)
    return serverErrorResponse()
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await applyRateLimit(request, 'chat-conversations')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const unavailableResponse = requireConversationStorage()
    if (unavailableResponse) {
      return unavailableResponse
    }

    const { visitorId, token } = getOrCreateSession(request)
    const supabase = getServerSupabaseClient()
    const body = await request.json()
    const conversationId = sanitizeString(String(body?.conversationId ?? ''), 200)
    const visitorEmail = sanitizeString(String(body?.visitorEmail ?? ''), 320).toLowerCase()
    const messages = Array.isArray(body?.messages) ? body.messages : []

    if (
      !Array.isArray(messages) ||
      messages.length < 2 ||
      messages.length > 40 ||
      !messages.every(isValidMessage)
    ) {
      return Response.json({ error: 'Invalid conversation payload' }, { status: 400, headers: JSON_HEADERS })
    }

    const sanitizedMessages = sanitizeMessages(messages)
    const safeVisitorEmail = visitorEmail && EMAIL_REGEX.test(visitorEmail)
      ? visitorEmail
      : null
    const payload = {
      visitor_id: visitorId,
      messages: sanitizedMessages,
      updated_at: new Date().toISOString(),
      ...(safeVisitorEmail ? { visitor_email: safeVisitorEmail } : {}),
    }

    let persistedConversationId = conversationId

    if (conversationId) {
      const { data: existingConversation, error: getError } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('visitor_id', visitorId)
        .maybeSingle()

      if (getError) {
        throw getError
      }

      if (existingConversation?.id) {
        const { error: updateError } = await supabase
          .from('chat_conversations')
          .update(payload)
          .eq('id', conversationId)
          .eq('visitor_id', visitorId)

        if (updateError) {
          throw updateError
        }
      } else {
        persistedConversationId = ''
      }
    }

    if (!persistedConversationId) {
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert(payload)
        .select('id')
        .single()

      if (error) {
        throw error
      }

      persistedConversationId = typeof data?.id === 'string' ? data.id : ''
    }

    return createJsonResponse(
      {
        ok: true,
        visitorId,
        conversationId: persistedConversationId || null,
      },
      { sessionToken: token },
    )
  } catch (error) {
    console.error('[chat-conversations] POST failed:', error)
    return serverErrorResponse()
  }
}
