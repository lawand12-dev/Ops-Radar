import { applyRateLimit } from '../../../lib/rate-limit'
import { requireAdminPassword } from '../../../lib/security'
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSessionToken,
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
    `${ADMIN_SESSION_COOKIE}=${createAdminSessionToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ADMIN_SESSION_MAX_AGE}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  )
  return response
}

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const sessionCookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.slice(ADMIN_SESSION_COOKIE.length + 1)

  return Response.json({ authenticated: isValidAdminSessionToken(sessionCookie) })
}

export async function DELETE() {
  const response = Response.json({ ok: true })
  response.headers.append(
    'Set-Cookie',
    `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  )
  return response
}
