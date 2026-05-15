import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
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
  // Fail-closed: missing env vars never let a request through unauthed.
  // No DEV_CLIENT_ID bypass — gate requires a real session in every env (spec §8).
  // DEV_CLIENT_ID still works inside API routes via getCurrentUserId().
  const isDashboardPage = pathname.startsWith('/dashboard')
  const isDashboardApi = pathname.startsWith('/api/dashboard')
  if (isDashboardPage || isDashboardApi) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
      console.error('[proxy] missing Supabase env, redirecting to /login')
      return withTheme(redirectToLogin(request), pathname)
    }

    const res = NextResponse.next({ request })
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({ name, value, ...options })
            res.cookies.set({ name, value, ...options })
          })
        },
      },
    })

    try {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) {
        if (isDashboardApi) {
          return withTheme(NextResponse.json({ error: 'unauthorized' }, { status: 401 }), pathname)
        }
        return withTheme(redirectToLogin(request), pathname)
      }
    } catch (err) {
      console.warn('[proxy] auth check threw, fail-closed:', err)
      if (isDashboardApi) {
        return withTheme(NextResponse.json({ error: 'unauthorized' }, { status: 401 }), pathname)
      }
      return withTheme(redirectToLogin(request), pathname)
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

function redirectToLogin(request: NextRequest) {
  const redirectUrl = new URL('/login', request.url)
  redirectUrl.searchParams.set(
    'redirectTo',
    request.nextUrl.pathname + request.nextUrl.search,
  )
  return NextResponse.redirect(redirectUrl)
}
