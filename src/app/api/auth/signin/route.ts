import { NextRequest, NextResponse } from 'next/server';
import { getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';
import { applyRateLimit } from '<npm>/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const rateLimitResponse = await applyRateLimit(req, 'auth-signin');
  if (rateLimitResponse) return rateLimitResponse;

  const body = await req.json().catch(() => null);
  const email: unknown = body?.email;
  const password: unknown = body?.password;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const supabase = await getSessionSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
