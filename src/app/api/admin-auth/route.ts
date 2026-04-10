import { applyRateLimit } from '../../../lib/rate-limit'
import { requireAdminPassword } from '../../../lib/security'
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSessionToken,
  getAdminSessionTokenFromCookieHeader,
  hasAdminSessionSecret,
  isValidAdminSessionToken,
} from '../../../lib/admin-session'

export async function POST(request: Request) {
  const rateLimitResponse = applyRateLimit(request, 'admin-auth')
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const authResponse = requireAdminPassword(request)
  if (authResponse) {
    return authResponse
  }

  if (!hasAdminSessionSecret()) {
    return Response.json({ error: 'An error occurred' }, { status: 500 })
  }

  const response = Response.json({ ok: true })
  response.headers.append(
    'Set-Cookie',
    `${ADMIN_SESSION_COOKIE}=${createAdminSessionToken()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ADMIN_SESSION_MAX_AGE}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  )
  return response
}

export async function GET(request: Request) {
  const sessionCookie = getAdminSessionTokenFromCookieHeader(
    request.headers.get('cookie') ?? '',
  )

  return Response.json({ authenticated: isValidAdminSessionToken(sessionCookie) })
}

export async function DELETE() {
  const response = Response.json({ ok: true })
  response.headers.append(
    'Set-Cookie',
    `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  )
  return response
}
