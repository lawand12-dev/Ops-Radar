// Organizations / team-seats lib.
// Branch: main / Supabase.
//
// Design rationale:
// Existing customer-owned tables (integrations, briefings, retainer_configs,
// agent_actions, fo_clients, etc.) are keyed on user_id = the owner's auth.uid.
// Inviting team members would require backfilling organization_id onto every
// such row — a deep refactor. Instead, we use the "view as owner" model:
//
//   - Owner: their own user_id is their effective user_id.
//   - Invited member: their effective user_id = the org owner's user_id.
//
// All data-read API routes call getEffectiveUserId() instead of getCurrentUserId().
// Result: invited members read/write the owner's data as if they were the owner.
// Members can be removed instantly without orphaning data.

import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export type OrgRole = 'owner' | 'admin' | 'member';

export type OrgMembership = {
  org_id: string;
  org_name: string;
  owner_user_id: string;
  role: OrgRole;
  is_owner: boolean;
};

const membershipCache = new Map<string, OrgMembership | null>();

/**
 * Resolves the user's primary org membership.
 * For owners: returns their own org.
 * For invited members: returns the org they were invited into.
 * Returns null if no org row exists (extremely rare — backfill covers all users).
 *
 * Caches per-request via the module-level Map; safe because Next.js spawns a fresh
 * Node context per request in the Node runtime. (Per-request caching only — if you
 * keep a long-lived process, clear before reuse.)
 */
export async function getOrgMembership(userId: string): Promise<OrgMembership | null> {
  if (membershipCache.has(userId)) {
    return membershipCache.get(userId) ?? null;
  }

  const supabase = getServerSupabaseClient();
  // Find the FIRST org the user is a member of. Today every user is in exactly one.
  const { data: memberRow } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (!memberRow) {
    // Fallback: maybe this is a brand-new user whose org hasn't been backfilled.
    // Auto-provision one now so the system stays consistent.
    const { data: created } = await supabase
      .from('organizations')
      .insert({ name: 'My agency', owner_user_id: userId })
      .select('id, name, owner_user_id')
      .single();
    if (!created) {
      membershipCache.set(userId, null);
      return null;
    }
    await supabase.from('organization_members').insert({
      org_id: created.id as string,
      user_id: userId,
      role: 'owner',
    });
    const m: OrgMembership = {
      org_id: created.id as string,
      org_name: created.name as string,
      owner_user_id: userId,
      role: 'owner',
      is_owner: true,
    };
    membershipCache.set(userId, m);
    return m;
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, owner_user_id')
    .eq('id', memberRow.org_id as string)
    .maybeSingle();

  if (!org) {
    membershipCache.set(userId, null);
    return null;
  }

  const m: OrgMembership = {
    org_id: org.id as string,
    org_name: org.name as string,
    owner_user_id: org.owner_user_id as string,
    role: memberRow.role as OrgRole,
    is_owner: (org.owner_user_id as string) === userId,
  };
  membershipCache.set(userId, m);
  return m;
}

/**
 * Returns the data-owning user_id for a given member.
 * For owners: returns their own user_id.
 * For invited members: returns the org owner's user_id (they "view as owner").
 *
 * Use this anywhere customer-owned data is read or written.
 */
export async function getEffectiveUserId(currentUserId: string): Promise<string> {
  const m = await getOrgMembership(currentUserId);
  return m?.owner_user_id ?? currentUserId;
}

export async function getCurrentMemberCount(ownerUserId: string): Promise<number> {
  const supabase = getServerSupabaseClient();
  // Count org members of the org owned by `ownerUserId`.
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_user_id', ownerUserId)
    .maybeSingle();
  if (!org) return 1;
  const { count } = await supabase
    .from('organization_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('org_id', org.id as string);
  return count ?? 1;
}

export async function getPendingInviteCount(ownerUserId: string): Promise<number> {
  const supabase = getServerSupabaseClient();
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_user_id', ownerUserId)
    .maybeSingle();
  if (!org) return 0;
  const nowIso = new Date().toISOString();
  const { count } = await supabase
    .from('organization_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org.id as string)
    .is('accepted_at', null)
    .gt('expires_at', nowIso);
  return count ?? 0;
}
