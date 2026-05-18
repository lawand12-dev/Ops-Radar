// src/lib/emails/threshold-alert-email.ts

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://opsradar.co';

export type AlertEmailKind =
  | 'negative_margin'
  | 'scope_over_budget'
  | 'scope_at_risk'
  | 'invoice_overdue';

export type ThresholdAlertPayload = {
  kind: AlertEmailKind;
  entityName: string;
  detail: string;
};

const KIND_META: Record<AlertEmailKind, { label: string; isAlert: boolean }> = {
  negative_margin:   { label: 'Client losing money',   isAlert: true  },
  scope_over_budget: { label: 'Scope over budget',      isAlert: true  },
  scope_at_risk:     { label: 'Scope at risk (>80%)',   isAlert: false },
  invoice_overdue:   { label: 'Invoice overdue 30+ days', isAlert: true },
};

export function buildThresholdAlertEmail(
  payload: ThresholdAlertPayload,
  firstName: string,
): { subject: string; html: string } {
  const meta = KIND_META[payload.kind];
  const accentColor = meta.isAlert ? '#ef4444' : '#f59e0b';
  const accentBg = meta.isAlert ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)';
  const ctaUrl = `${BASE_URL}/dashboard/${payload.kind.startsWith('scope') ? 'scope' : payload.kind === 'invoice_overdue' ? 'profitability' : 'profitability'}`;

  const subject = `${firstName ? firstName + ', ' : ''}${meta.label}: ${payload.entityName}`;

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#060c1e;color:#eef2ff;border-radius:14px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#0f1e45,#060c1e);padding:32px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.07);">
    <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.3);">OpsRadar · Alert</p>
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#eef2ff;">Action needed${firstName ? ', ' + firstName : ''}</h1>
  </div>
  <div style="padding:28px 32px;">
    <div style="background:${accentBg};border:1px solid ${accentColor};border-left:3px solid ${accentColor};border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${accentColor};">${meta.label}</p>
      <p style="margin:0;font-size:18px;font-weight:600;color:#eef2ff;">${payload.entityName}</p>
      <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.65);">${payload.detail}</p>
    </div>
    <div style="text-align:center;">
      <a href="${ctaUrl}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">View in OpsRadar →</a>
    </div>
    <p style="margin:24px 0 0;font-size:12px;color:rgba(255,255,255,0.25);text-align:center;">
      Your AI COO monitors this 24/7.
      <a href="${BASE_URL}/dashboard/settings" style="color:rgba(255,255,255,0.35);">Manage notifications</a>
    </p>
  </div>
</div>`.trim();

  return { subject, html };
}
