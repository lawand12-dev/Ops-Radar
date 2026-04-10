import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  ADMIN_SESSION_COOKIE,
  isValidAdminSessionToken,
} from './lib/admin-session'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAdminRoute =
    pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
  const isLoginPage =
    pathname === '/admin/login' || pathname === '/api/admin-auth'

  if (isAdminRoute && !isLoginPage) {
    const cookie = request.cookies.get(ADMIN_SESSION_COOKIE)

    if (!cookie?.value || !isValidAdminSessionToken(cookie.value)) {
      return new NextResponse(null, { status: 404 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
