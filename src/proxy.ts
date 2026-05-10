import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import {
  ADMIN_SESSION_COOKIE,
  isValidAdminSessionToken,
} from './lib/admin-session'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /admin/* — gated by the existing admin-session cookie.
  const isAdminRoute =
    pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
  const isAdminLoginPage =
    pathname === '/admin/login' || pathname === '/api/admin-auth'

  if (isAdminRoute && !isAdminLoginPage) {
    const cookie = request.cookies.get(ADMIN_SESSION_COOKIE)
    if (!cookie?.value || !isValidAdminSessionToken(cookie.value)) {
      return new NextResponse(null, { status: 404 })
    }
    return NextResponse.next()
  }

  // /dashboard/* — gated by the Supabase customer session cookie.
  if (pathname.startsWith('/dashboard')) {
    const res = NextResponse.next()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Missing env vars in dev → skip the guard so the DEV_CLIENT_ID
    // fallback handles auth-context routes.
    if (!url || !key) return res

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Dev fallback: no real session AND DEV_CLIENT_ID set → allow through.
    if (!user && process.env.DEV_CLIENT_ID) {
      return res
    }

    if (!user) {
      const target = request.nextUrl.clone()
      target.pathname = '/login'
      target.searchParams.set(
        'redirectTo',
        request.nextUrl.pathname + request.nextUrl.search,
      )
      return NextResponse.redirect(target)
    }

    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/dashboard/:path*',
  ],
}
