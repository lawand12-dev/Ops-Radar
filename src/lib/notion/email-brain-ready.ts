/**
 * Sends a one-time email to the customer when their Notion Brain is fully
 * provisioned (CP-24). Called fire-and-forget from
 * provisionBrain() AFTER all 20 DBs + the Brain Home page exist.
 *
 * No-op if RESEND_API_KEY isn't set — local dev shouldn't blow up trying
 * to send mail.
 */

import { Resend } from 'resend'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'

const FROM = 'OpsRadar <notifications@opsradar.co>'

export async function sendBrainReadyEmail(input: {
  userId: string
  parentPageId: string
  workspaceName: string | null
}): Promise<void> {
  const apiKey = (process.env.RESEND_API_KEY ?? '').trim()
  if (!apiKey) {
    console.warn('[brain/email] RESEND_API_KEY not set — skipping ready email')
    return
  }

  try {
    const supabase = getServerSupabaseClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.admin.getUserById(input.userId)
    if (error || !user?.email) {
      console.warn(
        '[brain/email] could not resolve customer email for user:',
        input.userId,
      )
      return
    }

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>
    const companyName =
      typeof meta.company_name === 'string' ? meta.company_name : 'your agency'
    const firstName =
      typeof meta.first_name === 'string' && meta.first_name.length > 0
        ? meta.first_name
        : null

    const notionUrl = `https://www.notion.so/${input.parentPageId.replace(/-/g, '')}`
    const greeting = firstName ? `Hi ${firstName},` : 'Hi,'

    const resend = new Resend(apiKey)
    const { error: sendErr } = await resend.emails.send({
      from: FROM,
      to: user.email,
      subject: `${companyName}'s Company Brain is ready in Notion`,
      html: buildHtml({ greeting, companyName, notionUrl }),
      text: buildText({ greeting, companyName, notionUrl }),
    })

    if (sendErr) {
      console.warn('[brain/email] Resend send failed:', sendErr)
    }
  } catch (err) {
    console.warn(
      '[brain/email] threw:',
      err instanceof Error ? err.message : err,
    )
  }
}

function buildHtml(p: {
  greeting: string
  companyName: string
  notionUrl: string
}): string {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p style="font-size:16px; line-height:1.5; color:#0a0a0a;">${p.greeting}</p>
  <p style="font-size:16px; line-height:1.5; color:#0a0a0a;">
    ${p.companyName}'s <strong>Company Brain</strong> is ready in your Notion workspace.
  </p>
  <p style="font-size:15px; line-height:1.55; color:#444;">
    20 databases provisioned + your first Brain Home page generated with 12 months of data from your connected tools. From now on, every cron agent will keep writing findings to these databases daily.
  </p>
  <p style="margin: 28px 0;">
    <a href="${p.notionUrl}" style="display:inline-block; background:#0066FF; color:#fff; text-decoration:none; padding:10px 18px; border-radius:8px; font-weight:500; font-size:15px;">
      Open Brain in Notion
    </a>
  </p>
  <p style="font-size:13px; line-height:1.5; color:#777;">
    Or open the dashboard: <a href="https://opsradar.co/dashboard/brain" style="color:#0066FF;">opsradar.co/dashboard/brain</a>
  </p>
  <hr style="margin: 32px 0; border:none; border-top:1px solid #e5e7eb;" />
  <p style="font-size:12px; line-height:1.5; color:#999;">
    OpsRadar — AI Chief of Staff for agencies and services businesses.
  </p>
</div>`
}

function buildText(p: {
  greeting: string
  companyName: string
  notionUrl: string
}): string {
  return `${p.greeting}

${p.companyName}'s Company Brain is ready in your Notion workspace.

20 databases provisioned + your first Brain Home page generated with 12 months of data from your connected tools. From now on, every cron agent will keep writing findings to these databases daily.

Open Brain in Notion: ${p.notionUrl}

Or open the dashboard: https://opsradar.co/dashboard/brain

— OpsRadar`
}
