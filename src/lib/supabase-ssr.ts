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
 * Returns the current user's id from the session cookie, or
 * `process.env.DEV_CLIENT_ID` as a dev fallback.
 *
 * Returns null if neither is available — the caller should treat that as
 * unauthorized (return 401).
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await getSessionSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) return data.user.id;
  } catch (err) {
    console.warn('[getCurrentUserId] session read failed:', err);
  }
  return process.env.DEV_CLIENT_ID ?? null;
}
