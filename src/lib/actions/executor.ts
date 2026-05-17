import { Resend } from 'resend';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';
import { decryptApiKey } from '<npm>/lib/integrations/crypto';
import type { AgentAction, InvoiceReminderPayload, WorkflowFailurePayload, HubSpotHarvestPayload } from './types';

const resend = new Resend(process.env.RESEND_API_KEY);
const HARVEST_BASE = 'https://api.harvestapp.com/v2';
const UA = 'OpsRadar (https://opsradar.app)';
const UNDO_WINDOW_MS = 30 * 60 * 1000;

export async function executeAction(action: AgentAction): Promise<void> {
  const supabase = getServerSupabaseClient();
  const updatedPayload = { ...(action.payload as Record<string, unknown>) };

  try {
    switch (action.action_type) {
      case 'invoice_reminder': {
        const p = action.payload as InvoiceReminderPayload;
        const { data: emailResult } = await resend.emails.send({
          from: 'OpsRadar Billing <notifications@opsradar.co>',
          to: p.recipient_email,
          subject: p.draft_subject,
          html: `<p style="font-family:sans-serif;line-height:1.6">${p.draft_body.replace(/\n/g, '<br>')}</p>`,
        });
        if (emailResult?.id) updatedPayload.resend_email_id = emailResult.id;
        break;
      }

      case 'workflow_failure': {
        const p = action.payload as WorkflowFailurePayload;
        const { data: { user } } = await supabase.auth.admin.getUserById(action.user_id);
        const founderEmail = user?.email;
        if (founderEmail) {
          const { data: emailResult } = await resend.emails.send({
            from: 'OpsRadar Alerts <notifications@opsradar.co>',
            to: founderEmail,
            subject: `⚠️ Workflow "${p.workflow_name}" failed ${p.failure_count}× in 24h`,
            html: `<p style="font-family:sans-serif;line-height:1.6">
              Your n8n workflow <strong>${p.workflow_name}</strong> has failed
              <strong>${p.failure_count} times</strong> in the last 24 hours.<br><br>
              Last failure: ${new Date(p.last_failed_at).toLocaleString()}<br><br>
              <a href="${p.n8n_base_url}">Open n8n dashboard to investigate →</a>
            </p>`,
          });
          if (emailResult?.id) updatedPayload.resend_email_id = emailResult.id;
        }
        break;
      }

      case 'hubspot_harvest_sync': {
        const p = action.payload as HubSpotHarvestPayload;
        const { data: rows } = await supabase
          .from('integrations')
          .select('tool, encrypted_token, iv, auth_tag, status')
          .eq('client_id', action.user_id)
          .eq('tool', 'harvest')
          .eq('status', 'connected')
          .limit(1);
        const harvestRow = rows?.[0];
        if (!harvestRow) break;
        const combined = decryptApiKey(harvestRow);
        const colonIdx = combined.indexOf(':');
        if (colonIdx <= 0) break;
        const accountId = combined.slice(0, colonIdx);
        const token = combined.slice(colonIdx + 1);
        const res = await fetch(`${HARVEST_BASE}/clients`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Harvest-Account-Id': accountId,
            'User-Agent': UA,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: p.hubspot_company_name }),
        });
        if (res.ok) {
          const body = (await res.json()) as { id?: number };
          if (body.id) updatedPayload.harvest_client_id = String(body.id);
        }
        break;
      }

      case 'margin_alert':
      case 'hours_budget_exceeded':
        break;
    }

    await supabase
      .from('agent_actions')
      .update({
        status: 'executed',
        executed_at: new Date().toISOString(),
        undo_deadline: new Date(Date.now() + UNDO_WINDOW_MS).toISOString(),
        payload: updatedPayload as unknown as import('<npm>/lib/database.types').Json,
      })
      .eq('id', action.id);

  } catch (err) {
    console.error('[executeAction] failed for', action.action_type, err);
    await supabase
      .from('agent_actions')
      .update({ status: 'failed' })
      .eq('id', action.id);
  }
}
