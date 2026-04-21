import { Resend } from 'resend'
import { applyRateLimit } from '../../../lib/rate-limit'
import { escapeHtml, sanitizeString, serverErrorResponse } from '../../../lib/security'
import { isAbusiveSubmission } from '../../../lib/abuse-protection'
import { getServerSupabaseClient, hasServerSupabaseClient } from '../../../lib/supabase-server'
import { CONTACT_EMAIL } from '../../../lib/constants'

// Table DDL (run once in Supabase SQL editor):
// CREATE TABLE build_requests (
//   id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   audit_id         uuid REFERENCES audits(id) ON DELETE SET NULL,
//   automation_title text NOT NULL,
//   name             text NOT NULL,
//   email            text NOT NULL,
//   budget           text NOT NULL,
//   timeline         text NOT NULL,
//   notes            text,
//   created_at       timestamptz DEFAULT now()
// );

type BuildRequestBody = {
  audit_id:         string | null
  automation_title: string
  name:             string
  email:            string
  budget:           string
  timeline:         string
  notes:            string
}

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await applyRateLimit(request, 'build-request')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    if (isAbusiveSubmission(body)) {
      return Response.json({ error: 'Invalid request payload' }, { status: 400 })
    }

    const payload: BuildRequestBody = {
      audit_id: typeof body?.audit_id === 'string' ? sanitizeString(body.audit_id, 200) : null,
      automation_title: sanitizeString(String(body?.automation_title ?? ''), 200),
      name: sanitizeString(String(body?.name ?? ''), 200),
      email: sanitizeString(String(body?.email ?? ''), 320),
      budget: sanitizeString(String(body?.budget ?? ''), 200),
      timeline: sanitizeString(String(body?.timeline ?? ''), 200),
      notes: sanitizeString(String(body?.notes ?? ''), 1000),
    }

    const { audit_id, automation_title, name, email, budget, timeline, notes } = payload

    if (!automation_title || !name || !email || !budget || !timeline) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── Save to Supabase ─────────────────────────────────────────────────
    if (hasServerSupabaseClient()) {
      const supabase = getServerSupabaseClient()
      const { error: dbError } = await supabase
        .from('build_requests')
        .insert({ audit_id: audit_id ?? null, automation_title, name, email, budget, timeline, notes: notes || null })

      if (dbError) {
        console.error('[build-request] Supabase error:', dbError.message)
        // Non-fatal — still send the email
      }
    } else {
      console.error('[build-request] missing server Supabase configuration')
    }

    // ── Send notification email ──────────────────────────────────────────
    const to = process.env.NOTIFICATION_EMAIL
    if (!to) {
      console.error('[build-request] NOTIFICATION_EMAIL not set')
      return Response.json({ ok: true })
    }

    const { error: emailError } = await resend.emails.send({
      from: 'OpsRadar <notifications@opsradar.co>',
      to,
      replyTo: CONTACT_EMAIL,
      subject: `Build Request — ${automation_title}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0f1e; color: #eef2ff; padding: 32px; border-radius: 12px;">
          <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.08);">
            <h1 style="margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #eef2ff;">New Build Request</h1>
            <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.4);">OpsRadar · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>

          <div style="background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.2); border-radius: 10px; padding: 14px 16px; margin-bottom: 20px;">
            <p style="margin: 0 0 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.3);">Requested Automation</p>
            <p style="margin: 0; font-size: 16px; font-weight: 700; color: #60a5fa;">${escapeHtml(automation_title)}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            ${[
              ['Contact', escapeHtml(name)],
              ['Email', `<a href="mailto:${escapeHtml(email)}" style="color:#60a5fa;text-decoration:none">${escapeHtml(email)}</a>`],
              ['Budget', escapeHtml(budget)],
              ['Timeline', escapeHtml(timeline)],
            ].map(([label, value]) => `
              <tr>
                <td style="padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: rgba(255,255,255,0.3); width: 36%;">${label}</td>
                <td style="padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; color: #eef2ff;">${value}</td>
              </tr>`).join('')}
          </table>

          ${notes ? `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 14px 16px; margin-bottom: 20px;">
              <p style="margin: 0 0 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.3);">Notes</p>
              <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.65); line-height: 1.65;">${escapeHtml(notes)}</p>
            </div>` : ''}

          <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.2); text-align: center;">OpsRadar · Build request notification</p>
        </div>
      `,
    })

    if (emailError) console.error('[build-request] Resend error:', emailError)

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[build-request] Unexpected error:', err)
    return serverErrorResponse()
  }
}
