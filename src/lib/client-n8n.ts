import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export type ClientN8nConfig = {
  n8nBaseUrl: string;
  n8nWebhookSecret: string;
  backfillCompletedAt: string | null;
};

export async function getClientN8nConfig(
  clientId: string
): Promise<ClientN8nConfig | null> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('client_n8n_config')
    .select('n8n_base_url, n8n_webhook_secret, backfill_completed_at')
    .eq('client_id', clientId)
    .maybeSingle();

  if (error) {
    console.error('[getClientN8nConfig] Supabase error:', error.message);
  }

  if (data) {
    return {
      n8nBaseUrl: data.n8n_base_url,
      n8nWebhookSecret: data.n8n_webhook_secret,
      backfillCompletedAt: data.backfill_completed_at,
    };
  }

  // Fallback to env vars (dev environment / OpsRadar's own shared n8n)
  const envBaseUrl = process.env.N8N_BASE_URL;
  const envSecret = process.env.N8N_WEBHOOK_SECRET;
  if (envBaseUrl && envSecret && envBaseUrl !== '__SET_BEFORE_USE__') {
    return {
      n8nBaseUrl: envBaseUrl,
      n8nWebhookSecret: envSecret,
      backfillCompletedAt: null,
    };
  }

  return null;
}
