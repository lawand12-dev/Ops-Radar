import { Resend } from 'resend'
import { applyRateLimit } from '../../../lib/rate-limit'
import { escapeHtml, sanitizeString, serverErrorResponse } from '../../../lib/security'
import { isAbusiveSubmission, MIN_CHAT_LEAD_MS } from '../../../lib/abuse-protection'

const resend = new Resend(process.env.RESEND_API_KEY)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await applyRateLimit(request, 'notify-chat-lead')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    if (isAbusiveSubmission(body, { minElapsedMs: MIN_CHAT_LEAD_MS })) {
      return Response.json({ error: 'Invalid request payload' }, { status: 400 })
    }

    const {
      visitorEmail,
      visitorName,
      messageCount,
      lastMessage,
      conversationId,
    }: {
      visitorEmail:    string
      visitorName?:    string
      messageCount:    number
      lastMessage:     string
      conversationId?: string | null
    } = {
      visitorEmail: sanitizeString(String(body?.visitorEmail ?? ''), 320),
      visitorName: typeof body?.visitorName === 'string' ? sanitizeString(body.visitorName, 200) : undefined,
      messageCount: Number(body?.messageCount ?? 0),
      lastMessage: sanitizeString(String(body?.lastMessage ?? ''), 1000),
      conversationId: typeof body?.conversationId === 'string' ? sanitizeString(body.conversationId, 200) : null,
    }

    if (!visitorEmail || !EMAIL_REGEX.test(visitorEmail) || !Number.isFinite(messageCount)) {
      return Response.json({ error: 'Invalid email' }, { status: 400 })
    }

    const to = process.env.NOTIFICATION_EMAIL
    if (!to) {
      console.error('[notify-chat-lead] NOTIFICATION_EMAIL not set')
      return serverErrorResponse()
    }

    const { error } = await resend.emails.send({
      from: 'OpsRadar <onboarding@resend.dev>',
      to,
      subject: `🔥 Chat lead — ${visitorName ?? visitorEmail}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#060c1e;color:#eef2ff;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#0f1e45,#060c1e);padding:28px 28px 20px;border-bottom:1px solid rgba(255,255,255,0.07);">
            <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.3);">OpsRadar Chat</p>
            <h1 style="margin:0;font-size:20px;font-weight:700;color:#eef2ff;">New chat lead captured</h1>
          </div>
          <div style="padding:24px 28px;">
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
              ${visitorName ? `
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.3);width:38%;">Name</td>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;color:#eef2ff;font-weight:600;">${escapeHtml(visitorName)}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.3);">Email</td>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;"><a href="mailto:${escapeHtml(visitorEmail)}" style="color:#60a5fa;text-decoration:none;">${escapeHtml(visitorEmail)}</a></td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.3);">Messages</td>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px;color:#eef2ff;">${messageCount}</td>
              </tr>
              ${conversationId ? `
              <tr>
                <td style="padding:8px 0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.3);">Conv ID</td>
                <td style="padding:8px 0;font-size:11px;font-family:monospace;color:rgba(255,255,255,0.35);">${escapeHtml(conversationId)}</td>
              </tr>` : ''}
            </table>

            ${lastMessage ? `
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-left:3px solid #60a5fa;border-radius:8px;padding:14px;margin-bottom:20px;">
              <p style="margin:0 0 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.3);">Last message</p>
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);line-height:1.6;">${escapeHtml(lastMessage.slice(0, 300))}${lastMessage.length > 300 ? '…' : ''}</p>
            </div>` : ''}

            <a href="mailto:${escapeHtml(visitorEmail)}" style="display:block;text-align:center;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:14px;border-radius:10px;">
              Reply to ${escapeHtml(visitorName ?? visitorEmail)} →
            </a>
          </div>
          <div style="padding:16px 28px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.15);">OpsRadar · Chat lead notification</p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('[notify-chat-lead] Resend error:', error)
      return serverErrorResponse()
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[notify-chat-lead] Unexpected error:', err)
    return serverErrorResponse()
  }
}
