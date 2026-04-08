import { Resend } from 'resend'

import { isAbusiveSubmission } from '<npm>/lib/abuse-protection'
import { applyRateLimit } from '<npm>/lib/rate-limit'
import {
  escapeHtml,
  sanitizeString,
  serverErrorResponse,
} from '<npm>/lib/security'
import {
  getServerSupabaseClient,
  hasServerSupabaseClient,
} from '<npm>/lib/supabase-server'

// Table DDL (run once in Supabase SQL editor):
// CREATE TABLE quick_win_onboarding_requests (
//   id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   primary_tool text NOT NULL,
//   goal         text NOT NULL,
//   email        text NOT NULL,
//   source       text,
//   created_at   timestamptz DEFAULT now()
// );

type QuickWinOnboardingBody = {
  primary_tool: string
  goal: 'Sync' | 'Alert' | 'Report'
  email: string
  source: string
}

const resend = new Resend(process.env.RESEND_API_KEY)
const VALID_GOALS = new Set<QuickWinOnboardingBody['goal']>(['Sync', 'Alert', 'Report'])
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const rateLimitResponse = applyRateLimit(request, 'quick-win-onboarding')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()

    if (isAbusiveSubmission(body)) {
      return Response.json({ error: 'Invalid request payload' }, { status: 400 })
    }

    const payload: QuickWinOnboardingBody = {
      primary_tool: sanitizeString(
        String(body?.primaryTool ?? body?.primary_tool ?? ''),
        120,
      ),
      goal: sanitizeString(String(body?.goal ?? ''), 20) as QuickWinOnboardingBody['goal'],
      email: sanitizeString(String(body?.email ?? ''), 320),
      source: sanitizeString(String(body?.source ?? 'pricing_quick_win'), 80),
    }

    if (
      !payload.primary_tool ||
      !VALID_GOALS.has(payload.goal) ||
      !payload.email ||
      !EMAIL_PATTERN.test(payload.email)
    ) {
      return Response.json({ error: 'Missing or invalid fields' }, { status: 400 })
    }

    if (hasServerSupabaseClient()) {
      const supabase = getServerSupabaseClient()
      const { error } = await supabase.from('quick_win_onboarding_requests').insert(payload)

      if (error) {
        console.error('[quick-win-onboarding] Supabase error:', error.message)
      }
    } else {
      console.error('[quick-win-onboarding] missing server Supabase configuration')
    }

    const to = process.env.NOTIFICATION_EMAIL
    if (!to) {
      console.error('[quick-win-onboarding] NOTIFICATION_EMAIL not set')
      return Response.json({ ok: true })
    }

    const { error: emailError } = await resend.emails.send({
      from: 'OpsRadar <onboarding@resend.dev>',
      to,
      subject: `Quick Win Onboarding — ${payload.primary_tool}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px; margin: 0 auto; background: #0a0f1e; color: #eef2ff; padding: 32px; border-radius: 18px;">
          <div style="height: 2px; width: 100%; background: linear-gradient(90deg, #60a5fa, #7c3aed, #a78bfa); border-radius: 999px; margin-bottom: 24px;"></div>
          <p style="margin: 0 0 10px; font-size: 11px; font-weight: 700; letter-spacing: 2.4px; text-transform: uppercase; color: rgba(173,198,255,0.8);">Quick Win Onboarding</p>
          <h1 style="margin: 0 0 8px; font-size: 24px; line-height: 1.15; letter-spacing: -0.02em;">New Start Now request</h1>
          <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.7; color: rgba(255,255,255,0.6);">
            A visitor configured the Quick Win tier from the pricing page and submitted the simplified onboarding flow.
          </p>

          <div style="display: grid; gap: 12px; margin-bottom: 24px;">
            ${[
              ['Primary Tool', escapeHtml(payload.primary_tool)],
              ['Main Goal', escapeHtml(payload.goal)],
              ['Email', `<a href="mailto:${escapeHtml(payload.email)}" style="color:#93c5fd;text-decoration:none">${escapeHtml(payload.email)}</a>`],
              ['Source', escapeHtml(payload.source)],
            ]
              .map(
                ([label, value]) => `
                  <div style="border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); border-radius: 14px; padding: 14px 16px;">
                    <p style="margin: 0 0 6px; font-size: 10px; font-weight: 700; letter-spacing: 1.8px; text-transform: uppercase; color: rgba(255,255,255,0.35);">${label}</p>
                    <div style="font-size: 15px; line-height: 1.6; color: #eef2ff;">${value}</div>
                  </div>
                `,
              )
              .join('')}
          </div>

          <p style="margin: 0; font-size: 12px; text-align: center; color: rgba(255,255,255,0.24);">
            OpsRadar · Quick Win onboarding intake
          </p>
        </div>
      `,
    })

    if (emailError) {
      console.error('[quick-win-onboarding] Resend error:', emailError)
    }

    return Response.json({ ok: true })
  } catch (error) {
    console.error('[quick-win-onboarding] Unexpected error:', error)
    return serverErrorResponse()
  }
}
