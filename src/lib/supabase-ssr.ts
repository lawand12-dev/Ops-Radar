import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Cookie-aware Supabase server client. Uses Next.js cookies() for auth
 * session storage. Subject to RLS — auth.getUser() returns the logged-in
 * customer (or null if no session).
 */
export async function getSessionSupabaseClient(): Promise<SupabaseClient<Database>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error('missing NEXT_PUBLIC_SUPABASE_URL');
  if (!key) throw new Error('missing NEXT_PUBLIC_SUPABASE_ANON_KEY');

  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll called from a Server Component — ignore. Middleware/route
          // handlers handle cookie writes via the response.
        }
      },
    },
  });
}

/**
 * Returns the actual logged-in user's id from the session cookie.
 * Use this when you need the literal session user (auth, profile, team mgmt).
 * For data-scoping queries, prefer `getCurrentUserId()` which returns the
 * effective (org owner) user id.
 *
 * Returns null if not authenticated.
 */
export async function getActualUserId(): Promise<string | null> {
  try {
    const supabase = await getSessionSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) return data.user.id;
  } catch (err) {
    console.warn('[getActualUserId] session read failed:', err);
  }
  if (process.env.NODE_ENV === 'production') return null;
  return process.env.DEV_CLIENT_ID ?? null;
}

/**
 * Returns the **effective** user id for data scoping — i.e., the org OWNER's
 * user id. For owners, this is the same as the session user. For invited team
 * members, this is the user_id of the org they belong to.
 *
 * Use this for all customer-data queries (integrations, briefings, agent_actions,
 * retainer_configs, fo_clients, etc.) so team members see the owner's data.
 *
 * Returns null if not authenticated.
 *
 * NOTE: This adds one Supabase round-trip vs. raw session lookup. Acceptable
 * for v1; future optimization is to encode the org_id in JWT claims via a
 * Supabase auth hook.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const actualId = await getActualUserId();
  if (!actualId) return null;
  // Lazy-import to avoid a cycle between supabase-ssr.ts and org.ts.
  const { getEffectiveUserId } = await import('./org');
  return await getEffectiveUserId(actualId);
}
