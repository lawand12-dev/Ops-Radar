import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import {
  ADMIN_SESSION_COOKIE,
  isValidAdminSessionToken,
} from './lib/admin-session'

const DARK_ROUTE_PREFIXES = ['/dashboard', '/admin', '/aios'] as const

function themeForPath(pathname: string): 'light' | 'dark' {
  return DARK_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
    ? 'dark'
    : 'light'
}

function withTheme(response: NextResponse, pathname: string): NextResponse {
  response.headers.set('x-theme', themeForPath(pathname))
  return response
}

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
      return withTheme(new NextResponse(null, { status: 404 }), pathname)
    }
    return withTheme(NextResponse.next(), pathname)
  }

  // /dashboard/* (pages) and /api/dashboard/* (data endpoints) — both gated
  // by the Supabase customer session cookie. Pages redirect to /login on
  // failure; API routes return 401 JSON so client fetches handle it cleanly.
  const isDashboardPage = pathname.startsWith('/dashboard')
  const isDashboardApi = pathname.startsWith('/api/dashboard')
  if (isDashboardPage || isDashboardApi) {
    const res = NextResponse.next()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Missing env vars in dev → skip the guard so the DEV_CLIENT_ID
    // fallback handles auth-context routes.
    if (!url || !key) return withTheme(res, pathname)

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
    // Hard-gated to non-production. A leaked DEV_CLIENT_ID env var must NEVER
    // turn the dashboard into an open route in prod.
    if (!user && process.env.NODE_ENV !== 'production' && process.env.DEV_CLIENT_ID) {
      return withTheme(res, pathname)
    }

    if (!user) {
      if (isDashboardApi) {
        return withTheme(NextResponse.json({ error: 'unauthorized' }, { status: 401 }), pathname)
      }
      const target = request.nextUrl.clone()
      target.pathname = '/login'
      target.searchParams.set(
        'redirectTo',
        request.nextUrl.pathname + request.nextUrl.search,
      )
      return withTheme(NextResponse.redirect(target), pathname)
    }

    return withTheme(res, pathname)
  }

  return withTheme(NextResponse.next(), pathname)
}

export const config = {
  matcher: [
    // Match all routes except: _next, static files, common assets
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf|eot|map)$).*)',
  ],
}
