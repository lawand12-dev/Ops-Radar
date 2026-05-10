import { NextRequest, NextResponse } from 'next/server';
import { getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const type = url.searchParams.get('type'); // 'invite' | 'recovery' | null
  const redirectTo = url.searchParams.get('redirectTo');

  if (!code) {
    const target = new URL('/login', url.origin);
    target.searchParams.set('error', 'missing_code');
    return NextResponse.redirect(target);
  }

  const supabase = await getSessionSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const target = new URL('/login', url.origin);
    target.searchParams.set('error', 'invalid_or_expired_link');
    return NextResponse.redirect(target);
  }

  if (type === 'invite') {
    return NextResponse.redirect(new URL('/auth/set-password', url.origin));
  }

  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/auth/reset-password', url.origin));
  }

  const dest = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard';
  return NextResponse.redirect(new URL(dest, url.origin));
}
