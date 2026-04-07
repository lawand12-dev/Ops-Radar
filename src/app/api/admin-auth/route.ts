import { applyRateLimit } from '../../../lib/rate-limit'
import { requireAdminPassword } from '../../../lib/security'

export async function POST(request: Request) {
  const rateLimitResponse = applyRateLimit(request, 'admin-auth')
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const authResponse = requireAdminPassword(request)
  if (authResponse) {
    return authResponse
  }

  return Response.json({ ok: true })
}
