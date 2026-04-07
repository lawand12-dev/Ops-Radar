import { Resend } from 'resend'
import { applyRateLimit } from '../../../lib/rate-limit'
import { escapeHtml, sanitizeString, serverErrorResponse } from '../../../lib/security'

const resend = new Resend(process.env.RESEND_API_KEY)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type NotifyPayload = {
  company: string
  name: string
  email: string
  teamSize: string
  agencyType: string
  timeWasters: string
  automationReadinessScore: number
  estimatedAnnualWaste: number | null
}

export async function POST(request: Request) {
  try {
    const rateLimitResponse = applyRateLimit(request, 'notify')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const payload: NotifyPayload = {
      company: sanitizeString(String(body?.company ?? ''), 200),
      name: sanitizeString(String(body?.name ?? ''), 200),
      email: sanitizeString(String(body?.email ?? ''), 320),
      teamSize: sanitizeString(String(body?.teamSize ?? ''), 200),
      agencyType: sanitizeString(String(body?.agencyType ?? ''), 200),
      timeWasters: sanitizeString(String(body?.timeWasters ?? ''), 1000),
      automationReadinessScore: Number(body?.automationReadinessScore ?? 0),
      estimatedAnnualWaste:
        typeof body?.estimatedAnnualWaste === 'number' ? body.estimatedAnnualWaste : null,
    }

    if (!payload.company || !payload.name || !payload.teamSize || !payload.agencyType) {
      return Response.json({ error: 'Invalid request payload' }, { status: 400 })
    }

    if (!EMAIL_REGEX.test(payload.email)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const to = process.env.NOTIFICATION_EMAIL
    if (!to) {
      console.error('[notify] missing notification email configuration')
      return serverErrorResponse()
    }

    const annualWaste = payload.estimatedAnnualWaste != null
      ? `$${payload.estimatedAnnualWaste.toLocaleString()}`
      : 'N/A'

    const { error } = await resend.emails.send({
      from: 'OpsRadar <onboarding@resend.dev>',
      to,
      subject: `New OpsRadar Audit — ${payload.company}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0f1e; color: #eef2ff; padding: 32px; border-radius: 12px;">
          <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.08);">
            <h1 style="margin: 0 0 4px; font-size: 22px; font-weight: 700; color: #eef2ff;">
              New Audit Completed
            </h1>
            <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.4);">OpsRadar · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: rgba(255,255,255,0.3); width: 40%;">Company</td>
              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; color: #eef2ff; font-weight: 600;">${escapeHtml(payload.company)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: rgba(255,255,255,0.3);">Contact</td>
              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; color: #eef2ff;">${escapeHtml(payload.name)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: rgba(255,255,255,0.3);">Email</td>
              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px;"><a href="mailto:${escapeHtml(payload.email)}" style="color: #60a5fa; text-decoration: none;">${escapeHtml(payload.email)}</a></td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: rgba(255,255,255,0.3);">Team Size</td>
              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; color: #eef2ff;">${escapeHtml(payload.teamSize)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: rgba(255,255,255,0.3);">Industry</td>
              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; color: #eef2ff;">${escapeHtml(payload.agencyType)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: rgba(255,255,255,0.3);">Top Time Wasters</td>
              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; color: rgba(255,255,255,0.7);">${escapeHtml(payload.timeWasters)}</td>
            </tr>
          </table>

          <div style="display: flex; gap: 12px; margin-bottom: 24px;">
            <div style="flex: 1; background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.2); border-radius: 10px; padding: 16px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.35);">Readiness Score</p>
              <p style="margin: 0; font-size: 28px; font-weight: 800; color: ${payload.automationReadinessScore >= 60 ? '#10b981' : payload.automationReadinessScore >= 30 ? '#f59e0b' : '#ef4444'};">${payload.automationReadinessScore}<span style="font-size: 14px; font-weight: 400; color: rgba(255,255,255,0.3);">/100</span></p>
            </div>
            <div style="flex: 1; background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.15); border-radius: 10px; padding: 16px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.35);">Annual Waste</p>
              <p style="margin: 0; font-size: 28px; font-weight: 800; color: #fbbf24;">${annualWaste}</p>
            </div>
          </div>

          <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.2); text-align: center;">OpsRadar · Automated audit notification</p>
        </div>
      `,
    })

    if (error) {
      console.error('[notify] Resend error:', error)
      return serverErrorResponse()
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[notify] Unexpected error:', err)
    return serverErrorResponse()
  }
}
