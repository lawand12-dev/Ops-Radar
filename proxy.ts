import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from './src/lib/admin-session'

function normalizeOrigin(origin: string): string | null {
  try {
    return new URL(origin).origin
  } catch {
    return null
  }
}

function getAllowedOrigins(request: NextRequest): Set<string> {
  const configuredOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter((value): value is string => Boolean(value))

  if (configuredOrigins.length > 0) {
    return new Set(configuredOrigins)
  }

  return new Set([request.nextUrl.origin])
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith('/api/')) {
    const originHeader = request.headers.get('origin')
    if (!originHeader) {
      return NextResponse.next()
    }

    const requestOrigin = normalizeOrigin(originHeader)
    const allowedOrigins = getAllowedOrigins(request)

    if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.next()
  }

  const isLoginPage = pathname === '/admin/login'
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')

  if (!isAdminRoute) {
    return NextResponse.next()
  }

  const hasAdminSession = isValidAdminSessionToken(
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
  )

  if (isLoginPage && hasAdminSession) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  if (!isLoginPage && !hasAdminSession) {
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('auth', 'required')
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*', '/admin', '/admin/:path*'],
}
