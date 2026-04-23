import { createHash, timingSafeEqual } from 'node:crypto'
import { serverErrorResponse } from './security'

/**
 * Constant-time string equality. Uses crypto.timingSafeEqual, which requires
 * equal-length buffers, so we hash both sides to a fixed length first. Hashing
 * also removes any residual length leak from the comparison itself.
 *
 * The SHA-256 here is not for password storage — the admin password is still
 * a plaintext env var. The hash exists solely to equalize buffer lengths so
 * timingSafeEqual can be used safely.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest()
  const hashB = createHash('sha256').update(b).digest()
  return timingSafeEqual(hashA, hashB)
}

export function requireAdminPassword(request: Request): Response | null {
  const adminPassword = process.env.ADMIN_PASSWORD

  // Reject obvious misconfiguration: unset, or still the documented default.
  if (!adminPassword || adminPassword === 'changeme') {
    console.error('[security] ADMIN_PASSWORD is missing or set to the default')
    return serverErrorResponse()
  }

  const providedPassword = request.headers.get('x-admin-password')
  if (!providedPassword) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!constantTimeEqual(providedPassword, adminPassword)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
