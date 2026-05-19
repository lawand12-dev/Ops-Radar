// src/app/api/cron/threshold-alerts/route.ts
import { Resend } from 'resend';
import { getServerSupabaseClient, hasServerSupabaseClient } from '<npm>/lib/supabase-server';
import { serverErrorResponse } from '<npm>/lib/security';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import { fetchStripePerClientRevenue } from '<npm>/lib/integrations/stripe/profitability-adapter';
import { fetchHarvestPerClientHours } from '<npm>/lib/integrations/harvest/profitability-adapter';
import { computeClientProfitability } from '<npm>/lib/profitability';
import { fetchClickupProjectBudgets } from '<npm>/lib/integrations/clickup/scope-adapter';
import { fetchHarvestMonthlyProjectHours } from '<npm>/lib/integrations/harvest/adapter';
import { computeScopeCreep } from '<npm>/lib/scope-creep';
import {
  buildThresholdAlertEmail,
  type AlertEmailKind,
} from '<npm>/lib/emails/threshold-alert-email';
import { sendToSlackDirect, type SlackMessage } from '<npm>/lib/notifications/slack';
import { sendToTeamsDirect, type TeamsMessage } from '<npm>/lib/notifications/teams';
import { dispatchEvent } from '<npm>/lib/webhooks/dispatch';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const resend = new Resend(process.env.RESEND_API_KEY);
const CRON_SECRET = process.env.CRON_SECRET;
const DEFAULT_BLENDED_RATE = 85;
const ALERT_COOLDOWN_DAYS = 7;

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET) {
    console.error('[threshold-alerts] missing CRON_SECRET');
    return serverErrorResponse();
  }
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasServerSupabaseClient()) return serverErrorResponse();

  const supabase = getServerSupabaseClient();
  const stats = { sent: 0, skipped: 0, errors: 0 };

  // Find users with both Stripe or Harvest connected
  const { data: rows } = await supabase
    .from('integrations')
    .select('client_id, tool')
    .eq('status', 'connected')
    .not('encrypted_token', 'is', null)
    .in('tool', ['stripe', 'harvest', 'clickup']);

  if (!rows || rows.length === 0) {
    return Response.json({ ok: true, stats });
  }

  // Group tools per user
  const userTools = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!userTools.has(row.client_id)) userTools.set(row.client_id, new Set());
    userTools.get(row.client_id)!.add(row.tool);
  }

  const cooldownThreshold = new Date(
    Date.now() - ALERT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  for (const [userId, tools] of userTools.entries()) {
    try {
      const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(userId);
      if (userErr || !user?.email) { stats.skipped++; continue; }

      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      if (meta.threshold_alerts_enabled === false) { stats.skipped++; continue; }

      const firstName = (typeof meta.full_name === 'string' ? meta.full_name : '').split(' ')[0] ?? '';
      const blendedRate = typeof meta.blended_hourly_rate_usd === 'number'
        ? meta.blended_hourly_rate_usd : DEFAULT_BLENDED_RATE;
      const slackWebhookUrl =
        typeof meta.slack_webhook_url === 'string' && meta.slack_webhook_url.startsWith('https://hooks.slack.com/')
          ? meta.slack_webhook_url
          : null;
      const teamsWebhookUrl =
        typeof meta.teams_webhook_url === 'string' &&
        (/^https:\/\/([a-z0-9-]+\.)?webhook\.office\.com\//.test(meta.teams_webhook_url) ||
          meta.teams_webhook_url.startsWith('https://outlook.office.com/webhook/'))
          ? meta.teams_webhook_url
          : null;

      const { data: keyRows } = await supabase
        .from('integrations')
        .select('tool, encrypted_token, iv, auth_tag, status')
        .eq('client_id', userId)
        .eq('status', 'connected');

      const getKey = (tool: string) => {
        const row = (keyRows ?? []).find((r) => r.tool === tool);
        if (!row?.encrypted_token) return null;
        return decryptApiKey(row);
      };

      // ── Profitability alerts (negative margin + invoice overdue) ──────────
      if (tools.has('stripe') && tools.has('harvest')) {
        const stripeKey = getKey('stripe');
        const harvestKey = getKey('harvest');
        if (stripeKey && harvestKey) {
          const [stripeData, harvestData] = await Promise.all([
            fetchStripePerClientRevenue(stripeKey),
            fetchHarvestPerClientHours(harvestKey),
          ]);
          const profResult = computeClientProfitability(stripeData, harvestData, blendedRate);

          for (const client of profResult.clients) {
            // Negative margin alert
            if (client.hours_mtd > 0 && client.margin_pct < 0) {
              const sent = await wasAlertSentRecently(
                supabase, userId, 'negative_margin', client.name, cooldownThreshold,
              );
              if (!sent) {
                const { subject, html } = buildThresholdAlertEmail(
                  {
                    kind: 'negative_margin',
                    entityName: client.name,
                    detail: `Margin is ${Math.round(client.margin_pct)}% this month. Losing ${fmtMoney(Math.abs(client.cost_mtd - client.revenue_mtd))} on this client.`,
                  },
                  firstName,
                );
                await sendAndRecord(supabase, resend, userId, user.email, 'negative_margin', client.name, subject, html, slackWebhookUrl, teamsWebhookUrl, stats);
              }
            }

            // Invoice overdue 30+ days alert
            if (client.payment_status === 'overdue' && (client.days_overdue ?? 0) >= 30 && client.revenue_mtd > 1000) {
              const sent = await wasAlertSentRecently(
                supabase, userId, 'invoice_overdue', client.name, cooldownThreshold,
              );
              if (!sent) {
                const { subject, html } = buildThresholdAlertEmail(
                  {
                    kind: 'invoice_overdue',
                    entityName: client.name,
                    detail: `Invoice is ${client.days_overdue} days overdue (${fmtMoney(client.revenue_mtd)}). Follow up now.`,
                  },
                  firstName,
                );
                await sendAndRecord(supabase, resend, userId, user.email, 'invoice_overdue', client.name, subject, html, slackWebhookUrl, teamsWebhookUrl, stats);
              }
            }
          }
        }
      }

      // ── Scope creep alerts ────────────────────────────────────────────────
      if (tools.has('clickup') && tools.has('harvest')) {
        const clickupKey = getKey('clickup');
        const harvestKey = getKey('harvest');
        if (clickupKey && harvestKey) {
          const [clickupData, harvestMonthly] = await Promise.all([
            fetchClickupProjectBudgets(clickupKey),
            fetchHarvestMonthlyProjectHours(harvestKey),
          ]);
          const scopeResult = computeScopeCreep(clickupData, harvestMonthly);

          for (const project of scopeResult.projects) {
            if (project.status === 'on_track') continue;
            const kind: AlertEmailKind =
              project.status === 'over_budget' ? 'scope_over_budget' : 'scope_at_risk';
            const sent = await wasAlertSentRecently(
              supabase, userId, kind, project.project_name, cooldownThreshold,
            );
            if (!sent) {
              const { subject, html } = buildThresholdAlertEmail(
                {
                  kind,
                  entityName: project.project_name,
                  detail: `${project.burn_pct}% of time budget used (${project.logged_hours}h of ${project.estimated_hours}h budgeted this month).`,
                },
                firstName,
              );
              await sendAndRecord(supabase, resend, userId, user.email, kind, project.project_name, subject, html, slackWebhookUrl, teamsWebhookUrl, stats);
            }
          }
        }
      }
    } catch (err) {
      console.error('[threshold-alerts] error for user', userId, err);
      stats.errors++;
    }
  }

  console.log('[threshold-alerts] done', stats);
  return Response.json({ ok: true, stats });
}

async function wasAlertSentRecently(
  supabase: ReturnType<typeof getServerSupabaseClient>,
  userId: string,
  kind: string,
  entityName: string,
  since: string,
): Promise<boolean> {
  const { count } = await supabase
    .from('alert_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('alert_kind', kind)
    .eq('entity_name', entityName)
    .gte('triggered_at', since);
  return (count ?? 0) > 0;
}

async function sendAndRecord(
  supabase: ReturnType<typeof getServerSupabaseClient>,
  resend: Resend,
  userId: string,
  email: string,
  kind: string,
  entityName: string,
  subject: string,
  html: string,
  slackWebhookUrl: string | null,
  teamsWebhookUrl: string | null,
  stats: { sent: number; skipped: number; errors: number },
): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from('alert_notifications').insert({
    user_id: userId,
    alert_kind: kind,
    entity_name: entityName,
    triggered_at: now,
  });

  const { error } = await resend.emails.send({
    from: 'OpsRadar <notifications@opsradar.co>',
    to: email,
    subject,
    html,
  });

  if (error) {
    console.error('[threshold-alerts] email send failed', kind, entityName, error);
    stats.errors++;
    return;
  }

  // Fan out to Slack if the customer has configured a webhook.
  // Slack delivery is fire-and-forget — failures don't fail the alert.
  if (slackWebhookUrl) {
    const slackMessage: SlackMessage = {
      text: subject,
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: subject } },
        { type: 'section', text: { type: 'mrkdwn', text: `*${entityName}*` } },
        {
          type: 'context',
          elements: [{ type: 'mrkdwn', text: 'Alert from your OpsRadar AI COO' }],
        },
      ],
    };
    await sendToSlackDirect(slackWebhookUrl, slackMessage);
  }

  // Fan out to Microsoft Teams if configured. Same fire-and-forget contract.
  if (teamsWebhookUrl) {
    const teamsMessage: TeamsMessage = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      themeColor: kind === 'invoice_overdue' || kind === 'negative_margin' ? 'ef4444' : 'f59e0b',
      summary: subject,
      title: subject,
      sections: [
        {
          activityTitle: entityName,
          activitySubtitle: 'Alert from your OpsRadar AI COO',
        },
      ],
    };
    await sendToTeamsDirect(teamsWebhookUrl, teamsMessage);
  }

  // Fire customer-registered outgoing webhooks. Failures are logged but don't
  // affect the alert pipeline.
  await dispatchEvent(userId, 'alert.threshold_crossed', {
    kind,
    entity_name: entityName,
    subject,
  });

  await supabase
    .from('alert_notifications')
    .update({ email_sent_at: now })
    .eq('user_id', userId)
    .eq('alert_kind', kind)
    .eq('entity_name', entityName)
    .eq('triggered_at', now);

  stats.sent++;
}

function fmtMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}
