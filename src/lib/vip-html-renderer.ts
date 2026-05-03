// src/lib/vip-html-renderer.ts

import type {
  BlueprintData,
  WorkflowMap,
} from './vip-blueprint-prompt'

const BG = '#0A0A0A'
const BLUE = '#3B82F6'
const TEXT = '#FFFFFF'
const MUTED = '#9CA3AF'
const DIM = '#D1D5DB'
const BORDER = '#1F2937'
const CARD = '#111827'
const STRIPE = '#0F0F1A'

function usd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function sectionTitle(num: string, title: string): string {
  return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;padding-bottom:12px;border-bottom:1px solid ${BORDER};">
    <span style="background:${BLUE};color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;">${num}</span>
    <h2 style="margin:0;font-size:20px;font-weight:700;color:${TEXT};">${title}</h2>
  </div>`
}

function table(headers: string[], rows: string[][]): string {
  const ths = headers
    .map(
      (h) =>
        `<th style="text-align:left;padding:10px 12px;font-size:11px;color:${BLUE};border:1px solid ${BORDER};background:#1a1a2e;">${h}</th>`,
    )
    .join('')
  const trs = rows
    .map((row, ri) => {
      const bg = ri % 2 === 0 ? BG : STRIPE
      const tds = row
        .map(
          (cell, ci) =>
            `<td style="padding:10px 12px;font-size:12px;color:${ci === 0 ? TEXT : DIM};border:1px solid ${BORDER};background:${bg};">${cell}</td>`,
        )
        .join('')
      return `<tr>${tds}</tr>`
    })
    .join('')
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:20px;"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`
}

function workflowPage(wf: WorkflowMap, num: string): string {
  const steps = wf.steps
    .map(
      (s, i) => `
    <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:16px;">
      <div style="background:${BLUE};color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${i + 1}</div>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:600;color:${TEXT};">${s.step}</div>
        <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;">
          <span style="background:#1F2937;color:${DIM};padding:2px 10px;border-radius:4px;font-size:11px;">Tool: ${s.tool}</span>
          <span style="background:#1F2937;color:${DIM};padding:2px 10px;border-radius:4px;font-size:11px;">Owner: ${s.owner}</span>
        </div>
        ${s.breakPoint ? `<div style="font-size:11px;color:#EF4444;margin-top:4px;">⚠ Break point: ${s.breakPoint}</div>` : ''}
      </div>
    </div>`,
    )
    .join('')
  return page(`
    ${sectionTitle(num, `Workflow Map ${parseInt(num) - 5}: ${wf.name}`)}
    <div style="background:${CARD};border:1px solid ${BORDER};border-radius:8px;padding:20px;">
      ${steps}
    </div>
  `)
}

function page(content: string): string {
  return `<div class="page">${content}</div>`
}

export function renderBlueprintHtml(data: BlueprintData): string {
  const cover = page(`
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:250mm;text-align:center;">
      <div style="font-size:13px;letter-spacing:3px;color:${BLUE};text-transform:uppercase;margin-bottom:20px;font-weight:600;">OpsRadar</div>
      <div style="width:48px;height:2px;background:${BLUE};margin-bottom:36px;"></div>
      <h1 style="font-size:38px;font-weight:800;color:${TEXT};margin:0 0 12px;line-height:1.2;">VIP Automation<br/>Blueprint</h1>
      <div style="font-size:22px;color:${BLUE};font-weight:700;margin-bottom:36px;">${data.agencyName}</div>
      <div style="width:48px;height:2px;background:${BORDER};margin-bottom:36px;"></div>
      <div style="font-size:13px;color:${MUTED};margin-bottom:10px;">${data.date}</div>
      <div style="font-size:11px;color:#EF4444;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Confidential</div>
    </div>
  `)

  const exec = page(`
    ${sectionTitle('2', 'Executive Summary')}
    <p style="font-size:14px;line-height:1.9;color:${DIM};margin-bottom:32px;">${data.executiveSummary}</p>
    <div style="background:${CARD};border:1px solid ${BORDER};border-radius:8px;padding:24px;margin-bottom:28px;text-align:center;">
      <div style="font-size:12px;color:${MUTED};letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Estimated Annual Waste</div>
      <div style="font-size:52px;font-weight:800;color:${BLUE};line-height:1;">${usd(data.annualWaste)}</div>
    </div>
    <h3 style="font-size:14px;color:${TEXT};margin-bottom:12px;font-weight:600;">Top 3 Automation Opportunities</h3>
    ${data.top3Opportunities
      .map(
        (opp, i) => `
      <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:10px;padding:14px;background:${CARD};border:1px solid ${BORDER};border-radius:6px;">
        <span style="background:${BLUE};color:#fff;font-weight:700;font-size:13px;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i + 1}</span>
        <span style="font-size:13px;color:${DIM};line-height:1.5;">${opp}</span>
      </div>`,
      )
      .join('')}
  `)

  const profile = page(`
    ${sectionTitle('3', 'Agency Profile + Team Map')}
    <div style="background:${CARD};border:1px solid ${BORDER};border-radius:8px;padding:20px;margin-bottom:24px;">
      <div style="font-size:12px;color:${BLUE};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Company Overview</div>
      <p style="font-size:13px;line-height:1.8;color:${DIM};">${data.companyDetails}</p>
    </div>
    ${table(
      ['Name', 'Role', 'Daily Work'],
      data.teamMembers.map((m) => [m.name, m.role, m.dailyWork]),
    )}
  `)

  const tools = page(`
    ${sectionTitle('4', 'Tool Stack Map')}
    ${table(
      ['Tool', 'Data Held', 'Connects To', 'Manual Bridge'],
      data.toolStack.map((t) => [
        t.name,
        t.dataHeld,
        t.connections,
        t.manualBridge
          ? `<span style="color:#EF4444;font-weight:600;">Yes</span>`
          : `<span style="color:#10B981;font-weight:600;">No</span>`,
      ]),
    )}
  `)

  const manual = page(`
    ${sectionTitle('5', 'Manual Work Analysis')}
    ${table(
      ['Task', 'Hrs / Week', 'Annual Cost'],
      data.manualTasks.map((t) => [
        t.task,
        String(t.hoursPerWeek),
        `<span style="color:${BLUE};font-weight:600;">${usd(t.annualCost)}</span>`,
      ]),
    )}
    <div style="background:${CARD};border:1px solid ${BLUE};border-radius:8px;padding:20px;text-align:center;">
      <div style="font-size:12px;color:${MUTED};letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Total Annual Waste</div>
      <div style="font-size:44px;font-weight:800;color:${BLUE};line-height:1;">${usd(data.totalAnnualWaste)}</div>
    </div>
  `)

  const wfPages = data.workflows.map((wf, i) => workflowPage(wf, String(i + 6)))

  const failures = page(`
    ${sectionTitle('9', 'Failure Mode Analysis')}
    ${table(
      ['Failure', 'Frequency', 'Business Impact', 'Prevention'],
      data.failureModes.map((f) => [
        f.failure,
        f.frequency,
        `<span style="color:#EF4444;">${f.impact}</span>`,
        `<span style="color:#10B981;">${f.prevention}</span>`,
      ]),
    )}
  `)

  const approvals = page(`
    ${sectionTitle('10', 'Approval Rules + AI Permissions')}
    <h3 style="font-size:13px;color:${TEXT};margin-bottom:12px;font-weight:600;">What Requires Human Review</h3>
    ${table(
      ['Item', 'Approver'],
      data.approvalRules.map((r) => [r.item, r.approver]),
    )}
    <h3 style="font-size:13px;color:#EF4444;margin:20px 0 12px;font-weight:600;">Never Automate</h3>
    ${data.neverAutomate
      .map(
        (item) => `
      <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px;padding:10px 14px;background:${CARD};border:1px solid #7F1D1D;border-radius:6px;">
        <span style="color:#EF4444;font-weight:700;flex-shrink:0;">✕</span>
        <span style="font-size:13px;color:${DIM};">${item}</span>
      </div>`,
      )
      .join('')}
  `)

  const roadmap = page(`
    ${sectionTitle('11', 'Priority Build Roadmap')}
    ${data.roadmap
      .map(
        (r) => `
      <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:16px;padding:16px;background:${CARD};border:1px solid ${BORDER};border-radius:8px;">
        <div style="background:${BLUE};color:#fff;font-size:18px;font-weight:800;width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${r.rank}</div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:700;color:${TEXT};margin-bottom:4px;">${r.workflow}</div>
          <div style="font-size:12px;color:${MUTED};margin-bottom:10px;">${r.rationale}</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <span style="font-size:11px;background:#1F2937;color:${DIM};padding:3px 10px;border-radius:4px;">Build: ${r.buildTime}</span>
            <span style="font-size:11px;background:#1F2937;color:#10B981;padding:3px 10px;border-radius:4px;">ROI: ${r.expectedRoi}</span>
          </div>
        </div>
      </div>`,
      )
      .join('')}
  `)

  const nextSteps = page(`
    ${sectionTitle('12', 'Next Steps + Investment Required')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
      <div style="background:${CARD};border:1px solid ${BORDER};border-radius:8px;padding:20px;">
        <div style="font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Investment Required</div>
        <div style="font-size:20px;font-weight:700;color:${BLUE};">${data.investment}</div>
      </div>
      <div style="background:${CARD};border:1px solid ${BORDER};border-radius:8px;padding:20px;">
        <div style="font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Timeline</div>
        <div style="font-size:20px;font-weight:700;color:${TEXT};">${data.timeline}</div>
      </div>
    </div>
    <div style="background:${CARD};border:1px solid ${BORDER};border-radius:8px;padding:20px;margin-bottom:16px;">
      <div style="font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">What Gets Built First</div>
      <div style="font-size:14px;color:${TEXT};line-height:1.7;">${data.firstBuild}</div>
    </div>
    <div style="background:${CARD};border:2px solid ${BLUE};border-radius:8px;padding:20px;margin-bottom:32px;">
      <div style="font-size:11px;color:${BLUE};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;font-weight:600;">How To Proceed</div>
      <div style="font-size:14px;color:${DIM};line-height:1.7;">${data.howToProceed}</div>
    </div>
    <div style="text-align:center;padding-top:24px;border-top:1px solid ${BORDER};">
      <div style="font-size:12px;color:${MUTED};">Produced by OpsRadar — AI Operations Intelligence for Agencies</div>
    </div>
  `)

  const allPages = [cover, exec, profile, tools, manual, ...wfPages, failures, approvals, roadmap, nextSteps]

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: ${BG}; color: ${TEXT}; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; }
.page { width: 210mm; min-height: 267mm; padding: 20mm 20mm 12mm; background: ${BG}; page-break-after: always; }
.page:last-child { page-break-after: avoid; }
@page { margin: 0; size: A4; }
</style>
</head>
<body>${allPages.join('\n')}</body>
</html>`
}

export function blueprintFooterHtml(agencyName: string): string {
  return `<div style="font-family:-apple-system,sans-serif;display:flex;justify-content:space-between;align-items:center;padding:0 20mm;font-size:9px;color:#4B5563;border-top:1px solid #1F2937;background:#0A0A0A;height:100%;padding-top:5px;"><span style="color:#3B82F6;font-weight:700;">OpsRadar</span><span>${agencyName} — Confidential</span><span>Page {page} of {total}</span></div>`
}
