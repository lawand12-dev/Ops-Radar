import { NextResponse, type NextRequest } from 'next/server'
import { applyRateLimit } from '../../../lib/rate-limit'
import { sanitizeString, serverErrorResponse } from '../../../lib/security'
import { supabase } from '../../../lib/supabase'
import { Resend } from 'resend'
import {
  CHAT_HISTORY_ACCESS_COOKIE,
  CHAT_HISTORY_ACCESS_MAX_AGE,
  CHAT_HISTORY_SESSION_COOKIE,
  CHAT_HISTORY_SESSION_MAX_AGE,
  createChatHistoryAccess,
  createChatHistorySessionToken,
  getChatHistorySessionEmail,
  hasChatHistoryAuthSecret,
  verifyChatHistoryAccessToken,
} from '../../../lib/chat-history-auth'

const resend = new Resend(process.env.RESEND_API_KEY)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ACCESS_CODE_REGEX = /^\d{6}$/
const ACCESS_CODE_MESSAGE = 'If we found chat history for that email, we sent a verification code.'

async function hasChatHistory(email: string) {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('id')
    .eq('visitor_email', email)
    .limit(1)

  if (error) {
    throw error
  }

  return Boolean(data && data.length > 0)
}

async function sendAccessCodeEmail(email: string, code: string) {
  const result = await resend.emails.send({
    from: 'OpsRadar <onboarding@resend.dev>',
    to: email,
    subject: 'Your OpsRadar chat access code',
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#060c1e;color:#eef2ff;border-radius:14px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0f1e45,#060c1e);padding:28px 28px 20px;border-bottom:1px solid rgba(255,255,255,0.07);">
          <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.3);">OpsRadar</p>
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#eef2ff;">Your secure chat access code</h1>
        </div>
        <div style="padding:24px 28px;">
          <p style="margin:0 0 16px;font-size:14px;color:rgba(255,255,255,0.62);line-height:1.65;">
            Use this 6-digit code to open your saved OpsRadar conversations. It expires in 10 minutes.
          </p>
          <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:12px;padding:18px;text-align:center;margin-bottom:18px;">
            <p style="margin:0;font-size:32px;font-weight:800;letter-spacing:8px;color:#60a5fa;">${code}</p>
          </div>
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.3);line-height:1.6;">
            If you didn’t request this, you can ignore this email.
          </p>
        </div>
      </div>
    `,
  })

  if (result.error) {
    throw new Error('failed to send access code')
  }
}

function getAuthenticatedEmail(request: NextRequest): string | null {
  const sessionToken = request.cookies.get(CHAT_HISTORY_SESSION_COOKIE)?.value
  return getChatHistorySessionEmail(sessionToken)
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = applyRateLimit(request, 'chat-history')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const action = sanitizeString(String(body?.action ?? ''), 64)
    const email = sanitizeString(String(body?.email ?? ''), 320).toLowerCase()
    const code = sanitizeString(String(body?.code ?? ''), 12)
    const convId = sanitizeString(String(body?.convId ?? ''), 200)

    if (!action) {
      return Response.json({ error: 'Invalid request payload' }, { status: 400 })
    }

    if (action === 'request-access-code') {
      if (!email || !EMAIL_REGEX.test(email)) {
        return Response.json({ error: 'Invalid email' }, { status: 400 })
      }

      if (!process.env.RESEND_API_KEY || !hasChatHistoryAuthSecret()) {
        return serverErrorResponse()
      }

      const response = NextResponse.json({ ok: true, message: ACCESS_CODE_MESSAGE })
      if (await hasChatHistory(email)) {
        const access = createChatHistoryAccess(email)
        await sendAccessCodeEmail(email, access.code)
        response.cookies.set({
          name: CHAT_HISTORY_ACCESS_COOKIE,
          value: access.token,
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          maxAge: CHAT_HISTORY_ACCESS_MAX_AGE,
        })
      }

      return response
    }

    if (action === 'verify-access-code') {
      if (!email || !EMAIL_REGEX.test(email) || !ACCESS_CODE_REGEX.test(code)) {
        return Response.json({ error: 'Invalid verification code' }, { status: 400 })
      }

      const accessToken = request.cookies.get(CHAT_HISTORY_ACCESS_COOKIE)?.value
      if (!verifyChatHistoryAccessToken(accessToken, email, code)) {
        return Response.json({ error: 'Invalid or expired verification code' }, { status: 401 })
      }

      const sessionToken = createChatHistorySessionToken(email)
      const response = NextResponse.json({ ok: true })
      response.cookies.set({
        name: CHAT_HISTORY_ACCESS_COOKIE,
        value: '',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
      })
      response.cookies.set({
        name: CHAT_HISTORY_SESSION_COOKIE,
        value: sessionToken,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: CHAT_HISTORY_SESSION_MAX_AGE,
      })
      return response
    }

    if (action === 'session-status') {
      const authenticatedEmail = getAuthenticatedEmail(request)
      return Response.json({
        authenticated: Boolean(authenticatedEmail),
        email: authenticatedEmail,
      })
    }

    if (action === 'sign-out') {
      const response = NextResponse.json({ ok: true })
      response.cookies.set({
        name: CHAT_HISTORY_ACCESS_COOKIE,
        value: '',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
      })
      response.cookies.set({
        name: CHAT_HISTORY_SESSION_COOKIE,
        value: '',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
      })
      return response
    }

    const authenticatedEmail = getAuthenticatedEmail(request)
    if (!authenticatedEmail) {
      return Response.json({ error: 'Verification required' }, { status: 401 })
    }

    if (action === 'get-conversations') {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('id, created_at, updated_at, messages, visitor_email')
        .eq('visitor_email', authenticatedEmail)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return Response.json({ conversations: data || [] })
    }

    if (action === 'get-preview') {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('id, created_at, updated_at, messages')
        .eq('visitor_email', authenticatedEmail)
        .order('updated_at', { ascending: false })
        .limit(1)

      if (error) throw error

      const previewConversation = data?.[0]
      const countResult = await supabase
        .from('chat_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('visitor_email', authenticatedEmail)

      if (countResult.error) throw countResult.error

      return Response.json({
        conversation: previewConversation ?? null,
        count: countResult.count ?? 0,
      })
    }

    if (action === 'get-conversation') {
      if (!convId) {
        return Response.json({ error: 'Invalid request payload' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', convId)
        .eq('visitor_email', authenticatedEmail)
        .single()

      if (error) throw error
      return Response.json({ conversation: data })
    }

    if (action === 'delete-conversation') {
      if (!convId) {
        return Response.json({ error: 'Invalid request payload' }, { status: 400 })
      }

      // Verify ownership first
      const { data: conv, error: getErr } = await supabase
        .from('chat_conversations')
        .select('visitor_email')
        .eq('id', convId)
        .single()

      if (getErr || conv?.visitor_email !== authenticatedEmail) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 })
      }

      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', convId)

      if (error) throw error
      return Response.json({ success: true })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('[chat-history api]:', err)
    return serverErrorResponse()
  }
}
