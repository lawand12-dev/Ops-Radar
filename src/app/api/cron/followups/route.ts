/**
 * Follow-up email cron — called by Vercel Cron once per day.
 * Sends 3 timed follow-ups to audits that haven't booked a call:
 *   Day 1  → Results summary + top opportunity teaser
 *   Day 3  → One specific opportunity deep-dive
 *   Day 7  → "Your automation is sitting idle" urgency email
 *
 * Requires these columns on the `audits` table:
 *   follow_up_1_sent boolean DEFAULT false
 *   follow_up_2_sent boolean DEFAULT false
 *   follow_up_3_sent boolean DEFAULT false
 *   created_at       timestamptz (already present)
 *
 * SQL to add columns (run once in Supabase):
 *   ALTER TABLE audits
 *     ADD COLUMN IF NOT EXISTS follow_up_1_sent boolean DEFAULT false,
 *     ADD COLUMN IF NOT EXISTS follow_up_2_sent boolean DEFAULT false,
 *     ADD COLUMN IF NOT EXISTS follow_up_3_sent boolean DEFAULT false;
 */

import { Resend } from 'resend'
import { createAuditAccessToken, hasAuditAccessSecret } from '../../../../lib/audit-access'
import { serverErrorResponse } from '../../../../lib/security'
import { getServerSupabaseClient, hasServerSupabaseClient } from '../../../../lib/supabase-server'

const resend   = new Resend(process.env.RESEND_API_KEY)
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://opsradar.ai'
const CRON_SECRET = process.env.CRON_SECRET

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function fmtMoney(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`
}

function buildResultsUrl(auditId: string, email: string | null | undefined) {
  const baseUrl = `${BASE_URL}/results?id=${encodeURIComponent(auditId)}`
  if (!hasAuditAccessSecret()) {
    return baseUrl
  }

  const accessToken = createAuditAccessToken({
    auditId,
    scope: 'preview',
    email: email ?? undefined,
  })

  return `${baseUrl}&access=${encodeURIComponent(accessToken)}`
}

// ─── Email builders ───────────────────────────────────────────────────────────

function buildDay1Email(name: string, company: string, resultsUrl: string, score: number, annualWaste: number | null) {
  const scoreColor = score >= 60 ? '#10b981' : score >= 30 ? '#f59e0b' : '#ef4444'
  return {
    subject: `${name ? name.split(' ')[0] + ', your' : 'Your'} OpsRadar report is ready`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#060c1e;color:#eef2ff;border-radius:14px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0f1e45,#060c1e);padding:32px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.07);">
          <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.3);">OpsRadar</p>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#eef2ff;">Your automation audit is ready${company ? `, ${company}` : ''}</h1>
        </div>
        <div style="padding:28px 32px;">
          <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.6);line-height:1.65;">
            Hey${name ? ' ' + name.split(' ')[0] : ''}, your OpsRadar report identified exactly where your team is losing time — and what to build first.
          </p>
          <div style="display:flex;gap:12px;margin-bottom:24px;">
            <div style="flex:1;background:rgba(59,130,246,0.07);border:1px solid rgba(59,130,246,0.2);border-radius:10px;padding:16px;text-align:center;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.3);">Readiness Score</p>
              <p style="margin:0;font-size:32px;font-weight:800;color:${scoreColor};">${score}<span style="font-size:14px;font-weight:400;color:rgba(255,255,255,0.25);">/100</span></p>
            </div>
            ${annualWaste ? `<div style="flex:1;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:10px;padding:16px;text-align:center;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.3);">Annual Savings Potential</p>
              <p style="margin:0;font-size:32px;font-weight:800;color:#fbbf24;">${fmtMoney(annualWaste)}</p>
            </div>` : ''}
          </div>
          <p style="margin:0 0 20px;font-size:14px;color:rgba(255,255,255,0.5);line-height:1.6;">Your full blueprint includes automation flows, n8n nodes, step-by-step implementation guides, and a 90-day roadmap. It's all in your report — unlock it in 20 seconds.</p>
          <a href="${resultsUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:16px;border-radius:12px;margin-bottom:16px;box-shadow:0 0 24px rgba(59,130,246,0.3);">View My Full Blueprint →</a>
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.2);text-align:center;">Takes 20 seconds to unlock. No credit card.</p>
        </div>
        <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.15);">OpsRadar · <a href="${BASE_URL}" style="color:rgba(255,255,255,0.2);">opsradar.ai</a></p>
        </div>
      </div>`,
  }
}

function buildDay3Email(name: string, resultsUrl: string, topOpp: { title: string; hours_saved_weekly: number; difficulty: string } | null) {
  const buildTime = topOpp?.difficulty === 'easy' ? '5–7 days' : topOpp?.difficulty === 'medium' ? '7–14 days' : '14–21 days'
  const buildCost = topOpp?.difficulty === 'easy' ? '$1,500–$2,500' : topOpp?.difficulty === 'medium' ? '$2,500–$4,000' : '$4,000–$7,000'
  return {
    subject: `${name ? name.split(' ')[0] + ': ' : ''}this one automation would save you ${topOpp?.hours_saved_weekly ?? '5'}h/week`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#060c1e;color:#eef2ff;border-radius:14px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0f1e45,#060c1e);padding:32px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.07);">
          <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.3);">OpsRadar · Day 3</p>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#eef2ff;">Your #1 automation opportunity</h1>
        </div>
        <div style="padding:28px 32px;">
          <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.6);line-height:1.65;">
            Hey${name ? ' ' + name.split(' ')[0] : ''}, based on your audit, this is the one automation we'd build first for your agency:
          </p>
          ${topOpp ? `
          <div style="background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.18);border-radius:12px;padding:20px;margin-bottom:20px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.3);">#1 Priority</p>
            <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#eef2ff;">${topOpp.title}</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <span style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);color:#10b981;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;">${topOpp.hours_saved_weekly}h saved/week</span>
              <span style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.2);color:#60a5fa;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;">${buildCost}</span>
              <span style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);font-size:11px;padding:4px 10px;border-radius:20px;">${buildTime}</span>
            </div>
          </div>` : ''}
          <p style="margin:0 0 20px;font-size:14px;color:rgba(255,255,255,0.5);line-height:1.6;">The full implementation flow, n8n nodes, and exact steps are in your report. We can have this running for you within the week.</p>
          <a href="${resultsUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:16px;border-radius:12px;margin-bottom:12px;">See Full Blueprint →</a>
          <a href="https://calendly.com/opsradar-ai/ops-radar-strategy-call" style="display:block;text-align:center;background:rgba(173,198,255,0.07);border:1px solid rgba(173,198,255,0.18);color:#adc6ff;font-size:14px;font-weight:600;text-decoration:none;padding:14px;border-radius:12px;">Book a Free Strategy Call →</a>
        </div>
        <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.15);">OpsRadar · <a href="${BASE_URL}" style="color:rgba(255,255,255,0.2);">opsradar.ai</a></p>
        </div>
      </div>`,
  }
}

function buildDay7Email(name: string, resultsUrl: string, annualWaste: number | null) {
  return {
    subject: `${name ? name.split(' ')[0] + ', ' : ''}this automation is still sitting idle`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#060c1e;color:#eef2ff;border-radius:14px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1a0a0a,#060c1e);padding:32px 32px 24px;border-bottom:1px solid rgba(239,68,68,0.12);">
          <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.3);">OpsRadar · Day 7</p>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#eef2ff;">7 days of manual work that didn't have to happen</h1>
        </div>
        <div style="padding:28px 32px;">
          <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.6);line-height:1.65;">
            Hey${name ? ' ' + name.split(' ')[0] : ''}. It's been a week since your OpsRadar audit.
            ${annualWaste ? `In that time, your team likely burned through roughly <strong style="color:#f87171;">$${Math.round(annualWaste / 52).toLocaleString()}</strong> on manual work that automation would eliminate.` : 'Every week you wait is another week of manual work that automation would eliminate.'}
          </p>
          <div style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.15);border-left:3px solid #ef4444;border-radius:0 10px 10px 0;padding:16px;margin-bottom:24px;">
            <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.65);line-height:1.6;">The automations in your blueprint don't get built on their own. We can scope and start building your top workflow this week — with a guaranteed delivery date.</p>
          </div>
          <a href="https://calendly.com/opsradar-ai/ops-radar-strategy-call" style="display:block;text-align:center;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:16px;border-radius:12px;margin-bottom:12px;box-shadow:0 0 24px rgba(59,130,246,0.3);">Book a Free Strategy Call →</a>
          <a href="${resultsUrl}" style="display:block;text-align:center;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);font-size:13px;text-decoration:none;padding:12px;border-radius:10px;">Review My Blueprint First →</a>
        </div>
        <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.15);">OpsRadar · This is the last follow-up we'll send. · <a href="${BASE_URL}" style="color:rgba(255,255,255,0.2);">opsradar.ai</a></p>
        </div>
      </div>`,
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  // Verify the request comes from Vercel Cron or a trusted caller
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET) {
    console.error('[followup cron] missing CRON_SECRET')
    return serverErrorResponse()
  }

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sent = { day1: 0, day3: 0, day7: 0, errors: 0 }

  try {
    if (!hasServerSupabaseClient()) {
      return serverErrorResponse()
    }

    const supabase = getServerSupabaseClient()

    // ── Day 1: audits created ~24h ago, follow_up_1_sent = false ──────────────
    const { data: day1Audits } = await supabase
      .from('audits')
      .select('id, name, email, company, result')
      .eq('follow_up_1_sent', false)
      .not('email', 'is', null)
      .gte('created_at', daysAgo(2))
      .lte('created_at', daysAgo(1))

    for (const audit of day1Audits ?? []) {
      if (!audit.email) continue
      const result = audit.result as Record<string, unknown> | null
      const score  = (result?.automation_readiness_score as number) ?? 50
      const waste  = (result?.estimated_annual_waste as number) ?? null
      const resultsUrl = buildResultsUrl(audit.id, audit.email)

      const { subject, html } = buildDay1Email(audit.name ?? '', audit.company ?? '', resultsUrl, score, waste)
      const { error } = await resend.emails.send({ from: 'OpsRadar <onboarding@resend.dev>', to: audit.email, subject, html })
      if (error) { console.error('[followup day1]', error); sent.errors++; continue }

      await supabase.from('audits').update({ follow_up_1_sent: true }).eq('id', audit.id)
      sent.day1++
    }

    // ── Day 3: audits created ~72h ago, follow_up_2_sent = false ─────────────
    const { data: day3Audits } = await supabase
      .from('audits')
      .select('id, name, email, company, result')
      .eq('follow_up_2_sent', false)
      .not('email', 'is', null)
      .gte('created_at', daysAgo(4))
      .lte('created_at', daysAgo(3))

    for (const audit of day3Audits ?? []) {
      if (!audit.email) continue
      const result  = audit.result as Record<string, unknown> | null
      const opps    = (result?.opportunities as Array<{ title: string; hours_saved_weekly: number; difficulty: string }>) ?? []
      const topOpp  = opps[0] ?? null
      const resultsUrl = buildResultsUrl(audit.id, audit.email)

      const { subject, html } = buildDay3Email(audit.name ?? '', resultsUrl, topOpp)
      const { error } = await resend.emails.send({ from: 'OpsRadar <onboarding@resend.dev>', to: audit.email, subject, html })
      if (error) { console.error('[followup day3]', error); sent.errors++; continue }

      await supabase.from('audits').update({ follow_up_2_sent: true }).eq('id', audit.id)
      sent.day3++
    }

    // ── Day 7: audits created ~7 days ago, follow_up_3_sent = false ──────────
    const { data: day7Audits } = await supabase
      .from('audits')
      .select('id, name, email, company, result')
      .eq('follow_up_3_sent', false)
      .not('email', 'is', null)
      .gte('created_at', daysAgo(8))
      .lte('created_at', daysAgo(7))

    for (const audit of day7Audits ?? []) {
      if (!audit.email) continue
      const result     = audit.result as Record<string, unknown> | null
      const waste      = (result?.estimated_annual_waste as number) ?? null
      const resultsUrl = buildResultsUrl(audit.id, audit.email)

      const { subject, html } = buildDay7Email(audit.name ?? '', resultsUrl, waste)
      const { error } = await resend.emails.send({ from: 'OpsRadar <onboarding@resend.dev>', to: audit.email, subject, html })
      if (error) { console.error('[followup day7]', error); sent.errors++; continue }

      await supabase.from('audits').update({ follow_up_3_sent: true }).eq('id', audit.id)
      sent.day7++
    }

    console.log('[followup cron] done', sent)
    return Response.json({ ok: true, sent })
  } catch (err) {
    console.error('[followup cron] fatal error:', err)
    return serverErrorResponse()
  }
}
