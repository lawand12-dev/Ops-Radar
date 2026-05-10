import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars are missing in dev, skip the guard entirely (DEV_CLIENT_ID
  // fallback handles auth-context routes). Production must have these.
  if (!url || !key) return res;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // In dev: if no real session AND DEV_CLIENT_ID is set, allow through.
  // This preserves the "npm run dev without logging in" workflow.
  if (!user && process.env.DEV_CLIENT_ID) {
    return res;
  }

  if (!user) {
    const target = req.nextUrl.clone();
    target.pathname = '/login';
    target.searchParams.set('redirectTo', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(target);
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
