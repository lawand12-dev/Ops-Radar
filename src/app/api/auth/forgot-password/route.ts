import { NextRequest, NextResponse } from 'next/server';
import { getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { applyRateLimit } from '<npm>/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const rateLimitResponse = await applyRateLimit(req, 'auth-forgot-password');
  if (rateLimitResponse) return rateLimitResponse;

  const body = await req.json().catch(() => null);
  const email: unknown = body?.email;

  if (typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email.' }, { status: 400 });
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  const supabase = await getSessionSupabaseClient();

  // Anti-enumeration: ignore the result. Always return 200.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?type=recovery`,
  });

  return NextResponse.json({ ok: true });
}
