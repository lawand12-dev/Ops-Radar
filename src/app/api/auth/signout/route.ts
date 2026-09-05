import { NextRequest, NextResponse } from 'next/server';
import { getSessionSupabaseClient } from '<npm>/lib/supabase-ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = await getSessionSupabaseClient();
  await supabase.auth.signOut();

  // 303 forces GET on the redirect target
  return NextResponse.redirect(new URL('/', req.nextUrl.origin), { status: 303 });
}
