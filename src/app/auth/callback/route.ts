import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_OTP_TYPES: EmailOtpType[] = ['invite', 'recovery', 'magiclink', 'signup', 'email_change', 'email'];

function isValidOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (VALID_OTP_TYPES as string[]).includes(value);
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const typeParam = url.searchParams.get('type');
  const redirectTo = url.searchParams.get('redirectTo');

  const supabase = await getSessionSupabaseClient();

  // Token-hash flow: email links from Supabase Auth (invite, recovery, magic link).
  // Templates pass `?token_hash=…&type=…` directly to this route.
  if (tokenHash && isValidOtpType(typeParam)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: typeParam });
    if (error) {
      const target = new URL('/login', url.origin);
      target.searchParams.set('error', 'invalid_or_expired_link');
      return NextResponse.redirect(target);
    }

    if (typeParam === 'invite') {
      return NextResponse.redirect(new URL('/auth/set-password', url.origin));
    }
    if (typeParam === 'recovery') {
      return NextResponse.redirect(new URL('/auth/reset-password', url.origin));
    }
    const dest = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard';
    return NextResponse.redirect(new URL(dest, url.origin));
  }

  // PKCE code flow: OAuth providers, or future flows that use ?code=…
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const target = new URL('/login', url.origin);
      target.searchParams.set('error', 'invalid_or_expired_link');
      return NextResponse.redirect(target);
    }
    const dest = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard';
    return NextResponse.redirect(new URL(dest, url.origin));
  }

  // Neither code nor token_hash — malformed link.
  const target = new URL('/login', url.origin);
  target.searchParams.set('error', 'missing_code');
  return NextResponse.redirect(target);
}
