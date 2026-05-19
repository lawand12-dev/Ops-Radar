// Resolves a Supabase user_id to their chatv2 project_id.
// The mapping is populated by admin onboarding at /admin/onboard-customer.

import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

/**
 * Returns the chatv2 project_id for the given Supabase user, or null if the
 * user has no mapping (not enrolled in the chatv2 integration).
 *
 * Throws on Supabase errors — callers should let those bubble to a 500.
 */
export async function getChatV2ProjectId(userId: string): Promise<string | null> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from('client_n8n_config')
    .select('chatv2_project_id')
    .eq('client_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`chatv2 project mapping lookup failed: ${error.message}`);
  }

  return data?.chatv2_project_id ?? null;
}
