import { createClient } from '@supabase/supabase-js';
import type { Database } from '<npm>/lib/database.types';
import { encryptToken, decryptToken, type EncryptedBlob } from '<npm>/lib/encryption';

// v1 uses the publishable key (legacy service_role JWT is disabled on this
// project). Safe because RLS is off on the integrations table for v1 dev,
// and tokens are encrypted at rest. Restore service_role + RLS when proper
// customer sign-in ships.
function getIntegrationsClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('missing Supabase env vars');
  }
  return createClient<Database>(url, key);
}

export type ToolName =
  | 'stripe' | 'hubspot' | 'clickup' | 'asana' | 'toggl' | 'harvest'
  | 'google_ads' | 'meta_ads' | 'calendly' | 'quickbooks' | 'pipedrive'
  | 'salesforce' | 'monday';

export async function getIntegrationToken(
  clientId: string,
  tool: ToolName
): Promise<string | null> {
  const supabase = getIntegrationsClient();
  const { data, error } = await supabase
    .from('integrations')
    .select('encrypted_token, iv, auth_tag')
    .eq('client_id', clientId)
    .eq('tool', tool)
    .maybeSingle();

  if (error) throw new Error(`Failed to read integration: ${error.message}`);
  if (!data) return null;

  return decryptToken({
    ciphertext: data.encrypted_token,
    iv: data.iv,
    authTag: data.auth_tag,
  });
}

export async function setIntegrationToken(
  clientId: string,
  tool: ToolName,
  plaintextToken: string
): Promise<void> {
  const supabase = getIntegrationsClient();
  const blob: EncryptedBlob = encryptToken(plaintextToken);

  const { error } = await supabase
    .from('integrations')
    .upsert(
      {
        client_id: clientId,
        tool,
        encrypted_token: blob.ciphertext,
        iv: blob.iv,
        auth_tag: blob.authTag,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'client_id,tool' }
    );

  if (error) throw new Error(`Failed to store integration: ${error.message}`);
}

export async function deleteIntegration(clientId: string, tool: ToolName): Promise<void> {
  const supabase = getIntegrationsClient();
  const { error } = await supabase
    .from('integrations')
    .delete()
    .eq('client_id', clientId)
    .eq('tool', tool);

  if (error) throw new Error(`Failed to delete integration: ${error.message}`);
}

export async function isIntegrationConnected(
  clientId: string,
  tool: ToolName
): Promise<boolean> {
  const supabase = getIntegrationsClient();
  const { data, error } = await supabase
    .from('integrations')
    .select('id')
    .eq('client_id', clientId)
    .eq('tool', tool)
    .maybeSingle();

  if (error) throw new Error(`Failed to check integration: ${error.message || JSON.stringify(error)}`);
  return Boolean(data);
}
