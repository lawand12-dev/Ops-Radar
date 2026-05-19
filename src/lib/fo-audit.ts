// Recording helper for the FO partner audit log.
// Branch: main / Supabase. Fire-and-forget — failures don't break callers.

import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export type FoAuditKind =
  | 'agency_added'
  | 'agency_removed'
  | 'agency_viewed'
  | 'integration_added'
  | 'integration_removed'
  | 'dashboard_viewed';

export async function recordFoAudit(
  foUserId: string,
  kind: FoAuditKind,
  details: Record<string, unknown> = {},
  foClientId?: string,
): Promise<void> {
  try {
    const supabase = getServerSupabaseClient();
    await supabase.from('fo_audit_log').insert({
      fo_user_id: foUserId,
      fo_client_id: foClientId ?? null,
      action_kind: kind,
      details: details as unknown as import('<npm>/lib/database.types').Json,
    });
  } catch (err) {
    console.warn('[fo-audit] record failed:', kind, err);
  }
}
