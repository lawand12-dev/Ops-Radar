import type { StoredBriefing, AttentionItem } from '<npm>/lib/briefing-types';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://opsradar.co';

function kindColor(kind: AttentionItem['kind']): string {
  if (kind === 'alert')   return '#ef4444';
  if (kind === 'warning') return '#f59e0b';
  return '#60a5fa';
}

function healthColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function attentionRow(item: AttentionItem): string {
  const dot = `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${kindColor(item.kind)};margin-right:10px;flex-shrink:0;margin-top:6px;"></span>`;
  return `<div style="display:flex;align-items:flex-start;margin-bottom:12px;">${dot}<p style="margin:0;font-size:14px;color:rgba(255,255,255,0.7);line-height:1.6;">${item.text}</p></div>`;
}

export function buildBriefingEmail(
  briefing: StoredBriefing,
  firstName: string,
): { subject: string; html: string } {
  const date = new Date(briefing.created_at).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  const score = briefing.health_score ?? 0;
  const color = healthColor(score);

  const subject = `${firstName ? firstName + ', your' : 'Your'} weekly ops briefing — ${date}`;

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#060c1e;color:#eef2ff;border-radius:14px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#0f1e45,#060c1e);padding:32px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.07);">
    <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.3);">OpsRadar · Weekly Briefing</p>
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#eef2ff;">Your ops snapshot${firstName ? ', ' + firstName : ''}</h1>
    <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.35);">${date}</p>
  </div>

  <div style="padding:28px 32px;">
    <div style="background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.15);border-radius:12px;padding:20px;margin-bottom:24px;display:flex;align-items:center;gap:20px;">
      <div style="text-align:center;min-width:72px;">
        <p style="margin:0;font-size:42px;font-weight:800;color:${color};line-height:1;">${score}</p>
        <p style="margin:2px 0 0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.3);">Health</p>
      </div>
      <div style="flex:1;border-left:1px solid rgba(255,255,255,0.08);padding-left:20px;">
        <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.65);line-height:1.55;">${briefing.win}</p>
      </div>
    </div>

    <p style="margin:0 0 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.3);">3 Things to Watch</p>
    ${((briefing.attention ?? []) as AttentionItem[]).map(attentionRow).join('')}

    <div style="background:rgba(59,130,246,0.07);border:1px solid rgba(59,130,246,0.2);border-left:3px solid #3b82f6;border-radius:0 10px 10px 0;padding:16px;margin:20px 0 24px;">
      <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.3);">Do This One Thing</p>
      <p style="margin:0;font-size:14px;color:#eef2ff;line-height:1.55;">${briefing.recommendation}</p>
    </div>

    <a href="${BASE_URL}/dashboard" style="display:block;text-align:center;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:16px;border-radius:12px;box-shadow:0 0 24px rgba(59,130,246,0.3);">View Full Dashboard →</a>
  </div>

  <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
    <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.15);">OpsRadar · <a href="${BASE_URL}" style="color:rgba(255,255,255,0.2);">opsradar.co</a></p>
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.12);">Manage email preferences in <a href="${BASE_URL}/dashboard/settings" style="color:rgba(255,255,255,0.2);">Dashboard Settings</a></p>
  </div>
</div>`;

  return { subject, html };
}
