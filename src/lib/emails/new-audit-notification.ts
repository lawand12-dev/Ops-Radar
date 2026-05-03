import { escapeHtml } from '../security'
import { SITE_URL } from '../constants'

interface NewAuditNotificationInput {
  auditId: string
  accessToken: string
  name: string
  email: string
  company: string
  biggestPain?: string
  tools?: string
  annualWaste?: number | null
  topOpportunity?: string
  readinessScore?: number
  agencyType?: string
  teamSize?: string
  revenueRange?: string
  draftResponse?: { subject: string; body: string } | null
}

export function buildNewAuditNotification(input: NewAuditNotificationInput) {
  const resultsUrl = `${SITE_URL}/results?id=${encodeURIComponent(input.auditId)}&token=${encodeURIComponent(input.accessToken)}`
  const wasteFormatted = input.annualWaste
    ? `$${input.annualWaste.toLocaleString()}`
    : 'Not calculated'

  const subject = `New audit: ${input.company} — ${wasteFormatted} annual waste`

  const toolsList = input.tools
    ? input.tools.split(',').map((t) => t.trim()).filter(Boolean)
    : []

  const eName = escapeHtml(input.name)
  const eEmail = escapeHtml(input.email)
  const eCompany = escapeHtml(input.company)
  const eAgencyType = escapeHtml(input.agencyType ?? 'Not specified')
  const eTeamSize = escapeHtml(input.teamSize ?? 'Unknown team')
  const eRevenue = escapeHtml(input.revenueRange ?? 'Unknown revenue')

  const draftBlock = input.draftResponse
    ? `
    <div style="margin:0 24px 24px;padding:20px;background:#0a1628;border:1px solid rgba(59,130,246,0.3);border-radius:12px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <span style="font-size:18px;">💡</span>
        <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#60a5fa;">Suggested Response — Copy, Adjust, Send</p>
      </div>
      <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:16px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.4);">Subject</p>
        <p style="margin:0 0 16px;font-size:14px;color:#eef2ff;font-weight:600;">${escapeHtml(input.draftResponse.subject)}</p>
        <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.4);">Body</p>
        <pre style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#dbeafe;line-height:1.6;white-space:pre-wrap;word-wrap:break-word;">${escapeHtml(input.draftResponse.body)}</pre>
      </div>
      <p style="margin:12px 0 0;font-size:11px;color:rgba(255,255,255,0.3);font-style:italic;">Generated from this prospect's specific audit answers. Review before sending.</p>
    </div>`
    : ''

  const draftTextBlock = input.draftResponse
    ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSUGGESTED RESPONSE — Copy, Adjust, Send\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nSubject: ${input.draftResponse.subject}\n\n${input.draftResponse.body}\n\n(Generated from prospect's audit. Review before sending.)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
    : ''

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
        .header { background: #000; color: white; padding: 24px; }
        .header h1 { margin: 0; font-size: 20px; }
        .header p { margin: 4px 0 0 0; color: #aaa; font-size: 13px; }
        .content { padding: 24px; }
        .section { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
        .section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 4px; }
        .value { font-size: 15px; color: #111; }
        .pain { font-style: italic; color: #333; padding: 12px; background: #fafafa; border-left: 3px solid #000; }
        .cta { display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 8px; }
        .cta:hover { background: #333; }
        .numbers { display: flex; gap: 20px; margin: 12px 0; }
        .stat { flex: 1; }
        .stat-value { font-size: 22px; font-weight: 700; color: #000; }
        .stat-label { font-size: 11px; text-transform: uppercase; color: #888; margin-top: 2px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Audit Completed</h1>
          <p>Pre-call briefing for ${eCompany}</p>
        </div>
        ${draftBlock}
        <div class="content">
          <div class="section">
            <div class="label">Prospect</div>
            <div class="value"><strong>${eName}</strong></div>
            <div class="value" style="color: #555;">${eEmail}</div>
            <div class="value" style="color: #555;">${eCompany}</div>
          </div>

          <div class="section">
            <div class="label">Agency Profile</div>
            <div class="value">${eAgencyType} &middot; ${eTeamSize} &middot; ${eRevenue}</div>
          </div>

          ${input.biggestPain ? `
          <div class="section">
            <div class="label">Their biggest pain (in their words)</div>
            <div class="pain">&ldquo;${escapeHtml(input.biggestPain)}&rdquo;</div>
          </div>
          ` : ''}

          <div class="section">
            <div class="label">Key Numbers</div>
            <div class="numbers">
              <div class="stat">
                <div class="stat-value">${escapeHtml(wasteFormatted)}</div>
                <div class="stat-label">Annual Waste</div>
              </div>
              ${input.readinessScore !== undefined ? `
              <div class="stat">
                <div class="stat-value">${input.readinessScore}/100</div>
                <div class="stat-label">Readiness</div>
              </div>
              ` : ''}
            </div>
          </div>

          ${input.topOpportunity ? `
          <div class="section">
            <div class="label">Top Opportunity</div>
            <div class="value">${escapeHtml(input.topOpportunity)}</div>
          </div>
          ` : ''}

          ${toolsList.length > 0 ? `
          <div class="section">
            <div class="label">Their Stack</div>
            <div class="value">${toolsList.map(escapeHtml).join(' &middot; ')}</div>
          </div>
          ` : ''}

          <div class="section">
            <a href="${resultsUrl}" class="cta">View Full Report &rarr;</a>
            <div style="margin-top: 12px; font-size: 12px; color: #888;">
              Click to see the exact report ${eName} is looking at.
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `${draftTextBlock}
NEW AUDIT COMPLETED — ${input.company}

Prospect: ${input.name} (${input.email})
Profile: ${input.agencyType ?? 'Not specified'} · ${input.teamSize ?? 'Unknown'} · ${input.revenueRange ?? 'Unknown'}

${input.biggestPain ? `Their biggest pain:\n"${input.biggestPain}"\n` : ''}
Annual Waste: ${wasteFormatted}
${input.readinessScore !== undefined ? `Readiness Score: ${input.readinessScore}/100\n` : ''}
${input.topOpportunity ? `Top Opportunity: ${input.topOpportunity}\n` : ''}
${toolsList.length > 0 ? `Stack: ${toolsList.join(', ')}\n` : ''}

View Full Report: ${resultsUrl}
  `.trim()

  return { subject, html, text }
}
