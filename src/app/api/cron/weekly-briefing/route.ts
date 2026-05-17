import { Resend } from 'resend';
import { getServerSupabaseClient, hasServerSupabaseClient } from '<npm>/lib/supabase-server';
import { serverErrorResponse } from '<npm>/lib/security';
import { generateBriefingForUser } from '<npm>/lib/briefing';
import { buildBriefingEmail } from '<npm>/lib/emails/weekly-briefing-email';

const resend = new Resend(process.env.RESEND_API_KEY);
const CRON_SECRET = process.env.CRON_SECRET;
const DEFAULT_BLENDED_RATE = 85;

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET) {
    console.error('[weekly-briefing cron] missing CRON_SECRET');
    return serverErrorResponse();
  }
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasServerSupabaseClient()) return serverErrorResponse();
  const supabase = getServerSupabaseClient();

  // Find distinct users with at least one connected integration
  const { data: rows } = await supabase
    .from('integrations')
    .select('client_id')
    .eq('status', 'connected')
    .not('encrypted_token', 'is', null);

  const userIds = [...new Set((rows ?? []).map((r: { client_id: string }) => r.client_id))];

  const stats = { sent: 0, skipped: 0, errors: 0 };

  for (const userId of userIds) {
    try {
      const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(userId);
      if (userErr || !user?.email) { stats.skipped++; continue; }

      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      if (meta.weekly_briefing_enabled === false) { stats.skipped++; continue; }

      const blendedRate = typeof meta.blended_hourly_rate_usd === 'number'
        ? meta.blended_hourly_rate_usd
        : DEFAULT_BLENDED_RATE;

      const briefing = await generateBriefingForUser(userId, blendedRate, 'weekly');
      if (!briefing) { stats.skipped++; continue; }

      const firstName = (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? '';
      const { subject, html } = buildBriefingEmail(briefing, firstName);

      const { error: emailErr } = await resend.emails.send({
        from: 'OpsRadar <notifications@opsradar.co>',
        to: user.email,
        subject,
        html,
      });

      if (emailErr) {
        console.error('[weekly-briefing cron] email error for', userId, emailErr);
        stats.errors++;
        continue;
      }

      await supabase.from('briefings').update({ email_sent: true }).eq('id', briefing.id);
      stats.sent++;
    } catch (err) {
      console.error('[weekly-briefing cron] error for', userId, err);
      stats.errors++;
    }
  }

  console.log('[weekly-briefing cron] done', stats);
  return Response.json({ ok: true, stats });
}
