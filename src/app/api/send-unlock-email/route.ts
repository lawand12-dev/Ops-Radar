import { Resend } from 'resend'
import { supabase } from '../../../lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://opsradar.ai'

export async function POST(request: Request) {
  try {
    const { email, auditId }: { email: string; auditId: string | null } = await request.json()

    if (!email || !EMAIL_REGEX.test(email)) {
      return Response.json({ error: 'Invalid email' }, { status: 400 })
    }

    // Fetch audit context if we have an ID
    let company = ''
    let readinessScore: number | null = null
    let annualWaste: number | null = null

    if (auditId) {
      const { data } = await supabase
        .from('audits')
        .select('company, result')
        .eq('id', auditId)
        .single()
      if (data) {
        company = data.company ?? ''
        const result = data.result as Record<string, unknown> | null
        readinessScore = (result?.automation_readiness_score as number) ?? null
        annualWaste = (result?.estimated_annual_waste as number) ?? null
      }
    }

    const resultsUrl = auditId
      ? `${BASE_URL}/results?id=${auditId}`
      : `${BASE_URL}/audit`

    const scoreColor = readinessScore != null
      ? readinessScore >= 60 ? '#10b981' : readinessScore >= 30 ? '#f59e0b' : '#ef4444'
      : '#60a5fa'

    const { error } = await resend.emails.send({
      from: 'OpsRadar <onboarding@resend.dev>',
      to: email,
      subject: `Your OpsRadar Automation Blueprint${company ? ` — ${company}` : ''}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#060c1e;color:#eef2ff;border-radius:14px;overflow:hidden;">

          <!-- Header -->
          <div style="background:linear-gradient(135deg,#0f1e45 0%,#060c1e 100%);padding:36px 36px 28px;border-bottom:1px solid rgba(173,198,255,0.08);">
            <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px;background:linear-gradient(90deg,#60a5fa,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:6px;">
              OpsRadar
            </div>
            <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.35);">Your full automation blueprint is unlocked</p>
          </div>

          <!-- Body -->
          <div style="padding:32px 36px;">
            <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;letter-spacing:-0.5px;color:#eef2ff;">
              Here's your complete blueprint${company ? `, ${company}` : ''} 🔓
            </h1>
            <p style="margin:0 0 28px;font-size:15px;color:rgba(255,255,255,0.55);line-height:1.65;">
              Your full OpsRadar report is ready — including automation flows, n8n nodes,
              implementation steps, your 90-day roadmap, and tool recommendations.
            </p>

            ${(readinessScore != null || annualWaste != null) ? `
            <!-- Stats row -->
            <div style="display:flex;gap:12px;margin-bottom:28px;">
              ${readinessScore != null ? `
              <div style="flex:1;background:rgba(59,130,246,0.07);border:1px solid rgba(59,130,246,0.2);border-radius:10px;padding:16px;text-align:center;">
                <p style="margin:0 0 4px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.3);">Readiness Score</p>
                <p style="margin:0;font-size:30px;font-weight:800;color:${scoreColor};">${readinessScore}<span style="font-size:14px;font-weight:400;color:rgba(255,255,255,0.25);">/100</span></p>
              </div>` : ''}
              ${annualWaste != null ? `
              <div style="flex:1;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:10px;padding:16px;text-align:center;">
                <p style="margin:0 0 4px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.3);">Annual Savings Potential</p>
                <p style="margin:0;font-size:30px;font-weight:800;color:#fbbf24;">$${(annualWaste / 1000).toFixed(0)}K</p>
              </div>` : ''}
            </div>
            ` : ''}

            <!-- CTA -->
            <a href="${resultsUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 28px;border-radius:12px;margin-bottom:20px;letter-spacing:-0.2px;box-shadow:0 0 30px rgba(59,130,246,0.3);">
              View My Full Blueprint →
            </a>
            <p style="margin:0 0 28px;font-size:12px;color:rgba(255,255,255,0.2);text-align:center;">
              Or copy this link: <a href="${resultsUrl}" style="color:rgba(173,198,255,0.5);word-break:break-all;">${resultsUrl}</a>
            </p>

            <!-- What's unlocked -->
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.3);">What's now unlocked</p>
              ${['Automation flows with n8n node breakdowns', 'Step-by-step implementation guides', '90-day phased roadmap', 'Tool stack recommendations', 'Onboarding time savings analysis'].map(item => `
              <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                <div style="width:18px;height:18px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <span style="color:#10b981;font-size:10px;">✓</span>
                </div>
                <span style="font-size:13px;color:rgba(255,255,255,0.6);">${item}</span>
              </div>`).join('')}
            </div>

            <!-- CTA 2: Book call -->
            <div style="background:rgba(173,198,255,0.04);border:1px solid rgba(173,198,255,0.12);border-radius:12px;padding:20px;text-align:center;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#eef2ff;">Want us to build this for you?</p>
              <p style="margin:0 0 14px;font-size:12px;color:rgba(255,255,255,0.4);">20-minute strategy call. We scope your top automation and give you an exact price.</p>
              <a href="https://calendly.com/opsradar-ai/ops-radar-strategy-call" style="display:inline-block;background:rgba(173,198,255,0.1);border:1px solid rgba(173,198,255,0.25);color:#adc6ff;font-size:13px;font-weight:600;text-decoration:none;padding:10px 22px;border-radius:9px;">
                Book Free Strategy Call →
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.15);">OpsRadar · Done-For-You Agency Automation · <a href="${BASE_URL}" style="color:rgba(255,255,255,0.2);">opsradar.ai</a></p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('[send-unlock-email] Resend error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[send-unlock-email] Unexpected error:', err)
    return Response.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
